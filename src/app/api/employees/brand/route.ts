import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { BRAND_OPTIONS } from "@/lib/utils/brands"

// PATCH /api/employees/brand
// Body: { employee_id, brands: string[] }
// อนุญาตเฉพาะ admin (super_admin/hr_admin)
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data: dbUser } = await supa
    .from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !["super_admin", "hr_admin"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { employee_id, brands } = body as { employee_id: string; brands: string[] }

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id required" }, { status: 400 })
  }

  // ตรวจสอบและกรอง brand ให้อยู่ใน BRAND_OPTIONS เท่านั้น
  const validSet = new Set<string>(BRAND_OPTIONS as readonly string[])
  const cleaned = Array.isArray(brands)
    ? brands.filter((b): b is string => typeof b === "string" && validSet.has(b))
    : []
  // unique
  const uniqueBrands = Array.from(new Set(cleaned))

  const { error } = await supa
    .from("employees")
    .update({ brand: uniqueBrands.length > 0 ? uniqueBrands : null, updated_at: new Date().toISOString() })
    .eq("id", employee_id)

  if (error) {
    console.error("[employees/brand] update failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, brands: uniqueBrands })
}
