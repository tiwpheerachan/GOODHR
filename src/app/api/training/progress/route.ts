import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// POST — update watch progress for a module
// body: { enrollment_id, module_id, watched_pct, watch_time_sec, last_position_sec }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const {
    enrollment_id, module_id, watched_pct, watch_time_sec, last_position_sec,
    answered_checkpoint_id, checkpoint_detail, // { question_text, question_type, answer, correct }
  } = body
  if (!enrollment_id || !module_id) return NextResponse.json({ error: "missing" }, { status: 400 })

  // verify learner owns enrollment
  const { data: en } = await svc.from("training_enrollments").select("employee_id, course_id, progress_pct").eq("id", enrollment_id).single()
  if (!en || en.employee_id !== access.employeeId) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // get module required_watch_pct + existing progress (for monotonic merge)
  const [{ data: mod }, { data: existing }] = await Promise.all([
    svc.from("training_modules").select("required_watch_pct").eq("id", module_id).single(),
    svc.from("training_module_progress")
      .select("watched_pct, watch_time_sec, answered_checkpoints, completed")
      .eq("enrollment_id", enrollment_id).eq("module_id", module_id).maybeSingle(),
  ])
  const required = Number(mod?.required_watch_pct ?? 80)

  // ── Monotonic: ค่า % และเวลาดูเดินหน้าอย่างเดียว (กัน race / out-of-order requests) ──
  const newWatchedPct = Math.max(Number(existing?.watched_pct ?? 0), Number(watched_pct ?? 0))
  const newWatchTime = Math.max(Number(existing?.watch_time_sec ?? 0), Number(watch_time_sec ?? 0))
  const completed = newWatchedPct >= required || !!existing?.completed

  // ── merge answered_checkpoints ────────────────────────────────────
  let answered_checkpoints: string[] = Array.isArray(existing?.answered_checkpoints) ? existing!.answered_checkpoints : []
  if (answered_checkpoint_id && !answered_checkpoints.includes(answered_checkpoint_id)) {
    answered_checkpoints = [...answered_checkpoints, answered_checkpoint_id]
  }

  const upsertData: any = {
    enrollment_id, module_id,
    watched_pct: newWatchedPct,
    watch_time_sec: newWatchTime,
    last_position_sec: last_position_sec ?? 0,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }
  if (answered_checkpoint_id) upsertData.answered_checkpoints = answered_checkpoints

  await svc.from("training_module_progress").upsert(upsertData, { onConflict: "enrollment_id,module_id" })

  // ── บันทึกประวัติการตอบ checkpoint (ถ้ามี detail) ─────────────
  if (answered_checkpoint_id && checkpoint_detail) {
    try {
      await svc.from("training_checkpoint_answers").insert({
        enrollment_id, module_id,
        checkpoint_id: answered_checkpoint_id,
        question_text: checkpoint_detail.question_text ?? "",
        question_type: checkpoint_detail.question_type ?? "mc",
        answer: checkpoint_detail.answer ?? null,
        correct: !!checkpoint_detail.correct,
      })
    } catch (e) { console.warn("checkpoint history save failed:", e) }
  }

  // recalc overall progress
  const { data: allModules } = await svc.from("training_modules").select("id").eq("course_id", en.course_id)
  const { data: allProgress } = await svc.from("training_module_progress").select("completed").eq("enrollment_id", enrollment_id)
  const total = (allModules ?? []).length
  const done = (allProgress ?? []).filter((p: any) => p.completed).length
  const overall = total > 0 ? Math.round((done / total) * 10000) / 100 : 0

  const updates: any = {
    progress_pct: overall,
    last_accessed_at: new Date().toISOString(),
  }
  if (en.progress_pct === 0 && overall > 0) updates.status = "in_progress"
  if (overall >= 100) {
    updates.status = "completed"
    updates.completed_at = new Date().toISOString()
  }

  await svc.from("training_enrollments").update(updates).eq("id", enrollment_id)
  return NextResponse.json({ success: true, progress_pct: overall, completed })
}
