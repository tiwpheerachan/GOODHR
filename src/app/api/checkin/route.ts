import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calcGeoDistance, calcWorkDate, calcLateMinutes, calcWorkMinutes } from "@/lib/utils/attendance"


const HQ_BRANCH = {
  id: null as null,
  name: 'สำนักงานใหญ่ (Charoen Nakhon)',
  latitude: 13.726304006803693,
  longitude: 100.50832360980517,
  geo_radius_m: 100,
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action, lat, lng } = body

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ success: false, error: 'ข้อมูลพิกัดไม่ถูกต้อง' })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success:false, error:"Unauthorized" }, { status:401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users").select("employee_id, employee:employees(*, branch:branches(*))").eq("id",user.id).single()
  if (!userData?.employee_id) return NextResponse.json({ success:false, error:"Employee not found" })

  const emp = userData.employee as any
  const now = new Date()
  const today = format(now, "yyyy-MM-dd")

  // ตรวจสอบ GPS กับสาขาที่อนุญาต
  const { data: dbBranches } = await supa.from("branches").select("*").eq("company_id",emp.company_id).eq("is_active",true)
  const list = dbBranches ?? []
  const hasHQ = list.some((b: any) => b.latitude && Math.abs(b.latitude - HQ_BRANCH.latitude) < 0.0001)
  const allBranches: any[] = hasHQ ? list : [HQ_BRANCH, ...list]
  let nearest: any = null, minDist = Infinity
  for (const b of allBranches) {
    if (b.latitude && b.longitude) {
      const d = calcGeoDistance(lat, lng, b.latitude, b.longitude)
      if (d < minDist) { minDist = d; nearest = b }
    }
  }
  const inRadius = nearest && minDist <= (nearest.geo_radius_m || 100)
  const branchId: string | null = nearest?.id ?? null

  if (!inRadius) return NextResponse.json({ success:false, error: `อยู่นอกรัศมีที่กำหนด (ห่าง ${Math.round(minDist)}ม.)` })

  // หา shift
  const { data: schedule } = await supa.from("work_schedules").select("*, shift:shift_templates(*)")
    .eq("employee_id",emp.id).lte("effective_from",today).order("effective_from",{ascending:false}).limit(1).maybeSingle()
  const shift = (schedule as any)?.shift
  const workDate = shift?.is_overnight ? calcWorkDate(now, true, emp.branch?.timezone || "Asia/Bangkok") : today

  if (action === "clock_in") {
    const { data: existing } = await supa.from("attendance_records").select("id,clock_in").eq("employee_id",emp.id).eq("work_date",workDate).maybeSingle()
    if (existing?.clock_in) return NextResponse.json({ success:false, error:"เช็คอินไปแล้ว" })

    const expectedStart = shift ? new Date(workDate + "T" + shift.work_start + "+07:00") : null
    const lateMin = expectedStart ? calcLateMinutes(now, expectedStart) : 0

    const { error } = await supa.from("attendance_records").upsert({
      employee_id:emp.id, company_id:emp.company_id, work_date:workDate,
      clock_in:now.toISOString(), clock_in_lat:lat, clock_in_lng:lng,
      clock_in_branch_id:branchId, clock_in_distance_m:Math.round(minDist), clock_in_valid:true,
      expected_start:expectedStart?.toISOString(), late_minutes:lateMin,
      status:lateMin > (schedule?.late_threshold_min || 5) ? "late" : "present",
      shift_template_id:shift?.id,
    }, { onConflict:"employee_id,work_date" })

    if (error) return NextResponse.json({ success:false, error:error.message })
    return NextResponse.json({ success:true, late_minutes:lateMin })
  }

  if (action === "clock_out") {
    const { data: rec } = await supa.from("attendance_records").select("*").eq("employee_id",emp.id).eq("work_date",workDate).maybeSingle()
    if (!rec?.clock_in) return NextResponse.json({ success:false, error:"ยังไม่ได้เช็คอิน" })
    if (rec.clock_out) return NextResponse.json({ success:false, error:"เช็คเอ้าท์ไปแล้ว" })

    const clockIn = new Date(rec.clock_in)
    const workMin = calcWorkMinutes(clockIn, now, shift?.break_minutes || 60)
    const otThreshold = (shift?.ot_start_after_minutes || 30)
    const expectedEnd = shift ? new Date(workDate + "T" + shift.work_end + "+07:00") : null
    const expectedEndAdj = shift?.is_overnight ? new Date(expectedEnd!.getTime() + 86400000) : expectedEnd
    const overwork = expectedEndAdj ? Math.floor((now.getTime() - expectedEndAdj.getTime()) / 60000) : 0
    const otMin = overwork > otThreshold ? overwork : 0

    await supa.from("attendance_records").update({ clock_out:now.toISOString(), clock_out_lat:lat, clock_out_lng:lng, clock_out_branch_id:branchId, clock_out_distance_m:Math.round(minDist), clock_out_valid:true, work_minutes:workMin, ot_minutes:otMin, expected_end:expectedEndAdj?.toISOString() }).eq("id",rec.id)
    return NextResponse.json({ success:true, work_minutes:workMin, ot_minutes:otMin })
  }

  return NextResponse.json({ success:false, error:"Invalid action" })
}

function format(d: Date, fmt: string) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0")
  return fmt.replace("yyyy",String(y)).replace("MM",m).replace("dd",day)
}