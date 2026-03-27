"use client"
import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Clock, Sun, Moon, Coffee, Calendar, CalendarClock } from "lucide-react"
import Link from "next/link"

const TH_DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
const TH_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

interface ShiftInfo { id: string; name: string; work_start: string; work_end: string }
interface DayInfo {
  date: string
  assignment: {
    assignment_type: "work" | "dayoff" | "leave" | "holiday"
    shift?: ShiftInfo
    leave_type?: string
  } | null
}

// ── Shift Colors ──────────────────────────────────────────────────
const SHIFT_COLORS: Record<string, { gradient: string; icon: string; badge: string }> = {
  "09": { gradient: "from-blue-500 to-blue-600", icon: "☀️", badge: "bg-blue-100 text-blue-700" },
  "10": { gradient: "from-cyan-500 to-cyan-600", icon: "🌤", badge: "bg-cyan-100 text-cyan-700" },
  "11": { gradient: "from-violet-500 to-violet-600", icon: "⛅", badge: "bg-violet-100 text-violet-700" },
  "12": { gradient: "from-amber-500 to-amber-600", icon: "🌞", badge: "bg-amber-100 text-amber-700" },
  "13": { gradient: "from-rose-500 to-rose-600", icon: "🌅", badge: "bg-rose-100 text-rose-700" },
  "15": { gradient: "from-indigo-500 to-indigo-600", icon: "🌙", badge: "bg-indigo-100 text-indigo-700" },
}

function getShiftTheme(startTime: string | null | undefined) {
  if (!startTime) return { gradient: "from-slate-400 to-slate-500", icon: "😴", badge: "bg-slate-100 text-slate-600" }
  const hour = startTime.substring(0, 2)
  return SHIFT_COLORS[hour] ?? { gradient: "from-slate-500 to-slate-600", icon: "⏰", badge: "bg-slate-100 text-slate-600" }
}

export default function MySchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [schedule, setSchedule] = useState<DayInfo[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [canSelfSchedule, setCanSelfSchedule] = useState(false)

  const monthStr = `${year}-${String(month).padStart(2, "0")}`
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/shifts/my-schedule?month=${monthStr}`)
    const data = await res.json()
    if (data.success) {
      setSchedule(data.schedule)
      setProfile(data.profile)
      setCanSelfSchedule(data.can_self_schedule ?? false)
    }
    setLoading(false)
  }, [monthStr])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // ── Stats ──────────────────────────────────────────────────────
  const workDays = schedule.filter(d => d.assignment?.assignment_type === "work").length
  const dayoffs = schedule.filter(d => d.assignment?.assignment_type === "dayoff" || !d.assignment).length
  const leaves = schedule.filter(d => d.assignment?.assignment_type === "leave").length

  // ── Calendar Grid Helpers ──────────────────────────────────────
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const calendarCells: (DayInfo | null)[] = []
  for (let i = 0; i < firstDow; i++) calendarCells.push(null) // padding
  for (let i = 0; i < daysInMonth; i++) {
    calendarCells.push(schedule[i] ?? null)
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-[430px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1a2744 40%, #0f172a 100%)",
          boxShadow: "0 8px 32px rgba(15,23,42,.3)",
        }}
      >
        {/* Stars */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            }}
          />
        ))}

        <div className="flex items-center justify-between relative z-10">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-lg font-black">{TH_MONTHS[month]}</p>
            <p className="text-xs text-white/60 font-medium">{year + 543}</p>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mt-4 relative z-10">
          <div className="text-center">
            <p className="text-2xl font-black">{workDays}</p>
            <p className="text-[10px] text-white/60 font-bold">วันทำงาน</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{dayoffs}</p>
            <p className="text-[10px] text-white/60 font-bold">วันหยุด</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{leaves}</p>
            <p className="text-[10px] text-white/60 font-bold">วันลา</p>
          </div>
        </div>
      </div>

      {/* ── Self-Schedule Button ─────────────────────────────── */}
      {canSelfSchedule && (
        <Link href="/app/schedule/self-schedule"
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 hover:bg-violet-100 transition-colors">
          <CalendarClock size={16} className="text-violet-600" />
          <span className="text-sm font-bold text-violet-700">วางกะเอง (Self-Schedule)</span>
          <ChevronRight size={14} className="text-violet-400 ml-auto" />
        </Link>
      )}

      {/* ── View Toggle ────────────────────────────────────────── */}
      <div className="flex rounded-xl bg-slate-100 p-0.5">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === "calendar" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
        >
          <Calendar size={13} className="inline mr-1" /> ปฏิทิน
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
        >
          <Clock size={13} className="inline mr-1" /> รายการ
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : viewMode === "calendar" ? (
        /* ── Calendar View ──────────────────────────────────────── */
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {TH_DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-bold py-1 ${i === 0 || i === 6 ? "text-red-400" : "text-slate-400"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} />

              const d = new Date(cell.date)
              const dayNum = d.getDate()
              const isToday = cell.date === todayStr
              const aType = cell.assignment?.assignment_type
              const shiftStart = cell.assignment?.shift?.work_start

              let bg = "bg-white"
              let textColor = "text-slate-700"
              let badge = ""

              if (aType === "dayoff" || (!cell.assignment)) {
                bg = "bg-slate-50"
                textColor = "text-slate-400"
                badge = "OFF"
              } else if (aType === "leave") {
                bg = "bg-sky-50"
                textColor = "text-sky-600"
                badge = "ลา"
              } else if (aType === "holiday") {
                bg = "bg-red-50"
                textColor = "text-red-500"
                badge = "หยุด"
              } else if (aType === "work" && shiftStart) {
                const t = getShiftTheme(shiftStart)
                bg = t.badge.split(" ")[0]
                textColor = t.badge.split(" ")[1]
                badge = shiftStart.substring(0, 5)
              }

              return (
                <div
                  key={cell.date}
                  className={`rounded-xl p-1.5 text-center transition-all ${bg} ${isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
                >
                  <p className={`text-[11px] font-black ${textColor}`}>{dayNum}</p>
                  {badge && <p className={`text-[8px] font-bold ${textColor} mt-0.5`}>{badge}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── List View ──────────────────────────────────────────── */
        <div className="space-y-2">
          {schedule.map(day => {
            const d = new Date(day.date)
            const dow = d.getDay()
            const isToday = day.date === todayStr
            const aType = day.assignment?.assignment_type
            const shift = day.assignment?.shift

            if (aType === "dayoff" || (!day.assignment)) {
              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-slate-50 border border-slate-100 ${isToday ? "ring-2 ring-indigo-400" : ""}`}
                >
                  <div className="w-10 text-center">
                    <p className="text-[10px] font-bold text-slate-400">{TH_DAYS_SHORT[dow]}</p>
                    <p className="text-lg font-black text-slate-400">{d.getDate()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon size={16} className="text-slate-300" />
                    <span className="text-sm font-bold text-slate-400">วันหยุด</span>
                  </div>
                  {isToday && <span className="ml-auto text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">วันนี้</span>}
                </div>
              )
            }

            if (aType === "leave") {
              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-sky-50 border border-sky-100 ${isToday ? "ring-2 ring-indigo-400" : ""}`}
                >
                  <div className="w-10 text-center">
                    <p className="text-[10px] font-bold text-sky-400">{TH_DAYS_SHORT[dow]}</p>
                    <p className="text-lg font-black text-sky-500">{d.getDate()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sky-700">วันลา</p>
                    {day.assignment?.leave_type && <p className="text-[10px] text-sky-500">{day.assignment.leave_type}</p>}
                  </div>
                  {isToday && <span className="ml-auto text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">วันนี้</span>}
                </div>
              )
            }

            const theme = getShiftTheme(shift?.work_start)
            return (
              <div
                key={day.date}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-sm ${isToday ? "ring-2 ring-indigo-400" : ""}`}
              >
                <div className="w-10 text-center">
                  <p className={`text-[10px] font-bold ${dow === 0 || dow === 6 ? "text-red-400" : "text-slate-400"}`}>{TH_DAYS_SHORT[dow]}</p>
                  <p className="text-lg font-black text-slate-800">{d.getDate()}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg`}>
                  {theme.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{shift?.name ?? "ทำงาน"}</p>
                  <p className="text-xs text-slate-500">
                    {shift?.work_start?.substring(0, 5)} — {shift?.work_end?.substring(0, 5)}
                  </p>
                </div>
                {isToday && <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">วันนี้</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Twinkle Keyframes ──────────────────────────────────── */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
