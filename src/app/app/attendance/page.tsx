"use client"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { formatTime } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"
import {
  ChevronLeft, ChevronRight, Clock, LogIn, LogOut,
  AlertTriangle, TrendingDown, Info, FileEdit, CalendarClock,
  XCircle, CalendarDays, CheckCircle2, Plane, Home, ArrowLeft,
  Flame, BarChart3, Timer,
} from "lucide-react"
import Link from "next/link"
import {
  format, addMonths, subMonths, getDaysInMonth,
  startOfMonth, getDay, eachDayOfInterval, endOfMonth,
} from "date-fns"
import { th } from "date-fns/locale"

// ถ้าวันที่ > 21 → อยู่ในงวดเดือนถัดไปแล้ว
function getCurrentPeriodDate(): Date {
  const now = new Date()
  if (now.getDate() > 21) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const STATUS_TH: Record<string, string> = {
  present: "มาทำงาน", late: "มาสาย", absent: "ขาดงาน",
  early_out: "ออกก่อน", leave: "ลา", holiday: "วันหยุด", wfh: "WFH",
}
const STATUS_PILL: Record<string, string> = {
  present:   "bg-indigo-100 text-indigo-700",
  late:      "bg-amber-100  text-amber-700",
  absent:    "bg-red-100    text-red-600",
  early_out: "bg-orange-100 text-orange-600",
  leave:     "bg-purple-100 text-purple-700",
  holiday:   "bg-rose-100   text-rose-600",
  wfh:       "bg-violet-100 text-violet-700",
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  present:   <CheckCircle2 size={10}/>,
  late:      <Clock size={10}/>,
  absent:    <XCircle size={10}/>,
  early_out: <LogOut size={10}/>,
  leave:     <Plane size={10}/>,
  holiday:   <CalendarDays size={10}/>,
  wfh:       <Home size={10}/>,
}
const CAL_BG: Record<string, string> = {
  present:   "bg-indigo-100 text-indigo-700",
  late:      "bg-amber-100  text-amber-700",
  absent:    "bg-red-100    text-red-500",
  early_out: "bg-orange-100 text-orange-600",
  leave:     "bg-purple-100 text-purple-600",
  wfh:       "bg-violet-100 text-violet-700",
}

function isWeekend(ds: string) {
  const d = getDay(new Date(ds + "T00:00:00"))
  return d === 0 || d === 6
}

function buildDisplayList(
  records: any[], month: Date, todayStr: string,
  holidayMap: Record<string, string>,
  leaveMap: Record<string, { type: string; status: string }>,
): any[] {
  const existMap = new Map<string, any>(records.map(r => [r.work_date as string, r]))
  const virtual: any[] = []
  for (const d of eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })) {
    const ds = format(d, "yyyy-MM-dd")
    if (ds >= todayStr || isWeekend(ds) || holidayMap[ds] || existMap.has(ds)) continue

    const leave = leaveMap[ds]
    if (leave && (leave.status === "approved" || leave.status === "pending")) {
      // วันลา → แสดง "ลา" + ประเภทลา
      virtual.push({
        _virtual: true, id: `leave-${ds}`, work_date: ds,
        status: "leave", leave_type_name: leave.type, leave_status: leave.status,
        clock_in: null, clock_out: null, late_minutes: 0, early_out_minutes: 0, work_minutes: 0, ot_minutes: 0,
      })
    } else {
      // ไม่มี attendance + ไม่มี leave = ขาดงาน
      virtual.push({
        _virtual: true, id: `absent-${ds}`, work_date: ds,
        status: "absent", clock_in: null, clock_out: null, late_minutes: 0, early_out_minutes: 0, work_minutes: 0, ot_minutes: 0,
      })
    }
  }
  return [...records, ...virtual].sort((a, b) => a.work_date > b.work_date ? -1 : 1)
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(() => new Date(2026, 0, 1)) // fixed date, sync ใน useEffect
  const [hydrated, setHydrated] = useState(false)
  const empId = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const { records, periodRecords, period, holidayMap, leaveMap, loading } = useAttendance(empId, month)

  useEffect(() => {
    setMonth(getCurrentPeriodDate())
    setHydrated(true)
  }, [])

  const today = format(new Date(), "yyyy-MM-dd")
  const monthPfx = format(month, "yyyy-MM")
  const recMap = Object.fromEntries(records.map((r: any) => [r.work_date, r]))
  const displayList = loading ? [] : buildDisplayList(records, month, today, holidayMap, leaveMap)

  const stats = {
    present:       records.filter((r: any) => r.status === "present").length,
    late:          records.filter((r: any) => r.status === "late").length,
    absent:        displayList.filter((r: any) => r.status === "absent").length,
    earlyOut:      records.filter((r: any) => r.status === "early_out").length,
    leave:         records.filter((r: any) => r.status === "leave").length + displayList.filter((r: any) => r.status === "leave" && r._virtual).length,
    wfh:           records.filter((r: any) => r.status === "wfh").length,
    holidays:      Object.keys(holidayMap).filter(d => d.startsWith(monthPfx)).length,
    totalLateMin:  records.reduce((s: number, r: any) => s + (r.late_minutes || 0), 0),
    totalEarlyMin: records.reduce((s: number, r: any) => s + (r.early_out_minutes || 0), 0),
  }
  const periodStats = {
    late:          periodRecords.filter((r: any) => r.status === "late" || (r.late_minutes || 0) > 0).length,
    earlyOut:      periodRecords.filter((r: any) => r.status === "early_out" || (r.early_out_minutes || 0) > 0).length,
    absent:        periodRecords.filter((r: any) => r.status === "absent").length,
    totalLateMin:  periodRecords.reduce((s: number, r: any) => s + (r.late_minutes || 0), 0),
    totalEarlyMin: periodRecords.reduce((s: number, r: any) => s + (r.early_out_minutes || 0), 0),
  }
  // ── Grace period: คำนวณนาทีสายหลังหัก grace ──
  const emp = (user as any)?.employee
  const isExempt = !!emp?.is_attendance_exempt
  const graceMinutes = getLateThreshold(emp?.department?.name, emp?.company?.code)
  const graceAdjustedLateMin = periodRecords.reduce(
    (s: number, r: any) => s + Math.max(0, (Number(r.late_minutes) || 0) - graceMinutes), 0
  )
  // ถ้า graceAdjustedLateMin === 0 หรือ exempt → ไม่หัก
  const lateWithinGrace = periodStats.late > 0 && (graceAdjustedLateMin === 0 || isExempt)

  // exempt → ไม่แสดง deduction alert เลย
  const hasIssues = !isExempt && (periodStats.late > 0 || periodStats.absent > 0 || periodStats.earlyOut > 0)

  const periodLabel = (() => {
    try {
      const s = new Date(period.start + "T00:00:00")
      const e = new Date(period.end + "T00:00:00")
      return `${format(s, "d MMM", { locale: th })} – ${format(e, "d MMM", { locale: th })}`
    } catch { return "" }
  })()

  const empName = `${(user as any)?.employee?.first_name_th ?? ""} ${(user as any)?.employee?.last_name_th ?? ""}`.trim()

  // ── Smart features ────────────────────────────────────────────────
  // Total work hours this month
  const totalWorkMin = useMemo(() =>
    records.reduce((s: number, r: any) => s + (r.work_minutes || 0), 0)
  , [records])
  const totalWorkHrs = Math.floor(totalWorkMin / 60)
  const totalWorkRemMin = totalWorkMin % 60

  // Total OT minutes
  const totalOtMin = useMemo(() =>
    records.reduce((s: number, r: any) => s + (r.ot_minutes || 0), 0)
  , [records])

  // On-time streak
  const streak = useMemo(() => {
    const sorted = [...records].sort((a: any, b: any) => b.work_date.localeCompare(a.work_date))
    let count = 0
    for (const r of sorted as any[]) {
      if (r.status === "present" && (r.late_minutes || 0) === 0 && (r.early_out_minutes || 0) === 0) count++
      else break
    }
    return count
  }, [records])

  // Weekly pattern: average status per day of week
  const weeklyPattern = useMemo(() => {
    const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    const counts = Array.from({ length: 7 }, () => ({ total: 0, onTime: 0, late: 0 }))
    for (const r of records as any[]) {
      const dow = getDay(new Date(r.work_date + "T00:00:00"))
      counts[dow].total++
      if (r.status === "present" && (r.late_minutes || 0) === 0) counts[dow].onTime++
      if (r.status === "late" || (r.late_minutes || 0) > 0) counts[dow].late++
    }
    return days.map((name, i) => ({
      name, total: counts[i].total, onTime: counts[i].onTime, late: counts[i].late,
      pct: counts[i].total > 0 ? Math.round((counts[i].onTime / counts[i].total) * 100) : 0,
    }))
  }, [records])

  // On-time percentage
  const onTimePct = useMemo(() => {
    const total = stats.present + stats.late
    if (total === 0) return 0
    return Math.round((stats.present / total) * 100)
  }, [stats.present, stats.late])

  // ring
  const circumference = 2 * Math.PI * 28
  const ringPct = Math.min(((stats.present + stats.late) / Math.max(getDaysInMonth(month) * 5 / 7, 1)) * 100, 100)
  const dash = (ringPct / 100) * circumference

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow { from{width:0%} to{width:var(--bar-w)} }
        .att-bg { background: linear-gradient(160deg,#eef2ff 0%,#f5f3ff 40%,#fdf4ff 100%); min-height:100vh; }
        .glass-card { background:rgba(255,255,255,0.88); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.9); box-shadow:0 4px 24px rgba(0,0,0,0.06); }
        .fade-up   { animation:fadeUp 0.4s ease both; }
        .fade-up-1 { animation:fadeUp 0.4s 0.07s ease both; }
        .fade-up-2 { animation:fadeUp 0.4s 0.14s ease both; }
        .fade-up-3 { animation:fadeUp 0.4s 0.21s ease both; }
        .fade-up-4 { animation:fadeUp 0.4s 0.28s ease both; }
        .fade-up-5 { animation:fadeUp 0.4s 0.35s ease both; }
        .ring-track { stroke:rgba(99,102,241,0.10); }
        .ring-fill  { stroke:url(#ringGrad); stroke-dasharray:${dash} ${circumference - dash}; stroke-dashoffset:${circumference * 0.25}; stroke-linecap:round; transition:stroke-dasharray 1s ease; }
        .cal-day { transition:all 0.12s ease; }
        .cal-day:hover { transform:scale(1.08); filter:brightness(0.96); }
        .record-card { background:rgba(255,255,255,0.92); border:1px solid rgba(255,255,255,0.95); box-shadow:0 2px 16px rgba(0,0,0,0.05); }
        .absent-card { background:rgba(255,241,242,0.95); border:1px solid rgba(254,205,211,0.8); box-shadow:0 2px 16px rgba(239,68,68,0.06); }
        .deduct-bar { background:linear-gradient(90deg,rgba(251,191,36,0.07),rgba(249,115,22,0.05)); border-top:1px dashed rgba(251,191,36,0.2); }
      ` }} />

      <div className="att-bg pb-12">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-4 pt-6 pb-4 fade-up">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/app/profile"
              className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/70 border border-white shadow-sm hover:bg-white transition-colors">
              <ArrowLeft size={17} className="text-slate-600" />
            </Link>
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">ประวัติการเข้างาน</p>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{empName || "พนักงาน"}</h1>
            </div>
          </div>
        </div>

        {/* ── Month nav ──────────────────────────────────────────── */}
        <div className="px-4 mb-4 fade-up-1">
          <div className="glass-card rounded-2xl flex items-center justify-between px-3 py-2.5">
            <button onClick={() => setMonth(m => subMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-indigo-50 active:scale-90 transition-all">
              <ChevronLeft size={18} className="text-slate-500" />
            </button>
            <span className="text-sm font-black text-slate-700 tracking-tight">
              {format(month, "MMMM yyyy", { locale: th })}
            </span>
            <button onClick={() => setMonth(m => addMonths(m, 1))}
              disabled={format(addMonths(month, 1), "yyyy-MM") > format(getCurrentPeriodDate(), "yyyy-MM")}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-indigo-50 active:scale-90 transition-all disabled:opacity-25">
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* ── Hero: ring + stats ─────────────────────────────────── */}
        <div className="px-4 mb-4 fade-up-1">
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center gap-5">

              {/* ring */}
              <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <circle cx="36" cy="36" r="28" fill="none" strokeWidth="6" className="ring-track" />
                  <circle cx="36" cy="36" r="28" fill="none" strokeWidth="6" className="ring-fill" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-700 leading-none">{stats.present + stats.late}</span>
                  <span className="text-[8px] text-slate-400 font-medium">วัน</span>
                </div>
              </div>

              {/* grid */}
              <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-3">
                {[
                  { l: "มาแล้ว",  v: stats.present,  c: "text-indigo-600" },
                  { l: "มาสาย",   v: stats.late,     c: "text-amber-500" },
                  { l: "ขาดงาน",  v: stats.absent,   c: "text-red-500" },
                  { l: "ออกก่อน", v: stats.earlyOut, c: "text-orange-500" },
                  { l: "ลาหยุด",  v: stats.leave,    c: "text-purple-500" },
                  { l: "WFH",     v: stats.wfh,      c: "text-violet-500" },
                ].map(s => (
                  <div key={s.l}>
                    <p className={`text-lg font-black leading-none ${s.c}`}>{s.v}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {(stats.totalLateMin > 0 || stats.totalEarlyMin > 0) && (
              <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-slate-100">
                {stats.totalLateMin > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                    <Clock size={9} /> สายรวม {stats.totalLateMin} นาที
                  </span>
                )}
                {stats.totalEarlyMin > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                    <LogOut size={9} /> ออกก่อนรวม {stats.totalEarlyMin} นาที
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Smart insights are integrated into the calendar card below */}

        {/* ── Deduction alert ────────────────────────────────────── */}
        {hasIssues && (
          <div className="px-4 mb-4 fade-up-2">
            <div className="glass-card rounded-3xl overflow-hidden border-red-100" style={{ border: "1px solid rgba(254,202,202,0.8)" }}>
              <div className="flex items-center justify-between px-4 py-3 bg-red-50/70 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-xl bg-red-100 flex items-center justify-center">
                    <TrendingDown size={12} className="text-red-500" />
                  </div>
                  <p className="text-[11px] font-black text-red-700 uppercase tracking-wide">รายการส่งผลต่อเงินเดือน</p>
                </div>
                {periodLabel && (
                  <span className="text-[9px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    งวด {periodLabel}
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-50/80">
                {periodStats.late > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 ${lateWithinGrace ? "bg-green-100" : "bg-amber-100"} rounded-xl flex items-center justify-center`}>
                        <Clock size={12} className={lateWithinGrace ? "text-green-600" : "text-amber-600"} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">มาสาย {periodStats.late} ครั้ง</p>
                        <p className="text-[10px] text-slate-400">{periodStats.totalLateMin} นาที ในงวดนี้</p>
                      </div>
                    </div>
                    {lateWithinGrace ? (
                      <span className="text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">ให้อภัยได้ 😊</span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">หักเงิน</span>
                    )}
                  </div>
                )}
                {periodStats.earlyOut > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-orange-100 rounded-xl flex items-center justify-center"><LogOut size={12} className="text-orange-600" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">ออกก่อนกำหนด {periodStats.earlyOut} ครั้ง</p>
                        <p className="text-[10px] text-slate-400">{periodStats.totalEarlyMin} นาที ในงวดนี้</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">หักเงิน</span>
                  </div>
                )}
                {periodStats.absent > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle size={12} className="text-red-500" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">ขาดงาน {periodStats.absent} วัน</p>
                        <p className="text-[10px] text-slate-400">หักวันละ 1/30 ของเงินเดือน</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">หักเงิน</span>
                  </div>
                )}
                {stats.late > periodStats.late && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50/50">
                    <Info size={10} className="text-indigo-400 flex-shrink-0" />
                    <p className="text-[10px] text-indigo-600">สาย {stats.late - periodStats.late} ครั้งหลังวันที่ 21 — จะนับในงวดถัดไป</p>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60">
                  <Info size={10} className="text-slate-400 flex-shrink-0" />
                  <p className="text-[10px] text-slate-500">
                    ดูยอดหักจริงได้ที่{" "}
                    <Link href="/app/salary" className="text-indigo-600 font-bold underline">หน้าเงินเดือน →</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Calendar + Insights ────────────────────────────────── */}
        <div className="px-4 mb-4 fade-up-3">
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="p-4 pb-3">
              {/* legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
                {[
                  { cls: "bg-rose-100 text-rose-600",      l: "วันหยุด" },
                  { cls: "bg-indigo-100 text-indigo-700",   l: "มาทำงาน" },
                  { cls: "bg-amber-100 text-amber-700",     l: "มาสาย" },
                  { cls: "bg-orange-100 text-orange-600",    l: "ออกก่อน" },
                  { cls: "bg-red-100 text-red-600",          l: "ขาดงาน" },
                  { cls: "bg-purple-100 text-purple-600",    l: "ลาหยุด" },
                ].map(s => (
                  <div key={s.l} className="flex items-center gap-1.5">
                    <span className={`${s.cls} text-[9px] font-bold px-2 py-0.5 rounded-lg`}>{s.l}</span>
                  </div>
                ))}
              </div>

              {/* day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array(getDay(startOfMonth(month))).fill(null).map((_, i) => <div key={"e" + i} />)}
                {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
                  const day = i + 1
                  const ds = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd")
                  const rec = recMap[ds]
                  const hol = holidayMap[ds]
                  const isT = ds === today
                  const isFut = ds > today
                  const dow = getDay(new Date(ds + "T00:00:00"))
                  const wknd = dow === 0 || dow === 6
                  const lv = leaveMap[ds]
                  const hasLeave = lv && (lv.status === "approved" || lv.status === "pending")
                  const isVAbs = !isFut && ds !== today && !wknd && !hol && !rec && !hasLeave

                  let cls = "", sub = ""
                  if (isT)         { cls = "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200"; sub = rec ? (STATUS_TH[rec.status] || "").slice(0, 2) : "วันนี้" }
                  else if (hol)    { cls = "bg-rose-100 text-rose-600"; sub = "หยุด" }
                  else if (isFut)  { cls = "text-slate-300" }
                  else if (rec)    { cls = CAL_BG[rec.status] ?? "bg-slate-100 text-slate-500"; sub = (STATUS_TH[rec.status] || "").slice(0, 2) }
                  else if (hasLeave) { cls = "bg-purple-100 text-purple-600"; sub = lv.status === "pending" ? "รอลา" : "ลา" }
                  else if (isVAbs) { cls = "bg-red-100 text-red-500"; sub = "ขาด" }
                  else if (wknd)   { cls = "text-slate-300" }
                  else             { cls = "text-slate-400" }

                  return (
                    <div key={day} title={hol || undefined}
                      className={`cal-day aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold ${cls}`}>
                      <span>{day}</span>
                      {sub && <span className="text-[7px] leading-none mt-0.5 font-semibold">{sub}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Compact insights strip ── */}
            {!loading && records.length > 0 && (
              <div className="border-t border-slate-100">
                {/* Row 1: 4 mini stats */}
                <div className="grid grid-cols-4 divide-x divide-slate-100">
                  <div className="py-2.5 text-center">
                    <p className="text-sm font-black text-indigo-600 leading-none">{totalWorkHrs}<span className="text-[9px] font-bold text-slate-400">.{totalWorkRemMin.toString().padStart(2, "0")}</span></p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5">ชม.ทำงาน</p>
                  </div>
                  <div className="py-2.5 text-center">
                    <p className="text-sm font-black text-violet-600 leading-none">{onTimePct}<span className="text-[9px] font-bold text-slate-400">%</span></p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5">ตรงเวลา</p>
                  </div>
                  <div className="py-2.5 text-center">
                    <p className="text-sm font-black text-amber-500 leading-none">{streak}<span className="text-[9px] font-bold text-slate-400"> วัน</span></p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5">Streak</p>
                  </div>
                  <div className="py-2.5 text-center">
                    <p className="text-sm font-black text-purple-600 leading-none">{totalOtMin > 0 ? `${Math.floor(totalOtMin / 60)}:${(totalOtMin % 60).toString().padStart(2, "0")}` : "–"}</p>
                    <p className="text-[8px] text-slate-400 font-medium mt-0.5">OT</p>
                  </div>
                </div>

                {/* Row 2: Weekly on-time mini bars inline */}
                <div className="border-t border-slate-100 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">รายวัน</span>
                    <div className="flex-1 flex items-center gap-1">
                      {weeklyPattern.filter((_, i) => i >= 1 && i <= 6).map((d, idx) => {
                        const color = d.total === 0 ? "bg-slate-100"
                          : d.pct >= 80 ? "bg-indigo-500"
                          : d.pct >= 50 ? "bg-amber-400"
                          : "bg-orange-400"
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${d.total > 0 ? Math.max(d.pct, 6) : 0}%` }} />
                            </div>
                            <span className="text-[7px] font-bold text-slate-400">{d.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Record list ────────────────────────────────────────── */}
        <div className="px-4 space-y-2.5 fade-up-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">กำลังโหลด...</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">ไม่มีข้อมูลเดือนนี้</p>
            </div>
          ) : displayList.map((r: any, idx: number) => {
            const hol = holidayMap[r.work_date]
            const lateMin = r.late_minutes || 0
            const earlyOutMin = r.early_out_minutes || 0
            const isLate = r.status === "late" || lateMin > 0
            const isEarlyOut = r.status === "early_out" || earlyOutMin > 0
            const isAbsent = r.status === "absent"
            const isLeave = r.status === "leave"
            const isVirtual = !!r._virtual
            const hasClockedIn = !!r.clock_in
            const missingClockOut = hasClockedIn && !r.clock_out
            const showActions = !hol && !isLeave && r.status !== "holiday"
                                 && (isAbsent || isLate || isEarlyOut || !hasClockedIn || missingClockOut)

            return (
              <div key={r.id}
                className={`rounded-3xl overflow-hidden ${isAbsent ? "absent-card" : "record-card"}`}
                style={{ animationDelay: `${idx * 0.025}s` }}
              >
                <div className={`flex items-center gap-3 px-4 py-3.5 ${isAbsent && isVirtual ? "bg-red-50/30" : ""} ${isLeave && isVirtual ? "bg-purple-50/30" : ""}`}>

                  {/* date */}
                  <div className={`w-11 h-11 flex-shrink-0 rounded-2xl flex flex-col items-center justify-center
                    ${isAbsent ? "bg-red-100" : isLeave ? "bg-purple-100" : "bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-100"}`}>
                    <p className={`text-[15px] font-black leading-none ${isAbsent ? "text-red-500" : isLeave ? "text-purple-600" : "text-slate-700"}`}>
                      {r.work_date.split("-")[2]}
                    </p>
                    <p className={`text-[9px] font-bold mt-0.5 ${isAbsent ? "text-red-400" : isLeave ? "text-purple-400" : "text-slate-400"}`}>
                      {format(new Date(r.work_date + "T00:00:00"), "EEE", { locale: th })}
                    </p>
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${STATUS_PILL[r.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_ICON[r.status]}{isLeave && r.leave_type_name ? r.leave_type_name : (STATUS_TH[r.status] ?? r.status)}
                      </span>
                      {isLeave && r.leave_status === "pending" && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100">รออนุมัติ</span>}
                      {isLeave && r.leave_status === "approved" && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-lg border border-green-100">อนุมัติแล้ว</span>}
                      {hol && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-100">{hol.length > 12 ? hol.slice(0, 12) + "…" : hol}</span>}
                      {isAbsent && isVirtual && <span className="text-[9px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded-lg border border-red-100">ไม่มีการเช็คอิน</span>}
                    </div>
                    {isLeave && isVirtual ? (
                      <p className="text-[11px] text-purple-500 font-medium">{r.leave_type_name || "ลา"} {r.leave_status === "approved" ? "✓" : "(รออนุมัติ)"}</p>
                    ) : !isVirtual ? (
                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="flex items-center gap-1 text-slate-500">
                          <LogIn size={9} className="text-indigo-500" />
                          <span className="font-bold text-slate-700">{formatTime(r.clock_in) || "--:--"}</span>
                        </span>
                        <span className="text-slate-300 text-[10px]">→</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <LogOut size={9} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{formatTime(r.clock_out) || "--:--"}</span>
                        </span>
                        {r.work_minutes > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg font-medium">
                            {Math.floor(r.work_minutes / 60)}ชม.{r.work_minutes % 60}น.
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-red-400 font-medium">ส่งคำขอแก้ไข หรือยื่นลาย้อนหลัง</p>
                    )}
                  </div>

                  {/* badges */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {lateMin > 0 && <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><Clock size={8} />สาย {lateMin}น.</span>}
                    {earlyOutMin > 0 && <span className="flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full"><LogOut size={8} />ออกก่อน {earlyOutMin}น.</span>}
                    {isAbsent && !lateMin && !earlyOutMin && <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full"><XCircle size={8} />ขาดงาน</span>}
                    {isLeave && isVirtual && <span className="flex items-center gap-1 text-[10px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full"><Plane size={8} />{r.leave_type_name || "ลา"}</span>}
                    {(r.ot_minutes || 0) > 0 && <span className="text-[10px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">OT {r.ot_minutes}น.</span>}
                  </div>
                </div>

                {/* deduction bar */}
                {(lateMin > 0 || earlyOutMin > 0) && (
                  <div className="flex deduct-bar">
                    {lateMin > 0 && <div className="flex-1 flex items-center gap-1.5 px-4 py-2 text-[10px] text-amber-700"><TrendingDown size={9} /><span>หักสาย: <strong>{lateMin} นาที</strong></span></div>}
                    {earlyOutMin > 0 && <div className="flex-1 flex items-center gap-1.5 px-4 py-2 text-[10px] text-orange-700 border-l border-dashed border-amber-100"><TrendingDown size={9} /><span>หักออกก่อน: <strong>{earlyOutMin} นาที</strong></span></div>}
                  </div>
                )}

                {/* actions */}
                {showActions && (
                  <div className={`flex divide-x ${isAbsent ? "border-t border-red-100 divide-red-100" : "border-t border-slate-100 divide-slate-100"}`}>
                    <Link href={`/app/leave/new?type=adjustment&date=${r.work_date}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <FileEdit size={11} /> ขอแก้ไขเวลา
                    </Link>
                    <Link href={`/app/leave/new?type=leave&date=${r.work_date}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black text-violet-600 hover:bg-violet-50 transition-colors">
                      <CalendarClock size={11} /> ยื่นใบลา
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Holidays ───────────────────────────────────────────── */}
        {Object.keys(holidayMap).filter(d => d.startsWith(monthPfx)).length > 0 && (
          <div className="px-4 mt-4 fade-up-5">
            <div className="glass-card rounded-3xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">วันหยุดบริษัทเดือนนี้</p>
              <div className="space-y-2">
                {(Object.entries(holidayMap) as [string, string][])
                  .filter(([d]) => d.startsWith(monthPfx))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, name]) => (
                    <div key={date} className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 flex flex-col items-center justify-center flex-shrink-0">
                        <p className="text-sm font-black text-rose-600 leading-none">{date.split("-")[2]}</p>
                        <p className="text-[8px] text-rose-400 font-medium">{format(new Date(date + "T00:00:00"), "EEE", { locale: th })}</p>
                      </div>
                      <p className="text-xs font-semibold text-rose-700">{name}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
