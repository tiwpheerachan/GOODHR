"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus, Layers, Loader2, Trash2, Edit2, X, Check, Search, ArrowLeft,
  Image as ImageIcon, Tv, RefreshCw, Filter, AlertTriangle, RotateCcw, Archive,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import CoverImageUpload from "@/components/training/CoverImageUpload"

type Channel = {
  id: string; name: string; brand?: string | null; description?: string | null
  thumbnail_url?: string | null
  is_active?: boolean
  updated_at?: string | null
  owner?: { id: string; first_name_th: string; last_name_th: string; nickname?: string | null } | null
}
type FormState = {
  id?: string; name: string; brand: string; description: string; thumbnail_url: string | null
}
const EMPTY_FORM: FormState = { name: "", brand: "", description: "", thumbnail_url: null }

export default function ChannelsManager({ basePath }: { basePath: string }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [trash, setTrash] = useState<Channel[]>([])
  const [view, setView] = useState<"active" | "trash">("active")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [delTarget, setDelTarget] = useState<Channel | null>(null)
  const [delCounts, setDelCounts] = useState<{ courses: number; loading: boolean } | null>(null)
  const [delConfirmText, setDelConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [act, del] = await Promise.all([
        fetch("/api/training/channels").then(r => r.json()),
        fetch("/api/training/channels?deleted=1").then(r => r.json()).catch(() => ({ channels: [] })),
      ])
      setChannels(act.channels ?? [])
      setTrash(del.channels ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const source = view === "trash" ? trash : channels
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(c =>
      [c.name, c.brand ?? "", c.description ?? "", c.owner?.first_name_th ?? "", c.owner?.last_name_th ?? ""]
        .join(" ").toLowerCase().includes(q)
    )
  }, [source, query])

  const openCreate = () => { setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (ch: Channel) => {
    setForm({ id: ch.id, name: ch.name, brand: ch.brand ?? "", description: ch.description ?? "", thumbnail_url: ch.thumbnail_url ?? null })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error("กรุณาตั้งชื่อช่อง"); return }
    setSaving(true)
    const t = toast.loading(form.id ? "กำลังบันทึก..." : "กำลังสร้าง...")
    try {
      const payload = {
        name: form.name.trim(), brand: form.brand.trim() || null,
        description: form.description.trim() || null, thumbnail_url: form.thumbnail_url,
      }
      const res = await fetch("/api/training/channels", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(form.id ? "บันทึกแล้ว" : "สร้างช่องแล้ว", { id: t })
      setShowModal(false); setForm(EMPTY_FORM); await load()
    } catch (e: any) { toast.error(e.message, { id: t }) }
    setSaving(false)
  }

  // Soft delete — move to recycle bin (recoverable)
  const softDelete = async (ch: Channel) => {
    if (!confirm(`ย้ายช่อง "${ch.name}" ไปถังขยะ?\n\nเนื้อหาทั้งหมดจะถูกซ่อนแต่ไม่ถูกลบ — สามารถกู้คืนได้ภายหลัง`)) return
    setBusyId(ch.id)
    const t = toast.loading("กำลังย้ายไปถังขยะ...")
    try {
      const res = await fetch(`/api/training/channels?id=${ch.id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
      toast.success("ย้ายไปถังขยะแล้ว · กู้คืนได้ในแท็บ \"ถังขยะ\"", { id: t, duration: 4500 })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  // Restore — bring back from recycle bin
  const restore = async (ch: Channel) => {
    setBusyId(ch.id)
    const t = toast.loading("กำลังกู้คืน...")
    try {
      const res = await fetch("/api/training/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ch.id, is_active: true }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "กู้คืนไม่สำเร็จ", { id: t }); return }
      toast.success(`กู้คืน "${ch.name}" แล้ว`, { id: t })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "กู้คืนไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  // Hard delete confirmation — only from trash view
  const askHardDelete = async (ch: Channel) => {
    setDelTarget(ch)
    setDelConfirmText("")
    setDelCounts({ courses: 0, loading: true })
    try {
      const r = await fetch(`/api/training/courses?channel_id=${ch.id}`).then(r => r.json())
      setDelCounts({ courses: (r.courses ?? []).length, loading: false })
    } catch {
      setDelCounts({ courses: 0, loading: false })
    }
  }
  const closeDelete = () => { setDelTarget(null); setDelConfirmText(""); setDelCounts(null) }

  const confirmHardDelete = async () => {
    if (!delTarget) return
    if (delConfirmText.trim() !== delTarget.name.trim()) {
      toast.error("กรุณาพิมพ์ชื่อช่องให้ตรง")
      return
    }
    setDeleting(true)
    const t = toast.loading("กำลังลบถาวร...")
    try {
      const res = await fetch(`/api/training/channels?id=${delTarget.id}&hard=1`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
      const k = d.deleted
      toast.success(
        k ? `ลบถาวรช่อง "${k.channel}" · คอร์ส ${k.courses} · บทเรียน ${k.modules} · ผู้เรียน ${k.enrollments}`
          : "ลบถาวรแล้ว",
        { id: t, duration: 5000 },
      )
      closeDelete(); await load()
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ", { id: t })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบเรียนรู้
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ช่อง (Channels)</h2>
          <p className="text-slate-400 text-sm">
            {view === "active"
              ? <>{filtered.length} / {channels.length} ช่อง</>
              : <>ถังขยะ · {filtered.length} / {trash.length} ช่อง — กู้คืนได้</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView("active")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === "active" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Layers size={12} /> ใช้งาน
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${view === "active" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                {channels.length}
              </span>
            </button>
            <button onClick={() => setView("trash")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === "trash" ? "bg-white shadow-sm text-amber-700" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Archive size={12} /> ถังขยะ
              {trash.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${view === "trash" ? "bg-amber-100 text-amber-700" : "bg-amber-200 text-amber-800"}`}>
                  {trash.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          {view === "active" && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
              <Plus size={14} /> สร้างช่องใหม่
            </button>
          )}
        </div>
      </div>

      {/* Trash banner */}
      {view === "trash" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Archive size={14} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-900">ช่องในถังขยะ</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              ช่องที่ลบแล้วยังเก็บข้อมูลไว้ครบ — กดปุ่ม <b>กู้คืน</b> เพื่อนำกลับมาใช้ หรือกด <b>ลบถาวร</b> เพื่อลบทั้งช่อง + เนื้อหา (cascade) อย่างถาวร
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาช่อง · แบรนด์ · เจ้าของ..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        {query && (
          <button onClick={() => setQuery("")} className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-100 rounded-2xl h-56 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          {view === "trash"
            ? <Archive size={36} className="mx-auto mb-2 text-slate-300" />
            : <Layers size={36} className="mx-auto mb-2 text-slate-300" />}
          <p className="font-black text-slate-700">
            {query
              ? "ไม่พบช่อง"
              : view === "trash" ? "ถังขยะว่าง" : "ยังไม่มีช่อง"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {query
              ? "ลองเปลี่ยนคำค้นหา"
              : view === "trash" ? "ช่องที่ลบจะแสดงที่นี่ และสามารถกู้คืนได้" : "กดสร้างช่องใหม่เพื่อเริ่มต้น"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(ch => (
            <div key={ch.id} className={`group bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
              view === "trash" ? "border-amber-200 hover:border-amber-300" : "border-slate-100 hover:border-indigo-200"
            }`}>
              <div className={`relative h-28 overflow-hidden ${view === "trash" ? "bg-amber-50" : "bg-slate-100"}`}>
                {ch.thumbnail_url ? (
                  <img src={ch.thumbnail_url} alt={ch.name} className={`w-full h-full object-cover ${view === "trash" ? "opacity-50 grayscale" : ""}`} />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    view === "trash" ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gradient-to-br from-indigo-100 to-purple-100"
                  }`}>
                    <Layers size={32} className={view === "trash" ? "text-amber-300" : "text-indigo-300"} />
                  </div>
                )}
                {ch.brand && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/95 backdrop-blur rounded-full text-[10px] font-black text-indigo-700">
                    {ch.brand}
                  </span>
                )}
                {view === "trash" && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black inline-flex items-center gap-1">
                    <Archive size={9} /> ถูกลบ
                  </span>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {view === "active" ? (
                    <>
                      <button onClick={() => openEdit(ch)}
                        className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow text-slate-700" title="แก้ไข">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => softDelete(ch)} disabled={busyId === ch.id}
                        className="p-1.5 bg-rose-500/90 hover:bg-rose-500 rounded-lg shadow text-white disabled:opacity-50" title="ย้ายไปถังขยะ (กู้คืนได้)">
                        {busyId === ch.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => restore(ch)} disabled={busyId === ch.id}
                        className="p-1.5 bg-emerald-500/90 hover:bg-emerald-500 rounded-lg shadow text-white disabled:opacity-50" title="กู้คืน">
                        {busyId === ch.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      </button>
                      <button onClick={() => askHardDelete(ch)}
                        className="p-1.5 bg-rose-600/90 hover:bg-rose-700 rounded-lg shadow text-white" title="ลบถาวร (ไม่สามารถกู้คืนได้)">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="font-black text-slate-800 text-sm truncate">{ch.name}</p>
                {ch.owner && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    เจ้าของ: {ch.owner.first_name_th} {ch.owner.last_name_th}
                  </p>
                )}
                <p className="text-xs text-slate-500 line-clamp-2 mt-2 min-h-[2.5rem]">
                  {ch.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
                </p>
                {view === "active" ? (
                  <Link href={`${basePath}/courses?channel_id=${ch.id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                    ดูคอร์สในช่องนี้ →
                  </Link>
                ) : (
                  <div className="mt-3 flex gap-1.5">
                    <button onClick={() => restore(ch)} disabled={busyId === ch.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                      {busyId === ch.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                      กู้คืน
                    </button>
                    <button onClick={() => askHardDelete(ch)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors">
                      <Trash2 size={11} /> ลบถาวร
                    </button>
                  </div>
                )}
                {view === "trash" && ch.updated_at && (
                  <p className="text-[10px] text-amber-700 mt-2 text-center">
                    ลบเมื่อ {format(new Date(ch.updated_at), "d MMM yyyy HH:mm", { locale: th })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Tv size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800">{form.id ? "แก้ไขช่อง" : "สร้างช่องใหม่"}</h3>
                <p className="text-[11px] text-slate-400">ตั้งค่าชื่อ · แบรนด์ · ภาพปก</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <ImageIcon size={12} /> ภาพปกช่อง
                </p>
                <CoverImageUpload value={form.thumbnail_url}
                  onChange={url => setForm(f => ({ ...f, thumbnail_url: url }))}
                  aspectRatio="16:9" label="ภาพปกช่อง" height="h-36" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">ชื่อช่อง *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="เช่น Marketing, Sales..." />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">แบรนด์</p>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="(ถ้าผูกกับแบรนด์)" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">คำอธิบาย</p>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  placeholder="อธิบายช่อง — เนื้อหา / เป้าหมาย / กลุ่มเป้าหมาย" />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 flex gap-2 border-t border-slate-100 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {form.id ? "บันทึก" : "สร้าง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirmation modal (from trash only) */}
      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeDelete}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-rose-900">ลบถาวร — กู้คืนไม่ได้</h3>
                <p className="text-[11px] text-rose-700">ช่อง + เนื้อหาทั้งหมดจะถูกลบจากระบบอย่างถาวร</p>
              </div>
              <button onClick={closeDelete} className="p-1 hover:bg-rose-100 rounded text-rose-700"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ช่อง</p>
                <p className="font-black text-slate-800 truncate">{delTarget.name}</p>
                {delTarget.brand && <p className="text-[11px] text-slate-500 mt-0.5">แบรนด์: {delTarget.brand}</p>}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-black">⚠ จะลบสิ่งเหล่านี้ทั้งหมด:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900">
                  <li>
                    คอร์สในช่องนี้
                    {delCounts?.loading
                      ? <Loader2 size={10} className="animate-spin inline ml-1" />
                      : <b className="ml-1">{delCounts?.courses ?? 0} คอร์ส</b>}
                  </li>
                  <li>บทเรียน · ควิซ · ข้อสอบทั้งหมดในคอร์ส</li>
                  <li>ผลการลงทะเบียน · ความคืบหน้า · คะแนนของผู้เรียนทุกคน</li>
                  <li>คลังคำถามของช่อง · สิทธิ์ supervisor ที่มอบให้ช่องนี้</li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">
                  พิมพ์ชื่อช่อง <span className="font-mono text-rose-600">{delTarget.name}</span> เพื่อยืนยัน
                </p>
                <input value={delConfirmText} onChange={e => setDelConfirmText(e.target.value)}
                  autoFocus
                  placeholder={delTarget.name}
                  className="w-full bg-white border-2 border-rose-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500 font-mono" />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 flex gap-2 border-t border-slate-100 justify-end">
              <button onClick={closeDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={confirmHardDelete}
                disabled={deleting || delConfirmText.trim() !== delTarget.name.trim()}
                className="px-4 py-2 text-sm font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
