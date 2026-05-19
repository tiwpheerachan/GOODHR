"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Clock, AlertTriangle, Check, X, Award, Trophy, RotateCcw, BookOpen } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

export default function QuizAttemptPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>()
  const sp = useSearchParams()
  const router = useRouter()
  const enrollmentId = sp?.get("en")
  const { user } = useAuth()

  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [tabSwitches, setTabSwitches] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  // ── Status data ─────────────────────────────────────────────
  const [quizInfo, setQuizInfo] = useState<any>(null)
  const [pastAttempts, setPastAttempts] = useState<any[]>([])
  const [statusLoading, setStatusLoading] = useState(true)
  const submittedRef = useRef(false)

  // ── Load quiz info + past attempts ──────────────────────────
  useEffect(() => {
    if (!enrollmentId || !quizId) return
    Promise.all([
      fetch(`/api/training/quizzes?id=${quizId}`).then(r => r.json()),
      fetch(`/api/training/attempts?enrollment_id=${enrollmentId}&quiz_id=${quizId}`).then(r => r.json()),
    ]).then(([qR, aR]) => {
      setQuizInfo(qR.quiz)
      setPastAttempts(aR.attempts ?? [])
      setStatusLoading(false)
    })
  }, [enrollmentId, quizId])

  const bestScore = pastAttempts.reduce((m, a) => Math.max(m, Number(a.score || 0)), 0)
  const hasPassed = pastAttempts.some(a => a.passed)
  const attemptsUsed = pastAttempts.length
  const maxRetries = Number(quizInfo?.max_retries ?? 2)
  const attemptsLeft = Math.max(0, maxRetries - attemptsUsed)
  const isExhausted = !hasPassed && attemptsLeft === 0
  const passedAttempt = pastAttempts.find(a => a.passed)

  // ── Tab switch detection ──────────────────────────────────────────
  useEffect(() => {
    if (!attempt || result) return
    const handler = async () => {
      if (document.hidden) {
        setTabSwitches(s => s + 1)
        await fetch("/api/training/attempts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "tab_switch", attempt_id: attempt.attempt_id }),
        })
      }
    }
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [attempt, result])

  // ── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { submit(); return }
    const i = setInterval(() => setTimeLeft(t => t === null ? null : t - 1), 1000)
    return () => clearInterval(i)
  }, [timeLeft])

  const start = async () => {
    if (!enrollmentId) return
    setLoading(true)
    const res = await fetch("/api/training/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", enrollment_id: enrollmentId, quiz_id: quizId }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { alert(d.error); router.back(); return }
    setAttempt(d)
    setQuestions(d.questions ?? [])
    setStartedAt(new Date(d.started_at))
    if (d.time_limit_sec) setTimeLeft(d.time_limit_sec)
  }

  const submit = async () => {
    if (submittedRef.current || !attempt) return
    submittedRef.current = true
    setLoading(true)
    const res = await fetch("/api/training/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", attempt_id: attempt.attempt_id, answers, tab_switches: tabSwitches }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { alert(d.error); return }
    setResult(d)
  }

  // ── Not started yet ──────────────────────────────────────────────
  if (!attempt) {
    if (statusLoading) {
      return <div className="p-4 flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" /></div>
    }

    return (
      <div className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">
        <Link href={`/app/training/${courseId}?en=${enrollmentId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
          <ArrowLeft size={14} /> กลับไปคอร์ส
        </Link>

        {/* ── 1) ผ่านแล้ว — แสดงเครื่องหมายชัดเจน ── */}
        {hasPassed ? (
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-6 text-white text-center shadow-xl">
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
              <Trophy size={48} fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black">ผ่านแล้ว! 🎉</h1>
            <p className="text-sm opacity-90 mt-2">{quizInfo?.title}</p>
            <div className="mt-5 bg-white/15 backdrop-blur rounded-2xl p-4 inline-block">
              <p className="text-xs opacity-80">คะแนนที่ทำได้</p>
              <p className="text-5xl font-black mt-1">{bestScore.toFixed(0)}%</p>
              <p className="text-xs opacity-80 mt-1">เกณฑ์ผ่าน {quizInfo?.passing_score ?? 70}%</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              {pastAttempts.map((a: any, i: number) => (
                <div key={a.id} className={`bg-white/10 backdrop-blur rounded-lg p-2 ${a.passed ? "ring-2 ring-emerald-300" : ""}`}>
                  <p className="text-[10px] opacity-80">ครั้งที่ {a.attempt_no}</p>
                  <p className="font-black text-lg">{Number(a.score || 0).toFixed(0)}%</p>
                  <p className="text-[9px] opacity-80">{a.passed ? "✓ ผ่าน" : "✗ ไม่ผ่าน"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : isExhausted ? (
          /* ── 2) ใช้ครบทั้ง 2 ครั้งแต่ยังไม่ผ่าน → ต้องเรียนใหม่ ── */
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-6 text-white text-center shadow-xl">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
              <RotateCcw size={36} />
            </div>
            <h1 className="text-2xl font-black">ต้องเรียนใหม่</h1>
            <p className="text-sm opacity-90 mt-2">
              คุณใช้สิทธิ์สอบครบ {maxRetries} ครั้งแล้ว — กรุณากลับไปเรียนเนื้อหาให้เข้าใจมากขึ้น
            </p>
            <div className="mt-4 bg-white/15 backdrop-blur rounded-2xl p-3">
              <p className="text-xs opacity-80">คะแนนสูงสุด</p>
              <p className="text-3xl font-black mt-1">{bestScore.toFixed(0)}%</p>
              <p className="text-[11px] opacity-80 mt-1">เกณฑ์ผ่าน {quizInfo?.passing_score ?? 70}%</p>
            </div>
            <Link href={`/app/training/${courseId}?en=${enrollmentId}`}
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-white text-rose-700 rounded-xl font-black hover:bg-rose-50">
              <BookOpen size={16} /> กลับไปเรียนใหม่
            </Link>
          </div>
        ) : (
          /* ── 3) ยังไม่ผ่าน เหลือสิทธิ์ทำอีก ── */
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white text-center shadow-md">
            <Award size={48} className="mx-auto mb-2" />
            <h1 className="text-2xl font-black">{quizInfo?.title || "ทำควิซ"}</h1>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs">
              <span className="bg-white/20 px-2.5 py-1 rounded-full">📋 {quizInfo?.question_count || "?"} ข้อ</span>
              <span className="bg-white/20 px-2.5 py-1 rounded-full">🎯 ผ่าน {quizInfo?.passing_score ?? 70}%</span>
              {quizInfo?.time_limit_sec && (
                <span className="bg-white/20 px-2.5 py-1 rounded-full">⏱ {Math.floor(quizInfo.time_limit_sec / 60)} นาที</span>
              )}
            </div>

            {/* Past attempts (failed) */}
            {pastAttempts.length > 0 && (
              <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3">
                <p className="text-xs opacity-80 mb-2">ประวัติการทำ</p>
                <div className="flex justify-center gap-2">
                  {pastAttempts.map((a: any) => (
                    <div key={a.id} className="bg-white/15 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] opacity-80">ครั้งที่ {a.attempt_no}</p>
                      <p className="font-black text-sm">{Number(a.score || 0).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3">
              <p className="text-xs">
                {attemptsUsed === 0 ? (
                  <>มีสิทธิ์ทำได้ <b>{maxRetries} ครั้ง</b> · ทำได้คะแนนสูงสุดจะเก็บไว้</>
                ) : (
                  <>เหลือสิทธิ์อีก <b>{attemptsLeft} ครั้ง</b> · เมื่อหมดต้องเรียนใหม่</>
                )}
              </p>
            </div>

            <div className="mt-4 bg-amber-700/30 backdrop-blur rounded-xl p-2.5 flex items-center gap-2 text-xs">
              <AlertTriangle size={14} />
              <span>เมื่อเริ่มแล้ว: นับเวลาทันที · สลับแท็บจะถูกบันทึก · ห้ามปิดเว็บ</span>
            </div>

            <button onClick={start} disabled={loading}
              className="mt-5 px-8 py-3 bg-white text-amber-700 rounded-xl font-black hover:bg-amber-50 disabled:opacity-60 shadow-lg">
              {loading ? "กำลังเริ่ม..." : attemptsUsed === 0 ? "เริ่มทำควิซ" : "ลองอีกครั้ง"}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="p-4 space-y-4">
        <div className={`rounded-3xl p-6 text-center text-white ${result.passed ? "bg-gradient-to-br from-emerald-500 to-green-500" : "bg-gradient-to-br from-rose-500 to-red-500"}`}>
          {result.passed ? <Check size={48} className="mx-auto mb-2" /> : <X size={48} className="mx-auto mb-2" />}
          <h1 className="text-3xl font-black">{result.passed ? "ผ่านแล้ว!" : "ยังไม่ผ่าน"}</h1>
          <p className="text-5xl font-black mt-4">{result.score}%</p>
          <p className="text-sm opacity-90 mt-2">เกณฑ์ผ่าน {result.passing_score}%</p>
          {tabSwitches > 0 && <p className="text-xs mt-3 opacity-90">⚠️ สลับแท็บ {tabSwitches} ครั้ง</p>}
        </div>
        <Link href={`/app/training/${courseId}?en=${enrollmentId}`}
          className="block text-center bg-white border border-slate-200 rounded-xl py-3 font-bold text-slate-700 hover:bg-slate-50">
          กลับไปที่คอร์ส
        </Link>
      </div>
    )
  }

  // ── Attempt ───────────────────────────────────────────────────────
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="p-4 space-y-4 pb-32 select-none" onCopy={e => e.preventDefault()}>
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
        <Award size={18} className="text-amber-500" />
        <p className="font-bold flex-1">ควิซกำลังทำ</p>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${timeLeft < 60 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
            <Clock size={12} /> {fmtTime(timeLeft)}
          </div>
        )}
        {tabSwitches > 0 && (
          <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
            <AlertTriangle size={11} /> {tabSwitches}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-black opacity-5 -rotate-12 pointer-events-none z-0">
        {user?.employee?.employee_code || "CONFIDENTIAL"}
      </p>

      <div className="space-y-3 relative z-10">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-8 h-8 bg-sky-100 text-sky-700 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</span>
              <p className="font-bold flex-1">{q.question_text}</p>
            </div>

            {q.question_type === "mc" && (
              <div className="space-y-2 ml-11">
                {(q.options ?? []).map((o: any) => (
                  <label key={o.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${answers[q.id] === o.id ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" checked={answers[q.id] === o.id} onChange={() => setAnswers(a => ({ ...a, [q.id]: o.id }))} />
                    <span className="text-sm">{o.text}</span>
                  </label>
                ))}
              </div>
            )}
            {q.question_type === "tf" && (
              <div className="grid grid-cols-2 gap-2 ml-11">
                <button onClick={() => setAnswers(a => ({ ...a, [q.id]: "true" }))}
                  className={`py-2 rounded-lg border-2 font-bold ${answers[q.id] === "true" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>ถูก</button>
                <button onClick={() => setAnswers(a => ({ ...a, [q.id]: "false" }))}
                  className={`py-2 rounded-lg border-2 font-bold ${answers[q.id] === "false" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200"}`}>ผิด</button>
              </div>
            )}
            {q.question_type === "fill" && (
              <input value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                className="ml-11 w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            )}
            {q.question_type === "essay" && (
              <textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={4}
                className="ml-11 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            )}
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={loading}
        className="w-full py-3 bg-sky-600 text-white rounded-xl font-black hover:bg-sky-700 disabled:opacity-60">
        {loading ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </button>
    </div>
  )
}
