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
  const [leaveMap,     setLeaveMap]     = useState<Record<string, { type: string; status: string; isHalf?: boolean; halfPeriod?: string }>>({})
  const [correctionMap, setCorrectionMap] = useState<Record<string, { status: string; requested_clock_in?: string; requested_clock_out?: string }>>({})
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

    try {
      const params = new URLSearchParams({
        employee_id:    employeeId,
        calendar_start: startDate,
        calendar_end:   endDate,
        period_start:   period.start,
        period_end:     period.end,
        year:           String(year),
        today:          todayStr,
      })
      const res = await fetch(`/api/attendance/history?${params}`, { cache: "no-store" })
      if (!res.ok) {
        console.error("attendance history error:", res.status)
        setRecords([]); setPeriodRecords([]); setHolidays([]); setLeaveMap({}); setCorrectionMap({})
        setToday(null); setForgotCheckout(null)
        return
      }
      const data = await res.json()

      // สร้าง leaveMap
      const lm: Record<string, { type: string; status: string; isHalf?: boolean; halfPeriod?: string }> = {}
      for (const l of (data.leaves ?? []) as any[]) {
        const typeName = l.leave_type?.name || "ลา"
        let cur = l.start_date
        const end = l.end_date
        while (cur <= end) {
          lm[cur] = { type: typeName, status: l.status, isHalf: l.is_half_day, halfPeriod: l.half_day_period }
          const d = new Date(cur + "T00:00:00")
          d.setDate(d.getDate() + 1)
          cur = format(d, "yyyy-MM-dd")
        }
      }

      // สร้าง correctionMap (เก็บอันล่าสุดต่อวัน)
      const cm: Record<string, { status: string; requested_clock_in?: string; requested_clock_out?: string }> = {}
      for (const c of (data.corrections ?? []) as any[]) {
        if (!cm[c.work_date]) {
          cm[c.work_date] = {
            status: c.status,
            requested_clock_in: c.requested_clock_in,
            requested_clock_out: c.requested_clock_out,
          }
        }
      }

      setRecords(data.records ?? [])
      setPeriodRecords(data.periodRecords ?? [])
      setHolidays(data.holidays ?? [])
      setLeaveMap(lm)
      setCorrectionMap(cm)
      setToday(data.todayRecord ?? null)
      setForgotCheckout(data.forgotCheckout ?? null)
    } catch (e) {
      console.error("attendance history fetch error:", e)
      setRecords([]); setPeriodRecords([]); setHolidays([]); setLeaveMap({}); setCorrectionMap({})
      setToday(null); setForgotCheckout(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, startDate, endDate, period.start, period.end, year, todayStr])

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
    correctionMap,    // วันที่มีคำขอแก้ไขเวลา — ใช้แสดงสถานะ pending/approved/rejected
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