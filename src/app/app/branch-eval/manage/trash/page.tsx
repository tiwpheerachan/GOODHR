"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Trash2, RotateCcw, Layers, FileText, AlertTriangle,
  Loader2, Store,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function TrashPage() {
  const [tab, setTab] = useState<"templates" | "evaluations">("templates")
  const [templates, setTemplates] = useState<any[]>([])
  const [evals, setEvals] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [t, e, m] = await Promise.all([
      fetch("/api/branch-eval/templates?deleted=1").then(r => r.json()),
      fetch("/api/branch-eval/evaluations?deleted=1").then(r => r.json()),
      fetch("/api/branch-eval/me").then(r => r.json()),
    ])
    setTemplates(t.templates ?? [])
    setEvals(e.evaluations ?? [])
    setMe(m)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const restoreTemplate = async (id: string) => {
    const t = toast.loading("กำลังกู้คืน...")
    const res = await fetch("/api/branch-eval/templates", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deleted_at: null }),
    })
    if (!res.ok) { toast.error("กู้คืนไม่สำเร็จ", { id: t }); return }
    toast.success("กู้คืนแล้ว", { id: t })
    await load()
  }

  const hardDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`ลบ "${name}" ถาวร?\n(พร้อม items + evaluations ทั้งหมด — กู้คืนไม่ได้)`)) return
    const t = toast.loading("กำลังลบถาวร...")
    const res = await fetch(`/api/branch-eval/templates?id=${id}&hard=1`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบถาวรแล้ว", { id: t })
    await load()
  }

  const restoreEval = async (id: string) => {
    const t = toast.loading("กำลังกู้คืน...")
    const res = await fetch("/api/branch-eval/evaluations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deleted_at: null }),
    })
    if (!res.ok) { toast.error("กู้คืนไม่สำเร็จ", { id: t }); return }
    toast.success("กู้คืนแล้ว", { id: t })
    await load()
  }

  const hardDeleteEval = async (id: string) => {
    if (!confirm("ลบฟอร์มนี้ถาวร? (กู้คืนไม่ได้)")) return
    const t = toast.loading("กำลังลบถาวร...")
    const res = await fetch(`/api/branch-eval/evaluations?id=${id}&hard=1`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบถาวรแล้ว", { id: t })
    await load()
  }

  if (!me?.is_eval_admin && !me?.is_base_admin) return (
    <div className="p-6 text-center text-slate-400">เฉพาะ Branch Eval Admin</div>
  )

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/app/branch-eval/manage" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> จัดการระบบ
      </Link>

      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Trash2 size={20} className="text-rose-500" /> ถังขยะ
        </h2>
        <p className="text-slate-400 text-sm">{templates.length} เทมเพลต · {evals.length} ฟอร์ม รอกู้คืน / ลบถาวร</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("templates")}
          className={`px-4 py-2 rounded-xl text-sm font-bold border ${tab === "templates" ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
          <Layers size={13} className="inline mr-1" /> เทมเพลต ({templates.length})
        </button>
        <button onClick={() => setTab("evaluations")}
          className={`px-4 py-2 rounded-xl text-sm font-bold border ${tab === "evaluations" ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
          <FileText size={13} className="inline mr-1" /> ฟอร์ม ({evals.length})
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center"><Loader2 size={22} className="mx-auto animate-spin text-slate-300" /></div>
      )}

      {!loading && tab === "templates" && (
        <div className="space-y-2">
          {templates.length === 0 ? (
            <Empty msg="ไม่มีเทมเพลตในถังขยะ" />
          ) : templates.map((t: any) => (
            <div key={t.id} className="bg-white border border-rose-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Layers size={16} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">{t.name}</p>
                <p className="text-[10px] text-slate-400">ลบเมื่อ {format(new Date(t.deleted_at), "d MMM yyyy HH:mm", { locale: th })} · {t.total_weight} คะแนน</p>
              </div>
              <button onClick={() => restoreTemplate(t.id)} className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1">
                <RotateCcw size={11} /> กู้คืน
              </button>
              <button onClick={() => hardDeleteTemplate(t.id, t.name)} className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg inline-flex items-center gap-1">
                <Trash2 size={11} /> ลบถาวร
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "evaluations" && (
        <div className="space-y-2">
          {evals.length === 0 ? (
            <Empty msg="ไม่มีฟอร์มในถังขยะ" />
          ) : evals.map((ev: any) => (
            <div key={ev.id} className="bg-white border border-rose-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Store size={16} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{ev.branch?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {ev.template?.name} · ลบเมื่อ {format(new Date(ev.deleted_at), "d MMM yyyy HH:mm", { locale: th })}
                  {ev.evaluator && <> · {ev.evaluator.first_name_th}</>}
                </p>
              </div>
              <button onClick={() => restoreEval(ev.id)} className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1">
                <RotateCcw size={11} /> กู้คืน
              </button>
              <button onClick={() => hardDeleteEval(ev.id)} className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg inline-flex items-center gap-1">
                <Trash2 size={11} /> ลบถาวร
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
      <AlertTriangle size={28} className="mx-auto mb-2 text-slate-300" />
      <p className="text-sm font-bold text-slate-500">{msg}</p>
    </div>
  )
}
