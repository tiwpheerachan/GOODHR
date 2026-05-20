"use client"
import { useEffect, useRef, useState } from "react"

/**
 * useAntiCapture — anti-screenshot / anti-recording guard ที่ใช้ในวิดีโอเทรนนิ่ง
 *
 * ส่งสัญญาณกลับเป็น:
 *   - blackout: ควรครอบทับวิดีโอด้วย overlay สีดำหรือไม่ (true เมื่อ window blur, PrintScreen ฯลฯ)
 *   - blackoutReason: เหตุผล (สำหรับ UI แสดงข้อความ)
 *   - recordingDetected: ตรวจพบ getDisplayMedia (มีคน "Share Screen") — true เมื่อพบ
 */
export function useAntiCapture({
  enabled = true,
  onBlur,
  onPrintScreen,
}: {
  enabled?: boolean
  onBlur?: () => void
  onPrintScreen?: () => void
} = {}) {
  const [blackout, setBlackout] = useState(false)
  const [blackoutReason, setBlackoutReason] = useState<"blur" | "printscreen" | null>(null)
  const [recordingDetected, setRecordingDetected] = useState(false)
  const printScreenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 1. Window blur / focus — ตรวจจับการสลับ window (โอกาสที่จะ screenshot) ──
  useEffect(() => {
    if (!enabled) return
    const onBlurEvt = () => {
      setBlackout(true)
      setBlackoutReason("blur")
      onBlur?.()
    }
    const onFocus = () => {
      setBlackout(false)
      setBlackoutReason(null)
    }
    window.addEventListener("blur", onBlurEvt)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("blur", onBlurEvt)
      window.removeEventListener("focus", onFocus)
    }
  }, [enabled, onBlur])

  // ── 2. PrintScreen / Win+Shift+S / Cmd+Shift+3/4 detection ──
  //    Browser ไม่อนุญาตให้บล็อก screenshot จริง แต่เราจับ keydown ได้
  //    เมื่อพบ → black out ทันที 2 วินาที + แจ้งเตือน
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen" || e.code === "PrintScreen"
      const isMacShot = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")
      const isWinShot = e.metaKey && e.shiftKey && (e.key === "s" || e.key === "S")
      if (isPrintScreen || isMacShot || isWinShot) {
        setBlackout(true)
        setBlackoutReason("printscreen")
        onPrintScreen?.()
        if (printScreenTimerRef.current) clearTimeout(printScreenTimerRef.current)
        printScreenTimerRef.current = setTimeout(() => {
          setBlackout(false)
          setBlackoutReason(null)
        }, 2500)
        // best-effort: try to clear clipboard (works only with HTTPS + user gesture in some browsers)
        try { navigator.clipboard?.writeText?.("") } catch {}
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled, onPrintScreen])

  // ── 3. Screen recording detection (best-effort) ──
  //    Monkey-patch getDisplayMedia เพื่อรู้ว่ามีคนกด "Share Screen"
  //    (ใช้ได้กับเครื่องมือ recorder ที่ใช้ Web API เช่น Loom on web)
  //    ⚠ ไม่ครอบคลุม OBS, QuickTime, mobile screen-record (OS-level)
  useEffect(() => {
    if (!enabled) return
    const md = (navigator as any).mediaDevices
    if (!md?.getDisplayMedia) return
    const orig = md.getDisplayMedia.bind(md)
    md.getDisplayMedia = async (...args: any[]) => {
      setRecordingDetected(true)
      return orig(...args)
    }
    return () => { md.getDisplayMedia = orig }
  }, [enabled])

  return { blackout, blackoutReason, recordingDetected }
}
