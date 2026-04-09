"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ChevronLeft, ChevronRight, Loader2, Calendar, Users, X,
  Check, AlertTriangle, UserCheck, Clock, CalendarDays,
  Search, Download, Filter, BarChart3, ChevronDown,
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
  const [searchText, setSearchText] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Balances tab: sorting & expanded
  const [sortBy, setSortBy] = useState<"name" | "used" | "remaining">("name")
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(t)
  }, [searchText])

  useEffect(() => {
    supabase.from("companies").select("id,code").eq("is_active", true).order("code").then(({ data }) => setCompanies(data ?? []))
    supabase.from("departments").select("id,name").order("name").then(({ data }) => setDepartments(data ?? []))
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
    else params.set("company_id", "all")
    if (filterDept) params.set("department_id", filterDept)
    if (filterManager) params.set("manager_id", filterManager)
    if (debouncedSearch) params.set("search", debouncedSearch)

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
  }, [currentMonth, filterCompany, filterDept, filterManager, debouncedSearch])

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

  // ── Group balances by employee ──
  const balancesByEmp: Record<string, { emp: Employee; balances: Balance[] }> = {}
  for (const b of balances) {
    if (!balancesByEmp[b.employee_id]) {
      const emp = employees.find(e => e.id === b.employee_id)
      if (emp) balancesByEmp[b.employee_id] = { emp, balances: [] }
    }
    if (balancesByEmp[b.employee_id]) balancesByEmp[b.employee_id].balances.push(b)
  }

  // Also include employees without balances
  for (const emp of employees) {
    if (!balancesByEmp[emp.id]) {
      balancesByEmp[emp.id] = { emp, balances: [] }
    }
  }

  // Sort
  const sortedEmps = Object.values(balancesByEmp).sort((a, b) => {
    if (sortBy === "name") return (a.emp.full_name || "").localeCompare(b.emp.full_name || "", "th")
    if (sortBy === "used") {
      const aUsed = a.balances.reduce((s, bl) => s + (bl.used_days || 0), 0)
      const bUsed = b.balances.reduce((s, bl) => s + (bl.used_days || 0), 0)
      return bUsed - aUsed
    }
    if (sortBy === "remaining") {
      const aRem = a.balances.reduce((s, bl) => s + (bl.remaining_days || 0), 0)
      const bRem = b.balances.reduce((s, bl) => s + (bl.remaining_days || 0), 0)
      return aRem - bRem
    }
    return 0
  })

  // ── Summary stats ──
  const totalEmployees = employees.length
  const empWithBalances = Object.values(balancesByEmp).filter(v => v.balances.length > 0).length
  const empNoBalances = totalEmployees - empWithBalances
  const totalUsedAll = balances.reduce((s, b) => s + (b.used_days || 0), 0)
  const totalEntitledAll = balances.reduce((s, b) => s + (b.entitled_days || 0), 0)

  // ── Collect unique leave types ──
  const leaveTypeSet = new Set<string>()
  for (const b of balances) { if (b.leave_type) leaveTypeSet.add(b.leave_type) }
  const leaveTypes = Array.from(leaveTypeSet).sort()

  // ── Export XLSX ──
  const [exporting, setExporting] = useState(false)
  const exportXLSX = async () => {
    if (sortedEmps.length === 0) return toast.error("ไม่มีข้อมูลให้ดาวน์โหลด")
    setExporting(true)
    try {
      const params = new URLSearchParams({ month: currentMonth })
      if (filterCompany) params.set("company_id", filterCompany)
      else params.set("company_id", "all")
      if (filterDept) params.set("department_id", filterDept)
      if (filterManager) params.set("manager_id", filterManager)
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/leave/calendar/export?${params.toString()}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `สรุปสิทธิวันลา_${currentMonth}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("ดาวน์โหลดสำเร็จ")
    } catch {
      toast.error("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่")
    }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-600" /> ปฏิทินการลา
          </h2>
          <p className="text-xs text-slate-400">ดูภาพรวมการลาของทีม / แผนก / ทั้งบริษัท</p>
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
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
        {/* Search + toggle filters */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="ค้นหาชื่อ / รหัสพนักงาน..."
              className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={12} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            <Filter size={12} />
            ตัวกรอง
            {(filterCompany || filterDept || filterManager) && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">ทุกบริษัท</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">ทุกแผนก</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">ทุกหัวหน้า</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.nickname || m.first_name_th} {m.last_name_th}</option>)}
            </select>
          </div>
        )}
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
        /* ════════════════════════════════════════════════════════
           BALANCES TAB — ปรับปรุงใหม่
           ════════════════════════════════════════════════════════ */
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-black text-slate-800">{totalEmployees}</p>
              <p className="text-[10px] text-slate-400">พนักงานทั้งหมด</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-black text-emerald-600">{empWithBalances}</p>
              <p className="text-[10px] text-slate-400">มีข้อมูลลา</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-black text-amber-500">{empNoBalances}</p>
              <p className="text-[10px] text-slate-400">ยังไม่มีข้อมูล</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-black text-indigo-600">{totalEntitledAll > 0 ? Math.round((totalUsedAll / totalEntitledAll) * 100) : 0}%</p>
              <p className="text-[10px] text-slate-400">ใช้ลาแล้ว</p>
            </div>
          </div>

          {/* Toolbar: sort + export */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800">สรุปสิทธิวันลา ปี {yearNum + 543}</h3>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{sortedEmps.length} คน</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 outline-none">
                  <option value="name">เรียงตามชื่อ</option>
                  <option value="used">ใช้ลามากสุด</option>
                  <option value="remaining">เหลือน้อยสุด</option>
                </select>
                {/* Export */}
                <button onClick={exportXLSX} disabled={exporting}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 disabled:opacity-50">
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {exporting ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
            ) : sortedEmps.length === 0 ? (
              <div className="text-center py-16 text-slate-300">
                <Calendar size={32} className="mx-auto mb-2" />
                <p className="text-sm font-bold">ไม่พบข้อมูล</p>
                <p className="text-xs text-slate-300 mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
              </div>
            ) : (
              <>
                {/* Table header (leave types) */}
                {leaveTypes.length > 0 && (
                  <div className="hidden md:grid border-b border-slate-100 px-4 py-2 bg-slate-50/50"
                    style={{ gridTemplateColumns: `2.5fr repeat(${leaveTypes.length}, 1fr) 1fr` }}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">พนักงาน</div>
                    {leaveTypes.map(lt => (
                      <div key={lt} className="text-[10px] font-bold text-slate-400 text-center truncate px-1">{lt}</div>
                    ))}
                    <div className="text-[10px] font-bold text-slate-400 text-center">คงเหลือ</div>
                  </div>
                )}

                {/* Employee rows */}
                <div className="divide-y divide-slate-50">
                  {sortedEmps.map(({ emp, balances: bals }) => {
                    const totalEntitled = bals.reduce((s, b) => s + (b.entitled_days || 0), 0)
                    const totalUsed = bals.reduce((s, b) => s + (b.used_days || 0), 0)
                    const totalRemaining = bals.reduce((s, b) => s + (b.remaining_days || 0), 0)
                    const totalPending = bals.reduce((s, b) => s + (b.pending_days || 0), 0)
                    const pct = totalEntitled > 0 ? Math.round((totalUsed / totalEntitled) * 100) : 0
                    const isExpanded = expandedEmp === emp.id
                    const hasData = bals.length > 0

                    return (
                      <div key={emp.id} className={`transition-all ${isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50/50"}`}>
                        {/* Main row */}
                        <button onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                          className="w-full text-left px-4 py-2.5">

                          {/* Mobile layout */}
                          <div className="md:hidden">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 overflow-hidden">
                                {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.name?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{emp.full_name}</p>
                                <p className="text-[10px] text-slate-400">{emp.code} · {emp.department || "-"}</p>
                              </div>
                              {hasData ? (
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-sm font-black ${totalRemaining <= 1 ? "text-red-500" : totalRemaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                                    {totalRemaining}
                                  </p>
                                  <p className="text-[9px] text-slate-400">{totalUsed}/{totalEntitled}</p>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">ไม่มีข้อมูล</span>
                              )}
                              <ChevronDown size={12} className={`text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                            {hasData && (
                              <div className="mt-1.5 ml-11">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <span className="text-[9px] text-slate-400 tabular-nums">{pct}%</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Desktop layout (table row) */}
                          {leaveTypes.length > 0 && (
                            <div className="hidden md:grid items-center"
                              style={{ gridTemplateColumns: `2.5fr repeat(${leaveTypes.length}, 1fr) 1fr` }}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 flex-shrink-0 overflow-hidden">
                                  {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.name?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{emp.full_name}</p>
                                  <p className="text-[9px] text-slate-400 truncate">{emp.code} · {emp.department || "-"} · {emp.position || "-"}</p>
                                </div>
                              </div>
                              {leaveTypes.map(lt => {
                                const b = bals.find(bl => bl.leave_type === lt)
                                if (!b) return <div key={lt} className="text-center text-[10px] text-slate-200">—</div>
                                const usePct = b.entitled_days > 0 ? (b.used_days / b.entitled_days) * 100 : 0
                                return (
                                  <div key={lt} className="text-center">
                                    <span className={`text-[11px] font-black tabular-nums ${usePct > 80 ? "text-red-500" : usePct > 50 ? "text-amber-500" : "text-slate-600"}`}>
                                      {b.used_days}/{b.entitled_days}
                                    </span>
                                  </div>
                                )
                              })}
                              <div className="text-center">
                                <span className={`text-xs font-black ${totalRemaining <= 1 ? "text-red-500" : totalRemaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                                  {totalRemaining}
                                </span>
                              </div>
                            </div>
                          )}
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && hasData && (
                          <div className="px-4 pb-3 pt-0">
                            <div className="bg-white rounded-xl border border-slate-200 p-3">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {bals.map((b, bi) => {
                                  const usePct = b.entitled_days > 0 ? Math.round((b.used_days / b.entitled_days) * 100) : 0
                                  return (
                                    <div key={bi} className="bg-slate-50 rounded-lg p-2.5">
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        {b.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />}
                                        <span className="text-[10px] font-bold text-slate-600 truncate">{b.leave_type}</span>
                                      </div>
                                      <div className="flex items-end justify-between">
                                        <div>
                                          <span className={`text-lg font-black ${b.remaining_days <= 0 ? "text-red-500" : b.remaining_days <= 2 ? "text-amber-500" : "text-emerald-600"}`}>
                                            {b.remaining_days}
                                          </span>
                                          <span className="text-[10px] text-slate-400 ml-0.5">/ {b.entitled_days}</span>
                                        </div>
                                      </div>
                                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                                        <div className={`h-full rounded-full ${usePct > 80 ? "bg-red-400" : usePct > 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                                          style={{ width: `${Math.min(usePct, 100)}%` }} />
                                      </div>
                                      <div className="flex justify-between mt-1">
                                        <span className="text-[9px] text-slate-400">ใช้ {b.used_days}</span>
                                        {b.pending_days > 0 && <span className="text-[9px] text-amber-500">รอ {b.pending_days}</span>}
                                        {b.carried_over > 0 && <span className="text-[9px] text-indigo-400">ยก {b.carried_over}</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              {/* Total row */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">รวมทั้งหมด</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-slate-400">สิทธิ์ {totalEntitled}</span>
                                  <span className="text-[10px] text-slate-400">ใช้ {totalUsed}</span>
                                  {totalPending > 0 && <span className="text-[10px] text-amber-500">รอ {totalPending}</span>}
                                  <span className={`text-xs font-black ${totalRemaining <= 1 ? "text-red-500" : totalRemaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>เหลือ {totalRemaining}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expanded but no data */}
                        {isExpanded && !hasData && (
                          <div className="px-4 pb-3">
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                              <Calendar size={20} className="mx-auto mb-1 text-slate-300" />
                              <p className="text-[11px] text-slate-400">ยังไม่มีข้อมูลสิทธิวันลาของพนักงานคนนี้</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
