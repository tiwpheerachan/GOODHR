import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" })

// POST — AI สรุปภาพรวมการประเมิน
//   body: { branch_id?: string, days?: number, evaluator_id?: string }
//   ถ้าระบุ branch_id → focus เฉพาะสาขา, ไม่ระบุ → ทั้งระบบ
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "เฉพาะ admin หรือ supervisor" }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า AI (ANTHROPIC_API_KEY)" }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const days = Math.max(7, Math.min(365, Number(body.days) || 90))
  const branchId: string | undefined = body.branch_id
  const evaluatorId: string | undefined = body.evaluator_id
  const evaluationId: string | undefined = body.evaluation_id

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  // ── โหมดพิเศษ: วิเคราะห์ฟอร์มเดียว (per-evaluation) ──
  if (evaluationId) {
    return await analyzeOneEvaluation(svc, evaluationId)
  }

  // ── 1. ดึง evaluations ในช่วงเวลา (filter ตาม branch/evaluator ถ้าระบุ) ──
  let q = svc.from("branch_evaluations")
    .select(`id, visit_date, status, percentage, total_score, total_weight,
      general_notes, action_plan, reviewer_notes, checkin_at, checkin_distance_m,
      branch:branches(id, name, code),
      template:branch_eval_templates(id, name),
      evaluator:employees!branch_evaluations_evaluator_id_fkey(id, first_name_th, last_name_th, nickname)`)
    .gte("visit_date", cutoffDate)
    .neq("status", "draft")
    .is("deleted_at", null)
    .order("visit_date", { ascending: false })

  if (branchId) q = q.eq("branch_id", branchId)
  if (evaluatorId) q = q.eq("evaluator_id", evaluatorId)

  const { data: evals, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!evals || evals.length === 0) {
    return NextResponse.json({
      summary: "ไม่มีข้อมูลการประเมินในช่วงนี้ — ลองขยายช่วงเวลาหรือเลือกสาขาอื่น",
      stats: { n: 0 },
    })
  }

  // ── 2. ดึง answers เพื่อหา item ที่ตกบ่อยสุด ──
  const evalIds = evals.map((e: any) => e.id)
  const { data: answers } = await svc.from("branch_evaluation_answers")
    .select("evaluation_id, item_id, is_pass, note, earned_weight")
    .in("evaluation_id", evalIds)

  // pull items info สำหรับ template เดียวกัน (assumption: เทมเพลตเดียว, ใช้กับสาขาเดียวกัน)
  const templateIds = Array.from(new Set(evals.map((e: any) => e.template?.id).filter(Boolean)))
  const { data: items } = templateIds.length > 0
    ? await svc.from("branch_eval_template_items")
        .select("id, template_id, code, question_th, weight, is_section")
        .in("template_id", templateIds)
    : { data: [] }

  // ── 3. คำนวณ aggregates ──
  const itemMap = new Map<string, any>((items ?? []).map((i: any) => [i.id, i]))
  const itemStats = new Map<string, { code: string; question: string; weight: number; passes: number; fails: number; notes: string[] }>()
  for (const a of (answers ?? []) as any[]) {
    const it = itemMap.get(a.item_id)
    if (!it || it.is_section) continue
    const cur = itemStats.get(a.item_id) ?? {
      code: it.code, question: it.question_th, weight: Number(it.weight) || 0,
      passes: 0, fails: 0, notes: [] as string[],
    }
    if (a.is_pass === true) cur.passes++
    else if (a.is_pass === false) cur.fails++
    if (a.note && cur.notes.length < 5) cur.notes.push(a.note)
    itemStats.set(a.item_id, cur)
  }
  const itemsRanked = Array.from(itemStats.values())
    .map(v => ({ ...v, failRate: v.passes + v.fails > 0 ? v.fails / (v.passes + v.fails) : 0, total: v.passes + v.fails }))
    .sort((a, b) => b.failRate - a.failRate)

  const topFailItems = itemsRanked.filter(i => i.fails > 0).slice(0, 10)
  const topPassItems = itemsRanked.filter(i => i.passes > 0).sort((a, b) => (b.passes / b.total) - (a.passes / a.total)).slice(0, 5)

  // by branch
  const byBranch = new Map<string, { name: string; code: string; scores: number[]; visits: number }>()
  for (const e of evals as any[]) {
    if (!e.branch?.id) continue
    const cur = byBranch.get(e.branch.id) ?? { name: e.branch.name, code: e.branch.code, scores: [] as number[], visits: 0 }
    cur.scores.push(Number(e.percentage))
    cur.visits++
    byBranch.set(e.branch.id, cur)
  }
  const branchSummary = Array.from(byBranch.values())
    .map(v => ({ ...v, avg: v.scores.reduce((s, x) => s + x, 0) / v.scores.length }))
    .sort((a, b) => b.avg - a.avg)

  const overallAvg = evals.reduce((s: number, e: any) => s + Number(e.percentage), 0) / evals.length
  const minScore = Math.min(...evals.map((e: any) => Number(e.percentage)))
  const maxScore = Math.max(...evals.map((e: any) => Number(e.percentage)))

  // ── 4. สร้าง context สำหรับ Claude ──
  const focus = branchId ? `**สาขา ${branchSummary[0]?.name ?? ""}** (${days} วันย้อนหลัง)` : `**ทั้งระบบ** (${days} วันย้อนหลัง)`
  const ctx = `
ข้อมูลการประเมิน${focus}
- จำนวนฟอร์มทั้งหมด: ${evals.length}
- คะแนนเฉลี่ย: ${overallAvg.toFixed(2)}%
- คะแนน ต่ำสุด/สูงสุด: ${minScore.toFixed(0)}% / ${maxScore.toFixed(0)}%
- รีวิวแล้ว: ${evals.filter((e: any) => e.status === "reviewed").length}/${evals.length}

${!branchId ? `Top 5 สาขาคะแนนสูงสุด:
${branchSummary.slice(0, 5).map((b, i) => `${i + 1}. ${b.name} (${b.code}) — ${b.avg.toFixed(1)}% · ${b.visits} ครั้ง`).join("\n")}

Bottom 5 สาขาต้องดูแล:
${branchSummary.slice(-5).reverse().map((b, i) => `${i + 1}. ${b.name} (${b.code}) — ${b.avg.toFixed(1)}% · ${b.visits} ครั้ง`).join("\n")}
` : ""}

ข้อที่ตกบ่อยสุด (ปัญหาหลัก):
${topFailItems.length === 0 ? "ไม่มี — ผ่านทุกข้อ ✓" : topFailItems.map((i, idx) =>
  `${idx + 1}. ข้อ ${i.code}: "${i.question}" — ตก ${i.fails}/${i.total} ครั้ง (${(i.failRate * 100).toFixed(0)}%) · น้ำหนัก ${i.weight}p${
    i.notes.length > 0 ? `\n   หมายเหตุที่ผู้ตรวจให้: ${i.notes.slice(0, 3).map(n => `"${n.slice(0, 100)}"`).join(", ")}` : ""
  }`,
).join("\n")}

ข้อที่ผ่านสม่ำเสมอ (จุดแข็ง):
${topPassItems.slice(0, 5).map((i, idx) =>
  `${idx + 1}. ข้อ ${i.code}: "${i.question}" — ผ่าน ${i.passes}/${i.total} (${((i.passes / i.total) * 100).toFixed(0)}%)`,
).join("\n")}

หมายเหตุทั่วไป + Action Plan จากผู้ตรวจ:
${evals.slice(0, 10).filter((e: any) => e.general_notes || e.action_plan).map((e: any) =>
  `- ${e.branch?.name} (${e.visit_date}): ${e.general_notes || "—"}${e.action_plan ? ` | Plan: ${e.action_plan}` : ""}`
).join("\n") || "—"}
`.trim()

  const systemPrompt = `คุณเป็นที่ปรึกษาธุรกิจค้าปลีก (Retail Operations Consultant) ที่มีประสบการณ์ยาวนาน คุยกับเจ้าของกิจการเหมือนคุยกับเพื่อนร่วมงานที่ไว้ใจได้ ไม่ใช่บอท

กฎสำคัญ:
- เขียนภาษาไทยเป็นธรรมชาติ เหมือนคนคุยกัน ไม่ใช่รายงานราชการ
- ห้ามใช้ ** หรือ __ หรือเครื่องหมายเน้นข้อความใดๆ
- ห้ามใช้ # หรือหัวข้อแบบ markdown
- แบ่งย่อหน้าด้วยการเว้นบรรทัด ใช้คำเชื่อมแทนหัวข้อ (เช่น "ส่วนเรื่อง...", "ที่น่าสนใจคือ...", "ถ้าจะให้คำแนะนำ...")
- ใช้ตัวเลขจริงจากข้อมูลเสมอ อย่าประดิษฐ์
- ห้ามขึ้นต้นด้วย "จากข้อมูลที่ให้มา" / "ฉันคิดว่า" / "ผมขอวิเคราะห์"
- ใช้ bullet เฉพาะเมื่อจำเป็น (เช่น สรุปข้อเสนอแนะหลายข้อ) — ใช้ • นำหน้า

โครงสร้างที่อยากให้ตอบ (เขียนเป็นข้อความต่อเนื่อง ไม่ต้องใส่หัวข้อ):

ย่อหน้า 1: ภาพรวมตัวเลข — คะแนนเฉลี่ยเท่าไร เทียบกับมาตรฐานที่ควรเป็น (>=80% ดี / 60-80% ปานกลาง / <60% น่ากังวล) ระบุสาขาที่เด่นและสาขาที่ห่วง

ย่อหน้า 2: insight ที่ค้นพบ — ข้อไหนตกบ่อยสุด แสดง pattern ที่เห็น (เช่น "หลายสาขาตกข้อเดียวกัน = ปัญหาเชิงระบบ ไม่ใช่สาขาใครสาขาคนเดียว")

ย่อหน้า 3: ที่มาของปัญหา (root cause) — วิเคราะห์ว่าทำไมถึงตก (อาจเป็น training, manual, incentive, time pressure)

ย่อหน้า 4: ข้อเสนอแนะเชิงธุรกิจ — แบ่งเป็น quick wins (ทำได้ใน 1-2 สัปดาห์) กับ long-term (1-3 เดือน) ระบุ owner ที่เหมาะ (HR / Operations / Store Manager) และ KPI ที่ใช้วัด

ย่อหน้า 5: ข้อมูลที่ควรเก็บเพิ่ม / กราฟที่ควรดูต่อ — แนะนำว่าควรเปิดดูกราฟ trend สัปดาห์ไหน, branch ranking, หรือดู audit รายข้อในระดับลึก

ความยาวรวม: 350-500 คำ — กระชับ ตรงประเด็น พูดแบบมีน้ำหนัก ไม่ขายฝัน

ตัวอย่างน้ำเสียง:
"คะแนนเฉลี่ย 73% บ่งบอกว่าโดยรวมพอใช้ได้ แต่ยังห่างจากระดับที่ควรเป็น สาขา A ทำได้ 91% ขณะที่ B แค่ 58% — gap 33% นี่เป็นช่องว่างที่ใหญ่เกินไป ต้องเข้าไปดูว่ามันคืออะไร..."`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: ctx }],
    })
    const text = response.content.find((b: any) => b.type === "text") as { text: string } | undefined
    return NextResponse.json({
      summary: text?.text ?? "ไม่สามารถสรุปได้",
      stats: {
        n: evals.length,
        avg: Number(overallAvg.toFixed(2)),
        min: Number(minScore.toFixed(2)),
        max: Number(maxScore.toFixed(2)),
        branches: branchSummary.length,
      },
      charts: {
        // กราฟแท่ง: top fail items (top 8) — ระบุข้อ + อัตราตก
        top_fail_items: topFailItems.slice(0, 8).map(i => ({
          label: `ข้อ ${i.code}`,
          full_label: i.question,
          value: Number((i.failRate * 100).toFixed(1)),  // % ตก
          sub: `${i.fails}/${i.total} ครั้ง`,
        })),
        // กราฟแท่ง: top branches (สูงสุด 5) + bottom branches (ต่ำสุด 5) — แสดงร่วมกัน
        branch_ranking: branchSummary.slice(0, 8).map(b => ({
          label: b.name,
          value: Number(b.avg.toFixed(1)),
          sub: `${b.visits} ครั้ง`,
        })),
        branch_bottom: branchSummary.slice(-5).reverse().map(b => ({
          label: b.name,
          value: Number(b.avg.toFixed(1)),
          sub: `${b.visits} ครั้ง`,
        })),
        // คะแนนเฉลี่ยรายผู้ตรวจ — ดู bias ของแต่ละคน
        // (skip ถ้า focus branch เดียวเพราะข้อมูลน้อย)
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════
// Per-evaluation analysis — focus single form
// ════════════════════════════════════════════════════════════════════
async function analyzeOneEvaluation(svc: any, evaluationId: string): Promise<NextResponse> {
  const { data: ev } = await svc.from("branch_evaluations")
    .select(`*,
      branch:branches(name, code, company:companies(name_th)),
      template:branch_eval_templates(name),
      evaluator:employees!branch_evaluations_evaluator_id_fkey(first_name_th, last_name_th, nickname)`)
    .eq("id", evaluationId).maybeSingle()
  if (!ev) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })

  const [{ data: items }, { data: answers }] = await Promise.all([
    svc.from("branch_eval_template_items")
      .select("id, code, question_th, weight, is_section, sub_notes")
      .eq("template_id", ev.template_id).order("order_no"),
    svc.from("branch_evaluation_answers")
      .select("item_id, is_pass, earned_weight, note, answer_value")
      .eq("evaluation_id", evaluationId),
  ])

  const ansMap = new Map<string, any>((answers ?? []).map((a: any) => [a.item_id, a]))
  const realItems = (items ?? []).filter((i: any) => !i.is_section)
  const passed = realItems.filter((i: any) => ansMap.get(i.id)?.is_pass === true)
  const failed = realItems.filter((i: any) => ansMap.get(i.id)?.is_pass === false)
  const notAnswered = realItems.filter((i: any) => !ansMap.has(i.id))

  // Build per-item context สำหรับ AI
  const failDetails = failed.map((i: any) => {
    const a = ansMap.get(i.id)
    return `- ข้อ ${i.code}: ${i.question_th} (น้ำหนัก ${i.weight}p)${a?.note ? `\n  หมายเหตุผู้ตรวจ: "${a.note}"` : ""}`
  }).join("\n")

  const passDetails = passed.slice(0, 8).map((i: any) =>
    `- ข้อ ${i.code}: ${i.question_th} (${i.weight}p)`
  ).join("\n")

  const ctx = `ข้อมูลฟอร์มเดียว
สาขา: ${ev.branch?.name} (${ev.branch?.code})${ev.branch?.company?.name_th ? ` · ${ev.branch.company.name_th}` : ""}
เทมเพลต: ${ev.template?.name}
ผู้ตรวจ: ${ev.evaluator ? `${ev.evaluator.first_name_th} ${ev.evaluator.last_name_th}` : "—"}
วันที่ตรวจ: ${ev.visit_date}
สถานะ: ${ev.status}
คะแนนรวม: ${Number(ev.percentage).toFixed(1)}% (${ev.total_score}/${ev.total_weight})
จำนวนข้อ: ${realItems.length} (ผ่าน ${passed.length} ตก ${failed.length} ยังไม่ตอบ ${notAnswered.length})

ข้อที่ตก (ปัญหา):
${failDetails || "— ไม่มี"}

ข้อที่ผ่านเด่น:
${passDetails || "— ไม่มี"}

หมายเหตุผู้ตรวจ (ทั่วไป): ${ev.general_notes || "—"}
Action Plan ที่ผู้ตรวจระบุ: ${ev.action_plan || "—"}
Reviewer Notes: ${ev.reviewer_notes || "—"}
${ev.checkin_at ? `Check-in: ${new Date(ev.checkin_at).toLocaleString("th-TH")} · ห่างจากสาขา ${ev.checkin_distance_m ?? "ไม่ทราบ"} m` : "ไม่ได้เช็คอิน"}`

  const systemPrompt = `คุณเป็นที่ปรึกษาธุรกิจค้าปลีก คุยกับผู้จัดการสาขาเหมือนคุยกับเพื่อนร่วมงาน

กฎสำคัญ:
- เขียนภาษาไทยเป็นธรรมชาติ ไม่ใช้ ** หรือ __ หรือ # หัวข้อ
- ห้ามใช้ markdown bold/heading
- ใช้ตัวเลขจริงจากข้อมูลเสมอ
- ห้ามขึ้นต้นด้วย "จากข้อมูลที่ให้มา" หรือ "ฉันคิดว่า"
- ใช้ bullet (•) เฉพาะเมื่อจำเป็น

วิเคราะห์ฟอร์มเดียวแบบกระชับ 250-400 คำ — เขียนเป็นย่อหน้าต่อเนื่อง:

ย่อหน้า 1: ภาพรวมว่าฟอร์มนี้คะแนนเท่าไร ผ่านกี่ข้อ ตกกี่ข้อ — เทียบมาตรฐาน (>=80% ดี / 60-80% ปานกลาง / <60% น่ากังวล)

ย่อหน้า 2: ข้อที่ตก — วิเคราะห์ว่ามันเป็น pattern อะไร (training? operations? merchandising? customer service?) อ้างข้อตรงๆ ที่ตก

ย่อหน้า 3: ข้อเสนอแนะให้สาขานี้แก้ — แบ่ง quick wins (ทำเลย) กับสิ่งที่ต้องวางแผน ระบุชัดว่าใครต้อง action

ย่อหน้า 4: ข้อสังเกต — ถ้ามีหมายเหตุผู้ตรวจที่น่าสนใจ หรือมี check-in ไกลจากสาขาผิดปกติ พูดถึง

ปิดท้าย: สรุปสั้นๆ ว่าสาขานี้ควร focus อะไรในรอบหน้า`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: ctx }],
    })
    const text = response.content.find((b: any) => b.type === "text") as { text: string } | undefined

    return NextResponse.json({
      summary: text?.text ?? "ไม่สามารถสรุปได้",
      stats: {
        n: 1,
        avg: Number(Number(ev.percentage).toFixed(2)),
        min: Number(Number(ev.percentage).toFixed(2)),
        max: Number(Number(ev.percentage).toFixed(2)),
        passed: passed.length,
        failed: failed.length,
        total_items: realItems.length,
      },
      charts: {
        // bar chart รายข้อที่ตกในฟอร์มนี้
        top_fail_items: failed.slice(0, 10).map((i: any) => ({
          label: `ข้อ ${i.code}`,
          full_label: i.question_th,
          value: Number(i.weight) || 0,
          sub: ansMap.get(i.id)?.note ? "มี note" : "ไม่มี note",
        })),
        // empty branch ranking (single eval)
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 })
  }
}
