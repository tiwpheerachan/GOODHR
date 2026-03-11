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
  const [today,        setToday]        = useState<any>(null)
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
    const [attRes, periodRes, todayRes, holRes] = await Promise.all([
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
    ])

    setRecords(attRes.data ?? [])
    setPeriodRecords(periodRes.data ?? [])
    setToday(todayRes.data)
    setHolidays((holRes as any).data ?? [])
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
    today,
    todayRecord: today,
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