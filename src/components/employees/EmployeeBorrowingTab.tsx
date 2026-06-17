"use client"
/**
 * EmployeeBorrowingTab — รวม 2 แหล่งข้อมูลในแท็บเดียว:
 *   1. Sample Request (จากฟอร์ม Feishu sample_requests) — match ด้วยชื่อ
 *   2. Feishu Assets (asset_main / live / tel_user / tel) — match ด้วย email / Feishu user id / ชื่อ
 *
 * แสดง 5 category tiles + section switcher
 */

import { useEffect, useState, useCallback } from "react"
import {
  Package, Loader2, Calendar, Truck, AlertCircle, Check, ExternalLink,
  RefreshCw, FileText, AlertTriangle, ChevronDown, ChevronRight,
  Monitor, Phone, Database, Shield, MapPin, Building2, Image as ImageIcon,
  ClipboardList, Sparkles,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import PhotoLightbox from "@/components/PhotoLightbox"
import FeishuImage, { getFeishuProxyUrl, isFeishuUrl } from "@/components/FeishuImage"

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
interface SampleRequest {
  feishu_record_id: string
  request_no: string | null
  status: string | null
  brand: string | null
  sku: string | null
  quantity: string | null
  application_date: string | null
  estimated_return: string | null
  situation: string | null
  return_done: boolean | null
  return_date: string | null
  return_note: string | null
}

interface FeishuAssetData {
  summary: { asset_main: number; live: number; tel_user: number; tel: number }
  results: Record<string, any[]>
  match_roles: Record<string, Record<string, string>>
  identifiers_used: { emails: string[]; feishuIds: string[]; names: string[] }
  total: number
}

interface Props {
  employeeId: string
  employeeName: string
  employeeNickname?: string
  employeeFirstNameEn?: string
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—"
  try { return format(new Date(d), "d MMM yy", { locale: th }) } catch { return d }
}
function statusColor(s: string | null): string {
  if (!s) return "bg-slate-100 text-slate-600"
  const v = s.toLowerCase()
  if (v.includes("approved")) return "bg-emerald-100 text-emerald-700"
  if (v.includes("rejected")) return "bg-rose-100 text-rose-700"
  if (v.includes("progress") || v.includes("pending")) return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-600"
}
function readText(v: any): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v.map(x => x?.text || "").join("")
  return String(v)
}
function readNumber(v: any): number | null { const n = Number(v); return isFinite(n) ? n : null }
function readDate(v: any): string | null {
  const n = Number(v); if (!isFinite(n) || n === 0) return null
  try { return format(new Date(n), "d MMM yy", { locale: th }) } catch { return null }
}
function readImages(v: any): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((f: any) => /image|jpe?g|png|webp|gif|heic/i.test(f?.type || f?.name || "")).map((f: any) => f.url)
}

// ─────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────
type Category = "sample" | "asset_main" | "live" | "tel_user" | "tel"

const CATEGORIES: Record<Category, {
  label: string; icon: any
  color: string; bg: string; iconBg: string; ring: string
}> = {
  sample: {
    label: "Sample Request",
    icon: ClipboardList,
    color: "text-blue-700", bg: "bg-blue-50", iconBg: "bg-blue-500", ring: "border-blue-200",
  },
  asset_main: {
    label: "ทรัพย์สิน",
    icon: Package,
    color: "text-cyan-700", bg: "bg-cyan-50", iconBg: "bg-cyan-500", ring: "border-cyan-200",
  },
  live: {
    label: "Live Room",
    icon: Monitor,
    color: "text-violet-700", bg: "bg-violet-50", iconBg: "bg-violet-500", ring: "border-violet-200",
  },
  tel_user: {
    label: "เบอร์ที่ดูแล",
    icon: Phone,
    color: "text-indigo-700", bg: "bg-indigo-50", iconBg: "bg-indigo-500", ring: "border-indigo-200",
  },
  tel: {
    label: "บิลค่าโทร",
    icon: FileText,
    color: "text-emerald-700", bg: "bg-emerald-50", iconBg: "bg-emerald-500", ring: "border-emerald-200",
  },
}

// ════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════
export default function EmployeeBorrowingTab({ employeeId, employeeName, employeeNickname, employeeFirstNameEn }: Props) {
  const [samples, setSamples]           = useState<SampleRequest[]>([])
  const [feishuAssets, setFeishuAssets] = useState<FeishuAssetData | null>(null)
  const [loadingS, setLoadingS]         = useState(true)
  const [loadingF, setLoadingF]         = useState(true)
  const [searchName, setSearchName]     = useState(employeeName)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [lightbox, setLightbox]         = useState<{ urls: string[]; index: number } | null>(null)

  // ── load Sample Requests (match by name) ──
  const loadSamples = useCallback(async () => {
    if (!searchName.trim()) { setSamples([]); setLoadingS(false); return }
    setLoadingS(true)
    const res = await fetch(`/api/sample-requests?requester=${encodeURIComponent(searchName)}&limit=500`)
    const d = await res.json()
    if (res.ok) setSamples(d.requests ?? []); else setSamples([])
    setLoadingS(false)
  }, [searchName])
  useEffect(() => { loadSamples() }, [loadSamples])

  // ── load Feishu Assets (match by email/id/name) ──
  const loadFeishu = useCallback(async () => {
    setLoadingF(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/feishu-assets`)
      const d = await res.json()
      if (res.ok) setFeishuAssets(d)
    } finally { setLoadingF(false) }
  }, [employeeId])
  useEffect(() => { loadFeishu() }, [loadFeishu])

  // ── counts ──
  const counts = {
    sample:     samples.length,
    asset_main: feishuAssets?.summary.asset_main ?? 0,
    live:       feishuAssets?.summary.live ?? 0,
    tel_user:   feishuAssets?.summary.tel_user ?? 0,
    tel:        feishuAssets?.summary.tel ?? 0,
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  // Sample Request specific: ของที่ยังต้องคืน + overdue
  const sampleUnreturned = samples.filter(r => {
    const needReturn = (r.situation || "").includes("Need to return") || (r.situation || "").includes("需要退回")
    return needReturn && !r.return_done
  })
  const sampleOverdue = sampleUnreturned.filter(r =>
    r.estimated_return && new Date(r.estimated_return) < new Date()
  )

  // auto-pick first category ที่มีของ
  useEffect(() => {
    if (activeCategory) return
    if (!loadingS && !loadingF) {
      const first = (Object.keys(counts) as Category[]).find(k => counts[k] > 0)
      if (first) setActiveCategory(first)
    }
  }, [loadingS, loadingF, counts, activeCategory])

  // candidate names for sample search (if Feishu name ≠ GoodHR name)
  const candidates = Array.from(new Set([
    employeeName,
    employeeNickname || "",
    employeeFirstNameEn || "",
  ].filter(Boolean)))

  const isLoading = loadingS || loadingF

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Package size={18} className="text-white"/>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm">ของที่ยืม / ครอบครอง</h3>
            <p className="text-[11px] text-slate-400">
              จากฟอร์ม Sample Request + ตาราง Feishu Assets · {total} รายการรวม
            </p>
          </div>
        </div>
        <button onClick={() => { loadSamples(); loadFeishu() }} disabled={isLoading}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          title="Refresh">
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""}/>
        </button>
      </div>

      {/* ── Alert banner: overdue items ── */}
      {sampleOverdue.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-white"/>
          </div>
          <div className="flex-1">
            <p className="font-black text-rose-900 text-sm">⚠ มี {sampleOverdue.length} รายการ Sample Request เกินกำหนดคืน</p>
            <p className="text-[11px] text-rose-700/80">ต้องตามคืนก่อนพนักงานลาออก/เปลี่ยนตำแหน่ง</p>
          </div>
        </div>
      )}

      {/* ── 5 Category tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {(Object.keys(CATEGORIES) as Category[]).map(cat => {
          const cfg = CATEGORIES[cat]
          const n = counts[cat]
          const active = activeCategory === cat
          const Icon = cfg.icon
          return (
            <button key={cat} onClick={() => n > 0 && setActiveCategory(cat)}
              disabled={n === 0}
              className={`text-left p-3 rounded-2xl border-2 transition-all ${
                active
                  ? `${cfg.bg} ${cfg.ring} shadow-sm scale-[1.02]`
                  : n === 0
                    ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${n > 0 ? cfg.iconBg : "bg-slate-200"} flex items-center justify-center`}>
                  <Icon size={13} className="text-white"/>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{cfg.label}</p>
              </div>
              <p className={`text-2xl font-black ${n > 0 ? cfg.color : "text-slate-300"} leading-tight`}>{n}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{n > 0 ? "รายการ" : "ไม่มี"}</p>
            </button>
          )
        })}
      </div>

      {/* ── Body: render based on active category ── */}
      {isLoading && !activeCategory ? (
        <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300"/></div>
      ) : total === 0 ? (
        <EmptyState
          feishuAssets={feishuAssets}
          candidates={candidates}
          searchName={searchName}
          setSearchName={setSearchName}/>
      ) : (
        <>
          {activeCategory === "sample" && (
            <SampleSection
              samples={samples}
              candidates={candidates}
              searchName={searchName}
              setSearchName={setSearchName}
              unreturned={sampleUnreturned}/>
          )}
          {(activeCategory === "asset_main" || activeCategory === "live" ||
            activeCategory === "tel_user" || activeCategory === "tel") && feishuAssets && (
            <FeishuAssetSection
              category={activeCategory}
              results={feishuAssets.results[activeCategory] || []}
              matchRoles={feishuAssets.match_roles[activeCategory] || {}}
              onOpenPhoto={(urls, idx) => setLightbox({ urls, index: idx })}/>
          )}
        </>
      )}

      {/* ── Identifier debug ── */}
      {feishuAssets && (
        <details className="text-[10px] text-slate-400">
          <summary className="cursor-pointer font-bold flex items-center gap-1">
            <Database size={10}/> ระบบจับคู่ Feishu Assets ด้วย identifier {
              (feishuAssets.identifiers_used.emails?.length || 0) +
              (feishuAssets.identifiers_used.feishuIds?.length || 0) +
              (feishuAssets.identifiers_used.names?.length || 0)
            } ตัว
          </summary>
          <div className="mt-1.5 bg-slate-50 rounded-lg p-2 space-y-0.5">
            {feishuAssets.identifiers_used.emails?.map((e: string) => <p key={e}>📧 {e}</p>)}
            {feishuAssets.identifiers_used.feishuIds?.map((id: string) => <p key={id}>🆔 {id}</p>)}
            {feishuAssets.identifiers_used.names?.map((n: string) => <p key={n}>👤 {n}</p>)}
          </div>
        </details>
      )}

      {lightbox && (
        <PhotoLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)}/>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Empty state
// ════════════════════════════════════════════════════════════════════
function EmptyState({ feishuAssets, candidates, searchName, setSearchName }: {
  feishuAssets: FeishuAssetData | null
  candidates: string[]
  searchName: string
  setSearchName: (s: string) => void
}) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-10 text-center">
      <Package size={28} className="mx-auto text-slate-200 mb-2"/>
      <p className="text-sm text-slate-500 font-bold">ไม่พบของที่ยืม</p>
      <p className="text-[11px] text-slate-400 mt-1">
        ระบบจับคู่ Sample Request ด้วย <b>ชื่อ</b> และ Feishu Assets ด้วย <b>email / Feishu ID / ชื่อ</b>
      </p>
      {/* Try other names */}
      {candidates.length > 1 && (
        <div className="mt-3">
          <p className="text-[10px] text-slate-400 mb-1">ลองค้น Sample Request ด้วยชื่ออื่น:</p>
          <div className="flex items-center gap-1.5 justify-center">
            {candidates.map(n => (
              <button key={n} onClick={() => setSearchName(n)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                  searchName === n ? "bg-cyan-500 text-white" : "bg-white text-slate-600 border border-slate-200"
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-300 mt-3">
        เชื่อมพนักงานกับ Feishu user ก่อน → คลิกแท็บ "🔗 Feishu Link"
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Sample Request section
// ════════════════════════════════════════════════════════════════════
function SampleSection({ samples, candidates, searchName, setSearchName, unreturned }: {
  samples: SampleRequest[]
  candidates: string[]
  searchName: string
  setSearchName: (s: string) => void
  unreturned: SampleRequest[]
}) {
  const returned = samples.filter(r => r.return_done)
  const noReturnNeeded = samples.filter(r => {
    const needReturn = (r.situation || "").includes("Need to return") || (r.situation || "").includes("需要退回")
    return !needReturn
  })

  return (
    <div className="space-y-3">
      {/* Search name picker */}
      {candidates.length > 1 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center gap-1.5 flex-wrap">
          <p className="text-[10px] font-bold text-slate-500 px-1">ค้นด้วยชื่อ:</p>
          {candidates.map(n => (
            <button key={n} onClick={() => setSearchName(n)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                searchName === n ? "bg-cyan-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Unreturned highlight */}
      {unreturned.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <AlertCircle size={15} className="text-white"/>
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-900 text-sm">⚠ ต้องคืน {unreturned.length} รายการ</p>
              <p className="text-[11px] text-amber-700">ต้องตามคืนก่อนพนักงานลาออก</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {unreturned.map(r => <SampleCard key={r.feishu_record_id} r={r} highlightOverdue/>)}
          </div>
        </div>
      )}

      {/* Returned */}
      {returned.length > 0 && (
        <details className="bg-white border border-emerald-200 rounded-2xl overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 hover:bg-emerald-50">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Check size={14} className="text-white"/>
            </div>
            <p className="font-bold text-emerald-800 text-sm flex-1">✓ คืนแล้ว · {returned.length} รายการ</p>
            <ChevronDown size={14} className="text-slate-400"/>
          </summary>
          <div className="px-3 pb-3 space-y-1.5 bg-emerald-50/30 border-t border-emerald-100">
            {returned.map(r => <SampleCard key={r.feishu_record_id} r={r}/>)}
          </div>
        </details>
      )}

      {/* No return needed */}
      {noReturnNeeded.length > 0 && (
        <details className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 hover:bg-slate-50">
            <div className="w-7 h-7 rounded-lg bg-slate-400 flex items-center justify-center">
              <Package size={14} className="text-white"/>
            </div>
            <p className="font-bold text-slate-700 text-sm flex-1">ไม่ต้องคืน · {noReturnNeeded.length} รายการ</p>
            <ChevronDown size={14} className="text-slate-400"/>
          </summary>
          <div className="px-3 pb-3 space-y-1.5 bg-slate-50/40 border-t border-slate-100">
            {noReturnNeeded.map(r => <SampleCard key={r.feishu_record_id} r={r}/>)}
          </div>
        </details>
      )}

      <div className="text-[10px] text-slate-400 text-center">
        🔗 จัดการ Sample Request ได้ที่{" "}
        <Link href="/equipment/sample-requests" className="font-bold text-cyan-600 hover:underline">
          อุปกรณ์ &gt; Sample Request
        </Link>
      </div>
    </div>
  )
}

function SampleCard({ r, highlightOverdue }: { r: SampleRequest; highlightOverdue?: boolean }) {
  const overdue = highlightOverdue && r.estimated_return && new Date(r.estimated_return) < new Date()
  return (
    <Link href="/equipment/sample-requests"
      className="block bg-white border border-slate-100 rounded-xl p-2.5 hover:border-cyan-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          {r.return_done ? <Check size={14} className="text-emerald-600"/> : <Package size={14} className="text-slate-500"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[11px] font-mono font-bold text-slate-700">{r.request_no || "—"}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status || "—"}</span>
            {r.brand && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">{r.brand}</span>}
            {overdue && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white">⚠ เกิน</span>}
          </div>
          <p className="text-xs text-slate-700 mt-0.5 line-clamp-2" title={r.sku || ""}>
            {r.sku || "—"} {r.quantity && <span className="text-slate-400">· {r.quantity} ชิ้น</span>}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 flex-wrap">
            {r.application_date && <span className="flex items-center gap-0.5"><Calendar size={9}/>ขอ {fmtDate(r.application_date)}</span>}
            {r.estimated_return && <span className="flex items-center gap-0.5"><Truck size={9}/>ครบ {fmtDate(r.estimated_return)}</span>}
            {r.return_done && r.return_date && <span className="flex items-center gap-0.5 text-emerald-600 font-bold"><Check size={9}/>คืน {fmtDate(r.return_date)}</span>}
          </div>
        </div>
        <ExternalLink size={11} className="text-slate-300 mt-1 shrink-0"/>
      </div>
    </Link>
  )
}

// ════════════════════════════════════════════════════════════════════
// Feishu Asset section (asset_main / live / tel_user / tel)
// ════════════════════════════════════════════════════════════════════
function FeishuAssetSection({ category, results, matchRoles, onOpenPhoto }: {
  category: Category
  results: any[]
  matchRoles: Record<string, string>
  onOpenPhoto: (urls: string[], idx: number) => void
}) {
  const cfg = CATEGORIES[category]
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <div className={`${cfg.bg} border-b border-slate-100 px-4 py-2.5 flex items-center gap-2`}>
        <div className={`w-7 h-7 rounded-lg ${cfg.iconBg} flex items-center justify-center`}>
          <cfg.icon size={13} className="text-white"/>
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800">{cfg.label}</p>
          <p className="text-[10px] text-slate-500">{results.length} รายการ</p>
        </div>
        <Link href="/equipment/assets"
          className="text-[10px] font-bold text-slate-500 hover:text-cyan-600 flex items-center gap-1">
          <ExternalLink size={10}/> หน้า Assets
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {results.map((r: any) => (
          <AssetRow key={r.feishu_record_id}
            category={category}
            record={r}
            matchRole={matchRoles[r.feishu_record_id]}
            onOpenPhoto={onOpenPhoto}/>
        ))}
      </div>
    </div>
  )
}

function AssetRow({ category, record, matchRole, onOpenPhoto }: {
  category: Category
  record: any
  matchRole?: string
  onOpenPhoto: (urls: string[], idx: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const f = record.fields || {}
  const edit = record.edit || {}

  let title = "—"
  let subtitle: React.ReactNode = null
  let imgUrls: string[] = []
  const metaChips: React.ReactNode[] = []
  let stateChip: React.ReactNode = null

  if (category === "asset_main" || category === "live") {
    title = readText(f["คำอธิบายสินทรัพย์物品描述 副本"]) || readText(f["รุ่น/ยี่ห้อ 型号/品牌"]) || "—"
    const sn = readText(f["S/N"])
    const loc = readText(f["location 地点"])
    const value = readNumber(f["มูลค่าสินทรัพย์资产价值"])
    const damage = readText(f["ความเสียหาย损坏程度"]) || edit.damage_level
    const maint = readText(f["สถานะ维修状态"]) || edit.maint_status
    const checkedAt = readDate(f["ตรวจสอบวันที่检查日期"])
    imgUrls = readImages(f["แนบรูปถ่าย sn/资产产品图片"])
    subtitle = sn && <span className="font-mono text-[10px] text-slate-500">{sn}</span>
    if (loc)    metaChips.push(<Chip key="loc" icon={MapPin} color="slate" text={loc}/>)
    if (value)  metaChips.push(<Chip key="val" color="amber" text={`฿${value.toLocaleString()}`}/>)
    if (damage) metaChips.push(<Chip key="dmg" color={damage.includes("ปกติ") || damage.includes("完好") ? "emerald" : "rose"} text={damage}/>)
    if (maint)  stateChip = <Chip color="blue" text={maint}/>
    if (checkedAt) metaChips.push(<Chip key="dt" icon={Calendar} color="slate" text={`ตรวจ ${checkedAt}`}/>)
  } else if (category === "tel_user") {
    title = readText(f["รหัสลูกค้า代号"]) || "—"
    const phone = readText(f["เบอร์โทร电话☎️"])
    const network = readText(f["เครือข่าย运营商"])
    const dept = readText(f["แผนก部门"])
    subtitle = phone ? <span className="font-mono text-[10px] text-slate-500">📞 {phone}</span> : null
    if (network) metaChips.push(<Chip key="net" color="violet" text={network}/>)
    if (dept) metaChips.push(<Chip key="dept" icon={Building2} color="slate" text={dept}/>)
  } else if (category === "tel") {
    const billNo = readText(f["รหัสลูกค้า代号"]) || readText(f["รายการหลัก"])
    title = `บิล ${billNo}`
    const phone = readText(f["เบอร์โทร电话☎️"])
    const year = readText(f["年份"])
    const month = readText(f["月份"])
    const network = readText(f["เครือข่าย运营商"])
    const total = readNumber(f["ยอดที่ต้องจ่าย 实缴付"]) ?? readNumber(f["ยอดเต็ม价格"])
    subtitle = phone ? <span className="font-mono text-[10px] text-slate-500">📞 {phone}</span> : null
    if (year && month) metaChips.push(<Chip key="ym" icon={Calendar} color="slate" text={`${month}/${year}`}/>)
    if (network) metaChips.push(<Chip key="net" color="violet" text={network}/>)
    if (total)  metaChips.push(<Chip key="amt" color="amber" text={`฿${total.toLocaleString()}`}/>)
    if (record.chk) stateChip = <Chip icon={Check} color="emerald" text="ตรวจแล้ว"/>
  }

  let roleChip: React.ReactNode = null
  if (matchRole?.includes("หัวหน้า") || matchRole?.includes("负责人")) {
    roleChip = <Chip icon={Shield} color="indigo" text="หัวหน้า"/>
  }

  const cfg = CATEGORIES[category]
  return (
    <div className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {imgUrls.length > 0 ? (
            <FeishuImage url={imgUrls[0]}
              onClick={() => onOpenPhoto(
                // ส่ง proxied URLs ให้ lightbox (ถ้าเป็น Feishu URL)
                imgUrls.map(u => isFeishuUrl(u) ? getFeishuProxyUrl(u) : u),
                0
              )}
              className="w-12 h-12 rounded-xl border border-slate-200 cursor-zoom-in"/>
          ) : (
            <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <cfg.icon size={18} className={cfg.color}/>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{title}</p>
            {stateChip}
            {roleChip}
          </div>
          {subtitle && <p className="mt-0.5">{subtitle}</p>}
          {metaChips.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              {metaChips}
              {imgUrls.length > 1 && (
                <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5">
                  <ImageIcon size={9}/> +{imgUrls.length - 1} รูป
                </span>
              )}
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(s => !s)}
          className="shrink-0 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-2">
          {(readText(f["Note"]) || edit.note || record.note) && (
            <div className="bg-white border border-slate-200 rounded-lg p-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">หมายเหตุ</p>
              <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{readText(f["Note"]) || edit.note || record.note}</p>
            </div>
          )}
          {edit && Object.keys(edit).filter(k => edit[k] != null && edit[k] !== "").length > 0 && (
            <div className="bg-white border border-blue-200 rounded-lg p-2">
              <p className="text-[9px] font-bold text-blue-700 uppercase">HRMS edit (sync ↔ Feishu)</p>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
                {Object.entries(edit).filter(([_, v]) => v != null && v !== "").map(([k, v]) => (
                  <p key={k}><span className="text-slate-400">{k}:</span> <b className="text-slate-700">{String(v)}</b></p>
                ))}
              </div>
            </div>
          )}
          {record.updated_at && (
            <p className="text-[10px] text-slate-400">
              อัพเดต {format(new Date(record.updated_at), "d MMM yy HH:mm", { locale: th })}
              {record.updated_by && ` · โดย ${record.updated_by}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ icon: Icon, color, text }: { icon?: any; color: "slate"|"emerald"|"rose"|"amber"|"violet"|"blue"|"indigo"; text: string }) {
  const c = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
  }[color]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${c}`}>
      {Icon && <Icon size={9}/>}
      {text}
    </span>
  )
}
