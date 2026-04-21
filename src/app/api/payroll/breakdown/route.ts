import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * GET /api/payroll/breakdown?employee_id=xxx&year=2026&month=4&company_id=yyy
 *
 * ลด query เหลือ 3 ตัว (จากเดิม 7) — เร็วขึ้น 2-3 เท่า
 * - attendance_records: ขาด/สาย/ออกก่อน/OT
 * - leave_requests + leave_types: ลา
 * - company_holidays: วันหยุดบริษัท
 * - วันทำงาน: ใช้ จ-ศ default (ไม่ query shift/schedule — ลด 3 queries)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const employeeId = p.get("employee_id")
  const year = Number(p.get("year"))
  const month = Number(p.get("month"))
  const companyId = p.get("company_id")

  if (!employeeId || !year || !month) {
    return NextResponse.json({ error: "employee_id, year, month required" }, { status: 400 })
  }

  const supa = createServiceClient()

  const prevM = month === 1 ? 12 : month - 1
  const prevY = month === 1 ? year - 1 : year
  const startDate = `${prevY}-${String(prevM).padStart(2, "0")}-22`
  const endDate = `${year}-${String(month).padStart(2, "0")}-21`

  // ── 3 queries พร้อมกัน (ลดจาก 7) ──
  const [attRes, leaveRes, holRes] = await Promise.all([
    // 1. Attendance records — ได้ ขาด/สาย/ออกก่อน/OT ทั้งหมด
    supa.from("attendance_records")
      .select("work_date, status, clock_in, clock_out, late_minutes, early_out_minutes, ot_minutes, note, half_day_leave")
      .eq("employee_id", employeeId)
      .gte("work_date", startDate).lte("work_date", endDate)
      .order("work_date"),

    // 2. Leave requests (approved) + leave type info
    supa.from("leave_requests")
      .select("start_date, end_date, is_half_day, half_day_period, leave_type:leave_types(name, is_paid, color_hex)")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", endDate)
      .gte("end_date", startDate),

    // 3. Company holidays
    companyId
      ? supa.from("company_holidays")
          .select("date, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .gte("date", startDate).lte("date", endDate)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const records = attRes.data ?? []
  const leaves = leaveRes.data ?? []
  const holidays = holRes.data ?? []

  // ── Holiday set ──
  const holidaySet = new Set<string>()
  const holidayDays: { date: string; name: string }[] = []
  for (const h of holidays) {
    holidaySet.add(h.date)
    holidayDays.push({ date: h.date, name: h.name })
  }

  // ── Leave date map ──
  const leaveDateMap = new Map<string, { type_name: string; is_paid: boolean; color: string; is_half_day: boolean }>()
  const addDays = (ds: string, n: number) => { const d = new Date(ds + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  for (const l of leaves as any[]) {
    let cur = l.start_date as string
    const end = l.end_date as string
    while (cur <= end) {
      if (cur >= startDate && cur <= endDate) {
        leaveDateMap.set(cur, {
          type_name: l.leave_type?.name ?? "ลา",
          is_paid: l.leave_type?.is_paid ?? false,
          color: l.leave_type?.color_hex ?? "#6B7280",
          is_half_day: l.is_half_day ?? false,
        })
      }
      cur = addDays(cur, 1)
    }
  }

  // ── Attendance map ──
  const attMap = new Map<string, any>()
  for (const r of records) attMap.set(r.work_date, r)

  // ── วันทำงาน (จ-ศ default — ไม่ query shift เพื่อความเร็ว) ──
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
  const workDays: string[] = []
  let cur = startDate
  while (cur <= endDate) {
    const dow = new Date(cur + "T00:00:00").getDay()
    if (dow >= 1 && dow <= 5 && !holidaySet.has(cur)) workDays.push(cur)
    cur = addDays(cur, 1)
  }
  const pastWorkDays = workDays.filter(d => d <= today)

  // ── Categorize ──
  const absentDays: { date: string; note?: string }[] = []
  const lateDays: { date: string; minutes: number; clock_in?: string }[] = []
  const earlyOutDays: { date: string; minutes: number; clock_out?: string }[] = []
  const otDays: { date: string; minutes: number }[] = []
  const leaveDays: { date: string; type_name: string; is_paid: boolean; color: string; is_half_day: boolean }[] = []

  // 1. วันขาด = วันทำงานที่ผ่านแล้ว + ไม่มี attendance + ไม่มี leave
  for (const d of pastWorkDays) {
    if (leaveDateMap.has(d)) continue
    const rec = attMap.get(d)
    if (!rec || rec.status === "absent") {
      absentDays.push({ date: d, note: rec?.note })
    }
  }

  // 2. Collect จาก attendance records
  for (const rec of records) {
    const wd = rec.work_date
    const lateMin = Number(rec.late_minutes) || 0
    if ((lateMin > 0 || rec.status === "late") && rec.half_day_leave !== "morning") {
      lateDays.push({ date: wd, minutes: lateMin, clock_in: rec.clock_in })
    }
    const earlyMin = Number(rec.early_out_minutes) || 0
    if ((earlyMin > 0 || rec.status === "early_out") && rec.half_day_leave !== "afternoon") {
      earlyOutDays.push({ date: wd, minutes: earlyMin, clock_out: rec.clock_out })
    }
    const otMin = Number(rec.ot_minutes) || 0
    if (otMin > 0) {
      otDays.push({ date: wd, minutes: otMin })
    }
  }

  // 3. Leave days
  leaveDateMap.forEach((info, wd) => { leaveDays.push({ date: wd, ...info }) })

  // Sort
  const byDate = (a: any, b: any) => a.date.localeCompare(b.date)
  absentDays.sort(byDate); lateDays.sort(byDate); earlyOutDays.sort(byDate)
  otDays.sort(byDate); leaveDays.sort(byDate); holidayDays.sort(byDate)

  return NextResponse.json({
    absent: absentDays,
    late: lateDays,
    early_out: earlyOutDays,
    ot: otDays,
    leave: leaveDays,
    holidays: holidayDays,
    summary: {
      absent_count: absentDays.length,
      late_count: lateDays.length,
      late_total_min: lateDays.reduce((s, d) => s + d.minutes, 0),
      early_out_count: earlyOutDays.length,
      early_out_total_min: earlyOutDays.reduce((s, d) => s + d.minutes, 0),
      ot_count: otDays.length,
      ot_total_min: otDays.reduce((s, d) => s + d.minutes, 0),
      leave_count: leaveDays.length,
      holiday_count: holidayDays.length,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  })
}
