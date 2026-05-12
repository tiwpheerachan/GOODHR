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
  // 1) direct subordinates
  const { data: directSubsRows } = await svc
    .from("employee_manager_history")
    .select("employee_id, employee:employees!employee_id(id, employee_code, first_name_th, last_name_th, nickname, avatar_url, employment_status, hire_date, position:positions(name))")
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
      .select("employee_id, manager_id, employee:employees!employee_id(id, employee_code, first_name_th, last_name_th, nickname, avatar_url, employment_status, position:positions(name))")
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
      .select("scope, employee:employees!employee_id(id, employee_code, first_name_th, last_name_th, nickname, avatar_url, employment_status, position:positions(name))")
      .eq("evaluator_id", empId)
    additionalSubs = (addAsEvaluator ?? [])
      .filter((r: any) => r.employee)
      .filter((r: any) => !directSubIds.includes(r.employee.id))
      .filter((r: any) => !skipSubs.some((s: any) => s.id === r.employee.id))
      .map((r: any) => ({ ...r.employee, scope: r.scope }))
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
