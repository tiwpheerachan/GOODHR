"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { ChevronLeft, ChevronRight, Users, Clock, Moon, AlertCircle } from "lucide-react"

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

const SHIFT_COLORS: Record<string, string> = {
  "07:00": "bg-emerald-500",
  "09:00": "bg-blue-500", "10:00": "bg-cyan-500", "10:30": "bg-teal-500",
  "11:00": "bg-purple-500", "12:00": "bg-amber-500", "12:30": "bg-orange-500",
  "13:00": "bg-rose-500", "15:30": "bg-indigo-500", "16:00": "bg-fuchsia-500",
}

function getShiftColor(start: string | null) {
  if (!start) return "bg-slate-400"
  return SHIFT_COLORS[start.substring(0, 5)] ?? "bg-slate-500"
}

interface DaySummary {
  date: string
  work: number
  dayoff: number
  empty: number
  workers: { name: string; shift_start: string | null; type: string }[]
}

export default function ManagerCalendarPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummary>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [totalEmployees, setTotalEmployees] = useState(0)

  const monthStr = `${year}-${String(month).padStart(2, "0")}`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/shifts/monthly?month=${monthStr}&schedule_type=all`)
    const data = await res.json()
    if (data.success) {
      setTotalEmployees(data.total_employees ?? data.grid?.length ?? 0)
      const summaries: Record<string, DaySummary> = {}

      for (const dateStr of (data.days ?? [])) {
        const summary: DaySummary = { date: dateStr, work: 0, dayoff: 0, empty: 0, workers: [] }
        for (const row of (data.grid ?? [])) {
          const day = row.days.find((d: any) => d.date === dateStr)
          const a = day?.assignment
          if (!a) {
            summary.empty++
          } else if (a.assignment_type === "dayoff") {
            summary.dayoff++
          } else if (a.assignment_type === "work") {
            summary.work++
            summary.workers.push({
              name: `${row.employee.first_name_th} ${row.employee.last_name_th?.[0] ?? ""}.`,
              shift_start: a.shift?.work_start ?? null,
              type: "work",
            })
          }
        }
        summaries[dateStr] = summary
      }
      setDaySummaries(summaries)
    }
    setLoading(false)
  }, [monthStr])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1)
  const startDow = firstDay.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const todayStr = now.toISOString().split("T")[0]
  const selectedSummary = selectedDate ? daySummaries[selectedDate] : null

  return (
    <div className="px-4 py-4 space-y-4 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-base font-black text-slate-800">{TH_MONTHS[month]} {year + 543}</p>
          <p className="text-[10px] text-slate-400">ปฏิทินตารางงานทีม · {totalEmployees} คน</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {TH_DAYS.map((d, i) => (
                <div key={d} className={`py-2 text-center text-[10px] font-bold ${i === 0 || i === 6 ? "text-red-400" : "text-slate-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((dayNum, idx) => {
                if (dayNum === null) return <div key={idx} className="aspect-square" />

                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                const summary = daySummaries[dateStr]
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dow = new Date(dateStr).getDay()
                const isWeekend = dow === 0 || dow === 6
                const workCount = summary?.work ?? 0
                const ratio = totalEmployees > 0 ? workCount / totalEmployees : 0

                // Color intensity based on ratio
                let bgClass = ""
                if (ratio >= 0.8) bgClass = "bg-emerald-100"
                else if (ratio >= 0.5) bgClass = "bg-emerald-50"
                else if (ratio > 0) bgClass = "bg-amber-50"
                else bgClass = isWeekend ? "bg-red-50/40" : ""

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center relative border border-transparent transition-all ${bgClass} ${
                      isSelected ? "ring-2 ring-indigo-400 rounded-lg z-10" : ""
                    } ${isToday ? "ring-2 ring-indigo-200 rounded-lg" : ""}`}
                  >
                    <span className={`text-[11px] font-bold ${isToday ? "text-indigo-600" : isWeekend ? "text-red-400" : "text-slate-700"}`}>
                      {dayNum}
                    </span>
                    {summary && workCount > 0 && (
                      <span className={`text-[8px] font-black ${ratio >= 0.8 ? "text-emerald-600" : ratio >= 0.5 ? "text-emerald-500" : "text-amber-500"}`}>
                        {workCount}
                      </span>
                    )}
                    {summary && (summary.empty ?? 0) > 0 && workCount === 0 && (
                      <span className="text-[8px] text-slate-300">-</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> มาครบ</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-100" /> มา &gt;50%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-100" /> มา &lt;50%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-slate-200" /> ไม่มีข้อมูล</span>
            <span className="text-slate-400 ml-auto">ตัวเลข = จำนวนคนทำงาน</span>
          </div>

          {/* Selected Day Detail */}
          {selectedSummary && (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                <p className="text-sm font-black text-indigo-800">
                  {new Date(selectedDate!).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Clock size={11} /> ทำงาน {selectedSummary.work} คน
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Moon size={11} /> หยุด {selectedSummary.dayoff} คน
                  </span>
                  {selectedSummary.empty > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <AlertCircle size={11} /> ยังไม่จัด {selectedSummary.empty} คน
                    </span>
                  )}
                </div>
              </div>

              {/* Workers list */}
              {selectedSummary.workers.length > 0 ? (
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {selectedSummary.workers.map((w, i) => {
                    const sc = getShiftColor(w.shift_start)
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className={`w-2 h-2 rounded-full ${sc}`} />
                        <span className="text-xs font-bold text-slate-700 flex-1">{w.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {w.shift_start ? w.shift_start.substring(0, 5) : "-"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  ไม่มีคนทำงานวันนี้
                </div>
              )}
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {(() => {
              const allDates = Object.values(daySummaries)
              const avgWork = allDates.length > 0 ? Math.round(allDates.reduce((s, d) => s + d.work, 0) / allDates.length) : 0
              const totalDayoffs = allDates.reduce((s, d) => s + d.dayoff, 0)
              const totalEmpty = allDates.reduce((s, d) => s + d.empty, 0)
              return (
                <>
                  <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                    <p className="text-lg font-black text-emerald-600">{avgWork}</p>
                    <p className="text-[10px] text-slate-400 font-bold">คนทำงาน/วัน (เฉลี่ย)</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                    <p className="text-lg font-black text-slate-500">{totalDayoffs}</p>
                    <p className="text-[10px] text-slate-400 font-bold">วันหยุดรวม</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
                    <p className="text-lg font-black text-amber-500">{totalEmpty}</p>
                    <p className="text-[10px] text-slate-400 font-bold">ยังไม่จัดรวม</p>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
