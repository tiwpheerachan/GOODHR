import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, getChannelReadFilter } from "@/lib/utils/training-permissions"

// ── ตรวจคำตอบ 1 ข้อ (fallback ถ้าไม่มี graded_answers) ──
function isCorrect(q: any, answer: any): boolean {
  const correct = q.correct_answer
  try {
    switch (q.question_type) {
      case "mc":
        if (Array.isArray(correct)) {
          const a = Array.isArray(answer) ? answer.map(String) : [String(answer)]
          const c = correct.map(String)
          return a.length === c.length && c.every(x => a.includes(x))
        }
        return String(correct) === String(answer)
      case "tf": {
        const cb = correct === true || correct === "true"
        const ab = answer === true || answer === "true"
        return cb === ab
      }
      case "fill":
        if (Array.isArray(correct)) return correct.some((c: string) => String(c).trim().toLowerCase() === String(answer ?? "").trim().toLowerCase())
        return String(correct).trim().toLowerCase() === String(answer ?? "").trim().toLowerCase()
      case "match":
        return JSON.stringify(correct) === JSON.stringify(answer)
      default:
        return false
    }
  } catch { return false }
}

// ── แปลงคำตอบเป็นข้อความอ่านง่าย ──
function answerText(q: any, val: any): string {
  if (val === undefined || val === null || val === "") return "—"
  const opts: any[] = Array.isArray(q.options) ? q.options : []
  const optText = (id: any) => {
    const o = opts.find(o => String(o.id) === String(id))
    return o ? o.text : String(id)
  }
  switch (q.question_type) {
    case "mc":
      return Array.isArray(val) ? val.map(optText).join(", ") : optText(val)
    case "tf":
      return (val === true || val === "true") ? "ถูก" : "ผิด"
    case "match":
      return typeof val === "object" ? JSON.stringify(val) : String(val)
    default:
      return String(val)
  }
}

// GET /api/training/attempt-detail?attempt_id=...
//   คืนผลรายข้อของ attempt นั้น (ถูก/ผิด + คำตอบผู้เรียน + เฉลย) — สำหรับ admin/หัวหน้าดู
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)

  const attemptId = new URL(req.url).searchParams.get("attempt_id")
  if (!attemptId) return NextResponse.json({ error: "missing attempt_id" }, { status: 400 })

  const { data: attempt } = await svc.from("training_quiz_attempts")
    .select("id, attempt_no, score, passed, submitted_at, questions, answers, graded_answers, enrollment_id")
    .eq("id", attemptId).maybeSingle()
  if (!attempt) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })

  // ── permission: เจ้าของ หรือ admin/หัวหน้าที่มีสิทธิ์อ่าน channel ──
  const { data: en } = await svc.from("training_enrollments")
    .select("employee_id, course:training_courses(channel_id)")
    .eq("id", attempt.enrollment_id).maybeSingle() as any
  if (!en) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (en.employee_id !== access.employeeId) {
    const channelId = en.course?.channel_id
    const rf = channelId ? await getChannelReadFilter(svc, access, channelId) : { allowed: false } as any
    if (!rf.allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    if (rf.filterEmployeeIds && !rf.filterEmployeeIds.includes(en.employee_id)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลคนนี้" }, { status: 403 })
    }
  }

  const questions: any[] = Array.isArray(attempt.questions) ? attempt.questions : []
  const answers: any = attempt.answers ?? {}
  const gradedMap = new Map<string, any>()
  for (const g of (Array.isArray(attempt.graded_answers) ? attempt.graded_answers : [])) gradedMap.set(String(g.question_id), g)

  const results = questions.map((q: any, i: number) => {
    const g = gradedMap.get(String(q.id))
    const userAns = g ? g.answer : answers[q.id]
    const correct = g ? !!g.correct : isCorrect(q, userAns)
    return {
      order: i + 1,
      question_text: q.question_text ?? "",
      type: q.question_type,
      correct,
      points: Number(q.points || 1),
      user_answer: answerText(q, userAns),
      correct_answer: q.question_type === "essay" ? "(อัตนัย — ตรวจเอง)" : answerText(q, q.correct_answer),
    }
  })

  const correctCount = results.filter(r => r.correct).length
  return NextResponse.json({
    attempt: { id: attempt.id, attempt_no: attempt.attempt_no, score: attempt.score, passed: attempt.passed, submitted_at: attempt.submitted_at },
    correct_count: correctCount,
    total: results.length,
    results,
  })
}
