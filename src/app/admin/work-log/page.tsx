"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Search, ChevronLeft, ChevronRight, Download, Filter,
  Clock, Users, CalendarDays, AlertTriangle, CheckCircle2,
  Building2, Loader2, X,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

// ── Types ────────────────────────────────────────────────────────
interface DayCell {
  work_date: string
  clock_in?: string | null
  clock_out?: string | null
  status: string
  late_minutes: number
  early_out_minutes: number
  ot_minutes: number
  work_minutes: number
  half_day_leave?: string | null
}
interface PayrollInfo {
  base_salary?: number; gross_income?: number; net_salary?: number
  ot_amount?: number; deduct_late?: number; deduct_absent?: number
  social_security_amount?: number; monthly_tax_withheld?: number
  total_deductions?: number; bonus?: number; commission?: number
}
interface EmpRow {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  nickname_th?: string
  department: string
  branch: string
  company_code?: string
  base_salary?: number
  payroll?: PayrollInfo
  days: Record<string, DayCell>          // key = "YYYY-MM-DD"
  stats: { present: number; late: number; absent: number; leave: number; halfLeave: number; otMin: number; lateMin: number }
}
interface LeaveDay {
  employee_id: string
  start_date: string
  end_date: string
  status: string
  is_half_day: boolean
  half_day_period?: string
  leave_type?: { name: string; code: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────
const TH_SHORT_DAY = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

function payrollPeriod(y: number, m: number): { from: string; to: string; label: string } {
  // Payroll period: 22nd prev month → 21st current month
  const prevM = m === 1 ? 12 : m - 1
  const prevY = m === 1 ? y - 1 : y
  const from = `${prevY}-${String(prevM).padStart(2, "0")}-22`
  const to = `${y}-${String(m).padStart(2, "0")}-21`
  return { from, to, label: `${TH_MONTHS[m]} ${y + 543}` }
}

function dateRange(from: string, to: string): string[] {
  const result: string[] = []
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const d = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  while (d <= end) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    result.push(`${yyyy}-${mm}-${dd}`)
    d.setDate(d.getDate() + 1)
  }
  return result
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return ""
  try { return new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }) } catch { return "" }
}

function minutesToHM(m: number): string {
  if (!m) return ""
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h > 0 ? `${h}:${String(mm).padStart(2, "0")}` : `${mm}น.`
}

// ── Status mini badge for each cell ──────────────────────────────
const CELL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  present:   { bg: "bg-emerald-100", text: "text-emerald-800", label: "✓" },
  late:      { bg: "bg-amber-100",   text: "text-amber-800",   label: "สาย" },
  absent:    { bg: "bg-rose-100",    text: "text-rose-700",    label: "ขาด" },
  leave:     { bg: "bg-violet-100",  text: "text-violet-700",  label: "ลา" },
  holiday:   { bg: "bg-slate-100",   text: "text-slate-500",   label: "หยุด" },
  day_off:   { bg: "bg-slate-100",   text: "text-slate-500",   label: "วันหยุด" },
  wfh:       { bg: "bg-sky-100",     text: "text-sky-700",     label: "WFH" },
  early_out: { bg: "bg-orange-100",  text: "text-orange-700",  label: "ออกก่อน" },
}

// ══════════════════════════════════════════════════════════════════
export default function WorkLogPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useRef(createClient()).current
  const isSA = user?.role === "super_admin" || user?.role === "hr_admin"
  const userCompanyId: string | null = (user as any)?.company_id ?? user?.employee?.company_id ?? null

  // ── Period state ─────────────────────────────────────────────
  const now = new Date()
  // If today <= 21, current payroll month is this month; else next month
  const initMonth = now.getDate() > 21 ? (now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2) : now.getMonth() + 1
  const initYear = now.getDate() > 21 && now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()
  const [periodYear, setPeriodYear] = useState(initYear)
  const [periodMonth, setPeriodMonth] = useState(initMonth)

  const period = useMemo(() => payrollPeriod(periodYear, periodMonth), [periodYear, periodMonth])
  const allDates = useMemo(() => dateRange(period.from, period.to), [period])

  // ── Filters ──────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCo, setSelectedCo] = useState("all")
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [filterDept, setFilterDept] = useState("")

  // Resolved company ID: selectedCo override → user's company → all
  const activeCid = selectedCo || userCompanyId || "all"

  // ── Data ─────────────────────────────────────────────────────
  const [rows, setRows] = useState<EmpRow[]>([])
  const [payrollDetail, setPayrollDetail] = useState<string | null>(null) // employee_id of expanded payroll
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Tooltip ──────────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: DayCell; emp: EmpRow; leaveInfo?: string } | null>(null)

  // ── Debounce search ──────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // ── Load companies ───────────────────────────────────────────
  useEffect(() => {
    supabase.from("companies").select("id,name,code").eq("is_active", true).order("name").then(({ data }) => {
      setCompanies(data ?? [])
    })
  }, []) // eslint-disable-line

  // ── Load departments (รองรับ all = ทุกบริษัท) ────────────────
  useEffect(() => {
    if (!activeCid) return
    let q = supabase.from("departments").select("id,name").order("name")
    if (activeCid !== "all") q = q.eq("company_id", activeCid)
    q.then(({ data }) => setDepartments(data ?? []))
  }, [activeCid]) // eslint-disable-line

  // ── Main data loader (ใช้ API + service client — ไม่ติด RLS) ──
  const load = useCallback(async () => {
    if (!activeCid) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ company_id: activeCid, from: period.from, to: period.to })
      if (filterDept) params.set("dept_id", filterDept)
      const res = await fetch(`/api/admin/work-log?${params}`)
      const json = await res.json()
      if (json.error) { toast.error(json.error); setRows([]); return }

      const employees = json.employees ?? []
      const allAttendance = json.attendance ?? []
      const allLeaves: LeaveDay[] = json.leaves ?? []
      const salaryMap: Record<string, number> = json.salaries ?? {}
      const payrollMap: Record<string, PayrollInfo> = json.payrolls ?? {}

      if (!employees.length) { setRows([]); return }

      // Build leave lookup: empId -> date -> info
      const leaveLookup: Record<string, Record<string, { type: string; isHalf: boolean; halfPeriod?: string; status: string }>> = {}
      for (const lv of allLeaves) {
        if (!leaveLookup[lv.employee_id]) leaveLookup[lv.employee_id] = {}
        const sd = new Date(lv.start_date + "T00:00:00")
        const ed = new Date(lv.end_date + "T00:00:00")
        const d = new Date(sd)
        while (d <= ed) {
          const ds = d.toISOString().slice(0, 10)
          if (ds >= period.from && ds <= period.to) {
            leaveLookup[lv.employee_id][ds] = {
              type: (lv.leave_type as any)?.name ?? "ลา",
              isHalf: lv.is_half_day,
              halfPeriod: lv.half_day_period,
              status: lv.status,
            }
          }
          d.setDate(d.getDate() + 1)
        }
      }

      // Build attendance lookup: empId -> date -> DayCell
      const attLookup: Record<string, Record<string, DayCell>> = {}
      for (const a of allAttendance) {
        if (!attLookup[a.employee_id]) attLookup[a.employee_id] = {}
        attLookup[a.employee_id][a.work_date] = {
          work_date: a.work_date,
          clock_in: a.clock_in,
          clock_out: a.clock_out,
          status: a.status,
          late_minutes: a.late_minutes || 0,
          early_out_minutes: a.early_out_minutes || 0,
          ot_minutes: a.ot_minutes || 0,
          work_minutes: a.work_minutes || 0,
          half_day_leave: a.half_day_leave,
        }
      }

      // 4) Build rows
      const empRows: EmpRow[] = employees.map((emp: any) => {
        const days: Record<string, DayCell> = {}
        let present = 0, late = 0, absent = 0, leave = 0, halfLeave = 0, otMin = 0, lateMin = 0

        for (const date of allDates) {
          const att = attLookup[emp.id]?.[date]
          const lv = leaveLookup[emp.id]?.[date]

          if (att) {
            // ถ้า status=absent แต่มี leave approved → แสดงเป็น "ลา" ไม่ใช่ "ขาด"
            const hasLeave = lv && lv.status === "approved"
            const effectiveStatus = (att.status === "absent" && hasLeave) ? "leave" : att.status

            days[date] = { ...att, status: effectiveStatus }

            // Stats
            if (effectiveStatus === "present" || effectiveStatus === "wfh") present++
            else if (effectiveStatus === "late") { present++; late++ }
            else if (effectiveStatus === "absent") absent++
            else if (effectiveStatus === "leave") { leave++; if (hasLeave && lv.isHalf) halfLeave++ }
            else if (effectiveStatus === "early_out") present++

            if (att.half_day_leave) halfLeave++
            if (effectiveStatus !== "leave" && att.half_day_leave !== "morning") lateMin += att.late_minutes
            otMin += att.ot_minutes
          } else if (lv && lv.status === "approved") {
            // No attendance record but has approved leave
            days[date] = {
              work_date: date,
              status: "leave",
              late_minutes: 0, early_out_minutes: 0, ot_minutes: 0, work_minutes: 0,
              half_day_leave: lv.isHalf ? lv.halfPeriod : null,
            }
            leave++
            if (lv.isHalf) halfLeave++
          }
          // If no record at all → empty cell (could be day off, holiday, or no data yet)
        }

        return {
          id: emp.id,
          employee_code: emp.employee_code || "",
          first_name_th: emp.first_name_th || "",
          last_name_th: emp.last_name_th || "",
          nickname_th: emp.nickname_th || "",
          department: (emp.department as any)?.name || "-",
          branch: (emp.branch as any)?.name || "-",
          company_code: (emp.company as any)?.code || "",
          base_salary: salaryMap[emp.id] || 0,
          payroll: payrollMap[emp.id] || null,
          days,
          stats: { present, late, absent, leave, halfLeave, otMin, lateMin },
        }
      })

      setRows(empRows)
    } catch (err) {
      console.error("WorkLog load error:", err)
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [activeCid, period, allDates, filterDept]) // eslint-disable-line

  // ── Trigger load when auth ready + company available ─────────
  useEffect(() => {
    if (!authLoading && activeCid) load()
  }, [authLoading, activeCid, load]) // eslint-disable-line

  // ── Filtered rows ────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows
    const q = debouncedSearch.toLowerCase()
    return rows.filter(r =>
      r.employee_code.toLowerCase().includes(q) ||
      r.first_name_th.includes(q) ||
      r.last_name_th.includes(q) ||
      (r.nickname_th && r.nickname_th.includes(q)) ||
      r.department.includes(q)
    )
  }, [rows, debouncedSearch])

  // ── Period navigation ────────────────────────────────────────
  const prevPeriod = () => {
    if (periodMonth === 1) { setPeriodMonth(12); setPeriodYear(y => y - 1) }
    else setPeriodMonth(m => m - 1)
  }
  const nextPeriod = () => {
    if (periodMonth === 12) { setPeriodMonth(1); setPeriodYear(y => y + 1) }
    else setPeriodMonth(m => m + 1)
  }

  // ── Export XLSX ──────────────────────────────────────────────
  const exportXLSX = useCallback(async () => {
    if (!filteredRows.length) return
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // Header rows
      const infoRows = [
        ["บันทึกการเข้างาน (Work Log)"],
        [`ช่วงเวลา: ${period.from} ถึง ${period.to} (${period.label})`],
        [`ออกรายงาน: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: th })}`],
        [],
      ]

      // Column headers: fixed cols + date cols
      const headers = ["รหัส", "ชื่อ-สกุล", "ชื่อเล่น", "แผนก", ...allDates.map(d => {
        const dd = new Date(d + "T00:00:00")
        return `${dd.getDate()}/${dd.getMonth() + 1}`
      }), "มาทำงาน", "สาย", "ขาด", "ลา", "ลาครึ่งวัน", "สายรวม(นาที)", "OT(นาที)", "เงินเดือนฐาน", "รายได้รวม", "หักรวม", "เงินสุทธิ"]

      // Data rows
      const dataRows = filteredRows.map(r => {
        const dayCols = allDates.map(d => {
          const c = r.days[d]
          if (!c) return ""
          if (c.half_day_leave === "morning") return "ลาเช้า"
          if (c.half_day_leave === "afternoon") return "ลาบ่าย"
          const labels: Record<string, string> = { present: "✓", late: "สาย", absent: "ขาด", leave: "ลา", holiday: "หยุด", day_off: "หยุด", wfh: "WFH", early_out: "ออกก่อน" }
          let lbl = labels[c.status] ?? c.status
          if (c.status === "late" && c.late_minutes > 0) lbl += `(${c.late_minutes})`
          if (c.clock_in) lbl += ` ${fmtTime(c.clock_in)}`
          if (c.ot_minutes > 0) lbl += ` OT${c.ot_minutes}`
          return lbl
        })
        return [
          r.employee_code, `${r.first_name_th} ${r.last_name_th}`, r.nickname_th || "",
          r.department, ...dayCols,
          r.stats.present, r.stats.late, r.stats.absent, r.stats.leave, r.stats.halfLeave,
          r.stats.lateMin, r.stats.otMin,
          r.payroll?.base_salary || r.base_salary || "",
          r.payroll?.gross_income || "",
          r.payroll?.total_deductions || "",
          r.payroll?.net_salary || "",
        ]
      })

      const wsData = [...infoRows, headers, ...dataRows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Column widths
      const cols = [{ wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, ...allDates.map(() => ({ wch: 14 })),
        { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }]
      ws["!cols"] = cols

      XLSX.utils.book_append_sheet(wb, ws, "Work Log")
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url
      a.download = `work_log_${period.from}_${period.to}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.success("ดาวน์โหลด Excel สำเร็จ")
    } catch (err) {
      console.error("Export error:", err)
      toast.error("ส่งออกไม่สำเร็จ")
    } finally {
      setExporting(false)
    }
  }, [filteredRows, allDates, period])

  // ── Summary stats ────────────────────────────────────────────
  const summary = useMemo(() => {
    const s = { employees: filteredRows.length, totalPresent: 0, totalLate: 0, totalAbsent: 0, totalLeave: 0 }
    for (const r of filteredRows) {
      s.totalPresent += r.stats.present
      s.totalLate += r.stats.late
      s.totalAbsent += r.stats.absent
      s.totalLeave += r.stats.leave
    }
    return s
  }, [filteredRows])

  // ── Render cell ──────────────────────────────────────────────
  const renderCell = (emp: EmpRow, date: string) => {
    const cell = emp.days[date]
    const dow = new Date(date + "T00:00:00").getDay()
    const isWeekend = dow === 0 || dow === 6

    if (!cell) {
      return (
        <td key={date} className={`border border-slate-100 text-center text-[10px] ${isWeekend ? "bg-slate-50" : ""}`}>
          <span className="text-slate-300">—</span>
        </td>
      )
    }

    // Half-day leave badges
    if (cell.half_day_leave === "morning") {
      return (
        <td key={date} className="border border-slate-100 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 hover:z-10 relative"
          onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, cell, emp, leaveInfo: "ลาเช้า" })}
          onMouseLeave={() => setTooltip(null)}>
          <div className="flex flex-col items-center py-0.5">
            <span className="text-[9px] font-bold text-blue-600 leading-none">ลาเช้า</span>
            {cell.clock_in && <span className="text-[9px] text-slate-500 leading-none mt-0.5">{fmtTime(cell.clock_in)}</span>}
          </div>
        </td>
      )
    }
    if (cell.half_day_leave === "afternoon") {
      return (
        <td key={date} className="border border-slate-100 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 hover:z-10 relative"
          onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, cell, emp, leaveInfo: "ลาบ่าย" })}
          onMouseLeave={() => setTooltip(null)}>
          <div className="flex flex-col items-center py-0.5">
            <span className="text-[9px] font-bold text-blue-600 leading-none">ลาบ่าย</span>
            {cell.clock_in && <span className="text-[9px] text-slate-500 leading-none mt-0.5">{fmtTime(cell.clock_in)}</span>}
          </div>
        </td>
      )
    }

    const style = CELL_STYLES[cell.status] ?? { bg: "bg-slate-50", text: "text-slate-500", label: cell.status }

    return (
      <td key={date}
        className={`border border-slate-100 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 hover:z-10 relative ${isWeekend ? "bg-slate-50/50" : ""}`}
        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, cell, emp })}
        onMouseLeave={() => setTooltip(null)}>
        <div className="flex flex-col items-center py-0.5">
          {cell.status === "present" || cell.status === "late" || cell.status === "early_out" || cell.status === "wfh" ? (
            <>
              <span className={`text-[9px] font-bold leading-none ${cell.status === "late" ? "text-amber-600" : cell.status === "early_out" ? "text-orange-600" : "text-emerald-600"}`}>
                {fmtTime(cell.clock_in) || "✓"}
              </span>
              {cell.ot_minutes > 0 && (
                <span className="text-[8px] text-indigo-600 font-bold leading-none mt-0.5">OT{cell.ot_minutes}</span>
              )}
              {cell.status === "late" && cell.late_minutes > 0 && (
                <span className="text-[8px] text-amber-600 leading-none mt-0.5">+{cell.late_minutes}น.</span>
              )}
            </>
          ) : (
            <span className={`text-[9px] font-bold leading-none ${style.text}`}>{style.label}</span>
          )}
        </div>
      </td>
    )
  }

  // ══════════════════════════════════════════════════════════════
  if (authLoading) return <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span>กำลังโหลด…</span></div>
  if (!activeCid) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center"><p className="font-bold text-red-700">ไม่พบ company_id — กรุณา logout แล้ว login ใหม่</p></div>

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-500" />
            บันทึกการเข้างาน
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">ตารางสรุปรายวันตามงวดเงินเดือน</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportXLSX} disabled={exporting || !filteredRows.length}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* ── Period selector ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[180px]">
              <div className="text-lg font-extrabold text-slate-800">งวด {period.label}</div>
              <div className="text-xs text-slate-500">{period.from} — {period.to}</div>
            </div>
            <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Company filter */}
            {companies.length > 0 && (
              <select value={selectedCo} onChange={e => { setSelectedCo(e.target.value); setFilterDept("") }}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white">
                <option value="all">ทุกบริษัท ({companies.length})</option>
                {companies.map(c => <option key={c.id} value={c.id}>{(c as any).code ? `[${(c as any).code}] ` : ""}{c.name}</option>)}
              </select>
            )}

            {/* Department filter */}
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white">
              <option value="">ทุกแผนก</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัส / ชื่อเล่น..."
                className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white w-56 focus:border-blue-400 outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1"><Users className="w-4 h-4" /> พนักงาน</div>
          <div className="text-2xl font-extrabold text-slate-800">{summary.employees}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1"><CheckCircle2 className="w-4 h-4" /> มาทำงาน</div>
          <div className="text-2xl font-extrabold text-emerald-700">{summary.totalPresent.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-1"><Clock className="w-4 h-4" /> มาสาย</div>
          <div className="text-2xl font-extrabold text-amber-700">{summary.totalLate.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold mb-1"><AlertTriangle className="w-4 h-4" /> ขาดงาน</div>
          <div className="text-2xl font-extrabold text-rose-700">{summary.totalAbsent.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600 text-xs font-bold mb-1"><CalendarDays className="w-4 h-4" /> ลา</div>
          <div className="text-2xl font-extrabold text-violet-700">{summary.totalLeave.toLocaleString()}</div>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">✓ มาทำงาน</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">สาย</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg">ขาด</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-lg">ลา</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">ลาเช้า/ลาบ่าย</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded-lg">WFH</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">ออกก่อน</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">หยุด</span>
        <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">OT</span>
      </div>

      {/* ── Grid table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead className="bg-slate-50 sticky top-0 z-20">
              {/* Month row */}
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 px-2 py-1 text-left font-bold text-slate-600 border border-slate-200 min-w-[60px]" rowSpan={2}>รหัส</th>
                <th className="sticky left-[60px] z-30 bg-slate-100 px-2 py-1 text-left font-bold text-slate-600 border border-slate-200 min-w-[120px]" rowSpan={2}>ชื่อ-สกุล</th>
                <th className="sticky left-[180px] z-30 bg-slate-100 px-2 py-1 text-left font-bold text-slate-600 border border-slate-200 min-w-[80px]" rowSpan={2}>แผนก</th>
                {allDates.map(d => {
                  const dd = new Date(d + "T00:00:00")
                  const dow = dd.getDay()
                  const isWeekend = dow === 0 || dow === 6
                  return (
                    <th key={d} className={`px-0 py-1 text-center font-bold border border-slate-200 min-w-[44px] ${isWeekend ? "bg-slate-200/60 text-slate-500" : "bg-slate-100 text-slate-600"}`}>
                      <div className="text-[10px] leading-none">{TH_SHORT_DAY[dow]}</div>
                      <div className="text-[11px] leading-none mt-0.5">{dd.getDate()}</div>
                    </th>
                  )
                })}
                {/* Summary columns */}
                <th className="bg-emerald-50 px-1 py-1 text-center font-bold text-emerald-700 border border-slate-200 min-w-[36px]" rowSpan={2} title="มาทำงาน">✓</th>
                <th className="bg-amber-50 px-1 py-1 text-center font-bold text-amber-700 border border-slate-200 min-w-[36px]" rowSpan={2} title="สาย">สาย</th>
                <th className="bg-rose-50 px-1 py-1 text-center font-bold text-rose-700 border border-slate-200 min-w-[36px]" rowSpan={2} title="ขาด">ขาด</th>
                <th className="bg-violet-50 px-1 py-1 text-center font-bold text-violet-700 border border-slate-200 min-w-[36px]" rowSpan={2} title="ลา">ลา</th>
                <th className="bg-amber-50 px-1 py-1 text-center font-bold text-amber-700 border border-slate-200 min-w-[44px]" rowSpan={2} title="สายรวม (นาที)">สาย<br/><span className="text-[8px] font-normal">นาที</span></th>
                <th className="bg-indigo-50 px-1 py-1 text-center font-bold text-indigo-700 border border-slate-200 min-w-[44px]" rowSpan={2} title="OT (นาที)">OT<br/><span className="text-[8px] font-normal">นาที</span></th>
                <th className="bg-blue-50 px-1 py-1 text-center font-bold text-blue-700 border border-slate-200 min-w-[70px]" rowSpan={2} title="เงินสุทธิ">สุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={allDates.length + 10} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                    <div className="text-sm text-slate-500">กำลังโหลด...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={allDates.length + 10} className="text-center py-20 text-slate-400">
                    {rows.length === 0 ? "ไม่มีข้อมูล" : "ไม่พบพนักงานที่ค้นหา"}
                  </td>
                </tr>
              ) : filteredRows.map((emp, idx) => (
                <tr key={emp.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-blue-50/30 transition-colors`}>
                  <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-100 whitespace-nowrap">{emp.employee_code}</td>
                  <td className="sticky left-[60px] z-10 bg-inherit px-2 py-1.5 text-[11px] font-bold text-slate-800 border border-slate-100 whitespace-nowrap">
                    {emp.first_name_th} {emp.last_name_th}
                    {emp.nickname_th && <span className="text-slate-400 font-normal ml-1">({emp.nickname_th})</span>}
                  </td>
                  <td className="sticky left-[180px] z-10 bg-inherit px-2 py-1.5 text-[10px] text-slate-600 border border-slate-100 whitespace-nowrap">{emp.department}</td>
                  {allDates.map(d => renderCell(emp, d))}
                  {/* Summary cells */}
                  <td className="text-center font-bold text-emerald-700 border border-slate-100 text-[11px]">{emp.stats.present || ""}</td>
                  <td className="text-center font-bold text-amber-700 border border-slate-100 text-[11px]">{emp.stats.late || ""}</td>
                  <td className="text-center font-bold text-rose-700 border border-slate-100 text-[11px]">{emp.stats.absent || ""}</td>
                  <td className="text-center font-bold text-violet-700 border border-slate-100 text-[11px]">{emp.stats.leave || ""}</td>
                  <td className="text-center font-bold text-amber-600 border border-slate-100 text-[11px]">{emp.stats.lateMin || ""}</td>
                  <td className="text-center font-bold text-indigo-700 border border-slate-100 text-[11px]">{emp.stats.otMin || ""}</td>
                  <td className="border border-slate-100 text-[11px] relative">
                    {emp.payroll ? (
                      <button onClick={() => setPayrollDetail(payrollDetail === emp.id ? null : emp.id)}
                        className="w-full text-center font-bold text-blue-700 hover:bg-blue-50 py-1 transition-colors"
                        title="กดดูรายละเอียด">
                        {(emp.payroll.net_salary ?? 0).toLocaleString()}
                      </button>
                    ) : (
                      <span className="block text-center text-slate-300 py-1">—</span>
                    )}
                    {payrollDetail === emp.id && emp.payroll && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setPayrollDetail(null)}/>
                        <div className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-64"
                          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                          onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-black text-slate-700">{emp.first_name_th} {emp.last_name_th}</p>
                            <button onClick={() => setPayrollDetail(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                          </div>
                          <div className="space-y-1.5 text-[12px]">
                            <div className="flex justify-between"><span className="text-slate-500">เงินเดือนฐาน</span><span className="font-bold text-slate-700">฿{(emp.payroll.base_salary ?? 0).toLocaleString()}</span></div>
                            {(emp.payroll.ot_amount ?? 0) > 0 && <div className="flex justify-between"><span className="text-indigo-500">OT</span><span className="font-bold text-indigo-600">+฿{(emp.payroll.ot_amount ?? 0).toLocaleString()}</span></div>}
                            {(emp.payroll.bonus ?? 0) > 0 && <div className="flex justify-between"><span className="text-emerald-500">โบนัส</span><span className="font-bold text-emerald-600">+฿{(emp.payroll.bonus ?? 0).toLocaleString()}</span></div>}
                            {(emp.payroll.commission ?? 0) > 0 && <div className="flex justify-between"><span className="text-emerald-500">คอมมิชชั่น</span><span className="font-bold text-emerald-600">+฿{(emp.payroll.commission ?? 0).toLocaleString()}</span></div>}
                            <div className="border-t border-slate-100 my-1.5"/>
                            <div className="flex justify-between"><span className="text-slate-500">รวมรายได้</span><span className="font-bold text-slate-700">฿{(emp.payroll.gross_income ?? 0).toLocaleString()}</span></div>
                            <div className="border-t border-slate-100 my-1.5"/>
                            {((emp.payroll.deduct_late ?? 0) + (emp.payroll.deduct_absent ?? 0)) > 0 && <div className="flex justify-between"><span className="text-amber-500">หักสาย/ขาด</span><span className="font-bold text-amber-600">-฿{((emp.payroll.deduct_late ?? 0) + (emp.payroll.deduct_absent ?? 0)).toLocaleString()}</span></div>}
                            {(emp.payroll.social_security_amount ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">ประกันสังคม</span><span className="font-bold text-slate-600">-฿{(emp.payroll.social_security_amount ?? 0).toLocaleString()}</span></div>}
                            {(emp.payroll.monthly_tax_withheld ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">ภาษี</span><span className="font-bold text-slate-600">-฿{(emp.payroll.monthly_tax_withheld ?? 0).toLocaleString()}</span></div>}
                            <div className="flex justify-between"><span className="text-rose-500">หักรวม</span><span className="font-bold text-rose-600">-฿{(emp.payroll.total_deductions ?? 0).toLocaleString()}</span></div>
                            <div className="border-t border-slate-100 my-1.5"/>
                            <div className="flex justify-between bg-blue-50 rounded-lg px-2 py-1.5 -mx-1"><span className="font-black text-blue-700">เงินสุทธิ</span><span className="font-black text-blue-700">฿{(emp.payroll.net_salary ?? 0).toLocaleString()}</span></div>
                          </div>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        {!loading && filteredRows.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
            แสดง {filteredRows.length} จาก {rows.length} คน
          </div>
        )}
      </div>

      {/* ── Tooltip ────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-xs pointer-events-none max-w-xs"
          style={{ left: Math.min(tooltip.x + 12, window.innerWidth - 280), top: tooltip.y + 12 }}>
          <div className="font-bold text-slate-800 mb-1">{tooltip.emp.first_name_th} {tooltip.emp.last_name_th}</div>
          <div className="text-slate-500 mb-2">{tooltip.cell.work_date}</div>
          {tooltip.leaveInfo && (
            <div className="text-blue-600 font-bold mb-1">{tooltip.leaveInfo}</div>
          )}
          <div className="space-y-0.5">
            <div>สถานะ: <span className="font-bold">{CELL_STYLES[tooltip.cell.status]?.label ?? tooltip.cell.status}</span></div>
            {tooltip.cell.clock_in && <div>เข้า: <span className="font-bold">{fmtTime(tooltip.cell.clock_in)}</span></div>}
            {tooltip.cell.clock_out && <div>ออก: <span className="font-bold">{fmtTime(tooltip.cell.clock_out)}</span></div>}
            {tooltip.cell.late_minutes > 0 && !tooltip.cell.half_day_leave?.includes("morning") && (
              <div>สาย: <span className="font-bold text-amber-600">{tooltip.cell.late_minutes} นาที</span></div>
            )}
            {tooltip.cell.ot_minutes > 0 && (
              <div>OT: <span className="font-bold text-indigo-600">{tooltip.cell.ot_minutes} นาที</span></div>
            )}
            {tooltip.cell.work_minutes > 0 && (
              <div>ทำงาน: <span className="font-bold">{minutesToHM(tooltip.cell.work_minutes)}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
