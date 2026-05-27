import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// GET /api/branch-eval/assignments
//   ?id=...                → single assignment with targets + progress
//   ?assignee_id=me        → การบ้านของฉัน (ลูกน้อง)
//   ?assigned_by=me        → การบ้านที่ฉันมอบ (หัวหน้า)
//   ?status=open|cancelled
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.employeeId) return NextResponse.json({ assignments: [] })

  const sp = new URL(req.url).searchParams
  const id          = sp.get("id")
  const assigneeId  = sp.get("assignee_id")
  const assignedBy  = sp.get("assigned_by")
  const status      = sp.get("status")

  // ── single assignment with targets ──
  if (id) {
    const { data: asg } = await svc.from("branch_eval_assignments")
      .select(`*,
        template:branch_eval_templates(id, name, description, total_weight),
        assigner:employees!branch_eval_assignments_assigned_by_fkey(id, first_name_th, last_name_th, nickname)`)
      .eq("id", id).maybeSingle()
    if (!asg) return NextResponse.json({ error: "not found" }, { status: 404 })

    // access: assigner OR assignee OR admin/supervisor
    // ⚠️ join template per-target (target.template_id อาจ override assignment.template_id)
    const { data: targets } = await svc.from("branch_eval_assignment_targets")
      .select(`*,
        assignee:employees!branch_eval_assignment_targets_assignee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url),
        branch:branches(id, name, code, company_id),
        template:branch_eval_templates(id, name),
        evaluation:branch_evaluations(id, status, percentage, total_score, total_weight, visit_date)`)
      .eq("assignment_id", id)
      .order("created_at", { ascending: true })

    const isInvolved = (asg as any).assigned_by === access.employeeId
      || (targets ?? []).some((t: any) => t.assignee_id === access.employeeId)
    if (!isInvolved && !access.isEvalAdmin && !access.isSupervisor) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }

    return NextResponse.json({ assignment: asg, targets: targets ?? [] })
  }

  // ── list mode ──
  // Strategy: query assignments → fetch targets separately
  let q = svc.from("branch_eval_assignments")
    .select(`*,
      template:branch_eval_templates(id, name),
      assigner:employees!branch_eval_assignments_assigned_by_fkey(id, first_name_th, last_name_th, nickname)`)
    .order("created_at", { ascending: false })
    .limit(200)

  if (status) q = q.eq("status", status)
  if (assignedBy === "me") q = q.eq("assigned_by", access.employeeId)
  else if (assignedBy) q = q.eq("assigned_by", assignedBy)

  const { data: asgList, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let assignments = asgList ?? []

  // ── ดึง targets ของทุก assignment ใน batch — รวม evaluation score ──
  const ids = assignments.map((a: any) => a.id)
  let targetsAll: any[] = []
  if (ids.length > 0) {
    const { data: tgs } = await svc.from("branch_eval_assignment_targets")
      .select(`*,
        assignee:employees!branch_eval_assignment_targets_assignee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url),
        branch:branches(id, name, code, company_id),
        template:branch_eval_templates(id, name),
        evaluation:branch_evaluations(id, percentage, total_score, total_weight, status)`)
      .in("assignment_id", ids)
    targetsAll = tgs ?? []
  }

  // ── filter by assignee=me (กรอง assignments ที่ลูกน้องคนนี้ต้องทำ) ──
  if (assigneeId === "me") {
    const myAsgIds = new Set(
      targetsAll.filter(t => t.assignee_id === access.employeeId).map(t => t.assignment_id)
    )
    assignments = assignments.filter((a: any) => myAsgIds.has(a.id))
  } else if (assigneeId) {
    const filterIds = new Set(
      targetsAll.filter(t => t.assignee_id === assigneeId).map(t => t.assignment_id)
    )
    assignments = assignments.filter((a: any) => filterIds.has(a.id))
  }

  // ── คำนวณ progress + performance per assignment ──
  // วันที่ filter assignee=me → คำนวณ _my_stats เพิ่มเติม (เฉพาะงานของคนนี้)
  const myAssigneeId = assigneeId === "me" ? access.employeeId : assigneeId
  const enriched = assignments.map((a: any) => {
    const myTargets = targetsAll.filter(t => t.assignment_id === a.id)
    const total = myTargets.length
    const done = myTargets.filter(t => t.completed_at != null).length
    const assignees = new Set(myTargets.map(t => t.assignee_id))
    const branches = new Set(myTargets.map(t => t.branch_id))

    // Performance metrics (รวมทุกคน)
    const scored = myTargets
      .filter((t: any) => t.completed_at && t.evaluation?.percentage != null)
      .map((t: any) => Number(t.evaluation.percentage))
    const avgScore = scored.length > 0 ? scored.reduce((s: number, x: number) => s + x, 0) / scored.length : null
    const maxScore = scored.length > 0 ? Math.max(...scored) : null
    const minScore = scored.length > 0 ? Math.min(...scored) : null
    const passCount = scored.filter((p: number) => p >= 80).length
    const midCount = scored.filter((p: number) => p >= 60 && p < 80).length
    const lowCount = scored.filter((p: number) => p < 60).length

    // Completion speed
    const createdMs = new Date(a.created_at).getTime()
    const completedTargets = myTargets.filter((t: any) => t.completed_at)
    const daysToComplete = completedTargets.length > 0
      ? completedTargets.reduce((s: number, t: any) =>
          s + (new Date(t.completed_at).getTime() - createdMs) / (1000 * 60 * 60 * 24), 0
        ) / completedTargets.length
      : null

    // ── Per-assignee (ของคนที่เรา filter) stats ──
    let _my_stats: any = undefined
    if (myAssigneeId) {
      const mine = myTargets.filter(t => t.assignee_id === myAssigneeId)
      const myDone = mine.filter(t => t.completed_at != null).length
      _my_stats = {
        total: mine.length,
        done: myDone,
        progress: mine.length > 0 ? (myDone / mine.length) * 100 : 0,
      }
    }

    return {
      ...a,
      _stats: {
        total,
        done,
        progress: total > 0 ? (done / total) * 100 : 0,
        assignee_count: assignees.size,
        branch_count: branches.size,
        avg_score: avgScore,
        max_score: maxScore,
        min_score: minScore,
        scored_count: scored.length,
        pass_count: passCount,
        mid_count: midCount,
        low_count: lowCount,
        avg_days_to_complete: daysToComplete,
      },
      _my_stats,
      _my_pending: assigneeId === "me"
        ? myTargets.filter(t => t.assignee_id === access.employeeId && t.completed_at == null)
        : undefined,
    }
  })

  return NextResponse.json({ assignments: enriched })
}

// POST /api/branch-eval/assignments
//   body: { template_id, title, description, due_date, assignees[], branches[] }
//   → สร้าง assignment + cross-product targets + notify assignees
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  // เฉพาะ admin/supervisor หรือผู้มีสิทธิ์ branch_eval อย่างน้อย → มอบหมายได้
  if (!access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "เฉพาะ admin/supervisor มอบหมายได้" }, { status: 403 })
  }
  if (!access.employeeId) return NextResponse.json({ error: "No employee profile" }, { status: 400 })

  const body = await req.json()
  const { template_id, title, description, due_date, assignees, branches, targets } = body as {
    template_id?: string                                    // default template (อาจถูก override per-target)
    title: string
    description?: string
    due_date?: string | null
    assignees: string[]
    // 3 รูปแบบ (เรียงจาก specific → general):
    //   1. targets: [{assignee_id, branch_id, template_id}]   ← per-cell (ใหม่สุด — ใช้กับ matrix UI)
    //   2. branches: [{branch_id, template_id}]               ← per-branch (ทุก assignee ใช้ template เดียวกันต่อสาขา)
    //   3. branches: string[]                                  ← legacy (ใช้ template_id ตัวเดียวกันทุก target)
    branches?: string[] | { branch_id: string; template_id: string }[]
    targets?: { assignee_id: string; branch_id: string; template_id: string }[]
  }

  if (!title?.trim()) return NextResponse.json({ error: "missing title" }, { status: 400 })

  // ── normalize → flat targetRows: [{assignee_id, branch_id, template_id}] ──
  type Cell = { assignee_id: string; branch_id: string; template_id: string }
  let cells: Cell[] = []

  if (targets && targets.length > 0) {
    // โหมด per-cell (matrix UI) — ใช้โดยตรง
    if (targets.some(c => !c.assignee_id || !c.branch_id || !c.template_id)) {
      return NextResponse.json({ error: "ทุก target ต้องระบุ assignee_id + branch_id + template_id" }, { status: 400 })
    }
    cells = targets
  } else {
    // โหมด cross-product จาก assignees × branches
    if (!assignees?.length) return NextResponse.json({ error: "ต้องเลือก assignee อย่างน้อย 1 คน" }, { status: 400 })
    if (!branches?.length) return NextResponse.json({ error: "ต้องเลือกสาขาอย่างน้อย 1 สาขา" }, { status: 400 })

    const isLegacy = typeof branches[0] === "string"
    let branchTplPairs: { branch_id: string; template_id: string }[]
    if (isLegacy) {
      if (!template_id) return NextResponse.json({ error: "missing template_id (legacy format)" }, { status: 400 })
      branchTplPairs = (branches as string[]).map(bid => ({ branch_id: bid, template_id }))
    } else {
      branchTplPairs = branches as { branch_id: string; template_id: string }[]
      if (branchTplPairs.some(b => !b.branch_id || !b.template_id)) {
        return NextResponse.json({ error: "ทุกสาขาต้องระบุ template" }, { status: 400 })
      }
    }
    for (const aId of assignees) {
      for (const pair of branchTplPairs) {
        cells.push({ assignee_id: aId, branch_id: pair.branch_id, template_id: pair.template_id })
      }
    }
  }

  if (cells.length === 0) return NextResponse.json({ error: "ไม่มี target ที่จะมอบหมาย" }, { status: 400 })

  // ── verify templates (ทุก unique template_id ในรายการ) + เลือก default ──
  const uniqTpls = Array.from(new Set(cells.map(c => c.template_id)))
  const { data: tplsData } = await svc.from("branch_eval_templates")
    .select("id, company_id, name").in("id", uniqTpls).is("deleted_at", null)
  if (!tplsData || tplsData.length !== uniqTpls.length) {
    return NextResponse.json({ error: "มี template ไม่พบ" }, { status: 404 })
  }
  const defaultTplId = template_id || cells[0].template_id
  const defaultTpl = tplsData.find(t => t.id === defaultTplId) ?? tplsData[0]

  // create assignment
  const { data: asg, error: asgErr } = await svc.from("branch_eval_assignments")
    .insert({
      assigned_by: access.employeeId,
      template_id: defaultTplId,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
      company_id: defaultTpl.company_id,
      status: "open",
    }).select("id").single()
  if (asgErr || !asg) return NextResponse.json({ error: asgErr?.message }, { status: 500 })

  const targetRows = cells.map(c => ({
    assignment_id: asg.id,
    assignee_id: c.assignee_id,
    branch_id: c.branch_id,
    template_id: c.template_id,
  }))
  const { error: tgErr } = await svc.from("branch_eval_assignment_targets").insert(targetRows)
  if (tgErr) {
    await svc.from("branch_eval_assignments").delete().eq("id", asg.id)
    return NextResponse.json({ error: tgErr.message }, { status: 500 })
  }

  // notify each unique assignee
  try {
    const { data: actor } = await svc.from("employees")
      .select("first_name_th, last_name_th").eq("id", access.employeeId).maybeSingle()
    const actorName = actor ? `${actor.first_name_th} ${actor.last_name_th}` : "หัวหน้า"
    const uniqAssignees = Array.from(new Set(cells.map(c => c.assignee_id)))
    const uniqBranches = Array.from(new Set(cells.map(c => c.branch_id)))
    const tplCount = uniqTpls.length
    const notifRows = uniqAssignees.map(empId => ({
      employee_id: empId,
      type: "branch_eval_assignment",
      title: `${actorName} มอบการบ้านประเมินสาขา`,
      body: `"${title}" · ${uniqBranches.length} สาขา${tplCount > 1 ? ` · ${tplCount} template` : ""}${due_date ? ` · ครบกำหนด ${due_date}` : ""}`,
      ref_table: "branch_eval_assignments", ref_id: asg.id, is_read: false,
    }))
    if (notifRows.length > 0) await svc.from("notifications").insert(notifRows)
  } catch {}

  return NextResponse.json({ id: asg.id, target_count: targetRows.length })
}

// PATCH /api/branch-eval/assignments
//   body: { id, title?, description?, due_date?, status? }
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // only assigner or admin
  const { data: asg } = await svc.from("branch_eval_assignments")
    .select("assigned_by").eq("id", id).maybeSingle()
  if (!asg) return NextResponse.json({ error: "not found" }, { status: 404 })
  const isOwner = (asg as any).assigned_by === access.employeeId
  if (!isOwner && !access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const allowed = ["title", "description", "due_date", "status"]
  const safe: any = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in updates) safe[k] = updates[k]
  if (Object.keys(safe).length === 1) return NextResponse.json({ success: true })

  const { error } = await svc.from("branch_eval_assignments").update(safe).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/branch-eval/assignments?id=...
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: asg } = await svc.from("branch_eval_assignments")
    .select("assigned_by").eq("id", id).maybeSingle()
  if (!asg) return NextResponse.json({ error: "not found" }, { status: 404 })
  const isOwner = (asg as any).assigned_by === access.employeeId
  if (!isOwner && !access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("branch_eval_assignments").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
