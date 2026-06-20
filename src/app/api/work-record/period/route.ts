import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

/**
 * GET /api/work-record/period?employee_id=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * รวมข้อมูลทุกอย่างที่หน้า "บันทึกการเข้างาน Pro Max" ต้องใช้:
 *   - attendance_records   (เข้า-ออก, สาย, OT)
 *   - monthly_shift_assignments + shift_templates (กะรายวัน + ข้อมูลกะ)
 *   - employee_schedule_profiles (default shift = fallback)
 *   - leave_requests (การลา)
 *   - overtime_requests (ใบขอ OT)
 *
 * ใช้ service client เพื่อ bypass RLS — เพราะ HR admin ต้องเห็นทุกคนในบริษัท
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role, employee_id").eq("id", user.id).single()
  if (!dbUser || !["super_admin", "hr_admin", "manager"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const employee_id = sp.get("employee_id")
  const from = sp.get("from")
  const to = sp.get("to")
  if (!employee_id || !from || !to) {
    return NextResponse.json({ error: "missing params" }, { status: 400 })
  }

  // ── load employee company_id ──────────────────────────────────────
  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employee_id).single()
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  // ── parallel fetch ────────────────────────────────────────────────
  const [attRes, assignRes, tplRes, profileRes, leaveRes, otRes, adjRes] = await Promise.all([
    svc.from("attendance_records")
      .select("id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, ot_minutes, work_minutes, note")
      .eq("employee_id", employee_id).gte("work_date", from).lte("work_date", to)
      .order("work_date"),

    svc.from("monthly_shift_assignments")
      .select("work_date, assignment_type, shift_id, leave_type, note")
      .eq("employee_id", employee_id).gte("work_date", from).lte("work_date", to),

    svc.from("shift_templates")
      .select("id, name, work_start, work_end, is_overnight, break_minutes")
      .eq("company_id", emp.company_id).order("work_start"),

    svc.from("employee_schedule_profiles")
      .select("default_shift_id, schedule_type, fixed_dayoffs")
      .eq("employee_id", employee_id).maybeSingle(),

    svc.from("leave_requests")
      .select("id, start_date, end_date, total_days, status, is_half_day, half_day_period, reason, attachment_url, attachment_urls, attachment_names, reviewed_by, reviewed_at, review_note, leave_type:leave_types(id, name, code, color_hex)")
      .eq("employee_id", employee_id)
      .neq("status", "cancelled")
      .lte("start_date", to).gte("end_date", from),

    svc.from("overtime_requests")
      .select("id, work_date, ot_start, ot_end, ot_rate, status, reason, reviewed_by, reviewed_at, review_note")
      .eq("employee_id", employee_id).gte("work_date", from).lte("work_date", to),

    // ── time_adjustment_requests (คำขอแก้เวลา) ──
    svc.from("time_adjustment_requests")
      .select("id, work_date, requested_clock_in, requested_clock_out, status, reason, reviewed_by, reviewed_at, review_note, attachment_url, attachment_urls, attachment_names, created_at")
      .eq("employee_id", employee_id).gte("work_date", from).lte("work_date", to)
      .order("created_at", { ascending: false }),
  ])

  // ── resolve shift template per assignment via lookup ──────────────
  const tplMap = new Map<string, any>((tplRes.data ?? []).map((s: any) => [s.id, s]))
  const assignments = (assignRes.data ?? []).map((a: any) => ({
    ...a,
    shift: a.shift_id ? tplMap.get(a.shift_id) ?? null : null,
  }))

  // ── default shift (fallback ถ้าวันไหนยังไม่มี assignment) ───────
  const defaultShiftId: string | null = profileRes.data?.default_shift_id ?? null
  const defaultShift = defaultShiftId ? tplMap.get(defaultShiftId) ?? null : null

  return NextResponse.json({
    success: true,
    attendance:        attRes.data ?? [],
    assignments,
    shift_templates:   tplRes.data ?? [],
    default_shift_id:  defaultShiftId,
    default_shift:     defaultShift,
    leaves:            leaveRes.data ?? [],
    overtimes:         otRes.data ?? [],
    adjustments:       adjRes.data ?? [],
  })
}
