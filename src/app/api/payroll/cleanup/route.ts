import { NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

/**
 * POST /api/payroll/cleanup
 * ลบ payroll_records ที่ employee.company_id ไม่ตรงกับ payroll_period.company_id
 * เฉพาะ super_admin / hr_admin เท่านั้น
 *
 * Body: { year?: number, month?: number, dry_run?: boolean }
 * - dry_run=true (default): แค่ดูว่ามีกี่ records ที่ผิด ไม่ลบจริง
 * - dry_run=false: ลบจริง
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ตรวจ role
  const supa = createServiceClient()
  const { data: userData } = await supa.from("users").select("role").eq("id", user.id).single()
  if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { year, month, dry_run = true } = body as { year?: number; month?: number; dry_run?: boolean }

  // ดึง payroll_records ทั้งหมด (หรือ filter ตาม year/month)
  let query = supa.from("payroll_records")
    .select("id, employee_id, payroll_period_id, year, month, company_id, net_salary")
  if (year) query = query.eq("year", year)
  if (month) query = query.eq("month", month)

  const { data: records, error: rErr } = await query
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  if (!records?.length) return NextResponse.json({ mismatched: 0, message: "ไม่พบ records" })

  // ดึง employee company_id
  const empIds = Array.from(new Set(records.map(r => r.employee_id)))
  const { data: emps } = await supa.from("employees").select("id, company_id, employee_code, first_name_th, last_name_th")
    .in("id", empIds)
  const empMap = new Map<string, any>()
  for (const e of (emps ?? [])) empMap.set(e.id, e)

  // ดึง period company_id
  const periodIds = Array.from(new Set(records.map(r => r.payroll_period_id)))
  const { data: periods } = await supa.from("payroll_periods").select("id, company_id, year, month")
    .in("id", periodIds)
  const periodMap = new Map<string, any>()
  for (const p of (periods ?? [])) periodMap.set(p.id, p)

  // ดึง company names
  const companyIds = Array.from(new Set([...(emps ?? []).map(e => e.company_id), ...(periods ?? []).map(p => p.company_id)]))
  const { data: companies } = await supa.from("companies").select("id, code, name_th").in("id", companyIds)
  const companyMap = new Map<string, any>()
  for (const c of (companies ?? [])) companyMap.set(c.id, c)

  // หา mismatched records
  const mismatched: {
    id: string; employee_id: string; employee_code?: string; employee_name?: string
    emp_company: string; period_company: string; year: number; month: number
  }[] = []

  for (const r of records) {
    const emp = empMap.get(r.employee_id)
    const period = periodMap.get(r.payroll_period_id)
    if (!emp || !period) continue
    if (emp.company_id !== period.company_id) {
      mismatched.push({
        id: r.id,
        employee_id: r.employee_id,
        employee_code: emp.employee_code,
        employee_name: `${emp.first_name_th} ${emp.last_name_th}`,
        emp_company: companyMap.get(emp.company_id)?.code ?? emp.company_id,
        period_company: companyMap.get(period.company_id)?.code ?? period.company_id,
        year: r.year,
        month: r.month,
      })
    }
  }

  if (dry_run) {
    return NextResponse.json({
      dry_run: true,
      mismatched_count: mismatched.length,
      records: mismatched.slice(0, 50),
      message: `พบ ${mismatched.length} records ที่ company ไม่ตรง — ส่ง dry_run=false เพื่อลบจริง`,
    })
  }

  // ลบจริง
  if (mismatched.length === 0) {
    return NextResponse.json({ deleted: 0, message: "ไม่มี records ที่ต้องลบ" })
  }

  const idsToDelete = mismatched.map(m => m.id)
  // ลบ batch ละ 100
  let deleted = 0
  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100)
    const { error } = await supa.from("payroll_records").delete().in("id", batch)
    if (error) {
      return NextResponse.json({
        error: error.message,
        deleted_so_far: deleted,
        remaining: idsToDelete.length - deleted,
      }, { status: 500 })
    }
    deleted += batch.length
  }

  return NextResponse.json({
    deleted,
    mismatched_count: mismatched.length,
    records: mismatched.slice(0, 20),
    message: `ลบ ${deleted} records ที่ company ไม่ตรงกับงวดเงินเดือนเรียบร้อย`,
  })
}
