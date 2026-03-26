import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/attendance/backfill-absent
 *
 * สร้าง attendance_records สถานะ "absent" ย้อนหลัง
 * สำหรับวันทำงานทั้งหมดที่ไม่มี record + ไม่ได้ลา + ไม่ใช่วันหยุด
 *
 * Body: { from: "2026-03-01", to: "2026-03-25", secret?: "..." }
 *
 * ⚠️ ควรรันครั้งแรกเพื่อ backfill ข้อมูลเก่า จากนั้น mark-absent cron จะดูแลรายวัน
 */

function addDays(ds: string, n: number): string {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-")
}

function dayOfWeek(ds: string): number {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}

function todayTH(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

export async function POST(req: Request) {
  // ── Security ──────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("x-cron-secret") || req.headers.get("authorization")

  let body: any = {}
  try { body = await req.json() } catch { /* empty body OK */ }

  if (cronSecret) {
    const provided = authHeader?.replace("Bearer ", "") || body.secret
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const fromDate: string = body.from
  const toDate: string = body.to || addDays(todayTH(), -1) // ถึงเมื่อวาน

  if (!fromDate) {
    return NextResponse.json({ error: "กรุณาระบุ from (วันที่เริ่ม เช่น 2026-03-01)" }, { status: 400 })
  }

  // ห้าม backfill วันนี้หรืออนาคต
  const today = todayTH()
  const effectiveTo = toDate >= today ? addDays(today, -1) : toDate

  if (fromDate > effectiveTo) {
    return NextResponse.json({ success: true, message: "ไม่มีวันที่ต้อง backfill", marked: 0 })
  }

  const supa = createServiceClient()

  // ── สร้างรายการวันทำงาน (จ-ศ) ในช่วง ────────────────────────
  const workDays: string[] = []
  let cur = fromDate
  while (cur <= effectiveTo) {
    const dow = dayOfWeek(cur)
    if (dow !== 0 && dow !== 6) workDays.push(cur)
    cur = addDays(cur, 1)
  }

  if (workDays.length === 0) {
    return NextResponse.json({ success: true, message: "ไม่มีวันทำงานในช่วงนี้", marked: 0 })
  }

  // ── ดึงพนักงาน active ─────────────────────────────────────────
  const { data: employees } = await supa
    .from("employees")
    .select("id, company_id, hire_date, is_attendance_exempt, resignation_date")
    .eq("is_active", true)

  const allEmps = (employees ?? []) as any[]

  // ── ดึง company holidays ในช่วง ───────────────────────────────
  const companyIds = Array.from(new Set(allEmps.map(e => e.company_id as string)))
  const { data: holidays } = await supa
    .from("company_holidays")
    .select("company_id, date")
    .in("company_id", companyIds)
    .gte("date", fromDate)
    .lte("date", effectiveTo)
    .eq("is_active", true)

  // Map: company_id → Set of holiday dates
  const holidayMap = new Map<string, Set<string>>()
  for (const h of (holidays ?? []) as any[]) {
    if (!holidayMap.has(h.company_id)) holidayMap.set(h.company_id, new Set())
    holidayMap.get(h.company_id)!.add(h.date)
  }

  // ── ดึง attendance records ที่มีอยู่ ──────────────────────────
  const { data: existingRecords } = await supa
    .from("attendance_records")
    .select("employee_id, work_date")
    .gte("work_date", fromDate)
    .lte("work_date", effectiveTo)

  const existSet = new Set(
    (existingRecords ?? []).map((r: any) => `${r.employee_id}|${r.work_date}`)
  )

  // ── ดึงวันลา approved ในช่วง ──────────────────────────────────
  const { data: leaveData } = await supa
    .from("leave_requests")
    .select("employee_id, start_date, end_date")
    .eq("status", "approved")
    .lte("start_date", effectiveTo)
    .gte("end_date", fromDate)

  // สร้าง Set: "empId|date" สำหรับทุกวันลา
  const leaveSet = new Set<string>()
  for (const l of (leaveData ?? []) as any[]) {
    let d = l.start_date as string
    const end = l.end_date as string
    while (d <= end) {
      leaveSet.add(`${l.employee_id}|${d}`)
      d = addDays(d, 1)
    }
  }

  // ── สร้าง absent records ──────────────────────────────────────
  const absentRecords: any[] = []

  for (const emp of allEmps) {
    if (emp.is_attendance_exempt) continue // exempt ไม่ต้อง

    const compHolidays = holidayMap.get(emp.company_id) ?? new Set()

    for (const day of workDays) {
      // ตรวจว่าพนักงานจ้างแล้ว
      if (emp.hire_date && day < emp.hire_date) continue
      // ตรวจว่ายังไม่ลาออก
      if (emp.resignation_date && day > emp.resignation_date) continue
      // วันหยุดบริษัท
      if (compHolidays.has(day)) continue
      // มี record แล้ว
      if (existSet.has(`${emp.id}|${day}`)) continue
      // ลาอนุมัติแล้ว
      if (leaveSet.has(`${emp.id}|${day}`)) continue

      absentRecords.push({
        employee_id: emp.id,
        company_id: emp.company_id,
        work_date: day,
        status: "absent",
        clock_in: null,
        clock_out: null,
        late_minutes: 0,
        early_out_minutes: 0,
        work_minutes: 0,
        ot_minutes: 0,
        check_method: "auto",
        note: "ระบบ backfill absent อัตโนมัติ",
      })
    }
  }

  if (absentRecords.length === 0) {
    return NextResponse.json({
      success: true,
      message: `${fromDate} → ${effectiveTo} — ไม่มีวันขาดงานที่ต้อง backfill`,
      marked: 0,
    })
  }

  // upsert เป็น batch (500 records ต่อ batch)
  let totalInserted = 0
  const batchSize = 500
  const errors: string[] = []

  for (let i = 0; i < absentRecords.length; i += batchSize) {
    const batch = absentRecords.slice(i, i + batchSize)
    const { error } = await supa
      .from("attendance_records")
      .upsert(batch, { onConflict: "employee_id,work_date", ignoreDuplicates: true })

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`)
    } else {
      totalInserted += batch.length
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    message: `${fromDate} → ${effectiveTo} — backfill สำเร็จ`,
    marked: totalInserted,
    date_range: { from: fromDate, to: effectiveTo },
    work_days_checked: workDays.length,
    employees_checked: allEmps.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
