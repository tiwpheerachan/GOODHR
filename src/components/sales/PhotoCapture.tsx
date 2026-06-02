"use client"
import { useEffect, useRef, useState } from "react"
import { Camera, Image as ImageIcon, X, Check, RotateCcw, Upload, Loader2, Aperture } from "lucide-react"

// ════════════════════════════════════════════════════════════════════
// PhotoCapture — ถ่ายรูปจากกล้องหรือเลือกจาก gallery
// ส่งกลับ File เพื่อ caller upload เอง (จะมี preview ในตัว)
// ════════════════════════════════════════════════════════════════════
type Source = "camera" | "gallery"

export default function PhotoCapture({
  open, onClose, onCapture,
}: {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const [source, setSource] = useState<Source>("camera")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Start camera ──
  useEffect(() => {
    if (!open || source !== "camera" || preview) return
    let cancelled = false
    setError(null)
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    }).then(s => {
      if (cancelled) { s.getTracks().forEach(t => t.stop()); return }
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play().catch(() => {})
      }
    }).catch(e => {
      setError("เปิดกล้องไม่ได้: " + (e?.message || "permission denied"))
    })
    return () => {
      cancelled = true
      setStream(prev => { prev?.getTracks().forEach(t => t.stop()); return null })
    }
  }, [open, source, facingMode, preview])

  // cleanup on close
  useEffect(() => {
    if (!open) {
      stream?.getTracks().forEach(t => t.stop())
      setStream(null)
      setPreview(null)
      setError(null)
    }
  }, [open])

  const takeShot = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.drawImage(v, 0, 0)
    // flash effect
    setFlash(true)
    setTimeout(() => setFlash(false), 200)
    // shutter sound
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      const o = ac.createOscillator(); const g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.frequency.value = 1200; g.gain.value = 0.1
      o.start(); o.stop(ac.currentTime + 0.04)
    } catch {}
    if (navigator.vibrate) navigator.vibrate(40)
    c.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setPreview({ blob, url })
      // stop camera
      stream?.getTracks().forEach(t => t.stop())
      setStream(null)
    }, "image/jpeg", 0.85)
  }

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("image/")) return
    const url = URL.createObjectURL(f)
    // convert to blob (it already is, since File extends Blob)
    setPreview({ blob: f, url })
  }

  const confirm = () => {
    if (!preview) return
    const ext = preview.blob.type === "image/png" ? "png" : "jpg"
    const file = new File([preview.blob], `proof-${Date.now()}.${ext}`, { type: preview.blob.type || "image/jpeg" })
    onCapture(file)
    onClose()
  }

  const retake = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow">
        <p className="font-black flex items-center gap-2"><Camera size={16}/> ถ่ายรูปสินค้า</p>
        <div className="flex items-center gap-1">
          {!preview && source === "camera" && (
            <button onClick={() => setFacingMode(m => m === "environment" ? "user" : "environment")}
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-black flex items-center gap-1">
              <RotateCcw size={11}/> สลับกล้อง
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-lg"><X size={18}/></button>
        </div>
      </div>

      {/* Source switcher (only when no preview) */}
      {!preview && (
        <div className="px-4 pt-3">
          <div className="bg-white/10 backdrop-blur rounded-xl p-1 inline-flex">
            <button onClick={() => setSource("camera")}
              className={"px-4 py-1.5 rounded-lg text-xs font-black transition " + (source === "camera" ? "bg-white text-emerald-700 shadow" : "text-white/70 hover:text-white")}>
              📷 กล้อง
            </button>
            <button onClick={() => { setSource("gallery"); fileRef.current?.click() }}
              className={"px-4 py-1.5 rounded-lg text-xs font-black transition " + (source === "gallery" ? "bg-white text-emerald-700 shadow" : "text-white/70 hover:text-white")}>
              🖼 จาก gallery
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { onFile(e.target.files?.[0]); e.target.value = "" }}/>
        </div>
      )}

      {/* Main viewport */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden">
        {error ? (
          <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-5 text-rose-100 text-sm text-center max-w-md">
            ⚠ {error}
            <button onClick={() => fileRef.current?.click()}
              className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black block mx-auto">
              เปิด gallery แทน
            </button>
          </div>
        ) : preview ? (
          // ── Preview mode ──
          <div className="relative w-full max-w-md">
            <img src={preview.url} alt="" className="w-full rounded-2xl shadow-2xl border-4 border-emerald-400/40"/>
            <p className="text-center text-white/80 text-xs mt-3">รูปนี้จะถูกบันทึกพร้อมรายการขาย</p>
          </div>
        ) : (
          // ── Camera live mode ──
          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted/>

            {/* Crosshair / framing guide */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"/>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"/>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"/>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"/>
              <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-300/40 text-[9px] font-black uppercase tracking-widest">วางสินค้าในกรอบ</p>
            </div>

            {/* Flash overlay */}
            {flash && (
              <div className="absolute inset-0 bg-white animate-pulse"/>
            )}

            <canvas ref={canvasRef} className="hidden"/>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-4 bg-black/80 flex items-center justify-center gap-3">
        {preview ? (
          <>
            <button onClick={retake}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-black rounded-xl flex items-center gap-1.5">
              <RotateCcw size={13}/> ถ่ายใหม่
            </button>
            <button onClick={confirm}
              className="flex-1 max-w-xs py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-lg">
              <Check size={14}/> ใช้รูปนี้
            </button>
          </>
        ) : !error && source === "camera" && (
          // ── Shutter button ──
          <button onClick={takeShot} disabled={!stream}
            className="group w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 ring-4 ring-emerald-500/40">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-active:scale-90 transition-transform shadow-inner">
              <Aperture size={28} className="text-white"/>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
