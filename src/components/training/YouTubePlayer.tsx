"use client"
import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX, Save } from "lucide-react"
import CheckpointOverlay, { type Checkpoint } from "./CheckpointOverlay"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

// ── YouTube IFrame API loader (singleton) ────────────────────────
let apiLoadPromise: Promise<void> | null = null
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("server"))
  if (window.YT && window.YT.Player) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise<void>(resolve => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.async = true
      document.head.appendChild(tag)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    // ถ้า script โหลดแล้ว แต่ callback ไม่ trigger
    const i = setInterval(() => {
      if (window.YT && window.YT.Player) { clearInterval(i); resolve() }
    }, 200)
    setTimeout(() => clearInterval(i), 15_000)
  })
  return apiLoadPromise
}

type Props = {
  videoId: string
  checkpoints: Checkpoint[]
  requiredWatchPct?: number
  initialPosition?: number
  initialWatchedSec?: number  // ⭐ seed watched seconds จาก progress เดิม
  watermarkText?: string
  initialAnsweredIds?: string[]
  onProgress?: (s: { watched_pct: number; watch_time_sec: number; last_position_sec: number }) => void
  onCheckpointAnswered?: (checkpointId: string, correct: boolean, detail?: { question_text: string; question_type: string; answer: any }) => void
  onComplete?: () => void
  onTabSwitch?: () => void
}

export default function YouTubePlayer({
  videoId, checkpoints, requiredWatchPct = 80, initialPosition = 0,
  initialWatchedSec = 0,
  watermarkText, initialAnsweredIds = [],
  onProgress, onCheckpointAnswered, onComplete, onTabSwitch,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  // ⭐ ใช้ตัวนับวินาทีตรงๆ (sec) แทน Set — สะสมจาก progress เดิม
  const watchTimeRef = useRef<number>(Math.max(0, initialWatchedSec))
  // เก็บไว้เพื่อ compatibility กับ checkpoint logic
  const watchedSetRef = useRef<Set<number>>(new Set())
  const lastTimeRef = useRef<number>(0)
  const lastReportRef = useRef<number>(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // ใช้ ref แทน state เพื่อแก้ stale closure ใน setInterval
  const answeredRef = useRef<Set<string>>(new Set(initialAnsweredIds))
  const activeRef = useRef<Checkpoint | null>(null)  // กัน trigger ซ้อนระหว่าง modal ยังเปิดอยู่

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null)
  const [, forceRerender] = useState(0)  // re-render เมื่อ answered เปลี่ยน (สำหรับ markers)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [ready, setReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [saving, setSaving] = useState(false)  // โชว์ "บันทึกแล้ว"

  // ── Save progress helper ───────────────────────────────────────
  const saveProgress = (t?: number) => {
    if (!onProgress || !playerRef.current || duration === 0) return
    let pos = t
    if (pos === undefined) {
      try { pos = Math.floor(playerRef.current.getCurrentTime() || 0) } catch { pos = 0 }
    }
    const watchedSec = Math.floor(watchTimeRef.current)
    const pct = Math.min(100, (watchedSec / duration) * 100)
    onProgress({ watched_pct: pct, watch_time_sec: watchedSec, last_position_sec: pos })
    setSaving(true)
    setTimeout(() => setSaving(false), 1000)
  }

  // ── Fullscreen change listener ──────────────────────────────────
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", h)
    return () => document.removeEventListener("fullscreenchange", h)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else wrapperRef.current?.requestFullscreen()
  }

  // ── Tab switch detection + save progress on hide ─────────────
  useEffect(() => {
    const h = () => {
      if (document.hidden) {
        // บันทึกตำแหน่งก่อนออก
        saveProgress()
        if (playerRef.current && playerRef.current.getPlayerState() === 1 /* playing */) {
          setTabSwitches(s => s + 1)
          onTabSwitch?.()
          playerRef.current.pauseVideo()
        }
      }
    }
    document.addEventListener("visibilitychange", h)
    return () => document.removeEventListener("visibilitychange", h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTabSwitch, duration])

  // ── Save on unmount + beforeunload ───────────────────────────
  useEffect(() => {
    const beforeUnload = () => saveProgress()
    window.addEventListener("beforeunload", beforeUnload)
    window.addEventListener("pagehide", beforeUnload)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      window.removeEventListener("pagehide", beforeUnload)
      saveProgress()  // บันทึกตอน unmount
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  // ── Init YouTube Player ───────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    // YT.Player REPLACES the target element with an iframe.
    // If we pass our React-rendered div, React can't find it on unmount
    // → "removeChild: not a child". So we create our own throwaway child.
    const playerDiv = document.createElement("div")
    playerDiv.style.width = "100%"
    playerDiv.style.height = "100%"
    containerRef.current.appendChild(playerDiv)

    loadYouTubeAPI().then(() => {
      if (destroyed) return
      playerRef.current = new window.YT.Player(playerDiv, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0, modestbranding: 1, playsinline: 1,
          disablekb: 1,        // ปิด keyboard control (กันคน skip)
          controls: 0,         // ⭐ ซ่อน native controls ของ YouTube — ใช้ของเราอย่างเดียว
          fs: 0,               // ซ่อน fullscreen button ใน iframe (ใช้ของเรา)
          iv_load_policy: 3,   // ซ่อน annotations
          start: Math.floor(initialPosition || 0),
        },
        events: {
          onReady: (e: any) => {
            setReady(true)
            const dur = e.target.getDuration() || 0
            setDuration(dur)
            if (initialPosition > 0) e.target.seekTo(initialPosition, true)
            startPolling()
          },
          onStateChange: (e: any) => {
            // -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
            setIsPlaying(e.data === 1)
            // อัปเดต duration ตอนเริ่มเล่นครั้งแรก (YouTube มักคืน 0 ตอน onReady)
            if (e.data === 1) {
              try {
                const dur = Math.floor(e.target.getDuration?.() || 0)
                if (dur > 0 && dur !== durationRef.current) {
                  durationRef.current = dur
                  setDuration(dur)
                }
              } catch {}
            }
            if (e.data === 2) saveProgress()       // pause → save
            if (e.data === 0) {                     // ended → save + complete
              saveProgress()
              const dur = durationRef.current
              const pct = dur > 0 ? Math.min(100, (watchTimeRef.current / dur) * 100) : 0
              if (pct >= requiredWatchPctRef.current) onCompleteRef.current?.()
            }
          },
        },
      })
    }).catch(err => console.error("[YouTube API]", err))

    return () => {
      destroyed = true
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      try { playerRef.current?.destroy() } catch {}
      // Wipe whatever YT left behind (iframe / div) — but DON'T touch containerRef itself, React owns it
      try {
        while (containerRef.current?.firstChild) containerRef.current.removeChild(containerRef.current.firstChild)
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // ── Polling loop — check time + trigger checkpoint ───────────
  // ใช้ refs สำหรับค่าที่เปลี่ยน + อ่าน duration จาก player ทุกครั้ง (กัน stale closure)
  const durationRef = useRef(0)
  const onProgressRef = useRef(onProgress)
  const requiredWatchPctRef = useRef(requiredWatchPct)
  const checkpointsRef = useRef(checkpoints)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    durationRef.current = duration
    onProgressRef.current = onProgress
    requiredWatchPctRef.current = requiredWatchPct
    checkpointsRef.current = checkpoints
    onCompleteRef.current = onComplete
  })

  const lastPollWallTimeRef = useRef<number>(Date.now())
  const POLL_INTERVAL_MS = 500

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    lastPollWallTimeRef.current = Date.now()
    pollIntervalRef.current = setInterval(() => {
      if (!playerRef.current) return
      let t = 0
      try { t = Math.floor(playerRef.current.getCurrentTime() || 0) } catch { return }

      // ── อัปเดต duration ──
      try {
        const dur = Math.floor(playerRef.current.getDuration?.() || 0)
        if (dur > 0 && dur !== durationRef.current) {
          durationRef.current = dur
          setDuration(dur)
        }
      } catch {}

      // ── ตรวจสภาพ play และนับเวลาจริง (time-based ตรงไปตรงมา) ──
      const state = playerRef.current.getPlayerState?.()  // 1 = playing
      const isPlaying = state === 1
      const now = Date.now()
      const wallDelta = (now - lastPollWallTimeRef.current) / 1000  // วินาที (จริง)
      lastPollWallTimeRef.current = now

      if (isPlaying && wallDelta > 0 && wallDelta < 2 && !activeRef.current) {
        // กำลังเล่น + interval ปกติ + ไม่มี modal เด้ง → นับเวลา
        watchTimeRef.current += wallDelta
      }

      // ── Checkpoint trigger ──
      const prev = lastTimeRef.current
      if (!activeRef.current) {
        for (const cp of checkpointsRef.current) {
          const triggered = prev < cp.trigger_at_sec && t >= cp.trigger_at_sec
          const inWindow = Math.abs(t - cp.trigger_at_sec) < 1.5
          if ((triggered || inWindow) && !answeredRef.current.has(cp.id)) {
            playerRef.current.pauseVideo()
            activeRef.current = cp
            setActiveCheckpoint(cp)
            break
          }
        }
      }

      lastTimeRef.current = t
      setCurrentTime(t)

      // ── Report progress every 5s ──
      const dur = durationRef.current
      if (t - lastReportRef.current >= 5 && dur > 0) {
        lastReportRef.current = t
        const watchedSec = Math.floor(watchTimeRef.current)
        const pct = Math.min(100, (watchedSec / dur) * 100)
        onProgressRef.current?.({ watched_pct: pct, watch_time_sec: watchedSec, last_position_sec: t })
        if (pct >= requiredWatchPctRef.current) onCompleteRef.current?.()
      }
    }, POLL_INTERVAL_MS)
  }

  const handleAnswer = (correct: boolean, answer?: any) => {
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
      try { playerRef.current?.playVideo() } catch {}
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`
  const watchedPct = duration > 0 ? Math.min(100, (watchTimeRef.current / duration) * 100) : 0

  const togglePlay = () => {
    if (!playerRef.current) return
    if (isPlaying) playerRef.current.pauseVideo()
    else playerRef.current.playVideo()
  }
  const toggleMute = () => {
    if (!playerRef.current) return
    if (muted) { playerRef.current.unMute(); setMuted(false) }
    else { playerRef.current.mute(); setMuted(true) }
  }

  return (
    <div ref={wrapperRef}
      className={`relative bg-black overflow-hidden select-none group [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:absolute [&_iframe]:inset-0 ${
        isFullscreen ? "!rounded-none w-screen h-screen" : "rounded-2xl"
      }`}
      onCopy={e => e.preventDefault()}>
      {/* 16:9 aspect when normal; fill the whole screen when fullscreen */}
      {isFullscreen ? (
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      ) : (
        <div className="relative pt-[56.25%]">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
      )}

      {/* Click overlay — block clicks on iframe (no scrub on YouTube) + play/pause on click */}
      <div className="absolute inset-0 z-[3]" onClick={togglePlay} style={{ cursor: "pointer" }}>
        {/* ไม่ให้คลิกผ่านไป iframe ของ YouTube ตรงๆ */}
      </div>

      {/* Watermark */}
      {watermarkText && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5]">
          <p className="text-white/15 text-2xl font-black rotate-[-20deg] select-none drop-shadow-lg">{watermarkText}</p>
        </div>
      )}

      {/* Center play/pause button — show when paused */}
      {ready && !isPlaying && !activeCheckpoint && (
        <button onClick={togglePlay} aria-label="play"
          className="absolute inset-0 flex items-center justify-center z-[5] cursor-pointer">
          <div className="w-20 h-20 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
            <Play size={36} className="text-slate-800 ml-1" fill="currentColor" />
          </div>
        </button>
      )}

      {/* Top right — tab switch warning + save indicator */}
      <div className="absolute top-2 right-2 z-[6] flex items-center gap-2">
        {saving && (
          <div className="bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Save size={10} /> บันทึกแล้ว
          </div>
        )}
        {tabSwitches > 0 && (
          <div className="bg-rose-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={10} /> สลับแท็บ {tabSwitches}
          </div>
        )}
      </div>

      {/* Bottom custom controls — ของเราคนเดียว, YouTube native ซ่อนแล้ว */}
      {ready && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-3 px-4 z-[6] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}>
          {/* Progress bar — non-clickable to prevent scrub */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-2 relative">
            <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${watchedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-sky-500" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }} />
            {checkpoints.map(cp => (
              <div key={cp.id}
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-black/30 ${answeredRef.current.has(cp.id) ? "bg-emerald-400" : "bg-purple-400"}`}
                style={{ left: duration > 0 ? `${(cp.trigger_at_sec / duration) * 100}%` : "0%" }}
                title={`Checkpoint ที่ ${fmtTime(cp.trigger_at_sec)}`} />
            ))}
          </div>

          <div className="flex items-center gap-3 text-white text-xs">
            <button onClick={togglePlay} className="p-1.5 hover:bg-white/20 rounded" aria-label={isPlaying ? "pause" : "play"}>
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button onClick={toggleMute} className="p-1.5 hover:bg-white/20 rounded" aria-label="mute">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span className="font-mono text-[11px]">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
            <span className="ml-auto opacity-80 text-[10px]">ดูแล้ว {watchedPct.toFixed(0)}% / ต้องการ {requiredWatchPct}%</span>
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/20 rounded" title={isFullscreen ? "ออกเต็มจอ" : "ดูเต็มจอ"}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Checkpoint Overlay */}
      {activeCheckpoint && (
        <CheckpointOverlay checkpoint={activeCheckpoint} onAnswer={handleAnswer} />
      )}
    </div>
  )
}
