import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getLateThreshold } from "@/lib/utils/payroll"

export async function POST(request: Request) {
  const { request_id, action } = await request.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── ดึง adjustment request ─────────────────────────────────
  const { data: req } = await supa
    .from("time_adjustment_requests")
    .select("*, employee:employees(id, company_id, department:departments(name))")
    .eq("id", request_id)
    .single()

  if (!req) return NextResponse.json({ error: "ไม่พบคำขอ" })

  // ── หา reviewer id ─────────────────────────────────────────
  const { data: reviewer } = await supa
    .from("employees").select("id").eq("user_id", user.id).maybeSingle()

  // ── อัปเดตสถานะ request ───────────────────────────────────
  await supa.from("time_adjustment_requests").update({
    status:      action,
    reviewed_by: reviewer?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }).eq("id", request_id)

  if (action !== "approved") {
    return NextResponse.json({ success: true })
  }

  // ── ดึง attendance record เดิม ────────────────────────────
  const { data: existing } = await supa
    .from("attendance_records")
    .select("*")
    .eq("employee_id", req.employee_id)
    .eq("work_date", req.work_date)
    .maybeSingle()

  // ── ดึง shift ─────────────────────────────────────────────
  const { data: schedule } = await supa
    .from("work_schedules")
    .select("*, shift:shift_templates(*)")
    .eq("employee_id", req.employee_id)
    .lte("effective_from", req.work_date)
    .order("effective_from", { ascending: false })
    .limit(1).maybeSingle()

  const shift = (schedule as any)?.shift

  // ── ใช้เวลาที่แก้ไข หรือเวลาเดิม ─────────────────────────
  const newClockIn  = req.requested_clock_in  ?? existing?.clock_in
  const newClockOut = req.requested_clock_out ?? existing?.clock_out

  // ── คำนวณ late_minutes ใหม่ ───────────────────────────────
  const deptName      = (req.employee as any)?.department?.name ?? null
  const lateThreshold = getLateThreshold(deptName)
  let newLateMin = 0

  if (newClockIn && shift?.work_start) {
    const expectedStart = new Date(req.work_date + "T" + shift.work_start + "+07:00")
    const actualIn      = new Date(newClockIn)
    const rawLate       = Math.max(Math.floor((actualIn.getTime() - expectedStart.getTime()) / 60000), 0)
    newLateMin          = Math.max(rawLate - lateThreshold, 0)
  }

  // ── คำนวณ early_out_minutes ใหม่ ─────────────────────────
  let newEarlyOutMin = 0
  if (newClockOut && shift?.work_end) {
    const expectedEnd = new Date(req.work_date + "T" + shift.work_end + "+07:00")
    const actualOut   = new Date(newClockOut)
    newEarlyOutMin    = Math.max(Math.floor((expectedEnd.getTime() - actualOut.getTime()) / 60000), 0)
  }

  // ── คำนวณ work_minutes ───────────────────────────────────
  let newWorkMin = existing?.work_minutes ?? 0
  if (newClockIn && newClockOut) {
    newWorkMin = Math.max(
      Math.floor((new Date(newClockOut).getTime() - new Date(newClockIn).getTime()) / 60000), 0
    )
  }

  // ── กำหนด status ใหม่ ─────────────────────────────────────
  let newStatus: string
  if      (newLateMin > 0)    newStatus = "late"
  else if (newEarlyOutMin > 0) newStatus = "early_out"
  else                         newStatus = "present"   // แก้เวลาแล้ว = ปกติ

  // ── save ──────────────────────────────────────────────────
  const { error: upsertErr } = await supa.from("attendance_records").upsert({
    employee_id:       req.employee_id,
    company_id:        req.employee?.company_id ?? existing?.company_id,
    work_date:         req.work_date,
    clock_in:          newClockIn,
    clock_out:         newClockOut,
    late_minutes:      newLateMin,
    early_out_minutes: newEarlyOutMin,
    work_minutes:      newWorkMin,
    status:            newStatus,
    is_manual:         true,
    approved_by:       reviewer?.id ?? null,
    approved_at:       new Date().toISOString(),
    shift_template_id: shift?.id ?? existing?.shift_template_id,
  }, { onConflict: "employee_id,work_date" })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message })

  return NextResponse.json({
    success: true,
    result: { newLateMin, newEarlyOutMin, newStatus, lateThreshold, deptName }
  })
}