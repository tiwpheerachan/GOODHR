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
    .select("employee_id, employee:employees(*, branch:branches(*), department:departments(name), company:companies(code))")
    .eq("id", user.id)
    .single()

  if (!userData?.employee_id) {
    return NextResponse.json({ success: false, error: "Employee not found" })
  }

  const emp      = userData.employee as any
  const deptName = emp.department?.name as string | undefined
  const companyCode = emp.company?.code as string | undefined
  const now      = new Date()
  const today    = todayBKK()   // ✅ ใช้เวลาไทย ไม่ใช่ server timezone

  // ── ดึงข้อมูลพร้อมกัน: สาขา + shift + existing record ──────────
  // ✅ Parallel queries: ลดเวลาจาก ~600ms → ~200ms (3 queries พร้อมกัน)
  const [locRes, shiftRes, schedRes] = await Promise.all([
    supa.from("employee_allowed_locations")
      .select(
        "branch_id, custom_name, custom_lat, custom_lng, custom_radius_m, " +
        "branch:branches(id, name, latitude, longitude, geo_radius_m)"
      )
      .eq("employee_id", emp.id),
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

  const allowedRows = locRes.data
  const monthlyAssignment = shiftRes.data

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

  // ── checkin_anywhere: ข้ามตรวจพิกัดทั้งหมด ──────────────────
  const isAnywhereAllowed = !!emp.checkin_anywhere

  if (!isAnywhereAllowed && branches.length === 0) {
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

  // ถ้า checkin_anywhere → ข้ามตรวจรัศมี (ยังบันทึกสาขาที่ใกล้ที่สุดไว้ reference)
  if (!isAnywhereAllowed) {
    const nearestName = nearest?.name ?? "สาขา"
    if (!nearest || minDist > nearest.geo_radius_m) {
      return NextResponse.json({
        success: false,
        error: `อยู่นอกรัศมีที่กำหนด (${Math.round(minDist)} ม. จาก ${nearestName})`,
      })
    }
  }

  // ── Bangkok hour (ใช้หลายจุด) ────────────────────────────────
  const bkkHour = parseInt(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }))

  // ── Shift template ─────────────────────────────────────────────
  let shift: any = null
  let schedule: any = null
  let useNextDayShift = false

  if (monthlyAssignment?.shift) {
    shift = monthlyAssignment.shift
    if (monthlyAssignment.assignment_type === "dayoff") {
      console.log(`[checkin] employee ${emp.id} checking in on dayoff (${today})`)
    }
  } else if (monthlyAssignment?.shift_id) {
    // FK join ไม่ work → ดึง shift แยก
    const { data: shiftData } = await supa.from("shift_templates").select("*").eq("id", monthlyAssignment.shift_id).single()
    if (shiftData) shift = shiftData
    console.log(`[checkin] FK join failed, fetched shift separately: ${shiftData?.work_start}`)
  } else {
    schedule = schedRes.data
    shift = (schedule as any)?.shift ?? null
  }

  // ── กะข้ามเที่ยงคืน: ถ้าเช็คอินหลัง 22:00 และกะพรุ่งนี้เริ่ม 00:00-02:00
  //    ให้ใช้กะพรุ่งนี้แทน (เช่น เช็คอิน 23:30 สำหรับกะ 00:00-09:00)
  if (action === "clock_in" && bkkHour >= 22) {
    const tomorrow = new Date(now.getTime() + 86_400_000)
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
    const { data: tomorrowShift } = await supa.from("monthly_shift_assignments")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id)
      .eq("work_date", tomorrow)
      .maybeSingle()

    if (tomorrowShift?.shift) {
      const startHour = parseInt(tomorrowShift.shift.work_start?.substring(0, 2) ?? "99")
      // ถ้ากะพรุ่งนี้เริ่ม 00:00-02:00 → ใช้กะพรุ่งนี้
      if (startHour <= 2 && tomorrowShift.assignment_type === "work") {
        shift = tomorrowShift.shift
        useNextDayShift = true
        console.log(`[checkin] using tomorrow's shift ${tomorrow} (${shift.work_start}) for late-night checkin`)
      }
    }
  }

  // ── สำหรับ clock_out ข้ามคืน: ถ้าเวลาปัจจุบัน < 05:00 (เช้ามืด)
  //    ให้ลองดูว่ามี attendance record ของเมื่อวานที่ยังไม่ได้ clock_out อยู่ไหม
  //    ถ้ามี → ถือว่าเป็น clock_out ของกะข้ามคืน
  //    ⚠️ ตัดรอบที่ตี 5: หลังตี 5 ถือว่าเป็นวันใหม่ record เมื่อวานที่ค้าง = ลืมเช็คเอ้า
  let useYesterday = false
  let yesterdayDate: string | null = null

  if (action === "clock_out" && bkkHour < 5) {
    // คำนวณ "เมื่อวาน" ใน timezone ไทยอย่างปลอดภัย (ไม่ผ่าน toLocaleString → new Date → toISOString)
    yesterdayDate = new Date(now.getTime() - 86_400_000)
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

    // ดึง shift ของเมื่อวาน + attendance record ที่ยังไม่ clock_out
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

    // ถ้ามี clock_in เมื่อวานที่ยังไม่ clock_out → นี่คือ clock_out ของกะข้ามคืน
    // ไม่ต้องตรวจ is_overnight — การมี record ค้างอยู่คือหลักฐานเพียงพอ
    if (yRecRes.data?.clock_in && !yRecRes.data.clock_out) {
      useYesterday = true
      let yShift = yShiftRes.data?.shift ?? null

      // Fallback: work_schedules (กรณีไม่มี monthly assignment)
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

      // Fallback: ดึง shift จาก shift_template_id ที่บันทึกใน attendance record เอง
      if (!yShift && yRecRes.data.shift_template_id) {
        const { data: tplData } = await supa
          .from("shift_templates")
          .select("*")
          .eq("id", yRecRes.data.shift_template_id)
          .maybeSingle()
        yShift = tplData ?? null
      }

      shift = yShift
    }
  }

  // work_date: overnight shift ให้นับวันก่อนหน้า
  // ถ้า clock_out ข้ามคืน (useYesterday) → ใช้ yesterdayDate โดยตรง
  // ถ้า useNextDayShift → ใช้วันพรุ่งนี้ (เช็คอิน 23:30 สำหรับกะ 00:00 พรุ่งนี้)
  // ⚠️ หลังตี 5: ไม่ใช้ calcWorkDate สำหรับกะข้ามคืน เพราะถือว่าเป็นวันใหม่แล้ว
  const workDate = useYesterday
    ? yesterdayDate!
    : useNextDayShift
      ? new Date(now.getTime() + 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      : (shift?.is_overnight && bkkHour < 5)
        ? calcWorkDate(now, true, "Asia/Bangkok")
        : today

  // grace period ตามบริษัท+แผนก (หรือจาก work_schedule ถ้ามี override)
  const lateThreshold: number =
    (schedule as any)?.late_threshold_minutes ??
    getLateThreshold(deptName, companyCode)

  // ════════════════════════════════════════════════════════════════
  // CLOCK IN
  // ════════════════════════════════════════════════════════════════
  if (action === "clock_in") {
    // ── หลังตี 5: auto-close record เมื่อวานที่ค้าง (ลืมเช็คเอ้า) ──────
    // เพื่อไม่ให้ record เก่าบล็อคการเช็คอินวันใหม่
    if (bkkHour >= 5) {
      const yDate = new Date(now.getTime() - 86_400_000)
        .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      const { data: stuckRec } = await supa
        .from("attendance_records")
        .select("id, clock_in, shift_template_id")
        .eq("employee_id", emp.id)
        .eq("work_date", yDate)
        .is("clock_out", null)
        .not("clock_in", "is", null)
        .maybeSingle()

      if (stuckRec) {
        // ประมาณเวลาออก: ใช้เวลาเริ่มกะ + ชั่วโมงทำงาน หรือ clock_in + 9 ชม.
        const clockInTime = new Date(stuckRec.clock_in as string)
        let estimatedOut = new Date(clockInTime.getTime() + 9 * 3_600_000)

        if (stuckRec.shift_template_id) {
          const { data: stuckShift } = await supa
            .from("shift_templates").select("work_end, is_overnight")
            .eq("id", stuckRec.shift_template_id).maybeSingle()
          if (stuckShift?.work_end) {
            const base = new Date(`${yDate}T${stuckShift.work_end}+07:00`)
            estimatedOut = stuckShift.is_overnight ? new Date(base.getTime() + 86_400_000) : base
          }
        }

        const stuckWorkMin = Math.max(0, Math.round(
          (estimatedOut.getTime() - clockInTime.getTime()) / 60_000) - 60)

        await supa.from("attendance_records").update({
          clock_out:         estimatedOut.toISOString(),
          clock_out_valid:   false,
          work_minutes:      stuckWorkMin,
          early_out_minutes: 0,
          note:              "ลืมเช็คเอ้า — ระบบปิดอัตโนมัติเมื่อเช็คอินวันถัดไป",
        }).eq("id", stuckRec.id as string)

        // สร้าง time_adjustment_request อัตโนมัติ (ถ้ายังไม่มี pending)
        const { data: existingAdj } = await supa
          .from("time_adjustment_requests")
          .select("id").eq("employee_id", emp.id)
          .eq("work_date", yDate).eq("status", "pending").maybeSingle()

        if (!existingAdj) {
          await supa.from("time_adjustment_requests").insert({
            employee_id:         emp.id,
            company_id:          emp.company_id,
            work_date:           yDate,
            request_type:        "time_adjustment",
            requested_clock_in:  stuckRec.clock_in,
            requested_clock_out: null,
            reason:              "ลืมเช็คเอ้า (ระบบสร้างอัตโนมัติ กรุณาระบุเวลาออกจริง)",
            status:              "pending",
          })
        }
        console.log(`[checkin] auto-closed stuck record for ${emp.id} on ${yDate}`)
      }
    }

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

    // ── ถ้า exempt → ไม่บันทึกมาสายเลย ────────────────────────
    const isExempt = !!emp.is_attendance_exempt

    // ── เช็คลาครึ่งวัน (approved) วันนี้ ────────────────────────
    const { data: halfLeaveData } = await supa
      .from("leave_requests")
      .select("is_half_day, half_day_period")
      .eq("employee_id", emp.id)
      .eq("status", "approved")
      .eq("is_half_day", true)
      .lte("start_date", workDate)
      .gte("end_date", workDate)
      .limit(1)
      .maybeSingle()

    const halfDayLeave: string | null = halfLeaveData?.half_day_period || null
    // ถ้าลาเช้า → เลื่อน expected_start ไปกลางกะ
    // ถ้าลาบ่าย → expected_start ไม่เปลี่ยน (เช็คอินตอนเช้าปกติ)

    // คำนวณ expected_start (ปกติ vs ลาเช้า)
    let expectedStart = shift
      ? new Date(`${workDate}T${shift.work_start}+07:00`)
      : null

    if (halfDayLeave === "morning" && shift && expectedStart) {
      // ลาเช้า: เลื่อน expected_start ไปกลางกะ
      const shiftStart = new Date(`${workDate}T${shift.work_start}+07:00`)
      let shiftEnd   = new Date(`${workDate}T${shift.work_end}+07:00`)
      if (shift.is_overnight) shiftEnd = new Date(shiftEnd.getTime() + 86_400_000)
      const midMs = shiftStart.getTime() + (shiftEnd.getTime() - shiftStart.getTime()) / 2
      expectedStart = new Date(midMs)
    }

    // rawLateMin = นาทีที่มาช้ากว่าเวลาเริ่มงาน (0 ถ้ามาก่อน/ตรงเวลา)
    const rawLateMin     = expectedStart ? calcLateMinutes(now, expectedStart) : 0
    // effectiveLate = exempt/ลาเช้า(ไม่สาย) → 0 / ปกติ → หัก grace period
    const effectiveLate  = isExempt ? 0 : Math.max(rawLateMin - lateThreshold, 0)
    // isLate = exempt → false เสมอ
    const isLate         = isExempt ? false : effectiveLate > 0

    const { error: insErr } = await supa
      .from("attendance_records")
      .upsert({
        employee_id:         emp.id,
        company_id:          emp.company_id,
        work_date:           workDate,
        clock_in:            now.toISOString(),
        clock_in_lat:        lat,
        clock_in_lng:        lng,
        clock_in_branch_id:  nearest?.id ?? null,
        clock_in_distance_m: nearest ? Math.round(minDist) : null,
        clock_in_valid:      true,
        expected_start:      expectedStart?.toISOString() ?? null,
        late_minutes:        effectiveLate,    // ✅ หักจริง (หลัง grace period + ลาครึ่งวัน)
        early_out_minutes:   0,
        status:              isLate ? "late" : "present",
        shift_template_id:   shift?.id ?? null,
        half_day_leave:      halfDayLeave,     // ✅ บันทึกว่าลาครึ่งวันอะไร
      }, { onConflict: "employee_id,work_date" })

    if (insErr) return NextResponse.json({ success: false, error: insErr.message })

    return NextResponse.json({
      success:           true,
      late_minutes:      effectiveLate,
      is_late:           isLate,
      raw_late_minutes:  rawLateMin,
      threshold_minutes: lateThreshold,
      location_name:     isAnywhereAllowed ? (nearest?.name ?? "Anywhere") : (nearest?.name ?? "สาขา"),
      checkin_anywhere:  isAnywhereAllowed,
      half_day_leave:    halfDayLeave,
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

    // ── เช็คลาครึ่งวัน (ดึงจาก record ที่บันทึกตอน clock_in หรือ query ใหม่) ──
    let halfDayLeaveOut: string | null = (rec as any).half_day_leave || null
    if (!halfDayLeaveOut) {
      const { data: halfLeaveOut } = await supa
        .from("leave_requests")
        .select("is_half_day, half_day_period")
        .eq("employee_id", emp.id)
        .eq("status", "approved")
        .eq("is_half_day", true)
        .lte("start_date", workDate)
        .gte("end_date", workDate)
        .limit(1)
        .maybeSingle()
      halfDayLeaveOut = halfLeaveOut?.half_day_period || null
    }

    // expected_end คือเวลาเลิกงาน (overnight ต้องบวก 1 วัน)
    let expectedEnd = shift
      ? new Date(`${workDate}T${shift.work_end}+07:00`)
      : null

    let expectedEndAdj = (shift?.is_overnight && expectedEnd)
      ? new Date(expectedEnd.getTime() + 86_400_000)
      : expectedEnd

    // ── ลาบ่าย: เลื่อน expected_end ไปกลางกะ ──
    if (halfDayLeaveOut === "afternoon" && shift && expectedEndAdj) {
      const shiftStart = new Date(`${workDate}T${shift.work_start}+07:00`)
      let shiftEnd   = new Date(`${workDate}T${shift.work_end}+07:00`)
      if (shift.is_overnight) shiftEnd = new Date(shiftEnd.getTime() + 86_400_000)
      const midMs = shiftStart.getTime() + (shiftEnd.getTime() - shiftStart.getTime()) / 2
      expectedEndAdj = new Date(midMs)
    }

    // earlyOutMin > 0 = ออกก่อนเวลาเลิกงาน → หักเงินตามนาที
    const earlyOutRaw = expectedEndAdj
      ? Math.floor((expectedEndAdj.getTime() - now.getTime()) / 60_000)
      : 0
    // exempt → ไม่นับ early_out
    const isExemptOut = !!emp.is_attendance_exempt
    const earlyOutMin = isExemptOut ? 0 : Math.max(earlyOutRaw, 0)

    // ✅ ไม่แตะ ot_minutes ตอน checkout — ค่านี้ถูกเขียนโดย OT approval เท่านั้น

    // status: exempt → present เสมอ / ปกติ → ถ้าเคย late ให้คง late ไว้
    const newStatus = isExemptOut
      ? "present"
      : rec.status === "late" ? "late"
      : earlyOutMin > 0       ? "early_out"
      :                         "present"

    const { error: updErr } = await supa
      .from("attendance_records")
      .update({
        clock_out:            now.toISOString(),
        clock_out_lat:        lat,
        clock_out_lng:        lng,
        clock_out_branch_id:  nearest?.id ?? null,
        clock_out_distance_m: nearest ? Math.round(minDist) : null,
        clock_out_valid:      true,
        work_minutes:         workMin,
        // ไม่เขียน ot_minutes ตอน checkout — ป้องกันทับค่า OT ที่อนุมัติแล้ว
        early_out_minutes:    earlyOutMin,   // ✅ บันทึกนาทีออกก่อน (หลังเทียบลาครึ่งวัน)
        expected_end:         expectedEndAdj?.toISOString() ?? null,
        status:               newStatus,
        half_day_leave:       halfDayLeaveOut,  // ✅ บันทึกลาครึ่งวัน
      })
      .eq("id", rec.id as string)

    if (updErr) return NextResponse.json({ success: false, error: updErr.message })

    return NextResponse.json({
      success:           true,
      work_minutes:      workMin,
      ot_minutes:        rec.ot_minutes || 0,
      early_out_minutes: earlyOutMin,
      is_early_out:      earlyOutMin > 0,
      half_day_leave:    halfDayLeaveOut,
    })
  }

  return NextResponse.json({ success: false, error: "Invalid action" })
}