import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcGeoDistance, calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"
import { notifyCheckin } from "@/lib/notif-checkin"

function todayBKK(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

// ════════════════════════════════════════════════════════════════════
// POST /api/checkin/with-photo
//   เช็คอิน/เอ้าท์ พร้อมรูปถ่าย — บังคับอยู่ใน "รัศมีสาขา" จริงเท่านั้น
//   ต่างจาก offsite:
//     • ต้องอยู่ใน radius (ตรวจ geo distance)
//     • บันทึก attendance status ปกติทันที (ไม่ต้องรอ approval)
//     • เก็บ photo_url + address ใน attendance_records
// ════════════════════════════════════════════════════════════════════
export async function POST(request: Request) {
  const formData = await request.formData()

  const action = formData.get("action") as "clock_in" | "clock_out"
  const rawLat = parseFloat(formData.get("lat") as string)
  const rawLng = parseFloat(formData.get("lng") as string)
  const photo  = formData.get("photo") as File | null
  const address = (formData.get("address") as string) || ""

  if (action !== "clock_in" && action !== "clock_out") {
    return NextResponse.json({ success: false, error: "Invalid action" })
  }
  if (!photo) return NextResponse.json({ success: false, error: "กรุณาถ่ายรูปเพื่อยืนยัน" })
  if (isNaN(rawLat) || isNaN(rawLng)) return NextResponse.json({ success: false, error: "ตำแหน่ง GPS ไม่ถูกต้อง" })

  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // Employee
  const { data: userData } = await supa.from("users")
    .select("employee_id, employee:employees(*, company:companies(code), department:departments(name))")
    .eq("id", user.id).single()
  if (!userData?.employee_id) return NextResponse.json({ success: false, error: "Employee not found" })
  const emp = userData.employee as any
  const companyCode = emp.company?.code as string | undefined
  const deptName = emp.department?.name as string | undefined

  // ── Branch radius check ──
  // ใช้ตาราง employee_allowed_locations (ตรงกับ client) — รองรับทั้งสาขาจริงและพิกัดกำหนดเอง
  const { data: locRows } = await supa.from("employee_allowed_locations")
    .select("branch_id, custom_name, custom_lat, custom_lng, custom_radius_m, branch:branches(id, name, latitude, longitude, geo_radius_m)")
    .eq("employee_id", emp.id)

  type Loc = { id: string; name: string; lat: number; lng: number; radius: number }
  const locations: Loc[] = []
  for (const r of (locRows ?? []) as any[]) {
    if (r.branch_id && r.branch?.latitude && r.branch?.longitude) {
      locations.push({
        id: r.branch.id, name: r.branch.name,
        lat: Number(r.branch.latitude), lng: Number(r.branch.longitude),
        radius: Number(r.branch.geo_radius_m) || 200,
      })
    } else if (!r.branch_id && r.custom_lat && r.custom_lng) {
      locations.push({
        id: `custom_${r.custom_lat}_${r.custom_lng}`,
        name: r.custom_name || "จุดเช็คอิน",
        lat: Number(r.custom_lat), lng: Number(r.custom_lng),
        radius: Number(r.custom_radius_m) || 200,
      })
    }
  }

  // checkin_anywhere → ข้ามการตรวจรัศมี (allow ทุกที่)
  const checkinAnywhere = !!emp.checkin_anywhere

  let inRadiusBranch: Loc | null = null
  let minDistance = Infinity
  for (const loc of locations) {
    const d = calcGeoDistance(rawLat, rawLng, loc.lat, loc.lng)
    if (d < minDistance) { minDistance = d; inRadiusBranch = loc }
  }

  if (!checkinAnywhere) {
    if (locations.length === 0) {
      return NextResponse.json({
        success: false,
        error: "ยังไม่ได้รับสิทธิ์เช็คอินสาขา — กรุณาติดต่อ HR",
      })
    }
    if (!inRadiusBranch || minDistance > inRadiusBranch.radius) {
      return NextResponse.json({
        success: false,
        error: `อยู่นอกรัศมีสาขา (ห่าง ${Math.round(minDistance)} m · รัศมี ${inRadiusBranch?.radius ?? 200} m) — ใช้ปุ่ม "เช็คอินนอกสถานที่" แทน`,
      })
    }
  } else if (!inRadiusBranch) {
    // checkin_anywhere = true แต่ไม่มี location เลย → สร้าง placeholder
    inRadiusBranch = { id: "anywhere", name: "Anywhere", lat: rawLat, lng: rawLng, radius: 0 }
    minDistance = 0
  }

  // ── ดึง shift ปัจจุบัน ──
  const now = new Date()
  const today = todayBKK()
  const [monthlyRes, schedRes] = await Promise.all([
    supa.from("monthly_shift_assignments")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id).eq("work_date", today).maybeSingle(),
    supa.from("work_schedules")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", emp.id).lte("effective_from", today)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
  ])

  let shift: any = null
  if (monthlyRes.data) {
    shift = (monthlyRes.data as any).shift ?? null
  } else {
    shift = ((schedRes.data as any)?.shift) ?? null
  }

  const workDate = today
  const lateThreshold = getLateThreshold(deptName, companyCode)

  // ── Upload photo to Storage ──
  const fileExt = photo.name?.split(".").pop() || "jpg"
  const fileName = `with-photo/${emp.id}/${workDate}_${action}_${Date.now()}.${fileExt}`
  const arrayBuffer = await photo.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { error: uploadErr } = await supa.storage
    .from("checkin-photos")
    .upload(fileName, buffer, { contentType: photo.type || "image/jpeg", upsert: false })
  if (uploadErr) return NextResponse.json({ success: false, error: "อัพโหลดรูปไม่สำเร็จ: " + uploadErr.message })
  const photoUrl = supa.storage.from("checkin-photos").getPublicUrl(fileName).data.publicUrl

  // ─────────────────────────────────────────────────────────────────
  // CLOCK IN
  // ─────────────────────────────────────────────────────────────────
  if (action === "clock_in") {
    const { data: existing } = await supa.from("attendance_records")
      .select("id, clock_in").eq("employee_id", emp.id).eq("work_date", workDate).maybeSingle()
    if (existing?.clock_in) return NextResponse.json({ success: false, error: "เช็คอินไปแล้ว" })

    const expectedStart = shift ? new Date(`${workDate}T${shift.work_start}+07:00`) : null
    const rawLateMin = expectedStart ? calcLateMinutes(now, expectedStart) : 0
    const effectiveLate = Math.max(rawLateMin - lateThreshold, 0)
    const isLate = effectiveLate > 0

    // FK guard: branch_id ต้องเป็น UUID จริง (ไม่ใช่ custom_/anywhere)
    const realBranchId = inRadiusBranch && !inRadiusBranch.id.startsWith("custom_") && inRadiusBranch.id !== "anywhere"
      ? inRadiusBranch.id : null

    const { error } = await supa.from("attendance_records").upsert({
      employee_id: emp.id,
      company_id: emp.company_id,
      work_date: workDate,
      clock_in: now.toISOString(),
      clock_in_lat: rawLat,
      clock_in_lng: rawLng,
      clock_in_distance_m: Math.round(minDistance),
      clock_in_branch_id: realBranchId,
      clock_in_valid: true,
      clock_in_photo_url: photoUrl,
      clock_in_address: address || null,
      clock_in_with_photo: true,
      expected_start: expectedStart?.toISOString() ?? null,
      late_minutes: effectiveLate,
      early_out_minutes: 0,
      status: isLate ? "late" : "present",
      shift_template_id: shift?.id ?? null,
    }, { onConflict: "employee_id,work_date" })

    if (error) return NextResponse.json({ success: false, error: error.message })

    notifyCheckin(emp.id, "clock_in", {
      timeISO: now.toISOString(), lateMinutes: effectiveLate, isLate,
      shiftStart: (shift as any)?.work_start ?? null, locationName: inRadiusBranch.name,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      photo_url: photoUrl,
      branch: inRadiusBranch.name,
      distance_m: Math.round(minDistance),
      late_minutes: effectiveLate,
      is_late: isLate,
      message: isLate ? `เช็คอินแล้ว (สาย ${effectiveLate} นาที)` : "เช็คอินสำเร็จ",
    })
  }

  // ─────────────────────────────────────────────────────────────────
  // CLOCK OUT
  // ─────────────────────────────────────────────────────────────────
  const { data: existing } = await supa.from("attendance_records")
    .select("id, clock_in, clock_out").eq("employee_id", emp.id).eq("work_date", workDate).maybeSingle()
  if (!existing?.clock_in) return NextResponse.json({ success: false, error: "ยังไม่ได้เช็คอิน" })
  if (existing.clock_out) return NextResponse.json({ success: false, error: "เช็คเอ้าท์ไปแล้ว" })

  const expectedEnd = shift ? new Date(`${workDate}T${shift.work_end}+07:00`) : null
  const workMin = calcWorkMinutes(new Date(existing.clock_in), now)
  const earlyOutMin = expectedEnd ? Math.max(0, Math.floor((expectedEnd.getTime() - now.getTime()) / 60000)) : 0

  const realBranchId = inRadiusBranch && !inRadiusBranch.id.startsWith("custom_") && inRadiusBranch.id !== "anywhere"
    ? inRadiusBranch.id : null

  const { error } = await supa.from("attendance_records").update({
    clock_out: now.toISOString(),
    clock_out_lat: rawLat,
    clock_out_lng: rawLng,
    clock_out_distance_m: Math.round(minDistance),
    clock_out_branch_id: realBranchId,
    clock_out_valid: true,
    clock_out_photo_url: photoUrl,
    clock_out_address: address || null,
    clock_out_with_photo: true,
    work_minutes: workMin,
    early_out_minutes: earlyOutMin,
    expected_end: expectedEnd?.toISOString() ?? null,
  }).eq("id", existing.id)

  if (error) return NextResponse.json({ success: false, error: error.message })

  notifyCheckin(emp.id, "clock_out", {
    timeISO: now.toISOString(), workMinutes: workMin, earlyOutMinutes: earlyOutMin, locationName: inRadiusBranch.name,
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    photo_url: photoUrl,
    branch: inRadiusBranch.name,
    work_minutes: workMin,
    early_out_minutes: earlyOutMin,
    message: earlyOutMin > 0 ? `เช็คเอ้าท์แล้ว (ออกก่อน ${earlyOutMin} นาที)` : "เช็คเอ้าท์สำเร็จ",
  })
}
