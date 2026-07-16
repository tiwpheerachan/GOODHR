import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canSeeTeamSales } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// PATCH /api/stock/item  { id, action: "remove" | "restore" | "delete" }
//   remove  → สินค้าที่สแกนเข้าแต่ไม่ได้ขาย → เอาออก (status='removed')
//   restore → กู้คืนกลับเป็น in_stock
//   delete  → ลบทิ้งถาวร
//   สิทธิ์: admin/manager (ทุกชิ้น) หรือเจ้าของที่สแกนเข้าเอง (เฉพาะของตัวเอง)
//           ห้ามแตะชิ้นที่ "ขายแล้ว" (status='sold')
// ════════════════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = (body?.id ?? "").toString()
  const action = (body?.action ?? "").toString()
  if (!["remove", "restore", "delete"].includes(action)) {
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 })
  }

  // ── โหมด bulk: ทั้งสินค้า (barcode/sku/product_name) [+ สาขา] — admin/manager เท่านั้น ──
  if (!id) {
    if (!canSeeTeamSales(me.access)) return NextResponse.json({ error: "ต้องเป็น admin/manager" }, { status: 403 })
    const barcode = body?.barcode ? String(body.barcode) : null
    const sku = body?.sku ? String(body.sku) : null
    const productName = body?.product_name ? String(body.product_name) : null
    const branchName = body?.branch_name ? String(body.branch_name) : null
    if (!barcode && !sku && !productName) return NextResponse.json({ error: "ระบุสินค้า" }, { status: 400 })

    const targetStatus = action === "restore" ? "removed" : "in_stock"  // remove/delete จาก in_stock, restore จาก removed
    let q = svc.from("stock_items").select("id", { count: "exact", head: false }).eq("status", targetStatus)
    if (barcode) q = q.eq("barcode", barcode)
    else if (sku) q = q.eq("sku", sku)
    else if (productName) q = q.eq("product_name", productName)
    if (branchName) q = q.eq("branch_name", branchName)
    const { data: rows } = await q
    const ids = (rows ?? []).map((r: any) => r.id)
    if (ids.length === 0) return NextResponse.json({ success: true, affected: 0 })

    const now = new Date().toISOString()
    let error: any = null
    if (action === "delete") { ({ error } = await svc.from("stock_items").delete().in("id", ids)) }
    else { ({ error } = await svc.from("stock_items").update({ status: action === "remove" ? "removed" : "in_stock", updated_at: now }).in("id", ids)) }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, affected: ids.length })
  }

  const { data: item } = await svc.from("stock_items").select("id, status, in_by").eq("id", id).maybeSingle()
  if (!item) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 })

  // สิทธิ์: admin/manager หรือเจ้าของที่นำเข้า
  const isOwner = item.in_by && item.in_by === me.employeeId
  if (!canSeeTeamSales(me.access) && !isOwner) {
    return NextResponse.json({ error: "แก้ได้เฉพาะของที่ตัวเองนำเข้า" }, { status: 403 })
  }
  // ห้ามแตะของที่ขายแล้ว
  if (item.status === "sold") {
    return NextResponse.json({ error: "รายการนี้ขายไปแล้ว แก้ไขไม่ได้" }, { status: 400 })
  }

  const now = new Date().toISOString()
  if (action === "delete") {
    const { error } = await svc.from("stock_items").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action })
  }

  const newStatus = action === "remove" ? "removed" : "in_stock"
  const { error } = await svc.from("stock_items").update({ status: newStatus, updated_at: now }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, action, status: newStatus })
}
