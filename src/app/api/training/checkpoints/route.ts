import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel, canViewChannel } from "@/lib/utils/training-permissions"

async function verifyModuleAccess(svc: any, access: any, moduleId: string) {
  const { data: m } = await svc.from("training_modules")
    .select("course:training_courses(channel_id)").eq("id", moduleId).single()
  if (!m) return false
  return canManageChannel(access, (m.course as any)?.channel_id)
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const moduleId = new URL(req.url).searchParams.get("module_id")
  if (!moduleId) return NextResponse.json({ error: "missing module_id" }, { status: 400 })

  // Only channel managers/viewers can see correct_answer; learners get sanitized list
  const { data: m } = await svc.from("training_modules")
    .select("course:training_courses(channel_id)").eq("id", moduleId).single()
  const channelId = (m?.course as any)?.channel_id ?? null
  const canSeeAnswers = canViewChannel(access, channelId)

  const { data } = await svc.from("training_video_checkpoints")
    .select("*").eq("module_id", moduleId).order("trigger_at_sec")
  const safe = (data ?? []).map((cp: any) => {
    if (canSeeAnswers) return cp
    const { correct_answer, ...rest } = cp
    return rest
  })
  return NextResponse.json({ checkpoints: safe })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { module_id, trigger_at_sec, question_text, question_type, options, correct_answer } = body
  if (!module_id || trigger_at_sec === undefined || !question_text || !question_type || correct_answer === undefined) {
    return NextResponse.json({ error: "missing" }, { status: 400 })
  }
  if (!(await verifyModuleAccess(svc, access, module_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data, error } = await svc.from("training_video_checkpoints").insert({
    module_id, trigger_at_sec, question_text,
    question_type, options: options ?? null, correct_answer,
    blocks_progress: body.blocks_progress ?? true,
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
  const { data: c } = await svc.from("training_video_checkpoints").select("module_id").eq("id", id).single()
  if (!c || !(await verifyModuleAccess(svc, access, c.module_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const { error } = await svc.from("training_video_checkpoints").update(updates).eq("id", id)
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
  const { data: c } = await svc.from("training_video_checkpoints").select("module_id").eq("id", id).single()
  if (!c || !(await verifyModuleAccess(svc, access, c.module_id))) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  await svc.from("training_video_checkpoints").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
