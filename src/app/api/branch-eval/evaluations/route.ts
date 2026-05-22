import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import {
  getBranchEvalAccess, canManageBranch, canFillBranch, canViewEvaluation,
  getAccessibleBranchIds,
} from "@/lib/utils/branch-eval-permissions"

// GET — list / single evaluation
//   ?id=...                    → single (with answers, photos, items)
//   ?branch_id=...             → list for branch
//   ?evaluator_id=me           → my evaluations
//   ?status=draft|submitted|reviewed
//   ?deleted=1                 → trash (admin/sup only)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor && !access.isEvaluator) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const id = sp.get("id")
  const branchId = sp.get("branch_id")
  const evaluatorId = sp.get("evaluator_id")
  const status = sp.get("status")
  const showDeleted = sp.get("deleted") === "1"

  // ── single evaluation ──
  if (id) {
    const { data: ev } = await svc.from("branch_evaluations")
      .select(`*,
        branch:branches(id, name, code, latitude, longitude, geo_radius_m),
        template:branch_eval_templates(id, name, description, total_weight),
        evaluator:employees!branch_evaluations_evaluator_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url),
        reviewer:employees!branch_evaluations_reviewed_by_fkey(id, first_name_th, last_name_th, nickname)`)
      .eq("id", id).maybeSingle()
    if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })
    if (!canViewEvaluation(access, (ev.branch as any).id, ev.evaluator_id)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }

    const [{ data: items }, { data: answers }, { data: photos }] = await Promise.all([
      svc.from("branch_eval_template_items").select("*").eq("template_id", ev.template_id).order("order_no"),
      svc.from("branch_evaluation_answers").select("*").eq("evaluation_id", id),
      svc.from("branch_evaluation_photos").select("*").eq("evaluation_id", id).order("taken_at"),
    ])

    const canEdit = canManageBranch(access, (ev.branch as any).id) || ev.evaluator_id === access.employeeId
    return NextResponse.json({
      evaluation: ev,
      items: items ?? [],
      answers: answers ?? [],
      photos: photos ?? [],
      access: {
        can_edit: canEdit,
        can_review: canManageBranch(access, (ev.branch as any).id),
        is_owner: ev.evaluator_id === access.employeeId,
      },
    })
  }

  // ── list ──
  let q = svc.from("branch_evaluations")
    .select(`*,
      branch:branches(id, name, code),
      template:branch_eval_templates(id, name),
      evaluator:employees!branch_evaluations_evaluator_id_fkey(id, first_name_th, last_name_th, nickname, avatar_url)`)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (showDeleted) q = q.not("deleted_at", "is", null)
  else q = q.is("deleted_at", null)
  if (branchId) q = q.eq("branch_id", branchId)
  if (status) q = q.eq("status", status)

  // evaluator scope = only own
  if (evaluatorId === "me") {
    q = q.eq("evaluator_id", access.employeeId)
  } else if (!access.isEvalAdmin) {
    // supervisor → only their branches
    // evaluator only → only own evaluations
    const managed = access.supervisorBranchIds
    if (access.isSupervisor && managed.length > 0 && access.isEvaluator) {
      // both → branches they manage OR own
      q = q.or(`branch_id.in.(${managed.join(",")}),evaluator_id.eq.${access.employeeId}`)
    } else if (access.isSupervisor && managed.length > 0) {
      q = q.in("branch_id", managed)
    } else {
      q = q.eq("evaluator_id", access.employeeId)
    }
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ evaluations: data ?? [] })
}

// POST — create new evaluation
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const body = await req.json()
  const { branch_id, template_id, visit_date, visit_time, store_manager, store_staff } = body

  if (!branch_id || !template_id) return NextResponse.json({ error: "missing branch_id/template_id" }, { status: 400 })
  if (!canFillBranch(access, branch_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์กรอกประเมินสาขานี้" }, { status: 403 })

  // verify template + version
  const { data: tpl } = await svc.from("branch_eval_templates")
    .select("id, version, total_weight").eq("id", template_id).is("deleted_at", null).maybeSingle()
  if (!tpl) return NextResponse.json({ error: "ไม่พบ template" }, { status: 404 })

  const { data, error } = await svc.from("branch_evaluations").insert({
    branch_id, template_id,
    template_version: tpl.version,
    evaluator_id: access.employeeId,
    visit_date: visit_date ?? new Date().toISOString().slice(0, 10),
    visit_time: visit_time ?? null,
    store_manager: store_manager ?? null,
    store_staff: store_staff ?? null,
    total_weight: tpl.total_weight,
    status: "draft",
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH — update evaluation header fields (notes, action_plan, etc.) + status transitions
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const body = await req.json()
  const { id, action, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id, status").eq("id", id).maybeSingle()
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })

  const isManager = canManageBranch(access, ev.branch_id)
  const isOwner = ev.evaluator_id === access.employeeId

  // ── action: submit ──
  if (action === "submit") {
    if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    await svc.rpc("recalc_branch_evaluation_score", { p_eval_id: id })
    await svc.from("branch_evaluations").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", id)

    // notify supervisors of this branch
    try {
      const { data: full } = await svc.from("branch_evaluations")
        .select("percentage, branch:branches(name), template:branch_eval_templates(name), evaluator:employees!branch_evaluations_evaluator_id_fkey(first_name_th, last_name_th)")
        .eq("id", id).maybeSingle() as any
      const { data: sups } = await svc.from("branch_eval_permissions")
        .select("employee_id")
        .eq("role", "branch_eval_supervisor")
        .eq("branch_id", ev.branch_id)
      const evaluatorName = full?.evaluator ? `${full.evaluator.first_name_th} ${full.evaluator.last_name_th}` : "ผู้กรอก"
      const branchName = full?.branch?.name ?? "สาขา"
      const tplName = full?.template?.name ?? ""
      const pct = full?.percentage != null ? `${Number(full.percentage).toFixed(0)}%` : ""
      const rows = (sups ?? []).map((s: any) => ({
        employee_id: s.employee_id,
        type: "branch_eval_submitted",
        title: `${evaluatorName} ส่งฟอร์มประเมิน ${branchName}`,
        body: `${tplName}${pct ? ` · คะแนน ${pct}` : ""} · กดดูเพื่อรีวิว`,
        ref_table: "branch_evaluations", ref_id: id, is_read: false,
      }))
      if (rows.length > 0) await svc.from("notifications").insert(rows)
    } catch {}

    return NextResponse.json({ success: true })
  }

  // ── action: review (supervisor only) ──
  if (action === "review") {
    if (!isManager) return NextResponse.json({ error: "เฉพาะ supervisor ขึ้นไป" }, { status: 403 })
    await svc.from("branch_evaluations").update({
      status: "reviewed",
      reviewed_by: access.employeeId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: updates.reviewer_notes ?? null,
    }).eq("id", id)

    // notify evaluator
    try {
      const { data: full } = await svc.from("branch_evaluations")
        .select("percentage, evaluator_id, branch:branches(name), template:branch_eval_templates(name)")
        .eq("id", id).maybeSingle() as any
      if (full?.evaluator_id) {
        await svc.from("notifications").insert({
          employee_id: full.evaluator_id,
          type: "branch_eval_reviewed",
          title: `รีวิวฟอร์มประเมิน ${full?.branch?.name ?? "สาขา"} แล้ว`,
          body: `${full?.template?.name ?? ""} · คะแนน ${Number(full?.percentage ?? 0).toFixed(0)}%`,
          ref_table: "branch_evaluations", ref_id: id, is_read: false,
        })
      }
    } catch {}

    return NextResponse.json({ success: true })
  }

  // ── plain update (header fields) ──
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  // อนุญาตเฉพาะ field ที่กำหนด — กัน injection
  const allowed = ["visit_date", "visit_time", "store_manager", "store_staff",
                   "general_notes", "action_plan", "deleted_at"]
  const safe: any = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in updates) safe[k] = updates[k]
  if (Object.keys(safe).length === 1) {
    return NextResponse.json({ success: true })  // nothing to update
  }
  const { error } = await svc.from("branch_evaluations").update(safe).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — soft delete (default) or hard delete with ?hard=1
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const hard = url.searchParams.get("hard") === "1"
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id").eq("id", id).maybeSingle()
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })

  const isManager = canManageBranch(access, ev.branch_id)
  const isOwner = ev.evaluator_id === access.employeeId
  if (!isManager && !isOwner) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  if (hard && !access.isEvalAdmin) return NextResponse.json({ error: "ลบถาวรต้องเป็น Admin" }, { status: 403 })

  if (!hard) {
    await svc.from("branch_evaluations")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id)
    return NextResponse.json({ success: true, mode: "soft" })
  }
  await svc.from("branch_evaluations").delete().eq("id", id)
  return NextResponse.json({ success: true, mode: "hard" })
}
