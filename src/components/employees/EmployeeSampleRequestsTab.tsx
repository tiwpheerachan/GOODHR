"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Package, Loader2, Calendar, Truck, AlertCircle, Check, ExternalLink,
  RefreshCw, FileText, AlertTriangle, Sparkles, ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"

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
  product_status: string | null
  shipping_address: string | null
  use_purpose: string | null
  requester: string | null
  return_done: boolean | null
  return_date: string | null
  return_note: string | null
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  try { return format(new Date(d), "d MMM yyyy", { locale: th }) } catch { return d }
}

function statusColor(s: string | null): string {
  if (!s) return "bg-slate-100 text-slate-600"
  const v = s.toLowerCase()
  if (v.includes("approved")) return "bg-emerald-100 text-emerald-700"
  if (v.includes("rejected")) return "bg-rose-100 text-rose-700"
  if (v.includes("progress") || v.includes("pending")) return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-600"
}

interface Props {
  employeeName: string       // ชื่อเต็มสำหรับ filter (requester contains this)
  employeeNickname?: string
  employeeFirstNameEn?: string
}

export default function EmployeeSampleRequestsTab({ employeeName, employeeNickname, employeeFirstNameEn }: Props) {
  const [items, setItems] = useState<SampleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState(employeeName)

  // ลอง search หลายชื่อ — first name TH, nickname, first name EN
  const candidates = Array.from(new Set([
    employeeName,
    employeeNickname || "",
    employeeFirstNameEn || "",
  ].filter(Boolean)))

  const load = useCallback(async () => {
    if (!searchName.trim()) { setItems([]); setLoading(false); return }
    setLoading(true)
    const res = await fetch(`/api/sample-requests?requester=${encodeURIComponent(searchName)}&limit=500`)
    const d = await res.json()
    if (res.ok) setItems(d.requests ?? [])
    else setItems([])
    setLoading(false)
  }, [searchName])

  useEffect(() => { load() }, [load])

  // Bucket items
  const today = new Date()
  const unreturned = items.filter(r => {
    const needReturn = (r.situation || "").includes("Need to return") || (r.situation || "").includes("需要退回")
    return needReturn && !r.return_done
  })
  const overdue = unreturned.filter(r => r.estimated_return && new Date(r.estimated_return) < today)
  const returned = items.filter(r => r.return_done)
  const noReturnNeeded = items.filter(r => {
    const needReturn = (r.situation || "").includes("Need to return") || (r.situation || "").includes("需要退回")
    return !needReturn
  })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Package size={16} className="text-white"/>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm">อุปกรณ์/ตัวอย่างสินค้าที่ยืม</h3>
            <p className="text-[11px] text-slate-400">ข้อมูลจากฟอร์ม Sample request (Feishu)</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""}/>
        </button>
      </div>

      {/* Search-by-name picker (เผื่อระบุชื่อใน Feishu ไม่ตรง) */}
      {candidates.length > 1 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center gap-1.5 flex-wrap">
          <p className="text-[10px] font-bold text-slate-500 px-1">ค้นด้วยชื่อ:</p>
          {candidates.map(n => (
            <button key={n} onClick={() => setSearchName(n)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                searchName === n
                  ? "bg-cyan-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-10 text-center">
          <Package size={28} className="mx-auto text-slate-200 mb-2"/>
          <p className="text-sm text-slate-400">ไม่พบรายการ Sample Request ของพนักงานคนนี้</p>
          <p className="text-[11px] text-slate-400 mt-1">ระบบ match ด้วยชื่อ — ถ้าชื่อใน Feishu ไม่ตรง จะหาไม่เจอ</p>
        </div>
      ) : (
        <>
          {/* Summary stat */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat label="รวมทั้งหมด"  value={items.length}        tone="slate"   icon={Package}/>
            <Stat label="ยังไม่คืน"    value={unreturned.length}   tone={unreturned.length > 0 ? "amber" : "slate"}  icon={Truck}/>
            <Stat label="เกินกำหนด"   value={overdue.length}      tone={overdue.length > 0 ? "rose" : "slate"} icon={AlertTriangle}/>
            <Stat label="คืนแล้ว"     value={returned.length}     tone="emerald" icon={Check}/>
          </div>

          {/* ⚠️ ของที่ต้องคืน — ไฮไลต์เด่นๆ ใช้ตอนลาออก */}
          {unreturned.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                  <AlertCircle size={15} className="text-white"/>
                </div>
                <div className="flex-1">
                  <p className="font-black text-amber-900 text-sm">⚠️ ต้องคืน {unreturned.length} รายการ</p>
                  <p className="text-[11px] text-amber-700">เช็คตอนพนักงานลาออกหรือเปลี่ยนตำแหน่ง</p>
                </div>
                {overdue.length > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-1 rounded-full">
                    ⚠ เกินกำหนด {overdue.length} รายการ
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {unreturned.map(r => <SampleCard key={r.feishu_record_id} r={r} highlightOverdue/>)}
              </div>
            </div>
          )}

          {/* คืนแล้ว — collapse */}
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

          {/* ไม่ต้องคืน — collapse */}
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
        </>
      )}

      <div className="text-[10px] text-slate-400 text-center">
        🔗 จัดการคืนได้ที่{" "}
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
    <Link href={`/equipment/sample-requests`}
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
            {r.estimated_return && <span className="flex items-center gap-0.5"><Truck size={9}/>ครบกำหนด {fmtDate(r.estimated_return)}</span>}
            {r.return_done && r.return_date && <span className="flex items-center gap-0.5 text-emerald-600 font-bold"><Check size={9}/>คืน {fmtDate(r.return_date)}</span>}
          </div>
        </div>
        <ExternalLink size={11} className="text-slate-300 mt-1 shrink-0"/>
      </div>
    </Link>
  )
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "slate"|"emerald"|"amber"|"rose"; icon: any }) {
  const t = {
    slate:   "bg-slate-50 text-slate-700 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-100",
    rose:    "bg-rose-50 text-rose-700 border-rose-100",
  }[tone]
  return (
    <div className={`border rounded-xl p-2.5 flex items-center gap-2 ${t}`}>
      <Icon size={13}/>
      <div>
        <p className="text-[10px] font-bold opacity-75 uppercase">{label}</p>
        <p className="text-lg font-black leading-tight">{value}</p>
      </div>
    </div>
  )
}
