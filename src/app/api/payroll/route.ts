import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary, type OTBreakdown } from "@/lib/utils/payroll"

export async function POST(request: Request) {
  const { employee_id, payroll_period_id } = await request.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const [{ data: period }, { data: emp }, { data: sal }] = await Promise.all([
    supa.from("payroll_periods").select("*").eq("id", payroll_period_id).single(),
    supa.from("employees").select("*").eq("id", employee_id).single(),
    supa.from("salary_structures").select("*")
      .eq("employee_id", employee_id).is("effective_to", null)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!period || !emp || !sal)
    return NextResponse.json({ error: "ไม่พบข้อมูล" })

  // ── holidays ในงวดนี้ (วันหยุดบริษัท = ไม่นับขาด) ────────────────
  const { data: holidays } = await supa.from("company_holidays")
    .select("date").eq("company_id", emp.company_id).eq("is_active", true)
    .gte("date", period.start_date).lte("date", period.end_date)
  const holidaySet = new Set((holidays ?? []).map((h: any) => h.date))

  // ── attendance records ────────────────────────────────────────────
  const { data: attRecords } = await supa.from("attendance_records")
    .select("status, late_minutes, ot_minutes, work_minutes, ot_type, work_date")
    .eq("employee_id", employee_id)
    .gte("work_date", period.start_date)
    .lte("work_date", period.end_date)

  const records     = attRecords ?? []
  const presentDays = records.filter(r => ["present","late","wfh"].includes(r.status)).length
  const lateCount   = records.filter(r => r.status === "late").length
  const totalLateMin= records.reduce((s, r) => s + (r.late_minutes || 0), 0)
  const totalWorkMin= records.reduce((s, r) => s + (r.work_minutes || 0), 0)

  // ✅ หักขาดงานเฉพาะวันที่ไม่ใช่วันหยุดบริษัทและไม่ใช่เสาร์-อาทิตย์
  const absentDays = records.filter(r => {
    if (r.status !== "absent") return false
    if (holidaySet.has(r.work_date)) return false          // วันหยุดบริษัท
    const dow = new Date(r.work_date).getDay()
    if (dow === 0 || dow === 6) return false                // เสาร์-อาทิตย์
    return true
  }).length

  // ── OT แยก 3 ประเภทตามสูตร Excel ────────────────────────────────
  const otBreakdown: OTBreakdown = {
    weekday_minutes:         records.filter(r => !r.ot_type || r.ot_type === "weekday")
                               .reduce((s, r) => s + (r.ot_minutes || 0), 0),
    holiday_regular_minutes: records.filter(r => r.ot_type === "holiday_regular")
                               .reduce((s, r) => s + (r.ot_minutes || 0), 0),
    holiday_ot_minutes:      records.filter(r => r.ot_type === "holiday_ot")
                               .reduce((s, r) => s + (r.ot_minutes || 0), 0),
  }

  // ── leave ─────────────────────────────────────────────────────────
  const { data: leavePaid } = await supa.from("leave_requests")
    .select("total_days, leave_type:leave_types(is_paid)")
    .eq("employee_id", employee_id).eq("status", "approved")
    .gte("start_date", period.start_date).lte("end_date", period.end_date)

  const leavePaidDays   = (leavePaid ?? []).filter((l: any) => l.leave_type?.is_paid)
    .reduce((s: number, l: any) => s + l.total_days, 0)
  const leaveUnpaidDays = (leavePaid ?? []).filter((l: any) => !l.leave_type?.is_paid)
    .reduce((s: number, l: any) => s + l.total_days, 0)

  // ── loan ──────────────────────────────────────────────────────────
  const { data: activeLoan } = await supa.from("employee_loans")
    .select("monthly_deduction").eq("employee_id", employee_id).eq("status", "active")
  const loanDeduction = (activeLoan ?? []).reduce((s: number, l: any) => s + l.monthly_deduction, 0)

  const allAllowances = (sal.allowance_position || 0) + (sal.allowance_transport || 0)
    + (sal.allowance_food || 0) + (sal.allowance_phone || 0) + (sal.allowance_housing || 0)

  const remainingMonths = 12 - period.month + 1

  const result = calculatePayrollSummary({
    baseSalary:      sal.base_salary,
    allowances:      allAllowances,
    otBreakdown,
    bonus:           0,
    absentDays,                    // ✅ ไม่รวมวันหยุดบริษัท
    lateMinutes:     totalLateMin,
    loanDeduction,
    remainingMonths,
  })

  await supa.from("payroll_records").upsert({
    payroll_period_id,
    employee_id,
    company_id:              emp.company_id,
    year:                    period.year,
    month:                   period.month,
    base_salary:             sal.base_salary,
    allowance_position:      sal.allowance_position  || 0,
    allowance_transport:     sal.allowance_transport || 0,
    allowance_food:          sal.allowance_food      || 0,
    allowance_phone:         sal.allowance_phone     || 0,
    allowance_housing:       sal.allowance_housing   || 0,
    allowance_other:         0,
    ot_amount:               result.otAmount,
    ot_hours:                (otBreakdown.weekday_minutes + otBreakdown.holiday_regular_minutes + otBreakdown.holiday_ot_minutes) / 60,
    ot_weekday_minutes:      otBreakdown.weekday_minutes,
    ot_holiday_reg_minutes:  otBreakdown.holiday_regular_minutes,
    ot_holiday_ot_minutes:   otBreakdown.holiday_ot_minutes,
    bonus:                   0,
    commission:              0,
    other_income:            0,
    gross_income:            result.gross,
    deduct_absent:           result.deductAbsent,
    deduct_late:             result.deductLate,
    deduct_loan:             loanDeduction,
    deduct_other:            0,
    social_security_base:    sal.base_salary,
    social_security_rate:    0.05,
    social_security_amount:  result.sso,
    taxable_income:          (result.gross - result.sso) * 12,
    monthly_tax_withheld:    result.tax,
    ytd_tax_withheld:        result.tax,
    total_deductions:        result.totalDeduct,
    net_salary:              result.net,
    working_days:            records.length,
    present_days:            presentDays,
    absent_days:             absentDays,
    late_count:              lateCount,
    leave_paid_days:         leavePaidDays,
    leave_unpaid_days:       leaveUnpaidDays,
    status:                  "draft",
  }, { onConflict: "payroll_period_id,employee_id" })

  return NextResponse.json({
    success:    true,
    net_salary: result.net,
    breakdown: {
      gross:        result.gross,
      ot_amount:    result.otAmount,
      absent_days:  absentDays,
      holiday_days: holidaySet.size,
      deduct_late:  result.deductLate,
      deduct_absent:result.deductAbsent,
      sso:          result.sso,
      tax:          result.tax,
      net:          result.net,
    },
  })
}