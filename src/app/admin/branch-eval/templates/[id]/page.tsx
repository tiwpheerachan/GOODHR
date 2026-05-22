"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, Trash2, Loader2, Edit2, Save, X, Layers,
  GripVertical, FileText, Check,
} from "lucide-react"
import toast from "react-hot-toast"

type Item = {
  id: string; order_no: number; code: string
  question_th: string; question_en?: string
  sub_notes: string[]; weight: number
  answer_type: "yes_no" | "score_1_5" | "text" | "number"
  requires_note: boolean; requires_photo: boolean
}

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [tpl, setTpl] = useState<any>(null)
  const [items, setItems] = useState<Item[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Item | null>(null)
  const [headerEdit, setHeaderEdit] = useState({ name: "", description: "" })

  const load = async () => {
    setLoading(true)
    const [m, t] = await Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch(`/api/branch-eval/templates?id=${id}&with_items=1`).then(r => r.json()),
    ])
    setMe(m); setTpl(t.template); setItems(t.template?.items ?? [])
    if (t.template) setHeaderEdit({ name: t.template.name, description: t.template.description ?? "" })
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  if (loading) return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse mb-3" />
      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
    </div>
  )

  if (!tpl) return <div className="p-6 text-center text-slate-400">ไม่พบเทมเพลต</div>

  const canManage = me?.is_eval_admin || me?.is_base_admin

  const saveHeader = async () => {
    const t = toast.loading("บันทึก...")
    await fetch("/api/branch-eval/templates", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...headerEdit }),
    })
    toast.success("บันทึกแล้ว", { id: t })
    await load()
  }

  const addItem = async () => {
    const next: Item = {
      id: "",
      order_no: (items[items.length - 1]?.order_no ?? 0) + 1,
      code: String((items[items.length - 1]?.order_no ?? 0) + 1),
      question_th: "ข้อใหม่ (กดเพื่อแก้)",
      question_en: "",
      sub_notes: [], weight: 1, answer_type: "yes_no",
      requires_note: false, requires_photo: false,
    }
    const res = await fetch("/api/branch-eval/template-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: id, question_th: next.question_th, weight: next.weight,
        order_no: next.order_no, code: next.code,
      }),
    })
    if (res.ok) await load()
  }

  const saveItem = async (it: Item) => {
    const res = await fetch("/api/branch-eval/template-items", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: it.id,
        code: it.code, question_th: it.question_th, question_en: it.question_en,
        sub_notes: it.sub_notes, weight: it.weight, answer_type: it.answer_type,
        requires_note: it.requires_note, requires_photo: it.requires_photo,
        order_no: it.order_no,
      }),
    })
    if (res.ok) { setEditing(null); await load() }
  }

  const delItem = async (it: Item) => {
    if (!confirm(`ลบข้อ "${it.question_th.slice(0, 40)}"?`)) return
    await fetch(`/api/branch-eval/template-items?id=${it.id}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-3 pb-32">
      <Link href="/admin/branch-eval/templates" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> เทมเพลต
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Layers size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <input value={headerEdit.name} disabled={!canManage}
              onChange={e => setHeaderEdit(h => ({ ...h, name: e.target.value }))}
              onBlur={canManage ? saveHeader : undefined}
              className="text-2xl font-black bg-transparent w-full outline-none text-slate-800 disabled:opacity-70" />
            <textarea value={headerEdit.description} disabled={!canManage}
              onChange={e => setHeaderEdit(h => ({ ...h, description: e.target.value }))}
              onBlur={canManage ? saveHeader : undefined}
              rows={1} placeholder="คำอธิบายเทมเพลต"
              className="text-xs text-slate-500 bg-transparent w-full outline-none resize-none disabled:opacity-70" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{items.length} ข้อ</span>
            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">รวม {tpl.total_weight} คะแนน</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            {editing?.id === it.id ? (
              <ItemEditor item={editing} onChange={setEditing}
                onSave={() => saveItem(editing)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">{it.code}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{it.question_th}</p>
                  {it.question_en && <p className="text-[11px] text-slate-400 mt-0.5">{it.question_en}</p>}
                  {it.sub_notes.length > 0 && (
                    <ul className="mt-1 pl-3 text-[11px] text-slate-500 space-y-0.5 list-disc">
                      {it.sub_notes.slice(0, 3).map((n, i) => <li key={i} className="line-clamp-1">{n}</li>)}
                    </ul>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">{it.weight}p</span>
                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded font-bold">
                      {it.answer_type === "yes_no" ? "✓/✗"
                        : it.answer_type === "score_1_5" ? "1-5"
                        : it.answer_type === "text" ? "ข้อความ"
                        : "ตัวเลข"}
                    </span>
                    {it.requires_note && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">บังคับ note</span>}
                    {it.requires_photo && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">บังคับรูป</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(it)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"><Edit2 size={12} /></button>
                    <button onClick={() => delItem(it)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {canManage && (
          <button onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-700 inline-flex items-center justify-center gap-1.5 transition">
            <Plus size={14} /> เพิ่มข้อใหม่
          </button>
        )}
      </div>
    </div>
  )
}

function ItemEditor({ item, onChange, onSave, onCancel }: {
  item: Item
  onChange: (it: Item) => void
  onSave: () => void
  onCancel: () => void
}) {
  const [notesText, setNotesText] = useState(item.sub_notes.join("\n"))
  useEffect(() => { setNotesText(item.sub_notes.join("\n")) }, [item.id])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <input value={item.code} onChange={e => onChange({ ...item, code: e.target.value })}
          placeholder="#" className="w-12 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-black text-center outline-none" />
        <input type="number" value={item.weight}
          onChange={e => onChange({ ...item, weight: Number(e.target.value) })}
          placeholder="weight" className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-center outline-none" />
        <select value={item.answer_type}
          onChange={e => onChange({ ...item, answer_type: e.target.value as any })}
          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none">
          <option value="yes_no">YES / NO</option>
          <option value="score_1_5">คะแนน 1-5</option>
          <option value="text">ข้อความ</option>
          <option value="number">ตัวเลข</option>
        </select>
      </div>
      <input value={item.question_th} onChange={e => onChange({ ...item, question_th: e.target.value })}
        placeholder="คำถาม (ภาษาไทย)" autoFocus
        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold outline-none focus:border-indigo-400" />
      <input value={item.question_en ?? ""} onChange={e => onChange({ ...item, question_en: e.target.value })}
        placeholder="Question (English) — optional"
        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400" />
      <textarea value={notesText} onChange={e => {
          setNotesText(e.target.value)
          onChange({ ...item, sub_notes: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })
        }}
        rows={3} placeholder="bullet points 1 บรรทัด = 1 หัวข้อย่อย"
        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-indigo-400 resize-none" />
      <div className="flex items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={item.requires_note}
            onChange={e => onChange({ ...item, requires_note: e.target.checked })}
            className="accent-amber-500" />
          บังคับ note
        </label>
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={item.requires_photo}
            onChange={e => onChange({ ...item, requires_photo: e.target.checked })}
            className="accent-amber-500" />
          บังคับรูป
        </label>
        <div className="ml-auto flex gap-1.5">
          <button onClick={onCancel} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold">ยกเลิก</button>
          <button onClick={onSave} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold inline-flex items-center gap-1">
            <Save size={11} /> บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}
