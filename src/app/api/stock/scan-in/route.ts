import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canRecordSale } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// POST /api/stock/scan-in — รับสินค้าเข้าสต๊อก (รายซีเรียล)
//   body: { items: [{ serial, barcode?, product_name?, brand?, sku?, image_url? }], branch_name? }
//   หรือ item เดียว: { serial, barcode, product_name, ... }
//   สแกน serial → upsert เป็น in_stock ที่สาขาของพนักงาน (ถ้ามีที่สาขาอื่น = ย้ายเข้าสาขานี้)
// ════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์รับสินค้าเข้าสต๊อก" }, { status: 403 })
  if (!me.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 400 })

  const [{ data: emp }, { data: pref }] = await Promise.all([
    svc.from("employees").select("company_id, branch_id, branch:branches(name)").eq("id", me.employeeId).single(),
    svc.from("product_sale_permissions").select("default_branch_name").eq("employee_id", me.employeeId).maybeSingle(),
  ])

  const body = await req.json().catch(() => ({}))
  const rawItems = Array.isArray(body?.items) ? body.items : (body?.serial ? [body] : [])
  const branchName = body?.branch_name || pref?.default_branch_name || (emp?.branch as any)?.name || null

  if (rawItems.length === 0) return NextResponse.json({ error: "ไม่มีรายการ" }, { status: 400 })

  const results: any[] = []
  let added = 0, skipped = 0
  for (const it of rawItems) {
    const serial = (it?.serial ?? it?.serial_number ?? "").toString().trim()
    if (!serial) { skipped++; results.push({ serial: null, status: "skip_no_serial" }); continue }

    const row = {
      company_id: emp?.company_id ?? null,
      branch_id: emp?.branch_id ?? null,
      branch_name: branchName,
      serial_number: serial,
      barcode: it?.barcode ?? null,
      sku: it?.sku ?? null,
      product_name: it?.product_name ?? null,
      brand: it?.brand ?? null,
      image_url: it?.image_url ?? null,
      status: "in_stock",
      in_by: me.employeeId,
      in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // reset ฟิลด์ขาย (เผื่อ serial เคยขายไปแล้วถูกรับกลับเข้า)
      sale_id: null, sold_by: null, sold_at: null,
    }
    const { error } = await svc.from("stock_items").upsert(row, { onConflict: "serial_norm" })
    if (error) { results.push({ serial, status: "error", error: error.message }); continue }
    added++
    results.push({ serial, status: "in_stock" })
  }

  return NextResponse.json({ success: true, branch_name: branchName, added, skipped, results })
}
