"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Clock, Calendar, User } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/app/dashboard",  icon: Home,     label: "หน้าหลัก" },
  { href: "/app/checkin",    icon: Clock,    label: "เช็คอิน"  },
  { href: "/app/attendance", icon: Calendar, label: "การเข้างาน" },
  { href: "/app/leave",      icon: Calendar, label: "การลา"    },
  { href: "/app/profile",    icon: User,     label: "โปรไฟล์"  },
]

function useUnreadCount(employeeId?: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!employeeId) return
    const supabase = createClient()
    // โหลดครั้งแรก
    supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employeeId)
      .eq("is_read", false)
      .then(({ count: c }) => setCount(c ?? 0))
    // realtime subscribe
    const ch = supabase
      .channel("notif-badge")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
        filter: `employee_id=eq.${employeeId}`,
      }, () => {
        supabase.from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", employeeId)
          .eq("is_read", false)
          .then(({ count: c }) => setCount(c ?? 0))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [employeeId])
  return count
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const empId    = user?.employee_id ?? (user as any)?.employee?.id
  const unread   = useUnreadCount(empId)
  const emp      = user?.employee
  const avatarUrl = (emp as any)?.avatar_url

  return (
    <div className="mobile-container">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">

        {/* Avatar + Name */}
        <Link href="/app/profile" className="flex items-center gap-2.5 active:opacity-70 transition-opacity">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-indigo-100 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-indigo-700 text-sm font-black">
                  {emp?.first_name_th?.[0] ?? "HR"}
                </span>}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-800 leading-none">
              {emp ? `${emp.first_name_th} ${emp.last_name_th}` : "กำลังโหลด..."}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{(emp as any)?.position?.name ?? ""}</p>
          </div>
        </Link>

        {/* Bell with badge */}
        <Link href="/app/notifications" className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      {/* ── Bottom Nav ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link key={href} href={href}
                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors " +
                  (active ? "text-indigo-600" : "text-slate-400")}>
                <div className={"p-1 rounded-lg transition-all " + (active ? "bg-indigo-50" : "")}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={"text-[10px] font-medium " + (active ? "font-bold" : "")}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}