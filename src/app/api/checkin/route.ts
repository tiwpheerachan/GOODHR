import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcGeoDistance, calcWorkDate, calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"

export async function POST(request: Request) {
  const body = await request.json()
  const { action, lat, lng } = body

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select(`employee_id, employee:employees(*, branch:branches(*), department:departments(name))`)
    .eq("id", user.id).single()

  if (!userData?.employee_id)
    return NextResponse.json({ success: false, error: "Employee not found" })

  const emp      = userData.employee as any
  const deptName = emp.department?.name as string | undefined
  const now      = new Date()
  const today    = fmt(now)

  // ── ดึงเฉพาะสาขาที่ HR กำหนดสิทธิ์ให้พนักงานคนนี้ ────────────
  const { data: allowedRows } = await supa
    .from("employee_allowed_locations")
    .select("branch:branches(id,name,latitude,longitude,geo_radius_m)")
    .eq("employee_id", emp.id)

  const branches = (allowedRows ?? [])
    .map((r: any) => r.branch)
    .filter((b: any) => b?.latitude && b?.longitude)

  if (branches.length === 0)
    return NextResponse.json({ success: false, error: "ยังไม่ได้รับสิทธิ์เช็คอิน กรุณาติดต่อ HR" })

  // ── หาสาขาที่ใกล้ที่สุด ───────────────────────────────────────
  let nearest: any = null, minDist = Infinity
  for (const b of branches) {
    const d = calcGeoDistance(lat, lng, Number(b.latitude), Number(b.longitude))
    if (d < minDist) { minDist = d; nearest = b }
  }

  const inRadius = nearest && minDist <= (nearest.geo_radius_m || 200)
  if (!inRadius)
    return NextResponse.json({
      success: false,
      error: `อยู่นอกรัศมีที่กำหนด (${Math.round(minDist)}ม. จาก ${nearest?.name})`,
    })

  // ── Shift ─────────────────────────────────────────────────────
  const { data: schedule } = await supa.from("work_schedules")
    .select("*, shift:shift_templates(*)")
    .eq("employee_id", emp.id)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .limit(1).maybeSingle()

  const shift    = (schedule as any)?.shift
  const workDate = shift?.is_overnight
    ? calcWorkDate(now, true, emp.branch?.timezone || "Asia/Bangkok")
    : today

  const lateThreshold = getLateThreshold(deptName)

  // ── CLOCK IN ─────────────────────────────────────────────────
  if (action === "clock_in") {
    const { data: existing } = await supa.from("attendance_records")
      .select("id,clock_in").eq("employee_id", emp.id).eq("work_date", workDate).maybeSingle()
    if (existing?.clock_in)
      return NextResponse.json({ success: false, error: "เช็คอินไปแล้ว" })

    const expectedStart = shift ? new Date(workDate + "T" + shift.work_start + "+07:00") : null
    const rawLateMin    = expectedStart ? calcLateMinutes(now, expectedStart) : 0
    const effectiveLate = Math.max(rawLateMin - lateThreshold, 0)
    const isLate        = rawLateMin > lateThreshold

    const { error } = await supa.from("attendance_records").upsert({
      employee_id:         emp.id,
      company_id:          emp.company_id,
      work_date:           workDate,
      clock_in:            now.toISOString(),
      clock_in_lat:        lat,
      clock_in_lng:        lng,
      clock_in_branch_id:  nearest?.id,
      clock_in_distance_m: minDist,
      clock_in_valid:      true,
      expected_start:      expectedStart?.toISOString(),
      late_minutes:        effectiveLate,
      status:              isLate ? "late" : "present",
      shift_template_id:   shift?.id,
    }, { onConflict: "employee_id,work_date" })

    if (error) return NextResponse.json({ success: false, error: error.message })
    return NextResponse.json({
      success: true, late_minutes: effectiveLate,
      is_late: isLate, location_name: nearest?.name,
    })
  }

  // ── CLOCK OUT ─────────────────────────────────────────────────
  if (action === "clock_out") {
    const { data: rec } = await supa.from("attendance_records")
      .select("*").eq("employee_id", emp.id).eq("work_date", workDate).maybeSingle()
    if (!rec?.clock_in)  return NextResponse.json({ success: false, error: "ยังไม่ได้เช็คอิน" })
    if (rec.clock_out)   return NextResponse.json({ success: false, error: "เช็คเอ้าท์ไปแล้ว" })

    const clockIn        = new Date(rec.clock_in)
    const workMin        = calcWorkMinutes(clockIn, now, shift?.break_minutes || 60)
    const expectedEnd    = shift ? new Date(workDate + "T" + shift.work_end + "+07:00") : null
    const expectedEndAdj = (shift?.is_overnight && expectedEnd)
      ? new Date(expectedEnd.getTime() + 86400000) : expectedEnd
    const overworkMin    = expectedEndAdj ? Math.floor((now.getTime() - expectedEndAdj.getTime()) / 60000) : 0
    const otMin          = overworkMin > (shift?.ot_start_after_minutes || 30) ? overworkMin : 0

    await supa.from("attendance_records").update({
      clock_out:            now.toISOString(),
      clock_out_lat:        lat, clock_out_lng: lng,
      clock_out_branch_id:  nearest?.id,
      clock_out_distance_m: minDist, clock_out_valid: true,
      work_minutes: workMin, ot_minutes: otMin,
      expected_end: expectedEndAdj?.toISOString(),
    }).eq("id", rec.id)

    return NextResponse.json({ success: true, work_minutes: workMin, ot_minutes: otMin })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}