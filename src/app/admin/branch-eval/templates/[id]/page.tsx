"use client"
import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, Trash2, Loader2, Edit2, Save, X, Layers,
  GripVertical, FileText, Check, Upload, ClipboardPaste, Download,
  Heading, ChevronRight as ChevronRightIcon,
  Globe, Lock, Users, User as UserIcon, Search,
} from "lucide-react"
import { createClient as createSbClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"

type Item = {
  id: string; order_no: number; code: string
  question_th: string; question_en?: string
  sub_notes: string[]; weight: number
  answer_type: "yes_no" | "score_1_5" | "text" | "number"
  requires_note: boolean; requires_photo: boolean
  is_section?: boolean
}

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [tpl, setTpl] = useState<any>(null)
  const [items, setItems] = useState<Item[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Item | null>(null)
  const [headerEdit, setHeaderEdit] = useState({ name: "", description: "" })
  const [showImport, setShowImport] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [m, t] = await Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch(`/api/branch-eval/templates?id=${id}&with_items=1&with_viewers=1`).then(r => r.json()),
    ])
    setMe(m); setTpl(t.template); setItems(t.template?.items ?? [])
    if (t.template) setHeaderEdit({ name: t.template.name, description: t.template.description ?? "" })
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  const toggleVisibility = async () => {
    if (!tpl) return
    const newVis = tpl.visibility === "private" ? "public" : "private"
    const t = toast.loading("กำลังเปลี่ยน...")
    const res = await fetch("/api/branch-eval/templates", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visibility: newVis }),
    })
    if (!res.ok) { toast.error("ไม่สำเร็จ", { id: t }); return }
    toast.success(`เปลี่ยนเป็น ${newVis === "private" ? "ส่วนตัว" : "สาธารณะ"}`, { id: t })
    await load()
  }

  const saveViewers = async (viewer_ids: string[]) => {
    const t = toast.loading("กำลังบันทึก...")
    const res = await fetch("/api/branch-eval/templates", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, viewer_ids }),
    })
    if (!res.ok) { toast.error("ไม่สำเร็จ", { id: t }); return }
    toast.success("บันทึกแล้ว", { id: t })
    setShowViewers(false); await load()
  }

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
    const lastOrder = items[items.length - 1]?.order_no ?? 0
    const res = await fetch("/api/branch-eval/template-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: id,
        question_th: "ข้อใหม่ (กดเพื่อแก้)",
        weight: 1, order_no: lastOrder + 1, code: String(lastOrder + 1),
      }),
    })
    if (res.ok) await load()
  }

  const addSection = async () => {
    const lastOrder = items[items.length - 1]?.order_no ?? 0
    const res = await fetch("/api/branch-eval/template-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: id,
        question_th: "หัวข้อหลัก (กดเพื่อแก้)",
        is_section: true, weight: 0,
        order_no: lastOrder + 1, code: "",
      }),
    })
    if (res.ok) await load()
  }

  // ── Drag-and-drop reorder ──
  const onDragStart = (e: React.DragEvent, itemId: string) => {
    setDragId(itemId)
    e.dataTransfer.effectAllowed = "move"
  }
  const onDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    if (itemId !== dragOverId) setDragOverId(itemId)
  }
  const onDragEnd = () => { setDragId(null); setDragOverId(null) }
  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { onDragEnd(); return }
    const srcIdx = items.findIndex(i => i.id === dragId)
    const dstIdx = items.findIndex(i => i.id === targetId)
    if (srcIdx < 0 || dstIdx < 0) { onDragEnd(); return }

    // optimistic UI
    const next = [...items]
    const [moved] = next.splice(srcIdx, 1)
    next.splice(dstIdx, 0, moved)
    // เรียง order_no ใหม่ 1..N
    const reordered = next.map((it, i) => ({ ...it, order_no: i + 1 }))
    setItems(reordered)
    onDragEnd()

    // persist (bulk reorder)
    await fetch("/api/branch-eval/template-items", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorder: reordered.map(it => ({ id: it.id, order_no: it.order_no })),
      }),
    })
    await load()
  }

  const saveItem = async (it: Item) => {
    const res = await fetch("/api/branch-eval/template-items", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: it.id,
        code: it.code, question_th: it.question_th, question_en: it.question_en,
        sub_notes: it.sub_notes, weight: it.weight, answer_type: it.answer_type,
        requires_note: it.requires_note, requires_photo: it.requires_photo,
        order_no: it.order_no, is_section: !!it.is_section,
      }),
    })
    if (res.ok) { setEditing(null); await load() }
  }

  const delItem = async (it: Item) => {
    if (!confirm(`ลบข้อ "${it.question_th.slice(0, 40)}"?`)) return
    await fetch(`/api/branch-eval/template-items?id=${it.id}`, { method: "DELETE" })
    await load()
  }

  const downloadCsv = () => {
    const csv = buildCsv(tpl?.name ?? "template", items)
    // BOM (﻿) สำหรับ Excel เปิดภาษาไทยถูก encoding
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(tpl?.name ?? "template").replace(/[^\w฀-๿-]+/g, "_")}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`ดาวน์โหลด ${items.length} ข้อแล้ว`)
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

        {/* ── Visibility + owner panel ── */}
        <div className={`rounded-xl p-2.5 border ${
          tpl.visibility === "private" ? "bg-amber-50/60 border-amber-200" : "bg-emerald-50/60 border-emerald-200"
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${
              tpl.visibility === "private" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
            }`}>
              {tpl.visibility === "private" ? <><Lock size={11} /> ส่วนตัว</> : <><Globe size={11} /> สาธารณะ</>}
            </span>
            <p className="text-[11px] text-slate-600 flex-1 min-w-0">
              {tpl.visibility === "private"
                ? <>เห็นได้เฉพาะ: เจ้าของ + Admin + {tpl.viewers?.length ?? 0} คนที่ระบุ</>
                : "ทุกคนที่มีสิทธิ์ branch eval เห็น"}
            </p>
            {tpl.owner && (
              <span className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                <UserIcon size={9} /> {tpl.owner.first_name_th} {tpl.owner.last_name_th}
              </span>
            )}
            {canManage && (
              <div className="flex gap-1.5">
                <button onClick={toggleVisibility}
                  className="text-[11px] px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-bold">
                  เปลี่ยนเป็น {tpl.visibility === "private" ? "สาธารณะ" : "ส่วนตัว"}
                </button>
                {tpl.visibility === "private" && (
                  <button onClick={() => setShowViewers(true)}
                    className="text-[11px] px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold inline-flex items-center gap-1">
                    <Users size={11} /> จัดการคนเห็น ({tpl.viewers?.length ?? 0})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map(it => {
          const isOver = dragOverId === it.id && dragId !== it.id
          const isDragging = dragId === it.id

          if (it.is_section) {
            return (
              <div key={it.id}
                draggable={canManage}
                onDragStart={(e) => onDragStart(e, it.id)}
                onDragOver={(e) => onDragOver(e, it.id)}
                onDrop={(e) => onDrop(e, it.id)}
                onDragEnd={onDragEnd}
                className={`bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl p-3 shadow-sm transition ${
                  isOver ? "ring-4 ring-amber-300" : ""
                } ${isDragging ? "opacity-40" : ""}`}>
                {editing?.id === it.id ? (
                  <ItemEditor item={editing} onChange={setEditing}
                    onSave={() => saveItem(editing)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex items-center gap-2.5 text-white">
                    {canManage && <GripVertical size={14} className="opacity-60 cursor-move flex-shrink-0" />}
                    <Heading size={16} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">หัวข้อหลัก</p>
                      <p className="text-base font-black truncate">{it.question_th}</p>
                      {it.question_en && <p className="text-[11px] opacity-80 truncate">{it.question_en}</p>}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(it)} className="p-1.5 text-white hover:bg-white/20 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => delItem(it)} className="p-1.5 text-white hover:bg-white/20 rounded"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={it.id}
              draggable={canManage}
              onDragStart={(e) => onDragStart(e, it.id)}
              onDragOver={(e) => onDragOver(e, it.id)}
              onDrop={(e) => onDrop(e, it.id)}
              onDragEnd={onDragEnd}
              className={`bg-white border border-slate-100 rounded-xl p-3 shadow-sm transition ${
                isOver ? "ring-2 ring-indigo-400 border-indigo-300" : ""
              } ${isDragging ? "opacity-40" : ""}`}>
              {editing?.id === it.id ? (
                <ItemEditor item={editing} onChange={setEditing}
                  onSave={() => saveItem(editing)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex items-start gap-2.5">
                  {canManage && (
                    <GripVertical size={14} className="text-slate-300 cursor-move flex-shrink-0 mt-1.5 hover:text-slate-500" />
                  )}
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
          )
        })}

        {canManage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button onClick={addItem}
              className="py-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-700 inline-flex items-center justify-center gap-1.5 transition">
              <Plus size={14} /> เพิ่มข้อ
            </button>
            <button onClick={addSection}
              className="py-3 border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50/30 rounded-xl text-sm font-bold text-violet-700 hover:text-violet-800 inline-flex items-center justify-center gap-1.5 transition">
              <Heading size={14} /> เพิ่มหัวข้อหลัก
            </button>
            <button onClick={() => setShowImport(true)}
              className="py-3 border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center justify-center gap-1.5 transition">
              <ClipboardPaste size={14} /> Import CSV
            </button>
            <button onClick={downloadCsv} disabled={items.length === 0}
              className="py-3 border-2 border-dashed border-sky-200 hover:border-sky-400 hover:bg-sky-50/30 rounded-xl text-sm font-bold text-sky-700 hover:text-sky-800 inline-flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={14} /> ดาวน์โหลด CSV
            </button>
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal templateId={id as string} onClose={() => setShowImport(false)} onDone={async () => { setShowImport(false); await load() }} />
      )}

      {showViewers && (
        <ViewersModal
          current={(tpl.viewers ?? []).map((v: any) => v.employee_id)}
          currentViewers={tpl.viewers ?? []}
          ownerId={tpl.owner_id}
          onClose={() => setShowViewers(false)}
          onSave={saveViewers}
        />
      )}
    </div>
  )
}

function ViewersModal({ current, currentViewers, ownerId, onClose, onSave }: {
  current: string[]; currentViewers: any[]; ownerId?: string | null
  onClose: () => void; onSave: (ids: string[]) => void
}) {
  const supabase = createSbClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set(current))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)")
      .eq("is_active", true).order("first_name_th").limit(1500)
      .then(({ data }) => setEmployees((data ?? []) as any))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return employees.filter((e: any) => {
      if (e.id === ownerId) return false  // owner ไม่ต้องเลือก (เห็นอยู่แล้ว)
      if (!s) return true
      const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname ?? ""} ${e.employee_code ?? ""} ${e.position?.name ?? ""} ${e.department?.name ?? ""}`.toLowerCase()
      return hay.includes(s)
    })
  }, [employees, search, ownerId])

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} />
            <h3 className="font-black">เผยแพร่ template ให้ใคร</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
            💡 เจ้าของ + admin เห็นอยู่แล้วเสมอ — เลือกเฉพาะคนเพิ่มเติม
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่อ / รหัส / แผนก..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3 min-h-0">
          {employees.length === 0 ? (
            <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="mx-auto animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">ไม่พบพนักงาน</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filtered.map((e: any) => {
                const isPicked = selected.has(e.id)
                return (
                  <label key={e.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border-2 transition ${
                      isPicked ? "bg-amber-50 border-amber-300" : "bg-white border-slate-100 hover:border-amber-200"
                    }`}>
                    <input type="checkbox" checked={isPicked} onChange={() => toggle(e.id)}
                      className="w-4 h-4 accent-amber-500" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 flex items-center justify-center font-black text-[10px] overflow-hidden border border-white shadow-sm flex-shrink-0">
                      {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover" /> : (e.first_name_th?.[0] ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{e.first_name_th} {e.last_name_th}
                        {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {e.employee_code} · {e.department?.name ?? "—"}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 justify-end">
          <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[11px] font-black">
            เลือก {selected.size} คน
          </span>
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
          <button onClick={() => { setSaving(true); onSave(Array.from(selected)) }} disabled={saving}
            className="px-4 py-2 text-sm font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ templateId, onClose, onDone }: { templateId: string; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const readFile = (file: File) => {
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast.error("รองรับเฉพาะไฟล์ .csv หรือ .txt")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      let content = String(reader.result ?? "")
      // strip BOM ถ้ามี
      if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1)
      setText(content)
      setFileName(file.name)
      toast.success(`โหลดไฟล์: ${file.name}`)
    }
    reader.onerror = () => toast.error("อ่านไฟล์ไม่สำเร็จ")
    reader.readAsText(file, "utf-8")
  }

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) readFile(f)
    e.target.value = ""  // reset เพื่อเลือกไฟล์เดิมซ้ำได้
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) readFile(f)
  }

  const parse = () => {
    const rows: any[] = []
    const lines = text.split(/\r?\n/)
    let pendingMain: any | null = null

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      // skip comments / headers / titles
      if (line.startsWith("#")) continue
      if (/^store\s*(check\s*list|visit\s*report)/i.test(line)) continue
      if (/^(store|store manager|TOTAL PERCENTAGE)\s*[:：]/i.test(line)) continue
      if (/^store center excellence/i.test(line)) continue

      const cols = splitCsvLine(line)
      const code = (cols[0] ?? "").trim()
      const q    = (cols[1] ?? "").trim()
      const w    = (cols[2] ?? "").trim()

      // skip header row "code,question,weight"
      if (code.toLowerCase() === "code" && /^question/i.test(q)) continue

      // case A0: section header — code = "section" หรือ "##" → หัวข้อหลัก
      if ((/^(section|##)$/i.test(code)) && q) {
        if (pendingMain) { rows.push(pendingMain); pendingMain = null }
        rows.push({
          code: "", question_th: q,
          question_en: null,
          sub_notes: [] as string[],
          weight: 0,
          is_section: true,
        })
        continue
      }

      // case A: row มี code (1, 2, ...) + question + weight → ข้อหลัก
      if (/^\d+$/.test(code) && q) {
        if (pendingMain) rows.push(pendingMain)
        pendingMain = {
          code, question_th: q,
          question_en: null,
          sub_notes: [] as string[],
          weight: Number(w) || 1,
        }
        continue
      }

      // case B: row ที่ code ว่าง + มี q → sub_note / question_en ของข้อปัจจุบัน
      if (!code && q && pendingMain) {
        if (!pendingMain.question_en && /[A-Za-z]/.test(q) && !/[ก-๙]/.test(q)) {
          pendingMain.question_en = q
        } else {
          pendingMain.sub_notes.push(q)
        }
        continue
      }

      // case C: 1 คอลัมน์ — ใช้เป็นคำถามใหม่ ถ้าไม่มีข้อก่อนหน้า
      if (q && !pendingMain) {
        pendingMain = { code: String(rows.length + 1), question_th: q, question_en: null, sub_notes: [], weight: 1 }
      }
    }
    if (pendingMain) rows.push(pendingMain)
    return rows
  }

  const preview = parse()
  const totalWeight = preview.reduce((s, r) => s + Number(r.weight || 0), 0)

  const importNow = async () => {
    if (preview.length === 0) { toast.error("ไม่มีข้อมูล"); return }
    setBusy(true)
    const t = toast.loading("กำลังนำเข้า...")
    try {
      const res = await fetch("/api/branch-eval/template-items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, items: preview }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "นำเข้าไม่สำเร็จ", { id: t }); return }
      toast.success(`นำเข้า ${d.inserted} ข้อ`, { id: t })
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} />
            <h3 className="font-black">Import CSV / วาง checklist</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <p className="font-black text-slate-700 mb-1">รูปแบบที่รองรับ</p>
            <p>• CSV: <code className="bg-white px-1 rounded">code,question_th,weight</code> (column 1=ลำดับ, 2=คำถามไทย, 3=น้ำหนัก)</p>
            <p>• แถวที่ code ว่าง → ใช้เป็นภาษาอังกฤษหรือหัวข้อย่อยของข้อก่อนหน้า</p>
            <p>• ตัดบรรทัด header (STORE CHECK LIST, Store: ...) อัตโนมัติ</p>
          </div>

          {/* ── Upload zone (click + drag-and-drop) ── */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition ${
              dragOver
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30"
            }`}
          >
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={onFilePicked}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload size={20} className="mx-auto mb-1.5 text-emerald-600" />
            <p className="text-xs font-bold text-slate-700">
              {fileName ? <>ไฟล์: <span className="text-emerald-700">{fileName}</span></> : "คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">รองรับ .csv / .txt (≤ 5 MB)</p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
            <p className="relative inline-block px-2 text-[10px] font-bold text-slate-400 bg-white left-1/2 -translate-x-1/2">หรือวาง CSV ในกล่องด้านล่าง</p>
          </div>

          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setFileName(null) }}
            rows={10}
            placeholder={"section,กลุ่ม 1 — Store Setup,\n1,ความสมบูรณ์ของป้าย Anker,3\n,Completeness of Anker logo\n2,การจัดเรียงสินค้าบนผนัง,5\nsection,กลุ่ม 2 — Service,\n3,...,5"}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono outline-none focus:border-emerald-400 resize-y" />

          {preview.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-black text-emerald-800 mb-2">
                Preview: {preview.filter((r: any) => !r.is_section).length} ข้อ · {preview.filter((r: any) => r.is_section).length} หัวข้อหลัก · รวม {totalWeight} คะแนน
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {preview.slice(0, 12).map((r: any, i: number) => (
                  r.is_section ? (
                    <div key={i} className="text-[11px] bg-violet-500 text-white rounded p-1.5 font-black flex items-center gap-1.5">
                      <Heading size={11} /> {r.question_th}
                    </div>
                  ) : (
                    <div key={i} className="text-[11px] bg-white rounded p-1.5 flex items-start gap-2">
                      <span className="font-black text-emerald-700 w-6 flex-shrink-0">{r.code}</span>
                      <span className="flex-1">{r.question_th}</span>
                      <span className="text-emerald-600 font-bold flex-shrink-0">{r.weight}p</span>
                    </div>
                  )
                ))}
                {preview.length > 12 && <p className="text-[10px] text-emerald-700 text-center">... อีก {preview.length - 12} แถว</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
          <button onClick={importNow} disabled={busy || preview.length === 0}
            className="px-4 py-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            นำเข้า {preview.length > 0 ? `${preview.length} ข้อ` : ""}
          </button>
        </div>
      </div>
    </div>
  )
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === "," && !inQ) { out.push(cur); cur = "" }
    else cur += c
  }
  out.push(cur)
  return out
}

// ─────────────────────────────────────────────────────────────
// Build CSV จาก items (รูปแบบเดียวกับที่ ImportModal parse ได้)
//   row หลัก: code,question_th,weight
//   row ย่อย: ,question_en,        ← (อ่านเป็น question_en เพราะมีอักษรอังกฤษ)
//   row ย่อย: ,sub_note,           ← อื่นๆ เป็น sub_note
// ─────────────────────────────────────────────────────────────
function buildCsv(templateName: string, items: Item[]): string {
  const esc = (s: string) => {
    const v = (s ?? "").toString()
    if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r"))
      return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const lines: string[] = []
  lines.push(`# ${templateName}`)
  lines.push("code,question,weight   # code=section → หัวข้อหลัก, code=1..N → ข้อ, code ว่าง → sub_note/EN")
  for (const it of items) {
    if (it.is_section) {
      lines.push(`section,${esc(it.question_th)},`)
      if (it.question_en) lines.push(`,${esc(it.question_en)},`)
    } else {
      lines.push(`${esc(it.code)},${esc(it.question_th)},${it.weight}`)
      if (it.question_en) lines.push(`,${esc(it.question_en)},`)
      for (const n of (it.sub_notes ?? [])) {
        if (n.trim()) lines.push(`,${esc(n)},`)
      }
    }
  }
  return lines.join("\r\n")
}

function ItemEditor({ item, onChange, onSave, onCancel }: {
  item: Item
  onChange: (it: Item) => void
  onSave: () => void
  onCancel: () => void
}) {
  const [notesText, setNotesText] = useState(item.sub_notes.join("\n"))
  useEffect(() => { setNotesText(item.sub_notes.join("\n")) }, [item.id])

  // ── editor สำหรับ "หัวข้อหลัก" (section) ──
  if (item.is_section) {
    return (
      <div className="space-y-2.5 bg-white/95 rounded-lg p-2">
        <div className="text-[10px] font-black text-violet-700 uppercase tracking-widest inline-flex items-center gap-1">
          <Heading size={10} /> แก้ไขหัวข้อหลัก
        </div>
        <input value={item.question_th} onChange={e => onChange({ ...item, question_th: e.target.value })}
          placeholder="ชื่อหัวข้อหลัก (เช่น Section 1: Store Setup)" autoFocus
          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold outline-none focus:border-violet-400" />
        <input value={item.question_en ?? ""} onChange={e => onChange({ ...item, question_en: e.target.value })}
          placeholder="Section name (English) — optional"
          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-violet-400" />
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold">ยกเลิก</button>
          <button onClick={onSave} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs font-bold inline-flex items-center gap-1">
            <Save size={11} /> บันทึก
          </button>
        </div>
      </div>
    )
  }

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
