import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canManageProducts } from "@/lib/utils/product-sale-permissions"

// GET /api/products?barcode=xxx  → ดึงสินค้าเดี่ยวจาก barcode
// GET /api/products?q=text       → search ชื่อ/barcode/brand/model/sku
// GET /api/products              → list
// GET /api/products?include_inactive=1 → ดูที่ลบไปแล้วด้วย (admin only)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const sp = req.nextUrl.searchParams
  const barcode = sp.get("barcode")
  const q = sp.get("q")
  const limit = parseInt(sp.get("limit") || "50")
  const includeInactive = sp.get("include_inactive") === "1"

  if (barcode) {
    const { data, error } = await svc.from("products")
      .select("*").eq("barcode", barcode).eq("is_active", true).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  }

  // ── lookup ด้วย serial number → เทียบ serial_tracking (synced จาก BigQuery) ──
  const serial = sp.get("serial")
  if (serial) {
    const norm = serial.trim().toUpperCase()
    const { data, error } = await svc.from("serial_tracking")
      .select("*").eq("serial_norm", norm).limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const st = (data ?? [])[0]
    if (!st) return NextResponse.json({ serial: null, product: null })
    // shape เป็น product-like สำหรับ autofill ในหน้าขาย
    const product = {
      __from_serial: true,
      serial_number: st.serial_number,
      name: st.canonical_product_name || st.product_name || st.sku,
      brand: st.brand || null,
      model: st.main_product_line || null,
      color: st.colour || null,
      sku: st.sku || null,
      category: st.category_leaf || st.category_l2 || st.category_l1 || null,
      storage: st.storage || null,
      ram: st.ram || null,
      variant_label: st.variant_label || null,
      default_price: null,
    }
    return NextResponse.json({ serial: st, product })
  }

  let query = svc.from("products").select("*").order("created_at", { ascending: false }).limit(limit)
  if (!includeInactive) query = query.eq("is_active", true)
  if (q) {
    const s = q.trim()
    query = query.or(`barcode.ilike.%${s}%,name.ilike.%${s}%,brand.ilike.%${s}%,sku.ilike.%${s}%,model.ilike.%${s}%,color.ilike.%${s}%`)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

// POST /api/products — create/update product (admin/manager เท่านั้น)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (!canManageProducts(me.access)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสินค้า" }, { status: 403 })
  }

  const body = await req.json()
  const {
    id, barcode, name, brand, category, model, color, sku, description,
    default_price, cost_price, sn_required, company_id, image_url, warranty, specs,
    is_active,
  } = body
  if (!barcode || !name) return NextResponse.json({ error: "ต้องระบุ barcode และชื่อสินค้า" }, { status: 400 })

  const row: any = {
    barcode: String(barcode).trim(),
    name: String(name).trim(),
    brand: brand || null,
    category: category || null,
    model: model || null,
    color: color || null,
    sku: sku || null,
    description: description || null,
    default_price: default_price != null && default_price !== "" ? Number(default_price) : null,
    cost_price: cost_price != null && cost_price !== "" ? Number(cost_price) : null,
    sn_required: !!sn_required,
    image_url: image_url || null,
    warranty: warranty || null,
    specs: specs || null,
    company_id: company_id || me.companyId || null,
  }
  if (is_active !== undefined) row.is_active = !!is_active

  if (id) {
    const { error } = await svc.from("products").update(row).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id })
  }

  // upsert by barcode (สำคัญสำหรับ import)
  const { data, error } = await svc.from("products")
    .upsert({ ...row, created_by: me.employeeId }, { onConflict: "barcode" })
    .select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}

// DELETE /api/products?id=xxx  → soft delete
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (!canManageProducts(me.access)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบสินค้า" }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("products").update({ is_active: false }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
