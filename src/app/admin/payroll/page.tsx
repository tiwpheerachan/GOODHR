"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, Play, CheckCircle, Loader2, Plus,
  ChevronDown, AlertCircle, TrendingUp, Users, Banknote,
  Clock, Info, Search, Eye, Edit2, Save, X, RotateCcw, Table2, Filter,
  Copy, ClipboardCheck, Columns3
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

// ── Apply Excel number format to all numeric cells ──────────────────────
// ทำให้ตัวเลขในไฟล์มีลูกน้ำคั่นและทศนิยม 2 ตำแหน่งเมื่อเปิดใน Excel
function applyNumFmt(ws: XLSX.WorkSheet, moneyFmt = "#,##0.00", intFmt = "#,##0") {
  if (!ws["!ref"]) return
  const range = XLSX.utils.decode_range(ws["!ref"])
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (!cell || cell.t !== "n") continue
      // ตัวเลขที่เป็นจำนวนเต็มและค่าไม่ใหญ่ (เช่น จำนวนคน, วัน) ใช้ #,##0
      // ตัวเลขที่มีทศนิยม หรือค่าสูง (เงิน) ใช้ #,##0.00
      cell.z = Number.isInteger(cell.v) && (cell.v as number) < 10000 ? intFmt : moneyFmt
    }
  }
}

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
  { key:"bonus",       label:"KPI Bonus",             group:"income", get:r=>n(r.bonus) },
  { key:"kpi_grade",   label:"เกรด KPI",              group:"income", get:r=>r.kpi_grade === "pending" ? "รอประเมิน" : r.kpi_grade||"-" },
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
  { key:"early",       label:"ออกก่อนกำหนด",        group:"deduction", get:r=>n(r.deduct_early_out) },
  { key:"absent",      label:"ขาดงาน/ลางาน",        group:"deduction", get:r=>n(r.deduct_absent) },
  { key:"suspend",     label:"พักงาน",              group:"deduction", get:r=>n((r.deduction_extras||{}).suspension) },
  { key:"ded_other",   label:"เงินหักอื่นๆ",          group:"deduction", get:r=>n(r.deduct_other) },
  { key:"sub_ded",     label:"รวมเป็นเงิน",          group:"deduction", get:r=>n(r.deduct_late)+n(r.deduct_early_out)+n(r.deduct_absent)+n((r.deduction_extras||{}).suspension)+n(r.deduct_other) },
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

// ── Full Register Table Component (Sticky info + Excel-like copy) ──────
function FullRegisterTable({ records, onEdit, onView }: { records: any[]; onEdit: (r:any)=>void; onView: (r:any)=>void }) {
  const [copied, setCopied] = useState<string|null>(null)     // flash "copied!" badge
  const [selCol,  setSelCol]  = useState<string|null>(null)   // highlight selected column
  const [selRow,  setSelRow]  = useState<number|null>(null)   // highlight selected row
  const tableRef = useRef<HTMLDivElement>(null)

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

  // ── Copy helpers ───────────────────────────────────────────────────
  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied(null), 1500) }

  // Copy entire row as tab-separated (paste into Excel)
  const copyRow = (idx: number) => {
    const r = records[idx]
    const vals = REG_COLS.map(c => {
      const v = c.get(r, idx)
      return typeof v === "number" ? v.toString() : String(v)
    })
    navigator.clipboard.writeText(vals.join("\t"))
    flash(`row-${idx}`)
    setSelRow(idx); setTimeout(() => setSelRow(null), 1500)
  }

  // Copy entire column (header + values + total) as newline-separated
  const copyCol = (col: RCol) => {
    const lines = [col.label]
    records.forEach((r, i) => {
      const v = col.get(r, i)
      lines.push(typeof v === "number" ? v.toString() : String(v))
    })
    if (col.group !== "info") lines.push((totals[col.key] || 0).toString())
    navigator.clipboard.writeText(lines.join("\n"))
    flash(`col-${col.key}`)
    setSelCol(col.key); setTimeout(() => setSelCol(null), 1500)
  }

  // Copy whole table (for pasting into Excel)
  const copyAll = () => {
    const header = REG_COLS.map(c => c.label).join("\t")
    const rows = records.map((r, i) => REG_COLS.map(c => {
      const v = c.get(r, i)
      return typeof v === "number" ? v.toString() : String(v)
    }).join("\t"))
    const footer = REG_COLS.map(c =>
      c.group === "info" ? "" : (totals[c.key] || 0).toString()
    ).join("\t")
    navigator.clipboard.writeText([header, ...rows, footer].join("\n"))
    flash("all")
  }

  // ── Sticky column widths (CSS variable approach) ──────────────────
  // We compute cumulative left offsets for each info column
  const INFO_WIDTHS: Record<string, number> = {
    no: 42, code: 100, name: 160, nick: 80, pos: 120, dept: 100, comp: 60, brand: 70
  }
  const ACTION_W = 48
  const infoLeft: number[] = []
  let cumLeft = 0
  INFO_C.forEach((c, i) => { infoLeft[i] = cumLeft; cumLeft += INFO_WIDTHS[c.key] || 80 })
  const actionLeft = cumLeft
  const stickyEnd = cumLeft + ACTION_W // total frozen width

  const stickyBase = "sticky z-10"
  const stickyShadow = "after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-slate-200"

  return (
    <div className="relative">
      {/* Copy all button */}
      <div className="absolute -top-9 right-0 flex gap-1.5 z-20">
        <button onClick={copyAll}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
            copied === "all"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}>
          {copied === "all" ? <><ClipboardCheck size={10}/> คัดลอกแล้ว!</> : <><Copy size={10}/> คัดลอกทั้งตาราง</>}
        </button>
      </div>

      <div ref={tableRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] border border-slate-200 rounded-xl">
        <table className="text-[11px] border-collapse whitespace-nowrap" style={{ minWidth: stickyEnd + DATA_C.length * 100 }}>
          {/* ── Group header row ─────────────────────────────── */}
          <thead className="sticky top-0 z-30">
            <tr>
              {/* Frozen: ข้อมูลพนักงาน group */}
              {INFO_C.map((col, ci) => (
                <th key={col.key}
                  className={`${stickyBase} bg-slate-100 px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200`}
                  style={{ left: infoLeft[ci], width: INFO_WIDTHS[col.key], minWidth: INFO_WIDTHS[col.key], zIndex: 40 }}>
                  {ci === 0 ? "ข้อมูลพนักงาน" : ""}
                </th>
              ))}
              {/* Frozen: action spacer */}
              <th className={`${stickyBase} bg-slate-100 border-b border-slate-200 border-r border-slate-300`}
                style={{ left: actionLeft, width: ACTION_W, minWidth: ACTION_W, zIndex: 40 }}/>
              {/* Scrollable: group headers */}
              {(["income","deduction","summary"] as const).map(g => (
                <th key={g} colSpan={DATA_C.filter(c=>c.group===g).length}
                  className={`px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider ${GC[g].text} ${GC[g].bg} border-b border-r last:border-r-0 border-slate-200`}>
                  {g === "income" ? "รายรับ" : g === "deduction" ? "รายหัก" : "สรุป"}
                </th>
              ))}
            </tr>

            {/* ── Column header row ────────────────────────────── */}
            <tr className="border-b-2 border-slate-300">
              {INFO_C.map((col, ci) => (
                <th key={col.key}
                  onClick={() => copyCol(col)}
                  title={`คลิกเพื่อคัดลอกคอลัม "${col.label}"`}
                  className={`${stickyBase} bg-slate-50 px-2 py-2 text-left font-bold text-slate-600 cursor-pointer hover:bg-indigo-100 select-none transition-colors border-b-2 border-slate-300 ${
                    selCol === col.key ? "!bg-indigo-100 ring-2 ring-inset ring-indigo-400" : ""
                  }`}
                  style={{ left: infoLeft[ci], width: INFO_WIDTHS[col.key], minWidth: INFO_WIDTHS[col.key], zIndex: 40 }}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    {copied === `col-${col.key}` && <ClipboardCheck size={9} className="text-green-600"/>}
                  </span>
                </th>
              ))}
              <th className={`${stickyBase} bg-slate-50 border-r border-slate-300 border-b-2`}
                style={{ left: actionLeft, width: ACTION_W, minWidth: ACTION_W, zIndex: 40 }}/>
              {DATA_C.map(col => {
                const gc = GC[col.group]
                return (
                  <th key={col.key}
                    onClick={() => copyCol(col)}
                    title={`คลิกเพื่อคัดลอกคอลัม "${col.label}"`}
                    className={`px-2 py-2 text-right font-bold cursor-pointer hover:brightness-90 select-none transition-all border-b-2 border-slate-300 ${gc.text} ${gc.bg} ${
                      selCol === col.key ? "ring-2 ring-inset ring-indigo-400" : ""
                    }`}>
                    <span className="flex items-center justify-end gap-1">
                      {col.label}
                      {copied === `col-${col.key}` && <ClipboardCheck size={9} className="text-green-600"/>}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* ── Body ─────────────────────────────────────────── */}
          <tbody className="divide-y divide-slate-50">
            {records.map((r, idx) => {
              const isRowSel = selRow === idx
              return (
                <tr key={r.id} className={`group transition-colors ${isRowSel ? "!bg-indigo-50" : "hover:bg-slate-50/50"}`}>
                  {/* Frozen info cells */}
                  {INFO_C.map((col, ci) => {
                    const v = col.get(r, idx)
                    return (
                      <td key={col.key}
                        className={`${stickyBase} px-2 py-1.5 border-b border-slate-50 ${
                          isRowSel ? "bg-indigo-50" : "bg-white group-hover:bg-slate-50"
                        } ${
                          col.key === "no" ? "text-center text-slate-400" :
                          col.key === "code" ? "font-bold text-indigo-600" :
                          col.key === "name" ? "font-bold text-slate-800" :
                          "text-slate-600"
                        } ${selCol === col.key ? "!bg-indigo-50" : ""}`}
                        style={{ left: infoLeft[ci], width: INFO_WIDTHS[col.key], minWidth: INFO_WIDTHS[col.key], zIndex: 10 }}>
                        {v}
                      </td>
                    )
                  })}
                  {/* Frozen action cell */}
                  <td className={`${stickyBase} px-1 py-1.5 text-center border-r border-slate-200 border-b border-slate-50 ${
                    isRowSel ? "bg-indigo-50" : "bg-white group-hover:bg-slate-50"
                  }`} style={{ left: actionLeft, width: ACTION_W, minWidth: ACTION_W, zIndex: 10 }}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => copyRow(idx)} title="คัดลอกแถว"
                        className={`p-1 rounded transition-colors ${
                          copied === `row-${idx}` ? "bg-green-100 text-green-600" : "hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                        }`}>
                        {copied === `row-${idx}` ? <ClipboardCheck size={10}/> : <Copy size={10}/>}
                      </button>
                      <button onClick={() => onView(r)} className="p-1 hover:bg-indigo-100 rounded text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={10}/></button>
                      <button onClick={() => onEdit(r)} className="p-1 hover:bg-amber-100 rounded text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={10}/></button>
                    </div>
                  </td>
                  {/* Scrollable data cells */}
                  {DATA_C.map(col => {
                    const v = col.get(r, idx)
                    const numVal = typeof v === "number" ? v : 0
                    const zero = numVal === 0
                    const isSummary = col.group === "summary"
                    return (
                      <td key={col.key} className={`px-2 py-1.5 text-right font-mono border-b border-slate-50 ${
                        isSummary && col.key === "net" ? "font-black text-emerald-700 bg-emerald-50/40" :
                        isSummary && col.key === "total_ded" ? "font-bold text-rose-600" :
                        isSummary ? "font-bold text-indigo-700 bg-indigo-50/30" :
                        col.group === "deduction" && !zero ? "text-rose-600" :
                        col.group === "income" && !zero ? "text-slate-700" :
                        "text-slate-300"
                      } ${selCol === col.key ? "!bg-indigo-50/60" : ""} ${isRowSel ? "!bg-indigo-50/40" : ""}`}>
                        {zero && !isSummary ? "-" : thb(numVal)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>

          {/* ── Footer ───────────────────────────────────────── */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="border-t-2 border-slate-300 font-black">
              {/* Frozen footer info */}
              {INFO_C.map((col, ci) => (
                <td key={col.key}
                  className={`${stickyBase} bg-slate-100 px-2 py-2.5 text-slate-700 border-t-2 border-slate-300`}
                  style={{ left: infoLeft[ci], width: INFO_WIDTHS[col.key], minWidth: INFO_WIDTHS[col.key], zIndex: 30 }}>
                  {ci === 0 ? `รวม ${records.length} คน` : ""}
                </td>
              ))}
              <td className={`${stickyBase} bg-slate-100 border-r border-slate-300 border-t-2`}
                style={{ left: actionLeft, width: ACTION_W, minWidth: ACTION_W, zIndex: 30 }}/>
              {/* Scrollable footer data */}
              {DATA_C.map(col => (
                <td key={col.key} className={`px-2 py-2.5 text-right font-mono bg-slate-100 border-t-2 border-slate-300 ${
                  col.key === "net" ? "text-emerald-700 bg-emerald-100/70" :
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

      {/* Hint */}
      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
        <Columns3 size={10}/> คอลัมข้อมูลพนักงานถูกตรึงอยู่ — เลื่อนซ้าย-ขวาเพื่อดูรายรับ/รายหัก
        <span className="mx-1">·</span>
        <Copy size={10}/> คลิกหัวคอลัมเพื่อคัดลอกคอลัม · hover แถวแล้วกด <Copy size={9} className="inline"/> เพื่อคัดลอกแถว
      </p>
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
            <th className="px-3 py-3 text-right font-bold text-red-600">หักสาย/ออกก่อน/ขาด</th>
            <th className="px-3 py-3 text-right font-bold text-slate-500">SSO</th>
            <th className="px-3 py-3 text-right font-bold text-slate-500">ภาษี</th>
            <th className="px-3 py-3 text-right font-bold text-indigo-700">สุทธิ</th>
            <th className="px-3 py-3 text-center font-bold text-slate-500 w-20">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.map((r: any) => {
            const totalAllow = n(r.allowance_position)+n(r.allowance_transport)+n(r.allowance_food)+n(r.allowance_phone)+n(r.allowance_housing)+n(r.allowance_other)
            const totalDeductWork = n(r.deduct_late)+n(r.deduct_early_out)+n(r.deduct_absent)
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
            <td className="px-3 py-3 text-right font-bold text-red-600">-฿{thb(records.reduce((s:number,r:any)=>s+n(r.deduct_late)+n(r.deduct_early_out)+n(r.deduct_absent),0))}</td>
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

// ── Export XLSX (comprehensive) ──────────────────────────────────────────
function exportXLSX(records: any[], period: any) {
  if (records.length === 0) { toast.error("ไม่มีข้อมูลที่จะ Export"); return }

  const pLabel  = period ? `${period.year}-${String(period.month).padStart(2,"0")}` : "payroll"
  const pTh     = period ? `${format(new Date(period.year, period.month-1), "MMMM yyyy", { locale: th })}` : ""
  const exportedAt = `ออกรายงาน: ${format(new Date(),"d MMMM yyyy HH:mm",{locale:th})}`
  const wb = XLSX.utils.book_new()

  // ── helpers ────────────────────────────────────────────────────────
  const dlWb = () => {
    const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" })
    const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href=url; a.download=`payroll-${pLabel}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  // สร้าง sheet จาก subset ของ records
  const buildRegSheet = (recs: any[], sheetTitle: string) => {
    const infoRows: any[][] = [
      [sheetTitle],
      [pTh, "", exportedAt],
      [`จำนวนพนักงาน: ${recs.length} คน`],
      [],
    ]
    // group header (span via merge later — aoa จัดการเอง)
    const groupRow: any[] = []
    let incStart = -1, incEnd = -1, dedStart = -1, dedEnd = -1, sumStart = -1, sumEnd = -1
    let colIdx = 0
    REG_COLS.forEach(col => {
      if (col.group === "income"    && incStart === -1) incStart = colIdx
      if (col.group === "income")    incEnd = colIdx
      if (col.group === "deduction" && dedStart === -1) dedStart = colIdx
      if (col.group === "deduction") dedEnd = colIdx
      if (col.group === "summary"   && sumStart === -1) sumStart = colIdx
      if (col.group === "summary")   sumEnd = colIdx
      colIdx++
    })
    REG_COLS.forEach((col, ci) => {
      if (ci === 0) groupRow.push("ข้อมูลพนักงาน")
      else if (ci === incStart) groupRow.push("รายรับ")
      else if (ci === dedStart) groupRow.push("รายหัก")
      else if (ci === sumStart) groupRow.push("สรุป")
      else groupRow.push("")
    })

    const headers = REG_COLS.map(c => c.label)

    const dataRows = recs.map((r, i) =>
      REG_COLS.map(col => {
        const v = col.get(r, i)
        return v
      })
    )

    // totals row
    const totRow: any[] = REG_COLS.map(col => {
      if (col.group === "info") return col.key === "no" ? "รวม" : col.key === "name" ? `${recs.length} คน` : ""
      return recs.reduce((s: number, r: any, i: number) => {
        const v = col.get(r, i)
        return typeof v === "number" ? s + v : s
      }, 0)
    })

    const wsData = [...infoRows, groupRow, headers, ...dataRows, totRow]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // column widths
    ws["!cols"] = REG_COLS.map(col => ({
      wch: col.group === "info"
        ? (col.key === "name" ? 22 : col.key === "pos" ? 18 : col.key === "dept" ? 14 : col.key === "code" ? 13 : 8)
        : 12
    }))

    // autofilter on header row (row index = infoRows.length + 1 for groupRow)
    const headerRowIdx = infoRows.length + 1
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: headerRowIdx + dataRows.length, c: REG_COLS.length - 1 }
    })}

    return ws
  }

  // ── Sheet 1: ทะเบียนเงินเดือนทั้งหมด ────────────────────────────
  const wsAll = buildRegSheet(records, "ทะเบียนเงินเดือน")
  applyNumFmt(wsAll)
  XLSX.utils.book_append_sheet(wb, wsAll, "ทะเบียนเงินเดือน")

  // ── Sheet 2+: แยกตามแผนก ────────────────────────────────────────
  const deptGroups = new Map<string, any[]>()
  records.forEach(r => {
    const d = r.employee?.department?.name || "ไม่ระบุแผนก"
    if (!deptGroups.has(d)) deptGroups.set(d, [])
    deptGroups.get(d)!.push(r)
  })
  // เรียงแผนกตามจำนวนพนักงานมากสุด
  const sortedDepts = Array.from(deptGroups.entries()).sort((a, b) => b[1].length - a[1].length)
  sortedDepts.forEach(([dept, recs]) => {
    const sheetName = dept.slice(0, 28) + (dept.length > 28 ? "..." : "")
    const wsDept = buildRegSheet(recs, `แผนก: ${dept}`)
    applyNumFmt(wsDept)
    XLSX.utils.book_append_sheet(wb, wsDept, sheetName)
  })

  // ── Sheet สรุปตามแผนก ────────────────────────────────────────────
  const deptSumInfo = [
    [`สรุปเงินเดือนตามแผนก — ${pTh}`],
    [exportedAt],
    [],
  ]
  const deptSumHeaders = [
    "แผนก","จำนวนคน",
    "เงินเดือนรวม","OT รวม","เบี้ยรวม","Bonus/KPI","Commission","รายได้อื่นๆ",
    "รวมรายรับ",
    "หักสาย/ขาด","ประกันสังคม","ภาษี","รายหักอื่นๆ",
    "รวมรายหัก",
    "ยอดสุทธิ",
  ]
  const deptSumData = sortedDepts.map(([dept, recs]) => {
    const sum = (fn: (r:any)=>number) => recs.reduce((s:number,r:any)=>s+fn(r),0)
    const ie  = (r:any) => r.income_extras ?? {}
    const de  = (r:any) => r.deduction_extras ?? {}
    const otAmt = (r:any) => {
      const base = n(r.base_salary)
      return calcOTAmt(base,n(r.ot_weekday_minutes),1.5)
           + calcOTAmt(base,n(r.ot_holiday_reg_minutes),1.0)
           + calcOTAmt(base,n(r.ot_holiday_ot_minutes),3.0)
    }
    const allowTotal = (r:any) => n(r.allowance_position)+n(r.allowance_transport)+n(r.allowance_food)+n(r.allowance_phone)+n(r.allowance_housing)+n(r.allowance_other)
    const bonusTotal = (r:any) => n(r.bonus)+n(ie(r).kpi||0)+n(ie(r).incentive||0)+n(ie(r).performance_bonus||0)+n(ie(r).diligence_bonus||0)+n(ie(r).referral_bonus||0)
    const commTotal  = (r:any) => n(r.commission)+n(ie(r).service_fee||0)+n(ie(r).campaign||0)
    const otherInc   = (r:any) => n(r.other_income)+n(ie(r).depreciation||0)+n(ie(r).expressway||0)+n(ie(r).fuel||0)+n(ie(r).retirement_fund||0)+n(ie(r).per_diem||0)
    const workDeduct = (r:any) => n(r.deduct_late)+n(r.deduct_early_out)+n(r.deduct_absent)
    const extraDeduct= (r:any) => n(r.deduct_loan)+n(r.deduct_other)+n(de(r).suspension||0)+n(de(r).card_lost||0)+n(de(r).uniform||0)+n(de(r).parking||0)+n(de(r).employee_products||0)+n(de(r).legal_enforcement||0)+n(de(r).student_loan||0)
    return [
      dept,
      recs.length,
      sum(r=>n(r.base_salary)),
      sum(otAmt),
      sum(allowTotal),
      sum(bonusTotal),
      sum(commTotal),
      sum(otherInc),
      sum(r=>n(r.gross_income)),
      sum(workDeduct),
      sum(r=>n(r.social_security_amount)),
      sum(r=>n(r.monthly_tax_withheld)),
      sum(extraDeduct),
      sum(r=>n(r.total_deductions)),
      sum(r=>n(r.net_salary)),
    ]
  })
  // total row
  const deptTotRow = deptSumHeaders.map((_, ci) => {
    if (ci === 0) return "รวมทั้งหมด"
    return deptSumData.reduce((s,r) => s + (typeof r[ci]==="number" ? r[ci] as number : 0), 0)
  })
  deptSumData.push(deptTotRow as any[])

  const wsDeptSum = XLSX.utils.aoa_to_sheet([...deptSumInfo, deptSumHeaders, ...deptSumData])
  wsDeptSum["!cols"] = [
    {wch:20},{wch:10},
    {wch:14},{wch:12},{wch:12},{wch:14},{wch:14},{wch:14},
    {wch:14},
    {wch:14},{wch:14},{wch:14},{wch:14},
    {wch:14},
    {wch:14},
  ]
  const dsi = deptSumInfo.length
  wsDeptSum["!autofilter"] = { ref: XLSX.utils.encode_range({ s:{r:dsi,c:0}, e:{r:dsi+deptSumData.length,c:deptSumHeaders.length-1} }) }
  applyNumFmt(wsDeptSum)
  XLSX.utils.book_append_sheet(wb, wsDeptSum, "สรุปตามแผนก")

  // ── Sheet สรุปรายจ่ายรวม ─────────────────────────────────────────
  const grand = (fn:(r:any)=>number) => records.reduce((s:number,r:any)=>s+fn(r),0)
  const ie2   = (r:any) => r.income_extras ?? {}
  const de2   = (r:any) => r.deduction_extras ?? {}

  const incomeItems: [string, number][] = [
    ["เงินเดือนพื้นฐาน",          grand(r=>n(r.base_salary))],
    ["OT วันทำงาน ×1.5",         grand(r=>calcOTAmt(n(r.base_salary),n(r.ot_weekday_minutes),1.5))],
    ["OT วันหยุด ×1.0 (งานปกติ)", grand(r=>calcOTAmt(n(r.base_salary),n(r.ot_holiday_reg_minutes),1.0))],
    ["OT วันหยุด ×3.0",          grand(r=>calcOTAmt(n(r.base_salary),n(r.ot_holiday_ot_minutes),3.0))],
    ["ค่าตำแหน่ง",                grand(r=>n(r.allowance_position))],
    ["ค่าเดินทาง",                 grand(r=>n(r.allowance_transport))],
    ["ค่าอาหาร",                   grand(r=>n(r.allowance_food))],
    ["ค่าโทรศัพท์",                grand(r=>n(r.allowance_phone))],
    ["ค่าที่พัก",                  grand(r=>n(r.allowance_housing))],
    ["เบี้ยเลี้ยงอื่นๆ",            grand(r=>n(r.allowance_other))],
    ["Bonus / KPI",               grand(r=>n(r.bonus)+n(ie2(r).kpi||0))],
    ["Incentive",                 grand(r=>n(ie2(r).incentive||0))],
    ["Performance Bonus",         grand(r=>n(ie2(r).performance_bonus||0))],
    ["Commission",                grand(r=>n(r.commission))],
    ["ค่าบริการ",                  grand(r=>n(ie2(r).service_fee||0))],
    ["แคมเปญ",                    grand(r=>n(ie2(r).campaign||0))],
    ["ค่าเสื่อมสภาพ",              grand(r=>n(ie2(r).depreciation||0))],
    ["ค่าทางด่วน",                 grand(r=>n(ie2(r).expressway||0))],
    ["ค่าน้ำมัน",                  grand(r=>n(ie2(r).fuel||0))],
    ["โครงการเกษียณ",              grand(r=>n(ie2(r).retirement_fund||0))],
    ["เบี้ยเลี้ยง (Per Diem)",     grand(r=>n(ie2(r).per_diem||0))],
    ["เบี้ยขยัน",                  grand(r=>n(ie2(r).diligence_bonus||0))],
    ["เพื่อนแนะนำเพื่อน",           grand(r=>n(ie2(r).referral_bonus||0))],
    ["รายได้อื่นๆ",                grand(r=>n(r.other_income))],
  ]
  const deductItems: [string, number][] = [
    ["หักมาสาย",                   grand(r=>n(r.deduct_late))],
    ["หักออกก่อนกำหนด",            grand(r=>n(r.deduct_early_out))],
    ["หักขาดงาน/ลาไม่ได้เงิน",      grand(r=>n(r.deduct_absent)+n(r.deduct_other))],
    ["พักงาน",                     grand(r=>n(de2(r).suspension||0))],
    ["บัตรหาย/ชำรุด",              grand(r=>n(de2(r).card_lost||0))],
    ["ค่าเครื่องแบบพนักงาน",         grand(r=>n(de2(r).uniform||0))],
    ["ค่าบัตรจอดรถ",               grand(r=>n(de2(r).parking||0))],
    ["สินค้าพนักงาน",               grand(r=>n(de2(r).employee_products||0))],
    ["กรมบังคับคดี",               grand(r=>n(de2(r).legal_enforcement||0))],
    ["กยศ.",                       grand(r=>n(de2(r).student_loan||0))],
    ["หักเงินกู้",                  grand(r=>n(r.deduct_loan))],
    ["ประกันสังคม (นายจ้าง)",       grand(r=>n(r.social_security_amount))],
    ["ภาษีหัก ณ ที่จ่าย",           grand(r=>n(r.monthly_tax_withheld))],
  ]

  const totalGross  = grand(r=>n(r.gross_income))
  const totalDeduct = grand(r=>n(r.total_deductions))
  const totalNet    = grand(r=>n(r.net_salary))

  // filter only non-zero items
  const incFiltered = incomeItems.filter(([,v])=>v>0)
  const dedFiltered = deductItems.filter(([,v])=>v>0)

  const sumSheetData: any[][] = [
    [`สรุปรายจ่ายเงินเดือน — ${pTh}`],
    [exportedAt],
    [`จำนวนพนักงาน: ${records.length} คน`],
    [],
    ["หมวด","รายการ","จำนวนเงิน (บาท)"],
    ...incFiltered.map(([label, val]) => ["รายรับ", label, val]),
    ["","รวมรายรับทั้งหมด", totalGross],
    [],
    ...dedFiltered.map(([label, val]) => ["รายหัก", label, val]),
    ["","รวมรายหักทั้งหมด", totalDeduct],
    [],
    ["สรุป","ยอดเงินเดือนสุทธิที่จ่ายออก", totalNet],
  ]
  const wsSum = XLSX.utils.aoa_to_sheet(sumSheetData)
  wsSum["!cols"] = [{wch:12},{wch:26},{wch:18}]
  applyNumFmt(wsSum)
  XLSX.utils.book_append_sheet(wb, wsSum, "สรุปรายจ่าย")

  dlWb()
  toast.success(`Export สำเร็จ: ${records.length} คน · ${sortedDepts.length} แผนก`)
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

  // editable fields — init เป็น string ทั้งหมด เพื่อให้ input type=number ทำงานถูก
  const s = (v: any) => v != null && v !== 0 ? String(v) : ""
  const [f, setF] = useState({
    base_salary:           s(record.base_salary),
    allowance_position:    s(record.allowance_position),
    allowance_transport:   s(record.allowance_transport),
    allowance_food:        s(record.allowance_food),
    allowance_phone:       s(record.allowance_phone),
    allowance_housing:     s(record.allowance_housing),
    allowance_other:       s(record.allowance_other),
    ot_amount:             s(record.ot_amount),
    ot_weekday_minutes:    s(record.ot_weekday_minutes),
    ot_holiday_reg_minutes:s(record.ot_holiday_reg_minutes),
    ot_holiday_ot_minutes: s(record.ot_holiday_ot_minutes),
    bonus:                 s(record.bonus),
    commission:            s(record.commission),
    other_income:          s(record.other_income),
    deduct_absent:         s(record.deduct_absent),
    deduct_late:           s(record.deduct_late),
    deduct_loan:           s(record.deduct_loan),
    deduct_other:          s(record.deduct_other),
    social_security_amount:s(record.social_security_amount),
    monthly_tax_withheld:  s(record.monthly_tax_withheld),
    absent_days:           s(record.absent_days),
    late_count:            s(record.late_count),
    present_days:          s(record.present_days),
    leave_paid_days:       s(record.leave_paid_days),
    leave_unpaid_days:     s(record.leave_unpaid_days),
    note_override:         record.note_override ?? "",
    ex_kpi:                s(ie.kpi),
    ex_incentive:          s(ie.incentive),
    ex_performance_bonus:  s(ie.performance_bonus),
    ex_service_fee:        s(ie.service_fee),
    ex_depreciation:       s(ie.depreciation),
    ex_expressway:         s(ie.expressway),
    ex_fuel:               s(ie.fuel),
    ex_campaign:           s(ie.campaign),
    ex_retirement_fund:    s(ie.retirement_fund),
    ex_per_diem:           s(ie.per_diem),
    ex_diligence_bonus:    s(ie.diligence_bonus),
    ex_referral_bonus:     s(ie.referral_bonus),
    dx_suspension:         s(de.suspension),
    dx_card_lost:          s(de.card_lost),
    dx_uniform:            s(de.uniform),
    dx_parking:            s(de.parking),
    dx_employee_products:  s(de.employee_products),
    dx_legal_enforcement:  s(de.legal_enforcement),
    dx_student_loan:       s(de.student_loan),
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }))

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

    // ใช้ API route + service client เพื่อไม่ติด RLS
    console.log("[payroll save] id:", record.id, "payload keys:", Object.keys(payload), "commission:", payload.commission, "bonus:", payload.bonus)
    try {
      const res = await fetch("/api/payroll/register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, ...payload }),
      })
      const result = await res.json()
      console.log("[payroll save] response:", res.status, result)
      setSaving(false)
      if (!res.ok || result.error) {
        toast.error(result.error || `Error ${res.status}`)
        return
      }
      toast.success("บันทึกการแก้ไขแล้ว")
      // Reload records จาก server เพื่อให้ได้ค่าใหม่จริง
      onSaved({ ...record, ...payload })
      onClose()
    } catch (err: any) {
      setSaving(false)
      console.error("[payroll save] error:", err)
      toast.error(err.message || "บันทึกไม่สำเร็จ")
    }
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
  // ใช้ function ธรรมดา (ไม่ใช่ component) เพื่อไม่ให้ remount input ทุก render
  const numRow = (label: string, k: FieldKey, green?: boolean, red?: boolean) => (
    <div key={k} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <label className="text-[11px] text-slate-600 flex-1">{label}</label>
      <div className="w-28">
        <input
          type="number" step="0.01"
          value={f[k] ?? ""}
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
                {numRow("เงินเดือน", "base_salary", true)}
                {numRow(`KPI Bonus${record.kpi_grade ? ` (${record.kpi_grade})` : ""}`, "bonus", true)}
                {numRow("OT (฿ รวม)", "ot_amount", true)}
                {numRow("ค่าตำแหน่ง", "allowance_position", true)}
                {numRow("คอมมิชชั่น", "commission", true)}
                {numRow("ค่าเดินทาง", "allowance_transport", true)}
                {numRow("ค่าอาหาร", "allowance_food", true)}
                {numRow("ค่าโทรศัพท์", "allowance_phone", true)}
                {numRow("ค่าที่พัก", "allowance_housing", true)}
                {numRow("รายได้อื่นๆ", "other_income", true)}
              </div>

              {/* รายรับเพิ่มเติม (extras) */}
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"/> รายรับเพิ่มเติม
              </p>
              <div className="bg-emerald-50/50 rounded-xl px-3 py-1.5">
                {numRow("KPI", "ex_kpi", true)}
                {numRow("Incentive", "ex_incentive", true)}
                {numRow("Performance Bonus", "ex_performance_bonus", true)}
                {numRow("ค่าบริการ", "ex_service_fee", true)}
                {numRow("ค่าเสื่อมสภาพ", "ex_depreciation", true)}
                {numRow("ค่าทางด่วน", "ex_expressway", true)}
                {numRow("ค่าน้ำมัน", "ex_fuel", true)}
                {numRow("แคมเปญ", "ex_campaign", true)}
                {numRow("ค่าโครงการเกษียณ", "ex_retirement_fund", true)}
                {numRow("เบี้ยเลี้ยง", "ex_per_diem", true)}
                {numRow("เบี้ยขยัน", "ex_diligence_bonus", true)}
                {numRow("เพื่อนแนะนำเพื่อน", "ex_referral_bonus", true)}
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
                {numRow("หักมาสาย", "deduct_late", false, true)}
                {numRow("หักขาดงาน/ลา", "deduct_absent", false, true)}
                {numRow("เงินหักอื่นๆ", "deduct_other", false, true)}
                {numRow("หักเงินกู้", "deduct_loan", false, true)}
                {numRow("ประกันสังคม", "social_security_amount", false, true)}
                {numRow("ภาษีหัก ณ ที่จ่าย", "monthly_tax_withheld", false, true)}
              </div>

              {/* รายหักเพิ่มเติม (extras) */}
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-400 rounded-full inline-block"/> รายหักเพิ่มเติม
              </p>
              <div className="bg-rose-50/50 rounded-xl px-3 py-1.5">
                {numRow("พักงาน", "dx_suspension", false, true)}
                {numRow("บัตรหาย/ชำรุด", "dx_card_lost", false, true)}
                {numRow("ค่าซื้อเสื้อพนักงาน", "dx_uniform", false, true)}
                {numRow("ค่าบัตรจอดรถ", "dx_parking", false, true)}
                {numRow("สินค้าพนักงาน", "dx_employee_products", false, true)}
                {numRow("กรมบังคับคดี", "dx_legal_enforcement", false, true)}
                {numRow("กยศ.", "dx_student_loan", false, true)}
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
                  {numRow("OT 1.5x วันทำงาน", "ot_weekday_minutes")}
                  {numRow("OT 1.0x วันหยุด", "ot_holiday_reg_minutes")}
                  {numRow("OT 3.0x วันหยุด+เลิก", "ot_holiday_ot_minutes")}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">สถิติการเข้างาน</p>
                <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                  {numRow("วันมาทำงาน", "present_days")}
                  {numRow("วันขาดงาน", "absent_days")}
                  {numRow("ครั้งมาสาย", "late_count")}
                  {numRow("วันลา (จ่าย)", "leave_paid_days")}
                  {numRow("วันลา (ไม่จ่าย)", "leave_unpaid_days")}
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
            {record.bonus > 0 && record.kpi_grade && record.kpi_grade !== "pending" && (
              <div className="px-4 py-2 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600">KPI Bonus</p>
                    <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${
                      record.kpi_grade === "A" ? "bg-yellow-100 text-yellow-700" :
                      record.kpi_grade === "B" ? "bg-green-100 text-green-700" :
                      record.kpi_grade === "C" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>เกรด {record.kpi_grade}</span>
                  </div>
                  <p className="text-sm font-semibold text-green-600">+฿{thb(record.bonus)}</p>
                </div>
                {record.kpi_standard_amount > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">ฐาน KPI: ฿{thb(record.kpi_standard_amount)}</p>
                )}
              </div>
            )}
            {record.kpi_grade === "pending" && record.kpi_standard_amount > 0 && (
              <div className="px-4 py-2 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600">KPI Bonus</p>
                    <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-slate-100 text-slate-500">รอประเมิน</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-400">฿{thb(record.kpi_standard_amount)}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">รอหัวหน้าประเมิน KPI เดือนนี้</p>
              </div>
            )}
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

// ── Deduplicate payroll records by employee_code ──────────────────────
// ถ้ามีพนักงาน employee_code เดียวกันหลาย record (จาก migration ซ้ำ)
// เก็บเฉพาะ record ที่ employee.updated_at ใหม่สุด (= ข้อมูลจาก import ใหม่)
function dedupePayrollRecords(records: any[]): any[] {
  const byCode = new Map<string, any>()
  for (const r of records) {
    const code = r.employee?.employee_code
    if (!code) { byCode.set(r.id, r); continue }
    const existing = byCode.get(code)
    if (!existing) {
      byCode.set(code, r)
    } else {
      // เก็บ record ที่ employee updated_at ใหม่กว่า
      const existDate = existing.employee?.updated_at || existing.updated_at || ''
      const newDate = r.employee?.updated_at || r.updated_at || ''
      if (newDate > existDate) byCode.set(code, r)
    }
  }
  return Array.from(byCode.values())
}

// ── Deduplicate employees by employee_code ────────────────────────────
// สำหรับ createPeriod / calculateAll — เก็บเฉพาะ employee ที่ updated_at ใหม่สุด
function dedupeEmployees(emps: any[]): any[] {
  const byCode = new Map<string, any>()
  for (const e of emps) {
    const code = e.employee_code
    if (!code) { byCode.set(e.id, e); continue }
    const existing = byCode.get(code)
    if (!existing) {
      byCode.set(code, e)
    } else {
      const existDate = existing.updated_at || ''
      const newDate = e.updated_at || ''
      if (newDate > existDate) byCode.set(code, e)
    }
  }
  return Array.from(byCode.values())
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
  const [showTxtExport, setShowTxtExport] = useState(false)
  const [txtExclude,   setTxtExclude]   = useState<Set<string>>(new Set())
  const [txtSearch,    setTxtSearch]    = useState("")
  const [txtFilterDept, setTxtFilterDept] = useState("")

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined
  const isAllCo = selectedCo === "all"
  const companyId = isSA ? (isAllCo ? undefined : (selectedCo || myCompanyId)) : myCompanyId

  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        if (data?.[0] && !selectedCo) setSelectedCo(data[0].id)
      })
  }, [isSA])

  const loadPeriods = useCallback(async () => {
    if (isAllCo) {
      // โหลด periods ทุกบริษัทในครั้งเดียว แล้วรวม unique year/month
      // พร้อมเก็บ period_ids ทั้งหมดของแต่ละ year/month ไว้ใน object เลย
      // เพื่อให้ loadRecords ใช้โดยไม่ต้อง query ซ้ำ (ป้องกัน RLS race)
      const { data, error } = await supabase.from("payroll_periods")
        .select("id,year,month,period_name,start_date,end_date,pay_date,status,company_id")
        .order("year", { ascending: false }).order("month", { ascending: false })
      if (error) { console.error("loadPeriods (all):", error); return }

      // จัดกลุ่มตาม year/month พร้อมเก็บ period_ids และนับจำนวนบริษัท
      const byKey = new Map<string, { ids: string[]; companies: Set<string>; rep: any }>()
      for (const p of (data ?? [])) {
        const key = `${p.year}-${String(p.month).padStart(2,"0")}`
        if (!byKey.has(key)) byKey.set(key, { ids: [], companies: new Set(), rep: p })
        byKey.get(key)!.ids.push(p.id)
        byKey.get(key)!.companies.add(p.company_id)
      }

      const merged: any[] = Array.from(byKey.entries()).map(([key, g]) => ({
        ...g.rep,
        id: key,                          // fake id สำหรับ dropdown เท่านั้น
        _isAllCo: true,
        _periodIds: g.ids,                // UUID จริงทุก period ของ month นี้ — ใช้ใน loadRecords
        _companyCount: g.companies.size,
      }))

      setPeriods(merged)
      setSelected((prev: any) => {
        // ถ้ามี selected เดิมที่เป็น all-co อยู่แล้ว → หา month เดิม ถ้าไม่เจอก็ใช้อันแรก
        if (prev?._isAllCo) {
          const same = merged.find((m: any) => m.year === prev.year && m.month === prev.month)
          return same ?? merged[0] ?? null
        }
        return merged[0] ?? null
      })
      return
    }
    if (!companyId) return
    const { data, error } = await supabase.from("payroll_periods")
      .select("*").eq("company_id", companyId)
      .order("year", { ascending: false }).order("month", { ascending: false })
    if (error) { console.error("loadPeriods:", error); return }
    setPeriods(data ?? [])
    setSelected(data?.[0] ?? null)
  }, [companyId, isAllCo])

  useEffect(() => { loadPeriods() }, [loadPeriods])

  const loadRecords = useCallback(async () => {
    if (!selected) { setRecords([]); return }
    setLoading(true)
    const empSelect = `*, employee:employees!payroll_records_employee_id_fkey(
      id,employee_code,first_name_th,last_name_th,nickname,avatar_url,brand,updated_at,
      position:positions(name),
      department:departments(id,name),
      company:companies(id,code,name_th))`

    if (selected._isAllCo) {
      // ใช้ _periodIds ที่เก็บไว้ตอน loadPeriods — ไม่ต้อง query ซ้ำ (เสถียรกว่า)
      const periodIds: string[] = selected._periodIds ?? []
      if (periodIds.length === 0) {
        console.warn("loadRecords(all): no period IDs found for", selected.year, selected.month)
        setRecords([]); setLoading(false); return
      }
      try {
        const { data, error } = await supabase.from("payroll_records")
          .select(empSelect).in("payroll_period_id", periodIds).order("created_at")
        if (error) throw error
        setRecords(dedupePayrollRecords(data ?? []))
      } catch (e) {
        console.error("loadRecords(all):", e)
        setRecords([])
      }
    } else {
      try {
        const { data, error } = await supabase.from("payroll_records")
          .select(empSelect).eq("payroll_period_id", selected.id).order("created_at")
        if (error) throw error
        setRecords(dedupePayrollRecords(data ?? []))
      } catch (e) {
        console.error("loadRecords:", e)
        setRecords([])
      }
    }
    setLoading(false)
  }, [selected])

  // ── Background recalculate: คำนวณเงินเดือนใหม่เบื้องหลัง ────────
  // ทำงานอัตโนมัติเมื่อเลือกงวด + ทุก 60 วินาที + เมื่อมี attendance เปลี่ยน
  const bgCalcRef = useRef(false)
  const bgRecalculate = useCallback(async () => {
    if (!selected || !companyId || isAllCo || selected._isAllCo || bgCalcRef.current || calculating) return
    bgCalcRef.current = true
    try {
      const { data: rawEmps } = await supabase.from("employees")
        .select("id,employee_code,updated_at").eq("company_id", companyId).eq("is_active", true)
      const emps = dedupeEmployees(rawEmps ?? [])
      if (!emps?.length) return

      // ✅ ใช้ bulk API: ส่ง 50 คนต่อ request แทนทีละคน (เร็วขึ้น 5-10x)
      const BATCH = 50
      for (let i = 0; i < emps.length; i += BATCH) {
        const batch = emps.slice(i, i + BATCH)
        await fetch("/api/payroll/bulk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_ids: batch.map(e => e.id),
            payroll_period_id: selected.id,
          }),
        }).catch(() => {})
      }
      // โหลดข้อมูลใหม่
      const { data } = await supabase.from("payroll_records")
        .select(`*, employee:employees!payroll_records_employee_id_fkey(
          id,employee_code,first_name_th,last_name_th,nickname,avatar_url,brand,updated_at,
          position:positions(name),
          department:departments(id,name),
          company:companies(id,code,name_th))`)
        .eq("payroll_period_id", selected.id)
        .order("created_at")
      setRecords(dedupePayrollRecords(data ?? []))
    } catch {} finally { bgCalcRef.current = false }
  }, [selected, companyId, calculating])

  // เมื่อเลือกงวด → โหลด records ก่อน → แล้วคำนวณเบื้องหลัง
  useEffect(() => {
    loadRecords().then(() => {
      // หน่วงเล็กน้อยเพื่อให้ UI โหลดก่อน
      const t = setTimeout(() => bgRecalculate(), 500)
      return () => clearTimeout(t)
    })
  }, [loadRecords])

  // Auto-refresh ทุก 5 นาที (ลดภาระ server สำหรับ 500+ คน)
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => bgRecalculate(), 300_000)
    return () => clearInterval(interval)
  }, [selected, bgRecalculate])

  // Supabase Realtime: subscribe attendance_records → trigger recalculate
  useEffect(() => {
    if (!selected || !companyId) return
    const channel = supabase
      .channel(`payroll-att-${selected.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "attendance_records",
      }, () => {
        // เมื่อมี attendance เปลี่ยน → recalculate เบื้องหลัง (หน่วง 2 วิ)
        setTimeout(() => bgRecalculate(), 2000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected, companyId, bgRecalculate])

  // ── helper: หาเดือนงวดถัดไปที่ยังไม่มี ─────────────────────────────
  const getNextPeriodMonth = useCallback((): { y: number; m: number } => {
    // ถ้ามี periods อยู่แล้ว → หาเดือนถัดจากงวดล่าสุด
    if (periods.length > 0) {
      const latest = periods[0] // sorted desc by year,month
      let ny = latest.year, nm = latest.month + 1
      if (nm > 12) { nm = 1; ny++ }
      return { y: ny, m: nm }
    }
    // ถ้ายังไม่มีงวดเลย → ใช้เดือนปัจจุบัน (+ period detection)
    let y = now.getFullYear(), m = now.getMonth() + 1
    if (now.getDate() > 21) { m++; if (m > 12) { m = 1; y++ } }
    return { y, m }
  }, [periods, now])

  // ── label แสดงชื่อเดือนงวดถัดไป ─────────────────────────────────────
  const nextPeriodLabel = useMemo(() => {
    const { y, m } = getNextPeriodMonth()
    return format(new Date(y, m - 1), "MMMM yyyy", { locale: th })
  }, [getNextPeriodMonth])

  const createPeriod = async () => {
    if (!companyId) return

    const { y, m } = getNextPeriodMonth()

    // ตรวจสอบซ้ำก่อนสร้าง
    const { data: existing } = await supabase.from("payroll_periods")
      .select("id").eq("company_id", companyId).eq("year", y).eq("month", m).maybeSingle()
    if (existing) {
      toast.error(`งวด ${format(new Date(y, m - 1), "MMMM yyyy", { locale: th })} มีอยู่แล้ว`)
      return
    }

    // งวด: 22 เดือนก่อน → 21 เดือนนี้
    const startDate = new Date(y, m - 2, 22)
    const endDate   = new Date(y, m - 1, 21)
    const payDate   = new Date(y, m - 1, 25)

    const { data, error } = await supabase.from("payroll_periods").insert({
      company_id:  companyId, year: y, month: m,
      period_name: format(new Date(y, m - 1), "MMMM yyyy", { locale: th }),
      start_date:  format(startDate, "yyyy-MM-dd"),
      end_date:    format(endDate,   "yyyy-MM-dd"),
      pay_date:    format(payDate,   "yyyy-MM-dd"),
      status: "draft", created_by: user?.employee?.id ?? null,
    }).select().single()
    if (error) return toast.error("เกิดข้อผิดพลาดในการสร้างงวด")
    toast.success(`✓ สร้างงวด ${data.period_name} แล้ว กำลังคำนวณ...`)
    setSelected(data)
    setPeriods(p => [data, ...p])

    // ── คำนวณเงินเดือนทุกพนักงาน (full calc) ─────────────────────
    setCalculating(true)
    const { data: rawEmps } = await supabase.from("employees")
      .select("id, employee_code, first_name_th, last_name_th, updated_at").eq("company_id", companyId).eq("is_active", true)
    const emps = dedupeEmployees(rawEmps ?? [])
    if (!emps || emps.length === 0) { setCalculating(false); return }
    setCalcProgress({ done: 0, total: emps.length })
    let done = 0, success = 0, failed = 0
    const errs: string[] = []
    // ✅ ใช้ bulk API: ส่ง 50 คนต่อ request
    const BATCH = 50
    for (let i = 0; i < emps.length; i += BATCH) {
      const batch = emps.slice(i, i + BATCH)
      try {
        const res = await fetch("/api/payroll/bulk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_ids: batch.map((e: any) => e.id),
            payroll_period_id: data.id,
          }),
        })
        const json = await res.json()
        if (json.success != null) {
          success += json.success
          failed += json.failed || 0
          if (json.errors?.length) {
            for (const e of json.errors) {
              if (errs.length < 5) errs.push(e.error || "Unknown error")
            }
          }
        }
      } catch (e: any) {
        failed += batch.length
        if (errs.length < 5) errs.push(e.message)
      }
      done = Math.min(i + BATCH, emps.length)
      setCalcProgress({ done, total: emps.length })
    }
    if (success > 0) toast.success(`✓ คำนวณเงินเดือน ${success} คน สำเร็จ`)
    if (failed > 0) {
      toast.error(`✗ ล้มเหลว ${failed} คน`, { duration: 6000 })
      console.error("Payroll errors:", errs)
      if (errs.length > 0) toast.error(errs.slice(0, 3).join("\n"), { duration: 8000 })
    }
    setCalculating(false)
    loadRecords()
  }

  const calculateAll = async () => {
    if (!selected || !companyId) return
    setCalculating(true)
    const { data: rawEmps } = await supabase.from("employees")
      .select("id, employee_code, first_name_th, last_name_th, updated_at").eq("company_id", companyId).eq("is_active", true)
    const emps = dedupeEmployees(rawEmps ?? [])
    if (!emps || emps.length === 0) {
      toast.error("ไม่พบพนักงานในบริษัทนี้")
      setCalculating(false)
      return
    }
    setCalcProgress({ done: 0, total: emps.length })
    let success = 0, failed = 0
    const errors: string[] = []

    // ✅ ใช้ bulk API: ส่ง 50 คนต่อ request (เร็วขึ้น 10x+ จากเดิมทีละคน)
    const BATCH = 50
    for (let i = 0; i < emps.length; i += BATCH) {
      const batch = emps.slice(i, i + BATCH)
      try {
        const res = await fetch("/api/payroll/bulk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_ids: batch.map(e => e.id),
            payroll_period_id: selected.id,
          }),
        })
        const json = await res.json()
        if (json.success != null) {
          success += json.success
          failed += json.failed || 0
          if (json.errors?.length) {
            for (const e of json.errors) {
              if (errors.length < 5) errors.push(e.error || "Unknown error")
            }
          }
        }
      } catch (e: any) {
        failed += batch.length
        if (errors.length < 5) errors.push(e.message)
      }
      setCalcProgress({ done: Math.min(i + BATCH, emps.length), total: emps.length })
    }
    if (success > 0) toast.success(`✓ คำนวณสำเร็จ ${success} คน`)
    if (failed > 0) {
      toast.error(`✗ ล้มเหลว ${failed} คน`)
      console.error("Payroll calculation errors:", errors)
      if (errors.length > 0) toast.error(errors.slice(0, 3).join("\n"), { duration: 8000 })
    }
    if (success === 0 && failed === 0) toast.error("ไม่มีพนักงานที่คำนวณได้")
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
    const hdr = ["รหัส","ชื่อ","นามสกุล","ตำแหน่ง","แผนก","เงินเดือนฐาน","เบี้ยตำแหน่ง","ค่าเดินทาง","ค่าอาหาร","OT฿","OT1.5x(น.)","OT1.0x(น.)","OT3.0x(น.)","KPI Bonus","เกรด KPI","ฐาน KPI","คอมมิชชั่น","รวมรายรับ","หักขาด","หักสาย","หักกู้","SSO","ภาษี","หักรวม","สุทธิ","วันมา","วันขาด","สาย","ลาจ่าย","ลาไม่จ่าย","แก้ไขโดยHR"]
    const rows = records.map((r: any) => [
      r.employee?.employee_code, r.employee?.first_name_th, r.employee?.last_name_th,
      r.employee?.position?.name, r.employee?.department?.name,
      r.base_salary||0, r.allowance_position||0, r.allowance_transport||0, r.allowance_food||0,
      r.ot_amount||0, r.ot_weekday_minutes||0, r.ot_holiday_reg_minutes||0, r.ot_holiday_ot_minutes||0,
      r.bonus||0, r.kpi_grade||"", r.kpi_standard_amount||0, r.commission||0, r.gross_income||0,
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
  const totalKPI   = filtered.reduce((s: number, r: any) => s + (r.bonus||0), 0)
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
              <option value="all">ทุกบริษัท (รวม)</option>
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
          {/* actions — ซ่อนเมื่ออยู่ในโหมดทุกบริษัท */}
          {!isAllCo && (
            <button onClick={createPeriod} disabled={calculating}
              className="flex items-center gap-2 px-3 py-2.5 border border-indigo-200 bg-indigo-50 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              title={`สร้างงวด ${nextPeriodLabel}`}>
              <Plus size={12}/> + {nextPeriodLabel}
            </button>
          )}
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
              {!isAllCo && selected.status === "draft" && (
                <button onClick={calculateAll} disabled={calculating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {calculating
                    ? <><Loader2 size={13} className="animate-spin"/> {calcProgress.total > 0 && `${calcProgress.done}/${calcProgress.total}`}</>
                    : <><Play size={13}/> คำนวณทั้งหมด</>}
                </button>
              )}
              {!isAllCo && records.length > 0 && selected.status === "draft" && (
                <button onClick={approvePeriod}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  <CheckCircle size={13}/> อนุมัติจ่าย
                </button>
              )}
              {isAllCo && selected && (
                <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl font-bold">
                  รวม {selected._companyCount ?? "?"} บริษัท · {selected._periodIds?.length ?? "?"} งวด
                </span>
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { l:"พนักงาน",     v:`${records.length} คน`, ic:Users,     c:"indigo" },
                { l:"รวมรายรับ",   v:`฿${thb(totalGross)}`,  ic:TrendingUp,c:"green"  },
                { l:"KPI Bonus",   v:`฿${thb(totalKPI)}`,    ic:TrendingUp,c:"emerald"},
                { l:"รวม OT",      v:`฿${thb(totalOT)}`,     ic:Clock,     c:"amber"  },
                { l:"SSO + ภาษี",  v:`฿${thb(totalSSO+totalTax)}`, ic:AlertCircle, c:"orange"},
                { l:"รับสุทธิรวม",v:`฿${thb(totalNet)}`,    ic:Banknote,  c:"blue"   },
              ].map(s => {
                const cc: Record<string, string> = {
                  indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
                  green:  "bg-green-50 border-green-100 text-green-700",
                  emerald:"bg-emerald-50 border-emerald-100 text-emerald-700",
                  amber:  "bg-amber-50 border-amber-100 text-amber-700",
                  orange: "bg-orange-50 border-orange-100 text-orange-700",
                  blue:   "bg-blue-50 border-blue-100 text-blue-700",
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
              <button onClick={() => { setShowTxtExport(true); setTxtExclude(new Set()); setTxtSearch(""); setTxtFilterDept("") }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                <Download size={11}/> TXT
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
          onSaved={() => {
            setEditing(null)
            loadRecords()
          }}
        />
      )}

      {/* ═══ TXT Export Modal ═══ */}
      {showTxtExport && (() => {
        const departments = Array.from(new Set(records.map((r: any) => r.employee?.department?.name).filter(Boolean))).sort() as string[]
        const txtFiltered = records.filter((r: any) => {
          if (txtFilterDept && r.employee?.department?.name !== txtFilterDept) return false
          if (txtSearch) {
            const s = txtSearch.toLowerCase()
            const name = `${r.employee?.first_name_th || ""} ${r.employee?.last_name_th || ""} ${r.employee?.employee_code || ""}`.toLowerCase()
            if (!name.includes(s)) return false
          }
          if (txtExclude.has(r.employee?.id)) return false
          return true
        })
        const totalNet = txtFiltered.reduce((s: number, r: any) => s + (Number(r.net_salary) || 0), 0)

        const doExport = () => {
          const lines = txtFiltered.map((r: any) => {
            const emp = r.employee || {}
            const bankAcc = (emp.bank_account || "").replace(/[^0-9]/g, "")
            const net = (Number(r.net_salary) || 0).toFixed(2)
            const name = `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim()
            return `${bankAcc}\t${net}\t${emp.employee_code || ""}\t${name}`
          })
          const header = `บัญชีธนาคาร\tจำนวนเงิน\tรหัสพนักงาน\tชื่อ-นามสกุล`
          const txt = [header, ...lines].join("\n")
          const blob = new Blob(["\uFEFF" + txt], { type: "text/plain;charset=utf-8" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a"); a.href = url
          a.download = `payroll_${selected?.year}_${String(selected?.month).padStart(2,"0")}.txt`
          a.click(); URL.revokeObjectURL(url)
          toast.success(`Export TXT สำเร็จ: ${txtFiltered.length} คน`)
          setShowTxtExport(false)
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTxtExport(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-blue-600 px-5 py-4">
                <h3 className="text-white font-bold">Export TXT — เลือกพนักงาน</h3>
                <p className="text-blue-200 text-xs">งวด {selected?.period_name || `${selected?.month}/${selected?.year}`} · {txtFiltered.length} คน · ฿{totalNet.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Filters */}
              <div className="px-5 py-3 border-b border-slate-100 space-y-2">
                <div className="flex gap-2">
                  <select value={txtFilterDept} onChange={e => setTxtFilterDept(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                    <option value="">ทุกแผนก</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input value={txtSearch} onChange={e => setTxtSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ/รหัส..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none" />
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => setTxtExclude(new Set())}
                    className="text-[10px] text-blue-600 font-bold hover:underline">เลือกทั้งหมด</button>
                  <button onClick={() => setTxtExclude(new Set(txtFiltered.map((r: any) => r.employee?.id)))}
                    className="text-[10px] text-slate-400 font-bold hover:underline">ไม่เลือกทั้งหมด</button>
                </div>
              </div>

              {/* Employee list */}
              <div className="flex-1 overflow-y-auto px-5 py-2">
                {records.filter((r: any) => {
                  if (txtFilterDept && r.employee?.department?.name !== txtFilterDept) return false
                  if (txtSearch) {
                    const s = txtSearch.toLowerCase()
                    const name = `${r.employee?.first_name_th || ""} ${r.employee?.last_name_th || ""} ${r.employee?.employee_code || ""}`.toLowerCase()
                    if (!name.includes(s)) return false
                  }
                  return true
                }).map((r: any) => {
                  const emp = r.employee || {}
                  const excluded = txtExclude.has(emp.id)
                  return (
                    <label key={r.id} className={`flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-slate-50 ${excluded ? "opacity-40" : ""}`}>
                      <input type="checkbox" checked={!excluded}
                        onChange={() => {
                          setTxtExclude(prev => {
                            const next = new Set(prev)
                            if (next.has(emp.id)) next.delete(emp.id)
                            else next.add(emp.id)
                            return next
                          })
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700 flex-1 truncate">{emp.first_name_th} {emp.last_name_th}</span>
                      <span className="text-[10px] text-slate-400">{emp.employee_code}</span>
                      <span className="text-[10px] text-slate-400">{emp.department?.name || ""}</span>
                      <span className="text-xs font-bold text-blue-700 min-w-[70px] text-right">฿{(Number(r.net_salary) || 0).toLocaleString()}</span>
                    </label>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
                <button onClick={() => setShowTxtExport(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">ยกเลิก</button>
                <button onClick={doExport} disabled={txtFiltered.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <Download size={14} /> Export TXT ({txtFiltered.length} คน)
                </button>
              </div>
            </div>
          </div>
        )
      })()}
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