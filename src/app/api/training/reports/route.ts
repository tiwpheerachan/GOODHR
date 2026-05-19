import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// GET — รายงานรวม
//   ?type=overview      → totals (courses, enrollments, completion%)
//   ?type=course_progress&course_id=... → progress detail
//   ?type=channel_summary&channel_id=...
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin && !access.isSupervisor) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const type = sp.get("type") || "overview"

  if (type === "overview") {
    const channelIds = access.isTrainingAdmin
      ? null
      : access.supervisorChannelIds
    let courseQ = svc.from("training_courses").select("id, status", { count: "exact" })
    if (channelIds) courseQ = courseQ.in("channel_id", channelIds.length ? channelIds : ["00000000-0000-0000-0000-000000000000"])
    const { data: courses } = await courseQ
    const totalCourses = courses?.length ?? 0
    const published = (courses ?? []).filter((c: any) => c.status === "published").length

    const courseIds = (courses ?? []).map((c: any) => c.id)
    let enrollQ = svc.from("training_enrollments").select("status")
    if (courseIds.length > 0) enrollQ = enrollQ.in("course_id", courseIds)
    const { data: enrolls } = await enrollQ
    const totalEnrolls = enrolls?.length ?? 0
    const completed = (enrolls ?? []).filter((e: any) => e.status === "completed").length
    const inProgress = (enrolls ?? []).filter((e: any) => e.status === "in_progress").length
    const failed = (enrolls ?? []).filter((e: any) => e.status === "failed").length

    return NextResponse.json({
      overview: {
        total_courses: totalCourses,
        published_courses: published,
        total_enrollments: totalEnrolls,
        completed_enrollments: completed,
        in_progress_enrollments: inProgress,
        failed_enrollments: failed,
        completion_rate: totalEnrolls > 0 ? Math.round((completed / totalEnrolls) * 10000) / 100 : 0,
      }
    })
  }

  if (type === "course_progress") {
    const courseId = sp.get("course_id")
    if (!courseId) return NextResponse.json({ error: "missing course_id" }, { status: 400 })
    const { data: enrollments } = await svc.from("training_enrollments")
      .select(`*, employee:employees!training_enrollments_employee_id_fkey(first_name_th, last_name_th, nickname, employee_code, avatar_url, brand)`)
      .eq("course_id", courseId)
    const { data: attempts } = await svc.from("training_quiz_attempts")
      .select("enrollment_id, attempt_no, score, passed, tab_switches")
      .in("enrollment_id", (enrollments ?? []).map((e: any) => e.id))
    return NextResponse.json({ enrollments: enrollments ?? [], attempts: attempts ?? [] })
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 })
}
