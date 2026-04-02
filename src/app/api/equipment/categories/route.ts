import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role, employee_id, company_id").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = (dbUser as any).employee?.company_id || dbUser.company_id

  let query = svc.from("equipment_categories").select("*").order("sort_order").order("name")
  if (companyId) query = query.eq("company_id", companyId)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*, employee:employees(company_id)").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const companyId = (dbUser.employee as any)?.company_id || dbUser.company_id
  const body = await req.json()
  const { action } = body

  if (action === "create") {
    const { name, description, icon } = body
    if (!name?.trim()) return NextResponse.json({ error: "กรุณาระบุชื่อหมวดหมู่" }, { status: 400 })
    const { data, error } = await svc.from("equipment_categories").insert({
      company_id: companyId, name: name.trim(), description, icon: icon || "Package",
      created_by: dbUser.employee_id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, category: data })
  }

  if (action === "update") {
    const { id, name, description, icon, is_active, sort_order } = body
    if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
    const updates: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (icon !== undefined) updates.icon = icon
    if (is_active !== undefined) updates.is_active = is_active
    if (sort_order !== undefined) updates.sort_order = sort_order
    const { error } = await svc.from("equipment_categories").update(updates).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "delete") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
    const { error } = await svc.from("equipment_categories").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
