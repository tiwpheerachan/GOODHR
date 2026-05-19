import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// Helper: ตรวจคำตอบทีละข้อ — เปรียบเทียบแบบ type-safe
function gradeAnswer(question: any, answer: any): { correct: boolean; points: number } {
  const correct = question.correct_answer
  let isCorrect = false
  try {
    switch (question.question_type) {
      case "mc": {
        // MC: correct_answer = "id" (string) หรือ array ["id1","id2"]
        // user's answer = "id" (string)
        if (Array.isArray(correct)) {
          // multi-select: ต้องเลือกครบ
          const ansArr = Array.isArray(answer) ? answer.map(String) : [String(answer)]
          const corArr = correct.map(String)
          isCorrect = ansArr.length === corArr.length && corArr.every(c => ansArr.includes(c))
        } else {
          isCorrect = String(correct) === String(answer)
        }
        break
      }
      case "tf": {
        // TF: correct_answer = boolean (true/false), user's answer = "true"/"false" (string)
        const correctBool = correct === true || correct === "true"
        const answerBool = answer === true || answer === "true"
        isCorrect = correctBool === answerBool
        break
      }
      case "fill": {
        // Fill: correct = "text" หรือ array
        if (Array.isArray(correct)) {
          isCorrect = correct.some((c: string) =>
            String(c).trim().toLowerCase() === String(answer ?? "").trim().toLowerCase()
          )
        } else {
          isCorrect = String(correct).trim().toLowerCase() === String(answer ?? "").trim().toLowerCase()
        }
        break
      }
      case "match":  // correct_answer = {left_id: right_id, ...}
        isCorrect = JSON.stringify(correct) === JSON.stringify(answer)
        break
      case "essay":  // อัตนัย — ไม่ auto grade (รอ manual review)
        isCorrect = false
        break
    }
  } catch { isCorrect = false }
  return {
    correct: isCorrect,
    points: isCorrect ? Number(question.points || 1) : 0,
  }
}

// POST — start attempt (สุ่มคำถาม + สร้าง snapshot)
// body: { enrollment_id, quiz_id }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { enrollment_id, quiz_id, action, attempt_id, answers, tab_switches } = body

  // ── ACTION: start ───────────────────────────────────────────────
  if (action === "start" || !action) {
    if (!enrollment_id || !quiz_id) return NextResponse.json({ error: "missing" }, { status: 400 })

    const { data: en } = await svc.from("training_enrollments").select("employee_id").eq("id", enrollment_id).single()
    if (!en || en.employee_id !== access.employeeId) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

    const { data: quiz } = await svc.from("training_quizzes").select("*").eq("id", quiz_id).single()
    if (!quiz) return NextResponse.json({ error: "quiz not found" }, { status: 404 })

    // ── หา quiz_reset_at (สำหรับ module quiz ที่ผู้เรียนกด "เรียนใหม่") ──
    let resetAt: string | null = null
    if (quiz.module_id) {
      const { data: mp } = await svc.from("training_module_progress")
        .select("quiz_reset_at").eq("enrollment_id", enrollment_id).eq("module_id", quiz.module_id).maybeSingle()
      resetAt = mp?.quiz_reset_at ?? null
    }

    // ── นับเฉพาะ attempts หลัง reset (effective) ──
    let prevQ = svc.from("training_quiz_attempts")
      .select("id, attempt_no, passed, started_at").eq("enrollment_id", enrollment_id).eq("quiz_id", quiz_id)
      .order("attempt_no", { ascending: false })
    if (resetAt) prevQ = prevQ.gt("started_at", resetAt)
    const { data: prev } = await prevQ

    const effectiveAttempts = prev ?? []
    const lastAttempt = effectiveAttempts[0]
    const attemptNo = (lastAttempt?.attempt_no ?? 0) + 1
    if (effectiveAttempts.some((a: any) => a.passed)) {
      return NextResponse.json({ error: "ผ่านควิซนี้แล้ว" }, { status: 400 })
    }
    if (effectiveAttempts.length >= Number(quiz.max_retries ?? 2)) {
      return NextResponse.json({ error: "ใช้สิทธิ์สอบครบแล้ว — ต้องเรียนใหม่" }, { status: 400 })
    }

    // build question pool
    let pool: any[] = []
    if (quiz.use_question_bank) {
      // ดึงจาก channel's question bank
      const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", quiz.course_id).single()
      let bq = svc.from("training_question_bank").select("*").eq("channel_id", course?.channel_id).eq("is_active", true)
      if (quiz.bank_tag_filter?.length > 0) bq = bq.overlaps("tags", quiz.bank_tag_filter)
      const { data } = await bq
      pool = data ?? []
    } else {
      const { data } = await svc.from("training_questions").select("*").eq("quiz_id", quiz_id).order("order_no")
      pool = data ?? []
    }

    // shuffle + take N
    if (quiz.randomize) pool = pool.sort(() => Math.random() - 0.5)
    const selected = pool.slice(0, Math.min(quiz.question_count || pool.length, pool.length))

    // strip correct_answer ก่อนส่งให้ client (security)
    const safeQuestions = selected.map(q => ({
      id: q.id, question_text: q.question_text, question_type: q.question_type,
      options: q.options, points: q.points, image_url: q.image_url,
    }))

    const { data: attempt, error } = await svc.from("training_quiz_attempts").insert({
      enrollment_id, quiz_id, attempt_no: attemptNo,
      questions: selected,  // server keeps full
      tab_switches: 0,
    }).select("id, started_at").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      attempt_id: attempt.id,
      started_at: attempt.started_at,
      time_limit_sec: quiz.time_limit_sec,
      questions: safeQuestions,
    })
  }

  // ── ACTION: submit ──────────────────────────────────────────────
  if (action === "submit") {
    if (!attempt_id || !answers) return NextResponse.json({ error: "missing" }, { status: 400 })

    const { data: attempt } = await svc.from("training_quiz_attempts")
      .select("*, quiz:training_quizzes(passing_score, course_id)")
      .eq("id", attempt_id).single()
    if (!attempt) return NextResponse.json({ error: "not found" }, { status: 404 })

    const { data: en } = await svc.from("training_enrollments").select("employee_id, course_id").eq("id", attempt.enrollment_id).single()
    if (!en || en.employee_id !== access.employeeId) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

    // grade
    const graded: any[] = []
    let totalPoints = 0
    let maxPoints = 0
    for (const q of (attempt.questions ?? [])) {
      maxPoints += Number(q.points || 1)
      const ans = answers[q.id]
      const { correct, points } = gradeAnswer(q, ans)
      totalPoints += points
      graded.push({ question_id: q.id, correct, points_earned: points, answer: ans })
    }
    const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 10000) / 100 : 0
    const passingScore = Number((attempt.quiz as any)?.passing_score || 70)
    const passed = score >= passingScore
    const timeUsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)

    await svc.from("training_quiz_attempts").update({
      submitted_at: new Date().toISOString(),
      time_used_sec: timeUsed,
      score, passed,
      answers, graded_answers: graded,
      tab_switches: tab_switches ?? attempt.tab_switches ?? 0,
    }).eq("id", attempt_id)

    // notify learner
    try {
      await svc.from("notifications").insert({
        recipient_id: access.employeeId,
        type: passed ? "training_quiz_passed" : "training_quiz_failed",
        title: passed ? "🎉 สอบผ่าน!" : "สอบไม่ผ่าน — ลองใหม่",
        message: `คะแนน ${score}% (เกณฑ์ผ่าน ${passingScore}%)`,
        ref_table: "training_quiz_attempts", ref_id: attempt_id, is_read: false,
      })
    } catch {}

    // if passed and this is the only quiz → mark enrollment as completed
    if (passed) {
      await svc.from("training_enrollments").update({
        final_score: score,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", attempt.enrollment_id)
    }

    return NextResponse.json({ score, passed, graded_answers: graded, passing_score: passingScore })
  }

  // ── ACTION: tab_switch (เพิ่ม counter) ─────────────────────────
  if (action === "tab_switch") {
    if (!attempt_id) return NextResponse.json({ error: "missing" }, { status: 400 })
    const { data } = await svc.from("training_quiz_attempts").select("tab_switches").eq("id", attempt_id).single()
    await svc.from("training_quiz_attempts").update({
      tab_switches: (data?.tab_switches ?? 0) + 1,
    }).eq("id", attempt_id)
    await svc.from("training_tab_events").insert({
      attempt_id, event_type: "blur",
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 })
}

// GET — list attempts (admin: by course/quiz, learner: own)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const enrollmentId = sp.get("enrollment_id")
  const quizId = sp.get("quiz_id")

  if (!enrollmentId && !quizId) return NextResponse.json({ error: "missing" }, { status: 400 })

  let q = svc.from("training_quiz_attempts")
    .select("id, attempt_no, started_at, submitted_at, score, passed, tab_switches, time_used_sec, quiz_id")
    .order("attempt_no", { ascending: false })
  if (enrollmentId) q = q.eq("enrollment_id", enrollmentId)
  if (quizId) q = q.eq("quiz_id", quizId)

  const { data } = await q
  let attempts = data ?? []

  // ── filter เฉพาะ attempts หลัง quiz_reset_at (per module) ──
  if (enrollmentId && attempts.length > 0) {
    // ดึง quiz_id ทั้งหมด → หา module_id
    const quizIds = Array.from(new Set(attempts.map((a: any) => a.quiz_id)))
    const { data: quizMods } = await svc.from("training_quizzes")
      .select("id, module_id").in("id", quizIds)
    const quizModuleMap = new Map<string, string | null>((quizMods ?? []).map((q: any) => [q.id, q.module_id]))

    const moduleIds = Array.from(new Set((quizMods ?? []).map((q: any) => q.module_id).filter(Boolean))) as string[]
    const resetMap = new Map<string, string | null>()
    if (moduleIds.length > 0) {
      const { data: progs } = await svc.from("training_module_progress")
        .select("module_id, quiz_reset_at").eq("enrollment_id", enrollmentId).in("module_id", moduleIds)
      for (const p of (progs ?? [])) resetMap.set((p as any).module_id, (p as any).quiz_reset_at)
    }

    attempts = attempts.filter((a: any) => {
      const modId = quizModuleMap.get(a.quiz_id)
      if (!modId) return true  // final quiz — ไม่มี reset
      const resetAt = resetMap.get(modId)
      if (!resetAt) return true
      return new Date(a.started_at).getTime() > new Date(resetAt).getTime()
    })
  }

  return NextResponse.json({ attempts })
}
