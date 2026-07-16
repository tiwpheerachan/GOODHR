import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canSeeAllSales, canSeeTeamSales } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// GET /api/stock/summary?view=summary|items&branch_id=&status=in_stock&q=
//   view=summary → สรุปต่อสาขาต่อสินค้า (นับ in_stock)
//   view=items   → รายการซีเรียล (list)
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
  const q = (p.get("q") || "").trim()

  // ── สาขาของพนักงาน (ถ้าไม่ใช่ admin) ──
  let myBranchId: string | null = null
  if (!seeAll) {
    const { data: emp } = await svc.from("employees").select("branch_id").eq("id", me.employeeId).maybeSingle()
    myBranchId = emp?.branch_id ?? null
  }

  // ── โหลด stock_items ตาม scope ──
  const rows: any[] = []
  let from = 0
  while (true) {
    let query = svc.from("stock_items")
      .select("id, serial_number, barcode, sku, product_name, brand, image_url, status, branch_id, branch_name, in_at, sold_at")
      .order("in_at", { ascending: false }).range(from, from + 999)
    if (status !== "all") query = query.eq("status", status)
    if (seeAll) { if (branchId) query = query.eq("branch_id", branchId) }
    else query = query.eq("branch_id", myBranchId)   // พนักงาน = เฉพาะสาขาตัวเอง
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

  if (view === "items") {
    return NextResponse.json({ scope: seeAll ? "all" : "branch", total: filtered.length, items: filtered })
  }

  // ── ใกล้หมด: นับ in_stock ต่อ (สินค้า × สาขา) ที่ <= threshold ──
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

  // ── สรุปต่อสินค้า (key = barcode||sku||product_name) ──
  const prodMap = new Map<string, any>()
  for (const r of filtered) {
    const key = r.barcode || r.sku || r.product_name || r.id
    if (!prodMap.has(key)) prodMap.set(key, {
      key, barcode: r.barcode || null, sku: r.sku || null,
      product_name: r.product_name || r.sku || "(ไม่ระบุ)", brand: r.brand || null,
      image_url: r.image_url || null, qty: 0, branches: {} as Record<string, number>,
    })
    const g = prodMap.get(key)
    g.qty++
    const bn = r.branch_name || "(ไม่ระบุสาขา)"
    g.branches[bn] = (g.branches[bn] || 0) + 1
  }
  const byProduct = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty)

  // ── สรุปต่อสาขา + แยกสินค้าในแต่ละสาขา ──
  const branchMap = new Map<string, Map<string, any>>()
  for (const r of filtered) {
    const bn = r.branch_name || "(ไม่ระบุสาขา)"
    if (!branchMap.has(bn)) branchMap.set(bn, new Map())
    const pm = branchMap.get(bn)!
    const pkey = r.barcode || r.sku || r.product_name || r.id
    if (!pm.has(pkey)) pm.set(pkey, {
      product_name: r.product_name || r.sku || "(ไม่ระบุ)", brand: r.brand || null,
      barcode: r.barcode || null, image_url: r.image_url || null, qty: 0,
    })
    pm.get(pkey).qty++
  }
  const byBranch = Array.from(branchMap.entries())
    .map(([name, pm]) => ({ name, qty: Array.from(pm.values()).reduce((n, p) => n + p.qty, 0) }))
    .sort((a, b) => b.qty - a.qty)
  const byBranchDetail = Array.from(branchMap.entries()).map(([name, pm]) => ({
    name,
    total: Array.from(pm.values()).reduce((n, p) => n + p.qty, 0),
    products: Array.from(pm.values()).sort((a, b) => b.qty - a.qty),
  })).sort((a, b) => b.total - a.total)

  return NextResponse.json({
    scope: seeAll ? "all" : "branch",
    total_units: filtered.length,
    total_products: byProduct.length,
    by_product: byProduct,
    by_branch: byBranch,
    by_branch_detail: byBranchDetail,
  })
}
