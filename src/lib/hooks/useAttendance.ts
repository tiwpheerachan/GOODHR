"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AttendanceRecord } from "@/types/database"
import { format, startOfMonth, endOfMonth } from "date-fns"

// Singleton — สร้างครั้งเดียว
const supabase = createClient()

export function useAttendance(employeeId?: string, month = new Date()) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const startDate = format(startOfMonth(month), "yyyy-MM-dd")
  const endDate = format(endOfMonth(month), "yyyy-MM-dd")
  const today = format(new Date(), "yyyy-MM-dd")

  const refetch = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    try {
      const [{ data: recs }, { data: todayRec }] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("*, shift:shift_templates(*)")
          .eq("employee_id", employeeId)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: false }),
        supabase
          .from("attendance_records")
          .select("*, shift:shift_templates(*)")
          .eq("employee_id", employeeId)
          .eq("work_date", today)
          .maybeSingle(),
      ])
      if (!mountedRef.current) return
      setRecords((recs as AttendanceRecord[]) ?? [])
      setTodayRecord(todayRec as AttendanceRecord ?? null)
    } catch {
      if (mountedRef.current) {
        setRecords([])
        setTodayRecord(null)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [employeeId, startDate, endDate, today])

  useEffect(() => {
    mountedRef.current = true
    refetch()
    return () => { mountedRef.current = false }
  }, [refetch])

  return { records, todayRecord, loading, refetch }
}

export function useCheckin() {
  const [loading, setLoading] = useState(false)

  const call = async (
    action: "clock_in" | "clock_out",
    lat: number,
    lng: number
  ) => {
    setLoading(true)
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, lat, lng }),
      })
      return await res.json()
    } catch (e) {
      return { success: false, error: "Network error" }
    } finally {
      setLoading(false)
    }
  }

  return {
    clockIn: (lat: number, lng: number) => call("clock_in", lat, lng),
    clockOut: (lat: number, lng: number) => call("clock_out", lat, lng),
    loading,
  }
}