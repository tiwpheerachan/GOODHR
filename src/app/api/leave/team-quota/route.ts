import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

const QUOTA_THRESHOLD = 0.7  // ต้องมีคนทำงาน ≥ 70% (สำหรับทีม ≥ 3 คน)
const SMALL_TEAM_SIZE = 3    // ทีม < 3 คน → ใช้ floor allowance
const SMALL_TEAM_LEAVE = 1   // ทีมเล็ก ลาได้ 1 คน

// คำนวณจำนวนคนลาได้สูงสุด (รองรับทีมเล็ก)
function calcMaxLeave(teamSize: number): number {
  if (teamSize <= 0) return 0
  if (teamSize < SMALL_TEAM_SIZE) return SMALL_TEAM_LEAVE
  return teamSize - Math.ceil(teamSize * QUOTA_THRESHOLD)
}

// ── ตรวจว่าเป็นลาพักร้อนหรือไม่ (เฉพาะประเภทนี้ที่บังคับ quota 70%) ──
function isVacationCode(code?: string | null): boolean {
  if (!code) return false
  const c = code.toLowerCase().trim()
  return c === "vacation" || c === "annual"
}

// ── ตรวจว่าเป็นทีมบัญชีหรือไม่ (case-insensitive match) ──
// ทีมบัญชี = pool ทุกบริษัทรวมเป็น 1 ทีม (เพราะคนน้อย)
function isAccountingDept(deptName?: string | null): boolean {
  if (!deptName) return false
  const lower = deptName.toLowerCase().trim()
  return lower.includes("บัญชี") || lower === "accounting" || lower.includes("account")
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(id, company_id, department_id, department:departments(name))")
    .eq("id", user.id).single()

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const body = await req.json()
  const { date, start_date, end_date, manager_id, company_id, department_id, leave_type_id, is_half_day } = body
  const myUnit = is_half_day ? 0.5 : 1.0   // ครึ่งวัน = 0.5 unit (ของผู้ขอ)

  // ── ตรวจประเภทลา: กฎ 70% บังคับเฉพาะลาพักร้อน (vacation/annual) ──
  //   ลาประเภทอื่น (ลาป่วย/ลากิจ/...) → ผ่านทุกเคส ไม่ติด quota ทีม
  //   Default = true (ปลอดภัยกว่า): กัน frontend เก่าไม่ส่ง leave_type_id หรือ id ที่ไม่พบในระบบ → ยังตรวจอยู่
  let isVacationRequest = true
  if (leave_type_id) {
    const { data: lt } = await supa.from("leave_types")
      .select("code").eq("id", leave_type_id).maybeSingle()
    // เฉพาะกรณีที่หาเจอแน่นอน → ใช้ค่าตาม code; ถ้าหาไม่เจอ → คง default = true (ตรวจไว้ก่อน)
    if (lt) isVacationRequest = isVacationCode(lt.code)
  }
  if (!isVacationRequest) {
    return NextResponse.json({
      team_size: 0, working: 0, on_leave: 0, pending_leave: 0,
      quota_pct: 100, quota_ok: true, is_blocked: false,
      is_accounting_pool: false, threshold_pct: QUOTA_THRESHOLD * 100,
      is_vacation_request: false,
      team_mode: "non_vacation",
      no_team_reason: "ลาประเภทนี้ไม่ติดโควต้าทีม (เฉพาะลาพักร้อน 70%)",
      members: [], per_day: [], worst_day: null,
    })
  }

  // รองรับ 3 รูปแบบ input:
  // 1. date (single day) — backward compat
  // 2. start_date + end_date — full range
  // 3. start_date only
  const startD = start_date || date
  const endD = end_date || start_date || date
  if (!startD) return NextResponse.json({ error: "date required" }, { status: 400 })

  const myEmp = (userData.employee as any)
  const myDeptName = myEmp?.department?.name ?? null
  const myCompanyId = myEmp?.company_id ?? null
  const myEmpId = myEmp?.id ?? userData.employee_id

  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"

  // ─────────────────────────────────────────────────
  // 1. หา TEAM members — ใช้ "หัวหน้างาน" เป็นหลัก
  // ─────────────────────────────────────────────────
  let teamEmployeeIds: string[] = []
  let isAccountingPool = false
  let teamMode: "manager" | "accounting" | "admin_view" | "self_no_team" = "manager"

  // ── กรณีพิเศษ: ทีมบัญชี → pool ทุกบริษัท (ตามที่ตกลง) ──
  let checkDeptName: string | null = myDeptName
  if (department_id) {
    const { data: dept } = await supa.from("departments")
      .select("name").eq("id", department_id).maybeSingle()
    checkDeptName = dept?.name ?? null
  }

  if (isAccountingDept(checkDeptName)) {
    // Accounting → pool ทุกพนักงานบัญชีจากทุกบริษัท (active)
    const { data: allDepts } = await supa.from("departments").select("id, name")
    const acctDeptIds = (allDepts ?? [])
      .filter((d: any) => isAccountingDept(d.name))
      .map((d: any) => d.id)
    if (acctDeptIds.length > 0) {
      const { data: emps } = await supa.from("employees")
        .select("id").in("department_id", acctDeptIds).eq("is_active", true)
      teamEmployeeIds = (emps ?? []).map((e: any) => e.id)
      isAccountingPool = true
      teamMode = "accounting"
    }
  } else if (isAdmin && manager_id) {
    // Admin viewing a specific manager's team
    const { data: teamRows } = await supa.from("employee_manager_history")
      .select("employee_id").eq("manager_id", manager_id).is("effective_to", null)
    let ids = (teamRows ?? []).map((r: any) => r.employee_id)
    ids.push(manager_id)  // include manager in own team
    teamEmployeeIds = Array.from(new Set(ids))
    teamMode = "admin_view"
  } else {
    // ── หา manager ของ requestor → หาเพื่อนร่วมงานใต้ manager เดียวกัน ──
    let myMgrId: string | null = null
    if (myEmpId) {
      const { data: myHist } = await supa.from("employee_manager_history")
        .select("manager_id")
        .eq("employee_id", myEmpId)
        .is("effective_to", null)
        .maybeSingle()
      myMgrId = myHist?.manager_id ?? null
    }

    if (myMgrId) {
      // เพื่อนร่วมงานใต้หัวหน้าเดียวกัน (รวมตัวเอง)
      const { data: peers } = await supa.from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", myMgrId)
        .is("effective_to", null)
      teamEmployeeIds = (peers ?? []).map((r: any) => r.employee_id)
      teamMode = "manager"
    } else {
      // ── ผู้ใช้เป็นหัวหน้าเอง → ทีมคือลูกน้องของตัวเอง ──
      const { data: subs } = await supa.from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", myEmpId)
        .is("effective_to", null)
      const subIds = (subs ?? []).map((r: any) => r.employee_id)
      if (subIds.length > 0) {
        teamEmployeeIds = [myEmpId, ...subIds]
        teamMode = "manager"
      } else {
        // ── ไม่มีหัวหน้า + ไม่มีลูกน้อง → ไม่มีทีมที่จะตรวจ → ผ่านเสมอ ──
        teamMode = "self_no_team"
      }
    }
  }

  // กรอง: เก็บเฉพาะ active employees
  if (teamEmployeeIds.length > 0) {
    const { data: activeEmps } = await supa.from("employees")
      .select("id").in("id", teamEmployeeIds).eq("is_active", true)
    teamEmployeeIds = (activeEmps ?? []).map((e: any) => e.id)
  }

  if (teamEmployeeIds.length === 0) {
    return NextResponse.json({
      team_size: 0, working: 0, on_leave: 0, pending_leave: 0,
      quota_pct: 100, quota_ok: true, is_blocked: false,
      is_accounting_pool: isAccountingPool, threshold_pct: QUOTA_THRESHOLD * 100,
      team_mode: teamMode,
      no_team_reason: teamMode === "self_no_team"
        ? "ไม่พบทีม (ไม่มีหัวหน้า + ไม่มีลูกน้อง) — ไม่ตรวจโควต้า"
        : null,
      members: [], per_day: [], worst_day: null,
    })
  }

  // ─────────────────────────────────────────────────
  // 2. ดึง approved + pending leaves ในช่วง start_date–end_date
  // ─────────────────────────────────────────────────
  // ── นับเฉพาะลาพักร้อน (vacation/annual) ใน counter ทีม ──
  //   ลาป่วย/ลากิจ/อื่นๆ ไม่นับ — เพราะกฎ 70% บังคับเฉพาะลาพักร้อน
  //   เพิ่ม is_half_day → ลาครึ่งวัน นับเป็น 0.5 unit (ไม่ใช่ 1 คนเต็ม)
  const LEAVE_SELECT = "employee_id, start_date, end_date, is_half_day, leave_type:leave_types(name, code, color_hex)"
  const { data: approvedLeavesRaw } = await supa.from("leave_requests")
    .select(LEAVE_SELECT)
    .in("employee_id", teamEmployeeIds)
    .eq("status", "approved")
    .lte("start_date", endD)
    .gte("end_date", startD)
    .is("deleted_at", null)

  const { data: pendingLeavesRaw } = await supa.from("leave_requests")
    .select(LEAVE_SELECT)
    .in("employee_id", teamEmployeeIds)
    .eq("status", "pending")
    .lte("start_date", endD)
    .gte("end_date", startD)
    .is("deleted_at", null)

  const approvedLeaves = (approvedLeavesRaw ?? []).filter((l: any) => isVacationCode((l.leave_type as any)?.code))
  const pendingLeaves  = (pendingLeavesRaw  ?? []).filter((l: any) => isVacationCode((l.leave_type as any)?.code))

  // ── Build dates list (loop from startD → endD inclusive) ──
  const dateList: string[] = []
  {
    const s = new Date(startD + "T00:00:00")
    const e = new Date(endD + "T00:00:00")
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().slice(0, 10))
    }
  }

  // ─────────────────────────────────────────────────
  // 3. คำนวณต่อวัน — หา worst day
  // ─────────────────────────────────────────────────
  const teamSize = teamEmployeeIds.length
  const maxLeaveAllowed = calcMaxLeave(teamSize)            // จำนวนคนลาได้สูงสุด (รองรับ floor allowance)
  const threshold = teamSize - maxLeaveAllowed              // จำนวนคนต้องทำงานขั้นต่ำ
  const isSmallTeam = teamSize < SMALL_TEAM_SIZE

  type DayStat = {
    date: string
    on_leave_now: number
    pending_now: number
    working_now: number
    working_pct: number
    after_my_request_working: number
    after_my_request_pct: number
    blocks_my_request: boolean  // ถ้า user นี้ลาด้วย จะตก threshold ไหม
  }
  const perDay: DayStat[] = dateList.map(d => {
    // ── ใครลาในวัน d? แต่ละคนนับเป็น 0.5 (half-day) หรือ 1.0 (full-day) ──
    //   ใช้ map: employee_id → max(unit ของวันนี้) — ป้องกัน case นานๆ ลาทับซ้อน
    const approvedUnitsByEmp = new Map<string, number>()
    for (const l of (approvedLeaves as any[])) {
      if (l.start_date <= d && l.end_date >= d) {
        const u = l.is_half_day ? 0.5 : 1.0
        approvedUnitsByEmp.set(l.employee_id, Math.max(approvedUnitsByEmp.get(l.employee_id) ?? 0, u))
      }
    }
    const pendingUnitsByEmp = new Map<string, number>()
    for (const l of (pendingLeaves as any[])) {
      if (l.start_date <= d && l.end_date >= d) {
        const u = l.is_half_day ? 0.5 : 1.0
        pendingUnitsByEmp.set(l.employee_id, Math.max(pendingUnitsByEmp.get(l.employee_id) ?? 0, u))
      }
    }
    // approved ทับ pending — ถ้าซ้ำใช้ approved
    const combinedUnits = new Map<string, number>(pendingUnitsByEmp)
    approvedUnitsByEmp.forEach((u, id) => combinedUnits.set(id, u))

    const onLeaveNow = Array.from(approvedUnitsByEmp.values()).reduce((s, u) => s + u, 0)
    const pendingNow = Array.from(pendingUnitsByEmp.values()).reduce((s, u) => s + u, 0)
    const totalUnitsOnLeave = Array.from(combinedUnits.values()).reduce((s, u) => s + u, 0)
    const workingNow = teamSize - totalUnitsOnLeave
    const workingPct = teamSize > 0 ? (workingNow / teamSize) * 100 : 100

    // ── ถ้า user นี้ลาด้วย (myUnit) → working ลดลงตาม unit ──
    //   ถ้าผู้ขอเคยมี request อยู่แล้ว → ใช้ค่าของเดิม + ส่วนที่เพิ่ม
    const myExistingUnit = combinedUnits.get(myEmpId) ?? 0
    const myNewUnit = Math.max(myExistingUnit, myUnit)   // upgrade ครึ่งวัน → เต็มวัน ถ้าจำเป็น
    const myAdditionalUnit = myNewUnit - myExistingUnit
    const afterWorking = workingNow - myAdditionalUnit
    const afterPct = teamSize > 0 ? (afterWorking / teamSize) * 100 : 100
    const totalUnitsAfter = totalUnitsOnLeave + myAdditionalUnit
    const blocks = totalUnitsAfter > maxLeaveAllowed

    return {
      date: d,
      on_leave_now: Math.round(onLeaveNow * 10) / 10,
      pending_now: Math.round(pendingNow * 10) / 10,
      working_now: Math.round(workingNow * 10) / 10,
      working_pct: Math.round(workingPct * 10) / 10,
      after_my_request_working: Math.round(afterWorking * 10) / 10,
      after_my_request_pct: Math.round(afterPct * 10) / 10,
      blocks_my_request: blocks,
    }
  })

  // Worst day = ที่ working_pct ต่ำสุด (หรือ blocks)
  const worstDay = [...perDay].sort((a, b) => a.after_my_request_pct - b.after_my_request_pct)[0] || null
  const isBlocked = perDay.some(d => d.blocks_my_request)

  // ─────────────────────────────────────────────────
  // 4. Member list — ใช้ worst day (หรือวันแรก) เป็นตัวแสดง
  // ─────────────────────────────────────────────────
  const displayDate = worstDay?.date || dateList[0]
  const approvedSet = new Set((approvedLeaves ?? [])
    .filter((l: any) => l.start_date <= displayDate && l.end_date >= displayDate)
    .map((l: any) => l.employee_id))
  const pendingSet = new Set((pendingLeaves ?? [])
    .filter((l: any) => l.start_date <= displayDate && l.end_date >= displayDate)
    .map((l: any) => l.employee_id))

  const { data: employees } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code, company:companies(code)")
    .in("id", teamEmployeeIds)

  const empMap: Record<string, any> = {}
  for (const e of (employees ?? [])) empMap[e.id] = e

  const members = teamEmployeeIds.map(id => {
    const emp = empMap[id]
    const name = emp ? (emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`) : "?"
    let status: "working" | "on_leave" | "pending_leave" = "working"
    let leaveType = null

    if (approvedSet.has(id)) {
      status = "on_leave"
      const lv = (approvedLeaves ?? []).find((l: any) => l.employee_id === id && l.start_date <= displayDate && l.end_date >= displayDate)
      leaveType = (lv?.leave_type as any)?.name || null
    } else if (pendingSet.has(id)) {
      status = "pending_leave"
      const lv = (pendingLeaves ?? []).find((l: any) => l.employee_id === id && l.start_date <= displayDate && l.end_date >= displayDate)
      leaveType = (lv?.leave_type as any)?.name || null
    }

    return {
      id, name,
      avatar_url: emp?.avatar_url || null,
      employee_code: emp?.employee_code,
      company_code: emp?.company?.code || null,  // โชว์บริษัทกรณีเป็นบัญชี pool
      status,
      leave_type: leaveType,
    }
  })

  // ─────────────────────────────────────────────────
  // 5. Top-level summary (backward compat กับ form เดิม)
  // ─────────────────────────────────────────────────
  return NextResponse.json({
    team_size: teamSize,
    working: worstDay?.working_now ?? teamSize,
    on_leave: worstDay?.on_leave_now ?? 0,
    pending_leave: worstDay?.pending_now ?? 0,
    quota_pct: Math.round(worstDay?.working_pct ?? 100),
    quota_ok: !isBlocked,
    is_blocked: isBlocked,
    is_accounting_pool: isAccountingPool,
    team_mode: teamMode,
    threshold_pct: QUOTA_THRESHOLD * 100,         // 70
    is_vacation_request: true,                    // ลาพักร้อน — ตรวจ quota
    is_small_team: isSmallTeam,                   // ทีม < 3 → floor allowance
    max_leave_allowed: maxLeaveAllowed,           // จำนวนคนลาได้ (รองรับทีมเล็ก)
    min_working: threshold,                        // จำนวนคนทำงานขั้นต่ำ
    members,
    per_day: perDay,
    worst_day: worstDay,
  })
}
