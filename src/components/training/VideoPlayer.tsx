"use client"
import { useEffect, useRef, useState } from "react"
import { Pause, Play, Volume2, VolumeX, Maximize2, AlertTriangle } from "lucide-react"
import CheckpointOverlay, { type Checkpoint } from "./CheckpointOverlay"

export type { Checkpoint }

type Props = {
  src: string
  duration?: number | null
  checkpoints: Checkpoint[]
  requiredWatchPct?: number
  initialPosition?: number
  initialWatchedSec?: number
  initialAnsweredIds?: string[]
  watermarkText?: string
  onProgress?: (state: { watched_pct: number; watch_time_sec: number; last_position_sec: number }) => void
  onCheckpointAnswered?: (checkpointId: string, correct: boolean, detail?: { question_text: string; question_type: string; answer: any }) => void
  onComplete?: () => void
  onTabSwitch?: () => void
}

/**
 * Custom video player สำหรับระบบ Training:
 * - ติดตาม % การดู (กัน scrub)
 * - Checkpoint quiz เด้งระหว่างวิดีโอ
 * - ลายน้ำ + กันคลิกขวา
 * - ตรวจจับการสลับแท็บ
 */
export default function VideoPlayer({
  src, duration, checkpoints, requiredWatchPct = 80, initialPosition = 0,
  initialWatchedSec = 0, initialAnsweredIds = [], watermarkText,
  onProgress, onCheckpointAnswered, onComplete, onTabSwitch,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // ⭐ time-based tracking (เวลาดูจริง รวมจาก progress เดิม)
  const watchTimeRef = useRef<number>(Math.max(0, initialWatchedSec))
  const lastWallTimeRef = useRef<number>(Date.now())
  const watchedSetRef = useRef<Set<number>>(new Set())  // legacy (สำหรับ markers)
  const lastReportRef = useRef(0)
  const lastTimeRef = useRef(0)
  // ใช้ ref แทน state สำหรับ answered (กัน stale closure)
  const answeredRef = useRef<Set<string>>(new Set(initialAnsweredIds))
  const activeRef = useRef<Checkpoint | null>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState(duration ?? 0)
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null)
  const [, forceRerender] = useState(0)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Fullscreen change listener ────────────────────────────────────
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", h)
    return () => document.removeEventListener("fullscreenchange", h)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else wrapperRef.current?.requestFullscreen()
  }

  // ── Visibility detection ──────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (document.hidden && playing) {
        setTabSwitches(s => s + 1)
        onTabSwitch?.()
        videoRef.current?.pause()
      }
    }
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [playing, onTabSwitch])

  // ── Disable right-click + key shortcuts ───────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    const wrap = videoRef.current?.parentElement
    wrap?.addEventListener("contextmenu", handler)
    return () => wrap?.removeEventListener("contextmenu", handler)
  }, [])

  // ── Set initial position ──────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current && initialPosition > 0) {
      videoRef.current.currentTime = initialPosition
    }
  }, [initialPosition])

  // ── timeupdate: track watched seconds + checkpoint ────────────────
  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    const t = Math.floor(v.currentTime)
    setCurrentTime(t)

    // ── นับเวลาดูจริง (time-based) ──
    const now = Date.now()
    const wallDelta = (now - lastWallTimeRef.current) / 1000
    lastWallTimeRef.current = now
    if (!v.paused && wallDelta > 0 && wallDelta < 2 && !activeRef.current) {
      watchTimeRef.current += wallDelta
    }
    lastTimeRef.current = t

    // checkpoint trigger — cross-threshold detection + ใช้ ref กัน stale closure
    const prevTime = lastTimeRef.current
    if (!activeRef.current) {
      for (const cp of checkpoints) {
        const triggered = prevTime < cp.trigger_at_sec && t >= cp.trigger_at_sec
        const inWindow = Math.abs(t - cp.trigger_at_sec) < 1.5
        if ((triggered || inWindow) && !answeredRef.current.has(cp.id)) {
          v.pause()
          activeRef.current = cp
          setActiveCheckpoint(cp)
          break
        }
      }
    }

    // report progress every 5 sec
    if (t - lastReportRef.current >= 5 && actualDuration > 0) {
      lastReportRef.current = t
      const watchedSec = Math.floor(watchTimeRef.current)
      const pct = Math.min(100, Math.round((watchedSec / actualDuration) * 10000) / 100)
      onProgress?.({ watched_pct: pct, watch_time_sec: watchedSec, last_position_sec: t })
      if (pct >= requiredWatchPct) onComplete?.()
    }
  }

  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (v && !actualDuration) setActualDuration(Math.floor(v.duration))
  }

  const handleEnded = () => {
    setPlaying(false)
    const watchedSec = Math.floor(watchTimeRef.current)
    const pct = actualDuration > 0 ? Math.min(100, Math.round((watchedSec / actualDuration) * 10000) / 100) : 0
    onProgress?.({ watched_pct: pct, watch_time_sec: watchedSec, last_position_sec: Math.floor(videoRef.current?.currentTime ?? 0) })
    if (pct >= requiredWatchPct) onComplete?.()
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  const handleCheckpointAnswer = (correct: boolean, answer?: any) => {
    if (!activeCheckpoint) return
    if (correct || !activeCheckpoint.blocks_progress) {
      answeredRef.current.add(activeCheckpoint.id)
      forceRerender(x => x + 1)
      onCheckpointAnswered?.(activeCheckpoint.id, correct, {
        question_text: activeCheckpoint.question_text,
        question_type: activeCheckpoint.question_type,
        answer,
      })
      activeRef.current = null
      setActiveCheckpoint(null)
      videoRef.current?.play()
      setPlaying(true)
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  const watchedPct = actualDuration > 0 ? Math.min(100, (watchTimeRef.current / actualDuration) * 100) : 0

  return (
    <div ref={wrapperRef} className={`relative bg-black overflow-hidden select-none ${isFullscreen ? "!rounded-none w-screen h-screen" : "rounded-2xl"}`} onCopy={e => e.preventDefault()}>
      <video
        ref={videoRef}
        src={src}
        className={isFullscreen ? "absolute inset-0 w-full h-full object-contain" : "w-full"}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
      />

      {/* Watermark */}
      {watermarkText && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <p className="text-white/15 text-2xl font-black rotate-[-20deg] select-none">{watermarkText}</p>
        </div>
      )}

      {/* Tab switch warning */}
      {tabSwitches > 0 && (
        <div className="absolute top-2 left-2 bg-rose-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <AlertTriangle size={11} /> ตรวจพบสลับแท็บ {tabSwitches} ครั้ง
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        {/* Progress bar (non-clickable to prevent scrub) */}
        <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2 relative">
          <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${watchedPct}%` }} />
          <div className="absolute inset-y-0 left-0 bg-sky-400" style={{ width: actualDuration > 0 ? `${(currentTime / actualDuration) * 100}%` : "0%" }} />
          {checkpoints.map(cp => (
            <div key={cp.id} className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${answeredRef.current.has(cp.id) ? "bg-emerald-400" : "bg-purple-400"}`}
              style={{ left: actualDuration > 0 ? `${(cp.trigger_at_sec / actualDuration) * 100}%` : "0%" }} />
          ))}
        </div>

        <div className="flex items-center gap-2 text-white text-xs">
          <button onClick={togglePlay} className="p-1.5 hover:bg-white/20 rounded">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted) } }} className="p-1.5 hover:bg-white/20 rounded">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <span className="font-mono text-[11px]">{fmtTime(currentTime)} / {fmtTime(actualDuration)}</span>
          <span className="ml-auto text-[10px] opacity-80">ดูแล้ว {watchedPct.toFixed(0)}% / ต้องการ {requiredWatchPct}%</span>
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/20 rounded" title={isFullscreen ? "ออกเต็มจอ" : "ดูเต็มจอ"}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Checkpoint Quiz Overlay */}
      {activeCheckpoint && (
        <CheckpointOverlay
          checkpoint={activeCheckpoint}
          onAnswer={handleCheckpointAnswer}
        />
      )}
    </div>
  )
}

