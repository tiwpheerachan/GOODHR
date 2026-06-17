"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Loader2, Package, Monitor, Phone, FileText, RefreshCw, ExternalLink,
  AlertCircle, Calendar, MapPin, Hash, Edit2, Check, X, Building2,
  Database, Shield, ChevronDown, ChevronRight, Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import PhotoLightbox from "@/components/PhotoLightbox"

// ── dataset config ──
const DATASET_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; ring: string }> = {
  asset_main: { label: "ทรัพย์สิน",         icon: Package,  color: "text-cyan-700",    bg: "bg-cyan-50",    ring: "border-cyan-200" },
  live:       { label: "อุปกรณ์ Live Room", icon: Monitor,  color: "text-violet-700",  bg: "bg-violet-50",  ring: "border-violet-200" },
  tel_user:   { label: "เบอร์ที่ดูแล",       icon: Phone,    color: "text-blue-700",    bg: "bg-blue-50",    ring: "border-blue-200" },
  tel:        { label: "บิลค่าโทร",          icon: FileText, color: "text-emerald-700", bg: "bg-emerald-50", ring: "border-emerald-200" },
}

// ── field readers (raw Feishu format) ──
function readText(v: any): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v.map(x => x?.text || "").join("")
  return String(v)
}
function readNumber(v: any): number | null {
  const n = Number(v); return isFinite(n) ? n : null
}
function readDate(v: any): string | null {
  const n = Number(v); if (!isFinite(n) || n === 0) return null
  try { return format(new Date(n), "d MMM yy", { locale: th }) } catch { return null }
}
function readImages(v: any): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((f: any) => /image|jpe?g|png|webp|gif|heic/i.test(f?.type || f?.name || "")).map((f: any) => f.url)
}
function readUserName(v: any): string {
  if (!Array.isArray(v) || v.length === 0) return ""
  return v.map((u: any) => u?.name || u?.en_name || "").filter(Boolean).join(", ")
}

interface Props {
  employeeId: string
  employeeName: string
}

export default function EmployeeFeishuAssetsTab({ employeeId, employeeName }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDs, setActiveDs] = useState<string>("")
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/feishu-assets`)
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โหลดไม่สำเร็จ"); return }
      setData(d)
      // auto-pick tab ที่มีของ
      if (!activeDs) {
        const first = Object.entries(d.summary || {}).find(([_, n]) => (n as number) > 0)?.[0]
        if (first) setActiveDs(first)
      }
    } finally { setLoading(false) }
  }, [employeeId]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-slate-300"/></div>
  }
  if (!data) return null

  const total = data.total || 0
  const summary = data.summary || {}
  const results = data.results || {}
  const matchRoles = data.match_roles || {}
  const idsUsed = data.identifiers_used || {}

  // ── empty state ──
  if (total === 0) {
    return (
      <div className="space-y-4">
        <Header total={0} onRefresh={load}/>
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-12 text-center">
          <Package size={28} className="mx-auto text-slate-200 mb-2"/>
          <p className="text-sm text-slate-500 font-bold">ไม่พบ asset ที่ผูกกับพนักงานคนนี้</p>
          <p className="text-[11px] text-slate-400 mt-1">
            ระบบจับคู่ด้วย: email, Feishu user ID, ชื่อ — ลองเชื่อม Feishu account ในแท็บ "🔗 Feishu Link" ก่อน
          </p>
          {(idsUsed.emails?.length || idsUsed.feishuIds?.length || idsUsed.names?.length) > 0 && (
            <details className="mt-3 text-[10px] text-slate-400 inline-block text-left">
              <summary className="cursor-pointer font-bold">ดู identifier ที่ใช้ค้น ({(idsUsed.emails?.length || 0) + (idsUsed.feishuIds?.length || 0) + (idsUsed.names?.length || 0)})</summary>
              <div className="mt-1 space-y-0.5 pl-2">
                {idsUsed.emails?.map((e: string) => <p key={e}>📧 {e}</p>)}
                {idsUsed.feishuIds?.map((id: string) => <p key={id}>🆔 {id}</p>)}
                {idsUsed.names?.map((n: string) => <p key={n}>👤 {n}</p>)}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <Header total={total} onRefresh={load}/>

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {Object.entries(DATASET_CONFIG).map(([ds, cfg]) => {
          const n = summary[ds] || 0
          const active = activeDs === ds
          const Icon = cfg.icon
          return (
            <button key={ds} onClick={() => setActiveDs(ds)}
              disabled={n === 0}
              className={`text-left p-3 rounded-2xl border-2 transition-all ${
                active
                  ? `${cfg.bg} ${cfg.ring} shadow-sm scale-[1.02]`
                  : n === 0
                    ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={n > 0 ? cfg.color : "text-slate-300"}/>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cfg.label}</p>
              </div>
              <p className={`text-2xl font-black ${n > 0 ? cfg.color : "text-slate-300"} leading-tight`}>{n}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{n > 0 ? "รายการ" : "ไม่มี"}</p>
            </button>
          )
        })}
      </div>

      {/* ── Active dataset records ── */}
      {activeDs && results[activeDs]?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className={`${DATASET_CONFIG[activeDs].bg} border-b border-slate-100 px-4 py-2.5 flex items-center gap-2`}>
            <div className={`w-7 h-7 rounded-lg ${DATASET_CONFIG[activeDs].color.replace("text-", "bg-").replace("700", "500")} flex items-center justify-center`}>
              {(() => { const I = DATASET_CONFIG[activeDs].icon; return <I size={13} className="text-white"/> })()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-800">{DATASET_CONFIG[activeDs].label}</p>
              <p className="text-[10px] text-slate-500">{results[activeDs].length} รายการ</p>
            </div>
            <Link href="/equipment/assets"
              className="text-[10px] font-bold text-slate-500 hover:text-cyan-600 flex items-center gap-1">
              <ExternalLink size={10}/> ไปที่หน้า Assets
            </Link>
          </div>

          <div className="divide-y divide-slate-50">
            {results[activeDs].map((r: any) => (
              <AssetRow
                key={r.feishu_record_id}
                dataset={activeDs}
                record={r}
                matchRole={matchRoles[activeDs]?.[r.feishu_record_id]}
                onOpenPhoto={(urls, idx) => setLightbox({ urls, index: idx })}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Identifier debug ── */}
      <details className="text-[10px] text-slate-400">
        <summary className="cursor-pointer font-bold flex items-center gap-1">
          <Database size={10}/> ระบบจับคู่ด้วย identifier {(idsUsed.emails?.length || 0) + (idsUsed.feishuIds?.length || 0) + (idsUsed.names?.length || 0)} ตัว
        </summary>
        <div className="mt-1.5 bg-slate-50 rounded-lg p-2 space-y-0.5">
          {idsUsed.emails?.map((e: string) => <p key={e}>📧 {e}</p>)}
          {idsUsed.feishuIds?.map((id: string) => <p key={id}>🆔 {id}</p>)}
          {idsUsed.names?.map((n: string) => <p key={n}>👤 {n}</p>)}
        </div>
      </details>

      {lightbox && (
        <PhotoLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Header
// ══════════════════════════════════════════════════════
function Header({ total, onRefresh }: { total: number; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
          <Package size={18} className="text-white"/>
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-sm">ของที่ยืม/ถือครอง · Feishu Assets</h3>
          <p className="text-[11px] text-slate-400">
            จับคู่จากตาราง Feishu (asset_main / live / tel_user / tel) · {total} รายการรวม
          </p>
        </div>
      </div>
      <button onClick={onRefresh}
        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"
        title="Refresh">
        <RefreshCw size={12}/>
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Asset row — รายการ 1 record
// ══════════════════════════════════════════════════════
function AssetRow({ dataset, record, matchRole, onOpenPhoto }: {
  dataset: string
  record: any
  matchRole?: string
  onOpenPhoto: (urls: string[], idx: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const f = record.fields || {}
  const edit = record.edit || {}

  // ── Pick key fields per dataset ──
  let title = "—"
  let subtitle: React.ReactNode = null
  let imgUrls: string[] = []
  let metaChips: React.ReactNode[] = []
  let stateChip: React.ReactNode = null

  if (dataset === "asset_main" || dataset === "live") {
    title = readText(f["คำอธิบายสินทรัพย์物品描述 副本"]) || readText(f["รุ่น/ยี่ห้อ 型号/品牌"]) || "—"
    const sn = readText(f["S/N"])
    const loc = readText(f["location 地点"])
    const value = readNumber(f["มูลค่าสินทรัพย์资产价值"])
    const damage = readText(f["ความเสียหาย损坏程度"]) || edit.damage_level
    const maint = readText(f["สถานะ维修状态"]) || edit.maint_status
    const checkedAt = readDate(f["ตรวจสอบวันที่检查日期"])
    imgUrls = readImages(f["แนบรูปถ่าย sn/资产产品图片"])

    subtitle = sn && <span className="font-mono text-[10px]">{sn}</span>
    if (loc)    metaChips.push(<Chip key="loc" icon={MapPin} color="slate" text={loc}/>)
    if (value)  metaChips.push(<Chip key="val" icon={null} color="amber" text={`฿${value.toLocaleString()}`}/>)
    if (damage) metaChips.push(<Chip key="dmg" icon={null} color={damage.includes("ปกติ") || damage.includes("完好") ? "emerald" : "rose"} text={damage}/>)
    if (maint)  stateChip = <Chip icon={null} color="blue" text={maint}/>
    if (checkedAt) metaChips.push(<Chip key="dt" icon={Calendar} color="slate" text={`ตรวจ ${checkedAt}`}/>)
  } else if (dataset === "tel_user") {
    title = readText(f["รหัสลูกค้า代号"]) || "—"
    const phone = readText(f["เบอร์โทร电话☎️"])
    const network = readText(f["เครือข่าย运营商"])
    const dept = readText(f["แผนก部门"])
    subtitle = phone ? <span className="font-mono text-[10px]">📞 {phone}</span> : null
    if (network) metaChips.push(<Chip key="net" icon={null} color="violet" text={network}/>)
    if (dept) metaChips.push(<Chip key="dept" icon={Building2} color="slate" text={dept}/>)
  } else if (dataset === "tel") {
    const billNo = readText(f["รหัสลูกค้า代号"]) || readText(f["รายการหลัก"])
    title = `บิล ${billNo}`
    const phone = readText(f["เบอร์โทร电话☎️"])
    const year = readText(f["年份"])
    const month = readText(f["月份"])
    const network = readText(f["เครือข่าย运营商"])
    const total = readNumber(f["ยอดที่ต้องจ่าย 实缴付"]) ?? readNumber(f["ยอดเต็ม价格"])
    subtitle = phone ? <span className="font-mono text-[10px]">📞 {phone}</span> : null
    if (year && month) metaChips.push(<Chip key="ym" icon={Calendar} color="slate" text={`${month}/${year}`}/>)
    if (network) metaChips.push(<Chip key="net" icon={null} color="violet" text={network}/>)
    if (total)  metaChips.push(<Chip key="amt" icon={null} color="amber" text={`฿${total.toLocaleString()}`}/>)
    if (record.chk) stateChip = <Chip icon={Check} color="emerald" text="ตรวจแล้ว"/>
  }

  // role chip
  let roleChip: React.ReactNode = null
  if (matchRole?.includes("หัวหน้า") || matchRole?.includes("负责人")) {
    roleChip = <Chip icon={Shield} color="indigo" text="หัวหน้า"/>
  }

  const hasEdit = edit && Object.keys(edit).filter(k => edit[k] != null && edit[k] !== "").length > 0
  const hasNote = readText(f["Note"]) || edit.note || record.note

  return (
    <div className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Thumbnail / icon */}
        <div className="shrink-0">
          {imgUrls.length > 0 ? (
            <button onClick={() => onOpenPhoto(imgUrls, 0)}
              className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrls[0]} alt="" className="w-full h-full object-cover"/>
            </button>
          ) : (
            <div className={`w-12 h-12 rounded-xl ${DATASET_CONFIG[dataset].bg} flex items-center justify-center`}>
              {(() => { const I = DATASET_CONFIG[dataset].icon; return <I size={18} className={DATASET_CONFIG[dataset].color}/> })()}
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{title}</p>
            {stateChip}
            {roleChip}
          </div>
          {subtitle && <p className="text-slate-500 mt-0.5">{subtitle}</p>}
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

        {/* Expand toggle */}
        <button onClick={() => setExpanded(s => !s)}
          className="shrink-0 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          title="ดูรายละเอียด">
          {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-3 pl-15 ml-15 bg-slate-50 rounded-xl p-3 space-y-2">
          {hasNote && (
            <div className="bg-white border border-slate-200 rounded-lg p-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">หมายเหตุ</p>
              <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{readText(f["Note"]) || edit.note || record.note}</p>
            </div>
          )}
          {hasEdit && (
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
              อัพเดตล่าสุด {format(new Date(record.updated_at), "d MMM yy HH:mm", { locale: th })}
              {record.updated_by && ` · โดย ${record.updated_by}`}
            </p>
          )}
          <p className="text-[10px] text-slate-300 font-mono break-all">PK: {record.feishu_record_id}</p>
        </div>
      )}
    </div>
  )
}

// ── Chip helper ──
function Chip({ icon: Icon, color, text }: { icon: any; color: "slate"|"emerald"|"rose"|"amber"|"violet"|"blue"|"indigo"; text: string }) {
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
