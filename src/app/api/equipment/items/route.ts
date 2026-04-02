import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*, employee:employees(company_id)").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = (dbUser.employee as any)?.company_id || dbUser.company_id
  const url = req.nextUrl.searchParams
  const mode = url.get("mode") || "employee"
  const categoryId = url.get("category_id")

  let query = svc.from("equipment_items")
    .select("*, category:equipment_categories(id, name, icon)")
    .order("name")
  if (companyId) query = query.eq("company_id", companyId)

  if (mode === "employee") {
    query = query.eq("is_active", true)
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
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
    const { category_id, name, description, image_url, total_qty, unit } = body
    if (!name?.trim()) return NextResponse.json({ error: "กรุณาระบุชื่ออุปกรณ์" }, { status: 400 })
    if (!category_id) return NextResponse.json({ error: "กรุณาเลือกหมวดหมู่" }, { status: 400 })
    const qty = Math.max(0, Number(total_qty) || 1)
    const { data, error } = await svc.from("equipment_items").insert({
      company_id: companyId, category_id, name: name.trim(), description,
      image_url, total_qty: qty, available_qty: qty, unit: unit || "ชิ้น",
      created_by: dbUser.employee_id,
    }).select("*, category:equipment_categories(id, name, icon)").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, item: data })
  }

  if (action === "update") {
    const { id, name, description, image_url, category_id, unit, is_active } = body
    if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
    const updates: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (image_url !== undefined) updates.image_url = image_url
    if (category_id !== undefined) updates.category_id = category_id
    if (unit !== undefined) updates.unit = unit
    if (is_active !== undefined) updates.is_active = is_active
    const { error } = await svc.from("equipment_items").update(updates).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "adjust_stock") {
    const { id, total_qty } = body
    if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
    const newTotal = Math.max(0, Number(total_qty) || 0)

    // ดึง item ปัจจุบัน เพื่อคำนวณ available_qty ใหม่
    const { data: item } = await svc.from("equipment_items").select("total_qty, available_qty").eq("id", id).single()
    if (!item) return NextResponse.json({ error: "ไม่พบอุปกรณ์" }, { status: 404 })

    const borrowed = item.total_qty - item.available_qty
    const newAvailable = Math.max(0, newTotal - borrowed)

    const { error } = await svc.from("equipment_items").update({
      total_qty: newTotal, available_qty: newAvailable, updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, total_qty: newTotal, available_qty: newAvailable })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
