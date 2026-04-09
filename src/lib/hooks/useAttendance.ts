import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfMonth, endOfMonth } from "date-fns"

// งวดเงินเดือน: 22 เดือนก่อน → 21 เดือนนี้
export function getPayrollPeriod(month: Date): { start: string; end: string } {
  const yr  = month.getFullYear()
  const mon = month.getMonth() // 0-based

  // start = 22 ของเดือนก่อน
  const startD = new Date(yr, mon - 1, 22)
  // end   = 21 ของเดือนนี้
  const endD   = new Date(yr, mon, 21)

  return {
    start: format(startD, "yyyy-MM-dd"),
    end:   format(endD,   "yyyy-MM-dd"),
  }
}

export function useAttendance(employeeId?: string, month = new Date()) {
  const supabase  = createClient()
  const [records,      setRecords]      = useState<any[]>([])
  const [periodRecords,setPeriodRecords] = useState<any[]>([])  // records เฉพาะในงวดเงินเดือน
  const [holidays,     setHolidays]     = useState<any[]>([])
  const [leaveMap,     setLeaveMap]     = useState<Record<string, { type: string; status: string }>>({})
  const [today,        setToday]        = useState<any>(null)
  const [forgotCheckout, setForgotCheckout] = useState<any>(null) // record เมื่อวานที่ลืมเช็คเอ้า
  const [loading,      setLoading]      = useState(true)

  // calendar month (สำหรับแสดง calendar)
  const startDate = format(startOfMonth(month), "yyyy-MM-dd")
  const endDate   = format(endOfMonth(month),   "yyyy-MM-dd")

  // payroll period (สำหรับ stats หักเงิน)
  const period    = getPayrollPeriod(month)

  const todayStr  = format(new Date(), "yyyy-MM-dd")
  const year      = month.getFullYear()

  const run = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)

    const { data: emp } = await supabase
      .from("employees").select("company_id").eq("id", employeeId).single()

    // ดึง attendance สำหรับ calendar (ทั้งเดือน)
    // และดึง attendance สำหรับงวดเงินเดือน (22-21) แยกกัน
    const [attRes, periodRes, todayRes, holRes, leaveRes] = await Promise.all([
      supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId)
        .gte("work_date", startDate).lte("work_date", endDate)
        .order("work_date", { ascending: false }),

      supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId)
        .gte("work_date", period.start).lte("work_date", period.end)
        .order("work_date", { ascending: false }),

      supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId).eq("work_date", todayStr).maybeSingle(),

      emp?.company_id
        ? supabase.from("company_holidays").select("date,name")
            .eq("company_id", emp.company_id).eq("is_active", true).eq("year", year)
        : Promise.resolve({ data: [] }),

      // ดึง leave_requests ที่ approved เพื่อแสดงสถานะ "ลา" แทน "ขาดงาน"
      supabase.from("leave_requests")
        .select("start_date, end_date, total_days, is_half_day, half_day_period, status, leave_type:leave_types(name, code)")
        .eq("employee_id", employeeId)
        .in("status", ["approved", "pending"])
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ])

    // สร้าง leaveMap: { "2026-03-27": { type: "ลาพักร้อน", status: "approved" } }
    const lm: Record<string, { type: string; status: string; isHalf?: boolean; halfPeriod?: string }> = {}
    for (const l of (leaveRes.data ?? []) as any[]) {
      const typeName = l.leave_type?.name || "ลา"
      let cur = l.start_date
      const end = l.end_date
      while (cur <= end) {
        lm[cur] = { type: typeName, status: l.status, isHalf: l.is_half_day, halfPeriod: l.half_day_period }
        // Increment date
        const d = new Date(cur + "T00:00:00")
        d.setDate(d.getDate() + 1)
        cur = format(d, "yyyy-MM-dd")
      }
    }

    setRecords(attRes.data ?? [])
    setPeriodRecords(periodRes.data ?? [])

    // ── กะข้ามคืน: ถ้าวันนี้ไม่มี record หรือยังไม่ clock_in
    //    ให้เช็คว่าเมื่อวานมี record ที่ยังไม่ clock_out อยู่หรือไม่
    //    ⚠️ ตัดรอบที่ตี 5: ก่อนตี 5 = อาจเป็นกะข้ามคืน ให้แสดงปุ่ม clock_out
    //                      หลังตี 5 = ถือว่าลืมเช็คเอ้า ให้เริ่มวันใหม่
    let todayData = todayRes.data
    const bkkHourNow = parseInt(new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }))
    let forgotYesterday: any = null

    if (!todayData || !todayData.clock_in) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = format(yesterday, "yyyy-MM-dd")
      const { data: yRec } = await supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId).eq("work_date", yesterdayStr).maybeSingle()

      if (yRec?.clock_in && !yRec.clock_out) {
        if (bkkHourNow < 5) {
          // ก่อนตี 5: อาจเป็นกะข้ามคืน → แสดงปุ่ม clock_out
          todayData = yRec
        } else {
          // หลังตี 5: ลืมเช็คเอ้า → เริ่มวันใหม่ + แจ้งเตือน
          forgotYesterday = yRec
        }
      }
    }

    setToday(todayData)
    setForgotCheckout(forgotYesterday)
    setHolidays((holRes as any).data ?? [])
    setLeaveMap(lm)
    setLoading(false)
  }, [employeeId, startDate, endDate, period.start, period.end])

  useEffect(() => { run() }, [run])

  const refetch = () => run()

  const holidayMap: Record<string, string> = Object.fromEntries(
    holidays.map(h => [h.date, h.name])
  )

  return {
    records,          // ทั้งเดือน — ใช้แสดง calendar + list
    periodRecords,    // เฉพาะงวดเงินเดือน — ใช้คำนวณ stats หักเงิน
    period,           // { start, end } ของงวดเงินเดือน
    holidays,
    holidayMap,
    leaveMap,         // วันลาที่ approved/pending — ใช้แสดง "ลา" แทน "ขาดงาน"
    today,
    todayRecord: today,
    forgotCheckout,   // record เมื่อวานที่ลืมเช็คเอ้า (หลังตี 5) — ใช้แสดงเตือนใน UI
    loading,
    refetch,
  }
}

// ── useCheckin ──────────────────────────────────────────────────────────
export function useCheckin() {
  const [loading, setLoading] = useState(false)

  const clockIn = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const res  = await fetch("/api/checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "clock_in", lat, lng }),
      })
      const data = await res.json()
      return data as { success: boolean; error?: string; late_minutes?: number; is_late?: boolean; location_name?: string }
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" }
    } finally {
      setLoading(false)
    }
  }

  const clockOut = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const res  = await fetch("/api/checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "clock_out", lat, lng }),
      })
      const data = await res.json()
      return data as {
        success: boolean; error?: string
        work_minutes?: number; ot_minutes?: number
        early_out_minutes?: number; is_early_out?: boolean
      }
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" }
    } finally {
      setLoading(false)
    }
  }

  return { clockIn, clockOut, loading }
}