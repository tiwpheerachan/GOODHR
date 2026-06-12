import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]

async function authOrError(req: NextRequest, adminOnly: boolean) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  if (adminOnly) {
    const { data: u } = await svc.from("users").select("role").eq("id", user.id).single()
    if (!u || !ADMIN_ROLES.includes(u.role)) {
      return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
    }
  }
  return { svc }
}

// slug helper
function makeSlug(s: string): string {
  return s.toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .slice(0, 80) || "brand"
}

// ─── GET /api/brands?include_inactive=1 ───
//   ใครก็อ่านได้ (authenticated)
export async function GET(req: NextRequest) {
  const a = await authOrError(req, false); if ("error" in a) return a.error
  const svc = a.svc!
  const includeInactive = req.nextUrl.searchParams.get("include_inactive") === "1"

  let q = svc.from("brands").select("*").order("display_order").order("name")
  if (!includeInactive) q = q.eq("is_active", true)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brands: data ?? [] })
}

// ─── POST /api/brands ───
// body: { name, color_hex?, display_order? }
export async function POST(req: NextRequest) {
  const a = await authOrError(req, true); if ("error" in a) return a.error
  const svc = a.svc!
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const insert = {
    name,
    slug: makeSlug(name),
    color_hex: body?.color_hex || null,
    logo_url:  body?.logo_url  || null,
    display_order: typeof body?.display_order === "number" ? body.display_order : 100,
  }
  const { data, error } = await svc.from("brands").insert(insert).select("*").single()
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `แบรนด์ "${name}" มีอยู่แล้ว` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ brand: data })
}

// ─── PATCH /api/brands ───
// body: { id, name?, color_hex?, display_order?, is_active? }
export async function PATCH(req: NextRequest) {
  const a = await authOrError(req, true); if ("error" in a) return a.error
  const svc = a.svc!
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || "")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const updates: any = {}
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim()
    updates.slug = makeSlug(body.name)
  }
  if (body.color_hex !== undefined)     updates.color_hex = body.color_hex || null
  if (body.logo_url  !== undefined)     updates.logo_url  = body.logo_url  || null
  if (typeof body.display_order === "number") updates.display_order = body.display_order
  if (typeof body.is_active === "boolean")     updates.is_active = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 })
  }

  const { data, error } = await svc.from("brands").update(updates).eq("id", id).select("*").single()
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `ชื่อ "${updates.name}" ซ้ำ` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ brand: data })
}

// ─── DELETE /api/brands?id=xxx ───
//   soft delete (set is_active=false) — เพราะคน employees.brand[] ยังอ้างชื่ออยู่
export async function DELETE(req: NextRequest) {
  const a = await authOrError(req, true); if ("error" in a) return a.error
  const svc = a.svc!
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const hard = req.nextUrl.searchParams.get("hard") === "1"
  if (hard) {
    // hard delete (ใช้ก็ต่อเมื่อยังไม่มีใครใช้แบรนด์นั้น)
    const { data: brand } = await svc.from("brands").select("name").eq("id", id).maybeSingle()
    if (brand) {
      const { count } = await svc.from("employees").select("id", { count: "exact", head: true })
        .contains("brand", [brand.name])
      if (count && count > 0) {
        return NextResponse.json({ error: `มีพนักงาน ${count} คนใช้แบรนด์นี้อยู่ — ปิดใช้งานแทนการลบ` }, { status: 409 })
      }
    }
    const { error } = await svc.from("brands").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: "hard" })
  }

  // soft delete
  const { error } = await svc.from("brands").update({ is_active: false }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: "soft" })
}
