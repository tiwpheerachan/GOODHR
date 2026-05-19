"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Layers, Loader2, Trash2, Edit2, X, Check, Search, Sparkles, Tv, ArrowLeft, Image as ImageIcon } from "lucide-react"
import toast from "react-hot-toast"
import CoverImageUpload from "@/components/training/CoverImageUpload"

type Channel = {
  id: string; name: string; brand?: string | null; description?: string | null
  thumbnail_url?: string | null
  owner?: { id: string; first_name_th: string; last_name_th: string; nickname?: string | null } | null
}

type FormState = {
  id?: string
  name: string
  brand: string
  description: string
  thumbnail_url: string | null
}

const EMPTY_FORM: FormState = { name: "", brand: "", description: "", thumbnail_url: null }

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/training/channels")
    const d = await res.json()
    setChannels(d.channels ?? [])
    setLoading(false)
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
    setForm({
      id: ch.id, name: ch.name,
      brand: ch.brand ?? "",
      description: ch.description ?? "",
      thumbnail_url: ch.thumbnail_url ?? null,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error("กรุณาตั้งชื่อช่อง"); return }
    setSaving(true)
    const t = toast.loading(form.id ? "กำลังบันทึก..." : "กำลังสร้าง...")
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        description: form.description.trim() || null,
        thumbnail_url: form.thumbnail_url,
      }
      const res = await fetch("/api/training/channels", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(form.id ? "บันทึกแล้ว" : "สร้างช่องแล้ว", { id: t })
      setShowModal(false); setForm(EMPTY_FORM)
      await load()
    } catch (e: any) { toast.error(e.message, { id: t }) }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm("ลบช่องนี้?")) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/training/channels?id=${id}`, { method: "DELETE" })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("ลบแล้ว", { id: t })
    await load()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 lg:p-8 text-white shadow-2xl anim-fade-up">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-fuchsia-300/30 blur-3xl anim-float" />
        <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" style={{ animation: "floatY 4s ease-in-out infinite" }} />
        <div className="absolute top-6 right-24 w-2 h-2 bg-white rounded-full opacity-70 anim-pulse-glow" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/training" className="p-2 bg-white/15 backdrop-blur-xl rounded-xl hover:bg-white/25 transition-colors border border-white/20">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center anim-float border border-white/20 shadow-lg">
              <Tv size={32} className="drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2 anim-slide-in">
                <Sparkles size={12} className="opacity-80" />
                <span className="text-[10px] font-black tracking-[0.2em] opacity-90">CHANNELS</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black mt-1 drop-shadow">ช่อง (Channels)</h1>
              <p className="text-xs opacity-90 mt-1">จัดกลุ่มคอร์ส · แยกตามแบรนด์ / ทีม / แผนก · ทั้งหมด {channels.length} ช่อง</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl text-sm font-black shadow-lg shadow-indigo-900/20 transition-all card-lift">
            <Plus size={16} /> สร้างช่องใหม่
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative anim-fade-up">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาช่อง · แบรนด์ · เจ้าของ..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 shadow-sm" />
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton rounded-3xl h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center anim-fade-up">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center anim-float">
            <Layers size={36} className="text-indigo-500" />
          </div>
          <p className="font-black text-slate-700 mb-1">{query ? "ไม่พบช่องที่ค้นหา" : "ยังไม่มีช่อง"}</p>
          <p className="text-xs text-slate-400">{query ? "ลองเปลี่ยนคำค้นหา" : "กดสร้างช่องใหม่ด้านบนเพื่อเริ่มต้น"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 anim-stagger">
          {filtered.map(ch => (
            <div key={ch.id}
              className="group relative bg-white border border-slate-200 rounded-3xl overflow-hidden card-lift">
              {/* Cover */}
              <div className="relative h-44 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 overflow-hidden">
                {ch.thumbnail_url ? (
                  <img src={ch.thumbnail_url} alt={ch.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Layers size={56} className="text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  {ch.brand ? (
                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur rounded-full text-[10px] font-black text-indigo-700 shadow-sm">
                      {ch.brand}
                    </span>
                  ) : <span />}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Bottom title */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-black text-white text-lg drop-shadow-lg line-clamp-1">{ch.name}</p>
                  {ch.owner && (
                    <p className="text-[11px] text-white/90 mt-0.5 drop-shadow">
                      เจ้าของ: {ch.owner.first_name_th} {ch.owner.last_name_th}
                    </p>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                  {ch.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
                </p>
                <Link href={`/admin/training/courses?channel_id=${ch.id}`}
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs font-black text-white py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all">
                  ดูคอร์สในช่องนี้ →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create/Edit modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade-up" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv size={18} />
                <h2 className="text-lg font-black">{form.id ? "แก้ไขช่อง" : "สร้างช่องใหม่"}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Cover upload */}
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <ImageIcon size={12} /> ภาพปกช่อง
                </p>
                <CoverImageUpload
                  value={form.thumbnail_url}
                  onChange={url => setForm(f => ({ ...f, thumbnail_url: url }))}
                  aspectRatio="16:9"
                  label="ภาพปกช่อง"
                  height="h-40"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">ชื่อช่อง *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="เช่น Marketing, Sales..." />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">แบรนด์</p>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="(ถ้าผูกกับแบรนด์)" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">คำอธิบาย</p>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  placeholder="อธิบายช่อง — เนื้อหา / เป้าหมาย / กลุ่มเป้าหมาย" />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex gap-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-200">
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
