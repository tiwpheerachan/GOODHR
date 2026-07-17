import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// ════════════════════════════════════════════════════════════════════
// Template เช็คลิสต์ (store_checklist_templates)
//   GET   ?all=1        → รายการ template (all=1 รวมที่ปิด, admin เท่านั้น)
//   POST  {name, config}                → สร้างใหม่ (admin)
//   PATCH {id, name?, description?, config?, active?, sort_order?} (admin)
// ════════════════════════════════════════════════════════════════════

const T_COLS = "id, name, description, config, active, sort_order, created_at"

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
  const all = req.nextUrl.searchParams.get("all") === "1"
  let query = svc.from("store_checklist_templates").select(T_COLS)
    .order("sort_order").order("created_at")
  if (!(all && access.isEvalAdmin)) query = query.eq("active", true)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const name = (body?.name ?? "").toString().trim()
  if (!name) return NextResponse.json({ error: "กรุณาระบุชื่อ template" }, { status: 400 })
  const config = body?.config && typeof body.config === "object" ? body.config : { sections: [] }
  const { data, error } = await svc.from("store_checklist_templates").insert({
    name,
    description: (body?.description ?? "").toString().trim() || null,
    config,
    sort_order: Number(body?.sort_order ?? 0) || 0,
    created_by: access.employeeId,
  }).select(T_COLS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function PATCH(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const id = (body?.id ?? "").toString()
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const patch: any = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) patch.name = body.name.toString().trim()
  if (body.description !== undefined) patch.description = (body.description ?? "").toString().trim() || null
  if (body.config !== undefined && typeof body.config === "object") patch.config = body.config
  if (typeof body.active === "boolean") patch.active = body.active
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0
  const { data, error } = await svc.from("store_checklist_templates")
    .update(patch).eq("id", id).select(T_COLS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
