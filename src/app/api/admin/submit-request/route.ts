import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// HR/Admin ยื่นคำร้องแทนพนักงาน (ลา / OT / แก้เวลา)
//   POST { employee_id, type: "leave"|"overtime"|"adjustment", ...fields }
//   สร้างเป็น status = "pending" → ไหลเข้าคิวอนุมัติปกติ (side-effect ครบ)
//   สิทธิ์: super_admin / hr_admin
// ════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const { data: me } = await svc.from("users").select("role, employee_id, company_id, employee:employees(first_name_th, last_name_th)").eq("id", user.id).single()
  if (!me || !["super_admin", "hr_admin"].includes(me.role)) {
    return NextResponse.json({ error: "เฉพาะ HR/Admin เท่านั้น" }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const employeeId = (b?.employee_id ?? "").toString()
  const type = (b?.type ?? "").toString()
  if (!employeeId || !type) return NextResponse.json({ error: "missing employee_id / type" }, { status: 400 })

  const { data: emp } = await svc.from("employees").select("id, company_id, first_name_th, last_name_th").eq("id", employeeId).maybeSingle()
  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
  // hr_admin จำกัดเฉพาะบริษัทตัวเอง
  if (me.role !== "super_admin" && emp.company_id !== me.company_id) {
    return NextResponse.json({ error: "ยื่นแทนได้เฉพาะพนักงานบริษัทของคุณ" }, { status: 403 })
  }

  const hrName = (me.employee as any) ? `${(me.employee as any).first_name_th} ${(me.employee as any).last_name_th}` : "HR"
  const tag = `[ยื่นโดย ${hrName} แทน]`
  const reason = `${(b?.reason ?? "").toString().trim()}`.trim()
  const reasonWithTag = reason ? `${reason} ${tag}` : tag

  // ── LEAVE ──
  if (type === "leave") {
    const { leave_type_id, start_date, end_date, is_half_day, half_day_period } = b
    if (!leave_type_id || !start_date) return NextResponse.json({ error: "กรุณาเลือกประเภทลา + วันที่" }, { status: 400 })
    const s = new Date(start_date), e = new Date(end_date || start_date)
    const days = is_half_day ? 0.5 : Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1
    const { error } = await svc.from("leave_requests").insert({
      employee_id: employeeId, company_id: emp.company_id,
      leave_type_id, start_date, end_date: end_date || start_date,
      total_days: days, is_half_day: !!is_half_day,
      half_day_period: is_half_day ? (half_day_period || "morning") : null,
      reason: reasonWithTag, status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── OVERTIME ──
  if (type === "overtime") {
    const { work_date, ot_start, ot_end, ot_rate } = b
    if (!work_date || !ot_start || !ot_end) return NextResponse.json({ error: "กรุณากรอกวันที่ + เวลา OT" }, { status: 400 })
    const [sh, sm] = String(ot_start).split(":").map(Number)
    const [eh, em] = String(ot_end).split(":").map(Number)
    const endDate = (eh * 60 + em) <= (sh * 60 + sm)
      ? new Date(new Date(work_date).getTime() + 86400000).toISOString().slice(0, 10) : work_date
    const { error } = await svc.from("overtime_requests").insert({
      employee_id: employeeId, company_id: emp.company_id, work_date,
      ot_start: `${work_date}T${ot_start}:00+07:00`, ot_end: `${endDate}T${ot_end}:00+07:00`,
      ot_rate: Number(ot_rate) || 1.5, reason: reasonWithTag, status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── TIME ADJUSTMENT ──
  if (type === "adjustment") {
    const { work_date, requested_clock_in, requested_clock_out, clock_out_date } = b
    if (!work_date || (!requested_clock_in && !requested_clock_out)) return NextResponse.json({ error: "กรุณากรอกวันที่ + เวลาที่ต้องการ" }, { status: 400 })
    const outDate = clock_out_date || work_date
    const { error } = await svc.from("time_adjustment_requests").insert({
      employee_id: employeeId, company_id: emp.company_id, work_date, request_type: "time_adjustment",
      requested_clock_in: requested_clock_in ? `${work_date}T${requested_clock_in}:00+07:00` : null,
      requested_clock_out: requested_clock_out ? `${outDate}T${requested_clock_out}:00+07:00` : null,
      reason: reasonWithTag, status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "ประเภทคำร้องไม่ถูกต้อง" }, { status: 400 })
}
