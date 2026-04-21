"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import AIChatWidget from "@/components/admin/AIChatWidget"
import {
  LayoutDashboard, Users, Clock, CreditCard, Calendar, CalendarDays,
  Settings, Menu, X, LogOut, ChevronRight, BookOpen, UserX, Target, Camera, CalendarClock,
  Network, ClipboardCheck, Megaphone, MessageCircle, ScrollText, Shield, Package,
} from "lucide-react"

const SIDEBAR = [
  { href: "/admin/dashboard",            icon: LayoutDashboard, label: "ภาพรวม",        badge: null as string|null },
  { href: "/admin/org",                  icon: Network,         label: "โครงสร้าง",      badge: null as string|null },
  { href: "/admin/employees",            icon: Users,           label: "พนักงาน",       badge: null as string|null },
  { href: "/admin/approvals",            icon: ClipboardCheck,  label: "คำร้อง",         badge: null as string|null },
  { href: "/admin/announcements",        icon: Megaphone,       label: "ประกาศ",         badge: null as string|null },
  { href: "/admin/chat",                 icon: MessageCircle,   label: "แชท",            badge: null as string|null },
  { href: "/admin/attendance",           icon: Clock,           label: "การเข้างาน",    badge: null as string|null },
  { href: "/admin/attendance/offsite",   icon: Camera,          label: "นอกสถานที่",    badge: null as string|null },
  { href: "/admin/shifts",              icon: CalendarClock,   label: "จัดกะ",          badge: null as string|null },
  { href: "/admin/leave",                icon: Calendar,        label: "การลา",          badge: null as string|null },
  { href: "/admin/leave-calendar",       icon: CalendarDays,    label: "ปฏิทินการลา",    badge: null as string|null },
  { href: "/admin/kpi",                  icon: Target,          label: "KPI",            badge: null as string|null },
  { href: "/admin/probation-eval",       icon: Shield,          label: "ประเมินทดลองงาน", badge: null as string|null },
  { href: "/equipment/dashboard",       icon: Package,         label: "อุปกรณ์",        badge: null as string|null },
  { href: "/admin/payroll",              icon: CreditCard,      label: "เงินเดือน",      badge: null as string|null },
  { href: "/admin/payroll-rules",        icon: BookOpen,        label: "สูตรคำนวณ",     badge: null as string|null },
  { href: "/admin/audit-logs",            icon: ScrollText,      label: "บันทึกกิจกรรม",  badge: null as string|null },
  { href: "/admin/settings",             icon: Settings,        label: "ตั้งค่า",        badge: null as string|null },
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

  const supabase    = createClient()
  const [badgeCounts, setBadgeCounts] = useState<Record<string,number>>({})

  useEffect(() => {
    const companyId = (user as any)?.company_id ?? user?.employee?.company_id
    if (!companyId) return
    const load = async () => {
      const [lv, adj, ot, os] = await Promise.all([
        supabase.from("leave_requests").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("status","pending"),
        supabase.from("time_adjustment_requests").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("status","pending"),
        supabase.from("overtime_requests").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("status","pending"),
        supabase.from("offsite_checkin_requests").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("status","pending"),
      ])
      const totalPending = (lv.count??0) + (adj.count??0) + (ot.count??0)
      setBadgeCounts({
        "/admin/approvals": totalPending,
        "/admin/attendance/offsite": os.count??0,
      })
    }
    load()
    const iv = setInterval(load, 30_000) // refresh ทุก 30 วินาที
    // ฟัง event จากหน้า approvals เพื่อ refresh badge ทันทีหลังอนุมัติ/ปฏิเสธ
    const onChanged = () => load()
    window.addEventListener("approvals-changed", onChanged)
    return () => { clearInterval(iv); window.removeEventListener("approvals-changed", onChanged) }
  }, [user]) // eslint-disable-line — badge ไม่ต้อง refetch ทุกครั้งที่เปลี่ยนหน้า (มี interval 30s อยู่แล้ว)

  const emp         = user?.employee
  const avatarUrl   = emp?.avatar_url
  const displayName = emp
    ? `${emp.first_name_th} ${emp.last_name_th}`
    : user?.role === "super_admin" ? "Super Admin" : "Admin"
  const roleLabel   = ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? ""

  const pageLabel =
    SIDEBAR.slice().sort((a,b) => b.href.length - a.href.length).find(i => pathname.startsWith(i.href))?.label ??
    (pathname.startsWith("/admin/profile") ? "โปรไฟล์" : "Admin")

  return (
    <div className="flex h-screen bg-slate-50">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)}/>
      )}

      <aside className={
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-100 bg-white transition-transform lg:static " +
        (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
      }>
        {/* Logo */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <img src="https://shd-technology.co.th/images/logo.png" alt="SHD FOR YOU" className="h-full w-full object-contain p-1"/>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">SHD FOR YOU</p>
              <p className="max-w-36 truncate text-xs text-slate-400">
                {emp?.company?.name_th?.replace("บริษัท ", "").replace(" จำกัด", "") || "Admin Panel"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {SIDEBAR.map(({ href, icon: Icon, label }) => {
            const active = href === "/admin/attendance"
              ? pathname === "/admin/attendance" || pathname === "/admin/attendance/"
              : href === "/admin/shifts"
              ? pathname.startsWith("/admin/shifts")
              : href === "/admin/payroll"
              ? pathname.startsWith("/admin/payroll")
              : pathname.startsWith(href)
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                  (active ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-600 hover:bg-slate-50")
                }>
                <Icon size={15} className={active ? "text-indigo-600" : "text-slate-400"}/>
                {label}
                {badgeCounts[href] > 0 && !active && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                    {badgeCounts[href]}
                  </span>
                )}
                {active && <ChevronRight size={13} className="ml-auto text-indigo-400"/>}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div className="space-y-1 border-t border-slate-100 p-3">
          <Link href="/admin/profile" onClick={() => setOpen(false)}
            className={
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 " +
              (pathname.startsWith("/admin/profile") ? "bg-indigo-50" : "")
            }>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-100 text-xs font-black text-indigo-600">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover"/> : emp?.first_name_th?.[0] ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{displayName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <ChevronRight size={13} className="flex-shrink-0 text-slate-300 group-hover:text-slate-400"/>
          </Link>
          <button onClick={signOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50">
            <LogOut size={13}/> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 lg:px-6">
          <button className="rounded-xl p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X size={18}/> : <Menu size={18}/>}
          </button>
          <h1 className="flex-1 font-black text-slate-800">{pageLabel}</h1>
          <Link href="/app/dashboard" className="text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600">
            User Mode →
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      <AIChatWidget />
    </div>
  )
}