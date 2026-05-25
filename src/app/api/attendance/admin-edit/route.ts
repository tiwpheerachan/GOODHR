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

  // ── หา record (existing) หรือเตรียมสร้างใหม่ ──
  // รองรับ 2 รูปแบบ: (1) ส่ง record_id (edit) (2) ส่ง employee_id + work_date (create / edit-or-create)
  let rec: any
  if (record_id) {
    const { data } = await svc.from("attendance_records").select("*").eq("id", record_id).single()
    rec = data
  } else if (body.employee_id && body.work_date) {
    // เผื่อมี record อยู่แล้ว → ใช้ตัวนั้น (idempotent)
    const { data } = await svc.from("attendance_records").select("*")
      .eq("employee_id", body.employee_id).eq("work_date", body.work_date).maybeSingle()
    if (data) rec = data
    else {
      // หา company_id จาก employee
      const { data: emp } = await svc.from("employees").select("company_id").eq("id", body.employee_id).single()
      if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
      // หา shift_template_id จาก monthly_shift_assignments (ถ้ามี)
      const { data: assign } = await svc.from("monthly_shift_assignments")
        .select("shift_id").eq("employee_id", body.employee_id).eq("work_date", body.work_date).maybeSingle()
      const { data: created, error: insErr } = await svc.from("attendance_records").insert({
        employee_id: body.employee_id,
        company_id: emp.company_id,
        work_date: body.work_date,
        shift_template_id: assign?.shift_id ?? null,
        status: "present",
        is_manual: true,
      }).select("*").single()
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      rec = created
    }
  } else {
    return NextResponse.json({ error: "ต้องส่ง record_id หรือ employee_id + work_date" }, { status: 400 })
  }
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

  // ── ดึง grace period ──
  //   1) work_schedules.late_threshold_minutes (per-employee override) ถ้ามี
  //   2) fallback ไป getLateThreshold(dept, company)
  const adminDeptName    = (empData?.department as any)?.name as string | undefined
  const adminCompanyCode = (empData?.company as any)?.code as string | undefined
  const { data: wsRows } = await svc.from("work_schedules")
    .select("late_threshold_minutes, effective_from, effective_to")
    .eq("employee_id", rec.employee_id)
    .order("effective_from", { ascending: false })
  let overrideGrace: number | null = null
  for (const ws of (wsRows ?? [])) {
    if (ws.effective_from && rec.work_date < ws.effective_from) continue
    if (ws.effective_to && rec.work_date >= ws.effective_to) continue
    if (ws.late_threshold_minutes != null) { overrideGrace = Number(ws.late_threshold_minutes); break }
  }
  const graceMinutes = overrideGrace !== null ? overrideGrace : getLateThreshold(adminDeptName, adminCompanyCode)

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

    // early_out — รองรับทั้งกะข้ามคืน + กะปกติแต่ค้างเลยเที่ยงคืน
    if (shift?.work_end) {
      const isOvernight = !!shift.is_overnight ||
        (!!shift.work_end && !!shift.work_start && String(shift.work_end) < String(shift.work_start))
      let expectedEnd = new Date(`${rec.work_date}T${shift.work_end}+07:00`)
      if (isOvernight) expectedEnd = new Date(expectedEnd.getTime() + 86_400_000)

      let outMs = finalOut.getTime()
      // Universal: ถ้า clock_out < clock_in → ค้างกะ → +24h
      if (finalIn && outMs < finalIn.getTime()) outMs += 86_400_000
      // Overnight extra snap ±24h
      if (isOvernight) {
        const candidates = [outMs, outMs + 86_400_000, outMs - 86_400_000]
        outMs = candidates.reduce((best, t) =>
          Math.abs(expectedEnd.getTime() - t) < Math.abs(expectedEnd.getTime() - best) ? t : best, outMs)
      }
      const diff = Math.round((expectedEnd.getTime() - outMs) / 60000)
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
