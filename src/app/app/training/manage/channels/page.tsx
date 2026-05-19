"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Layers, Trash2, X, Check, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function ChannelsManagePage() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: "", brand: "", description: "" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/training/channels")
    const d = await r.json()
    setChannels(d.channels ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name.trim()) { toast.error("กรุณาตั้งชื่อ"); return }
    setSaving(true)
    const t = toast.loading("กำลังสร้าง...")
    const r = await fetch("/api/training/channels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { toast.error(d.error, { id: t }); return }
    toast.success("สร้างแล้ว", { id: t })
    setShowNew(false); setForm({ name: "", brand: "", description: "" })
    await load()
  }

  const del = async (id: string) => {
    if (!confirm("ลบช่องนี้?")) return
    await fetch(`/api/training/channels?id=${id}`, { method: "DELETE" })
    toast.success("ลบแล้ว"); await load()
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4 pb-32">
      <Link href="/app/training/manage" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> จัดการเนื้อหา
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">ช่อง (Channels)</h1>
          <p className="text-xs text-slate-500 mt-1">{channels.length} ช่อง</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 lg:px-4 lg:py-2.5 bg-sky-600 text-white rounded-xl text-xs lg:text-sm font-bold hover:bg-sky-700 shadow-sm">
          <Plus size={14} /> สร้างช่อง
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-400" /></div>
      ) : channels.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
          <Layers size={32} className="mx-auto mb-2 text-slate-200" />
          <p className="text-sm">ยังไม่มีช่อง — กด "สร้างช่อง" ด้านบน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map(ch => (
            <div key={ch.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-24 bg-gradient-to-br from-sky-500 to-indigo-500 relative flex items-center justify-center">
                <Layers size={28} className="text-white/60" />
                {ch.brand && <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 rounded-full text-[10px] font-black text-sky-700">{ch.brand}</span>}
              </div>
              <div className="p-3">
                <p className="font-black text-slate-800 truncate">{ch.name}</p>
                {ch.description && <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{ch.description}</p>}
                <div className="flex gap-1.5 mt-3">
                  <Link href={`/app/training/manage/courses?channel_id=${ch.id}`}
                    className="flex-1 text-center text-xs font-bold text-sky-600 py-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg">
                    คอร์ส
                  </Link>
                  <button onClick={() => del(ch.id)} className="px-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">สร้างช่องใหม่</h2>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
            </div>
            <Field label="ชื่อช่อง *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="เช่น Marketing" /></Field>
            <Field label="แบรนด์"><input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inp} placeholder="(ถ้ามี)" /></Field>
            <Field label="คำอธิบาย"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inp} /></Field>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">ยกเลิก</button>
              <button onClick={create} disabled={saving} className="flex-1 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inp = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
function Field({ label, children }: any) {
  return <div><p className="text-xs font-bold text-slate-500 mb-1">{label}</p>{children}</div>
}
