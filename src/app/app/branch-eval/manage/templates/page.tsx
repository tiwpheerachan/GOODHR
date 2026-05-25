"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Layers, Plus, ArrowLeft, Trash2, X, Check,
  FileText, ChevronRight, RefreshCw, Globe, Lock, Copy, Eye,
} from "lucide-react"
import toast from "react-hot-toast"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    name: "", description: "",
    visibility: "public" as "public" | "private",
    clone_from: "" as string,
  })

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
    const t = toast.loading(form.clone_from ? "กำลังก๊อปจากต้นแบบ..." : "กำลังสร้าง...")
    const res = await fetch("/api/branch-eval/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        visibility: form.visibility,
        clone_from: form.clone_from || undefined,
      }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success(form.clone_from ? `ก๊อปแล้ว ${d.cloned_items} ข้อ` : "สร้างเทมเพลตแล้ว", { id: t })
    setShowNew(false)
    setForm({ name: "", description: "", visibility: "public", clone_from: "" })
    window.location.href = `/app/branch-eval/manage/templates/${d.id}`
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`ลบเทมเพลต "${name}"?\n(แบบ soft delete — กู้คืนได้)`)) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/branch-eval/templates?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบแล้ว", { id: t }); await load()
  }

  const cloneFrom = (t: any) => {
    setForm({
      name: `${t.name} (copy)`,
      description: t.description ?? "",
      visibility: t.visibility ?? "public",
      clone_from: t.id,
    })
    setShowNew(true)
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
            <button onClick={() => { setForm({ name: "", description: "", visibility: "public", clone_from: "" }); setShowNew(true) }}
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
                <div className="flex items-center gap-1">
                  {canManage && (
                    <>
                      <button onClick={(e) => { e.preventDefault(); cloneFrom(t) }}
                        title="ก๊อปเป็น template ใหม่"
                        className="p-1.5 text-sky-500 hover:bg-sky-50 rounded opacity-0 group-hover:opacity-100 transition">
                        <Copy size={12} />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); del(t.id, t.name) }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-black text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-1 flex-1">{t.name}</p>
                {t.visibility === "private" ? (
                  <span title="ส่วนตัว" className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <Lock size={8} /> ส่วนตัว
                  </span>
                ) : (
                  <span title="สาธารณะ" className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    <Globe size={8} /> สาธารณะ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 min-h-[2.5rem]">
                {t.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
              </p>
              {t.owner && (
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  เจ้าของ: {t.owner.first_name_th} {t.owner.last_name_th}
                </p>
              )}
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
        <NewTemplateModal
          form={form} setForm={setForm}
          templates={templates}
          onClose={() => setShowNew(false)}
          onCreate={create}
        />
      )}
    </div>
  )
}

function NewTemplateModal({ form, setForm, templates, onClose, onCreate }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Layers size={16} className="text-indigo-600" />
          <h3 className="font-black flex-1">{form.clone_from ? "ก๊อปเทมเพลต" : "สร้างเทมเพลตใหม่"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <p className="text-xs font-bold mb-1">ชื่อเทมเพลต *</p>
            <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
              placeholder="เช่น Anker Store Visit Checklist" autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </div>

          <div>
            <p className="text-xs font-bold mb-1">คำอธิบาย</p>
            <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
          </div>

          {/* ── Clone จากต้นแบบ ── */}
          <div>
            <p className="text-xs font-bold mb-1">ก๊อปจากต้นแบบ (optional)</p>
            <select value={form.clone_from}
              onChange={e => setForm((f: any) => ({ ...f, clone_from: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">— เริ่มจากศูนย์ —</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.items?.length ?? 0} ข้อ)</option>
              ))}
            </select>
            {form.clone_from && (
              <p className="text-[10px] text-sky-600 mt-1 flex items-center gap-1">
                <Copy size={10} /> จะ copy ข้อ + section + weight ทั้งหมด — แก้/ลบได้ภายหลัง
              </p>
            )}
          </div>

          {/* ── Visibility ── */}
          <div>
            <p className="text-xs font-bold mb-1.5">ใครเห็นได้บ้าง</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => setForm((f: any) => ({ ...f, visibility: "public" }))}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  form.visibility === "public"
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Globe size={13} className="text-emerald-600" />
                  <p className="font-black text-sm">สาธารณะ</p>
                </div>
                <p className="text-[10px] text-slate-500">ทุกคนที่มีสิทธิ์ branch eval เห็น</p>
              </button>
              <button type="button"
                onClick={() => setForm((f: any) => ({ ...f, visibility: "private" }))}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  form.visibility === "private"
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Lock size={13} className="text-amber-600" />
                  <p className="font-black text-sm">ส่วนตัว</p>
                </div>
                <p className="text-[10px] text-slate-500">เฉพาะเจ้าของ + คนที่ระบุ + admin</p>
              </button>
            </div>
            {form.visibility === "private" && (
              <p className="text-[10px] text-amber-700 mt-1.5">
                💡 เพิ่มคนเห็นได้ภายหลังในหน้าแก้ template (ช่อง "เผยแพร่ให้")
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
          <button onClick={onCreate} className="px-4 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5">
            <Check size={13} /> {form.clone_from ? "ก๊อปและสร้าง" : "สร้าง"}
          </button>
        </div>
      </div>
    </div>
  )
}
