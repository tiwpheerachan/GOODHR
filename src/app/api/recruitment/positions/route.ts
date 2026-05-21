import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function checkAdmin(svc: any, userId: string) {
  const { data } = await svc.from("users").select("role, employee_id").eq("id", userId).single()
  return data && ["super_admin", "hr_admin"].includes(data.role) ? data : null
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  if (!await checkAdmin(svc, user.id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const status = new URL(req.url).searchParams.get("status")
  let q = svc.from("job_positions")
    .select(`*, department:departments(id, name), branch:branches(id, name), company:companies(id, code, name_th)`)
    .order("created_at", { ascending: false })
  if (status) q = q.eq("status", status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ positions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const u = await checkAdmin(svc, user.id)
  if (!u) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  if (!body.title?.th && !body.title?.en) return NextResponse.json({ error: "title required" }, { status: 400 })

  // auto-generate slug from English title or Thai (transliterated to simple slug)
  let slug = (body.slug || body.title?.en || body.title?.th || "")
    .toLowerCase().trim().replace(/[^\w\s\-ก-๛]/g, "").replace(/\s+/g, "-")
  if (!slug) slug = `job-${Date.now()}`

  // ensure unique
  const { data: existing } = await svc.from("job_positions").select("id").eq("slug", slug).maybeSingle()
  if (existing) slug = `${slug}-${Date.now().toString(36).slice(-5)}`

  const { data, error } = await svc.from("job_positions").insert({
    ...body, slug,
    created_by: u.employee_id,
  }).select("id, slug").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, slug: data.slug })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  if (!await checkAdmin(svc, user.id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("job_positions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  if (!await checkAdmin(svc, user.id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  // soft delete → archived
  const { error } = await svc.from("job_positions").update({ status: "archived" }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
