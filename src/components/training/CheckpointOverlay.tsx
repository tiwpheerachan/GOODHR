"use client"
import { useState } from "react"
import { Check, X } from "lucide-react"

export type Checkpoint = {
  id: string
  trigger_at_sec: number
  question_text: string
  question_type: "mc" | "tf" | "fill"
  options?: Array<{ id: string; text: string }> | null
  correct_answer: any
  blocks_progress: boolean
}

export default function CheckpointOverlay({
  checkpoint,
  onAnswer,
}: {
  checkpoint: Checkpoint
  onAnswer: (correct: boolean, answer?: any) => void
}) {
  const [answer, setAnswer] = useState<any>("")
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none")

  const check = () => {
    let isCorrect = false
    if (checkpoint.question_type === "mc") {
      isCorrect = String(answer) === String(checkpoint.correct_answer)
    } else if (checkpoint.question_type === "tf") {
      isCorrect = (answer === "true") === !!checkpoint.correct_answer
    } else if (checkpoint.question_type === "fill") {
      const ca = checkpoint.correct_answer
      if (Array.isArray(ca)) {
        isCorrect = ca.some((c: string) => String(c).trim().toLowerCase() === String(answer).trim().toLowerCase())
      } else {
        isCorrect = String(ca).trim().toLowerCase() === String(answer).trim().toLowerCase()
      }
    }
    setFeedback(isCorrect ? "correct" : "wrong")
    setTimeout(() => {
      onAnswer(isCorrect, answer)  // ส่ง answer กลับด้วย
      setFeedback("none")
      setAnswer("")
    }, 1500)
  }

  return (
    // Modal เต็มจอ (fixed) — ไม่ผูกกับกรอบวิดีโอ 16:9 เพื่อไม่ให้โจทย์/ปุ่มโดนตัดบนมือถือ
    // การ์ดเลื่อนได้ (max-h + overflow) กันเนื้อหายาวล้นจอ
    <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center p-4 z-[120] overscroll-contain">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black px-2 py-1 bg-purple-100 text-purple-700 rounded-full">🎯 Checkpoint Quiz</span>
          {checkpoint.blocks_progress && <span className="text-[10px] text-rose-500">* ต้องตอบถูกถึงจะดูต่อได้</span>}
        </div>
        <p className="font-bold text-slate-800 text-lg">{checkpoint.question_text}</p>

        {checkpoint.question_type === "mc" && (
          <div className="space-y-2">
            {(checkpoint.options ?? []).map(o => (
              <label key={o.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${answer === o.id ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" checked={answer === o.id} onChange={() => setAnswer(o.id)} />
                <span className="text-sm">{o.text}</span>
              </label>
            ))}
          </div>
        )}
        {checkpoint.question_type === "tf" && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAnswer("true")} className={`py-3 rounded-xl border-2 font-bold ${answer === "true" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>ถูก ✓</button>
            <button onClick={() => setAnswer("false")} className={`py-3 rounded-xl border-2 font-bold ${answer === "false" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200"}`}>ผิด ✗</button>
          </div>
        )}
        {checkpoint.question_type === "fill" && (
          <input value={answer} onChange={e => setAnswer(e.target.value)} autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-sky-400" />
        )}

        {feedback !== "none" && (
          <div className={`p-3 rounded-xl flex items-center gap-2 ${feedback === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {feedback === "correct" ? <Check size={16} /> : <X size={16} />}
            <span className="font-bold text-sm">{feedback === "correct" ? "ถูกต้อง!" : "ผิด — ลองใหม่"}</span>
          </div>
        )}

        <button onClick={check} disabled={!answer || feedback !== "none"}
          className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 disabled:opacity-50">
          ตรวจคำตอบ
        </button>
      </div>
    </div>
  )
}
