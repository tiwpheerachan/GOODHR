"use client"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { BookOpen, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"

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
  pages, watermarkText, initialReadPct = 0, alreadyCompleted = false, onProgress, onComplete,
}: {
  pages: string[]
  watermarkText?: string
  initialReadPct?: number
  alreadyCompleted?: boolean
  onProgress?: (pct: number) => void
  onComplete?: () => void
}) {
  const total = pages.length
  const resumeAt = alreadyCompleted ? total - 1 : Math.min(total - 1, Math.floor((initialReadPct / 100) * total))
  const [page, setPage] = useState<number>(Math.max(0, resumeAt))
  const [canAdvance, setCanAdvance] = useState<boolean>(alreadyCompleted)
  const [readCount, setReadCount] = useState<number>(alreadyCompleted ? total : Math.max(0, resumeAt))
  const [done, setDone] = useState<boolean>(alreadyCompleted)

  const completedRef = useRef<boolean>(alreadyCompleted)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const bottomSeen = useRef<boolean>(false)
  const dwellPassed = useRef<boolean>(false)

  const estMin = estimateReadMinutes(pages[page] || "")
  const minDwell = Math.min(20, Math.max(1.5, Math.round(estMin * 60 * 0.35)))

  const markReadable = useCallback(() => {
    if (bottomSeen.current && dwellPassed.current) setCanAdvance(true)
  }, [])

  // reset gating เมื่อเปลี่ยนหน้า
  useEffect(() => {
    if (alreadyCompleted) { setCanAdvance(true); return }
    bottomSeen.current = false
    dwellPassed.current = false
    setCanAdvance(false)
    // เลื่อนขึ้นบนสุดของการ์ดเมื่อพลิกหน้า
    if (cardRef.current) {
      const y = cardRef.current.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" })
    }
    const t = setTimeout(() => { dwellPassed.current = true; markReadable() }, minDwell * 1000)
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) { bottomSeen.current = true; markReadable() } },
      { threshold: 0.9 },
    )
    if (bottomRef.current) io.observe(bottomRef.current)
    return () => { clearTimeout(t); io.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, alreadyCompleted])

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

  const progressPct = done ? 100 : Math.round((Math.min(readCount, total) / total) * 100)
  const isLast = page >= total - 1

  return (
    <div className="space-y-3">
      {/* Book progress bar */}
      <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className={done ? "text-emerald-600" : "text-amber-600"} />
          <p className={`text-xs font-bold ${done ? "text-emerald-700" : "text-amber-700"}`}>
            {done ? "อ่านจบแล้ว ✓" : `หน้า ${page + 1} / ${total}`}
          </p>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Clock size={10} /> ~{estMin} นาที/หน้า
          </span>
        </div>
        {/* page dots */}
        <div className="mt-1.5 flex gap-1">
          {pages.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
              i < readCount || done ? "bg-emerald-400" : i === page ? "bg-amber-400" : "bg-slate-200"
            }`} />
          ))}
        </div>
      </div>

      {/* Book page — paper look */}
      <div ref={cardRef} className="relative">
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
          className="reading-book relative rounded-2xl border border-amber-100 shadow-md px-5 py-6 lg:px-10 lg:py-9 anim-fade-up"
          style={{ background: "linear-gradient(180deg,#fffdf8 0%,#fdf9f0 100%)" }}>
          {/* page number corner */}
          <span className="absolute top-3 right-4 text-[11px] font-bold text-amber-700/50">{page + 1}/{total}</span>
          <div className="text-[15px] lg:text-[17px] leading-[1.85] text-[#3d362b]">
            <ReadingContent content={pages[page]} />
          </div>
          <div ref={bottomRef} className="h-1 mt-4" />
        </div>
      </div>

      {/* Nav */}
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
      {!done && !canAdvance && (
        <p className="text-center text-[11px] text-slate-400">อ่านหน้านี้ให้ครบก่อน แล้วปุ่มจะเปิดให้ไปต่อ</p>
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
  const startRef = useRef<number>(0)
  const completedRef = useRef<boolean>(alreadyCompleted)
  const reachedEndRef = useRef<boolean>(false)
  const rafRef = useRef<number>(0)
  const lastPostRef = useRef<number>(0)
  const endTimerRef = useRef<any>(null)

  const [readPct, setReadPct] = useState<number>(alreadyCompleted ? 100 : Math.min(99, Math.round(initialReadPct)))
  const [done, setDone] = useState<boolean>(alreadyCompleted)

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

  useEffect(() => {
    startRef.current = Date.now()
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
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    compute()
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) handleReachedEnd() },
      { threshold: 0.6 },
    )
    if (endRef.current) io.observe(endRef.current)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
      io.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyCompleted, content])

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className={done ? "text-emerald-600" : "text-sky-600"} />
          <p className={`text-xs font-bold ${done ? "text-emerald-700" : "text-sky-700"}`}>
            {done ? "อ่านจบแล้ว ✓" : `กำลังอ่าน ${readPct}%`}
          </p>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Clock size={10} /> ~{estMin} นาที
          </span>
        </div>
        <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${done ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-sky-400 to-blue-500"}`}
            style={{ width: `${readPct}%` }} />
        </div>
      </div>

      <div className="relative">
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
          className="relative bg-white border border-slate-200 rounded-2xl p-5 lg:p-7 shadow-sm text-[15px] lg:text-base">
          <ReadingContent content={content} />
        </div>
      </div>

      <div ref={endRef} className="pt-1">
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
    </div>
  )
}
