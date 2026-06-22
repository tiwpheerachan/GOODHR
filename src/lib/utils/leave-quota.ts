// ════════════════════════════════════════════════════════════════════
// Server-side leave quota check — re-verify ก่อน approve
//   ใช้กฎเดียวกับ /api/leave/team-quota ป้องกัน race condition
//   (frontend block แล้ว — แต่ 2 requests pending พร้อมกันอาจหลุดได้)
//
// Rule: ตรวจเฉพาะลาพักร้อน (vacation/annual) — ลาประเภทอื่นไม่ติด quota
// Rule: ทีมต้องมีคนทำงาน ≥ 70% (ทีม < 3 → ลาได้ 1 คน)
// Half-day = 0.5 unit
// ════════════════════════════════════════════════════════════════════

const QUOTA_THRESHOLD = 0.7
const SMALL_TEAM_SIZE = 3
const SMALL_TEAM_LEAVE = 1

export function isVacationLeaveCode(code?: string | null): boolean {
  if (!code) return false
  const c = code.toLowerCase().trim()
  return c === "vacation" || c === "annual"
}

export function isAccountingDept(deptName?: string | null): boolean {
  if (!deptName) return false
  const lower = deptName.toLowerCase().trim()
  return lower.includes("บัญชี") || lower === "accounting" || lower.includes("account")
}

function calcMaxLeave(teamSize: number): number {
  if (teamSize <= 0) return 0
  if (teamSize < SMALL_TEAM_SIZE) return SMALL_TEAM_LEAVE
  return teamSize - Math.ceil(teamSize * QUOTA_THRESHOLD)
}

/**
 * checkApprovalQuota — ตรวจว่า leave_request นี้ approve ได้ไหม (server-side enforce)
 *
 *   เรียกใน /api/admin/approvals POST action="approve" ก่อน update status
 *   ป้องกัน race: 2 pending requests ลาพักร้อน → ทั้งคู่ผ่าน frontend → HR approve ทั้งคู่ → เกินโควต้า
 *
 * @returns { allowed: true } ถ้าผ่าน
 *          { allowed: false, reason: "...", worst_date, max_allowed, current_on_leave } ถ้าไม่ผ่าน
 */
export async function checkApprovalQuota(
  supa: any,
  leaveRequestId: string,
): Promise<{ allowed: boolean; reason?: string; worst_date?: string; max_allowed?: number; current_on_leave?: number }> {
  // 1. ดึง leave request + leave_type code
  const { data: lr } = await supa.from("leave_requests")
    .select("id, employee_id, start_date, end_date, is_half_day, status, leave_type:leave_types(code)")
    .eq("id", leaveRequestId).maybeSingle()
  if (!lr) return { allowed: true } // ไม่พบ → ไม่ใช่หน้าที่นี่ guard

  const code = (lr.leave_type as any)?.code as string | undefined
  if (!isVacationLeaveCode(code)) {
    // ไม่ใช่ลาพักร้อน → ไม่ติด quota
    return { allowed: true }
  }

  // 2. หาทีมของ employee — peers ใต้หัวหน้าเดียวกัน (ถ้ามี) / ถ้าเป็นหัวหน้าเอง → ลูกน้องตัวเอง + ตัวเอง
  //    (ทำเหมือนใน team-quota route)
  const empId = lr.employee_id

  // ── ตรวจว่าแผนกเป็น accounting หรือไม่ ──
  const { data: emp } = await supa.from("employees")
    .select("id, department:departments(name)")
    .eq("id", empId).maybeSingle()
  const deptName = (emp?.department as any)?.name as string | undefined

  let teamEmployeeIds: string[] = []

  if (isAccountingDept(deptName)) {
    // Accounting pool ทุกบริษัท
    const { data: allDepts } = await supa.from("departments").select("id, name")
    const acctDeptIds = (allDepts ?? [])
      .filter((d: any) => isAccountingDept(d.name))
      .map((d: any) => d.id)
    if (acctDeptIds.length > 0) {
      const { data: emps } = await supa.from("employees")
        .select("id").in("department_id", acctDeptIds).eq("is_active", true)
      teamEmployeeIds = (emps ?? []).map((e: any) => e.id)
    }
  } else {
    // หา manager ของ employee นี้
    const { data: myHist } = await supa.from("employee_manager_history")
      .select("manager_id")
      .eq("employee_id", empId)
      .is("effective_to", null)
      .maybeSingle()
    const myMgrId = myHist?.manager_id as string | undefined

    if (myMgrId) {
      // peers ใต้ manager เดียวกัน
      const { data: peers } = await supa.from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", myMgrId)
        .is("effective_to", null)
      teamEmployeeIds = (peers ?? []).map((r: any) => r.employee_id)
    } else {
      // ถ้าเป็นหัวหน้าเอง → ลูกน้อง + ตัวเอง
      const { data: subs } = await supa.from("employee_manager_history")
        .select("employee_id")
        .eq("manager_id", empId)
        .is("effective_to", null)
      const subIds = (subs ?? []).map((r: any) => r.employee_id)
      if (subIds.length > 0) {
        teamEmployeeIds = [empId, ...subIds]
      }
    }
  }

  // กรอง active เท่านั้น
  if (teamEmployeeIds.length > 0) {
    const { data: activeEmps } = await supa.from("employees")
      .select("id").in("id", teamEmployeeIds).eq("is_active", true)
    teamEmployeeIds = (activeEmps ?? []).map((e: any) => e.id)
  }

  if (teamEmployeeIds.length === 0) {
    // ไม่มีทีม → ไม่ติด quota
    return { allowed: true }
  }

  const teamSize = teamEmployeeIds.length
  const maxLeaveAllowed = calcMaxLeave(teamSize)

  // 3. ดึง vacation leaves (approved + pending) ในช่วงนี้ — ยกเว้น request ที่กำลังจะ approve
  const { data: vacationLeavesRaw } = await supa.from("leave_requests")
    .select("id, employee_id, start_date, end_date, is_half_day, status, leave_type:leave_types(code)")
    .in("employee_id", teamEmployeeIds)
    .in("status", ["approved", "pending"])
    .lte("start_date", lr.end_date)
    .gte("end_date", lr.start_date)
    .is("deleted_at", null)

  const vacationLeaves = (vacationLeavesRaw ?? []).filter((l: any) =>
    isVacationLeaveCode((l.leave_type as any)?.code) && l.id !== leaveRequestId
  )

  // 4. Loop แต่ละวันในช่วง start→end → คำนวณ units
  const dateList: string[] = []
  {
    const s = new Date(lr.start_date + "T00:00:00")
    const e = new Date(lr.end_date + "T00:00:00")
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().slice(0, 10))
    }
  }

  const requesterUnit = lr.is_half_day ? 0.5 : 1.0

  for (const day of dateList) {
    // หาว่าวันนี้มีใครลาแบบ vacation อยู่บ้าง (รวม approved + pending คนอื่น)
    const unitsByEmp = new Map<string, number>()
    for (const v of vacationLeaves) {
      if (v.start_date <= day && v.end_date >= day) {
        const u = v.is_half_day ? 0.5 : 1.0
        unitsByEmp.set(v.employee_id, Math.max(unitsByEmp.get(v.employee_id) ?? 0, u))
      }
    }
    const currentUnits = Array.from(unitsByEmp.values()).reduce((s, u) => s + u, 0)
    const afterApprove = currentUnits + requesterUnit
    if (afterApprove > maxLeaveAllowed) {
      return {
        allowed: false,
        reason: `วันที่ ${day} ทีมจะมีคนลา ${afterApprove} คน (สูงสุดได้ ${maxLeaveAllowed} คน · ทีม ${teamSize} คน · ต้องมีคนทำงาน ≥ 70%)`,
        worst_date: day,
        max_allowed: maxLeaveAllowed,
        current_on_leave: currentUnits,
      }
    }
  }

  return { allowed: true }
}
