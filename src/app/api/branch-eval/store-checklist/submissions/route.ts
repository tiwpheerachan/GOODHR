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
  dealer_name, submitter_name, visit_date, photos, lat, lng, location_name, status, created_at,
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

  let query = svc.from("store_checklist_submissions").select(LIST_SEL)
  // scope: evaluator เห็นเฉพาะของตัวเอง / admin+supervisor เห็นทั้งหมด
  if (sp.get("mine") === "1" || (!access.isEvalAdmin && !access.isSupervisor)) {
    query = query.eq("submitted_by", access.employeeId ?? "00000000-0000-0000-0000-000000000000")
  }
  const from = sp.get("from"), to = sp.get("to")
  if (from) query = query.gte("visit_date", from)
  if (to) query = query.lte("visit_date", to)
  if (sp.get("dealer_id")) query = query.eq("dealer_id", sp.get("dealer_id"))
  if (sp.get("by")) query = query.eq("submitted_by", sp.get("by"))
  if (sp.get("template_id")) query = query.eq("template_id", sp.get("template_id"))
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
