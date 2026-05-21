import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const { data: u } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!u || !["super_admin", "hr_admin"].includes(u.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const [posR, appsR] = await Promise.all([
    svc.from("job_positions").select("id, status, applications_count, views_count"),
    svc.from("job_applications").select("id, status, source, position_id, applied_at, hired_employee_id"),
  ])
  const positions = posR.data ?? []
  const apps = appsR.data ?? []

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const overview = {
    total_positions: positions.length,
    open_positions: positions.filter(p => p.status === "open").length,
    draft_positions: positions.filter(p => p.status === "draft").length,
    closed_positions: positions.filter(p => ["closed", "archived"].includes(p.status)).length,
    total_applications: apps.length,
    applications_this_month: apps.filter(a => a.applied_at >= startOfMonth).length,
    total_views: positions.reduce((s, p) => s + (p.views_count || 0), 0),
    hired_this_month: apps.filter(a => a.hired_employee_id && a.applied_at >= startOfMonth).length,
  }

  // Status funnel
  const statusCount: Record<string, number> = {
    new: 0, screening: 0, interview: 0, offered: 0, hired: 0, rejected: 0, withdrawn: 0,
  }
  for (const a of apps) statusCount[a.status] = (statusCount[a.status] || 0) + 1

  // Source breakdown
  const sourceCount: Record<string, number> = {}
  for (const a of apps) {
    const s = a.source || "unknown"
    sourceCount[s] = (sourceCount[s] || 0) + 1
  }

  // Top positions by applications
  const topPositions = positions
    .sort((a, b) => (b.applications_count || 0) - (a.applications_count || 0))
    .slice(0, 5)
    .map(p => ({ id: p.id, applications: p.applications_count || 0, views: p.views_count || 0 }))

  // Recent applications
  const recent = [...apps]
    .sort((a, b) => (b.applied_at > a.applied_at ? 1 : -1))
    .slice(0, 10)

  return NextResponse.json({ overview, statusCount, sourceCount, topPositions, recent })
}
