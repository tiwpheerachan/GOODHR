import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getPayrollScope, scopeAllows } from "@/lib/utils/payroll-access"
import { calculatePayrollSummary, getLateThreshold, calcPF, computeAutoProrateDays, type OTBreakdown } from "@/lib/utils/payroll"
import { classifyOtFromRecords } from "@/lib/utils/ot-classification"
import { logPayroll } from "@/lib/auditLog"

// ── Supabase pagination helper (server max = 1000 rows) ──────────
async function fetchAll<T = any>(
  queryFn: (from: number, to: number) => any,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  while (true) {
    const { data } = await queryFn(from, from + pageSize - 1)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

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
  const scope = await getPayrollScope(supa, user.id)
  if (!scope.any) return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเงินเดือน" }, { status: 403 })

  // ── Pre-fetch period (ใช้ร่วมกันทุกคน) ─────────────────────────
  const { data: period, error: pErr } = await supa
    .from("payroll_periods")
    .select("id, year, month, start_date, end_date, company_id")
    .eq("id", payroll_period_id)
    .single()

  if (pErr || !period) {
    return NextResponse.json({ error: "ไม่พบงวดเงินเดือน" }, { status: 404 })
  }
  // สิทธิ์รายบริษัท: งวดนี้อยู่บริษัทที่มีสิทธิ์ไหม
  if (!scopeAllows(scope, period.company_id)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์บริษัทนี้" }, { status: 403 })
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
  // ⚠️ Supabase hard limit = 1000 rows → ต้อง paginate (78 คน × 31 วัน = 2400+)
  const [shiftAssignData, schedProfileRes] = await Promise.all([
    fetchAll((from, to) =>
      supa.from("monthly_shift_assignments")
        .select("employee_id, work_date, assignment_type")
        .in("employee_id", employee_ids)
        .gte("work_date", periodStart)
        .lte("work_date", periodEnd)
        .order("employee_id").order("work_date")
        .range(from, to)
    ),
    supa.from("employee_schedule_profiles")
      .select("employee_id, fixed_dayoffs")
      .in("employee_id", employee_ids),
  ])

  // Group shift assignments by employee → Map<employee_id, Map<date, assignment>>
  const shiftByEmp = new Map<string, Map<string, { assignment_type: string }>>()
  for (const a of shiftAssignData as any[]) {
    if (!shiftByEmp.has(a.employee_id)) shiftByEmp.set(a.employee_id, new Map())
    shiftByEmp.get(a.employee_id)!.set(a.work_date, { assignment_type: a.assignment_type })
  }

  // Group schedule profiles by employee → Map<employee_id, string[] | undefined>
  // ⚠️ fixed_dayoffs: [] (ว่าง) หมายถึง "ยังไม่ได้กำหนด" → ไม่ใช้ profile (fallback จ-ศ)
  const profileByEmp = new Map<string, string[]>()
  for (const p of (schedProfileRes.data ?? []) as any[]) {
    if (Array.isArray(p.fixed_dayoffs) && p.fixed_dayoffs.length > 0) {
      profileByEmp.set(p.employee_id, p.fixed_dayoffs as string[])
    }
  }

  // ── Pre-fetch attendance records ทุกคนในงวดนี้ ─
  // ⚠️ Supabase hard limit = 1000 → ต้อง paginate
  const allAtt = await fetchAll((from, to) =>
    supa.from("attendance_records")
      .select("employee_id, work_date, status, late_minutes, early_out_minutes, ot_minutes, work_minutes, half_day_leave")
      .in("employee_id", employee_ids)
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .order("employee_id").order("work_date")
      .range(from, to)
  )

  const attByEmp = new Map<string, any[]>()
  for (const a of allAtt) {
    const list = attByEmp.get(a.employee_id) || []
    list.push(a)
    attByEmp.set(a.employee_id, list)
  }

  // ── Pre-fetch leave requests ทุกคนในงวดนี้ (1 query) ────────────
  const { data: allLeaves } = await supa
    .from("leave_requests")
    .select("employee_id, start_date, end_date, is_half_day, leave_type:leave_types(is_paid)")
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
    .select("id, company_id, hire_date, resign_date, is_attendance_exempt, include_in_payroll, pre_employment_enabled, pre_employment_from, pre_employment_to, pre_employment_daily_rate, phase2_start_date, department:departments(name), company:companies(code)")
    .in("id", employee_ids)

  // ── เลือกโครงเงินเดือนที่ "มีผลในรอบนี้" (effective_from <= สิ้นรอบ) ──
  //   เดิมใช้ effective_to IS NULL (ตัวล่าสุด) → เงินเดือนขึ้นใหม่มีผลย้อนหลังกับรอบเก่า
  //   ใหม่: เอาตัวที่ effective_from ล่าสุดแต่ไม่เกินสิ้นรอบ → ปรับขึ้นรอบหน้าจะไม่กระทบรอบนี้
  const { data: salData } = await supa
    .from("salary_structures")
    .select("employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_vehicle, tax_withholding_pct, ot_rate_normal, ot_rate_holiday, is_sso_exempt, is_tax_3pct, provident_fund_pct, effective_from, effective_to")
    .in("employee_id", employee_ids)
    .lte("effective_from", periodEnd)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })

  // เอาโครงที่ effective_from ล่าสุด (แต่ <= สิ้นรอบ) ต่อคน = โครงที่มีผล ณ สิ้นรอบนั้น
  //   (ไม่เช็ค effective_to เพราะมันคือแค่ boundary ของ version ถัดไป — greatest effective_from ก็พอ)
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
  // ดึงแยก 2 query: (1) year+month เพื่อรองรับกรณี period_id เปลี่ยน (2) period_id ปกติ
  let existPRData: any[] = []
  const { data: d1 } = await supa.from("payroll_records")
    .select("employee_id, is_manual_override, bonus, kpi_grade, kpi_standard_amount, commission, other_income, deduct_other, deduct_absent, deduct_late, deduct_early_out, social_security_amount, monthly_tax_withheld, gross_income, total_deductions, net_salary, taxable_income, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_vehicle, allowance_other, ot_amount, ot_hours, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes, income_extras, deduction_extras")
    .eq("payroll_period_id", payroll_period_id)
    .in("employee_id", employee_ids)
  existPRData = d1 ?? []
  // Fallback: ถ้าไม่เจอ ลองดึงจาก year+month
  if (existPRData.length === 0) {
    const { data: d2 } = await supa.from("payroll_records")
      .select("employee_id, is_manual_override, bonus, kpi_grade, kpi_standard_amount, commission, other_income, deduct_other, deduct_absent, deduct_late, deduct_early_out, social_security_amount, monthly_tax_withheld, gross_income, total_deductions, net_salary, taxable_income, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_vehicle, allowance_other, ot_amount, ot_hours, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes, income_extras, deduction_extras")
      .eq("year", period.year).eq("month", period.month)
      .in("employee_id", employee_ids)
    existPRData = d2 ?? []
  }
  const existingPayrolls = new Map<string, any>()
  for (const p of existPRData) existingPayrolls.set(p.employee_id, p)
  console.log(`[bulk] existPR found: ${existPRData.length} records, OT>0: ${existPRData.filter(p => Number(p.ot_amount) > 0).length}`)

  // ── KPI Bonus: ดึงฐาน KPI + เกรด + 3 evaluation_type สำหรับทุกคนในงวด ──
  const GRADE_INCENTIVE_TABLE_BULK: Record<string, number> = { A: 5000, B: 4000, C: 3000, D: 2000 }

  // เลือก KPI standard_amount ที่ "มีผลในรอบนี้" (effective_from <= สิ้นรอบ, ล่าสุด)
  //   กันปรับ KPI ขึ้นแล้วย้อนหลังกับรอบเก่า
  const { data: kpiSettings } = await supa
    .from("kpi_bonus_settings")
    .select("employee_id, standard_amount, effective_from")
    .in("employee_id", employee_ids)
    .or(`effective_from.is.null,effective_from.lte.${periodEnd}`)
    .order("effective_from", { ascending: false })
  const kpiSettingMap = new Map<string, number>()
  for (const k of (kpiSettings ?? [])) {
    if (!kpiSettingMap.has(k.employee_id)) kpiSettingMap.set(k.employee_id, Number(k.standard_amount) || 0)
  }

  const { data: kpiForms } = await supa
    .from("kpi_forms")
    .select("employee_id, grade, total_score, evaluation_type, incentive_amount, bonus_amount")
    .in("employee_id", employee_ids)
    .eq("year", currentYear)
    .eq("month", currentMonth)
    .in("status", ["submitted", "approved", "acknowledged"])
  const kpiFormMap = new Map<string, any>()
  for (const f of (kpiForms ?? [])) kpiFormMap.set(f.employee_id, f)

  function calcKpiBonus(eid: string): { amount: number; grade: string | null; standardAmount: number; evaluationType: string; bonusAmount: number } {
    const form = kpiFormMap.get(eid)
    const evalType = form?.evaluation_type ?? "standard"
    const bonusAdd = Number(form?.bonus_amount) || 0

    if (form && evalType === "money_only") {
      const amt = Number(form.incentive_amount) || 0
      return { amount: Math.round(amt + bonusAdd), grade: "manual", standardAmount: amt, evaluationType: "money_only", bonusAmount: bonusAdd }
    }
    if (form && evalType === "grade_incentive" && form.grade) {
      const std = GRADE_INCENTIVE_TABLE_BULK[form.grade] ?? 0
      return { amount: Math.round(std + bonusAdd), grade: form.grade, standardAmount: std, evaluationType: "grade_incentive", bonusAmount: bonusAdd }
    }

    // standard mode (logic เดิม)
    const std = kpiSettingMap.get(eid) ?? 0
    if (!std) return { amount: Math.round(bonusAdd), grade: form?.grade ?? null, standardAmount: 0, evaluationType: evalType, bonusAmount: bonusAdd }
    const grade = form?.grade
    if (!grade) return { amount: 0, grade: "pending", standardAmount: std, evaluationType: "standard", bonusAmount: 0 }
    const multiplier = grade === "A" ? 1.2 : grade === "B" ? 1.0 : grade === "C" ? 0.8 : 0
    return { amount: Math.round(std * multiplier + bonusAdd), grade, standardAmount: std, evaluationType: "standard", bonusAmount: bonusAdd }
  }

  // ── Guard: กรอง employee ที่ company_id ไม่ตรงกับ period ──────
  const validEmployeeIds = employee_ids.filter(eid => {
    const emp = empMap.get(eid)
    // company_id ต้องตรงรอบ + ต้องไม่ถูกปิด "คิดในเงินเดือน"
    return emp && emp.company_id === period.company_id && emp.include_in_payroll !== false
  })
  const skippedCount = employee_ids.length - validEmployeeIds.length
  if (skippedCount > 0) {
    console.warn(`[bulk] Skipped ${skippedCount} employees: company_id mismatch or excluded from payroll (period ${period.company_id})`)
  }

  // ── Process each employee ───────────────────────────────────────
  const results: { employee_id: string; success: boolean; error?: string }[] = []

  // Add skipped results
  for (const eid of employee_ids) {
    if (!validEmployeeIds.includes(eid)) {
      results.push({ employee_id: eid, success: false, error: "company_id ไม่ตรงกับงวดเงินเดือน" })
    }
  }

  // Process in server-side batches of 25 (concurrent Promise.all)
  const SERVER_BATCH = 25
  for (let i = 0; i < validEmployeeIds.length; i += SERVER_BATCH) {
    const batch = validEmployeeIds.slice(i, i + SERVER_BATCH)
    const batchResults = await Promise.allSettled(
      batch.map(async (eid) => {
        try {
          const emp = empMap.get(eid)
          if (!emp) throw new Error("ไม่พบข้อมูลพนักงาน")

          const sal = salByEmp.get(eid) ?? {
            base_salary: 0, allowance_position: 0, allowance_transport: 0,
            allowance_food: 0, allowance_phone: 0, allowance_housing: 0, allowance_vehicle: 0,
            tax_withholding_pct: null,
          }

          // ⚠️ dedupe ตาม work_date — กัน duplicate rows ทำให้ sum OT/late inflate
          const rawRecords = attByEmp.get(eid) ?? []
          const recordMap = new Map<string, any>(rawRecords.map((r: any) => [r.work_date, r]))
          const records = Array.from(recordMap.values())

          // Shift + Profile สำหรับพนักงานคนนี้
          const empShiftMap = shiftByEmp.get(eid)
          const empDayoffs  = profileByEmp.has(eid) ? profileByEmp.get(eid) : undefined

          // ✅ Bug fix: ดู resign_date ด้วย — กันคนลาออกแล้วถูกนับ absent หลัง resign
          const hireDate = (emp.hire_date as string | null) ?? periodStart
          const resignDate = (emp.resign_date as string | null) ?? null
          // ── จ้างงาน 2 เฟส: attendance ของ "พนักงานจริง" เริ่มที่ phase2_start ──
          const twoPhase = !!emp.pre_employment_enabled && !!emp.phase2_start_date
          const empStart = twoPhase ? (emp.phase2_start_date as string) : hireDate
          const effectiveStart = cmp(empStart, periodStart) > 0 ? empStart : periodStart
          const effectiveEnd = (resignDate && cmp(resignDate, periodEnd) < 0) ? resignDate : periodEnd
          const allWorkDays = (resignDate && cmp(resignDate, periodStart) < 0)
            ? []
            : workDaysBetween(effectiveStart, effectiveEnd, holidaySet, empShiftMap, empDayoffs)
          const pastWorkDays = allWorkDays.filter(d => cmp(d, todayStr) <= 0)

          // ── Phase 1 (Pre-Employee): ค่าจ้าง/วัน × วันทำงานจริงในช่วง pre-employment ที่ทับงวดนี้ ──
          let phase1WorkDays = 0
          if (twoPhase && emp.pre_employment_from && emp.pre_employment_to) {
            const p1Start = cmp(emp.pre_employment_from, periodStart) > 0 ? (emp.pre_employment_from as string) : periodStart
            const p1End   = cmp(emp.pre_employment_to, periodEnd)   < 0 ? (emp.pre_employment_to as string)   : periodEnd
            if (cmp(p1Start, p1End) <= 0) {
              phase1WorkDays = workDaysBetween(p1Start, p1End, holidaySet, empShiftMap, empDayoffs)
                .filter(d => cmp(d, todayStr) <= 0).length
            }
          }

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
            // ✅ ลาครึ่งวัน → นับเป็น 0.5 วัน (หักครึ่งวัน ไม่ใช่เต็มวัน)
            const units = l.is_half_day ? cnt * 0.5 : cnt
            if (l.leave_type?.is_paid) leavePaidDays += units
            else leaveUnpaidDays += units
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
          // ⚠️ late_minutes ถูกหัก grace period ไว้แล้วตอนเช็คอิน → ใช้ค่าตรงๆ
          const totalLateMin = records.reduce((s: number, r: any) => {
            if (r.half_day_leave === "morning") return s  // ลาเช้า → ไม่หักสาย
            return s + (Number(r.late_minutes) || 0)
          }, 0)
          const totalEarlyMin = records.reduce((s: number, r: any) => {
            if (r.half_day_leave === "afternoon") return s  // ลาบ่าย → ไม่หักออกก่อน
            return s + (Number(r.early_out_minutes) || 0)
          }, 0)

          // OT แยกประเภท — ใช้ rate จาก overtime_requests (เดิมใช้แค่ isWorkDay ผิด)
          const empApprovedOts = (otByEmp.get(eid) ?? []) as any[]
          const hasAttOt = records.some((r: any) => Number(r.ot_minutes) > 0)
          let otBreakdown: OTBreakdown

          if (hasAttOt) {
            otBreakdown = classifyOtFromRecords(
              records,
              empApprovedOts,
              (wd: string) => isWorkDay(wd, holidaySet, empShiftMap, empDayoffs),
            )
          } else {
            // fallback: ไม่มี attendance OT → ใช้ requests ตรงๆ
            let weekdayOtMin = 0, holidayRegMin = 0, holidayOtMin = 0
            for (const ot of empApprovedOts) {
              if (!ot.ot_start || !ot.ot_end) continue
              const mins = Math.max(0, Math.round(
                (new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000
              ))
              const rate = Number(ot.ot_rate) || 1.5
              if (rate >= 3.0)      holidayOtMin  += mins
              else if (rate <= 1.0) holidayRegMin += mins
              else                  weekdayOtMin  += mins
            }
            otBreakdown = {
              weekday_minutes: weekdayOtMin,
              holiday_regular_minutes: holidayRegMin,
              holiday_ot_minutes: holidayOtMin,
            }
          }

          const baseSalary = Number(sal.base_salary) || 0
          // Phase 2 auto-prorate (เดือนแรกของ 2 เฟส): prorate ฐานเงินเดือนตาม phase2_start
          const autoPhase2Prorate = twoPhase ? computeAutoProrateDays(emp.phase2_start_date, periodStart, periodEnd) : null
          const p2Factor = (autoPhase2Prorate != null && autoPhase2Prorate > 0 && autoPhase2Prorate < 30) ? autoPhase2Prorate / 30 : 1
          const effectiveBase = Math.round(baseSalary * p2Factor)   // ฐาน Phase 2 (พนักงานจริง)
          // Phase 1: ค่าจ้าง/วัน × วันทำงานจริง → จ่ายเป็น "ค่าอื่นๆ", ภาษี 3% เท่านั้น
          const phase1DailyRate = Number(emp.pre_employment_daily_rate) || 500
          const phase1Wage = twoPhase ? Math.round(phase1DailyRate * phase1WorkDays) : 0
          const phase1Tax  = Math.round(phase1Wage * 0.03)
          const allAllowances = (Number(sal.allowance_position) || 0) + (Number(sal.allowance_food) || 0) +
            (Number(sal.allowance_phone) || 0) + (Number(sal.allowance_housing) || 0) +
            (Number(sal.allowance_vehicle) || 0)
          const loanDeduction = loanByEmp.get(eid) || 0
          const taxPct = sal.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null

          // ถ้า exempt → ไม่หักมาสาย/ขาดงาน/ออกก่อน
          const isExempt = !!emp.is_attendance_exempt

          // ดึงค่า manual ที่ HR กรอกไว้ (commission, other_income ฯลฯ)
          const existPR = existingPayrolls.get(eid)
          const mCommission  = Number(existPR?.commission)   || 0
          const mOtherIncome = Number(existPR?.other_income) || 0
          // deduct_other จาก deduction_extras เท่านั้น (ไม่รวม unpaid leave ที่สะสม)
          const de = existPR?.deduction_extras ?? {}
          const mDeductOther = Number(de.suspension || 0) + Number(de.card_lost || 0) + Number(de.uniform || 0)
            + Number(de.parking || 0) + Number(de.employee_products || 0)
            + Number(de.legal_enforcement || 0) + Number(de.student_loan || 0)
          const mIsManual    = !!existPR?.is_manual_override

          // KPI Bonus — ถ้า HR กรอกมือ (manual override) → ใช้ค่าที่ HR เก็บไว้
          const kpiBonus = calcKpiBonus(eid)
          const manualKpiGrade = existPR?.kpi_grade
          // ใช้ค่า manual ถ้า: (1) is_manual_override=true AND (2) มี grade ที่ไม่ใช่ pending หรือ bonus > 0
          const useManualKpi = mIsManual && (
            (manualKpiGrade && manualKpiGrade !== "pending") ||
            (Number(existPR?.bonus) || 0) > 0
          )
          const mBonus = useManualKpi ? (Number(existPR?.bonus) || 0) : kpiBonus.amount

          const result = calculatePayrollSummary({
            baseSalary: effectiveBase, allowances: allAllowances,
            otBreakdown, bonus: Number(mBonus),
            absentDays:      isExempt ? 0 : absentDays,
            lateMinutes:     isExempt ? 0 : totalLateMin,
            earlyOutMinutes: isExempt ? 0 : totalEarlyMin,
            loanDeduction, taxWithholdingPct: taxPct,
            otRateWeekday:   sal.ot_rate_normal  != null ? Number(sal.ot_rate_normal)  : null,
            otRateHoliday:   sal.ot_rate_holiday != null ? Number(sal.ot_rate_holiday) : null,
            isSsoExempt:     !!sal.is_sso_exempt,
            isTax3pct:       !!sal.is_tax_3pct,
            providentFundPct: sal.provident_fund_pct,
          })
          // กองทุน PF (หักจากฐาน Phase 2) + ภาษี Phase 1 (3%)
          const finalPF = calcPF(effectiveBase, sal.provident_fund_pct)
          const phase1TaxAdd = (mIsManual && existPR?.monthly_tax_withheld != null) ? 0 : phase1Tax

          const previousYtdTax = prevTaxByEmp.get(eid) || 0
          const deductUnpaidLeave = leaveUnpaidDays > 0 ? Math.round((baseSalary / 30) * leaveUnpaidDays * 100) / 100 : 0

          // หักขาดงาน/ลา: ถ้า HR แก้ไขมือ (manual override) → ใช้ค่าที่ HR กรอกไว้
          //   ถ้าไม่ได้แก้มือ → คำนวณจาก attendance + unpaid leave ตามปกติ
          const finalDeductAbsent = (mIsManual && existPR?.deduct_absent != null)
            ? Number(existPR.deduct_absent)
            : result.deductAbsent + deductUnpaidLeave

          // OT: ถ้า HR เคยกรอกทับ (is_manual_override) ใช้ค่า HR, ไม่งั้นใช้ค่าระบบ
          const finalOtAmount = (existPR && existPR.is_manual_override && existPR.ot_amount != null)
            ? Number(existPR.ot_amount)
            : result.otAmount

          // ✅ คำนวณ gross จริง — จาก payload จริง ไม่ใช่ result.gross
          const incExtras = existPR?.income_extras || {}
          const decExtras = existPR?.deduction_extras || {}
          const incExtrasTotal = Object.values(incExtras).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
          const decExtrasTotal = Object.values(decExtras).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
          // รวมทุก allowances จริง (manual หรือ system)
          const fAllowPos   = mIsManual ? Number(existPR?.allowance_position)  : Number(sal.allowance_position)  || 0
          const fAllowTrans = mIsManual ? Number(existPR?.allowance_transport) : 0
          const fAllowFood  = mIsManual ? Number(existPR?.allowance_food)      : Number(sal.allowance_food)      || 0
          const fAllowPhone = mIsManual ? Number(existPR?.allowance_phone)     : Number(sal.allowance_phone)     || 0
          const fAllowHouse = mIsManual ? Number(existPR?.allowance_housing)   : Number(sal.allowance_housing)   || 0
          const fAllowVeh   = mIsManual ? Number(existPR?.allowance_vehicle)   : Number(sal.allowance_vehicle)   || 0
          const fAllowOther = mIsManual ? Number(existPR?.allowance_other)     : 0
          //   ใช้ effectiveBase (prorate Phase 2) + phase1Wage (จ่ายเป็น "ค่าอื่นๆ")
          const finalGross = effectiveBase + fAllowPos + fAllowTrans + fAllowFood + fAllowPhone + fAllowHouse + fAllowVeh + fAllowOther
            + finalOtAmount + Number(mBonus) + mCommission + mOtherIncome + incExtrasTotal
            + phase1Wage
          const phase2Gross = finalGross - phase1Wage   // ฐานคิดภาษี Phase 2 (ไม่รวมค่าจ้าง Phase 1)
          // ✅ Tax: structural flag (is_tax_3pct) ชนะ manual override เสมอ
          //    ถ้าไม่ใช่ flag → ค่อยเช็ค manual / fixed % / auto (คิดจาก phase2Gross)
          const finalTax = (!!sal.is_tax_3pct
            ? Math.round(phase2Gross * 0.03)
            : (mIsManual && existPR?.monthly_tax_withheld != null)
              ? Number(existPR.monthly_tax_withheld)
              : (() => {
                  if (taxPct != null && taxPct >= 0) return Math.round(phase2Gross * (taxPct / 100))
                  return result.tax
                })()) + phase1TaxAdd   // + ภาษี ณ ที่จ่าย 3% ของ Phase 1
          // ✅ SSO: structural flag (is_sso_exempt) ชนะ manual override เสมอ
          const finalSso = !!sal.is_sso_exempt ? 0 : result.sso

          const payload: Record<string, unknown> = {
            payroll_period_id, employee_id: eid, company_id: emp.company_id,
            year: currentYear, month: currentMonth,
            base_salary: baseSalary,
            allowance_position: mIsManual ? Number(existPR?.allowance_position) : Number(sal.allowance_position) || 0,
            allowance_transport: mIsManual ? Number(existPR?.allowance_transport) : 0,
            allowance_food: mIsManual ? Number(existPR?.allowance_food) : Number(sal.allowance_food) || 0,
            allowance_phone: mIsManual ? Number(existPR?.allowance_phone) : Number(sal.allowance_phone) || 0,
            allowance_housing: mIsManual ? Number(existPR?.allowance_housing) : Number(sal.allowance_housing) || 0,
            allowance_vehicle: mIsManual ? Number(existPR?.allowance_vehicle) : Number(sal.allowance_vehicle) || 0,
            allowance_other: mIsManual ? Number(existPR?.allowance_other) : 0,
            // OT: ถ้า HR เคยกรอกทับ → ใช้ทุกค่าจาก HR (amount + minutes)
            ot_amount: finalOtAmount,
            ot_hours: mIsManual && existPR?.ot_hours != null ? Number(existPR.ot_hours) : (otBreakdown.weekday_minutes + otBreakdown.holiday_regular_minutes + otBreakdown.holiday_ot_minutes) / 60,
            ot_weekday_minutes: mIsManual && existPR?.ot_weekday_minutes != null ? Number(existPR.ot_weekday_minutes) : otBreakdown.weekday_minutes,
            ot_holiday_reg_minutes: mIsManual && existPR?.ot_holiday_reg_minutes != null ? Number(existPR.ot_holiday_reg_minutes) : otBreakdown.holiday_regular_minutes,
            ot_holiday_ot_minutes: mIsManual && existPR?.ot_holiday_ot_minutes != null ? Number(existPR.ot_holiday_ot_minutes) : otBreakdown.holiday_ot_minutes,
            bonus: Number(mBonus),
            kpi_grade: useManualKpi ? manualKpiGrade : kpiBonus.grade,
            kpi_standard_amount: useManualKpi ? (Number(existPR?.kpi_standard_amount) || kpiBonus.standardAmount) : kpiBonus.standardAmount,
            commission: mCommission, other_income: mOtherIncome,
            income_extras: existPR?.income_extras || null,
            // ✅ ค่าที่ HR กรอกมือ → เก็บรักษา | ค่า formula (tax,gross,net) → คำนวณใหม่
            // ⚠️ deduct_late/early_out คำนวณจาก attendance ใหม่เสมอ
            //    (กัน HR แก้ attendance แล้วเงินหักไม่อัปเดต)
            // หักขาดงาน/ลา: respect manual override (HR แก้มือแล้วไม่ถูกเขียนทับ)
            deduct_absent:    finalDeductAbsent,
            deduct_late:      result.deductLate,
            deduct_early_out: result.deductEarlyOut,
            deduct_loan:      loanDeduction,
            deduct_other:     mIsManual && existPR?.deduct_other != null     ? Number(existPR.deduct_other)     : mDeductOther,
            deduction_extras: existPR?.deduction_extras || null,
            ...(twoPhase ? { prorate_days: autoPhase2Prorate } : {}),
            social_security_base: effectiveBase, social_security_rate: 0.05,
            // SSO: structural flag (is_sso_exempt) ชนะ manual ทุกกรณี → ใช้ finalSso เสมอ
            social_security_amount: !!sal.is_sso_exempt
              ? 0
              : (mIsManual && existPR?.social_security_amount != null ? Number(existPR.social_security_amount) : finalSso),
            provident_fund:   finalPF,       // ✅ กองทุนสำรองเลี้ยงชีพ
            phase1_wage:      phase1Wage,    // ── Phase 1 (Pre-Employee) ──
            phase1_tax:       phase1Tax,
            phase1_work_days: phase1WorkDays,
            // ── ค่า formula → คำนวณใหม่จากค่าที่เก็บด้านบน ──
            ...(() => {
              // รวมค่า deductions จริงที่ใช้ (late/early → auto, ขาดงาน/ลา → respect manual)
              // unpaid leave รวมเข้า deduct_absent (เฉพาะกรณีไม่ได้แก้มือ)
              const fDeductAbsent = finalDeductAbsent
              const fDeductLate   = result.deductLate
              const fDeductEarly  = result.deductEarlyOut
              const fDeductOther  = mIsManual && existPR?.deduct_other != null ? Number(existPR.deduct_other) : mDeductOther
              // SSO: structural flag ชนะ manual override
              const fSso          = !!sal.is_sso_exempt
                ? 0
                : (mIsManual && existPR?.social_security_amount != null ? Number(existPR.social_security_amount) : finalSso)
              // tax = ภาษี Phase 2 + ภาษี 3% ของ Phase 1 (รวมใน finalTax แล้ว)
              const fTax          = finalTax
              const fTotalDeduct  = fDeductAbsent + fDeductLate + fDeductEarly + loanDeduction + fDeductOther + fSso + finalPF + fTax + decExtrasTotal
              return {
                gross_income:         finalGross,
                taxable_income:       finalGross - fSso,
                monthly_tax_withheld: fTax,
                ytd_tax_withheld:     previousYtdTax + fTax,
                total_deductions:     fTotalDeduct,
                net_salary:           Math.max(finalGross - fTotalDeduct, 0),
              }
            })(),
            // ⚠️ ค่าสถิติจาก attendance → refresh ทุกครั้งเสมอ (ไม่ล็อกตาม is_manual_override)
            //    เพราะค่าเหล่านี้คือ "ข้อเท็จจริง" จาก attendance_records — เปลี่ยน attendance แล้วต้องสะท้อน
            working_days:      pastWorkDays.length,
            present_days:      presentDays,
            absent_days:       absentDays,
            late_count:        records.filter((r: any) => (r.status === "late" || (Number(r.late_minutes) || 0) > 0) && r.half_day_leave !== "morning").length,
            leave_paid_days:   leavePaidDays,
            leave_unpaid_days: leaveUnpaidDays,
            status: "draft", updated_at: new Date().toISOString(),
          }

          // Debug log OT
          if (finalOtAmount > 0 || (existPR?.ot_amount && Number(existPR.ot_amount) > 0)) {
            console.log(`[bulk] ${emp.employee_code || eid}: existPR.ot=${existPR?.ot_amount} manual=${existPR?.is_manual_override} calc=${result.otAmount} → final=${finalOtAmount}`)
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
