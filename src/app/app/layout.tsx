"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Clock, Calendar, CalendarDays, User, Bell, Users, Shield, Target } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/app/dashboard",  icon: Home,         label: "หน้าหลัก"   },
  { href: "/app/checkin",    icon: Clock,        label: "เช็คอิน"    },
  { href: "/app/attendance", icon: Calendar,     label: "การเข้างาน" },
  { href: "/app/leave",      icon: CalendarDays, label: "การลา"      },
  { href: "/app/kpi",        icon: Target,       label: "KPI"        },
  { href: "/app/profile",    icon: User,         label: "โปรไฟล์"   },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const supabase  = useRef(createClient()).current
  const emp       = user?.employee as any
  const role      = (user as any)?.role || ""
  const isManager = ["manager","hr_admin","super_admin"].includes(role)
  const isAdmin   = ["hr_admin","super_admin"].includes(role)
  const empId     = (user as any)?.employee_id ?? emp?.id
  const [unread, setUnread] = useState(0)

  // ── Realtime unread badge ──────────────────────────────────────
  useEffect(() => {
    if (!empId) return
    const fetchCount = () =>
      supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", empId).eq("is_read", false)
        .then(({ count: c }) => setUnread(c ?? 0))

    fetchCount()

    const ch = supabase.channel(`badge-${empId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications",
        filter: `employee_id=eq.${empId}` }, fetchCount)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [empId]) // eslint-disable-line

  // clear badge เมื่อเข้าหน้า notifications
  useEffect(() => {
    if (pathname === "/app/notifications") setUnread(0)
  }, [pathname])

  const initials = emp?.first_name_th?.[0] ?? (user as any)?.email?.[0]?.toUpperCase() ?? "U"
  const displayName = emp ? `${emp.first_name_th} ${emp.last_name_th}` : (user as any)?.email?.split("@")[0] ?? "HRMS"

  return (
    <div className="mobile-container">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">

        {/* Left: Avatar + Name */}
        <Link href="/app/profile" className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-sm">
              {emp?.avatar_url
                ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>
                : <span className="text-white text-sm font-black">{initials}</span>}
            </div>
            {/* online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"/>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-black text-slate-800 leading-none truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{emp?.position?.name ?? role}</p>
          </div>
        </Link>

        {/* Right: Role badges + Bell */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Role quick-jump: แสดงเฉพาะ role สูงสุด */}
          {isAdmin ? (
            <Link href="/admin/dashboard"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm shadow-blue-200 hover:shadow-md hover:scale-105 transition-all active:scale-95">
              <Shield size={10}/>
              <span>Admin</span>
            </Link>
          ) : isManager ? (
            <Link href="/manager/dashboard"
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm shadow-violet-200 hover:shadow-md hover:scale-105 transition-all active:scale-95">
              <Users size={10}/>
              <span>TL</span>
            </Link>
          ) : null}

          {/* Bell */}
          <Link href="/app/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-500"/>
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      {/* ── Bottom Nav ──────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-slate-100 safe-bottom z-40">
        <div className="flex px-1 py-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/app/dashboard" && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center gap-1 py-2">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5}
                  style={{ color: active ? "#3b82f6" : "#cbd5e1", transition:"color .2s ease" }}/>
                <span style={{
                  fontSize:10, fontWeight: active ? 800 : 500,
                  color: active ? "#3b82f6" : "#cbd5e1",
                  transition:"color .2s ease",
                }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}