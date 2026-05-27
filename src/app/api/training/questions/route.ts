import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// คำถามใน quiz เฉพาะ
async function verifyQuizAccess(svc: any, access: any, quizId: string) {
  const { data: q } = await svc.from("training_quizzes")
    .select("course:training_courses(channel_id)").eq("id", quizId).single()
  if (!q) return false
  return canManageChannel(access, (q.course as any)?.channel_id)
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const quizId = new URL(req.url).searchParams.get("quiz_id")
  if (!quizId) return NextResponse.json({ error: "missing quiz_id" }, { status: 400 })
  const { data } = await svc.from("training_questions").select("*").eq("quiz_id", quizId).order("order_no")
  return NextResponse.json({ questions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { quiz_id, question_text, question_type, correct_answer } = body
  if (!quiz_id || !question_text || !question_type || correct_answer === undefined) {
    return NextResponse.json({ error: "missing" }, { status: 400 })
  }
  if (!(await verifyQuizAccess(svc, access, quiz_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data: existing } = await svc.from("training_questions").select("order_no").eq("quiz_id", quiz_id).order("order_no", { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.order_no ?? 0) + 1

  const { data, error } = await svc.from("training_questions").insert({
    quiz_id, question_text, question_type,
    options: body.options ?? null,
    correct_answer,
    explanation: body.explanation ?? null,
    points: body.points ?? 1,
    image_url: body.image_url ?? null,
    order_no: body.order_no ?? nextOrder,
    bank_id: body.bank_id ?? null,
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
  const { data: q } = await svc.from("training_questions").select("quiz_id").eq("id", id).single()
  if (!q || !(await verifyQuizAccess(svc, access, q.quiz_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_questions").update(updates).eq("id", id)
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
  const { data: q } = await svc.from("training_questions").select("quiz_id").eq("id", id).single()
  if (!q || !(await verifyQuizAccess(svc, access, q.quiz_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const { error } = await svc.from("training_questions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
