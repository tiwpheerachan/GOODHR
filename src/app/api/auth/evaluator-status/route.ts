import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// GET /api/auth/evaluator-status
//   คืน { is_evaluator: boolean }
//   true เมื่อ user ปัจจุบันเป็น:
//     - ผู้ประเมินใน employee_evaluators (additional)
//     - หรือ employees.kpi_evaluator_id ของใครก็ตาม
//     - หรือ หัวหน้าตรง (employee_manager_history) ของใครก็ตาม
//   ใช้ตัดสินว่าแสดงปุ่ม "TL" / allow access /manager
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ is_evaluator: false })

  const supa = createServiceClient()
  const { data: u } = await supa.from("users")
    .select("employee_id, role")
    .eq("id", user.id).maybeSingle()

  // role manager+ ถือว่า evaluator อยู่แล้ว
  if (u?.role && ["super_admin", "hr_admin", "manager"].includes(u.role)) {
    return NextResponse.json({ is_evaluator: true })
  }

  const empId = u?.employee_id as string | undefined
  if (!empId) return NextResponse.json({ is_evaluator: false })

  // 1) additional evaluator
  const ev = await supa.from("employee_evaluators")
    .select("id", { count: "exact", head: true })
    .eq("evaluator_id", empId)
  if ((ev.count ?? 0) > 0) return NextResponse.json({ is_evaluator: true })

  // 2) designated KPI evaluator
  try {
    const kpi = await supa.from("employees")
      .select("id", { count: "exact", head: true })
      .eq("kpi_evaluator_id", empId)
      .eq("is_active", true)
    if ((kpi.count ?? 0) > 0) return NextResponse.json({ is_evaluator: true })
  } catch {}

  // 3) direct manager
  const mh = await supa.from("employee_manager_history")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", empId)
    .is("effective_to", null)
  if ((mh.count ?? 0) > 0) return NextResponse.json({ is_evaluator: true })

  return NextResponse.json({ is_evaluator: false })
}
