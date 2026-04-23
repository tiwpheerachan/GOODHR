"use client"
import React, { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Search, Loader2, Calendar, ChevronDown, Download,
  AlertTriangle, Filter, Users, BarChart3, Pencil, X, Check,
} from "lucide-react"
import toast from "react-hot-toast"

interface Emp {
  id: string; employee_code: string
  first_name_th: string; last_name_th: string; nickname?: string
  company_id: string
  department?: { id: string; name: string }
  branch?: { name: string }
  company?: { code: string; name_th: string }
}
interface Balance {
  id: string; employee_id: string; leave_type_id: string; year: number
  entitled_days: number; used_days: number; pending_days: number
  remaining_days: number; carried_over: number
}
interface LeaveType {
  id: string; name: string; company_id: string; color_hex: string
  is_paid: boolean; is_active: boolean
}
interface Dept { id: string; name: string; company_id: string }

export default function LeaveQuotaPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"
  const userCompanyId = user?.employee?.company_id || (user as any)?.company_id

  const [employees, setEmployees] = useState<Emp[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [departments, setDepartments] = useState<Dept[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCo, setSelectedCo] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [year, setYear] = useState(new Date().getFullYear())
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

  // Edit modal
  const [editEmp, setEditEmp] = useState<Emp | null>(null)
  const [editBalances, setEditBalances] = useState<any[]>([])
  const [editSaving, setEditSaving] = useState(false)

  // ── Load data ──
  useEffect(() => {
    const cid = selectedCo || userCompanyId || "all"
    if (!cid) return
    setLoading(true)
    const params = new URLSearchParams({ company_id: cid, year: year.toString() })
    if (selectedDept !== "all") params.set("dept_id", selectedDept)

    fetch(`/api/admin/leave-quota?${params}`)
      .then(r => r.json())
      .then(d => {
        setEmployees(d.employees || [])
        setBalances(d.balances || [])
        setLeaveTypes(d.leaveTypes || [])
        setDepartments(d.departments || [])
        setLeaveRequests(d.leaveRequests || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedCo, selectedDept, year, userCompanyId, isSuperAdmin])

  // ── Filtered leave types (common ones first) ──
  const mainLeaveTypes = useMemo(() => {
    const priority = ["ลาป่วย", "ลากิจ", "ลาพักร้อน"]
    const cid = isSuperAdmin && selectedCo !== "all" ? selectedCo : userCompanyId
    const types = leaveTypes.filter(lt => !cid || lt.company_id === cid)
    return types.sort((a, b) => {
      const ai = priority.indexOf(a.name)
      const bi = priority.indexOf(b.name)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.name.localeCompare(b.name, "th")
    })
  }, [leaveTypes, selectedCo, userCompanyId, isSuperAdmin])

  // ── Core 3 leave types for table header ──
  const coreTypes = useMemo(() => {
    return mainLeaveTypes.filter(lt =>
      ["ลาป่วย", "ลากิจ", "ลาพักร้อน"].includes(lt.name)
    )
  }, [mainLeaveTypes])

  // ── Search & filter ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return employees.filter(e => {
      if (q) {
        const full = `${e.employee_code} ${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.department?.name || ""}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [employees, search])

  // ── Balance lookup helper ──
  // When viewing "all companies", each company has its own leave_type_ids
  // So we need to match by leave type NAME for the employee's company
  const getBalanceByName = (empId: string, ltName: string): Balance | undefined => {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return undefined
    // Find the leave type with this name for the employee's company
    const lt = leaveTypes.find(t => t.name === ltName && t.company_id === emp.company_id)
    if (!lt) return undefined
    return balances.find(b => b.employee_id === empId && b.leave_type_id === lt.id)
  }

  const getBalance = (empId: string, ltId: string): Balance | undefined =>
    balances.find(b => b.employee_id === empId && b.leave_type_id === ltId)

  // ── Summary stats ──
  const stats = useMemo(() => {
    const empWithBalance = new Set(balances.map(b => b.employee_id))
    const totalUsed = balances.reduce((s, b) => s + (b.used_days || 0), 0)
    const totalEntitled = balances.reduce((s, b) => s + (b.entitled_days || 0), 0)
    const noBalance = employees.filter(e => !empWithBalance.has(e.id)).length
    return { total: employees.length, withBalance: empWithBalance.size, noBalance, totalUsed, totalEntitled }
  }, [employees, balances])

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ["รหัส", "ชื่อ-สกุล", "แผนก", "สาขา"]
    mainLeaveTypes.forEach(lt => {
      headers.push(`${lt.name}_โควต้า`, `${lt.name}_ใช้`, `${lt.name}_รอ`, `${lt.name}_เหลือ`)
    })
    const rows = filtered.map(e => {
      const row = [e.employee_code, `${e.first_name_th} ${e.last_name_th}`, e.department?.name || "", e.branch?.name || ""]
      mainLeaveTypes.forEach(lt => {
        const b = getBalance(e.id, lt.id)
        row.push(
          (b?.entitled_days ?? 0).toString(),
          (b?.used_days ?? 0).toString(),
          (b?.pending_days ?? 0).toString(),
          (b?.remaining_days ?? 0).toString(),
        )
      })
      return row
    })
    const bom = "\uFEFF"
    const csv = bom + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `leave_quota_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Companies for super admin ──
  const companyList = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach(e => { if (e.company?.code) map.set(e.company_id, e.company.code) })
    return Array.from(map.entries()).map(([id, code]) => ({ id, code }))
  }, [employees])

  // ── Dept list filtered ──
  const deptList = useMemo(() => {
    if (selectedCo !== "all") return departments.filter(d => d.company_id === selectedCo)
    return departments
  }, [departments, selectedCo])

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-500" />
            โควต้าการลา {year}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">ดูโควต้าและยอดคงเหลือการลาของพนักงานทุกคน</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            {viewMode === "table" ? <BarChart3 size={14} /> : <Users size={14} />}
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
            <Download size={13} /> ส่งออก CSV
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">พนักงานทั้งหมด</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">มีโควต้าแล้ว</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.withBalance}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">ยังไม่มีโควต้า</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.noBalance}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">ใช้ไปทั้งหมด</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.totalUsed.toFixed(1)} <span className="text-xs font-bold text-slate-400">วัน</span></p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัส, แผนก..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
        </div>

        {/* Year */}
        <div className="relative">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 bg-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Company (super admin) */}
        {isSuperAdmin && (
          <div className="relative">
            <select value={selectedCo} onChange={e => { setSelectedCo(e.target.value); setSelectedDept("all") }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 bg-white">
              <option value="all">ทุกบริษัท</option>
              {companyList.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Department */}
        <div className="relative">
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 bg-white">
            <option value="all">ทุกแผนก</option>
            {deptList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <p className="text-xs text-slate-400 ml-1">
          <Filter size={11} className="inline mr-1" />
          {filtered.length} คน
        </p>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลดข้อมูล...
        </div>
      )}

      {/* ── Table View ── */}
      {!loading && viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden -mx-4 lg:-mx-6">
          <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="sticky left-0 bg-slate-50 z-30 px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide min-w-[200px]">พนักงาน</th>
                  <th className="sticky left-[200px] bg-slate-50 z-30 px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide min-w-[120px]">แผนก</th>
                  {coreTypes.map(lt => (
                    <th key={lt.id} className="px-2 py-3 text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lt.color_hex || "#3b82f6" }} />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{lt.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">อื่นๆ</th>
                  <th className="px-2 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide w-[50px]"></th>
                </tr>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="sticky left-0 bg-slate-50/50 z-30" />
                  <th className="sticky left-[200px] bg-slate-50/50 z-30" />
                  {coreTypes.map(lt => (
                    <React.Fragment key={lt.id + "_sub"}>
                      <th className="px-1.5 py-1.5 text-[9px] font-bold text-slate-400 text-center">โควต้า</th>
                      <th className="px-1.5 py-1.5 text-[9px] font-bold text-slate-400 text-center">ใช้</th>
                      <th className="px-1.5 py-1.5 text-[9px] font-bold text-slate-400 text-center">เหลือ</th>
                    </React.Fragment>
                  ))}
                  <th className="px-1.5 py-1.5 text-[9px] font-bold text-slate-400 text-center">ดูทั้งหมด</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const isExpanded = expandedEmp === emp.id
                  const empBalances = balances.filter(b => b.employee_id === emp.id)
                  const coreNames = ["ลาป่วย", "ลากิจ", "ลาพักร้อน"]
                  const otherBalances = empBalances.filter(b => {
                    const lt = leaveTypes.find(t => t.id === b.leave_type_id)
                    return !lt || !coreNames.includes(lt.name)
                  })
                  const hasOther = otherBalances.length > 0

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-25"}`}>
                        <td className="sticky left-0 bg-inherit z-10 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-black text-indigo-600">{emp.first_name_th[0]}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate">
                                {emp.first_name_th} {emp.last_name_th}
                                {emp.nickname && <span className="text-slate-400 font-normal ml-1">({emp.nickname})</span>}
                              </p>
                              <p className="text-[10px] text-slate-400">{emp.employee_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="sticky left-[200px] bg-inherit z-10 px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{emp.department?.name || "—"}</td>
                        {coreTypes.map(lt => {
                          const b = getBalanceByName(emp.id, lt.name)
                          if (!b) return (
                            <React.Fragment key={lt.id}>
                              <td className="px-1.5 py-3 text-center text-xs text-slate-300" colSpan={3}>—</td>
                            </React.Fragment>
                          )
                          const pct = b.entitled_days > 0 ? (b.used_days / b.entitled_days) * 100 : 0
                          const isLow = b.remaining_days <= 2 && b.entitled_days > 0
                          return (
                            <React.Fragment key={lt.id}>
                              <td className="px-1.5 py-3 text-center text-xs text-slate-600 font-medium">{b.entitled_days}</td>
                              <td className={`px-1.5 py-3 text-center text-xs font-bold ${pct > 80 ? "text-red-600" : pct > 50 ? "text-amber-600" : "text-slate-600"}`}>
                                {b.used_days > 0 ? b.used_days : <span className="text-slate-300">0</span>}
                              </td>
                              <td className={`px-1.5 py-3 text-center text-xs font-black ${isLow ? "text-red-600" : "text-emerald-600"}`}>
                                {b.remaining_days}
                                {isLow && <AlertTriangle size={9} className="inline ml-0.5 text-red-400" />}
                              </td>
                            </React.Fragment>
                          )
                        })}
                        <td className="px-3 py-3 text-center">
                          {hasOther ? (
                            <button onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                isExpanded ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}>
                              {otherBalances.length} รายการ
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button onClick={() => {
                            const empBal = balances.filter(b => b.employee_id === emp.id)
                            setEditEmp(emp)
                            setEditBalances(empBal.map(b => ({ ...b })))
                          }} className="text-slate-300 hover:text-indigo-600 transition-colors" title="แก้ไขโควต้า">
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (() => {
                        const empLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id)
                        return (
                          <tr className="bg-indigo-50/30">
                            <td colSpan={2 + coreTypes.length * 3 + 2} className="px-6 py-4">
                              <div className="space-y-3">
                                {/* ประเภทลาอื่นๆ */}
                                {otherBalances.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">ประเภทลาอื่นๆ</p>
                                    <div className="flex flex-wrap gap-2">
                                      {otherBalances.map(ob => {
                                        const lt = leaveTypes.find(t => t.id === ob.leave_type_id)
                                        return (
                                          <div key={ob.id} className="bg-white rounded-lg px-3 py-2 border border-slate-100 text-xs">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lt?.color_hex || "#94a3b8" }} />
                                              <span className="font-bold text-slate-700">{lt?.name || "ไม่ทราบ"}</span>
                                            </div>
                                            <div className="flex gap-3 text-[10px] text-slate-500">
                                              <span>โควต้า <b className="text-slate-700">{ob.entitled_days}</b></span>
                                              <span>ใช้ <b className="text-slate-700">{ob.used_days}</b></span>
                                              <span>เหลือ <b className="text-emerald-600">{ob.remaining_days}</b></span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* ประวัติการลา (วันที่ลา) */}
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">ประวัติการลา {year}</p>
                                  {empLeaves.length === 0 ? (
                                    <p className="text-xs text-slate-300">ยังไม่มีประวัติการลา</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {empLeaves.map((lr: any) => {
                                        const lt = leaveTypes.find(t => t.id === lr.leave_type_id)
                                        const startD = new Date(lr.start_date + "T00:00:00")
                                        const endD = new Date(lr.end_date + "T00:00:00")
                                        const isSameDay = lr.start_date === lr.end_date
                                        return (
                                          <div key={lr.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-100 text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lt?.color_hex || "#94a3b8" }} />
                                            <span className="font-bold text-slate-600 min-w-[70px]">{lt?.name || "ลา"}</span>
                                            <span className="text-slate-500">
                                              {startD.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                              {!isSameDay && ` – ${endD.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                                            </span>
                                            <span className="text-slate-400">{lr.total_days} วัน</span>
                                            {lr.is_half_day && <span className="text-blue-500 text-[10px]">(ครึ่งวัน)</span>}
                                            {lr.reason && <span className="text-slate-300 truncate max-w-[150px]" title={lr.reason}>— {lr.reason}</span>}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })()}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center">
              <Users size={24} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm">ไม่พบพนักงาน</p>
            </div>
          )}
        </div>
      )}

      {/* ── Cards View ── */}
      {!loading && viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(emp => {
            const empBalances = balances.filter(b => b.employee_id === emp.id)
            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-indigo-600">{emp.first_name_th[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {emp.first_name_th} {emp.last_name_th}
                    </p>
                    <p className="text-[10px] text-slate-400">{emp.employee_code} · {emp.department?.name || "—"}</p>
                  </div>
                </div>
                {empBalances.length > 0 ? (
                  <div className="space-y-2">
                    {empBalances.map(b => {
                      const lt = leaveTypes.find(t => t.id === b.leave_type_id)
                      if (!lt) return null
                      const pct = b.entitled_days > 0 ? Math.min(b.used_days / b.entitled_days * 100, 100) : 0
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lt.color_hex || "#3b82f6" }} />
                              <span className="text-[11px] font-bold text-slate-600">{lt.name}</span>
                            </div>
                            <span className="text-xs font-black" style={{ color: lt.color_hex || "#3b82f6" }}>
                              {b.remaining_days}
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">/ {b.entitled_days}</span>
                            </span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-slate-100">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: lt.color_hex || "#3b82f6" }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 text-center py-3">ยังไม่มีโควต้า</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* ═══ Edit Modal ═══ */}
      {editEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditEmp(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">แก้ไขโควต้าการลา</h3>
                <p className="text-indigo-200 text-xs">{editEmp.first_name_th} {editEmp.last_name_th} · {editEmp.employee_code}</p>
              </div>
              <button onClick={() => setEditEmp(null)} className="text-indigo-200 hover:text-white"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-2">
              {editBalances.map((b, i) => {
                const lt = leaveTypes.find(t => t.id === b.leave_type_id)
                return (
                  <div key={b.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lt?.color_hex || "#94a3b8" }} />
                    <span className="text-xs font-bold text-slate-700 min-w-[120px] truncate">{lt?.name || "ไม่ทราบ"}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <label className="text-[10px] text-slate-400">โควต้า</label>
                      <input type="number" min={0} step={0.5} value={b.entitled_days}
                        onChange={e => { const v = Number(e.target.value); setEditBalances(prev => prev.map((x, j) => j === i ? { ...x, entitled_days: v, remaining_days: v - x.used_days } : x)) }}
                        className="w-16 text-center border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none focus:border-indigo-400" />
                      <label className="text-[10px] text-slate-400">ใช้</label>
                      <input type="number" min={0} step={0.5} value={b.used_days}
                        onChange={e => { const v = Number(e.target.value); setEditBalances(prev => prev.map((x, j) => j === i ? { ...x, used_days: v, remaining_days: x.entitled_days - v } : x)) }}
                        className="w-16 text-center border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none focus:border-indigo-400" />
                      <span className="text-[10px] text-slate-400">เหลือ</span>
                      <span className={`text-xs font-black ${b.remaining_days <= 2 && b.entitled_days > 0 ? "text-red-600" : "text-emerald-600"}`}>{b.remaining_days}</span>
                    </div>
                  </div>
                )
              })}
              {editBalances.length === 0 && <p className="text-center text-slate-400 text-sm py-6">ไม่มีโควต้า</p>}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setEditEmp(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">ยกเลิก</button>
              <button onClick={async () => {
                setEditSaving(true)
                try {
                  const supabase = (await import("@/lib/supabase/client")).createClient()
                  for (const b of editBalances) {
                    await supabase.from("leave_balances").update({
                      entitled_days: b.entitled_days,
                      used_days: b.used_days,
                      remaining_days: b.remaining_days,
                    }).eq("id", b.id)
                  }
                  toast.success("บันทึกโควต้าสำเร็จ")
                  setEditEmp(null)
                  // Refresh data
                  const cid = selectedCo || userCompanyId || "all"
                  const params = new URLSearchParams({ company_id: cid, year: year.toString() })
                  const res = await fetch(`/api/admin/leave-quota?${params}`)
                  const d = await res.json()
                  setBalances(d.balances || [])
                } catch { toast.error("บันทึกไม่สำเร็จ") }
                setEditSaving(false)
              }} disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Check size={14} /> {editSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

