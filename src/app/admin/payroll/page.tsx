"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, Play, CheckCircle, Loader2, Plus,
  ChevronDown, AlertCircle, TrendingUp, Users, Banknote,
  Clock, Info, Search, Eye, Edit2, Save, X, RotateCcw, Table2, Filter
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

// ── helpers ────────────────────────────────────────────────────────────
const thb = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: any) => parseFloat(String(v).replace(/,/g, "")) || 0

const inpCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full text-right"
const inpFull = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full"

const STATUS_CFG: Record<string, { l: string; c: string; dot: string }> = {
  draft:    { l: "ฉบับร่าง",    c: "bg-slate-100 text-slate-600",  dot: "bg-slate-400"  },
  approved: { l: "อนุมัติแล้ว", c: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  paid:     { l: "จ่ายแล้ว",    c: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
}

// ── Full Register Table Columns ─────────────────────────────────────────
const n = (v: any) => Number(v) || 0
const calcOTAmt = (base: number, min: number, rate: number) =>
  min > 0 ? Math.round((base / 30 / 8) * (min / 60) * rate * 100) / 100 : 0

// Column definition
interface RCol { key: string; label: string; group: "info"|"income"|"deduction"|"summary"; get: (r: any, i: number) => string | number }

const REG_COLS: RCol[] = [
  // info
  { key:"no",    label:"ลำดับ",          group:"info", get:(_,i)=>i+1 },
  { key:"code",  label:"รหัสพนักงาน",     group:"info", get:r=>r.employee?.employee_code||"" },
  { key:"name",  label:"ชื่อ-นามสกุล",    group:"info", get:r=>`${r.employee?.first_name_th||""} ${r.employee?.last_name_th||""}`.trim() },
  { key:"nick",  label:"ชื่อเล่น",        group:"info", get:r=>r.employee?.nickname||"" },
  { key:"pos",   label:"ตำแหน่ง",        group:"info", get:r=>r.employee?.position?.name||"" },
  { key:"dept",  label:"แผนก",           group:"info", get:r=>r.employee?.department?.name||"" },
  { key:"comp",  label:"สังกัด",         group:"info", get:r=>r.employee?.company?.code||"" },
  { key:"brand", label:"แบรนด์",         group:"info", get:r=>r.employee?.brand||"" },
  // income
  { key:"base",        label:"เงินเดือน",            group:"income", get:r=>n(r.base_salary) },
  { key:"bonus",       label:"โบนัส",                group:"income", get:r=>n(r.bonus) },
  { key:"ot15",        label:"OT ×1.5",             group:"income", get:r=>calcOTAmt(n(r.base_salary),n(r.ot_weekday_minutes),1.5) },
  { key:"ot10",        label:"OT ×1.0",             group:"income", get:r=>calcOTAmt(n(r.base_salary),n(r.ot_holiday_reg_minutes),1.0) },
  { key:"ot30",        label:"OT ×3.0",             group:"income", get:r=>calcOTAmt(n(r.base_salary),n(r.ot_holiday_ot_minutes),3.0) },
  { key:"pos_allow",   label:"ค่าตำแหน่ง",           group:"income", get:r=>n(r.allowance_position) },
  { key:"kpi",         label:"KPI",                 group:"income", get:r=>n((r.income_extras||{}).kpi) },
  { key:"commission",  label:"Commission",          group:"income", get:r=>n(r.commission) },
  { key:"incentive",   label:"Incentive",           group:"income", get:r=>n((r.income_extras||{}).incentive) },
  { key:"perf",        label:"Performance Bonus",   group:"income", get:r=>n((r.income_extras||{}).performance_bonus) },
  { key:"service",     label:"ค่าบริการ",             group:"income", get:r=>n((r.income_extras||{}).service_fee) },
  { key:"transport",   label:"ค่าเดินทาง",            group:"income", get:r=>n(r.allowance_transport) },
  { key:"deprec",      label:"ค่าเสื่อมสภาพ",         group:"income", get:r=>n((r.income_extras||{}).depreciation) },
  { key:"express",     label:"ค่าทางด่วน",            group:"income", get:r=>n((r.income_extras||{}).expressway) },
  { key:"fuel",        label:"ค่าน้ำมัน",              group:"income", get:r=>n((r.income_extras||{}).fuel) },
  { key:"campaign",    label:"แคมเปญ",              group:"income", get:r=>n((r.income_extras||{}).campaign) },
  { key:"retire",      label:"ค่าโครงการเกษียณ",      group:"income", get:r=>n((r.income_extras||{}).retirement_fund) },
  { key:"perdiem",     label:"เบี้ยเลี้ยง",            group:"income", get:r=>n((r.income_extras||{}).per_diem) },
  { key:"diligence",   label:"เบี้ยขยัน",              group:"income", get:r=>n((r.income_extras||{}).diligence_bonus) },
  { key:"referral",    label:"เพื่อนแนะนำเพื่อน",       group:"income", get:r=>n((r.income_extras||{}).referral_bonus) },
  { key:"other_inc",   label:"รายได้อื่นๆ",            group:"income", get:r=>n(r.other_income) },
  // deduction
  { key:"late",        label:"หักมาสาย",             group:"deduction", get:r=>n(r.deduct_late) },
  { key:"absent",      label:"ขาดงาน/ลางาน",        group:"deduction", get:r=>n(r.deduct_absent) },
  { key:"suspend",     label:"พักงาน",              group:"deduction", get:r=>n((r.deduction_extras||{}).suspension) },
  { key:"ded_other",   label:"เงินหักอื่นๆ",          group:"deduction", get:r=>n(r.deduct_other) },
  { key:"sub_ded",     label:"รวมเป็นเงิน",          group:"deduction", get:r=>n(r.deduct_late)+n(r.deduct_absent)+n((r.deduction_extras||{}).suspension)+n(r.deduct_other) },
  { key:"card",        label:"บัตรหาย/ชำรุด",        group:"deduction", get:r=>n((r.deduction_extras||{}).card_lost) },
  { key:"uniform",     label:"ค่าซื้อเสื้อพนักงาน",    group:"deduction", get:r=>n((r.deduction_extras||{}).uniform) },
  { key:"parking",     label:"ค่าบัตรจอดรถ",         group:"deduction", get:r=>n((r.deduction_extras||{}).parking) },
  { key:"emp_prod",    label:"สินค้าพนักงาน",         group:"deduction", get:r=>n((r.deduction_extras||{}).employee_products) },
  { key:"legal",       label:"กรมบังคับคดี",          group:"deduction", get:r=>n((r.deduction_extras||{}).legal_enforcement) },
  { key:"student",     label:"กยศ.",                group:"deduction", get:r=>n((r.deduction_extras||{}).student_loan) },
  { key:"sso",         label:"ประกันสังคม",           group:"deduction", get:r=>n(r.social_security_amount) },
  { key:"tax",         label:"ภาษีหัก ณ ที่จ่าย",     group:"deduction", get:r=>n(r.monthly_tax_withheld) },
  // summary
  { key:"gross",       label:"รวมรายรับ",             group:"summary", get:r=>n(r.gross_income) },
  { key:"total_ded",   label:"รวมรายหัก",             group:"summary", get:r=>n(r.total_deductions) },
  { key:"net",         label:"ยอดคงเหลือสุทธิ",       group:"summary", get:r=>n(r.net_salary) },
]

const INFO_C = REG_COLS.filter(c => c.group === "info")
const DATA_C = REG_COLS.filter(c => c.group !== "info")

// ── Full Register Table Component ───────────────────────────────────────
function FullRegisterTable({ records, onEdit, onView }: { records: any[]; onEdit: (r:any)=>void; onView: (r:any)=>void }) {
  // Compute totals
  const totals: Record<string, number> = {}
  DATA_C.forEach(col => { totals[col.key] = 0 })
  records.forEach((r, i) => {
    DATA_C.forEach(col => { const v = col.get(r, i); if (typeof v === "number") totals[col.key] += v })
  })

  const GC: Record<string, { bg: string; text: string }> = {
    income:    { bg: "bg-emerald-50",  text: "text-emerald-700" },
    deduction: { bg: "bg-rose-50",     text: "text-rose-700" },
    summary:   { bg: "bg-indigo-50",   text: "text-indigo-700" },
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse whitespace-nowrap">
        {/* Group header */}
        <thead>
          <tr>
            <th colSpan={INFO_C.length + 1} className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border-r border-slate-200">
              ข้อมูลพนักงาน
            </th>
            {(["income","deduction","summary"] as const).map(g => (
              <th key={g} colSpan={DATA_C.filter(c=>c.group===g).length}
                className={`px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider ${GC[g].text} ${GC[g].bg} border-r last:border-r-0 border-slate-200`}>
                {g === "income" ? "รายรับ" : g === "deduction" ? "รายหัก" : "สรุป"}
              </th>
            ))}
          </tr>
          {/* Column headers */}
          <tr className="border-b-2 border-slate-200">
            {INFO_C.map(col => (
              <th key={col.key} className="px-2 py-2 text-left font-bold text-slate-600 bg-slate-50">{col.label}</th>
            ))}
            <th className="px-2 py-2 text-center font-bold text-slate-400 bg-slate-50 border-r border-slate-200 w-12"></th>
            {DATA_C.map(col => {
              const gc = GC[col.group]
              return <th key={col.key} className={`px-2 py-2 text-right font-bold ${gc.text} ${gc.bg}`}>{col.label}</th>
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.map((r, idx) => (
            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
              {INFO_C.map(col => {
                const v = col.get(r, idx)
                return (
                  <td key={col.key} className={`px-2 py-1.5 ${
                    col.key === "no" ? "text-center text-slate-400 w-10" :
                    col.key === "code" ? "font-bold text-indigo-600" :
                    col.key === "name" ? "font-bold text-slate-800" :
                    "text-slate-600"
                  }`}>{v}</td>
                )
              })}
              {/* actions mini */}
              <td className="px-1 py-1.5 text-center border-r border-slate-100">
                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onView(r)} className="p-1 hover:bg-indigo-100 rounded text-indigo-500"><Eye size={10}/></button>
                  <button onClick={() => onEdit(r)} className="p-1 hover:bg-amber-100 rounded text-amber-500"><Edit2 size={10}/></button>
                </div>
              </td>
              {DATA_C.map(col => {
                const v = col.get(r, idx)
                const numVal = typeof v === "number" ? v : 0
                const zero = numVal === 0
                const isSummary = col.group === "summary"
                return (
                  <td key={col.key} className={`px-2 py-1.5 text-right font-mono ${
                    isSummary && col.key === "net" ? "font-black text-emerald-700 bg-emerald-50/40" :
                    isSummary && col.key === "total_ded" ? "font-bold text-rose-600" :
                    isSummary ? "font-bold text-indigo-700 bg-indigo-50/30" :
                    col.group === "deduction" && !zero ? "text-rose-600" :
                    col.group === "income" && !zero ? "text-slate-700" :
                    "text-slate-300"
                  }`}>
                    {zero && !isSummary ? "-" : thb(numVal)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
            <td colSpan={INFO_C.length} className="px-2 py-2.5 text-slate-700">รวม {records.length} คน</td>
            <td className="border-r border-slate-200"/>
            {DATA_C.map(col => (
              <td key={col.key} className={`px-2 py-2.5 text-right font-mono ${
                col.key === "net" ? "text-emerald-700 bg-emerald-100/50" :
                col.key === "total_ded" ? "text-rose-600" :
                col.group === "deduction" && (totals[col.key]||0) > 0 ? "text-rose-600" :
                "text-slate-700"
              }`}>
                {(totals[col.key] || 0) === 0 ? "-" : thb(totals[col.key])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Compact Table (original view) ───────────────────────────────────────
function CompactTable({ records, totalNet, onEdit, onView }: { records: any[]; totalNet: number; onEdit: (r:any)=>void; onView: (r:any)=>void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-bold text-slate-500">พนักงาน</th>
            <th className="px-3 py-3 text-right font-bold text-slate-500">เงินเดือน</th>
            <th className="px-3 py-3 text-right font-bold text-green-700">เบี้ย+อื่น</th>
            <th className="px-3 py-3 text-left font-bold text-amber-600">OT</th>
            <th className="px-3 py-3 text-right font-bold text-red-600">หักสาย/ขาด</th>
            <th className="px-3 py-3 text-right font-bold text-slate-500">SSO</th>
            <th className="px-3 py-3 text-right font-bold text-slate-500">ภาษี</th>
            <th className="px-3 py-3 text-right font-bold text-indigo-700">สุทธิ</th>
            <th className="px-3 py-3 text-center font-bold text-slate-500 w-20">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.map((r: any) => {
            const totalAllow = n(r.allowance_position)+n(r.allowance_transport)+n(r.allowance_food)+n(r.allowance_phone)+n(r.allowance_housing)+n(r.allowance_other)
            const totalDeductWork = n(r.deduct_late)+n(r.deduct_absent)
            return (
              <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.is_manual_override ? "bg-amber-50/30" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0 overflow-hidden">
                      {r.employee?.avatar_url ? <img src={r.employee.avatar_url} alt="" className="w-full h-full object-cover"/> : r.employee?.first_name_th?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 whitespace-nowrap">{r.employee?.first_name_th} {r.employee?.last_name_th} {r.is_manual_override && <span className="text-amber-500">✎</span>}</p>
                      <p className="text-[10px] text-slate-400">{r.employee?.employee_code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right"><p className="font-bold text-slate-700">฿{thb(r.base_salary)}</p></td>
                <td className="px-3 py-3 text-right">{totalAllow > 0 ? <p className="font-semibold text-green-700">+฿{thb(totalAllow)}</p> : <span className="text-slate-200">—</span>}</td>
                <td className="px-3 py-3">{n(r.ot_amount) > 0 ? <p className="font-bold text-amber-700">+฿{thb(r.ot_amount)}</p> : <span className="text-slate-200">—</span>}</td>
                <td className="px-3 py-3 text-right">{totalDeductWork > 0 ? <p className="font-bold text-red-600">-฿{thb(totalDeductWork)}</p> : <span className="text-slate-200">—</span>}</td>
                <td className="px-3 py-3 text-right text-slate-600">-฿{thb(r.social_security_amount)}</td>
                <td className="px-3 py-3 text-right text-slate-600">-฿{thb(r.monthly_tax_withheld)}</td>
                <td className="px-3 py-3 text-right"><p className="text-sm font-black text-indigo-700">฿{thb(r.net_salary)}</p></td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onView(r)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-500"><Eye size={12}/></button>
                    <button onClick={() => onEdit(r)} className={`p-1.5 rounded-lg ${r.is_manual_override ? "bg-amber-100 text-amber-600" : "hover:bg-slate-100 text-slate-400"}`}><Edit2 size={12}/></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-indigo-50 border-t-2 border-indigo-100">
          <tr>
            <td className="px-4 py-3 font-black text-slate-700">{records.length} คน</td>
            <td className="px-3 py-3 text-right font-bold text-slate-700">฿{thb(records.reduce((s:number,r:any)=>s+n(r.base_salary),0))}</td>
            <td className="px-3 py-3 text-right font-bold text-green-700">฿{thb(records.reduce((s:number,r:any)=>s+n(r.allowance_position)+n(r.allowance_transport)+n(r.allowance_food)+n(r.allowance_phone)+n(r.allowance_housing),0))}</td>
            <td className="px-3 py-3 font-bold text-amber-700">฿{thb(records.reduce((s:number,r:any)=>s+n(r.ot_amount),0))}</td>
            <td className="px-3 py-3 text-right font-bold text-red-600">-฿{thb(records.reduce((s:number,r:any)=>s+n(r.deduct_late)+n(r.deduct_absent),0))}</td>
            <td className="px-3 py-3 text-right font-bold text-slate-600">-฿{thb(records.reduce((s:number,r:any)=>s+n(r.social_security_amount),0))}</td>
            <td className="px-3 py-3 text-right font-bold text-slate-600">-฿{thb(records.reduce((s:number,r:any)=>s+n(r.monthly_tax_withheld),0))}</td>
            <td className="px-3 py-3 text-right font-black text-indigo-700 text-sm">฿{thb(totalNet)}</td>
            <td/>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Export XLSX ──────────────────────────────────────────────────────────
function exportXLSX(records: any[], period: any) {
  const pLabel = period ? `${period.year}-${String(period.month).padStart(2, "0")}` : "payroll"

  const rows = records.map((r, i) => {
    const row: Record<string, any> = {}
    REG_COLS.forEach(col => { row[col.label] = col.get(r, i) })
    return row
  })

  // Totals row
  const totalRow: Record<string, any> = {}
  REG_COLS.forEach(col => {
    if (col.group === "info") { totalRow[col.label] = col.key === "name" ? "รวมทั้งหมด" : ""; return }
    totalRow[col.label] = records.reduce((s: number, r: any, i: number) => { const v = col.get(r, i); return typeof v === "number" ? s + v : s }, 0)
  })
  rows.push(totalRow)

  // Dept summary sheet
  const deptMap = new Map<string, { count: number; gross: number; deduct: number; net: number }>()
  records.forEach((r: any) => {
    const d = r.employee?.department?.name || "ไม่ระบุ"
    const p = deptMap.get(d) || { count: 0, gross: 0, deduct: 0, net: 0 }
    p.count++; p.gross += n(r.gross_income); p.deduct += n(r.total_deductions); p.net += n(r.net_salary)
    deptMap.set(d, p)
  })
  const deptRows = Array.from(deptMap.entries()).map(([dept, d]) => ({
    "แผนก": dept, "จำนวนคน": d.count, "รวมรายรับ": d.gross, "รวมรายหัก": d.deduct, "ยอดสุทธิ": d.net
  }))

  const ws  = XLSX.utils.json_to_sheet(rows)
  const ws2 = XLSX.utils.json_to_sheet(deptRows)
  const wb  = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Payroll Register")
  XLSX.utils.book_append_sheet(wb, ws2, "สรุปแผนก")
  XLSX.writeFile(wb, `payroll-register-${pLabel}.xlsx`)
  toast.success("ดาวน์โหลด Excel สำเร็จ")
}

// งวดเงินเดือน: 22 เดือนก่อน → 21 เดือนปัจจุบัน
function periodLabel(p: any) {
  const startD = new Date(p.year, p.month - 2, 22) // 22 ของเดือนก่อน
  const endD   = new Date(p.year, p.month - 1, 21) // 21 ของเดือนนี้
  const bud    = format(new Date(p.year, p.month - 1), "MMMM", { locale: th }) + " " + (p.year + 543)
  const range  = `${format(startD, "d MMM yy", { locale: th })} – ${format(endD, "d MMM yy", { locale: th })}`
  return `${bud}  (${range})`
}

// ── OT badge ───────────────────────────────────────────────────────────
function OTBadge({ label, minutes, color }: { label: string; minutes: number; color: string }) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60), m = minutes % 60
  return (
    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {label} {h > 0 ? `${h}ชม.` : ""}{m > 0 ? `${m}น.` : ""}
    </span>
  )
}

// ── Edit payroll modal ─────────────────────────────────────────────────
function EditModal({
  record, onClose, onSaved,
}: { record: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const supabase = createClient()
  const emp = record.employee
  const ie = record.income_extras ?? {}
  const de = record.deduction_extras ?? {}

  // editable fields — init from record (standard + extras)
  const [f, setF] = useState({
    // standard columns
    base_salary:           record.base_salary          ?? 0,
    allowance_position:    record.allowance_position   ?? 0,
    allowance_transport:   record.allowance_transport  ?? 0,
    allowance_food:        record.allowance_food       ?? 0,
    allowance_phone:       record.allowance_phone      ?? 0,
    allowance_housing:     record.allowance_housing    ?? 0,
    allowance_other:       record.allowance_other      ?? 0,
    ot_amount:             record.ot_amount            ?? 0,
    ot_weekday_minutes:    record.ot_weekday_minutes   ?? 0,
    ot_holiday_reg_minutes:record.ot_holiday_reg_minutes ?? 0,
    ot_holiday_ot_minutes: record.ot_holiday_ot_minutes  ?? 0,
    bonus:                 record.bonus                ?? 0,
    commission:            record.commission           ?? 0,
    other_income:          record.other_income         ?? 0,
    deduct_absent:         record.deduct_absent        ?? 0,
    deduct_late:           record.deduct_late          ?? 0,
    deduct_loan:           record.deduct_loan          ?? 0,
    deduct_other:          record.deduct_other         ?? 0,
    social_security_amount:record.social_security_amount ?? 0,
    monthly_tax_withheld:  record.monthly_tax_withheld ?? 0,
    absent_days:           record.absent_days          ?? 0,
    late_count:            record.late_count           ?? 0,
    present_days:          record.present_days         ?? 0,
    leave_paid_days:       record.leave_paid_days      ?? 0,
    leave_unpaid_days:     record.leave_unpaid_days    ?? 0,
    note_override:         record.note_override        ?? "",
    // income_extras
    ex_kpi:                ie.kpi               ?? 0,
    ex_incentive:          ie.incentive          ?? 0,
    ex_performance_bonus:  ie.performance_bonus  ?? 0,
    ex_service_fee:        ie.service_fee        ?? 0,
    ex_depreciation:       ie.depreciation       ?? 0,
    ex_expressway:         ie.expressway         ?? 0,
    ex_fuel:               ie.fuel               ?? 0,
    ex_campaign:           ie.campaign           ?? 0,
    ex_retirement_fund:    ie.retirement_fund    ?? 0,
    ex_per_diem:           ie.per_diem           ?? 0,
    ex_diligence_bonus:    ie.diligence_bonus    ?? 0,
    ex_referral_bonus:     ie.referral_bonus     ?? 0,
    // deduction_extras
    dx_suspension:         de.suspension         ?? 0,
    dx_card_lost:          de.card_lost          ?? 0,
    dx_uniform:            de.uniform            ?? 0,
    dx_parking:            de.parking            ?? 0,
    dx_employee_products:  de.employee_products  ?? 0,
    dx_legal_enforcement:  de.legal_enforcement  ?? 0,
    dx_student_loan:       de.student_loan       ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v === "" ? 0 : v }))

  // live-calc gross / total_deductions / net — including extras
  const extraIncomeTotal = num(f.ex_kpi) + num(f.ex_incentive) + num(f.ex_performance_bonus)
    + num(f.ex_service_fee) + num(f.ex_depreciation) + num(f.ex_expressway)
    + num(f.ex_fuel) + num(f.ex_campaign) + num(f.ex_retirement_fund)
    + num(f.ex_per_diem) + num(f.ex_diligence_bonus) + num(f.ex_referral_bonus)

  const extraDeductTotal = num(f.dx_suspension) + num(f.dx_card_lost) + num(f.dx_uniform)
    + num(f.dx_parking) + num(f.dx_employee_products) + num(f.dx_legal_enforcement) + num(f.dx_student_loan)

  const gross = num(f.base_salary) + num(f.allowance_position) + num(f.allowance_transport)
    + num(f.allowance_food) + num(f.allowance_phone) + num(f.allowance_housing)
    + num(f.allowance_other) + num(f.ot_amount) + num(f.bonus) + num(f.commission)
    + num(f.other_income) + extraIncomeTotal

  const totalDeduct = num(f.deduct_absent) + num(f.deduct_late) + num(f.deduct_loan)
    + num(f.deduct_other) + num(f.social_security_amount) + num(f.monthly_tax_withheld)
    + extraDeductTotal

  const net = Math.max(gross - totalDeduct, 0)

  const save = async () => {
    setSaving(true)
    // Build income_extras & deduction_extras JSONB
    const income_extras: Record<string, number> = {}
    if (num(f.ex_kpi))              income_extras.kpi = num(f.ex_kpi)
    if (num(f.ex_incentive))        income_extras.incentive = num(f.ex_incentive)
    if (num(f.ex_performance_bonus))income_extras.performance_bonus = num(f.ex_performance_bonus)
    if (num(f.ex_service_fee))      income_extras.service_fee = num(f.ex_service_fee)
    if (num(f.ex_depreciation))     income_extras.depreciation = num(f.ex_depreciation)
    if (num(f.ex_expressway))       income_extras.expressway = num(f.ex_expressway)
    if (num(f.ex_fuel))             income_extras.fuel = num(f.ex_fuel)
    if (num(f.ex_campaign))         income_extras.campaign = num(f.ex_campaign)
    if (num(f.ex_retirement_fund))  income_extras.retirement_fund = num(f.ex_retirement_fund)
    if (num(f.ex_per_diem))         income_extras.per_diem = num(f.ex_per_diem)
    if (num(f.ex_diligence_bonus))  income_extras.diligence_bonus = num(f.ex_diligence_bonus)
    if (num(f.ex_referral_bonus))   income_extras.referral_bonus = num(f.ex_referral_bonus)

    const deduction_extras: Record<string, number> = {}
    if (num(f.dx_suspension))       deduction_extras.suspension = num(f.dx_suspension)
    if (num(f.dx_card_lost))        deduction_extras.card_lost = num(f.dx_card_lost)
    if (num(f.dx_uniform))          deduction_extras.uniform = num(f.dx_uniform)
    if (num(f.dx_parking))          deduction_extras.parking = num(f.dx_parking)
    if (num(f.dx_employee_products))deduction_extras.employee_products = num(f.dx_employee_products)
    if (num(f.dx_legal_enforcement))deduction_extras.legal_enforcement = num(f.dx_legal_enforcement)
    if (num(f.dx_student_loan))     deduction_extras.student_loan = num(f.dx_student_loan)

    // Standard fields payload
    const stdFields = [
      "base_salary","allowance_position","allowance_transport","allowance_food",
      "allowance_phone","allowance_housing","allowance_other","ot_amount",
      "ot_weekday_minutes","ot_holiday_reg_minutes","ot_holiday_ot_minutes",
      "bonus","commission","other_income",
      "deduct_absent","deduct_late","deduct_loan","deduct_other",
      "social_security_amount","monthly_tax_withheld",
      "absent_days","late_count","present_days","leave_paid_days","leave_unpaid_days",
    ]
    const payload: Record<string, unknown> = {}
    stdFields.forEach(k => { payload[k] = num((f as any)[k]) })
    payload.note_override = f.note_override
    payload.income_extras = income_extras
    payload.deduction_extras = deduction_extras
    payload.gross_income = gross
    payload.total_deductions = totalDeduct
    payload.net_salary = net
    payload.is_manual_override = true
    payload.updated_at = new Date().toISOString()

    const { error } = await supabase.from("payroll_records").update(payload).eq("id", record.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success("บันทึกการแก้ไขแล้ว")
    onSaved({ ...record, ...payload })
    onClose()
  }

  const reset = async () => {
    if (!confirm("รีเซ็ตกลับเป็นค่าที่คำนวณอัตโนมัติ?")) return
    setSaving(true)
    const res = await fetch("/api/payroll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: record.employee_id, payroll_period_id: record.payroll_period_id }),
    })
    setSaving(false)
    if (!res.ok) return toast.error("คำนวณใหม่ไม่สำเร็จ")
    toast.success("รีเซ็ตและคำนวณใหม่แล้ว")
    const { data } = await supabase.from("payroll_records")
      .select(`*, employee:employees!payroll_records_employee_id_fkey(id,employee_code,first_name_th,last_name_th,nickname,avatar_url,brand,position:positions(name),department:departments(id,name),company:companies(id,code,name_th))`)
      .eq("id", record.id).single()
    if (data) onSaved(data)
    onClose()
  }

  type FieldKey = keyof typeof f
  const NumRow = ({ label, k, green, red }: { label: string; k: FieldKey; green?: boolean; red?: boolean }) => (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <label className="text-[11px] text-slate-600 flex-1">{label}</label>
      <div className="w-28">
        <input
          type="number" step="0.01"
          value={f[k] as number}
          onChange={e => set(k, e.target.value)}
          className={inpCls + (green ? " text-green-700" : red ? " text-red-600" : "")}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-sm font-black text-indigo-600 overflow-hidden">
              {emp?.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : emp?.first_name_th?.[0]}
            </div>
            <div>
              <p className="font-black text-slate-800">{emp?.first_name_th} {emp?.last_name_th} {emp?.nickname ? `(${emp.nickname})` : ""}</p>
              <p className="text-xs text-slate-400">
                {emp?.employee_code} · {emp?.position?.name || "-"} · {emp?.department?.name || "-"} · {emp?.company?.code || "-"} {emp?.brand ? `· ${emp.brand}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {record.is_manual_override && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Edit2 size={9}/> แก้ไขแล้ว
              </span>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={15}/></button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-3 gap-4">

            {/* ── Column 1: รายรับหลัก ── */}
            <div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"/> รายรับหลัก
              </p>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                <NumRow label="เงินเดือน"       k="base_salary"         green/>
                <NumRow label="โบนัส"           k="bonus"               green/>
                <NumRow label="OT (฿ รวม)"      k="ot_amount"           green/>
                <NumRow label="ค่าตำแหน่ง"      k="allowance_position"  green/>
                <NumRow label="คอมมิชชั่น"       k="commission"          green/>
                <NumRow label="ค่าเดินทาง"       k="allowance_transport" green/>
                <NumRow label="ค่าอาหาร"         k="allowance_food"      green/>
                <NumRow label="ค่าโทรศัพท์"      k="allowance_phone"     green/>
                <NumRow label="ค่าที่พัก"         k="allowance_housing"   green/>
                <NumRow label="รายได้อื่นๆ"       k="other_income"        green/>
              </div>

              {/* รายรับเพิ่มเติม (extras) */}
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"/> รายรับเพิ่มเติม
              </p>
              <div className="bg-emerald-50/50 rounded-xl px-3 py-1.5">
                <NumRow label="KPI"                  k="ex_kpi"               green/>
                <NumRow label="Incentive"             k="ex_incentive"          green/>
                <NumRow label="Performance Bonus"     k="ex_performance_bonus"  green/>
                <NumRow label="ค่าบริการ"              k="ex_service_fee"        green/>
                <NumRow label="ค่าเสื่อมสภาพ"          k="ex_depreciation"       green/>
                <NumRow label="ค่าทางด่วน"             k="ex_expressway"         green/>
                <NumRow label="ค่าน้ำมัน"               k="ex_fuel"               green/>
                <NumRow label="แคมเปญ"               k="ex_campaign"           green/>
                <NumRow label="ค่าโครงการเกษียณ"       k="ex_retirement_fund"    green/>
                <NumRow label="เบี้ยเลี้ยง"             k="ex_per_diem"           green/>
                <NumRow label="เบี้ยขยัน"               k="ex_diligence_bonus"    green/>
                <NumRow label="เพื่อนแนะนำเพื่อน"        k="ex_referral_bonus"     green/>
              </div>

              <div className="flex justify-between px-3 py-2 mt-2 bg-green-50 rounded-xl">
                <span className="text-xs font-black text-slate-700">รวมรายรับ</span>
                <span className="text-xs font-black text-green-700">{thb(gross)}</span>
              </div>
            </div>

            {/* ── Column 2: รายหัก ── */}
            <div>
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full inline-block"/> รายหักหลัก
              </p>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                <NumRow label="หักมาสาย"        k="deduct_late"           red/>
                <NumRow label="หักขาดงาน/ลา"    k="deduct_absent"         red/>
                <NumRow label="เงินหักอื่นๆ"      k="deduct_other"          red/>
                <NumRow label="หักเงินกู้"        k="deduct_loan"           red/>
                <NumRow label="ประกันสังคม"       k="social_security_amount" red/>
                <NumRow label="ภาษีหัก ณ ที่จ่าย" k="monthly_tax_withheld"  red/>
              </div>

              {/* รายหักเพิ่มเติม (extras) */}
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-400 rounded-full inline-block"/> รายหักเพิ่มเติม
              </p>
              <div className="bg-rose-50/50 rounded-xl px-3 py-1.5">
                <NumRow label="พักงาน"               k="dx_suspension"         red/>
                <NumRow label="บัตรหาย/ชำรุด"         k="dx_card_lost"          red/>
                <NumRow label="ค่าซื้อเสื้อพนักงาน"    k="dx_uniform"            red/>
                <NumRow label="ค่าบัตรจอดรถ"          k="dx_parking"            red/>
                <NumRow label="สินค้าพนักงาน"          k="dx_employee_products"  red/>
                <NumRow label="กรมบังคับคดี"           k="dx_legal_enforcement"  red/>
                <NumRow label="กยศ."                 k="dx_student_loan"       red/>
              </div>

              <div className="flex justify-between px-3 py-2 mt-2 bg-red-50 rounded-xl">
                <span className="text-xs font-black text-slate-700">รวมรายหัก</span>
                <span className="text-xs font-black text-red-600">{thb(totalDeduct)}</span>
              </div>
            </div>

            {/* ── Column 3: OT detail + Stats ── */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"/> รายละเอียด OT (นาที)
                </p>
                <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                  <NumRow label="OT 1.5x วันทำงาน"     k="ot_weekday_minutes"/>
                  <NumRow label="OT 1.0x วันหยุด"       k="ot_holiday_reg_minutes"/>
                  <NumRow label="OT 3.0x วันหยุด+เลิก"  k="ot_holiday_ot_minutes"/>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">สถิติการเข้างาน</p>
                <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                  <NumRow label="วันมาทำงาน"     k="present_days"/>
                  <NumRow label="วันขาดงาน"      k="absent_days"/>
                  <NumRow label="ครั้งมาสาย"     k="late_count"/>
                  <NumRow label="วันลา (จ่าย)"   k="leave_paid_days"/>
                  <NumRow label="วันลา (ไม่จ่าย)" k="leave_unpaid_days"/>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">หมายเหตุ</label>
                <input
                  value={f.note_override}
                  onChange={e => setF(p => ({ ...p, note_override: e.target.value }))}
                  className={inpFull + " text-xs"} placeholder="เช่น ปรับ OT เพิ่มตามใบสรุป..."
                />
              </div>

              {/* Net preview */}
              <div className="bg-indigo-600 text-white rounded-2xl px-4 py-4 flex items-center justify-between">
                <p className="font-black text-sm">เงินเดือนสุทธิ</p>
                <p className="text-2xl font-black">{thb(net)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 flex-shrink-0 gap-3">
          <button onClick={reset} disabled={saving}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RotateCcw size={12}/> รีเซ็ต (คำนวณใหม่)
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
              ยกเลิก
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payslip view modal ─────────────────────────────────────────────────
function PayslipModal({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  const emp = record.employee
  const base = record.base_salary || 0
  const ratePerMin = base / 30 / 8 / 60

  const Row = ({ l, v, neg }: { l: string; v: number; neg?: boolean }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 last:border-0">
      <p className="text-sm text-slate-600">{l}</p>
      <p className={`text-sm font-semibold ${neg ? "text-red-600" : "text-slate-800"}`}>
        {neg ? "-" : "+"}฿{thb(Math.abs(v))}
      </p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-6 py-5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-70">ใบแจ้งเงินเดือน</p>
              <h3 className="text-xl font-black mt-0.5">{emp?.first_name_th} {emp?.last_name_th}</h3>
              <p className="text-sm opacity-75 mt-0.5">{emp?.employee_code} · {emp?.position?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const res = await fetch(`/api/payslip/download?record_id=${record.id}`)
                if (!res.ok) return
                const data = await res.json()
                const html = buildPayslipHTML(data)
                const win = window.open("", "_blank")
                if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
              }} className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-bold transition-colors">
                <Download size={10}/> PDF
              </button>
              <button onClick={onEdit} className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-bold transition-colors">
                <Edit2 size={10}/> แก้ไข
              </button>
              <button onClick={onClose} className="text-white/60 hover:text-white font-bold text-lg">✕</button>
            </div>
          </div>
          {record.is_manual_override && (
            <div className="mt-2 text-xs bg-amber-400/30 text-amber-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
              <Edit2 size={9}/> ตัวเลขนี้ถูกแก้ไขโดย HR
              {record.note_override && ` · ${record.note_override}`}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l:"มาทำงาน", v:record.present_days,  c:"text-green-600 bg-green-50" },
              { l:"ขาดงาน",  v:record.absent_days,   c:"text-red-600 bg-red-50"    },
              { l:"สาย",     v:record.late_count,    c:"text-amber-600 bg-amber-50"},
              { l:"ลาจ่าย",  v:(record.leave_paid_days||0).toFixed(1), c:"text-blue-600 bg-blue-50"},
            ].map(s => (
              <div key={s.l} className={`rounded-xl p-2 text-center ${s.c.split(" ")[1]}`}>
                <p className={`text-lg font-black ${s.c.split(" ")[0]}`}>{s.v}</p>
                <p className="text-[10px] font-bold text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>

          {/* รายรับ */}
          <div className="bg-slate-50 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-green-50"><p className="text-[10px] font-black text-green-800 uppercase tracking-wide">รายรับ</p></div>
            <Row l="เงินเดือนฐาน" v={base}/>
            {record.allowance_position  > 0 && <Row l="เบี้ยตำแหน่ง"    v={record.allowance_position}/>}
            {record.allowance_transport > 0 && <Row l="ค่าเดินทาง"       v={record.allowance_transport}/>}
            {record.allowance_food      > 0 && <Row l="ค่าอาหาร"         v={record.allowance_food}/>}
            {record.allowance_phone     > 0 && <Row l="ค่าโทรศัพท์"      v={record.allowance_phone}/>}
            {record.allowance_housing   > 0 && <Row l="ค่าที่พัก"         v={record.allowance_housing}/>}
            {record.allowance_other     > 0 && <Row l="รายรับอื่น"        v={record.allowance_other}/>}
            {record.ot_amount > 0 && (
              <div className="px-4 py-2 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">OT</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      <OTBadge label="1.5×" minutes={record.ot_weekday_minutes||0}     color="bg-amber-100 text-amber-700"/>
                      <OTBadge label="1.0×" minutes={record.ot_holiday_reg_minutes||0} color="bg-sky-100 text-sky-700"/>
                      <OTBadge label="3.0×" minutes={record.ot_holiday_ot_minutes||0}  color="bg-rose-100 text-rose-700"/>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">+฿{thb(record.ot_amount)}</p>
                </div>
              </div>
            )}
            {record.bonus      > 0 && <Row l="โบนัส"      v={record.bonus}/>}
            {record.commission > 0 && <Row l="คอมมิชชั่น" v={record.commission}/>}
            <div className="flex items-center justify-between px-4 py-2 bg-green-50">
              <p className="text-sm font-black">รวมรายรับ</p>
              <p className="text-sm font-black text-green-700">฿{thb(record.gross_income)}</p>
            </div>
          </div>

          {/* รายหัก */}
          <div className="bg-slate-50 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-red-50"><p className="text-[10px] font-black text-red-800 uppercase tracking-wide">รายหัก</p></div>
            {record.deduct_absent > 0 && <Row l={`หักขาดงาน ${record.absent_days} วัน`} v={record.deduct_absent} neg/>}
            {record.deduct_late   > 0 && <Row l="หักมาสาย" v={record.deduct_late} neg/>}
            {record.deduct_loan   > 0 && <Row l="หักเงินกู้" v={record.deduct_loan} neg/>}
            {record.deduct_other  > 0 && <Row l="หักอื่นๆ" v={record.deduct_other} neg/>}
            <Row l="ประกันสังคม 5%" v={record.social_security_amount} neg/>
            <Row l="ภาษีหัก ณ ที่จ่าย" v={record.monthly_tax_withheld} neg/>
            <div className="flex items-center justify-between px-4 py-2 bg-red-50">
              <p className="text-sm font-black">รวมรายหัก</p>
              <p className="text-sm font-black text-red-600">-฿{thb(record.total_deductions)}</p>
            </div>
          </div>

          {/* Net */}
          <div className="bg-indigo-600 text-white rounded-xl px-5 py-4 flex items-center justify-between">
            <p className="font-black text-lg">เงินเดือนสุทธิ</p>
            <p className="text-2xl font-black">฿{thb(record.net_salary)}</p>
          </div>

          {/* formula ref */}
          <details className="group">
            <summary className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold cursor-pointer list-none">
              <Info size={10}/> สูตรคำนวณอ้างอิง
              <ChevronDown size={10} className="group-open:rotate-180 transition-transform"/>
            </summary>
            <div className="mt-2 bg-slate-50 rounded-xl p-3 font-mono text-[10px] text-slate-500 space-y-0.5">
              <p>ฐาน/วัน  = ฿{thb(base/30)}</p>
              <p>ฐาน/ชม.  = ฿{thb(base/30/8)}</p>
              <p>ฐาน/นาที = ฿{ratePerMin.toFixed(4)}</p>
              {(record.ot_weekday_minutes||0)     > 0 && <p>OT 1.5×: {thb(base/30/8)} × 1.5 × {((record.ot_weekday_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*1.5*record.ot_weekday_minutes/60)}</p>}
              {(record.ot_holiday_reg_minutes||0) > 0 && <p>OT 1.0×: {thb(base/30/8)} × 1.0 × {((record.ot_holiday_reg_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*1.0*record.ot_holiday_reg_minutes/60)}</p>}
              {(record.ot_holiday_ot_minutes||0)  > 0 && <p>OT 3.0×: {thb(base/30/8)} × 3.0 × {((record.ot_holiday_ot_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*3.0*record.ot_holiday_ot_minutes/60)}</p>}
              {record.deduct_late   > 0 && <p>สาย: ROUND({ratePerMin.toFixed(4)} × นาที, 0) = ฿{thb(record.deduct_late)}</p>}
              {record.deduct_absent > 0 && <p>ขาด: {thb(base/30)} × {record.absent_days}วัน = ฿{thb(record.deduct_absent)}</p>}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function PayrollPage() {
  const { user }  = useAuth()
  const supabase  = createClient()
  const isSA      = user?.role === "super_admin" || user?.role === "hr_admin"
  const now       = new Date()

  const [periods,      setPeriods]      = useState<any[]>([])
  const [selected,     setSelected]     = useState<any>(null)
  const [records,      setRecords]      = useState<any[]>([])
  const [companies,    setCompanies]    = useState<any[]>([])
  const [selectedCo,   setSelectedCo]   = useState("")
  const [calculating,  setCalculating]  = useState(false)
  const [calcProgress, setCalcProgress] = useState({ done: 0, total: 0 })
  const [loading,      setLoading]      = useState(false)
  const [search,       setSearch]       = useState("")
  const [payslip,      setPayslip]      = useState<any>(null)
  const [editing,      setEditing]      = useState<any>(null)
  const [filterDept,   setFilterDept]   = useState("")
  const [viewMode,     setViewMode]     = useState<"compact"|"full">("full")

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined
  const companyId = isSA ? (selectedCo || myCompanyId) : myCompanyId

  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        if (data?.[0] && !selectedCo) setSelectedCo(data[0].id)
      })
  }, [isSA])

  const loadPeriods = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase.from("payroll_periods")
      .select("*").eq("company_id", companyId)
      .order("year", { ascending: false }).order("month", { ascending: false })
    setPeriods(data ?? [])
    setSelected(data?.[0] ?? null)
  }, [companyId])

  useEffect(() => { loadPeriods() }, [loadPeriods])

  const loadRecords = useCallback(async () => {
    if (!selected) { setRecords([]); return }
    setLoading(true)
    const { data } = await supabase.from("payroll_records")
      .select(`*, employee:employees!payroll_records_employee_id_fkey(
        id,employee_code,first_name_th,last_name_th,nickname,avatar_url,brand,
        position:positions(name),
        department:departments(id,name),
        company:companies(id,code,name_th))`)
      .eq("payroll_period_id", selected.id)
      .order("created_at")
    setRecords(data ?? [])
    setLoading(false)
  }, [selected])

  useEffect(() => { loadRecords() }, [loadRecords])

  const createPeriod = async () => {
    if (!companyId) return
    const y = now.getFullYear(), m = now.getMonth() + 1

    // งวด: 22 เดือนก่อน → 21 เดือนนี้
    const startDate = new Date(y, m - 2, 22) // 22 ของเดือนก่อน
    const endDate   = new Date(y, m - 1, 21) // 21 ของเดือนนี้
    const payDate   = new Date(y, m - 1, 25) // จ่ายวันที่ 25 ของเดือนนี้

    const { data, error } = await supabase.from("payroll_periods").insert({
      company_id:  companyId, year: y, month: m,
      period_name: format(new Date(y, m - 1), "MMMM yyyy", { locale: th }),
      start_date:  format(startDate, "yyyy-MM-dd"),
      end_date:    format(endDate,   "yyyy-MM-dd"),
      pay_date:    format(payDate,   "yyyy-MM-dd"),
      status: "draft", created_by: user?.employee?.id ?? null,
    }).select().single()
    if (error) return toast.error("มีงวดนี้แล้วหรือเกิดข้อผิดพลาด")
    toast.success("✓ สร้างงวดเงินเดือนแล้ว")
    setSelected(data)
    setPeriods(p => [data, ...p])
  }

  const calculateAll = async () => {
    if (!selected || !companyId) return
    setCalculating(true)
    const { data: emps } = await supabase.from("employees")
      .select("id").eq("company_id", companyId).eq("is_active", true)
    if (!emps) { setCalculating(false); return }
    setCalcProgress({ done: 0, total: emps.length })
    let done = 0
    for (const emp of emps) {
      await fetch("/api/payroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp.id, payroll_period_id: selected.id }),
      })
      done++
      setCalcProgress({ done, total: emps.length })
    }
    toast.success(`✓ คำนวณ ${emps.length} คน สำเร็จ`)
    setCalculating(false)
    loadRecords()
  }

  const approvePeriod = async () => {
    if (!selected || !confirm(`อนุมัติจ่ายงวด "${periodLabel(selected)}" ใช่หรือไม่?`)) return
    await supabase.from("payroll_periods").update({
      status: "paid", approved_by: user?.employee?.id ?? null, approved_at: new Date().toISOString(),
    }).eq("id", selected.id)
    toast.success("✓ อนุมัติจ่ายเงินเดือนแล้ว")
    const updated = { ...selected, status: "paid" }
    setSelected(updated)
    setPeriods(ps => ps.map(p => p.id === selected.id ? updated : p))
  }

  const exportCSV = () => {
    const hdr = ["รหัส","ชื่อ","นามสกุล","ตำแหน่ง","แผนก","เงินเดือนฐาน","เบี้ยตำแหน่ง","ค่าเดินทาง","ค่าอาหาร","OT฿","OT1.5x(น.)","OT1.0x(น.)","OT3.0x(น.)","โบนัส","คอมมิชชั่น","รวมรายรับ","หักขาด","หักสาย","หักกู้","SSO","ภาษี","หักรวม","สุทธิ","วันมา","วันขาด","สาย","ลาจ่าย","ลาไม่จ่าย","แก้ไขโดยHR"]
    const rows = records.map((r: any) => [
      r.employee?.employee_code, r.employee?.first_name_th, r.employee?.last_name_th,
      r.employee?.position?.name, r.employee?.department?.name,
      r.base_salary||0, r.allowance_position||0, r.allowance_transport||0, r.allowance_food||0,
      r.ot_amount||0, r.ot_weekday_minutes||0, r.ot_holiday_reg_minutes||0, r.ot_holiday_ot_minutes||0,
      r.bonus||0, r.commission||0, r.gross_income||0,
      r.deduct_absent||0, r.deduct_late||0, r.deduct_loan||0,
      r.social_security_amount||0, r.monthly_tax_withheld||0, r.total_deductions||0, r.net_salary||0,
      r.present_days||0, r.absent_days||0, r.late_count||0, r.leave_paid_days||0, r.leave_unpaid_days||0,
      r.is_manual_override ? "✓" : "",
    ])
    const csv  = [hdr, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url
    a.download = `payroll_${selected?.year}_${String(selected?.month).padStart(2,"0")}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const departments = Array.from(new Set(records.map((r: any) => r.employee?.department?.name).filter(Boolean))).sort() as string[]

  const filtered   = records.filter((r: any) => {
    if (filterDept && r.employee?.department?.name !== filterDept) return false
    if (!search) return true
    return `${r.employee?.first_name_th} ${r.employee?.last_name_th} ${r.employee?.employee_code} ${r.employee?.nickname||""}`
      .toLowerCase().includes(search.toLowerCase())
  })
  const totalGross = filtered.reduce((s: number, r: any) => s + (r.gross_income||0), 0)
  const totalNet   = filtered.reduce((s: number, r: any) => s + (r.net_salary||0), 0)
  const totalOT    = filtered.reduce((s: number, r: any) => s + (r.ot_amount||0), 0)
  const totalSSO   = filtered.reduce((s: number, r: any) => s + (r.social_security_amount||0), 0)
  const totalTax   = filtered.reduce((s: number, r: any) => s + (r.monthly_tax_withheld||0), 0)
  const overrideCount = records.filter((r: any) => r.is_manual_override).length

  const statusCfg  = STATUS_CFG[selected?.status ?? "draft"] ?? STATUS_CFG.draft

  return (
    <div className="space-y-4">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">เงินเดือน</h2>
          <p className="text-slate-400 text-sm">คำนวณ · ตรวจสอบ · แก้ไข · อนุมัติ</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* register view */}
          <Link href="/admin/payroll/register"
            className="flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
            <Table2 size={14}/> ตารางรวม
          </Link>
          {/* company */}
          {isSA && companies.length > 0 && (
            <select value={selectedCo} onChange={e => setSelectedCo(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          {/* period dropdown */}
          <div className="relative">
            <select
              value={selected?.id ?? ""}
              onChange={e => setSelected(periods.find(p => p.id === e.target.value) ?? null)}
              className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 appearance-none min-w-[220px]">
              {periods.length === 0 && <option value="">— ยังไม่มีงวด —</option>}
              {periods.map(p => (
                <option key={p.id} value={p.id}>{periodLabel(p)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          {/* status badge */}
          {selected && (
            <span className={`text-xs font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 ${statusCfg.c}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}/>
              {statusCfg.l}
            </span>
          )}
          {/* actions */}
          <button onClick={createPeriod}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus size={12}/> งวดใหม่
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-300">
          <Banknote size={40} className="mx-auto mb-3"/>
          <p className="font-semibold">สร้างงวดเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Action bar ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{format(new Date(selected.start_date), "d MMM", { locale: th })} – {format(new Date(selected.end_date), "d MMM yyyy", { locale: th })}</span>
              <span className="text-slate-200">|</span>
              <span>จ่าย {format(new Date(selected.pay_date), "d MMM yyyy", { locale: th })}</span>
              {overrideCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Edit2 size={11}/> แก้ไขแล้ว {overrideCount} คน
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status === "draft" && (
                <button onClick={calculateAll} disabled={calculating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {calculating
                    ? <><Loader2 size={13} className="animate-spin"/> {calcProgress.total > 0 && `${calcProgress.done}/${calcProgress.total}`}</>
                    : <><Play size={13}/> คำนวณทั้งหมด</>}
                </button>
              )}
              {records.length > 0 && selected.status === "draft" && (
                <button onClick={approvePeriod}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  <CheckCircle size={13}/> อนุมัติจ่าย
                </button>
              )}
              {/* Export ย้ายไปอยู่แถว filter ด้านล่าง */}
            </div>
          </div>

          {/* Progress bar */}
          {calculating && calcProgress.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>กำลังคำนวณ...</span>
                <span>{calcProgress.done}/{calcProgress.total} ({Math.round(calcProgress.done/calcProgress.total*100)}%)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${calcProgress.done/calcProgress.total*100}%` }}/>
              </div>
            </div>
          )}

          {/* ── KPIs ───────────────────────────────────────────── */}
          {records.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l:"พนักงาน",     v:`${records.length} คน`, ic:Users,     c:"indigo" },
                { l:"รวมรายรับ",   v:`฿${thb(totalGross)}`,  ic:TrendingUp,c:"green"  },
                { l:"รวม OT",      v:`฿${thb(totalOT)}`,     ic:Clock,     c:"amber"  },
                { l:"SSO + ภาษี",  v:`฿${thb(totalSSO+totalTax)}`, ic:AlertCircle, c:"orange"},
                { l:"รับสุทธิรวม",v:`฿${thb(totalNet)}`,    ic:Banknote,  c:"blue"   },
              ].map(s => {
                const cc: Record<string, string> = {
                  indigo:"bg-indigo-50 border-indigo-100 text-indigo-700",
                  green: "bg-green-50 border-green-100 text-green-700",
                  amber: "bg-amber-50 border-amber-100 text-amber-700",
                  orange:"bg-orange-50 border-orange-100 text-orange-700",
                  blue:  "bg-blue-50 border-blue-100 text-blue-700",
                }
                return (
                  <div key={s.l} className={`rounded-2xl border p-3.5 ${cc[s.c]}`}>
                    <p className="text-base font-black">{s.v}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">{s.l}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Search + Filters ────────────────────────────────── */}
          {records.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              {/* View toggle */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode("full")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === "full" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                  <Table2 size={11} className="inline mr-1 -mt-0.5"/> ตารางรวม
                </button>
                <button onClick={() => setViewMode("compact")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === "compact" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                  สรุป
                </button>
              </div>
              {/* Department filter */}
              <div className="relative">
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs text-slate-600 outline-none focus:border-indigo-400">
                  <option value="">ทุกแผนก</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <Filter size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              </div>
              {/* Search */}
              <div className="relative flex-1 min-w-36 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400 w-full"
                  placeholder="ค้นหาชื่อ, รหัส..."/>
              </div>
              <p className="text-xs text-slate-400 ml-auto">{filtered.length} / {records.length} คน</p>
              {/* Export Excel */}
              <button onClick={() => exportXLSX(filtered, selected)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                <Download size={11}/> Excel
              </button>
            </div>
          )}

          {/* ── Table ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-14 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 size={18} className="animate-spin"/> กำลังโหลด...
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-slate-300">
                <Play size={36} className="mx-auto mb-3"/>
                <p className="font-semibold text-sm">กดปุ่ม "คำนวณทั้งหมด" เพื่อเริ่มต้น</p>
                <p className="text-xs mt-1">ดึงข้อมูล Attendance · OT · Leave · เงินเดือน</p>
              </div>
            ) : viewMode === "full" ? (
              <FullRegisterTable records={filtered} onEdit={setEditing} onView={setPayslip}/>
            ) : (
              <CompactTable records={filtered} totalNet={totalNet} onEdit={setEditing} onView={setPayslip}/>
            )}
          </div>
        </div>
      )}

      {/* modals */}
      {payslip && (
        <PayslipModal
          record={payslip}
          onClose={() => setPayslip(null)}
          onEdit={() => { setEditing(payslip); setPayslip(null) }}
        />
      )}
      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setRecords(rs => rs.map(r => r.id === updated.id ? { ...r, ...updated } : r))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ── Payslip HTML Builder ──
function buildPayslipHTML(d: any): string {
  const { company, employee, period, payDate, earnings, deductions, totalEarnings, totalDeductions, netPay, ytd } = d
  const fmt = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const eRows = earnings.map((e: any) => `<tr><td>${e.label}</td><td class="r">${e.number||""}</td><td class="r">${fmt(e.amount)}</td></tr>`).join("")
  const dRows = deductions.map((e: any) => `<tr><td>${e.label}</td><td class="r">${fmt(e.amount)}</td></tr>`).join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>สลิปเงินเดือน</title>
<style>@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Sarabun','Noto Sans Thai',sans-serif;font-size:11px;color:#333}@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
.c{max-width:720px;margin:0 auto;padding:20px}.hdr{text-align:center;margin-bottom:15px;border-bottom:2px solid #c8a14e;padding-bottom:10px}.hdr h1{font-size:16px;font-weight:700}.st{font-size:18px;font-weight:700;color:#c8a14e}.ci{font-size:10px;color:#666;margin-top:4px}.per{font-size:12px;font-weight:700;color:#c8a14e}.logo{height:36px}
.ei{display:flex;justify-content:space-between;margin:10px 0;font-size:11px}.ei b{color:#000}table{width:100%;border-collapse:collapse;font-size:10.5px}.mt{margin-top:8px}.mt th{background:#f5f0e0;color:#7a6520;font-weight:700;padding:6px 8px;border:1px solid #d4c98a;text-align:center}.mt td{padding:4px 8px;border:1px solid #e5e5e5}.r{text-align:right}
.tr{background:#faf6e8;font-weight:700}.tr td{border-top:2px solid #c8a14e;padding:6px 8px}.nb{background:#c8a14e;color:#fff;padding:10px 15px;text-align:right;font-size:18px;font-weight:700;margin-top:-1px}.nl{font-size:11px;font-weight:700}
.yt{margin-top:12px}.yt th{background:#c8a14e;color:#fff;font-weight:700;padding:5px 6px;border:1px solid #b89430;text-align:center;font-size:9.5px}.yt td{text-align:center;padding:5px 6px;border:1px solid #e5e5e5;font-size:10px}
.ft{margin-top:30px;font-size:9px;color:#999;display:flex;justify-content:space-between}.tc{display:grid;grid-template-columns:1fr 1fr}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="c"><div class="hdr"><div style="display:flex;align-items:center;justify-content:space-between">
<div style="display:flex;align-items:center;gap:8px"><img src="https://shd-technology.co.th/images/logo.png" class="logo" onerror="this.style.display='none'"/>
<div style="text-align:left"><h1>${company.code} : ${company.name}</h1><div class="ci">${company.address}</div><div class="ci">${company.phone}</div></div></div>
<div><div class="st">สลิปเงินเดือน</div><div class="per">${period}</div></div></div></div>
<div class="ei"><div>รหัสพนักงาน : <b>${employee.code}</b> &nbsp; ชื่อ : <b>${employee.name}</b></div><div><b>แผนก:</b> ${employee.department}</div><div><b>ตำแหน่ง :</b> ${employee.position}</div></div>
<div class="tc"><table class="mt"><thead><tr><th colspan="2">รายได้ / Earnings</th><th>จำนวน</th><th>Amount</th></tr></thead><tbody>${eRows}<tr class="tr"><td colspan="3">รวมเงินได้ / Total Earnings</td><td class="r">${fmt(totalEarnings)}</td></tr></tbody></table>
<div><table class="mt"><thead><tr><th>รายการหัก / Deductions</th><th>Amount</th><th>วันที่จ่าย</th></tr></thead><tbody>${dRows}<tr class="tr"><td>รวมรายการหัก / Total Deduction</td><td class="r">${fmt(totalDeductions)}</td><td>${payDate}</td></tr></tbody></table>
<div class="nb"><div class="nl">เงินรับสุทธิ / Net To Pay</div>${fmt(netPay)}</div></div></div>
<table class="yt"><thead><tr><th>เงินได้สะสมต่อปี</th><th>ภาษีสะสมต่อปี</th><th>กองทุนสะสมต่อปี</th><th>ประกันสังคมต่อปี</th><th>ค่าลดหย่อนอื่นๆ</th><th>ลงชื่อพนักงาน</th></tr></thead>
<tbody><tr><td>${fmt(ytd.income)}</td><td>${fmt(ytd.tax)}</td><td>${fmt(ytd.providentFund)}</td><td>${fmt(ytd.socialSecurity)}</td><td>${fmt(ytd.otherDeductions)}</td><td></td></tr></tbody></table>
<div class="ft"><div>พิมพ์โดย : ${employee.name}</div><div>${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}</div></div></div></body></html>`
}