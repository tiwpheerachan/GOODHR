"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutDashboard, Users, Clock, CreditCard, Calendar, Settings, Menu, X, LogOut, ChevronRight, BookOpen } from "lucide-react"

const SIDEBAR = [
  { href:"/admin/dashboard",     icon:LayoutDashboard, label:"ภาพรวม"        },
  { href:"/admin/employees",     icon:Users,           label:"พนักงาน"       },
  { href:"/admin/attendance",    icon:Clock,           label:"การเข้างาน"    },
  { href:"/admin/leave",         icon:Calendar,        label:"การลา"          },
  { href:"/admin/payroll",       icon:CreditCard,      label:"เงินเดือน"      },
  { href:"/admin/payroll-rules", icon:BookOpen,        label:"สูตรคำนวณ"     },
  { href:"/admin/settings",      icon:Settings,        label:"ตั้งค่า"        },
]

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  hr_admin:    "HR Admin",
  manager:     "ผู้จัดการ",
  employee:    "พนักงาน",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const emp        = user?.employee
  const avatarUrl  = emp?.avatar_url
  const displayName = emp
    ? `${emp.first_name_th} ${emp.last_name_th}`
    : (user?.role === "super_admin" ? "Super Admin" : "Admin")
  const roleLabel  = ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? ""

  const pageLabel =
    SIDEBAR.find(i => pathname.startsWith(i.href))?.label ??
    (pathname.startsWith("/admin/profile") ? "โปรไฟล์" : "Admin")

  return (
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={"fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform " + (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-black">HR</span>
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">HRMS Admin</p>
              <p className="text-xs text-slate-400 truncate max-w-36">
                {emp?.company?.name_th?.replace("บริษัท ", "").replace(" จำกัด", "") || "Admin Panel"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SIDEBAR.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors " +
                  (active ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50")}>
                <Icon size={15} className={active ? "text-indigo-600" : "text-slate-400"}/>
                {label}
                {active && <ChevronRight size={13} className="ml-auto text-indigo-400"/>}
              </Link>
            )
          })}
        </nav>

        {/* User area — clickable → profile */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link href="/admin/profile" onClick={() => setOpen(false)}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group " +
              (pathname.startsWith("/admin/profile") ? "bg-indigo-50" : "")}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
                : (emp?.first_name_th?.[0] ?? "A")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0"/>
          </Link>

          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-500 text-sm font-semibold hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={13}/> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl" onClick={() => setOpen(!open)}>
            {open ? <X size={18}/> : <Menu size={18}/>}
          </button>
          <h1 className="font-black text-slate-800 flex-1">{pageLabel}</h1>
          <Link href="/app/dashboard" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
            User Mode →
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}