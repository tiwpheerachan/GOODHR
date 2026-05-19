import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

/**
 * POST /api/training/progress/reset
 * body: { enrollment_id, module_id }
 *
 * "เรียนใหม่" — reset module progress + ตั้ง quiz_reset_at
 *   → watched_pct/watch_time_sec กลับเป็น 0
 *   → completed = false
 *   → quiz attempts ก่อนหน้านี้จะถูก ignore (filter โดย started_at > quiz_reset_at)
 *
 * ใช้เมื่อ: ผู้เรียนสอบควิซไม่ผ่านครบ max_retries → ต้องเรียนใหม่
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { enrollment_id, module_id } = body
  if (!enrollment_id || !module_id) return NextResponse.json({ error: "missing" }, { status: 400 })

  // ตรวจสิทธิ์: ผู้เรียนต้องเป็นเจ้าของ enrollment หรือ admin
  const { data: en } = await svc.from("training_enrollments")
    .select("employee_id, course_id").eq("id", enrollment_id).single()
  if (!en) return NextResponse.json({ error: "ไม่พบ enrollment" }, { status: 404 })
  const isOwner = en.employee_id === access.employeeId
  const isManager = access.isTrainingAdmin || access.isSupervisor
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // ── Reset module progress (try with quiz_reset_at, fallback ถ้า column ไม่มี) ──
  const now = new Date().toISOString()
  const fullPayload: any = {
    enrollment_id, module_id,
    watched_pct: 0,
    watch_time_sec: 0,
    last_position_sec: 0,
    completed: false,
    completed_at: null,
    answered_checkpoints: [],
    quiz_reset_at: now,
    updated_at: now,
  }
  const { error: upsertErr } = await svc.from("training_module_progress")
    .upsert(fullPayload, { onConflict: "enrollment_id,module_id" })
  if (upsertErr) {
    console.warn("[reset] full upsert failed, retry w/o quiz_reset_at:", upsertErr.message)
    // ถ้า column quiz_reset_at ยังไม่มี → fallback (ไม่มี filter ตาม reset_at แต่ลบ attempts แทน)
    delete fullPayload.quiz_reset_at
    await svc.from("training_module_progress").upsert(fullPayload, { onConflict: "enrollment_id,module_id" })
  }

  // ── ลบ quiz attempts เก่าของ module นี้ทิ้ง (ชัวร์ 100%) ──
  // หา quizzes ของ module นี้
  const { data: quizzes } = await svc.from("training_quizzes").select("id").eq("module_id", module_id)
  const quizIds = (quizzes ?? []).map((q: any) => q.id)
  if (quizIds.length > 0) {
    const { error: delErr } = await svc.from("training_quiz_attempts")
      .delete().eq("enrollment_id", enrollment_id).in("quiz_id", quizIds)
    if (delErr) console.warn("[reset] delete attempts failed:", delErr.message)
  }

  // ลบ checkpoint answers ของ module นี้
  await svc.from("training_checkpoint_answers")
    .delete().eq("enrollment_id", enrollment_id).eq("module_id", module_id)

  // Recalc enrollment progress_pct
  const { data: allModules } = await svc.from("training_modules").select("id").eq("course_id", en.course_id)
  const { data: allProgress } = await svc.from("training_module_progress").select("completed").eq("enrollment_id", enrollment_id)
  const total = (allModules ?? []).length
  const done = (allProgress ?? []).filter((p: any) => p.completed).length
  const overall = total > 0 ? Math.round((done / total) * 10000) / 100 : 0
  await svc.from("training_enrollments").update({
    progress_pct: overall,
    status: overall === 0 ? "not_started" : "in_progress",
  }).eq("id", enrollment_id)

  return NextResponse.json({ success: true, reset_at: now })
}
