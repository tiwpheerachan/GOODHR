import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"
import { isPayrollPeriodLocked } from "@/lib/utils/periodLock"
import { logApproval } from "@/lib/auditLog"

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
    const { work_date, requested_clock_in, requested_clock_out, clock_out_date, reason } = payload

    if (!work_date || !reason?.trim())
      return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" })
    if (!requested_clock_in && !requested_clock_out)
      return NextResponse.json({ success: false, error: "กรุณาระบุเวลาที่ต้องการแก้ไขอย่างน้อย 1 รายการ" })

    // ตรวจ: งวดเงินเดือนถูกล็อกหรือยัง
    if (emp?.company_id) {
      const { locked, periodName } = await isPayrollPeriodLocked(supa, emp.company_id, work_date)
      if (locked) return NextResponse.json({ success: false, error: `งวด${periodName || ""}ปิดแล้ว ไม่สามารถยื่นแก้ไขเวลาได้ กรุณาติดต่อ HR` })
    }

    // วันที่ออก: ใช้ clock_out_date ถ้ามี (กะข้ามคืน) ไม่งั้นใช้ work_date
    const outDate = clock_out_date || work_date

    let { data: rec } = await supa
      .from("attendance_records")
      .select("id")
      .eq("employee_id", empId)
      .eq("work_date", work_date)
      .maybeSingle()

    // ถ้ายังไม่มี attendance record → สร้างให้อัตโนมัติ (status=absent ตั้งต้น)
    // เพื่อให้ยื่นขอแก้ไขเวลาได้แม้ไม่ได้เช็คอิน
    if (!rec) {
      const { data: newRec, error: createErr } = await supa
        .from("attendance_records")
        .insert({
          employee_id: empId,
          company_id:  emp?.company_id,
          work_date,
          status:      "absent",
          is_manual:   true,
        })
        .select("id")
        .single()
      if (createErr)
        return NextResponse.json({ success: false, error: `สร้างข้อมูลเข้างานไม่สำเร็จ: ${createErr.message}` })
      rec = newRec
    }

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
      requested_clock_out:  requested_clock_out ? outDate   + "T" + requested_clock_out + ":00+07:00" : null,
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

    // ดึง attendance_record + shift (ถ้ายังไม่มี → สร้างให้อัตโนมัติ)
    let { data: rec } = await supa
      .from("attendance_records")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", req.employee_id)
      .eq("work_date", req.work_date)
      .maybeSingle()

    if (!rec) {
      // สร้าง attendance record ตั้งต้นให้ (สำหรับกรณีไม่ได้เช็คอิน)
      const { data: empInfo } = await supa
        .from("employees")
        .select("company_id, shift_template_id")
        .eq("id", req.employee_id)
        .single()

      const { data: newRec, error: createErr } = await supa
        .from("attendance_records")
        .insert({
          employee_id:      req.employee_id,
          company_id:       empInfo?.company_id ?? req.company_id,
          work_date:        req.work_date,
          shift_template_id: empInfo?.shift_template_id ?? null,
          status:           "absent",
          is_manual:        true,
        })
        .select("*, shift:shift_templates(*)")
        .single()
      if (createErr || !newRec)
        return NextResponse.json({ success: false, error: `สร้างข้อมูลเข้างานไม่สำเร็จ: ${createErr?.message}` })
      rec = newRec
    }

    const newClockIn  = req.requested_clock_in  ? new Date(req.requested_clock_in)  : (rec.clock_in  ? new Date(rec.clock_in)  : null)
    const newClockOut = req.requested_clock_out ? new Date(req.requested_clock_out) : (rec.clock_out ? new Date(rec.clock_out) : null)

    const shift = rec.shift as any

    // ── ดึงชื่อแผนก + รหัสบริษัทของพนักงาน เพื่อคำนวณ grace period ──
    const { data: corrEmpInfo } = await supa
      .from("employees")
      .select("department:departments(name), company:companies(code)")
      .eq("id", req.employee_id)
      .single()
    const corrDeptName   = (corrEmpInfo?.department as any)?.name as string | undefined
    const corrCompanyCode = (corrEmpInfo?.company as any)?.code as string | undefined
    const lateThreshold  = getLateThreshold(corrDeptName, corrCompanyCode)

    let newLateMin = 0
    let newStatus  = rec.status as string

    if (newClockIn && shift?.work_start) {
      const expectedStart = new Date(req.work_date + "T" + shift.work_start + "+07:00")
      newLateMin = calcLateMinutes(newClockIn, expectedStart)
    }

    // ใช้ grace threshold: ถ้าสายไม่เกิน grace → ไม่นับสาย
    if (newLateMin > lateThreshold) {
      newStatus  = "late"
      newLateMin = Math.max(newLateMin - lateThreshold, 0)  // หัก grace แล้วเก็บ
    } else {
      newStatus  = "present"
      newLateMin = 0
    }

    let newWorkMin = rec.work_minutes ?? 0
    if (newClockIn && newClockOut) {
      newWorkMin = calcWorkMinutes(newClockIn, newClockOut, shift?.break_minutes ?? 60)
    }

    // ── คำนวณ early_out_minutes ใหม่ ────────────────────────────
    let newEarlyMin = 0
    if (newClockOut && shift?.work_end) {
      const expectedEnd = new Date(req.work_date + "T" + shift.work_end + "+07:00")
      const diffMin = Math.round((expectedEnd.getTime() - newClockOut.getTime()) / 60000)
      newEarlyMin = diffMin > 0 ? diffMin : 0
    }

    // ถ้าแก้ clock_out ให้ถูก → status ต้องไม่เป็น early_out อีก
    if (newEarlyMin <= 0 && newStatus === "early_out") {
      newStatus = newLateMin > 0 ? "late" : "present"
    }

    // ── 1. อัปเดต attendance_records ────────────────────────────
    const attUpdates: Record<string, any> = {
      late_minutes:      newLateMin,
      early_out_minutes: newEarlyMin,
      status:            newStatus,
      work_minutes:      newWorkMin,
      is_manual:         true,
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
        .select("status, late_minutes, early_out_minutes")
        .eq("employee_id", req.employee_id)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)

      const rows          = attRows ?? []
      const lateCount     = rows.filter((r: any) => r.status === "late").length
      const absentCount   = rows.filter((r: any) => r.status === "absent").length
      const totalLateMin  = rows.reduce((s: number, r: any) => s + (Number(r.late_minutes) || 0), 0)
      const totalEarlyMin = rows.reduce((s: number, r: any) => s + (Number(r.early_out_minutes) || 0), 0)
      const dailyRate     = (payrollRec.base_salary ?? 0) / 30
      const minuteRate    = dailyRate / 8 / 60
      const newDeductLate     = Math.round(totalLateMin  * minuteRate * 100) / 100
      const newDeductEarly    = Math.round(totalEarlyMin * minuteRate * 100) / 100
      const newDeductAbsent   = Math.round(absentCount   * dailyRate  * 100) / 100

      await supa
        .from("payroll_records")
        .update({
          deduct_late:      newDeductLate,
          deduct_early_out: newDeductEarly,
          deduct_absent:    newDeductAbsent,
          late_count:       lateCount,
          absent_days:      absentCount,
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

    // Audit log
    const { data: adjEmpInfo } = await supa.from("employees").select("first_name_th, last_name_th").eq("id", req.employee_id).single()
    const { data: actorInfo } = await supa.from("employees").select("first_name_th, last_name_th, company_id").eq("id", empId).single()
    logApproval(supa, {
      actorId: empId!, actorName: actorInfo ? `${actorInfo.first_name_th} ${actorInfo.last_name_th}` : undefined,
      action: "approved", requestType: "time_adjustment", requestId: request_id,
      employeeName: adjEmpInfo ? `${adjEmpInfo.first_name_th} ${adjEmpInfo.last_name_th}` : undefined,
      companyId: actorInfo?.company_id,
    })

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

    // Audit log
    const { data: rejEmpInfo } = await supa.from("time_adjustment_requests").select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", request_id).single()
    const { data: rejActorInfo } = await supa.from("employees").select("first_name_th, last_name_th, company_id").eq("id", empId).single()
    logApproval(supa, {
      actorId: empId!, actorName: rejActorInfo ? `${rejActorInfo.first_name_th} ${rejActorInfo.last_name_th}` : undefined,
      action: "rejected", requestType: "time_adjustment", requestId: request_id,
      employeeName: (rejEmpInfo?.employee as any) ? `${(rejEmpInfo?.employee as any).first_name_th} ${(rejEmpInfo?.employee as any).last_name_th}` : undefined,
      companyId: rejActorInfo?.company_id,
    })

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