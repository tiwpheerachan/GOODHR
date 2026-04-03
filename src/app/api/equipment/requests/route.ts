import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*, employee:employees(company_id)").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = (dbUser.employee as any)?.company_id || dbUser.company_id
  const url = req.nextUrl.searchParams
  const mode = url.get("mode") || "employee"
  const status = url.get("status")

  if (mode === "employee") {
    const empId = dbUser.employee_id
    if (!empId) return NextResponse.json({ requests: [] })
    let query = svc.from("equipment_requests")
      .select("*, item:equipment_items(id, name, unit, image_url, category:equipment_categories(name))")
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
    if (status) query = query.eq("status", status)
    const { data } = await query
    return NextResponse.json({ requests: data ?? [] })
  }

  if (mode === "admin") {
    if (!ADMIN_ROLES.includes(dbUser.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }
    // ดึง requests ก่อน แล้ว join ข้อมูลทีหลัง (หลีกเลี่ยง FK name ไม่ตรง)
    let query = svc.from("equipment_requests").select("*")
      .order("created_at", { ascending: false })
    if (companyId) query = query.eq("company_id", companyId)
    if (status) query = query.eq("status", status)
    const { data: reqs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Join item + employee info
    const requests = []
    for (const r of (reqs ?? [])) {
      const { data: item } = await svc.from("equipment_items")
        .select("id, name, unit, image_url").eq("id", r.item_id).single()
      const { data: emp } = await svc.from("employees")
        .select("id, first_name_th, last_name_th, employee_code, avatar_url, department:departments(name)")
        .eq("id", r.employee_id).single()
      requests.push({ ...r, item, employee: emp })
    }
    return NextResponse.json({ requests })
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*, employee:employees(company_id, first_name_th, last_name_th)").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = (dbUser.employee as any)?.company_id || dbUser.company_id
  const body = await req.json()
  const { action } = body

  // ══════════════════════════════════════════════════════════════
  // Employee: ส่งคำขอยืม
  // ══════════════════════════════════════════════════════════════
  if (action === "request") {
    const { item_id, qty, reason, expected_return } = body
    if (!item_id) return NextResponse.json({ error: "กรุณาเลือกอุปกรณ์" }, { status: 400 })
    const borrowQty = Math.max(1, Number(qty) || 1)

    const { data: item } = await svc.from("equipment_items").select("*").eq("id", item_id).single()
    if (!item || !item.is_active) return NextResponse.json({ error: "ไม่พบอุปกรณ์" }, { status: 404 })
    if (item.available_qty < borrowQty) return NextResponse.json({ error: `ของไม่พอ (เหลือ ${item.available_qty} ${item.unit})` }, { status: 400 })

    const { data: req_data, error } = await svc.from("equipment_requests").insert({
      company_id: companyId, employee_id: dbUser.employee_id,
      item_id, qty: borrowQty, reason, expected_return: expected_return || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // แจ้ง equipment_admin ทุกคน
    const empName = dbUser.employee ? `${(dbUser.employee as any).first_name_th} ${(dbUser.employee as any).last_name_th}` : "พนักงาน"
    const { data: admins } = await svc.from("users").select("employee_id")
      .eq("company_id", companyId).in("role", ADMIN_ROLES).eq("is_active", true)
    for (const a of (admins ?? [])) {
      if (a.employee_id && a.employee_id !== dbUser.employee_id) {
        await svc.from("notifications").insert({
          employee_id: a.employee_id, type: "equipment_request",
          title: `คำขอยืม ${item.name}`,
          body: `${empName} ขอยืม ${item.name} จำนวน ${borrowQty} ${item.unit}`,
          ref_table: "equipment_requests", ref_id: req_data.id, is_read: false,
        })
      }
    }
    return NextResponse.json({ success: true, request: req_data })
  }

  // ══════════════════════════════════════════════════════════════
  // Admin: อนุมัติ
  // ══════════════════════════════════════════════════════════════
  if (action === "approve") {
    if (!ADMIN_ROLES.includes(dbUser.role)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    const { request_id } = body
    const { data: req_data } = await svc.from("equipment_requests").select("*").eq("id", request_id).single()
    if (!req_data) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })
    if (req_data.status !== "pending") return NextResponse.json({ error: "คำขอนี้ไม่ได้อยู่ในสถานะรอดำเนินการ" }, { status: 400 })

    // ตรวจสอบ stock ก่อนอนุมัติ
    const { data: item } = await svc.from("equipment_items").select("available_qty").eq("id", req_data.item_id).single()
    if (!item || item.available_qty < req_data.qty) {
      return NextResponse.json({ error: "สต๊อกไม่พอ" }, { status: 400 })
    }

    // ลด stock
    await svc.from("equipment_items").update({
      available_qty: item.available_qty - req_data.qty,
      updated_at: new Date().toISOString(),
    }).eq("id", req_data.item_id)

    await svc.from("equipment_requests").update({
      status: "approved", reviewed_by: dbUser.employee_id,
      reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", request_id)

    // แจ้งพนักงาน
    const { data: itemInfo } = await svc.from("equipment_items").select("name").eq("id", req_data.item_id).single()
    await svc.from("notifications").insert({
      employee_id: req_data.employee_id, type: "equipment_approved",
      title: `คำขอยืม ${itemInfo?.name || "อุปกรณ์"} ได้รับอนุมัติ`,
      body: `คำขอยืมของคุณได้รับอนุมัติแล้ว กรุณามารับอุปกรณ์`,
      ref_table: "equipment_requests", ref_id: request_id, is_read: false,
    })
    const actorEmpEq = dbUser.employee as any
    const actorNameEq = actorEmpEq ? `${actorEmpEq.first_name_th} ${actorEmpEq.last_name_th}` : "Admin"
    logAudit(svc, {
      actorId: user.id, actorName: actorNameEq, action: "approved_equipment",
      entityType: "equipment_request", entityId: request_id,
      description: `อนุมัติคำขอยืม ${itemInfo?.name || "อุปกรณ์"} จำนวน ${req_data.qty} โดย ${actorNameEq}`,
      companyId,
    })
    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Admin: ปฏิเสธ
  // ══════════════════════════════════════════════════════════════
  if (action === "reject") {
    if (!ADMIN_ROLES.includes(dbUser.role)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    const { request_id, reject_reason } = body
    const { data: req_data } = await svc.from("equipment_requests").select("*").eq("id", request_id).single()
    if (!req_data) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })
    if (req_data.status !== "pending") return NextResponse.json({ error: "คำขอนี้ไม่ได้อยู่ในสถานะรอดำเนินการ" }, { status: 400 })

    await svc.from("equipment_requests").update({
      status: "rejected", reviewed_by: dbUser.employee_id,
      reviewed_at: new Date().toISOString(), reject_reason: reject_reason || "",
      updated_at: new Date().toISOString(),
    }).eq("id", request_id)

    const { data: itemInfo } = await svc.from("equipment_items").select("name").eq("id", req_data.item_id).single()
    await svc.from("notifications").insert({
      employee_id: req_data.employee_id, type: "equipment_rejected",
      title: `คำขอยืม ${itemInfo?.name || "อุปกรณ์"} ไม่ได้รับอนุมัติ`,
      body: reject_reason ? `เหตุผล: ${reject_reason}` : "คำขอยืมของคุณไม่ได้รับอนุมัติ",
      ref_table: "equipment_requests", ref_id: request_id, is_read: false,
    })
    const actorEmpEqR = dbUser.employee as any
    const actorNameEqR = actorEmpEqR ? `${actorEmpEqR.first_name_th} ${actorEmpEqR.last_name_th}` : "Admin"
    logAudit(svc, {
      actorId: user.id, actorName: actorNameEqR, action: "rejected_equipment",
      entityType: "equipment_request", entityId: request_id,
      description: `ปฏิเสธคำขอยืม ${itemInfo?.name || "อุปกรณ์"}${reject_reason ? ` — ${reject_reason}` : ""} โดย ${actorNameEqR}`,
      companyId,
    })
    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Admin: ส่งมอบ (mark borrowed)
  // ══════════════════════════════════════════════════════════════
  if (action === "mark_borrowed") {
    if (!ADMIN_ROLES.includes(dbUser.role)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    const { request_id } = body
    const { data: req_data } = await svc.from("equipment_requests").select("*").eq("id", request_id).single()
    if (!req_data || req_data.status !== "approved") return NextResponse.json({ error: "คำขอต้องอนุมัติก่อน" }, { status: 400 })

    await svc.from("equipment_requests").update({
      status: "borrowed", borrow_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }).eq("id", request_id)
    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Admin: รับคืน (mark returned)
  // ══════════════════════════════════════════════════════════════
  if (action === "mark_returned") {
    if (!ADMIN_ROLES.includes(dbUser.role)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    const { request_id, return_note } = body
    const { data: req_data } = await svc.from("equipment_requests").select("*").eq("id", request_id).single()
    if (!req_data || req_data.status !== "borrowed") return NextResponse.json({ error: "ต้องอยู่ในสถานะกำลังยืม" }, { status: 400 })

    // คืน stock
    const { data: item } = await svc.from("equipment_items").select("available_qty, total_qty").eq("id", req_data.item_id).single()
    if (item) {
      const newAvail = Math.min(item.total_qty, item.available_qty + req_data.qty)
      await svc.from("equipment_items").update({
        available_qty: newAvail, updated_at: new Date().toISOString(),
      }).eq("id", req_data.item_id)
    }

    await svc.from("equipment_requests").update({
      status: "returned", return_date: new Date().toISOString().split("T")[0],
      return_note: return_note || null, updated_at: new Date().toISOString(),
    }).eq("id", request_id)
    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Employee: ยกเลิก (เฉพาะ pending)
  // ══════════════════════════════════════════════════════════════
  if (action === "cancel") {
    const { request_id } = body
    const { data: req_data } = await svc.from("equipment_requests").select("*").eq("id", request_id).single()
    if (!req_data) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })
    if (req_data.employee_id !== dbUser.employee_id) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    if (req_data.status !== "pending") return NextResponse.json({ error: "ยกเลิกได้เฉพาะคำขอที่รอดำเนินการ" }, { status: 400 })

    await svc.from("equipment_requests").update({
      status: "cancelled", updated_at: new Date().toISOString(),
    }).eq("id", request_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
