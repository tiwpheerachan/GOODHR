import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════
// GET /api/manager/team-attendance
//   ดึงข้อมูลการเข้างานของลูกทีมหัวหน้า (เป็นรายเดือน + รอบเงินเดือน)
//
//   query:
//     mode    = "direct" | "chain"   (default direct)
//     month   = YYYY-MM              (default: เดือนปัจจุบัน — ถ้าวันที่ > 21 ใช้เดือนถัดไป)
//
//   รอบเงินเดือน: 22 เดือนก่อน → 21 เดือนนี้
//
//   response:
//     {
//       members: [{ id, full_name, depth, ... }],
//       calendar: { start, end }       (เดือนปฏิทินทั้งเดือน — สำหรับ render calendar)
//       period:   { start, end }       (รอบเงินเดือน — สำหรับสรุป stats)
//       records:  [...attendance_records ทั้งหมดในเดือนปฏิทิน],
//       holidays: [{ date, name }],
//       leaves:   [{ employee_id, start_date, end_date, ... }],
//       summary:  { [employee_id]: { ...stats เฉพาะรอบเงินเดือน } }
//     }
// ════════════════════════════════════════════════════════════════════
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = (searchParams.get("mode") as "direct" | "chain") || "direct"
  const monthParam = searchParams.get("month")

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data: userData } = await supa
    .from("users").select("role, employee_id, employees(id, company_id)")
    .eq("id", user.id).single()
  if (!userData?.employee_id) {
    return NextResponse.json({ success: false, error: "ไม่พบพนักงาน" }, { status: 403 })
  }

  const myEmpId = (userData as any).employee_id
  const role = (userData as any).role
  const isAdmin = ["super_admin", "hr_admin"].includes(role)

  // ── คำนวณช่วงเวลา ──
  // month = YYYY-MM ของรอบที่ดู (default: ปัจจุบัน — ถ้าวันที่ > 21 ใช้รอบถัดไป)
  function getDefaultMonth(): { y: number; m: number } {
    const now = new Date()
    if (now.getDate() > 21) return { y: now.getFullYear(), m: now.getMonth() + 1 }
    return { y: now.getFullYear(), m: now.getMonth() }
  }
  let y: number, m: number  // m = 0-based month
  if (monthParam) {
    const [yy, mm] = monthParam.split("-").map(Number)
    y = yy; m = mm - 1
  } else {
    const d = getDefaultMonth()
    y = d.y; m = d.m
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  const calStart = `${y}-${pad(m + 1)}-01`
  const calEndDate = new Date(y, m + 1, 0) // last day of month
  const calEnd = `${y}-${pad(m + 1)}-${pad(calEndDate.getDate())}`

  // payroll period = 22 ของเดือนก่อน → 21 ของเดือนนี้
  const periodStartDate = new Date(y, m - 1, 22)
  const periodEndDate = new Date(y, m, 21)
  const periodStart = `${periodStartDate.getFullYear()}-${pad(periodStartDate.getMonth() + 1)}-${pad(periodStartDate.getDate())}`
  const periodEnd = `${periodEndDate.getFullYear()}-${pad(periodEndDate.getMonth() + 1)}-${pad(periodEndDate.getDate())}`

  // ── ดึงลูกทีม ──
  const allMembers: Array<{ id: string; depth: number }> = []
  const seen = new Set<string>()

  async function fetchDirectReports(managerIds: string[]): Promise<string[]> {
    if (managerIds.length === 0) return []
    const { data } = await supa
      .from("employee_manager_history")
      .select("employee_id, manager_id")
      .in("manager_id", managerIds)
      .is("effective_to", null)
    return (data ?? []).map((r: any) => r.employee_id).filter(Boolean)
  }

  const level1 = await fetchDirectReports([myEmpId])
  for (const id of level1) {
    if (!seen.has(id)) { seen.add(id); allMembers.push({ id, depth: 1 }) }
  }

  if (mode === "chain") {
    let current = level1
    let depth = 2
    while (current.length > 0 && depth <= 6) {
      const next = await fetchDirectReports(current)
      const fresh = next.filter(id => !seen.has(id))
      for (const id of fresh) { seen.add(id); allMembers.push({ id, depth }) }
      current = fresh
      depth++
    }
  }

  if (allMembers.length === 0) {
    return NextResponse.json({
      success: true,
      members: [], records: [], summary: {}, holidays: [], leaves: [],
      calendar: { start: calStart, end: calEnd },
      period: { start: periodStart, end: periodEnd },
      is_admin: isAdmin,
    })
  }

  const memberIds = allMembers.map(m => m.id)

  // ── parallel queries ──
  const fetchEmps = supa
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url, employment_status, company_id, department:departments(name), position:positions(name)")
    .in("id", memberIds)

  const fetchRecs = supa
    .from("attendance_records")
    .select(`
      id, employee_id, work_date,
      clock_in, clock_out,
      clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng,
      clock_in_photo_url, clock_out_photo_url,
      clock_in_address, clock_out_address,
      clock_in_with_photo, clock_out_with_photo,
      is_offsite_in, is_offsite_out,
      offsite_in_status, offsite_out_status,
      late_minutes, early_out_minutes, work_minutes, ot_minutes, status
    `)
    .in("employee_id", memberIds)
    .gte("work_date", calStart).lte("work_date", calEnd)
    .order("work_date", { ascending: false })

  const fetchLeaves = supa
    .from("leave_requests")
    .select("employee_id, start_date, end_date, is_half_day, half_day_period, status, leave_type:leave_types(name)")
    .in("employee_id", memberIds)
    .in("status", ["approved", "pending"])
    .lte("start_date", calEnd)
    .gte("end_date", calStart)

  const [empRes, recRes, leaveRes] = await Promise.all([fetchEmps, fetchRecs, fetchLeaves])
  const empRows = empRes.data ?? []
  const records = recRes.data ?? []
  const leaves  = leaveRes.data ?? []

  // ── holidays (group by company) ──
  const companyIds = Array.from(new Set(empRows.map((e: any) => e.company_id).filter(Boolean)))
  let holidays: any[] = []
  if (companyIds.length > 0) {
    const { data: hol } = await supa
      .from("company_holidays")
      .select("date, name, company_id")
      .in("company_id", companyIds)
      .eq("is_active", true)
      .gte("date", calStart).lte("date", calEnd)
    holidays = hol ?? []
  }

  // ── shape members ──
  const depthMap = new Map(allMembers.map(m => [m.id, m.depth]))
  const members = empRows.map((e: any) => ({
    id: e.id,
    employee_code: e.employee_code,
    full_name: `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim(),
    full_name_en: `${e.first_name_en ?? ""} ${e.last_name_en ?? ""}`.trim(),
    department: e.department?.name ?? null,
    position: e.position?.name ?? null,
    avatar_url: e.avatar_url ?? null,
    employment_status: e.employment_status,
    company_id: e.company_id,
    depth: depthMap.get(e.id) ?? 1,
  }))

  // ── สรุปรายบุคคล (เฉพาะรอบเงินเดือน) ──
  type Summary = {
    present: number; late: number; absent: number; early_out: number; on_leave: number
    normal_count: number; offsite_count: number; with_photo_count: number
    total_late_min: number; total_work_min: number; total_early_min: number; total_ot_min: number
    days_with_record: number
  }
  const summary: Record<string, Summary> = {}
  for (const id of memberIds) {
    summary[id] = {
      present: 0, late: 0, absent: 0, early_out: 0, on_leave: 0,
      normal_count: 0, offsite_count: 0, with_photo_count: 0,
      total_late_min: 0, total_work_min: 0, total_early_min: 0, total_ot_min: 0,
      days_with_record: 0,
    }
  }
  for (const r of records as any[]) {
    if (r.work_date < periodStart || r.work_date > periodEnd) continue // เฉพาะรอบเงินเดือน
    const s = summary[r.employee_id]
    if (!s) continue
    s.days_with_record++
    if (r.status === "present") s.present++
    else if (r.status === "late") s.late++
    else if (r.status === "absent") s.absent++
    else if (r.status === "early_out") s.early_out++
    else if (r.status === "leave" || r.status === "on_leave") s.on_leave++

    s.total_late_min += r.late_minutes || 0
    s.total_work_min += r.work_minutes || 0
    s.total_early_min += r.early_out_minutes || 0
    s.total_ot_min += r.ot_minutes || 0

    const hasPhoto = r.clock_in_with_photo || r.clock_out_with_photo
    const hasOffsite = r.is_offsite_in || r.is_offsite_out
    if (hasPhoto) s.with_photo_count++
    else if (hasOffsite) s.offsite_count++
    else if (r.clock_in) s.normal_count++
  }

  return NextResponse.json({
    success: true,
    members,
    records,
    holidays,
    leaves,
    summary,
    calendar: { start: calStart, end: calEnd },
    period: { start: periodStart, end: periodEnd },
    is_admin: isAdmin,
  })
}
