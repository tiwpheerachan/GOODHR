"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, Users, CheckSquare, ChevronLeft, Bell, Target, CalendarClock, CalendarDays, Shield, Globe } from "lucide-react"
import { LanguageProvider, useLanguage, Lang } from "@/lib/i18n"

// NAV items use i18n keys — resolved inside the component
const NAV_ITEMS = [
  { href: "/manager/dashboard",      icon: LayoutDashboard, key: "dashboard"      },
  { href: "/manager/team",           icon: Users,           key: "team"           },
  { href: "/manager/kpi",            icon: Target,          key: "kpi"            },
  { href: "/manager/probation-eval", icon: Shield,          key: "probation"      },
  { href: "/manager/shifts",         icon: CalendarClock,   key: "shifts"         },
  { href: "/manager/leave-calendar", icon: CalendarDays,    key: "leave_calendar" },
  { href: "/manager/approvals",      icon: CheckSquare,     key: "approvals"      },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ManagerLayoutInner>{children}</ManagerLayoutInner>
    </LanguageProvider>
  )
}

function ManagerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const emp       = user?.employee as any
  const empId     = user?.employee_id ?? emp?.id
  const avatarUrl = emp?.avatar_url
  const [pendingCount, setPendingCount] = useState(0)
  const [probationCount, setProbationCount] = useState(0)
  const { t, lang, setLang, langs } = useLanguage()
  const [showLangPicker, setShowLangPicker] = useState(false)

  useEffect(() => {
    if (!empId) return
    const supabase = createClient()
    const role = (user as any)?.role ?? "employee"
    const isAdmin = ["super_admin", "hr_admin"].includes(role)
    const companyId = emp?.company_id

    const load = async () => {
      // ── ดึง team IDs ของหัวหน้า (ถ้าไม่ใช่ admin) ────────────
      let teamIds: string[] = []
      if (!isAdmin && empId) {
        const { data: teamRows } = await supabase
          .from("employee_manager_history").select("employee_id")
          .eq("manager_id", empId).is("effective_to", null)
        teamIds = (teamRows ?? []).map((r: any) => String(r.employee_id))
      }

      // ── นับ pending เฉพาะลูกทีม (หรือทั้งบริษัทถ้า admin) ──
      const countQuery = (table: string) => {
        if (isAdmin && companyId) {
          return supabase.from(table).select("id", { count: "exact", head: true })
            .eq("status", "pending").eq("company_id", companyId)
        }
        if (teamIds.length === 0) return Promise.resolve({ count: 0 })
        return supabase.from(table).select("id", { count: "exact", head: true })
          .eq("status", "pending").in("employee_id", teamIds)
      }

      const [lv, adj, ot, sc] = await Promise.all([
        countQuery("leave_requests"),
        countQuery("time_adjustment_requests"),
        countQuery("overtime_requests"),
        countQuery("shift_change_requests"),
      ])

      // resignation: ใช้ status ต่างจากตารางอื่น
      let resCount = 0
      if (isAdmin && companyId) {
        const { count } = await supabase.from("resignation_requests")
          .select("id", { count: "exact", head: true }).eq("status", "pending_manager").eq("company_id", companyId)
        resCount = count ?? 0
      } else if (teamIds.length > 0) {
        const { count } = await supabase.from("resignation_requests")
          .select("id", { count: "exact", head: true }).eq("status", "pending_manager").in("employee_id", teamIds)
        resCount = count ?? 0
      }

      setPendingCount((lv.count ?? 0) + (adj.count ?? 0) + (ot.count ?? 0) + (sc.count ?? 0) + resCount)

      // ── นับจำนวนทดลองงานที่ต้องประเมิน ──
      try {
        const pRes = await fetch("/api/probation-evaluation?mode=manager")
        const pData = await pRes.json()
        const ROUND_DAYS: Record<number, number> = { 1: 60, 2: 90, 3: 119 }
        const today = new Date().toISOString().split("T")[0]
        let pCount = 0
        for (const m of (pData.members ?? [])) {
          const daysFromHire = Math.ceil((new Date(today).getTime() - new Date(m.hire_date).getTime()) / 86400000)
          const empForms = (pData.forms ?? []).filter((f: any) => f.employee_id === m.id)
          for (const round of [1, 2, 3]) {
            const form = empForms.find((f: any) => f.round === round)
            const dueDays = ROUND_DAYS[round]
            if (daysFromHire >= dueDays - 14 && !form) pCount++
          }
        }
        setProbationCount(pCount)
      } catch {}
    }
    load()
    const iv = setInterval(load, 30_000)
    // ── รับ event จากหน้า approvals เมื่ออนุมัติ/ปฏิเสธ → refresh badge ทันที ──
    const onApprovalAction = () => load()
    window.addEventListener("approval-action", onApprovalAction)
    return () => { clearInterval(iv); window.removeEventListener("approval-action", onApprovalAction) }
  }, [empId]) // eslint-disable-line — badge ไม่ต้อง refetch ทุกครั้งที่เปลี่ยนหน้า (มี interval 30s อยู่แล้ว)

  return (
    <div className="mobile-container">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-indigo-100 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-indigo-700 text-sm font-black">{(lang === "en" ? emp?.first_name_en?.[0] : emp?.first_name_th?.[0]) ?? "M"}</span>}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-800 leading-none">
              {lang === "en" ? (emp?.first_name_en || emp?.first_name_th) : emp?.first_name_th} {lang === "en" ? (emp?.last_name_en || emp?.last_name_th) : emp?.last_name_th}
              {emp?.nickname ? <span className="text-indigo-500 font-medium ml-1">({emp.nickname})</span> : null}
            </p>
            <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{t("nav.team_lead")}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Language switcher */}
          <div className="relative">
            <button onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1 text-[11px] text-slate-500 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <Globe size={13} />
              <span>{langs[lang].flag}</span>
            </button>
            {showLangPicker && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowLangPicker(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[100px]">
                  {(Object.keys(langs) as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setShowLangPicker(false) }}
                      className={"flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-slate-50 transition-colors " + (l === lang ? "text-indigo-600 font-bold bg-indigo-50" : "text-slate-600")}>
                      <span>{langs[l].flag}</span>
                      <span>{langs[l].label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* pending badge */}
          {pendingCount > 0 && (
            <Link href="/manager/approvals"
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-xl">
              <Bell size={11} />
              {pendingCount} {t("nav.pending_approval")}
            </Link>
          )}
          <Link href="/app/dashboard"
            className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors ml-1">
            <ChevronLeft size={13} /> {t("nav.user_mode")}
          </Link>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="flex">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname === href
            const label = t(`nav.${key}`)
            return (
              <Link key={href} href={href}
                className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative " +
                  (active ? "text-indigo-600" : "text-slate-400")}>
                <div className={"p-1 rounded-lg " + (active ? "bg-indigo-50" : "")}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={"text-[10px] " + (active ? "font-bold" : "font-medium")}>{label}</span>
                {key === "approvals" && pendingCount > 0 && (
                  <span className="absolute top-1.5 right-4 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
                {key === "probation" && probationCount > 0 && (
                  <span className="absolute top-1.5 right-4 min-w-[15px] h-[15px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {probationCount}
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