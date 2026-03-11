import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcGeoDistance, calcWorkDate, calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"

// ── วันที่ปัจจุบันในโซนเวลาไทย ─────────────────────────────────────────
// ใช้ sv-SE locale เพราะ format = "yyyy-MM-dd" ตรงกับที่ต้องการ
function todayBKK(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action, lat, lng } = body as {
    action: "clock_in" | "clock_out"
    lat:    number
    lng:    number
  }

  // ── ตรวจสอบ input ─────────────────────────────────────────────
  if (action !== "clock_in" && action !== "clock_out") {
    return NextResponse.json({ success: false, error: "Invalid action" })
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ success: false, error: "lat/lng required" })
  }

  // ── auth ───────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── ดึงข้อมูล user + employee ─────────────────────────────────
  const { data: userData } = await supa
    .from("users")
    .select("employee_id, employee:employees(*, branch:branches(*), department:departments(name))")
    .eq("id", user.id)
    .single()

  if (!userData?.employee_id) {
    return NextResponse.json({ success: false, error: "Employee not found" })
  }

  const emp      = userData.employee as any
  const deptName = emp.department?.name as string | undefined
  const now      = new Date()
  const today    = todayBKK()   // ✅ ใช้เวลาไทย ไม่ใช่ server timezone

  // ── ตรวจสอบสาขาที่มีสิทธิ์เช็คอิน ────────────────────────────
  const { data: allowedRows } = await supa
    .from("employee_allowed_locations")
    .select(
      "branch_id, custom_name, custom_lat, custom_lng, custom_radius_m, " +
      "branch:branches(id, name, latitude, longitude, geo_radius_m)"
    )
    .eq("employee_id", emp.id)

  // รวม branch + custom GPS เป็น list เดียว
  type BranchLoc = { id: string; name: string; latitude: number; longitude: number; geo_radius_m: number }
  const branches = (allowedRows ?? []).flatMap((r: any): BranchLoc[] => {
    if (r.branch_id && r.branch?.latitude) {
      return [{
        id:           r.branch.id as string,
        name:         r.branch.name as string,
        latitude:     Number(r.branch.latitude),
        longitude:    Number(r.branch.longitude),
        geo_radius_m: Number(r.branch.geo_radius_m) || 200,
      }]
    }
    if (!r.branch_id && r.custom_lat && r.custom_lng) {
      return [{
        id:           `custom_${r.custom_lat}_${r.custom_lng}`,
        name:         (r.custom_name as string) || "Custom Location",
        latitude:     Number(r.custom_lat),
        longitude:    Number(r.custom_lng),
        geo_radius_m: Number(r.custom_radius_m) || 200,
      }]
    }
    return []
  })

  if (branches.length === 0) {
    return NextResponse.json({
      success: false,
      error: "ยังไม่ได้รับสิทธิ์เช็คอิน กรุณาติดต่อ HR",
    })
  }

  // หาสาขาที่ใกล้ที่สุด
  let nearest: BranchLoc | null = null
  let minDist = Infinity
  for (const b of branches) {
    const d = calcGeoDistance(lat, lng, b.latitude, b.longitude)
    if (d < minDist) { minDist = d; nearest = b }
  }

  const nearestName = nearest?.name ?? "สาขา"
  if (!nearest || minDist > nearest.geo_radius_m) {
    return NextResponse.json({
      success: false,
      error: `อยู่นอกรัศมีที่กำหนด (${Math.round(minDist)} ม. จาก ${nearestName})`,
    })
  }

  // ── Shift template ─────────────────────────────────────────────
  const { data: schedule } = await supa
    .from("work_schedules")
    .select("*, shift:shift_templates(*)")
    .eq("employee_id", emp.id)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle()

  const shift = (schedule as any)?.shift as any | null

  // work_date: overnight shift ให้นับวันก่อนหน้า
  const workDate = shift?.is_overnight
    ? calcWorkDate(now, true, "Asia/Bangkok")
    : today

  // grace period ตามแผนก (หรือจาก work_schedule ถ้ามี override)
  const lateThreshold: number =
    (schedule as any)?.late_threshold_minutes ??
    getLateThreshold(deptName)

  // ════════════════════════════════════════════════════════════════
  // CLOCK IN
  // ════════════════════════════════════════════════════════════════
  if (action === "clock_in") {
    // ตรวจว่าเช็คอินไปแล้วหรือยัง
    const { data: existing } = await supa
      .from("attendance_records")
      .select("id, clock_in")
      .eq("employee_id", emp.id)
      .eq("work_date", workDate)
      .maybeSingle()

    if (existing?.clock_in) {
      return NextResponse.json({ success: false, error: "เช็คอินไปแล้ว" })
    }

    // คำนวณนาทีสาย
    const expectedStart = shift
      ? new Date(`${workDate}T${shift.work_start}+07:00`)
      : null

    // rawLateMin = นาทีที่มาช้ากว่าเวลาเริ่มงาน (0 ถ้ามาก่อน/ตรงเวลา)
    const rawLateMin     = expectedStart ? calcLateMinutes(now, expectedStart) : 0
    // effectiveLate = นาทีที่หักจริง หลังหัก grace period แล้ว
    const effectiveLate  = Math.max(rawLateMin - lateThreshold, 0)
    // isLate = true เฉพาะเมื่อเกิน grace period
    const isLate         = effectiveLate > 0

    const { error: insErr } = await supa
      .from("attendance_records")
      .upsert({
        employee_id:         emp.id,
        company_id:          emp.company_id,
        work_date:           workDate,
        clock_in:            now.toISOString(),
        clock_in_lat:        lat,
        clock_in_lng:        lng,
        clock_in_branch_id:  nearest.id,
        clock_in_distance_m: Math.round(minDist),
        clock_in_valid:      true,
        expected_start:      expectedStart?.toISOString() ?? null,
        late_minutes:        effectiveLate,    // ✅ หักจริง (หลัง grace period)
        early_out_minutes:   0,
        status:              isLate ? "late" : "present",
        shift_template_id:   shift?.id ?? null,
      }, { onConflict: "employee_id,work_date" })

    if (insErr) return NextResponse.json({ success: false, error: insErr.message })

    return NextResponse.json({
      success:           true,
      late_minutes:      effectiveLate,
      is_late:           isLate,
      raw_late_minutes:  rawLateMin,
      threshold_minutes: lateThreshold,
      location_name:     nearest.name,
    })
  }

  // ════════════════════════════════════════════════════════════════
  // CLOCK OUT
  // ════════════════════════════════════════════════════════════════
  if (action === "clock_out") {
    const { data: rec } = await supa
      .from("attendance_records")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("work_date", workDate)
      .maybeSingle()

    if (!rec?.clock_in)  return NextResponse.json({ success: false, error: "ยังไม่ได้เช็คอิน" })
    if (rec.clock_out)   return NextResponse.json({ success: false, error: "เช็คเอ้าท์ไปแล้ว" })

    const clockIn    = new Date(rec.clock_in as string)
    const breakMin   = shift?.break_minutes ?? 60
    const workMin    = calcWorkMinutes(clockIn, now, breakMin)

    // expected_end คือเวลาเลิกงาน (overnight ต้องบวก 1 วัน)
    const expectedEnd = shift
      ? new Date(`${workDate}T${shift.work_end}+07:00`)
      : null

    const expectedEndAdj = (shift?.is_overnight && expectedEnd)
      ? new Date(expectedEnd.getTime() + 86_400_000)
      : expectedEnd

    // earlyOutMin > 0 = ออกก่อนเวลาเลิกงาน → หักเงินตามนาที
    const earlyOutRaw = expectedEndAdj
      ? Math.floor((expectedEndAdj.getTime() - now.getTime()) / 60_000)
      : 0
    const earlyOutMin = Math.max(earlyOutRaw, 0)

    // ✅ ไม่คิด OT อัตโนมัติ — ถ้าออกหลัง expected_end ก็แค่บันทึก = 0
    // พนักงานต้องยื่นขอ OT/bonus ผ่านระบบด้วยตัวเองเท่านั้น
    const otMin = 0

    // status: ถ้าเคย late ให้คง late ไว้ / ถ้าออกก่อน = early_out / ปกติ = present
    const newStatus =
      rec.status === "late" ? "late"
      : earlyOutMin > 0     ? "early_out"
      :                       "present"

    const { error: updErr } = await supa
      .from("attendance_records")
      .update({
        clock_out:            now.toISOString(),
        clock_out_lat:        lat,
        clock_out_lng:        lng,
        clock_out_branch_id:  nearest.id,
        clock_out_distance_m: Math.round(minDist),
        clock_out_valid:      true,
        work_minutes:         workMin,
        ot_minutes:           otMin,
        early_out_minutes:    earlyOutMin,   // ✅ บันทึกนาทีออกก่อน
        expected_end:         expectedEndAdj?.toISOString() ?? null,
        status:               newStatus,
      })
      .eq("id", rec.id as string)

    if (updErr) return NextResponse.json({ success: false, error: updErr.message })

    return NextResponse.json({
      success:           true,
      work_minutes:      workMin,
      ot_minutes:        otMin,
      early_out_minutes: earlyOutMin,
      is_early_out:      earlyOutMin > 0,
    })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}