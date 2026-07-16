import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canSeeTeamSales } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// POST /api/stock/transfer — โอนสต๊อกระหว่างสาขา (รายซีเรียล)
//   body: { serials: [...], to_branch_id?, to_branch_name }
//   ย้าย stock_items (in_stock) → สาขาปลายทาง (admin/manager เท่านั้น)
// ════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canSeeTeamSales(me.access)) return NextResponse.json({ error: "ต้องเป็น admin/manager จึงจะโอนสต๊อกได้" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const serials: string[] = Array.isArray(body?.serials) ? body.serials.map((s: any) => String(s).trim()).filter(Boolean) : []
  const toBranchName = (body?.to_branch_name ?? "").toString().trim()
  const toBranchId = body?.to_branch_id ? String(body.to_branch_id) : null
  if (serials.length === 0) return NextResponse.json({ error: "ไม่มี serial ที่จะโอน" }, { status: 400 })
  if (!toBranchName && !toBranchId) return NextResponse.json({ error: "ต้องระบุสาขาปลายทาง" }, { status: 400 })

  const norms = serials.map(s => s.toUpperCase())
  const now = new Date().toISOString()

  // โอนเฉพาะที่ in_stock
  const { data: updated, error } = await svc.from("stock_items")
    .update({
      branch_id: toBranchId, branch_name: toBranchName || null,
      note: `โอนจากการจัดการสต๊อก`, updated_at: now,
    })
    .in("serial_norm", norms).eq("status", "in_stock")
    .select("serial_number")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const moved = (updated ?? []).length
  const movedSerials = new Set((updated ?? []).map((r: any) => String(r.serial_number).toUpperCase()))
  const notMoved = serials.filter(s => !movedSerials.has(s.toUpperCase()))

  return NextResponse.json({
    success: true, moved, to_branch: toBranchName,
    not_moved: notMoved,   // ไม่เจอ/ไม่ได้ in_stock (อาจขายไปแล้ว)
  })
}
