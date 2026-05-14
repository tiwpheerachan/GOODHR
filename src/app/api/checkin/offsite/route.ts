import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcGeoDistance, calcWorkDate, calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"

function todayBKK(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

// ── POST: Off-site check-in/out พร้อมรูปถ่าย ──────────────────────────
export async function POST(request: Request) {
  const formData = await request.formData()

  const action   = formData.get("action") as "clock_in" | "clock_out"
  const rawLat   = parseFloat(formData.get("lat") as string)
  const rawLng   = parseFloat(formData.get("lng") as string)
  const hasGps   = formData.get("has_gps") !== "false"
  const lat      = hasGps && !isNaN(rawLat) ? rawLat : 0
  const lng      = hasGps && !isNaN(rawLng) ? rawLng : 0
  const photo    = formData.get("photo") as File | null
  const note     = (formData.get("note") as string) || ""
  const locationName = (formData.get("location_name") as string) || ""

  // Validate
  if (action !== "clock_in" && action !== "clock_out") {
    return NextResponse.json({ success: false, error: "Invalid action" })
  }
  if (!photo) {
    return NextResponse.json({ success: false, error: "กรุณาถ่ายรูปเพื่อยืนยัน" })
  }

  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // Employee data
  const { data: userData } = await supa
    .from("users")
    .select("employee_id, employee:employees(*, department:departments(name), company:companies(code))")
    .eq("id", user.id)
    .single()

  if (!userData?.employee_id) {
    return NextResponse.json({ success: false, error: "Employee not found" })
  }

  const emp      = userData.employee as any
  const deptName = emp.department?.name as string | undefined
  const companyCode = emp.company?.code as string | undefined
  const now      = new Date()
  const today    = todayBKK()
  const bkkHour  = parseInt(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }))

  // ── ดึง shift จาก monthly_shift_assignments ก่อน, fallback เป็น work_schedules ──
  const [monthlyRes, schedRes] = await Promise.all([
    supa.from("monthly_shift_assignments")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id)
      .eq("work_date", today)
      .maybeSingle(),
    supa.from("work_schedules")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // กฎ: ถ้ามี monthly_assignment record → เคารพ (source of truth)
  //     fallback ไป work_schedules เฉพาะกรณี "ไม่มี" assignment เลย
  let shift: any = null
  let schedule: any = null
  if (monthlyRes.data) {
    shift = (monthlyRes.data as any).shift ?? null
    if (!shift && (monthlyRes.data as any).shift_id) {
      const { data: shiftData } = await supa.from("shift_templates").select("*").eq("id", (monthlyRes.data as any).shift_id).single()
      if (shiftData) shift = shiftData
    }
    // หาก shift_id=null (dayoff/leave/holiday) → shift = null (ไม่ fallback)
  } else {
    schedule = schedRes.data
    shift = (schedule as any)?.shift ?? null
  }

  // ── กะข้ามเที่ยงคืน: clock_in หลัง 22:00 และกะพรุ่งนี้เริ่ม 00:00-02:00 → ใช้กะพรุ่งนี้ ──
  let useNextDayShift = false
  if (action === "clock_in" && bkkHour >= 22) {
    const tomorrow = new Date(now.getTime() + 86_400_000)
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
    const { data: tomorrowShift } = await supa.from("monthly_shift_assignments")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id)
      .eq("work_date", tomorrow)
      .maybeSingle()
    if (tomorrowShift?.shift) {
      const startHour = parseInt((tomorrowShift as any).shift.work_start?.substring(0, 2) ?? "99")
      if (startHour <= 2 && (tomorrowShift as any).assignment_type === "work") {
        shift = (tomorrowShift as any).shift
        useNextDayShift = true
      }
    }
  }

  // ── clock_out กะข้ามคืน: ถ้าไม่มี record วันนี้ แต่เมื่อวานมี clock_in ที่ยังไม่ clock_out → ใช้เมื่อวาน ──
  let useYesterday = false
  let yesterdayDate: string | null = null
  if (action === "clock_out") {
    const { data: todayRec } = await supa
      .from("attendance_records")
      .select("id, clock_in")
      .eq("employee_id", emp.id)
      .eq("work_date", today)
      .maybeSingle()

    if (!todayRec?.clock_in) {
      yesterdayDate = new Date(now.getTime() - 86_400_000)
        .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      const [yShiftRes, yRecRes] = await Promise.all([
        supa.from("monthly_shift_assignments")
          .select("*, shift:shift_templates(*)")
          .eq("employee_id", emp.id)
          .eq("work_date", yesterdayDate)
          .maybeSingle(),
        supa.from("attendance_records")
          .select("id, clock_in, clock_out, shift_template_id")
          .eq("employee_id", emp.id)
          .eq("work_date", yesterdayDate)
          .maybeSingle(),
      ])
      if (yRecRes.data?.clock_in && !yRecRes.data.clock_out) {
        useYesterday = true
        let yShift = (yShiftRes.data as any)?.shift ?? null
        if (!yShift) {
          const { data: ySchedData } = await supa
            .from("work_schedules")
            .select("*, shift:shift_templates(*)")
            .eq("employee_id", emp.id)
            .lte("effective_from", yesterdayDate)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle()
          yShift = (ySchedData as any)?.shift ?? null
        }
        if (!yShift && yRecRes.data.shift_template_id) {
          const { data: tplData } = await supa
            .from("shift_templates").select("*")
            .eq("id", yRecRes.data.shift_template_id).maybeSingle()
          yShift = tplData ?? null
        }
        shift = yShift
      }
    }
  }

  const workDate = useYesterday
    ? yesterdayDate!
    : useNextDayShift
      ? new Date(now.getTime() + 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      : (shift?.is_overnight && bkkHour < 5)
        ? calcWorkDate(now, true, "Asia/Bangkok")
        : today

  const lateThreshold: number =
    (schedule as any)?.late_threshold_minutes ??
    getLateThreshold(deptName, companyCode)

  // ── Upload photo to Supabase Storage ────────────────────────────────
  const fileExt = photo.name?.split(".").pop() || "jpg"
  const fileName = `offsite/${emp.id}/${workDate}_${action}_${Date.now()}.${fileExt}`

  const arrayBuffer = await photo.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadErr } = await supa.storage
    .from("checkin-photos")
    .upload(fileName, buffer, {
      contentType: photo.type || "image/jpeg",
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json({ success: false, error: "อัพโหลดรูปไม่สำเร็จ: " + uploadErr.message })
  }

  // Get public URL
  const { data: urlData } = supa.storage.from("checkin-photos").getPublicUrl(fileName)
  const photoUrl = urlData.publicUrl

  // ════════════════════════════════════════════════════════════════════
  // CLOCK IN (off-site)
  // ════════════════════════════════════════════════════════════════════
  if (action === "clock_in") {
    const { data: existing } = await supa
      .from("attendance_records")
      .select("id, clock_in")
      .eq("employee_id", emp.id)
      .eq("work_date", workDate)
      .maybeSingle()

    if (existing?.clock_in) {
      return NextResponse.json({ success: false, error: "เช็คอินไปแล้ว" })
    }

    // Calculate late
    const expectedStart = shift
      ? new Date(`${workDate}T${shift.work_start}+07:00`)
      : null

    const rawLateMin    = expectedStart ? calcLateMinutes(now, expectedStart) : 0
    const effectiveLate = Math.max(rawLateMin - lateThreshold, 0)
    const isLate        = effectiveLate > 0

    // Insert attendance record (check-in ได้ทันที สถานะ pending)
    const { data: attRec, error: insErr } = await supa
      .from("attendance_records")
      .upsert({
        employee_id:         emp.id,
        company_id:          emp.company_id,
        work_date:           workDate,
        clock_in:            now.toISOString(),
        clock_in_lat:        lat,
        clock_in_lng:        lng,
        clock_in_distance_m: 0,
        clock_in_valid:      true,
        expected_start:      expectedStart?.toISOString() ?? null,
        late_minutes:        effectiveLate,
        early_out_minutes:   0,
        status:              isLate ? "late" : "present",
        shift_template_id:   shift?.id ?? null,
        is_offsite_in:       true,
        offsite_in_status:   "pending",
      }, { onConflict: "employee_id,work_date" })
      .select("id")
      .single()

    if (insErr) return NextResponse.json({ success: false, error: insErr.message })

    // Insert offsite request
    const { error: reqErr } = await supa
      .from("offsite_checkin_requests")
      .insert({
        employee_id:   emp.id,
        company_id:    emp.company_id,
        attendance_id: attRec?.id,
        latitude:      lat,
        longitude:     lng,
        location_name: locationName || null,
        photo_url:     photoUrl,
        check_type:    "clock_in",
        checked_at:    now.toISOString(),
        work_date:     workDate,
        note:          note || null,
        status:        "pending",
      })

    if (reqErr) console.error("offsite request insert error:", reqErr)

    return NextResponse.json({
      success:      true,
      offsite:      true,
      late_minutes: effectiveLate,
      is_late:      isLate,
      photo_url:    photoUrl,
      message:      "เช็คอินนอกสถานที่สำเร็จ รอการอนุมัติจาก HR",
    })
  }

  // ════════════════════════════════════════════════════════════════════
  // CLOCK OUT (off-site)
  // ════════════════════════════════════════════════════════════════════
  if (action === "clock_out") {
    const { data: rec } = await supa
      .from("attendance_records")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("work_date", workDate)
      .maybeSingle()

    if (!rec?.clock_in)  return NextResponse.json({ success: false, error: "ยังไม่ได้เช็คอิน" })
    if (rec.clock_out)   return NextResponse.json({ success: false, error: "เช็คเอ้าท์ไปแล้ว" })

    const clockIn  = new Date(rec.clock_in as string)
    const breakMin = shift?.break_minutes ?? 60
    const workMin  = calcWorkMinutes(clockIn, now, breakMin)

    const expectedEnd = shift
      ? new Date(`${workDate}T${shift.work_end}+07:00`)
      : null

    const expectedEndAdj = (shift?.is_overnight && expectedEnd)
      ? new Date(expectedEnd.getTime() + 86_400_000)
      : expectedEnd

    const earlyOutRaw = expectedEndAdj
      ? Math.floor((expectedEndAdj.getTime() - now.getTime()) / 60_000)
      : 0
    const earlyOutMin = Math.max(earlyOutRaw, 0)

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
        clock_out_distance_m: 0,
        clock_out_valid:      true,
        work_minutes:         workMin,
        // ไม่เขียน ot_minutes ตอน checkout — ป้องกันทับค่า OT ที่อนุมัติแล้ว
        early_out_minutes:    earlyOutMin,
        expected_end:         expectedEndAdj?.toISOString() ?? null,
        status:               newStatus,
        is_offsite_out:       true,
        offsite_out_status:   "pending",
      })
      .eq("id", rec.id as string)

    if (updErr) return NextResponse.json({ success: false, error: updErr.message })

    // Insert offsite request
    await supa
      .from("offsite_checkin_requests")
      .insert({
        employee_id:   emp.id,
        company_id:    emp.company_id,
        attendance_id: rec.id,
        latitude:      lat,
        longitude:     lng,
        location_name: locationName || null,
        photo_url:     photoUrl,
        check_type:    "clock_out",
        checked_at:    now.toISOString(),
        work_date:     workDate,
        note:          note || null,
        status:        "pending",
      })

    return NextResponse.json({
      success:           true,
      offsite:           true,
      work_minutes:      workMin,
      early_out_minutes: earlyOutMin,
      photo_url:         photoUrl,
      message:           "เช็คเอ้าท์นอกสถานที่สำเร็จ รอการอนุมัติจาก HR",
    })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}
