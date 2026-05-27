import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// helper: ตรวจสิทธิ์แก้ไข assignment — เฉพาะ assigner หรือ admin
async function authorizeAssignment(svc: any, employeeId: string | null, isEvalAdmin: boolean, assignmentId: string) {
  const { data: asg } = await svc.from("branch_eval_assignments")
    .select("id, assigned_by, template_id, company_id, status").eq("id", assignmentId).maybeSingle()
  if (!asg) return { ok: false as const, status: 404, error: "ไม่พบ assignment" }
  const isOwner = asg.assigned_by === employeeId
  if (!isOwner && !isEvalAdmin) return { ok: false as const, status: 403, error: "ไม่มีสิทธิ์" }
  return { ok: true as const, asg }
}

// POST /api/branch-eval/assignments/targets
//   body: { assignment_id, targets: [{assignee_id, branch_id, template_id}] }
//   เพิ่ม target ใหม่ — duplicate (assignee × branch) จะถูก skip
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { assignment_id, targets } = body as {
    assignment_id: string
    targets: { assignee_id: string; branch_id: string; template_id: string }[]
  }
  if (!assignment_id) return NextResponse.json({ error: "missing assignment_id" }, { status: 400 })
  if (!targets?.length) return NextResponse.json({ error: "missing targets" }, { status: 400 })
  if (targets.some(c => !c.assignee_id || !c.branch_id || !c.template_id)) {
    return NextResponse.json({ error: "ทุก target ต้องระบุ assignee_id + branch_id + template_id" }, { status: 400 })
  }

  const auth = await authorizeAssignment(svc, access.employeeId, access.isEvalAdmin, assignment_id)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // verify templates
  const uniqTpls = Array.from(new Set(targets.map(c => c.template_id)))
  const { data: tplsData } = await svc.from("branch_eval_templates")
    .select("id").in("id", uniqTpls).is("deleted_at", null)
  if (!tplsData || tplsData.length !== uniqTpls.length) {
    return NextResponse.json({ error: "มี template ไม่พบ" }, { status: 404 })
  }

  // skip dupe: target ที่มี (assignee × branch) เดิมในงานนี้ → ไม่เพิ่ม
  const { data: existing } = await svc.from("branch_eval_assignment_targets")
    .select("assignee_id, branch_id")
    .eq("assignment_id", assignment_id)
  const existingKeys = new Set((existing ?? []).map((r: any) => `${r.assignee_id}|${r.branch_id}`))

  const toInsert = targets
    .filter(c => !existingKeys.has(`${c.assignee_id}|${c.branch_id}`))
    .map(c => ({
      assignment_id,
      assignee_id: c.assignee_id,
      branch_id: c.branch_id,
      template_id: c.template_id,
    }))

  if (toInsert.length === 0) {
    return NextResponse.json({ added: 0, skipped: targets.length, message: "ทุก target มีอยู่แล้วในงานนี้" })
  }

  const { error } = await svc.from("branch_eval_assignment_targets").insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── notify เฉพาะ assignee ใหม่ที่ไม่เคยอยู่ใน assignment ──
  try {
    const newAssignees = Array.from(new Set(toInsert.map(t => t.assignee_id)))
    const oldAssignees = new Set((existing ?? []).map((r: any) => r.assignee_id))
    const trulyNew = newAssignees.filter(id => !oldAssignees.has(id))

    const { data: actor } = await svc.from("employees")
      .select("first_name_th, last_name_th").eq("id", access.employeeId!).maybeSingle()
    const { data: asgRow } = await svc.from("branch_eval_assignments")
      .select("title, due_date").eq("id", assignment_id).maybeSingle()
    const actorName = actor ? `${actor.first_name_th} ${actor.last_name_th}` : "หัวหน้า"

    // คนใหม่: แจ้งว่าได้รับมอบหมายงาน
    if (trulyNew.length > 0 && asgRow) {
      const notifRows = trulyNew.map(empId => ({
        employee_id: empId,
        type: "branch_eval_assignment",
        title: `${actorName} มอบการบ้านประเมินสาขา`,
        body: `"${asgRow.title}"${asgRow.due_date ? ` · ครบกำหนด ${asgRow.due_date}` : ""}`,
        ref_table: "branch_eval_assignments", ref_id: assignment_id, is_read: false,
      }))
      await svc.from("notifications").insert(notifRows)
    }

    // คนเดิม: แจ้งว่ามีงานเพิ่ม
    const existingAssigneesUpdated = newAssignees.filter(id => oldAssignees.has(id))
    if (existingAssigneesUpdated.length > 0 && asgRow) {
      const notifRows = existingAssigneesUpdated.map(empId => {
        const myNewCount = toInsert.filter(t => t.assignee_id === empId).length
        return {
          employee_id: empId,
          type: "branch_eval_assignment",
          title: `${actorName} เพิ่มงานใน "${asgRow.title}"`,
          body: `เพิ่มอีก ${myNewCount} งาน`,
          ref_table: "branch_eval_assignments", ref_id: assignment_id, is_read: false,
        }
      })
      await svc.from("notifications").insert(notifRows)
    }
  } catch {}

  return NextResponse.json({
    added: toInsert.length,
    skipped: targets.length - toInsert.length,
  })
}

// PATCH /api/branch-eval/assignments/targets
//   body: { id, template_id }  ← เปลี่ยน template ของ target นี้
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { id, template_id } = body as { id: string; template_id: string }
  if (!id || !template_id) return NextResponse.json({ error: "missing id or template_id" }, { status: 400 })

  // หา assignment_id เพื่อตรวจสิทธิ์
  const { data: tg } = await svc.from("branch_eval_assignment_targets")
    .select("id, assignment_id, completed_at").eq("id", id).maybeSingle()
  if (!tg) return NextResponse.json({ error: "ไม่พบ target" }, { status: 404 })
  if (tg.completed_at) return NextResponse.json({ error: "target นี้เสร็จแล้ว เปลี่ยน template ไม่ได้" }, { status: 400 })

  const auth = await authorizeAssignment(svc, access.employeeId, access.isEvalAdmin, tg.assignment_id)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // verify template
  const { data: tpl } = await svc.from("branch_eval_templates")
    .select("id").eq("id", template_id).is("deleted_at", null).maybeSingle()
  if (!tpl) return NextResponse.json({ error: "ไม่พบ template" }, { status: 404 })

  const { error } = await svc.from("branch_eval_assignment_targets")
    .update({ template_id }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/branch-eval/assignments/targets?id=...
//   ลบ target — เฉพาะที่ยังไม่ completed
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: tg } = await svc.from("branch_eval_assignment_targets")
    .select("id, assignment_id, completed_at").eq("id", id).maybeSingle()
  if (!tg) return NextResponse.json({ error: "ไม่พบ target" }, { status: 404 })
  if (tg.completed_at) return NextResponse.json({ error: "target นี้เสร็จแล้ว ลบไม่ได้" }, { status: 400 })

  const auth = await authorizeAssignment(svc, access.employeeId, access.isEvalAdmin, tg.assignment_id)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { error } = await svc.from("branch_eval_assignment_targets").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
