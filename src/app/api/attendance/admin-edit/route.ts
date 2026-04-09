import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"
import { logAudit } from "@/lib/auditLog"

/**
 * POST /api/attendance/admin-edit
 * Admin แก้ไขเวลาเข้า-ออกของพนักงานโดยตรง
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role, employee_id").eq("id", user.id).single()
  if (!dbUser || !["super_admin", "hr_admin"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json()
  const { record_id, clock_in, clock_out } = body

  if (!record_id) return NextResponse.json({ error: "record_id จำเป็น" }, { status: 400 })

  // ดึง record + shift
  // ดึง record แบบไม่ใช้ FK join (ป้องกัน FK name ไม่ตรง)
  const { data: rec } = await svc.from("attendance_records")
    .select("*").eq("id", record_id).single()
  if (!rec) return NextResponse.json({ error: "ไม่พบ record" }, { status: 404 })

  // ดึง shift + employee แยก
  let shift: any = null
  if (rec.shift_template_id) {
    const { data: s } = await svc.from("shift_templates").select("*").eq("id", rec.shift_template_id).single()
    shift = s
  }
  const { data: empData } = await svc.from("employees")
    .select("first_name_th, last_name_th, company_id, department:departments(name), company:companies(code)")
    .eq("id", rec.employee_id).single()

  // ── ดึง grace period ตามแผนก/บริษัท (ไม่ hardcode 5 อีกต่อไป) ──
  const adminDeptName    = (empData?.department as any)?.name as string | undefined
  const adminCompanyCode = (empData?.company as any)?.code as string | undefined
  const graceMinutes     = getLateThreshold(adminDeptName, adminCompanyCode)

  const updates: any = { is_manual: true, updated_at: new Date().toISOString() }

  // แปลงเวลา — รับเป็น "HH:mm" + optional date
  if (clock_in) {
    const clockInDate = body.clock_in_date || rec.work_date
    updates.clock_in = `${clockInDate}T${clock_in}:00+07:00`

    // คำนวณสายใหม่ — ใช้ grace period จากแผนก/บริษัท
    if (shift?.work_start) {
      const expectedStart = new Date(`${rec.work_date}T${shift.work_start}+07:00`)
      const newClockIn = new Date(updates.clock_in)
      const lateMins = calcLateMinutes(newClockIn, expectedStart)
      updates.late_minutes = Math.max(lateMins - graceMinutes, 0)
      updates.status = updates.late_minutes > 0 ? "late" : "present"
    }
  }

  if (clock_out) {
    const clockOutDate = body.clock_out_date || rec.work_date
    updates.clock_out = `${clockOutDate}T${clock_out}:00+07:00`
  }

  // คำนวณ work_minutes ใหม่
  const finalIn = updates.clock_in ? new Date(updates.clock_in) : (rec.clock_in ? new Date(rec.clock_in) : null)
  const finalOut = updates.clock_out ? new Date(updates.clock_out) : (rec.clock_out ? new Date(rec.clock_out) : null)
  if (finalIn && finalOut) {
    updates.work_minutes = calcWorkMinutes(finalIn, finalOut, shift?.break_minutes ?? 60)

    // early_out
    if (shift?.work_end) {
      const expectedEnd = new Date(`${rec.work_date}T${shift.work_end}+07:00`)
      const diff = Math.round((expectedEnd.getTime() - finalOut.getTime()) / 60000)
      updates.early_out_minutes = diff > 0 ? diff : 0
    }
  }

  const { error } = await svc.from("attendance_records").update(updates).eq("id", record_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  const empName = empData ? `${empData.first_name_th} ${empData.last_name_th}` : rec.employee_id
  const { data: actorInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
  const actorName = actorInfo ? `${actorInfo.first_name_th} ${actorInfo.last_name_th}` : "Admin"

  logAudit(svc, {
    actorId: user.id, actorName,
    action: "admin_edit_attendance",
    entityType: "attendance_record", entityId: record_id,
    description: `${actorName} แก้ไขเวลาของ ${empName} วันที่ ${rec.work_date}${clock_in ? ` เข้า ${clock_in}` : ""}${clock_out ? ` ออก ${clock_out}` : ""}`,
    companyId: empData?.company_id,
  })

  return NextResponse.json({ success: true })
}
