"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/types/database"

// Singleton — สร้างครั้งเดียว
const supabase = createClient()

export function useLeaveTypes(companyId?: string) {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    setLoaded(false)
    supabase
      .from("leave_types")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error) setTypes((data as LeaveType[]) ?? [])
        setLoading(false)
        setLoaded(true)
      })
  }, [companyId])

  return { types, loading, loaded }
}

export function useLeaveBalance(employeeId?: string) {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!employeeId) return
    supabase
      .from("leave_balances")
      .select("*, leave_type:leave_types(*)")
      .eq("employee_id", employeeId)
      .eq("year", year)
      .then(({ data }) => {
        setBalances((data as LeaveBalance[]) ?? [])
        setLoading(false)
      })
  }, [employeeId])

  return { balances, loading }
}

export function useLeaveRequests(employeeId?: string) {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refetch = async () => {
    if (!employeeId) return
    const { data } = await supabase
      .from("leave_requests")
      .select(
        "*, leave_type:leave_types(*), reviewer:employees!reviewed_by(first_name_th,last_name_th)"
      )
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
    if (mountedRef.current) {
      setRequests((data as LeaveRequest[]) ?? [])
      setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    refetch()
    return () => { mountedRef.current = false }
  }, [employeeId])

  return { requests, loading, refetch }
}