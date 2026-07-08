"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Loader2, CheckCircle2, Download, Award, Trophy, X, RotateCcw, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import VideoPlayer, { type Checkpoint } from "@/components/training/VideoPlayer"
import YouTubePlayer from "@/components/training/YouTubePlayer"
import ReadingLesson from "@/components/training/ReadingLesson"
import { parseVideoUrl, supportsCheckpoint, videoSourceName } from "@/lib/training/video-url"

export default function LessonPlayerPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const sp = useSearchParams()
  const router = useRouter()
  const urlEnrollmentId = sp?.get("en")
  const { user } = useAuth()
  const [module, setModule] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [progress, setProgress] = useState<any>(null)
  const [moduleQuizzes, setModuleQuizzes] = useState<any[]>([])
  const [quizAttempts, setQuizAttempts] = useState<Record<string, any[]>>({})
  const [livePct, setLivePct] = useState<number>(0)            // % การดูจาก player สด
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(urlEnrollmentId ?? null)
  const completedToastRef = useRef(false)  // ป้องกัน popup เด้งซ้ำ

  const reloadData = async () => {
    const [d, c] = await Promise.all([
      fetch(`/api/training/learner/module?module_id=${moduleId}`).then(r => r.json()),
      fetch(`/api/training/learner/course?course_id=${courseId}`).then(r => r.json()).catch(() => ({} as any)),
    ])
    if (d.error) { console.error("[learner/module]", d.error); setModule(null); return }
    setModule(d.module)
    setCheckpoints(d.checkpoints ?? [])
    setProgress(d.progress)
    if (d.enrollment_id) setEnrollmentId(d.enrollment_id)
    const mq = (c.quizzes ?? []).filter((q: any) => q.module_id === moduleId)
    setModuleQuizzes(mq)
    // โหลด quiz attempts
    const enId = d.enrollment_id
    if (enId) {
      const att = await fetch(`/api/training/attempts?enrollment_id=${enId}`).then(r => r.json())
      const grouped: Record<string, any[]> = {}
      for (const a of (att.attempts ?? [])) {
        if (!grouped[a.quiz_id]) grouped[a.quiz_id] = []
        grouped[a.quiz_id].push(a)
      }
      setQuizAttempts(grouped)
    }
  }

  useEffect(() => {
    reloadData().finally(() => setLoading(false))
    // reset complete toast flag เมื่อเปลี่ยน module
    completedToastRef.current = false
  }, [moduleId, courseId])

  // ── Reset module — เริ่มเรียนใหม่ ──
  const doReset = async () => {
    if (!enrollmentId) return
    setResetting(true)
    const t = toast.loading("กำลังรีเซ็ต...")
    try {
      const r = await fetch("/api/training/progress/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: enrollmentId, module_id: moduleId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success("เริ่มต้นใหม่แล้ว — รีเฟรชหน้า...", { id: t })
      setShowResetConfirm(false)
      setTimeout(() => window.location.reload(), 800)
    } catch (e: any) {
      toast.error(e.message, { id: t })
      setResetting(false)
    }
  }

  const updateProgress = async (state: { watched_pct: number; watch_time_sec: number; last_position_sec: number }) => {
    setLivePct(state.watched_pct)
    const reqPct = module?.content_type === "text" ? 100 : (module?.required_watch_pct ?? 80)
    // เรียนถึงเกณฑ์ครั้งแรก → auto-popup เฉพาะกรณีต้องทำควิซ (ไม่เด้งถ้า exhausted หรือผ่านแล้ว)
    const hasUnpassedQuiz = moduleQuizzes.length > 0 && moduleQuizzes.some((q: any) => {
      const atts = quizAttempts[q.id] ?? []
      return !atts.some((a: any) => a.passed) && atts.length < Number(q.max_retries ?? 2)
    })
    if (!completedToastRef.current && state.watched_pct >= reqPct && hasUnpassedQuiz) {
      completedToastRef.current = true
      setShowCompleteModal(true)
    }
    if (!enrollmentId) return
    await fetch("/api/training/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_id: enrollmentId, module_id: moduleId, ...state }),
    })
  }

  const onCheckpointAnswered = async (
    checkpointId: string, correct: boolean,
    detail?: { question_text: string; question_type: string; answer: any }
  ) => {
    if (!enrollmentId) return
    await fetch("/api/training/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_id: enrollmentId, module_id: moduleId,
        watched_pct: progress?.watched_pct ?? 0,
        watch_time_sec: progress?.watch_time_sec ?? 0,
        last_position_sec: progress?.last_position_sec ?? 0,
        answered_checkpoint_id: checkpointId,
        checkpoint_detail: detail ? { ...detail, correct } : undefined,
      }),
    })
  }

  const initialAnsweredIds: string[] = Array.isArray(progress?.answered_checkpoints) ? progress.answered_checkpoints : []

  if (loading) return <div className="p-4 flex justify-center py-12"><Loader2 className="animate-spin text-sky-400" /></div>
  if (!module) return <div className="p-4 text-center text-slate-400">ไม่พบบทเรียน</div>

  const userInfo = user?.employee
    ? `${user.employee.first_name_th} ${user.employee.last_name_th} · ${user.employee.employee_code}`
    : "Confidential"

  // ── บทเรียนแบบ "อ่านเนื้อหาให้จบ" ──
  const isReading = module.content_type === "text" || (!!module.content && !module.video_url)
  // บทเรียนแบบอ่าน ต้องอ่านจบจริง (100%) — ไม่งั้น quiz จะปลดล็อกตอนเลื่อนถึง 99%
  const requiredPct = isReading ? 100 : (module.required_watch_pct ?? 80)
  const watchedEnough = (progress?.completed || livePct >= requiredPct)
  const currentPct = Math.max(livePct, progress?.watched_pct ?? 0)

  // ── Determine status ตรง logic ที่ถูกต้อง ──
  const allQuizPassed = moduleQuizzes.length === 0 ||
    moduleQuizzes.every((q: any) => (quizAttempts[q.id] ?? []).some((a: any) => a.passed))
  const anyQuizExhausted = moduleQuizzes.some((q: any) => {
    const atts = quizAttempts[q.id] ?? []
    return !atts.some((a: any) => a.passed) && atts.length >= Number(q.max_retries ?? 2)
  })

  // ── Status definition ──
  const isTrulyComplete = watchedEnough && allQuizPassed
  const needsReview     = watchedEnough && anyQuizExhausted
  const needsQuiz       = watchedEnough && !allQuizPassed && !anyQuizExhausted && moduleQuizzes.length > 0
  // Auto-popup เด้งเฉพาะตอนต้องทำควิซ (ไม่เด้งเมื่อ exhausted)
  const shouldPopupQuiz = needsQuiz

  return (
    <div className="p-4 lg:p-6 space-y-4 pb-32 max-w-3xl mx-auto">
      <Link href={`/app/training/${courseId}?en=${enrollmentId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> กลับไปคอร์ส
      </Link>

      {/* Module hero — uses thumbnail as background when available */}
      {module.thumbnail_url ? (
        <div className="relative h-44 lg:h-56 rounded-3xl overflow-hidden shadow-lg anim-fade-up">
          <img src={module.thumbnail_url} alt={module.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <h1 className="text-2xl lg:text-3xl font-black text-white drop-shadow-lg">{module.title}</h1>
            {module.description && <p className="text-sm text-white/90 mt-1 drop-shadow line-clamp-2">{module.description}</p>}
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-black text-slate-800">{module.title}</h1>
          {module.description && <p className="text-sm text-slate-500">{module.description}</p>}
        </>
      )}

      {/* ⛔ ต้องเรียนใหม่ — ใช้สิทธิ์สอบครบแล้วยังไม่ผ่าน */}
      {needsReview && (
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
              <RotateCcw size={22} />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg">ต้องเรียนใหม่</p>
              <p className="text-xs opacity-90 mt-1">
                คุณใช้สิทธิ์สอบครบแล้วแต่ยังไม่ผ่านควิซ — กรุณาเริ่มเรียนใหม่เพื่อให้เข้าใจเนื้อหามากขึ้น แล้วทดลองสอบอีกครั้ง
              </p>
              <button onClick={() => setShowResetConfirm(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-700 rounded-xl font-black text-sm hover:bg-rose-50 shadow">
                <RotateCcw size={14} /> เริ่มต้นใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ เรียนสำเร็จ + ควิซผ่านครบ */}
      {isTrulyComplete && (
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
              <Trophy size={22} />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg">บทเรียนนี้สำเร็จแล้ว 🎉</p>
              <p className="text-xs opacity-90 mt-0.5">{isReading ? "อ่านเนื้อหาจบ" : `ดูครบ ${currentPct.toFixed(0)}%`} · ผ่านควิซทั้งหมด</p>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Quiz panel เด่นด้านบน — เฉพาะตอนต้องทำควิซ */}
      {needsQuiz && (
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Award size={20} className="text-amber-600" />
            <p className="font-black text-amber-900">📝 ทำควิซเพื่อสรุปบทเรียน</p>
            <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{moduleQuizzes.length} ควิซ</span>
          </div>
          <div className="space-y-2">
            {moduleQuizzes.map((q: any) => (
              <Link key={q.id} href={`/app/training/${courseId}/quiz/${q.id}?en=${enrollmentId}`}
                className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl p-3 hover:border-amber-400 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{q.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{q.question_count} ข้อ · ผ่าน {q.passing_score}% · สอบซ้ำ {q.max_retries} ครั้ง</p>
                </div>
                <span className="text-amber-700 font-bold text-xs">เริ่ม →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── บทเรียนแบบอ่านเนื้อหา (Reading lesson) ── */}
      {isReading && (
        <ReadingLesson
          content={module.content || ""}
          watermarkText={userInfo}
          initialReadPct={progress?.watched_pct ?? 0}
          alreadyCompleted={!!progress?.completed || currentPct >= requiredPct}
          onProgress={pct => updateProgress({ watched_pct: pct, watch_time_sec: 0, last_position_sec: 0 })}
          onComplete={() => updateProgress({ watched_pct: 100, watch_time_sec: 0, last_position_sec: 0 })}
        />
      )}

      {/* Video — เลือก player ตาม source ───────────────────────────
           • YouTube       → YouTubePlayer (IFrame API + checkpoint)
           • Supabase/MP4  → VideoPlayer (HTML5 video + checkpoint)
           • Vimeo/Drive   → iframe ธรรมดา (ยังไม่รองรับ checkpoint)
      */}
      {!isReading && module.video_url && (() => {
        const parsed = parseVideoUrl(module.video_url)
        if (parsed.type === "youtube") {
          return (
            <YouTubePlayer
              videoId={parsed.videoId}
              checkpoints={checkpoints}
              requiredWatchPct={module.required_watch_pct}
              initialPosition={progress?.last_position_sec ?? 0}
              initialWatchedSec={progress?.watch_time_sec ?? 0}
              initialAnsweredIds={initialAnsweredIds}
              watermarkText={userInfo}
              onProgress={updateProgress}
              onCheckpointAnswered={onCheckpointAnswered}
              onComplete={() => {}}
              onTabSwitch={() => console.log("tab switched")}
            />
          )
        }
        if (parsed.type === "vimeo" || parsed.type === "drive") {
          return (
            <div className="space-y-2">
              <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black">
                <iframe src={parsed.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                แหล่ง: {videoSourceName(parsed.type)} · ยังไม่รองรับ checkpoint quiz
              </p>
            </div>
          )
        }
        return (
          <VideoPlayer
            src={parsed.embedUrl}
            duration={module.video_duration_sec}
            checkpoints={checkpoints}
            requiredWatchPct={module.required_watch_pct}
            initialPosition={progress?.last_position_sec ?? 0}
            initialWatchedSec={progress?.watch_time_sec ?? 0}
            initialAnsweredIds={initialAnsweredIds}
            watermarkText={userInfo}
            onProgress={updateProgress}
            onCheckpointAnswered={onCheckpointAnswered}
            onComplete={() => {}}
            onTabSwitch={() => console.log("tab switched")}
          />
        )
      })()}

      {/* Documents */}
      {(module.documents?.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-slate-600 uppercase tracking-wider">เอกสารแนบ</p>
          {(module.documents as any[]).map((d: any, i: number) => (
            <a key={i} href={d.url} target="_blank" rel="noreferrer" download
              className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-sky-50 rounded-lg text-sm">
              <FileText size={14} className="text-slate-400" />
              <span className="flex-1 truncate">{d.name}</span>
              <Download size={12} className="text-slate-400" />
            </a>
          ))}
        </div>
      )}

      {/* Progress bar — สีตามสถานะ (เฉพาะบทเรียนวิดีโอ; แบบอ่านมีแถบของตัวเอง) */}
      {!isReading && module.required_watch_pct && (
        <div className={`border rounded-xl p-3 ${
          isTrulyComplete ? "bg-emerald-50 border-emerald-200" :
          needsReview ? "bg-rose-50 border-rose-200" :
          watchedEnough ? "bg-amber-50 border-amber-200" :
          "bg-sky-50 border-sky-200"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-xs font-bold flex items-center gap-1.5 ${
              isTrulyComplete ? "text-emerald-700" :
              needsReview ? "text-rose-700" :
              watchedEnough ? "text-amber-700" :
              "text-sky-700"
            }`}>
              {isTrulyComplete ? <><CheckCircle2 size={14} /> สำเร็จ — ผ่านครบ</> :
               needsReview ? <><RotateCcw size={14} /> ต้องเรียนใหม่</> :
               watchedEnough ? <><Award size={14} /> ดูครบ — รอทำควิซ</> :
               <>ความคืบหน้า</>}
            </p>
            <p className="text-xs font-bold">
              {currentPct.toFixed(0)}% / {module.required_watch_pct}%
            </p>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div className={`h-full transition-all ${
              isTrulyComplete ? "bg-gradient-to-r from-emerald-400 to-green-500" :
              needsReview ? "bg-gradient-to-r from-rose-400 to-red-500" :
              watchedEnough ? "bg-gradient-to-r from-amber-400 to-orange-500" :
              "bg-gradient-to-r from-sky-400 to-blue-500"
            }`}
              style={{ width: `${Math.min(100, (currentPct / (module.required_watch_pct || 80)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* History — แสดงประวัติการตอบ checkpoint */}
      <CheckpointHistory enrollmentId={enrollmentId} moduleId={moduleId as string} />


      {/* ── Auto-popup เมื่อเรียนถึงเกณฑ์ครั้งแรก ── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCompleteModal(false)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded">
              <X size={18} />
            </button>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg mb-3">
                <Trophy size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">เรียนสำเร็จ! 🎉</h2>
              <p className="text-sm text-slate-500 mt-1">{isReading ? "คุณอ่านเนื้อหาบทเรียนนี้จบแล้ว" : `คุณดูบทเรียนนี้จนถึงเกณฑ์แล้ว (${module.required_watch_pct ?? 80}%)`}</p>
            </div>
            {moduleQuizzes.length > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-amber-800">มีควิซรอให้คุณทำ!</p>
                  <p className="text-[11px] text-amber-700 mt-1">{moduleQuizzes.length} ควิซ · ผ่านเพื่อยืนยันความรู้</p>
                </div>
                <div className="space-y-2">
                  {moduleQuizzes.map((q: any) => (
                    <button key={q.id}
                      onClick={() => {
                        setShowCompleteModal(false)
                        router.push(`/app/training/${courseId}/quiz/${q.id}?en=${enrollmentId}`)
                      }}
                      className="w-full flex items-center gap-3 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 hover:border-sky-400 rounded-xl p-3 text-left transition-all">
                      <Award size={20} className="text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{q.title}</p>
                        <p className="text-[10px] text-slate-500">{q.question_count} ข้อ · ผ่าน {q.passing_score}%</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCompleteModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">
                  ทำควิซทีหลัง
                </button>
              </>
            ) : (
              <button onClick={() => setShowCompleteModal(false)}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">
                เยี่ยมเลย!
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm "เริ่มต้นใหม่" ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !resetting && setShowResetConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle size={22} className="text-rose-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-800">เริ่มต้นบทเรียนใหม่?</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ความคืบหน้าการดูวิดีโอจะถูกรีเซ็ตเป็น 0% และจะได้สิทธิ์ทำควิซใหม่อีกครั้ง
                  <br/><span className="text-rose-500 font-bold">⚠️ ประวัติการตอบเก่าจะยังเก็บไว้ในระบบ</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} disabled={resetting}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={doReset} disabled={resetting}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 flex items-center justify-center gap-1.5 disabled:opacity-60">
                {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                เริ่มใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Component: ประวัติการตอบ Checkpoint ───────────────────────────
function CheckpointHistory({ enrollmentId, moduleId }: { enrollmentId: string | null; moduleId: string }) {
  const [history, setHistory] = useState<any[]>([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!enrollmentId) return
    fetch(`/api/training/checkpoint-history?enrollment_id=${enrollmentId}&module_id=${moduleId}`)
      .then(r => r.json()).then(d => setHistory(d.history ?? []))
  }, [enrollmentId, moduleId])

  if (history.length === 0) return null

  const correct = history.filter(h => h.correct).length
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setShow(s => !s)}
        className="w-full p-3 flex items-center gap-2 hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <Award size={14} className="text-purple-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-black text-slate-700">ประวัติ Checkpoint Quiz</p>
          <p className="text-[10px] text-slate-500">
            ตอบไป {history.length} ข้อ · ถูก {correct} · ผิด {history.length - correct}
          </p>
        </div>
        <span className="text-slate-400 text-xs">{show ? "▲" : "▼"}</span>
      </button>
      {show && (
        <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/30">
          {history.map((h: any, i: number) => (
            <div key={h.id} className={`p-2.5 rounded-lg border ${h.correct ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="flex items-start gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${h.correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                  {h.correct ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">{h.question_text}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    คุณตอบ: <span className="font-mono">{typeof h.answer === "object" ? JSON.stringify(h.answer) : String(h.answer)}</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {new Date(h.answered_at).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
