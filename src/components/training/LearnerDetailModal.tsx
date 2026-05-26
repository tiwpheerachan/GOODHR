"use client"
import { useMemo, useState } from "react"
import {
  X, Award, BookOpen, Clock, Target, CheckCircle2, XCircle, TrendingUp,
  Activity, AlertTriangle, Calendar, Trophy, RotateCcw, FileQuestion,
  PlayCircle, Eye, ChevronRight, Sparkles, Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Module = { id: string; order_no: number; title: string; required_watch_pct?: number; video_duration_sec?: number | null }
type Quiz = { id: string; module_id: string | null; title: string; passing_score: number; question_count: number }
type Attempt = {
  enrollment_id: string; quiz_id: string; attempt_no: number
  score: number | null; passed: boolean | null
  tab_switches?: number | null; time_used_sec?: number | null
  submitted_at: string | null
}
type ModProgress = {
  enrollment_id: string; module_id: string
  watched_pct: number; watch_time_sec?: number | null
  completed: boolean; last_position_sec?: number | null
  updated_at?: string | null
}
type Checkpoint = { enrollment_id: string; module_id: string; correct: boolean; answered_at: string }

export default function LearnerDetailModal({
  learner, modules, quizzes, courseTitle, passingScore, maxRetries, onClose,
}: {
  learner: any
  modules: Module[]
  quizzes: Quiz[]
  courseTitle: string
  passingScore: number
  maxRetries: number
  onClose: () => void
}) {
  const [tab, setTab] = useState<"modules" | "quizzes" | "checkpoints" | "timeline">("modules")
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiStats, setAiStats] = useState<any | null>(null)

  const askAI = async () => {
    setAiOpen(true); setAiLoading(true); setAiSummary(null); setAiStats(null)
    try {
      const res = await fetch("/api/training/ai-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: learner.course_id, enrollment_id: learner.id }),
      })
      const d = await res.json()
      if (!res.ok) { setAiSummary(d.error || "AI วิเคราะห์ไม่สำเร็จ"); return }
      setAiSummary(d.summary || "—")
      setAiStats(d.stats ?? null)
    } catch (e: any) {
      setAiSummary(e?.message || "Network error")
    } finally { setAiLoading(false) }
  }

  const allAttempts: Attempt[] = learner.all_attempts ?? []
  const modProgress: ModProgress[] = learner.module_progress ?? []
  const checkpoints: Checkpoint[] = learner.checkpoint_answers ?? []

  // ── Aggregations ────────────────────────────────────────────
  const attemptsByQuiz = useMemo(() => {
    const m: Record<string, Attempt[]> = {}
    for (const a of allAttempts) (m[a.quiz_id] ??= []).push(a)
    for (const id in m) m[id].sort((a, b) => a.attempt_no - b.attempt_no)
    return m
  }, [allAttempts])

  const progressByModule = useMemo(() => {
    const m: Record<string, ModProgress> = {}
    for (const p of modProgress) m[p.module_id] = p
    return m
  }, [modProgress])

  const checkpointsByModule = useMemo(() => {
    const m: Record<string, Checkpoint[]> = {}
    for (const c of checkpoints) (m[c.module_id] ??= []).push(c)
    return m
  }, [checkpoints])

  // Timeline merges all activities (sorted desc)
  const timeline = useMemo(() => {
    const events: any[] = []
    for (const a of allAttempts) {
      if (a.submitted_at) {
        const quiz = quizzes.find(q => q.id === a.quiz_id)
        events.push({
          at: a.submitted_at,
          type: "quiz" as const,
          title: quiz?.title ?? "ควิซ",
          attemptNo: a.attempt_no,
          score: a.score, passed: a.passed,
          tabSwitches: a.tab_switches, timeUsed: a.time_used_sec,
        })
      }
    }
    for (const c of checkpoints) {
      const mod = modules.find(m => m.id === c.module_id)
      events.push({
        at: c.answered_at, type: "checkpoint" as const,
        title: mod?.title ?? "บทเรียน",
        correct: c.correct,
      })
    }
    for (const p of modProgress) {
      if (p.completed) {
        const mod = modules.find(m => m.id === p.module_id)
        events.push({
          at: p.updated_at ?? "", type: "module_complete" as const,
          title: mod?.title ?? "บทเรียน",
        })
      }
    }
    return events.filter(e => e.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [allAttempts, checkpoints, modProgress, modules, quizzes])

  const totalWatchTime = modProgress.reduce((s, p) => s + (Number(p.watch_time_sec) || 0), 0)
  const totalQuizTime = allAttempts.reduce((s, a) => s + (Number(a.time_used_sec) || 0), 0)

  const moduleQuizzes = (modId: string | null) => quizzes.filter(q => q.module_id === modId)

  const fmtSec = (s: number) => {
    if (!s) return "—"
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return m > 0 ? `${m} น. ${sec} ว.` : `${sec} วินาที`
  }

  const emp = learner.employee
  const initials = (emp?.first_name_th?.[0] ?? "") + (emp?.last_name_th?.[0] ?? "")
  const finalScore = learner.final_score

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm anim-fade-up" onClick={onClose}>
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Hero — clean white card style */}
        <div className="relative bg-white border-b border-slate-100 p-4 lg:p-5">
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button onClick={askAI} disabled={aiLoading}
              className="px-2.5 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-sm disabled:opacity-50">
              {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              AI วิเคราะห์
            </button>
            <button onClick={onClose}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
              aria-label="close">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 pr-10">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg font-black text-sky-700 overflow-hidden">
                {emp?.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              {learner.is_online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 flex items-center gap-1">
                <Sparkles size={10} /> LEARNER · <span className="truncate">{courseTitle}</span>
              </p>
              <h2 className="text-lg lg:text-xl font-black text-slate-800 truncate mt-0.5">
                {emp?.first_name_th} {emp?.last_name_th}
                {emp?.nickname && <span className="text-sm font-bold text-slate-400 ml-2">({emp.nickname})</span>}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {emp?.employee_code} · {emp?.department?.name ?? "—"} · {emp?.position?.name ?? "—"}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
              <StatusPill status={learner.status} />
              <p className="text-[10px] text-slate-400">
                ลงทะเบียน {learner.enrolled_at ? format(new Date(learner.enrolled_at), "d MMM yyyy", { locale: th }) : "—"}
              </p>
            </div>
          </div>

          {/* KPI strip — pastel cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <HeroStat icon={<TrendingUp size={13} />} color="sky" label="ความคืบหน้า" value={`${Math.round(Number(learner.progress_pct ?? 0))}%`} />
            <HeroStat icon={<BookOpen size={13} />} color="indigo" label="บทเรียน" value={`${learner.modules_completed ?? 0}/${learner.modules_total ?? 0}`} />
            <HeroStat icon={<Trophy size={13} />} color={finalScore != null ? (Number(finalScore) >= passingScore ? "emerald" : "rose") : "slate"}
              label="คะแนนสุดท้าย"
              value={finalScore != null ? `${Number(finalScore).toFixed(0)}%` : "—"} />
            <HeroStat icon={<Activity size={13} />} color="amber" label="ครั้งสอบรวม" value={allAttempts.length || "—"} />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-4 pt-3">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { k: "modules",     l: "บทเรียน",     i: <BookOpen size={14} />,     n: modules.length },
              { k: "quizzes",     l: "ควิซ",        i: <Award size={14} />,        n: allAttempts.length },
              { k: "checkpoints", l: "Checkpoint", i: <Target size={14} />,       n: checkpoints.length },
              { k: "timeline",    l: "ไทม์ไลน์",    i: <Activity size={14} />,     n: timeline.length },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  tab === t.k ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                {t.i} {t.l}
                {t.n > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.k ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}>{t.n}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3">
          {/* ── MODULES ── */}
          {tab === "modules" && (
            <>
              {modules.map((m, i) => {
                const p = progressByModule[m.id]
                const watched = (p?.watched_pct ?? 0) >= (m.required_watch_pct ?? 80)
                const cps = checkpointsByModule[m.id] ?? []
                const cpCorrect = cps.filter(c => c.correct).length
                const modQuizzes = moduleQuizzes(m.id)
                return (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 anim-fade-up">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        p?.completed ? "bg-emerald-100 text-emerald-700" :
                        watched ? "bg-amber-100 text-amber-700" :
                        (p?.watched_pct ?? 0) > 0 ? "bg-sky-100 text-sky-700" :
                        "bg-slate-100 text-slate-400"
                      }`}>
                        {p?.completed ? <CheckCircle2 size={18} /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-sm">{m.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                          {m.video_duration_sec && <span className="flex items-center gap-1"><PlayCircle size={11} /> {Math.floor(m.video_duration_sec/60)}:{String(m.video_duration_sec%60).padStart(2,"0")}</span>}
                          {p?.watch_time_sec ? <span>ใช้เวลาดู {fmtSec(p.watch_time_sec)}</span> : null}
                          {modQuizzes.length > 0 && <span><Award size={10} className="inline" /> {modQuizzes.length} ควิซ</span>}
                          {cps.length > 0 && <span className="text-emerald-600 font-bold">Checkpoint: {cpCorrect}/{cps.length} ถูก</span>}
                        </div>

                        {/* Watch bar */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${
                              p?.completed ? "bg-emerald-500" :
                              watched ? "bg-amber-500" :
                              "bg-sky-500"
                            }`} style={{ width: `${Math.min(100, p?.watched_pct ?? 0)}%` }} />
                          </div>
                          <span className="text-[11px] font-black text-slate-600 w-12 text-right">
                            {Math.round(p?.watched_pct ?? 0)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          เกณฑ์ {m.required_watch_pct ?? 80}% ·
                          {" "}{p?.completed
                            ? <span className="text-emerald-600 font-bold">✓ ผ่านเกณฑ์</span>
                            : watched
                              ? <span className="text-amber-600 font-bold">⚠ ยังต้องทำควิซ</span>
                              : (p?.watched_pct ?? 0) > 0
                                ? <span className="text-sky-600">กำลังเรียน</span>
                                : <span className="text-slate-400">ยังไม่เริ่ม</span>}
                        </p>

                        {/* Quizzes inside this module */}
                        {modQuizzes.map(q => {
                          const atts = attemptsByQuiz[q.id] ?? []
                          const passed = atts.some(a => a.passed)
                          const best = atts.reduce<Attempt | null>((b, a) => !b || Number(a.score || 0) > Number(b.score || 0) ? a : b, null)
                          return (
                            <div key={q.id} className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <Award size={12} className="text-amber-500 flex-shrink-0" />
                                  <span className="text-xs font-bold text-slate-700 truncate">{q.title}</span>
                                </div>
                                {best ? (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                    {passed ? "✓ ผ่าน" : "✗ ไม่ผ่าน"} · best {best.score}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">ยังไม่ทำ</span>
                                )}
                              </div>
                              {atts.length > 0 && (
                                <AttemptStrip atts={atts} passingScore={q.passing_score} maxRetries={maxRetries} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── QUIZZES (flat list of all attempts) ── */}
          {tab === "quizzes" && (
            <>
              {quizzes.map(q => {
                const atts = attemptsByQuiz[q.id] ?? []
                if (atts.length === 0) return (
                  <div key={q.id} className="bg-white border border-dashed border-slate-200 rounded-2xl p-4 anim-fade-up">
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-slate-300" />
                      <span className="text-sm font-bold text-slate-400">{q.title}</span>
                      <span className="ml-auto text-[10px] text-slate-300">ยังไม่ทำ</span>
                    </div>
                  </div>
                )
                const passed = atts.some(a => a.passed)
                const best = atts.reduce<Attempt | null>((b, a) => !b || Number(a.score || 0) > Number(b.score || 0) ? a : b, null)
                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4 anim-fade-up">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <Award size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-sm">{q.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {q.question_count} ข้อ · ผ่าน {q.passing_score}% · ใช้สิทธิ์ {atts.length}/{maxRetries}
                            {q.module_id === null && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full text-[9px]">FINAL</span>}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {passed ? "✓ ผ่านแล้ว" : "✗ ยังไม่ผ่าน"}
                      </span>
                    </div>

                    {/* Attempt rows */}
                    <div className="space-y-1.5">
                      {atts.map(a => {
                        const isBest = best && a.attempt_no === best.attempt_no
                        return (
                          <div key={a.attempt_no} className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                            a.passed ? "bg-emerald-50 border-emerald-100" :
                            a.submitted_at ? "bg-rose-50 border-rose-100" :
                            "bg-slate-50 border-slate-100"
                          }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                              a.passed ? "bg-emerald-500 text-white" :
                              a.submitted_at ? "bg-rose-500 text-white" :
                              "bg-slate-300 text-white"
                            }`}>
                              {a.attempt_no}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-black text-sm ${a.passed ? "text-emerald-700" : a.submitted_at ? "text-rose-700" : "text-slate-500"}`}>
                                  {a.score != null ? `${a.score}%` : "—"}
                                </span>
                                {a.passed ? <CheckCircle2 size={12} className="text-emerald-600" /> : a.submitted_at ? <XCircle size={12} className="text-rose-500" /> : null}
                                {isBest && <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">BEST</span>}
                                {(a.tab_switches ?? 0) > 2 && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full flex items-center gap-0.5">
                                    <AlertTriangle size={9} /> สลับแท็บ {a.tab_switches}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                                {a.submitted_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={9} />
                                    {format(new Date(a.submitted_at), "d MMM HH:mm", { locale: th })}
                                  </span>
                                )}
                                {a.time_used_sec && <span className="flex items-center gap-1"><Clock size={9} /> {fmtSec(a.time_used_sec)}</span>}
                                {!a.submitted_at && <span className="text-amber-600 font-bold">⏳ กำลังทำ</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {quizzes.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
                  <FileQuestion size={32} className="mx-auto mb-2 text-slate-200" />
                  คอร์สนี้ยังไม่มีควิซ
                </div>
              )}
            </>
          )}

          {/* ── CHECKPOINTS ── */}
          {tab === "checkpoints" && (
            <>
              {modules.map(m => {
                const cps = checkpointsByModule[m.id] ?? []
                if (cps.length === 0) return null
                const correct = cps.filter(c => c.correct).length
                return (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 anim-fade-up">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-purple-500" />
                      <p className="font-black text-slate-800 text-sm">{m.title}</p>
                      <span className="ml-auto text-[10px] font-bold text-slate-500">
                        ถูก <span className="text-emerald-600">{correct}</span>/<span>{cps.length}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cps.map((c, i) => (
                        <span key={i}
                          title={format(new Date(c.answered_at), "d MMM HH:mm:ss", { locale: th })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
                            c.correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                          {c.correct ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          #{i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {checkpoints.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
                  <Target size={32} className="mx-auto mb-2 text-slate-200" />
                  ยังไม่มีการตอบ Checkpoint
                </div>
              )}
            </>
          )}

          {/* ── TIMELINE ── */}
          {tab === "timeline" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {timeline.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <Activity size={32} className="mx-auto mb-2 text-slate-200" />
                    ยังไม่มีกิจกรรม
                  </div>
                ) : timeline.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ev.type === "quiz"
                        ? ev.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        : ev.type === "checkpoint"
                          ? ev.correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                    }`}>
                      {ev.type === "quiz" ? <Award size={16} /> :
                       ev.type === "checkpoint" ? <Target size={16} /> :
                       <CheckCircle2 size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        {ev.type === "quiz" ? `ทำควิซ "${ev.title}" — ${ev.score ?? "—"}%` :
                         ev.type === "checkpoint" ? `Checkpoint "${ev.title}" — ${ev.correct ? "ถูก" : "ผิด"}` :
                         `เรียนจบบทเรียน "${ev.title}"`}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {format(new Date(ev.at), "d MMM yyyy HH:mm", { locale: th })}
                        {ev.type === "quiz" && ev.attemptNo && <span> · ครั้งที่ {ev.attemptNo}</span>}
                        {ev.type === "quiz" && ev.timeUsed && <span> · ใช้เวลา {fmtSec(ev.timeUsed)}</span>}
                      </p>
                    </div>
                    {ev.type === "quiz" && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ev.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {ev.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer stats strip */}
        <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11} /> เวลาดูวิดีโอ {fmtSec(totalWatchTime)}</span>
            <span className="flex items-center gap-1"><Activity size={11} /> เวลาในควิซ {fmtSec(totalQuizTime)}</span>
            {learner.total_tab_switches > 0 && (
              <span className={`flex items-center gap-1 ${learner.total_tab_switches > 5 ? "text-rose-600 font-bold" : ""}`}>
                <AlertTriangle size={11} /> สลับแท็บรวม {learner.total_tab_switches} ครั้ง
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            ปิด
          </button>
        </div>
      </div>

      {/* AI per-learner modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setAiOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden mt-4 sm:mt-0"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <div>
                  <h3 className="font-black text-sm">AI วิเคราะห์รายคน</h3>
                  <p className="text-[10px] opacity-90">{emp?.first_name_th} {emp?.last_name_th}</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {aiLoading ? (
                <div className="py-12 text-center">
                  <Loader2 size={26} className="mx-auto animate-spin text-violet-400 mb-2" />
                  <p className="text-xs text-slate-500">วิเคราะห์... 5-15 วินาที</p>
                </div>
              ) : (
                <>
                  {aiStats && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="bg-indigo-50 rounded-lg p-2 border border-white">
                        <p className="text-[9px] font-bold uppercase opacity-80 text-indigo-700">progress</p>
                        <p className="text-base font-black text-indigo-700">{aiStats.progress?.toFixed(0)}%</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2 border border-white">
                        <p className="text-[9px] font-bold uppercase opacity-80 text-emerald-700">avg</p>
                        <p className="text-base font-black text-emerald-700">{aiStats.avg?.toFixed(0)}%</p>
                      </div>
                      <div className="bg-sky-50 rounded-lg p-2 border border-white">
                        <p className="text-[9px] font-bold uppercase opacity-80 text-sky-700">attempts</p>
                        <p className="text-base font-black text-sky-700">{aiStats.passed_attempts}/{aiStats.attempts}</p>
                      </div>
                      <div className={`${aiStats.tab_switches > 3 ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-700"} rounded-lg p-2 border border-white`}>
                        <p className="text-[9px] font-bold uppercase opacity-80">tab-switch</p>
                        <p className="text-base font-black">{aiStats.tab_switches}</p>
                      </div>
                    </div>
                  )}

                  {aiSummary && (
                    <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                      <div className="text-sm text-slate-700 leading-loose whitespace-pre-wrap font-sans" style={{ lineHeight: 1.85 }}>
                        {aiSummary.replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/gm, "")}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400">
                <Sparkles size={9} className="inline" /> พัฒนาโดยทีม SHD Technology · AI อาจมี error ตรวจสอบเสมอ
              </p>
              <button onClick={() => setAiOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AttemptStrip({ atts, passingScore, maxRetries }: { atts: Attempt[]; passingScore: number; maxRetries: number }) {
  const slots = Array.from({ length: maxRetries }, (_, i) => atts[i])
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {slots.map((a, i) => {
        if (!a) return <span key={i} className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-400 rounded">—</span>
        return (
          <span key={i} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${
            a.passed ? "bg-emerald-500 text-white" :
            a.submitted_at ? "bg-rose-500 text-white" :
            "bg-amber-400 text-amber-900"
          }`}>
            #{a.attempt_no}: {a.score ?? "—"}%
          </span>
        )
      })}
    </div>
  )
}

function HeroStat({ icon, label, value, color = "slate" }: { icon: React.ReactNode; label: string; value: any; color?: string }) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   ring: "border-slate-100" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     ring: "border-sky-100" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "border-indigo-100" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "border-emerald-100" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-600",    ring: "border-rose-100" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className={`bg-white border ${p.ring} rounded-xl px-2.5 py-2`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-6 h-6 rounded-lg ${p.bg} ${p.text} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className={`text-base font-black mt-1 leading-none ${p.text}`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { l: string; c: string }> = {
    not_started: { l: "ยังไม่เริ่ม", c: "bg-slate-100 text-slate-700 border-slate-200" },
    in_progress: { l: "กำลังเรียน", c: "bg-amber-50 text-amber-700 border-amber-200" },
    completed:   { l: "จบแล้ว",    c: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    failed:      { l: "ไม่ผ่าน",   c: "bg-rose-50 text-rose-700 border-rose-200" },
  }
  const s = cfg[status] || cfg.not_started
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${s.c}`}>{s.l}</span>
}
