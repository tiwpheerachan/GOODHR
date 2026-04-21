"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

// Singleton — สร้างครั้งเดียว ไม่ recreate ทุก render
const supabase = createClient()

// ── Module-level cache: ป้องกัน query ซ้ำเมื่อหลาย component mount พร้อมกัน ──
let _cachedUser: User | null = null
let _cacheReady = false
let _fetchPromise: Promise<User | null> | null = null

async function fetchUserOnce(forceRefresh = false): Promise<User | null> {
  // ถ้ามี cache แล้วและไม่ force → ใช้ cache เลย
  if (_cacheReady && !forceRefresh) return _cachedUser

  // ถ้ากำลัง fetch อยู่ → รอ promise เดิม (ไม่ query ซ้ำ)
  if (_fetchPromise && !forceRefresh) return _fetchPromise

  _fetchPromise = (async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        _cachedUser = null
        _cacheReady = true
        return null
      }

      const { data } = await supabase
        .from("users")
        .select(`
          *,
          employee:employees(
            id, employee_code, first_name_th, last_name_th, nickname,
            company_id, branch_id, department_id, position_id,
            employment_status, employment_type, is_active, avatar_url,
            hire_date, is_attendance_exempt, brand,
            company:companies(id, name_th, code),
            branch:branches(id, name),
            department:departments(id, name),
            position:positions(id, name)
          )
        `)
        .eq("id", authUser.id)
        .maybeSingle()

      if (data) {
        if (!data.employee && data.company_id) {
          (data as any).employee = { company_id: data.company_id }
        }
        _cachedUser = data as User
      } else {
        _cachedUser = null
      }
      _cacheReady = true
      return _cachedUser
    } catch {
      _cachedUser = null
      _cacheReady = true
      return null
    } finally {
      _fetchPromise = null
    }
  })()

  return _fetchPromise
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(_cachedUser)
  const [loading, setLoading] = useState(!_cacheReady)
  const mountedRef = useRef(true)

  const loadUser = useCallback(async (forceRefresh = false) => {
    const result = await fetchUserOnce(forceRefresh)
    if (mountedRef.current) {
      setUser(result)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // ถ้ามี cache แล้ว → set ทันทีไม่ต้องรอ
    if (_cacheReady) {
      setUser(_cachedUser)
      setLoading(false)
    } else {
      loadUser()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return
      if (event === "SIGNED_OUT" || !session) {
        _cachedUser = null
        _cacheReady = false
        _fetchPromise = null
        setUser(null)
        setLoading(false)
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUser(true)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [loadUser])

  const signOut = async () => {
    _cachedUser = null
    _cacheReady = false
    _fetchPromise = null
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return { user, loading, signOut }
}
