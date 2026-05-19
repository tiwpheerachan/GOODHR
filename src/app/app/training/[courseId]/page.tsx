"use client"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, PlayCircle, FileText, Award, Loader2, CheckCircle2,
  Star, Trophy, RotateCcw, Target, BookOpen, TrendingUp, Clock,
  Sparkles, GraduationCap, Tag, ChevronRight, Users, Play,
  ChevronDown, ChevronUp, ListChecks,
} from "lucide-react"
import toast from "react-hot-toast"

const DIFFICULTY_LABEL: Record<string, { l: string; c: string; emoji: string }> = {
  beginner:     { l: "เริ่มต้น",     c: "bg-emerald-100 text-emerald-700", emoji: "🟢" },
  intermediate: { l: "ระดับกลาง",     c: "bg-amber-100 text-amber-700",     emoji: "🟡" },
  advanced:     { l: "ขั้นสูง",       c: "bg-rose-100 text-rose-700",       emoji: "🔴" },
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const router = useRouter()
  const sp = useSearchParams()
  const urlEnrollmentId = sp?.get("en")
  const [enrollmentId, setEnrollmentId] = useState<string | null>(urlEnrollmentId ?? null)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [quizAttempts, setQuizAttempts] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [showObjectives, setShowObjectives] = useState(true)

  const resetModule = async (moduleId: string, moduleTitle: string) => {
    if (!enrollmentId) return
    if (!confirm(`เริ่มเรียน "${moduleTitle}" ใหม่ตั้งแต่ 0%? ความคืบหน้าและสิทธิ์สอบจะถูกรีเซ็ต`)) return
    setResetting(moduleId)
    const t = toast.loading("กำลังรีเซ็ต...")
    try {
      const r = await fetch("/api/training/progress/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: enrollmentId, module_id: moduleId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Reset ล้มเหลว")
      toast.success("รีเซ็ตแล้ว — เริ่มเรียน", { id: t })
      router.push(`/app/training/${courseId}/${moduleId}?en=${enrollmentId}`)
    } catch (e: any) {
      toast.error(e.message, { id: t })
      setResetting(null)
    }
  }

  const load = async () => {
    const res = await fetch(`/api/training/learner/course?course_id=${courseId}`)
    const d = await res.json()
    if (!res.ok) {
      console.error("[learner/course]", d.error)
      setCourse(null); setLoading(false)
      return
    }
    setCourse(d.course)
    setModules(d.modules ?? [])
    setQuizzes(d.quizzes ?? [])
    if (d.enrollment?.id) setEnrollmentId(d.enrollment.id)
    const prog: Record<string, any> = {}
    for (const p of (d.progress ?? [])) prog[p.module_id] = p
    setProgress(prog)
    if (d.enrollment?.id) {
      const att = await fetch(`/api/training/attempts?enrollment_id=${d.enrollment.id}`).then(r => r.json())
      const grouped: Record<string, any[]> = {}
      for (const a of (att.attempts ?? [])) {
        if (!grouped[a.quiz_id]) grouped[a.quiz_id] = []
        grouped[a.quiz_id].push(a)
      }
      setQuizAttempts(grouped)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [courseId])

  // Pre-compute module statuses (hooks must come before early returns)
  const moduleStatuses = useMemo(() => modules.map(m => {
    const p = progress[m.id]
    const watched = (p?.watched_pct ?? 0) >= (m.required_watch_pct ?? 80)
    const modQuizzes = quizzes.filter(q => q.module_id === m.id)
    const allQuizPassed = modQuizzes.length === 0 ||
      modQuizzes.every(q => (quizAttempts[q.id] ?? []).some((a: any) => a.passed))
    const anyQuizExhausted = modQuizzes.some(q => {
      const atts = quizAttempts[q.id] ?? []
      return !atts.some((a: any) => a.passed) && atts.length >= Number(q.max_retries ?? 2)
    })
    let status: "not_started" | "watching" | "needs_quiz" | "needs_review" | "complete"
    if (!p || (p.watched_pct ?? 0) === 0) status = "not_started"
    else if (!watched) status = "watching"
    else if (allQuizPassed) status = "complete"
    else if (anyQuizExhausted) status = "needs_review"
    else status = "needs_quiz"
    return { m, p, status, modQuizzes }
  }), [modules, progress, quizzes, quizAttempts])

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="skeleton rounded-3xl h-64" />
      <div className="skeleton rounded-2xl h-24" />
      <div className="skeleton rounded-2xl h-20" />
      <div className="skeleton rounded-2xl h-20" />
    </div>
  )
  if (!course) return <div className="p-4 text-center text-slate-400">ไม่พบคอร์ส</div>

  const finalQuiz = quizzes.find(q => !q.module_id)
  const completedCount = modules.filter(m => progress[m.id]?.completed).length
  const overallPct = modules.length > 0 ? (completedCount / modules.length) * 100 : 0
  const allModulesDone = modules.every(m => progress[m.id]?.completed)
  const totalWatchTime = Object.values(progress).reduce((s: number, p: any) => s + (Number(p?.watch_time_sec) || 0), 0)

  // "Continue learning" — find next unfinished module
  const nextModule = moduleStatuses.find(({ status }) => status !== "complete")?.m

  const diff = DIFFICULTY_LABEL[course.difficulty ?? "beginner"] || DIFFICULTY_LABEL.beginner

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-32 max-w-4xl mx-auto">
      <Link href="/app/training" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> ห้องเรียน
      </Link>

      {/* ── Cover (clean, no color overlay) ── */}
      <div className="relative rounded-3xl overflow-hidden shadow-md bg-slate-100 anim-fade-up">
        <div className="relative aspect-[21/9] lg:aspect-[3/1]">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={course.title}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center">
              <GraduationCap size={64} className="text-white/40" />
            </div>
          )}

          {/* Floating top badges — only on the image */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap gap-1.5">
              {allModulesDone && (
                <span className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-black rounded-full shadow-lg flex items-center gap-1 anim-pulse-glow">
                  <Trophy size={11} /> เรียนสำเร็จ
                </span>
              )}
              {course.affect_kpi && (
                <span className="px-2.5 py-1 bg-amber-400 text-amber-900 text-[11px] font-black rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles size={11} /> KPI
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Title / channel / meta card (separate from image, no overlay) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm anim-fade-up">
        {course.channel && (
          <p className="text-[11px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
            <BookOpen size={11} /> {course.channel.name}{course.channel.brand ? ` · ${course.channel.brand}` : ""}
          </p>
        )}
        <h1 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1.5 leading-tight">{course.title}</h1>
        {course.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{course.description}</p>}

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${diff.c}`}>
            {diff.emoji} {diff.l}
          </span>
          {course.estimated_minutes ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-[11px] font-bold">
              <Clock size={11} /> ~{course.estimated_minutes} นาที
            </span>
          ) : null}
          {course.target_audience && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[11px] font-bold">
              <Users size={11} /> {course.target_audience}
            </span>
          )}
          {(course.tags ?? []).slice(0, 4).map((t: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-2 py-1 bg-pink-50 text-pink-700 rounded-full text-[10px] font-bold">
              <Tag size={9} /> {t}
            </span>
          ))}
        </div>

        {/* Continue / Restart action */}
        {nextModule && enrollmentId && (
          <Link href={`/app/training/${courseId}/${nextModule.id}?en=${enrollmentId}`}
            className="mt-4 flex items-center gap-3 p-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-2xl shadow-md hover:shadow-lg transition-all group">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Play size={20} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black opacity-90 tracking-wider">เรียนต่อ</p>
              <p className="text-sm font-bold truncate">{nextModule.title}</p>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
        {allModulesDone && (
          <div className="mt-4 p-3 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <Trophy size={28} className="text-emerald-500 anim-pulse-glow flex-shrink-0" />
            <div className="flex-1">
              <p className="font-black text-emerald-800 text-sm">เก่งมาก! เรียนคอร์สนี้สำเร็จแล้ว 🎉</p>
              <p className="text-[11px] text-emerald-600">สามารถดูทบทวนเนื้อหาได้ทุกเมื่อ</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Learning objectives panel ── */}
      {(course.learning_objectives ?? []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm anim-fade-up overflow-hidden">
          <button onClick={() => setShowObjectives(s => !s)}
            className="w-full flex items-center gap-3 p-4 hover:bg-slate-50">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-slate-800 text-sm">สิ่งที่คุณจะได้เรียนรู้</p>
              <p className="text-[11px] text-slate-500">{course.learning_objectives.length} เป้าหมายการเรียนรู้</p>
            </div>
            {showObjectives ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showObjectives && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {course.learning_objectives.map((obj: string, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-100 rounded-lg p-2">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-700">{obj}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {course.prerequisites && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm anim-fade-up flex items-start gap-3">
          <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-slate-700 mb-0.5">ความรู้พื้นฐาน / ข้อแนะนำก่อนเรียน</p>
            <p className="text-xs text-slate-600 leading-relaxed">{course.prerequisites}</p>
          </div>
        </div>
      )}

      {/* ── Progress card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm anim-fade-up">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-sky-500" /> ความคืบหน้าของฉัน
          </p>
          <div className="text-right">
            <span className={`text-3xl font-black ${overallPct >= 100 ? "text-emerald-600" : "text-sky-700"}`}>
              {overallPct.toFixed(0)}%
            </span>
            {totalWatchTime > 0 && (
              <p className="text-[10px] text-slate-500 -mt-1">ดูแล้ว {Math.floor(totalWatchTime / 60)} นาที</p>
            )}
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3 relative">
          <div className={`h-full transition-all duration-700 ${
            overallPct >= 100 ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-sky-400 to-blue-500"
          }`} style={{ width: `${overallPct}%` }} />
          {overallPct < 100 && overallPct > 5 && (
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-full shadow"
              style={{ left: `calc(${overallPct}% - 6px)` }} />
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniStat icon={<BookOpen size={12} />} label="บทเรียน" value={`${completedCount}/${modules.length}`} color="indigo" />
          <MiniStat icon={<Target size={12} />} label="เกณฑ์ผ่าน" value={`${course.passing_score}%`} color="emerald" />
          <MiniStat icon={<RotateCcw size={12} />} label="สอบซ้ำ" value={`${course.max_retries} ครั้ง`} color="amber" />
          <MiniStat icon={<Award size={12} />} label="ควิซ" value={quizzes.length} color="rose" />
        </div>
      </div>

      {/* ── Modules list ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <ListChecks size={12} /> บทเรียน · {modules.length} บท
          </p>
          {completedCount > 0 && <p className="text-[11px] font-bold text-emerald-600">เรียนจบแล้ว {completedCount} บท</p>}
        </div>
        {moduleStatuses.map(({ m, p, status, modQuizzes }, i) => {
          const isResetting = resetting === m.id

          const StatusBadge = () => {
            if (status === "complete") return <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500 text-white rounded-full">✓ จบ</span>
            if (status === "needs_review") return <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full">เรียนใหม่</span>
            if (status === "needs_quiz") return <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500 text-white rounded-full">ทำควิซ</span>
            if (status === "watching") return <span className="text-[10px] font-black px-2 py-0.5 bg-sky-500 text-white rounded-full">กำลังเรียน</span>
            return <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">ยังไม่เริ่ม</span>
          }

          const StatusCornerIcon = () => {
            const cls = "absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
            if (isResetting) return <div className={`${cls} bg-slate-400 text-white`}><Loader2 size={12} className="animate-spin" /></div>
            if (status === "complete") return <div className={`${cls} bg-emerald-500 text-white`}><CheckCircle2 size={14} /></div>
            if (status === "needs_review") return <div className={`${cls} bg-rose-500 text-white`}><RotateCcw size={12} /></div>
            if (status === "needs_quiz") return <div className={`${cls} bg-amber-500 text-white`}><Award size={12} /></div>
            return null
          }

          const cardBorder =
            status === "complete" ? "border-emerald-200 hover:border-emerald-300" :
            status === "needs_review" ? "border-rose-200 hover:border-rose-300" :
            status === "needs_quiz" ? "border-amber-200 hover:border-amber-300" :
            status === "watching" ? "border-sky-200 hover:border-sky-300" :
            "border-slate-200 hover:border-slate-300"

          const cardClass = `flex items-stretch gap-3 p-3 bg-white border rounded-2xl hover:shadow-md transition-all group ${cardBorder}`

          const cardContent = (
            <>
              {/* Thumbnail or numeric badge — NO color overlay */}
              <div className="relative flex-shrink-0">
                {m.thumbnail_url ? (
                  <div className="w-24 h-20 lg:w-28 lg:h-20 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                    <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-20 lg:w-28 lg:h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
                    <PlayCircle size={28} />
                  </div>
                )}
                {/* Order number — floating bottom-left */}
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-black rounded">
                  #{i + 1}
                </span>
                <StatusCornerIcon />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className={`font-bold text-sm truncate ${
                    status === "complete" ? "text-emerald-800" :
                    status === "needs_review" ? "text-rose-800" :
                    "text-slate-800"
                  }`}>{m.title}</p>
                  <StatusBadge />
                </div>
                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 flex-wrap">
                  {m.video_url && <span className="flex items-center gap-0.5"><PlayCircle size={10} /> วิดีโอ</span>}
                  {m.video_duration_sec && <span className="text-slate-400">{Math.floor(m.video_duration_sec/60)}:{String(m.video_duration_sec%60).padStart(2,"0")}</span>}
                  {(m.documents?.length ?? 0) > 0 && <span className="flex items-center gap-0.5"><FileText size={10} /> {m.documents.length} เอกสาร</span>}
                  {modQuizzes.length > 0 && <span className="flex items-center gap-0.5"><Award size={10} /> {modQuizzes.length} ควิซ</span>}
                </div>
                {/* Progress bar */}
                {p && p.watched_pct > 0 && status !== "needs_review" && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${
                        status === "complete" ? "bg-emerald-500" :
                        status === "needs_quiz" ? "bg-amber-500" :
                        "bg-sky-500"
                      }`} style={{ width: `${p.watched_pct}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-slate-600 w-9 text-right">{Math.round(p.watched_pct)}%</span>
                  </div>
                )}
                {status === "needs_review" && (
                  <p className="text-[10px] text-rose-600 mt-1 font-bold flex items-center gap-1">
                    ⚠ กดเพื่อรีเซ็ตและเริ่มเรียนใหม่
                  </p>
                )}
              </div>

              {/* Chevron */}
              <div className="flex items-center text-slate-300 group-hover:text-slate-500 flex-shrink-0">
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </>
          )

          if (status === "needs_review") {
            return (
              <button key={m.id} onClick={() => resetModule(m.id, m.title)} disabled={isResetting}
                className={`${cardClass} text-left w-full disabled:opacity-50`}>
                {cardContent}
              </button>
            )
          }
          return (
            <Link key={m.id} href={`/app/training/${courseId}/${m.id}?en=${enrollmentId}`} className={cardClass}>
              {cardContent}
            </Link>
          )
        })}
      </div>

      {/* ── Final Quiz ── */}
      {finalQuiz && (() => {
        const attempts = quizAttempts[finalQuiz.id] ?? []
        const passed = attempts.some((a: any) => a.passed)
        const bestScore = attempts.reduce((m: number, a: any) => Math.max(m, Number(a.score || 0)), 0)
        const maxRetries = Number(finalQuiz.max_retries ?? 2)
        const usedAttempts = attempts.length
        const isExhausted = !passed && usedAttempts >= maxRetries
        const locked = !allModulesDone && !passed
        return (
          <Link href={`/app/training/${courseId}/quiz/${finalQuiz.id}?en=${enrollmentId}`}
            className={`block relative overflow-hidden p-4 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md group ${
              passed ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300" :
              isExhausted ? "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300" :
              allModulesDone ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 anim-pulse-glow" :
              "bg-slate-50 border-slate-200 opacity-70"
            }`}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/40 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${
                passed ? "bg-gradient-to-br from-emerald-400 to-green-600 text-white" :
                isExhausted ? "bg-gradient-to-br from-rose-400 to-pink-600 text-white" :
                allModulesDone ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                "bg-slate-200 text-slate-400"
              }`}>
                {passed ? <Trophy size={26} /> : isExhausted ? <RotateCcw size={24} /> : <Award size={26} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">FINAL EXAM</span>
                  <p className="font-black text-slate-800">{finalQuiz.title}</p>
                  {passed && <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500 text-white rounded-full">✓ ผ่าน {bestScore.toFixed(0)}%</span>}
                  {isExhausted && <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full">ต้องเรียนใหม่</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {finalQuiz.question_count} ข้อ · ผ่าน {finalQuiz.passing_score}%
                  {finalQuiz.time_limit_sec ? ` · ${Math.floor(finalQuiz.time_limit_sec / 60)} นาที` : ""}
                </p>
                {!passed && !isExhausted && usedAttempts > 0 && (
                  <p className="text-[11px] text-amber-700 mt-1 font-bold">
                    ครั้งที่ {usedAttempts}/{maxRetries} · best {bestScore.toFixed(0)}%
                  </p>
                )}
                {locked && <p className="text-[10px] text-rose-500 mt-1">🔒 เรียนทุกบทให้จบก่อน</p>}
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          </Link>
        )
      })()}

      {/* Feedback button */}
      <button onClick={() => setShowFeedback(true)}
        className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all flex items-center justify-center gap-2 group">
        <Star size={14} className="group-hover:text-amber-500 group-hover:fill-current transition-all" />
        ให้คะแนน trainer / ฟีดแบ็ก
      </button>

      {showFeedback && <FeedbackModal courseId={courseId} onClose={() => setShowFeedback(false)} />}
    </div>
  )
}

function MiniStat({ icon, label, value, color }: any) {
  const cls: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  }
  return (
    <div className={`${cls[color]} border rounded-xl p-2 text-center`}>
      <div className="flex items-center justify-center gap-1 opacity-70 mb-0.5">
        {icon}
        <span className="text-[9px] font-bold">{label}</span>
      </div>
      <p className="text-sm font-black">{value}</p>
    </div>
  )
}

function FeedbackModal({ courseId, onClose }: any) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    setSubmitting(true)
    const res = await fetch("/api/training/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, rating, comment }),
    })
    setSubmitting(false)
    if (!res.ok) { toast.error("ส่งไม่สำเร็จ"); return }
    toast.success("ขอบคุณสำหรับฟีดแบ็ก!"); onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade-up" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
          <h2 className="font-black flex items-center gap-2"><Star size={18} fill="currentColor" /> ให้คะแนน Trainer</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`p-1 transition-transform hover:scale-110 ${n <= rating ? "text-amber-400" : "text-slate-300"}`}>
                <Star size={32} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="เล่าให้เราฟัง — สิ่งที่ชอบ / อยากให้ปรับปรุง (ไม่บังคับ)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">ยกเลิก</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl disabled:opacity-60 shadow-md flex items-center justify-center gap-1.5">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} fill="currentColor" />} ส่งฟีดแบ็ก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
