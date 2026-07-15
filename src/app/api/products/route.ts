import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canManageProducts } from "@/lib/utils/product-sale-permissions"

// ── log บาร์โค้ด/ซีเรียลที่สแกนแล้วไม่เจอ (best-effort, ไม่ block response) ──
async function logScanMiss(svc: any, userId: string, code: string, type: "barcode" | "serial") {
  try {
    const { data: u } = await svc.from("users").select("employee_id").eq("id", userId).maybeSingle()
    const empId = u?.employee_id ?? null
    let companyId: string | null = null
    if (empId) {
      const { data: e } = await svc.from("employees").select("company_id").eq("id", empId).maybeSingle()
      companyId = e?.company_id ?? null
    }
    await svc.rpc("log_scan_miss", { p_code: code, p_type: type, p_emp: empId, p_company: companyId })
  } catch { /* เงียบ — ไม่ให้กระทบการสแกน */ }
}

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
    // 1) หาใน catalog local ก่อน (มีราคา)
    const { data, error } = await svc.from("products")
      .select("*").eq("barcode", barcode).eq("is_active", true).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data) return NextResponse.json({ product: data })

    // 2) ไม่เจอ → fallback ไป barcode_products (synced จาก BigQuery pc.barcode_products)
    const norm = barcode.trim().toUpperCase()
    const { data: bpRows } = await svc.from("barcode_products")
      .select("*").eq("barcode_norm", norm).limit(1)
    const bp = (bpRows ?? [])[0]
    if (bp) {
      const price = bp.sale_price != null && Number(bp.sale_price) > 0 ? Number(bp.sale_price) : null
      const product = {
        __from_barcode_products: true,    // มาจาก BQ (barcode_products) ไม่ใช่ catalog local
        barcode: bp.barcode || barcode,
        name: bp.canonical_product_name || bp.product_name || bp.sku,
        brand: bp.brand || null,
        model: bp.main_product_line || null,
        color: bp.colour || null,
        sku: bp.sku || null,
        category: bp.category_leaf || bp.category_l2 || bp.category_l1 || bp.jst_category_name || null,
        variant_label: bp.variant_label || null,
        image_url: bp.picture_url || null,
        default_price: price,
      }
      return NextResponse.json({ product })
    }
    // ไม่เจอทั้ง catalog + barcode_products → log ไว้เติม master
    await logScanMiss(svc, user.id, barcode, "barcode")
    return NextResponse.json({ product: null })
  }

  // ── lookup ด้วย serial number → เทียบ serial_tracking (synced จาก BigQuery) ──
  const serial = sp.get("serial")
  if (serial) {
    const norm = serial.trim().toUpperCase()
    const { data, error } = await svc.from("serial_tracking")
      .select("*").eq("serial_norm", norm).limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const st = (data ?? [])[0]
    if (!st) {
      await logScanMiss(svc, user.id, serial, "serial")
      return NextResponse.json({ serial: null, product: null })
    }
    // shape เป็น product-like สำหรับ autofill ในหน้าขาย
    const product: any = {
      __from_serial: true,
      serial_number: st.serial_number,
      barcode: null,
      name: st.canonical_product_name || st.product_name || st.sku,
      brand: st.brand || null,
      model: st.main_product_line || null,
      color: st.colour || null,
      sku: st.sku || null,
      category: st.category_leaf || st.category_l2 || st.category_l1 || null,
      storage: st.storage || null,
      ram: st.ram || null,
      variant_label: st.variant_label || null,
      image_url: st.picture_url || null,
      default_price: null,
    }
    // ── เติมราคา + barcode + รูป จาก barcode_products (แมตช์ด้วย sku) → serial scan ได้ราคา/รูปด้วย ──
    if (st.sku) {
      const { data: bpRows } = await svc.from("barcode_products")
        .select("barcode, sale_price, picture_url").eq("sku", st.sku).limit(1)
      const bp = (bpRows ?? [])[0]
      if (bp) {
        if (bp.sale_price != null && Number(bp.sale_price) > 0) product.default_price = Number(bp.sale_price)
        if (bp.barcode) product.barcode = bp.barcode
        if (!product.image_url && bp.picture_url) product.image_url = bp.picture_url
      }
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
