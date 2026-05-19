import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const courseId = new URL(req.url).searchParams.get("course_id")
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })
  const { data } = await svc.from("training_feedback")
    .select(`*, employee:employees!training_feedback_employee_id_fkey(first_name_th, last_name_th, nickname, avatar_url)`)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
  return NextResponse.json({ feedback: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { course_id, rating, comment, trainer_id } = body
  if (!course_id || !rating) return NextResponse.json({ error: "missing" }, { status: 400 })

  const { error } = await svc.from("training_feedback").upsert({
    course_id, employee_id: access.employeeId,
    rating, comment: comment ?? null,
    trainer_id: trainer_id ?? null,
  }, { onConflict: "course_id,employee_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
