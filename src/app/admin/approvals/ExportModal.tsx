"use client"
import { useState } from "react"
import { X, Download, Loader2, FileSpreadsheet } from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

const TYPE_LABELS: Record<string, string> = {
  leave: "ลางาน",
  adjustment: "แก้ไขเวลา",
  overtime: "โอที",
  shift_change: "เปลี่ยนกะ",
}
const STATUS_LABELS: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  cancelled: "ยกเลิกแล้ว",
  cancel_requested: "ขอยกเลิก",
  all: "ทั้งหมด",
}

// ── helpers ────────────────────────────────────────────────────────────
const fmtDate  = (d: string | null | undefined) => d ? format(new Date(d), "yyyy-MM-dd") : ""
const fmtTime  = (ts: string | null | undefined) => {
  if (!ts) return ""
  try { return format(new Date(ts), "HH:mm") } catch { return "" }
}
const fmtTs    = (ts: string | null | undefined) =>
  ts ? format(new Date(ts), "d MMM yyyy HH:mm", { locale: th }) : ""
const otHours  = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return ""
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  if (isNaN(mins) || mins <= 0) return ""
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${h}:00`
}
const statusLabel = (r: any) =>
  r.is_cancel_requested ? "ขอยกเลิก" : (STATUS_LABELS[r.status] ?? r.status)
const empCode  = (r: any) => r.employee?.employee_code ?? ""
const empName  = (r: any) => `${r.employee?.first_name_th ?? ""} ${r.employee?.last_name_th ?? ""}`.trim()
const empDept  = (r: any) => r.employee?.department?.name ?? "-"
const empCo    = (r: any) => r.employee?.company?.code ?? "-"

function makeSheet(title: string, infoLines: string[], headers: string[], rows: any[][], colWidths: number[]) {
  const infoRows: any[][] = [
    [title],
    ...infoLines.map(l => [l]),
    [],
  ]
  const data = [...infoRows, headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws["!cols"] = colWidths.map(wch => ({ wch }))
  const hi = infoRows.length
  if (rows.length > 0) {
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: hi, c: 0 }, e: { r: hi + rows.length, c: headers.length - 1 } }) }
  }
  return ws
}

function applyNumFmt(ws: XLSX.WorkSheet, fmt = "#,##0.00") {
  if (!ws["!ref"]) return
  const range = XLSX.utils.decode_range(ws["!ref"])
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (cell && cell.t === "n") cell.z = fmt
    }
  }
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Sheet builders per type ────────────────────────────────────────────

function buildLeaveSheet(rows: any[], info: string[]) {
  const headers = [
    "รหัสพนักงาน","ชื่อ-สกุล","แผนก","บริษัท",
    "ประเภทการลา","วันที่เริ่ม","วันที่สิ้นสุด","จำนวนวัน","ครึ่งวัน","ช่วง",
    "เหตุผล","สถานะ","วันที่ส่ง","วันที่ตรวจสอบ","หมายเหตุจากผู้อนุมัติ",
  ]
  const data = rows.map(r => [
    empCode(r), empName(r), empDept(r), empCo(r),
    r.leave_type?.name ?? "-",
    fmtDate(r.start_date), fmtDate(r.end_date),
    r.total_days ?? 1,
    r.is_half_day ? "ใช่" : "",
    r.is_half_day ? (r.half_day_period === "morning" ? "เช้า" : "บ่าย") : "",
    r.reason ?? "",
    statusLabel(r), fmtTs(r.created_at), fmtTs(r.reviewed_at),
    r.review_note ? r.review_note.replace("CANCEL_REQ:", "").trim() : "",
  ])
  return makeSheet("รายการลางาน", info, headers, data,
    [14,22,16,10, 20,14,14,12,10,8, 28,14,18,18,28])
}

function buildAdjSheet(rows: any[], info: string[]) {
  const headers = [
    "รหัสพนักงาน","ชื่อ-สกุล","แผนก","บริษัท",
    "วันทำงาน","เวลาเข้า (ขอแก้)","เวลาออก (ขอแก้)",
    "เหตุผล","สถานะ","วันที่ส่ง","วันที่ตรวจสอบ","หมายเหตุจากผู้อนุมัติ",
  ]
  const data = rows.map(r => [
    empCode(r), empName(r), empDept(r), empCo(r),
    fmtDate(r.work_date),
    fmtTime(r.requested_clock_in),
    fmtTime(r.requested_clock_out),
    r.reason ?? "",
    statusLabel(r), fmtTs(r.created_at), fmtTs(r.reviewed_at),
    r.review_note ? r.review_note.replace("CANCEL_REQ:", "").trim() : "",
  ])
  return makeSheet("รายการขอแก้ไขเวลา", info, headers, data,
    [14,22,16,10, 14,14,14, 28,14,18,18,28])
}

function buildOTSheet(rows: any[], info: string[]) {
  const headers = [
    "รหัสพนักงาน","ชื่อ-สกุล","แผนก","บริษัท",
    "วันทำงาน","OT เริ่ม","OT สิ้นสุด","ชั่วโมง OT",
    "เหตุผล","สถานะ","วันที่ส่ง","วันที่ตรวจสอบ","หมายเหตุจากผู้อนุมัติ",
  ]
  const data = rows.map(r => [
    empCode(r), empName(r), empDept(r), empCo(r),
    fmtDate(r.work_date),
    fmtTime(r.ot_start),
    fmtTime(r.ot_end),
    otHours(r.ot_start, r.ot_end),
    r.reason ?? "",
    statusLabel(r), fmtTs(r.created_at), fmtTs(r.reviewed_at),
    r.review_note ? r.review_note.replace("CANCEL_REQ:", "").trim() : "",
  ])
  return makeSheet("รายการขอโอที", info, headers, data,
    [14,22,16,10, 14,12,12,12, 28,14,18,18,28])
}

function buildShiftSheet(rows: any[], info: string[]) {
  const headers = [
    "รหัสพนักงาน","ชื่อ-สกุล","แผนก","บริษัท",
    "วันทำงาน","กะปัจจุบัน","เวลากะปัจจุบัน","กะที่ขอ","เวลากะที่ขอ",
    "เหตุผล","สถานะ","วันที่ส่ง","วันที่ตรวจสอบ","หมายเหตุจากผู้อนุมัติ",
  ]
  const shiftTime = (sh: any) => sh?.work_start && sh?.work_end ? `${fmtTime(sh.work_start)}–${fmtTime(sh.work_end)}` : ""
  const data = rows.map(r => [
    empCode(r), empName(r), empDept(r), empCo(r),
    fmtDate(r.work_date),
    r.current_shift?.name ?? (r.current_assignment_type === "day_off" ? "วันหยุด" : "-"),
    shiftTime(r.current_shift),
    r.requested_shift?.name ?? (r.requested_assignment_type === "day_off" ? "วันหยุด" : "-"),
    shiftTime(r.requested_shift),
    r.reason ?? "",
    statusLabel(r), fmtTs(r.created_at), fmtTs(r.reviewed_at),
    r.review_note ? r.review_note.replace("CANCEL_REQ:", "").trim() : "",
  ])
  return makeSheet("รายการขอเปลี่ยนกะ", info, headers, data,
    [14,22,16,10, 14,18,16,18,16, 28,14,18,18,28])
}

function buildCombinedSheet(requests: any[], info: string[]) {
  // รวมทุกประเภทในชีตเดียว — columns ครบทุก type, ไม่เกี่ยวข้องกับ row นั้นจะเว้นว่าง
  const headers = [
    "ประเภท","รหัสพนักงาน","ชื่อ-สกุล","แผนก","บริษัท",
    // leave
    "ประเภทการลา","วันเริ่ม","วันสิ้นสุด","จำนวนวัน(ลา)","ครึ่งวัน",
    // adjustment
    "วันทำงาน","เวลาเข้า(ขอแก้)","เวลาออก(ขอแก้)",
    // overtime
    "OT เริ่ม","OT สิ้นสุด","ชม.OT",
    // shift
    "กะเดิม","เวลากะเดิม","กะที่ขอ","เวลากะที่ขอ",
    // common
    "เหตุผล","สถานะ","วันที่ส่ง","วันที่ตรวจสอบ",
  ]

  const shiftTime = (sh: any) => sh?.work_start && sh?.work_end ? `${fmtTime(sh.work_start)}–${fmtTime(sh.work_end)}` : ""

  const data = requests.map(r => {
    const type = r.request_type
    return [
      TYPE_LABELS[type] ?? type,
      empCode(r), empName(r), empDept(r), empCo(r),
      // leave
      type === "leave" ? (r.leave_type?.name ?? "-") : "",
      type === "leave" ? fmtDate(r.start_date) : "",
      type === "leave" ? fmtDate(r.end_date) : "",
      type === "leave" ? (r.total_days ?? 1) : "",
      type === "leave" ? (r.is_half_day ? (r.half_day_period === "morning" ? "เช้า" : "บ่าย") : "") : "",
      // adjustment
      type === "adjustment" ? fmtDate(r.work_date) : "",
      type === "adjustment" ? fmtTime(r.requested_clock_in) : "",
      type === "adjustment" ? fmtTime(r.requested_clock_out) : "",
      // overtime
      type === "overtime" ? fmtTime(r.ot_start) : "",
      type === "overtime" ? fmtTime(r.ot_end) : "",
      type === "overtime" ? otHours(r.ot_start, r.ot_end) : "",
      // shift
      type === "shift_change" ? (r.current_shift?.name ?? "-") : "",
      type === "shift_change" ? shiftTime(r.current_shift) : "",
      type === "shift_change" ? (r.requested_shift?.name ?? "-") : "",
      type === "shift_change" ? shiftTime(r.requested_shift) : "",
      // common
      r.reason ?? "",
      statusLabel(r),
      fmtTs(r.created_at),
      fmtTs(r.reviewed_at),
    ]
  })

  return makeSheet("รายงานคำร้องทั้งหมด", info, headers, data,
    [12,14,22,16,10,
     18,14,14,14,10,
     14,14,14,
     12,12,10,
     18,14,18,14,
     28,14,18,18])
}

function buildSummarySheet(requests: any[]) {
  const typeCount: Record<string, { total: number; pending: number; approved: number; rejected: number; cancelled: number }> = {}
  for (const r of requests) {
    const t = TYPE_LABELS[r.request_type] ?? r.request_type
    if (!typeCount[t]) typeCount[t] = { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    typeCount[t].total++
    const s = r.is_cancel_requested ? "cancel_requested" : r.status
    if (s === "pending" || s === "cancel_requested") typeCount[t].pending++
    else if (s === "approved") typeCount[t].approved++
    else if (s === "rejected") typeCount[t].rejected++
    else if (s === "cancelled") typeCount[t].cancelled++
  }
  const headers = ["ประเภท","รวม","รออนุมัติ","อนุมัติแล้ว","ปฏิเสธ","ยกเลิก"]
  const rows = Object.entries(typeCount).map(([t, c]) => [t, c.total, c.pending, c.approved, c.rejected, c.cancelled])
  const tot = rows.reduce((a, r) => [
    "รวมทั้งหมด",
    (a[1] as number)+(r[1] as number),
    (a[2] as number)+(r[2] as number),
    (a[3] as number)+(r[3] as number),
    (a[4] as number)+(r[4] as number),
    (a[5] as number)+(r[5] as number),
  ], ["", 0,0,0,0,0])
  rows.push(tot as any[])
  return makeSheet("สรุปคำร้อง", [`ออกรายงาน: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: th })}`], headers, rows,
    [18,10,14,14,10,10])
}

// ── Component ─────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  companies: { id: string; code: string; name_th: string }[]
  initialFilters: {
    company: string
    type: string
    status: string
    dateFrom: string
    dateTo: string
    search: string
  }
}

export default function ApprovalsExportModal({ open, onClose, companies, initialFilters }: Props) {
  const [company, setCompany] = useState(initialFilters.company)
  const [type, setType] = useState(initialFilters.type)
  const [status, setStatus] = useState(
    initialFilters.status === "pending" || initialFilters.status === "cancel_requested" ? "all" : initialFilters.status
  )
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom)
  const [dateTo, setDateTo] = useState(initialFilters.dateTo)
  const [search, setSearch] = useState(initialFilters.search)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, type, company_id: company })
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/approvals?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const requests: any[] = json.requests ?? []

      if (requests.length === 0) { toast.error("ไม่มีข้อมูลในช่วงที่เลือก"); return }

      const periodLabel = `${dateFrom ? format(new Date(dateFrom), "d MMM yyyy", { locale: th }) : "ทั้งหมด"} – ${dateTo ? format(new Date(dateTo), "d MMM yyyy", { locale: th }) : "ทั้งหมด"}`
      const exportedAt = `ออกรายงาน: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: th })}`
      const info = [`ช่วงเวลา: ${periodLabel}`, exportedAt]

      const wb = XLSX.utils.book_new()

      const appendFmt = (ws: XLSX.WorkSheet, name: string) => {
        applyNumFmt(ws)
        XLSX.utils.book_append_sheet(wb, ws, name)
      }

      appendFmt(buildCombinedSheet(requests, info), "รวมทุกประเภท")

      const leave   = requests.filter(r => r.request_type === "leave")
      const adj     = requests.filter(r => r.request_type === "adjustment")
      const ot      = requests.filter(r => r.request_type === "overtime")
      const shift   = requests.filter(r => r.request_type === "shift_change")

      if (leave.length  > 0) appendFmt(buildLeaveSheet(leave, info),  "ลางาน")
      if (adj.length    > 0) appendFmt(buildAdjSheet(adj, info),      "แก้ไขเวลา")
      if (ot.length     > 0) appendFmt(buildOTSheet(ot, info),        "โอที")
      if (shift.length  > 0) appendFmt(buildShiftSheet(shift, info),  "เปลี่ยนกะ")
      appendFmt(buildSummarySheet(requests), "สรุป")

      const suffix = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : `_${format(new Date(), "yyyyMMdd")}`
      downloadWorkbook(wb, `approvals${suffix}.xlsx`)
      toast.success(`Export สำเร็จ: ${requests.length} รายการ`)
      onClose()
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600"/>
            </div>
            <div>
              <h3 className="font-black text-slate-800">Export คำร้อง</h3>
              <p className="text-xs text-slate-400">แต่ละ sheet แยกตามประเภท · คอลัมน์ชัดเจน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16}/>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Company */}
          {companies.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">บริษัท</label>
              <select value={company} onChange={e => setCompany(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-indigo-400">
                <option value="all">ทุกบริษัท</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_th}</option>)}
              </select>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">ประเภทคำร้อง</label>
            <div className="flex flex-wrap gap-1.5">
              {[["all","ทั้งหมด"],["leave","ลางาน"],["adjustment","แก้ไขเวลา"],["overtime","โอที"],["shift_change","เปลี่ยนกะ"]].map(([k,l]) => (
                <button key={k} onClick={() => setType(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${type === k ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">สถานะ</label>
            <div className="flex flex-wrap gap-1.5">
              {[["all","ทั้งหมด"],["pending","รออนุมัติ"],["approved","อนุมัติแล้ว"],["rejected","ปฏิเสธ"],["cancelled","ยกเลิก"]].map(([k,l]) => (
                <button key={k} onClick={() => setStatus(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${status === k ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">ตั้งแต่</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">ถึง</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
          </div>

          {/* Quick date presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              { l: "เดือนนี้",  from: format(startOfMonth(new Date()), "yyyy-MM-dd"), to: format(endOfMonth(new Date()), "yyyy-MM-dd") },
              { l: "เดือนก่อน", from: format(startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth()-1)), "yyyy-MM-dd"), to: format(endOfMonth(new Date(new Date().getFullYear(), new Date().getMonth()-1)), "yyyy-MM-dd") },
              { l: "3 เดือน",  from: format(new Date(new Date().getFullYear(), new Date().getMonth()-2, 1), "yyyy-MM-dd"), to: format(endOfMonth(new Date()), "yyyy-MM-dd") },
            ].map(p => (
              <button key={p.l} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                {p.l}
              </button>
            ))}
          </div>

          {/* Search */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">ค้นหาพนักงาน</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ชื่อ / รหัส หรือเว้นว่างเพื่อดึงทั้งหมด"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
          </div>
        </div>

        {/* Sheet preview hint */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-0.5">
          <p className="font-bold text-slate-700 mb-1">ไฟล์ที่จะได้รับ</p>
          <p>· Sheet <b>รวมทุกประเภท</b> — ภาพรวมทุก row ในชีตเดียว</p>
          <p>· Sheet <b>ลางาน / แก้ไขเวลา / โอที / เปลี่ยนกะ</b> — คอลัมน์เฉพาะทาง</p>
          <p>· Sheet <b>สรุป</b> — จำนวนตามสถานะ</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            ยกเลิก
          </button>
          <button onClick={handleExport} disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
            {loading ? "กำลัง Export…" : "Download XLSX"}
          </button>
        </div>
      </div>
    </div>
  )
}
