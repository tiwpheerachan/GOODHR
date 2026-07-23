import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]

// guard: ต้องล็อกอิน + เป็น admin (super_admin/hr_admin) → ใช้ดู config/log/สิทธิ์
export async function notifGuard(_req: NextRequest): Promise<{ error: NextResponse } | { svc: any; userId: string; role: string; empId: string | null; name: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: u } = await svc.from("users").select("role, employee_id").eq("id", user.id).single()
  if (!u || !ADMIN_ROLES.includes(u.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  let name: string | null = null
  if (u.employee_id) {
    const { data: e } = await svc.from("employees").select("first_name_th,last_name_th,nickname").eq("id", u.employee_id).maybeSingle()
    if (e) name = `${e.first_name_th || ""} ${e.last_name_th || ""}${e.nickname ? ` (${e.nickname})` : ""}`.trim()
  }
  return { svc, userId: user.id, role: u.role, empId: u.employee_id ?? null, name }
}

// canSend: super_admin/hr_admin เสมอ หรือ พนักงานที่อยู่ใน notification_senders
export async function canSend(svc: any, role: string, empId: string | null): Promise<boolean> {
  if (ADMIN_ROLES.includes(role)) return true
  if (!empId) return false
  const { data } = await svc.from("notification_senders").select("id").eq("employee_id", empId).maybeSingle()
  return !!data
}
