import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

async function auth(req: NextRequest) {
  const cookie = createClient()
  const { data: { user } } = await cookie.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("id, role, employee_id").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, user: dbUser }
}

// ── GET /api/asset-annotations?table_id=<id>  → คืน annotations ทั้งหมดของตาราง
export async function GET(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const tableId = req.nextUrl.searchParams.get("table_id")
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 })

  const { data, error } = await a.svc.from("asset_annotations")
    .select("*").eq("table_id", tableId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // คืนเป็น map { feishu_record_id → annotation } เพื่อ join client-side ได้เร็ว
  const map: Record<string, any> = {}
  for (const r of (data ?? [])) map[r.feishu_record_id] = r
  return NextResponse.json({ annotations: map, count: data?.length ?? 0 })
}

// ── PATCH /api/asset-annotations
//   body: { table_id, feishu_record_id, hr_status?, hr_note?, last_checked_at?, last_checked_by? }
export async function PATCH(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const body = await req.json().catch(() => ({}))
  const { table_id, feishu_record_id } = body
  if (!table_id || !feishu_record_id) {
    return NextResponse.json({ error: "table_id + feishu_record_id required" }, { status: 400 })
  }

  const updates: any = { table_id, feishu_record_id, updated_by: a.user.id }
  for (const k of ["hr_status", "hr_note", "last_checked_at", "last_checked_by"]) {
    if (k in body) updates[k] = body[k] || null
  }
  // ถ้าใส่ status "ตรวจแล้ว" หรือ note → auto-stamp last_checked_at = now
  if (!updates.last_checked_at && (updates.hr_status === "ตรวจแล้ว" || updates.hr_note)) {
    updates.last_checked_at = new Date().toISOString()
  }

  const { data, error } = await a.svc.from("asset_annotations")
    .upsert(updates, { onConflict: "table_id,feishu_record_id" })
    .select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, annotation: data })
}

// ── DELETE /api/asset-annotations?table_id=...&feishu_record_id=...
export async function DELETE(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const sp = req.nextUrl.searchParams
  const table_id = sp.get("table_id")
  const feishu_record_id = sp.get("feishu_record_id")
  if (!table_id || !feishu_record_id) {
    return NextResponse.json({ error: "table_id + feishu_record_id required" }, { status: 400 })
  }
  const { error } = await a.svc.from("asset_annotations")
    .delete().eq("table_id", table_id).eq("feishu_record_id", feishu_record_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
