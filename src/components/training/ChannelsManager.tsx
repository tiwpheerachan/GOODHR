"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus, Layers, Loader2, Trash2, Edit2, X, Check, Search, ArrowLeft,
  Image as ImageIcon, Tv, RefreshCw, Filter,
} from "lucide-react"
import toast from "react-hot-toast"
import CoverImageUpload from "@/components/training/CoverImageUpload"

type Channel = {
  id: string; name: string; brand?: string | null; description?: string | null
  thumbnail_url?: string | null
  owner?: { id: string; first_name_th: string; last_name_th: string; nickname?: string | null } | null
}
type FormState = {
  id?: string; name: string; brand: string; description: string; thumbnail_url: string | null
}
const EMPTY_FORM: FormState = { name: "", brand: "", description: "", thumbnail_url: null }

export default function ChannelsManager({ basePath }: { basePath: string }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")

  const load = async () => {
    setLoading(true)
    const d = await fetch("/api/training/channels").then(r => r.json())
    setChannels(d.channels ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return channels
    return channels.filter(c =>
      [c.name, c.brand ?? "", c.description ?? "", c.owner?.first_name_th ?? "", c.owner?.last_name_th ?? ""]
        .join(" ").toLowerCase().includes(q)
    )
  }, [channels, query])

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

  const del = async (id: string) => {
    if (!confirm("ลบช่องนี้?")) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/training/channels?id=${id}`, { method: "DELETE" })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("ลบแล้ว", { id: t }); await load()
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
          <p className="text-slate-400 text-sm">{filtered.length} / {channels.length} ช่อง</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
            <Plus size={14} /> สร้างช่องใหม่
          </button>
        </div>
      </div>

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
          <Layers size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{query ? "ไม่พบช่อง" : "ยังไม่มีช่อง"}</p>
          <p className="text-xs text-slate-400 mt-1">{query ? "ลองเปลี่ยนคำค้นหา" : "กดสร้างช่องใหม่เพื่อเริ่มต้น"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(ch => (
            <div key={ch.id} className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="relative h-28 bg-slate-100 overflow-hidden">
                {ch.thumbnail_url ? (
                  <img src={ch.thumbnail_url} alt={ch.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <Layers size={32} className="text-indigo-300" />
                  </div>
                )}
                {ch.brand && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/95 backdrop-blur rounded-full text-[10px] font-black text-indigo-700">
                    {ch.brand}
                  </span>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(ch)}
                    className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow text-slate-700" title="แก้ไข">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => del(ch.id)}
                    className="p-1.5 bg-rose-500/90 hover:bg-rose-500 rounded-lg shadow text-white" title="ลบ">
                    <Trash2 size={12} />
                  </button>
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
                <Link href={`${basePath}/courses?channel_id=${ch.id}`}
                  className="mt-3 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                  ดูคอร์สในช่องนี้ →
                </Link>
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
    </div>
  )
}
