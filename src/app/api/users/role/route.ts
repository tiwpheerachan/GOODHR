import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET — ดึง role ของพนักงาน (by employee_id)
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = new URL(request.url)
  const employeeId = url.searchParams.get("employee_id")

  if (!employeeId) return NextResponse.json({ success: false, error: "employee_id required" })

  const { data: userData } = await supa
    .from("users")
    .select("id, role, is_active, employee_id")
    .eq("employee_id", employeeId)
    .maybeSingle()

  return NextResponse.json({ success: true, user: userData })
}

// POST — อัปเดต role ของพนักงาน
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ตรวจสอบว่า caller เป็น admin
  const { data: callerData } = await supa
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!callerData || !["super_admin", "hr_admin"].includes(callerData.role)) {
    return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์ — เฉพาะ Admin เท่านั้น" }, { status: 403 })
  }

  const body = await request.json()
  const { employee_id, role } = body as { employee_id: string; role: string }

  if (!employee_id || !role) {
    return NextResponse.json({ success: false, error: "employee_id and role required" })
  }

  const validRoles = ["employee", "manager", "hr_admin", "super_admin"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ success: false, error: `Invalid role: ${role}` })
  }

  // อัปเดต role ในตาราง users
  const { data: existingUser, error: findErr } = await supa
    .from("users")
    .select("id")
    .eq("employee_id", employee_id)
    .maybeSingle()

  if (findErr) return NextResponse.json({ success: false, error: findErr.message })

  if (!existingUser) {
    return NextResponse.json({ success: false, error: "ไม่พบข้อมูลผู้ใช้ของพนักงานนี้ (ยังไม่มี account)" })
  }

  const { error: updateErr } = await supa
    .from("users")
    .update({ role })
    .eq("id", existingUser.id)

  if (updateErr) return NextResponse.json({ success: false, error: updateErr.message })

  return NextResponse.json({ success: true, message: `อัปเดตสิทธิ์เป็น ${role} สำเร็จ` })
}
