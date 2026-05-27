import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel, canViewChannel } from "@/lib/utils/training-permissions"

async function verifyCourseAccess(svc: any, access: any, courseId: string) {
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", courseId).single()
  if (!course) return false
  return canManageChannel(access, course.channel_id)
}

// strip `correct_answer` from questions so learners can't see answers via DevTools
function stripQuestionAnswers(quiz: any) {
  if (!quiz?.questions) return quiz
  return {
    ...quiz,
    questions: quiz.questions.map((q: any) => {
      const { correct_answer, ...safe } = q
      return safe
    }),
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const courseId = sp.get("course_id")
  const id = sp.get("id")

  if (id) {
    const { data } = await svc.from("training_quizzes")
      .select("*, questions:training_questions(*), course:training_courses(channel_id)")
      .eq("id", id).single()
    if (!data) return NextResponse.json({ quiz: null })
    // Only channel managers/viewers see correct_answer; learners get sanitized version
    const channelId = (data as any).course?.channel_id ?? null
    const canSeeAnswers = canViewChannel(access, channelId)
    const { course, ...rest } = data as any
    return NextResponse.json({ quiz: canSeeAnswers ? rest : stripQuestionAnswers(rest) })
  }
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })
  // list view returns only count, never the answers
  const { data } = await svc.from("training_quizzes")
    .select("*, questions:training_questions(count)")
    .eq("course_id", courseId)
  return NextResponse.json({ quizzes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { course_id, title } = body
  if (!course_id || !title) return NextResponse.json({ error: "missing" }, { status: 400 })
  if (!(await verifyCourseAccess(svc, access, course_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data, error } = await svc.from("training_quizzes").insert({
    course_id, title,
    module_id: body.module_id ?? null,
    description: body.description ?? null,
    time_limit_sec: body.time_limit_sec ?? null,
    passing_score: body.passing_score ?? 70,
    max_retries: body.max_retries ?? 3,
    question_count: body.question_count ?? 10,
    randomize: body.randomize ?? true,
    show_correct_after: body.show_correct_after ?? true,
    use_question_bank: body.use_question_bank ?? false,
    bank_tag_filter: body.bank_tag_filter ?? null,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: q } = await svc.from("training_quizzes").select("course_id").eq("id", id).single()
  if (!q || !(await verifyCourseAccess(svc, access, q.course_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_quizzes").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: q } = await svc.from("training_quizzes").select("course_id").eq("id", id).single()
  if (!q || !(await verifyCourseAccess(svc, access, q.course_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_quizzes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
