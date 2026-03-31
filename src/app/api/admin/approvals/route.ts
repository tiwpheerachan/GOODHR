import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { logApproval, logAudit } from "@/lib/auditLog"
import { calculatePayrollSummary, type OTBreakdown } from "@/lib/utils/payroll"

// ── recalculate payroll_records หลังอนุมัติ OT ──────────────────────────────
// เรียกใช้หลังจาก attendance_records.ot_minutes ถูก update แล้ว
// ใช้ logic เดียวกับ calcAndSave ใน /api/payroll/route.ts
async function recalcPayrollAfterOT(supa: any, employeeId: string, workDate: string) {
  try {
    // ── 1. ดึง employee (ต้องการ company_id, is_attendance_exempt) ──
    const { data: empData } = await supa
      .from("employees")
      .select("company_id, is_attendance_exempt")
      .eq("id", employeeId)
      .single()
    if (!empData?.company_id) return

    // ── 2. หา payroll_period ที่ครอบคลุม workDate (filter by company_id) ──
    const { data: period } = await supa
      .from("payroll_periods")
      .select("id, start_date, end_date")
      .eq("company_id", empData.company_id)
      .lte("start_date", workDate)
      .gte("end_date",   workDate)
      .maybeSingle()
    if (!period) return

    // ── 3. ดึงข้อมูลพร้อมกัน 6 queries ──
    const [payrollRes, salRes, attRes, holRes, shiftRes, schedRes] = await Promise.all([
      supa.from("payroll_records")
        .select("id, base_salary, allowance_position, allowance_food, allowance_phone, allowance_housing, deduct_loan, deduct_other, bonus")
        .eq("employee_id", employeeId)
        .eq("payroll_period_id", period.id)
        .maybeSingle(),
      supa.from("salary_structures")
        .select("base_salary, ot_rate_normal, ot_rate_holiday, tax_withholding_pct")
        .eq("employee_id", employeeId)
        .is("effective_to", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supa.from("attendance_records")
        .select("work_date, ot_minutes, work_minutes, late_minutes, early_out_minutes, status")
        .eq("employee_id", employeeId)
        .gte("work_date", period.start_date)
        .lte("work_date", period.end_date),
      supa.from("company_holidays")
        .select("date")
        .eq("company_id", empData.company_id)
        .eq("is_active", true)
        .gte("date", period.start_date)
        .lte("date", period.end_date),
      supa.from("monthly_shift_assignments")
        .select("work_date, assignment_type")
        .eq("employee_id", employeeId)
        .gte("work_date", period.start_date)
        .lte("work_date", period.end_date),
      supa.from("employee_schedule_profiles")
        .select("fixed_dayoffs")
        .eq("employee_id", employeeId)
        .maybeSingle(),
    ])

    const payrollRec = payrollRes.data
    if (!payrollRec) return // ยังไม่มี payroll_record → admin ต้องสร้างก่อน

    const sal          = salRes.data
    const attRows      = (attRes.data ?? []) as any[]
    const holidaySet   = new Set<string>((holRes.data ?? []).map((h: any) => h.date as string))
    const fixedDayoffs = schedRes.data?.fixed_dayoffs as string[] | undefined

    // shiftMap: work_date → assignment_type
    const shiftMap = new Map<string, string>()
    for (const s of (shiftRes.data ?? [])) shiftMap.set(s.work_date, s.assignment_type)

    // ── 4. isWorkDay — ตรงกับ logic ใน /api/payroll/route.ts ──
    const DOW_NAMES = ["sun","mon","tue","wed","thu","fri","sat"] as const
    const dowOf = (ds: string) => {
      const [y, m, d] = ds.split("-").map(Number)
      return new Date(y, m - 1, d).getDay()
    }
    const isWorkDay = (date: string): boolean => {
      const asgn = shiftMap.size > 0 ? shiftMap.get(date) : undefined
      if (asgn !== undefined) return asgn === "work"
      if (fixedDayoffs !== undefined) {
        return !fixedDayoffs.includes(DOW_NAMES[dowOf(date)]) && !holidaySet.has(date)
      }
      const dow = dowOf(date)
      return dow !== 0 && dow !== 6 && !holidaySet.has(date)
    }

    // ── 5. แยก OT weekday / holiday (เหมือน calcAndSave ทุกประการ) ──
    let weekdayOtMin  = 0
    let holidayRegMin = 0
    let holidayOtMin  = 0
    let totalLateMin  = 0
    let totalEarlyMin = 0
    let absentDays    = 0

    for (const r of attRows) {
      const otMin   = Number(r.ot_minutes)   || 0
      const workMin = Number(r.work_minutes) || 0
      const wd      = r.work_date as string

      if (otMin > 0 || workMin > 0) {
        if (!isWorkDay(wd)) {
          holidayRegMin += Math.max(0, workMin - otMin) // งานวันหยุด 1.0x
          holidayOtMin  += otMin                        // OT วันหยุด 3.0x
        } else {
          weekdayOtMin  += otMin                        // OT วันทำงาน 1.5x
        }
      }

      totalLateMin  += Number(r.late_minutes)       || 0
      totalEarlyMin += Number(r.early_out_minutes)  || 0
      if (r.status === "absent") absentDays++
    }

    const otBreakdown: OTBreakdown = {
      weekday_minutes:         weekdayOtMin,
      holiday_regular_minutes: holidayRegMin,
      holiday_ot_minutes:      holidayOtMin,
    }

    // ── 6. คำนวณ summary ด้วย calculatePayrollSummary ──
    const isExempt = !!empData.is_attendance_exempt
    const base     = Number(sal?.base_salary ?? payrollRec.base_salary) || 0
    const allAlw   = (Number(payrollRec.allowance_position) || 0)
                   + (Number(payrollRec.allowance_food)     || 0)
                   + (Number(payrollRec.allowance_phone)    || 0)
                   + (Number(payrollRec.allowance_housing)  || 0)

    const summary = calculatePayrollSummary({
      baseSalary:       base,
      allowances:       allAlw,
      otBreakdown,
      bonus:            Number(payrollRec.bonus) || 0,
      absentDays:       isExempt ? 0 : absentDays,
      lateMinutes:      isExempt ? 0 : totalLateMin,
      earlyOutMinutes:  isExempt ? 0 : totalEarlyMin,
      loanDeduction:    Number(payrollRec.deduct_loan) || 0,
      otRateWeekday:    sal?.ot_rate_normal  != null ? Number(sal.ot_rate_normal)  : null,
      otRateHoliday:    sal?.ot_rate_holiday != null ? Number(sal.ot_rate_holiday) : null,
      taxWithholdingPct: sal?.tax_withholding_pct != null ? Number(sal.tax_withholding_pct) : null,
    })

    // deduct_other = ค่าหักลาไม่ได้เงิน (คงค่าเดิม ไม่แตะ)
    const deductUnpaidLeave = Number(payrollRec.deduct_other) || 0

    // ── 7. update payroll_records ครบทุกฟิลด์ที่ได้รับผลจาก OT ──
    await supa.from("payroll_records").update({
      // OT minutes (ทั้ง 3 ประเภท)
      ot_weekday_minutes:     weekdayOtMin,
      ot_holiday_reg_minutes: holidayRegMin,
      ot_holiday_ot_minutes:  holidayOtMin,
      ot_hours:               (weekdayOtMin + holidayRegMin + holidayOtMin) / 60,
      ot_amount:              summary.otAmount,
      // รายได้รวม
      gross_income:           summary.gross,
      // การหักที่ขึ้นกับรายได้
      deduct_absent:          summary.deductAbsent,
      deduct_late:            summary.deductLate,
      deduct_early_out:       summary.deductEarlyOut,
      // ประกันสังคม + ภาษี (ขึ้นกับ gross)
      social_security_amount: summary.sso,
      taxable_income:         summary.gross - summary.sso,
      monthly_tax_withheld:   summary.tax,
      // รวมหัก + เงินสุทธิ
      total_deductions:       summary.totalDeduct + deductUnpaidLeave,
      net_salary:             Math.max(summary.net - deductUnpaidLeave, 0),
      updated_at:             new Date().toISOString(),
    }).eq("id", payrollRec.id)

  } catch (e) {
    // fire-and-forget: ไม่ block การอนุมัติ OT ถ้า recalc ล้มเหลว
    console.error("[recalcPayrollAfterOT]", e)
  }
}

// GET — ดึงคำร้องทุกประเภทรวม
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = req.nextUrl.searchParams
  const companyId = url.get("company_id") // "all" or UUID
  const status = url.get("status") // pending | approved | rejected | cancelled | cancel_requested | all
  const type = url.get("type") // leave | adjustment | overtime | all
  const dateFrom = url.get("date_from")
  const dateTo = url.get("date_to")
  const search = url.get("search")

  const empSelect = `employee:employees!employee_id(id,employee_code,first_name_th,last_name_th,nickname,avatar_url,department:departments(name),position:positions(name),company:companies(code))`

  const results: any[] = []

  // Helper: build company + date + status filters
  const applyFilters = (q: any, dateCol: string, statusVal: string | null) => {
    if (companyId && companyId !== "all") q = q.eq("company_id", companyId)
    if (statusVal === "cancel_requested") {
      q = q.eq("status", "approved").like("review_note", "%CANCEL_REQ%")
    } else if (statusVal && statusVal !== "all") {
      q = q.eq("status", statusVal)
    }
    if (dateFrom) q = q.gte(dateCol, dateFrom)
    if (dateTo) q = q.lte(dateCol, dateTo)
    if (search) {
      q = q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`, { referencedTable: "employees" })
    }
    return q
  }

  const shouldFetch = (t: string) => !type || type === "all" || type === t

  // ── Leave requests ──
  if (shouldFetch("leave")) {
    let q = supa.from("leave_requests")
      .select(`id,employee_id,company_id,leave_type_id,start_date,end_date,total_days,is_half_day,half_day_period,reason,status,requested_at,reviewed_at,review_note,created_at,${empSelect},leave_type:leave_types(id,name,color_hex)`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "start_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      results.push({
        ...r, request_type: "leave",
        date_label: r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`,
        detail: `${(r as any).leave_type?.name || "ลา"} ${r.total_days} วัน`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Time adjustment requests ──
  if (shouldFetch("adjustment")) {
    let q = supa.from("time_adjustment_requests")
      .select(`id,employee_id,company_id,work_date,requested_clock_in,requested_clock_out,reason,status,reviewed_at,review_note,created_at,${empSelect}`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      const cin = r.requested_clock_in ? new Date(r.requested_clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      const cout = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      results.push({
        ...r, request_type: "adjustment",
        date_label: r.work_date,
        detail: `เข้า ${cin} · ออก ${cout}`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Overtime requests ──
  if (shouldFetch("overtime")) {
    let q = supa.from("overtime_requests")
      .select(`id,employee_id,company_id,work_date,ot_start,ot_end,reason,status,reviewed_at,review_note,created_at,${empSelect}`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      const s = r.ot_start ? new Date(r.ot_start).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      const e = r.ot_end ? new Date(r.ot_end).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      results.push({
        ...r, request_type: "overtime",
        date_label: r.work_date,
        detail: `OT ${s} - ${e}`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Shift change requests ──
  if (shouldFetch("shift_change")) {
    let q = supa.from("shift_change_requests")
      .select(`id,employee_id,company_id,work_date,current_shift_id,current_assignment_type,requested_shift_id,requested_assignment_type,reason,status,submitted_at,reviewed_at,review_note,created_at,${empSelect},current_shift:shift_templates!shift_change_requests_current_shift_id_fkey(id,name,work_start,work_end),requested_shift:shift_templates!shift_change_requests_requested_shift_id_fkey(id,name,work_start,work_end)`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data, error: scErr } = await q
    if (!scErr) {
      for (const r of (data || [])) {
        const curLabel = r.current_assignment_type === "dayoff" ? "วันหยุด" :
          (r as any).current_shift ? `${(r as any).current_shift.work_start?.substring(0,5)}-${(r as any).current_shift.work_end?.substring(0,5)}` : "-"
        const reqLabel = r.requested_assignment_type === "dayoff" ? "วันหยุด" :
          (r as any).requested_shift ? `${(r as any).requested_shift.work_start?.substring(0,5)}-${(r as any).requested_shift.work_end?.substring(0,5)}` : "-"
        results.push({
          ...r, request_type: "shift_change",
          date_label: r.work_date,
          detail: `${curLabel} → ${reqLabel}`,
          is_cancel_requested: false,
        })
      }
    }
  }

  // Sort all by created_at desc
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Counts
  const counts: Record<string, number> = { all: results.length }
  for (const r of results) {
    const st = r.is_cancel_requested ? "cancel_requested" : r.status
    counts[st] = (counts[st] || 0) + 1
  }

  return NextResponse.json({ requests: results, counts })
}

// ── Helper: อนุมัติ time adjustment (inline จาก correction route เพื่อหลีกเลี่ยง internal fetch deadlock) ──
async function approveAdjustment(supa: any, requestId: string, reviewerId: string | null, reviewNote: string | null) {
  const { data: adjReq } = await supa
    .from("time_adjustment_requests").select("*").eq("id", requestId)
    .in("status", ["pending", "approved"]).single()
  if (!adjReq) return { success: false, error: "ไม่พบคำขอ" }

  // ดึง attendance_record + shift
  let { data: rec } = await supa
    .from("attendance_records").select("*, shift:shift_templates(*)")
    .eq("employee_id", adjReq.employee_id).eq("work_date", adjReq.work_date).maybeSingle()

  if (!rec) {
    const { data: empInfo } = await supa.from("employees")
      .select("company_id, shift_template_id").eq("id", adjReq.employee_id).single()
    const { data: newRec, error: createErr } = await supa.from("attendance_records")
      .insert({
        employee_id: adjReq.employee_id,
        company_id: empInfo?.company_id ?? adjReq.company_id,
        work_date: adjReq.work_date,
        shift_template_id: empInfo?.shift_template_id ?? null,
        status: "absent", is_manual: true,
      }).select("*, shift:shift_templates(*)").single()
    if (createErr || !newRec) return { success: false, error: `สร้างข้อมูลเข้างานไม่สำเร็จ: ${createErr?.message}` }
    rec = newRec
  }

  const newClockIn  = adjReq.requested_clock_in  ? new Date(adjReq.requested_clock_in)  : (rec.clock_in  ? new Date(rec.clock_in)  : null)
  const newClockOut = adjReq.requested_clock_out ? new Date(adjReq.requested_clock_out) : (rec.clock_out ? new Date(rec.clock_out) : null)
  const shift = rec.shift as any

  let newLateMin = 0, newStatus = rec.status as string
  if (newClockIn && shift?.work_start) {
    const expectedStart = new Date(adjReq.work_date + "T" + shift.work_start + "+07:00")
    newLateMin = calcLateMinutes(newClockIn, expectedStart)
  }
  if (newLateMin > 5) { newStatus = "late" } else { newStatus = "present"; newLateMin = 0 }

  let newWorkMin = rec.work_minutes ?? 0
  if (newClockIn && newClockOut) newWorkMin = calcWorkMinutes(newClockIn, newClockOut, shift?.break_minutes ?? 60)

  const attUpdates: Record<string, any> = { late_minutes: newLateMin, status: newStatus, work_minutes: newWorkMin, is_manual: true }
  if (adjReq.requested_clock_in)  attUpdates.clock_in  = adjReq.requested_clock_in
  if (adjReq.requested_clock_out) attUpdates.clock_out = adjReq.requested_clock_out

  const { error: recErr } = await supa.from("attendance_records").update(attUpdates).eq("id", rec.id)
  if (recErr) return { success: false, error: recErr.message }

  // อัปเดต payroll ถ้ามี
  const workDate = new Date(adjReq.work_date)
  const { data: payrollRec } = await supa.from("payroll_records")
    .select("id, deduct_late, late_count, base_salary")
    .eq("employee_id", adjReq.employee_id)
    .eq("year", workDate.getFullYear()).eq("month", workDate.getMonth() + 1).maybeSingle()

  if (payrollRec) {
    const monthStart = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, "0")}-01`
    const monthEnd = new Date(workDate.getFullYear(), workDate.getMonth() + 1, 0).toISOString().split("T")[0]
    const { data: attRows } = await supa.from("attendance_records")
      .select("status, late_minutes").eq("employee_id", adjReq.employee_id)
      .gte("work_date", monthStart).lte("work_date", monthEnd)
    const rows = attRows ?? []
    const lateCount = rows.filter((r: any) => r.status === "late").length
    const absentCount = rows.filter((r: any) => r.status === "absent").length
    const totalLateMin = rows.reduce((s: number, r: any) => s + (r.late_minutes || 0), 0)
    const dailyRate = (payrollRec.base_salary ?? 0) / 26
    const minuteRate = dailyRate / 8 / 60
    await supa.from("payroll_records").update({
      deduct_late: Math.round(totalLateMin * minuteRate * 100) / 100,
      deduct_absent: Math.round(absentCount * dailyRate * 100) / 100,
      late_count: lateCount, absent_days: absentCount,
    }).eq("id", payrollRec.id)
  }

  await supa.from("time_adjustment_requests").update({
    status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_note: reviewNote ?? null,
  }).eq("id", requestId)

  return { success: true, updated: { late_minutes: newLateMin, status: newStatus, work_minutes: newWorkMin } }
}

// ── Helper: ยกเลิกคำร้อง (inline จาก cancel route) ──
async function handleCancelAction(
  supa: any, action: string, requestId: string, requestType: string, reason: string | null,
  actor?: { id: string; name?: string; companyId?: string },
) {
  const CANCEL_TABLES: Record<string, string> = { leave: "leave_requests", adjustment: "time_adjustment_requests", overtime: "overtime_requests" }
  const table = CANCEL_TABLES[requestType]
  if (!table) return { error: "Invalid request_type" }

  if (action === "approve_cancel") {
    const { data: reqData } = await supa.from(table).select("*").eq("id", requestId).single()
    if (!reqData) return { error: "ไม่พบคำขอ" }
    const { error } = await supa.from(table).update({
      status: "cancelled", reviewed_at: new Date().toISOString(),
      review_note: `HR อนุมัติยกเลิก${reason ? `: ${reason}` : ""}`,
    }).eq("id", requestId)
    if (error) return { error: error.message }
    // Restore leave balance
    if (requestType === "leave" && reqData.leave_type_id && reqData.total_days && reqData.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances").select("id, used_days")
          .eq("employee_id", reqData.employee_id).eq("leave_type_id", reqData.leave_type_id).single()
        if (bal) await supa.from("leave_balances").update({ used_days: Math.max(0, (bal.used_days || 0) - reqData.total_days) }).eq("id", bal.id)
      } catch {}
    }
    // Audit log
    if (actor) {
      const typeLabel: Record<string, string> = { leave: "คำขอลา", overtime: "คำขอ OT", adjustment: "คำขอแก้เวลา" }
      logAudit(supa, {
        actorId: actor.id, actorName: actor.name,
        action: `approve_cancel_${requestType}`, entityType: `${requestType}_request`, entityId: requestId,
        description: `อนุมัติยกเลิก${typeLabel[requestType] || requestType}${reason ? ` (${reason})` : ""}`,
        companyId: actor.companyId,
      })
    }
    return { success: true, message: "ยกเลิกคำขอแล้ว" }
  }

  if (action === "reject_cancel") {
    const { error } = await supa.from(table).update({
      review_note: `HR ปฏิเสธการยกเลิก${reason ? `: ${reason}` : ""}`,
    }).eq("id", requestId)
    if (error) return { error: error.message }
    // Audit log
    if (actor) {
      const typeLabel: Record<string, string> = { leave: "คำขอลา", overtime: "คำขอ OT", adjustment: "คำขอแก้เวลา" }
      logAudit(supa, {
        actorId: actor.id, actorName: actor.name,
        action: `reject_cancel_${requestType}`, entityType: `${requestType}_request`, entityId: requestId,
        description: `ปฏิเสธการยกเลิก${typeLabel[requestType] || requestType}${reason ? ` (${reason})` : ""}`,
        companyId: actor.companyId,
      })
    }
    return { success: true, message: "ปฏิเสธการยกเลิก — คงอนุมัติ" }
  }

  if (action === "force_cancel") {
    const { data: reqData } = await supa.from(table).select("*").eq("id", requestId).single()
    const { error } = await supa.from(table).update({
      status: "cancelled", reviewed_at: new Date().toISOString(),
      review_note: `HR ยกเลิกโดยตรง${reason ? `: ${reason}` : ""}`,
    }).eq("id", requestId)
    if (error) return { error: error.message }
    if (requestType === "leave" && reqData?.leave_type_id && reqData?.total_days && reqData?.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances").select("id, used_days")
          .eq("employee_id", reqData.employee_id).eq("leave_type_id", reqData.leave_type_id).single()
        if (bal) await supa.from("leave_balances").update({ used_days: Math.max(0, (bal.used_days || 0) - reqData.total_days) }).eq("id", bal.id)
      } catch {}
    }
    // Audit log
    if (actor) {
      const typeLabel: Record<string, string> = { leave: "คำขอลา", overtime: "คำขอ OT", adjustment: "คำขอแก้เวลา" }
      logAudit(supa, {
        actorId: actor.id, actorName: actor.name,
        action: `force_cancel_${requestType}`, entityType: `${requestType}_request`, entityId: requestId,
        description: `HR ยกเลิก${typeLabel[requestType] || requestType}โดยตรง${reason ? ` (${reason})` : ""}`,
        companyId: actor.companyId,
      })
    }
    return { success: true, message: "ยกเลิกคำขอแล้ว" }
  }

  return { error: "Unknown cancel action" }
}

// POST — อนุมัติ/ปฏิเสธ/ยกเลิก (ไม่ใช้ internal fetch เพื่อป้องกัน deadlock บน Render)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { action, request_id, request_type, note } = await req.json()

  const TABLES: Record<string, string> = {
    leave: "leave_requests",
    adjustment: "time_adjustment_requests",
    overtime: "overtime_requests",
  }

  // shift_change → delegate to self-schedule approve API
  if (request_type === "shift_change") {
    const scAction = action === "approve" ? "approve" : action === "reject" ? "reject" : null
    if (!scAction) return NextResponse.json({ error: "Invalid action for shift_change" }, { status: 400 })

    const { data: userData } = await supa.from("users").select("employee_id").eq("id", user.id).single()

    if (scAction === "approve") {
      const { data: reqData } = await supa.from("shift_change_requests").select("*").eq("id", request_id).single()
      if (!reqData || reqData.status !== "pending") return NextResponse.json({ error: "Request not found or not pending" }, { status: 400 })

      // อัปเดตหรือสร้าง assignment
      const { data: existAssign } = await supa.from("monthly_shift_assignments")
        .select("id").eq("employee_id", reqData.employee_id).eq("work_date", reqData.work_date).maybeSingle()

      if (existAssign) {
        await supa.from("monthly_shift_assignments").update({
          shift_id: reqData.requested_shift_id,
          assignment_type: reqData.requested_assignment_type,
          submitted_by: reqData.employee_id,
          has_pending_change: false,
        }).eq("employee_id", reqData.employee_id).eq("work_date", reqData.work_date)
      } else {
        await supa.from("monthly_shift_assignments").insert({
          employee_id: reqData.employee_id,
          company_id: reqData.company_id,
          work_date: reqData.work_date,
          shift_id: reqData.requested_shift_id,
          assignment_type: reqData.requested_assignment_type,
          submitted_by: reqData.employee_id,
          has_pending_change: false,
        })
      }

      await supa.from("shift_change_requests").update({
        status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note || null,
      }).eq("id", request_id)

      // ═══ ย้อนหลัง: ตรวจสอบ attendance + คำนวณ payroll ใหม่ ═══
      const todayBKK = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      if (reqData.work_date < todayBKK && reqData.requested_shift_id) {
        try {
          const { data: newShift } = await supa.from("shift_templates").select("*").eq("id", reqData.requested_shift_id).single()
          if (newShift) {
            const { data: attRec } = await supa.from("attendance_records")
              .select("*").eq("employee_id", reqData.employee_id).eq("work_date", reqData.work_date).maybeSingle()

            if (attRec && attRec.clock_in) {
              const clockIn = new Date(attRec.clock_in)
              const expectedStart = new Date(reqData.work_date + "T" + newShift.work_start + "+07:00")
              let newLateMin = calcLateMinutes(clockIn, expectedStart)
              let newStatus = attRec.status as string
              if (newLateMin > 5) { newStatus = "late" } else { newStatus = "present"; newLateMin = 0 }

              let newWorkMin = attRec.work_minutes ?? 0
              if (attRec.clock_in && attRec.clock_out) {
                newWorkMin = calcWorkMinutes(new Date(attRec.clock_in), new Date(attRec.clock_out), newShift.break_minutes ?? 60)
              }

              await supa.from("attendance_records").update({
                shift_template_id: reqData.requested_shift_id,
                late_minutes: newLateMin, work_minutes: newWorkMin, status: newStatus,
                note: `กะเปลี่ยนย้อนหลัง: ${newShift.work_start?.substring(0,5)}-${newShift.work_end?.substring(0,5)}`,
              }).eq("id", attRec.id)

              // payroll recalc
              const wd = new Date(reqData.work_date)
              const yr = wd.getFullYear(), mo = wd.getMonth() + 1
              const { data: payrollRec } = await supa.from("payroll_records")
                .select("id, base_salary").eq("employee_id", reqData.employee_id).eq("year", yr).eq("month", mo).maybeSingle()
              if (payrollRec) {
                const monthStart = `${yr}-${String(mo).padStart(2, "0")}-01`
                const monthEnd = new Date(yr, mo, 0).toISOString().split("T")[0]
                const { data: attRows } = await supa.from("attendance_records")
                  .select("status, late_minutes").eq("employee_id", reqData.employee_id)
                  .gte("work_date", monthStart).lte("work_date", monthEnd)
                const rows = attRows ?? []
                const lateCount = rows.filter((r: any) => r.status === "late").length
                const absentCount = rows.filter((r: any) => r.status === "absent").length
                const totalLateMin = rows.reduce((s: number, r: any) => s + (r.late_minutes || 0), 0)
                const dailyRate = (payrollRec.base_salary ?? 0) / 26
                const minuteRate = dailyRate / 8 / 60
                await supa.from("payroll_records").update({
                  deduct_late: Math.round(totalLateMin * minuteRate * 100) / 100,
                  deduct_absent: Math.round(absentCount * dailyRate * 100) / 100,
                  late_count: lateCount, absent_days: absentCount,
                }).eq("id", payrollRec.id)
              }
            }
          }
        } catch (e) { console.error("Retroactive shift change recalc error:", e) }
      }

      return NextResponse.json({ success: true })
    } else {
      const { data: reqData } = await supa.from("shift_change_requests").select("employee_id, work_date").eq("id", request_id).single()
      await supa.from("shift_change_requests").update({
        status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note || null,
      }).eq("id", request_id)
      if (reqData) {
        await supa.from("monthly_shift_assignments").update({ has_pending_change: false })
          .eq("employee_id", reqData.employee_id).eq("work_date", reqData.work_date)
      }
      return NextResponse.json({ success: true })
    }
  }

  const table = TABLES[request_type]
  if (!table) return NextResponse.json({ error: "Invalid request_type" }, { status: 400 })

  // Get current user's employee_id + name for audit
  const { data: userData } = await supa.from("users")
    .select("employee_id, employee:employees(first_name_th, last_name_th, company_id)")
    .eq("id", user.id).single()
  const actorEmp = userData?.employee as any
  const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"

  if (action === "approve") {
    // Time adjustment → inline logic (ไม่ fetch /api/correction)
    if (request_type === "adjustment") {
      const result = await approveAdjustment(supa, request_id, userData?.employee_id || null, note)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    const { error } = await supa.from(table).update({
      status: "approved",
      reviewed_by: userData?.employee_id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update leave balance if leave
    if (request_type === "leave") {
      const { data: lr } = await supa.from("leave_requests").select("employee_id,leave_type_id,total_days").eq("id", request_id).single()
      if (lr) {
        const { data: bal } = await supa.from("leave_balances")
          .select("id,used_days,pending_days")
          .eq("employee_id", lr.employee_id).eq("leave_type_id", lr.leave_type_id).single()
        if (bal) {
          await supa.from("leave_balances").update({
            used_days: (bal.used_days || 0) + lr.total_days,
            pending_days: Math.max(0, (bal.pending_days || 0) - lr.total_days),
          }).eq("id", bal.id)
        }
      }
    }

    // Audit log — ดึงชื่อพนักงานที่ยื่นคำขอ
    const { data: reqOwner } = await supa.from(table).select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", request_id).maybeSingle()
    const ownerEmp = (reqOwner as any)?.employee
    logApproval(supa, {
      actorId: userData?.employee_id || user.id,
      actorName,
      action: "approved", requestType: request_type as any,
      requestId: request_id, companyId: actorEmp?.company_id,
      employeeName: ownerEmp ? `${ownerEmp.first_name_th} ${ownerEmp.last_name_th}` : undefined,
    })

    // ── อนุมัติ OT → อัปเดต attendance_records.ot_minutes ──
    if (request_type === "overtime") {
      const { data: otReq } = await supa.from("overtime_requests")
        .select("employee_id, company_id, work_date, ot_start, ot_end, ot_rate")
        .eq("id", request_id).single()

      if (otReq && otReq.ot_start && otReq.ot_end) {
        // คำนวณ OT minutes จาก ot_start → ot_end
        const startMs = new Date(otReq.ot_start).getTime()
        const endMs = new Date(otReq.ot_end).getTime()
        const otMinutes = Math.max(0, Math.round((endMs - startMs) / 60000))

        // หา attendance record ของวันนั้น
        const { data: attRec } = await supa.from("attendance_records")
          .select("id, ot_minutes")
          .eq("employee_id", otReq.employee_id)
          .eq("work_date", otReq.work_date)
          .maybeSingle()

        if (attRec) {
          // มี record อยู่แล้ว → อัปเดต ot_minutes (บวกเพิ่มกรณีมีหลาย OT request ในวันเดียวกัน)
          await supa.from("attendance_records").update({
            ot_minutes: (attRec.ot_minutes || 0) + otMinutes,
          }).eq("id", attRec.id)
        } else {
          // ไม่มี attendance record (เช่น OT วันหยุด) → สร้างใหม่
          await supa.from("attendance_records").insert({
            employee_id: otReq.employee_id,
            company_id: otReq.company_id,
            work_date: otReq.work_date,
            status: "present",
            ot_minutes: otMinutes,
            late_minutes: 0,
            early_out_minutes: 0,
            work_minutes: 0,
            is_manual: true,
            note: `OT อนุมัติ ${otMinutes} นาที`,
          }).select("id").maybeSingle()
        }

        // ── recalculate payroll_records อัตโนมัติ ──
        // ทำหลัง attendance_records อัปเดตแล้ว เพื่อให้ payroll หน้า admin แสดงค่าถูก
        await recalcPayrollAfterOT(supa, otReq.employee_id, otReq.work_date)
      }
    }

    return NextResponse.json({ success: true })
  }

  if (action === "reject") {
    // Time adjustment → inline logic (ไม่ fetch /api/correction)
    if (request_type === "adjustment") {
      const { error } = await supa.from("time_adjustment_requests").update({
        status: "rejected",
        reviewed_by: userData?.employee_id || null,
        reviewed_at: new Date().toISOString(),
        review_note: note ?? null,
      }).eq("id", request_id).eq("status", "pending")
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    const { error } = await supa.from(table).update({
      status: "rejected",
      reviewed_by: userData?.employee_id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    const { data: rejOwner } = await supa.from(table).select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", request_id).maybeSingle()
    const rejEmp = (rejOwner as any)?.employee
    logApproval(supa, {
      actorId: userData?.employee_id || user.id,
      actorName,
      action: "rejected", requestType: request_type as any,
      requestId: request_id, companyId: actorEmp?.company_id,
      employeeName: rejEmp ? `${rejEmp.first_name_th} ${rejEmp.last_name_th}` : undefined,
    })

    return NextResponse.json({ success: true })
  }

  // Cancel actions — inline logic (ไม่ fetch /api/requests/cancel)
  if (action === "approve_cancel" || action === "reject_cancel" || action === "force_cancel") {
    const result = await handleCancelAction(supa, action, request_id, request_type, note, {
      id: userData?.employee_id || user.id, name: actorName, companyId: actorEmp?.company_id,
    })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
