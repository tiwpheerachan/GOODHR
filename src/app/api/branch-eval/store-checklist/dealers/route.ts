import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// ════════════════════════════════════════════════════════════════════
// ทะเบียนร้าน Dealer (store_dealers)
//   GET   ?q=&company_id=&active=1   → ค้นหา/รายชื่อร้าน
//   POST  {name, ...}                → เพิ่มร้าน (admin)
//   PATCH {id, ...}                  → แก้ไข (admin)
//   DELETE ?id=                      → ปิดใช้ (active=false, admin)
// ════════════════════════════════════════════════════════════════════

const DEALER_COLS = "id, company_id, code, name, store_type, zone, area, is_new, contact_name, contact_phone, address, lat, lng, notes, active, created_at"

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
  const { svc } = c
  const sp = req.nextUrl.searchParams
  const q = (sp.get("q") || "").trim()
  const companyId = sp.get("company_id")
  const activeOnly = sp.get("active") !== "0"

  let query = svc.from("store_dealers").select(DEALER_COLS).order("name")
  if (activeOnly) query = query.eq("active", true)
  if (companyId) query = query.eq("company_id", companyId)
  if (q) {
    const like = `%${q.replace(/[,()%]/g, " ").trim()}%`
    query = query.or([
      `name.ilike.${like}`, `code.ilike.${like}`, `zone.ilike.${like}`,
      `area.ilike.${like}`, `contact_name.ilike.${like}`,
    ].join(","))
  }
  const { data, error } = await query.limit(q ? 20 : 500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dealers: data ?? [] })
}

function cleanDealer(b: any) {
  const num = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v))
  return {
    company_id: b.company_id || null,
    code: (b.code ?? "").toString().trim() || null,
    name: (b.name ?? "").toString().trim(),
    store_type: (b.store_type ?? "").toString().trim() || null,
    zone: (b.zone ?? "").toString().trim() || null,
    area: (b.area ?? "").toString().trim() || null,
    is_new: !!b.is_new,
    contact_name: (b.contact_name ?? "").toString().trim() || null,
    contact_phone: (b.contact_phone ?? "").toString().trim() || null,
    address: (b.address ?? "").toString().trim() || null,
    lat: num(b.lat),
    lng: num(b.lng),
    notes: (b.notes ?? "").toString().trim() || null,
  }
}

export async function POST(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const row = cleanDealer(body)
  if (!row.name) return NextResponse.json({ error: "กรุณาระบุชื่อร้าน" }, { status: 400 })
  const { data, error } = await svc.from("store_dealers")
    .insert({ ...row, created_by: access.employeeId }).select(DEALER_COLS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dealer: data })
}

export async function PATCH(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const id = (body?.id ?? "").toString()
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const patch: any = cleanDealer(body)
  if (typeof body.active === "boolean") patch.active = body.active
  patch.updated_at = new Date().toISOString()
  const { data, error } = await svc.from("store_dealers")
    .update(patch).eq("id", id).select(DEALER_COLS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dealer: data })
}

export async function DELETE(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  // ปิดใช้ (ไม่ลบจริง กันบันทึกเก่าอ้างถึง)
  const { error } = await svc.from("store_dealers")
    .update({ active: false, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
