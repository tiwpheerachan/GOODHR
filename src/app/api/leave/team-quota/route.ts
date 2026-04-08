import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const body = await req.json()
  const { date, manager_id, company_id, department_id } = body

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })

  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const effectiveManagerId = manager_id || userData.employee_id

  // Get team members
  let teamEmployeeIds: string[] = []

  if (isAdmin && !manager_id && company_id) {
    // Admin viewing by company/department
    let q = supa.from("employees").select("id").eq("company_id", company_id).eq("is_active", true)
    if (department_id) q = q.eq("department_id", department_id)
    const { data: emps } = await q
    teamEmployeeIds = (emps ?? []).map((e: any) => e.id)
  } else {
    // By manager
    const { data: teamRows } = await supa.from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", effectiveManagerId)
      .is("effective_to", null)
    teamEmployeeIds = (teamRows ?? []).map((r: any) => r.employee_id)
  }

  if (teamEmployeeIds.length === 0) {
    return NextResponse.json({ team_size: 0, working: 0, on_leave: 0, pending_leave: 0, quota_pct: 100, quota_ok: true, members: [] })
  }

  // Get approved leaves for that date
  const { data: approvedLeaves } = await supa.from("leave_requests")
    .select("employee_id, leave_type:leave_types(name, color_hex)")
    .in("employee_id", teamEmployeeIds)
    .eq("status", "approved")
    .lte("start_date", date)
    .gte("end_date", date)

  // Get pending leaves for that date
  const { data: pendingLeaves } = await supa.from("leave_requests")
    .select("employee_id, leave_type:leave_types(name, color_hex)")
    .in("employee_id", teamEmployeeIds)
    .eq("status", "pending")
    .lte("start_date", date)
    .gte("end_date", date)

  // Get employee names
  const { data: employees } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code")
    .in("id", teamEmployeeIds)

  const empMap: Record<string, any> = {}
  for (const e of (employees ?? [])) empMap[e.id] = e

  const approvedSet = new Set((approvedLeaves ?? []).map((l: any) => l.employee_id))
  const pendingSet = new Set((pendingLeaves ?? []).map((l: any) => l.employee_id))

  const onLeaveCount = approvedSet.size
  const pendingCount = pendingSet.size
  const teamSize = teamEmployeeIds.length
  const workingCount = teamSize - onLeaveCount

  const quotaPct = teamSize > 0 ? Math.round((workingCount / teamSize) * 100) : 100
  const quotaOk = quotaPct >= 60

  const members = teamEmployeeIds.map(id => {
    const emp = empMap[id]
    const name = emp ? (emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`) : "?"
    let status: "working" | "on_leave" | "pending_leave" = "working"
    let leaveType = null

    if (approvedSet.has(id)) {
      status = "on_leave"
      const lv = (approvedLeaves ?? []).find((l: any) => l.employee_id === id)
      leaveType = (lv?.leave_type as any)?.name || null
    } else if (pendingSet.has(id)) {
      status = "pending_leave"
      const lv = (pendingLeaves ?? []).find((l: any) => l.employee_id === id)
      leaveType = (lv?.leave_type as any)?.name || null
    }

    return { id, name, avatar_url: emp?.avatar_url || null, employee_code: emp?.employee_code, status, leave_type: leaveType }
  })

  return NextResponse.json({
    team_size: teamSize,
    working: workingCount,
    on_leave: onLeaveCount,
    pending_leave: pendingCount,
    quota_pct: quotaPct,
    quota_ok: quotaOk,
    members,
  })
}
