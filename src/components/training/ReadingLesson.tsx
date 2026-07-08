"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { BookOpen, CheckCircle2, Clock } from "lucide-react"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"

// ────────────────────────────────────────────────────────────────────
// ReadingLesson — บทเรียนแบบ "อ่านเนื้อหาให้จบ"
//   ผู้เรียนต้องเลื่อนอ่านจนถึงท้ายเนื้อหา (+ ใช้เวลาอ่านขั้นต่ำ) จึงจะถือว่าจบ
//   - readPct = สัดส่วนที่อ่านผ่านมาแล้ว (ใช้โชว์ progress bar)
//   - เมื่อถึงท้ายจริง (sentinel เข้า viewport) + ครบเวลาขั้นต่ำ → onComplete()
//   ใช้ watermark กันแคปได้เหมือน video (แสดงชื่อผู้เรียนจางๆ)
// ────────────────────────────────────────────────────────────────────
export default function ReadingLesson({
  content,
  watermarkText,
  initialReadPct = 0,
  alreadyCompleted = false,
  onProgress,
  onComplete,
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
  // เวลาอ่านขั้นต่ำ: ~40% ของเวลาอ่านโดยประมาณ ขั้นต่ำ 5 วิ สูงสุด 90 วิ (กันเลื่อนรวดเดียว)
  const minSeconds = Math.min(90, Math.max(5, Math.round(estMin * 60 * 0.4)))

  const fireComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setDone(true)
    setReadPct(100)
    onComplete?.()
  }, [onComplete])

  // เมื่อถึงท้ายเนื้อหา — ครบเวลาขั้นต่ำหรือยัง ถ้ายัง ตั้งเวลารอ
  const handleReachedEnd = useCallback(() => {
    if (completedRef.current || reachedEndRef.current) return
    reachedEndRef.current = true
    const elapsed = (Date.now() - startRef.current) / 1000
    if (elapsed >= minSeconds) {
      fireComplete()
    } else {
      const remain = (minSeconds - elapsed) * 1000
      endTimerRef.current = setTimeout(() => fireComplete(), remain)
    }
  }, [minSeconds, fireComplete])

  // ── scroll tracking → readPct ──
  useEffect(() => {
    startRef.current = Date.now()
    if (alreadyCompleted) return

    const compute = () => {
      const el = contentRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight
      const vh = window.innerHeight || document.documentElement.clientHeight
      // ระยะเนื้อหาที่ผ่านขอบล่าง viewport ไปแล้ว
      const passed = Math.min(total, Math.max(0, vh - rect.top))
      const pct = total > 0 ? Math.min(100, Math.round((passed / total) * 100)) : 100
      setReadPct(prev => {
        const next = Math.max(prev, pct)
        // persist เป็นระยะ (ทุก ~3 วิ และก้าวหน้าจริง) — ยังไม่ complete
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

    // sentinel ท้ายเนื้อหา
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) handleReachedEnd() },
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
      {/* Sticky progress bar อ่านถึงไหนแล้ว */}
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

      {/* เนื้อหา + watermark */}
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

      {/* sentinel ท้ายเนื้อหา + ปุ่มยืนยันอ่านจบ */}
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
