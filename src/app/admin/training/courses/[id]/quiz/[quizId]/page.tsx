"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2, Save, X, Check, Settings } from "lucide-react"
import toast from "react-hot-toast"

type QType = "mc" | "tf" | "fill" | "match" | "essay"

const Q_TYPE_LABEL: Record<QType, string> = {
  mc: "หลายตัวเลือก", tf: "ถูก/ผิด", fill: "เติมคำ", match: "จับคู่", essay: "อัตนัย",
}

export default function QuizBuilderPage() {
  const { id: courseId, quizId } = useParams<{ id: string; quizId: string }>()
  const router = useRouter()
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    const r = await fetch(`/api/training/quizzes?id=${quizId}`)
    const d = await r.json()
    setQuiz(d.quiz)
    setQuestions(d.quiz?.questions ?? [])
  }
  useEffect(() => { load() }, [quizId])

  const saveQuiz = async (updates: any) => {
    await fetch("/api/training/quizzes", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: quizId, ...updates }),
    })
    toast.success("บันทึก")
    await load()
  }

  const delQuestion = async (id: string) => {
    if (!confirm("ลบคำถามนี้?")) return
    await fetch(`/api/training/questions?id=${id}`, { method: "DELETE" })
    await load()
  }

  if (!quiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" /></div>

  return (
    <div className="space-y-5">
      <Link href={`/admin/training/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> กลับไปหน้าคอร์ส
      </Link>

      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white">
        <input
          value={quiz.title}
          onBlur={e => e.target.value !== quiz.title && saveQuiz({ title: e.target.value })}
          onChange={e => setQuiz({ ...quiz, title: e.target.value })}
          className="text-3xl font-black bg-transparent border-b border-white/30 outline-none w-full"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-white">
          <SetField label="เวลา (วินาที)">
            <input type="number" defaultValue={quiz.time_limit_sec || ""} onBlur={e => saveQuiz({ time_limit_sec: Number(e.target.value) || null })}
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm placeholder-white/50 outline-none" placeholder="ไม่จำกัด" />
          </SetField>
          <SetField label="ผ่าน (%)">
            <input type="number" min={0} max={100} defaultValue={quiz.passing_score} onBlur={e => saveQuiz({ passing_score: Number(e.target.value) })}
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm outline-none" />
          </SetField>
          <SetField label="สอบซ้ำได้">
            <input type="number" min={1} max={10} defaultValue={quiz.max_retries} onBlur={e => saveQuiz({ max_retries: Number(e.target.value) })}
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm outline-none" />
          </SetField>
          <SetField label="จำนวนข้อ (สุ่ม)">
            <input type="number" min={1} defaultValue={quiz.question_count} onBlur={e => saveQuiz({ question_count: Number(e.target.value) })}
              className="w-full bg-white/20 rounded-lg px-2 py-1 text-sm outline-none" />
          </SetField>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked={quiz.randomize} onChange={e => saveQuiz({ randomize: e.target.checked })} />
            สุ่มลำดับ
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked={quiz.use_question_bank} onChange={e => saveQuiz({ use_question_bank: e.target.checked })} />
            ดึงจากคลังคำถาม (Q-bank)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked={quiz.show_correct_after} onChange={e => saveQuiz({ show_correct_after: e.target.checked })} />
            โชว์เฉลยหลังสอบ
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-black text-slate-800">คำถาม ({questions.length} ข้อ)</p>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700">
            <Plus size={12} /> เพิ่มคำถาม
          </button>
        </div>

        {questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded mb-1">{Q_TYPE_LABEL[q.question_type as QType]}</span>
                <p className="font-bold text-slate-800">{q.question_text}</p>
                <QuestionPreview question={q} />
              </div>
              <button onClick={() => delQuestion(q.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">ยังไม่มีคำถาม</div>
        )}
      </div>

      {showAdd && <AddQuestionModal quizId={quizId} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  )
}

function SetField({ label, children }: any) {
  return (
    <div>
      <p className="text-[10px] font-bold opacity-80 mb-1">{label}</p>
      {children}
    </div>
  )
}

function QuestionPreview({ question }: any) {
  switch (question.question_type) {
    case "mc":
      return (
        <ul className="mt-2 space-y-1">
          {(question.options ?? []).map((o: any) => (
            <li key={o.id} className={`text-xs px-2 py-1 rounded ${question.correct_answer === o.id ? "bg-emerald-50 text-emerald-700 font-bold" : "bg-slate-50 text-slate-600"}`}>
              {question.correct_answer === o.id && <Check size={11} className="inline mr-1" />} {o.text}
            </li>
          ))}
        </ul>
      )
    case "tf":
      return <p className="text-xs mt-1 text-emerald-700 font-bold">ตอบ: {question.correct_answer === true || question.correct_answer === "true" ? "ถูก" : "ผิด"}</p>
    case "fill":
      return <p className="text-xs mt-1 text-emerald-700 font-bold">เฉลย: {Array.isArray(question.correct_answer) ? question.correct_answer.join(" / ") : question.correct_answer}</p>
    case "essay":
      return <p className="text-xs mt-1 text-slate-400 italic">อัตนัย — ให้คะแนนด้วยมือ</p>
    default:
      return null
  }
}

function AddQuestionModal({ quizId, onClose, onAdded }: any) {
  const [type, setType] = useState<QType>("mc")
  const [text, setText] = useState("")
  const [options, setOptions] = useState([{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }, { id: "4", text: "" }])
  const [correct, setCorrect] = useState<any>("")
  const [fillAnswer, setFillAnswer] = useState("")
  const [points, setPoints] = useState("1")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!text) { toast.error("กรอกคำถาม"); return }
    let correct_answer: any
    let opts: any = null
    if (type === "mc") {
      opts = options.filter(o => o.text.trim())
      if (!correct) { toast.error("เลือกคำตอบที่ถูก"); return }
      correct_answer = correct
    } else if (type === "tf") {
      correct_answer = correct === "true"
    } else if (type === "fill") {
      correct_answer = fillAnswer.split("|").map(s => s.trim()).filter(Boolean)
    } else if (type === "essay") {
      correct_answer = ""
    }
    setSaving(true)
    const res = await fetch("/api/training/questions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz_id: quizId, question_text: text, question_type: type, options: opts, correct_answer, points: Number(points) || 1 }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error); setSaving(false); return }
    toast.success("เพิ่มแล้ว"); setSaving(false); onAdded(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-black text-slate-800">เพิ่มคำถาม</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">ประเภท</p>
            <div className="grid grid-cols-5 gap-2">
              {(["mc", "tf", "fill", "match", "essay"] as QType[]).map(t => (
                <button key={t} onClick={() => setType(t)} disabled={t === "match"}
                  className={`px-2 py-2 text-xs font-bold rounded-lg border ${type === t ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"} disabled:opacity-40`}>
                  {Q_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">คำถาม *</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
          </div>

          {type === "mc" && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">ตัวเลือก (เลือกคำตอบที่ถูก)</p>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input type="radio" name="correct" value={o.id} checked={correct === o.id} onChange={() => setCorrect(o.id)} />
                    <input value={o.text} onChange={e => setOptions(os => os.map(x => x.id === o.id ? { ...x, text: e.target.value } : x))}
                      placeholder={`ตัวเลือก ${i + 1}`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === "tf" && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">คำตอบ</p>
              <div className="flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer ${correct === "true" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>
                  <input type="radio" name="tf" value="true" checked={correct === "true"} onChange={() => setCorrect("true")} className="hidden" />
                  ถูก ✓
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer ${correct === "false" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200"}`}>
                  <input type="radio" name="tf" value="false" checked={correct === "false"} onChange={() => setCorrect("false")} className="hidden" />
                  ผิด ✗
                </label>
              </div>
            </div>
          )}

          {type === "fill" && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">เฉลย (คั่นด้วย | ถ้ามีหลายคำตอบที่ยอมรับ)</p>
              <input value={fillAnswer} onChange={e => setFillAnswer(e.target.value)}
                placeholder="เช่น Bangkok|กรุงเทพ"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
          )}

          {type === "essay" && (
            <p className="text-xs text-slate-500 italic bg-amber-50 p-2 rounded">อัตนัย — ต้องตรวจให้คะแนนเองภายหลัง (default 0 คะแนน)</p>
          )}

          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">คะแนน</p>
            <input type="number" value={points} onChange={e => setPoints(e.target.value)} min={0.5} step={0.5}
              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 text-right" />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">ยกเลิก</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-60">
            {saving ? "..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  )
}
