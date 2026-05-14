import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/attendance/history?employee_id=X&calendar_start=YYYY-MM-DD&calendar_end=YYYY-MM-DD&period_start=...&period_end=...&year=YYYY
//
// ใช้ service role เพื่อ bypass RLS + รวม 6 queries เป็น 1 endpoint
// เร็วกว่า client-side parallel queries มาก + แก้ปัญหา records ไม่ขึ้นที่บางเครื่อง

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url).searchParams
  const employee_id   = url.get("employee_id")
  const calendarStart = url.get("calendar_start")
  const calendarEnd   = url.get("calendar_end")
  const periodStart   = url.get("period_start")
  const periodEnd     = url.get("period_end")
  const year          = Number(url.get("year")) || new Date().getFullYear()
  const todayStr      = url.get("today") ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  if (!employee_id || !calendarStart || !calendarEnd || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const supa = createServiceClient()

  // ── ตรวจสิทธิ์: ต้องเป็น employee เอง, manager ของ employee นั้น, หรือ admin ──
  const { data: dbUser } = await supa
    .from("users").select("role, employee_id").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const isAdmin = ["super_admin", "hr_admin"].includes(dbUser.role)
  const isSelf  = dbUser.employee_id === employee_id

  if (!isAdmin && !isSelf) {
    // เช็คว่าเป็น manager ของ employee นี้ไหม
    const { data: mgr } = await supa.from("employee_manager_history")
      .select("id")
      .eq("manager_id", dbUser.employee_id)
      .eq("employee_id", employee_id)
      .is("effective_to", null)
      .maybeSingle()
    if (!mgr) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── ดึง company_id ของ employee เพื่อ query holidays ──
  const { data: emp } = await supa
    .from("employees").select("company_id").eq("id", employee_id).single()

  // ── 6 queries ขนานกัน ──
  const [attRes, periodRes, holRes, leaveRes, corrRes, yRecRes] = await Promise.all([
    supa.from("attendance_records").select("*")
      .eq("employee_id", employee_id)
      .gte("work_date", calendarStart).lte("work_date", calendarEnd)
      .order("work_date", { ascending: false }),

    supa.from("attendance_records").select("*")
      .eq("employee_id", employee_id)
      .gte("work_date", periodStart).lte("work_date", periodEnd)
      .order("work_date", { ascending: false }),

    emp?.company_id
      ? supa.from("company_holidays").select("date,name")
          .eq("company_id", emp.company_id).eq("is_active", true).eq("year", year)
      : Promise.resolve({ data: [] as any[] }),

    supa.from("leave_requests")
      .select("start_date, end_date, total_days, is_half_day, half_day_period, status, leave_type:leave_types(name, code)")
      .eq("employee_id", employee_id)
      .in("status", ["approved", "pending"])
      .lte("start_date", calendarEnd)
      .gte("end_date", calendarStart),

    supa.from("time_adjustment_requests")
      .select("work_date, status, requested_clock_in, requested_clock_out")
      .eq("employee_id", employee_id)
      .gte("work_date", calendarStart).lte("work_date", calendarEnd)
      .order("created_at", { ascending: false }),

    // record เมื่อวานเพื่อตรวจกะข้ามคืน / ลืมเช็คเอ้า
    (() => {
      const y = new Date(todayStr + "T00:00:00+07:00")
      y.setDate(y.getDate() - 1)
      const yStr = y.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      return supa.from("attendance_records").select("*")
        .eq("employee_id", employee_id).eq("work_date", yStr).maybeSingle()
    })(),
  ])

  const records       = attRes.data ?? []
  const periodRecords = periodRes.data ?? []
  const holidays      = (holRes as any).data ?? []
  const leaves        = leaveRes.data ?? []
  const corrections   = corrRes.data ?? []

  // หา record วันนี้จาก records ที่ดึงมาแล้ว ไม่ต้อง query ซ้ำ
  let todayRec: any = records.find((r: any) => r.work_date === todayStr) ?? null

  // ถ้าวันนี้ไม่มี clock_in → เช็คเมื่อวานอาจเป็นกะข้ามคืน
  let forgotCheckout: any = null
  if (!todayRec?.clock_in && yRecRes.data?.clock_in && !yRecRes.data.clock_out) {
    const bkkHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }))
    if (bkkHour < 5) {
      todayRec = yRecRes.data
    } else {
      forgotCheckout = yRecRes.data
    }
  }

  return NextResponse.json({
    records, periodRecords, holidays, leaves, corrections,
    todayRecord: todayRec, forgotCheckout,
  })
}
