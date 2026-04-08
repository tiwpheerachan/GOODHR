"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ChevronLeft, ChevronRight, Loader2, Calendar, Users, X,
  AlertTriangle, UserCheck, Clock, CalendarDays, Check,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

type DayData = {
  team_size: number; working: number; quota_pct: number; quota_ok: boolean
  on_leave: { employee_id: string; name: string; avatar_url: string | null; leave_type: string | null; request_id: string }[]
  pending: { employee_id: string; name: string; avatar_url: string | null; leave_type: string | null; request_id: string }[]
}

type Balance = { employee_id: string; leave_type: string | null; entitled_days: number; used_days: number; pending_days: number; remaining_days: number }

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]

export default function ManagerLeaveCalendarPage() {
  const { user } = useAuth()
  const empId = (user as any)?.employee_id ?? (user as any)?.employee?.id

  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), "yyyy-MM"))
  const [days, setDays] = useState<Record<string, DayData>>({})
  const [employees, setEmployees] = useState<any[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"calendar" | "balances">("calendar")
  const [approving, setApproving] = useState<string | null>(null)

  const loadCalendar = useCallback(async () => {
    if (!empId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leave/calendar?month=${currentMonth}&manager_id=${empId}`)
      const data = await res.json()
      setDays(data.days ?? {})
      setEmployees(data.employees ?? [])
      setBalances(data.balances ?? [])
    } catch {
      toast.error("โหลดข้อมูลปฏิทินไม่สำเร็จ")
    }
    setLoading(false)
  }, [currentMonth, empId])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    setCurrentMonth(format(new Date(y, m - 2, 1), "yyyy-MM"))
    setSelectedDay(null)
  }
  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    setCurrentMonth(format(new Date(y, m, 1), "yyyy-MM"))
    setSelectedDay(null)
  }

  const handleApproveReject = async (requestId: string, action: "approve" | "reject") => {
    setApproving(requestId)
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_id: requestId, request_type: "leave" }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "เกิดข้อผิดพลาด")
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      loadCalendar()
    } catch (err: any) {
      toast.error(err.message)
    }
    setApproving(null)
  }

  const [yearNum, monthNum] = currentMonth.split("-").map(Number)
  const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate()
  let startDow = firstDayOfMonth.getDay() - 1
  if (startDow < 0) startDow = 6

  const calendarCells: (string | null)[] = []
  for (let i = 0; i < startDow; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(`${currentMonth}-${String(d).padStart(2, "0")}`)

  const today = format(new Date(), "yyyy-MM-dd")
  const selectedDayData = selectedDay ? days[selectedDay] : null

  // Group balances
  const balancesByEmp: Record<string, { emp: any; balances: Balance[] }> = {}
  for (const b of balances) {
    if (!balancesByEmp[b.employee_id]) {
      const emp = employees.find(e => e.id === b.employee_id)
      if (emp) balancesByEmp[b.employee_id] = { emp, balances: [] }
    }
    if (balancesByEmp[b.employee_id]) balancesByEmp[b.employee_id].balances.push(b)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays size={18} className="text-indigo-500" /> ปฏิทินการลา
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">ดูภาพรวมการลาลูกน้องรายเดือน</p>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "calendar" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"}`}>
              ปฏิทิน
            </button>
            <button onClick={() => setActiveTab("balances")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "balances" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"}`}>
              สิทธิลา
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {activeTab === "calendar" ? (
          <>
            {/* Month navigation */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-all"><ChevronLeft size={16} /></button>
                <h3 className="text-sm font-black text-gray-800">
                  {format(new Date(yearNum, monthNum - 1), "MMMM yyyy", { locale: th })}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-all"><ChevronRight size={16} /></button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
              ) : (
                <div className="p-2">
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map(w => (
                      <div key={w} className="text-center text-[10px] font-bold text-gray-400 py-1">{w}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((dateStr, i) => {
                      if (!dateStr) return <div key={`e-${i}`} />
                      const dayData = days[dateStr]
                      const dayNum = parseInt(dateStr.split("-")[2])
                      const isToday = dateStr === today
                      const isSelected = dateStr === selectedDay
                      const leaveCount = dayData ? dayData.on_leave.length : 0
                      const pendingCount = dayData ? dayData.pending.length : 0
                      const quotaPct = dayData?.quota_pct ?? 100
                      const isWeekend = (i % 7 === 5) || (i % 7 === 6)

                      let bgColor = "bg-white"
                      if (isSelected) bgColor = "bg-indigo-50 ring-2 ring-indigo-400"
                      else if (isToday) bgColor = "bg-blue-50"

                      let quotaColor = "text-emerald-500"
                      if (quotaPct < 60) quotaColor = "text-red-500"
                      else if (quotaPct < 70) quotaColor = "text-amber-500"

                      return (
                        <button key={dateStr} onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                          className={`relative rounded-xl p-1 text-left transition-all active:scale-95 ${bgColor} ${isWeekend ? "opacity-60" : ""} min-h-[62px] flex flex-col`}>
                          <span className={`text-[11px] font-bold ${isToday ? "text-blue-600" : "text-gray-600"}`}>{dayNum}</span>
                          {dayData && dayData.team_size > 0 && (
                            <div className="flex-1 flex flex-col justify-end gap-0.5 mt-0.5">
                              <span className={`text-[9px] font-bold ${quotaColor}`}>{dayData.working}/{dayData.team_size}</span>
                              {leaveCount > 0 && <span className="text-[8px] font-bold text-red-400 bg-red-50 rounded px-1 w-fit">{leaveCount}ลา</span>}
                              {pendingCount > 0 && <span className="text-[8px] font-bold text-amber-500 bg-amber-50 rounded px-1 w-fit">{pendingCount}รอ</span>}
                            </div>
                          )}
                          {quotaPct < 60 && dayData && !isWeekend && (
                            <div className="absolute top-0.5 right-0.5">
                              <AlertTriangle size={8} className="text-red-400" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Day detail */}
            {selectedDay && selectedDayData && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <h4 className="text-sm font-black text-gray-800">
                    {format(new Date(selectedDay + "T00:00:00"), "EEEEที่ d MMMM", { locale: th })}
                  </h4>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
                </div>

                <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-50">
                  <div className="text-center">
                    <p className="text-lg font-black text-gray-800">{selectedDayData.team_size}</p>
                    <p className="text-[9px] text-gray-400">ทีม</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-600">{selectedDayData.working}</p>
                    <p className="text-[9px] text-gray-400">ทำงาน</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-red-500">{selectedDayData.on_leave.length}</p>
                    <p className="text-[9px] text-gray-400">ลา</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-black ${selectedDayData.quota_ok ? "text-emerald-600" : "text-red-500"}`}>{selectedDayData.quota_pct}%</p>
                    <p className="text-[9px] text-gray-400">โควต้า</p>
                  </div>
                </div>

                {!selectedDayData.quota_ok && (
                  <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-red-600">คนน้อยกว่า 60% — ควรระวังก่อนอนุมัติเพิ่ม</span>
                  </div>
                )}

                <div className="px-4 py-3 space-y-3">
                  {selectedDayData.on_leave.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">ลา (อนุมัติแล้ว)</p>
                      {selectedDayData.on_leave.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-500 flex-shrink-0 overflow-hidden">
                            {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                          </div>
                          <p className="text-xs font-bold text-gray-700 flex-1 truncate">{m.name}</p>
                          <span className="text-[10px] text-red-500 font-bold">{m.leave_type}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDayData.pending.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">รออนุมัติ</p>
                      {selectedDayData.pending.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 flex-shrink-0 overflow-hidden">
                            {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                          </div>
                          <p className="text-xs font-bold text-gray-700 flex-1 truncate">{m.name}</p>
                          <span className="text-[10px] text-amber-500 font-bold mr-1">{m.leave_type}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleApproveReject(m.request_id, "reject")}
                              disabled={approving === m.request_id}
                              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-100 transition-colors">
                              <X size={10} className="text-gray-400" />
                            </button>
                            <button onClick={() => handleApproveReject(m.request_id, "approve")}
                              disabled={approving === m.request_id}
                              className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors">
                              {approving === m.request_id ? <Loader2 size={10} className="animate-spin text-emerald-500" /> : <Check size={10} className="text-emerald-600" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDayData.on_leave.length === 0 && selectedDayData.pending.length === 0 && (
                    <div className="text-center py-4 text-gray-300">
                      <UserCheck size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-bold">ไม่มีใครลา</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Balances tab */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-800">สิทธิวันลาทีมของฉัน</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">ปี {yearNum + 543} · {employees.length} คน</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
            ) : Object.keys(balancesByEmp).length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <Calendar size={28} className="mx-auto mb-2" />
                <p className="text-xs font-bold">ไม่พบข้อมูลสิทธิวันลา</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {Object.values(balancesByEmp).map(({ emp, balances: bals }) => {
                  const totalEntitled = bals.reduce((s, b) => s + (b.entitled_days || 0), 0)
                  const totalUsed = bals.reduce((s, b) => s + (b.used_days || 0), 0)
                  const totalRemaining = bals.reduce((s, b) => s + (b.remaining_days || 0), 0)
                  const pct = totalEntitled > 0 ? Math.round((totalUsed / totalEntitled) * 100) : 0

                  return (
                    <div key={emp.id} className="px-4 py-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 overflow-hidden">
                          {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{emp.full_name || emp.name}</p>
                          <p className="text-[10px] text-gray-400">{emp.code}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${totalRemaining <= 1 ? "text-red-500" : totalRemaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>{totalRemaining}</p>
                          <p className="text-[9px] text-gray-400">เหลือ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[9px] text-gray-400 tabular-nums w-14 text-right">{totalUsed}/{totalEntitled}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {bals.map((b, bi) => (
                          <span key={bi} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">{b.leave_type}: {b.used_days}/{b.entitled_days}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
