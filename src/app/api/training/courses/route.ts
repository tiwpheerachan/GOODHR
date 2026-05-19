import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// GET — list courses (filter by channel_id optional)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)

  const sp = new URL(req.url).searchParams
  const channelId = sp.get("channel_id")
  const status = sp.get("status")
  const includeModules = sp.get("include_modules") === "1"

  let q = svc.from("training_courses")
    .select(includeModules
      ? `*, channel:training_channels(id, name, brand),
         creator:employees!training_courses_created_by_fkey(first_name_th, last_name_th, nickname),
         modules:training_modules(id, order_no, title, content_type, video_url, video_duration_sec, required_watch_pct, documents, estimated_minutes, thumbnail_url),
         quizzes:training_quizzes(id, module_id, title, time_limit_sec, passing_score, max_retries, question_count)`
      : `*, channel:training_channels(id, name, brand),
         creator:employees!training_courses_created_by_fkey(first_name_th, last_name_th, nickname)`)
    .order("updated_at", { ascending: false })

  if (channelId) q = q.eq("channel_id", channelId)
  if (status) q = q.eq("status", status)

  // scope by access
  if (!access.isTrainingAdmin && access.isSupervisor && access.supervisorChannelIds.length > 0) {
    q = q.in("channel_id", access.supervisorChannelIds)
  } else if (!access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ courses: data ?? [] })
}

// POST — create course
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { channel_id, title } = body
  if (!channel_id || !title) return NextResponse.json({ error: "missing channel_id/title" }, { status: 400 })
  if (!canManageChannel(access, channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์ใน channel นี้" }, { status: 403 })

  const { data, error } = await svc.from("training_courses").insert({
    channel_id, title,
    description: body.description ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
    status: "draft",
    open_date: body.open_date ?? null,
    close_date: body.close_date ?? null,
    passing_score: body.passing_score ?? 70,
    max_retries: body.max_retries ?? 3,
    affect_kpi: body.affect_kpi ?? false,
    kpi_weight: body.kpi_weight ?? 0,
    created_by: access.employeeId,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH — update course
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // verify channel access
  const { data: course } = await svc.from("training_courses").select("channel_id, version").eq("id", id).single()
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canManageChannel(access, course.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // version snapshot on publish
  if (updates.status === "published") {
    const { data: snap } = await svc.from("training_courses")
      .select("*, modules:training_modules(*), quizzes:training_quizzes(*, questions:training_questions(*))")
      .eq("id", id).single()
    if (snap) {
      await svc.from("training_course_versions").insert({
        course_id: id, version: course.version + 1,
        snapshot: snap, created_by: access.employeeId,
      })
      updates.version = course.version + 1
    }
  }

  const { error } = await svc.from("training_courses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", id).single()
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canManageChannel(access, course.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_courses").update({ status: "archived" }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
