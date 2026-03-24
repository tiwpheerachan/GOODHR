import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary, getLateThreshold, type OTBreakdown } from "@/lib/utils/payroll"

// ── Date helpers (copy จาก payroll/route.ts เพื่อ self-contained) ────
function addDays(ds: string, n: number): string {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, "0"), String(dt.getDate()).padStart(2, "0")].join("-")
}
function dayOfWeek(ds: string): number {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}
function cmp(a: string, b: string): -1 | 0 | 1 { return a < b ? -1 : a > b ? 1 : 0 }
function workDaysBetween(start: string, end: string, holidays: Set<string>): string[] {
  const days: string[] = []; let cur = start
  while (cmp(cur, end) <= 0) { const dow = dayOfWeek(cur); if (dow !== 0 && dow !== 6 && !holidays.has(cur)) days.push(cur); cur = addDays(cur, 1) }
  return days
}
function todayTH(): string { return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) }

/**
 * POST /api/payroll/bulk
 * คำนวณเงินเดือนแบบ batch — รับ employee_ids[] + payroll_period_id
 * ✅ Pre-fetch ข้อมูลร่วม (holidays, period) ครั้งเดียว แล้วคำนวณทุกคนพร้อมกัน
 * ✅ Concurrent: ประมวลผล 25 คนพร้อมกันต่อ batch (server-side)
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { employee_ids, payroll_period_id, mode } = body as {
    employee_ids:      string[]
    payroll_period_id: string
    mode?:             "init" | "calc"
  }

  if (!employee_ids?.length || !payroll_period_id) {
    return NextResponse.json({ error: "employee_ids[] และ payroll_period_id จำเป็น" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── Pre-fetch period (ใช้ร่วมกันทุกคน) ─────────────────────────
  const { data: period, error: pErr } = await supa
    .from("payroll_periods")
    .select("id, year, month, start_date, end_date, company_id")
    .eq("id", payroll_period_id)
    .single()

  if (pErr || !period) {
    return NextResponse.json({ error: "ไม่พบงวดเงินเดือน" }, { status: 404 })
  }

  const periodStart = period.start_date as string
  const periodEnd   = period.end_date   as string
  const todayStr    = todayTH()
  const currentYear = Number(period.year)
  const currentMonth = Number(period.month)

  // ── Pre-fetch holidays (ใช้ร่วมกันทุกคนในบริษัทเดียวกัน) ───────
  const { data: holData } = await supa
    .from("company_holidays")
    .select("date")
    .eq("company_id", period.company_id)
    .eq("is_active", true)
    .gte("date", periodStart)
    .lte("date", periodEnd)

  const holidaySet = new Set<string>((holData ?? []).map((h: any) => h.date as string))

  // ── Pre-fetch attendance records ทุกคนในงวดนี้ (1 query แทน 500) ─
  const { data: allAtt } = await supa
    .from("attendance_records")
    .select("employee_id, work_date, status, late_minutes, early_out_minutes, ot_minutes, work_minutes")
    .in("employee_id", employee_ids)
    .gte("work_date", periodStart)
    .lte("work_date", periodEnd)

  const attByEmp = new Map<string, any[]>()
  for (const a of (allAtt ?? [])) {
    const list = attByEmp.get(a.employee_id) || []
    list.push(a)
    attByEmp.set(a.employee_id, list)
  }

  // ── Pre-fetch leave requests ทุกคนในงวดนี้ (1 query) ────────────
  const { data: allLeaves } = await supa
    .from("leave_requests")
    .select("employee_id, start_date, end_date, leave_type:leave_types(is_paid)")
    .in("employee_id", employee_ids)
    .eq("status", "approved")
    .lte("start_date", periodEnd)
    .gte("end_date", periodStart)

  const leaveByEmp = new Map<string, any[]>()
  for (const l of (allLeaves ?? [])) {
    const list = leaveByEmp.get(l.employee_id) || []
    list.push(l)
    leaveByEmp.set(l.employee_id, list)
  }

  // ── Pre-fetch employees + salary structures (1 query each) ──────
  const { data: empData } = await supa
    .from("employees")
    .select("id, company_id, hire_date, department:departments(name), company:companies(code)")
    .in("id", employee_ids)

  const { data: salData } = await supa
    .from("salary_structures")
    .select("employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, tax_withholding_pct, effective_from")
    .in("employee_id", employee_ids)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })

  // เอาแค่ record ล่าสุดต่อคน
  const salByEmp = new Map<string, any>()
  for (const s of (salData ?? [])) {
    if (!salByEmp.has(s.employee_id)) salByEmp.set(s.employee_id, s)
  }

  const empMap = new Map<string, any>()
  for (const e of (empData ?? [])) empMap.set(e.id, e)

  // ── Pre-fetch loans, transport, OT, prev payroll (batch queries) ─
  const [loanRes, transportRes, otRes, prevPayrollRes] = await Promise.all([
    supa.from("employee_loans").select("employee_id, monthly_deduction")
      .in("employee_id", employee_ids).eq("status", "active"),
    supa.from("transport_claims").select("employee_id, amount")
      .in("employee_id", employee_ids).eq("payroll_period_id", payroll_period_id).eq("status", "approved"),
    supa.from("overtime_requests").select("employee_id, ot_start, ot_end, work_date")
      .in("employee_id", employee_ids).eq("status", "approved")
      .gte("work_date", periodStart).lte("work_date", periodEnd),
    supa.from("payroll_records").select("employee_id, monthly_tax_withheld")
      .in("employee_id", employee_ids).eq("year", currentYear).lt("month", currentMonth),
  ])

  // Group by employee
  const loanByEmp = new Map<string, number>()
  for (const l of (loanRes.data ?? [])) {
    loanByEmp.set(l.employee_id, (loanByEmp.get(l.employee_id) || 0) + (Number(l.monthly_deduction) || 0))
  }

  const transportByEmp = new Map<string, number>()
  for (const t of (transportRes.data ?? [])) {
    transportByEmp.set(t.employee_id, (transportByEmp.get(t.employee_id) || 0) + (Number(t.amount) || 0))
  }

  const otByEmp = new Map<string, any[]>()
  for (const o of (otRes.data ?? [])) {
    const list = otByEmp.get(o.employee_id) || []
    list.push(o)
    otByEmp.set(o.employee_id, list)
  }

  const prevTaxByEmp = new Map<string, number>()
  for (const p of (prevPayrollRes.data ?? [])) {
    prevTaxByEmp.set(p.employee_id, (prevTaxByEmp.get(p.employee_id) || 0) + (Number(p.monthly_tax_withheld) || 0))
  }

  // ── Process each employee ───────────────────────────────────────
  const results: { employee_id: string; success: boolean; error?: string }[] = []

  // Process in server-side batches of 25 (concurrent Promise.all)
  const SERVER_BATCH = 25
  for (let i = 0; i < employee_ids.length; i += SERVER_BATCH) {
    const batch = employee_ids.slice(i, i + SERVER_BATCH)
    const batchResults = await Promise.allSettled(
      batch.map(async (eid) => {
        try {
          const emp = empMap.get(eid)
          if (!emp) throw new Error("ไม่พบข้อมูลพนักงาน")

          const sal = salByEmp.get(eid) ?? {
            base_salary: 0, allowance_position: 0, allowance_transport: 0,
            allowance_food: 0, allowance_phone: 0, allowance_housing: 0,
            tax_withholding_pct: null,
          }

          const records = attByEmp.get(eid) ?? []
          const recordMap = new Map<string, any>(records.map((r: any) => [r.work_date, r]))

          const hireDate = (emp.hire_date as string | null) ?? periodStart
          const effectiveStart = cmp(hireDate, periodStart) > 0 ? hireDate : periodStart
          const allWorkDays = workDaysBetween(effectiveStart, periodEnd, holidaySet)
          const pastWorkDays = allWorkDays.filter(d => cmp(d, todayStr) <= 0)

          // Leave calc
          const leaveDaySet = new Set<string>()
          let leavePaidDays = 0, leaveUnpaidDays = 0
          for (const l of (leaveByEmp.get(eid) ?? [])) {
            let cur = l.start_date as string
            const leaveEnd = l.end_date as string
            let cnt = 0
            while (cmp(cur, leaveEnd) <= 0) {
              const dow = dayOfWeek(cur)
              if (dow !== 0 && dow !== 6 && !holidaySet.has(cur) && cmp(cur, periodStart) >= 0 && cmp(cur, periodEnd) <= 0) {
                leaveDaySet.add(cur); cnt++
              }
              cur = addDays(cur, 1)
            }
            if (l.leave_type?.is_paid) leavePaidDays += cnt
            else leaveUnpaidDays += cnt
          }

          // Absent calc
          let absentDays = 0
          for (const d of pastWorkDays) {
            if (leaveDaySet.has(d)) continue
            const rec = recordMap.get(d)
            const isToday = d === todayStr
            if (isToday) { if (rec && rec.status === "absent") absentDays++ }
            else { if (!rec || rec.status === "absent") absentDays++ }
          }

          const presentDays = records.filter((r: any) => ["present", "late", "early_out", "wfh"].includes(r.status)).length

          // Late & early
          const graceMinutes = getLateThreshold(emp.department?.name, emp.company?.code)
          const totalLateMin = records.reduce((s: number, r: any) => s + Math.max(0, (Number(r.late_minutes) || 0) - graceMinutes), 0)
          const totalEarlyMin = records.reduce((s: number, r: any) => s + (Number(r.early_out_minutes) || 0), 0)

          // OT
          let otMin = records.reduce((s: number, r: any) => s + (Number(r.ot_minutes) || 0), 0)
          if (otMin === 0) {
            for (const ot of (otByEmp.get(eid) ?? [])) {
              if (ot.ot_start && ot.ot_end) {
                otMin += Math.max(0, Math.round((new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000))
              }
            }
          }

          const otBreakdown: OTBreakdown = { weekday_minutes: otMin, holiday_regular_minutes: 0, holiday_ot_minutes: 0 }

          const baseSalary = Number(sal.base_salary) || 0
          const allAllowances = (Number(sal.allowance_position) || 0) + (Number(sal.allowance_food) || 0) +
            (Number(sal.allowance_phone) || 0) + (Number(sal.allowance_housing) || 0)
          const transportClaimTotal = transportByEmp.get(eid) || 0
          const loanDeduction = loanByEmp.get(eid) || 0
          const taxPct = sal.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null

          const result = calculatePayrollSummary({
            baseSalary, allowances: allAllowances + transportClaimTotal,
            otBreakdown, bonus: 0, absentDays, lateMinutes: totalLateMin,
            earlyOutMinutes: totalEarlyMin, loanDeduction, taxWithholdingPct: taxPct,
          })

          const previousYtdTax = prevTaxByEmp.get(eid) || 0
          const deductUnpaidLeave = leaveUnpaidDays > 0 ? Math.round((baseSalary / 30) * leaveUnpaidDays * 100) / 100 : 0

          const payload: Record<string, unknown> = {
            payroll_period_id, employee_id: eid, company_id: emp.company_id,
            year: currentYear, month: currentMonth,
            base_salary: baseSalary,
            allowance_position: Number(sal.allowance_position) || 0,
            allowance_transport: transportClaimTotal,
            allowance_food: Number(sal.allowance_food) || 0,
            allowance_phone: Number(sal.allowance_phone) || 0,
            allowance_housing: Number(sal.allowance_housing) || 0,
            allowance_other: 0,
            ot_amount: result.otAmount,
            ot_hours: otMin / 60,
            ot_weekday_minutes: otMin, ot_holiday_reg_minutes: 0, ot_holiday_ot_minutes: 0,
            bonus: 0, commission: 0, other_income: 0,
            gross_income: result.gross,
            deduct_absent: result.deductAbsent, deduct_late: result.deductLate,
            deduct_early_out: result.deductEarlyOut, deduct_loan: loanDeduction,
            deduct_other: deductUnpaidLeave,
            social_security_base: baseSalary, social_security_rate: 0.05,
            social_security_amount: result.sso,
            taxable_income: result.gross - result.sso,
            monthly_tax_withheld: result.tax,
            ytd_tax_withheld: previousYtdTax + result.tax,
            total_deductions: result.totalDeduct + deductUnpaidLeave,
            net_salary: Math.max(result.net - deductUnpaidLeave, 0),
            working_days: pastWorkDays.length, present_days: presentDays,
            absent_days: absentDays, late_count: records.filter((r: any) => r.status === "late" || (Number(r.late_minutes) || 0) > 0).length,
            leave_paid_days: leavePaidDays, leave_unpaid_days: leaveUnpaidDays,
            status: "draft", updated_at: new Date().toISOString(),
          }

          const { error } = await supa.from("payroll_records")
            .upsert(payload, { onConflict: "payroll_period_id,employee_id" })

          if (error) throw new Error(error.message)
          return { employee_id: eid, success: true }
        } catch (e: any) {
          return { employee_id: eid, success: false, error: e.message }
        }
      })
    )

    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value as any)
      else results.push({ employee_id: "unknown", success: false, error: String(r.reason) })
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount    = results.filter(r => !r.success).length
  const errors       = results.filter(r => !r.success).slice(0, 5)

  return NextResponse.json({
    total: employee_ids.length,
    success: successCount,
    failed: failCount,
    errors,
  })
}
