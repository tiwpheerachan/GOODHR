import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ── GET: ดึงรายการ offsite check-in requests (สำหรับ HR/Admin) ────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status    = searchParams.get("status") || "pending"
  const companyId = searchParams.get("company_id")
  const page      = parseInt(searchParams.get("page") || "1")
  const limit     = parseInt(searchParams.get("limit") || "20")

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ตรวจสิทธิ์ — ดึง role + employee data
  const { data: userData, error: userErr } = await supa
    .from("users")
    .select("role, employee_id, employees(id, company_id)")
    .eq("id", user.id)
    .single()

  if (userErr) {
    console.error("offsite review: user query error", userErr)
    return NextResponse.json({ success: false, error: "ไม่สามารถตรวจสอบสิทธิ์ได้: " + userErr.message })
  }

  // อนุญาตทั้ง manager role และคนที่เข้า admin panel ได้
  if (!userData) {
    return NextResponse.json({ success: false, error: "ไม่พบข้อมูลผู้ใช้" }, { status: 403 })
  }

  const empData = userData.employees as any
  const empCompanyId = companyId || empData?.company_id

  // ดึง offsite requests — ใช้ join แบบง่าย (ไม่ระบุ FK hint)
  let query = supa
    .from("offsite_checkin_requests")
    .select(`
      *,
      employee:employees(id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
        department:departments(name),
        position:positions(name)
      )
    `, { count: "exact" })
    .eq("status", status)
    .order("checked_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (empCompanyId) {
    query = query.eq("company_id", empCompanyId)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("offsite review: query error", error)
    return NextResponse.json({ success: false, error: error.message })
  }

  return NextResponse.json({
    success: true,
    data,
    total: count,
    page,
    limit,
  })
}

// ── PATCH: Approve/Reject offsite check-in ────────────────────────────
export async function PATCH(request: Request) {
  const body = await request.json()
  const { request_id, action, reject_reason } = body as {
    request_id: string
    action: "approve" | "reject"
    reject_reason?: string
  }

  if (!request_id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ success: false, error: "Invalid params" })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ตรวจสิทธิ์
  const { data: userData } = await supa
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ success: false, error: "ไม่พบข้อมูลผู้ใช้" }, { status: 403 })
  }

  // ดึง request
  const { data: req } = await supa
    .from("offsite_checkin_requests")
    .select("*")
    .eq("id", request_id)
    .single()

  if (!req) return NextResponse.json({ success: false, error: "ไม่พบคำขอ" })
  if (req.status !== "pending") {
    return NextResponse.json({ success: false, error: "คำขอนี้ถูกดำเนินการแล้ว" })
  }

  const newStatus = action === "approve" ? "approved" : "rejected"

  // อัปเดต offsite request
  const { error: updateErr } = await supa
    .from("offsite_checkin_requests")
    .update({
      status:        newStatus,
      reviewed_by:   user.id,
      reviewed_at:   new Date().toISOString(),
      reject_reason: action === "reject" ? (reject_reason || null) : null,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", request_id)

  if (updateErr) return NextResponse.json({ success: false, error: updateErr.message })

  // อัปเดต attendance_records ด้วย
  if (req.attendance_id) {
    const updateFields: Record<string, any> = {}

    if (req.check_type === "clock_in") {
      updateFields.offsite_in_status = newStatus
      if (action === "reject") {
        // ถ้า reject clock_in → เปลี่ยนสถานะเป็นขาดงาน
        updateFields.status = "absent"
      }
    } else {
      updateFields.offsite_out_status = newStatus
    }

    await supa
      .from("attendance_records")
      .update(updateFields)
      .eq("id", req.attendance_id)
  }

  return NextResponse.json({
    success: true,
    status:  newStatus,
    message: action === "approve"
      ? "อนุมัติเช็คอินนอกสถานที่เรียบร้อย"
      : "ปฏิเสธเช็คอินนอกสถานที่เรียบร้อย",
  })
}
