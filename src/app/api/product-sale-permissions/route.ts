import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canManagePermissions } from "@/lib/utils/product-sale-permissions"

// GET /api/product-sale-permissions
//   → list ทุก permission ที่มี + รวมผู้ที่ยังไม่มีในรายการ (employees ทั้งบริษัท)
//   ?include_candidates=1  → return employees ที่ยังไม่มี permission ด้วย (เผื่อ assign)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (me.access === "none") return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const includeCandidates = sp.get("include_candidates") === "1"
  const search = sp.get("search")?.trim()
  const limit = Math.min(parseInt(sp.get("limit") || "50"), 200)

  const { data: perms, error: permErr } = await svc.from("product_sale_permissions")
    .select(`id, access_level, granted_at, note, default_branch_name, default_sales_channel,
      employee:employees!product_sale_permissions_employee_id_fkey(
        id, first_name_th, last_name_th, nickname, employee_code, avatar_url,
        department:departments(name), branch:branches(name),
        position:positions(name)
      ),
      granter:employees!product_sale_permissions_granted_by_fkey(first_name_th, last_name_th, nickname)
    `)
    .order("granted_at", { ascending: false })
  if (permErr) return NextResponse.json({ error: permErr.message }, { status: 500 })

  let candidates: any[] = []
  if (includeCandidates) {
    const existingIds = (perms ?? []).map((p: any) => p.employee?.id).filter(Boolean)
    let q = svc.from("employees")
      .select(`id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code, avatar_url,
        department:departments(name),
        branch:branches(name),
        position:positions(name)`)
      .eq("is_active", true)
      .order("first_name_th")
      .limit(limit)
    if (existingIds.length > 0) q = q.not("id", "in", `(${existingIds.join(",")})`)
    if (me.access !== "admin" && me.companyId) q = q.eq("company_id", me.companyId)
    // ── server-side search (ไม่รวม position เพราะอยู่ใน related table) ──
    if (search) {
      const s = search.replace(/[%_,()]/g, "")
      q = q.or(`first_name_th.ilike.%${s}%,last_name_th.ilike.%${s}%,nickname.ilike.%${s}%,employee_code.ilike.%${s}%,first_name_en.ilike.%${s}%,last_name_en.ilike.%${s}%`)
    }
    const { data, error: cErr } = await q
    if (cErr) return NextResponse.json({ error: "search error: " + cErr.message, permissions: perms ?? [] }, { status: 500 })
    candidates = data ?? []
  }

  return NextResponse.json({
    permissions: perms ?? [],
    candidates,
    my_access: me.access,
  })
}

// POST /api/product-sale-permissions
// body: { employee_id, access_level, note? }
// admin only
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canManagePermissions(me.access)) return NextResponse.json({ error: "เฉพาะ admin เท่านั้น" }, { status: 403 })

  const body = await req.json()
  const { employee_id, access_level, note } = body
  if (!employee_id) return NextResponse.json({ error: "ระบุ employee_id" }, { status: 400 })
  if (!["admin", "manager", "staff"].includes(access_level)) {
    return NextResponse.json({ error: "access_level ไม่ถูกต้อง" }, { status: 400 })
  }

  const { data, error } = await svc.from("product_sale_permissions")
    .upsert({
      employee_id, access_level, note: note || null,
      granted_by: me.employeeId,
      granted_at: new Date().toISOString(),
    }, { onConflict: "employee_id" })
    .select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}

// PATCH /api/product-sale-permissions
// body: { id, access_level, note? }  → แก้ระดับสิทธิ์
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (!canManagePermissions(me.access)) return NextResponse.json({ error: "เฉพาะ admin" }, { status: 403 })

  const body = await req.json()
  const { id, access_level, note } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const update: any = {}
  if (access_level !== undefined) {
    if (!["admin", "manager", "staff"].includes(access_level)) {
      return NextResponse.json({ error: "access_level ไม่ถูกต้อง" }, { status: 400 })
    }
    update.access_level = access_level
  }
  if (note !== undefined) update.note = note || null
  const { error } = await svc.from("product_sale_permissions").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/product-sale-permissions?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const me = await getProductSaleAccess(svc, user.id)
  if (!canManagePermissions(me.access)) return NextResponse.json({ error: "เฉพาะ admin" }, { status: 403 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("product_sale_permissions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
