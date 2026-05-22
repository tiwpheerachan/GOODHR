import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getLateThreshold } from "@/lib/utils/payroll"

// ป้องกัน Next.js cache → ดึงค่าใหม่จาก DB เสมอ
export const dynamic = "force-dynamic"
export const revalidate = 0

// ── Helper: สร้างวันทั้งเดือน (timezone-safe — สร้างสตริงตรงๆ ไม่ผ่าน Date.toISOString) ──
function getDaysInMonth(year: number, month: number): string[] {
  // หาจำนวนวันในเดือน (เดือน 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้)
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, "0")
  const days: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${mm}-${String(d).padStart(2, "0")}`)
  }
  return days
}

const DAY_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

// ── Helper: Recalculate late_minutes ของ attendance หลังกะเปลี่ยน ────────────
// เรียกจาก POST action="assign" — recompute เฉพาะ records ของ (employee_id, work_date) ที่กะถูกอัปเดต
async function recalcLateForChangedShifts(supa: any, assignments: any[]) {
  if (!assignments?.length) return
  const empIds = Array.from(new Set(assignments.map(a => a.employee_id)))
  const dates = Array.from(new Set(assignments.map(a => a.work_date)))

  // ดึง attendance ที่อาจกระทบ
  const { data: atts } = await supa.from("attendance_records")
    .select("id, employee_id, work_date, clock_in, clock_out, status")
    .in("employee_id", empIds)
    .in("work_date", dates)
    .not("clock_in", "is", null)
  if (!atts?.length) return

  // ดึง employee + dept + company (สำหรับ grace)
  const { data: emps } = await supa.from("employees")
    .select("id, is_attendance_exempt, department:departments(name), company:companies(code)")
    .in("id", empIds)
  const empMap = new Map((emps ?? []).map((e: any) => [e.id, e]))

  // ดึง shift_templates ของ assignments
  const shiftIds = Array.from(new Set(assignments.map((a: any) => a.shift_id).filter(Boolean)))
  const { data: shifts } = shiftIds.length
    ? await supa.from("shift_templates").select("id, work_start, work_end, is_overnight").in("id", shiftIds)
    : { data: [] }
  const shiftMap = new Map((shifts ?? []).map((s: any) => [s.id, s]))

  // Build assignment map: employee|date -> shift_id
  const assignMap = new Map<string, string | null>()
  for (const a of assignments) assignMap.set(`${a.employee_id}|${a.work_date}`, a.shift_id)

  // Recalculate each
  for (const r of atts) {
    const emp: any = empMap.get(r.employee_id)
    if (!emp) continue
    if (emp.is_attendance_exempt) {
      await supa.from("attendance_records").update({
        late_minutes: 0, early_out_minutes: 0,
        status: ["leave","absent"].includes(r.status) ? r.status : "present",
        updated_at: new Date().toISOString(),
      }).eq("id", r.id)
      continue
    }

    const shiftId = assignMap.get(`${r.employee_id}|${r.work_date}`)
    const shift: any = shiftId ? shiftMap.get(shiftId) : null
    const clockIn = new Date(r.clock_in)
    const clockOut = r.clock_out ? new Date(r.clock_out) : null

    let newLate = 0, newEarly = 0

    if (shift?.work_start) {
      // ── Auto-detect overnight: ถ้า work_end < work_start หรือ flag is_overnight ──
      const isOvernight = !!shift.is_overnight ||
        (!!shift.work_end && !!shift.work_start && String(shift.work_end) < String(shift.work_start))

      let expStart = new Date(`${r.work_date}T${shift.work_start}+07:00`)
      let expEnd = shift.work_end ? new Date(`${r.work_date}T${shift.work_end}+07:00`) : null
      if (expEnd && isOvernight) expEnd = new Date(expEnd.getTime() + 86_400_000)

      let raw = Math.floor((clockIn.getTime() - expStart.getTime()) / 60_000)
      // Overnight fix: ถ้า raw > 12 ชม. + overnight → ลอง expected = next day
      if (raw > 12 * 60 && isOvernight) {
        const nextDay = new Date(expStart.getTime() + 86_400_000)
        const diffNext = Math.floor((clockIn.getTime() - nextDay.getTime()) / 60_000)
        if (Math.abs(diffNext) < Math.abs(raw)) {
          expStart = nextDay
          if (expEnd) expEnd = new Date(expEnd.getTime() + 86_400_000)
          raw = diffNext
        }
      }

      const grace = getLateThreshold(emp.department?.name, emp.company?.code)
      newLate = Math.max(0, raw - grace)
      if (clockOut && expEnd) {
        // ── Universal: ถ้า clock_out < clock_in → ข้ามวัน → +24h
        //    ครอบคลุมทั้ง: กะปกติแต่ค้างกะข้ามคืน, กะข้ามวัน, เก็บผิดวัน ──
        let cOutMs = clockOut.getTime()
        if (cOutMs < clockIn.getTime()) cOutMs += 86_400_000
        // เพิ่ม snap ±24h สำหรับ overnight เผื่อกรณี edge อื่นๆ
        if (isOvernight) {
          const candidates = [cOutMs, cOutMs + 86_400_000, cOutMs - 86_400_000]
          cOutMs = candidates.reduce((best, t) =>
            Math.abs(expEnd!.getTime() - t) < Math.abs(expEnd!.getTime() - best) ? t : best, cOutMs)
        }
        const earlyDiff = Math.floor((expEnd.getTime() - cOutMs) / 60_000)
        newEarly = Math.max(0, earlyDiff)
      }
    }

    let newStatus = r.status
    if (!["leave","absent"].includes(r.status)) {
      newStatus = newLate > 0 ? "late" : (newEarly > 0 ? "early_out" : "present")
    }

    await supa.from("attendance_records").update({
      late_minutes: newLate,
      early_out_minutes: newEarly,
      status: newStatus,
      expected_start: shift?.work_start ? new Date(`${r.work_date}T${shift.work_start}+07:00`).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", r.id)
  }
}

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

  // ── ดึงรายชื่อพนักงานที่จะแสดง ───────────────────────────────────
  // - SA / HR Admin: ทั้งบริษัท (เลือกได้)
  // - Manager: ลูกน้องตรงจาก employee_manager_history + ตัวหัวหน้าเอง (ข้ามบริษัทได้)
  let subEmployeeIds: string[] | null = null
  if (!isSA) {
    if (!userData?.employee_id) return NextResponse.json({ success: true, days, shifts: [], grid: [], departments: [], total_employees: 0 })
    const { data: subRows } = await supa
      .from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", userData.employee_id)
      .is("effective_to", null)
    const subSet = new Set((subRows ?? []).map((r: any) => r.employee_id).filter(Boolean))
    subSet.add(userData.employee_id) // หัวหน้าจัดกะให้ตัวเองได้ + เห็นตัวเองในตาราง
    subEmployeeIds = Array.from(subSet)
  }

  // ── ดึงพนักงาน + profile ────────────────────────────────────────
  let empQuery = supa
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, department_id, company_id, can_self_schedule, department:departments(name), schedule_profile:employee_schedule_profiles(*)")
    .eq("is_active", true)
    .order("employee_code", { ascending: true })

  if (subEmployeeIds) empQuery = empQuery.in("id", subEmployeeIds)
  else                empQuery = empQuery.eq("company_id", companyId)

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

  // ── ดึง assignments (batch เพื่อเลี่ยง Supabase default 1000-row limit) ──
  let assignments: any[] = []
  if (empIds.length > 0) {
    const BATCH = 30 // 30 employees × 31 days = ~930 rows per batch (< 1000 limit)
    for (let i = 0; i < empIds.length; i += BATCH) {
      const batch = empIds.slice(i, i + BATCH)
      const { data, error } = await supa
        .from("monthly_shift_assignments")
        .select("*, shift:shift_templates(id, name, shift_type, work_start, work_end)")
        .in("employee_id", batch)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .limit(1500)

      if (error) return NextResponse.json({ success: false, error: error.message })
      assignments.push(...(data ?? []))
    }
  }

  // ── ดึง shift_templates (for reference) ──────────────────────
  // Manager: ดึง templates ของทุกบริษัทที่ลูกน้องอยู่ (รองรับ cross-company)
  // SA: ดึงเฉพาะบริษัทที่กำลังดู
  const tplCompanyIds = subEmployeeIds
    ? Array.from(new Set(filteredEmps.map((e: any) => e.company_id).filter(Boolean)))
    : [companyId]
  const { data: shifts } = tplCompanyIds.length > 0
    ? await supa.from("shift_templates").select("*").in("company_id", tplCompanyIds).order("work_start")
    : { data: [] as any[] }

  // ── ดึง pending shift_change_requests ──────────────────────
  let pendingRequests: any[] = []
  if (empIds.length > 0) {
    const { data: pReqs } = await supa
      .from("shift_change_requests")
      .select(`employee_id, work_date, requested_shift_id, requested_assignment_type, current_shift_id, current_assignment_type, reason, status, id,
        current_shift:shift_templates!shift_change_requests_current_shift_id_fkey(id, name, work_start, work_end),
        requested_shift:shift_templates!shift_change_requests_requested_shift_id_fkey(id, name, work_start, work_end)`)
      .in("employee_id", empIds)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .eq("status", "pending")
    pendingRequests = pReqs ?? []
  }

  // Map pending by employee+date
  const pendingMap: Record<string, any> = {}
  for (const p of pendingRequests) {
    pendingMap[`${p.employee_id}_${p.work_date}`] = p
  }

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
        first_name_en: emp.first_name_en,
        last_name_en: emp.last_name_en,
        nickname: emp.nickname,
        nickname_en: emp.nickname_en,
        department: emp.department?.name,
        can_self_schedule: emp.can_self_schedule ?? false,
      },
      profile: profile ?? null,
      days: days.map(date => {
        const a = assignmentMap[emp.id]?.[date] ?? null
        const pending = pendingMap[`${emp.id}_${date}`] ?? null
        return {
          date,
          assignment: a,
          pending_request: pending,
        }
      }),
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
  // (default: เติมเฉพาะวันที่ยังไม่มีกะ; ส่ง force=true ถึงจะทับของเดิม)
  // ═══════════════════════════════════════════════════════════════
  if (action === "generate") {
    const { month, target_company_ids, employee_id: genEmployeeId, force } = body // e.g. "2026-03"
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
    let totalSkipped = 0

    for (const coId of targetCompanies) {
      // ดึง fixed profiles + default shift
      let fixedQuery = supa
        .from("employee_schedule_profiles")
        .select("*, default_shift:shift_templates(id)")
        .eq("company_id", coId)
        .eq("schedule_type", "fixed")
      if (genEmployeeId) fixedQuery = fixedQuery.eq("employee_id", genEmployeeId)

      const { data: profiles } = await fixedQuery

      // ดึง variable profiles ที่มี default_shift ด้วย (ถ้ามี)
      let varQuery = supa
        .from("employee_schedule_profiles")
        .select("*, default_shift:shift_templates(id)")
        .eq("company_id", coId)
        .eq("schedule_type", "variable")
      if (genEmployeeId) varQuery = varQuery.eq("employee_id", genEmployeeId)

      const { data: varProfiles } = await varQuery

      const allProfiles = [...(profiles || []), ...(varProfiles || [])]
      if (!allProfiles.length) continue

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
        // ── ดึง existing เพื่อกัน overwrite holiday/leave เสมอ ────────
        //   - !force → ข้ามทุกวันที่มี assignment อยู่แล้ว (พฤติกรรมเดิม)
        //   - force  → ทับ work/dayoff แต่ "ห้าม" ทับ holiday/leave
        const empIdsForGen = Array.from(new Set(rows.map((r: any) => r.employee_id)))
        const { data: existing } = await supa
          .from("monthly_shift_assignments")
          .select("employee_id, work_date, assignment_type")
          .in("employee_id", empIdsForGen)
          .gte("work_date", days[0])
          .lte("work_date", days[days.length - 1])

        let toWrite = rows
        if (!force) {
          const existingSet = new Set((existing ?? []).map((e: any) => `${e.employee_id}|${e.work_date}`))
          toWrite = rows.filter((r: any) => !existingSet.has(`${r.employee_id}|${r.work_date}`))
          totalSkipped += rows.length - toWrite.length
        } else {
          // force=true → ทับได้ทุกอย่าง ยกเว้น holiday/leave (กันลบวันหยุด/วันลา)
          const protectedSet = new Set(
            (existing ?? [])
              .filter((e: any) => e.assignment_type === "holiday" || e.assignment_type === "leave")
              .map((e: any) => `${e.employee_id}|${e.work_date}`)
          )
          toWrite = rows.filter((r: any) => !protectedSet.has(`${r.employee_id}|${r.work_date}`))
          totalSkipped += rows.length - toWrite.length
        }

        for (let i = 0; i < toWrite.length; i += 500) {
          const chunk = toWrite.slice(i, i + 500)
          const { error } = await supa
            .from("monthly_shift_assignments")
            .upsert(chunk, { onConflict: "employee_id,work_date" })
          if (error) return NextResponse.json({ success: false, error: error.message })
        }
        totalGenerated += toWrite.length
      }
    }

    return NextResponse.json({
      success: true,
      generated: totalGenerated,
      skipped: totalSkipped,
      companies: targetCompanies.length,
      force: !!force,
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

    const empIdSet = Array.from(new Set(assignments.map(a => a.employee_id)))

    // Manager: scope ให้แก้ได้เฉพาะลูกน้องตัวเอง + ตัวเอง
    if (!isSA) {
      if (!userData?.employee_id) return NextResponse.json({ success: false, error: "No employee profile" })
      const { data: subRows } = await supa
        .from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", userData.employee_id)
        .is("effective_to", null)
      const allowed = new Set((subRows ?? []).map((r: any) => r.employee_id))
      allowed.add(userData.employee_id) // หัวหน้าจัดกะให้ตัวเองได้
      const blocked = empIdSet.filter(id => !allowed.has(id))
      if (blocked.length > 0) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์จัดกะให้พนักงานนอกทีม" }, { status: 403 })
    }

    // ดึง company_id จริงของพนักงานแต่ละคน (รองรับ cross-company subordinate)
    const { data: empCos } = await supa.from("employees").select("id, company_id").in("id", empIdSet)
    const empCoMap = new Map<string, string>((empCos ?? []).map((e: any) => [e.id, e.company_id]))

    const rows = assignments.map(a => ({
      employee_id: a.employee_id,
      company_id: empCoMap.get(a.employee_id) ?? companyId,
      work_date: a.work_date,
      shift_id: a.shift_id,
      assignment_type: a.assignment_type,
      leave_type: a.leave_type ?? null,
      note: a.note ?? null,
      assigned_by: user.id,
      submitted_by: null,
      has_pending_change: false,
    }))

    // Batch upsert
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supa
        .from("monthly_shift_assignments")
        .upsert(chunk, { onConflict: "employee_id,work_date" })
      if (error) return NextResponse.json({ success: false, error: error.message })
    }

    // ── Recalculate late_minutes สำหรับ attendance ที่กระทบ (กะเปลี่ยน) ──
    // อิงตามกะที่ assign ใหม่ ใช้ logic จาก /api/attendance/recalc-late
    await recalcLateForChangedShifts(supa, rows)

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

    // Manager: จำกัด scope เป็นลูกน้องตัวเอง + ตัวเอง (ข้ามบริษัทได้)
    let scopedEmployeeIds: string[] | null = employee_ids?.length ? employee_ids : null
    if (!isSA) {
      if (!userData?.employee_id) return NextResponse.json({ success: false, error: "No employee profile" })
      const { data: subRows } = await supa
        .from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", userData.employee_id)
        .is("effective_to", null)
      const subSet = new Set((subRows ?? []).map((r: any) => r.employee_id))
      subSet.add(userData.employee_id)
      const subIds = Array.from(subSet)
      scopedEmployeeIds = scopedEmployeeIds
        ? scopedEmployeeIds.filter((id: string) => subIds.includes(id))
        : subIds
    }

    // ดึง assignments จากเดือนก่อน
    let srcQuery = supa
      .from("monthly_shift_assignments")
      .select("*")
      .gte("work_date", fromDays[0])
      .lte("work_date", fromDays[fromDays.length - 1])

    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      srcQuery = srcQuery.in("employee_id", scopedEmployeeIds)
    } else if (isSA) {
      srcQuery = srcQuery.eq("company_id", companyId)
    }

    const { data: srcData, error: srcErr } = await srcQuery
    if (srcErr) return NextResponse.json({ success: false, error: srcErr.message })

    if (!srcData?.length) return NextResponse.json({ success: true, copied: 0 })

    // ดึง company_id จริงของพนักงานแต่ละคน (รองรับ cross-company)
    const srcEmpIds = Array.from(new Set(srcData.map((r: any) => r.employee_id)))
    const { data: empCos } = await supa.from("employees").select("id, company_id").in("id", srcEmpIds)
    const empCoMap = new Map<string, string>((empCos ?? []).map((e: any) => [e.id, e.company_id]))

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
          company_id: empCoMap.get(empId) ?? companyId,
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
