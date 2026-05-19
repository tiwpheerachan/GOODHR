"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2, X, Check } from "lucide-react"
import toast from "react-hot-toast"

type QType = "mc" | "tf" | "fill" | "essay"
const Q_LABEL: Record<QType, string> = { mc: "หลายตัวเลือก", tf: "ถูก/ผิด", fill: "เติมคำ", essay: "อัตนัย" }

export default function QuizBuilderMobilePage() {
  const { id: courseId, quizId } = useParams<{ id: string; quizId: string }>()
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    const r = await fetch(`/api/training/quizzes?id=${quizId}`)
    const d = await r.json()
    setQuiz(d.quiz); setQuestions(d.quiz?.questions ?? [])
  }
  useEffect(() => { load() }, [quizId])

  const saveQuiz = async (updates: any) => {
    await fetch("/api/training/quizzes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: quizId, ...updates }) })
    toast.success("บันทึก"); load()
  }
  const delQ = async (id: string) => {
    if (!confirm("ลบคำถาม?")) return
    await fetch(`/api/training/questions?id=${id}`, { method: "DELETE" }); load()
  }

  if (!quiz) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-sky-400" /></div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4 pb-32">
      <Link href={`/app/training/manage/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> คอร์ส
      </Link>

      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-4 text-white">
        <input value={quiz.title} onBlur={e => e.target.value !== quiz.title && saveQuiz({ title: e.target.value })}
          onChange={e => setQuiz({ ...quiz, title: e.target.value })}
          className="text-xl font-black bg-transparent border-b border-white/30 outline-none w-full" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <SetF label="เวลา (วินาที)"><input type="number" defaultValue={quiz.time_limit_sec || ""} onBlur={e => saveQuiz({ time_limit_sec: Number(e.target.value) || null })} className="w-full bg-white/20 rounded px-2 py-1 text-sm outline-none" placeholder="ไม่จำกัด" /></SetF>
          <SetF label="ผ่าน (%)"><input type="number" min={0} max={100} defaultValue={quiz.passing_score} onBlur={e => saveQuiz({ passing_score: Number(e.target.value) })} className="w-full bg-white/20 rounded px-2 py-1 text-sm outline-none" /></SetF>
          <SetF label="สอบซ้ำ"><input type="number" min={1} max={10} defaultValue={quiz.max_retries} onBlur={e => saveQuiz({ max_retries: Number(e.target.value) })} className="w-full bg-white/20 rounded px-2 py-1 text-sm outline-none" /></SetF>
          <SetF label="จำนวนข้อ (สุ่ม)"><input type="number" min={1} defaultValue={quiz.question_count} onBlur={e => saveQuiz({ question_count: Number(e.target.value) })} className="w-full bg-white/20 rounded px-2 py-1 text-sm outline-none" /></SetF>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked={quiz.randomize} onChange={e => saveQuiz({ randomize: e.target.checked })} />สุ่มลำดับ</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked={quiz.use_question_bank} onChange={e => saveQuiz({ use_question_bank: e.target.checked })} />ใช้ Q-bank</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked={quiz.show_correct_after} onChange={e => saveQuiz({ show_correct_after: e.target.checked })} />โชว์เฉลย</label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-black text-slate-800">คำถาม ({questions.length})</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold">
          <Plus size={12} /> เพิ่ม
        </button>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <span className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded mb-1">{Q_LABEL[q.question_type as QType]}</span>
                <p className="font-bold text-sm">{q.question_text}</p>
                {q.question_type === "mc" && (
                  <ul className="mt-2 space-y-1">
                    {(q.options ?? []).map((o: any) => (
                      <li key={o.id} className={`text-xs px-2 py-1 rounded ${q.correct_answer === o.id ? "bg-emerald-50 text-emerald-700 font-bold" : "bg-slate-50"}`}>
                        {q.correct_answer === o.id && <Check size={10} className="inline mr-1" />}{o.text}
                      </li>
                    ))}
                  </ul>
                )}
                {q.question_type === "tf" && <p className="text-xs mt-1 text-emerald-700 font-bold">เฉลย: {q.correct_answer === true || q.correct_answer === "true" ? "ถูก" : "ผิด"}</p>}
                {q.question_type === "fill" && <p className="text-xs mt-1 text-emerald-700 font-bold">เฉลย: {Array.isArray(q.correct_answer) ? q.correct_answer.join(" / ") : q.correct_answer}</p>}
              </div>
              <button onClick={() => delQ(q.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        {questions.length === 0 && <p className="text-center text-slate-400 text-sm py-8 bg-white border border-slate-200 rounded-2xl">ยังไม่มีคำถาม</p>}
      </div>

      {showAdd && (
        <AddQuestionForm quizId={quizId} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function SetF({ label, children }: any) {
  return <div><p className="text-[10px] font-bold opacity-80 mb-1">{label}</p>{children}</div>
}

// ──────────────────────────────────────────────────────────────────
// Inline form — ฝังในหน้าโดยตรง (ไม่ใช่ popup)
// ──────────────────────────────────────────────────────────────────
function AddQuestionForm({ quizId, onClose, onDone }: any) {
  const [type, setType] = useState<QType>("mc")
  const [text, setText] = useState("")
  const [opts, setOpts] = useState([{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }])
  const [correct, setCorrect] = useState<any>("")
  const [tfAns, setTfAns] = useState("true")
  const [fillAns, setFillAns] = useState("")
  const [points, setPoints] = useState("1")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!text) { toast.error("กรอกคำถาม"); return }
    let correct_answer: any, options: any = null
    if (type === "mc") {
      options = opts.filter(o => o.text.trim())
      if (options.length < 2) { toast.error("ใส่ตัวเลือกอย่างน้อย 2 ข้อ"); return }
      if (!correct) { toast.error("เลือกคำตอบที่ถูก"); return }
      correct_answer = correct
    } else if (type === "tf") correct_answer = tfAns === "true"
    else if (type === "fill") correct_answer = fillAns.split("|").map(s => s.trim()).filter(Boolean)
    else correct_answer = ""

    setSaving(true)
    const r = await fetch("/api/training/questions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz_id: quizId, question_text: text, question_type: type, options, correct_answer, points: Number(points) || 1 }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { toast.error(d.error); return }
    toast.success("เพิ่มแล้ว"); onDone()
  }

  return (
    <div className="bg-sky-50/60 border-2 border-sky-300 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-sky-800">➕ เพิ่มคำถามใหม่</p>
        <button onClick={onClose} className="p-1 text-slate-500 hover:bg-white rounded"><X size={16} /></button>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-1.5">ประเภทคำถาม</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["mc", "tf", "fill", "essay"] as QType[]).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`py-2 text-xs font-bold rounded-lg border-2 transition-colors ${type === t ? "border-sky-400 bg-sky-100 text-sky-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
              {Q_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-1.5">คำถาม *</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
          placeholder="พิมพ์คำถามที่นี่..."
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
      </div>

      {type === "mc" && (
        <div>
          <p className="text-xs font-bold text-slate-600 mb-1.5">ตัวเลือก (เลือก ◉ ที่คำตอบถูก)</p>
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <input type="radio" name="correct-mc" checked={correct === o.id} onChange={() => setCorrect(o.id)}
                  className="w-4 h-4 text-sky-500" />
                <input value={o.text} onChange={e => setOpts(os => os.map(x => x.id === o.id ? { ...x, text: e.target.value } : x))}
                  placeholder={`ตัวเลือก ${i + 1}`}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400" />
                {opts.length > 2 && (
                  <button onClick={() => setOpts(os => os.filter(x => x.id !== o.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {opts.length < 6 && (
            <button onClick={() => setOpts(os => [...os, { id: String(os.length + 1), text: "" }])}
              className="mt-2 text-xs text-sky-600 hover:text-sky-700 font-bold">
              + เพิ่มตัวเลือก
            </button>
          )}
        </div>
      )}

      {type === "tf" && (
        <div>
          <p className="text-xs font-bold text-slate-600 mb-1.5">คำตอบที่ถูก</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTfAns("true")} className={`py-3 rounded-lg border-2 font-bold ${tfAns === "true" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>✓ ถูก</button>
            <button onClick={() => setTfAns("false")} className={`py-3 rounded-lg border-2 font-bold ${tfAns === "false" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>✗ ผิด</button>
          </div>
        </div>
      )}

      {type === "fill" && (
        <div>
          <p className="text-xs font-bold text-slate-600 mb-1.5">เฉลย (คั่นด้วย | ถ้ามีหลายคำตอบที่ยอมรับ)</p>
          <input value={fillAns} onChange={e => setFillAns(e.target.value)}
            placeholder="เช่น Bangkok|กรุงเทพ|bkk"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
        </div>
      )}

      {type === "essay" && (
        <p className="text-xs italic bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-800">
          📝 อัตนัย — ระบบจะให้ 0 คะแนนเริ่มต้น ต้องตรวจให้คะแนนเองภายหลัง
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">คะแนน:</label>
          <input type="number" value={points} onChange={e => setPoints(e.target.value)} min={0.5} step={0.5}
            className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 text-right" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "💾 บันทึกคำถาม"}
          </button>
        </div>
      </div>
    </div>
  )
}
