import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET  — ดึงรายชื่อพนักงานพร้อมสถานะ can_self_schedule
 * POST — เปิด/ปิดสิทธิ์ self-schedule ให้พนักงาน
 */

// GET: ดึงรายชื่อพนักงานพร้อม flag
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data: userData } = await supa
    .from("users")
    .select("role, employee_id, employees(company_id)")
    .eq("id", user.id)
    .single()

  const isSA = userData?.role === "super_admin" || userData?.role === "hr_admin"
  if (!isSA) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const url = new URL(req.url)
  const companyId = url.searchParams.get("company_id") || (userData?.employees as any)?.company_id

  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  const { data: employees, error } = await supa
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, can_self_schedule, department:departments(name)")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("employee_code")

  if (error) return NextResponse.json({ success: false, error: error.message })

  return NextResponse.json({ success: true, employees })
}

// POST: toggle can_self_schedule
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await req.json()

  const { data: userData } = await supa
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const isSA = userData?.role === "super_admin" || userData?.role === "hr_admin"
  if (!isSA) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { employee_id, can_self_schedule } = body as {
    employee_id: string
    can_self_schedule: boolean
  }

  if (!employee_id || typeof can_self_schedule !== "boolean") {
    return NextResponse.json({ success: false, error: "employee_id and can_self_schedule required" })
  }

  const { error } = await supa
    .from("employees")
    .update({ can_self_schedule })
    .eq("id", employee_id)

  if (error) return NextResponse.json({ success: false, error: error.message })

  return NextResponse.json({ success: true, employee_id, can_self_schedule })
}
