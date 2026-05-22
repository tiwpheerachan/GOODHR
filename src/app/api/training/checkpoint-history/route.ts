import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, getChannelReadFilter } from "@/lib/utils/training-permissions"

/**
 * GET /api/training/checkpoint-history?enrollment_id=...&module_id=...
 * ดึงประวัติการตอบ checkpoint quiz
 *   - learner ดูได้เฉพาะของตัวเอง
 *   - admin/supervisor ดูได้ทุกคน
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const enrollmentId = sp.get("enrollment_id")
  const moduleId = sp.get("module_id")
  if (!enrollmentId) return NextResponse.json({ error: "missing enrollment_id" }, { status: 400 })

  // ตรวจสิทธิ์: learner = ของตัวเอง, admin/supervisor = ดูได้ทั้งหมด, viewer = เฉพาะ subordinates
  if (!access.isTrainingAdmin) {
    const { data: en } = await svc.from("training_enrollments")
      .select("employee_id, course:training_courses(channel_id)")
      .eq("id", enrollmentId).single() as any
    if (!en) return NextResponse.json({ error: "not found" }, { status: 404 })

    // learner เอง — อนุญาต
    if (en.employee_id === access.employeeId) {
      // ok
    } else {
      const channelId = en.course?.channel_id
      if (!channelId) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
      const rf = await getChannelReadFilter(svc, access, channelId)
      if (!rf.allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
      if (rf.filterEmployeeIds && !rf.filterEmployeeIds.includes(en.employee_id)) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลพนักงานคนนี้" }, { status: 403 })
      }
    }
  }

  let q = svc.from("training_checkpoint_answers")
    .select("id, checkpoint_id, question_text, question_type, answer, correct, answered_at")
    .eq("enrollment_id", enrollmentId)
    .order("answered_at", { ascending: false })
  if (moduleId) q = q.eq("module_id", moduleId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ history: data ?? [] })
}
