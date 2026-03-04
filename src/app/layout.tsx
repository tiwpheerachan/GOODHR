"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, Users, CheckSquare, ChevronLeft, Bell } from "lucide-react"

const NAV = [
  { href: "/manager/dashboard", icon: LayoutDashboard, label: "ภาพรวม"  },
  { href: "/manager/team",      icon: Users,           label: "ทีม"       },
  { href: "/manager/approvals", icon: CheckSquare,     label: "อนุมัติ"   },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const emp       = user?.employee as any
  const empId     = user?.employee_id ?? emp?.id
  const avatarUrl = emp?.avatar_url
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!empId) return
    const supabase = createClient()
    // นับ pending ทั้ง leave + adjustment
    Promise.all([
      supabase.from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("time_adjustment_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("company_id", emp?.company_id),
    ]).then(([{ count: lc }, { count: ac }]) => {
      setPendingCount((lc ?? 0) + (ac ?? 0))
    })
  }, [empId])

  return (
    <div className="mobile-container">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-indigo-100 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-indigo-700 text-sm font-black">{emp?.first_name_th?.[0] ?? "M"}</span>}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-800 leading-none">
              {emp?.first_name_th} {emp?.last_name_th}
            </p>
            <p className="text-[10px] text-indigo-600 font-bold mt-0.5">หัวหน้าทีม</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* pending badge */}
          {pendingCount > 0 && (
            <Link href="/manager/approvals"
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-xl">
              <Bell size={11} />
              {pendingCount} รออนุมัติ
            </Link>
          )}
          <Link href="/app/dashboard"
            className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors ml-1">
            <ChevronLeft size={13} /> User
          </Link>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative " +
                  (active ? "text-indigo-600" : "text-slate-400")}>
                <div className={"p-1 rounded-lg " + (active ? "bg-indigo-50" : "")}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={"text-[10px] " + (active ? "font-bold" : "font-medium")}>{label}</span>
                {label === "อนุมัติ" && pendingCount > 0 && (
                  <span className="absolute top-1.5 right-4 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}