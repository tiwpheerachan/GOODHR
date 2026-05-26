import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel, getChannelReadFilter } from "@/lib/utils/training-permissions"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" })

// POST /api/training/ai-summary
//   body: { course_id: string, enrollment_id?: string }
//   - course_id only → AI สรุปทั้งคอร์ส
//   - + enrollment_id → focus ลูกทีมคนเดียว
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY" }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const courseId = body.course_id as string | undefined
  const enrollmentId = body.enrollment_id as string | undefined
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })

  // ── permission check ──
  const { data: course } = await svc.from("training_courses")
    .select("id, title, channel_id, passing_score").eq("id", courseId).maybeSingle()
  if (!course) return NextResponse.json({ error: "ไม่พบคอร์ส" }, { status: 404 })

  const readFilter = await getChannelReadFilter(svc, access, course.channel_id)
  if (!readFilter.allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูคอร์สนี้" }, { status: 403 })

  // ── modes ──
  if (enrollmentId) {
    return await analyzeOneEnrollment(svc, courseId, enrollmentId)
  }
  return await analyzeWholeCourse(svc, courseId, course, readFilter)
}

// ════════════════════════════════════════════════════════════════════
// Mode 1: วิเคราะห์ทั้งคอร์ส — สำหรับ admin/manager ดูทีม
// ════════════════════════════════════════════════════════════════════
async function analyzeWholeCourse(svc: any, courseId: string, course: any, readFilter: any): Promise<NextResponse> {
  // pull enrollments + modules + quizzes + attempts
  let eq = svc.from("training_enrollments")
    .select(`id, employee_id, status, progress_pct, final_score, last_accessed_at, enrolled_at, completed_at,
      employee:employees!training_enrollments_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, department:departments(name), position:positions(name))`)
    .eq("course_id", courseId)

  if (readFilter.filterEmployeeIds && readFilter.filterEmployeeIds.length > 0) {
    eq = eq.in("employee_id", readFilter.filterEmployeeIds)
  } else if (readFilter.filterEmployeeIds && readFilter.filterEmployeeIds.length === 0) {
    return NextResponse.json({ summary: "ยังไม่มีลูกทีมในขอบเขต", stats: { n: 0 } })
  }
  const { data: enrollments } = await eq

  const enrIds = (enrollments ?? []).map((e: any) => e.id)
  const [{ data: attempts }, { data: modules }, { data: quizzes }] = await Promise.all([
    svc.from("training_quiz_attempts")
      .select("enrollment_id, quiz_id, attempt_no, score, passed, tab_switches, submitted_at")
      .in("enrollment_id", enrIds.length > 0 ? enrIds : ["00000000-0000-0000-0000-000000000000"]),
    svc.from("training_modules")
      .select("id, title, order_no, video_duration_sec, required_watch_pct")
      .eq("course_id", courseId).order("order_no"),
    svc.from("training_quizzes")
      .select("id, title, module_id, passing_score, question_count")
      .eq("course_id", courseId),
  ])

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ summary: "ยังไม่มีลูกทีมลงทะเบียนคอร์สนี้", stats: { n: 0 } })
  }

  // aggregates
  const total = enrollments.length
  const completed = enrollments.filter((e: any) => e.status === "completed").length
  const inProgress = enrollments.filter((e: any) => e.status === "in_progress").length
  const notStarted = enrollments.filter((e: any) => e.status === "not_started").length
  const failed = enrollments.filter((e: any) => e.status === "failed").length

  const scoredEnrollments = enrollments.filter((e: any) => e.final_score != null)
  const avgScore = scoredEnrollments.length > 0
    ? scoredEnrollments.reduce((s: number, e: any) => s + Number(e.final_score), 0) / scoredEnrollments.length
    : 0

  // best attempt per (enrollment, quiz)
  const bestAttempts = new Map<string, any>()
  for (const a of (attempts ?? [])) {
    const key = `${a.enrollment_id}-${a.quiz_id}`
    const cur = bestAttempts.get(key)
    if (!cur || a.score > cur.score) bestAttempts.set(key, a)
  }

  // per-employee summary
  type Emp = {
    id: string; name: string; nickname: string; code: string
    dept: string; position: string; status: string
    progress: number; score: number; avgQuiz: number
    attempts: number; tabSwitches: number; lastAccess: string | null
  }
  const employees: Emp[] = enrollments.map((e: any) => {
    const empAttempts = Array.from(bestAttempts.values()).filter(a => a.enrollment_id === e.id)
    const avgQuiz = empAttempts.length > 0
      ? empAttempts.reduce((s: number, a: any) => s + Number(a.score), 0) / empAttempts.length
      : 0
    const totalTabSwitches = (attempts ?? []).filter((a: any) => a.enrollment_id === e.id)
      .reduce((s: number, a: any) => s + (a.tab_switches || 0), 0)
    const totalAttempts = (attempts ?? []).filter((a: any) => a.enrollment_id === e.id).length
    return {
      id: e.id,
      name: e.employee ? `${e.employee.first_name_th} ${e.employee.last_name_th}` : "—",
      nickname: e.employee?.nickname ?? "",
      code: e.employee?.employee_code ?? "",
      dept: e.employee?.department?.name ?? "",
      position: e.employee?.position?.name ?? "",
      status: e.status,
      progress: Number(e.progress_pct) || 0,
      score: Number(e.final_score) || 0,
      avgQuiz: Number(avgQuiz.toFixed(1)),
      attempts: totalAttempts,
      tabSwitches: totalTabSwitches,
      lastAccess: e.last_accessed_at,
    }
  })

  // top performers
  const completedSorted = employees.filter(e => e.status === "completed").sort((a, b) => b.score - a.score)
  const topPerformers = completedSorted.slice(0, 5)

  // at-risk: not completed + low progress / failed
  const atRisk = employees.filter(e =>
    e.status === "failed"
    || (e.status === "in_progress" && e.progress < 30)
    || (e.status === "not_started" && new Date(enrollments.find((en: any) => en.id === e.id).enrolled_at).getTime() < Date.now() - 14 * 86400000)
  ).sort((a, b) => a.progress - b.progress).slice(0, 10)

  // tab-switch suspects
  const suspects = employees.filter(e => e.tabSwitches > 3).sort((a, b) => b.tabSwitches - a.tabSwitches).slice(0, 5)

  // hard quizzes — per quiz pass rate
  const quizStats = (quizzes ?? []).map((q: any) => {
    const qAtts = Array.from(bestAttempts.values()).filter((a: any) => a.quiz_id === q.id)
    const passed = qAtts.filter((a: any) => a.passed).length
    const avgQ = qAtts.length > 0 ? qAtts.reduce((s: number, a: any) => s + Number(a.score), 0) / qAtts.length : 0
    return { id: q.id, title: q.title, attempts: qAtts.length, passed, passRate: qAtts.length > 0 ? passed / qAtts.length : 0, avgScore: avgQ }
  }).filter((q: any) => q.attempts > 0).sort((a: any, b: any) => a.passRate - b.passRate)

  const ctx = `ข้อมูลคอร์ส "${course.title}" (${total} คนลงทะเบียน)

ภาพรวม
- จบ ${completed} · กำลังเรียน ${inProgress} · ยังไม่เริ่ม ${notStarted} · ตก ${failed}
- คะแนนเฉลี่ย ${avgScore.toFixed(1)}% (เกณฑ์ผ่าน ${course.passing_score}%)
- จำนวนโมดูล ${modules?.length ?? 0} · ควิซ ${quizzes?.length ?? 0}

Top performers (จบดี)
${topPerformers.map((e, i) => `${i + 1}. ${e.name}${e.nickname ? ` (${e.nickname})` : ""} — คะแนน ${e.score}% · ${e.dept} ${e.position}`).join("\n") || "— ยังไม่มีคนจบ"}

ลูกทีมที่น่ากังวล (at-risk)
${atRisk.map((e, i) => `${i + 1}. ${e.name}${e.nickname ? ` (${e.nickname})` : ""} — ${e.status} · progress ${e.progress.toFixed(0)}% · attempt ${e.attempts} ครั้ง · ${e.dept}`).join("\n") || "— ไม่มี"}

ควิซที่ผ่านยากสุด (ต่ำสุด 5 อันดับ)
${quizStats.slice(0, 5).map((q: any, i: number) => `${i + 1}. "${q.title}" — pass rate ${(q.passRate * 100).toFixed(0)}% · เฉลี่ย ${q.avgScore.toFixed(0)}% · ${q.attempts} attempts`).join("\n") || "— ไม่มีข้อมูล"}

${suspects.length > 0 ? `\nคนที่ tab-switch มาก (อาจมีพฤติกรรมโกง)
${suspects.map((e, i) => `${i + 1}. ${e.name} — ${e.tabSwitches} ครั้ง · attempt ${e.attempts}`).join("\n")}` : ""}`

  const systemPrompt = `คุณเป็นผู้จัดการฝ่ายพัฒนาบุคลากร (L&D Manager) คุยกับ HR หรือ manager เกี่ยวกับผลการเรียนของลูกทีม

กฎสำคัญ:
- ภาษาไทยเป็นธรรมชาติ ไม่ใช้ ** หรือ __ หรือ # หัวข้อ
- ห้ามใช้ markdown bold/heading
- ใช้ตัวเลขจริงจากข้อมูล อย่าประดิษฐ์
- ห้ามขึ้นต้นด้วย "จากข้อมูลที่ให้มา" / "ฉันคิดว่า"
- ใช้ bullet (•) เฉพาะเมื่อจำเป็น

วิเคราะห์ทีมแบบกระชับ 350-500 คำ เป็นย่อหน้าต่อเนื่อง:

ย่อหน้า 1: ภาพรวมความก้าวหน้าทีม — % จบ / กำลังเรียน / ยังไม่เริ่ม · คะแนนเฉลี่ย เทียบเกณฑ์ผ่าน · เร็วหรือช้ากว่าที่ควร

ย่อหน้า 2: ใครคือ top performers — เห็น pattern อะไร (เช่น แผนกไหน ตำแหน่งไหนเรียนดี) · ใช้สิ่งนี้เป็น case study ได้ไง

ย่อหน้า 3: ใครคือลูกทีมที่ต้องดูแล — แยกประเภท: not-started ที่ค้างนาน vs in-progress ที่ค้าง vs ตกซ้ำ · แนะนำ action ตามแต่ละกลุ่ม (เช่น nudge / 1-on-1 / re-train)

ย่อหน้า 4: ควิซข้อไหนยาก — ถ้า pass rate ต่ำมาก หลายคนตก = ปัญหาเนื้อหา/คำถาม ไม่ใช่ปัญหาคน · แนะนำให้ HR review

ย่อหน้า 5: ข้อเสนอแนะเชิง L&D — quick wins (1-2 สัปดาห์: เช่น reminder, study group) กับ long-term (1-3 เดือน: เช่น ปรับเนื้อหา, micro-learning)

ปิดท้าย: 1-2 ประโยคสรุปว่าคอร์สนี้อยู่ในสถานะอะไร (ดี/ปานกลาง/น่ากังวล) และควรทำอะไรต่อ`

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
        n: total,
        avg: Number(avgScore.toFixed(2)),
        completed, in_progress: inProgress, not_started: notStarted, failed,
        passing_score: course.passing_score,
      },
      charts: {
        top_performers: topPerformers.map(e => ({
          label: e.name + (e.nickname ? ` (${e.nickname})` : ""),
          full_label: `${e.dept} · ${e.position}`,
          value: e.score, sub: `attempt ${e.attempts}`,
        })),
        at_risk: atRisk.slice(0, 8).map(e => ({
          label: e.name + (e.nickname ? ` (${e.nickname})` : ""),
          full_label: `${e.status} · ${e.dept}`,
          value: e.progress, sub: e.lastAccess ? `เข้าล่าสุด ${new Date(e.lastAccess).toLocaleDateString("th-TH")}` : "ยังไม่เคยเข้า",
        })),
        hard_quizzes: quizStats.slice(0, 8).map((q: any) => ({
          label: q.title.length > 30 ? q.title.slice(0, 28) + "..." : q.title,
          full_label: q.title,
          value: Number((q.passRate * 100).toFixed(1)),
          sub: `${q.attempts} attempts`,
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════
// Mode 2: วิเคราะห์รายคน — สำหรับ manager focus 1 คน
// ════════════════════════════════════════════════════════════════════
async function analyzeOneEnrollment(svc: any, courseId: string, enrollmentId: string): Promise<NextResponse> {
  const { data: enrollment } = await svc.from("training_enrollments")
    .select(`*,
      employee:employees!training_enrollments_employee_id_fkey(first_name_th, last_name_th, nickname, employee_code, department:departments(name), position:positions(name)),
      course:training_courses(title, passing_score)`)
    .eq("id", enrollmentId).maybeSingle()
  if (!enrollment) return NextResponse.json({ error: "ไม่พบ enrollment" }, { status: 404 })

  const [{ data: attempts }, { data: progress }, { data: modules }, { data: quizzes }] = await Promise.all([
    svc.from("training_quiz_attempts")
      .select(`*, quiz:training_quizzes(title, passing_score, module_id)`)
      .eq("enrollment_id", enrollmentId).order("submitted_at"),
    svc.from("training_module_progress")
      .select(`*, module:training_modules(title, order_no, video_duration_sec)`)
      .eq("enrollment_id", enrollmentId),
    svc.from("training_modules").select("id, title, order_no").eq("course_id", courseId).order("order_no"),
    svc.from("training_quizzes").select("id, title, module_id").eq("course_id", courseId),
  ])

  const totalAtt = (attempts ?? []).length
  const passedAtt = (attempts ?? []).filter((a: any) => a.passed).length
  const avgScore = totalAtt > 0 ? (attempts ?? []).reduce((s: number, a: any) => s + Number(a.score), 0) / totalAtt : 0
  const bestScores: Record<string, number> = {}
  for (const a of (attempts ?? [])) {
    const k = a.quiz_id
    if (!bestScores[k] || a.score > bestScores[k]) bestScores[k] = Number(a.score)
  }
  const totalTabs = (attempts ?? []).reduce((s: number, a: any) => s + (a.tab_switches || 0), 0)

  const moduleProgressList = (progress ?? []).map((p: any) => ({
    title: p.module?.title ?? "",
    order: p.module?.order_no,
    watched: Number(p.watched_pct) || 0,
    completed: p.completed,
  })).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

  const empName = enrollment.employee
    ? `${enrollment.employee.first_name_th} ${enrollment.employee.last_name_th}${enrollment.employee.nickname ? ` (${enrollment.employee.nickname})` : ""}`
    : "ผู้เรียน"

  const attHistory = (attempts ?? []).map((a: any, i: number) =>
    `${i + 1}. "${a.quiz?.title}" — attempt ${a.attempt_no} · คะแนน ${a.score}% · ${a.passed ? "ผ่าน" : "ตก"} · tab-switch ${a.tab_switches || 0} ครั้ง`
  ).join("\n")

  const ctx = `ข้อมูลผู้เรียนเดี่ยว
ชื่อ: ${empName}
แผนก: ${enrollment.employee?.department?.name ?? "—"} · ตำแหน่ง: ${enrollment.employee?.position?.name ?? "—"}
คอร์ส: ${enrollment.course?.title}
สถานะ: ${enrollment.status} · progress ${Number(enrollment.progress_pct).toFixed(0)}%
คะแนนสุดท้าย: ${enrollment.final_score ?? "—"}% (เกณฑ์ผ่าน ${enrollment.course?.passing_score}%)
ลงทะเบียน: ${enrollment.enrolled_at?.slice(0, 10)} · เข้าครั้งล่าสุด: ${enrollment.last_accessed_at?.slice(0, 10) ?? "ไม่เคยเข้า"}

ผลควิซรวม: ${totalAtt} attempts · ผ่าน ${passedAtt}/${totalAtt} · คะแนนเฉลี่ย ${avgScore.toFixed(1)}% · tab-switch ${totalTabs} ครั้ง

ประวัติทำควิซ:
${attHistory || "— ยังไม่เคยทำควิซ"}

ความก้าวหน้ารายโมดูล:
${moduleProgressList.map((p: any) => `- โมดูล ${p.order}: "${p.title}" — ดูแล้ว ${p.watched.toFixed(0)}%${p.completed ? " ✓ เสร็จ" : ""}`).join("\n") || "— ไม่มี"}`

  const systemPrompt = `คุณเป็น L&D coach วิเคราะห์ผลของผู้เรียนเดี่ยวให้ manager นำไปคุย 1-on-1

กฎ:
- ภาษาไทยเป็นธรรมชาติ ไม่ใช้ ** __ # markdown
- ห้ามขึ้นต้น "จากข้อมูล" / "ฉันคิดว่า"
- ใช้ตัวเลขจริง

เขียน 200-350 คำ เป็นย่อหน้าต่อเนื่อง:

ย่อหน้า 1: ภาพรวมว่าคนนี้เรียนเป็นอย่างไร — ผ่าน/ตก, ใช้กี่ attempt, ทันเวลาหรือล่าช้า

ย่อหน้า 2: จุดแข็ง — โมดูลไหน/ควิซไหนทำได้ดี ใช้เวลาน้อย/ดูครบ

ย่อหน้า 3: จุดที่ต้องพัฒนา — โมดูลที่ดูไม่ครบ ควิซที่ตกซ้ำ tab-switch มากผิดปกติ (>3 ครั้ง = น่าสงสัย)

ย่อหน้า 4: ข้อเสนอแนะให้ manager — สิ่งที่ควรคุยใน 1-on-1, แนะนำ resource เพิ่มเติม, ระบุเป็น action ที่ทำได้`

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
        avg: Number(avgScore.toFixed(2)),
        progress: Number(Number(enrollment.progress_pct).toFixed(1)),
        attempts: totalAtt,
        passed_attempts: passedAtt,
        tab_switches: totalTabs,
      },
      charts: {
        module_progress: moduleProgressList.slice(0, 10).map((p: any) => ({
          label: `${p.order}. ${p.title.slice(0, 25)}`,
          full_label: p.title,
          value: Number(p.watched.toFixed(1)),
          sub: p.completed ? "เสร็จ" : "ยัง",
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 })
  }
}
