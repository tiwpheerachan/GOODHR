import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canSeeAllSales } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// GET /api/stock/discrepancy?days=30
//   รายงานความไม่ตรง: "ขายไปแล้ว (มี serial) แต่ไม่มีในสต๊อก"
//   = product_sales ที่มี sn แต่ไม่มี stock_items ผูก sale_id (mark_stock_sold คืน 0)
//   ช่วยให้รู้ว่าสาขาขายของที่ไม่เคยสแกนรับเข้า → สต๊อกไม่ครบ
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const seeAll = canSeeAllSales(me.access)

  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") || "60")))
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10)

  // สาขาของพนักงาน (ถ้าไม่ใช่ admin)
  let myBranchId: string | null = null
  if (!seeAll) {
    const { data: emp } = await svc.from("employees").select("branch_id").eq("id", me.employeeId).maybeSingle()
    myBranchId = emp?.branch_id ?? null
  }

  // ขายที่มี serial (paginate)
  const sales: any[] = []
  let from = 0
  while (true) {
    let q = svc.from("product_sales")
      .select("id, sn, product_name, brand, barcode, branch_name, branch_id, sold_price, sold_date, employee:employees!product_sales_employee_id_fkey(first_name_th,last_name_th,nickname)")
      .not("sn", "is", null).gte("sold_date", since)
      .order("sold_date", { ascending: false }).range(from, from + 999)
    if (!seeAll) q = q.eq("branch_id", myBranchId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    sales.push(...data.filter((s: any) => s.sn && String(s.sn).trim()))
    if (data.length < 1000) break
    from += 1000
  }

  if (sales.length === 0) return NextResponse.json({ since, count: 0, items: [] })

  // มี stock_items ผูก sale_id ไหน
  const saleIds = sales.map(s => s.id)
  const linked = new Set<string>()
  for (let i = 0; i < saleIds.length; i += 500) {
    const { data } = await svc.from("stock_items").select("sale_id").in("sale_id", saleIds.slice(i, i + 500))
    for (const r of data ?? []) if (r.sale_id) linked.add(r.sale_id)
  }

  // discrepancy = ขายมี sn แต่ไม่มี stock ผูก
  const items = sales.filter(s => !linked.has(s.id)).map(s => ({
    sale_id: s.id, serial: s.sn, product_name: s.product_name, brand: s.brand, barcode: s.barcode,
    branch_name: s.branch_name, sold_price: s.sold_price, sold_date: s.sold_date,
    employee: s.employee ? (s.employee.nickname || `${s.employee.first_name_th ?? ""} ${s.employee.last_name_th ?? ""}`.trim()) : null,
  }))

  return NextResponse.json({ since, count: items.length, total_sales_with_sn: sales.length, items })
}
