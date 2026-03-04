import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"

export async function POST(request: Request) {
  const body = await request.json()
  const { action, ...payload } = body

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ดึง user + employee — รองรับทั้ง employee_id ใน users และ join employees
  const { data: userData } = await supa
    .from("users")
    .select("employee_id, role, employee:employees!employee_id(*, branch:branches(*))")
    .eq("id", user.id)
    .single()

  // empId = employee_id column หรือ employee.id จาก join
  const empId: string | undefined =
    userData?.employee_id ?? (userData?.employee as any)?.id
  const emp = userData?.employee as any

  if (!empId)
    return NextResponse.json({ success: false, error: "Employee not found" })

  // ──────────────────────────────────────────────────────────────
  // ACTION: submit
  // ──────────────────────────────────────────────────────────────
  if (action === "submit") {
    const { work_date, requested_clock_in, requested_clock_out, reason } = payload

    if (!work_date || !reason?.trim())
      return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" })
    if (!requested_clock_in && !requested_clock_out)
      return NextResponse.json({ success: false, error: "กรุณาระบุเวลาที่ต้องการแก้ไขอย่างน้อย 1 รายการ" })

    const { data: rec } = await supa
      .from("attendance_records")
      .select("id")
      .eq("employee_id", empId)
      .eq("work_date", work_date)
      .maybeSingle()
    if (!rec)
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลการเข้างานของวันที่ระบุ" })

    const { data: pending } = await supa
      .from("time_adjustment_requests")
      .select("id")
      .eq("employee_id", empId)
      .eq("work_date", work_date)
      .eq("status", "pending")
      .maybeSingle()
    if (pending)
      return NextResponse.json({ success: false, error: "มีคำขอที่รอดำเนินการอยู่แล้ว" })

    const { error } = await supa.from("time_adjustment_requests").insert({
      employee_id:          empId,
      company_id:           emp?.company_id,
      work_date,
      request_type:         "time_adjustment",
      requested_clock_in:   requested_clock_in  ? work_date + "T" + requested_clock_in  + ":00+07:00" : null,
      requested_clock_out:  requested_clock_out ? work_date + "T" + requested_clock_out + ":00+07:00" : null,
      reason:               reason.trim(),
      status:               "pending",
    })
    if (error) return NextResponse.json({ success: false, error: error.message })
    return NextResponse.json({ success: true })
  }

  // ──────────────────────────────────────────────────────────────
  // ACTION: approve
  // ──────────────────────────────────────────────────────────────
  if (action === "approve") {
    const { request_id, review_note } = payload
    if (!request_id)
      return NextResponse.json({ success: false, error: "ไม่พบ request_id" })

    if (!["manager", "hr_admin", "super_admin"].includes(userData?.role ?? ""))
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์อนุมัติ" }, { status: 403 })

    // ดึง correction request
    const { data: req } = await supa
      .from("time_adjustment_requests")
      .select("*")
      .eq("id", request_id)
      .in("status", ["pending", "approved"]) // รองรับ re-approve
      .single()
    if (!req)
      return NextResponse.json({ success: false, error: "ไม่พบคำขอ" })

    // ดึง attendance_record + shift
    const { data: rec } = await supa
      .from("attendance_records")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", req.employee_id)
      .eq("work_date", req.work_date)
      .single()
    if (!rec)
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลการเข้างาน" })

    const newClockIn  = req.requested_clock_in  ? new Date(req.requested_clock_in)  : (rec.clock_in  ? new Date(rec.clock_in)  : null)
    const newClockOut = req.requested_clock_out ? new Date(req.requested_clock_out) : (rec.clock_out ? new Date(rec.clock_out) : null)

    const shift        = rec.shift as any
    const lateThreshold = 5

    let newLateMin = 0
    let newStatus  = rec.status as string

    if (newClockIn && shift?.work_start) {
      const expectedStart = new Date(req.work_date + "T" + shift.work_start + "+07:00")
      newLateMin = calcLateMinutes(newClockIn, expectedStart)
    }

    if (newLateMin > lateThreshold) {
      newStatus  = "late"
    } else {
      newStatus  = "present"
      newLateMin = 0
    }

    let newWorkMin = rec.work_minutes ?? 0
    if (newClockIn && newClockOut) {
      newWorkMin = calcWorkMinutes(newClockIn, newClockOut, shift?.break_minutes ?? 60)
    }

    // ── 1. อัปเดต attendance_records ────────────────────────────
    const attUpdates: Record<string, any> = {
      late_minutes: newLateMin,
      status:       newStatus,
      work_minutes: newWorkMin,
      is_manual:    true,
    }
    if (req.requested_clock_in)  attUpdates.clock_in  = req.requested_clock_in
    if (req.requested_clock_out) attUpdates.clock_out = req.requested_clock_out

    const { error: recErr } = await supa
      .from("attendance_records")
      .update(attUpdates)
      .eq("id", rec.id)
    if (recErr) return NextResponse.json({ success: false, error: recErr.message })

    // ── 2. อัปเดต payroll_records deduct_late ถ้ามี ────────────
    // หา payroll record ของเดือนที่ work_date อยู่
    const workDate   = new Date(req.work_date)
    const workYear   = workDate.getFullYear()
    const workMonth  = workDate.getMonth() + 1

    const { data: payrollRec } = await supa
      .from("payroll_records")
      .select("id, deduct_late, late_count, base_salary")
      .eq("employee_id", req.employee_id)
      .eq("year",  workYear)
      .eq("month", workMonth)
      .maybeSingle()

    if (payrollRec) {
      // คำนวณ deduct_late ใหม่จาก attendance ทั้งเดือน
      const monthStart = `${workYear}-${String(workMonth).padStart(2,"0")}-01`
      const monthEnd   = new Date(workYear, workMonth, 0).toISOString().split("T")[0]

      const { data: attRows } = await supa
        .from("attendance_records")
        .select("status, late_minutes")
        .eq("employee_id", req.employee_id)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)

      const rows          = attRows ?? []
      const lateCount     = rows.filter(r => r.status === "late").length
      const absentCount   = rows.filter(r => r.status === "absent").length
      const totalLateMin  = rows.reduce((s, r) => s + (r.late_minutes || 0), 0)
      const dailyRate     = (payrollRec.base_salary ?? 0) / 26
      const minuteRate    = dailyRate / 8 / 60
      const newDeductLate   = Math.round(totalLateMin * minuteRate * 100) / 100
      const newDeductAbsent = Math.round(absentCount  * dailyRate  * 100) / 100

      await supa
        .from("payroll_records")
        .update({
          deduct_late:   newDeductLate,
          deduct_absent: newDeductAbsent,
          late_count:    lateCount,
          absent_days:   absentCount,
        })
        .eq("id", payrollRec.id)
    }

    // ── 3. mark request เป็น approved ───────────────────────────
    await supa
      .from("time_adjustment_requests")
      .update({
        status:       "approved",
        reviewed_by:  empId,
        reviewed_at:  new Date().toISOString(),
        review_note:  review_note ?? null,
      })
      .eq("id", request_id)

    return NextResponse.json({
      success: true,
      updated: { late_minutes: newLateMin, status: newStatus, work_minutes: newWorkMin },
    })
  }

  // ──────────────────────────────────────────────────────────────
  // ACTION: reject
  // ──────────────────────────────────────────────────────────────
  if (action === "reject") {
    const { request_id, review_note } = payload
    if (!request_id)
      return NextResponse.json({ success: false, error: "ไม่พบ request_id" })

    if (!["manager", "hr_admin", "super_admin"].includes(userData?.role ?? ""))
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์ปฏิเสธ" }, { status: 403 })

    const { error } = await supa
      .from("time_adjustment_requests")
      .update({
        status:      "rejected",
        reviewed_by: empId,
        reviewed_at: new Date().toISOString(),
        review_note: review_note ?? null,
      })
      .eq("id", request_id)
      .eq("status", "pending")

    if (error) return NextResponse.json({ success: false, error: error.message })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa
    .from("users")
    .select("employee_id, role, employee:employees!employee_id(company_id)")
    .eq("id", user.id)
    .single()

  if (!["manager", "hr_admin", "super_admin"].includes(userData?.role ?? ""))
    return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 403 })

  const companyId = (userData?.employee as any)?.company_id

  const { data, error } = await supa
    .from("time_adjustment_requests")
    .select("*, employee:employees!employee_id(id, first_name_th, last_name_th, employee_code, position:positions(name), department:departments(name))")
    .eq("company_id", companyId)
    .eq("status", status)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message })
  return NextResponse.json({ success: true, data })
}