import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

/**
 * GET /api/training/learner/course?course_id=...
 *
 * ดึงคอร์ส + modules + quizzes + progress ของ learner
 * ใช้ service client → bypass RLS
 *
 * Auth: ต้องเป็น (1) ผู้เรียนที่ลงทะเบียนคอร์สนี้ หรือ (2) training admin/supervisor
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.employeeId) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const courseId = sp.get("course_id")
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })

  // ── เช็คสิทธิ์ — ต้องเป็น admin หรือลงทะเบียนคอร์สนี้แล้ว ──
  const isManager = access.isTrainingAdmin || access.isSupervisor
  let enrollment: any = null
  if (!isManager) {
    const { data: en } = await svc.from("training_enrollments")
      .select("id, status, progress_pct, last_accessed_at, completed_at, final_score")
      .eq("course_id", courseId)
      .eq("employee_id", access.employeeId)
      .maybeSingle()
    if (!en) return NextResponse.json({ error: "คุณยังไม่ได้ลงทะเบียนคอร์สนี้" }, { status: 403 })
    enrollment = en
  } else {
    const { data: en } = await svc.from("training_enrollments")
      .select("id, status, progress_pct, last_accessed_at, completed_at, final_score")
      .eq("course_id", courseId)
      .eq("employee_id", access.employeeId)
      .maybeSingle()
    enrollment = en  // อาจไม่มี (admin ดูเฉยๆ) — OK
  }

  // ── โหลด course + modules + quizzes + checkpoints + progress ──
  const [cRes, mRes, qRes, pRes] = await Promise.all([
    svc.from("training_courses")
      .select(`*, channel:training_channels(id, name, brand)`)
      .eq("id", courseId).single(),
    svc.from("training_modules")
      .select(`*, checkpoints:training_video_checkpoints(*)`)
      .eq("course_id", courseId)
      .order("order_no"),
    svc.from("training_quizzes")
      .select(`id, module_id, title, description, time_limit_sec, passing_score, max_retries, question_count, randomize, show_correct_after`)
      .eq("course_id", courseId),
    enrollment?.id
      ? svc.from("training_module_progress")
          .select("*").eq("enrollment_id", enrollment.id)
      : Promise.resolve({ data: [] }),
  ])

  if (cRes.error) return NextResponse.json({ error: cRes.error.message }, { status: 500 })
  if (!cRes.data) return NextResponse.json({ error: "ไม่พบคอร์ส" }, { status: 404 })

  // ── ตรวจ open/close date + soft-delete (เฉพาะ learner, admin ดูได้เสมอ) ─────
  const course = cRes.data
  if (!isManager) {
    if (course.deleted_at) {
      return NextResponse.json({ error: "คอร์สนี้ถูกลบแล้ว" }, { status: 404 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (course.status !== "published") {
      return NextResponse.json({ error: "คอร์สยังไม่เปิด" }, { status: 403 })
    }
    if (course.open_date && course.open_date > today) {
      return NextResponse.json({ error: `คอร์สจะเปิด ${course.open_date}` }, { status: 403 })
    }
    if (course.close_date && course.close_date < today) {
      return NextResponse.json({ error: "คอร์สปิดแล้ว" }, { status: 403 })
    }
  }

  // strip checkpoint correct_answer for learners
  const modules = (mRes.data ?? []).map((m: any) => {
    if (isManager) return m
    if (!m.checkpoints) return m
    return {
      ...m,
      checkpoints: m.checkpoints.map((cp: any) => {
        const { correct_answer, ...safe } = cp
        return safe
      }),
    }
  })

  // ── กรองควิซตาม assignment (learner เห็นเฉพาะควิซที่ถูกกำหนด หรือควิซที่ไม่ได้กำหนดใคร) ──
  let quizzes = qRes.data ?? []
  if (!isManager && quizzes.length > 0) {
    const quizIds = quizzes.map((q: any) => q.id)
    const { data: assigns } = await svc.from("training_quiz_assignments")
      .select("quiz_id, employee_id").in("quiz_id", quizIds)
    const assignedQuiz = new Map<string, Set<string>>()
    for (const a of assigns ?? []) {
      if (!assignedQuiz.has(a.quiz_id)) assignedQuiz.set(a.quiz_id, new Set())
      assignedQuiz.get(a.quiz_id)!.add(a.employee_id)
    }
    const myEmpId = access.employeeId ?? ""
    quizzes = quizzes.filter((q: any) => {
      const set = assignedQuiz.get(q.id)
      return !set || set.size === 0 || set.has(myEmpId)  // ไม่มี assignment = เปิดทุกคน
    })
  }

  return NextResponse.json({
    course,
    modules,
    quizzes,
    enrollment,
    progress: pRes.data ?? [],
  })
}
