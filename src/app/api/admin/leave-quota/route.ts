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

  // 3) Leave types (per company)
  const companyIds = Array.from(new Set(employees.map((e: any) => e.company_id)))
  const { data: leaveTypes } = await supa.from("leave_types")
    .select("id, name, company_id, color_hex, is_paid, is_active")
    .in("company_id", companyIds)
    .eq("is_active", true)
    .order("name")

  // 4) Departments (for filter)
  let deptQ = supa.from("departments").select("id, name, company_id").order("name")
  if (companyId !== "all") deptQ = deptQ.eq("company_id", companyId)
  const { data: departments } = await deptQ

  return NextResponse.json({
    employees,
    balances: allBalances,
    leaveTypes: leaveTypes ?? [],
    departments: departments ?? [],
  })
}
