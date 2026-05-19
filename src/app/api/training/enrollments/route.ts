import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// GET — list enrollments
//   ?course_id=...  → all learners in course
//   ?employee_id=me → my enrollments
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const courseId = sp.get("course_id")
  const employeeId = sp.get("employee_id")

  if (employeeId === "me" || (employeeId && access.employeeId === employeeId)) {
    // learner view
    const { data } = await svc.from("training_enrollments")
      .select(`*, course:training_courses(*, channel:training_channels(name, brand)),
               progress:training_module_progress(module_id, watched_pct, completed)`)
      .eq("employee_id", access.employeeId)
      .order("enrolled_at", { ascending: false })
    return NextResponse.json({ enrollments: data ?? [] })
  }

  if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })

  // admin/supervisor view
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", courseId).single()
  if (!course || !canManageChannel(access, course.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { data } = await svc.from("training_enrollments")
    .select(`*, employee:employees!training_enrollments_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, brand, position:positions(name), department:departments(name))`)
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })
  return NextResponse.json({ enrollments: data ?? [] })
}

// POST — enroll (admin assign) or self-enroll
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { course_id, employee_ids } = body  // bulk assign
  if (!course_id || !Array.isArray(employee_ids)) return NextResponse.json({ error: "missing" }, { status: 400 })

  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", course_id).single()
  if (!course || !canManageChannel(access, course.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const rows = employee_ids.map((eid: string) => ({
    course_id, employee_id: eid,
    enrolled_by: access.employeeId,
    status: "not_started",
  }))

  const { error } = await svc.from("training_enrollments").upsert(rows, { onConflict: "course_id,employee_id", ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // notify
  try {
    for (const eid of employee_ids) {
      await svc.from("notifications").insert({
        recipient_id: eid,
        type: "training_enrolled",
        title: "มีคอร์สเรียนใหม่",
        message: "คุณถูกเพิ่มเข้าคอร์สใหม่ — เข้าไปดูที่หน้าห้องเรียน",
        ref_table: "training_courses", ref_id: course_id, is_read: false,
      })
    }
  } catch {}

  return NextResponse.json({ enrolled: rows.length })
}

// DELETE — unenroll
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: en } = await svc.from("training_enrollments").select("course_id").eq("id", id).single()
  if (!en) return NextResponse.json({ error: "not found" }, { status: 404 })
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", en.course_id).single()
  if (!course || !canManageChannel(access, course.channel_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  await svc.from("training_enrollments").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
