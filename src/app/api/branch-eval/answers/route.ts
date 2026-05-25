import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, canManageBranch } from "@/lib/utils/branch-eval-permissions"

// POST — save answer (upsert per evaluation+item)
//   body: { evaluation_id, item_id, answer_value, note?, photo_urls?[] }
//   - YES = pass (earned = weight)
//   - NO  = fail (earned = 0)
//   - score_1_5: earned = weight × (score/5)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { evaluation_id, item_id, answer_value, note, photo_urls } = body
  if (!evaluation_id || !item_id) return NextResponse.json({ error: "missing evaluation_id/item_id" }, { status: 400 })

  // permission check
  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id, status").eq("id", evaluation_id).maybeSingle()
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })
  const isOwner = ev.evaluator_id === access.employeeId
  const isManager = canManageBranch(access, ev.branch_id)
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // fetch item to know weight + answer_type
  const { data: item } = await svc.from("branch_eval_template_items")
    .select("weight, answer_type, is_section").eq("id", item_id).maybeSingle()
  if (!item) return NextResponse.json({ error: "ไม่พบข้อ" }, { status: 404 })
  if (item.is_section) return NextResponse.json({ error: "section ไม่ใช่คำถาม — ไม่ต้องตอบ" }, { status: 400 })

  // compute is_pass + earned_weight
  const weight = Number(item.weight || 0)
  let isPass: boolean | null = null
  let earned = 0
  switch (item.answer_type) {
    case "yes_no": {
      isPass = !!answer_value?.yes
      earned = isPass ? weight : 0
      break
    }
    case "score_1_5": {
      const score = Math.max(0, Math.min(5, Number(answer_value?.score ?? 0)))
      isPass = score >= 3
      earned = weight * (score / 5)
      break
    }
    case "text":
    case "number":
      // ไม่มี pass/fail สำหรับ text/number — ให้ admin คำนวณเอง
      isPass = null
      earned = 0
      break
  }

  const upsertData: any = {
    evaluation_id, item_id,
    answer_value: answer_value ?? null,
    is_pass: isPass,
    earned_weight: Math.round(earned * 100) / 100,
    note: note ?? null,
    photo_urls: photo_urls ?? [],
    updated_at: new Date().toISOString(),
  }

  const { error } = await svc.from("branch_evaluation_answers")
    .upsert(upsertData, { onConflict: "evaluation_id,item_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // recalc overall score for the evaluation (live, even before submit)
  await svc.rpc("recalc_branch_evaluation_score", { p_eval_id: evaluation_id })

  return NextResponse.json({ success: true, is_pass: isPass, earned_weight: earned })
}

// DELETE — remove answer (e.g., reset a single question)
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const evaluationId = sp.get("evaluation_id")
  const itemId = sp.get("item_id")
  if (!evaluationId || !itemId) return NextResponse.json({ error: "missing" }, { status: 400 })

  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id").eq("id", evaluationId).maybeSingle()
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })
  const isOwner = ev.evaluator_id === access.employeeId
  const isManager = canManageBranch(access, ev.branch_id)
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  await svc.from("branch_evaluation_answers").delete()
    .eq("evaluation_id", evaluationId).eq("item_id", itemId)
  await svc.rpc("recalc_branch_evaluation_score", { p_eval_id: evaluationId })
  return NextResponse.json({ success: true })
}
