import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePayrollSummary } from "@/lib/utils/payroll"

export async function POST(request: Request) {
  const { employee_id, payroll_period_id } = await request.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const supa = createServiceClient()

  const [{ data: period }, { data: emp }, { data: sal }] = await Promise.all([
    supa.from("payroll_periods").select("*").eq("id",payroll_period_id).single(),
    supa.from("employees").select("*").eq("id",employee_id).single(),
    supa.from("salary_structures").select("*").eq("employee_id",employee_id).is("effective_to",null).order("effective_from",{ascending:false}).limit(1).maybeSingle(),
  ])

  if (!period || !emp || !sal) return NextResponse.json({ error:"ไม่พบข้อมูล" })

  const { data: attRecords } = await supa.from("attendance_records")
    .select("status,late_minutes,ot_minutes,work_minutes")
    .eq("employee_id",employee_id).gte("work_date",period.start_date).lte("work_date",period.end_date)

  const records = attRecords ?? []
  const presentDays = records.filter(r => ["present","late","wfh"].includes(r.status)).length
  const absentDays = records.filter(r => r.status === "absent").length
  const lateCount = records.filter(r => r.status === "late").length
  const totalLateMin = records.reduce((s, r) => s + (r.late_minutes || 0), 0)
  const totalOTMin = records.reduce((s, r) => s + (r.ot_minutes || 0), 0)
  const totalWorkMin = records.reduce((s, r) => s + (r.work_minutes || 0), 0)

  const { data: leavePaid } = await supa.from("leave_requests").select("total_days,leave_type:leave_types(is_paid)").eq("employee_id",employee_id).eq("status","approved").gte("start_date",period.start_date).lte("end_date",period.end_date)
  const leavePaidDays = (leavePaid ?? []).filter((l: any) => l.leave_type?.is_paid).reduce((s: number, l: any) => s + l.total_days, 0)
  const leaveUnpaidDays = (leavePaid ?? []).filter((l: any) => !l.leave_type?.is_paid).reduce((s: number, l: any) => s + l.total_days, 0)

  const { data: activeLoan } = await supa.from("employee_loans").select("monthly_deduction").eq("employee_id",employee_id).eq("status","active")
  const loanDeduction = (activeLoan ?? []).reduce((s: number, l: any) => s + l.monthly_deduction, 0)

  const allAllowances = (sal.allowance_position || 0) + (sal.allowance_transport || 0) + (sal.allowance_food || 0) + (sal.allowance_phone || 0) + (sal.allowance_housing || 0)
  const monthNum = period.month
  const remainingMonths = 12 - monthNum + 1

  const result = calculatePayrollSummary({ baseSalary:sal.base_salary, allowances:allAllowances, otMinutes:totalOTMin, otRate:sal.ot_rate_normal || 1.5, absentDays, lateMinutes:totalLateMin, loanDeduction, remainingMonths })

  await supa.from("payroll_records").upsert({
    payroll_period_id, employee_id, company_id:emp.company_id, year:period.year, month:period.month,
    base_salary:sal.base_salary, allowance_position:sal.allowance_position||0, allowance_transport:sal.allowance_transport||0, allowance_food:sal.allowance_food||0, allowance_phone:sal.allowance_phone||0, allowance_housing:sal.allowance_housing||0, allowance_other:0,
    ot_amount:result.otAmount, ot_hours:totalOTMin/60, bonus:0, commission:0, other_income:0,
    gross_income:result.gross, deduct_absent:result.deductAbsent, deduct_late:result.deductLate, deduct_loan:loanDeduction, deduct_other:0,
    social_security_base:sal.base_salary, social_security_rate:0.05, social_security_amount:result.sso,
    taxable_income:(result.gross - result.sso) * 12, monthly_tax_withheld:result.tax, ytd_tax_withheld:result.tax,
    total_deductions:result.totalDeduct, net_salary:result.net,
    working_days:records.length, present_days:presentDays, absent_days:absentDays, late_count:lateCount,
    leave_paid_days:leavePaidDays, leave_unpaid_days:leaveUnpaidDays, status:"draft",
  }, { onConflict:"payroll_period_id,employee_id" })

  return NextResponse.json({ success:true, net_salary:result.net })
}
