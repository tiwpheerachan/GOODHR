import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary, getLateThreshold, type OTBreakdown } from "@/lib/utils/payroll"
import { logPayroll } from "@/lib/auditLog"

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

const DOW_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function workDaysBetween(
  start: string, end: string, holidays: Set<string>,
  shiftMap?: Map<string, { assignment_type: string }>,
  fixedDayoffs?: string[],
): string[] {
  const days: string[] = []
  const hasShiftData = shiftMap && shiftMap.size > 0
  const hasProfile   = fixedDayoffs !== undefined
  let cur = start
  while (cmp(cur, end) <= 0) {
    const assignment = hasShiftData ? shiftMap!.get(cur) : undefined
    if (assignment) {
      if (assignment.assignment_type === "work") days.push(cur)
    } else if (hasProfile) {
      const dowName = DOW_NAMES[dayOfWeek(cur)]
      if (!fixedDayoffs!.includes(dowName) && !holidays.has(cur)) days.push(cur)
    } else {
      const dow = dayOfWeek(cur)
      if (dow !== 0 && dow !== 6 && !holidays.has(cur)) days.push(cur)
    }
    cur = addDays(cur, 1)
  }
  return days
}

function isWorkDay(
  date: string, holidays: Set<string>,
  shiftMap?: Map<string, { assignment_type: string }>,
  fixedDayoffs?: string[],
): boolean {
  const assignment = (shiftMap && shiftMap.size > 0) ? shiftMap.get(date) : undefined
  if (assignment) return assignment.assignment_type === "work"
  if (fixedDayoffs !== undefined) {
    const dowName = DOW_NAMES[dayOfWeek(date)]
    return !fixedDayoffs.includes(dowName) && !holidays.has(date)
  }
  const dow = dayOfWeek(date)
  return dow !== 0 && dow !== 6 && !holidays.has(date)
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

  // ── Pre-fetch shift assignments + schedule profiles (batch) ────
  const [shiftAssignRes, schedProfileRes] = await Promise.all([
    supa.from("monthly_shift_assignments")
      .select("employee_id, work_date, assignment_type")
      .in("employee_id", employee_ids)
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd),
    supa.from("employee_schedule_profiles")
      .select("employee_id, fixed_dayoffs")
      .in("employee_id", employee_ids),
  ])

  // Group shift assignments by employee → Map<employee_id, Map<date, assignment>>
  const shiftByEmp = new Map<string, Map<string, { assignment_type: string }>>()
  for (const a of (shiftAssignRes.data ?? []) as any[]) {
    if (!shiftByEmp.has(a.employee_id)) shiftByEmp.set(a.employee_id, new Map())
    shiftByEmp.get(a.employee_id)!.set(a.work_date, { assignment_type: a.assignment_type })
  }

  // Group schedule profiles by employee → Map<employee_id, string[] | undefined>
  const profileByEmp = new Map<string, string[]>()
  for (const p of (schedProfileRes.data ?? []) as any[]) {
    if (p.fixed_dayoffs) profileByEmp.set(p.employee_id, p.fixed_dayoffs as string[])
  }

  // ── Pre-fetch attendance records ทุกคนในงวดนี้ (1 query แทน 500) ─
  const { data: allAtt } = await supa
    .from("attendance_records")
    .select("employee_id, work_date, status, late_minutes, early_out_minutes, ot_minutes, work_minutes, half_day_leave")
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
    .select("id, company_id, hire_date, is_attendance_exempt, department:departments(name), company:companies(code)")
    .in("id", employee_ids)

  const { data: salData } = await supa
    .from("salary_structures")
    .select("employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, tax_withholding_pct, ot_rate_normal, ot_rate_holiday, is_sso_exempt, is_tax_3pct, effective_from")
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

  // ── Pre-fetch loans, OT, prev payroll (batch queries) ─
  const [loanRes, otRes, prevPayrollRes] = await Promise.all([
    supa.from("employee_loans").select("employee_id, monthly_deduction")
      .in("employee_id", employee_ids).eq("status", "active"),
    supa.from("overtime_requests").select("employee_id, ot_start, ot_end, ot_rate, work_date")
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

  // ── ดึง existing payroll records เพื่อเก็บค่า manual ──
  const { data: existPRData } = await supa.from("payroll_records")
    .select("employee_id, is_manual_override, bonus, commission, other_income, deduct_other, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_other, ot_amount, ot_hours, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes, income_extras, deduction_extras")
    .eq("payroll_period_id", payroll_period_id)
    .in("employee_id", employee_ids)
  const existingPayrolls = new Map<string, any>()
  for (const p of (existPRData ?? [])) existingPayrolls.set(p.employee_id, p)

  // ── KPI Bonus: ดึงฐาน KPI + เกรดสำหรับทุกคนในงวด ──
  const { data: kpiSettings } = await supa
    .from("kpi_bonus_settings")
    .select("employee_id, standard_amount")
    .in("employee_id", employee_ids)
    .eq("is_active", true)
  const kpiSettingMap = new Map<string, number>()
  for (const k of (kpiSettings ?? [])) kpiSettingMap.set(k.employee_id, Number(k.standard_amount) || 0)

  const { data: kpiForms } = await supa
    .from("kpi_forms")
    .select("employee_id, grade, total_score")
    .in("employee_id", employee_ids)
    .eq("year", currentYear)
    .eq("month", currentMonth)
    .in("status", ["submitted", "approved", "acknowledged"])
  const kpiGradeMap = new Map<string, string>()
  for (const f of (kpiForms ?? [])) kpiGradeMap.set(f.employee_id, f.grade)

  function calcKpiBonus(eid: string): { amount: number; grade: string | null; standardAmount: number } {
    const std = kpiSettingMap.get(eid) ?? 0
    if (!std) return { amount: 0, grade: null, standardAmount: 0 }
    const grade = kpiGradeMap.get(eid)
    if (!grade) return { amount: 0, grade: "pending", standardAmount: std }
    const multiplier = grade === "A" ? 1.2 : grade === "B" ? 1.0 : grade === "C" ? 0.8 : 0
    return { amount: Math.round(std * multiplier), grade, standardAmount: std }
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

          // Shift + Profile สำหรับพนักงานคนนี้
          const empShiftMap = shiftByEmp.get(eid)
          const empDayoffs  = profileByEmp.has(eid) ? profileByEmp.get(eid) : undefined

          const hireDate = (emp.hire_date as string | null) ?? periodStart
          const effectiveStart = cmp(hireDate, periodStart) > 0 ? hireDate : periodStart
          const allWorkDays = workDaysBetween(effectiveStart, periodEnd, holidaySet, empShiftMap, empDayoffs)
          const pastWorkDays = allWorkDays.filter(d => cmp(d, todayStr) <= 0)

          // Leave calc
          const leaveDaySet = new Set<string>()
          let leavePaidDays = 0, leaveUnpaidDays = 0
          for (const l of (leaveByEmp.get(eid) ?? [])) {
            let cur = l.start_date as string
            const leaveEnd = l.end_date as string
            let cnt = 0
            while (cmp(cur, leaveEnd) <= 0) {
              if (isWorkDay(cur, holidaySet, empShiftMap, empDayoffs) && cmp(cur, periodStart) >= 0 && cmp(cur, periodEnd) <= 0) {
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
            else {
              if (!rec || rec.status === "absent") {
                // วัน ส-อา + ไม่มี record → ไม่นับขาด (shift=work อาจจัดกะผิด)
                const dow = dayOfWeek(d)
                if ((dow === 0 || dow === 6) && !rec) { /* skip */ }
                else absentDays++
              }
            }
          }

          const presentDays = records.filter((r: any) => ["present", "late", "early_out", "wfh"].includes(r.status)).length

          // Late & early
          const graceMinutes = getLateThreshold(emp.department?.name, emp.company?.code)
          const totalLateMin = records.reduce((s: number, r: any) => {
            if (r.half_day_leave === "morning") return s  // ลาเช้า → ไม่หักสาย
            return s + Math.max(0, (Number(r.late_minutes) || 0) - graceMinutes)
          }, 0)
          const totalEarlyMin = records.reduce((s: number, r: any) => {
            if (r.half_day_leave === "afternoon") return s  // ลาบ่าย → ไม่หักออกก่อน
            return s + (Number(r.early_out_minutes) || 0)
          }, 0)

          // OT แยกประเภท (weekday 1.5x / holiday_regular 1.0x / holiday_ot 3.0x)
          let weekdayOtMin  = 0
          let holidayRegMin = 0
          let holidayOtMin  = 0

          for (const r of records) {
            const otM = Number(r.ot_minutes) || 0
            if (otM <= 0) continue  // ไม่มี OT จาก attendance → skip

            const wd = r.work_date as string
            if (!isWorkDay(wd, holidaySet, empShiftMap, empDayoffs)) {
              holidayOtMin += otM
            } else {
              weekdayOtMin += otM
            }
          }

          // fallback: overtime_requests
          if (weekdayOtMin === 0 && holidayOtMin === 0 && holidayRegMin === 0) {
            for (const ot of (otByEmp.get(eid) ?? [])) {
              if (ot.ot_start && ot.ot_end) {
                const mins = Math.max(0, Math.round(
                  (new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000
                ))
                const rate = Number(ot.ot_rate) || 1.5
                if (rate >= 3.0) holidayOtMin += mins
                else if (rate <= 1.0) holidayRegMin += mins
                else weekdayOtMin += mins
              }
            }
          }

          const otBreakdown: OTBreakdown = {
            weekday_minutes: weekdayOtMin,
            holiday_regular_minutes: holidayRegMin,
            holiday_ot_minutes: holidayOtMin,
          }

          const baseSalary = Number(sal.base_salary) || 0
          const allAllowances = (Number(sal.allowance_position) || 0) + (Number(sal.allowance_food) || 0) +
            (Number(sal.allowance_phone) || 0) + (Number(sal.allowance_housing) || 0)
          const loanDeduction = loanByEmp.get(eid) || 0
          const taxPct = sal.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null

          // ถ้า exempt → ไม่หักมาสาย/ขาดงาน/ออกก่อน
          const isExempt = !!emp.is_attendance_exempt

          // ดึงค่า manual ที่ HR กรอกไว้ (commission, other_income ฯลฯ)
          const existPR = existingPayrolls.get(eid)
          const mCommission  = Number(existPR?.commission)   || 0
          const mOtherIncome = Number(existPR?.other_income) || 0
          const mDeductOther = Number(existPR?.deduct_other) || 0
          const mIsManual    = !!existPR?.is_manual_override

          // KPI Bonus
          const kpiBonus = calcKpiBonus(eid)
          const mBonus = mIsManual ? (existPR?.bonus ?? kpiBonus.amount) : kpiBonus.amount

          // OT: ใช้ค่าที่ HR เคยกรอกไว้ใน payroll_records (ถ้ายังไม่เคยกรอก = 0)
          // ใช้ ?? แทน || เพื่อรักษาค่า 0 ที่ HR ตั้งใจกรอก
          const manualOtAmount = existPR != null && existPR.ot_amount != null ? Number(existPR.ot_amount) : 0

          const result = calculatePayrollSummary({
            baseSalary, allowances: allAllowances,
            otBreakdown: { weekday_minutes: 0, holiday_regular_minutes: 0, holiday_ot_minutes: 0 },
            bonus: Number(mBonus),
            absentDays:      isExempt ? 0 : absentDays,
            lateMinutes:     isExempt ? 0 : totalLateMin,
            earlyOutMinutes: isExempt ? 0 : totalEarlyMin,
            loanDeduction, taxWithholdingPct: taxPct,
            otRateWeekday:   sal.ot_rate_normal  != null ? Number(sal.ot_rate_normal)  : null,
            otRateHoliday:   sal.ot_rate_holiday != null ? Number(sal.ot_rate_holiday) : null,
            isSsoExempt:     !!sal.is_sso_exempt,
            isTax3pct:       !!sal.is_tax_3pct,
          })

          const previousYtdTax = prevTaxByEmp.get(eid) || 0
          const deductUnpaidLeave = leaveUnpaidDays > 0 ? Math.round((baseSalary / 30) * leaveUnpaidDays * 100) / 100 : 0

          const payload: Record<string, unknown> = {
            payroll_period_id, employee_id: eid, company_id: emp.company_id,
            year: currentYear, month: currentMonth,
            base_salary: baseSalary,
            allowance_position: mIsManual ? Number(existPR?.allowance_position) : Number(sal.allowance_position) || 0,
            allowance_transport: mIsManual ? Number(existPR?.allowance_transport) : 0,
            allowance_food: mIsManual ? Number(existPR?.allowance_food) : Number(sal.allowance_food) || 0,
            allowance_phone: mIsManual ? Number(existPR?.allowance_phone) : Number(sal.allowance_phone) || 0,
            allowance_housing: mIsManual ? Number(existPR?.allowance_housing) : Number(sal.allowance_housing) || 0,
            allowance_other: mIsManual ? Number(existPR?.allowance_other) : 0,
            // OT: ใช้ค่าที่ HR กรอกเท่านั้น (ไม่คำนวณอัตโนมัติ)
            ot_amount: manualOtAmount,
            ot_hours: 0,
            ot_weekday_minutes: 0,
            ot_holiday_reg_minutes: 0,
            ot_holiday_ot_minutes: 0,
            bonus: Number(mBonus),
            kpi_grade: kpiBonus.grade,
            kpi_standard_amount: kpiBonus.standardAmount,
            commission: mCommission, other_income: mOtherIncome,
            income_extras: existPR?.income_extras || null,
            // gross = base + allowances + OT(HR กรอก) + bonus + commission + other
            gross_income: (() => {
              const useAllow = mIsManual
                ? Number(existPR?.allowance_position ?? sal.allowance_position ?? 0)
                  + Number(existPR?.allowance_transport ?? 0)
                  + Number(existPR?.allowance_food ?? sal.allowance_food ?? 0)
                  + Number(existPR?.allowance_phone ?? sal.allowance_phone ?? 0)
                  + Number(existPR?.allowance_housing ?? sal.allowance_housing ?? 0)
                  + Number(existPR?.allowance_other ?? 0)
                : allAllowances
              return baseSalary + useAllow + manualOtAmount + Number(mBonus) + mCommission + mOtherIncome
            })(),
            deduct_absent: result.deductAbsent, deduct_late: result.deductLate,
            deduct_early_out: result.deductEarlyOut, deduct_loan: loanDeduction,
            deduct_other: deductUnpaidLeave + mDeductOther,
            deduction_extras: existPR?.deduction_extras || null,
            social_security_base: baseSalary, social_security_rate: 0.05,
            social_security_amount: result.sso,
            taxable_income: (() => {
              const useAllow = mIsManual
                ? Number(existPR?.allowance_position ?? sal.allowance_position ?? 0)
                  + Number(existPR?.allowance_transport ?? 0)
                  + Number(existPR?.allowance_food ?? sal.allowance_food ?? 0)
                  + Number(existPR?.allowance_phone ?? sal.allowance_phone ?? 0)
                  + Number(existPR?.allowance_housing ?? sal.allowance_housing ?? 0)
                  + Number(existPR?.allowance_other ?? 0)
                : allAllowances
              const mGross = baseSalary + useAllow + manualOtAmount + Number(mBonus) + mCommission + mOtherIncome
              return mGross - result.sso
            })(),
            monthly_tax_withheld: result.tax,
            ytd_tax_withheld: previousYtdTax + result.tax,
            total_deductions: result.totalDeduct + deductUnpaidLeave + mDeductOther,
            net_salary: (() => {
              const useAllow = mIsManual
                ? Number(existPR?.allowance_position ?? sal.allowance_position ?? 0)
                  + Number(existPR?.allowance_transport ?? 0)
                  + Number(existPR?.allowance_food ?? sal.allowance_food ?? 0)
                  + Number(existPR?.allowance_phone ?? sal.allowance_phone ?? 0)
                  + Number(existPR?.allowance_housing ?? sal.allowance_housing ?? 0)
                  + Number(existPR?.allowance_other ?? 0)
                : allAllowances
              const mGross = baseSalary + useAllow + manualOtAmount + Number(mBonus) + mCommission + mOtherIncome
              return Math.max(mGross - result.totalDeduct - deductUnpaidLeave - mDeductOther, 0)
            })(),
            working_days: pastWorkDays.length, present_days: presentDays,
            absent_days: absentDays, late_count: records.filter((r: any) => (r.status === "late" || (Number(r.late_minutes) || 0) > 0) && r.half_day_leave !== "morning").length,
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

  // Audit log
  const { data: actorData } = await supa.from("users").select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", user.id).single()
  const actorEmp = actorData?.employee as any
  logPayroll(supa, {
    actorId: actorData?.employee_id || user.id,
    actorName: actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : undefined,
    action: "bulk_calculate",
    periodName: period ? `${period.month}/${period.year}` : undefined,
    count: successCount,
    companyId: period?.company_id,
  })

  return NextResponse.json({
    total: employee_ids.length,
    success: successCount,
    failed: failCount,
    errors,
  })
}
