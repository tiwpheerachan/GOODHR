"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutDashboard, Users, CheckSquare, ChevronLeft } from "lucide-react"

const NAV = [
  { href:"/manager/dashboard", icon:LayoutDashboard, label:"ภาพรวม" },
  { href:"/manager/team", icon:Users, label:"ทีม" },
  { href:"/manager/approvals", icon:CheckSquare, label:"อนุมัติ" },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  return (
    <div className="mobile-container">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center"><span className="text-white text-xs font-bold">TL</span></div>
          <div>
            <span className="font-bold text-slate-800 text-sm block leading-none">{user?.employee?.first_name_th} {user?.employee?.last_name_th}</span>
            <span className="text-xs text-indigo-600 font-medium">หัวหน้าทีม</span>
          </div>
        </div>
        <Link href="/app/dashboard" className="text-xs text-slate-500 flex items-center gap-1"><ChevronLeft size={12} /> User Mode</Link>
      </header>
      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="flex">
          {NAV.map(({ href, icon:Icon, label }) => {
            const active = pathname === href
            return <Link key={href} href={href} className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 " + (active?"text-indigo-600":"text-slate-400")}><Icon size={20} strokeWidth={active?2.5:1.5} /><span className="text-[10px] font-medium">{label}</span></Link>
          })}
        </div>
      </nav>
    </div>
  )
}
