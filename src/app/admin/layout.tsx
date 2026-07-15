"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { usePayrollAccess } from "@/lib/hooks/usePayrollAccess"
import { createClient } from "@/lib/supabase/client"
import { LanguageProvider, useLanguage } from "@/lib/i18n"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import AIChatWidget from "@/components/admin/AIChatWidget"
import BirthdayCelebration from "@/components/BirthdayCelebration"
import {
  LayoutDashboard, Users, Clock, CreditCard, Calendar, CalendarDays,
  Settings, Menu, X, LogOut, ChevronRight, BookOpen, UserX, Target, Camera, CalendarClock,
  Network, ClipboardCheck, Megaphone, MessageCircle, ScrollText, Shield, Package, Table2, PieChart, Sparkles, GraduationCap,
  UserPlus, Store, Briefcase, ScanLine, Link2, ShieldCheck, PackageSearch,
} from "lucide-react"

// key = slug ใน i18n (admin.nav.<key>)
const SIDEBAR = [
  { href: "/admin/dashboard",            icon: LayoutDashboard, key: "overview",            badge: null as string|null },
  { href: "/admin/org",                  icon: Network,         key: "structure",           badge: null as string|null },
  { href: "/admin/org-chart",            icon: Network,         key: "org_chart",           badge: null as string|null },
  { href: "/admin/employees",            icon: Users,           key: "employees",           badge: null as string|null },
  { href: "/admin/brands",                icon: Store,          key: "brands",              badge: null as string|null },
  { href: "/admin/permissions",          icon: ShieldCheck,     key: "roles",               badge: null as string|null },
  { href: "/admin/feishu-users",         icon: Link2,           key: "feishu",              badge: null as string|null },
  { href: "/admin/probation-employees",  icon: Briefcase,       key: "probation_employees", badge: null as string|null },
  { href: "/admin/approvals",            icon: ClipboardCheck,  key: "requests",            badge: null as string|null },
  { href: "/admin/announcements",        icon: Megaphone,       key: "announcements",       badge: null as string|null },
  { href: "/admin/regulations",          icon: ScrollText,      key: "regulations",         badge: null as string|null },
  { href: "/admin/chat",                 icon: MessageCircle,   key: "chat",                badge: null as string|null },
  { href: "/admin/attendance",           icon: Clock,           key: "attendance",          badge: null as string|null },
  { href: "/admin/attendance/offsite",   icon: Camera,          key: "offsite",             badge: null as string|null },
  { href: "/admin/attendance/with-photo", icon: ScanLine,       key: "photo_checkin",       badge: null as string|null },
  { href: "/admin/work-log",            icon: Table2,          key: "work_log",            badge: null as string|null },
  { href: "/admin/work-record",         icon: Sparkles,        key: "work_record",         badge: null as string|null },
  { href: "/admin/shifts",              icon: CalendarClock,   key: "shifts",              badge: null as string|null },
  { href: "/admin/leave",                icon: Calendar,       key: "leave",               badge: null as string|null },
  { href: "/admin/leave-calendar",       icon: CalendarDays,    key: "leave_calendar",      badge: null as string|null },
  { href: "/admin/leave-quota",          icon: PieChart,        key: "leave_quota",         badge: null as string|null },
  { href: "/admin/kpi",                  icon: Target,          key: "kpi",                 badge: null as string|null },
  { href: "/admin/probation-eval",       icon: Shield,          key: "probation_eval",      badge: null as string|null },
  { href: "/equipment/dashboard",       icon: Package,         key: "equipment",           badge: null as string|null },
  { href: "/admin/training",            icon: GraduationCap,   key: "learning",            badge: null as string|null },
  { href: "/admin/branch-eval",         icon: Store,           key: "branch_eval",         badge: null as string|null },
  { href: "/admin/sales",               icon: ScanLine,        key: "pc_sales",            badge: null as string|null },
  { href: "/admin/scan-misses",          icon: PackageSearch,   key: "scan_misses",         badge: null as string|null },
  { href: "https://careers.shd-technology.co.th/admin", icon: UserPlus, key: "recruitment", badge: null as string|null, external: true as boolean | undefined },
  { href: "/admin/payroll",              icon: CreditCard,      key: "payroll",             badge: null as string|null },
  { href: "/admin/payroll-rules",        icon: BookOpen,        key: "payroll_rules",       badge: null as string|null },
  { href: "/admin/audit-logs",            icon: ScrollText,     key: "audit_logs",          badge: null as string|null },
  { href: "/admin/settings",             icon: Settings,        key: "settings",            badge: null as string|null },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </LanguageProvider>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const ROLE_LABEL: Record<string, string> = {
    super_admin: t("admin.header.super_admin"),
    hr_admin:    t("admin.header.hr_admin"),
    manager:     t("admin.header.manager"),
    employee:    t("admin.header.employee"),
  }
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const supabase    = createClient()
  const [badgeCounts, setBadgeCounts] = useState<Record<string,number>>({})

  // ── ระดับสิทธิ์ขายสินค้า (สำหรับ employee/manager ที่ได้รับ permission พิเศษ) ──
  const role = user?.role
  const isFullAdmin = role === "super_admin" || role === "hr_admin"
  const isManagerRole = role === "manager"

  // ── สิทธิ์ดูเงินเดือน "เหนือกว่า super_admin" ──
  const { hasAccess: canPayroll } = usePayrollAccess()

  // กรอง sidebar:
  // - super_admin/hr_admin → เห็นทุก item
  // - คนอื่น (manager + permission holder) → เห็นเฉพาะ /admin/sales
  // - เมนู "เงินเดือน" (key=payroll) → เห็นเฉพาะคนที่อยู่ใน payroll_access
  const visibleSidebar = (isFullAdmin
    ? SIDEBAR
    : SIDEBAR.filter(s => s.href === "/admin/sales")
  ).filter(s => s.key !== "payroll" || canPayroll)

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

  const matchedNav = visibleSidebar.slice().sort((a,b) => b.href.length - a.href.length).find(i => pathname.startsWith(i.href))
  const pageLabel = matchedNav ? t("admin.nav." + matchedNav.key)
    : pathname.startsWith("/admin/profile") ? t("admin.header.profile") : "Admin"

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
              <video autoPlay loop muted playsInline aria-label="GoodHR" className="h-full w-full object-cover">
                <source src="/goodhr-logo.mp4" type="video/mp4"/>
                <source src="/goodhr-logo.mov" type="video/quicktime"/>
              </video>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">GoodHR</p>
              <p className="max-w-36 truncate text-xs text-slate-400">
                {emp?.company?.name_th?.replace("บริษัท ", "").replace(" จำกัด", "") || t("admin.header.admin_panel")}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {!isFullAdmin && (
            <Link href={isManagerRole ? "/manager/dashboard" : "/app/dashboard"} onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 mb-2 border border-slate-100">
              ← {isManagerRole ? t("admin.header.back_manager") : t("admin.header.back_home")}
            </Link>
          )}
          {visibleSidebar.map((item) => {
            const { href, icon: Icon } = item
            const label = t("admin.nav." + item.key)
            const isExternal = (item as any).external === true
            const active = isExternal ? false
              : href === "/admin/attendance"
              ? pathname === "/admin/attendance" || pathname === "/admin/attendance/"
              : href === "/admin/shifts"
              ? pathname.startsWith("/admin/shifts")
              : href === "/admin/payroll"
              ? pathname.startsWith("/admin/payroll")
              : pathname.startsWith(href)
            const cls = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
              (active ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-600 hover:bg-slate-50")
            const inner = (
              <>
                <Icon size={15} className={active ? "text-indigo-600" : "text-slate-400"}/>
                {label}
                {badgeCounts[href] > 0 && !active && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                    {badgeCounts[href]}
                  </span>
                )}
                {isExternal && <ChevronRight size={13} className="ml-auto -rotate-45 text-slate-400" />}
                {active && !isExternal && <ChevronRight size={13} className="ml-auto text-indigo-400"/>}
              </>
            )
            // External link → เปิดในแท็บใหม่
            if (isExternal) {
              return (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)} className={cls}>
                  {inner}
                </a>
              )
            }
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={cls}>
                {inner}
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
            <LogOut size={13}/> {t("admin.header.logout")}
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
          <LanguageSwitcher />
          <Link href="/app/dashboard" className="text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600 whitespace-nowrap">
            {t("admin.header.user_mode")} →
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        <BirthdayCelebration />
      </div>
      <AIChatWidget />
    </div>
  )
}