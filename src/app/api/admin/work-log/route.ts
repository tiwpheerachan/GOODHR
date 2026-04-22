import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/work-log?company_id=xxx|all&from=2026-03-22&to=2026-04-21&dept_id=yyy
 * ดึง attendance + leave + salary ทุกพนักงานในงวด — service client (ไม่ติด RLS)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id") || "all"
  const from = p.get("from")
  const to = p.get("to")
  const deptId = p.get("dept_id")

  if (!from || !to) {
    return NextResponse.json({ error: "from, to required" }, { status: 400 })
  }

  const supa = createServiceClient()

  // 1) Employees — ถ้า all ดึงทุกบริษัท
  let empQ = supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, company_id, department:departments(name), branch:branches(name), company:companies(code)")
    .eq("is_active", true).is("deleted_at", null)
    .order("employee_code")
  if (companyId !== "all") empQ = empQ.eq("company_id", companyId)
  if (deptId) empQ = empQ.eq("department_id", deptId)
  const { data: employees } = await empQ
  if (!employees?.length) return NextResponse.json({ employees: [], attendance: [], leaves: [], salaries: {} })

  const empIds = employees.map((e: any) => e.id)

  // 2) Attendance + Leaves + Salary (batch 100)
  // Batch 30 คน × ~30 วัน = ~900 rows ต่อ batch (ไม่เกิน Supabase default 1000)
  const BATCH = 30
  let allAtt: any[] = []
  let allLeaves: any[] = []
  const salaryMap: Record<string, number> = {}

  for (let i = 0; i < empIds.length; i += BATCH) {
    const batch = empIds.slice(i, i + BATCH)
    const [attRes, lvRes, salRes] = await Promise.all([
      supa.from("attendance_records")
        .select("employee_id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, ot_minutes, work_minutes, half_day_leave")
        .in("employee_id", batch).gte("work_date", from).lte("work_date", to)
        .limit(5000),
      supa.from("leave_requests")
        .select("employee_id, start_date, end_date, status, is_half_day, half_day_period, leave_type:leave_types(name)")
        .in("employee_id", batch).lte("start_date", to).gte("end_date", from).in("status", ["approved"])
        .limit(2000),
      supa.from("salary_structures")
        .select("employee_id, base_salary")
        .in("employee_id", batch).is("effective_to", null)
        .limit(1000),
    ])
    if (attRes.data) allAtt = allAtt.concat(attRes.data)
    if (lvRes.data) allLeaves = allLeaves.concat(lvRes.data)
    for (const s of (salRes.data ?? [])) salaryMap[s.employee_id] = s.base_salary
  }

  // Format clock_in/out to Thai time
  for (const a of allAtt) {
    if (a.clock_in) a.clock_in_time = new Date(a.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
    if (a.clock_out) a.clock_out_time = new Date(a.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
  }

  // 3) ดึง payroll_records ของงวดนี้ (year + month จาก to date)
  const toDate = new Date(to + "T00:00:00")
  const payrollYear = toDate.getFullYear()
  const payrollMonth = toDate.getMonth() + 1
  const payrollMap: Record<string, any> = {}

  for (let i = 0; i < empIds.length; i += BATCH) {
    const batch = empIds.slice(i, i + BATCH)
    const { data: pr } = await supa.from("payroll_records")
      .select("employee_id, base_salary, gross_income, net_salary, ot_amount, deduct_late, deduct_absent, social_security_amount, monthly_tax_withheld, total_deductions, bonus, commission")
      .in("employee_id", batch).eq("year", payrollYear).eq("month", payrollMonth)
      .limit(1000)
    for (const r of (pr ?? [])) payrollMap[r.employee_id] = r
  }

  return NextResponse.json({ employees, attendance: allAtt, leaves: allLeaves, salaries: salaryMap, payrolls: payrollMap })
}
