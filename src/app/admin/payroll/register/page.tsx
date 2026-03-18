"use client"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, Loader2, Search, Filter, ChevronDown,
  ArrowLeft, Building2, Users, Banknote, ChevronRight,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

// ── helpers ──────────────────────────────────────────────────────
const thb = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n = (v: any) => Number(v) || 0

// ── Column definitions ──────────────────────────────────────────
// key: field path in record, label: Thai header
// source: "field" = direct column, "ie" = income_extras, "de" = deduction_extras
interface Col {
  key: string
  label: string
  group: "info" | "income" | "deduction" | "summary"
  source: "field" | "ie" | "de" | "computed"
  editable?: boolean
  width?: number // px
}

const COLUMNS: Col[] = [
  // ── ข้อมูลพนักงาน ──────────────────────────────────────
  { key: "_no",             label: "ลำดับ",              group: "info", source: "computed", width: 50 },
  { key: "employee_code",   label: "รหัส",               group: "info", source: "field", width: 80 },
  { key: "fullname",        label: "ชื่อ-นามสกุล",        group: "info", source: "computed", width: 160 },
  { key: "nickname",        label: "ชื่อเล่น",            group: "info", source: "computed", width: 70 },
  { key: "position",        label: "ตำแหน่ง",            group: "info", source: "computed", width: 140 },
  { key: "department",      label: "แผนก",               group: "info", source: "computed", width: 120 },
  { key: "company_code",    label: "สังกัด",             group: "info", source: "computed", width: 60 },
  { key: "brand",           label: "แบรนด์",             group: "info", source: "computed", width: 80 },
  // ── รายรับ ─────────────────────────────────────────────
  { key: "base_salary",        label: "เงินเดือน",              group: "income", source: "field" },
  { key: "bonus",              label: "โบนัส",                  group: "income", source: "field", editable: true },
  { key: "ot_weekday",         label: "OT 1.5×",               group: "income", source: "computed" },
  { key: "ot_holiday_reg",     label: "OT 1.0×",               group: "income", source: "computed" },
  { key: "ot_holiday_ot",      label: "OT 3.0×",               group: "income", source: "computed" },
  { key: "allowance_position", label: "ค่าตำแหน่ง",             group: "income", source: "field" },
  { key: "kpi",                label: "KPI",                   group: "income", source: "ie", editable: true },
  { key: "commission",         label: "Commission",            group: "income", source: "field", editable: true },
  { key: "incentive",          label: "Incentive",             group: "income", source: "ie", editable: true },
  { key: "performance_bonus",  label: "Performance Bonus",     group: "income", source: "ie", editable: true },
  { key: "service_fee",        label: "ค่าบริการ",              group: "income", source: "ie", editable: true },
  { key: "allowance_transport",label: "ค่าเดินทาง",             group: "income", source: "field" },
  { key: "depreciation",       label: "ค่าเสื่อมสภาพ",          group: "income", source: "ie", editable: true },
  { key: "expressway",         label: "ค่าทางด่วน",             group: "income", source: "ie", editable: true },
  { key: "fuel",               label: "ค่าน้ำมัน",              group: "income", source: "ie", editable: true },
  { key: "campaign",           label: "แคมเปญ",               group: "income", source: "ie", editable: true },
  { key: "retirement_fund",    label: "ค่าโครงการเกษียณ",       group: "income", source: "ie", editable: true },
  { key: "per_diem",           label: "เบี้ยเลี้ยง",            group: "income", source: "ie", editable: true },
  { key: "diligence_bonus",    label: "เบี้ยขยัน",              group: "income", source: "ie", editable: true },
  { key: "referral_bonus",     label: "เพื่อนแนะนำเพื่อน",       group: "income", source: "ie", editable: true },
  { key: "other_income",       label: "รายได้อื่นๆ",            group: "income", source: "field", editable: true },
  // ── รายหัก ─────────────────────────────────────────────
  { key: "deduct_late",        label: "หักมาสาย",              group: "deduction", source: "field" },
  { key: "deduct_absent",      label: "ขาดงาน/ลางาน",         group: "deduction", source: "field" },
  { key: "suspension",         label: "พักงาน",               group: "deduction", source: "de", editable: true },
  { key: "deduct_other",       label: "เงินหักอื่นๆ",           group: "deduction", source: "field", editable: true },
  { key: "_sub_deduct",        label: "รวมเป็นเงิน",           group: "deduction", source: "computed" },
  { key: "card_lost",          label: "บัตรหาย/ชำรุด",         group: "deduction", source: "de", editable: true },
  { key: "uniform",            label: "ค่าซื้อเสื้อ",           group: "deduction", source: "de", editable: true },
  { key: "parking",            label: "ค่าบัตรจอดรถ",          group: "deduction", source: "de", editable: true },
  { key: "employee_products",  label: "สินค้าพนง.",            group: "deduction", source: "de", editable: true },
  { key: "legal_enforcement",  label: "กรมบังคับคดี",          group: "deduction", source: "de", editable: true },
  { key: "student_loan",       label: "กยศ.",                 group: "deduction", source: "de", editable: true },
  { key: "social_security_amount", label: "ประกันสังคม",       group: "deduction", source: "field" },
  { key: "monthly_tax_withheld",   label: "ภาษีหัก ณ ที่จ่าย", group: "deduction", source: "field" },
  // ── สรุป ───────────────────────────────────────────────
  { key: "gross_income",       label: "รวมรายรับ",             group: "summary", source: "field" },
  { key: "total_deductions",   label: "รวมรายหัก",             group: "summary", source: "field" },
  { key: "net_salary",         label: "ยอดสุทธิ",             group: "summary", source: "field" },
]

const INFO_COLS = COLUMNS.filter(c => c.group === "info")
const DATA_COLS = COLUMNS.filter(c => c.group !== "info")

// ── Get cell value ──────────────────────────────────────────────
function getCellValue(rec: any, col: Col): number | string {
  const emp = rec.employee || {}
  const ie  = rec.income_extras || {}
  const de  = rec.deduction_extras || {}

  switch (col.key) {
    case "_no":            return ""  // filled by render
    case "employee_code":  return emp.employee_code || ""
    case "fullname":       return `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim()
    case "nickname":       return emp.nickname || ""
    case "position":       return emp.position?.name || ""
    case "department":     return emp.department?.name || ""
    case "company_code":   return emp.company?.code || ""
    case "brand":          return emp.brand || ""
    // OT computed from minutes
    case "ot_weekday":     return n(rec.ot_weekday_minutes) > 0 ? calcOTAmount(n(rec.base_salary), n(rec.ot_weekday_minutes), 1.5) : 0
    case "ot_holiday_reg": return n(rec.ot_holiday_reg_minutes) > 0 ? calcOTAmount(n(rec.base_salary), n(rec.ot_holiday_reg_minutes), 1.0) : 0
    case "ot_holiday_ot":  return n(rec.ot_holiday_ot_minutes) > 0 ? calcOTAmount(n(rec.base_salary), n(rec.ot_holiday_ot_minutes), 3.0) : 0
    // Sub deduct = late + absent + suspension + other
    case "_sub_deduct":
      return n(rec.deduct_late) + n(rec.deduct_absent) + n(de.suspension) + n(rec.deduct_other)
    default:
      break
  }
  if (col.source === "ie") return n(ie[col.key])
  if (col.source === "de") return n(de[col.key])
  return n(rec[col.key])
}

function calcOTAmount(base: number, minutes: number, rate: number): number {
  return Math.round((base / 30 / 8) * (minutes / 60) * rate * 100) / 100
}

// ── Group header colors ─────────────────────────────────────────
const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  income:    { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  deduction: { bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200" },
  summary:   { bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-200" },
}

// ── Main Page ───────────────────────────────────────────────────
export default function PayrollRegisterPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [periods,    setPeriods]    = useState<any[]>([])
  const [periodId,   setPeriodId]   = useState("")
  const [records,    setRecords]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterCo,   setFilterCo]   = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  // Load periods
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payroll_periods")
        .select("id, year, month, start_date, end_date, company:companies(id, code, name_th)")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24)
      setPeriods(data ?? [])
      if (data?.[0]) setPeriodId(data[0].id)
    }
    if (user) load()
  }, [user]) // eslint-disable-line

  // Load register data
  const loadData = useCallback(async () => {
    if (!periodId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/register?period_id=${periodId}`)
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      setRecords(json.records || [])
    } catch { toast.error("โหลดข้อมูลไม่สำเร็จ") }
    finally { setLoading(false) }
  }, [periodId])

  useEffect(() => { loadData() }, [loadData])

  // ── Unique departments & companies for filter ─────────────
  const departments = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => { if (r.employee?.department?.name) set.add(r.employee.department.name) })
    return Array.from(set).sort()
  }, [records])

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    records.forEach(r => {
      const co = r.employee?.company
      if (co) map.set(co.code, co.name_th)
    })
    return Array.from(map.entries()).sort()
  }, [records])

  // ── Filtered records ──────────────────────────────────────
  const filtered = useMemo(() => {
    return records.filter(r => {
      const emp = r.employee || {}
      if (filterDept && emp.department?.name !== filterDept) return false
      if (filterCo && emp.company?.code !== filterCo) return false
      if (search) {
        const q = search.toLowerCase()
        const name = `${emp.first_name_th || ""} ${emp.last_name_th || ""} ${emp.nickname || ""} ${emp.employee_code || ""}`.toLowerCase()
        if (!name.includes(q)) return false
      }
      return true
    })
  }, [records, filterDept, filterCo, search])

  // ── Summary row ───────────────────────────────────────────
  const totals = useMemo(() => {
    const sums: Record<string, number> = {}
    DATA_COLS.forEach(col => { sums[col.key] = 0 })
    filtered.forEach(r => {
      DATA_COLS.forEach(col => {
        const v = getCellValue(r, col)
        if (typeof v === "number") sums[col.key] += v
      })
    })
    return sums
  }, [filtered])

  // ── Department summary ────────────────────────────────────
  const deptSummary = useMemo(() => {
    const map = new Map<string, { count: number; gross: number; deduct: number; net: number }>()
    filtered.forEach(r => {
      const dept = r.employee?.department?.name || "ไม่ระบุ"
      const prev = map.get(dept) || { count: 0, gross: 0, deduct: 0, net: 0 }
      prev.count++
      prev.gross  += n(r.gross_income)
      prev.deduct += n(r.total_deductions)
      prev.net    += n(r.net_salary)
      map.set(dept, prev)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].net - a[1].net)
  }, [filtered])

  // ── Excel export ──────────────────────────────────────────
  const exportExcel = () => {
    const period = periods.find(p => p.id === periodId)
    const pLabel = period ? `${period.year}-${String(period.month).padStart(2, "0")}` : "payroll"

    // Main sheet
    const rows = filtered.map((r, i) => {
      const row: Record<string, any> = {}
      COLUMNS.forEach(col => {
        if (col.key === "_no") { row["ลำดับ"] = i + 1; return }
        const v = getCellValue(r, col)
        row[col.label] = v
      })
      return row
    })

    // Add totals row
    const totalRow: Record<string, any> = { "ลำดับ": "", "รหัส": "", "ชื่อ-นามสกุล": "รวมทั้งหมด" }
    DATA_COLS.forEach(col => { totalRow[col.label] = totals[col.key] || 0 })
    rows.push(totalRow)

    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const widths = COLUMNS.map(c => ({ wch: Math.max((c.label.length * 2), (c.width || 90) / 7) }))
    ws["!cols"] = widths

    // Department summary sheet
    const deptRows = deptSummary.map(([dept, d]) => ({
      "แผนก": dept,
      "จำนวนคน": d.count,
      "รวมรายรับ": d.gross,
      "รวมรายหัก": d.deduct,
      "ยอดสุทธิ": d.net,
    }))
    deptRows.push({
      "แผนก": "รวมทั้งหมด",
      "จำนวนคน": filtered.length,
      "รวมรายรับ": totals.gross_income || 0,
      "รวมรายหัก": totals.total_deductions || 0,
      "ยอดสุทธิ": totals.net_salary || 0,
    })
    const ws2 = XLSX.utils.json_to_sheet(deptRows)
    ws2["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Register")
    XLSX.utils.book_append_sheet(wb, ws2, "สรุปแผนก")

    XLSX.writeFile(wb, `payroll-register-${pLabel}.xlsx`)
    toast.success("ดาวน์โหลดสำเร็จ")
  }

  // ── Period label ──────────────────────────────────────────
  const periodLabel = (p: any) => {
    const m = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    return `${m[p.month]} ${p.year + 543}`
  }

  const currentPeriod = periods.find(p => p.id === periodId)

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/payroll"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h2 className="text-xl font-black text-slate-800">Payroll Register</h2>
            <p className="text-xs text-slate-400">ตารางเงินเดือนรวม · กรองตามแผนก/บริษัท · Export Excel</p>
          </div>
        </div>
        <button onClick={exportExcel} disabled={loading || filtered.length === 0}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
          <Download size={14}/> Export Excel
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
        {/* Period selector */}
        <div className="relative">
          <select value={periodId} onChange={e => setPeriodId(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10">
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {periodLabel(p)} {p.company?.code ? `(${p.company.code})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* Company filter */}
        <div className="relative">
          <select value={filterCo} onChange={e => setFilterCo(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400">
            <option value="">ทุกบริษัท</option>
            {companies.map(([code, name]) => (
              <option key={code} value={code}>{code} – {name}</option>
            ))}
          </select>
          <Building2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* Department filter */}
        <div className="relative">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400">
            <option value="">ทุกแผนก</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Users size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, รหัส..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"/>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 ml-auto">
          <span className="flex items-center gap-1"><Users size={11}/> {filtered.length} คน</span>
          <span className="flex items-center gap-1 font-bold text-emerald-600"><Banknote size={11}/> ฿{thb(totals.net_salary || 0)}</span>
        </div>
      </div>

      {/* Department summary cards */}
      {deptSummary.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {deptSummary.map(([dept, d]) => (
            <button key={dept} onClick={() => setFilterDept(filterDept === dept ? "" : dept)}
              className={`flex-shrink-0 rounded-xl border-2 px-3 py-2 text-left transition-all ${
                filterDept === dept
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-100 bg-white hover:border-slate-200"
              }`}>
              <p className="text-[10px] font-bold text-slate-500 truncate max-w-32">{dept}</p>
              <p className="text-sm font-black text-slate-800">{d.count} <span className="text-[10px] text-slate-400">คน</span></p>
              <p className="text-xs font-bold text-emerald-600">฿{thb(d.net)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-100">
          <Loader2 size={24} className="animate-spin text-indigo-400"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-100 text-slate-300">
          <Banknote size={32} className="mb-2"/>
          <p className="text-sm">ไม่มีข้อมูลเงินเดือนในงวดนี้</p>
          <p className="text-xs mt-1">กรุณาคำนวณเงินเดือนที่หน้า Payroll ก่อน</p>
        </div>
      ) : (
        <div ref={tableRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              {/* Group headers */}
              <thead>
                <tr className="border-b border-slate-200">
                  <th colSpan={INFO_COLS.length}
                    className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border-r border-slate-200 sticky left-0 z-10">
                    ข้อมูลพนักงาน
                  </th>
                  {(["income", "deduction", "summary"] as const).map(g => {
                    const cols = DATA_COLS.filter(c => c.group === g)
                    const gc = GROUP_COLORS[g]
                    return (
                      <th key={g} colSpan={cols.length}
                        className={`px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider ${gc.text} ${gc.bg} border-r last:border-r-0 ${gc.border}`}>
                        {g === "income" ? "รายรับ" : g === "deduction" ? "รายหัก" : "สรุป"}
                      </th>
                    )
                  })}
                </tr>

                {/* Column headers */}
                <tr className="border-b-2 border-slate-200">
                  {INFO_COLS.map((col, i) => (
                    <th key={col.key}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-2 py-2.5 text-left font-bold text-slate-600 bg-slate-50 whitespace-nowrap ${
                        i === INFO_COLS.length - 1 ? "border-r border-slate-200 sticky left-0 z-10" : ""
                      }`}>
                      {col.label}
                    </th>
                  ))}
                  {DATA_COLS.map(col => {
                    const gc = GROUP_COLORS[col.group]
                    return (
                      <th key={col.key}
                        className={`px-2 py-2.5 text-right font-bold whitespace-nowrap ${gc?.text || "text-slate-600"} ${gc?.bg || "bg-slate-50"}`}>
                        {col.label}
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filtered.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                    {INFO_COLS.map((col, i) => {
                      const v = col.key === "_no" ? idx + 1 : getCellValue(rec, col)
                      return (
                        <td key={col.key}
                          style={{ width: col.width, minWidth: col.width }}
                          className={`px-2 py-2 whitespace-nowrap ${
                            col.key === "_no" ? "text-center text-slate-400" :
                            col.key === "employee_code" ? "font-bold text-indigo-600" :
                            col.key === "fullname" ? "font-bold text-slate-800" :
                            "text-slate-600"
                          } ${i === INFO_COLS.length - 1 ? "border-r border-slate-200 sticky left-0 z-10 bg-white" : ""}`}>
                          {v}
                        </td>
                      )
                    })}
                    {DATA_COLS.map(col => {
                      const v = getCellValue(rec, col)
                      const numVal = typeof v === "number" ? v : 0
                      const isZero = numVal === 0
                      const isSummary = col.group === "summary"
                      return (
                        <td key={col.key}
                          className={`px-2 py-2 text-right whitespace-nowrap font-mono ${
                            isSummary && col.key === "net_salary" ? "font-black text-emerald-700 bg-emerald-50/50" :
                            isSummary && col.key === "total_deductions" ? "font-bold text-rose-600 bg-rose-50/30" :
                            isSummary ? "font-bold text-indigo-700 bg-indigo-50/30" :
                            col.group === "deduction" && !isZero ? "text-rose-600" :
                            col.group === "income" && !isZero ? "text-slate-700" :
                            "text-slate-300"
                          }`}>
                          {isZero && !isSummary ? "-" : thb(numVal)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
                  {INFO_COLS.map((col, i) => (
                    <td key={col.key}
                      className={`px-2 py-3 ${
                        col.key === "fullname" ? "text-slate-700" : ""
                      } ${i === INFO_COLS.length - 1 ? "border-r border-slate-200 sticky left-0 z-10 bg-slate-50" : ""}`}>
                      {col.key === "fullname" ? `รวม ${filtered.length} คน` : ""}
                    </td>
                  ))}
                  {DATA_COLS.map(col => {
                    const v = totals[col.key] || 0
                    const isSummary = col.group === "summary"
                    return (
                      <td key={col.key}
                        className={`px-2 py-3 text-right whitespace-nowrap font-mono ${
                          isSummary && col.key === "net_salary" ? "text-emerald-700 bg-emerald-100/50" :
                          isSummary && col.key === "total_deductions" ? "text-rose-600" :
                          col.group === "deduction" && v > 0 ? "text-rose-600" :
                          "text-slate-700"
                        }`}>
                        {v === 0 ? "-" : thb(v)}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Company totals */}
      {companies.length > 0 && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-indigo-500"/> สรุปยอดตามบริษัท
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              const coMap = new Map<string, { name: string; count: number; gross: number; deduct: number; net: number }>()
              filtered.forEach(r => {
                const co = r.employee?.company
                const code = co?.code || "N/A"
                const prev = coMap.get(code) || { name: co?.name_th || "", count: 0, gross: 0, deduct: 0, net: 0 }
                prev.count++
                prev.gross  += n(r.gross_income)
                prev.deduct += n(r.total_deductions)
                prev.net    += n(r.net_salary)
                coMap.set(code, prev)
              })
              return Array.from(coMap.entries()).map(([code, d]) => (
                <div key={code} className="rounded-xl border-2 border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500 text-white text-xs font-black">
                      {code.slice(0, 3)}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-800">{code}</p>
                      <p className="text-[10px] text-slate-500">{d.name}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-slate-500">{d.count} คน</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400">รายรับ</p>
                      <p className="text-xs font-black text-slate-700">฿{thb(d.gross)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">รายหัก</p>
                      <p className="text-xs font-black text-rose-600">฿{thb(d.deduct)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">สุทธิ</p>
                      <p className="text-xs font-black text-emerald-600">฿{thb(d.net)}</p>
                    </div>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
