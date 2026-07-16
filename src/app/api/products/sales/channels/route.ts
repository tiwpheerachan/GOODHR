import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canManageProducts } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// ช่องทางขาย (sales_channels)
//   GET    → รายการ active (ทุกคนที่มีสิทธิ์ขาย)
//   POST   { name }          → เพิ่ม (admin/manager)
//   PATCH  { id, is_active } → เปิด/ปิด (admin/manager)
//   DELETE ?id=...           → ลบ (admin/manager)
// ════════════════════════════════════════════════════════════════════
async function auth(write = false) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  if (write && !canManageProducts(me.access)) return { error: NextResponse.json({ error: "ต้องเป็น admin/manager" }, { status: 403 }) }
  return { svc }
}

export async function GET() {
  const a = await auth(); if (a.error) return a.error
  const { data } = await a.svc.from("sales_channels").select("id, name, is_active")
    .eq("is_active", true).order("sort_order").order("name")
  return NextResponse.json({ channels: data ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await auth(true); if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  const name = (body?.name ?? "").toString().trim()
  if (!name) return NextResponse.json({ error: "กรุณาระบุชื่อช่องทาง" }, { status: 400 })
  const { count } = await a.svc.from("sales_channels").select("id", { count: "exact", head: true })
  const { error } = await a.svc.from("sales_channels").upsert({ name, sort_order: (count ?? 0) + 1, is_active: true }, { onConflict: "name" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = await a.svc.from("sales_channels").select("id, name, is_active").order("sort_order").order("name")
  return NextResponse.json({ success: true, channels: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const a = await auth(true); if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  if (!body?.id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
  const { error } = await a.svc.from("sales_channels").update({ is_active: !!body.is_active }).eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const a = await auth(true); if (a.error) return a.error
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
  const { error } = await a.svc.from("sales_channels").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
