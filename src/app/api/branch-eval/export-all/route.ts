import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, canViewEvaluation } from "@/lib/utils/branch-eval-permissions"

// GET — ดึงข้อมูลทุกฟอร์ม (พร้อม answers + items) สำหรับ deep export
//   query: ?days=N&branch_id=...&evaluator_id=...&status=submitted|reviewed
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "เฉพาะ admin หรือ supervisor" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const days = Math.max(1, Math.min(730, Number(sp.get("days")) || 365))
  const branchId = sp.get("branch_id")
  const evaluatorId = sp.get("evaluator_id")
  const status = sp.get("status")

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  let q = svc.from("branch_evaluations")
    .select(`id, visit_date, visit_time, status, percentage, total_score, total_weight,
      general_notes, action_plan, reviewer_notes,
      checkin_at, checkin_lat, checkin_lng, checkin_distance_m,
      submitted_at, reviewed_at,
      branch:branches(id, name, code, company:companies(name_th, code)),
      template:branch_eval_templates(id, name),
      evaluator:employees!branch_evaluations_evaluator_id_fkey(id, first_name_th, last_name_th, nickname, employee_code),
      reviewer:employees!branch_evaluations_reviewed_by_fkey(id, first_name_th, last_name_th, nickname)`)
    .gte("visit_date", cutoffDate)
    .is("deleted_at", null)
    .order("visit_date", { ascending: false })

  if (branchId) q = q.eq("branch_id", branchId)
  if (evaluatorId) q = q.eq("evaluator_id", evaluatorId)
  if (status) q = q.eq("status", status)
  else q = q.neq("status", "draft")

  // scope สำหรับ supervisor: เฉพาะสาขาที่ดูแล
  if (!access.isEvalAdmin && access.supervisorBranchIds.length > 0) {
    q = q.in("branch_id", access.supervisorBranchIds)
  }

  const { data: evals, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!evals || evals.length === 0) {
    return NextResponse.json({ evaluations: [], items_by_template: {}, answers_by_eval: {} })
  }

  // ── pull items + answers ──
  const evalIds = evals.map((e: any) => e.id)
  const templateIds = Array.from(new Set(evals.map((e: any) => e.template?.id).filter(Boolean)))

  const [{ data: items }, { data: answers }] = await Promise.all([
    svc.from("branch_eval_template_items")
      .select("id, template_id, code, order_no, question_th, question_en, weight, answer_type, is_section")
      .in("template_id", templateIds)
      .order("order_no"),
    svc.from("branch_evaluation_answers")
      .select("evaluation_id, item_id, answer_value, is_pass, earned_weight, note, photo_urls")
      .in("evaluation_id", evalIds),
  ])

  // group
  const itemsByTemplate: Record<string, any[]> = {}
  for (const it of (items ?? []) as any[]) {
    if (!itemsByTemplate[it.template_id]) itemsByTemplate[it.template_id] = []
    itemsByTemplate[it.template_id].push(it)
  }

  const answersByEval: Record<string, Record<string, any>> = {}
  for (const a of (answers ?? []) as any[]) {
    if (!answersByEval[a.evaluation_id]) answersByEval[a.evaluation_id] = {}
    answersByEval[a.evaluation_id][a.item_id] = a
  }

  return NextResponse.json({
    evaluations: evals,
    items_by_template: itemsByTemplate,
    answers_by_eval: answersByEval,
  })
}
