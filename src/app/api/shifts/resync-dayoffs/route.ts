import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Re-sync วันหยุดประจำสัปดาห์ลงตารางกะที่ generate ไว้แล้ว (monthly_shift_assignments)
//   POST { employee_id, from_date?, to_date? }
//   - อ่าน fixed_dayoffs จาก profile ล่าสุด → flip work↔dayoff ตามช่วงที่เลือก
//   - คงไว้: holiday / leave (ไม่แตะ)  ·  work → ใส่ default shift, dayoff → shift_id null
//   - from_date ว่าง = วันนี้ (Asia/Bangkok) · to_date ว่าง = ไม่จำกัด (ทุกวันที่มีตาราง)
//   สิทธิ์: super_admin / hr_admin
// ════════════════════════════════════════════════════════════════════
const DOW_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const { data: me } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!me || !["super_admin", "hr_admin"].includes(me.role)) {
    return NextResponse.json({ error: "เฉพาะ HR/Admin เท่านั้น" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const employeeId = (body?.employee_id ?? "").toString()
  if (!employeeId) return NextResponse.json({ error: "missing employee_id" }, { status: 400 })

  const todayBkk = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })  // yyyy-mm-dd
  const fromDate: string = body?.from_date || todayBkk
  const toDate: string | null = body?.to_date || null

  // profile → fixed_dayoffs + default shift
  const { data: prof } = await svc.from("employee_schedule_profiles")
    .select("fixed_dayoffs, default_shift_id").eq("employee_id", employeeId).maybeSingle()
  const dayoffs = (Array.isArray(prof?.fixed_dayoffs) ? prof!.fixed_dayoffs : []) as string[]
  const defShift = prof?.default_shift_id ?? null

  // ดึงตารางที่มีอยู่ในช่วง — แตะเฉพาะ work / dayoff (คง holiday/leave)
  let q = svc.from("monthly_shift_assignments")
    .select("id, work_date, assignment_type, shift_id")
    .eq("employee_id", employeeId)
    .in("assignment_type", ["work", "dayoff"])
    .gte("work_date", fromDate)
  if (toDate) q = q.lte("work_date", toDate)
  const { data: existing, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let changed = 0
  const updates: { id: string; assignment_type: string; shift_id: string | null }[] = []
  for (const a of existing ?? []) {
    const dow = new Date(a.work_date + "T00:00:00").getDay()
    const isDayoff = dayoffs.includes(DOW_NAMES[dow])
    const newType = isDayoff ? "dayoff" : "work"
    const newShift = isDayoff ? null : defShift
    if (a.assignment_type !== newType || (a.shift_id ?? null) !== newShift) {
      updates.push({ id: a.id, assignment_type: newType, shift_id: newShift })
    }
  }
  for (const u of updates) {
    const { error: uErr } = await svc.from("monthly_shift_assignments")
      .update({ assignment_type: u.assignment_type, shift_id: u.shift_id }).eq("id", u.id)
    if (!uErr) changed++
  }

  return NextResponse.json({ success: true, changed, scanned: existing?.length ?? 0, from: fromDate, to: toDate })
}
