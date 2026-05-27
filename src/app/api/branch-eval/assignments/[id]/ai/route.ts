import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" })

// POST /api/branch-eval/assignments/[id]/ai
//   วิเคราะห์การบ้านนี้ทั้งหมด → ส่งให้ Claude สรุป
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า AI" }, { status: 500 })
  }

  const assignmentId = params.id

  // ── ดึง assignment + targets + evaluations ──
  const { data: asg } = await svc.from("branch_eval_assignments")
    .select(`*,
      template:branch_eval_templates(id, name),
      assigner:employees!branch_eval_assignments_assigned_by_fkey(id, first_name_th, last_name_th)`)
    .eq("id", assignmentId).maybeSingle()
  if (!asg) return NextResponse.json({ error: "ไม่พบการบ้าน" }, { status: 404 })

  // permission: เจ้าของการบ้าน, admin, supervisor, หรือ assignee ของการบ้านนี้
  const { data: tgs } = await svc.from("branch_eval_assignment_targets")
    .select(`*,
      assignee:employees!branch_eval_assignment_targets_assignee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code),
      branch:branches(id, name, code),
      template:branch_eval_templates(id, name),
      evaluation:branch_evaluations(id, status, percentage, total_score, total_weight, general_notes, action_plan, visit_date, reviewer_notes)`)
    .eq("assignment_id", assignmentId)

  const targets = tgs ?? []
  const isOwner = (asg as any).assigned_by === access.employeeId
  const isInvolved = targets.some((t: any) => t.assignee_id === access.employeeId)
  if (!isOwner && !isInvolved && !access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  // ── คำนวณ stats ──
  const total = targets.length
  const done = targets.filter((t: any) => t.completed_at).length
  const pending = total - done
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = asg.due_date && asg.due_date < today && done < total

  const scored = targets.filter((t: any) => t.completed_at && t.evaluation?.percentage != null)
  const pcts = scored.map((t: any) => Number(t.evaluation.percentage))
  const avg = pcts.length > 0 ? pcts.reduce((s, x) => s + x, 0) / pcts.length : 0
  const max = pcts.length > 0 ? Math.max(...pcts) : 0
  const min = pcts.length > 0 ? Math.min(...pcts) : 0

  // per-assignee
  const byA = new Map<string, any>()
  for (const t of targets) {
    const k = t.assignee_id
    const cur = byA.get(k) ?? {
      name: `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th || ""}${t.assignee?.nickname ? ` (${t.assignee.nickname})` : ""}`,
      total: 0, done: 0, pcts: [] as number[], pendingBranches: [] as string[], notes: [] as string[],
    }
    cur.total++
    if (t.completed_at) {
      cur.done++
      if (t.evaluation?.percentage != null) cur.pcts.push(Number(t.evaluation.percentage))
      if (t.evaluation?.general_notes) cur.notes.push(String(t.evaluation.general_notes).slice(0, 200))
    } else {
      cur.pendingBranches.push(t.branch?.name || "—")
    }
    byA.set(k, cur)
  }

  // top branches by score
  const branchScores = targets
    .filter((t: any) => t.completed_at && t.evaluation?.percentage != null)
    .map((t: any) => ({
      branch: t.branch?.name,
      pct: Number(t.evaluation.percentage),
      assignee: t.assignee?.first_name_th,
    }))
    .sort((a, b) => b.pct - a.pct)
  const top5 = branchScores.slice(0, 5)
  const bot5 = branchScores.slice(-5).reverse()

  // เตรียม context สำหรับ Claude (ให้สั้น)
  const ctx = {
    title: asg.title,
    description: asg.description,
    template: asg.template?.name,
    assigner: asg.assigner ? `${asg.assigner.first_name_th} ${asg.assigner.last_name_th}` : "",
    due_date: asg.due_date,
    is_overdue: isOverdue,
    stats: { total, done, pending, progress_pct: total > 0 ? Math.round((done/total)*100) : 0 },
    score: pcts.length > 0
      ? { avg: avg.toFixed(1), max: max.toFixed(1), min: min.toFixed(1), n: pcts.length }
      : null,
    per_assignee: Array.from(byA.values()).map(v => ({
      name: v.name,
      done: v.done, total: v.total,
      progress_pct: ((v.done/v.total)*100).toFixed(0),
      avg_score: v.pcts.length > 0 ? (v.pcts.reduce((s: number, x: number) => s + x, 0)/v.pcts.length).toFixed(1) : null,
      pending_branches: v.pendingBranches.slice(0, 10),
      sample_notes: v.notes.slice(0, 3),
    })),
    top_branches: top5,
    bottom_branches: bot5,
  }

  // ── Call Claude ──
  const sys = `คุณเป็น AI ผู้ช่วยวิเคราะห์ระบบประเมินสาขา (Branch Evaluation Analytics).
ผู้ใช้คือ หัวหน้า/ผู้จัดการ ที่ดูสรุปการบ้านมอบหมายให้ทีม

หน้าที่ของคุณ:
- วิเคราะห์ข้อมูลการบ้านที่ผู้ใช้ส่งมา → สรุปเป็นภาษาไทยกระชับ (ไม่เกิน 400 คำ)
- มีหัวข้อชัดเจน: ความคืบหน้า, ผลคะแนน, จุดเสี่ยง, recommendation
- ใช้ bullet points / emoji ให้อ่านง่าย (✅ ⚠️ 📊 🎯)
- ห้ามตอบคำถามเรื่องเงินเดือน บุคคล หรือเรื่องอื่นที่ไม่ใช่ branch evaluation`

  const userMsg = `วิเคราะห์การบ้านนี้ให้หน่อย:

\`\`\`json
${JSON.stringify(ctx, null, 2)}
\`\`\`

กรุณาให้:
1. **📊 สรุปภาพรวม** — โดยรวมเป็นยังไง
2. **🏆 ทำได้ดี** — ลูกน้องที่เด่น, สาขาคะแนนสูง
3. **⚠️ จุดเสี่ยง** — ใครยังตามไม่ทัน, สาขาคะแนนต่ำ, เลยกำหนดไหม
4. **🎯 Recommendation** — หัวหน้าควรดูแลอะไรต่อ (action items)`

  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: sys,
      messages: [{ role: "user", content: userMsg }],
    })
    const summary = resp.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n")
    return NextResponse.json({ summary, stats: ctx.stats })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI error" }, { status: 500 })
  }
}
