"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutDashboard, Users, Clock, CreditCard, Calendar, Settings, Menu, X, LogOut, ChevronRight } from "lucide-react"

const SIDEBAR = [
  { href:"/admin/dashboard", icon:LayoutDashboard, label:"ภาพรวม" },
  { href:"/admin/employees", icon:Users, label:"พนักงาน" },
  { href:"/admin/attendance", icon:Clock, label:"การเข้างาน" },
  { href:"/admin/leave", icon:Calendar, label:"การลา" },
  { href:"/admin/payroll", icon:CreditCard, label:"เงินเดือน" },
  { href:"/admin/settings", icon:Settings, label:"ตั้งค่า" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={"fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform " + (open?"translate-x-0":"-translate-x-full lg:translate-x-0")}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center"><span className="text-white text-xs font-bold">HR</span></div>
            <div><p className="font-bold text-slate-800 text-sm">HRMS Admin</p><p className="text-xs text-slate-400">{user?.employee?.company?.name_th || "Admin Panel"}</p></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR.map(({ href, icon:Icon, label }) => {
            const active = pathname.startsWith(href)
            return <Link key={href} href={href} onClick={() => setOpen(false)} className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors " + (active?"bg-primary-50 text-primary-700 font-semibold":"text-slate-600 hover:bg-slate-50")}>
              <Icon size={16} className={active?"text-primary-600":"text-slate-400"} />{label}{active && <ChevronRight size={14} className="ml-auto text-primary-400" />}
            </Link>
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-xs font-bold text-primary-600">{user?.employee?.first_name_th?.[0]}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{user?.employee?.first_name_th} {user?.employee?.last_name_th}</p><p className="text-xs text-slate-400">{user?.role === "super_admin"?"Super Admin":"HR Admin"}</p></div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-xl"><LogOut size={14} /> ออกจากระบบ</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl" onClick={() => setOpen(!open)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
          <h1 className="font-bold text-slate-800 flex-1">{SIDEBAR.find(i => pathname.startsWith(i.href))?.label || "Admin"}</h1>
          <Link href="/app/dashboard" className="text-xs text-slate-500 hover:text-primary-600">User Mode →</Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
