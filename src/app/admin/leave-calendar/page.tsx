"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ChevronLeft, ChevronRight, Loader2, Calendar, Users, X,
  Check, AlertTriangle, UserCheck, Clock, CalendarDays,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

type DayData = {
  team_size: number; working: number; quota_pct: number; quota_ok: boolean
  on_leave: { employee_id: string; name: string; avatar_url: string | null; leave_type: string | null; leave_color: string | null; request_id: string }[]
  pending: { employee_id: string; name: string; avatar_url: string | null; leave_type: string | null; leave_color: string | null; request_id: string }[]
}

type Employee = { id: string; name: string; full_name: string; code: string; avatar_url: string | null; department: string | null; position: string | null }
type Balance = { employee_id: string; leave_type: string | null; color: string | null; entitled_days: number; used_days: number; pending_days: number; remaining_days: number; carried_over: number }

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]

export default function AdminLeaveCalendarPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const companyId = (user as any)?.company_id ?? (user as any)?.employee?.company_id

  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), "yyyy-MM"))
  const [days, setDays] = useState<Record<string, DayData>>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"calendar" | "balances">("calendar")

  // Filters
  const [companies, setCompanies] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [filterCompany, setFilterCompany] = useState(companyId || "")
  const [filterDept, setFilterDept] = useState("")
  const [filterManager, setFilterManager] = useState("")

  useEffect(() => {
    supabase.from("companies").select("id,code").eq("is_active", true).order("code").then(({ data }) => setCompanies(data ?? []))
    supabase.from("departments").select("id,name").order("name").then(({ data }) => setDepartments(data ?? []))
    // Get managers (employees who have subordinates)
    supabase.from("employee_manager_history").select("manager_id").is("effective_to", null).then(({ data }) => {
      const mgrIds = Array.from(new Set((data ?? []).map((r: any) => r.manager_id)))
      if (mgrIds.length > 0) {
        supabase.from("employees").select("id, first_name_th, last_name_th, nickname").in("id", mgrIds).order("first_name_th").then(({ data: emps }) => setManagers(emps ?? []))
      }
    })
  }, [])

  useEffect(() => { if (companyId && !filterCompany) setFilterCompany(companyId) }, [companyId])

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ month: currentMonth })
    if (filterCompany) params.set("company_id", filterCompany)
    if (filterDept) params.set("department_id", filterDept)
    if (filterManager) params.set("manager_id", filterManager)

    try {
      const res = await fetch(`/api/leave/calendar?${params.toString()}`)
      const data = await res.json()
      setDays(data.days ?? {})
      setEmployees(data.employees ?? [])
      setBalances(data.balances ?? [])
    } catch {
      toast.error("โหลดข้อมูลปฏิทินไม่สำเร็จ")
    }
    setLoading(false)
  }, [currentMonth, filterCompany, filterDept, filterManager])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setCurrentMonth(format(d, "yyyy-MM"))
    setSelectedDay(null)
  }
  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    const d = new Date(y, m, 1)
    setCurrentMonth(format(d, "yyyy-MM"))
    setSelectedDay(null)
  }

  // Build calendar grid
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

  // Group balances by employee
  const balancesByEmp: Record<string, { emp: Employee; balances: Balance[] }> = {}
  for (const b of balances) {
    if (!balancesByEmp[b.employee_id]) {
      const emp = employees.find(e => e.id === b.employee_id)
      if (emp) balancesByEmp[b.employee_id] = { emp, balances: [] }
    }
    if (balancesByEmp[b.employee_id]) balancesByEmp[b.employee_id].balances.push(b)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-600" /> ปฏิทินการลา
          </h2>
          <p className="text-xs text-slate-400">ดูภาพรวมการลาของทีม / แผนก รายเดือน</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-0.5">
          <button onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "calendar" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
            ปฏิทิน
          </button>
          <button onClick={() => setActiveTab("balances")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "balances" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
            สิทธิวันลา
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="grid grid-cols-3 gap-2">
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none">
            <option value="">ทุกบริษัท</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none">
            <option value="">ทุกแผนก</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none">
            <option value="">ทุกหัวหน้า</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.nickname || m.first_name_th} {m.last_name_th}</option>)}
          </select>
        </div>
      </div>

      {activeTab === "calendar" ? (
        <>
          {/* Month navigation */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
              <h3 className="text-sm font-black text-slate-800">
                {format(new Date(yearNum, monthNum - 1), "MMMM yyyy", { locale: th })}
              </h3>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
            ) : (
              <div className="p-2">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map(w => (
                    <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((dateStr, i) => {
                    if (!dateStr) return <div key={`empty-${i}`} />
                    const dayData = days[dateStr]
                    const dayNum = parseInt(dateStr.split("-")[2])
                    const isToday = dateStr === today
                    const isSelected = dateStr === selectedDay
                    const leaveCount = dayData ? dayData.on_leave.length : 0
                    const pendingCount = dayData ? dayData.pending.length : 0
                    const quotaPct = dayData?.quota_pct ?? 100
                    const isWeekend = (i % 7 === 5) || (i % 7 === 6)

                    let bgColor = "bg-white hover:bg-slate-50"
                    if (isSelected) bgColor = "bg-indigo-50 ring-2 ring-indigo-400"
                    else if (isToday) bgColor = "bg-blue-50"

                    let quotaColor = "text-emerald-500"
                    if (quotaPct < 60) quotaColor = "text-red-500"
                    else if (quotaPct < 70) quotaColor = "text-amber-500"

                    return (
                      <button key={dateStr} onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                        className={`relative rounded-lg p-1 text-left transition-all ${bgColor} ${isWeekend ? "opacity-60" : ""} min-h-[68px] flex flex-col`}>
                        <span className={`text-[11px] font-bold ${isToday ? "text-blue-600" : "text-slate-600"}`}>{dayNum}</span>
                        {dayData && (
                          <div className="flex-1 flex flex-col justify-end gap-0.5 mt-0.5">
                            <span className={`text-[9px] font-bold ${quotaColor}`}>{dayData.working}/{dayData.team_size}</span>
                            {leaveCount > 0 && (
                              <span className="text-[8px] font-bold text-red-400 bg-red-50 rounded px-1 inline-block w-fit">{leaveCount} ลา</span>
                            )}
                            {pendingCount > 0 && (
                              <span className="text-[8px] font-bold text-amber-500 bg-amber-50 rounded px-1 inline-block w-fit">{pendingCount} รอ</span>
                            )}
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

          {/* Day detail drawer */}
          {selectedDay && selectedDayData && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-800">
                  {format(new Date(selectedDay + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th })}
                </h4>
                <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>

              {/* Summary bar */}
              <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-50">
                <div className="text-center">
                  <p className="text-lg font-black text-slate-800">{selectedDayData.team_size}</p>
                  <p className="text-[10px] text-slate-400">ทั้งหมด</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-emerald-600">{selectedDayData.working}</p>
                  <p className="text-[10px] text-slate-400">ทำงาน</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-red-500">{selectedDayData.on_leave.length}</p>
                  <p className="text-[10px] text-slate-400">ลา</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-black ${selectedDayData.quota_ok ? "text-emerald-600" : "text-red-500"}`}>{selectedDayData.quota_pct}%</p>
                  <p className="text-[10px] text-slate-400">โควต้า</p>
                </div>
              </div>

              {!selectedDayData.quota_ok && (
                <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-red-600">คนทำงานต่ำกว่า 60% — ควรพิจารณาก่อนอนุมัติเพิ่ม</span>
                </div>
              )}

              <div className="px-4 py-3 space-y-3">
                {/* On leave */}
                {selectedDayData.on_leave.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">ลา (อนุมัติแล้ว) — {selectedDayData.on_leave.length} คน</p>
                    <div className="space-y-1.5">
                      {selectedDayData.on_leave.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 bg-red-50/50 rounded-lg px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-500 flex-shrink-0 overflow-hidden">
                            {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{m.name}</p>
                          </div>
                          {m.leave_type && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{m.leave_type}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending */}
                {selectedDayData.pending.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">รออนุมัติ — {selectedDayData.pending.length} คน</p>
                    <div className="space-y-1.5">
                      {selectedDayData.pending.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 bg-amber-50/50 rounded-lg px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 flex-shrink-0 overflow-hidden">
                            {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{m.name}</p>
                          </div>
                          {m.leave_type && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">{m.leave_type}</span>
                          )}
                          <Clock size={10} className="text-amber-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDayData.on_leave.length === 0 && selectedDayData.pending.length === 0 && (
                  <div className="text-center py-6 text-slate-300">
                    <UserCheck size={24} className="mx-auto mb-1" />
                    <p className="text-xs font-bold">ไม่มีใครลาวันนี้</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Balances tab */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800">สรุปสิทธิวันลา ปี {yearNum + 543}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{employees.length} พนักงาน</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
          ) : Object.keys(balancesByEmp).length === 0 ? (
            <div className="text-center py-16 text-slate-300">
              <Calendar size={32} className="mx-auto mb-2" />
              <p className="text-sm font-bold">ไม่พบข้อมูลสิทธิวันลา</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
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
                        <p className="text-xs font-bold text-slate-800 truncate">{emp.full_name}</p>
                        <p className="text-[10px] text-slate-400">{emp.code} · {emp.department} · {emp.position}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${totalRemaining <= 1 ? "text-red-500" : totalRemaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>{totalRemaining}</p>
                        <p className="text-[9px] text-slate-400">เหลือ</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400 tabular-nums w-16 text-right">{totalUsed}/{totalEntitled} วัน</span>
                    </div>
                    {/* Leave type breakdown */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {bals.map((b, bi) => (
                        <span key={bi} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                          {b.leave_type}: {b.used_days}/{b.entitled_days}
                        </span>
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
  )
}
