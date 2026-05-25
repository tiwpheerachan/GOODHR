import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getLateThreshold } from "@/lib/utils/payroll"
import { logAudit } from "@/lib/auditLog"

// POST /api/attendance/recalc-late
// Body: { from: "YYYY-MM-DD", to: "YYYY-MM-DD", employee_id?: string, dry_run?: boolean }
// Recalculate late_minutes + early_out_minutes + status สำหรับ attendance_records
//
// กฎ:
// 1. ดึง shift ปัจจุบันจาก monthly_shift_assignments (single source of truth)
// 2. คำนวณ expected_start/end ใหม่ตาม shift นั้น (รองรับ overnight shift)
// 3. raw_late = clock_in - expected_start (ถ้า < 0 = มาเร็ว = 0)
// 4. effective_late = max(0, raw_late - graceMinutes) จาก getLateThreshold(dept, company)
// 5. ถ้า raw_late > 12 ชม. + กะ is_overnight → ดู next-day shift แทน (เช็คอินก่อนเวลา)
// 6. status: late ถ้า effective_late > 0, เก็บ status ลา/ออกก่อน เดิม
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ — HR หรือ Admin เท่านั้น" }, { status: 403 })
  }

  const body = await req.json()
  const { from, to, employee_id, company_id, dry_run = false } = body
  if (!from || !to) return NextResponse.json({ error: "from + to (YYYY-MM-DD) required" }, { status: 400 })

  // ── ดึง attendance_records ในช่วง ──
  let q = svc.from("attendance_records")
    .select("id, employee_id, work_date, clock_in, clock_out, expected_start, late_minutes, early_out_minutes, status, half_day_leave, company_id")
    .gte("work_date", from).lte("work_date", to)
    .not("clock_in", "is", null)
  if (employee_id) q = q.eq("employee_id", employee_id)
  if (company_id)  q = q.eq("company_id",  company_id)
  const { data: records, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!records?.length) return NextResponse.json({ success: true, updated: 0, sample: [] })

  const empIds = Array.from(new Set(records.map((r: any) => r.employee_id)))
  const workDates = Array.from(new Set(records.map((r: any) => r.work_date)))

  // ── ดึง employee + dept + company สำหรับ grace ──
  const { data: emps } = await svc.from("employees")
    .select("id, is_attendance_exempt, company_id, department:departments(name), company:companies(code)")
    .in("id", empIds)
  const empMap = new Map((emps ?? []).map((e: any) => [e.id, e]))

  // ── ดึง work_schedules (per-employee grace override) ──
  //   เก็บทุก row ของพนักงานในกลุ่ม → ตอนคำนวณค่อยเลือกตาม effective range
  const { data: workSchedules } = await svc.from("work_schedules")
    .select("employee_id, late_threshold_minutes, effective_from, effective_to")
    .in("employee_id", empIds)
    .order("effective_from", { ascending: false })
  const wsByEmp = new Map<string, any[]>()
  for (const ws of (workSchedules ?? [])) {
    if (!wsByEmp.has(ws.employee_id)) wsByEmp.set(ws.employee_id, [])
    wsByEmp.get(ws.employee_id)!.push(ws)
  }
  // helper: หา grace override สำหรับ (employee, work_date)
  //   เลือก schedule ที่ effective_from <= work_date <= COALESCE(effective_to, '9999')
  function findScheduleOverride(employeeId: string, workDate: string): number | null {
    const list = wsByEmp.get(employeeId)
    if (!list) return null
    for (const ws of list) {
      const from = ws.effective_from
      const to = ws.effective_to
      if (from && workDate < from) continue
      if (to && workDate >= to) continue
      if (ws.late_threshold_minutes != null) return Number(ws.late_threshold_minutes)
    }
    return null
  }

  // ── ดึง monthly_shift_assignments + shift_templates (truth ปัจจุบัน) ──
  // ดึงช่วงกว้างหน่อย (รวมก่อน+หลังเพื่อรองรับ overnight)
  const { data: shiftAssignments } = await svc.from("monthly_shift_assignments")
    .select("employee_id, work_date, assignment_type, shift:shift_templates(work_start, work_end, is_overnight)")
    .in("employee_id", empIds)
    .gte("work_date", from).lte("work_date", to)
  const shiftMap = new Map<string, any>()
  for (const sa of (shiftAssignments ?? [])) {
    shiftMap.set(`${sa.employee_id}|${sa.work_date}`, sa)
  }

  // ── ดึงข้อมูล leave_requests ที่ approved เพื่อเช็คลาครึ่งวัน ──
  const { data: leaves } = await svc.from("leave_requests")
    .select("employee_id, start_date, end_date, is_half_day, half_day_period, status")
    .in("employee_id", empIds)
    .in("status", ["approved"])
    .lte("start_date", to).gte("end_date", from)
  const halfDayMap = new Map<string, string>() // employee_id|date -> 'morning'|'afternoon'
  for (const l of (leaves ?? [])) {
    if (!l.is_half_day) continue
    let cur = new Date(l.start_date)
    const end = new Date(l.end_date)
    while (cur <= end) {
      halfDayMap.set(`${l.employee_id}|${cur.toISOString().slice(0,10)}`, l.half_day_period as string)
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  // ── คำนวณใหม่ ──
  type Update = {
    id: string
    employee_id: string
    work_date: string
    old_late: number
    new_late: number
    old_early: number
    new_early: number
    old_status: string
    new_status: string
    reason: string
  }
  const updates: Update[] = []
  const noChange: string[] = []
  let exemptCount = 0

  function buildExpected(workDate: string, workStart: string, isOvernight: boolean): Date {
    // workStart format: "09:00:00" → "{workDate}T09:00:00+07:00"
    return new Date(`${workDate}T${workStart}+07:00`)
  }

  for (const r of records) {
    const emp: any = empMap.get(r.employee_id)
    if (!emp) continue

    // ── Exempt: ไม่หักสาย/ออกก่อน เลย ──
    const isExempt = !!emp.is_attendance_exempt
    if (isExempt) {
      if (Number(r.late_minutes) > 0 || Number(r.early_out_minutes) > 0) {
        updates.push({
          id: r.id, employee_id: r.employee_id, work_date: r.work_date,
          old_late: r.late_minutes, new_late: 0,
          old_early: r.early_out_minutes, new_early: 0,
          old_status: r.status, new_status: ["leave","absent"].includes(r.status) ? r.status : "present",
          reason: "exempt",
        })
        exemptCount++
      }
      continue
    }

    const sa = shiftMap.get(`${r.employee_id}|${r.work_date}`)
    const shift = sa?.shift
    const halfDay = halfDayMap.get(`${r.employee_id}|${r.work_date}`)
    const clockIn = new Date(r.clock_in)
    const clockOut = r.clock_out ? new Date(r.clock_out) : null

    let newLate = 0
    let newEarly = 0
    let reason = "no_shift"

    if (shift?.work_start) {
      // Auto-detect overnight ถ้า flag ไม่ได้ตั้งแต่ work_end < work_start
      const isOvernight = !!shift.is_overnight ||
        (!!shift.work_end && !!shift.work_start && String(shift.work_end) < String(shift.work_start))

      let expectedStart = buildExpected(r.work_date, shift.work_start, isOvernight)
      let expectedEnd: Date | null = null
      if (shift.work_end) {
        expectedEnd = buildExpected(r.work_date, shift.work_end, isOvernight)
        // Overnight: end ข้ามวัน
        if (isOvernight) expectedEnd = new Date(expectedEnd.getTime() + 86_400_000)
      }

      // ── Overnight fix: ถ้า clock_in - expected > 12 ชม. + shift is_overnight + start 00:00-02:00 ──
      //    หมายความว่าเช็คอินก่อนเที่ยงคืน สำหรับกะที่เริ่ม 00:00 ของวันถัดไป → expected ต้องเป็น "วันถัดไป"
      // ── หรือ raw_late ลบ → expected เลื่อนล่วงหน้า 1 วัน ─────────────────────
      let rawLate = Math.floor((clockIn.getTime() - expectedStart.getTime()) / 60_000)
      if (rawLate > 12 * 60 && isOvernight) {
        // อาจเป็นการเช็คอินก่อนกะข้ามคืน → expected เป็นวันถัดไปแทน
        const expectedNextDay = new Date(expectedStart.getTime() + 86_400_000)
        const diffNext = Math.floor((clockIn.getTime() - expectedNextDay.getTime()) / 60_000)
        if (Math.abs(diffNext) < Math.abs(rawLate)) {
          expectedStart = expectedNextDay
          if (expectedEnd) expectedEnd = new Date(expectedEnd.getTime() + 86_400_000)
          rawLate = diffNext
          reason = "overnight_fix"
        }
      }

      // ── ลาเช้า: เลื่อน expected_start ไปกลางกะ ──
      if (halfDay === "morning" && expectedEnd) {
        const midMs = expectedStart.getTime() + (expectedEnd.getTime() - expectedStart.getTime()) / 2
        expectedStart = new Date(midMs)
        rawLate = Math.floor((clockIn.getTime() - expectedStart.getTime()) / 60_000)
        reason += "+half_morning"
      }

      // ── Apply grace period ──
      //   per-employee override (work_schedules.late_threshold_minutes) → dept/company default
      const override = findScheduleOverride(r.employee_id, r.work_date)
      const grace = override !== null ? override : getLateThreshold(emp.department?.name, emp.company?.code)
      newLate = Math.max(0, rawLate - grace)
      if (reason === "no_shift") reason = override !== null ? `grace_emp_${grace}` : `grace_${grace}`

      // ── early_out: ลาบ่ายไม่นับ ──
      if (clockOut && expectedEnd && halfDay !== "afternoon") {
        // Universal: ถ้า clock_out < clock_in → ข้ามวัน (กะปกติแต่ค้างเลยเที่ยงคืน)
        let cOutMs = clockOut.getTime()
        if (cOutMs < clockIn.getTime()) cOutMs += 86_400_000
        // Overnight extra snap ±24h
        if (isOvernight) {
          const candidates = [cOutMs, cOutMs + 86_400_000, cOutMs - 86_400_000]
          cOutMs = candidates.reduce((best, t) =>
            Math.abs(expectedEnd!.getTime() - t) < Math.abs(expectedEnd!.getTime() - best) ? t : best, cOutMs)
        }
        const earlyDiff = Math.floor((expectedEnd.getTime() - cOutMs) / 60_000)
        newEarly = Math.max(0, earlyDiff)
      }
    } else {
      // ไม่มี shift → ไม่คิดสาย/ออกก่อน
      reason = "no_shift_skip"
    }

    const oldLate = Number(r.late_minutes) || 0
    const oldEarly = Number(r.early_out_minutes) || 0

    const newExpStart = shift?.work_start
      ? new Date(`${r.work_date}T${shift.work_start}+07:00`).toISOString()
      : null
    const expStartChanged = newExpStart !== r.expected_start

    if (newLate === oldLate && newEarly === oldEarly && !expStartChanged) {
      noChange.push(r.id)
      continue
    }

    // กำหนด status ใหม่
    // กฎ: ถ้า clock_in มีอยู่จริง → ต้องเป็น present/late/early_out (ไม่ใช่ absent)
    //     ถ้าเป็น "leave" คงไว้ตามเดิม (มาทำงานวันลาเป็นเคสพิเศษ)
    let newStatus = r.status
    if (r.status === "leave") {
      // คงสถานะลา (ลาแล้วแต่อาจเช็คอินมา)
    } else {
      // ถ้ามี clock_in → ต้องไม่เป็น "absent" แม้ DB จะเก็บ absent อยู่
      newStatus = newLate > 0 ? "late" : (newEarly > 0 ? "early_out" : "present")
    }

    updates.push({
      id: r.id, employee_id: r.employee_id, work_date: r.work_date,
      old_late: oldLate, new_late: newLate,
      old_early: oldEarly, new_early: newEarly,
      old_status: r.status, new_status: newStatus,
      reason,
    })
  }

  // ── Execute updates (ถ้าไม่ใช่ dry_run) ──
  let payrollRecomputed = 0
  if (!dry_run && updates.length > 0) {
    // Batch update
    for (const u of updates) {
      const updPayload: any = {
        late_minutes: u.new_late,
        early_out_minutes: u.new_early,
        status: u.new_status,
        updated_at: new Date().toISOString(),
      }
      // Update expected_start to current shift (overwrite stale)
      const r = records.find((x: any) => x.id === u.id)
      const sa = r ? shiftMap.get(`${r.employee_id}|${r.work_date}`) : null
      if (sa?.shift?.work_start && r) {
        updPayload.expected_start = new Date(`${r.work_date}T${sa.shift.work_start}+07:00`).toISOString()
      } else {
        updPayload.expected_start = null
      }
      await svc.from("attendance_records").update(updPayload).eq("id", u.id)
    }

    // ── หา (employee_id, payroll_period_id) ที่ได้รับผลกระทบ → trigger payroll bulk recompute ──
    //   เก็บผลตาม company ของพนักงาน
    const affectedEmpsByCompany = new Map<string, Set<string>>()
    for (const u of updates) {
      const emp: any = empMap.get(u.employee_id)
      const coId = emp?.company_id
      if (!coId) continue
      if (!affectedEmpsByCompany.has(coId)) affectedEmpsByCompany.set(coId, new Set())
      affectedEmpsByCompany.get(coId)!.add(u.employee_id)
    }

    // หา payroll periods ที่ครอบคลุม from-to (per company)
    const affectedDates = Array.from(new Set(updates.map(u => u.work_date)))
    const minDate = affectedDates.reduce((a, b) => a < b ? a : b, affectedDates[0])
    const maxDate = affectedDates.reduce((a, b) => a > b ? a : b, affectedDates[0])

    for (const [coId, empSet] of Array.from(affectedEmpsByCompany.entries())) {
      const { data: periods } = await svc.from("payroll_periods")
        .select("id, status")
        .eq("company_id", coId)
        .lte("start_date", maxDate)
        .gte("end_date", minDate)
      const empIds = Array.from(empSet)
      for (const p of (periods ?? [])) {
        if (p.status === "paid") continue // ไม่แตะงวดที่ปิดแล้ว
        // Batch 50 คนต่อครั้ง (เร็วกว่าและไม่ติด timeout)
        for (let i = 0; i < empIds.length; i += 50) {
          const batch = empIds.slice(i, i + 50)
          try {
            const url = new URL(req.url)
            const baseUrl = `${url.protocol}//${url.host}`
            await fetch(`${baseUrl}/api/payroll/bulk`, {
              method: "POST",
              headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
              body: JSON.stringify({ employee_ids: batch, payroll_period_id: p.id }),
            }).catch(() => {})
          } catch {}
          payrollRecomputed += batch.length
        }
      }
    }

    // Audit log
    const { data: actorEmp } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"
    logAudit(svc, {
      actorId: user.id, actorName,
      action: "recalc_late_minutes",
      entityType: "attendance_records",
      entityId: "bulk",
      description: `Recalculate late_minutes ${from} → ${to} (${updates.length} records, payroll ${payrollRecomputed})`,
      companyId: dbUser.company_id,
    })
  }

  return NextResponse.json({
    success: true,
    total_records: records.length,
    updated: updates.length,
    unchanged: noChange.length,
    no_change: noChange.length,
    exempt_fixed: exemptCount,
    payroll_recomputed: payrollRecomputed,
    dry_run,
    sample: updates.slice(0, 20),
  })
}
