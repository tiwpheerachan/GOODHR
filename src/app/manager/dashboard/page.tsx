"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Users, Clock, CheckSquare, AlertTriangle, TrendingUp, ChevronRight, CalendarDays } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  present: { label: "ตรงเวลา",  cls: "bg-emerald-100 text-emerald-700" },
  late:    { label: "มาสาย",   cls: "bg-amber-100 text-amber-700"   },
  absent:  { label: "ขาดงาน",  cls: "bg-red-100 text-red-700"      },
  leave:   { label: "ลา",      cls: "bg-blue-100 text-blue-700"    },
  wfh:     { label: "WFH",     cls: "bg-violet-100 text-violet-700"},
}

export default function ManagerDashboard() {
  const { user } = useAuth()
  const empId    = user?.employee_id ?? (user as any)?.employee?.id
  const companyId = (user as any)?.company_id ?? (user as any)?.employee?.company_id
  const [members,   setMembers]   = useState<any[]>([])
  const [todayAtt,  setTodayAtt]  = useState<any[]>([])
  const [pendingLeave, setPendingLeave] = useState(0)
  const [pendingAdj,   setPendingAdj]   = useState(0)
  const [loading,   setLoading]   = useState(true)
  const today = format(new Date(), "yyyy-MM-dd")

  useEffect(() => {
    if (!empId) return
    const supabase = createClient()

    // ดึงทีม
    supabase.from("employee_manager_history")
      .select("employee:employees!employee_id(id,first_name_th,last_name_th,avatar_url,position:positions(name))")
      .eq("manager_id", empId)
      .is("effective_to", null)
      .then(({ data }) => {
        const m = (data ?? []).map((d: any) => d.employee).filter(Boolean)
        setMembers(m)
        setLoading(false)
        if (m.length === 0) return
        const ids = m.map((x: any) => x.id)
        supabase.from("attendance_records").select("*")
          .in("employee_id", ids).eq("work_date", today)
          .then(({ data: att }) => setTodayAtt(att ?? []))
      })

    // pending counts
    supabase.from("leave_requests")
      .select("id", { count: "exact", head: true }).eq("status", "pending")
      .then(({ count }) => setPendingLeave(count ?? 0))
    supabase.from("time_adjustment_requests")
      .select("id", { count: "exact", head: true }).eq("status", "pending")
      .eq("company_id", companyId)
      .then(({ count }) => setPendingAdj(count ?? 0))
  }, [empId])

  const totalPending = pendingLeave + pendingAdj
  const presentCount = todayAtt.filter(a => ["present","late"].includes(a.status)).length
  const absentCount  = members.length - todayAtt.length
  const lateCount    = todayAtt.filter(a => a.status === "late").length

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-24">

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-4 pt-5 pb-16 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute top-12 -left-6 w-28 h-28 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-indigo-200 text-xs">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
          <h1 className="text-white font-black text-xl mt-1">ภาพรวมทีม</h1>
          <p className="text-indigo-300 text-sm">{members.length} คนในทีม</p>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-3 relative">

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "มาวันนี้",  value: presentCount,    color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "มาสาย",    value: lateCount,        color: "text-amber-500",   bg: "bg-amber-50"   },
            { label: "ขาด/ไม่มีข้อมูล", value: absentCount, color: "text-red-500", bg: "bg-red-50"    },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-indigo-50 p-3 text-center">
              <div className={"w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5 " + s.bg}>
                <Users size={15} className={s.color} />
              </div>
              <p className={"text-2xl font-black " + s.color}>{s.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending approvals banner */}
        {totalPending > 0 && (
          <Link href="/manager/approvals"
            className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">รออนุมัติ {totalPending} รายการ</p>
              <p className="text-[11px] text-amber-500">
                ใบลา {pendingLeave} · แก้ไขเวลา {pendingAdj}
              </p>
            </div>
            <ChevronRight size={16} className="text-amber-400" />
          </Link>
        )}

        {/* Today attendance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
            <p className="text-sm font-bold text-slate-700">การเข้างานวันนี้</p>
            <Link href="/manager/team" className="text-[11px] text-indigo-600 font-bold">ดูทีม →</Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <Clock size={15} className="animate-spin" /> กำลังโหลด...
            </div>
          ) : members.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">ยังไม่มีสมาชิกในทีม</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {members.map(m => {
                const att = todayAtt.find(a => a.employee_id === m.id)
                const cfg = att ? STATUS_CONFIG[att.status] : null
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-indigo-700 text-sm font-black">{m.first_name_th?.[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.first_name_th} {m.last_name_th}</p>
                      <p className="text-[11px] text-slate-400">{m.position?.name}</p>
                    </div>
                    {cfg
                      ? <span className={"text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 " + cfg.cls}>{cfg.label}</span>
                      : <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 shrink-0">ไม่มีข้อมูล</span>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <p className="text-sm font-bold text-slate-700 px-4 pt-3.5 pb-2">เมนูด่วน</p>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-50">
            {[
              { href: "/manager/approvals", icon: CheckSquare,  iconBg: "bg-amber-50",   iconColor: "text-amber-600",   label: "อนุมัติคำร้อง",    sub: "ใบลา / แก้เวลา" },
              { href: "/manager/team",      icon: Users,        iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  label: "สมาชิกทีม",        sub: "ข้อมูลพนักงาน"   },
              { href: "/app/attendance",    icon: CalendarDays, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", label: "ปฏิทินเข้างาน",   sub: "ของฉัน"          },
              { href: "/app/salary",        icon: TrendingUp,   iconBg: "bg-violet-50",  iconColor: "text-violet-600",  label: "เงินเดือน",        sub: "รายได้ของฉัน"    },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + a.iconBg}>
                  <a.icon size={16} className={a.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">{a.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}