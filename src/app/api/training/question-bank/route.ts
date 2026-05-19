import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const channelId = sp.get("channel_id")
  if (!channelId) return NextResponse.json({ error: "missing channel_id" }, { status: 400 })
  if (!canManageChannel(access, channelId)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data } = await svc.from("training_question_bank")
    .select("*")
    .eq("channel_id", channelId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
  return NextResponse.json({ questions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { channel_id, question_text, question_type, correct_answer } = body
  if (!channel_id || !question_text || !question_type || correct_answer === undefined) {
    return NextResponse.json({ error: "missing" }, { status: 400 })
  }
  if (!canManageChannel(access, channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data, error } = await svc.from("training_question_bank").insert({
    channel_id, question_text, question_type,
    options: body.options ?? null,
    correct_answer,
    explanation: body.explanation ?? null,
    points: body.points ?? 1,
    image_url: body.image_url ?? null,
    difficulty: body.difficulty ?? "medium",
    tags: body.tags ?? null,
    created_by: access.employeeId,
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
  const { data: q } = await svc.from("training_question_bank").select("channel_id").eq("id", id).single()
  if (!q || !canManageChannel(access, q.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_question_bank").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id)
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
  const { data: q } = await svc.from("training_question_bank").select("channel_id").eq("id", id).single()
  if (!q || !canManageChannel(access, q.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  await svc.from("training_question_bank").update({ is_active: false }).eq("id", id)
  return NextResponse.json({ success: true })
}
