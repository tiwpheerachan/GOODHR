"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, FileQuestion, Trash2, X, Search } from "lucide-react"
import toast from "react-hot-toast"

export default function QBankManagePage() {
  const [channels, setChannels] = useState<any[]>([])
  const [channelId, setChannelId] = useState("")
  const [questions, setQuestions] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    question_text: "", question_type: "mc",
    options: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }],
    correct: "", tf: "true", fillAnswer: "", difficulty: "medium", tags: "", points: "1",
  })

  useEffect(() => {
    fetch("/api/training/channels").then(r => r.json()).then(d => {
      setChannels(d.channels ?? [])
      if (d.channels?.[0]) setChannelId(d.channels[0].id)
    })
  }, [])
  useEffect(() => {
    if (!channelId) return
    fetch(`/api/training/question-bank?channel_id=${channelId}`).then(r => r.json()).then(d => setQuestions(d.questions ?? []))
  }, [channelId])

  const tags = Array.from(new Set(questions.flatMap(q => q.tags ?? [])))
  const filtered = questions.filter(q => {
    if (tagFilter && !(q.tags ?? []).includes(tagFilter)) return false
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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

    const r = await fetch("/api/training/question-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: channelId, question_text: form.question_text, question_type: form.question_type,
        options: opts, correct_answer, difficulty: form.difficulty,
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean), points: Number(form.points) || 1,
      }),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error); return }
    toast.success("เพิ่ม")
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
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4 pb-32">
      <Link href="/app/training/manage" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> จัดการเนื้อหา
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">คลังคำถาม</h1>
          <p className="text-xs text-slate-500 mt-1">{filtered.length} คำถาม</p>
        </div>
        <button onClick={() => setShowAdd(true)} disabled={!channelId} className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50">
          <Plus size={14} /> เพิ่ม
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 sm:flex sm:gap-2 sm:space-y-0">
        <select value={channelId} onChange={e => setChannelId(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">— เลือก channel —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none" />
        </div>
        {tags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">ทุก tag</option>
            {tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(q => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                {q.question_type === "mc" ? "หลายตัวเลือก" : q.question_type === "tf" ? "ถูก/ผิด" : q.question_type === "fill" ? "เติมคำ" : q.question_type}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" : q.difficulty === "hard" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                {q.difficulty === "easy" ? "ง่าย" : q.difficulty === "hard" ? "ยาก" : "ปานกลาง"}
              </span>
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <p className="font-black">เพิ่มคำถาม</p>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">ประเภท</p>
                <select value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="mc">หลายตัวเลือก</option>
                  <option value="tf">ถูก/ผิด</option>
                  <option value="fill">เติมคำ</option>
                  <option value="essay">อัตนัย</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">คำถาม</p>
                <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              {form.question_type === "mc" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ตัวเลือก</p>
                  {form.options.map((o, i) => (
                    <div key={o.id} className="flex items-center gap-2 mb-2">
                      <input type="radio" checked={form.correct === o.id} onChange={() => setForm(f => ({ ...f, correct: o.id }))} />
                      <input value={o.text} onChange={e => setForm(f => ({ ...f, options: f.options.map(x => x.id === o.id ? { ...x, text: e.target.value } : x) }))}
                        placeholder={`ตัวเลือก ${i + 1}`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
              )}
              {form.question_type === "tf" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">เฉลย</p>
                  <select value={form.tf} onChange={e => setForm(f => ({ ...f, tf: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="true">ถูก</option>
                    <option value="false">ผิด</option>
                  </select>
                </div>
              )}
              {form.question_type === "fill" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">เฉลย (คั่นด้วย |)</p>
                  <input value={form.fillAnswer} onChange={e => setForm(f => ({ ...f, fillAnswer: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ความยาก</p>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="easy">ง่าย</option>
                    <option value="medium">ปานกลาง</option>
                    <option value="hard">ยาก</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">คะแนน</p>
                  <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Tags (,)</p>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="sales, basic"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">ยกเลิก</button>
              <button onClick={save} className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
