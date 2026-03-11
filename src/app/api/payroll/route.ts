import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary, type OTBreakdown } from "@/lib/utils/payroll"

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

// ── Core: คำนวณและ upsert payroll_records ───────────────────────────

type CalcResult =
  | { error: string }
  | { success: true; record: Record<string, unknown>; debug: Record<string, unknown>; history: any[] }

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
      .select("id, company_id, hire_date, department:departments(name)")
      .eq("id", employee_id)
      .single(),
    supa.from("salary_structures")
      .select("base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, effective_from, effective_to")
      .eq("employee_id", employee_id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (pRes.error || !pRes.data) return { error: "ไม่พบงวดเงินเดือน" }
  if (eRes.error || !eRes.data) return { error: "ไม่พบข้อมูลพนักงาน" }
  if (sRes.error || !sRes.data) return { error: "ยังไม่มีโครงสร้างเงินเดือน กรุณาบันทึกเงินเดือนพนักงานก่อน" }

  const period = pRes.data as any
  const emp    = eRes.data as any
  const sal    = sRes.data as any

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
  // ✅ ใช้ < (strict) เพื่อไม่นับวันนี้เป็นขาดงาน (อาจยังไม่ถึงเวลาเช็คอิน)
  const pastWorkDays = allWorkDays.filter(d => cmp(d, todayStr) < 0)

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
    if (!rec || rec.status === "absent") {
      absentDays++
      absentDates.push(d)
    }
    // หมายเหตุ: status = present/late/early_out/wfh/leave/holiday ไม่ถือว่าขาด
  }

  // ── สรุป attendance ────────────────────────────────────────────
  const presentDays = records.filter(r =>
    ["present", "late", "early_out", "wfh"].includes(r.status as string)
  ).length

  // ✅ นับครั้งสาย: status=late หรือ late_minutes > 0 (Number() เพราะ Supabase อาจ return string)
  const lateCount = records.filter(r =>
    r.status === "late" || (Number(r.late_minutes) || 0) > 0
  ).length

  const earlyCount = records.filter(r =>
    r.status === "early_out" || (Number(r.early_out_minutes) || 0) > 0
  ).length

  const totalLateMin = records.reduce(
    (s, r) => s + (Number(r.late_minutes)      || 0), 0
  )
  const totalEarlyMin = records.reduce(
    (s, r) => s + (Number(r.early_out_minutes) || 0), 0
  )

  // ── OT แยกประเภท ──────────────────────────────────────────────
  // ot_type column ไม่มีใน schema → นับ ot_minutes ทั้งหมดเป็น weekday OT
  const otBreakdown: OTBreakdown = {
    weekday_minutes:         records.reduce((s, r) => s + (Number(r.ot_minutes) || 0), 0),
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

  // ── Allowances รวม ─────────────────────────────────────────────
  const allAllowances =
    (Number(sal.allowance_position)  || 0) +
    (Number(sal.allowance_transport) || 0) +
    (Number(sal.allowance_food)      || 0) +
    (Number(sal.allowance_phone)     || 0) +
    (Number(sal.allowance_housing)   || 0)

  // ── คำนวณ ─────────────────────────────────────────────────────
  const result = calculatePayrollSummary({
    baseSalary:      Number(sal.base_salary),
    allowances:      allAllowances,
    otBreakdown,
    bonus:           0,
    absentDays,
    lateMinutes:     totalLateMin,
    earlyOutMinutes: totalEarlyMin,
    loanDeduction,
  })

  // ── upsert ────────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    payroll_period_id,
    employee_id,
    company_id:             emp.company_id,
    year:                   Number(period.year),
    month:                  Number(period.month),
    // รายได้
    base_salary:            Number(sal.base_salary),
    allowance_position:     Number(sal.allowance_position)  || 0,
    allowance_transport:    Number(sal.allowance_transport) || 0,
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
    deduct_other:           0,
    // ประกันสังคม
    social_security_base:   Number(sal.base_salary),
    social_security_rate:   0.05,
    social_security_amount: result.sso,
    // ภาษี
    taxable_income:         result.gross - result.sso,
    monthly_tax_withheld:   result.tax,
    ytd_tax_withheld:       result.tax,
    // รวม
    total_deductions:       result.totalDeduct,
    net_salary:             result.net,
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
    tax_monthly:        result.tax,
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

// ── POST /api/payroll — force recalculate (เรียกจาก admin หรือ salary page) ─
export async function POST(req: Request) {
  const body = await req.json()
  const { employee_id, payroll_period_id } = body as {
    employee_id:       string
    payroll_period_id: string
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

  const supa   = createServiceClient()
  const result = await calcAndSave(supa, employee_id, payroll_period_id)

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}

// ── GET /api/payroll?year=X&month=Y — คำนวณใหม่เสมอ ──────────────────
// salary page เรียก endpoint นี้ทุกครั้งที่โหลดหน้า
// ใช้ service role → ไม่มีปัญหา RLS
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year  = Number(searchParams.get("year")  || new Date().getFullYear())
  const month = Number(searchParams.get("month") || new Date().getMonth() + 1)

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