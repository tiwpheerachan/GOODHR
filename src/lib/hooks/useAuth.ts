"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

// Singleton — สร้างครั้งเดียว ไม่ recreate ทุก render
const supabase = createClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!mountedRef.current) return

        if (!authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            employee:employees(
              *,
              company:companies(*),
              branch:branches(*),
              department:departments(*),
              position:positions(*)
            )
          `)
          .eq("id", authUser.id)
          .maybeSingle()

        if (!mountedRef.current) return

        if (data) {
          // super_admin อาจไม่มี employee record
          // ถ้า employee เป็น null แต่มี company_id ใน users table
          // ให้ inject company_id เข้า employee เพื่อให้ทุกหน้าใช้ user.employee.company_id ได้
          if (!data.employee && data.company_id) {
            (data as any).employee = { company_id: data.company_id }
          }
          setUser(data as User)
        } else {
          setUser(null)
        }
      } catch {
        if (mountedRef.current) setUser(null)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return
      if (event === "SIGNED_OUT" || !session) {
        setUser(null)
        setLoading(false)
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUser()
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return { user, loading, signOut }
}