// Manager chain + additional evaluators helper
// ใช้ทั้ง /api/kpi และ /api/probation-evaluation
// จำกัด skip-level ที่ 1 ระดับ (direct + 1 ขึ้น) เพื่อไม่ให้ top-level เห็นทั้ง org

const SKIP_DEPTH = 1 // เปลี่ยนค่าเป็น 2+ ถ้าต้องการลึกขึ้น

export type ChainRelation = "direct" | "skip" | "additional" | "view_only"

export type ManageableEmployee = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  first_name_en?: string
  last_name_en?: string
  nickname?: string
  nickname_en?: string
  avatar_url?: string
  hire_date?: string
  employment_status?: string
  probation_end_date?: string
  company_id?: string
  position?: { name: string } | null
  department?: { name: string } | null
  /** ความสัมพันธ์กับ user ปัจจุบัน */
  relation: ChainRelation
  /** depth: 1=direct, 2=skip-1, ... */
  depth: number
  /** ข้อมูลหัวหน้าตรงของพนักงาน (ใช้แสดง badge "หัวหน้าตรง: B" ในแถบ skip) */
  direct_manager?: {
    id: string
    first_name_th: string
    last_name_th: string
    nickname?: string
  }
}

/**
 * คำนวณรายชื่อพนักงานที่ user สามารถดู/ประเมินได้
 * @param svc Supabase service client
 * @param managerId employee_id ของ user ปัจจุบัน
 * @param scope 'kpi' | 'probation' | null — ใช้ filter employee_evaluators
 */
export async function getManageableEmployees(
  svc: any,
  managerId: string,
  scope: "kpi" | "probation" | null = null,
): Promise<ManageableEmployee[]> {
  if (!managerId) return []

  // column ของผู้ประเมินกำหนดเอง ตาม scope (kpi/probation) — null = ไม่มี override
  const evaluatorCol = scope === "kpi" ? "kpi_evaluator_id" : scope === "probation" ? "probation_evaluator_id" : null

  // (1) Direct subs จาก employee_manager_history (active rows)
  const { data: directRows } = await svc
    .from("employee_manager_history")
    .select("employee_id")
    .eq("manager_id", managerId)
    .is("effective_to", null)
  let directIds: string[] = Array.from(
    new Set((directRows ?? []).map((r: any) => r.employee_id).filter(Boolean)),
  ) as string[]

  // (1b) scope ที่มีผู้ประเมินกำหนดเอง → กรองพนักงานที่กำหนดให้คนอื่นประเมินออก
  //      เพราะคนอื่นเป็นผู้ประเมินแทนหัวหน้าตรงแล้ว
  //      direct manager ยังจัดการเรื่องอื่นได้ แต่ไม่ต้องประเมิน scope นี้
  let overriddenIds = new Set<string>()
  if (evaluatorCol && directIds.length > 0) {
    try {
      const { data: ovRows } = await svc
        .from("employees")
        .select(`id, ${evaluatorCol}`)
        .in("id", directIds)
        .not(evaluatorCol, "is", null)
      for (const r of (ovRows ?? [])) {
        if (r[evaluatorCol] && r[evaluatorCol] !== managerId) {
          overriddenIds.add(r.id as string)
        }
      }
    } catch {
      // column ยังไม่มี → ข้าม
    }
    if (overriddenIds.size > 0) {
      directIds = directIds.filter((id: string) => !overriddenIds.has(id))
    }
  }

  // (1c) คนที่กำหนดให้ผู้ใช้นี้เป็นผู้ประเมิน (<col> = managerId) → ใส่เป็น direct (แทนหัวหน้าจริง)
  let designatedIds: string[] = []
  if (evaluatorCol) {
    try {
      const { data: kdRows } = await svc
        .from("employees")
        .select("id")
        .eq(evaluatorCol, managerId)
        .eq("is_active", true)
      designatedIds = Array.from(new Set((kdRows ?? []).map((r: any) => r.id).filter(Boolean)))
      // เพิ่มเข้า directIds ถ้ายังไม่อยู่
      for (const id of designatedIds) {
        if (!directIds.includes(id)) directIds.push(id)
      }
    } catch {
      // column ยังไม่มี → ข้าม
    }
  }

  // (2) Skip-1 subs — ลูกของลูก (กรอง direct ออก ป้องกันซ้ำ)
  let skipIds: string[] = []
  const skipMgrByEmp = new Map<string, string>() // employee_id -> direct_manager_id
  if (SKIP_DEPTH >= 1 && directIds.length > 0) {
    const { data: skipRows } = await svc
      .from("employee_manager_history")
      .select("employee_id, manager_id")
      .in("manager_id", directIds)
      .is("effective_to", null)
    for (const r of (skipRows ?? [])) {
      if (directIds.includes(r.employee_id)) continue // already in direct
      if (r.employee_id === managerId) continue       // can't manage self
      if (!skipMgrByEmp.has(r.employee_id)) {
        skipMgrByEmp.set(r.employee_id, r.manager_id)
      }
    }
    skipIds = Array.from(skipMgrByEmp.keys())
  }

  // (3) Additional evaluators (explicit assignment)
  const additionalByScope = new Map<string, ChainRelation>() // employee_id -> relation
  try {
    let q = svc
      .from("employee_evaluators")
      .select("employee_id, scope")
      .eq("evaluator_id", managerId)
    if (scope) {
      // match: 'kpi', 'probation', 'all', 'view_only'
      q = q.in("scope", [scope, "all", "view_only"])
    }
    const { data: addRows } = await q
    for (const r of (addRows ?? [])) {
      if (directIds.includes(r.employee_id)) continue
      if (skipIds.includes(r.employee_id)) continue
      const rel: ChainRelation = r.scope === "view_only" ? "view_only" : "additional"
      // priority: additional > view_only
      if (!additionalByScope.has(r.employee_id) || rel === "additional") {
        additionalByScope.set(r.employee_id, rel)
      }
    }
  } catch {
    // table ยังไม่มี — skip
  }

  // Collect all unique IDs
  const allIds = Array.from(new Set([...directIds, ...skipIds, ...Array.from(additionalByScope.keys())]))
  if (allIds.length === 0) return []

  // Fetch employee details
  const { data: emps } = await svc
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, hire_date, phase2_start_date, employment_status, probation_end_date, company_id, position:positions(name), department:departments(name)")
    .in("id", allIds)
    .eq("is_active", true)
    .is("deleted_at", null)
  const empMap = new Map((emps ?? []).map((e: any) => [e.id, e]))

  // Fetch direct managers for skip subs (for displaying "หัวหน้าตรง: B")
  const directMgrIds = Array.from(new Set(Array.from(skipMgrByEmp.values())))
  let mgrDetails = new Map<string, any>()
  if (directMgrIds.length > 0) {
    const { data: mgrs } = await svc
      .from("employees")
      .select("id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en")
      .in("id", directMgrIds)
    mgrDetails = new Map((mgrs ?? []).map((m: any) => [m.id, m]))
  }

  // Assemble
  const result: ManageableEmployee[] = []
  for (const rawId of allIds) {
    const id = rawId as string
    const e: any = empMap.get(id)
    if (!e) continue // inactive/deleted — skip

    let relation: ChainRelation
    let depth: number
    let directMgr = undefined

    if (directIds.includes(id)) {
      relation = "direct"
      depth = 1
    } else if (skipIds.includes(id)) {
      relation = "skip"
      depth = 2
      const dmId = skipMgrByEmp.get(id)!
      const dm: any = mgrDetails.get(dmId)
      if (dm) directMgr = { id: dm.id, first_name_th: dm.first_name_th, last_name_th: dm.last_name_th, first_name_en: dm.first_name_en, last_name_en: dm.last_name_en, nickname: dm.nickname, nickname_en: dm.nickname_en }
    } else {
      relation = additionalByScope.get(id) ?? "additional"
      depth = 0
    }

    result.push({ ...e, relation, depth, direct_manager: directMgr })
  }

  // Sort: direct first, then skip, then additional
  const order: Record<ChainRelation, number> = { direct: 0, skip: 1, additional: 2, view_only: 3 }
  result.sort((a, b) => {
    const ro = order[a.relation] - order[b.relation]
    if (ro !== 0) return ro
    return (a.employee_code || "").localeCompare(b.employee_code || "")
  })

  return result
}

/**
 * เช็คว่า user ปัจจุบันมีสิทธิ์ "ประเมิน" employee คนนี้หรือไม่
 * ใช้ตอน save/submit form
 */
export async function canEvaluate(
  svc: any,
  managerId: string,
  employeeId: string,
  scope: "kpi" | "probation",
): Promise<{ allowed: boolean; role: "direct_manager" | "skip_level" | "additional"; directManagerId?: string }> {
  if (!managerId || !employeeId) return { allowed: false, role: "direct_manager" }

  // column ของผู้ประเมินกำหนดเอง ตาม scope (kpi → kpi_evaluator_id, probation → probation_evaluator_id)
  const evaluatorCol = scope === "kpi" ? "kpi_evaluator_id" : "probation_evaluator_id"

  // ตรวจ designated evaluator ก่อนทุกอย่าง
  //   - ถ้า employees.<col> = managerId → อนุญาตทันที (role=direct_manager)
  //   - ถ้า <col> ชี้คนอื่น → ผู้ที่ไม่ใช่ designated ไม่อนุญาตแม้จะเป็น direct manager
  let designatedEvaluatorId: string | null = null
  try {
    const { data: empRow } = await svc
      .from("employees")
      .select(evaluatorCol)
      .eq("id", employeeId)
      .maybeSingle()
    designatedEvaluatorId = (empRow as any)?.[evaluatorCol] ?? null
  } catch {}
  if (designatedEvaluatorId && designatedEvaluatorId === managerId) {
    return { allowed: true, role: "direct_manager", directManagerId: managerId }
  }

  // Direct
  const { data: d } = await svc
    .from("employee_manager_history")
    .select("manager_id")
    .eq("employee_id", employeeId)
    .is("effective_to", null)
    .maybeSingle()
  // ถ้ามี designated evaluator คนอื่น → direct manager ไม่ควรประเมิน scope นี้
  if (designatedEvaluatorId && designatedEvaluatorId !== managerId) {
    // direct manager → skip — ปล่อยให้ตรวจ skip-level / additional ต่อ
  } else if (d?.manager_id === managerId) {
    return { allowed: true, role: "direct_manager", directManagerId: managerId }
  }

  // Skip-1: employee's direct manager has THIS user as their manager
  if (d?.manager_id) {
    const { data: skipCheck } = await svc
      .from("employee_manager_history")
      .select("manager_id")
      .eq("employee_id", d.manager_id)
      .is("effective_to", null)
      .maybeSingle()
    if (skipCheck?.manager_id === managerId) {
      return { allowed: true, role: "skip_level", directManagerId: d.manager_id }
    }
  }

  // Additional evaluator
  try {
    const { data: add } = await svc
      .from("employee_evaluators")
      .select("scope")
      .eq("employee_id", employeeId)
      .eq("evaluator_id", managerId)
      .in("scope", [scope, "all"])
      .limit(1)
      .maybeSingle()
    if (add) return { allowed: true, role: "additional", directManagerId: d?.manager_id }
  } catch {}

  return { allowed: false, role: "direct_manager" }
}
