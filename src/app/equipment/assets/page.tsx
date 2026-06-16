"use client"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Loader2, Search, Database, RefreshCw, X, ExternalLink, ChevronLeft, ChevronRight,
  Phone, FileText, Calendar, User, Check, CheckCircle2, AlertCircle, Edit2,
  Save, Sparkles, Shield, ShieldCheck, ClipboardCheck, TrendingUp, Package,
  StickyNote, Activity, Clock, Hash, Settings2,
} from "lucide-react"
import toast from "react-hot-toast"
import PhotoLightbox from "@/components/PhotoLightbox"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
interface FeishuTable { table_id: string; name: string; count: number }
interface FeishuField { name: string; type: number }
interface FeishuRecord { record_id: string; fields: Record<string, any> }
interface TableData {
  ok?: boolean; table_id: string; count: number; generated_at: string
  fields: FeishuField[]; records: FeishuRecord[]
  source?: "cache" | "feishu"
  diff?: { added: number; updated: number; deleted: number; unchanged: number }
}
interface Annotation {
  table_id: string; feishu_record_id: string
  hr_status: string | null; hr_note: string | null
  last_checked_at: string | null; last_checked_by: string | null
  updated_at: string
}

// ─────────────────────────────────────────────────────
// Feishu Field type label
// ─────────────────────────────────────────────────────
const FIELD_TYPE_LABEL: Record<number, string> = {
  1: "Text", 2: "Number", 3: "Select", 4: "Multi", 5: "Date", 7: "Bool",
  11: "User", 13: "Phone", 15: "URL", 17: "File", 18: "Link",
}

// ─────────────────────────────────────────────────────
// HR Status options
// ─────────────────────────────────────────────────────
const HR_STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: "ตรวจแล้ว",       label: "✓ ตรวจแล้ว",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "รอตรวจ",         label: "⏳ รอตรวจ",       color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "ติดปัญหา",       label: "⚠ ติดปัญหา",     color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "คืนแล้ว",         label: "📦 คืนแล้ว",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "พร้อมใช้",        label: "🟢 พร้อมใช้",     color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "ปลดระวาง",       label: "🚫 ปลดระวาง",    color: "bg-slate-200 text-slate-700 border-slate-300" },
]

const statusMeta = (v: string | null | undefined) => v ? HR_STATUSES.find(s => s.value === v) ?? null : null

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function tidyName(s: string): string { return s.replace(/\s+/g, " ").trim() }

function pickDisplayFields(fields: FeishuField[]): FeishuField[] {
  const HIDDEN_TYPES = new Set([18, 19, 20, 21])
  return fields.filter(f => !HIDDEN_TYPES.has(f.type)).slice(0, 10)
}

function fieldDisplay(value: any, type: number, onOpenPhoto?: (urls: string[], idx: number) => void): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-slate-300">—</span>
  switch (type) {
    case 1:
      if (typeof value === "string") return <span className="text-slate-700">{value}</span>
      if (Array.isArray(value)) return <span className="text-slate-700">{value.map(v => v?.text || "").join("")}</span>
      return <span className="text-slate-700">{String(value)}</span>
    case 2:
      return <span className="font-mono font-bold text-slate-700">{Number(value).toLocaleString()}</span>
    case 3:
      return <span className="inline-flex text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full whitespace-nowrap">{String(value)}</span>
    case 4: {
      const arr = Array.isArray(value) ? value : [value]
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((v, i) => (
            <span key={i} className="inline-flex text-[10px] font-bold px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full">{String(v)}</span>
          ))}
        </div>
      )
    }
    case 5: {
      const n = Number(value); if (!isFinite(n) || n === 0) return <span className="text-slate-300">—</span>
      return <span className="text-[11px] text-slate-600 font-mono whitespace-nowrap">{format(new Date(n), "d MMM yy", { locale: th })}</span>
    }
    case 7: return value ? <Check size={14} className="text-emerald-600"/> : <X size={14} className="text-slate-300"/>
    case 11: {
      if (Array.isArray(value)) return (
        <div className="flex flex-wrap gap-1">
          {value.map((u: any, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">
              <User size={9}/>{u?.name || u?.en_name || "?"}
            </span>
          ))}
        </div>
      )
      return <span className="text-slate-700">{String(value)}</span>
    }
    case 13: {
      const s = typeof value === "object" ? value?.text || value?.link : String(value)
      return <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600"><Phone size={10}/>{s}</span>
    }
    case 15: {
      const link = typeof value === "object" ? value?.link : String(value)
      const text = typeof value === "object" ? value?.text : link
      return <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"><ExternalLink size={10}/>{(text || link || "").slice(0, 25)}</a>
    }
    case 17: {
      if (!Array.isArray(value)) return <span className="text-slate-300">—</span>
      const imageUrls = value.filter((f: any) => /image|jpe?g|png|webp|gif|heic/i.test(f?.type || f?.name || "")).map((f: any) => f.url)
      return (
        <div className="flex items-center gap-1">
          {imageUrls.length > 0 ? (
            imageUrls.slice(0, 3).map((u: string, i: number) => (
              <button key={i} onClick={() => onOpenPhoto?.(imageUrls, i)}
                className="w-8 h-8 rounded overflow-hidden border border-slate-200 hover:border-indigo-400 cursor-zoom-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-cover"/>
              </button>
            ))
          ) : (
            value.slice(0, 2).map((f: any, i: number) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline truncate max-w-[100px]">
                <FileText size={9}/>{f.name?.slice(0, 20) || "file"}
              </a>
            ))
          )}
          {value.length > 3 && <span className="text-[10px] text-slate-400 font-bold">+{value.length - 3}</span>}
        </div>
      )
    }
    case 18: {
      if (Array.isArray(value)) {
        const t = value.map((v: any) => v?.text || (v?.text_arr || []).join(", ") || "").filter(Boolean)
        return t.length > 0 ? <span className="text-[11px] text-slate-600">{t.join(", ")}</span> : <span className="text-slate-300">—</span>
      }
      return <span className="text-slate-700">{String(value)}</span>
    }
    default:
      return <span className="text-[11px] text-slate-500 font-mono">{typeof value === "object" ? JSON.stringify(value).slice(0, 40) : String(value)}</span>
  }
}

// ════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════
export default function AssetsPage() {
  const [tables, setTables]               = useState<FeishuTable[]>([])
  const [loadingList, setLoadingList]     = useState(true)
  const [activeTableId, setActiveTableId] = useState<string>("")
  const [tableData, setTableData]         = useState<TableData | null>(null)
  const [loadingData, setLoadingData]     = useState(false)
  const [refreshing, setRefreshing]       = useState(false)
  const [annotations, setAnnotations]     = useState<Record<string, Annotation>>({})
  const [q, setQ]                         = useState("")
  const [filterStatus, setFilterStatus]   = useState<string>("")
  const [page, setPage]                   = useState(0)
  const PER = 50
  const [lightbox, setLightbox]           = useState<{ urls: string[]; index: number } | null>(null)
  const [editing, setEditing]             = useState<{ record: FeishuRecord; field: FeishuField[] } | null>(null)

  // ── load list ──
  const loadTables = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch("/api/asset")
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โหลดไม่สำเร็จ"); return }
      const list: FeishuTable[] = d.tables ?? []
      setTables(list)
      if (list.length > 0 && !activeTableId) {
        const first = list.find(t => t.count > 0) || list[0]
        setActiveTableId(first.table_id)
      }
    } finally { setLoadingList(false) }
  }, []) // eslint-disable-line
  useEffect(() => { loadTables() }, [loadTables])

  // ── load from cache (เร็ว) ──
  const loadTable = useCallback(async () => {
    if (!activeTableId) return
    setLoadingData(true)
    try {
      const [recRes, annoRes] = await Promise.all([
        fetch(`/api/asset?table=${encodeURIComponent(activeTableId)}`),
        fetch(`/api/asset-annotations?table_id=${encodeURIComponent(activeTableId)}`),
      ])
      const recD = await recRes.json()
      const annoD = await annoRes.json().catch(() => ({ annotations: {} }))
      if (!recRes.ok) { toast.error(recD.error || "โหลดไม่สำเร็จ"); return }
      setTableData(recD)
      setAnnotations(annoD.annotations ?? {})
      setPage(0)
    } finally { setLoadingData(false) }
  }, [activeTableId])

  // ── force sync (incremental diff) ──
  const syncTable = useCallback(async () => {
    if (!activeTableId) return
    setRefreshing(true)
    const t = toast.loading("กำลังเทียบข้อมูลจาก Feishu...")
    try {
      const res = await fetch(`/api/asset?table=${encodeURIComponent(activeTableId)}`, { method: "POST" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "Sync ล้มเหลว", { id: t }); return }
      setTableData(d)
      setPage(0)
      const diff = d.diff || {}
      const msg = diff.added + diff.updated + diff.deleted === 0
        ? "ข้อมูลเป็นปัจจุบันแล้ว"
        : `🔁 +${diff.added} เพิ่ม · ✏ ${diff.updated} แก้ · 🗑 ${diff.deleted} ลบ`
      toast.success(msg, { id: t, duration: 4000 })
    } finally { setRefreshing(false) }
  }, [activeTableId])
  useEffect(() => { if (activeTableId) { setTableData(null); loadTable() } }, [activeTableId, loadTable])

  // ── derived ──
  const displayFields = useMemo(() => tableData ? pickDisplayFields(tableData.fields) : [], [tableData])

  const filteredRecords = useMemo(() => {
    if (!tableData) return []
    let list = tableData.records
    if (filterStatus) {
      list = list.filter(r => {
        const a = annotations[r.record_id]
        return filterStatus === "_no_status"
          ? !a?.hr_status
          : a?.hr_status === filterStatus
      })
    }
    if (q.trim()) {
      const k = q.toLowerCase()
      list = list.filter(r =>
        Object.values(r.fields).some(v => {
          if (v == null) return false
          const s = typeof v === "object" ? JSON.stringify(v) : String(v)
          return s.toLowerCase().includes(k)
        }) || (annotations[r.record_id]?.hr_note || "").toLowerCase().includes(k)
      )
    }
    return list
  }, [tableData, q, filterStatus, annotations])

  const paged = useMemo(() => filteredRecords.slice(page * PER, (page + 1) * PER), [filteredRecords, page])
  const activeTable = tables.find(t => t.table_id === activeTableId)

  // ── stats ──
  const stats = useMemo(() => {
    const total = tableData?.count ?? 0
    const annoVals = Object.values(annotations)
    const checked   = annoVals.filter(a => a.hr_status === "ตรวจแล้ว").length
    const waiting   = annoVals.filter(a => a.hr_status === "รอตรวจ").length
    const problem   = annoVals.filter(a => a.hr_status === "ติดปัญหา").length
    const withNote  = annoVals.filter(a => a.hr_note).length
    return { total, checked, waiting, problem, withNote, noStatus: total - annoVals.length }
  }, [tableData, annotations])

  return (
    <div className="space-y-4">

      {/* ═══ Hero header — gradient strip dashboard-style ═══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 shadow-md">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none"/>
        <div className="relative p-5 flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Database size={22} className="text-white"/>
            </div>
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Asset Inventory · Feishu Bitable</p>
              <h1 className="text-2xl font-black text-white">ทรัพย์สิน · Assets</h1>
              <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                📦 {tables.length} ตาราง · cache จาก Supabase (sync ฉลาด — เปลี่ยนเฉพาะที่อัพเดต)
                {tableData?.source === "cache" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">⚡ จาก cache</span>
                )}
                {tableData?.source === "feishu" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-400/30 text-white px-1.5 py-0.5 rounded-full">🔄 ดึงสด</span>
                )}
                {tableData && (
                  <span className="ml-1">· {new Date(tableData.generated_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={syncTable} disabled={!activeTableId || refreshing}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-teal-700 hover:bg-teal-50 disabled:opacity-50 text-sm font-black rounded-xl shadow-sm">
            {refreshing ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
            Sync เดี๋ยวนี้
          </button>
        </div>
      </div>

      {/* ═══ Tabs — 5 ตาราง ═══ */}
      {loadingList ? (
        <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl p-2 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tables.map(t => {
              const active = t.table_id === activeTableId
              const disabled = t.count === 0
              return (
                <button key={t.table_id} onClick={() => !disabled && setActiveTableId(t.table_id)}
                  disabled={disabled}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow"
                      : disabled
                        ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}>
                  <Database size={11}/>
                  <span className="max-w-[260px] truncate">{tidyName(t.name)}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/25 text-white" : disabled ? "bg-slate-200 text-slate-400" : "bg-cyan-50 text-cyan-700"
                  }`}>{t.count.toLocaleString()}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Stats strip ═══ */}
      {tableData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <StatTile icon={Package}      label="ทั้งหมด"     value={stats.total}     tone="slate"/>
          <StatTile icon={ShieldCheck}  label="ตรวจแล้ว"    value={stats.checked}   tone="emerald"/>
          <StatTile icon={Clock}        label="รอตรวจ"     value={stats.waiting}   tone="amber"/>
          <StatTile icon={AlertCircle}  label="ติดปัญหา"    value={stats.problem}   tone="rose"/>
          <StatTile icon={StickyNote}   label="มีหมายเหตุ"  value={stats.withNote}  tone="indigo"/>
        </div>
      )}

      {/* ═══ Filter row ═══ */}
      {tableData && (
        <div className="bg-white border border-slate-100 rounded-2xl p-2.5 flex items-center gap-2 flex-wrap shadow-sm">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }}
              placeholder="ค้นหา SN, ผู้ใช้, location, หมายเหตุ HR ..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400"/>
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                <X size={11}/>
              </button>
            )}
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-cyan-400">
            <option value="">สถานะ HR: ทั้งหมด</option>
            <option value="_no_status">— ยังไม่ตั้ง —</option>
            {HR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* ═══ DATA TABLE — full width ═══ */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loadingData ? (
          <div className="py-16 flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-slate-300"/>
            <p className="text-xs text-slate-400">กำลังดึงจาก Feishu Bitable...</p>
          </div>
        ) : !tableData ? (
          <div className="py-12 text-center">
            <Database size={28} className="mx-auto text-slate-200 mb-2"/>
            <p className="text-sm text-slate-400">เลือกตารางด้านบนเพื่อแสดงข้อมูล</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <Search size={28} className="mx-auto text-slate-200 mb-2"/>
            <p className="text-sm text-slate-400">ไม่พบรายการ{q ? ` สำหรับ "${q}"` : ""}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-b from-slate-50 to-white border-b-2 border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2.5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider w-12">#</th>
                    {/* HR-managed columns — left-stick */}
                    <th className="px-3 py-3 text-left text-[10px] font-black text-emerald-700 uppercase tracking-wider min-w-[140px] bg-emerald-50/50">
                      <span className="inline-flex items-center gap-1"><Activity size={10}/> สถานะ HR</span>
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-black text-emerald-700 uppercase tracking-wider min-w-[180px] bg-emerald-50/50">
                      <span className="inline-flex items-center gap-1"><StickyNote size={10}/> หมายเหตุ HR</span>
                    </th>
                    {/* Feishu fields */}
                    {displayFields.map(f => (
                      <th key={f.name} className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[130px]">
                        <div className="flex items-center gap-1">
                          {f.name}
                          <span className="text-[8px] font-normal bg-slate-100 text-slate-400 px-1 rounded">
                            {FIELD_TYPE_LABEL[f.type] || `T${f.type}`}
                          </span>
                        </div>
                      </th>
                    ))}
                    {/* action */}
                    <th className="px-2.5 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider w-16">แก้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((r, i) => {
                    const anno = annotations[r.record_id]
                    const meta = statusMeta(anno?.hr_status)
                    return (
                      <tr key={r.record_id}
                        onClick={() => setEditing({ record: r, field: tableData.fields })}
                        className="hover:bg-cyan-50/40 transition-colors cursor-pointer">
                        <td className="px-2.5 py-2.5 text-[10px] text-slate-400 font-mono">{page * PER + i + 1}</td>
                        {/* HR status */}
                        <td className="px-3 py-2.5 align-top">
                          {meta
                            ? <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                            : <span className="text-[10px] text-slate-300 italic">— ยังไม่ตั้ง —</span>}
                        </td>
                        {/* HR note */}
                        <td className="px-3 py-2.5 align-top">
                          {anno?.hr_note ? (
                            <p className="text-[11px] text-slate-700 line-clamp-2">{anno.hr_note}</p>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">—</span>
                          )}
                          {anno?.last_checked_at && (
                            <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                              <Clock size={8}/>
                              {format(new Date(anno.last_checked_at), "d MMM yy", { locale: th })}
                              {anno.last_checked_by && ` · ${anno.last_checked_by}`}
                            </p>
                          )}
                        </td>
                        {/* Feishu fields */}
                        {displayFields.map(f => (
                          <td key={f.name} className="px-3 py-2.5 align-top">
                            {fieldDisplay(r.fields[f.name], f.type, (urls, idx) => setLightbox({ urls, index: idx }))}
                          </td>
                        ))}
                        <td className="px-2.5 py-2.5 text-right">
                          <Edit2 size={11} className="text-slate-300 inline-block"/>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredRecords.length > PER && (
              <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs">
                <p className="text-slate-500">
                  <b className="text-slate-700">{page * PER + 1}–{Math.min((page + 1) * PER, filteredRecords.length)}</b>
                  {" "}จาก{" "}<b className="text-slate-700">{filteredRecords.length.toLocaleString()}</b>
                </p>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold disabled:opacity-30 flex items-center gap-1 hover:bg-slate-50">
                    <ChevronLeft size={11}/> ก่อนหน้า
                  </button>
                  <button disabled={(page + 1) * PER >= filteredRecords.length} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold disabled:opacity-30 flex items-center gap-1 hover:bg-slate-50">
                    ถัดไป <ChevronRight size={11}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-[11px] text-blue-700 flex items-start gap-2">
        <AlertCircle size={13} className="shrink-0 mt-0.5"/>
        <div>
          <p className="font-bold">วิธีใช้:</p>
          <ul className="list-disc list-inside ml-1 space-y-0.5">
            <li>คอลัมน์เขียว <b>"สถานะ HR"</b> + <b>"หมายเหตุ HR"</b> เก็บใน GoodHR — แก้ได้ภายใน · คอลัมน์อื่นอ่านจาก Feishu</li>
            <li>คลิกที่แถวเพื่อ <b>เปิด drawer</b> แก้ไข note/สถานะ</li>
            <li>กรอง "สถานะ HR" หรือค้นในหมายเหตุ HR ได้ตรงๆ</li>
          </ul>
        </div>
      </div>

      {/* Photo lightbox */}
      {lightbox && (
        <PhotoLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)}/>
      )}

      {/* Edit drawer */}
      {editing && tableData && (
        <EditDrawer
          record={editing.record}
          fields={tableData.fields}
          tableId={tableData.table_id}
          tableName={activeTable ? tidyName(activeTable.name) : ""}
          annotation={annotations[editing.record.record_id] ?? null}
          onClose={() => setEditing(null)}
          onSaved={(anno) => {
            setAnnotations(prev => ({ ...prev, [anno.feishu_record_id]: anno }))
            setEditing(null)
          }}
          onOpenPhoto={(urls, idx) => setLightbox({ urls, index: idx })}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Edit Drawer — show full record + HR annotation editor
// ════════════════════════════════════════════════════════════════════
function EditDrawer({ record, fields, tableId, tableName, annotation, onClose, onSaved, onOpenPhoto }: {
  record: FeishuRecord
  fields: FeishuField[]
  tableId: string
  tableName: string
  annotation: Annotation | null
  onClose: () => void
  onSaved: (a: Annotation) => void
  onOpenPhoto: (urls: string[], idx: number) => void
}) {
  const [status, setStatus] = useState<string>(annotation?.hr_status || "")
  const [note, setNote]     = useState<string>(annotation?.hr_note || "")
  const [checkedBy, setCheckedBy] = useState<string>(annotation?.last_checked_by || "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/asset-annotations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          feishu_record_id: record.record_id,
          hr_status: status || null,
          hr_note: note || null,
          last_checked_by: checkedBy || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      toast.success("บันทึกหมายเหตุแล้ว")
      onSaved(d.annotation)
    } finally { setSaving(false) }
  }

  const clear = async () => {
    if (!annotation) { onClose(); return }
    if (!confirm("ลบสถานะ + หมายเหตุของแถวนี้?")) return
    const res = await fetch(`/api/asset-annotations?table_id=${tableId}&feishu_record_id=${record.record_id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("ลบหมายเหตุแล้ว")
      onSaved({ ...annotation, hr_status: null, hr_note: null, last_checked_at: null, last_checked_by: null } as Annotation)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-cyan-500 to-teal-600 px-5 py-3.5 flex items-center gap-3">
          <Database size={20} className="text-white"/>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{tableName}</p>
            <p className="text-white font-black text-base font-mono truncate">{record.record_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
            <X size={16}/>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">

          {/* ── HR Annotation editor (THE editable section) ── */}
          <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-start gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <Edit2 size={14} className="text-white"/>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-emerald-800 text-sm flex items-center gap-2">
                  ข้อมูลภายใน GoodHR · HR Note
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">✏ แก้ได้</span>
                </h3>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">เก็บใน GoodHR เท่านั้น — ไม่ขึ้น Feishu · ใช้ฟิลเตอร์/ค้นหาในตารางหลักได้</p>
              </div>
              {annotation?.updated_at && (
                <span className="text-[9px] font-bold bg-white text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">
                  อัพเดต {format(new Date(annotation.updated_at), "d MMM yy HH:mm", { locale: th })}
                </span>
              )}
            </div>

            {/* status pills */}
            <div>
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">สถานะ HR</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {HR_STATUSES.map(s => {
                  const active = status === s.value
                  return (
                    <button key={s.value} onClick={() => setStatus(active ? "" : s.value)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        active ? s.color + " ring-2 ring-emerald-300 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">หมายเหตุ HR</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="เช่น ส่งซ่อมที่ ABC ราคา 2,000 / รอผู้ใช้คืน / เปลี่ยน SIM card..."
                rows={3}
                className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none"/>
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">ตรวจโดย</label>
              <input value={checkedBy} onChange={e => setCheckedBy(e.target.value)}
                placeholder="ชื่อ HR ที่ตรวจ"
                className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400"/>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-sm">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                บันทึก
              </button>
              {annotation && (
                <button onClick={clear} className="px-3 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold">
                  ลบ
                </button>
              )}
            </div>
          </div>

          {/* ── Feishu full record (LOCKED read-only) ── */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
            {/* คำเตือน "อ่านอย่างเดียว" — ชัดเจน */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-base">🔒</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    ข้อมูลจาก Feishu Bitable
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">LOCKED</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    ⚠️ API ของ Feishu Asset เป็น <b>read-only</b> — ไม่สามารถแก้จาก GoodHR ได้
                    <br/>ต้องการแก้ค่าเหล่านี้ → ไปแก้ที่ <b>ฟอร์ม Feishu Base</b> โดยตรง (sync กลับมาทุก 5 นาที / กดปุ่ม Sync)
                  </p>
                </div>
                <button onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(record.record_id)
                      toast.success("คัดลอก Record ID แล้ว — paste ใน Feishu Base ค้นหา record นี้ได้")
                    } catch { toast.error("คัดลอกไม่ได้") }
                  }}
                  title="คัดลอก Record ID"
                  className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1 text-slate-600">
                  📋 Record ID
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(f => {
                const v = record.fields[f.name]
                if (v == null) return null
                return (
                  <div key={f.name} className="bg-slate-50 rounded-xl px-3 py-2 opacity-90">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      {f.name}
                      <span className="font-normal text-[8px] bg-white text-slate-400 px-1 rounded">
                        {FIELD_TYPE_LABEL[f.type] || `T${f.type}`}
                      </span>
                    </p>
                    <div className="mt-0.5">{fieldDisplay(v, f.type, onOpenPhoto)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Tiny stat tile
// ════════════════════════════════════════════════════════════════════
function StatTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "slate" | "emerald" | "amber" | "rose" | "indigo" }) {
  const t = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   icon: "bg-slate-400" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-500" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   icon: "bg-amber-500" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    icon: "bg-rose-500" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  icon: "bg-indigo-500" },
  }[tone]
  return (
    <div className={`${t.bg} border border-slate-100 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl ${t.icon} flex items-center justify-center`}>
        <Icon size={15} className="text-white"/>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className={`text-xl font-black ${t.text} leading-tight`}>{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
