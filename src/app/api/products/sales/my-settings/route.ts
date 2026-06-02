import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canRecordSale } from "@/lib/utils/product-sale-permissions"

// GET /api/products/sales/my-settings
// → คืน default_branch_name + default_sales_channel ของผู้ใช้ปัจจุบัน
//   + list distinct branch names + channels ที่ขายไปแล้ว (สำหรับ picker)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // ── ดึง permission record ของตัวเอง (ถ้ามี) ──
  let perm: any = null
  if (me.employeeId) {
    const { data } = await svc.from("product_sale_permissions")
      .select("default_branch_name, default_sales_channel")
      .eq("employee_id", me.employeeId).maybeSingle()
    perm = data
  }

  // ── distinct branches/channels จาก product_sales (เป็น dropdown) ──
  const { data: branches } = await svc.from("product_sales")
    .select("branch_name").not("branch_name", "is", null).is("deleted_at", null).limit(3000)
  const { data: channels } = await svc.from("product_sales")
    .select("sales_channel").not("sales_channel", "is", null).is("deleted_at", null).limit(3000)

  // ── current employee's branch (fallback) ──
  let employeeBranch: string | null = null
  if (me.employeeId) {
    const { data: e } = await svc.from("employees")
      .select("branch:branches(name)").eq("id", me.employeeId).maybeSingle()
    employeeBranch = (e?.branch as any)?.name || null
  }

  return NextResponse.json({
    default_branch_name: perm?.default_branch_name || null,
    default_sales_channel: perm?.default_sales_channel || null,
    employee_branch: employeeBranch,
    available_branches: Array.from(new Set((branches ?? []).map((b: any) => b.branch_name))).sort(),
    available_channels: Array.from(new Set((channels ?? []).map((c: any) => c.sales_channel))).sort(),
  })
}

// PATCH /api/products/sales/my-settings
// body: { default_branch_name?, default_sales_channel? }
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  if (!me.employeeId) return NextResponse.json({ error: "no employee" }, { status: 400 })

  const body = await req.json()
  const { default_branch_name, default_sales_channel } = body

  // super_admin/hr_admin อาจไม่มี entry ใน permissions table — auto create
  const { data: existing } = await svc.from("product_sale_permissions")
    .select("id").eq("employee_id", me.employeeId).maybeSingle()

  if (existing) {
    const update: any = {}
    if (default_branch_name !== undefined) update.default_branch_name = default_branch_name || null
    if (default_sales_channel !== undefined) update.default_sales_channel = default_sales_channel || null
    const { error } = await svc.from("product_sale_permissions").update(update).eq("id", existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // create บรรทัดใหม่ (เฉพาะ admin role ที่ auto-get admin level)
    const lvl = (me.access === "admin") ? "admin" : me.access
    const { error } = await svc.from("product_sale_permissions").insert({
      employee_id: me.employeeId,
      access_level: lvl,
      default_branch_name: default_branch_name || null,
      default_sales_channel: default_sales_channel || null,
      granted_by: me.employeeId,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
