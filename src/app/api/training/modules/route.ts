import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel, canViewChannel } from "@/lib/utils/training-permissions"

async function verifyCourseAccess(svc: any, access: any, courseId: string) {
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", courseId).single()
  if (!course) return false
  return canManageChannel(access, course.channel_id)
}

// strip `correct_answer` from checkpoints so learners can't see answers via DevTools
function sanitizeModule(mod: any, canSeeAnswers: boolean) {
  if (canSeeAnswers || !mod.checkpoints) return mod
  return {
    ...mod,
    checkpoints: mod.checkpoints.map((cp: any) => {
      const { correct_answer, ...safe } = cp
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
  const courseId = new URL(req.url).searchParams.get("course_id")
  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })

  // Determine if requester is a channel manager/viewer (can see correct_answers)
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", courseId).single()
  const canSeeAnswers = course ? canViewChannel(access, course.channel_id) : false

  const { data } = await svc.from("training_modules")
    .select("*, checkpoints:training_video_checkpoints(*)")
    .eq("course_id", courseId).order("order_no")
  const safe = (data ?? []).map(m => sanitizeModule(m, canSeeAnswers))
  return NextResponse.json({ modules: safe })
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

  // find next order_no
  const { data: existing } = await svc.from("training_modules").select("order_no").eq("course_id", course_id).order("order_no", { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.order_no ?? 0) + 1

  const { data, error } = await svc.from("training_modules").insert({
    course_id, title,
    order_no: body.order_no ?? nextOrder,
    description: body.description ?? null,
    content_type: body.content_type ?? "mixed",
    video_url: body.video_url ?? null,
    video_duration_sec: body.video_duration_sec ?? null,
    required_watch_pct: body.required_watch_pct ?? 80,
    documents: body.documents ?? [],
    estimated_minutes: body.estimated_minutes ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
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

  const { data: mod } = await svc.from("training_modules").select("course_id").eq("id", id).single()
  if (!mod || !(await verifyCourseAccess(svc, access, mod.course_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_modules").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
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

  const { data: mod } = await svc.from("training_modules").select("course_id").eq("id", id).single()
  if (!mod || !(await verifyCourseAccess(svc, access, mod.course_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  await svc.from("training_modules").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
