"use client"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Loader2, Search, Package, RefreshCw, Filter, X, Check, Upload, FileText,
  Calendar, User, Building2, MapPin, Truck, AlertCircle, ExternalLink,
  ChevronRight, Download, Trash2, ImageIcon, Send, Eye, Copy, Sparkles,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// ── Types ──
export interface SampleRequest {
  feishu_record_id: string
  request_no: string | null
  source_id: string | null
  status: string | null
  approval_process: string | null
  submitted_at: string | null
  completed_at: string | null
  requester: string | null
  initiator_department: string | null
  current_assignee: string | null
  approval_steps: string | null
  brand: string | null
  use_purpose: string | null
  application_date: string | null
  application_sector: string | null
  sku: string | null
  quantity: string | null
  product_status: string | null
  situation: string | null
  shipping_address: string | null
  sku_detail_url: string | null
  estimated_return: string | null
  remark: string | null
  // return fields
  return_done: boolean | null
  return_note: string | null
  return_date: string | null
  return_updated_by: string | null
  return_updated_at: string | null
  return_files: Array<{ name: string; url: string }> | null
  // timestamps
  synced_at: string | null
  feishu_modified_at: string | null
  content_updated_at: string | null
}

// ── Status color ──
function statusColor(s: string | null): string {
  if (!s) return "bg-slate-100 text-slate-600"
  const v = s.toLowerCase()
  if (v.includes("approved")) return "bg-emerald-100 text-emerald-700"
  if (v.includes("rejected")) return "bg-rose-100 text-rose-700"
  if (v.includes("progress") || v.includes("pending") || v.includes("review")) return "bg-amber-100 text-amber-700"
  if (v.includes("draft"))    return "bg-slate-100 text-slate-700"
  return "bg-slate-100 text-slate-600"
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "d MMM yyyy", { locale: th }) } catch { return d }
}
function fmtDateTime(d: string | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "d MMM yyyy HH:mm", { locale: th }) } catch { return d }
}

// แยก SKU เป็น array แบบดูง่าย (อันละบรรทัด)
function splitSku(sku: string | null): string[] {
  if (!sku) return []
  return sku.split(",").map(s => s.trim()).filter(Boolean)
}

// ── Main page ──
export default function SampleRequestsPage() {
  const [items, setItems] = useState<SampleRequest[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus]       = useState("")
  const [filterReturnDone, setFilterReturnDone] = useState<"" | "true" | "false">("")
  const [filterSituation, setFilterSituation] = useState("")

  // Pagination
  const PAGE = 100
  const [offset, setOffset] = useState(0)

  // Detail drawer
  const [openDetail, setOpenDetail] = useState<SampleRequest | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (filterStatus) sp.set("status", filterStatus)
    if (filterSituation) sp.set("situation", filterSituation)
    if (filterReturnDone) sp.set("return_done", filterReturnDone)
    sp.set("limit", String(PAGE))
    sp.set("offset", String(offset))
    const res = await fetch(`/api/sample-requests?${sp.toString()}`)
    const d = await res.json()
    if (res.ok) {
      setItems(d.requests ?? [])
      setSummary(d.summary)
      setTotal(d.total ?? 0)
    } else {
      toast.error(d.error || "โหลดข้อมูลไม่สำเร็จ")
    }
    setLoading(false)
    setRefreshing(false)
  }, [q, filterStatus, filterSituation, filterReturnDone, offset])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); load() }, 300)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line

  useEffect(() => { setOffset(0); load() }, [filterStatus, filterSituation, filterReturnDone]) // eslint-disable-line
  useEffect(() => { load() }, [offset]) // eslint-disable-line

  // After save in drawer → refresh list + drawer copy
  const onSaved = (updated: SampleRequest) => {
    setItems(prev => prev.map(x => x.feishu_record_id === updated.feishu_record_id ? updated : x))
    setOpenDetail(updated)
    // ดึง summary ใหม่ (silent)
    load(true)
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Package size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Sample Request · คำขอตัวอย่างสินค้า</h1>
            <p className="text-[11px] text-slate-400">
              📡 sync จาก Feishu Base ทุก ~5 นาที · {total.toLocaleString()} รายการ
            </p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""}/> รีเฟรช
        </button>
      </div>

      {/* ── Stat strip ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <StatTile label="ทั้งหมด"        value={summary.total}          icon={Package}    tone="slate"/>
          <StatTile label="อนุมัติ"         value={summary.approved}       icon={Check}      tone="emerald"/>
          <StatTile label="รออนุมัติ"       value={summary.pending}        icon={Sparkles}   tone="amber"/>
          <StatTile label="ไม่ต้องคืน"      value={summary.not_returned}   icon={AlertCircle} tone="blue"/>
          <StatTile label="ค้างต้องคืน"     value={summary.pending_return} icon={Truck}      tone="rose"/>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ค้นหา request no, SKU, ผู้ขอ, แบรนด์..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400"/>
          {q && (
            <button onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700">
              <X size={11}/>
            </button>
          )}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-cyan-400">
          <option value="">ทุกสถานะ</option>
          <option value="Approved">✓ Approved</option>
          <option value="In Progress">⏳ In Progress</option>
          <option value="Pending">⏳ Pending</option>
          <option value="Rejected">✗ Rejected</option>
        </select>
        <select value={filterSituation} onChange={e => setFilterSituation(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-cyan-400">
          <option value="">ทุกประเภทคืน</option>
          <option value="Not returned&不退回">ไม่ต้องคืน</option>
          <option value="Need to return&需要退回">ต้องคืน</option>
        </select>
        <select value={filterReturnDone} onChange={e => setFilterReturnDone(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-cyan-400">
          <option value="">ทุกการคืน</option>
          <option value="true">✓ คืนแล้ว</option>
          <option value="false">⏳ ยังไม่คืน</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-slate-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={32} className="mx-auto text-slate-200 mb-2"/>
            <p className="text-sm text-slate-400">ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5">Request No.</th>
                  <th className="text-left px-3 py-2.5">สถานะ</th>
                  <th className="text-left px-3 py-2.5">ผู้ขอ</th>
                  <th className="text-left px-3 py-2.5">แบรนด์</th>
                  <th className="text-left px-3 py-2.5">SKU</th>
                  <th className="text-left px-3 py-2.5">ปริมาณ</th>
                  <th className="text-left px-3 py-2.5">วันที่ขอ</th>
                  <th className="text-left px-3 py-2.5">ครบกำหนดคืน</th>
                  <th className="text-left px-3 py-2.5">ส่งคืน</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(r => {
                  const needReturn = (r.situation || "").includes("Need to return") || (r.situation || "").includes("需要退回")
                  const overdue = needReturn && !r.return_done && r.estimated_return
                    && new Date(r.estimated_return) < new Date()
                  return (
                    <tr key={r.feishu_record_id}
                      onClick={() => setOpenDetail(r)}
                      className="hover:bg-cyan-50/50 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap">{r.request_no || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>
                          {r.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[150px] truncate" title={r.requester || ""}>
                        {r.requester || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.brand || "—"}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 max-w-[260px] truncate" title={r.sku || ""}>{r.sku || "—"}</td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-700">{r.quantity || "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">{fmtDate(r.application_date)}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                        {fmtDate(r.estimated_return)}
                        {overdue && <span className="ml-1 text-[9px] font-black bg-rose-500 text-white px-1 py-0.5 rounded">⚠ เกิน</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.return_done
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"><Check size={10}/> คืนแล้ว</span>
                          : needReturn
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><Truck size={10}/> ค้าง</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">ไม่ต้องคืน</span>}
                      </td>
                      <td className="px-2 py-2"><ChevronRight size={14} className="text-slate-300"/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE && (
          <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between text-xs">
            <p className="text-slate-500">
              {offset + 1}–{Math.min(offset + PAGE, total)} จาก {total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE))}
                className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-30">‹ ก่อนหน้า</button>
              <button disabled={offset + PAGE >= total} onClick={() => setOffset(o => o + PAGE)}
                className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-30">ถัดไป ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-[11px] text-blue-700 flex items-start gap-2">
        <AlertCircle size={13} className="shrink-0 mt-0.5"/>
        <div>
          <p className="font-bold">หมายเหตุ:</p>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5 ml-1">
            <li>Source = ฟอร์ม Feishu — sync มาทุก ~5 นาที (ไม่ realtime)</li>
            <li>HRMS แก้ได้เฉพาะข้อมูลส่งคืน · ฟิลด์อื่นต้องไปแก้ในฟอร์ม Feishu</li>
            <li>สร้าง/ลบ record ใหม่ในฟอร์ม Feishu เท่านั้น</li>
          </ul>
        </div>
      </div>

      {/* Detail Drawer */}
      {openDetail && (
        <SampleRequestDrawer
          request={openDetail}
          onClose={() => setOpenDetail(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Detail Drawer + Return form
// ════════════════════════════════════════════════════════════════════
function SampleRequestDrawer({ request, onClose, onSaved }: {
  request: SampleRequest
  onClose: () => void
  onSaved: (updated: SampleRequest) => void
}) {
  const r = request
  const [returnDone, setReturnDone] = useState(!!r.return_done)
  const [returnNote, setReturnNote] = useState(r.return_note || "")
  const [returnDate, setReturnDate] = useState(r.return_date || "")
  const [files, setFiles] = useState<Array<{ name: string; url: string }>>(r.return_files || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // sync ค่ากลับเมื่อ prop เปลี่ยน
  useEffect(() => {
    setReturnDone(!!r.return_done)
    setReturnNote(r.return_note || "")
    setReturnDate(r.return_date || "")
    setFiles(r.return_files || [])
  }, [r.feishu_record_id]) // eslint-disable-line

  const uploadFiles = async (fls: FileList | null) => {
    if (!fls || fls.length === 0) return
    setUploading(true)
    const t = toast.loading(`กำลังอัพโหลด ${fls.length} ไฟล์...`)
    try {
      const uploaded: Array<{ name: string; url: string }> = []
      for (let i = 0; i < fls.length; i++) {
        const fd = new FormData()
        fd.append("file", fls[i])
        fd.append("record_id", r.feishu_record_id)
        const res = await fetch("/api/sample-requests/upload", { method: "POST", body: fd })
        const d = await res.json()
        if (!res.ok) {
          toast.error(`${fls[i].name}: ${d.error || "อัพโหลดล้มเหลว"}`, { id: t })
          continue
        }
        uploaded.push({ name: d.name, url: d.url })
      }
      setFiles(prev => [...prev, ...uploaded])
      toast.success(`อัพโหลด ${uploaded.length}/${fls.length} ไฟล์`, { id: t })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const save = async () => {
    if (returnDone && !returnDate) {
      return toast.error("ติ๊กคืนแล้ว — ต้องกรอกวันที่คืน")
    }
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const res = await fetch("/api/sample-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feishu_record_id: r.feishu_record_id,
          return_done: returnDone,
          return_note: returnNote || null,
          return_date: returnDate || null,
          return_files: files,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ", { id: t }); return }
      toast.success("บันทึกแล้ว — sync ขึ้น Feishu ภายใน ~5 นาที", { id: t })
      onSaved(d.request)
    } finally { setSaving(false) }
  }

  const skuList = splitSku(r.sku)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-cyan-500 to-teal-600 px-5 py-3.5 flex items-center gap-3">
          <Package size={20} className="text-white"/>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Sample Request</p>
            <p className="text-white font-black text-base font-mono">{r.request_no || "—"}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status || "—"}</span>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Quick info */}
          <div className="grid grid-cols-2 gap-2.5">
            <InfoCell icon={User}     label="ผู้ขอ"        value={r.requester || "—"}/>
            <InfoCell icon={Building2} label="แผนก/บริษัท"   value={r.application_sector || r.initiator_department || "—"}/>
            <InfoCell icon={Sparkles} label="แบรนด์"       value={r.brand || "—"}/>
            <InfoCell icon={Package}  label="ปริมาณ"       value={r.quantity || "—"}/>
            <InfoCell icon={Calendar} label="วันที่ขอ"      value={fmtDate(r.application_date)}/>
            <InfoCell icon={Truck}    label="ครบกำหนดคืน" value={fmtDate(r.estimated_return)}/>
          </div>

          {/* Product status / Situation */}
          <div className="grid grid-cols-2 gap-2">
            {r.product_status && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5">
                <p className="text-[10px] font-bold text-purple-700 uppercase">สถานะสินค้า</p>
                <p className="text-xs font-bold text-purple-900 mt-0.5">{r.product_status}</p>
              </div>
            )}
            {r.situation && (
              <div className={`border rounded-xl p-2.5 ${
                r.situation.includes("Not returned") || r.situation.includes("不退回")
                  ? "bg-slate-50 border-slate-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                <p className="text-[10px] font-bold uppercase text-slate-600">การคืน</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{r.situation}</p>
              </div>
            )}
          </div>

          {/* SKU list */}
          {skuList.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1.5">รายการ SKU ({skuList.length})</p>
              <ul className="space-y-1 text-[12px] text-slate-700">
                {skuList.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400 font-mono text-[10px] mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Use purpose + shipping */}
          {r.use_purpose && (
            <Section label="วัตถุประสงค์" body={r.use_purpose}/>
          )}
          {r.shipping_address && (
            <Section label="ที่อยู่จัดส่ง" body={r.shipping_address}/>
          )}
          {r.remark && (
            <Section label="หมายเหตุ" body={r.remark}/>
          )}

          {/* ── Return form ── */}
          <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={15} className="text-emerald-600"/>
              <h3 className="font-black text-emerald-800 text-sm">แจ้งส่งคืน</h3>
              {r.return_updated_by && (
                <span className="text-[9px] font-bold bg-white text-emerald-700 px-1.5 py-0.5 rounded-full ml-auto">
                  ล่าสุดโดย {r.return_updated_by} · {fmtDateTime(r.return_updated_at)}
                </span>
              )}
            </div>

            <label className="flex items-center gap-2.5 bg-white border border-emerald-200 rounded-xl px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={returnDone}
                onChange={e => setReturnDone(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"/>
              <span className="text-sm font-bold text-slate-700">ส่งคืนแล้ว</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-emerald-700 uppercase">วันที่คืน</label>
                <input type="date" value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="w-full mt-1 bg-white border border-emerald-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-emerald-400"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-700 uppercase">หมายเหตุ</label>
                <input value={returnNote}
                  onChange={e => setReturnNote(e.target.value)}
                  placeholder="เช่น คืนครบ, ขาด 2 ชิ้น..."
                  className="w-full mt-1 bg-white border border-emerald-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-emerald-400"/>
              </div>
            </div>

            {/* Files */}
            <div>
              <label className="text-[10px] font-bold text-emerald-700 uppercase">ไฟล์แนบ ({files.length})</label>
              <div className="mt-1 space-y-1.5">
                {files.map((f, i) => {
                  const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)
                  return (
                    <div key={i} className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg p-1.5">
                      <a href={f.url} target="_blank" rel="noreferrer"
                        className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {isImage
                          ? <img src={f.url} alt="" className="w-full h-full object-cover"/>
                          : <FileText size={14} className="text-slate-500"/>}
                      </a>
                      <a href={f.url} target="_blank" rel="noreferrer"
                        className="flex-1 min-w-0 text-xs font-semibold text-slate-700 hover:text-cyan-700 truncate">
                        {f.name}
                      </a>
                      <button onClick={() => removeFile(i)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  )
                })}
                <input ref={fileRef} type="file" multiple
                  className="hidden"
                  onChange={e => uploadFiles(e.target.files)}/>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border-2 border-dashed border-emerald-300 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                  {uploading
                    ? <><Loader2 size={12} className="animate-spin"/> กำลังอัพโหลด...</>
                    : <><Upload size={12}/> เพิ่มไฟล์ (สูงสุด 50MB/ไฟล์)</>}
                </button>
              </div>
            </div>

            {/* Save */}
            <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-sm">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
              บันทึก → sync ขึ้น Feishu ใน ~5 นาที
            </button>
          </div>

          {/* Sync metadata */}
          <details className="text-[11px] text-slate-500">
            <summary className="cursor-pointer font-bold flex items-center gap-1">
              <ExternalLink size={11}/> ข้อมูล sync
            </summary>
            <div className="mt-2 space-y-0.5 pl-4">
              <p>📡 sync ล่าสุด: {fmtDateTime(r.synced_at)}</p>
              <p>📝 แก้ใน Feishu ล่าสุด: {fmtDateTime(r.feishu_modified_at)}</p>
              <p>🔄 เนื้อหาเปลี่ยนล่าสุด: {fmtDateTime(r.content_updated_at)}</p>
              <p className="font-mono text-[10px] mt-1 break-all">PK: {r.feishu_record_id}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

// ── Tiny components ──
function StatTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "slate"|"emerald"|"amber"|"blue"|"rose" }) {
  const t = {
    slate:   "bg-slate-50  text-slate-700  border-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber:   "bg-amber-50   text-amber-700   border-amber-100",
    blue:    "bg-blue-50    text-blue-700    border-blue-100",
    rose:    "bg-rose-50    text-rose-700    border-rose-100",
  }[tone]
  return (
    <div className={`border rounded-2xl p-3 flex items-center gap-2.5 ${t}`}>
      <div className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center"><Icon size={14}/></div>
      <div>
        <p className="text-[10px] font-bold uppercase opacity-75">{label}</p>
        <p className="text-lg font-black leading-tight">{(value ?? 0).toLocaleString()}</p>
      </div>
    </div>
  )
}

function InfoCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <Icon size={10}/> {label}
      </p>
      <p className="text-xs font-bold text-slate-800 mt-0.5 break-words">{value}</p>
    </div>
  )
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{label}</p>
      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  )
}
