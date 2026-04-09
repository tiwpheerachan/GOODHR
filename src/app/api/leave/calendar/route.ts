import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const params = req.nextUrl.searchParams
  const month = params.get("month") // "2026-04"
  const rawCompanyId = params.get("company_id") // "all" = ทุกบริษัท
  const companyId = rawCompanyId === "all" ? null : (rawCompanyId || (userData.employee as any)?.company_id)
  const departmentId = params.get("department_id")
  const managerId = params.get("manager_id")
  const search = params.get("search")?.trim().toLowerCase() || ""

  if (!month) return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 })

  // Calculate date range for the month
  const [yearStr, monthStr] = month.split("-")
  const year = parseInt(yearStr)
  const mon = parseInt(monthStr)
  const firstDay = `${month}-01`
  const lastDay = new Date(year, mon, 0).toISOString().split("T")[0]

  // Get team members based on filter
  let teamEmployeeIds: string[] = []

  if (managerId) {
    // Filter by specific manager
    const { data: teamRows } = await supa.from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", managerId)
      .is("effective_to", null)
    teamEmployeeIds = (teamRows ?? []).map((r: any) => r.employee_id)
  } else if (isAdmin) {
    // Admin: filter by company (optional) + department (optional)
    // ถ้า companyId = null → ดึงทุกบริษัท
    let q = supa.from("employees").select("id").eq("is_active", true)
    if (companyId) q = q.eq("company_id", companyId)
    if (departmentId) q = q.eq("department_id", departmentId)
    const { data: emps } = await q.limit(1000)
    teamEmployeeIds = (emps ?? []).map((e: any) => e.id)
  } else if (userData.employee_id) {
    // Manager: own team
    const { data: teamRows } = await supa.from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", userData.employee_id)
      .is("effective_to", null)
    teamEmployeeIds = (teamRows ?? []).map((r: any) => r.employee_id)
  }

  if (teamEmployeeIds.length === 0) {
    return NextResponse.json({ days: {}, employees: [], balances: [] })
  }

  // Get all leave requests that overlap with this month
  const { data: leaveRequests } = await supa.from("leave_requests")
    .select("id, employee_id, start_date, end_date, total_days, status, leave_type:leave_types(id, name, color_hex)")
    .in("employee_id", teamEmployeeIds)
    .in("status", ["approved", "pending"])
    .lte("start_date", lastDay)
    .gte("end_date", firstDay)

  // Get employee details
  const { data: employees } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name), position:positions(name)")
    .in("id", teamEmployeeIds)

  // Get leave balances for all team members (current year)
  const { data: balances } = await supa.from("leave_balances")
    .select("employee_id, entitled_days, used_days, pending_days, remaining_days, carried_over, leave_type:leave_types(name, color_hex)")
    .in("employee_id", teamEmployeeIds)
    .eq("year", year)

  const empMap: Record<string, any> = {}
  for (const e of (employees ?? [])) empMap[e.id] = e

  // ── Search filter: กรองตามชื่อ/รหัสพนักงาน ──
  if (search) {
    teamEmployeeIds = teamEmployeeIds.filter(id => {
      const e = empMap[id]
      if (!e) return false
      const fullName = `${e.first_name_th ?? ""} ${e.last_name_th ?? ""} ${e.nickname ?? ""} ${e.employee_code ?? ""}`.toLowerCase()
      return fullName.includes(search)
    })
  }

  // Build day-by-day data
  const days: Record<string, any> = {}
  const daysInMonth = new Date(year, mon, 0).getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`
    const onLeave: any[] = []
    const pending: any[] = []

    for (const lr of (leaveRequests ?? [])) {
      if (lr.start_date <= dateStr && lr.end_date >= dateStr) {
        const emp = empMap[lr.employee_id]
        const entry = {
          employee_id: lr.employee_id,
          name: emp ? (emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`) : "?",
          avatar_url: emp?.avatar_url || null,
          leave_type: (lr.leave_type as any)?.name || null,
          leave_color: (lr.leave_type as any)?.color_hex || null,
          request_id: lr.id,
        }
        if (lr.status === "approved") onLeave.push(entry)
        else if (lr.status === "pending") pending.push(entry)
      }
    }

    const onLeaveIds = new Set(onLeave.map(l => l.employee_id))
    const pendingIds = new Set(pending.map(l => l.employee_id))
    const workingCount = teamEmployeeIds.filter(id => !onLeaveIds.has(id) && !pendingIds.has(id)).length
    const quotaPct = teamEmployeeIds.length > 0 ? Math.round((workingCount / teamEmployeeIds.length) * 100) : 100

    days[dateStr] = {
      team_size: teamEmployeeIds.length,
      working: workingCount,
      on_leave: onLeave,
      pending: pending,
      quota_pct: quotaPct,
      quota_ok: quotaPct >= 60,
    }
  }

  // Format employee list
  const employeeList = teamEmployeeIds.map(id => {
    const e = empMap[id]
    return e ? {
      id: e.id,
      name: e.nickname || `${e.first_name_th} ${e.last_name_th}`,
      full_name: `${e.first_name_th} ${e.last_name_th}`,
      code: e.employee_code,
      avatar_url: e.avatar_url,
      department: (e.department as any)?.name || null,
      position: (e.position as any)?.name || null,
    } : null
  }).filter(Boolean)

  // Format balances (เฉพาะพนักงานที่ผ่าน filter/search)
  const filteredIdSet = new Set(teamEmployeeIds)
  const balanceList = (balances ?? [])
    .filter((b: any) => filteredIdSet.has(b.employee_id))
    .map((b: any) => ({
      employee_id: b.employee_id,
      leave_type: (b.leave_type as any)?.name || null,
      color: (b.leave_type as any)?.color_hex || null,
      entitled_days: b.entitled_days,
      used_days: b.used_days,
      pending_days: b.pending_days,
      remaining_days: b.remaining_days,
      carried_over: b.carried_over,
    }))

  return NextResponse.json({ days, employees: employeeList, balances: balanceList })
}
