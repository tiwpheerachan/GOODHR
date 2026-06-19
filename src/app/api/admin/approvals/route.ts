import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { logApproval, logAudit } from "@/lib/auditLog"
import { calculatePayrollSummary, getLateThreshold, type OTBreakdown } from "@/lib/utils/payroll"
import { classifyOtFromRecords } from "@/lib/utils/ot-classification"
import { isPayrollPeriodLocked } from "@/lib/utils/periodLock"

// ── recompute attendance_records.ot_minutes จาก overtime_requests ที่ status=approved ──
// เรียกใช้หลังจาก OT ถูก approve / reject / cancel เพื่อให้ค่าตรงกับ source of truth
// แก้บัค: เดิม approve = บวกเพิ่ม, cancel/reject = ไม่ลด → ot_minutes สูงเกิน
async function recomputeAttendanceOtMinutes(supa: any, employeeId: string, workDate: string) {
  try {
    // ดึง OT ที่อนุมัติแล้วทั้งหมดในวันนั้น
    const { data: approvedOts } = await supa.from("overtime_requests")
      .select("ot_start, ot_end, company_id")
      .eq("employee_id", employeeId)
      .eq("work_date", workDate)
      .eq("status", "approved")

    // รวมนาที OT จาก start/end ทั้งหมด
    let totalOtMin = 0
    for (const ot of (approvedOts ?? [])) {
      if (!ot.ot_start || !ot.ot_end) continue
      const m = Math.max(0, Math.round((new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000))
      totalOtMin += m
    }

    // หา attendance_records ของวันนั้น
    const { data: attRec } = await supa.from("attendance_records")
      .select("id, status, ot_minutes")
      .eq("employee_id", employeeId)
      .eq("work_date", workDate)
      .maybeSingle()

    if (attRec) {
      // อัปเดต ot_minutes ให้ตรงกับ source of truth (ถ้าค่าไม่เท่า)
      if ((attRec.ot_minutes || 0) !== totalOtMin) {
        await supa.from("attendance_records").update({
          ot_minutes: totalOtMin,
          updated_at: new Date().toISOString(),
        }).eq("id", attRec.id)
      }
    } else if (totalOtMin > 0) {
      // ไม่มี record แต่มี OT อนุมัติ (เช่น OT วันหยุดที่พนักงานไม่ได้ clock-in) → สร้าง record ใหม่
      const companyId = approvedOts?.[0]?.company_id ?? null
      await supa.from("attendance_records").insert({
        employee_id: employeeId,
        company_id: companyId,
        work_date: workDate,
        status: "present",
        ot_minutes: totalOtMin,
        late_minutes: 0,
        early_out_minutes: 0,
        work_minutes: 0,
        is_manual: true,
        note: `OT อนุมัติ ${totalOtMin} นาที`,
      })
    }
  } catch (e) {
    console.error("[recomputeAttendanceOtMinutes]", e)
  }
}

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

    // ตรวจ: งวดถูกล็อกหรือยัง → ถ้าล็อกไม่ recalculate
    const { locked } = await isPayrollPeriodLocked(supa, empData.company_id, workDate)
    if (locked) { console.log(`[recalcPayrollAfterOT] period locked for ${workDate}, skip`); return }

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
    // ⚠️ dedupe ตาม work_date — กัน duplicate rows ทำให้ sum OT/late inflate
    const attRawRows   = (attRes.data ?? []) as any[]
    const attRows      = Array.from(
      new Map<string, any>(attRawRows.map(r => [r.work_date as string, r])).values()
    )
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

    // ── 5. แยก OT ตาม rate จาก approved overtime_requests ──
    const { data: approvedOTs } = await supa.from("overtime_requests")
      .select("work_date, ot_start, ot_end, ot_rate")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("work_date", period.start_date)
      .lte("work_date", period.end_date)

    const otBreakdown: OTBreakdown = classifyOtFromRecords(
      attRows,
      (approvedOTs ?? []) as any[],
      isWorkDay,
    )

    let totalLateMin  = 0
    let totalEarlyMin = 0
    let absentDays    = 0
    for (const r of attRows) {
      totalLateMin  += Number(r.late_minutes)       || 0
      totalEarlyMin += Number(r.early_out_minutes)  || 0
      if (r.status === "absent") absentDays++
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
      ot_weekday_minutes:     otBreakdown.weekday_minutes,
      ot_holiday_reg_minutes: otBreakdown.holiday_regular_minutes,
      ot_holiday_ot_minutes:  otBreakdown.holiday_ot_minutes,
      ot_hours:               (otBreakdown.weekday_minutes + otBreakdown.holiday_regular_minutes + otBreakdown.holiday_ot_minutes) / 60,
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

  const results: any[] = []

  // Helper: enrich records with employee data (batch query)
  const enrichEmployee = async (records: any[]) => {
    const missing = records.filter(r => !r.employee && r.employee_id)
    if (missing.length === 0) return
    const ids = Array.from(new Set(missing.map(r => r.employee_id)))
    const { data: emps } = await supa.from("employees")
      .select("id,employee_code,first_name_th,last_name_th,nickname,avatar_url,department:departments(name),position:positions(name),company:companies(code)")
      .in("id", ids)
    const empMap = new Map((emps ?? []).map(e => [e.id, e]))
    for (const r of missing) {
      r.employee = empMap.get(r.employee_id) || null
    }
  }

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
    // search จะ filter ที่ client-side แทน เพราะ referencedTable อาจ FK ไม่ตรง
    return q
  }

  const shouldFetch = (t: string) => !type || type === "all" || type === t

  // ── Leave requests ──
  if (shouldFetch("leave")) {
    let q = supa.from("leave_requests")
      .select(`id,employee_id,company_id,leave_type_id,start_date,end_date,total_days,is_half_day,half_day_period,reason,status,requested_at,reviewed_at,review_note,created_at,attachment_url,attachment_name,attachment_urls,attachment_names,leave_type:leave_types(id,name,color_hex)`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "start_date", status)
    const { data } = await q
    await enrichEmployee(data || [])
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
      .select(`id,employee_id,company_id,work_date,requested_clock_in,requested_clock_out,reason,status,reviewed_at,review_note,created_at,attachment_url,attachment_name,attachment_urls,attachment_names`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    await enrichEmployee(data || [])
    for (const r of (data || [])) {
      const cin = r.requested_clock_in ? new Date(r.requested_clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }) : "-"
      const cout = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }) : "-"
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
      .select(`id,employee_id,company_id,work_date,ot_start,ot_end,ot_rate,reason,status,reviewed_at,review_note,created_at`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    await enrichEmployee(data || [])
    for (const r of (data || [])) {
      const s = r.ot_start ? new Date(r.ot_start).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-"
      const e = r.ot_end ? new Date(r.ot_end).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-"
      const rate = r.ot_rate ? `${r.ot_rate}×` : "1.5×"
      results.push({
        ...r, request_type: "overtime",
        date_label: r.work_date,
        detail: `OT ${s} - ${e} (${rate})`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Shift change requests ──
  if (shouldFetch("shift_change")) {
    let q = supa.from("shift_change_requests")
      .select(`id,employee_id,company_id,work_date,current_shift_id,current_assignment_type,requested_shift_id,requested_assignment_type,reason,status,submitted_at,reviewed_at,review_note,created_at,current_shift:shift_templates!shift_change_requests_current_shift_id_fkey(id,name,work_start,work_end),requested_shift:shift_templates!shift_change_requests_requested_shift_id_fkey(id,name,work_start,work_end)`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data, error: scErr } = await q
    if (!scErr) {
      await enrichEmployee(data || [])
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

  // Search filter (server-side after enrichment)
  let filtered = results
  if (search) {
    const s = search.toLowerCase()
    filtered = results.filter(r => {
      const emp = r.employee
      if (!emp) return false
      return `${emp.first_name_th || ""} ${emp.last_name_th || ""} ${emp.employee_code || ""}`.toLowerCase().includes(s)
    })
  }

  // Counts (based on all results, not filtered)
  const counts: Record<string, number> = { all: results.length }
  for (const r of results) {
    const st = r.is_cancel_requested ? "cancel_requested" : r.status
    counts[st] = (counts[st] || 0) + 1
  }

  return NextResponse.json({ requests: filtered, counts })
}

// ── Helper: อนุมัติ time adjustment (inline จาก correction route เพื่อหลีกเลี่ยง internal fetch deadlock) ──
async function approveAdjustment(supa: any, requestId: string, reviewerId: string | null, reviewNote: string | null) {
  const { data: adjReq } = await supa
    .from("time_adjustment_requests").select("*").eq("id", requestId)
    .in("status", ["pending", "approved", "rejected"]).single()
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

  // grace period: per-employee override (work_schedules) → dept/company default
  const { data: empGrace } = await supa.from("employees")
    .select("is_attendance_exempt, department:departments(name), company:companies(code)")
    .eq("id", adjReq.employee_id).single()
  const { data: adjWs } = await supa.from("work_schedules")
    .select("late_threshold_minutes, effective_from, effective_to")
    .eq("employee_id", adjReq.employee_id)
    .order("effective_from", { ascending: false })
  let adjOverride: number | null = null
  for (const ws of (adjWs ?? [])) {
    if (ws.effective_from && adjReq.work_date < ws.effective_from) continue
    if (ws.effective_to && adjReq.work_date >= ws.effective_to) continue
    if (ws.late_threshold_minutes != null) { adjOverride = Number(ws.late_threshold_minutes); break }
  }
  const grace = adjOverride !== null ? adjOverride : getLateThreshold((empGrace?.department as any)?.name, (empGrace?.company as any)?.code)
  const isExempt = !!empGrace?.is_attendance_exempt

  let newLateMin = 0, newStatus = rec.status as string
  if (newClockIn && shift?.work_start) {
    const expectedStart = new Date(adjReq.work_date + "T" + shift.work_start + "+07:00")
    const rawLate = calcLateMinutes(newClockIn, expectedStart)
    newLateMin = isExempt ? 0 : Math.max(0, rawLate - grace)
  }
  if (newLateMin > 0) { newStatus = "late" } else { newStatus = "present" }

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
    const wasApproved = reqData.status === "approved"
    const { error } = await supa.from(table).update({
      status: "cancelled", reviewed_at: new Date().toISOString(),
      review_note: `HR อนุมัติยกเลิก${reason ? `: ${reason}` : ""}`,
    }).eq("id", requestId)
    if (error) return { error: error.message }
    // ── ยกเลิก OT ที่เคย approved → recompute ot_minutes + payroll ──
    if (requestType === "overtime" && wasApproved && reqData.employee_id && reqData.work_date) {
      await recomputeAttendanceOtMinutes(supa, reqData.employee_id, reqData.work_date)
      await recalcPayrollAfterOT(supa, reqData.employee_id, reqData.work_date)
    }
    // Restore leave balance
    if (requestType === "leave" && reqData.leave_type_id && reqData.total_days && reqData.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances").select("id, entitled_days, used_days, pending_days")
          .eq("employee_id", reqData.employee_id).eq("leave_type_id", reqData.leave_type_id)
          .eq("year", new Date(reqData.start_date).getFullYear()).maybeSingle()
        if (bal) {
          const newUsed = Math.max(0, (bal.used_days || 0) - reqData.total_days)
          await supa.from("leave_balances").update({
            used_days: newUsed,
            remaining_days: Math.max(0, (bal.entitled_days || 0) - newUsed - (bal.pending_days || 0)),
          }).eq("id", bal.id)
        }
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
    const wasApproved = reqData?.status === "approved"
    const { error } = await supa.from(table).update({
      status: "cancelled", reviewed_at: new Date().toISOString(),
      review_note: `HR ยกเลิกโดยตรง${reason ? `: ${reason}` : ""}`,
    }).eq("id", requestId)
    if (error) return { error: error.message }
    // ── ยกเลิก OT ที่เคย approved → recompute ot_minutes + payroll ──
    if (requestType === "overtime" && wasApproved && reqData?.employee_id && reqData?.work_date) {
      await recomputeAttendanceOtMinutes(supa, reqData.employee_id, reqData.work_date)
      await recalcPayrollAfterOT(supa, reqData.employee_id, reqData.work_date)
    }
    if (requestType === "leave" && reqData?.leave_type_id && reqData?.total_days && reqData?.status === "approved") {
      try {
        const { data: bal } = await supa.from("leave_balances").select("id, entitled_days, used_days, pending_days")
          .eq("employee_id", reqData.employee_id).eq("leave_type_id", reqData.leave_type_id)
          .eq("year", new Date(reqData.start_date).getFullYear()).maybeSingle()
        if (bal) {
          const newUsed = Math.max(0, (bal.used_days || 0) - reqData.total_days)
          await supa.from("leave_balances").update({
            used_days: newUsed,
            remaining_days: Math.max(0, (bal.entitled_days || 0) - newUsed - (bal.pending_days || 0)),
          }).eq("id", bal.id)
        }
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
      if (!reqData || !["pending", "rejected"].includes(reqData.status)) {
        return NextResponse.json({ error: "Request not found" }, { status: 400 })
      }

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
              // grace period: per-employee override → dept/company default
              const { data: empGrace } = await supa.from("employees")
                .select("is_attendance_exempt, department:departments(name), company:companies(code)")
                .eq("id", reqData.employee_id).single()
              const { data: scWs } = await supa.from("work_schedules")
                .select("late_threshold_minutes, effective_from, effective_to")
                .eq("employee_id", reqData.employee_id)
                .order("effective_from", { ascending: false })
              let scOverride: number | null = null
              for (const ws of (scWs ?? [])) {
                if (ws.effective_from && reqData.work_date < ws.effective_from) continue
                if (ws.effective_to && reqData.work_date >= ws.effective_to) continue
                if (ws.late_threshold_minutes != null) { scOverride = Number(ws.late_threshold_minutes); break }
              }
              const grace = scOverride !== null ? scOverride : getLateThreshold((empGrace?.department as any)?.name, (empGrace?.company as any)?.code)
              const isExempt = !!empGrace?.is_attendance_exempt

              const clockIn = new Date(attRec.clock_in)
              const expectedStart = new Date(reqData.work_date + "T" + newShift.work_start + "+07:00")
              const rawLate = calcLateMinutes(clockIn, expectedStart)
              let newLateMin = isExempt ? 0 : Math.max(0, rawLate - grace)
              let newStatus = attRec.status as string
              if (newLateMin > 0) { newStatus = "late" } else { newStatus = "present" }

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
      const { data: lr } = await supa.from("leave_requests")
        .select("employee_id,leave_type_id,total_days,start_date,end_date,is_half_day")
        .eq("id", request_id).single()
      if (lr) {
        const { data: bal } = await supa.from("leave_balances")
          .select("id,entitled_days,used_days,pending_days,remaining_days")
          .eq("employee_id", lr.employee_id).eq("leave_type_id", lr.leave_type_id)
          .eq("year", new Date(lr.start_date).getFullYear()).maybeSingle()
        if (bal) {
          const newUsed = (bal.used_days || 0) + lr.total_days
          const newPending = Math.max(0, (bal.pending_days || 0) - lr.total_days)
          const newRemaining = Math.max(0, (bal.entitled_days || 0) - newUsed - newPending)
          await supa.from("leave_balances").update({
            used_days: newUsed,
            pending_days: newPending,
            remaining_days: newRemaining,
          }).eq("id", bal.id)
        }

        // ── อนุมัติลาแล้ว → เคลียร์ early_out / late ใน attendance record ──
        // เพื่อไม่ให้พนักงานเห็นว่า "ออกก่อน 500 นาที" ทั้งที่ลาอนุมัติแล้ว
        const startD = new Date(lr.start_date)
        const endD = new Date(lr.end_date)
        const leaveDates: string[] = []
        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
          leaveDates.push(d.toISOString().slice(0, 10))
        }

        for (const ld of leaveDates) {
          // ตรวจว่ามี attendance record อยู่แล้วหรือไม่
          const { data: existingAtt } = await supa.from("attendance_records")
            .select("id").eq("employee_id", lr.employee_id).eq("work_date", ld).maybeSingle()

          if (existingAtt) {
            // มี record → update status เป็น leave
            const updateFields: Record<string, unknown> = {
              status: "leave",
              early_out_minutes: 0,
            }
            if (!lr.is_half_day) {
              updateFields.late_minutes = 0
            }
            await supa.from("attendance_records").update(updateFields)
              .eq("employee_id", lr.employee_id)
              .eq("work_date", ld)
          } else {
            // ไม่มี record → สร้างใหม่เป็น status=leave
            const { data: empInfo } = await supa.from("employees")
              .select("company_id").eq("id", lr.employee_id).single()
            await supa.from("attendance_records").insert({
              employee_id: lr.employee_id,
              company_id: empInfo?.company_id || null,
              work_date: ld,
              status: "leave",
              late_minutes: 0,
              early_out_minutes: 0,
              ot_minutes: 0,
              work_minutes: 0,
              is_manual: true,
            })
          }
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

    // ── อนุมัติ OT → recompute attendance_records.ot_minutes จาก source of truth ──
    //    ไม่ใช้วิธี "บวกเพิ่ม" เพราะถ้า approve → cancel → approve ใหม่ จะนับซ้ำ
    if (request_type === "overtime") {
      const { data: otReq } = await supa.from("overtime_requests")
        .select("employee_id, company_id, work_date, ot_start, ot_end, ot_rate")
        .eq("id", request_id).single()

      if (otReq && otReq.ot_start && otReq.ot_end) {
        await recomputeAttendanceOtMinutes(supa, otReq.employee_id, otReq.work_date)
        // ── recalculate payroll_records อัตโนมัติ ──
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

    // ── ดึงข้อมูลคำขอเดิมก่อน update (เผื่อต้อง recompute OT หลัง reject) ──
    const { data: prevReq } = request_type === "overtime"
      ? await supa.from(table).select("employee_id, work_date, status").eq("id", request_id).maybeSingle()
      : { data: null as any }

    const { error } = await supa.from(table).update({
      status: "rejected",
      reviewed_by: userData?.employee_id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ── ถ้า reject OT ที่เคย approved → recompute ot_minutes + payroll ──
    if (request_type === "overtime" && prevReq?.status === "approved" && prevReq?.employee_id && prevReq?.work_date) {
      await recomputeAttendanceOtMinutes(supa, prevReq.employee_id, prevReq.work_date)
      await recalcPayrollAfterOT(supa, prevReq.employee_id, prevReq.work_date)
    }

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
