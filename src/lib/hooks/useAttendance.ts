import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfMonth, endOfMonth } from "date-fns"

export function useAttendance(employeeId?: string, month = new Date()) {
  const supabase  = createClient()
  const [records,  setRecords]  = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [today,    setToday]    = useState<any>(null)
  const [loading,  setLoading]  = useState(true)

  const startDate = format(startOfMonth(month), "yyyy-MM-dd")
  const endDate   = format(endOfMonth(month),   "yyyy-MM-dd")
  const todayStr  = format(new Date(), "yyyy-MM-dd")
  const year      = month.getFullYear()

  const run = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)

    const { data: emp } = await supabase
      .from("employees").select("company_id").eq("id", employeeId).single()

    const [attRes, todayRes, holRes] = await Promise.all([
      supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId)
        .gte("work_date", startDate).lte("work_date", endDate)
        .order("work_date", { ascending: false }),
      supabase.from("attendance_records").select("*")
        .eq("employee_id", employeeId).eq("work_date", todayStr).maybeSingle(),
      emp?.company_id
        ? supabase.from("company_holidays").select("date,name")
            .eq("company_id", emp.company_id).eq("is_active", true).eq("year", year)
        : Promise.resolve({ data: [] }),
    ])

    setRecords(attRes.data ?? [])
    setToday(todayRes.data)
    setHolidays((holRes as any).data ?? [])
    setLoading(false)
  }, [employeeId, startDate, endDate])

  useEffect(() => { run() }, [run])

  const refetch = () => run()

  // map: "yyyy-MM-dd" → holiday name
  const holidayMap: Record<string, string> = Object.fromEntries(
    holidays.map(h => [h.date, h.name])
  )

  return {
    records,
    holidays,
    holidayMap,
    today,
    todayRecord: today,   // alias สำหรับ checkin page
    loading,
    refetch,
  }
}

// ── useCheckin — clock in / out ผ่าน /api/checkin ─────────────────────
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
      return data as { success: boolean; error?: string; work_minutes?: number }
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" }
    } finally {
      setLoading(false)
    }
  }

  return { clockIn, clockOut, loading }
}