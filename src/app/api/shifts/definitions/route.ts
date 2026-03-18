import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET — ดึงรายการกะทั้งหมดของบริษัท
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data: userData } = await supa
    .from("users")
    .select("employee_id, employees(company_id)")
    .eq("id", user.id)
    .single()

  const companyId = (userData?.employees as any)?.company_id
  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  const { data: shifts, error } = await supa
    .from("shift_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("work_start", { ascending: true })

  if (error) return NextResponse.json({ success: false, error: error.message })

  return NextResponse.json({ success: true, shifts })
}

// POST — สร้าง/แก้ไขกะ
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await request.json()

  const { data: userData } = await supa
    .from("users")
    .select("role, employee_id, employees(company_id)")
    .eq("id", user.id)
    .single()

  const companyId = (userData?.employees as any)?.company_id
  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  const { id, name, shift_type, work_start, work_end, break_minutes, is_overnight } = body

  if (id) {
    // Update existing
    const { error } = await supa
      .from("shift_templates")
      .update({ name, work_start, work_end, break_minutes: break_minutes ?? 60, is_overnight: is_overnight ?? false })
      .eq("id", id)
      .eq("company_id", companyId)
    if (error) return NextResponse.json({ success: false, error: error.message })
  } else {
    // Create new
    const { error } = await supa
      .from("shift_templates")
      .insert({
        company_id: companyId,
        name,
        shift_type: "normal",  // shift_type is a PostgreSQL ENUM — always use 'normal'
        work_start,
        work_end,
        break_minutes: break_minutes ?? 60,
        is_overnight: is_overnight ?? false,
        ot_start_after_minutes: 0,
      })
    if (error) return NextResponse.json({ success: false, error: error.message })
  }

  return NextResponse.json({ success: true })
}
