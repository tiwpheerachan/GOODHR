"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Layers, Plus, ArrowLeft, Trash2, X, Check,
  FileText, ChevronRight, RefreshCw,
} from "lucide-react"
import toast from "react-hot-toast"

export default function ManageTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/templates?with_items=1").then(r => r.json()),
    ]).then(([m, t]) => { setMe(m); setTemplates(t.templates ?? []) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const canManage = me?.is_eval_admin || me?.is_base_admin

  const create = async () => {
    if (!form.name.trim()) { toast.error("ตั้งชื่อก่อน"); return }
    const t = toast.loading("กำลังสร้าง...")
    const res = await fetch("/api/branch-eval/templates", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("สร้างเทมเพลตแล้ว", { id: t })
    setShowNew(false); setForm({ name: "", description: "" })
    window.location.href = `/app/branch-eval/manage/templates/${d.id}`
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`ลบเทมเพลต "${name}"?\n(แบบ soft delete — กู้คืนได้)`)) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/branch-eval/templates?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบแล้ว", { id: t }); await load()
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/app/branch-eval/manage" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> จัดการระบบ
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">เทมเพลต (Templates)</h2>
          <p className="text-slate-400 text-sm">{templates.length} เทมเพลต</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
            <RefreshCw size={12} />
          </button>
          {canManage && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
              <Plus size={14} /> สร้างเทมเพลต
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Layers size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">ยังไม่มีเทมเพลต</p>
          <p className="text-xs text-slate-400 mt-1">กดสร้างเทมเพลตเพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t: any) => (
            <Link key={t.id} href={`/app/branch-eval/manage/templates/${t.id}`}
              className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                {canManage && (
                  <button onClick={(e) => { e.preventDefault(); del(t.id, t.name) }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="font-black text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-1">{t.name}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 min-h-[2.5rem]">
                {t.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
              </p>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-md font-bold">
                  <FileText size={9} /> {t.items?.length ?? 0} ข้อ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                  รวม {t.total_weight} คะแนน
                </span>
                <span className="ml-auto text-[9px] text-slate-400">v{t.version}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-indigo-600 group-hover:text-indigo-700">
                <span>เปิดเทมเพลต</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" />
              <h3 className="font-black flex-1">สร้างเทมเพลตใหม่</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-bold mb-1">ชื่อเทมเพลต *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น Anker Store Visit Checklist"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold mb-1">คำอธิบาย</p>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={create} className="px-4 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5">
                <Check size={13} /> สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
