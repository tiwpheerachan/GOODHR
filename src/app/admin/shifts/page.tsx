"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, ChevronRight, Calendar, Wand2, Copy, Save, Filter,
  Clock, Sun, Moon, Coffee, Users, CheckCircle2, AlertCircle, Building2,
  Upload, UserCheck, X, Plus
} from "lucide-react"
import Link from "next/link"
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

// ── Shift Color Map (สีเข้มเห็นชัดเจน แต่ละกะต่างกัน) ─────────
const SHIFT_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  "07:00": { bg: "bg-emerald-200", text: "text-emerald-800", short: "7" },
  "09:00": { bg: "bg-blue-200", text: "text-blue-800", short: "9" },
  "10:00": { bg: "bg-cyan-200", text: "text-cyan-800", short: "10" },
  "10:30": { bg: "bg-teal-200", text: "text-teal-800", short: "10½" },
  "11:00": { bg: "bg-purple-200", text: "text-purple-800", short: "11" },
  "11:30": { bg: "bg-violet-200", text: "text-violet-800", short: "11½" },
  "12:00": { bg: "bg-amber-200", text: "text-amber-800", short: "12" },
  "12:30": { bg: "bg-orange-200", text: "text-orange-800", short: "12½" },
  "13:00": { bg: "bg-rose-200", text: "text-rose-800", short: "13" },
  "15:30": { bg: "bg-indigo-200", text: "text-indigo-800", short: "15½" },
  "16:00": { bg: "bg-fuchsia-200", text: "text-fuchsia-800", short: "16" },
}

const FALLBACK_COLORS = [
  { bg: "bg-lime-200", text: "text-lime-800" },
  { bg: "bg-sky-200", text: "text-sky-800" },
  { bg: "bg-pink-200", text: "text-pink-800" },
  { bg: "bg-yellow-200", text: "text-yellow-800" },
  { bg: "bg-emerald-200", text: "text-emerald-800" },
  { bg: "bg-red-200", text: "text-red-800" },
]

function shiftStyle(startTime: string | null | undefined) {
  if (!startTime) return { bg: "bg-slate-100", text: "text-slate-500", short: "-" }
  const key = startTime.substring(0, 5)
  if (SHIFT_COLORS[key]) return SHIFT_COLORS[key]
  // สีอัตโนมัติสำหรับกะที่ HR สร้างเอง
  const hash = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const fb = FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
  const h = key.replace(":", ""); const short = h.includes("30") ? h.substring(0, h.length - 2) + "½" : String(Number(h) || key)
  return { ...fb, short }
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
  const [modifications, setModifications] = useState<Map<string, { employee_id: string; work_date: string; shift_id: string | null; assignment_type: string; leave_type?: string | null }>>(new Map())

  // ── Shift picker ───────────────────────────────────────────────
  const [picker, setPicker] = useState<{ empId: string; date: string; x: number; y: number } | null>(null)

  // ── Copy-from-employee modal ─────────────────────────────────
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySource, setCopySource] = useState("")
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set())
  const [copySearch, setCopySearch] = useState("")

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
    setPicker({ empId, date, x: rect.left, y: rect.top })
  }

  // ── Apply shift from picker ────────────────────────────────────
  const applyShift = (shiftId: string | null, type: "work" | "dayoff" | "leave", leaveType?: string) => {
    if (!picker) return
    const key = `${picker.empId}_${picker.date}`
    setModifications(prev => {
      const next = new Map(prev)
      next.set(key, {
        employee_id: picker.empId,
        work_date: picker.date,
        shift_id: shiftId,
        assignment_type: type,
        leave_type: leaveType ?? null,
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
              leave_type: leaveType,
              shift: selectedShift ?? undefined,
            } as Assignment
          }
        })
      }
    }))
    setPicker(null)
  }

  const LEAVE_OPTIONS_ADMIN = [
    { key: "sick",       label: "ลาป่วย",       bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200" },
    { key: "personal",   label: "ลากิจ",        bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
    { key: "vacation",   label: "ลาพักร้อน",    bg: "bg-green-50",   text: "text-green-600",  border: "border-green-200" },
    { key: "company",    label: "หยุดบริษัท",   bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-200" },
    { key: "graduation", label: "ลารับปริญญา",  bg: "bg-sky-50",     text: "text-sky-600",    border: "border-sky-200" },
  ]

  const LEAVE_LABEL: Record<string, string> = {
    sick: "ป่วย", personal: "กิจ", vacation: "ร้อน",
    company: "บ.หยุด", graduation: "ปริญญา",
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

  // ── Clear shift (ลบกะ) ──────────────────────────────────────────
  const handleClearShift = async (empId: string, date: string) => {
    const res = await fetch("/api/shifts/self-schedule/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_shift", employee_id: empId, work_date: date }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("ลบกะสำเร็จ")
      // Remove from grid visually
      setGrid(prev => prev.map(row => {
        if (row.employee.id !== empId) return row
        return { ...row, days: row.days.map((d: any) => d.date === date ? { ...d, assignment: null, pending_request: null } : d) }
      }))
    } else toast.error(data.error)
    setPicker(null)
  }

  // ── Approve/Reject pending request ────────────────────────────
  const handlePendingAction = async (reqId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/shifts/self-schedule/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, request_id: reqId }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      load() // reload grid
    } else toast.error(data.error)
    setPicker(null)
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

  // ── Copy schedule from one employee to others ─────────────────
  const handleCopyFromEmployee = () => {
    if (!copySource || copyTargets.size === 0) return
    const sourceRow = grid.find(r => r.employee.id === copySource)
    if (!sourceRow) return

    // Apply source assignments to all targets
    const newMods = new Map(modifications)
    const targetArr = Array.from(copyTargets)
    for (const targetId of targetArr) {
      for (const { date, assignment } of sourceRow.days) {
        const key = `${targetId}_${date}`
        newMods.set(key, {
          employee_id: targetId,
          work_date: date,
          shift_id: assignment?.shift_id ?? null,
          assignment_type: assignment?.assignment_type ?? "dayoff",
        })
      }
    }
    setModifications(newMods)

    // Update grid visually
    setGrid(prev => prev.map(row => {
      if (!copyTargets.has(row.employee.id)) return row
      return {
        ...row,
        days: row.days.map((d, i) => ({
          date: d.date,
          assignment: sourceRow.days[i]?.assignment
            ? { ...sourceRow.days[i].assignment!, employee_id: row.employee.id, work_date: d.date }
            : null,
        })),
      }
    }))

    toast.success(`คัดลอกตาราง ${sourceRow.employee.first_name_th} → ${copyTargets.size} คน (กดบันทึกเพื่อยืนยัน)`)
    setShowCopyModal(false)
    setCopySource("")
    setCopyTargets(new Set())
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
          <button
            onClick={() => { setCopySource(""); setCopyTargets(new Set()); setCopySearch(""); setShowCopyModal(true) }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <UserCheck size={14} /> คัดลอกจากพนักงาน
          </button>
          <Link
            href="/admin/shifts/import"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Upload size={14} /> นำเข้า Excel
          </Link>
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
                  const canSelfSched = (row.employee as any).can_self_schedule
                  return (
                    <tr key={row.employee.id} className={idx % 2 === 0 ? "" : "bg-slate-50/40"}>
                      {/* Employee name */}
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${isVariable ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-indigo-400 to-violet-500"}`}>
                            {row.employee.first_name_th?.[0]}
                            {canSelfSched && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-[6px] text-white font-black">S</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-[11px] truncate">
                              {row.employee.first_name_th} {row.employee.last_name_th?.[0]}.
                              {isVariable && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-black">ไม่แน่นอน</span>}
                              {canSelfSched && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-black">วางกะเอง</span>}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {row.employee.employee_code} · {row.employee.department ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {row.days.map(({ date, assignment, pending_request }: any) => {
                        const d = new Date(date)
                        const dow = d.getDay()
                        const isWeekend = dow === 0 || dow === 6
                        const key = `${row.employee.id}_${date}`
                        const isModified = modifications.has(key)
                        const aType = assignment?.assignment_type ?? null
                        const shiftStart = assignment?.shift?.work_start ?? null
                        const hasPending = !!pending_request
                        const isSelfSubmitted = assignment?.submitted_by && assignment.submitted_by !== null

                        let cellContent: React.ReactNode
                        let cellBg = isWeekend ? "bg-red-50/30" : ""

                        if (aType === "dayoff" || (!assignment && isWeekend)) {
                          cellBg = "bg-slate-100/80"
                          cellContent = <span className="text-[10px] font-bold text-slate-400">OFF</span>
                        } else if (aType === "leave") {
                          cellBg = "bg-sky-50"
                          cellContent = <span className="text-[9px] font-bold text-sky-500">{LEAVE_LABEL[assignment?.leave_type ?? ""] ?? "ลา"}</span>
                        } else if (aType === "holiday") {
                          cellBg = "bg-red-200"
                          cellContent = <span className="text-[9px] font-black text-red-600">หยุด</span>
                        } else if (aType === "work" && shiftStart) {
                          const s = shiftStyle(shiftStart)
                          cellBg = s.bg
                          cellContent = <span className={`text-[10px] font-black ${s.text}`}>{s.short}</span>
                        } else if (aType === "work" && !shiftStart) {
                          cellBg = "bg-amber-50"
                          cellContent = <span className="text-[10px] font-bold text-amber-400">?</span>
                        } else {
                          cellContent = <span className="text-slate-200">·</span>
                        }

                        return (
                          <td
                            key={date}
                            onClick={e => handleCellClick(row.employee.id, date, e)}
                            className={`border-b border-r border-slate-100 text-center cursor-pointer transition-all hover:ring-2 hover:ring-indigo-300 hover:z-10 relative ${cellBg} ${isModified ? "ring-2 ring-amber-400" : ""} ${hasPending ? "ring-2 ring-yellow-400" : ""}`}
                            style={{ padding: "6px 2px" }}
                            title={hasPending ? "มีคำขอเปลี่ยนกะรออนุมัติ" : isSelfSubmitted ? "พนักงานวางเอง" : ""}
                          >
                            {cellContent}
                            {hasPending && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                            {isSelfSubmitted && !hasPending && <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-violet-400" />}
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
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold">OFF = วันหยุดประจำสัปดาห์</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-200 text-red-600 font-bold">หยุด = นักขัตฤกษ์</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-500 font-bold">ลา</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-500 font-bold">? = ยังไม่เลือกกะ</span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-yellow-300 font-bold text-yellow-600">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> รอเปลี่ยนกะ
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-violet-200 font-bold text-violet-600">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> วางเอง
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-700">
          <span className="w-3 h-3 rounded-full bg-emerald-400 text-white text-[6px] flex items-center justify-center font-black">S</span> วางกะเองได้
        </span>
      </div>

      {/* ── Shift Picker Popup ─────────────────────────────────── */}
      {picker && (() => {
        const pickerRow = grid.find(r => r.employee.id === picker.empId)
        const pickerDay = pickerRow?.days.find((d: any) => d.date === picker.date) as any
        const pickerPending = pickerDay?.pending_request
        const pickerAssignment = pickerDay?.assignment

        return (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setPicker(null)} />
            <div
              className="fixed z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl p-3 min-w-[220px] overflow-y-auto"
              style={(() => {
                const maxH = Math.floor(window.innerHeight * 0.65)
                const left = Math.min(picker.x, window.innerWidth - 260)
                let top = picker.y > window.innerHeight * 0.5
                  ? Math.max(8, picker.y - 420)
                  : picker.y
                // ดันขึ้นถ้าจะล้นล่าง
                if (top + maxH > window.innerHeight - 8) {
                  top = Math.max(8, window.innerHeight - maxH - 8)
                }
                return { left, top, maxHeight: maxH }
              })()}
            >
              <p className="text-[10px] font-bold text-slate-400 mb-2 px-1">
                {new Date(picker.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </p>

              {/* Pending Request Info */}
              {pickerPending && (
                <div className="mb-2 p-2 rounded-xl bg-yellow-50 border border-yellow-200">
                  <p className="text-[10px] font-bold text-yellow-700 mb-1">คำขอเปลี่ยนกะรออนุมัติ</p>
                  {/* แสดงรายละเอียดเวลา: จากกะไหน → เป็นกะไหน */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex-1 bg-white rounded-lg px-2 py-1 border border-yellow-200">
                      <p className="text-[8px] text-yellow-500 font-bold">กะเดิม</p>
                      <p className="text-[10px] font-black text-yellow-800">
                        {pickerPending.current_assignment_type === "dayoff" ? "วันหยุด" :
                          pickerPending.current_shift ? `${pickerPending.current_shift.work_start?.substring(0,5)}-${pickerPending.current_shift.work_end?.substring(0,5)}` : "-"}
                      </p>
                    </div>
                    <span className="text-[10px] text-yellow-400 font-black">→</span>
                    <div className="flex-1 bg-white rounded-lg px-2 py-1 border border-emerald-200">
                      <p className="text-[8px] text-emerald-500 font-bold">ขอเปลี่ยน</p>
                      <p className="text-[10px] font-black text-emerald-700">
                        {pickerPending.requested_assignment_type === "dayoff" ? "วันหยุด" :
                          pickerPending.requested_shift ? `${pickerPending.requested_shift.work_start?.substring(0,5)}-${pickerPending.requested_shift.work_end?.substring(0,5)}` : "-"}
                      </p>
                    </div>
                  </div>
                  {pickerPending.reason && (
                    <p className="text-[9px] text-yellow-600 mb-1.5 truncate" title={pickerPending.reason}>เหตุผล: {pickerPending.reason}</p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePendingAction(pickerPending.id, "approve")}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600"
                    >
                      <CheckCircle2 size={11} /> อนุมัติ
                    </button>
                    <button
                      onClick={() => handlePendingAction(pickerPending.id, "reject")}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-white bg-red-500 hover:bg-red-600"
                    >
                      <X size={11} /> ปฏิเสธ
                    </button>
                  </div>
                </div>
              )}

              {/* Dayoff */}
              <button
                onClick={() => applyShift(null, "dayoff")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Moon size={14} className="text-slate-400" /> วันหยุด (OFF)
              </button>

              {/* Leave types */}
              <p className="text-[9px] font-bold text-slate-400 mt-1.5 mb-0.5 px-1">วันลา</p>
              <div className="grid grid-cols-2 gap-1 mb-1">
                {LEAVE_OPTIONS_ADMIN.map(lo => (
                  <button key={lo.key} onClick={() => applyShift(null, "leave", lo.key)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold ${lo.bg} ${lo.text} border ${lo.border} hover:opacity-80`}>
                    {lo.label}
                  </button>
                ))}
              </div>

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

              {/* เพิ่มกะใหม่ — ลิงก์ไปหน้าตั้งค่ากะ */}
              <div className="border-t border-slate-100 my-1.5" />
              <a
                href="/admin/shifts/settings"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Plus size={14} /> เพิ่มกะใหม่...
              </a>

              {/* ลบกะ (Clear Shift) — เฉพาะเมื่อมี assignment อยู่ */}
              {pickerAssignment && (
                <>
                  <div className="border-t border-slate-100 my-1.5" />
                  <button
                    onClick={() => handleClearShift(picker.empId, picker.date)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={14} className="text-red-400" /> ลบกะ (ไม่มีกะ)
                  </button>
                </>
              )}
            </div>
          </>
        )
      })()}

      {/* ═══ Copy From Employee Modal ═══════════════════════════════ */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <UserCheck size={18} className="text-indigo-600"/>
                </div>
                <div>
                  <h3 className="font-black text-slate-800">คัดลอกตารางจากพนักงาน</h3>
                  <p className="text-xs text-slate-400">เลือกต้นแบบแล้วคัดลอกให้คนอื่น (เดือน {TH_MONTHS[month]})</p>
                </div>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={16}/></button>
            </div>

            {/* Step 1: Select source */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">1. เลือกต้นแบบ (คัดลอกจากใคร)</label>
              <select
                value={copySource}
                onChange={e => setCopySource(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="">เลือกพนักงาน...</option>
                {grid.map(r => (
                  <option key={r.employee.id} value={r.employee.id}>
                    {r.employee.employee_code} — {r.employee.first_name_th} {r.employee.last_name_th} ({r.employee.department})
                  </option>
                ))}
              </select>
              {copySource && (() => {
                const src = grid.find(r => r.employee.id === copySource)
                if (!src) return null
                const workDays = src.days.filter(d => d.assignment?.assignment_type === "work").length
                const offDays = src.days.filter(d => d.assignment?.assignment_type === "dayoff").length
                return (
                  <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs">
                    <span className="font-bold text-indigo-700">{src.employee.first_name_th}</span>
                    <span className="text-indigo-500 ml-2">ทำงาน {workDays} วัน · หยุด {offDays} วัน · ว่าง {days.length - workDays - offDays} วัน</span>
                  </div>
                )
              })()}
            </div>

            {/* Step 2: Select targets */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-bold text-slate-600">2. เลือกพนักงานที่จะวางตาราง</label>
                <span className="text-[10px] text-indigo-600 font-bold">{copyTargets.size} คน</span>
              </div>
              <input
                value={copySearch}
                onChange={e => setCopySearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัส..."
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-400 mb-2"
              />
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                {grid
                  .filter(r => r.employee.id !== copySource)
                  .filter(r => {
                    if (!copySearch) return true
                    const s = copySearch.toLowerCase()
                    return r.employee.first_name_th?.toLowerCase().includes(s) ||
                           r.employee.employee_code?.toLowerCase().includes(s) ||
                           r.employee.department?.toLowerCase().includes(s)
                  })
                  .map(r => (
                    <label key={r.employee.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyTargets.has(r.employee.id)}
                        onChange={e => {
                          const next = new Set(copyTargets)
                          if (e.target.checked) next.add(r.employee.id); else next.delete(r.employee.id)
                          setCopyTargets(next)
                        }}
                        className="rounded border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {r.employee.first_name_th} {r.employee.last_name_th}
                        </p>
                        <p className="text-[10px] text-slate-400">{r.employee.employee_code} · {r.employee.department}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100">
              <button onClick={() => setShowCopyModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">
                ยกเลิก
              </button>
              <button
                onClick={handleCopyFromEmployee}
                disabled={!copySource || copyTargets.size === 0}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Copy size={14}/> คัดลอก ({copyTargets.size} คน)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
