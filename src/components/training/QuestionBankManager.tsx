"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, FileQuestion, Trash2, X, Search, ArrowLeft, Sparkles } from "lucide-react"
import toast from "react-hot-toast"

/**
 * Shared Question Bank Manager — ใช้ทั้งฝั่ง admin และ trainer
 */
export default function QuestionBankManager({ basePath }: { basePath: string }) {
  const [channels, setChannels] = useState<any[]>([])
  const [channelId, setChannelId] = useState("")
  const [questions, setQuestions] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("")
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
    fetch(`/api/training/question-bank?channel_id=${channelId}`).then(r => r.json()).then(d => setQuestions(d.questions ?? []))
  }, [channelId])

  const allTags = Array.from(new Set(questions.flatMap(q => q.tags ?? []))) as string[]

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

    const res = await fetch("/api/training/question-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: channelId,
        question_text: form.question_text,
        question_type: form.question_type,
        options: opts, correct_answer,
        difficulty: form.difficulty,
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 lg:p-8 text-white shadow-2xl anim-fade-up">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl anim-float" />
        <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-rose-300/30 blur-2xl" style={{ animation: "floatY 4s ease-in-out infinite" }} />
        <div className="absolute top-6 right-24 w-2 h-2 bg-white rounded-full opacity-70 anim-pulse-glow" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={basePath} className="p-2 bg-white/15 backdrop-blur-xl rounded-xl hover:bg-white/25 transition-colors border border-white/20">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center anim-float border border-white/20 shadow-lg">
              <FileQuestion size={32} className="drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2 anim-slide-in">
                <Sparkles size={12} className="opacity-80" />
                <span className="text-[10px] font-black tracking-[0.2em] opacity-90">Q-BANK</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black mt-1 drop-shadow">คลังคำถาม</h1>
              <p className="text-xs opacity-90 mt-1">คำถามรวม · สุ่มไปใช้ในควิซ · ป้องกันการลอกข้อสอบ</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} disabled={!channelId}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-700 hover:bg-amber-50 rounded-2xl text-sm font-black shadow-lg shadow-amber-900/20 transition-all card-lift disabled:opacity-50">
            <Plus size={16} /> เพิ่มคำถาม
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center anim-fade-up shadow-sm">
        <select value={channelId} onChange={e => setChannelId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400">
          <option value="">— เลือก channel —</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-amber-400" />
        </div>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
            <option value="">ทุก tag</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} คำถาม</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center anim-fade-up">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center anim-float">
            <FileQuestion size={36} className="text-amber-500" />
          </div>
          <p className="font-black text-slate-700 mb-1">{search || tagFilter ? "ไม่พบคำถาม" : "ยังไม่มีคำถามใน channel นี้"}</p>
          <p className="text-xs text-slate-400">กดเพิ่มคำถามเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 anim-stagger">
          {filtered.map(q => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4 card-lift">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {q.question_type === "mc" ? "หลายตัวเลือก" : q.question_type === "tf" ? "ถูก/ผิด" : q.question_type === "fill" ? "เติมคำ" : q.question_type}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" : q.difficulty === "hard" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade-up" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileQuestion size={18} />
                <h2 className="font-black">เพิ่มคำถาม</h2>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">ประเภท</p>
                <select value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
                  <option value="mc">หลายตัวเลือก</option>
                  <option value="tf">ถูก/ผิด</option>
                  <option value="fill">เติมคำ</option>
                  <option value="essay">อัตนัย</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">คำถาม</p>
                <textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none" />
              </div>
              {form.question_type === "mc" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ตัวเลือก (เลือกคำตอบที่ถูก)</p>
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
                  <p className="text-xs font-bold text-slate-500 mb-1">คำตอบ</p>
                  <select value={form.tf} onChange={e => setForm(f => ({ ...f, tf: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
                    <option value="true">ถูก</option>
                    <option value="false">ผิด</option>
                  </select>
                </div>
              )}
              {form.question_type === "fill" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">เฉลย (คั่นด้วย |)</p>
                  <input value={form.fillAnswer} onChange={e => setForm(f => ({ ...f, fillAnswer: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ความยาก</p>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400">
                    <option value="easy">ง่าย</option>
                    <option value="medium">ปานกลาง</option>
                    <option value="hard">ยาก</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">คะแนน</p>
                  <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Tags (คั่นด้วย ,)</p>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="เช่น sales, basic"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex gap-2 border-t border-slate-100">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-lg shadow-amber-200">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
