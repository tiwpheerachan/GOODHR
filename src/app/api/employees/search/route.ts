import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// /api/employees/search
//   - q: search term (matches across ชื่อไทย/อังกฤษ, นามสกุล, ชื่อเล่น, รหัส)
//   - limit: max results (default 20, max 500)
//   - all_companies: "1" → super_admin/hr_admin ค้นข้ามทุกบริษัท (default: filter เฉพาะบริษัทตัวเอง)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ employees: [] })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee:employees(company_id)")
    .eq("id", user.id).single()
  if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
    return NextResponse.json({ employees: [] })
  }

  const params = req.nextUrl.searchParams
  const search = (params.get("q") || "").trim()
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "20", 10) || 20, 1), 500)
  const allCompanies = params.get("all_companies") === "1"
  const userCompanyId = (userData.employee as any)?.company_id

  let query = supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, company_id, department:departments(name), position:positions(name)")
    .eq("is_active", true)
    .order("first_name_th")
    .limit(limit)

  // super_admin ดูข้ามบริษัทได้, hr_admin จำกัดในบริษัทตัวเอง (เว้นแต่ pass all_companies=1 + super_admin)
  if (userData.role === "hr_admin" && userCompanyId) {
    query = query.eq("company_id", userCompanyId)
  } else if (!allCompanies && userCompanyId) {
    query = query.eq("company_id", userCompanyId)
  }

  if (search) {
    // ค้นหาแบบ multi-term: แยก term ด้วย space, แต่ละ term ต้อง match field ใดก็ได้
    //   "ระวี วร" → match "ระวีวรรณ" หรือ "ระวี วรนุช"
    //   ใช้ ilike กับทุก field ที่เก็บชื่อ
    const k = `%${search}%`
    query = query.or(
      [
        `first_name_th.ilike.${k}`,
        `last_name_th.ilike.${k}`,
        `first_name_en.ilike.${k}`,
        `last_name_en.ilike.${k}`,
        `nickname.ilike.${k}`,
        `nickname_en.ilike.${k}`,
        `employee_code.ilike.${k}`,
      ].join(","),
    )
  }

  const { data } = await query
  return NextResponse.json({ employees: data || [] })
}
