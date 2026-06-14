import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// GET /api/employees/evaluation-chain?employee_id=...
// คืนข้อมูล "ใครประเมินคนนี้ได้บ้าง" + "คนนี้เป็นหัวหน้าใครบ้าง"
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const empId = req.nextUrl.searchParams.get("employee_id")
  if (!empId) return NextResponse.json({ error: "employee_id required" }, { status: 400 })

  const svc = createServiceClient()

  // ── (A) ใครประเมินคนนี้ได้บ้าง — UP the chain ──────────────────────────
  // 1) direct manager (lookup history)
  const { data: directRow } = await svc
    .from("employee_manager_history")
    .select("manager_id, effective_from")
    .eq("employee_id", empId)
    .is("effective_to", null)
    .maybeSingle()

  let directManager: any = null
  let skipLevel1: any = null
  if (directRow?.manager_id) {
    const { data: dm } = await svc.from("employees")
      .select("id, employee_code, first_name_th, last_name_th, nickname, avatar_url, position:positions(name)")
      .eq("id", directRow.manager_id).maybeSingle()
    directManager = dm

    // หาหัวหน้าของหัวหน้า (skip-level)
    const { data: skipRow } = await svc
      .from("employee_manager_history")
      .select("manager_id")
      .eq("employee_id", directRow.manager_id)
      .is("effective_to", null)
      .maybeSingle()
    if (skipRow?.manager_id) {
      const { data: sm } = await svc.from("employees")
        .select("id, employee_code, first_name_th, last_name_th, nickname, avatar_url, position:positions(name)")
        .eq("id", skipRow.manager_id).maybeSingle()
      skipLevel1 = sm
    }
  }

  // 2) additional evaluators (employee_evaluators)
  let additionalEvaluators: any[] = []
  try {
    const { data: addRows } = await svc.from("employee_evaluators")
      .select("id, scope, note, evaluator:employees!evaluator_id(id, employee_code, first_name_th, last_name_th, nickname, avatar_url, position:positions(name))")
      .eq("employee_id", empId)
    additionalEvaluators = addRows ?? []
  } catch {}

  // ── (B) คนนี้เป็นหัวหน้าใครบ้าง — DOWN the chain ────────────────────────
  // 1) direct subordinates — เพิ่ม fields สำหรับ diagnostic
  const SUB_SELECT = "id, employee_code, first_name_th, last_name_th, nickname, avatar_url, employment_status, hire_date, probation_end_date, is_active, deleted_at, kpi_evaluator_id, position:positions(name)"
  const { data: directSubsRows } = await svc
    .from("employee_manager_history")
    .select(`employee_id, employee:employees!employee_id(${SUB_SELECT})`)
    .eq("manager_id", empId)
    .is("effective_to", null)
  const directSubs = (directSubsRows ?? []).map((r: any) => r.employee).filter(Boolean)

  // 2) skip-level subs (ลูกของลูก) — เรา skip-1 ระดับเดียว
  const directSubIds = directSubs.map((s: any) => s.id)
  const skipSubs: any[] = []
  const skipSubMgrMap = new Map<string, string>() // skip_sub_id -> direct_mgr_id
  if (directSubIds.length > 0) {
    const { data: skipRows } = await svc
      .from("employee_manager_history")
      .select(`employee_id, manager_id, employee:employees!employee_id(${SUB_SELECT})`)
      .in("manager_id", directSubIds)
      .is("effective_to", null)
    const seen = new Set<string>()
    for (const r of (skipRows ?? [])) {
      if (directSubIds.includes(r.employee_id)) continue
      if (r.employee_id === empId) continue
      if (seen.has(r.employee_id)) continue
      seen.add(r.employee_id)
      if (r.employee) {
        skipSubs.push(r.employee)
        skipSubMgrMap.set(r.employee_id, r.manager_id)
      }
    }
  }

  // ── Diagnostic: per sub — ทำไม "ไม่ขึ้น" ใน KPI / Probation list ของ caller (empId) ──
  //   KPI rules (จาก getManageableEmployees + kpi_evaluator_id override):
  //     - is_active = false           → ❌ hidden everywhere
  //     - deleted_at != null          → ❌ hidden everywhere
  //     - kpi_evaluator_id ≠ empId AND ≠ null → ❌ hidden ใน KPI (มีคนแทน)
  //   Probation rules (เพิ่มเติมใน /api/probation-evaluation):
  //     - hire_date ว่าง              → ❌ hidden ใน probation
  //     - daysSinceHire > 150 และ status ≠ "probation" → ❌ hidden (พ้นทดลองงานแล้ว)
  const today = new Date()
  const computeDiagnostic = (s: any): any => {
    const issues: { kpi_hidden?: string; probation_hidden?: string } = {}
    if (s.is_active === false) {
      issues.kpi_hidden = "พนักงาน inactive"
      issues.probation_hidden = "พนักงาน inactive"
    } else if (s.deleted_at) {
      issues.kpi_hidden = "พนักงานถูกลบ"
      issues.probation_hidden = "พนักงานถูกลบ"
    }
    // KPI override
    if (!issues.kpi_hidden && s.kpi_evaluator_id && s.kpi_evaluator_id !== empId) {
      issues.kpi_hidden = `KPI ถูกมอบให้คนอื่นประเมิน (kpi_evaluator_id ≠ ${empId.slice(0, 8)}…)`
    }
    // Probation hire-date filter
    if (!issues.probation_hidden) {
      if (!s.hire_date) {
        issues.probation_hidden = "ไม่มี hire_date"
      } else {
        const days = Math.ceil((today.getTime() - new Date(s.hire_date).getTime()) / 86_400_000)
        const isProbation = s.employment_status === "probation"
        if (!isProbation && days > 150) {
          issues.probation_hidden = `พ้นทดลองงานแล้ว (${days} วัน, status=${s.employment_status || "ไม่ระบุ"})`
        }
      }
    }
    return {
      _kpi_visible: !issues.kpi_hidden,
      _kpi_hidden_reason: issues.kpi_hidden ?? null,
      _probation_visible: !issues.probation_hidden,
      _probation_hidden_reason: issues.probation_hidden ?? null,
    }
  }
  for (const s of directSubs) Object.assign(s, computeDiagnostic(s))
  for (const s of skipSubs)   Object.assign(s, computeDiagnostic(s))

  // Attach direct_manager info to each skip sub
  const skipSubMgrInfo = new Map<string, any>(directSubs.map((s: any) => [s.id, s]))
  const skipSubsWithMgr = skipSubs.map((s: any) => ({
    ...s,
    direct_manager: skipSubMgrInfo.get(skipSubMgrMap.get(s.id) ?? "") ?? null,
  }))

  // 3) คนที่กำหนดให้คนนี้ประเมิน (additional)
  let additionalSubs: any[] = []
  try {
    const { data: addAsEvaluator } = await svc.from("employee_evaluators")
      .select(`scope, employee:employees!employee_id(${SUB_SELECT})`)
      .eq("evaluator_id", empId)
    additionalSubs = (addAsEvaluator ?? [])
      .filter((r: any) => r.employee)
      .filter((r: any) => !directSubIds.includes(r.employee.id))
      .filter((r: any) => !skipSubs.some((s: any) => s.id === r.employee.id))
      .map((r: any) => ({ ...r.employee, scope: r.scope, ...computeDiagnostic(r.employee) }))
  } catch {}

  // ── (C) Stats counts ────────────────────────────────────────────────────
  const total_subordinates = directSubs.length + skipSubs.length + additionalSubs.length

  return NextResponse.json({
    // ใครประเมินคนนี้ได้บ้าง
    evaluators: {
      direct_manager: directManager,
      skip_level: skipLevel1, // 1 ระดับขึ้นไป (= หัวหน้าของหัวหน้า)
      additional: additionalEvaluators.map((a: any) => ({
        id: a.id,
        scope: a.scope,
        note: a.note,
        ...a.evaluator,
      })),
    },
    // คนนี้เป็นหัวหน้าใครบ้าง
    subordinates: {
      direct: directSubs,
      skip: skipSubsWithMgr, // มี direct_manager attached
      additional: additionalSubs, // scope attached
    },
    stats: {
      total: total_subordinates,
      direct_count: directSubs.length,
      skip_count: skipSubs.length,
      additional_count: additionalSubs.length,
    },
  })
}
