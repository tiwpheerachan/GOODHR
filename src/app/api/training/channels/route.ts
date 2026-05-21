import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// GET — list channels (filtered by user access)
//   ?deleted=1 → return ONLY soft-deleted channels (recycle bin)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const showDeleted = new URL(req.url).searchParams.get("deleted") === "1"
  // Recycle bin is admin-only
  if (showDeleted && !access.isTrainingAdmin) {
    return NextResponse.json({ error: "เฉพาะ Training Admin" }, { status: 403 })
  }

  let q = svc.from("training_channels")
    .select("*, owner:employees!training_channels_owner_id_fkey(id, first_name_th, last_name_th, nickname)")
    .eq("is_active", !showDeleted)
    .order(showDeleted ? "updated_at" : "name", { ascending: !showDeleted })

  if (!access.isTrainingAdmin && access.isSupervisor) {
    q = q.in("id", access.supervisorChannelIds.length > 0 ? access.supervisorChannelIds : ["00000000-0000-0000-0000-000000000000"])
  } else if (access.companyId) {
    q = q.eq("company_id", access.companyId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ channels: data ?? [] })
}

// POST — create channel
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin) return NextResponse.json({ error: "เฉพาะ Training Admin" }, { status: 403 })

  const body = await req.json()
  const { name, description, brand, thumbnail_url, owner_id } = body
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 })

  const { data, error } = await svc.from("training_channels").insert({
    company_id: access.companyId,
    brand: brand ?? null,
    name, description: description ?? null,
    thumbnail_url: thumbnail_url ?? null,
    owner_id: owner_id ?? access.employeeId,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH — update channel
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  if (!canManageChannel(access, id)) return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ channel นี้" }, { status: 403 })

  const { error } = await svc.from("training_channels")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — delete channel
//   default: soft delete (set is_active=false) — preserves data, just hides from list
//   ?hard=1: HARD delete — cascades to courses, modules, quizzes, enrollments, progress, attempts, question bank, permissions
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin) return NextResponse.json({ error: "เฉพาะ Training Admin" }, { status: 403 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const hard = url.searchParams.get("hard") === "1"
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // verify channel exists & user has access
  const { data: ch } = await svc.from("training_channels").select("id, name").eq("id", id).maybeSingle()
  if (!ch) return NextResponse.json({ error: "ไม่พบช่อง" }, { status: 404 })

  if (!hard) {
    const { error } = await svc.from("training_channels").update({ is_active: false }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, mode: "soft" })
  }

  // HARD delete — collect counts first for response
  const { data: courses } = await svc.from("training_courses").select("id").eq("channel_id", id)
  const courseIds = (courses ?? []).map(c => c.id)

  const [{ count: enrollCount }, { count: moduleCount }, { count: quizCount }, { count: bankCount }] = await Promise.all([
    courseIds.length
      ? svc.from("training_enrollments").select("id", { count: "exact", head: true }).in("course_id", courseIds)
      : Promise.resolve({ count: 0 } as any),
    courseIds.length
      ? svc.from("training_modules").select("id", { count: "exact", head: true }).in("course_id", courseIds)
      : Promise.resolve({ count: 0 } as any),
    courseIds.length
      ? svc.from("training_quizzes").select("id", { count: "exact", head: true }).in("course_id", courseIds)
      : Promise.resolve({ count: 0 } as any),
    svc.from("training_question_bank").select("id", { count: "exact", head: true }).eq("channel_id", id),
  ])

  // FK cascades handle the rest:
  // training_channels → courses, question_bank, permissions (all ON DELETE CASCADE)
  // training_courses → modules, quizzes, enrollments (all ON DELETE CASCADE)
  // training_enrollments → module_progress, quiz_attempts (all ON DELETE CASCADE)
  const { error } = await svc.from("training_channels").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    mode: "hard",
    deleted: {
      channel:     ch.name,
      courses:     courseIds.length,
      modules:     moduleCount ?? 0,
      quizzes:     quizCount ?? 0,
      enrollments: enrollCount ?? 0,
      question_bank: bankCount ?? 0,
    },
  })
}
