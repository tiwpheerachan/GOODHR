import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, getAccessibleChannelIds, getChannelReadFilter } from "@/lib/utils/training-permissions"

// GET — รายงานรวม
//   ?type=overview      → totals (courses, enrollments, completion%)
//   ?type=course_progress&course_id=... → progress detail
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin && !access.isSupervisor && !access.isViewer) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const type = sp.get("type") || "overview"

  if (type === "overview") {
    const accessible = getAccessibleChannelIds(access)
    let courseQ = svc.from("training_courses")
      .select("id, status, channel_id")
      .is("deleted_at", null)
    if (accessible !== "ALL") {
      courseQ = courseQ.in("channel_id", accessible.length ? accessible : ["00000000-0000-0000-0000-000000000000"])
    }
    const { data: courses } = await courseQ
    const totalCourses = courses?.length ?? 0
    const published = (courses ?? []).filter((c: any) => c.status === "published").length

    const courseIds = (courses ?? []).map((c: any) => c.id)
    let enrolls: any[] = []
    if (courseIds.length > 0) {
      const { data } = await svc.from("training_enrollments")
        .select("status, employee_id, course_id")
        .in("course_id", courseIds)
      enrolls = data ?? []
    }

    // For viewers — apply subordinate filter per channel
    if (!access.isTrainingAdmin) {
      const channelFilters = new Map<string, Set<string> | null>()
      const courseToChannel = new Map((courses ?? []).map((c: any) => [c.id, c.channel_id]))
      const uniqueChannels = Array.from(new Set((courses ?? []).map((c: any) => c.channel_id)))
      await Promise.all(uniqueChannels.map(async (chId: any) => {
        const rf = await getChannelReadFilter(svc, access, chId)
        channelFilters.set(chId, rf.allowed && rf.filterEmployeeIds ? new Set(rf.filterEmployeeIds) : null)
      }))
      enrolls = enrolls.filter(e => {
        const chId = courseToChannel.get(e.course_id)
        if (!chId) return false
        const allowed = channelFilters.get(chId)
        if (allowed === undefined) return false
        if (allowed === null) return true
        return allowed.has(e.employee_id)
      })
    }

    const totalEnrolls = enrolls.length
    const completed = enrolls.filter(e => e.status === "completed").length
    const inProgress = enrolls.filter(e => e.status === "in_progress").length
    const failed = enrolls.filter(e => e.status === "failed").length

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
    const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", courseId).single()
    if (!course) return NextResponse.json({ error: "not found" }, { status: 404 })
    const rf = await getChannelReadFilter(svc, access, course.channel_id)
    if (!rf.allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

    let q = svc.from("training_enrollments")
      .select(`*, employee:employees!training_enrollments_employee_id_fkey(first_name_th, last_name_th, nickname, employee_code, avatar_url, brand)`)
      .eq("course_id", courseId)
    if (rf.filterEmployeeIds) {
      q = q.in("employee_id", rf.filterEmployeeIds.length ? rf.filterEmployeeIds : ["00000000-0000-0000-0000-000000000000"])
    }
    const { data: enrollments } = await q
    const { data: attempts } = await svc.from("training_quiz_attempts")
      .select("enrollment_id, attempt_no, score, passed, tab_switches")
      .in("enrollment_id", (enrollments ?? []).map((e: any) => e.id))
    return NextResponse.json({ enrollments: enrollments ?? [], attempts: attempts ?? [] })
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 })
}
