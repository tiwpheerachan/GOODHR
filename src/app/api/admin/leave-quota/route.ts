import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/leave-quota?company_id=xxx|all&year=2026&dept_id=yyy
 * ดึง leave_balances + leave_types ทุกพนักงาน — service client (ไม่ติด RLS)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id") || "all"
  const year = parseInt(p.get("year") || new Date().getFullYear().toString())
  const deptId = p.get("dept_id")

  const supa = createServiceClient()

  // 1) Employees
  let empQ = supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, nickname, company_id, department:departments(id,name), company:companies(code)")
    .eq("is_active", true).is("deleted_at", null)
    .order("employee_code")
    .limit(2000)
  if (companyId !== "all") empQ = empQ.eq("company_id", companyId)
  if (deptId) empQ = empQ.eq("department_id", deptId)
  const { data: employees, error: empErr } = await empQ
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })
  if (!employees?.length) return NextResponse.json({ employees: [], balances: [], leaveTypes: [], departments: [] })

  const empIds = employees.map((e: any) => e.id)

  // 2) Leave balances (batch 50)
  const BATCH = 50
  let allBalances: any[] = []
  for (let i = 0; i < empIds.length; i += BATCH) {
    const batch = empIds.slice(i, i + BATCH)
    const { data } = await supa.from("leave_balances")
      .select("id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days, remaining_days, carried_over")
      .in("employee_id", batch)
      .eq("year", year)
    if (data) allBalances = allBalances.concat(data)
  }

  // 3) Leave types — ดึงทั้ง (ก) ตามบริษัทพนักงาน และ (ข) ตาม type_id ที่ balance อ้างถึง
  //    (บางบริษัท เช่น Hashtag มี balance ที่อิง leave_type ของบริษัทอื่น → ต้อง resolve ข้ามบริษัท)
  const companyIds = Array.from(new Set(employees.map((e: any) => e.company_id).filter(Boolean)))
  const balTypeIds = Array.from(new Set(allBalances.map((b: any) => b.leave_type_id).filter(Boolean)))
  const SEL = "id, name, company_id, color_hex, is_paid, is_active"
  const [ltCo, ltById] = await Promise.all([
    supa.from("leave_types").select(SEL).in("company_id", companyIds),
    balTypeIds.length ? supa.from("leave_types").select(SEL).in("id", balTypeIds) : Promise.resolve({ data: [] as any[] }),
  ])
  const ltMap = new Map<string, any>()
  for (const t of [...(ltCo.data ?? []), ...((ltById as any).data ?? [])]) ltMap.set(t.id, t)
  const leaveTypes = Array.from(ltMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"))

  // 4) Leave requests (approved) — แสดงว่าลาไปวันไหนบ้าง
  let allLeaveReqs: any[] = []
  for (let i = 0; i < empIds.length; i += BATCH) {
    const batch = empIds.slice(i, i + BATCH)
    const { data } = await supa.from("leave_requests")
      .select("id, employee_id, leave_type_id, start_date, end_date, total_days, is_half_day, half_day_period, status, reason")
      .in("employee_id", batch)
      .eq("status", "approved")
      .gte("start_date", `${year}-01-01`)
      .lte("end_date", `${year}-12-31`)
      .order("start_date")
      .limit(2000)
    if (data) allLeaveReqs = allLeaveReqs.concat(data)
  }

  // 5) Departments (for filter)
  let deptQ = supa.from("departments").select("id, name, company_id").order("name")
  if (companyId !== "all") deptQ = deptQ.eq("company_id", companyId)
  const { data: departments } = await deptQ

  return NextResponse.json({
    employees,
    balances: allBalances,
    leaveTypes: leaveTypes ?? [],
    departments: departments ?? [],
    leaveRequests: allLeaveReqs,
  })
}
