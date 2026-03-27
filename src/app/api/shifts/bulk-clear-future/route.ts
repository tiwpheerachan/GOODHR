import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/shifts/bulk-clear-future
 *
 * ลบกะล่วงหน้า (ตั้งแต่พรุ่งนี้เป็นต้นไป) ของพนักงานที่ระบุ
 * ยกเว้น assignment_type = "holiday" (วันหยุดบริษัท)
 *
 * Body: { employee_codes: string[] }
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ตรวจสิทธิ์: ต้องเป็น admin
  const { data: userData } = await supa.from("users").select("role").eq("id", user.id).single()
  if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { employee_codes } = await req.json() as { employee_codes: string[] }
  if (!employee_codes?.length) return NextResponse.json({ error: "No employee_codes provided" }, { status: 400 })

  // ดึง employee_id จาก employee_code
  const { data: employees } = await supa
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th")
    .in("employee_code", employee_codes)

  if (!employees?.length) return NextResponse.json({ error: "No employees found", codes: employee_codes })

  const empIds = employees.map(e => e.id)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  // นับก่อนลบ
  const { count: beforeCount } = await supa
    .from("monthly_shift_assignments")
    .select("id", { count: "exact", head: true })
    .in("employee_id", empIds)
    .gte("work_date", tomorrowStr)
    .neq("assignment_type", "holiday")

  // ลบกะล่วงหน้า ยกเว้นวันหยุดบริษัท
  const { error, count: deletedCount } = await supa
    .from("monthly_shift_assignments")
    .delete({ count: "exact" })
    .in("employee_id", empIds)
    .gte("work_date", tomorrowStr)
    .neq("assignment_type", "holiday")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ลบ pending shift_change_requests ล่วงหน้าด้วย
  await supa
    .from("shift_change_requests")
    .update({ status: "auto_rejected", review_note: "ลบกะล่วงหน้าโดย Admin" })
    .in("employee_id", empIds)
    .gte("work_date", tomorrowStr)
    .eq("status", "pending")

  return NextResponse.json({
    success: true,
    message: `ลบกะล่วงหน้าของ ${employees.length} คน สำเร็จ`,
    deleted: deletedCount ?? beforeCount ?? 0,
    from_date: tomorrowStr,
    employees: employees.map(e => `${e.employee_code} ${e.first_name_th} ${e.last_name_th}`),
  })
}
