import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import {
  getProductSaleAccess, canRecordSale, canSeeAllSales, canSeeTeamSales,
} from "@/lib/utils/product-sale-permissions"

// helper: คำนวณ employee_ids ที่ user คนนี้จะดูได้ตาม scope
async function resolveScope(svc: any, userId: string, scopeParam?: string | null) {
  const me = await getProductSaleAccess(svc, userId)
  if (me.access === "none") return { error: "ไม่มีสิทธิ์ใช้ฟังก์ชันนี้", status: 403, me }

  const empId = me.employeeId

  // ── คำนวณ scope ──
  if (scopeParam === "me" || me.access === "staff") {
    return { empIds: [empId], me, includeOrphan: false }
  }
  if (scopeParam === "team" || me.access === "manager") {
    const { data: subs } = await svc.from("employee_manager_history")
      .select("employee_id").eq("manager_id", empId).is("effective_to", null)
    const ids = [empId, ...(subs ?? []).map((r: any) => r.employee_id)]
    return { empIds: ids, me, includeOrphan: false }
  }
  if (scopeParam === "all" && canSeeAllSales(me.access)) {
    return { empIds: null, me, includeOrphan: true }  // null = ดูทุกคน + รวม historical
  }
  // default
  if (canSeeAllSales(me.access)) return { empIds: null, me, includeOrphan: true }
  if (canSeeTeamSales(me.access)) {
    const { data: subs } = await svc.from("employee_manager_history")
      .select("employee_id").eq("manager_id", empId).is("effective_to", null)
    return { empIds: [empId, ...(subs ?? []).map((r: any) => r.employee_id)], me, includeOrphan: false }
  }
  return { empIds: [empId], me, includeOrphan: false }
}

// GET /api/products/sales
//   ?scope=me|team|all
//   ?start=&end=&employee_id=&branch_name=&sales_channel=&category=&brand=&barcode=&source=
//   ?limit=2000
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const sp = req.nextUrl.searchParams
  const scopeParam = sp.get("scope")
  const start = sp.get("start")
  const end = sp.get("end")
  const empIdFilter = sp.get("employee_id")
  const branchName = sp.get("branch_name")
  const salesChannel = sp.get("sales_channel")
  const category = sp.get("category")
  const brand = sp.get("brand")
  const barcode = sp.get("barcode")
  const source = sp.get("source") // 'manual' | 'import' | 'all'
  const limit = Math.min(parseInt(sp.get("limit") || "2000"), 10000)

  const scope = await resolveScope(svc, user.id, scopeParam)
  if ("error" in scope) return NextResponse.json({ error: scope.error }, { status: scope.status })

  let q = svc.from("product_sales")
    .select(`*,
      employee:employees!product_sales_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, department:departments(name)),
      product:products(id, name, brand, category, image_url, model, color),
      branch:branches(name)`)
    .is("deleted_at", null)
    .order("sold_at", { ascending: false })
    .limit(limit)

  if (scope.empIds) {
    // ── ดูเฉพาะคน list นี้; แต่ถ้า admin (includeOrphan=true) จะรวม historical (employee_id IS NULL) ด้วย ──
    if (scope.includeOrphan) {
      q = q.or(`employee_id.in.(${scope.empIds.filter(Boolean).join(",")}),employee_id.is.null`)
    } else {
      q = q.in("employee_id", scope.empIds.filter(Boolean))
    }
  }
  if (empIdFilter && canSeeAllSales(scope.me.access)) q = q.eq("employee_id", empIdFilter)
  if (start) q = q.gte("sold_date", start)
  if (end) q = q.lte("sold_date", end)
  if (branchName) q = q.eq("branch_name", branchName)
  if (salesChannel) q = q.eq("sales_channel", salesChannel)
  if (category) q = q.eq("category", category)
  if (brand) q = q.eq("brand", brand)
  if (barcode) q = q.eq("barcode", barcode)
  if (source && source !== "all") q = q.eq("source", source)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── สรุปยอด ──
  const sales = data ?? []
  let totalAmt = 0
  let totalQty = 0
  for (const s of sales) {
    totalAmt += Number(s.sold_price) * (s.qty || 1)
    totalQty += s.qty || 1
  }

  // group by date
  const byDate: Record<string, { count: number; amount: number }> = {}
  for (const s of sales) {
    const d = s.sold_date
    if (!byDate[d]) byDate[d] = { count: 0, amount: 0 }
    byDate[d].count += s.qty || 1
    byDate[d].amount += Number(s.sold_price) * (s.qty || 1)
  }

  // group by employee (skip orphan)
  const byEmp: Record<string, { name: string; avatar: string | null; count: number; amount: number }> = {}
  for (const s of sales) {
    if (!s.employee_id) continue
    const k = s.employee_id
    if (!byEmp[k]) byEmp[k] = {
      name: s.employee ? (s.employee.nickname || `${s.employee.first_name_th} ${s.employee.last_name_th}`) : k,
      avatar: s.employee?.avatar_url || null,
      count: 0, amount: 0,
    }
    byEmp[k].count += s.qty || 1
    byEmp[k].amount += Number(s.sold_price) * (s.qty || 1)
  }

  // group by employee × day (สรุปพนักงานแต่ละคนว่าแต่ละวันขายเท่าไหร่)
  const empDay = new Map<string, { employee_id: string; name: string; avatar: string | null; total_amount: number; total_qty: number; cells: Record<string, { count: number; amount: number }> }>()
  const dateSet = new Set<string>()
  for (const s of sales) {
    if (!s.employee_id) continue
    const k = s.employee_id
    const d = s.sold_date
    dateSet.add(d)
    if (!empDay.has(k)) empDay.set(k, {
      employee_id: k,
      name: s.employee ? (s.employee.nickname || `${s.employee.first_name_th} ${s.employee.last_name_th}`) : k,
      avatar: s.employee?.avatar_url || null,
      total_amount: 0, total_qty: 0, cells: {},
    })
    const row = empDay.get(k)!
    const amt = Number(s.sold_price) * (s.qty || 1)
    const qty = s.qty || 1
    row.total_amount += amt
    row.total_qty += qty
    if (!row.cells[d]) row.cells[d] = { count: 0, amount: 0 }
    row.cells[d].count += qty
    row.cells[d].amount += amt
  }
  const byEmployeeDay = {
    dates: Array.from(dateSet).sort(),
    rows: Array.from(empDay.values()).sort((a, b) => b.total_amount - a.total_amount),
  }

  // group by product
  const byProduct: Record<string, { name: string; brand: string | null; barcode: string | null; count: number; amount: number }> = {}
  for (const s of sales) {
    const k = s.product_id || s.barcode || s.product_name
    if (!byProduct[k]) byProduct[k] = {
      name: s.product_name,
      brand: s.brand || s.product?.brand || null,
      barcode: s.barcode || null,
      count: 0, amount: 0,
    }
    byProduct[k].count += s.qty || 1
    byProduct[k].amount += Number(s.sold_price) * (s.qty || 1)
  }

  // group by branch_name / sales_channel / category
  const groupBy = (key: string) => {
    const m: Record<string, { count: number; amount: number }> = {}
    for (const s of sales) {
      const v = (s as any)[key] || "(ไม่ระบุ)"
      if (!m[v]) m[v] = { count: 0, amount: 0 }
      m[v].count += s.qty || 1
      m[v].amount += Number(s.sold_price) * (s.qty || 1)
    }
    return Object.entries(m).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.amount - a.amount)
  }

  // facets (รวม distinct values สำหรับ filter UI)
  const facets = {
    branches: Array.from(new Set(sales.map(s => s.branch_name).filter(Boolean))).sort(),
    channels: Array.from(new Set(sales.map(s => s.sales_channel).filter(Boolean))).sort(),
    categories: Array.from(new Set(sales.map(s => s.category).filter(Boolean))).sort(),
    brands: Array.from(new Set(sales.map(s => s.brand || s.product?.brand).filter(Boolean))).sort(),
    sources: Array.from(new Set(sales.map(s => s.source).filter(Boolean))).sort(),
  }

  return NextResponse.json({
    sales,
    stats: {
      total_amount: totalAmt,
      total_qty: totalQty,
      transactions: sales.length,
      employees: Object.keys(byEmp).length,
      products: Object.keys(byProduct).length,
    },
    by_date: Object.entries(byDate).sort().map(([d, v]) => ({ date: d, ...v })),
    by_employee: Object.values(byEmp).sort((a, b) => b.amount - a.amount),
    by_employee_day: byEmployeeDay,
    by_product: Object.values(byProduct).sort((a, b) => b.amount - a.amount),
    by_branch: groupBy("branch_name"),
    by_channel: groupBy("sales_channel"),
    by_category: groupBy("category"),
    facets,
    my_access: scope.me.access,
  })
}

// POST /api/products/sales — บันทึกการขาย
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์บันทึกการขาย" }, { status: 403 })
  if (!me.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 400 })

  // get employee company/branch + permission defaults
  const [{ data: emp }, { data: pref }] = await Promise.all([
    svc.from("employees").select("company_id, branch_id, branch:branches(name)").eq("id", me.employeeId).single(),
    svc.from("product_sale_permissions").select("default_branch_name, default_sales_channel").eq("employee_id", me.employeeId).maybeSingle(),
  ])

  const body = await req.json()
  const { barcode, product_id, product_name, brand, category, sold_price, sn, order_number, qty, note, sales_channel, proof_photo_url, branch_name } = body
  if (!product_name) return NextResponse.json({ error: "ต้องระบุชื่อสินค้า" }, { status: 400 })
  if (sold_price == null || sold_price === "") return NextResponse.json({ error: "ต้องระบุราคาขาย" }, { status: 400 })
  const priceN = Number(sold_price)
  if (isNaN(priceN) || priceN < 0) return NextResponse.json({ error: "ราคาไม่ถูกต้อง" }, { status: 400 })

  const { data, error } = await svc.from("product_sales").insert({
    employee_id: me.employeeId,
    company_id: emp?.company_id || null,
    branch_id: emp?.branch_id || null,
    // ── ใช้ branch จาก payload → default ของ permissions → branch จาก employees ──
    branch_name: branch_name || pref?.default_branch_name || (emp?.branch as any)?.name || null,
    sales_channel: sales_channel || pref?.default_sales_channel || null,
    product_id: product_id || null,
    barcode: barcode || null,
    product_name,
    brand: brand || null,
    category: category || null,
    sold_price: priceN,
    sn: sn || null,
    order_number: order_number || null,
    qty: qty ? Number(qty) : 1,
    note: note || null,
    proof_photo_url: proof_photo_url || null,
    source: "manual",
  }).select("id, sold_at, sold_date").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, sale: data })
}

// PATCH — edit (own or admin)
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { id, sold_price, sn, order_number, qty, note, sales_channel } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: sale } = await svc.from("product_sales").select("employee_id").eq("id", id).maybeSingle()
  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canSeeAllSales(me.access) && sale.employee_id !== me.employeeId) {
    return NextResponse.json({ error: "แก้ได้เฉพาะของตัวเอง" }, { status: 403 })
  }

  const updates: any = {}
  if (sold_price !== undefined) updates.sold_price = Number(sold_price)
  if (sn !== undefined) updates.sn = sn || null
  if (order_number !== undefined) updates.order_number = order_number || null
  if (qty !== undefined) updates.qty = Number(qty) || 1
  if (note !== undefined) updates.note = note || null
  if (sales_channel !== undefined) updates.sales_channel = sales_channel || null

  const { error } = await svc.from("product_sales").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — soft delete
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: sale } = await svc.from("product_sales").select("employee_id").eq("id", id).maybeSingle()
  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canSeeAllSales(me.access) && sale.employee_id !== me.employeeId) {
    return NextResponse.json({ error: "ลบได้เฉพาะของตัวเอง" }, { status: 403 })
  }
  await svc.from("product_sales").update({
    deleted_at: new Date().toISOString(),
    deleted_by: me.employeeId,
  }).eq("id", id)
  return NextResponse.json({ success: true })
}
