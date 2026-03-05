"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Clock, Calendar, User, Bell, Users, Building2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/app/dashboard",  icon: Home,     label: "หน้าหลัก"   },
  { href: "/app/checkin",    icon: Clock,    label: "เช็คอิน"    },
  { href: "/app/attendance", icon: Calendar, label: "การเข้างาน" },
  { href: "/app/leave",      icon: Calendar, label: "การลา"      },
  { href: "/app/profile",    icon: User,     label: "โปรไฟล์"   },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const emp = user?.employee as any
  const role = user?.role || ""
  const isManager   = ["manager", "hr_admin", "super_admin"].includes(role)
  const isAdmin     = ["hr_admin", "super_admin"].includes(role)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const empId = user?.employee_id ?? emp?.id
    if (!empId) return
    const supabase = createClient()
    supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", empId).eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0))
    const ch = supabase.channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications",
        filter: `employee_id=eq.${empId}` }, () => {
        supabase.from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", empId).eq("is_read", false)
          .then(({ count }) => setUnread(count ?? 0))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.employee_id, emp?.id])

  return (
    <div className="mobile-container">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <Link href="/app/profile">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
              {emp?.avatar_url
                ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-indigo-700 text-sm font-black">{emp?.first_name_th?.[0] ?? "U"}</span>}
            </div>
          </Link>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-800 leading-none">
              {emp ? `${emp.first_name_th} ${emp.last_name_th}` : "HRMS"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{emp?.position?.name ?? ""}</p>
          </div>
        </div>

        {/* Right — mode shortcuts + bell */}
        <div className="flex items-center gap-1.5">
          {isManager && (
            <Link href="/manager/dashboard"
              className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
              <Users size={12} />
              <span className="hidden sm:inline">หัวหน้าทีม</span>
              <span className="sm:hidden">TL</span>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/dashboard"
              className="flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl hover:bg-slate-200 transition-colors">
              <Building2 size={12} />
              <span className="hidden sm:inline">HR Admin</span>
              <span className="sm:hidden">HR</span>
            </Link>
          )}
          {/* Bell */}
          <Link href="/app/notifications" className="relative p-1.5">
            <Bell size={18} className="text-slate-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/app/dashboard" && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors " +
                  (active ? "text-indigo-600" : "text-slate-400")}>
                <div className={"p-1 rounded-lg " + (active ? "bg-indigo-50" : "")}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={"text-[10px] " + (active ? "font-bold" : "font-medium")}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}