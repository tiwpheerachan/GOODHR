import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

/**
 * GET /api/training/dashboard?course_id=...
 *   - Overview + per-module analytics + per-quiz analytics
 *   - Per-learner detail (drill-down)
 *   - Real-time online indicators (last_accessed_at < 5 min)
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const courseId = new URL(req.url).searchParams.get("course_id")
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })

  // ── permission ──
  const { data: course } = await svc.from("training_courses")
    .select("*, channel:training_channels(id, name, brand)")
    .eq("id", courseId).single()
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canManageChannel(access, course.channel_id)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  // ── load core data in parallel ──
  const [modulesR, quizzesR, enrollmentsR, feedbackR] = await Promise.all([
    svc.from("training_modules")
      .select("id, order_no, title, description, thumbnail_url, video_duration_sec, required_watch_pct, documents")
      .eq("course_id", courseId).order("order_no"),
    svc.from("training_quizzes")
      .select("id, module_id, title, passing_score, max_retries, question_count, time_limit_sec")
      .eq("course_id", courseId),
    svc.from("training_enrollments")
      .select(`*, employee:employees!training_enrollments_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, brand, position:positions(name), department:departments(name))`)
      .eq("course_id", courseId).order("enrolled_at", { ascending: false }),
    svc.from("training_feedback")
      .select("rating, comment, created_at, employee:employees!training_feedback_employee_id_fkey(first_name_th, last_name_th, nickname)")
      .eq("course_id", courseId).order("created_at", { ascending: false }).limit(20),
  ])

  const modules = modulesR.data ?? []
  const quizzes = quizzesR.data ?? []
  const enrollments = enrollmentsR.data ?? []
  const feedback = feedbackR.data ?? []
  const enrollmentIds = enrollments.map((e: any) => e.id)
  const moduleIds = modules.map((m: any) => m.id)
  const quizIds = quizzes.map((q: any) => q.id)

  // ── second-stage parallel load (depends on ids) ──
  const [progressR, attemptsR, checkpointAnsR, questionsRowsR, checkpointsRowsR] = await Promise.all([
    enrollmentIds.length > 0
      ? svc.from("training_module_progress")
          .select("enrollment_id, module_id, watched_pct, watch_time_sec, completed, last_position_sec, updated_at")
          .in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
    enrollmentIds.length > 0
      ? svc.from("training_quiz_attempts")
          .select("enrollment_id, quiz_id, attempt_no, score, passed, tab_switches, time_used_sec, submitted_at, started_at, graded_answers")
          .in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
    enrollmentIds.length > 0
      ? svc.from("training_checkpoint_answers")
          .select("enrollment_id, module_id, checkpoint_id, correct, answered_at")
          .in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
    quizIds.length > 0
      ? svc.from("training_questions")
          .select("id, quiz_id, question_text, question_type, options, correct_answer, points, order_no")
          .in("quiz_id", quizIds)
      : Promise.resolve({ data: [] }),
    moduleIds.length > 0
      ? svc.from("training_video_checkpoints")
          .select("id, module_id, trigger_at_sec, question_text, question_type, options, correct_answer")
          .in("module_id", moduleIds)
          .order("trigger_at_sec")
      : Promise.resolve({ data: [] }),
  ])

  const progress = (progressR.data as any[]) ?? []
  const attempts = (attemptsR.data as any[]) ?? []
  const checkpointAns = (checkpointAnsR.data as any[]) ?? []
  const allQuestions = (questionsRowsR.data as any[]) ?? []
  const allCheckpoints = (checkpointsRowsR.data as any[]) ?? []

  // ── aggregations ──
  const now = Date.now()
  const FIVE_MIN = 5 * 60 * 1000

  // overall stats
  const total = enrollments.length
  const completed = enrollments.filter((e: any) => e.status === "completed").length
  const inProgress = enrollments.filter((e: any) => e.status === "in_progress").length
  const notStarted = enrollments.filter((e: any) => e.status === "not_started").length
  const failed = enrollments.filter((e: any) => e.status === "failed").length

  const onlineEnrollments = enrollments.filter((e: any) =>
    e.last_accessed_at && (now - new Date(e.last_accessed_at).getTime()) < FIVE_MIN
  )

  const submittedAttempts = attempts.filter((a: any) => a.submitted_at != null)
  const avgScore = submittedAttempts.length > 0
    ? submittedAttempts.reduce((s, a) => s + Number(a.score || 0), 0) / submittedAttempts.length
    : 0

  // employee lookup for "named" lists
  const empById: Record<string, any> = {}
  for (const en of enrollments) empById[en.id] = en.employee

  // ── per-module aggregations ──
  const moduleStats = modules.map((m: any) => {
    const modProgress = progress.filter(p => p.module_id === m.id)
    const watched = modProgress.filter(p => p.completed).length
    const sumWatchPct = modProgress.reduce((s, p) => s + Number(p.watched_pct || 0), 0)
    const sumWatchTime = modProgress.reduce((s, p) => s + Number(p.watch_time_sec || 0), 0)
    const sumLastPos = modProgress.reduce((s, p) => s + Number(p.last_position_sec || 0), 0)
    const avgWatchPct = modProgress.length > 0 ? sumWatchPct / modProgress.length : 0
    const avgWatchTime = modProgress.length > 0 ? sumWatchTime / modProgress.length : 0
    const avgLastPos = modProgress.length > 0 ? sumLastPos / modProgress.length : 0

    // Watch %-buckets: [0%, 1-25%, 25-50%, 50-75%, 75-100%]
    const buckets = [0, 0, 0, 0, 0]
    for (const en of enrollments) {
      const p = modProgress.find(x => x.enrollment_id === en.id)
      const pct = Number(p?.watched_pct ?? 0)
      if (pct === 0) buckets[0]++
      else if (pct < 25) buckets[1]++
      else if (pct < 50) buckets[2]++
      else if (pct < 75) buckets[3]++
      else buckets[4]++
    }

    // Per-checkpoint stats
    const modCheckpoints = allCheckpoints.filter(c => c.module_id === m.id)
    const cpStats = modCheckpoints.map((cp: any) => {
      const ans = checkpointAns.filter(a => a.checkpoint_id === cp.id)
      const correct = ans.filter(a => a.correct).length
      return {
        id: cp.id,
        trigger_at_sec: cp.trigger_at_sec,
        question_text: cp.question_text,
        question_type: cp.question_type,
        answered: ans.length,
        correct,
        pct_correct: ans.length > 0 ? Math.round((correct / ans.length) * 100) : 0,
      }
    })

    // Slow learners (watched > 0 but < 50% and not completed)
    const slow = modProgress
      .filter(p => !p.completed && p.watched_pct > 0 && p.watched_pct < 50)
      .map(p => ({ employee: empById[p.enrollment_id], watched_pct: Math.round(Number(p.watched_pct)), last_position_sec: p.last_position_sec }))
      .slice(0, 5)

    // Not started (haven't created a progress row OR watched_pct=0)
    const startedIds = new Set(modProgress.filter(p => Number(p.watched_pct ?? 0) > 0).map(p => p.enrollment_id))
    const notStartedNames = enrollments
      .filter((en: any) => !startedIds.has(en.id))
      .map((en: any) => en.employee)
      .filter(Boolean)
      .slice(0, 8)

    const cps = checkpointAns.filter(c => c.module_id === m.id)
    return {
      ...m,
      completed_count: watched,
      started_count: modProgress.filter(p => Number(p.watched_pct ?? 0) > 0).length,
      avg_watch_pct: round1(avgWatchPct),
      avg_watch_sec: Math.round(avgWatchTime),
      avg_last_position_sec: Math.round(avgLastPos),
      drop_off_pct: m.video_duration_sec ? round1((avgLastPos / Number(m.video_duration_sec)) * 100) : 0,
      buckets, // [0, 1-25, 25-50, 50-75, 75-100]
      checkpoint_total: cps.length,
      checkpoint_correct: cps.filter(c => c.correct).length,
      checkpoint_questions: cpStats,
      slow_learners: slow,
      not_started: notStartedNames,
    }
  })

  // ── per-quiz aggregations ──
  const quizStats = quizzes.map((q: any) => {
    const qAttempts = attempts.filter(a => a.quiz_id === q.id)
    const submitted = qAttempts.filter(a => a.submitted_at != null)
    const passed = submitted.filter(a => a.passed).length
    const avgQScore = submitted.length > 0
      ? submitted.reduce((s, a) => s + Number(a.score || 0), 0) / submitted.length
      : 0

    // Score-buckets: [<30, 30-50, 50-70, 70-90, 90-100]
    const scoreBuckets = [0, 0, 0, 0, 0]
    for (const a of submitted) {
      const sc = Number(a.score || 0)
      if (sc < 30) scoreBuckets[0]++
      else if (sc < 50) scoreBuckets[1]++
      else if (sc < 70) scoreBuckets[2]++
      else if (sc < 90) scoreBuckets[3]++
      else scoreBuckets[4]++
    }

    const times = submitted.map(a => Number(a.time_used_sec || 0)).filter(t => t > 0)
    const avgTime = times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0
    const minScore = submitted.length > 0 ? Math.min(...submitted.map(a => Number(a.score || 0))) : 0
    const maxScore = submitted.length > 0 ? Math.max(...submitted.map(a => Number(a.score || 0))) : 0

    // Per-question stats from graded_answers JSONB
    // graded_answers expected shape: [{ question_id, is_correct }] or similar
    const questions = allQuestions.filter(qq => qq.quiz_id === q.id).sort((a, b) => (a.order_no || 0) - (b.order_no || 0))
    const qStats = questions.map((qq: any) => {
      let answered = 0, correct = 0
      for (const a of submitted) {
        const ga: any[] = Array.isArray(a.graded_answers) ? a.graded_answers : []
        const row = ga.find((g: any) => g?.question_id === qq.id)
        if (row) {
          answered++
          if (row.is_correct === true || row.correct === true) correct++
        }
      }
      return {
        id: qq.id,
        question_text: qq.question_text,
        question_type: qq.question_type,
        order_no: qq.order_no,
        answered, correct,
        pct_correct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
        points: qq.points,
      }
    })

    // Top scorers — best attempt per learner, sorted desc
    const bestByEn: Record<string, any> = {}
    for (const a of submitted) {
      const prev = bestByEn[a.enrollment_id]
      if (!prev || Number(a.score || 0) > Number(prev.score || 0)) bestByEn[a.enrollment_id] = a
    }
    const ranking = Object.entries(bestByEn)
      .map(([enId, a]: any) => ({ employee: empById[enId], score: Number(a.score || 0), passed: a.passed }))
      .sort((a, b) => b.score - a.score)
    const top = ranking.slice(0, 5)
    const failedList = ranking.filter(r => !r.passed).slice(0, 5)

    // Suspicious attempts (high tab switches)
    const suspicious = submitted.filter(a => (Number(a.tab_switches) || 0) > 3)
      .map(a => ({ employee: empById[a.enrollment_id], tab_switches: a.tab_switches, attempt_no: a.attempt_no, score: a.score }))
      .slice(0, 5)

    return {
      ...q,
      attempt_count: qAttempts.length,
      submitted_count: submitted.length,
      passed_count: passed,
      avg_score: round1(avgQScore),
      pass_rate: submitted.length > 0 ? Math.round((passed / submitted.length) * 100) : 0,
      avg_time_sec: Math.round(avgTime),
      min_score: round1(minScore),
      max_score: round1(maxScore),
      score_buckets: scoreBuckets, // [<30, 30-50, 50-70, 70-90, 90-100]
      question_stats: qStats,
      top_scorers: top,
      failed_list: failedList,
      suspicious,
    }
  })

  // per-learner detail (for table + drill-down)
  const learners = enrollments.map((en: any) => {
    const learnerProgress = progress.filter(p => p.enrollment_id === en.id)
    const completedModules = learnerProgress.filter(p => p.completed).length
    const learnerAttempts = attempts.filter(a => a.enrollment_id === en.id)
    const bestPerQuiz: Record<string, any> = {}
    for (const a of learnerAttempts) {
      const prev = bestPerQuiz[a.quiz_id]
      if (!prev || Number(a.score || 0) > Number(prev.score || 0)) bestPerQuiz[a.quiz_id] = a
    }
    const totalTabSwitches = learnerAttempts.reduce((s, a) => s + (Number(a.tab_switches) || 0), 0)
    const cps = checkpointAns.filter(c => en.id === c.enrollment_id)
    const sortedAttempts = [...learnerAttempts].sort(
      (a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
    )
    return {
      ...en,
      modules_completed: completedModules,
      modules_total: modules.length,
      quiz_attempts: learnerAttempts.length,
      best_quiz_scores: Object.values(bestPerQuiz),
      all_attempts: sortedAttempts,
      module_progress: learnerProgress,
      checkpoint_answers: cps,
      total_tab_switches: totalTabSwitches,
      checkpoint_total: cps.length,
      checkpoint_correct: cps.filter(c => c.correct).length,
      is_online: en.last_accessed_at && (now - new Date(en.last_accessed_at).getTime()) < FIVE_MIN,
    }
  })

  const avgRating = feedback.length > 0
    ? feedback.reduce((s, f: any) => s + Number(f.rating || 0), 0) / feedback.length
    : 0

  return NextResponse.json({
    course,
    modules: moduleStats,
    quizzes: quizStats,
    learners,
    feedback,
    online: onlineEnrollments,
    overview: {
      total_enrollments: total,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      failed,
      completion_rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      avg_quiz_score: round1(avgScore),
      avg_feedback_rating: round1(avgRating),
      online_count: onlineEnrollments.length,
      feedback_count: feedback.length,
    },
  })
}

function round1(n: number) { return Math.round(n * 10) / 10 }
