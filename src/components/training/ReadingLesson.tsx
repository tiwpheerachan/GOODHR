"use client"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { BookOpen, CheckCircle2, Clock, ChevronLeft, ChevronRight, Check, X, HelpCircle, Maximize2, Minimize2 } from "lucide-react"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"
import { normalizeConfig, checkAnswer, type PageConfig, type PageQuestion } from "@/lib/training/pageConfig"

// ────────────────────────────────────────────────────────────────────
// ReadingLesson — บทเรียนแบบ "อ่านเนื้อหาให้จบ"
//   2 โหมด:
//   • Book mode  — เนื้อหามีตัวแบ่งหน้า (=== บนบรรทัดเดียว) → อ่านทีละหน้าเหมือนหนังสือ
//   • Scroll mode — เนื้อหาหน้าเดียว → เลื่อนอ่านยาวจนจบ
//   ทั้ง 2 โหมดจะ "จบ" เมื่ออ่านถึงท้ายจริง (+ ใช้เวลาอ่านขั้นต่ำกันเลื่อนรวด)
// ────────────────────────────────────────────────────────────────────

// แยกเนื้อหาเป็นหน้าๆ ด้วยเส้นแบ่ง "===" (3 ตัวขึ้นไป บนบรรทัดเดียว)
export function splitPages(content: string): string[] {
  const pages = (content ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*={3,}\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  return pages.length > 0 ? pages : [""]
}

export default function ReadingLesson(props: {
  content: string
  watermarkText?: string
  initialReadPct?: number
  alreadyCompleted?: boolean
  pageConfig?: any
  onProgress?: (pct: number) => void
  onComplete?: () => void
}) {
  const pages = useMemo(() => splitPages(props.content), [props.content])
  return pages.length > 1
    ? <BookReader {...props} pages={pages} />
    : <ScrollReader {...props} />
}

// ════════════════════ BOOK MODE (อ่านทีละหน้า) ════════════════════
function BookReader({
  pages, watermarkText, initialReadPct = 0, alreadyCompleted = false, pageConfig, onProgress, onComplete,
}: {
  pages: string[]
  watermarkText?: string
  initialReadPct?: number
  alreadyCompleted?: boolean
  pageConfig?: any
  onProgress?: (pct: number) => void
  onComplete?: () => void
}) {
  const total = pages.length
  const cfg = useMemo(() => normalizeConfig(pageConfig, total), [pageConfig, total])
  const resumeAt = alreadyCompleted ? total - 1 : Math.min(total - 1, Math.floor((initialReadPct / 100) * total))
  const [page, setPage] = useState<number>(Math.max(0, resumeAt))
  const [readCount, setReadCount] = useState<number>(alreadyCompleted ? total : Math.max(0, resumeAt))
  const [done, setDone] = useState<boolean>(alreadyCompleted)
  // gating state ต่อหน้า (reactive)
  const [bottomSeen, setBottomSeen] = useState<boolean>(alreadyCompleted)
  const [secondsOnPage, setSecondsOnPage] = useState<number>(0)
  const [quizPassed, setQuizPassed] = useState<Record<number, boolean>>({})

  const [fullscreen, setFullscreen] = useState(false)
  const completedRef = useRef<boolean>(alreadyCompleted)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)   // พื้นที่เลื่อนตอนเต็มจอ

  const pageCfg = cfg[page] || {}
  const requiredSec = pageCfg.read_seconds && pageCfg.read_seconds > 0 ? pageCfg.read_seconds : 0
  const timeDone = requiredSec === 0 || secondsOnPage >= requiredSec
  const readGateDone = alreadyCompleted || (bottomSeen && timeDone)
  const pageQuiz: PageQuestion[] = Array.isArray(pageCfg.quiz) ? pageCfg.quiz : []
  const hasQuiz = pageQuiz.length > 0
  const quizDone = !hasQuiz || alreadyCompleted || !!quizPassed[page]
  const canAdvance = readGateDone && quizDone
  const estMin = estimateReadMinutes(pages[page] || "")

  // reset gating + ตัวจับเวลา เมื่อเปลี่ยนหน้า (ไม่ผูกกับ fullscreen — กันรีเซ็ตตอนสลับจอ)
  useEffect(() => {
    if (alreadyCompleted) { setBottomSeen(true); return }
    setBottomSeen(false)
    setSecondsOnPage(0)
    // เลื่อนขึ้นบนสุด (เต็มจอ = เลื่อน container, ปกติ = เลื่อน window)
    if (fullscreen && scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
    else if (cardRef.current) {
      const y = cardRef.current.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" })
    }
    const tick = setInterval(() => setSecondsOnPage(s => s + 1), 1000)
    return () => clearInterval(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, alreadyCompleted])

  // observer สำหรับ sentinel ท้ายหน้า — root เปลี่ยนตามโหมด (viewport / container) แต่ตั้ง bottomSeen ได้อย่างเดียว
  useEffect(() => {
    if (alreadyCompleted) return
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) setBottomSeen(true) },
      { threshold: 0.9, root: fullscreen ? scrollRef.current : null },
    )
    if (bottomRef.current) io.observe(bottomRef.current)
    return () => io.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fullscreen, alreadyCompleted])

  // ล็อค scroll พื้นหลังตอนเต็มจอ
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [fullscreen])

  const fireComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setDone(true)
    setReadCount(total)
    onComplete?.()
  }, [onComplete, total])

  const goNext = () => {
    if (!canAdvance) return
    const readNow = Math.max(readCount, page + 1)
    setReadCount(readNow)
    if (page >= total - 1) {
      fireComplete()
    } else {
      setPage(p => p + 1)
      if (!completedRef.current) onProgress?.(Math.min(99, Math.round((readNow / total) * 100)))
    }
  }
  const goPrev = () => setPage(p => Math.max(0, p - 1))

  const isLast = page >= total - 1
  const remainSec = Math.max(0, requiredSec - secondsOnPage)

  // ── ชิ้นส่วนที่ใช้ร่วมทั้ง 2 โหมด ──
  const progressBar = (
    <div className={fullscreen
      ? "px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-white/95 backdrop-blur border-b border-amber-100"
      : "sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-100"}>
      <div className="flex items-center gap-2">
        <BookOpen size={14} className={done ? "text-emerald-600" : "text-amber-600"} />
        <p className={`text-xs font-bold ${done ? "text-emerald-700" : "text-amber-700"}`}>
          {done ? "อ่านจบแล้ว ✓" : `หน้า ${page + 1} / ${total}`}
        </p>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          {requiredSec > 0
            ? <><Clock size={10} /> ต้องอ่าน {Math.ceil(requiredSec/60) >= 1 && requiredSec >= 60 ? `${Math.ceil(requiredSec/60)} นาที` : `${requiredSec} วิ`}</>
            : <><Clock size={10} /> ~{estMin} นาที/หน้า</>}
        </span>
        {/* ปุ่มสลับเต็มจอ / ออกจากเต็มจอ */}
        <button onClick={() => setFullscreen(f => !f)}
          className="ml-1 w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 flex items-center justify-center shrink-0"
          title={fullscreen ? "ออกจากเต็มจอ" : "อ่านแบบเต็มจอ"}>
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
      <div className="mt-1.5 flex gap-1">
        {pages.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
            i < readCount || done ? "bg-emerald-400" : i === page ? "bg-amber-400" : "bg-slate-200"
          }`} />
        ))}
      </div>
    </div>
  )

  const pageCard = (
    <div ref={cardRef} className={`relative ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
      {watermarkText && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.05] select-none">
          <div className="absolute inset-0 flex flex-wrap gap-8 rotate-[-24deg] scale-125">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="text-slate-900 text-sm font-bold whitespace-nowrap">{watermarkText}</span>
            ))}
          </div>
        </div>
      )}
      <div key={page}
        className={`reading-book relative rounded-2xl border border-amber-100 shadow-md anim-fade-up ${
          fullscreen ? "px-5 py-7 sm:px-8 lg:px-12 lg:py-10" : "px-5 py-6 lg:px-10 lg:py-9"}`}
        style={{ background: "linear-gradient(180deg,#fffdf8 0%,#fdf9f0 100%)" }}>
        <span className="absolute top-3 right-4 text-[11px] font-bold text-amber-700/50">{page + 1}/{total}</span>
        <div className={`text-[#3d362b] ${fullscreen ? "text-[17px] sm:text-lg lg:text-xl leading-[1.95]" : "text-[15px] lg:text-[17px] leading-[1.85]"}`}>
          <ReadingContent content={pages[page]} />
        </div>
        <div ref={bottomRef} className="h-1 mt-4" />
      </div>
    </div>
  )

  const timeHint = !done && requiredSec > 0 && !timeDone ? (
    <div className="flex items-center justify-center gap-2 text-amber-600 text-xs font-bold py-1">
      <Clock size={13} /> อ่านต่ออีก {remainSec} วินาที
    </div>
  ) : null

  const quizPanel = !done && readGateDone && hasQuiz && !quizPassed[page] ? (
    <div className={fullscreen ? "max-w-3xl w-full mx-auto" : ""}>
      <PageQuizPanel key={page} questions={pageQuiz} onPass={() => setQuizPassed(m => ({ ...m, [page]: true }))} />
    </div>
  ) : null

  const navRow = (
    <div className="flex items-center gap-2">
      <button onClick={goPrev} disabled={page === 0}
        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50">
        <ChevronLeft size={16} /> ก่อนหน้า
      </button>
      <div className="flex-1" />
      {done ? (
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm px-3">
          <CheckCircle2 size={18} /> อ่านจบทั้งเล่มแล้ว
        </div>
      ) : (
        <button onClick={goNext} disabled={!canAdvance}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isLast ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                   : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          }`}>
          {isLast ? <><CheckCircle2 size={16} /> อ่านจบ — ยืนยัน</> : <>หน้าถัดไป <ChevronRight size={16} /></>}
        </button>
      )}
    </div>
  )
  const hintText = !done && !canAdvance ? (
    <p className="text-center text-[11px] text-slate-400">
      {hasQuiz && readGateDone && !quizPassed[page] ? "ตอบควิซให้ถูกก่อน แล้วปุ่มจะเปิดให้ไปต่อ" : "อ่านหน้านี้ให้ครบก่อน แล้วปุ่มจะเปิดให้ไปต่อ"}
    </p>
  ) : null

  // ── โหมดเต็มจอ: header + พื้นที่เลื่อน + footer (กันควิซ/ปุ่มโดนขอบตัด) ──
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col" style={{ background: "linear-gradient(180deg,#fdfaf3,#f7f1e5)" }}>
        {progressBar}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
          {pageCard}
          {timeHint}
          {quizPanel}
          {/* เผื่อพื้นที่ล่างไม่ให้เนื้อหาชนแถบปุ่ม */}
          <div className="h-2" />
        </div>
        <div className="px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-amber-100 space-y-1.5">
          {navRow}
          {hintText}
        </div>
      </div>
    )
  }

  // ── โหมดปกติ (inline) ──
  return (
    <div className="space-y-3">
      {progressBar}
      {pageCard}
      {timeHint}
      {quizPanel}
      {navRow}
      {hintText}
    </div>
  )
}

// ── ควิซคั่นหน้า (inline) — ต้องตอบถูกทุกข้อจึงจะผ่าน ──
function PageQuizPanel({ questions, onPass }: { questions: PageQuestion[]; onPass: () => void }) {
  const [ans, setAns] = useState<Record<string, any>>({})
  const [result, setResult] = useState<null | { ok: boolean; wrong: string[] }>(null)

  const allAnswered = questions.every(q => {
    const v = ans[q.id]
    return v !== undefined && v !== null && v !== ""
  })

  const submit = () => {
    const wrong = questions.filter(q => !checkAnswer(q, ans[q.id])).map(q => q.id)
    if (wrong.length === 0) { setResult({ ok: true, wrong: [] }); setTimeout(onPass, 800) }
    else setResult({ ok: false, wrong })
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 space-y-4 shadow-sm anim-fade-up">
      <div className="flex items-center gap-2">
        <HelpCircle size={18} className="text-amber-600" />
        <p className="font-black text-amber-900 text-sm">ตอบคำถามก่อนไปหน้าถัดไป</p>
        <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{questions.length} ข้อ</span>
      </div>

      {questions.map((q, qi) => {
        const isWrong = result && !result.ok && result.wrong.includes(q.id)
        return (
          <div key={q.id} className={`bg-white rounded-xl p-3 border ${isWrong ? "border-rose-300" : "border-amber-100"}`}>
            <p className="font-bold text-slate-800 text-sm mb-2">{qi + 1}. {q.question}</p>
            {q.type === "mc" && (
              <div className="space-y-1.5">
                {(q.options ?? []).map((opt, oi) => (
                  <label key={oi} className={`flex items-center gap-2.5 p-2 rounded-lg border-2 cursor-pointer text-sm ${ans[q.id] === oi ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" checked={ans[q.id] === oi} onChange={() => { setAns(a => ({ ...a, [q.id]: oi })); setResult(null) }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === "tf" && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setAns(a => ({ ...a, [q.id]: true })); setResult(null) }}
                  className={`py-2.5 rounded-lg border-2 font-bold text-sm ${ans[q.id] === true ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>ถูก ✓</button>
                <button onClick={() => { setAns(a => ({ ...a, [q.id]: false })); setResult(null) }}
                  className={`py-2.5 rounded-lg border-2 font-bold text-sm ${ans[q.id] === false ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200"}`}>ผิด ✗</button>
              </div>
            )}
            {q.type === "fill" && (
              <input value={ans[q.id] ?? ""} onChange={e => { setAns(a => ({ ...a, [q.id]: e.target.value })); setResult(null) }}
                placeholder="พิมพ์คำตอบ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" />
            )}
            {isWrong && <p className="text-[11px] text-rose-500 font-bold mt-1.5">ข้อนี้ยังไม่ถูก — ลองใหม่</p>}
          </div>
        )
      })}

      {result?.ok ? (
        <div className="flex items-center gap-2 justify-center py-2 text-emerald-600 font-black text-sm">
          <Check size={18} /> ตอบถูกทั้งหมด! กำลังไปหน้าถัดไป...
        </div>
      ) : (
        <button onClick={submit} disabled={!allAnswered}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">
          ตรวจคำตอบ
        </button>
      )}
      {result && !result.ok && (
        <p className="text-center text-[11px] text-rose-500 font-bold flex items-center justify-center gap-1"><X size={12} /> ยังตอบผิดอยู่ {result.wrong.length} ข้อ</p>
      )}
    </div>
  )
}

// ════════════════════ SCROLL MODE (หน้าเดียว เลื่อนยาว) ════════════════════
function ScrollReader({
  content, watermarkText, initialReadPct = 0, alreadyCompleted = false, onProgress, onComplete,
}: {
  content: string
  watermarkText?: string
  initialReadPct?: number
  alreadyCompleted?: boolean
  onProgress?: (pct: number) => void
  onComplete?: () => void
}) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)   // container ที่เลื่อนตอนเต็มจอ
  const startRef = useRef<number>(0)
  const completedRef = useRef<boolean>(alreadyCompleted)
  const reachedEndRef = useRef<boolean>(false)
  const rafRef = useRef<number>(0)
  const lastPostRef = useRef<number>(0)
  const endTimerRef = useRef<any>(null)

  const [readPct, setReadPct] = useState<number>(alreadyCompleted ? 100 : Math.min(99, Math.round(initialReadPct)))
  const [done, setDone] = useState<boolean>(alreadyCompleted)
  const [fullscreen, setFullscreen] = useState(false)

  const estMin = estimateReadMinutes(content)
  const minSeconds = Math.min(90, Math.max(5, Math.round(estMin * 60 * 0.4)))

  const fireComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setDone(true); setReadPct(100); onComplete?.()
  }, [onComplete])

  const handleReachedEnd = useCallback(() => {
    if (completedRef.current || reachedEndRef.current) return
    reachedEndRef.current = true
    const elapsed = (Date.now() - startRef.current) / 1000
    if (elapsed >= minSeconds) fireComplete()
    else endTimerRef.current = setTimeout(() => fireComplete(), (minSeconds - elapsed) * 1000)
  }, [minSeconds, fireComplete])

  // ล็อค scroll พื้นหลังตอนเต็มจอ
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [fullscreen])

  useEffect(() => {
    if (startRef.current === 0) startRef.current = Date.now()   // เริ่มจับเวลาครั้งเดียว (ไม่รีเซ็ตตอนสลับจอ)
    if (alreadyCompleted) return
    const compute = () => {
      const el = contentRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const totalH = el.offsetHeight
      const vh = window.innerHeight || document.documentElement.clientHeight
      const passed = Math.min(totalH, Math.max(0, vh - rect.top))
      const pct = totalH > 0 ? Math.min(100, Math.round((passed / totalH) * 100)) : 100
      setReadPct(prev => {
        const next = Math.max(prev, pct)
        const now = Date.now()
        if (!completedRef.current && next > prev && now - lastPostRef.current > 3000) {
          lastPostRef.current = now
          onProgress?.(Math.min(99, next))
        }
        return next
      })
    }
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => { rafRef.current = 0; compute() })
    }
    // เต็มจอ = เลื่อนใน container, ปกติ = เลื่อน window — ฟังทั้งคู่กันพลาด
    const cont = scrollRef.current
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    cont?.addEventListener("scroll", onScroll, { passive: true })
    compute()
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) handleReachedEnd() },
      { threshold: 0.6, root: fullscreen ? scrollRef.current : null },
    )
    if (endRef.current) io.observe(endRef.current)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cont?.removeEventListener("scroll", onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
      io.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyCompleted, content, fullscreen])

  // ── ชิ้นส่วนที่ใช้ร่วม ──
  const progressBar = (
    <div className={fullscreen
      ? "px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-white/95 backdrop-blur border-b border-slate-100"
      : "sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-100"}>
      <div className="flex items-center gap-2">
        <BookOpen size={14} className={done ? "text-emerald-600" : "text-sky-600"} />
        <p className={`text-xs font-bold ${done ? "text-emerald-700" : "text-sky-700"}`}>
          {done ? "อ่านจบแล้ว ✓" : `กำลังอ่าน ${readPct}%`}
        </p>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          <Clock size={10} /> ~{estMin} นาที
        </span>
        <button onClick={() => setFullscreen(f => !f)}
          className="ml-1 w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 flex items-center justify-center shrink-0"
          title={fullscreen ? "ออกจากเต็มจอ" : "อ่านแบบเต็มจอ"}>
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
      <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${done ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-sky-400 to-blue-500"}`}
          style={{ width: `${readPct}%` }} />
      </div>
    </div>
  )

  const contentBlock = (
    <div className={`relative ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
      {watermarkText && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.05] select-none">
          <div className="absolute inset-0 flex flex-wrap gap-8 rotate-[-24deg] scale-125">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="text-slate-900 text-sm font-bold whitespace-nowrap">{watermarkText}</span>
            ))}
          </div>
        </div>
      )}
      <div ref={contentRef}
        className={`relative bg-white border border-slate-200 rounded-2xl shadow-sm ${
          fullscreen ? "p-5 sm:p-8 text-[17px] sm:text-lg leading-[1.9]" : "p-5 lg:p-7 text-[15px] lg:text-base"}`}>
        <ReadingContent content={content} />
      </div>
    </div>
  )

  const endBlock = (
    <div ref={endRef} className={`pt-1 ${fullscreen ? "max-w-3xl w-full mx-auto" : ""}`}>
      {done ? (
        <div className="flex items-center gap-2 justify-center py-3 text-emerald-600 font-bold text-sm">
          <CheckCircle2 size={18} /> คุณอ่านเนื้อหาจบแล้ว
        </div>
      ) : readPct >= 90 ? (
        <button onClick={handleReachedEnd}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black rounded-xl shadow-sm flex items-center justify-center gap-2">
          <CheckCircle2 size={16} /> อ่านจบแล้ว — ยืนยัน
        </button>
      ) : (
        <p className="text-center text-[11px] text-slate-400 py-2">เลื่อนอ่านต่อจนจบเพื่อทำเครื่องหมายว่าเรียนจบ</p>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-50">
        {progressBar}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {contentBlock}
          {endBlock}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {progressBar}
      {contentBlock}
      {endBlock}
    </div>
  )
}
