"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { formatTime } from "@/lib/utils/attendance"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Clock, ChevronRight, CalendarDays, TrendingUp, AlertCircle, Banknote, ArrowRight, CheckCircle2, XCircle, FileText, Zap, Building2, Users, Shield, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function DashboardPage() {
  const { user } = useAuth()
  const { t, T } = useLanguage()
  const empName = useEmployeeName()
  const empId = user?.employee_id ?? (user as any)?.employee?.id
  const { todayRecord, records } = useAttendance(empId)
  const { balances } = useLeaveBalance(empId)
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set())
  const [netSalary, setNetSalary]       = useState<number | null>(null)
  const [probationAlerts, setProbationAlerts] = useState<any[]>([])
  const [probationLoading, setProbationLoading] = useState(true)

  useEffect(() => {
    if (!empId) return
    const supabase = createClient()
    const now = new Date()
    // pending corrections
    supabase.from("time_adjustment_requests")
      .select("work_date").eq("employee_id", empId).eq("status", "pending")
      .then(({ data }) => setPendingDates(new Set((data ?? []).map((r: any) => r.work_date))))
    // ดึงข้อมูลทดลองงาน
    fetch("/api/probation-evaluation?mode=manager")
      .then(r => r.json())
      .then(data => {
        const ROUND_DAYS: Record<number, number> = { 1: 60, 2: 90, 3: 119 }
        const today = new Date().toISOString().split("T")[0]
        const alerts: any[] = []
        for (const m of (data.members ?? [])) {
          const daysFromHire = Math.ceil((new Date(today).getTime() - new Date(m.hire_date).getTime()) / 86400000)
          const empForms = (data.forms ?? []).filter((f: any) => f.employee_id === m.id)

          // หา round ที่ใกล้ที่สุดที่ต้องทำ
          let nextRound: number | null = null
          let nextStatus: "overdue" | "due_soon" | "upcoming" | null = null
          for (const round of [1, 2, 3]) {
            const form = empForms.find((f: any) => f.round === round)
            if (form && (form.status === "approved" || form.status === "submitted")) continue // รอบนี้ทำแล้ว
            const dueDays = ROUND_DAYS[round]
            const opensAt = dueDays - 14
            if (daysFromHire > dueDays && !form) {
              nextRound = round
              nextStatus = "overdue"
              break // เลยกำหนด → ต้องทำรอบนี้ก่อน
            } else if (daysFromHire >= opensAt && daysFromHire <= dueDays) {
              nextRound = round
              nextStatus = "due_soon"
              break
            } else if (daysFromHire < opensAt) {
              nextRound = round
              nextStatus = "upcoming"
              break
            }
          }

          alerts.push({
            employee: m,
            daysFromHire,
            nextRound,
            nextStatus,
            nextDueDays: nextRound ? ROUND_DAYS[nextRound] : null,
            daysLeft: nextRound ? ROUND_DAYS[nextRound] - daysFromHire : null,
            forms: empForms,
          })
        }
        // เรียง: เลยกำหนดก่อน → ใกล้ครบ → ยังไม่ถึง
        const statusOrder = { overdue: 0, due_soon: 1, upcoming: 2 }
        alerts.sort((a, b) => {
          const sa = statusOrder[a.nextStatus as keyof typeof statusOrder] ?? 3
          const sb = statusOrder[b.nextStatus as keyof typeof statusOrder] ?? 3
          if (sa !== sb) return sa - sb
          return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
        })
        setProbationAlerts(alerts)
      })
      .catch(() => {})
      .finally(() => setProbationLoading(false))

    // เงินเดือนล่าสุด
    supabase.from("payroll_records")
      .select("net_salary, year, month")
      .eq("employee_id", empId)
      .order("year",  { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setNetSalary(data.net_salary) })
  }, [empId])

  const lateRecords  = records.filter(r => r.status === "late")
  const pendingFixed = lateRecords.filter(r => pendingDates.has(r.work_date)).length
  const stats = {
    present: records.filter(r => ["present","late"].includes(r.status)).length,
    late:    lateRecords.length,
    absent:  records.filter(r => r.status === "absent").length,
  }

  const emp        = user?.employee as any
  const isLate     = (todayRecord?.late_minutes ?? 0) > 0
  const alreadyIn  = !!todayRecord?.clock_in
  const noClockOut = alreadyIn && !todayRecord?.clock_out
  const todayDate  = format(new Date(), "yyyy-MM-dd")

  const ROUND_LABELS = [
    "", t("dashboard.probation_round_1"), t("dashboard.probation_round_2"), t("dashboard.probation_round_3")
  ]

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-24">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-4 pt-5 pb-20 overflow-hidden">
        {/* bg orbs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-16 -left-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <p className="text-indigo-200 text-xs">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
          <h1 className="text-white font-black text-2xl mt-1">
            {t("dashboard.greeting")}, {emp?.first_name_th ?? "..."}
          </h1>
          <p className="text-indigo-300 text-sm">{emp?.position?.name ?? emp?.department?.name ?? ""}</p>
        </div>
      </div>

      {/* ── Content overlaps hero ──────────────────────────── */}
      <div className="px-4 -mt-14 space-y-3 relative">

        {/* Today card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{t("dashboard.today_status")}</p>
            {alreadyIn && (
              <span className={"text-[11px] font-bold px-2.5 py-0.5 rounded-full " +
                (isLate ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                {isLate ? t("dashboard.late_minutes", { count: todayRecord!.late_minutes }) : t("dashboard.on_time")}
              </span>
            )}
          </div>

          {alreadyIn ? (
            <>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">{t("dashboard.clock_in")}</p>
                  <p className="text-3xl font-black text-slate-800 tabular-nums">{formatTime(todayRecord?.clock_in)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">{t("dashboard.clock_out")}</p>
                  <p className={"text-3xl font-black tabular-nums " + (todayRecord?.clock_out ? "text-slate-800" : "text-slate-300")}>
                    {formatTime(todayRecord?.clock_out)}
                  </p>
                  {(todayRecord?.work_minutes ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {Math.floor(todayRecord!.work_minutes / 60)}{t("common.hours")} {todayRecord!.work_minutes % 60}{t("common.mins_short")}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <Link href="/app/checkin"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl active:scale-[0.97] transition-all shadow-md shadow-indigo-200">
                  <Clock size={15} />
                  {noClockOut ? t("dashboard.checkout") : t("dashboard.checkin")}
                </Link>
                {isLate && (
                  <Link href={"/app/checkin/correction?date=" + todayDate}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl border border-amber-200 active:scale-[0.97] transition-all">
                    <Clock size={15} />
                    {t("dashboard.correction")}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-slate-700">{t("dashboard.not_checked_in")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("dashboard.checkin_instruction")}</p>
              </div>
              <Link href="/app/checkin"
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 active:scale-95 transition-all">
                <Clock size={14} /> {t("dashboard.checkin")}
              </Link>
            </div>
          )}
        </div>

        {/* ลืมเช็คออก */}
        {noClockOut && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-semibold flex-1">{t("dashboard.forgot_checkout")}</p>
            <Link href="/app/checkin" className="text-xs font-bold text-amber-700 shrink-0">{t("dashboard.forgot_checkout_action")}</Link>
          </div>
        )}

        {/* pending correction banner */}
        {pendingFixed > 0 && (
          <Link href="/app/checkin/correction"
            className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={14} className="text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-violet-700">{t("dashboard.pending_corrections", { count: pendingFixed })}</p>
              <p className="text-[11px] text-violet-400">{t("dashboard.pending_corrections_sub")}</p>
            </div>
            <ArrowRight size={14} className="text-violet-400" />
          </Link>
        )}

        {/* ── Probation Alerts — Dark Sparkle Theme V2 ──── */}
        {probationAlerts.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-lg shadow-slate-900/20 relative" style={{ background: "linear-gradient(145deg, #0f172a 0%, #1a1f3a 40%, #1e293b 100%)" }}>
            <style>{`
              @keyframes sparkle { 0%,100% { opacity:0.15; transform:scale(0.6); } 50% { opacity:1; transform:scale(1.3); } }
              @keyframes pulse-glow { 0%,100% { box-shadow:0 0 8px rgba(139,92,246,0.3); } 50% { box-shadow:0 0 16px rgba(139,92,246,0.6), 0 0 32px rgba(139,92,246,0.2); } }
              .pk-star { position:absolute; border-radius:50%; background:white; pointer-events:none; }
              .pk-star::after { content:''; position:absolute; inset:-2px; background:radial-gradient(circle,rgba(255,255,255,0.6) 0%,transparent 70%); border-radius:50%; }
              .pk-s1{width:2px;height:2px;top:12%;left:8%;animation:sparkle 2.4s ease-in-out infinite}
              .pk-s2{width:3px;height:3px;top:8%;left:32%;animation:sparkle 3s ease-in-out .4s infinite}
              .pk-s3{width:2px;height:2px;top:5%;right:22%;animation:sparkle 2s ease-in-out .8s infinite}
              .pk-s4{width:2px;height:2px;top:18%;right:10%;animation:sparkle 2.6s ease-in-out 1.2s infinite}
              .pk-s5{width:3px;height:3px;top:14%;left:55%;animation:sparkle 3.4s ease-in-out .2s infinite}
              .pk-s6{width:2px;height:2px;top:6%;left:78%;animation:sparkle 2.8s ease-in-out .6s infinite}
              .pk-bar { background:rgba(255,255,255,0.08); }
              .pk-fill { background:linear-gradient(90deg,#818cf8,#a78bfa,#c084fc,#f0abfc); box-shadow:0 0 10px rgba(167,139,250,0.4); }
              .pk-fill-warn { background:linear-gradient(90deg,#fbbf24,#f59e0b,#ef4444); box-shadow:0 0 10px rgba(245,158,11,0.4); }
              .pk-fill-danger { background:linear-gradient(90deg,#f87171,#ef4444,#dc2626); box-shadow:0 0 12px rgba(239,68,68,0.5); }
            `}</style>

            {/* Stars */}
            <div className="pk-star pk-s1"/><div className="pk-star pk-s2"/><div className="pk-star pk-s3"/>
            <div className="pk-star pk-s4"/><div className="pk-star pk-s5"/><div className="pk-star pk-s6"/>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
                  <Shield size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-white leading-none">{t("dashboard.probation_alert")}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(196,181,253,0.6)" }}>{t("dashboard.probation_members", { count: probationAlerts.length })}</p>
                </div>
              </div>
              <Link href="/manager/probation-eval" className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-125" style={{ background: "rgba(167,139,250,0.15)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.2)" }}>{t("dashboard.probation_view_all")}</Link>
            </div>

            {/* Cards */}
            <div className="px-4 pb-4 space-y-2.5 relative z-10">
              {probationAlerts.slice(0, 5).map((a, idx) => {
                const TOTAL_DAYS = 119
                const pct = Math.min((a.daysFromHire / TOTAL_DAYS) * 100, 100)
                const daysRemain = Math.max(0, TOTAL_DAYS - a.daysFromHire)
                const barClass = pct >= 100 ? "pk-fill-danger" : pct >= 75 ? "pk-fill-warn" : "pk-fill"
                const ROUNDS = [
                  { round: 1, day: 60 },
                  { round: 2, day: 90 },
                  { round: 3, day: 119 },
                ]

                return (
                  <Link key={`${a.employee.id}-${idx}`}
                    href={`/manager/probation-eval/${a.employee.id}${a.nextRound ? `?round=${a.nextRound}` : ""}`}
                    className="block rounded-xl p-3.5 active:scale-[0.98] transition-all hover:brightness-110"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>

                    {/* Row 1: avatar + name + countdown */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.15)" }}>
                        {a.employee.avatar_url
                          ? <img src={a.employee.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span style={{ color: "#c4b5fd" }} className="text-sm font-bold">{a.employee.first_name_th?.[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-white truncate">{empName(a.employee)}</p>
                        <p className="text-[10px] truncate" style={{ color: "rgba(148,163,184,0.7)" }}>{a.employee.position?.name}</p>
                      </div>
                      <div className="text-center shrink-0 px-3 py-1.5 rounded-xl" style={{
                        background: daysRemain === 0 ? "rgba(239,68,68,0.15)" : daysRemain <= 29 ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.12)",
                        border: `1px solid ${daysRemain === 0 ? "rgba(239,68,68,0.25)" : daysRemain <= 29 ? "rgba(245,158,11,0.25)" : "rgba(139,92,246,0.2)"}`,
                        animation: daysRemain <= 14 ? "pulse-glow 2s ease-in-out infinite" : "none"
                      }}>
                        <p className="text-lg font-black leading-none tabular-nums" style={{ color: daysRemain === 0 ? "#fca5a5" : daysRemain <= 29 ? "#fcd34d" : "#c4b5fd" }}>{daysRemain}</p>
                        <p className="text-[7px] font-bold mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{t("dashboard.probation_days_label")}</p>
                      </div>
                    </div>

                    {/* Row 2: Progress bar with round markers */}
                    <div className="relative mb-1">
                      {/* Bar track */}
                      <div className="pk-bar h-[10px] rounded-full overflow-hidden relative">
                        <div className={`h-full rounded-full ${barClass} transition-all duration-700`} style={{ width: `${pct}%` }}>
                          <div className="h-[4px] rounded-full mx-1 mt-[2px]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)" }} />
                        </div>
                      </div>

                      {/* Round dot markers ON the bar */}
                      {ROUNDS.map(r => {
                        const pos = (r.day / TOTAL_DAYS) * 100
                        const form = (a.forms ?? []).find((f: any) => f.round === r.round)
                        const done = form && (form.status === "approved" || form.status === "submitted")
                        const isOver = a.daysFromHire > r.day && !form
                        const isCurrent = a.daysFromHire >= r.day - 14 && a.daysFromHire <= r.day && !form
                        const dotBg = done ? "#34d399" : isOver ? "#f87171" : isCurrent ? "#fbbf24" : "rgba(148,163,184,0.35)"
                        const dotShadow = done ? "0 0 6px rgba(52,211,153,0.6)" : isOver ? "0 0 6px rgba(248,113,113,0.6)" : isCurrent ? "0 0 6px rgba(251,191,36,0.5)" : "none"
                        return (
                          <div key={r.round} className="absolute top-1/2" style={{ left: `${pos}%`, transform: "translate(-50%,-50%)" }}>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isOver && !done ? "animate-pulse" : ""}`}
                              style={{ background: dotBg, boxShadow: dotShadow, border: "2px solid rgba(15,23,42,0.8)" }}>
                              {done && <CheckCircle2 size={8} style={{ color: "#064e3b" }} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Row 3: Round status cards */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      {ROUNDS.map(r => {
                        const form = (a.forms ?? []).find((f: any) => f.round === r.round)
                        const done = form && (form.status === "approved" || form.status === "submitted")
                        const isDraft = form && form.status === "draft"
                        const isRejected = form && form.status === "rejected"
                        const isOver = a.daysFromHire > r.day && !form
                        const isCurrent = a.daysFromHire >= r.day - 14 && a.daysFromHire <= r.day && !form
                        const isUpcoming = a.daysFromHire < r.day - 14
                        const daysUntil = r.day - a.daysFromHire

                        // Card style
                        const cardBg = done ? "rgba(52,211,153,0.08)" : isOver ? "rgba(248,113,113,0.1)" : isCurrent ? "rgba(251,191,36,0.08)" : "rgba(148,163,184,0.04)"
                        const cardBorder = done ? "rgba(52,211,153,0.2)" : isOver ? "rgba(248,113,113,0.2)" : isCurrent ? "rgba(251,191,36,0.2)" : "rgba(148,163,184,0.08)"
                        const labelColor = done ? "#6ee7b7" : isOver ? "#fca5a5" : isCurrent ? "#fcd34d" : "rgba(148,163,184,0.5)"

                        return (
                          <div key={r.round} className="rounded-lg p-2 text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                            {/* Round label */}
                            <p className="text-[10px] font-black tracking-wide" style={{ color: labelColor }}>{ROUND_LABELS[r.round]}</p>

                            {/* Status indicator */}
                            {done ? (
                              <div className="flex items-center justify-center gap-0.5 mt-1">
                                <CheckCircle2 size={9} style={{ color: "#34d399" }} />
                                <span className="text-[8px] font-bold" style={{ color: "#6ee7b7" }}>{t("dashboard.probation_evaluated")}</span>
                              </div>
                            ) : isDraft ? (
                              <p className="text-[8px] font-bold mt-1" style={{ color: "#fcd34d" }}>{t("dashboard.probation_draft")}</p>
                            ) : isRejected ? (
                              <p className="text-[8px] font-bold mt-1" style={{ color: "#fca5a5" }}>{t("dashboard.probation_rejected")}</p>
                            ) : isOver ? (
                              <p className="text-[8px] font-bold mt-1 animate-pulse" style={{ color: "#fca5a5" }}>{t("dashboard.probation_overdue")}</p>
                            ) : isCurrent ? (
                              <p className="text-[8px] font-bold mt-1" style={{ color: "#fcd34d" }}>{t("dashboard.probation_time")}</p>
                            ) : (
                              <p className="text-[8px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>{t("dashboard.probation_waiting")}</p>
                            )}

                            {/* Days until this round */}
                            {!done && daysUntil > 0 && (
                              <p className="text-[8px] font-bold mt-0.5" style={{ color: isCurrent ? "rgba(251,191,36,0.7)" : "rgba(148,163,184,0.35)" }}>
                                {t("dashboard.probation_days_left", { count: daysUntil })}
                              </p>
                            )}
                            {done && form?.grade && (
                              <span className="inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded" style={{
                                background: form.grade === "A" ? "rgba(52,211,153,0.15)" : form.grade === "B" ? "rgba(96,165,250,0.15)" : form.grade === "C" ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)",
                                color: form.grade === "A" ? "#6ee7b7" : form.grade === "B" ? "#93c5fd" : form.grade === "C" ? "#fcd34d" : "#fca5a5"
                              }}>
                                {t("dashboard.probation_grade")} {form.grade}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t("dashboard.stats_this_month")}</p>
            <Link href="/app/attendance" className="text-[11px] text-indigo-600 font-bold">{t("dashboard.stats_view_calendar")}</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/app/attendance?filter=present"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><CheckCircle2 size={17} className="text-emerald-500" /></div>
              <p className="text-2xl font-black text-emerald-600">{stats.present}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t("dashboard.stats_present")}</p>
            </Link>
            <Link href="/app/attendance?filter=late"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><Clock size={17} className="text-amber-500" /></div>
              <p className="text-2xl font-black text-amber-500">{stats.late}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t("dashboard.stats_late")}</p>
              {pendingFixed > 0 && (
                <p className="text-[9px] text-violet-500 font-bold">{t("dashboard.stats_late_pending", { count: pendingFixed })}</p>
              )}
            </Link>
            <Link href="/app/attendance?filter=absent"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><XCircle size={17} className="text-red-400" /></div>
              <p className="text-2xl font-black text-red-500">{stats.absent}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t("dashboard.stats_absent")}</p>
            </Link>
          </div>
        </div>

        {/* ── Salary shortcut ──────────────────────────────── */}
        <Link href="/app/salary"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-4 py-4 flex items-center gap-3 shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Banknote size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">{t("dashboard.salary_latest")}</p>
            <p className="text-emerald-100 text-xs mt-0.5">
              {netSalary != null
                ? "฿" + netSalary.toLocaleString("th-TH", { minimumFractionDigits: 2 })
                : t("dashboard.salary_details")}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1.5">
            <TrendingUp size={13} className="text-white" />
            <span className="text-white text-xs font-bold">{t("dashboard.salary_view_more")}</span>
          </div>
        </Link>

        {/* ── Leave balances ───────────────────────────────── */}
        {balances.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <p className="text-sm font-bold text-slate-700">{t("dashboard.leave_quota")}</p>
              <Link href="/app/leave" className="text-[11px] font-bold text-indigo-600">{t("dashboard.leave_quota_view_all")}</Link>
            </div>
            <div className="px-4 pb-3 space-y-2.5">
              {balances.slice(0, 3).map(b => {
                const used = (b.entitled_days ?? 0) - (b.remaining_days ?? 0)
                const pct  = b.entitled_days > 0 ? (used / b.entitled_days) * 100 : 0
                const color = (b.leave_type as any)?.color_hex || "#818cf8"
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-600 font-medium">{(b.leave_type as any)?.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        <span className="font-black text-slate-800">{b.remaining_days}</span>/{b.entitled_days} {t("common.days")}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: (100 - pct) + "%", backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <p className="text-sm font-bold text-slate-700 px-4 pt-3.5 pb-2">{t("dashboard.quick_actions")}</p>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-50">
            {[
              { href: "/app/leave/new",          Icon: FileText,  iconBg: "bg-blue-50",   iconColor: "text-blue-600",   label: t("dashboard.quick_leave"),    sub: t("dashboard.quick_leave_sub") },
              { href: "/app/checkin/correction",  Icon: Clock,     iconBg: "bg-violet-50", iconColor: "text-violet-600", label: t("dashboard.quick_correction"),    sub: t("dashboard.quick_correction_sub")    },
              { href: "/app/leave/new?type=overtime", Icon: Zap,       iconBg: "bg-orange-50",iconColor: "text-orange-600", label: t("dashboard.quick_ot"),       sub: t("dashboard.quick_ot_sub")           },
              { href: "/app/salary",             Icon: Banknote,  iconBg: "bg-emerald-50",iconColor: "text-emerald-600", label: t("dashboard.quick_salary"),  sub: t("dashboard.quick_salary_sub")    },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + a.iconBg}><a.Icon size={16} className={a.iconColor} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">{a.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{a.sub}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Role shortcuts ───────────────────────────────── */}
        {["manager", "hr_admin", "super_admin"].includes(user?.role || "") && (
          <Link href="/manager/dashboard"
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm active:bg-slate-50">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0"><Users size={16} className="text-indigo-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">{t("dashboard.manager_system")}</p>
              <p className="text-[11px] text-slate-400">{t("dashboard.manager_system_sub")}</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
        )}
        {["hr_admin","super_admin"].includes(user?.role || "") && (
          <Link href="/admin/dashboard"
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm active:bg-slate-50">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0"><Building2 size={16} className="text-slate-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">{t("dashboard.admin_system")}</p>
              <p className="text-[11px] text-slate-400">{t("dashboard.admin_system_sub")}</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
        )}

      </div>
    </div>
  )
}
