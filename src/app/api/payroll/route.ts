import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary, getLateThreshold, type OTBreakdown } from "@/lib/utils/payroll"

// ── Date helpers (pure string — ไม่มี timezone conversion) ───────────

function addDays(ds: string, n: number): string {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-")
}

function dayOfWeek(ds: string): number {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()   // 0=อา, 6=ส
}

function cmp(a: string, b: string): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0
}

/** วันทำงาน (จ–ศ ไม่ใช่วันหยุด) ในช่วง [start, end] */
function workDaysBetween(start: string, end: string, holidays: Set<string>): string[] {
  const days: string[] = []
  let cur = start
  while (cmp(cur, end) <= 0) {
    const dow = dayOfWeek(cur)
    if (dow !== 0 && dow !== 6 && !holidays.has(cur)) days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

/** วันที่ปัจจุบันในโซนเวลาไทย */
function todayTH(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

// ── Init: สร้าง payroll_records ตั้งต้นด้วยฐานเงินเดือน (ยังไม่คำนวณ attendance) ──

type CalcResult =
  | { error: string }
  | { success: true; record: Record<string, unknown>; debug: Record<string, unknown>; history: any[] }

/**
 * สร้าง record ตั้งต้น: base_salary + allowances → gross → SSO + tax → net
 * ยังไม่หัก late/absent/early_out (= 0 ทั้งหมด)
 * ใช้ตอน createPeriod เพื่อให้พนักงานเห็นเงินเดือนตั้งต้นทันที
 */
async function initRecord(
  supa:              any,
  employee_id:       string,
  payroll_period_id: string,
): Promise<CalcResult> {
  const [pRes, eRes, sRes] = await Promise.all([
    supa.from("payroll_periods")
      .select("id, year, month, start_date, end_date")
      .eq("id", payroll_period_id)
      .single(),
    supa.from("employees")
      .select("id, company_id, hire_date")
      .eq("id", employee_id)
      .single(),
    supa.from("salary_structures")
      .select("base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, tax_withholding_pct")
      .eq("employee_id", employee_id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (pRes.error || !pRes.data) return { error: "ไม่พบงวดเงินเดือน" }
  if (eRes.error || !eRes.data) return { error: "ไม่พบข้อมูลพนักงาน" }

  const period = pRes.data as any
  const emp    = eRes.data as any
  const sal    = sRes.data ?? {
    base_salary: 0, allowance_position: 0, allowance_transport: 0,
    allowance_food: 0, allowance_phone: 0, allowance_housing: 0,
    tax_withholding_pct: null,
  }

  const baseSalary = Number(sal.base_salary) || 0
  // ไม่รวม allowance_transport จาก salary_structures (ค่าเริ่มต้น = 0, ใช้ transport_claims แทน)
  const allAllowances =
    (Number(sal.allowance_position)  || 0) +
    (Number(sal.allowance_food)      || 0) +
    (Number(sal.allowance_phone)     || 0) +
    (Number(sal.allowance_housing)   || 0)

  const taxWithholdingPct: number | null =
    sal.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null

  // เงินกู้ที่ active
  const { data: loanData } = await supa
    .from("employee_loans")
    .select("monthly_deduction")
    .eq("employee_id", employee_id)
    .eq("status", "active")

  const loanDeduction = (loanData ?? []).reduce(
    (s: number, l: any) => s + (Number(l.monthly_deduction) || 0), 0
  )

  // ── ค่าเดินทางที่อนุมัติแล้วในงวดนี้ ────────────────────────────
  const { data: transportData } = await supa
    .from("transport_claims")
    .select("amount")
    .eq("employee_id", employee_id)
    .eq("payroll_period_id", payroll_period_id)
    .eq("status", "approved")

  const transportClaimTotal = (transportData ?? []).reduce(
    (s: number, t: any) => s + (Number(t.amount) || 0), 0
  )

  // คำนวณแบบ init: ไม่มี attendance deductions, ไม่มี OT
  // รวมค่าเดินทางที่อนุมัติแล้วเข้า allowances
  const result = calculatePayrollSummary({
    baseSalary,
    allowances:      allAllowances + transportClaimTotal,
    otBreakdown:     { weekday_minutes: 0, holiday_regular_minutes: 0, holiday_ot_minutes: 0 },
    bonus:           0,
    absentDays:      0,
    lateMinutes:     0,
    earlyOutMinutes: 0,
    loanDeduction,
    taxWithholdingPct,
  })

  const payload: Record<string, unknown> = {
    payroll_period_id,
    employee_id,
    company_id:             emp.company_id,
    year:                   Number(period.year),
    month:                  Number(period.month),
    base_salary:            baseSalary,
    allowance_position:     Number(sal.allowance_position)  || 0,
    allowance_transport:    transportClaimTotal,  // ค่าเดินทาง = เฉพาะที่อนุมัติจาก transport_claims
    allowance_food:         Number(sal.allowance_food)      || 0,
    allowance_phone:        Number(sal.allowance_phone)     || 0,
    allowance_housing:      Number(sal.allowance_housing)   || 0,
    allowance_other:        0,
    ot_amount:              0,
    ot_hours:               0,
    ot_weekday_minutes:     0,
    ot_holiday_reg_minutes: 0,
    ot_holiday_ot_minutes:  0,
    bonus:                  0,
    commission:             0,
    other_income:           0,
    gross_income:           result.gross,
    deduct_absent:          0,
    deduct_late:            0,
    deduct_early_out:       0,
    deduct_loan:            loanDeduction,
    deduct_other:           0,
    social_security_base:   baseSalary,
    social_security_rate:   0.05,
    social_security_amount: result.sso,
    taxable_income:         result.gross - result.sso,
    monthly_tax_withheld:   result.tax,
    ytd_tax_withheld:       result.tax,
    total_deductions:       result.totalDeduct,
    net_salary:             result.net,
    working_days:           0,
    present_days:           0,
    absent_days:            0,
    late_count:             0,
    leave_paid_days:        0,
    leave_unpaid_days:      0,
    status:                 "draft",
    updated_at:             new Date().toISOString(),
  }

  const { error: upsertErr } = await supa
    .from("payroll_records")
    .upsert(payload, { onConflict: "payroll_period_id,employee_id" })

  if (upsertErr) return { error: upsertErr.message }

  const { data: histData } = await supa
    .from("payroll_records")
    .select("year, month, net_salary, gross_income, total_deductions")
    .eq("employee_id", employee_id)
    .order("year",  { ascending: false })
    .order("month", { ascending: false })
    .limit(6)

  const history = ((histData ?? []) as any[]).reverse()

  return {
    success: true,
    record: payload,
    debug: {
      mode: "init",
      base_salary: baseSalary,
      allowances: allAllowances,
      transport_claims: transportClaimTotal,
      gross: result.gross,
      sso: result.sso,
      tax: result.tax,
      loan: loanDeduction,
      net: result.net,
      note: "ตั้งต้นด้วยฐานเงินเดือน ยังไม่มีการหักจาก attendance",
    },
    history,
  }
}

// ── Core: คำนวณและ upsert payroll_records (full calc รวม attendance) ──

async function calcAndSave(
  supa:              any,
  employee_id:       string,
  payroll_period_id: string,
): Promise<CalcResult> {

  // ── ดึงข้อมูลพื้นฐานพร้อมกัน ──────────────────────────────────
  const [pRes, eRes, sRes] = await Promise.all([
    supa.from("payroll_periods")
      .select("id, year, month, start_date, end_date")
      .eq("id", payroll_period_id)
      .single(),
    supa.from("employees")
      .select("id, company_id, hire_date, department:departments(name), company:companies(code)")
      .eq("id", employee_id)
      .single(),
    supa.from("salary_structures")
      .select("base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, tax_withholding_pct, effective_from, effective_to")
      .eq("employee_id", employee_id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (pRes.error || !pRes.data) return { error: "ไม่พบงวดเงินเดือน" }
  if (eRes.error || !eRes.data) return { error: "ไม่พบข้อมูลพนักงาน" }

  const period = pRes.data as any
  const emp    = eRes.data as any
  // ถ้ายังไม่มี salary_structures → ใช้ค่า default (เงินเดือน 0) เพื่อให้สร้าง record ได้
  const sal    = sRes.data ?? {
    base_salary: 0, allowance_position: 0, allowance_transport: 0,
    allowance_food: 0, allowance_phone: 0, allowance_housing: 0,
    tax_withholding_pct: null,
  }

  const periodStart: string = period.start_date
  const periodEnd:   string = period.end_date

  // ── วันหยุดบริษัทในงวด ─────────────────────────────────────────
  const { data: holData } = await supa
    .from("company_holidays")
    .select("date")
    .eq("company_id", emp.company_id)
    .eq("is_active", true)
    .gte("date", periodStart)
    .lte("date", periodEnd)

  const holidaySet = new Set<string>((holData ?? []).map((h: any) => h.date as string))

  // ── ข้อมูลการเข้างานในงวด ──────────────────────────────────────
  const { data: attData, error: attErr } = await supa
    .from("attendance_records")
    .select("work_date, status, late_minutes, early_out_minutes, ot_minutes, work_minutes")
    .eq("employee_id", employee_id)
    .gte("work_date", periodStart)
    .lte("work_date", periodEnd)

  const records   = (attData ?? []) as any[]
  const recordMap = new Map<string, any>(records.map(r => [r.work_date as string, r]))

  // ── วันทำงานที่คาดหวัง ────────────────────────────────────────
  const hireDate       = (emp.hire_date as string | null) ?? periodStart
  const effectiveStart = cmp(hireDate, periodStart) > 0 ? hireDate : periodStart
  const todayStr       = todayTH()

  const allWorkDays = workDaysBetween(effectiveStart, periodEnd, holidaySet)
  // ✅ รวมวันนี้ด้วย (<=) เพื่อนับสาย/ขาดของวันนี้ real-time
  const pastWorkDays = allWorkDays.filter(d => cmp(d, todayStr) <= 0)

  // ── วันลาที่อนุมัติแล้ว (overlap กับ period) ─────────────────
  // overlap condition: leave.start_date <= periodEnd AND leave.end_date >= periodStart
  const { data: leaveData } = await supa
    .from("leave_requests")
    .select("start_date, end_date, leave_type:leave_types(is_paid)")
    .eq("employee_id", employee_id)
    .eq("status", "approved")
    .lte("start_date", periodEnd)
    .gte("end_date",   periodStart)

  const leaveDaySet = new Set<string>()
  let leavePaidDays   = 0
  let leaveUnpaidDays = 0

  for (const l of (leaveData ?? []) as any[]) {
    let cur         = l.start_date as string
    const leaveEnd  = l.end_date   as string
    let cnt = 0
    while (cmp(cur, leaveEnd) <= 0) {
      const dow = dayOfWeek(cur)
      if (
        dow !== 0 && dow !== 6 &&          // ไม่ใช่วันหยุดสัปดาห์
        !holidaySet.has(cur) &&             // ไม่ใช่วันหยุดบริษัท
        cmp(cur, periodStart) >= 0 &&       // อยู่ในงวด
        cmp(cur, periodEnd)   <= 0
      ) {
        leaveDaySet.add(cur)
        cnt++
      }
      cur = addDays(cur, 1)
    }
    if (l.leave_type?.is_paid) leavePaidDays   += cnt
    else                       leaveUnpaidDays  += cnt
  }

  // ── นับวันขาดงาน ──────────────────────────────────────────────
  const absentDates: string[] = []
  let absentDays = 0

  for (const d of pastWorkDays) {
    if (leaveDaySet.has(d)) continue   // ลาอนุมัติแล้ว ไม่นับขาด
    const rec = recordMap.get(d)
    const isToday = d === todayStr

    if (isToday) {
      // วันนี้: นับขาดเฉพาะถ้ามี record ระบุ absent ชัดเจน
      // ถ้ายังไม่มี record (ยังไม่เช็คอิน) = ไม่นับขาด
      // แต่ถ้ามี record ที่เป็น late → นาทีสายจะถูกนับที่ lateMinutes อยู่แล้ว
      if (rec && rec.status === "absent") {
        absentDays++
        absentDates.push(d)
      }
    } else {
      // วันก่อนหน้า: ไม่มี record = ขาดงาน
      if (!rec || rec.status === "absent") {
        absentDays++
        absentDates.push(d)
      }
    }
    // หมายเหตุ: status = present/late/early_out/wfh/leave/holiday ไม่ถือว่าขาด
  }

  // ── สรุป attendance ────────────────────────────────────────────
  const presentDays = records.filter((r: any) =>
    ["present", "late", "early_out", "wfh"].includes(r.status as string)
  ).length

  // ✅ นับครั้งสาย: status=late หรือ late_minutes > 0 (Number() เพราะ Supabase อาจ return string)
  const lateCount = records.filter((r: any) =>
    r.status === "late" || (Number(r.late_minutes) || 0) > 0
  ).length

  const earlyCount = records.filter((r: any) =>
    r.status === "early_out" || (Number(r.early_out_minutes) || 0) > 0
  ).length

  // ── นาทีสาย: หัก grace period ตามแผนก/บริษัท ──
  const graceMinutes = getLateThreshold(emp.department?.name, emp.company?.code)
  const totalLateMin = records.reduce(
    (s: number, r: any) => {
      const raw = Number(r.late_minutes) || 0
      // หักเฉพาะส่วนที่เกิน grace period
      return s + Math.max(0, raw - graceMinutes)
    }, 0
  )
  const totalEarlyMin = records.reduce(
    (s: number, r: any) => s + (Number(r.early_out_minutes) || 0), 0
  )

  // ── OT แยกประเภท ──────────────────────────────────────────────
  // ดึง ot_minutes จาก attendance_records ก่อน
  let otFromAttendance = records.reduce((s: number, r: any) => s + (Number(r.ot_minutes) || 0), 0)

  // ถ้า attendance ไม่มี OT → ดึงจาก overtime_requests ที่อนุมัติแล้วเป็น fallback
  // (สำหรับ OT ที่อนุมัติก่อนแก้บั๊ก ที่ยังไม่ได้เขียนลง attendance_records)
  if (otFromAttendance === 0) {
    const { data: approvedOT } = await supa.from("overtime_requests")
      .select("ot_start, ot_end")
      .eq("employee_id", employee_id)
      .eq("status", "approved")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)

    for (const ot of (approvedOT ?? [])) {
      if (ot.ot_start && ot.ot_end) {
        const startMs = new Date(ot.ot_start).getTime()
        const endMs = new Date(ot.ot_end).getTime()
        otFromAttendance += Math.max(0, Math.round((endMs - startMs) / 60000))
      }
    }
  }

  const otBreakdown: OTBreakdown = {
    weekday_minutes:         otFromAttendance,
    holiday_regular_minutes: 0,
    holiday_ot_minutes:      0,
  }

  // ── เงินกู้ ────────────────────────────────────────────────────
  const { data: loanData } = await supa
    .from("employee_loans")
    .select("monthly_deduction")
    .eq("employee_id", employee_id)
    .eq("status", "active")

  const loanDeduction = (loanData ?? []).reduce(
    (s: number, l: any) => s + (Number(l.monthly_deduction) || 0), 0
  )

  // ── Allowances รวม (ไม่รวมค่าเดินทาง — ใช้จาก transport_claims แทน) ─
  const allAllowances =
    (Number(sal.allowance_position)  || 0) +
    (Number(sal.allowance_food)      || 0) +
    (Number(sal.allowance_phone)     || 0) +
    (Number(sal.allowance_housing)   || 0)

  // ── ค่าเดินทาง: ใช้จาก transport_claims ที่อนุมัติแล้วเท่านั้น ──
  // (allowance_transport ใน salary_structures ไม่ใช้ → ค่าเริ่มต้น = 0)
  const { data: transportData } = await supa
    .from("transport_claims")
    .select("amount")
    .eq("employee_id", employee_id)
    .eq("payroll_period_id", payroll_period_id)
    .eq("status", "approved")

  const transportClaimTotal = (transportData ?? []).reduce(
    (s: number, t: any) => s + (Number(t.amount) || 0), 0
  )

  // ── ภาษีหัก ณ ที่จ่าย (% ตั้งค่าเอง หรือ auto) ───────────────
  const taxWithholdingPct: number | null =
    sal.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null

  // ── คำนวณ ─────────────────────────────────────────────────────
  const result = calculatePayrollSummary({
    baseSalary:      Number(sal.base_salary),
    allowances:      allAllowances + transportClaimTotal,
    otBreakdown,
    bonus:           0,
    absentDays,
    lateMinutes:     totalLateMin,
    earlyOutMinutes: totalEarlyMin,
    loanDeduction,
    taxWithholdingPct,
  })

  // ── YTD ภาษี: ดึงยอดสะสมจากเดือนก่อนหน้าในปีเดียวกัน ──
  const currentYear = Number(period.year)
  const currentMonth = Number(period.month)
  const { data: prevPayrolls } = await supa
    .from("payroll_records")
    .select("monthly_tax_withheld")
    .eq("employee_id", employee_id)
    .eq("year", currentYear)
    .lt("month", currentMonth)

  const previousYtdTax = (prevPayrolls ?? []).reduce(
    (s: number, r: any) => s + (Number(r.monthly_tax_withheld) || 0), 0
  )

  // ── หักลาไม่ได้เงิน (unpaid leave) ──
  const deductUnpaidLeave = leaveUnpaidDays > 0
    ? Math.round((Number(sal.base_salary) / 30) * leaveUnpaidDays * 100) / 100
    : 0

  // ── upsert ────────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    payroll_period_id,
    employee_id,
    company_id:             emp.company_id,
    year:                   currentYear,
    month:                  currentMonth,
    // รายได้
    base_salary:            Number(sal.base_salary),
    allowance_position:     Number(sal.allowance_position)  || 0,
    allowance_transport:    transportClaimTotal,  // ค่าเดินทาง = เฉพาะที่อนุมัติจาก transport_claims
    allowance_food:         Number(sal.allowance_food)      || 0,
    allowance_phone:        Number(sal.allowance_phone)     || 0,
    allowance_housing:      Number(sal.allowance_housing)   || 0,
    allowance_other:        0,
    ot_amount:              result.otAmount,
    ot_hours:               (
      otBreakdown.weekday_minutes +
      otBreakdown.holiday_regular_minutes +
      otBreakdown.holiday_ot_minutes
    ) / 60,
    ot_weekday_minutes:     otBreakdown.weekday_minutes,
    ot_holiday_reg_minutes: otBreakdown.holiday_regular_minutes,
    ot_holiday_ot_minutes:  otBreakdown.holiday_ot_minutes,
    bonus:                  0,
    commission:             0,
    other_income:           0,
    gross_income:           result.gross,
    // การหัก
    deduct_absent:          result.deductAbsent,
    deduct_late:            result.deductLate,
    deduct_early_out:       result.deductEarlyOut,
    deduct_loan:            loanDeduction,
    deduct_other:           deductUnpaidLeave,  // รวมหักลาไม่ได้เงินไว้ใน deduct_other
    // ประกันสังคม
    social_security_base:   Number(sal.base_salary),
    social_security_rate:   0.05,
    social_security_amount: result.sso,
    // ภาษี
    taxable_income:         result.gross - result.sso,
    monthly_tax_withheld:   result.tax,
    ytd_tax_withheld:       previousYtdTax + result.tax,
    // รวม
    total_deductions:       result.totalDeduct + deductUnpaidLeave,
    net_salary:             Math.max(result.net - deductUnpaidLeave, 0),
    // สถิติ
    working_days:           pastWorkDays.length,
    present_days:           presentDays,
    absent_days:            absentDays,
    late_count:             lateCount,
    leave_paid_days:        leavePaidDays,
    leave_unpaid_days:      leaveUnpaidDays,
    status:                 "draft",
    updated_at:             new Date().toISOString(),
  }

  const { error: upsertErr } = await supa
    .from("payroll_records")
    .upsert(payload, { onConflict: "payroll_period_id,employee_id" })

  if (upsertErr) return { error: upsertErr.message }

  // ── ประวัติ 6 เดือน (ส่งกลับพร้อมกัน ไม่ต้อง fetch ซ้ำที่ client) ─
  const { data: histData } = await supa
    .from("payroll_records")
    .select("year, month, net_salary, gross_income, total_deductions")
    .eq("employee_id", employee_id)
    .order("year",  { ascending: false })
    .order("month", { ascending: false })
    .limit(6)

  const history = ((histData ?? []) as any[]).reverse()

  // ── debug info ────────────────────────────────────────────────
  const debug: Record<string, unknown> = {
    period:             `${periodStart} → ${periodEnd}`,
    today:              todayStr,
    hire_date:          emp.hire_date ?? null,
    base_salary:        Number(sal.base_salary),
    gross:              result.gross,
    sso:                result.sso,
    sso_max:            875,
    tax_monthly:        result.tax,
    tax_method:         result.taxMethod,
    tax_withholding_pct: taxWithholdingPct,
    late_count:         lateCount,
    late_total_min:     totalLateMin,
    deduct_late:        result.deductLate,
    early_count:        earlyCount,
    early_total_min:    totalEarlyMin,
    deduct_early:       result.deductEarlyOut,
    absent_days:        absentDays,
    absent_dates:       absentDates,
    deduct_absent:      result.deductAbsent,
    total_deduct:       result.totalDeduct,
    net:                result.net,
    work_days_expected: pastWorkDays.length,
    work_days_present:  presentDays,
    att_records_found:  records.length,
    att_err:            attErr?.message ?? null,
  }

  return { success: true, record: payload, debug, history }
}

// ── POST /api/payroll ─────────────────────────────────────────────────
// mode: "init" → สร้าง record ตั้งต้น (ฐานเงินเดือน, ยังไม่หัก attendance)
// mode: "calc" (default) → คำนวณเต็ม (รวม attendance, OT, leave, loan)
export async function POST(req: Request) {
  const body = await req.json()
  const { employee_id, payroll_period_id, mode } = body as {
    employee_id:       string
    payroll_period_id: string
    mode?:             "init" | "calc"
  }

  if (!employee_id || !payroll_period_id) {
    return NextResponse.json(
      { error: "employee_id และ payroll_period_id จำเป็นต้องมี" },
      { status: 400 }
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // เลือก mode: init = ตั้งต้นฐานเงินเดือน, calc = คำนวณเต็ม
  const result = mode === "init"
    ? await initRecord(supa, employee_id, payroll_period_id)
    : await calcAndSave(supa, employee_id, payroll_period_id)

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}

// ── GET /api/payroll?year=X&month=Y — คำนวณใหม่เสมอ ──────────────────
// salary page เรียก endpoint นี้ทุกครั้งที่โหลดหน้า
// ใช้ service role → ไม่มีปัญหา RLS
//
// ⚡ งวดเงินเดือน: 22 เดือนก่อน → 21 เดือนนี้
//    ถ้าวันนี้ > 21 → ปัจจุบันอยู่ในงวดเดือนถัดไปแล้ว
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  // ── ตรวจจับงวดที่ถูกต้องจากวันที่จริง ─────────────────────
  const now = new Date()
  const todayDay = now.getDate()
  let defaultYear  = now.getFullYear()
  let defaultMonth = now.getMonth() + 1  // 1-based

  // ถ้าวันที่ > 21 → อยู่ในงวดเดือนถัดไปแล้ว
  // เช่น วันที่ 23 มี.ค. → อยู่ในงวดเมษายน (22 มี.ค. → 21 เม.ย.)
  if (todayDay > 21) {
    defaultMonth++
    if (defaultMonth > 12) { defaultMonth = 1; defaultYear++ }
  }

  const year  = Number(searchParams.get("year")  || defaultYear)
  const month = Number(searchParams.get("month") || defaultMonth)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "year / month ไม่ถูกต้อง" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // หา employee_id ของ user ที่ login อยู่
  const { data: userData, error: userErr } = await supa
    .from("users")
    .select("employee_id")
    .eq("id", user.id)
    .single()

  if (userErr || !userData?.employee_id) {
    return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 })
  }
  const employee_id = userData.employee_id as string

  // หา company_id
  const { data: empData } = await supa
    .from("employees")
    .select("company_id")
    .eq("id", employee_id)
    .single()

  if (!empData?.company_id) {
    return NextResponse.json({ error: "ไม่พบข้อมูลบริษัท" }, { status: 404 })
  }

  // หา payroll_period
  const { data: period } = await supa
    .from("payroll_periods")
    .select("id")
    .eq("year",       year)
    .eq("month",      month)
    .eq("company_id", empData.company_id)
    .maybeSingle()

  if (!period) {
    return NextResponse.json(
      { error: `ไม่มีงวดเงินเดือน ${year}/${String(month).padStart(2, "0")} กรุณาให้ HR สร้างงวดก่อน` },
      { status: 404 }
    )
  }

  // ✅ คำนวณใหม่เสมอ — ไม่ return stale record
  const result = await calcAndSave(supa, employee_id, period.id as string)
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}