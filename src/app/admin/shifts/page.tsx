"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, ChevronRight, Calendar, Wand2, Copy, Save, Filter,
  Clock, Sun, Moon, Coffee, Users, CheckCircle2, AlertCircle, Building2
} from "lucide-react"
import toast from "react-hot-toast"

// ── Types ──────────────────────────────────────────────────────────
interface Shift { id: string; name: string; shift_type: string; work_start: string; work_end: string }
interface Assignment {
  id?: string; employee_id: string; work_date: string; shift_id: string | null
  assignment_type: "work" | "dayoff" | "leave" | "holiday"; leave_type?: string
  shift?: Shift
}
interface EmpRow {
  employee: { id: string; employee_code: string; first_name_th: string; last_name_th: string; department: string }
  profile: any
  days: Array<{ date: string; assignment: Assignment | null }>
}

// ── Shift Color Map ───────────────────────────────────────────────
const SHIFT_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  "09:00": { bg: "bg-blue-100", text: "text-blue-700", short: "9" },
  "10:00": { bg: "bg-cyan-100", text: "text-cyan-700", short: "10" },
  "10:30": { bg: "bg-teal-100", text: "text-teal-700", short: "10½" },
  "11:00": { bg: "bg-violet-100", text: "text-violet-700", short: "11" },
  "12:00": { bg: "bg-amber-100", text: "text-amber-700", short: "12" },
  "12:30": { bg: "bg-orange-100", text: "text-orange-700", short: "12½" },
  "13:00": { bg: "bg-rose-100", text: "text-rose-700", short: "13" },
  "15:30": { bg: "bg-indigo-100", text: "text-indigo-700", short: "15½" },
}

function shiftStyle(startTime: string | null | undefined) {
  if (!startTime) return { bg: "bg-slate-100", text: "text-slate-500", short: "-" }
  const key = startTime.substring(0, 5)
  return SHIFT_COLORS[key] ?? { bg: "bg-slate-100", text: "text-slate-600", short: key }
}

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export default function ShiftSchedulingPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSA = user?.role === "super_admin" || user?.role === "hr_admin"

  // ── State ──────────────────────────────────────────────────────
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [grid, setGrid] = useState<EmpRow[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [days, setDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "variable" | "fixed">("all")
  const [searchText, setSearchText] = useState("")

  // Company & department filters
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCo, setSelectedCo] = useState("")
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [filterDept, setFilterDept] = useState("")

  // ── Modified cells tracking ────────────────────────────────────
  const [modifications, setModifications] = useState<Map<string, { employee_id: string; work_date: string; shift_id: string | null; assignment_type: string }>>(new Map())

  // ── Shift picker ───────────────────────────────────────────────
  const [picker, setPicker] = useState<{ empId: string; date: string; x: number; y: number } | null>(null)

  const monthStr = `${year}-${String(month).padStart(2, "0")}`

  // ── Load companies ────────────────────────────────────────────
  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        if (data?.[0] && !selectedCo) setSelectedCo(data[0].id)
      })
  }, [isSA])

  // ── Load data ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      month: monthStr,
      schedule_type: filterType,
    })
    if (isSA && selectedCo) params.set("company_id", selectedCo)
    if (filterDept) params.set("dept_id", filterDept)

    const res = await fetch(`/api/shifts/monthly?${params}`)
    const data = await res.json()
    if (data.success) {
      setGrid(data.grid)
      setShifts(data.shifts ?? [])
      setDays(data.days)
      setDepartments(data.departments ?? [])
    } else {
      toast.error(data.error ?? "โหลดข้อมูลล้มเหลว")
    }
    setLoading(false)
    setModifications(new Map())
  }, [monthStr, filterType, selectedCo, filterDept])

  useEffect(() => { load() }, [load])

  // ── Navigation ─────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // ── Cell click → open picker ───────────────────────────────────
  const handleCellClick = (empId: string, date: string, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPicker({ empId, date, x: rect.left, y: rect.bottom + 4 })
  }

  // ── Apply shift from picker ────────────────────────────────────
  const applyShift = (shiftId: string | null, type: "work" | "dayoff") => {
    if (!picker) return
    const key = `${picker.empId}_${picker.date}`
    setModifications(prev => {
      const next = new Map(prev)
      next.set(key, {
        employee_id: picker.empId,
        work_date: picker.date,
        shift_id: shiftId,
        assignment_type: type,
      })
      return next
    })

    setGrid(prev => prev.map(row => {
      if (row.employee.id !== picker.empId) return row
      return {
        ...row,
        days: row.days.map(d => {
          if (d.date !== picker.date) return d
          const selectedShift = shifts.find(s => s.id === shiftId)
          return {
            date: d.date,
            assignment: {
              employee_id: picker.empId,
              work_date: d.date,
              shift_id: shiftId,
              assignment_type: type,
              shift: selectedShift ?? undefined,
            } as Assignment
          }
        })
      }
    }))
    setPicker(null)
  }

  // ── Save modifications ─────────────────────────────────────────
  const handleSave = async () => {
    if (modifications.size === 0) {
      toast("ไม่มีการเปลี่ยนแปลง", { icon: "ℹ️" })
      return
    }
    setSaving(true)
    const assignments = Array.from(modifications.values())
    const res = await fetch("/api/shifts/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", assignments }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`บันทึก ${data.updated} รายการสำเร็จ`)
      setModifications(new Map())
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  // ── Auto-generate for selected company ──────────────────────────
  const handleGenerate = async () => {
    const payload: any = { action: "generate", month: monthStr }
    if (isSA && selectedCo) payload.company_id = selectedCo
    const res = await fetch("/api/shifts/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`สร้างอัตโนมัติ ${data.generated} รายการ`)
      load()
    } else {
      toast.error(data.error)
    }
  }

  // ── Generate ALL companies ──────────────────────────────────────
  const [genAllRunning, setGenAllRunning] = useState(false)
  const handleGenerateAll = async () => {
    if (!confirm(`สร้างตารางกะ ${TH_MONTHS[month]} ${year + 543} ให้ทุกบริษัท?\n(fixed + variable ที่มี default shift)`)) return
    setGenAllRunning(true)
    const allCoIds = companies.map((c: any) => c.id)
    const res = await fetch("/api/shifts/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        month: monthStr,
        target_company_ids: allCoIds,
        company_id: allCoIds[0], // any valid company
      }),
    })
    const data = await res.json()
    setGenAllRunning(false)
    if (data.success) {
      toast.success(`สร้างอัตโนมัติ ${data.generated} รายการ (${data.companies} บริษัท)`)
      load()
    } else {
      toast.error(data.error)
    }
  }

  // ── Copy from previous month ───────────────────────────────────
  const handleCopy = async () => {
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    const fromMonth = `${py}-${String(pm).padStart(2, "0")}`
    const res = await fetch("/api/shifts/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy", from_month: fromMonth, to_month: monthStr }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`คัดลอก ${data.copied} รายการจาก ${TH_MONTHS[pm]}`)
      load()
    } else {
      toast.error(data.error)
    }
  }

  // ── Filter grid by search ──────────────────────────────────────
  const filtered = grid.filter(row => {
    if (!searchText) return true
    const s = searchText.toLowerCase()
    return (
      row.employee.first_name_th?.toLowerCase().includes(s) ||
      row.employee.last_name_th?.toLowerCase().includes(s) ||
      row.employee.employee_code?.toLowerCase().includes(s) ||
      row.employee.department?.toLowerCase().includes(s)
    )
  })

  // Stats
  const fixedCount = grid.filter(r => r.profile?.schedule_type === "fixed").length
  const varCount = grid.filter(r => r.profile?.schedule_type === "variable").length

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month Nav */}
        <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="px-3 py-1.5 text-sm font-black text-slate-800 min-w-[120px] text-center">
            {TH_MONTHS[month]} {year + 543}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Company selector (super_admin only) */}
        {isSA && companies.length > 0 && (
          <select
            value={selectedCo}
            onChange={e => { setSelectedCo(e.target.value); setFilterDept("") }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-400"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_th}</option>)}
          </select>
        )}

        {/* Department filter */}
        {departments.length > 0 && (
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm outline-none focus:border-indigo-400"
          >
            <option value="">ทุกแผนก ({grid.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({grid.filter(r => r.employee.department === d.name).length})
              </option>
            ))}
          </select>
        )}

        {/* Schedule type filter tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {([
            { key: "all", label: "ทั้งหมด" },
            { key: "variable", label: "ไม่แน่นอน" },
            { key: "fixed", label: "คงที่" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="ค้นหาชื่อ / รหัส / แผนก..."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 w-52"
        />

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isSA && companies.length > 1 && (
            <button
              onClick={handleGenerateAll}
              disabled={genAllRunning}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Wand2 size={14} /> {genAllRunning ? "กำลังสร้าง..." : "สร้างกะทุกบริษัท"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Wand2 size={14} /> สร้างกะบริษัทนี้
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Copy size={14} /> คัดลอกเดือนก่อน
          </button>
          {modifications.size > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={14} /> บันทึก ({modifications.size})
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Users size={13} /> <b className="text-slate-800">{filtered.length}</b> คน</span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
          กะแน่นอน {fixedCount}
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
          กะไม่แน่นอน {varCount}
        </span>
        {modifications.size > 0 && (
          <span className="flex items-center gap-1 text-amber-600 font-bold">
            <AlertCircle size={13} /> {modifications.size} รายการที่ยังไม่บันทึก
          </span>
        )}
      </div>

      {/* ── Grid Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2.5 text-left font-bold text-slate-700 min-w-[200px]">
                    พนักงาน
                  </th>
                  {days.map(date => {
                    const d = new Date(date)
                    const dow = d.getDay()
                    const isWeekend = dow === 0 || dow === 6
                    return (
                      <th
                        key={date}
                        className={`border-b border-r border-slate-100 px-0.5 py-2 text-center min-w-[42px] ${isWeekend ? "bg-red-50/60" : ""}`}
                      >
                        <div className={`text-[10px] font-bold ${isWeekend ? "text-red-400" : "text-slate-400"}`}>
                          {TH_DAYS[dow]}
                        </div>
                        <div className={`text-[11px] font-black ${isWeekend ? "text-red-500" : "text-slate-700"}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => {
                  const isVariable = row.profile?.schedule_type === "variable"
                  return (
                    <tr key={row.employee.id} className={idx % 2 === 0 ? "" : "bg-slate-50/40"}>
                      {/* Employee name */}
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${isVariable ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-indigo-400 to-violet-500"}`}>
                            {row.employee.first_name_th?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-[11px] truncate">
                              {row.employee.first_name_th} {row.employee.last_name_th?.[0]}.
                              {isVariable && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-black">ไม่แน่นอน</span>}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {row.employee.employee_code} · {row.employee.department ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {row.days.map(({ date, assignment }) => {
                        const d = new Date(date)
                        const dow = d.getDay()
                        const isWeekend = dow === 0 || dow === 6
                        const key = `${row.employee.id}_${date}`
                        const isModified = modifications.has(key)
                        const aType = assignment?.assignment_type ?? null
                        const shiftStart = assignment?.shift?.work_start ?? null

                        let cellContent: React.ReactNode
                        let cellBg = isWeekend ? "bg-red-50/30" : ""

                        if (aType === "dayoff" || (!assignment && isWeekend)) {
                          cellBg = "bg-slate-100/80"
                          cellContent = <span className="text-[10px] font-bold text-slate-400">OFF</span>
                        } else if (aType === "leave") {
                          cellBg = "bg-sky-50"
                          cellContent = <span className="text-[9px] font-bold text-sky-500">ลา</span>
                        } else if (aType === "holiday") {
                          cellBg = "bg-red-50"
                          cellContent = <span className="text-[9px] font-bold text-red-400">หยุด</span>
                        } else if (aType === "work" && shiftStart) {
                          const s = shiftStyle(shiftStart)
                          cellBg = s.bg
                          cellContent = <span className={`text-[10px] font-black ${s.text}`}>{s.short}</span>
                        } else {
                          cellContent = <span className="text-slate-200">·</span>
                        }

                        return (
                          <td
                            key={date}
                            onClick={e => handleCellClick(row.employee.id, date, e)}
                            className={`border-b border-r border-slate-100 text-center cursor-pointer transition-all hover:ring-2 hover:ring-indigo-300 hover:z-10 relative ${cellBg} ${isModified ? "ring-2 ring-amber-400" : ""}`}
                            style={{ padding: "6px 2px" }}
                          >
                            {cellContent}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="py-16 text-center text-slate-400">
                      <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">ไม่พบข้อมูลพนักงาน</p>
                      <p className="text-xs mt-1">ลองเปลี่ยนตัวกรองหรือเพิ่ม Schedule Profile</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="font-bold text-slate-600">สี:</span>
        {Object.entries(SHIFT_COLORS).map(([time, { bg, text, short }]) => (
          <span key={time} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${bg} ${text} font-bold`}>
            {short} = {time}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold">OFF = วันหยุด</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-500 font-bold">ลา</span>
      </div>

      {/* ── Shift Picker Popup ─────────────────────────────────── */}
      {picker && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setPicker(null)} />
          <div
            className="fixed z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl p-3 min-w-[200px]"
            style={{ left: Math.min(picker.x, window.innerWidth - 220), top: Math.min(picker.y, window.innerHeight - 300) }}
          >
            <p className="text-[10px] font-bold text-slate-400 mb-2 px-1">
              {new Date(picker.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
            </p>

            {/* Dayoff */}
            <button
              onClick={() => applyShift(null, "dayoff")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Moon size={14} className="text-slate-400" /> วันหยุด (OFF)
            </button>

            <div className="border-t border-slate-100 my-1.5" />

            {/* Shifts */}
            {shifts.map(s => {
              const st = shiftStyle(s.work_start)
              return (
                <button
                  key={s.id}
                  onClick={() => applyShift(s.id, "work")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80 transition-colors ${st.bg} ${st.text} mb-0.5`}
                >
                  <Clock size={14} />
                  <span>{s.work_start?.substring(0, 5)} - {s.work_end?.substring(0, 5)}</span>
                  <span className="ml-auto opacity-60">{st.short}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
