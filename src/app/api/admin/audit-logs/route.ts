import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role")
    .eq("id", user.id).single()

  if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const url = req.nextUrl.searchParams
  const action = url.get("action") || ""
  const entityType = url.get("entity_type") || ""
  const limit = Math.min(parseInt(url.get("limit") || "50"), 200)
  const offset = parseInt(url.get("offset") || "0")

  // ไม่กรอง company_id → แสดง audit log ทุกคนทุกบริษัทรวมกัน
  let query = supa.from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq("action", action)
  if (entityType) query = query.eq("entity_type", entityType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get total count
  let countQuery = supa.from("audit_logs").select("id", { count: "exact", head: true })
  if (action) countQuery = countQuery.eq("action", action)
  if (entityType) countQuery = countQuery.eq("entity_type", entityType)
  const { count } = await countQuery

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
