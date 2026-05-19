import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

/**
 * GET /api/training/learner/module?module_id=...
 * ดึง module + checkpoints + progress ของ learner คนนั้น
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.employeeId) return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const moduleId = sp.get("module_id")
  if (!moduleId) return NextResponse.json({ error: "missing module_id" }, { status: 400 })

  const { data: m, error } = await svc.from("training_modules")
    .select("*, checkpoints:training_video_checkpoints(*)")
    .eq("id", moduleId).single()
  if (error || !m) return NextResponse.json({ error: "ไม่พบบทเรียน" }, { status: 404 })

  // ── ตรวจสิทธิ์ — admin หรือลงทะเบียนคอร์สนี้ ──
  const isManager = access.isTrainingAdmin || access.isSupervisor
  let enrollment: any = null
  if (!isManager) {
    const { data: en } = await svc.from("training_enrollments")
      .select("id").eq("course_id", m.course_id).eq("employee_id", access.employeeId).maybeSingle()
    if (!en) return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 })
    enrollment = en
  } else {
    const { data: en } = await svc.from("training_enrollments")
      .select("id").eq("course_id", m.course_id).eq("employee_id", access.employeeId).maybeSingle()
    enrollment = en
  }

  // ── โหลด progress ────────────────────────────────────────────
  let progress: any = null
  if (enrollment?.id) {
    const { data: p } = await svc.from("training_module_progress")
      .select("*").eq("enrollment_id", enrollment.id).eq("module_id", moduleId).maybeSingle()
    progress = p
  }

  return NextResponse.json({
    module: m,
    checkpoints: (m as any).checkpoints ?? [],
    progress,
    enrollment_id: enrollment?.id ?? null,
  })
}
