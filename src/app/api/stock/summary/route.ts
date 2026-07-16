import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canSeeAllSales } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// GET /api/stock/summary?view=summary|by_branch|items|low_stock&branch_id=&status=&q=&mine=1
//   view=summary/by_branch → สรุปสินค้า (นับ in_stock; สินค้าที่ขายหมด = qty 0 "หมด" ไม่หาย)
//   view=items             → รายการซีเรียล + เวลานำเข้า + ใครนำเข้า + สถานะ
//   mine=1                 → เฉพาะที่ฉันเป็นคนนำเข้า (in_by = ตัวเอง)
//   scope: admin เห็นทุกสาขา · พนักงานทั่วไปเห็นเฉพาะสาขาตัวเอง
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const seeAll = canSeeAllSales(me.access)

  const p = req.nextUrl.searchParams
  const view = p.get("view") || "summary"
  const status = p.get("status") || "in_stock"
  const branchId = p.get("branch_id")
  const mine = p.get("mine") === "1"
  const q = (p.get("q") || "").trim()

  let myBranchId: string | null = null
  if (!seeAll) {
    const { data: emp } = await svc.from("employees").select("branch_id").eq("id", me.employeeId).maybeSingle()
    myBranchId = emp?.branch_id ?? null
  }

  // สรุป (summary/by_branch) โหลด in_stock + sold → เห็นสินค้าที่ "หมด" ด้วย
  const inventoryView = view === "summary" || view === "by_branch"

  const rows: any[] = []
  let from = 0
  while (true) {
    let query = svc.from("stock_items")
      .select("id, serial_number, barcode, sku, product_name, brand, image_url, status, branch_id, branch_name, in_at, sold_at, in_by")
      .order("in_at", { ascending: false }).range(from, from + 999)
    if (inventoryView) query = query.in("status", ["in_stock", "sold"])
    else if (status !== "all") query = query.eq("status", status)
    if (seeAll) { if (branchId) query = query.eq("branch_id", branchId) }
    else query = query.eq("branch_id", myBranchId)
    if (mine) query = query.eq("in_by", me.employeeId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const kw = q.toLowerCase()
  const filtered = kw
    ? rows.filter(r => [r.serial_number, r.barcode, r.product_name, r.brand, r.sku].filter(Boolean).join(" ").toLowerCase().includes(kw))
    : rows

  // ── รายซีเรียล + ใครนำเข้า ──
  if (view === "items") {
    const empIds = Array.from(new Set(filtered.map(r => r.in_by).filter(Boolean)))
    const nameMap = new Map<string, string>()
    for (let i = 0; i < empIds.length; i += 300) {
      const { data: es } = await svc.from("employees").select("id, first_name_th, last_name_th, nickname").in("id", empIds.slice(i, i + 300))
      for (const e of es ?? []) nameMap.set(e.id, e.nickname || `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim())
    }
    const items = filtered.map(r => ({ ...r, in_by_name: r.in_by ? (nameMap.get(r.in_by) ?? null) : null }))
    return NextResponse.json({ scope: seeAll ? "all" : "branch", total: items.length, items })
  }

  // ── ใกล้หมด: in_stock ต่อ (สินค้า × สาขา) ที่ <= threshold ──
  if (view === "low_stock") {
    const threshold = Math.max(1, parseInt(p.get("threshold") || "3"))
    const cell = new Map<string, any>()
    for (const r of filtered) {
      if (r.status !== "in_stock") continue
      const pkey = r.barcode || r.sku || r.product_name || r.id
      const bn = r.branch_name || "(ไม่ระบุสาขา)"
      const key = pkey + "|" + bn
      if (!cell.has(key)) cell.set(key, {
        product_name: r.product_name || r.sku || "(ไม่ระบุ)", brand: r.brand || null,
        barcode: r.barcode || null, image_url: r.image_url || null, branch_name: bn, qty: 0,
      })
      cell.get(key).qty++
    }
    const low = Array.from(cell.values()).filter(c => c.qty <= threshold).sort((a, b) => a.qty - b.qty)
    return NextResponse.json({ scope: seeAll ? "all" : "branch", threshold, count: low.length, low_stock: low })
  }

  // helper: นับ in_stock / sold + เวลานำเข้าล่าสุด
  function acc(map: Map<string, any>, key: string, seed: any, r: any) {
    if (!map.has(key)) map.set(key, { ...seed, qty: 0, sold_qty: 0, last_in_at: null })
    const g = map.get(key)
    if (r.status === "in_stock") g.qty++
    else if (r.status === "sold") g.sold_qty++
    if (r.in_at && (!g.last_in_at || r.in_at > g.last_in_at)) g.last_in_at = r.in_at
    return g
  }

  // ── สรุปต่อสินค้า (รวมสินค้าที่ "หมด" = qty 0) ──
  const prodMap = new Map<string, any>()
  for (const r of filtered) {
    const key = r.barcode || r.sku || r.product_name || r.id
    const g = acc(prodMap, key, {
      key, barcode: r.barcode || null, sku: r.sku || null,
      product_name: r.product_name || r.sku || "(ไม่ระบุ)", brand: r.brand || null,
      image_url: r.image_url || null, branches: {} as Record<string, number>,
    }, r)
    if (r.status === "in_stock") { const bn = r.branch_name || "(ไม่ระบุสาขา)"; g.branches[bn] = (g.branches[bn] || 0) + 1 }
  }
  const byProduct = Array.from(prodMap.values())
    .map(g => ({ ...g, out: g.qty === 0 }))
    .sort((a, b) => (b.qty - a.qty) || (b.sold_qty - a.sold_qty))

  // ── ต่อสาขา + แยกสินค้าในสาขา (รวม "หมด") ──
  const branchMap = new Map<string, Map<string, any>>()
  for (const r of filtered) {
    const bn = r.branch_name || "(ไม่ระบุสาขา)"
    if (!branchMap.has(bn)) branchMap.set(bn, new Map())
    const pkey = r.barcode || r.sku || r.product_name || r.id
    acc(branchMap.get(bn)!, pkey, {
      product_name: r.product_name || r.sku || "(ไม่ระบุ)", brand: r.brand || null,
      barcode: r.barcode || null, image_url: r.image_url || null,
    }, r)
  }
  const byBranch = Array.from(branchMap.entries())
    .map(([name, pm]) => ({ name, qty: Array.from(pm.values()).reduce((n, p) => n + p.qty, 0) }))
    .sort((a, b) => b.qty - a.qty)
  const byBranchDetail = Array.from(branchMap.entries()).map(([name, pm]) => ({
    name,
    total: Array.from(pm.values()).reduce((n, p) => n + p.qty, 0),
    products: Array.from(pm.values()).map(g => ({ ...g, out: g.qty === 0 })).sort((a, b) => (b.qty - a.qty) || (b.sold_qty - a.sold_qty)),
  })).sort((a, b) => b.total - a.total)

  return NextResponse.json({
    scope: seeAll ? "all" : "branch",
    total_units: filtered.filter(r => r.status === "in_stock").length,
    total_products: byProduct.length,
    in_stock_products: byProduct.filter(p => !p.out).length,
    out_products: byProduct.filter(p => p.out).length,
    by_product: byProduct,
    by_branch: byBranch,
    by_branch_detail: byBranchDetail,
  })
}
