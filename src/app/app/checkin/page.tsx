"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Script from "next/script"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance, useCheckin } from "@/lib/hooks/useAttendance"
import { calcGeoDistance, formatTime } from "@/lib/utils/attendance"
import { getLateThreshold } from "@/lib/utils/payroll"
import {
  Loader2, RefreshCw, X, Send, LogIn, LogOut,
  Building2, MapPin, AlertTriangle, Clock, CheckCircle2,
  FileEdit, CalendarClock, Timer, History, ChevronRight,
  Zap, AlertCircle, Navigation, MapPinned, Plus, Info,
  ChevronLeft, Crosshair, Camera, MapPinOff, Upload,
  ShieldCheck, XCircle
} from "lucide-react"
import toast from "react-hot-toast"
import { format, startOfWeek, addDays, addWeeks, isToday, isSameDay } from "date-fns"
import { th } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

declare global { interface Window { google: any; initCheckinMap: () => void } }
type Branch = { id: string; name: string; latitude: number; longitude: number; geo_radius_m: number }

/* ═══════════════════════════════════════════════════════════════════════════
   Week Day Strip — colorful gradient + navigable history
   ═══════════════════════════════════════════════════════════════════════════ */
const DAY_COLORS = [
  { bg: "from-blue-500 to-cyan-400", text: "text-white", sub: "text-blue-100" },
  { bg: "from-violet-500 to-purple-400", text: "text-white", sub: "text-violet-100" },
  { bg: "from-rose-500 to-pink-400", text: "text-white", sub: "text-rose-100" },
  { bg: "from-amber-500 to-yellow-400", text: "text-white", sub: "text-amber-100" },
  { bg: "from-emerald-500 to-teal-400", text: "text-white", sub: "text-emerald-100" },
  { bg: "from-sky-400 to-blue-300", text: "text-white", sub: "text-sky-100" },
  { bg: "from-orange-500 to-amber-400", text: "text-white", sub: "text-orange-100" },
]

function WeekStrip({ weekOffset, onChangeWeek, onSelectDay, selectedDay }: {
  weekOffset: number
  onChangeWeek: (n: number) => void
  onSelectDay: (d: Date) => void
  selectedDay: Date
}) {
  const baseDate = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  return (
    <div>
      {/* week nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onChangeWeek(weekOffset - 1)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:scale-90 transition-all">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-bold text-gray-700">
            {format(days[0], "d MMM", { locale: th })} – {format(days[6], "d MMM", { locale: th })}
          </p>
          {!isCurrentWeek && (
            <button onClick={() => onChangeWeek(0)}
              className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all">
              วันนี้
            </button>
          )}
        </div>
        <button onClick={() => onChangeWeek(weekOffset + 1)}
          disabled={weekOffset >= 0}
          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${weekOffset >= 0 ? "bg-gray-50 text-gray-200 cursor-not-allowed" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* day grid — 7 equal columns, no overflow */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const active = isSameDay(d, selectedDay)
          const today = isToday(d)
          const color = DAY_COLORS[i % DAY_COLORS.length]
          const isFuture = d > new Date() && !today

          return (
            <button key={d.toISOString()} onClick={() => onSelectDay(d)}
              className={`relative flex flex-col items-center justify-center h-[58px] rounded-2xl transition-all duration-300 ${
                active
                  ? `bg-gradient-to-br ${color.bg} shadow-lg shadow-blue-200/30`
                  : today
                    ? "bg-blue-50 ring-2 ring-blue-300/50"
                    : isFuture
                      ? "bg-gray-50 text-gray-300"
                      : "bg-gray-50 hover:bg-gray-100"
              }`}
              style={active ? { animation: "dayPop .3s cubic-bezier(.34,1.56,.64,1)" } : undefined}>
              <span className={`text-[16px] font-bold leading-none ${
                active ? color.text : today ? "text-blue-600" : isFuture ? "text-gray-300" : "text-gray-800"
              }`}>
                {format(d, "d")}
              </span>
              <span className={`text-[10px] mt-1 font-medium ${
                active ? color.sub : today ? "text-blue-400" : "text-gray-400"
              }`}>
                {format(d, "EEE", { locale: th })}
              </span>
              {today && !active && (
                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Circular Progress Ring (SVG)
   ═══════════════════════════════════════════════════════════════════════════ */
function ProgressRing({ progress, size = 180, stroke = 8, children }: {
  progress: number; size?: number; stroke?: number; children?: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* bg track */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        {/* progress */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#ringGradNew)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
        <defs>
          <linearGradient id="ringGradNew" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Success Overlay
   ═══════════════════════════════════════════════════════════════════════════ */
function SuccessOverlay({ show, type, time, onDone }: { show: boolean; type: "in" | "out"; time: string; onDone: () => void }) {
  const [closing, setClosing] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!show) { setClosing(false); setProgress(100); return }
    const start = Date.now(), dur = 5000
    const tick = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / dur) * 100)
      setProgress(pct)
      if (pct <= 0) clearInterval(tick)
    }, 30)
    const t = setTimeout(() => { setClosing(true); setTimeout(onDone, 450) }, 5000)
    return () => { clearTimeout(t); clearInterval(tick) }
  }, [show, onDone])

  const tap = useCallback(() => { setClosing(true); setTimeout(onDone, 450) }, [onDone])
  if (!show) return null
  const isIn = type === "in"

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer transition-all duration-[450ms] ${closing ? "opacity-0 scale-105" : "opacity-100 scale-100"}`} onClick={tap}>
      <div className="absolute inset-0 bg-[#1e293b]" />

      <div className="relative z-10 flex flex-col items-center" style={{ animation: "senter .6s cubic-bezier(.34,1.56,.64,1) forwards" }}>
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center"
            style={{ animation: "sbounce .5s cubic-bezier(.34,1.56,.64,1) .2s both" }}>
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
              <CheckCircle2 size={42} className={isIn ? "text-indigo-500" : "text-orange-500"} strokeWidth={2.2}
                style={{ animation: "scheck .4s ease .5s both" }} />
            </div>
          </div>
        </div>

        <h2 className="text-white text-[22px] font-bold mb-1" style={{ animation: "sfade .4s ease .4s both" }}>
          {isIn ? "Check-in สำเร็จ" : "Check-out สำเร็จ"}
        </h2>
        <p className="text-white/40 text-sm mb-8" style={{ animation: "sfade .4s ease .5s both" }}>
          {isIn ? "บันทึกเวลาเข้างานเรียบร้อย" : "บันทึกเวลาออกงานเรียบร้อย"}
        </p>

        <div className="bg-white/10 rounded-2xl px-10 py-5 border border-white/5 mb-8"
          style={{ animation: "sfade .4s ease .6s both" }}>
          <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase text-center mb-1">
            {isIn ? "Clock In" : "Clock Out"}
          </p>
          <p className="text-white text-4xl font-black tabular-nums tracking-tight text-center">{time}</p>
        </div>

        <div className="w-44 h-1 bg-white/10 rounded-full overflow-hidden mb-3" style={{ animation: "sfade .4s ease .7s both" }}>
          <div className="h-full bg-white/40 rounded-full transition-none" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-white/20 text-[11px]" style={{ animation: "sfade .4s ease .8s both" }}>แตะเพื่อปิด</p>
      </div>

      <style>{`
        @keyframes senter{from{opacity:0;transform:scale(.88) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes sbounce{from{transform:scale(0)}to{transform:scale(1)}}
        @keyframes sfade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scheck{from{opacity:0;transform:scale(0) rotate(-20deg)}to{opacity:1;transform:scale(1) rotate(0)}}
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Off-site Check-in Modal — ถ่ายรูป + กรอกสถานที่ + stamp วันเวลา
   ═══════════════════════════════════════════════════════════════════════════ */
function OffsiteModal({ action, pos, onClose, onSuccess }: {
  action: "clock_in" | "clock_out"
  pos: { lat: number; lng: number } | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [locationName, setLocationName] = useState("")
  const [saving, setSaving] = useState(false)
  const [stamped, setStamped] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // เปิดกล้อง
  const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch {
      toast.error("ไม่สามารถเปิดกล้องได้")
    }
  }, [facingMode])

  // ปิดกล้อง
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  // สลับกล้องหน้า-หลัง
  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment"
    setFacingMode(next)
    startCamera(next)
  }, [facingMode, startCamera])

  // ถ่ายรูป + stamp วันเวลา
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, 0, 0, w, h)

    // Stamp date/time
    const now = new Date()
    const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Bangkok" })
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
    const stampText = `${dateStr}  ${timeStr}`
    const coordText = pos ? `GPS: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "GPS: ไม่ระบุตำแหน่ง"

    // Background bar
    const barH = Math.max(60, h * 0.08)
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.fillRect(0, h - barH, w, barH)

    // Date/time text
    const fontSize = Math.max(16, w * 0.028)
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "left"
    ctx.textBaseline = "bottom"
    ctx.fillText(stampText, 16, h - barH / 2 + fontSize * 0.15)

    // GPS coords
    ctx.font = `${fontSize * 0.7}px system-ui, sans-serif`
    ctx.fillStyle = "rgba(255,255,255,0.65)"
    ctx.fillText(coordText, 16, h - 8)

    // "Off-site" badge
    ctx.textAlign = "right"
    ctx.font = `bold ${fontSize * 0.8}px system-ui, sans-serif`
    ctx.fillStyle = "#fbbf24"
    ctx.fillText("OFF-SITE", w - 16, h - barH / 2 + fontSize * 0.15)

    // GOODHR watermark
    ctx.font = `${fontSize * 0.6}px system-ui, sans-serif`
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.fillText("GOODHR", w - 16, h - 8)

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `offsite_${Date.now()}.jpg`, { type: "image/jpeg" })
        setPhoto(file)
        setPreview(canvas.toDataURL("image/jpeg", 0.9))
        setStamped(stampText)
        stopCamera()
      }
    }, "image/jpeg", 0.9)
  }, [pos, stopCamera])

  // Upload from gallery
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Stamp the uploaded image too
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)

      const w = img.width, h = img.height
      const now = new Date()
      const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Bangkok" })
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
      const stampText = `${dateStr}  ${timeStr}`
      const coordText = pos ? `GPS: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "GPS: ไม่ระบุตำแหน่ง"

      const barH = Math.max(60, h * 0.08)
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(0, h - barH, w, barH)

      const fontSize = Math.max(16, w * 0.028)
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      ctx.fillText(stampText, 16, h - barH / 2 + fontSize * 0.15)
      ctx.font = `${fontSize * 0.7}px system-ui, sans-serif`
      ctx.fillStyle = "rgba(255,255,255,0.65)"
      ctx.fillText(coordText, 16, h - 8)
      ctx.textAlign = "right"
      ctx.font = `bold ${fontSize * 0.8}px system-ui, sans-serif`
      ctx.fillStyle = "#fbbf24"
      ctx.fillText("OFF-SITE", w - 16, h - barH / 2 + fontSize * 0.15)
      ctx.font = `${fontSize * 0.6}px system-ui, sans-serif`
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.fillText("GOODHR", w - 16, h - 8)

      canvas.toBlob(blob => {
        if (blob) {
          const stampedFile = new File([blob], `offsite_${Date.now()}.jpg`, { type: "image/jpeg" })
          setPhoto(stampedFile)
          setPreview(canvas.toDataURL("image/jpeg", 0.9))
          setStamped(stampText)
        }
      }, "image/jpeg", 0.9)
    }
    img.src = URL.createObjectURL(file)
  }

  // Retake
  const retake = () => {
    setPhoto(null)
    setPreview(null)
    setStamped(null)
    startCamera()
  }

  // Submit
  const submit = async () => {
    if (!photo) return toast.error("กรุณาถ่ายรูปก่อน")
    setSaving(true)

    const fd = new FormData()
    fd.append("action", action)
    fd.append("lat", pos ? String(pos.lat) : "0")
    fd.append("lng", pos ? String(pos.lng) : "0")
    fd.append("has_gps", pos ? "true" : "false")
    fd.append("photo", photo)
    fd.append("note", note)
    fd.append("location_name", locationName)

    try {
      const res = await fetch("/api/checkin/offsite", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || (action === "clock_in" ? "เช็คอินนอกสถานที่สำเร็จ" : "เช็คเอ้าท์นอกสถานที่สำเร็จ"))
        onSuccess()
        onClose()
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setSaving(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const isIn = action === "clock_in"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { stopCamera(); onClose() }} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{ animation: "mUp .3s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes mUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header — subtle dark gradient */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1e3a5f, #334155, #1e3a5f)" }} />

        <div className="px-5 py-5">
          {/* Title */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}>
                <Camera size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-[15px]">
                  {isIn ? "เช็คอินนอกสถานที่" : "เช็คเอ้าท์นอกสถานที่"}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">ถ่ายรูปยืนยันตำแหน่ง · รออนุมัติจาก HR</p>
              </div>
            </div>
            <button onClick={() => { stopCamera(); onClose() }}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
              <X size={14} />
            </button>
          </div>

          {/* Camera / Preview area */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 mb-4" style={{ aspectRatio: "4/3" }}>
            {/* Hidden canvas for stamping */}
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            {preview ? (
              /* Show stamped preview */
              <div className="relative w-full h-full">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                {/* Retake button */}
                <button onClick={retake}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all">
                  <RefreshCw size={11} /> ถ่ายใหม่
                </button>
                {/* Stamp badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                  <p className="text-[10px] text-white/80 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Stamped
                  </p>
                </div>
              </div>
            ) : cameraActive ? (
              /* Live camera */
              <div className="relative w-full h-full">
                <video ref={videoRef} playsInline autoPlay muted
                  className="w-full h-full object-cover" style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }} />
                {/* Camera controls */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6">
                  {/* Flip camera */}
                  <button onClick={flipCamera}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-90 transition-all">
                    <RefreshCw size={16} />
                  </button>
                  {/* Capture */}
                  <button onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all">
                    <div className="w-12 h-12 rounded-full bg-white" />
                  </button>
                  {/* Gallery */}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-90 transition-all">
                    <Upload size={16} />
                  </button>
                </div>
                {/* Time overlay */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg">
                  <p className="text-[11px] text-white font-mono tabular-nums">
                    {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </p>
                </div>
              </div>
            ) : (
              /* No camera yet — show open camera / gallery buttons */
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}>
                  <Camera size={28} className="text-white/60" />
                </div>
                <p className="text-sm text-gray-400">ถ่ายรูปเพื่อยืนยัน</p>
                <div className="flex gap-3">
                  <button onClick={() => startCamera()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 active:scale-[.97] transition-all"
                    style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", boxShadow: "0 4px 16px rgba(15,23,42,.25)" }}>
                    <Camera size={14} /> เปิดกล้อง
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 flex items-center gap-2 hover:bg-gray-50 active:scale-[.97] transition-all">
                    <Upload size={14} /> เลือกรูป
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location name */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={10} className="text-slate-400" /> สถานที่ทำงาน
            </p>
            <input value={locationName} onChange={e => setLocationName(e.target.value)}
              placeholder="เช่น สำนักงานลูกค้า ABC, งานแสดงสินค้า..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-50 transition-all" />
          </div>

          {/* Note */}
          <div className="mb-4">
            <p className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <FileEdit size={10} className="text-gray-400" /> หมายเหตุ (ไม่บังคับ)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {["ประชุมลูกค้า", "ติดตั้งงาน", "ส่งสินค้า", "อบรม/สัมมนา", "ซ่อมบำรุง"].map(r => (
                <button key={r} onClick={() => setNote(r)}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-medium border transition-all ${note === r
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                  {r}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              rows={2}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-600 placeholder-gray-300 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-50 resize-none transition-all" />
          </div>

          {/* Info badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl mb-4 border border-slate-100">
            <ShieldCheck size={14} className="text-slate-400 shrink-0" />
            <p className="text-[11px] text-slate-600">
              {isIn ? "เช็คอิน" : "เช็คเอ้าท์"}จะถูกบันทึกทันที แต่สถานะจะเป็น <b>"รออนุมัติ"</b> จนกว่า HR จะตรวจสอบ
            </p>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={saving || !photo}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-50 relative overflow-hidden"
            style={{
              background: photo
                ? "linear-gradient(135deg, #1e3a5f 0%, #1a2744 40%, #0f172a 100%)"
                : "#d1d5db",
              boxShadow: photo ? "0 4px 24px rgba(15,23,42,.35)" : "none"
            }}>
            {photo && <>
              <span className="ck-star" style={{ width:2.5, height:2.5, top:"20%", left:"15%", animation:"twinkle1 3s ease-in-out infinite" }}/>
              <span className="ck-star" style={{ width:2, height:2, top:"60%", left:"75%", animation:"twinkle2 4s ease-in-out infinite .5s" }}/>
              <span className="ck-star" style={{ width:1.5, height:1.5, top:"30%", left:"85%", animation:"twinkle3 3.5s ease-in-out infinite 1s" }}/>
              <span style={{ position:"absolute", top:"35%", right:"25%", fontSize:7, animation:"driftUp 4s ease-in-out infinite", opacity:.35, color:"#fff" }}>✦</span>
            </>}
            <span className="relative z-10 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : isIn ? <LogIn size={14} /> : <LogOut size={14} />}
              {isIn ? "เช็คอินนอกสถานที่" : "เช็คเอ้าท์นอกสถานที่"}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Adjust Modal
   ═══════════════════════════════════════════════════════════════════════════ */
function AdjustModal({ record, onClose }: { record: any; onClose: () => void }) {
  const [reason, setReason] = useState("")
  const [reqIn, setReqIn] = useState("")
  const [reqOut, setReqOut] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  const send = async () => {
    if (!reason.trim()) return toast.error("กรุณากรอกเหตุผล")
    setSaving(true)
    const { error } = await supabase.from("time_adjustment_requests").insert({
      employee_id: user?.employee_id, company_id: user?.employee?.company_id,
      work_date: record.work_date, request_type: "time_adjustment",
      requested_clock_in: reqIn ? record.work_date + "T" + reqIn + ":00+07:00" : null,
      requested_clock_out: reqOut ? record.work_date + "T" + reqOut + ":00+07:00" : null,
      reason, status: "pending",
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success("ส่งคำขอแก้ไขเวลาแล้ว")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "mUp .3s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes mUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-violet-400" />
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-2">
                <FileEdit size={14} className="text-indigo-500" /> ขอแก้ไขเวลา
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {record.work_date ? format(new Date(record.work_date + "T00:00:00"), "d MMMM yyyy", { locale: th }) : ""}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { label: "เวลาเข้าที่บันทึก", val: formatTime(record.clock_in), color: "text-indigo-600" },
              { label: "เวลาออกที่บันทึก", val: formatTime(record.clock_out), color: "text-orange-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-black tabular-nums ${color}`}>{val || "—"}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "เวลาเข้าใหม่", val: reqIn, set: setReqIn },
              { label: "เวลาออกใหม่", val: reqOut, set: setReqOut },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">{label}</p>
                <input type="time" value={val} onChange={e => set(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all" />
              </div>
            ))}
          </div>

          <p className="text-[11px] font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <Zap size={10} className="text-orange-400" /> เหตุผลด่วน
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["ลืมเช็คอิน", "ลืมเช็คเอ้าท์", "ระบบขัดข้อง", "ประชุมนอกสถานที่", "เหตุฉุกเฉิน"].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-medium border transition-all ${reason === r
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                {r}
              </button>
            ))}
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="หรือกรอกเหตุผลเพิ่มเติม..."
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 resize-none mb-4 transition-all" />

          <button onClick={send} disabled={saving}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-50 shadow-md shadow-blue-200/30"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
            ส่งคำขอแก้ไข
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page — Map-first layout with floating check-in circle
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CheckInPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { todayRecord, refetch } = useAttendance(user?.employee_id)
  const { clockIn, clockOut, loading } = useCheckin()

  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<any>(null)
  const mapReadyRef = useRef(false)
  const userPin = useRef<any>(null)
  const drawables = useRef<any[]>([])
  const watchIdRef = useRef<number | null>(null)

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsL] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkLoadAttempt, setSdkLoadAttempt] = useState(0)
  const [mapInited, setMapInited] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [nearest, setNearest] = useState<Branch | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [checkinAnywhere, setCheckinAnywhere] = useState(false)
  const [showAdj, setShowAdj] = useState(false)
  const [showOffsite, setShowOffsite] = useState<"clock_in" | "clock_out" | null>(null)
  const [burst, setBurst] = useState(false)
  const [burstType, setBurstType] = useState<"in" | "out">("in")
  const [burstTime, setBurstTime] = useState("")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(new Date())

  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  // ── Work duration timer (live) ──
  const [workSec, setWorkSec] = useState(0)
  useEffect(() => {
    if (!todayRecord?.clock_in) { setWorkSec(0); return }
    const calc = () => {
      const start = new Date(todayRecord.clock_in).getTime()
      const end = todayRecord.clock_out ? new Date(todayRecord.clock_out).getTime() : Date.now()
      setWorkSec(Math.max(0, Math.floor((end - start) / 1000)))
    }
    calc()
    if (!todayRecord.clock_out) {
      const t = setInterval(calc, 1000)
      return () => clearInterval(t)
    }
  }, [todayRecord?.clock_in, todayRecord?.clock_out])

  const workH = Math.floor(workSec / 3600)
  const workM = Math.floor((workSec % 3600) / 60)
  const workS = workSec % 60
  const pad = (n: number) => String(n).padStart(2, "0")

  // ── Remaining time (assume 8hr workday) ──
  const WORK_HOURS = 8
  const totalWorkSec = WORK_HOURS * 3600
  const remainSec = Math.max(0, totalWorkSec - workSec)
  const remainH = Math.floor(remainSec / 3600)
  const remainM = Math.floor((remainSec % 3600) / 60)
  const workProgress = Math.min(100, (workSec / totalWorkSec) * 100)

  // ── Fetch branches + checkin_anywhere ──
  useEffect(() => {
    if (!user?.employee_id) return
    // ดึง branches
    supabase.from("employee_allowed_locations")
      .select("branch:branches(id,name,latitude,longitude,geo_radius_m)")
      .eq("employee_id", user.employee_id)
      .then(({ data }) => {
        const list: Branch[] = (data ?? []).map((r: any) => r.branch)
          .filter((b: any) => b?.latitude && b?.longitude)
          .map((b: any) => ({ id: b.id, name: b.name, latitude: Number(b.latitude), longitude: Number(b.longitude), geo_radius_m: Number(b.geo_radius_m) || 200 }))
        setBranches(list)
      })
    // ดึง checkin_anywhere flag
    supabase.from("employees").select("checkin_anywhere").eq("id", user.employee_id).maybeSingle()
      .then(({ data }) => { setCheckinAnywhere(!!(data as any)?.checkin_anywhere) })
  }, [user?.employee_id])

  // ── Nearest branch ──
  useEffect(() => {
    if (!pos || branches.length === 0) { setNearest(null); setDistance(null); return }
    let near = branches[0], minD = Infinity
    for (const b of branches) { const d = calcGeoDistance(pos.lat, pos.lng, b.latitude, b.longitude); if (d < minD) { minD = d; near = b } }
    setNearest(near); setDistance(Math.round(minD))
  }, [pos, branches])

  // ── Map functions ──
  const redraw = useCallback((lat: number, lng: number, bl: Branch[]) => {
    const map = mapObj.current; if (!map || !window.google) return
    drawables.current.forEach(d => d.setMap(null)); drawables.current = []
    bl.forEach(b => {
      const distM = calcGeoDistance(lat, lng, b.latitude, b.longitude), inR = distM <= b.geo_radius_m
      // Radius circle — always 200m (or branch geo_radius_m)
      const circle = new window.google.maps.Circle({
        map, center: { lat: b.latitude, lng: b.longitude }, radius: b.geo_radius_m,
        fillColor: inR ? "#818cf8" : "#94a3b8", fillOpacity: inR ? 0.12 : 0.06,
        strokeColor: inR ? "#6366f1" : "#94a3b8", strokeOpacity: 0.6, strokeWeight: 2,
        clickable: false,
      })
      // Branch marker pin
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <filter id="ds" x="-20%" y="-10%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.15"/></filter>
        <path d="M18 2C9.72 2 3 8.72 3 17c0 12 15 25 15 25S33 29 33 17C33 8.72 26.28 2 18 2z" fill="${inR ? "#6366f1" : "#94a3b8"}" stroke="white" stroke-width="2" filter="url(#ds)"/>
        <circle cx="18" cy="17" r="7" fill="white"/><circle cx="18" cy="17" r="3.5" fill="${inR ? "#6366f1" : "#94a3b8"}"/>
      </svg>`
      const marker = new window.google.maps.Marker({
        map, position: { lat: b.latitude, lng: b.longitude }, title: b.name,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(36, 44), anchor: new window.google.maps.Point(18, 44) }
      })
      // Info window with distance + radius info
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;padding:8px 6px;min-width:160px">
          <b style="font-size:14px;color:#1e293b">${b.name}</b>
          <div style="display:flex;gap:12px;margin:6px 0 4px">
            <div><span style="font-size:10px;color:#94a3b8">รัศมี</span><br/><b style="font-size:13px;color:#6366f1">${b.geo_radius_m} ม.</b></div>
            <div><span style="font-size:10px;color:#94a3b8">ระยะห่าง</span><br/><b style="font-size:13px;color:#334155">${Math.round(distM)} ม.</b></div>
          </div>
          <div style="margin-top:6px;padding:4px 8px;border-radius:6px;text-align:center;font-size:12px;font-weight:700;color:white;background:${inR ? "#6366f1" : "#ef4444"}">
            ${inR ? "อยู่ในรัศมี — เช็คอินได้" : "อยู่นอกรัศมี"}
          </div>
        </div>`,
      })
      marker.addListener("click", () => info.open(map, marker))
      drawables.current.push(circle, marker)
    })
  }, [])

  useEffect(() => { if (!mapInited || !pos || branches.length === 0) return; redraw(pos.lat, pos.lng, branches) }, [mapInited, pos, branches, redraw])

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.google) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom: 17,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false,
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      ],
    })
    mapObj.current = map
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6366f1" stroke="white" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`
    userPin.current = new window.google.maps.Marker({
      map, position: { lat, lng }, zIndex: 99,
      icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(24, 24), anchor: new window.google.maps.Point(12, 12) }
    })
    setMapInited(true)
  }, [])

  const panToUser = useCallback((lat: number, lng: number) => {
    setPos({ lat, lng }); setGpsL(false)
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6366f1" stroke="white" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`
    const icon = { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(24, 24), anchor: new window.google.maps.Point(12, 12) }
    if (userPin.current) { userPin.current.setPosition({ lat, lng }); mapObj.current?.panTo({ lat, lng }); mapObj.current?.setZoom(17) }
    else if (mapObj.current) { userPin.current = new window.google.maps.Marker({ map: mapObj.current, position: { lat, lng }, zIndex: 99, icon }); mapObj.current.panTo({ lat, lng }); mapObj.current.setZoom(17) }
  }, [])

  const getLocation = useCallback(() => {
    setGpsL(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => { setPos({ lat, lng }); setGpsL(false); if (mapObj.current) { userPin.current?.setPosition({ lat, lng }); mapObj.current.panTo({ lat, lng }) } else if (sdkReady) initMap(lat, lng) },
      () => { toast.error("ไม่สามารถดึงตำแหน่งได้"); setGpsL(false) },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }, [sdkReady, initMap])

  // SDK callback — only mark ready, don't init map yet
  useEffect(() => {
    window.initCheckinMap = () => { setSdkReady(true) }
    return () => { try { delete (window as any).initCheckinMap } catch {} }
  }, [])

  const handleScriptLoad = useCallback(() => {
    setSdkReady(true)
  }, [])

  // When SDK ready, init map (with default or cached pos) then start watchPosition
  useEffect(() => {
    if (!sdkReady || mapReadyRef.current) return
    mapReadyRef.current = true

    // Init map with last known or default position
    const defaultLat = pos?.lat ?? 13.7563
    const defaultLng = pos?.lng ?? 100.5018
    initMap(defaultLat, defaultLng)

    // Start continuous GPS tracking
    if (!navigator.geolocation) return
    setGpsL(true)

    // Quick coarse position first
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => panToUser(coords.latitude, coords.longitude),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    )

    // Then continuous high-accuracy watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => panToUser(coords.latitude, coords.longitude),
      (err) => { if (err.code === err.PERMISSION_DENIED) { toast.error("กรุณาเปิด GPS"); setGpsL(false) } },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [sdkReady, initMap, panToUser])

  // ── Derived ──
  const inRadius = checkinAnywhere || (nearest !== null && distance !== null && distance <= (nearest.geo_radius_m || 200))
  const hasClockedIn = !!todayRecord?.clock_in
  const hasClockedOut = !!todayRecord?.clock_out
  const lateMin = todayRecord?.late_minutes || 0
  const earlyOutMin = todayRecord?.early_out_minutes || 0
  const isLate = todayRecord?.status === "late" && lateMin > 0
  const isEarlyOut = todayRecord?.status === "early_out" || earlyOutMin > 0
  const today = format(new Date(), "yyyy-MM-dd")

  // Grace period: ถ้าสายไม่เกิน grace → ไม่หัก
  const checkinGrace = getLateThreshold((user as any)?.employee?.department?.name, (user as any)?.employee?.company?.code)
  const lateAfterGrace = Math.max(0, lateMin - checkinGrace)
  const isAttendanceExempt = !!(user as any)?.employee?.is_attendance_exempt
  // exempt → ถือว่าอยู่ใน grace เสมอ (ไม่หัก)
  const isLateWithinGrace = isLate && (lateAfterGrace === 0 || isAttendanceExempt)

  const handleClockIn = async () => {
    if (!pos) return toast.error("กรุณาเปิด GPS ก่อน")
    const r = await clockIn(pos.lat, pos.lng)
    if (r.success) {
      setBurstType("in")
      setBurstTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }))
      setBurst(true); refetch()
    } else toast.error(r.error || "เกิดข้อผิดพลาด")
  }

  const handleClockOut = async () => {
    if (!pos) return toast.error("กรุณาเปิด GPS ก่อน")
    const r = await clockOut(pos.lat, pos.lng)
    if (r.success) {
      setBurstType("out")
      setBurstTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }))
      setBurst(true); refetch()
    } else toast.error(r.error || "เกิดข้อผิดพลาด")
  }

  return (
    <>
      {MAPS_KEY && <Script src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initCheckinMap`} strategy="afterInteractive" onLoad={handleScriptLoad} />}
      {showAdj && todayRecord && <AdjustModal record={todayRecord} onClose={() => setShowAdj(false)} />}
      {showOffsite && <OffsiteModal action={showOffsite} pos={pos} onClose={() => setShowOffsite(null)} onSuccess={refetch} />}
      <SuccessOverlay show={burst} type={burstType} time={burstTime} onDone={() => setBurst(false)} />

      <style>{`
        @keyframes fin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dayPop{from{transform:scale(.85)}to{transform:scale(1)}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.5);opacity:0}}
        @keyframes float-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes twinkle1{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:.9;transform:scale(1.2)}}
        @keyframes twinkle2{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        @keyframes twinkle3{0%,100%{opacity:.1;transform:scale(.6)}50%{opacity:.7;transform:scale(1.1)}}
        @keyframes driftUp{0%{transform:translateY(0) rotate(0deg);opacity:.6}100%{transform:translateY(-18px) rotate(20deg);opacity:0}}
        @keyframes shineSwipe{0%{transform:translateX(-100%) rotate(25deg)}100%{transform:translateX(200%) rotate(25deg)}}
        .ck-star{position:absolute;border-radius:50%;background:#fff}
        .ck-star-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.6) 0%,transparent 70%)}
        .fi{animation:fin .35s ease both}
        .fi1{animation:fin .35s ease .06s both}
        .fi2{animation:fin .35s ease .12s both}
        .fi3{animation:fin .35s ease .18s both}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      <div className="min-h-screen bg-white pb-28">

        {/* ═══════════════════════════════════════════════════════════════
            MAP HERO — full width, tall, with floating check-in overlay
           ═══════════════════════════════════════════════════════════════ */}
        <div className="relative" style={{ height: "42vh", minHeight: 280, maxHeight: 400 }}>
          {/* Map container */}
          <div ref={mapRef} className="absolute inset-0 bg-gray-100" />

          {/* Loading state */}
          {!mapInited && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 z-10">
              {MAPS_KEY
                ? <><Loader2 size={24} className="animate-spin text-indigo-400" /><p className="text-sm text-gray-400">กำลังโหลดแผนที่...</p></>
                : <><MapPin size={28} className="text-gray-300" /><p className="text-sm text-gray-400 text-center px-6">ตั้งค่า Google Maps API Key</p></>}
            </div>
          )}

          {/* Top gradient overlay for readability */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/20 to-transparent z-10 pointer-events-none" />

          {/* GPS refresh button */}
          <button onClick={getLocation} disabled={gpsLoading}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center z-20 text-gray-500 hover:text-indigo-500 active:scale-95 transition-all border border-gray-100/50">
            {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          </button>

          {/* Location status badge — top left */}
          {nearest && (
            <div className="absolute top-4 left-4 z-20" style={{ animation: "float-up .4s ease both" }}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg backdrop-blur-md border ${
                inRadius
                  ? "bg-white/90 border-indigo-200/50"
                  : "bg-white/90 border-gray-200/50"
              }`}>
                <div className={`w-2 h-2 rounded-full ${inRadius ? "bg-green-400" : "bg-orange-400"}`}>
                  {inRadius && <div className="w-2 h-2 rounded-full bg-green-400" style={{ animation: "pulse-ring 1.5s ease-out infinite" }} />}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">{nearest.name}</p>
                  <p className="text-[10px] text-gray-400">{distance}m · รัศมี {nearest.geo_radius_m}m</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ═══════ Content section — overlapping map ═══════ */}
        <div className="relative z-20" style={{ marginTop: -100 }}>

          {/* White gradient fading up into the map */}
          <div className="h-32 pointer-events-none" style={{ background: "linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)" }} />

          {/* ═══════ Check-In Card — overlaps gradient ═══════ */}
          <div className="bg-white px-5" style={{ marginTop: -40 }}>

            {/* ── Dual Space Circle Buttons ── */}
            <div className="flex items-center justify-center gap-4 mb-4" style={{ animation: "float-up .5s ease .15s both" }}>

              {/* CHECK-IN Circle */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {/* Cosmic glow — always show when not checked in */}
                  {!hasClockedIn && <>
                    <div className="absolute -inset-3 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.06) 50%, transparent 70%)" }} />
                    <div className="absolute -inset-1.5 rounded-full" style={{ border: "1.5px solid rgba(139,92,246,0.12)", animation: "pulse-ring 2.5s ease-out infinite" }} />
                  </>}
                  <button
                    onClick={hasClockedIn ? undefined : handleClockIn}
                    disabled={hasClockedIn || loading || (!inRadius && branches.length > 0)}
                    className={`relative w-[110px] h-[110px] rounded-full font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300 overflow-hidden ${
                      hasClockedIn
                        ? "text-emerald-400 cursor-default"
                        : "text-white active:scale-[.90]"
                    }`}
                    style={hasClockedIn ? {
                      background: "radial-gradient(circle at 30% 30%, #064e3b 0%, #022c22 100%)",
                      boxShadow: "0 6px 24px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
                    } : {
                      background: "radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0d0d1a 35%, #050510 70%, #000000 100%)",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.45), 0 0 24px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.06)"
                    }}
                  >
                    {hasClockedIn ? (
                      <>
                        <CheckCircle2 size={24} strokeWidth={2.2} />
                        <span className="text-[10px] font-bold">เช็คอินแล้ว</span>
                      </>
                    ) : loading ? (
                      <Loader2 size={26} className="animate-spin" />
                    ) : (
                      <>
                        {/* Space stars — always visible */}
                        <span className="ck-star" style={{ width:2, height:2, top:"8%", left:"18%", animation:"twinkle1 2.5s ease-in-out infinite" }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"16%", left:"68%", animation:"twinkle2 3.5s ease-in-out infinite .3s" }}/>
                        <span className="ck-star" style={{ width:2.5, height:2.5, top:"32%", left:"82%", animation:"twinkle3 4s ease-in-out infinite .8s" }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"52%", left:"12%", animation:"twinkle2 3s ease-in-out infinite 1.2s" }}/>
                        <span className="ck-star" style={{ width:2, height:2, top:"68%", left:"75%", animation:"twinkle1 3.8s ease-in-out infinite 1.8s" }}/>
                        <span className="ck-star" style={{ width:1, height:1, top:"80%", left:"42%", animation:"twinkle3 2.8s ease-in-out infinite 0.5s" }}/>
                        <span className="ck-star" style={{ width:2, height:2, top:"22%", left:"44%", animation:"twinkle1 4.2s ease-in-out infinite 2.1s" }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"45%", left:"58%", animation:"twinkle2 3.2s ease-in-out infinite 1.5s" }}/>
                        <span className="ck-star" style={{ width:1, height:1, top:"62%", left:"28%", animation:"twinkle3 4.5s ease-in-out infinite 0.2s" }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"88%", left:"60%", animation:"twinkle1 3.5s ease-in-out infinite 0.8s" }}/>
                        {/* Nebula */}
                        <span className="ck-star-glow" style={{ width:45, height:45, top:"-10%", right:"-8%", opacity:.07, background:"radial-gradient(circle,rgba(139,92,246,.6) 0%,transparent 70%)" }}/>
                        <span className="ck-star-glow" style={{ width:35, height:35, bottom:"0%", left:"2%", opacity:.05, background:"radial-gradient(circle,rgba(59,130,246,.5) 0%,transparent 70%)" }}/>
                        {/* Sparkles */}
                        <span style={{ position:"absolute", top:"18%", right:"22%", fontSize:8, animation:"driftUp 3.5s ease-in-out infinite", opacity:.45, color:"#c4b5fd" }}>✦</span>
                        <span style={{ position:"absolute", top:"58%", left:"25%", fontSize:5, animation:"driftUp 4.5s ease-in-out infinite 1.5s", opacity:.3, color:"#93c5fd" }}>✧</span>
                        {/* Aurora sweep */}
                        <span style={{ position:"absolute", top:"-50%", left:"-60%", width:"70%", height:"200%", background:"linear-gradient(90deg,transparent,rgba(139,92,246,.05),rgba(59,130,246,.04),transparent)", animation:"shineSwipe 4s ease-in-out infinite", pointerEvents:"none" }}/>
                        <LogIn size={28} strokeWidth={2} className="relative z-10" />
                        <span className="relative z-10 text-[11px] font-bold tracking-wide">Check-In</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Time label */}
                <div className="text-center min-h-[32px]">
                  <p className={`text-[17px] font-black tabular-nums leading-none ${hasClockedIn ? (isLate ? "text-orange-500" : "text-gray-800") : "text-gray-300"}`}>
                    {hasClockedIn ? formatTime(todayRecord?.clock_in) : "--:--"}
                  </p>
                  {isLate && <p className="text-[9px] text-orange-400 font-semibold mt-0.5">สาย {lateMin} น.</p>}
                  {!hasClockedIn && <p className="text-[9px] text-gray-400 font-medium mt-0.5">เข้างาน</p>}
                </div>
              </div>

              {/* CENTER — Work Duration Ring */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-[78px] h-[78px] flex items-center justify-center mb-1.5 bg-gray-50 rounded-full">
                  <svg width={74} height={74} className="absolute inset-0.5 -rotate-90">
                    <circle cx={37} cy={37} r={31} fill="none" stroke="#e5e7eb" strokeWidth={3.5} />
                    <circle cx={37} cy={37} r={31} fill="none"
                      stroke={workProgress >= 100 ? "#10b981" : "#6366f1"}
                      strokeWidth={3.5} strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 31}
                      strokeDashoffset={2 * Math.PI * 31 - (workProgress / 100) * 2 * Math.PI * 31}
                      className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center">
                    <p className="text-[15px] font-black tabular-nums text-gray-800 leading-none">
                      {hasClockedIn ? `${pad(workH)}:${pad(workM)}` : "0:00"}
                    </p>
                    {hasClockedIn && (
                      <p className="text-[8px] text-gray-400 font-mono mt-0.5">:{pad(workS)}</p>
                    )}
                  </div>
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[.12em]">ชั่วโมง</p>
                {hasClockedIn && !hasClockedOut && remainSec > 0 && (
                  <p className="text-[9px] text-indigo-500 font-semibold mt-0.5">เหลือ {remainH}h {remainM}m</p>
                )}
                {hasClockedOut && (
                  <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                    <CheckCircle2 size={9} /> เสร็จสิ้น
                  </div>
                )}
              </div>

              {/* CHECK-OUT Circle */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {/* Cosmic glow — when available */}
                  {hasClockedIn && !hasClockedOut && <>
                    <div className="absolute -inset-3 rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.05) 50%, transparent 70%)" }} />
                    <div className="absolute -inset-1.5 rounded-full" style={{ border: "1.5px solid rgba(249,115,22,0.1)", animation: "pulse-ring 2.5s ease-out infinite" }} />
                  </>}
                  <button
                    onClick={!hasClockedIn || hasClockedOut ? undefined : handleClockOut}
                    disabled={!hasClockedIn || hasClockedOut || loading || (!inRadius && branches.length > 0)}
                    className={`relative w-[110px] h-[110px] rounded-full font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300 overflow-hidden ${
                      hasClockedOut
                        ? "text-emerald-400 cursor-default"
                        : hasClockedIn
                          ? "text-white active:scale-[.90]"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                    style={hasClockedOut ? {
                      background: "radial-gradient(circle at 30% 30%, #064e3b 0%, #022c22 100%)",
                      boxShadow: "0 6px 24px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
                    } : hasClockedIn ? {
                      background: "radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0d0d1a 35%, #050510 70%, #000000 100%)",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.45), 0 0 24px rgba(249,115,22,0.06), inset 0 1px 0 rgba(255,255,255,0.06)"
                    } : {
                      background: "radial-gradient(ellipse at 30% 20%, #2a2a3e 0%, #1a1a28 35%, #111118 70%, #0a0a0f 100%)",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
                    }}
                  >
                    {hasClockedOut ? (
                      <>
                        <CheckCircle2 size={24} strokeWidth={2.2} />
                        <span className="text-[10px] font-bold">เช็คเอ้าท์แล้ว</span>
                      </>
                    ) : loading ? (
                      <Loader2 size={26} className="animate-spin" />
                    ) : (
                      <>
                        {/* Stars — dimmer when disabled, brighter when active */}
                        <span className="ck-star" style={{ width:2, height:2, top:"10%", left:"20%", animation:"twinkle1 2.8s ease-in-out infinite", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"20%", left:"72%", animation:"twinkle2 3.2s ease-in-out infinite .4s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:2.5, height:2.5, top:"38%", left:"84%", animation:"twinkle3 3.8s ease-in-out infinite .9s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"55%", left:"15%", animation:"twinkle1 3.5s ease-in-out infinite 1.3s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:2, height:2, top:"72%", left:"68%", animation:"twinkle2 4s ease-in-out infinite 1.7s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1, height:1, top:"82%", left:"40%", animation:"twinkle3 2.5s ease-in-out infinite 0.6s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"28%", left:"48%", animation:"twinkle1 4s ease-in-out infinite 2s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:2, height:2, top:"48%", left:"55%", animation:"twinkle2 3s ease-in-out infinite 1s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1, height:1, top:"65%", left:"30%", animation:"twinkle3 4.2s ease-in-out infinite 0.3s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        <span className="ck-star" style={{ width:1.5, height:1.5, top:"86%", left:"58%", animation:"twinkle1 3.5s ease-in-out infinite 0.8s", opacity: hasClockedIn ? 1 : 0.3 }}/>
                        {hasClockedIn && <>
                          {/* Nebula — warm tones */}
                          <span className="ck-star-glow" style={{ width:45, height:45, top:"-10%", left:"2%", opacity:.07, background:"radial-gradient(circle,rgba(249,115,22,.6) 0%,transparent 70%)" }}/>
                          <span className="ck-star-glow" style={{ width:30, height:30, bottom:"5%", right:"2%", opacity:.05, background:"radial-gradient(circle,rgba(239,68,68,.5) 0%,transparent 70%)" }}/>
                          {/* Sparkles */}
                          <span style={{ position:"absolute", top:"16%", left:"28%", fontSize:7, animation:"driftUp 3.8s ease-in-out infinite", opacity:.4, color:"#fdba74" }}>✦</span>
                          <span style={{ position:"absolute", top:"52%", right:"20%", fontSize:5, animation:"driftUp 4.2s ease-in-out infinite 1.2s", opacity:.3, color:"#fca5a5" }}>✧</span>
                          {/* Aurora sweep */}
                          <span style={{ position:"absolute", top:"-50%", left:"-60%", width:"70%", height:"200%", background:"linear-gradient(90deg,transparent,rgba(249,115,22,.04),rgba(239,68,68,.03),transparent)", animation:"shineSwipe 4.5s ease-in-out infinite", pointerEvents:"none" }}/>
                        </>}
                        <LogOut size={28} strokeWidth={2} className={`relative z-10 ${hasClockedIn ? "" : "opacity-50"}`} />
                        <span className={`relative z-10 text-[11px] font-bold tracking-wide ${hasClockedIn ? "" : "opacity-50"}`}>Check-Out</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Time label */}
                <div className="text-center min-h-[32px]">
                  <p className={`text-[17px] font-black tabular-nums leading-none ${hasClockedOut ? "text-gray-800" : "text-gray-300"}`}>
                    {hasClockedOut ? formatTime(todayRecord?.clock_out) : "--:--"}
                  </p>
                  {isEarlyOut && hasClockedOut && <p className="text-[9px] text-orange-400 font-semibold mt-0.5">ก่อน {earlyOutMin} น.</p>}
                  {!hasClockedOut && <p className="text-[9px] text-gray-400 font-medium mt-0.5">ออกงาน</p>}
                </div>
              </div>
            </div>

            {/* ── Off-site button — space themed ── */}
            {(!hasClockedIn || (hasClockedIn && !hasClockedOut)) && (
              <div className="mb-3" style={{ animation: "float-up .5s ease .25s both" }}>
                {!hasClockedIn && (
                  <button onClick={() => setShowOffsite("clock_in")}
                    className="w-full relative py-3.5 rounded-2xl font-bold text-[12px] text-white flex items-center justify-center gap-2 active:scale-[.97] transition-all overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #0f0f1a 0%, #0a0a14 50%, #000000 100%)",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.3)"
                    }}>
                    <span className="ck-star" style={{ width:2, height:2, top:"20%", left:"8%", animation:"twinkle1 3s ease-in-out infinite" }}/>
                    <span className="ck-star" style={{ width:1.5, height:1.5, top:"30%", left:"22%", animation:"twinkle2 3.5s ease-in-out infinite .5s" }}/>
                    <span className="ck-star" style={{ width:2, height:2, top:"55%", left:"15%", animation:"twinkle3 4s ease-in-out infinite 1s" }}/>
                    <span className="ck-star" style={{ width:1.5, height:1.5, top:"25%", left:"75%", animation:"twinkle1 3.8s ease-in-out infinite 1.5s" }}/>
                    <span className="ck-star" style={{ width:2, height:2, top:"60%", left:"82%", animation:"twinkle2 3.2s ease-in-out infinite .8s" }}/>
                    <span className="ck-star" style={{ width:1, height:1, top:"40%", left:"90%", animation:"twinkle3 4.5s ease-in-out infinite 2s" }}/>
                    <span style={{ position:"absolute", top:"25%", right:"18%", fontSize:6, animation:"driftUp 4s ease-in-out infinite", opacity:.3, color:"#c4b5fd" }}>✦</span>
                    <span style={{ position:"absolute", top:"-50%", left:"-50%", width:"60%", height:"200%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent)", animation:"shineSwipe 5s ease-in-out infinite", pointerEvents:"none" }}/>
                    <Camera size={14} className="relative z-10" />
                    <span className="relative z-10">เช็คอินนอกสถานที่</span>
                  </button>
                )}
                {hasClockedIn && !hasClockedOut && (
                  <button onClick={() => setShowOffsite("clock_out")}
                    className="w-full relative py-3.5 rounded-2xl font-bold text-[12px] text-white flex items-center justify-center gap-2 active:scale-[.97] transition-all overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #0f0f1a 0%, #0a0a14 50%, #000000 100%)",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.3)"
                    }}>
                    <span className="ck-star" style={{ width:2, height:2, top:"20%", left:"8%", animation:"twinkle1 3s ease-in-out infinite" }}/>
                    <span className="ck-star" style={{ width:1.5, height:1.5, top:"30%", left:"22%", animation:"twinkle2 3.5s ease-in-out infinite .5s" }}/>
                    <span className="ck-star" style={{ width:2, height:2, top:"55%", left:"15%", animation:"twinkle3 4s ease-in-out infinite 1s" }}/>
                    <span className="ck-star" style={{ width:1.5, height:1.5, top:"25%", left:"75%", animation:"twinkle1 3.8s ease-in-out infinite 1.5s" }}/>
                    <span className="ck-star" style={{ width:2, height:2, top:"60%", left:"82%", animation:"twinkle2 3.2s ease-in-out infinite .8s" }}/>
                    <span className="ck-star" style={{ width:1, height:1, top:"40%", left:"90%", animation:"twinkle3 4.5s ease-in-out infinite 2s" }}/>
                    <span style={{ position:"absolute", top:"25%", right:"18%", fontSize:6, animation:"driftUp 4s ease-in-out infinite", opacity:.3, color:"#fdba74" }}>✦</span>
                    <span style={{ position:"absolute", top:"-50%", left:"-50%", width:"60%", height:"200%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent)", animation:"shineSwipe 5s ease-in-out infinite", pointerEvents:"none" }}/>
                    <Camera size={14} className="relative z-10" />
                    <span className="relative z-10">เช็คเอ้าท์นอกสถานที่</span>
                  </button>
                )}
              </div>
            )}

            {/* Checkin Anywhere badge */}
            {checkinAnywhere && !hasClockedIn && (
              <div className="flex items-center justify-center gap-1.5 mb-3 px-3 py-2 bg-emerald-50 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-600">เช็คอินที่ไหนก็ได้ (Anywhere)</span>
              </div>
            )}

            {/* Not in radius warning */}
            {!inRadius && branches.length > 0 && !hasClockedIn && !checkinAnywhere && (
              <p className="text-center text-[10px] text-gray-400 mb-3">
                <AlertCircle size={10} className="inline mr-1 text-orange-400" />
                อยู่นอกรัศมีสาขา — ใช้เช็คอินนอกสถานที่
              </p>
            )}

            {/* No branch warning */}
            {branches.length === 0 && !checkinAnywhere && user?.employee_id && !gpsLoading && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-orange-50 rounded-xl">
                <AlertCircle size={13} className="text-orange-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-gray-700">ยังไม่ได้รับสิทธิ์เช็คอิน</p>
                  <p className="text-[9px] text-gray-400">กรุณาติดต่อ HR เพื่อกำหนดสาขา</p>
                </div>
              </div>
            )}

            {/* Completed badge */}
            {hasClockedIn && hasClockedOut && (
              <div className="mb-3 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 rounded-2xl">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600">บันทึกเวลาวันนี้เรียบร้อย</span>
              </div>
            )}

        {/* ═══════ Week Calendar ═══════ */}
        <div className="mb-4 fi2">
          <WeekStrip
            weekOffset={weekOffset}
            onChangeWeek={setWeekOffset}
            onSelectDay={(d) => {
              setSelectedDay(d)
              if (isToday(d)) setWeekOffset(0)
            }}
            selectedDay={selectedDay}
          />
        </div>

        {/* ═══════ Past Day Banner ═══════ */}
        {!isToday(selectedDay) && (
          <div className="px-5 mb-3 fi2">
            <Link href={`/app/attendance`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100/70 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <History size={14} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-blue-700">
                  {format(selectedDay, "d MMMM yyyy", { locale: th })}
                </p>
                <p className="text-[10px] text-blue-400">แตะเพื่อดูประวัติเข้างาน</p>
              </div>
              <ChevronRight size={14} className="text-blue-300 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>
        )}

        {/* ═══════ Alert Cards ═══════ */}
        <div className="px-5 space-y-3 fi3">
          {/* Late */}
          {isLate && !hasClockedOut && (
            <div className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${isLateWithinGrace ? "bg-green-50" : "bg-amber-50"} flex items-center justify-center shrink-0`}>
                  {isLateWithinGrace
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <AlertTriangle size={16} className="text-amber-500" />
                  }
                </div>
                <div>
                  {isLateWithinGrace ? (
                    <>
                      <p className="font-bold text-gray-800 text-sm">แหน่ะ วันนี้มาสาย {lateMin} นาที</p>
                      <p className="text-[11px] text-green-600">แต่ยังอยู่ในเกณฑ์ให้อภัยได้ ไม่หักเงิน 😊</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-gray-800 text-sm">มาสาย {lateMin} นาที</p>
                      <p className="text-[11px] text-gray-400">เกินเกณฑ์ {checkinGrace} นาที — หักจริง {lateAfterGrace} นาที</p>
                    </>
                  )}
                </div>
              </div>
              {!isLateWithinGrace && (
                <div className="flex gap-2">
                  <button onClick={() => setShowAdj(true)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                    <FileEdit size={11} /> แก้ไขเวลา
                  </button>
                  <Link href={`/app/leave/new?type=leave&date=${today}`}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                    <CalendarClock size={11} /> ยื่นใบลา
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Early out */}
          {hasClockedOut && isEarlyOut && !isLate && (
            <div className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <LogOut size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">ออกก่อนกำหนด {earlyOutMin} นาที</p>
                  <p className="text-[11px] text-gray-400">ระบบจะหักตามเวลาที่ออกก่อน</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <FileEdit size={11} /> แก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                  <CalendarClock size={11} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}

          {/* On time complete */}
          {hasClockedOut && !isLate && !isEarlyOut && (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">มาตรงเวลา ทำได้ดี!</p>
                <p className="text-[11px] text-gray-400">
                  {formatTime(todayRecord?.clock_in)} — {formatTime(todayRecord?.clock_out)}
                </p>
              </div>
            </div>
          )}

          {/* Late + Early */}
          {hasClockedOut && isLate && isEarlyOut && (
            <div className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${isLateWithinGrace ? "bg-amber-50" : "bg-rose-50"} flex items-center justify-center shrink-0`}>
                  <AlertTriangle size={16} className={isLateWithinGrace ? "text-amber-400" : "text-rose-400"} />
                </div>
                <div>
                  {isLateWithinGrace ? (
                    <>
                      <p className="font-bold text-gray-800 text-sm">สาย {lateMin} น. (ให้อภัยได้ 😊) + ออกก่อน {earlyOutMin} น.</p>
                      <p className="text-[11px] text-gray-400">หักเฉพาะออกก่อนเวลา</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-gray-800 text-sm">สาย {lateMin} น. + ออกก่อน {earlyOutMin} น.</p>
                      <p className="text-[11px] text-gray-400">จะถูกหักเงินเดือนทั้ง 2 รายการ</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <FileEdit size={11} /> แก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                  <CalendarClock size={11} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Quick Actions ═══════ */}
        <div className="px-5 mt-4 fi3">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {([
              { href: `/app/leave/new?type=adjustment&date=${today}`, icon: <FileEdit size={14} />, label: "ขอแก้ไขเวลา", desc: "เวลาเข้า-ออกผิดพลาด", iconBg: "bg-indigo-50", iconColor: "text-indigo-500" },
              { href: `/app/leave/new?type=leave&date=${today}`, icon: <CalendarClock size={14} />, label: "ยื่นใบลา", desc: "ลาป่วย ลากิจ พักร้อน", iconBg: "bg-orange-50", iconColor: "text-orange-500" },
              { href: `/app/leave/new?type=overtime&date=${today}`, icon: <Timer size={14} />, label: "ขอทำ OT", desc: "บันทึกเวลาล่วงเวลา", iconBg: "bg-blue-50", iconColor: "text-blue-500" },
              { href: "/app/attendance", icon: <History size={14} />, label: "ประวัติเข้างาน", desc: "ดูสถิติย้อนหลัง", iconBg: "bg-gray-100", iconColor: "text-gray-500" },
            ] as const).map((a, i, arr) => (
              <Link key={a.href} href={a.href}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconColor}`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-700">{a.label}</p>
                  <p className="text-[10px] text-gray-400">{a.desc}</p>
                </div>
                <ChevronRight size={13} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════ Branches List ═══════ */}
        {branches.length > 1 && (
          <div className="px-5 mt-4 fi3">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2 flex items-center gap-1.5">
              <Navigation size={10} /> สาขาที่เช็คอินได้
            </p>
            <div className="space-y-1.5">
              {branches.map(b => {
                const d = pos ? Math.round(calcGeoDistance(pos.lat, pos.lng, b.latitude, b.longitude)) : null
                const ok = d !== null && d <= b.geo_radius_m
                const isNearest = nearest?.id === b.id
                return (
                  <div key={b.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors ${isNearest && ok ? "bg-indigo-50/60 border border-indigo-100/50" : "bg-gray-50"}`}>
                    <Building2 size={14} className={ok ? "text-indigo-500" : "text-gray-300"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-700 truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400">รัศมี {b.geo_radius_m}m{d !== null ? ` · ห่าง ${d}m` : ""}</p>
                    </div>
                    {d !== null && (
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${ok ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                        {ok ? "ในรัศมี" : "นอกรัศมี"}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

          </div>{/* end white bg section */}
        </div>{/* end content section overlap */}

      </div>
    </>
  )
}
