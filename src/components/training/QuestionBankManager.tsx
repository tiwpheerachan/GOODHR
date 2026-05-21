"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, FileQuestion, Trash2, X, Search, ArrowLeft, RefreshCw, Filter,
} from "lucide-react"
import toast from "react-hot-toast"

export default function QuestionBankManager({ basePath }: { basePath: string }) {
  const [channels, setChannels] = useState<any[]>([])
  const [channelId, setChannelId] = useState("")
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [diffFilter, setDiffFilter] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    question_text: "", question_type: "mc",
    options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }],
    correct: "", tf: "true", fillAnswer: "",
    difficulty: "medium", tags: "", points: "1",
  })

  useEffect(() => {
    fetch("/api/training/channels").then(r => r.json()).then(d => {
      setChannels(d.channels ?? [])
      if (!channelId && d.channels?.[0]) setChannelId(d.channels[0].id)
    })
  }, [])
  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    fetch(`/api/training/question-bank?channel_id=${channelId}`).then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setLoading(false) })
  }, [channelId])

  const allTags = Array.from(new Set(questions.flatMap(q => q.tags ?? []))) as string[]

  const filtered = questions.filter(q => {
    if (tagFilter && !(q.tags ?? []).includes(tagFilter)) return false
    if (diffFilter && q.difficulty !== diffFilter) return false
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Stats
  const stats = {
    total: questions.length,
    mc: questions.filter(q => q.question_type === "mc").length,
    tf: questions.filter(q => q.question_type === "tf").length,
    fill: questions.filter(q => q.question_type === "fill").length,
  }

  const save = async () => {
    if (!channelId) { toast.error("เลือก channel"); return }
    if (!form.question_text) { toast.error("กรอกคำถาม"); return }
    let correct_answer: any, opts: any = null
    if (form.question_type === "mc") {
      opts = form.options.filter(o => o.text.trim())
      if (!form.correct) { toast.error("เลือกคำตอบ"); return }
      correct_answer = form.correct
    } else if (form.question_type === "tf") correct_answer = form.tf === "true"
    else if (form.question_type === "fill") correct_answer = form.fillAnswer.split("|").map(s => s.trim()).filter(Boolean)
    else correct_answer = ""

    const res = await fetch("/api/training/question-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: channelId,
        question_text: form.question_text, question_type: form.question_type,
        options: opts, correct_answer, difficulty: form.difficulty,
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        points: Number(form.points) || 1,
      }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error); return }
    toast.success("เพิ่มแล้ว")
    setShowAdd(false)
    setForm({ question_text: "", question_type: "mc", options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }], correct: "", tf: "true", fillAnswer: "", difficulty: "medium", tags: "", points: "1" })
    fetch(`/api/training/question-bank?channel_id=${channelId}`).then(r => r.json()).then(d => setQuestions(d.questions ?? []))
  }

  const del = async (id: string) => {
    if (!confirm("ลบคำถาม?")) return
    await fetch(`/api/training/question-bank?id=${id}`, { method: "DELETE" })
    setQuestions(qs => qs.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบเรียนรู้
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">คลังคำถาม</h2>
          <p className="text-slate-400 text-sm">{filtered.length} / {questions.length} คำถาม</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => channelId && fetch(`/api/training/question-bank?channel_id=${channelId}`).then(r => r.json()).then(d => setQuestions(d.questions ?? []))}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowAdd(true)} disabled={!channelId}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-sm">
            <Plus size={14} /> เพิ่มคำถาม
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "ทั้งหมด",       v: stats.total, bg: "bg-amber-50",   ic: "text-amber-500",   vc: "text-amber-700" },
          { l: "หลายตัวเลือก", v: stats.mc,    bg: "bg-sky-50",     ic: "text-sky-500",     vc: "text-sky-700" },
          { l: "ถูก/ผิด",       v: stats.tf,    bg: "bg-indigo-50",  ic: "text-indigo-500",  vc: "text-indigo-700" },
          { l: "เติมคำ",        v: stats.fill,  bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                <FileQuestion size={14} className={k.ic} />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{k.l}</span>
            </div>
            <p className={`text-2xl font-black ${k.vc}`}>{k.v.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <select value={channelId} onChange={e => setChannelId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
          <option value="">— เลือก channel —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
        </div>
        <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
          <option value="">ทุกระดับ</option>
          <option value="easy">ง่าย</option>
          <option value="medium">ปานกลาง</option>
          <option value="hard">ยาก</option>
        </select>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400">
            <option value="">ทุก tag</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {(search || tagFilter || diffFilter) && (
          <button onClick={() => { setSearch(""); setTagFilter(""); setDiffFilter("") }}
            className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <FileQuestion size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{search || tagFilter || diffFilter ? "ไม่พบคำถาม" : "ยังไม่มีคำถามใน channel นี้"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(q => (
            <div key={q.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {q.question_type === "mc" ? "หลายตัวเลือก" : q.question_type === "tf" ? "ถูก/ผิด" : q.question_type === "fill" ? "เติมคำ" : q.question_type}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  q.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" :
                  q.difficulty === "hard" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {q.difficulty === "easy" ? "ง่าย" : q.difficulty === "hard" ? "ยาก" : "ปานกลาง"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded">+{q.points} pt</span>
                <button onClick={() => del(q.id)} className="ml-auto p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
              </div>
              <p className="text-sm font-bold text-slate-800">{q.question_text}</p>
              {q.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {q.tags.map((t: string) => <span key={t} className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">#{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <FileQuestion size={16} className="text-amber-600" />
              </div>
              <h3 className="flex-1 font-black text-slate-800">เพิ่มคำถาม</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">ประเภท</p>
                <select value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400">
                  <option value="mc">หลายตัวเลือก</option>
                  <option value="tf">ถูก/ผิด</option>
                  <option value="fill">เติมคำ</option>
                  <option value="essay">อัตนัย</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">คำถาม</p>
                <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none" />
              </div>
              {form.question_type === "mc" && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">ตัวเลือก (เลือกคำตอบที่ถูก)</p>
                  {form.options.map((o, i) => (
                    <div key={o.id} className="flex items-center gap-2 mb-2">
                      <input type="radio" checked={form.correct === o.id} onChange={() => setForm(f => ({ ...f, correct: o.id }))} />
                      <input value={o.text} onChange={e => setForm(f => ({ ...f, options: f.options.map(x => x.id === o.id ? { ...x, text: e.target.value } : x) }))}
                        placeholder={`ตัวเลือก ${i + 1}`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-amber-400" />
                    </div>
                  ))}
                </div>
              )}
              {form.question_type === "tf" && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">คำตอบ</p>
                  <select value={form.tf} onChange={e => setForm(f => ({ ...f, tf: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
                    <option value="true">ถูก</option>
                    <option value="false">ผิด</option>
                  </select>
                </div>
              )}
              {form.question_type === "fill" && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">เฉลย (คั่นด้วย |)</p>
                  <input value={form.fillAnswer} onChange={e => setForm(f => ({ ...f, fillAnswer: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">ความยาก</p>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
                    <option value="easy">ง่าย</option><option value="medium">ปานกลาง</option><option value="hard">ยาก</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">คะแนน</p>
                  <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">Tags (คั่นด้วย ,)</p>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="เช่น sales, basic"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
