import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canManageProducts } from "@/lib/utils/product-sale-permissions"

// POST /api/products/import
// body: { rows: Array<{ barcode, name, model?, color?, brand?, category?, default_price?, specs?, warranty? }> }
// upsert ด้วย onConflict: barcode
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (!canManageProducts(me.access)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ import" }, { status: 403 })
  }

  const body = await req.json()
  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: "ไม่มีข้อมูล" }, { status: 400 })
  if (rows.length > 2000) return NextResponse.json({ error: "เกิน 2000 รายการต่อครั้ง" }, { status: 400 })

  const companyId = me.companyId
  const empId = me.employeeId

  // sanitize + dedupe by barcode (keep last)
  const map = new Map<string, any>()
  for (const r of rows) {
    const bc = String(r.barcode || "").replace(/\D/g, "").trim()
    if (!bc || !/^\d{6,14}$/.test(bc)) continue
    if (!r.name || !String(r.name).trim()) continue
    map.set(bc, {
      barcode: bc,
      name: String(r.name).trim(),
      brand: r.brand || null,
      category: r.category || null,
      model: r.model || null,
      color: r.color || null,
      sku: r.sku || null,
      description: r.description || null,
      default_price: r.default_price != null && r.default_price !== "" ? Number(r.default_price) : null,
      cost_price: r.cost_price != null && r.cost_price !== "" ? Number(r.cost_price) : null,
      sn_required: !!r.sn_required,
      image_url: r.image_url || null,
      warranty: r.warranty || null,
      specs: r.specs || null,
      is_active: true,
      company_id: r.company_id || companyId,
      created_by: empId,
    })
  }
  const clean = Array.from(map.values())
  if (clean.length === 0) return NextResponse.json({ error: "ไม่มี barcode ที่ถูกต้อง" }, { status: 400 })

  // upsert in batches of 100
  let inserted = 0, errors: string[] = []
  for (let i = 0; i < clean.length; i += 100) {
    const slice = clean.slice(i, i + 100)
    const { data, error } = await svc.from("products")
      .upsert(slice, { onConflict: "barcode" })
      .select("id, barcode")
    if (error) errors.push(error.message)
    else inserted += (data?.length ?? slice.length)
  }
  return NextResponse.json({
    success: true,
    received: rows.length,
    valid: clean.length,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  })
}
