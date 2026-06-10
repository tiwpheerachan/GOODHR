import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// POST /api/branch-eval/chat/attachments
//   body: { scope: { type, id? } }
//   → ตอบ chart data + xlsx rows ตาม scope
//   → frontend ใช้ render chart + ปุ่มดาวน์โหลด xlsx
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  if (!access.isEvalAdmin && !access.isSupervisor && !access.evaluatorBranchIds?.length) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const scope = body.scope ?? { type: "system" }

  try {
    if (scope.type === "assignment" && scope.id) return NextResponse.json(await buildAssignmentAttachments(svc, scope.id, access))
    if (scope.type === "evaluation" && scope.id) return NextResponse.json(await buildEvaluationAttachments(svc, scope.id, access))
    if (scope.type === "supervisor" && scope.id) return NextResponse.json(await buildSupervisorAttachments(svc, scope.id, access))
    return NextResponse.json(await buildSystemAttachments(svc, access))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Build attachments error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// Assignment attachments — chart progress + xlsx targets
// ─────────────────────────────────────────────────────────
async function buildAssignmentAttachments(svc: any, asgId: string, _access: any) {
  const { data: asg } = await svc.from("branch_eval_assignments")
    .select("id, title, due_date, template:branch_eval_templates(name)")
    .eq("id", asgId).maybeSingle()
  if (!asg) throw new Error("ไม่พบการบ้าน")

  const { data: tgs } = await svc.from("branch_eval_assignment_targets")
    .select(`*,
      assignee:employees!branch_eval_assignment_targets_assignee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code),
      branch:branches(name, code),
      template:branch_eval_templates(name),
      evaluation:branch_evaluations(percentage)`)
    .eq("assignment_id", asgId)
  const targets: any[] = tgs ?? []

  // Per-assignee chart
  type Group = { name: string; total: number; done: number; pcts: number[] }
  const byA = new Map<string, Group>()
  for (const t of targets) {
    const k = t.assignee_id
    const cur = byA.get(k) ?? {
      name: `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th?.[0] || ""}.`,
      total: 0, done: 0, pcts: [] as number[],
    }
    cur.total++
    if (t.completed_at) {
      cur.done++
      if (t.evaluation?.percentage != null) cur.pcts.push(Number(t.evaluation.percentage))
    }
    byA.set(k, cur)
  }

  const chart = {
    title: `ความคืบหน้าแต่ละคน — "${asg.title}"`,
    type: "bar" as const,
    unit: "%" as const,
    data: Array.from(byA.values())
      .sort((a, b) => (b.done/b.total) - (a.done/a.total))
      .map(g => ({
        label: g.name,
        value: g.total > 0 ? (g.done/g.total)*100 : 0,
        sub: `${g.done}/${g.total}${g.pcts.length > 0 ? ` · เฉลี่ย ${(g.pcts.reduce((s, x) => s + x, 0)/g.pcts.length).toFixed(0)}%` : ""}`,
        color: g.done === g.total && g.total > 0 ? "emerald" : "orange",
      })),
  }

  const rows = targets.map(t => ({
    "ลูกน้อง": `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th || ""}`,
    "รหัส": t.assignee?.employee_code || "",
    "สาขา": t.branch?.name || "",
    "รหัสสาขา": t.branch?.code || "",
    "Template": t.template?.name || "",
    "สถานะ": t.completed_at ? "เสร็จ" : "รอทำ",
    "วันที่เสร็จ": t.completed_at ? t.completed_at.slice(0, 16).replace("T", " ") : "",
    "คะแนน%": t.evaluation?.percentage != null ? Number(t.evaluation.percentage).toFixed(1) : "",
  }))

  return {
    summary: {
      title: asg.title,
      sub: `${asg.template?.name || ""}${asg.due_date ? ` · ครบ ${asg.due_date}` : ""}`,
      total: targets.length,
      done: targets.filter(t => t.completed_at).length,
    },
    chart,
    xlsx: {
      filename: `assignment_${asg.title.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{ name: "ทุก target", rows }],
    },
  }
}

// ─────────────────────────────────────────────────────────
// Evaluation attachments — chart section scores + xlsx items
// ─────────────────────────────────────────────────────────
async function buildEvaluationAttachments(svc: any, evalId: string, _access: any) {
  const { data: ev } = await svc.from("branch_evaluations")
    .select(`*,
      branch:branches(name, code),
      template:branch_eval_templates(id, name)`)
    .eq("id", evalId).is("deleted_at", null).maybeSingle()
  if (!ev) throw new Error("ไม่พบฟอร์ม")

  const { data: items } = ev.template?.id
    ? await svc.from("branch_eval_template_items")
        .select("id, code, question_th, weight, is_section, section_id, order_index")
        .eq("template_id", ev.template.id)
        .order("order_index", { ascending: true })
    : { data: [] as any[] }
  const { data: answers } = await svc.from("branch_evaluation_answers")
    .select("item_id, is_pass, earned_weight, note")
    .eq("evaluation_id", evalId)

  const ansMap = new Map<string, any>((answers ?? []).map((a: any) => [a.item_id, a]))
  const itemList = items ?? []

  // Pass/Fail/Not-answered distribution
  const stats = { passed: 0, failed: 0, notAns: 0 }
  for (const it of itemList) {
    if (it.is_section) continue
    const a = ansMap.get(it.id)
    if (!a) stats.notAns++
    else if (a.is_pass === true) stats.passed++
    else if (a.is_pass === false) stats.failed++
  }

  const chart = {
    title: `สรุปข้อ — "${ev.branch?.name}"`,
    type: "donut" as const,
    unit: "ข้อ" as const,
    data: [
      { label: "ผ่าน", value: stats.passed, color: "emerald" },
      { label: "ตก", value: stats.failed, color: "rose" },
      { label: "ยังไม่ตอบ", value: stats.notAns, color: "slate" },
    ].filter(d => d.value > 0),
  }

  const rows = itemList.filter((it: any) => !it.is_section).map((it: any) => {
    const a = ansMap.get(it.id)
    return {
      "รหัสข้อ": it.code || "",
      "คำถาม": it.question_th || "",
      "น้ำหนัก": it.weight ?? "",
      "สถานะ": a == null ? "ยังไม่ตอบ" : a.is_pass ? "ผ่าน" : "ตก",
      "ได้คะแนน": a?.earned_weight ?? "",
      "หมายเหตุ": a?.note || "",
    }
  })

  return {
    summary: {
      title: ev.branch?.name,
      sub: `${ev.template?.name} · ${ev.visit_date}${ev.percentage != null ? ` · ${Number(ev.percentage).toFixed(1)}%` : ""}`,
      total: itemList.filter((it: any) => !it.is_section).length,
      done: stats.passed + stats.failed,
    },
    chart,
    xlsx: {
      filename: `eval_${ev.branch?.code || "form"}_${ev.visit_date}.xlsx`,
      sheets: [{ name: "รายข้อ", rows }],
    },
  }
}

// ─────────────────────────────────────────────────────────
// Supervisor attachments — chart per assignment + xlsx
// ─────────────────────────────────────────────────────────
async function buildSupervisorAttachments(svc: any, supId: string, access: any) {
  if (!access.isEvalAdmin) throw new Error("เฉพาะ admin ดูได้")
  const { data: sup } = await svc.from("employees")
    .select("first_name_th, last_name_th, nickname")
    .eq("id", supId).maybeSingle()
  if (!sup) throw new Error("ไม่พบหัวหน้า")

  const { data: asgs } = await svc.from("branch_eval_assignments")
    .select(`id, title, due_date, template:branch_eval_templates(name)`)
    .eq("assigned_by", supId)
    .order("created_at", { ascending: false })
  const asgIds = (asgs ?? []).map((a: any) => a.id)

  let tgs: any[] = []
  if (asgIds.length > 0) {
    const { data } = await svc.from("branch_eval_assignment_targets")
      .select("assignment_id, completed_at, evaluation:branch_evaluations(percentage)")
      .in("assignment_id", asgIds)
    tgs = data ?? []
  }

  type StatRow = { title: string; template: string | null; due_date: string | null; total: number; done: number; avg: number | null }
  const stats: StatRow[] = (asgs ?? []).map((a: any) => {
    const my = tgs.filter((t: any) => t.assignment_id === a.id)
    const done = my.filter((t: any) => t.completed_at).length
    const scored = my.filter((t: any) => t.evaluation?.percentage != null)
    const avg = scored.length > 0 ? scored.reduce((s: number, t: any) => s + Number(t.evaluation.percentage), 0)/scored.length : null
    return { title: a.title, template: a.template?.name ?? null, due_date: a.due_date ?? null, total: my.length, done, avg }
  })

  const chart = {
    title: `งานของ ${sup.first_name_th} ${sup.last_name_th}`,
    type: "bar" as const,
    unit: "%" as const,
    data: stats.map(s => ({
      label: s.title.slice(0, 20),
      value: s.total > 0 ? (s.done/s.total)*100 : 0,
      sub: `${s.done}/${s.total}${s.avg != null ? ` · ${s.avg.toFixed(0)}%` : ""}`,
      color: s.done === s.total && s.total > 0 ? "emerald" : "orange",
    })),
  }

  const rows = stats.map(s => ({
    "การบ้าน": s.title,
    "Template": s.template || "",
    "ครบกำหนด": s.due_date || "",
    "งานทั้งหมด": s.total,
    "เสร็จ": s.done,
    "ความคืบหน้า%": s.total > 0 ? ((s.done/s.total)*100).toFixed(0) : "0",
    "คะแนนเฉลี่ย%": s.avg != null ? s.avg.toFixed(1) : "",
  }))

  return {
    summary: {
      title: `${sup.first_name_th} ${sup.last_name_th}${sup.nickname ? ` (${sup.nickname})` : ""}`,
      sub: `${stats.length} การบ้าน`,
      total: stats.length,
      done: stats.filter(s => s.done === s.total && s.total > 0).length,
    },
    chart,
    xlsx: {
      filename: `supervisor_${sup.first_name_th}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{ name: "การบ้าน", rows }],
    },
  }
}

// ─────────────────────────────────────────────────────────
// System attachments — top/bottom branches + xlsx
// ─────────────────────────────────────────────────────────
async function buildSystemAttachments(svc: any, access: any) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  let q = svc.from("branch_evaluations")
    .select(`id, visit_date, status, percentage,
      branch:branches(id, name, code),
      template:branch_eval_templates(name),
      evaluator:employees!branch_evaluations_evaluator_id_fkey(first_name_th, last_name_th),
      target_manager:employees!branch_evaluations_target_manager_id_fkey(first_name_th, last_name_th),
      evaluatee:employees!branch_evaluations_evaluatee_id_fkey(first_name_th, last_name_th)`)
    .gte("visit_date", cutoffDate)
    .neq("status", "draft").is("deleted_at", null)
    .order("visit_date", { ascending: false }).limit(500)
  if (!access.isEvalAdmin && access.supervisorBranchIds?.length) q = q.in("branch_id", access.supervisorBranchIds)
  else if (!access.isEvalAdmin) q = q.eq("evaluator_id", access.employeeId)

  const { data: evals } = await q
  const evList: any[] = evals ?? []

  // Top/bottom branches by avg
  const branchAvg = new Map<string, { name: string; count: number; sum: number }>()
  for (const e of evList) {
    const k = e.branch?.id; if (!k) continue
    const pct = Number(e.percentage); if (!pct) continue
    const cur = branchAvg.get(k) ?? { name: e.branch.name, count: 0, sum: 0 }
    cur.count++; cur.sum += pct
    branchAvg.set(k, cur)
  }
  const ranked = Array.from(branchAvg.values()).map(v => ({ name: v.name, avg: v.sum/v.count, n: v.count }))
    .sort((a, b) => b.avg - a.avg)
  const top = ranked.slice(0, 5).map(r => ({ label: r.name.slice(0, 24), value: r.avg, sub: `เฉลี่ย · ${r.n} ครั้ง`, color: "emerald" as const }))
  const bot = ranked.slice(-5).reverse().map(r => ({ label: r.name.slice(0, 24), value: r.avg, sub: `เฉลี่ย · ${r.n} ครั้ง`, color: "rose" as const }))

  const chart = {
    title: "Top 5 & Bottom 5 สาขา (60 วัน)",
    type: "bar" as const,
    unit: "%" as const,
    data: [...top, ...bot],
  }

  const rows = evList.map((e: any) => ({
    "สาขา": e.branch?.name || "",
    "รหัสสาขา": e.branch?.code || "",
    "Template": e.template?.name || "",
    "วันที่": e.visit_date,
    "สถานะ": e.status,
    "คะแนน%": e.percentage != null ? Number(e.percentage).toFixed(1) : "",
    "ผู้กรอก": e.evaluator ? `${e.evaluator.first_name_th} ${e.evaluator.last_name_th}` : "",
    "ส่งถึง": e.target_manager ? `${e.target_manager.first_name_th} ${e.target_manager.last_name_th}` : "",
    "ประเมิน": e.evaluatee ? `${e.evaluatee.first_name_th} ${e.evaluatee.last_name_th}` : "",
  }))

  return {
    summary: {
      title: "ภาพรวมระบบประเมินสาขา",
      sub: `60 วันล่าสุด · ${evList.length} ฟอร์ม · ${ranked.length} สาขา`,
      total: evList.length,
      done: evList.filter(e =>
        e.status === "reviewed" || e.status === "approved" || e.status === "rejected"
      ).length,
    },
    chart,
    xlsx: {
      filename: `branch_eval_summary_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{ name: "ทุกฟอร์ม", rows }],
    },
  }
}
