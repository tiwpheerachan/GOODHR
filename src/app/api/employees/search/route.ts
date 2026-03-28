import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

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

  const search = req.nextUrl.searchParams.get("q") || ""
  const companyId = (userData.employee as any)?.company_id

  let query = supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, nickname, avatar_url, department:departments(name), position:positions(name)")
    .eq("is_active", true)
    .order("first_name_th")
    .limit(20)

  if (companyId) query = query.eq("company_id", companyId)

  if (search.trim()) {
    const k = `%${search}%`
    query = query.or(`first_name_th.ilike.${k},last_name_th.ilike.${k},nickname.ilike.${k},employee_code.ilike.${k}`)
  }

  const { data } = await query
  return NextResponse.json({ employees: data || [] })
}
