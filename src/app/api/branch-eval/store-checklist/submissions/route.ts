import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// ════════════════════════════════════════════════════════════════════
// บันทึกเช็คลิสต์ (store_checklist_submissions)
//   GET  ?id=                          → รายละเอียด 1 รายการ
//   GET  ?from=&to=&dealer_id=&by=&template_id=&mine=1  → รายการ
//   POST {template_id, dealer_id, data, photos, lat, lng, ...}  → บันทึก
// ════════════════════════════════════════════════════════════════════

const LIST_SEL = `id, template_id, dealer_id, assignment_id, company_id, submitted_by,
  dealer_name, submitter_name, visit_date, photos, files, lat, lng, location_name, status, deleted_at, created_at,
  template:store_checklist_templates(id, name),
  dealer:store_dealers(id, name, zone, area, store_type, is_new)`
const DETAIL_SEL = LIST_SEL + ", data"

async function ctx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  return { svc, access }
}

export async function GET(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  const sp = req.nextUrl.searchParams
  const id = sp.get("id")

  if (id) {
    const { data, error } = await svc.from("store_checklist_submissions")
      .select(DETAIL_SEL).eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
    const isOwner = (data as any).submitted_by === access.employeeId
    if (!isOwner && !access.isEvalAdmin && !access.isSupervisor)
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    return NextResponse.json({ submission: data })
  }

  const full = sp.get("full") === "1"   // แนบ data ด้วย (สำหรับ export)
  let query = svc.from("store_checklist_submissions").select(full ? DETAIL_SEL : LIST_SEL)
  // scope: evaluator เห็นเฉพาะของตัวเอง / admin+supervisor เห็นทั้งหมด
  if (sp.get("mine") === "1" || (!access.isEvalAdmin && !access.isSupervisor)) {
    query = query.eq("submitted_by", access.employeeId ?? "00000000-0000-0000-0000-000000000000")
  }
  // ถังขยะ: deleted=1 → เฉพาะที่ลบ (admin เท่านั้น) / ปกติ → ไม่รวมที่ลบ
  if (sp.get("deleted") === "1" && (access.isEvalAdmin || access.isSupervisor)) {
    query = query.not("deleted_at", "is", null)
  } else {
    query = query.is("deleted_at", null)
  }
  const from = sp.get("from"), to = sp.get("to")
  if (from) query = query.gte("visit_date", from)
  if (to) query = query.lte("visit_date", to)
  if (sp.get("dealer_id")) query = query.eq("dealer_id", sp.get("dealer_id"))
  if (sp.get("by")) query = query.eq("submitted_by", sp.get("by"))
  if (sp.get("company_id")) query = query.eq("company_id", sp.get("company_id"))
  if (sp.get("template_id")) query = query.eq("template_id", sp.get("template_id"))
  if (sp.get("status")) query = query.eq("status", sp.get("status"))
  const { data, error } = await query.order("visit_date", { ascending: false })
    .order("created_at", { ascending: false }).limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.employeeId) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 403 })
  const body = await req.json().catch(() => ({}))

  const templateId = body?.template_id || null
  const dealerId = body?.dealer_id || null
  if (!dealerId) return NextResponse.json({ error: "กรุณาเลือกร้าน" }, { status: 400 })

  // snapshot ชื่อร้าน + ผู้บันทึก + company
  const [{ data: dealer }, { data: emp }] = await Promise.all([
    svc.from("store_dealers").select("name, company_id").eq("id", dealerId).maybeSingle(),
    svc.from("employees").select("first_name_th, last_name_th, nickname, company_id").eq("id", access.employeeId).maybeSingle(),
  ])
  const submitterName = emp
    ? [emp.first_name_th, emp.last_name_th].filter(Boolean).join(" ") + (emp.nickname ? ` (${emp.nickname})` : "")
    : null

  const num = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v))
  const row = {
    template_id: templateId,
    dealer_id: dealerId,
    assignment_id: body?.assignment_id || null,
    company_id: dealer?.company_id || emp?.company_id || access.companyId || null,
    submitted_by: access.employeeId,
    dealer_name: dealer?.name || (body?.dealer_name ?? "").toString().trim() || null,
    submitter_name: submitterName,
    visit_date: body?.visit_date || undefined,   // ปล่อยให้ default = วันนี้ (Asia/Bangkok)
    data: body?.data && typeof body.data === "object" ? body.data : {},
    photos: Array.isArray(body?.photos) ? body.photos : [],
    files: Array.isArray(body?.files) ? body.files : [],
    lat: num(body?.lat),
    lng: num(body?.lng),
    location_name: (body?.location_name ?? "").toString().trim() || null,
    status: body?.status === "draft" ? "draft" : "submitted",
  }
  if (row.visit_date === undefined) delete (row as any).visit_date

  const { data, error } = await svc.from("store_checklist_submissions")
    .insert(row).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ปิดงานที่มอบหมาย (ถ้าอ้างถึง)
  if (row.assignment_id) {
    await svc.from("store_checklist_assignments")
      .update({ status: "done" }).eq("id", row.assignment_id).eq("assignee_id", access.employeeId)
  }
  return NextResponse.json({ id: data.id })
}

// PATCH — แก้ไข/ส่งร่าง (เจ้าของ) · กู้คืนจากถังขยะ (admin)
//   { id, data?, photos?, files?, lat?, lng?, location_name?, dealer_id?, status?, restore? }
export async function PATCH(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.employeeId) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const id = (body?.id ?? "").toString()
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: cur } = await svc.from("store_checklist_submissions")
    .select("id, submitted_by, assignment_id").eq("id", id).maybeSingle()
  if (!cur) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
  const isOwner = cur.submitted_by === access.employeeId
  const isMgr = access.isEvalAdmin || access.isSupervisor
  if (!isOwner && !isMgr) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // กู้คืนจากถังขยะ (admin)
  if (body.restore === true) {
    if (!isMgr) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    const { error } = await svc.from("store_checklist_submissions").update({ deleted_at: null }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id })
  }

  const num = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v))
  const patch: any = {}
  if (body.data !== undefined && typeof body.data === "object") patch.data = body.data
  if (Array.isArray(body.photos)) patch.photos = body.photos
  if (Array.isArray(body.files)) patch.files = body.files
  if (body.lat !== undefined) patch.lat = num(body.lat)
  if (body.lng !== undefined) patch.lng = num(body.lng)
  if (body.location_name !== undefined) patch.location_name = (body.location_name ?? "").toString().trim() || null
  if (body.dealer_id) {
    patch.dealer_id = body.dealer_id
    const { data: dl } = await svc.from("store_dealers").select("name").eq("id", body.dealer_id).maybeSingle()
    if (dl) patch.dealer_name = dl.name
  }
  if (body.status === "draft" || body.status === "submitted") patch.status = body.status

  const { error } = await svc.from("store_checklist_submissions").update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (patch.status === "submitted" && cur.assignment_id) {
    await svc.from("store_checklist_assignments")
      .update({ status: "done" }).eq("id", cur.assignment_id).eq("assignee_id", cur.submitted_by)
  }
  return NextResponse.json({ id })
}

// DELETE — ?id=  (soft-delete) · ?id=&hard=1 (ลบถาวร, admin)
//   เจ้าของลบของตัวเองได้ (soft) · admin ลบใครก็ได้ / ลบถาวร
export async function DELETE(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  const id = req.nextUrl.searchParams.get("id")
  const hard = req.nextUrl.searchParams.get("hard") === "1"
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: cur } = await svc.from("store_checklist_submissions")
    .select("id, submitted_by, photos, files").eq("id", id).maybeSingle()
  if (!cur) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
  const isOwner = cur.submitted_by === access.employeeId
  const isMgr = access.isEvalAdmin || access.isSupervisor
  if (!isOwner && !isMgr) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  if (hard) {
    if (!isMgr) return NextResponse.json({ error: "ลบถาวรได้เฉพาะแอดมิน" }, { status: 403 })
    // ลบไฟล์ใน storage ด้วย
    const paths = [...(cur.photos ?? []), ...(cur.files ?? [])].map((x: any) => x?.storage_path).filter(Boolean)
    if (paths.length) { try { await svc.storage.from("store-checklist").remove(paths) } catch {} }
    const { error } = await svc.from("store_checklist_submissions").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, hard: true })
  }

  const { error } = await svc.from("store_checklist_submissions")
    .update({ deleted_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
