import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET — ดึง schedule profiles ของพนักงานในบริษัท
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = new URL(request.url)
  const employeeId = url.searchParams.get("employee_id")

  const { data: userData } = await supa
    .from("users")
    .select("employee_id, employees(company_id)")
    .eq("id", user.id)
    .single()

  const companyId = (userData?.employees as any)?.company_id
  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  let query = supa
    .from("employee_schedule_profiles")
    .select("*, employee:employees(id, employee_code, first_name_th, last_name_th, department:departments(name)), default_shift:shift_templates(id, name, work_start, work_end)")
    .eq("company_id", companyId)

  if (employeeId) {
    query = query.eq("employee_id", employeeId)
  }

  const { data: profiles, error } = await query.order("created_at", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message })

  return NextResponse.json({ success: true, profiles })
}

// POST — ตั้งค่า/อัปเดต schedule profile
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await request.json()

  const { data: userData } = await supa
    .from("users")
    .select("employee_id, role, employees(company_id)")
    .eq("id", user.id)
    .single()

  const isSA = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const userCompanyId = (userData?.employees as any)?.company_id
  if (!userCompanyId) return NextResponse.json({ success: false, error: "No company" })

  // Support bulk upsert
  const items = Array.isArray(body) ? body : [body]

  for (const item of items) {
    const { employee_id, schedule_type, default_shift_id, fixed_dayoffs, work_code } = item

    // ดึง company_id จากพนักงานจริง (กรณี super_admin จัดกะให้พนักงานต่างบริษัท)
    let targetCompanyId = userCompanyId
    if (isSA && employee_id) {
      const { data: empData } = await supa
        .from("employees")
        .select("company_id")
        .eq("id", employee_id)
        .single()
      if (empData?.company_id) targetCompanyId = empData.company_id
    }

    const { error } = await supa
      .from("employee_schedule_profiles")
      .upsert({
        employee_id,
        company_id: targetCompanyId,
        schedule_type: schedule_type ?? "fixed",
        default_shift_id: default_shift_id ?? null,
        fixed_dayoffs: fixed_dayoffs ?? [],
        work_code: work_code ?? null,
      }, { onConflict: "employee_id" })

    if (error) return NextResponse.json({ success: false, error: error.message })
  }

  return NextResponse.json({ success: true })
}
