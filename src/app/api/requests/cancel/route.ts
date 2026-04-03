import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

const TABLES: Record<string, string> = {
  leave: "leave_requests",
  adjustment: "time_adjustment_requests",
  overtime: "overtime_requests",
}

const CANCEL_FLAG = "CANCEL_REQ:"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { action, request_id, request_type, reason } = await req.json()

  if (!request_id || !request_type || !TABLES[request_type]) {
    return NextResponse.json({ error: "Missing request_id or request_type" }, { status: 400 })
  }

  const table = TABLES[request_type]

  const { data: userData } = await supa.from("users")
    .select("role, employee_id").eq("id", user.id).single()
  const isHR = userData?.role === "super_admin" || userData?.role === "hr_admin"

  // ═══ Employee: ขอยกเลิกคำขอที่อนุมัติแล้ว ═══
  if (action === "request_cancel") {
    const { data: reqData } = await supa.from(table)
      .select("*").eq("id", request_id).single()

    if (!reqData) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })

    if (reqData.status !== "approved") {
      return NextResponse.json({ error: "สามารถขอยกเลิกได้เฉพาะคำขอที่อนุมัติแล้วเท่านั้น" }, { status: 400 })
    }

    if (!isHR && reqData.employee_id !== userData?.employee_id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }

    // Only update review_note — don't touch reviewed_by or status
    const note = `${CANCEL_FLAG} ${reason || "พนักงานขอยกเลิก"}`
    const { error } = await supa.from(table)
      .update({ review_note: note })
      .eq("id", request_id)

    if (error) return NextResponse.json({ error: `update review_note: ${error.message}` }, { status: 500 })
    // ดึงชื่อ actor
    const { data: actorEmpCancel } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameCancel = actorEmpCancel ? `${actorEmpCancel.first_name_th} ${actorEmpCancel.last_name_th}` : "พนักงาน"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameCancel, action: "request_cancel",
      entityType: `${request_type}_request`, entityId: request_id,
      description: `ขอยกเลิก${request_type === "leave" ? "คำขอลา" : request_type === "overtime" ? "คำขอ OT" : "คำขอแก้เวลา"}${reason ? ` — ${reason}` : ""} โดย ${actorNameCancel}`,
    })
    return NextResponse.json({ success: true, message: "ส่งคำขอยกเลิกไป HR แล้ว" })
  }

  // ═══ HR: อนุมัติการยกเลิก ═══
  if (action === "approve_cancel") {
    if (!isHR) return NextResponse.json({ error: "เฉพาะ HR" }, { status: 403 })

    const { data: reqData } = await supa.from(table)
      .select("*").eq("id", request_id).single()

    if (!reqData) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })

    // Don't set reviewed_by to avoid FK issues — just update status + note
    const { error } = await supa.from(table)
      .update({
        status: "cancelled",
        reviewed_at: new Date().toISOString(),
        review_note: `HR อนุมัติยกเลิก${reason ? `: ${reason}` : ""}`,
      })
      .eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Restore leave balance if applicable
    if (request_type === "leave" && reqData.leave_type_id && reqData.total_days && reqData.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances")
          .select("id, used_days")
          .eq("employee_id", reqData.employee_id)
          .eq("leave_type_id", reqData.leave_type_id)
          .single()
        if (bal) {
          await supa.from("leave_balances").update({
            used_days: Math.max(0, (bal.used_days || 0) - reqData.total_days),
          }).eq("id", bal.id)
        }
      } catch {}
    }

    const { data: actorEmpAppCancel } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameAppCancel = actorEmpAppCancel ? `${actorEmpAppCancel.first_name_th} ${actorEmpAppCancel.last_name_th}` : "HR"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameAppCancel, action: "approve_cancel_request",
      entityType: `${request_type}_request`, entityId: request_id,
      description: `HR อนุมัติยกเลิก${request_type === "leave" ? "คำขอลา" : request_type === "overtime" ? "คำขอ OT" : "คำขอแก้เวลา"} โดย ${actorNameAppCancel}`,
    })
    return NextResponse.json({ success: true, message: "ยกเลิกคำขอแล้ว" })
  }

  // ═══ HR: ปฏิเสธการยกเลิก ═══
  if (action === "reject_cancel") {
    if (!isHR) return NextResponse.json({ error: "เฉพาะ HR" }, { status: 403 })

    const { error } = await supa.from(table)
      .update({ review_note: `HR ปฏิเสธการยกเลิก${reason ? `: ${reason}` : ""}` })
      .eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: "ปฏิเสธการยกเลิก — คงอนุมัติ" })
  }

  // ═══ HR: ยกเลิกโดยตรง ═══
  if (action === "force_cancel") {
    if (!isHR) return NextResponse.json({ error: "เฉพาะ HR" }, { status: 403 })

    const { data: reqData } = await supa.from(table)
      .select("*").eq("id", request_id).single()

    const { error } = await supa.from(table)
      .update({
        status: "cancelled",
        reviewed_at: new Date().toISOString(),
        review_note: `HR ยกเลิกโดยตรง${reason ? `: ${reason}` : ""}`,
      })
      .eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: actorEmpForce } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameForce = actorEmpForce ? `${actorEmpForce.first_name_th} ${actorEmpForce.last_name_th}` : "HR"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameForce, action: "force_cancel_request",
      entityType: `${request_type}_request`, entityId: request_id,
      description: `HR ยกเลิกโดยตรง${request_type === "leave" ? "คำขอลา" : request_type === "overtime" ? "คำขอ OT" : "คำขอแก้เวลา"}${reason ? ` — ${reason}` : ""} โดย ${actorNameForce}`,
    })

    if (request_type === "leave" && reqData?.leave_type_id && reqData?.total_days && reqData?.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances")
          .select("id, used_days")
          .eq("employee_id", reqData.employee_id)
          .eq("leave_type_id", reqData.leave_type_id)
          .single()
        if (bal) {
          await supa.from("leave_balances").update({
            used_days: Math.max(0, (bal.used_days || 0) - reqData.total_days),
          }).eq("id", bal.id)
        }
      } catch {}
    }

    return NextResponse.json({ success: true, message: "ยกเลิกคำขอแล้ว" })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

// GET — ดึงรายการที่ขอยกเลิก (สำหรับ HR)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const results: any[] = []

  for (const [type, table] of Object.entries(TABLES)) {
    const { data, error } = await supa.from(table)
      .select("*, employee:employees(id, employee_code, first_name_th, last_name_th, nickname, department:departments(name))")
      .eq("status", "approved")
      .like("review_note", "%CANCEL_REQ%")
      .order("created_at", { ascending: false })

    if (data) {
      for (const r of data) {
        results.push({ ...r, request_type: type })
      }
    }
  }

  return NextResponse.json({ requests: results })
}
