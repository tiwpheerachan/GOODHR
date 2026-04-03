import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { logEmployeeChange, logAudit } from "@/lib/auditLog"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const companyId = req.nextUrl.searchParams.get("company_id") // "all" or specific UUID

  // Employees — if "all", fetch all companies
  let empQuery = supa.from("employees")
    .select(`id, employee_code, first_name_th, last_name_th, nickname, email, phone,
      avatar_url, supervisor_id, gender, employment_status, hire_date,
      company_id, department_id, position_id, branch_id,
      department:departments(id, name),
      position:positions(id, name),
      branch:branches(id, name),
      company:companies(id, code)`)
    .eq("is_active", true)
    .order("employee_code")

  if (companyId && companyId !== "all") {
    empQuery = empQuery.eq("company_id", companyId)
  }

  const { data: emps, error: empErr } = await empQuery

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  const empIds = (emps ?? []).map((e: any) => e.id)
  let schedProfiles: any[] = []
  let allowedLocs: any[] = []

  if (empIds.length > 0) {
    const { data: sp } = await supa.from("employee_schedule_profiles")
      .select("employee_id, schedule_type, default_shift:shift_templates(name, work_start, work_end)")
      .in("employee_id", empIds)
    schedProfiles = sp ?? []

    const { data: al } = await supa.from("employee_allowed_locations")
      .select("employee_id, branch_id, branch:branches(id, name)")
      .in("employee_id", empIds)
    allowedLocs = al ?? []
  }

  const spMap: Record<string, any> = {}
  for (const s of schedProfiles) spMap[s.employee_id] = s
  const alMap: Record<string, any[]> = {}
  for (const a of allowedLocs) {
    if (!alMap[a.employee_id]) alMap[a.employee_id] = []
    alMap[a.employee_id].push(a)
  }

  const enriched = (emps ?? []).map((e: any) => ({
    ...e,
    schedule_profile: spMap[e.id] || null,
    allowed_locations: alMap[e.id] || [],
  }))

  // Departments
  let deptQuery = supa.from("departments").select("id, name, company_id, company:companies(code)").order("name")
  if (companyId && companyId !== "all") deptQuery = deptQuery.eq("company_id", companyId)
  const { data: depts } = await deptQuery

  // All branches
  const { data: branches } = await supa.from("branches")
    .select("id, name").eq("is_active", true).order("name")

  // Positions
  let posQuery = supa.from("positions").select("id, name").order("name")
  if (companyId && companyId !== "all") posQuery = posQuery.eq("company_id", companyId)
  const { data: positions } = await posQuery

  // All employees across companies (for supervisor dropdown — some supervisors are in different companies)
  const { data: allEmps } = await supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, nickname, position:positions(name), company:companies(code)")
    .eq("is_active", true)
    .order("first_name_th")

  return NextResponse.json({
    employees: enriched,
    departments: depts ?? [],
    branches: branches ?? [],
    positions: positions ?? [],
    allEmployees: (allEmps ?? []).map((e: any) => ({
      id: e.id, code: e.employee_code,
      name: `${e.first_name_th} ${e.last_name_th}`,
      nickname: e.nickname,
      position: e.position?.name,
      company: e.company?.code,
    })),
  })
}

// PATCH — แก้ไขข้อมูลพนักงาน
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await req.json()
  const { action } = body

  // ── ดึงข้อมูล actor สำหรับ audit log ──
  const { data: actorData } = await supa.from("users")
    .select("role, employee_id, employee:employees(first_name_th, last_name_th, company_id)")
    .eq("id", user.id).single()
  const actorEmp = actorData?.employee as any
  const actorId = actorData?.employee_id || user.id
  const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"

  // ── Update employee fields ──
  if (action === "update_employee" || !action) {
    const { employee_id, updates } = body
    if (!employee_id) return NextResponse.json({ error: "Missing employee_id" }, { status: 400 })

    const allowed = ["department_id", "position_id", "branch_id", "nickname", "email", "phone", "supervisor_id", "employment_status"]
    const payload: Record<string, any> = {}
    for (const [k, v] of Object.entries(updates || {})) {
      if (allowed.includes(k)) payload[k] = v
    }

    const { error } = await supa.from("employees").update(payload).eq("id", employee_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If supervisor changed, update employee_manager_history too
    if (payload.supervisor_id !== undefined) {
      // ดึงข้อมูลหัวหน้าเก่า
      const { data: oldHistory } = await supa.from("employee_manager_history")
        .select("manager_id, manager:employees!manager_id(first_name_th, last_name_th)")
        .eq("employee_id", employee_id)
        .is("effective_to", null)
        .maybeSingle()
      const oldManager = oldHistory?.manager as any
      const oldManagerName = oldManager ? `${oldManager.first_name_th} ${oldManager.last_name_th}` : "ไม่มี"

      // Close old records
      await supa.from("employee_manager_history")
        .update({ effective_to: new Date().toISOString().split("T")[0] })
        .eq("employee_id", employee_id)
        .is("effective_to", null)

      // Insert new if not null
      if (payload.supervisor_id) {
        await supa.from("employee_manager_history").insert({
          employee_id,
          manager_id: payload.supervisor_id,
          effective_from: new Date().toISOString().split("T")[0],
        })
      }

      // ดึงชื่อหัวหน้าใหม่ + ชื่อพนักงาน สำหรับ audit log
      const { data: newManager } = payload.supervisor_id
        ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", payload.supervisor_id).single()
        : { data: null }
      const newManagerName = newManager ? `${newManager.first_name_th} ${newManager.last_name_th}` : "ไม่มี"
      const { data: empData } = await supa.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
      const empName = empData ? `${empData.first_name_th} ${empData.last_name_th}` : employee_id

      logEmployeeChange(supa, {
        actorId, actorName, action: "update_supervisor",
        employeeId: employee_id, employeeName: empName, companyId: actorEmp?.company_id,
        changes: { supervisor: { old: oldManagerName, new: newManagerName } },
      })
    } else {
      // Audit log สำหรับการแก้ไขอื่นๆ
      const { data: empData } = await supa.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
      const empName = empData ? `${empData.first_name_th} ${empData.last_name_th}` : employee_id

      logEmployeeChange(supa, {
        actorId, actorName, action: "update",
        employeeId: employee_id, employeeName: empName, companyId: actorEmp?.company_id,
        changes: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, { old: null, new: v }])),
      })
    }

    return NextResponse.json({ success: true })
  }

  // ── Add allowed location ──
  if (action === "add_location") {
    const { employee_id, branch_id } = body
    if (!employee_id || !branch_id) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    // Check if already exists
    const { data: existing } = await supa.from("employee_allowed_locations")
      .select("employee_id").eq("employee_id", employee_id).eq("branch_id", branch_id).maybeSingle()
    if (existing) return NextResponse.json({ success: true, message: "Already exists" })

    const { error } = await supa.from("employee_allowed_locations")
      .insert({ employee_id, branch_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    logAudit(supa, {
      actorId, actorName, action: "add_allowed_location", entityType: "employee", entityId: employee_id,
      description: `เพิ่มสถานที่เช็คอินให้พนักงาน (branch: ${branch_id})`,
      companyId: actorEmp?.company_id,
    })
    return NextResponse.json({ success: true })
  }

  // ── Remove allowed location ──
  if (action === "remove_location") {
    const { employee_id, branch_id } = body
    if (!employee_id || !branch_id) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    const { error } = await supa.from("employee_allowed_locations")
      .delete().eq("employee_id", employee_id).eq("branch_id", branch_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    logAudit(supa, {
      actorId, actorName, action: "remove_allowed_location", entityType: "employee", entityId: employee_id,
      description: `ลบสถานที่เช็คอินของพนักงาน (branch: ${branch_id})`,
      companyId: actorEmp?.company_id,
    })
    return NextResponse.json({ success: true })
  }

  // ── Create new position ──
  if (action === "create_position") {
    const { name, company_id } = body
    if (!name) return NextResponse.json({ error: "Missing position name" }, { status: 400 })

    // Check if already exists
    const { data: existing } = await supa.from("positions")
      .select("id").eq("name", name).eq("company_id", company_id).maybeSingle()
    if (existing) return NextResponse.json({ position_id: existing.id, message: "Already exists" })

    const code = name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20) + "_" + Date.now().toString(36).slice(-4)
    const { data: created, error } = await supa.from("positions")
      .insert({ name, code, company_id }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    logAudit(supa, {
      actorId, actorName, action: "create_position", entityType: "position", entityId: created.id,
      description: `สร้างตำแหน่งใหม่: ${name}`,
      companyId: company_id,
    })
    return NextResponse.json({ position_id: created.id, success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
