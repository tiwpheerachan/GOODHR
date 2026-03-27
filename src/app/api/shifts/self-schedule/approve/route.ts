import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"

/**
 * POST /api/shifts/self-schedule/approve
 *
 * หัวหน้า/Admin อนุมัติหรือปฏิเสธคำขอเปลี่ยนกะ
 * + Employee ถอนคำขอ (withdraw)
 * + Admin ลบกะพนักงาน (clear_shift)
 *
 * Body: {
 *   request_id: string          // สำหรับ approve/reject/withdraw
 *   action: "approve" | "reject" | "withdraw" | "clear_shift"
 *   review_note?: string
 *   // สำหรับ clear_shift:
 *   employee_id?: string
 *   work_date?: string
 * }
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await req.json()
  const { action, request_id, review_note, employee_id, work_date } = body as {
    action: "approve" | "reject" | "withdraw" | "clear_shift"
    request_id?: string
    review_note?: string
    employee_id?: string
    work_date?: string
  }

  // ── ดึงข้อมูล user ─────────────────────────────────────────
  const { data: userData } = await supa
    .from("users")
    .select("id, role, employee_id, employees(id, company_id)")
    .eq("id", user.id)
    .single()

  const role = userData?.role as string
  const isSA = role === "super_admin" || role === "hr_admin"
  const isManager = role === "manager"

  // ═══════════════════════════════════════════════════════════════
  // ACTION: clear_shift — Admin/HR ลบกะพนักงาน (ทำให้ไม่มีกะ)
  // ═══════════════════════════════════════════════════════════════
  if (action === "clear_shift") {
    if (!isSA && !isManager) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    if (!employee_id || !work_date) {
      return NextResponse.json({ success: false, error: "employee_id and work_date required" })
    }

    // ลบ assignment ของวันนั้น
    const { error } = await supa
      .from("monthly_shift_assignments")
      .delete()
      .eq("employee_id", employee_id)
      .eq("work_date", work_date)

    if (error) return NextResponse.json({ success: false, error: error.message })

    // auto-reject pending request ถ้ามี
    await supa
      .from("shift_change_requests")
      .update({ status: "auto_rejected", review_note: "กะถูกลบโดย Admin", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("employee_id", employee_id)
      .eq("work_date", work_date)
      .eq("status", "pending")

    return NextResponse.json({ success: true, message: "ลบกะสำเร็จ" })
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION: withdraw — พนักงานถอนคำขอ
  // ═══════════════════════════════════════════════════════════════
  if (action === "withdraw") {
    if (!request_id) return NextResponse.json({ success: false, error: "request_id required" })

    const { data: reqData } = await supa
      .from("shift_change_requests")
      .select("id, employee_id, work_date, status")
      .eq("id", request_id)
      .single()

    if (!reqData) return NextResponse.json({ success: false, error: "Request not found" })
    if (reqData.status !== "pending") {
      return NextResponse.json({ success: false, error: "สามารถถอนได้เฉพาะคำขอที่ยัง pending เท่านั้น" })
    }

    // ตรวจว่าเป็นเจ้าของหรือ admin
    const userEmpId = (userData?.employees as any)?.id
    if (reqData.employee_id !== userEmpId && !isSA) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    // ถอนคำขอ
    await supa
      .from("shift_change_requests")
      .update({ status: "withdrawn" })
      .eq("id", request_id)

    // Clear pending flag
    await supa
      .from("monthly_shift_assignments")
      .update({ has_pending_change: false })
      .eq("employee_id", reqData.employee_id)
      .eq("work_date", reqData.work_date)

    return NextResponse.json({ success: true, message: "ถอนคำขอสำเร็จ" })
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION: approve / reject — หัวหน้าอนุมัติ/ปฏิเสธ
  // ═══════════════════════════════════════════════════════════════
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ success: false, error: "Invalid action" })
  }

  if (!isSA && !isManager) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }
  if (!request_id) return NextResponse.json({ success: false, error: "request_id required" })

  // ดึง request
  const { data: reqData, error: reqErr } = await supa
    .from("shift_change_requests")
    .select("*")
    .eq("id", request_id)
    .single()

  if (reqErr || !reqData) {
    return NextResponse.json({ success: false, error: "Request not found" })
  }

  if (reqData.status !== "pending") {
    return NextResponse.json({ success: false, error: `คำขอนี้${reqData.status === "approved" ? "อนุมัติแล้ว" : "ไม่ได้อยู่สถานะ pending"}` })
  }

  const nowISO = new Date().toISOString()

  if (action === "approve") {
    // ── อนุมัติ: อัปเดต/สร้าง monthly_shift_assignments ──────────
    const { data: existingAssign } = await supa
      .from("monthly_shift_assignments")
      .select("id")
      .eq("employee_id", reqData.employee_id)
      .eq("work_date", reqData.work_date)
      .maybeSingle()

    if (existingAssign) {
      const { error: updateErr } = await supa
        .from("monthly_shift_assignments")
        .update({
          shift_id: reqData.requested_shift_id,
          assignment_type: reqData.requested_assignment_type,
          submitted_by: reqData.employee_id,
          has_pending_change: false,
        })
        .eq("employee_id", reqData.employee_id)
        .eq("work_date", reqData.work_date)
      if (updateErr) return NextResponse.json({ success: false, error: updateErr.message })
    } else {
      // ย้อนหลังที่ยังไม่มี assignment → สร้างใหม่
      const { error: insertErr } = await supa
        .from("monthly_shift_assignments")
        .insert({
          employee_id: reqData.employee_id,
          company_id: reqData.company_id,
          work_date: reqData.work_date,
          shift_id: reqData.requested_shift_id,
          assignment_type: reqData.requested_assignment_type,
          submitted_by: reqData.employee_id,
          has_pending_change: false,
        })
      if (insertErr) return NextResponse.json({ success: false, error: insertErr.message })
    }

    // อัปเดต request status
    await supa
      .from("shift_change_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: nowISO,
        review_note: review_note || null,
      })
      .eq("id", request_id)

    // ═══ ย้อนหลัง: ตรวจสอบ attendance + คำนวณ payroll ใหม่ ═══
    const todayBKK = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
    const isPast = reqData.work_date < todayBKK

    if (isPast && reqData.requested_shift_id) {
      try {
        // ดึง shift template ใหม่
        const { data: newShift } = await supa
          .from("shift_templates")
          .select("*")
          .eq("id", reqData.requested_shift_id)
          .single()

        if (newShift) {
          // ดึง attendance record ของวันนั้น
          const { data: attRec } = await supa
            .from("attendance_records")
            .select("*")
            .eq("employee_id", reqData.employee_id)
            .eq("work_date", reqData.work_date)
            .maybeSingle()

          if (attRec && attRec.clock_in) {
            // คำนวณ late_minutes ใหม่ตามกะใหม่
            const clockIn = new Date(attRec.clock_in)
            const expectedStart = new Date(reqData.work_date + "T" + newShift.work_start + "+07:00")
            let newLateMin = calcLateMinutes(clockIn, expectedStart)
            let newStatus = attRec.status as string

            // grace period: ≤5 นาที = ไม่สาย
            if (newLateMin > 5) {
              newStatus = "late"
            } else {
              newStatus = "present"
              newLateMin = 0
            }

            // คำนวณ work_minutes ใหม่
            let newWorkMin = attRec.work_minutes ?? 0
            if (attRec.clock_in && attRec.clock_out) {
              const clockOut = new Date(attRec.clock_out)
              newWorkMin = calcWorkMinutes(clockIn, clockOut, newShift.break_minutes ?? 60)
            }

            // อัปเดต attendance record
            await supa.from("attendance_records").update({
              shift_template_id: reqData.requested_shift_id,
              late_minutes: newLateMin,
              work_minutes: newWorkMin,
              status: newStatus,
              note: `กะเปลี่ยนย้อนหลัง: ${newShift.work_start?.substring(0,5)}-${newShift.work_end?.substring(0,5)}`,
            }).eq("id", attRec.id)

            // ═══ อัปเดต payroll ═══
            const workDate = new Date(reqData.work_date)
            const yr = workDate.getFullYear()
            const mo = workDate.getMonth() + 1
            const { data: payrollRec } = await supa.from("payroll_records")
              .select("id, base_salary")
              .eq("employee_id", reqData.employee_id)
              .eq("year", yr).eq("month", mo).maybeSingle()

            if (payrollRec) {
              const monthStart = `${yr}-${String(mo).padStart(2, "0")}-01`
              const monthEnd = new Date(yr, mo, 0).toISOString().split("T")[0]
              const { data: attRows } = await supa.from("attendance_records")
                .select("status, late_minutes")
                .eq("employee_id", reqData.employee_id)
                .gte("work_date", monthStart).lte("work_date", monthEnd)

              const rows = attRows ?? []
              const lateCount = rows.filter((r: any) => r.status === "late").length
              const absentCount = rows.filter((r: any) => r.status === "absent").length
              const totalLateMin = rows.reduce((s: number, r: any) => s + (r.late_minutes || 0), 0)
              const dailyRate = (payrollRec.base_salary ?? 0) / 26
              const minuteRate = dailyRate / 8 / 60

              await supa.from("payroll_records").update({
                deduct_late: Math.round(totalLateMin * minuteRate * 100) / 100,
                deduct_absent: Math.round(absentCount * dailyRate * 100) / 100,
                late_count: lateCount,
                absent_days: absentCount,
              }).eq("id", payrollRec.id)
            }
          }
        }
      } catch (e) {
        // ไม่ block การอนุมัติ ถ้า attendance/payroll recalc ล้มเหลว
        console.error("Retroactive attendance/payroll recalc error:", e)
      }
    }

    return NextResponse.json({ success: true, message: "อนุมัติเปลี่ยนกะสำเร็จ" })
  }

  if (action === "reject") {
    // ── ปฏิเสธ: คงกะเดิมไว้ ──────────────────────────────────
    await supa
      .from("shift_change_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: nowISO,
        review_note: review_note || null,
      })
      .eq("id", request_id)

    // Clear pending flag
    await supa
      .from("monthly_shift_assignments")
      .update({ has_pending_change: false })
      .eq("employee_id", reqData.employee_id)
      .eq("work_date", reqData.work_date)

    return NextResponse.json({ success: true, message: "ปฏิเสธคำขอเปลี่ยนกะ" })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}
