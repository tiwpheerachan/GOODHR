import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ── Helper: สร้างวันทั้งเดือน ─────────────────────────────────────
function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    days.push(d.toISOString().split("T")[0])
    d.setDate(d.getDate() + 1)
  }
  return days
}

const DAY_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

// GET — ดึงตารางกะรายเดือน
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = new URL(request.url)
  const month = url.searchParams.get("month") // format: 2026-03
  const deptId = url.searchParams.get("dept_id")
  const scheduleType = url.searchParams.get("schedule_type") // fixed | variable | all
  const reqCompanyId = url.searchParams.get("company_id") // optional override for super_admin

  if (!month) return NextResponse.json({ success: false, error: "month required (YYYY-MM)" })

  const { data: userData } = await supa
    .from("users")
    .select("employee_id, role, employees(company_id)")
    .eq("id", user.id)
    .single()

  const isSA = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const userCompanyId = (userData?.employees as any)?.company_id
  // super_admin can view any company
  const companyId = (isSA && reqCompanyId) ? reqCompanyId : userCompanyId
  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  const [yearStr, monthStr] = month.split("-")
  const year = parseInt(yearStr)
  const mon = parseInt(monthStr)
  const startDate = `${month}-01`
  const days = getDaysInMonth(year, mon)
  const endDate = days[days.length - 1]

  // ── ดึงพนักงาน + profile ────────────────────────────────────────
  let empQuery = supa
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, department_id, department:departments(name), schedule_profile:employee_schedule_profiles(*)")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("employee_code", { ascending: true })

  if (deptId) empQuery = empQuery.eq("department_id", deptId)

  const { data: employees, error: empErr } = await empQuery

  if (empErr) return NextResponse.json({ success: false, error: empErr.message })

  // Filter by schedule type if specified
  let filteredEmps = employees ?? []
  if (scheduleType && scheduleType !== "all") {
    filteredEmps = filteredEmps.filter((e: any) => {
      const profile = Array.isArray(e.schedule_profile) ? e.schedule_profile[0] : e.schedule_profile
      return profile?.schedule_type === scheduleType
    })
  }

  const empIds = filteredEmps.map((e: any) => e.id)

  // ── ดึง assignments ────────────────────────────────────────────
  let assignments: any[] = []
  if (empIds.length > 0) {
    const { data, error } = await supa
      .from("monthly_shift_assignments")
      .select("*, shift:shift_templates(id, name, shift_type, work_start, work_end)")
      .in("employee_id", empIds)
      .gte("work_date", startDate)
      .lte("work_date", endDate)

    if (error) return NextResponse.json({ success: false, error: error.message })
    assignments = data ?? []
  }

  // ── ดึง shift_templates (for reference) ──────────────────────
  const { data: shifts } = await supa
    .from("shift_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("work_start")

  // ── จัดรูปแบบข้อมูลเป็น grid ─────────────────────────────────
  const assignmentMap: Record<string, Record<string, any>> = {}
  for (const a of assignments) {
    if (!assignmentMap[a.employee_id]) assignmentMap[a.employee_id] = {}
    assignmentMap[a.employee_id][a.work_date] = a
  }

  const grid = filteredEmps.map((emp: any) => {
    const profile = Array.isArray(emp.schedule_profile) ? emp.schedule_profile[0] : emp.schedule_profile
    return {
      employee: {
        id: emp.id,
        employee_code: emp.employee_code,
        first_name_th: emp.first_name_th,
        last_name_th: emp.last_name_th,
        department: emp.department?.name,
      },
      profile: profile ?? null,
      days: days.map(date => ({
        date,
        assignment: assignmentMap[emp.id]?.[date] ?? null,
      })),
    }
  })

  // Collect unique departments for filter
  const deptSet = new Map<string, string>()
  filteredEmps.forEach((e: any) => {
    if (e.department_id && e.department?.name) {
      deptSet.set(e.department_id, e.department.name)
    }
  })
  const departments = Array.from(deptSet.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    success: true,
    month,
    days,
    shifts,
    grid,
    departments,
    total_employees: filteredEmps.length,
  })
}

// POST — จัดกะ (batch assign)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await request.json()
  const { action } = body

  const { data: userData } = await supa
    .from("users")
    .select("id, role, employee_id, employees(company_id)")
    .eq("id", user.id)
    .single()

  const isSA = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const userCompanyId = (userData?.employees as any)?.company_id
  // Allow super_admin to specify company_id
  const companyId = (isSA && body.company_id) ? body.company_id : userCompanyId
  if (!companyId) return NextResponse.json({ success: false, error: "No company" })

  // ═══════════════════════════════════════════════════════════════
  // ACTION: generate — สร้างตาราง fixed อัตโนมัติ
  // ═══════════════════════════════════════════════════════════════
  if (action === "generate") {
    const { month, target_company_ids } = body // e.g. "2026-03"
    if (!month) return NextResponse.json({ success: false, error: "month required" })

    const [yearStr, monthStr] = month.split("-")
    const year = parseInt(yearStr)
    const mon = parseInt(monthStr)
    const days = getDaysInMonth(year, mon)

    // Determine which companies to generate for
    let targetCompanies: string[] = [companyId]
    if (isSA && target_company_ids?.length) {
      targetCompanies = target_company_ids
    }

    let totalGenerated = 0

    for (const coId of targetCompanies) {
      // ดึง fixed profiles + default shift
      const { data: profiles } = await supa
        .from("employee_schedule_profiles")
        .select("*, default_shift:shift_templates(id)")
        .eq("company_id", coId)
        .eq("schedule_type", "fixed")

      if (!profiles?.length) continue

      // ดึง variable profiles ที่มี default_shift ด้วย (ถ้ามี)
      const { data: varProfiles } = await supa
        .from("employee_schedule_profiles")
        .select("*, default_shift:shift_templates(id)")
        .eq("company_id", coId)
        .eq("schedule_type", "variable")

      const allProfiles = [...profiles, ...(varProfiles || [])]

      const rows: any[] = []
      for (const p of allProfiles) {
        const dayoffs = (p.fixed_dayoffs ?? []) as string[]
        const shiftId = (p.default_shift as any)?.id ?? null
        const isVariable = p.schedule_type === "variable"

        for (const date of days) {
          const dow = new Date(date).getDay()
          const dayName = Object.entries(DAY_MAP).find(([, v]) => v === dow)?.[0] ?? ""
          const isDayoff = dayoffs.includes(dayName)

          // Variable schedules with no dayoffs defined → only assign work with shift
          // but don't mark as dayoff (manager will adjust)
          if (isVariable && dayoffs.length === 0 && shiftId) {
            rows.push({
              employee_id: p.employee_id,
              company_id: coId,
              work_date: date,
              shift_id: shiftId,
              assignment_type: "work",
              assigned_by: null,
            })
          } else {
            rows.push({
              employee_id: p.employee_id,
              company_id: coId,
              work_date: date,
              shift_id: isDayoff ? null : shiftId,
              assignment_type: isDayoff ? "dayoff" : "work",
              assigned_by: null,
            })
          }
        }
      }

      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500)
          const { error } = await supa
            .from("monthly_shift_assignments")
            .upsert(chunk, { onConflict: "employee_id,work_date" })
          if (error) return NextResponse.json({ success: false, error: error.message })
        }
        totalGenerated += rows.length
      }
    }

    return NextResponse.json({
      success: true,
      generated: totalGenerated,
      companies: targetCompanies.length,
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION: assign — หัวหน้าจัดกะ (batch update)
  // ═══════════════════════════════════════════════════════════════
  if (action === "assign") {
    const { assignments } = body as {
      assignments: Array<{
        employee_id: string
        work_date: string
        shift_id: string | null
        assignment_type: "work" | "dayoff" | "leave" | "holiday"
        leave_type?: string
        note?: string
      }>
    }

    if (!assignments?.length) return NextResponse.json({ success: false, error: "No assignments" })

    const rows = assignments.map(a => ({
      employee_id: a.employee_id,
      company_id: companyId,
      work_date: a.work_date,
      shift_id: a.shift_id,
      assignment_type: a.assignment_type,
      leave_type: a.leave_type ?? null,
      note: a.note ?? null,
      assigned_by: user.id,
    }))

    // Batch upsert
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supa
        .from("monthly_shift_assignments")
        .upsert(chunk, { onConflict: "employee_id,work_date" })
      if (error) return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true, updated: rows.length })
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION: copy — คัดลอกจากเดือนก่อน
  // ═══════════════════════════════════════════════════════════════
  if (action === "copy") {
    const { from_month, to_month, employee_ids } = body
    if (!from_month || !to_month) return NextResponse.json({ success: false, error: "from_month and to_month required" })

    const [fy, fm] = from_month.split("-").map(Number)
    const [ty, tm] = to_month.split("-").map(Number)
    const fromDays = getDaysInMonth(fy, fm)
    const toDays = getDaysInMonth(ty, tm)

    // ดึง assignments จากเดือนก่อน
    let srcQuery = supa
      .from("monthly_shift_assignments")
      .select("*")
      .eq("company_id", companyId)
      .gte("work_date", fromDays[0])
      .lte("work_date", fromDays[fromDays.length - 1])

    if (employee_ids?.length) {
      srcQuery = srcQuery.in("employee_id", employee_ids)
    }

    const { data: srcData, error: srcErr } = await srcQuery
    if (srcErr) return NextResponse.json({ success: false, error: srcErr.message })

    if (!srcData?.length) return NextResponse.json({ success: true, copied: 0 })

    // Map by employee → day_of_month → assignment
    const empMap: Record<string, Record<number, any>> = {}
    for (const r of srcData) {
      const dayNum = new Date(r.work_date).getDate()
      if (!empMap[r.employee_id]) empMap[r.employee_id] = {}
      empMap[r.employee_id][dayNum] = r
    }

    const rows: any[] = []
    for (const [empId, dayMap] of Object.entries(empMap)) {
      for (const toDate of toDays) {
        const dayNum = new Date(toDate).getDate()
        const src = dayMap[dayNum]
        if (!src) continue

        rows.push({
          employee_id: empId,
          company_id: companyId,
          work_date: toDate,
          shift_id: src.shift_id,
          assignment_type: src.assignment_type,
          leave_type: src.leave_type,
          note: null,
          assigned_by: user.id,
        })
      }
    }

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supa
        .from("monthly_shift_assignments")
        .upsert(chunk, { onConflict: "employee_id,work_date" })
      if (error) return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true, copied: rows.length })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}
