"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Script from "next/script"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance, useCheckin } from "@/lib/hooks/useAttendance"
import { calcGeoDistance, formatTime } from "@/lib/utils/attendance"
import {
  Loader2, RefreshCw, X, Send, LogIn, LogOut,
  Building2, MapPin, AlertTriangle, Clock, CheckCircle2,
  FileEdit, CalendarClock, Timer, History, ChevronRight,
  Zap, AlertCircle, Navigation, MapPinned, Plus, Info,
  ChevronLeft
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
function ProgressRing({ progress, size = 240, stroke = 10, children }: {
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
          fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {/* progress */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
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
   Main Page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CheckInPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { todayRecord, refetch } = useAttendance(user?.employee_id)
  const { clockIn, clockOut, loading } = useCheckin()

  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<any>(null)
  const userPin = useRef<any>(null)
  const drawables = useRef<any[]>([])

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsL] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [mapInited, setMapInited] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [nearest, setNearest] = useState<Branch | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [showAdj, setShowAdj] = useState(false)
  const [burst, setBurst] = useState(false)
  const [burstType, setBurstType] = useState<"in" | "out">("in")
  const [burstTime, setBurstTime] = useState("")
  const [showMap, setShowMap] = useState(false)
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

  // ── Fetch branches ──
  useEffect(() => {
    if (!user?.employee_id) return
    supabase.from("employee_allowed_locations")
      .select("branch:branches(id,name,latitude,longitude,geo_radius_m)")
      .eq("employee_id", user.employee_id)
      .then(({ data }) => {
        const list: Branch[] = (data ?? []).map((r: any) => r.branch)
          .filter((b: any) => b?.latitude && b?.longitude)
          .map((b: any) => ({ id: b.id, name: b.name, latitude: Number(b.latitude), longitude: Number(b.longitude), geo_radius_m: Number(b.geo_radius_m) || 200 }))
        setBranches(list)
      })
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
      const circle = new window.google.maps.Circle({
        map, center: { lat: b.latitude, lng: b.longitude }, radius: b.geo_radius_m,
        fillColor: inR ? "#818cf8" : "#94a3b8", fillOpacity: 0.08, strokeColor: inR ? "#6366f1" : "#94a3b8", strokeOpacity: 0.5, strokeWeight: 1.5, clickable: false,
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24S32 27 32 16C32 7.16 24.84 0 16 0z" fill="${inR ? "#6366f1" : "#94a3b8"}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="7" fill="white"/><circle cx="16" cy="16" r="3.5" fill="${inR ? "#6366f1" : "#94a3b8"}"/>
      </svg>`
      const marker = new window.google.maps.Marker({
        map, position: { lat: b.latitude, lng: b.longitude }, title: b.name,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(32, 40), anchor: new window.google.maps.Point(16, 40) }
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;padding:6px 4px;min-width:140px">
          <b style="font-size:13px;color:#1e293b">${b.name}</b>
          <p style="font-size:11px;color:#64748b;margin:3px 0 1px">รัศมี ${b.geo_radius_m} ม. · ห่าง ${Math.round(distM)} ม.</p>
          <p style="font-size:12px;font-weight:700;margin:4px 0 0;color:${inR ? "#6366f1" : "#dc2626"}">${inR ? "เช็คอินได้" : "อยู่นอกรัศมี"}</p></div>`,
      })
      marker.addListener("click", () => info.open(map, marker))
      drawables.current.push(circle, marker)
    })
  }, [])

  useEffect(() => { if (!mapInited || !pos || branches.length === 0) return; redraw(pos.lat, pos.lng, branches) }, [mapInited, pos, branches, redraw])

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.google || mapObj.current) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom: 17,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      ],
    })
    mapObj.current = map
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#6366f1" stroke="white" stroke-width="2.5"/><circle cx="10" cy="10" r="3" fill="white"/></svg>`
    userPin.current = new window.google.maps.Marker({
      map, position: { lat, lng }, zIndex: 99,
      icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(20, 20), anchor: new window.google.maps.Point(10, 10) }
    })
    setMapInited(true)
  }, [])

  const panToUser = useCallback((lat: number, lng: number) => {
    setPos({ lat, lng }); setGpsL(false)
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#6366f1" stroke="white" stroke-width="2.5"/><circle cx="10" cy="10" r="3" fill="white"/></svg>`
    const icon = { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(20, 20), anchor: new window.google.maps.Point(10, 10) }
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

  useEffect(() => {
    window.initCheckinMap = () => { setSdkReady(true); setTimeout(() => initMap(13.7563, 100.5018), 0) }
    return () => { try { delete (window as any).initCheckinMap } catch { } }
  }, [initMap])

  const handleScriptLoad = useCallback(() => {
    if (!sdkReady) { setSdkReady(true); setTimeout(() => initMap(13.7563, 100.5018), 0) }
    setTimeout(() => initMap(13.7563, 100.5018), 0)
  }, [initMap, sdkReady])

  useEffect(() => {
    if (!sdkReady) return
    setGpsL(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => panToUser(lat, lng),
      () => { setGpsL(false); toast.error("ไม่สามารถดึงตำแหน่งได้") },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    )
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => panToUser(lat, lng),
      () => { },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [sdkReady, panToUser])

  // ── Derived ──
  const inRadius = nearest !== null && distance !== null && distance <= (nearest.geo_radius_m || 200)
  const hasClockedIn = !!todayRecord?.clock_in
  const hasClockedOut = !!todayRecord?.clock_out
  const lateMin = todayRecord?.late_minutes || 0
  const earlyOutMin = todayRecord?.early_out_minutes || 0
  const isLate = todayRecord?.status === "late" && lateMin > 0
  const isEarlyOut = todayRecord?.status === "early_out" || earlyOutMin > 0
  const today = format(new Date(), "yyyy-MM-dd")

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
      <SuccessOverlay show={burst} type={burstType} time={burstTime} onDone={() => setBurst(false)} />

      <style>{`
        @keyframes fin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dayPop{from{transform:scale(.85)}to{transform:scale(1)}}
        .fi{animation:fin .35s ease both}
        .fi1{animation:fin .35s ease .06s both}
        .fi2{animation:fin .35s ease .12s both}
        .fi3{animation:fin .35s ease .18s both}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      <div className="min-h-screen bg-white pb-28">

        {/* ═══════ Top: Month & Request ═══════ */}
        <div className="px-5 pt-6 pb-3 fi">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[22px] font-bold text-gray-900 flex items-center gap-2.5">
              <CalendarClock size={20} className="text-indigo-500" />
              {format(new Date(), "MMMM yyyy", { locale: th })}
            </h1>
            <Link href={`/app/leave/new?type=adjustment&date=${today}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[.97] transition-all">
              Request <Plus size={13} />
            </Link>
          </div>

          {/* Week Strip */}
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
          <div className="px-5 mb-3 fi1">
            <Link href={`/app/attendance`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100/70 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <History size={14} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-blue-700">
                  {format(selectedDay, "d MMMM yyyy", { locale: th })}
                </p>
                <p className="text-[10px] text-blue-400">แตะเพื่อดูประวัติเข้างานวันนี้</p>
              </div>
              <ChevronRight size={14} className="text-blue-300 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>
        )}

        {/* ═══════ Location Card ═══════ */}
        <div className="px-5 mb-5 fi1">
          {nearest ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <MapPinned size={16} className={inRadius ? "text-indigo-500" : "text-gray-400"} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">
                  {inRadius ? "Checked in at" : "Location Registered"}
                </p>
                <p className="text-[13px] font-bold text-gray-800 truncate">{nearest.name}</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-gray-500">{distance}m</span>
            </div>
          ) : branches.length === 0 && user?.employee_id && !gpsLoading ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 rounded-xl">
              <AlertCircle size={16} className="text-orange-400" />
              <div>
                <p className="text-[13px] font-bold text-gray-700">ยังไม่ได้รับสิทธิ์เช็คอิน</p>
                <p className="text-[10px] text-gray-400">กรุณาติดต่อ HR เพื่อกำหนดสาขา</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <MapPinned size={16} className="text-gray-300" />
              <p className="text-[13px] text-gray-400">กำลังค้นหาตำแหน่ง...</p>
            </div>
          )}
        </div>

        {/* ═══════ Big Circle Button / Duration Ring ═══════ */}
        <div className="flex flex-col items-center px-5 mb-6 fi2">
          {!hasClockedIn ? (
            /* ── Before Check-in: Large circle button ── */
            <div className="relative">
              {/* dotted pattern background */}
              <div className="w-[240px] h-[240px] rounded-full flex items-center justify-center relative"
                style={{
                  background: "radial-gradient(circle at 50% 50%, #f8fafc 60%, #f1f5f9 100%)",
                  boxShadow: "0 0 0 1px #e2e8f0, 0 8px 30px rgba(0,0,0,0.04)"
                }}>
                {/* dot pattern overlay */}
                <div className="absolute inset-4 rounded-full overflow-hidden opacity-20">
                  <div style={{
                    width: "100%", height: "100%",
                    backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                  }} />
                </div>

                <button onClick={handleClockIn}
                  disabled={loading || !inRadius || branches.length === 0}
                  className={`relative z-10 w-[190px] h-[190px] rounded-full font-bold text-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-[.95] ${
                    inRadius
                      ? "text-white shadow-xl shadow-blue-300/40"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  style={inRadius ? { background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)" } : undefined}>
                  {loading ? (
                    <Loader2 size={32} className="animate-spin" />
                  ) : (
                    <>
                      <LogIn size={28} strokeWidth={2} />
                      <span className="text-lg tracking-wide">Check-In</span>
                    </>
                  )}
                </button>
              </div>

              {!inRadius && branches.length > 0 && (
                <p className="text-center text-[11px] text-gray-400 mt-3">
                  กรุณาเข้าใกล้สาขาเพื่อเช็คอิน
                </p>
              )}
            </div>
          ) : (
            /* ── After Check-in: Duration ring ── */
            <div className="relative">
              <ProgressRing progress={workProgress} size={240} stroke={10}>
                <p className="text-[11px] text-gray-400 font-medium mb-1">Work Duration</p>
                <p className="text-[38px] font-black tabular-nums text-gray-900 tracking-tight leading-none"
                  style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' }}>
                  {pad(workH)}:{pad(workM)}:{pad(workS)}
                </p>
                {!hasClockedOut && remainSec > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">Remaining Time</p>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-indigo-500">
                      <Info size={10} />
                      <span>{remainH}h {remainM}m left today</span>
                    </div>
                  </div>
                )}
                {hasClockedOut && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                    <CheckCircle2 size={12} />
                    <span>เสร็จสิ้น</span>
                  </div>
                )}
              </ProgressRing>
            </div>
          )}
        </div>

        {/* ═══════ 3 Column Stats ═══════ */}
        <div className="px-5 mb-5 fi2">
          <div className="grid grid-cols-3 gap-3">
            {/* Check-In */}
            <div className="bg-gray-50 rounded-xl py-3.5 px-2 text-center">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mx-auto mb-2">
                <LogIn size={15} className="text-orange-500" />
              </div>
              <p className={`text-[17px] font-black tabular-nums ${hasClockedIn ? (isLate ? "text-orange-500" : "text-gray-800") : "text-gray-300"}`}>
                {hasClockedIn ? formatTime(todayRecord?.clock_in) : "—:—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Check-In</p>
              {isLate && <p className="text-[9px] text-orange-400 font-semibold mt-0.5">สาย {lateMin} น.</p>}
            </div>

            {/* Check-Out */}
            <div className="bg-gray-50 rounded-xl py-3.5 px-2 text-center">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-2">
                <LogOut size={15} className="text-red-400" />
              </div>
              <p className={`text-[17px] font-black tabular-nums ${hasClockedOut ? "text-gray-800" : "text-gray-300"}`}>
                {hasClockedOut ? formatTime(todayRecord?.clock_out) : "—:—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Check-Out</p>
              {isEarlyOut && hasClockedOut && <p className="text-[9px] text-orange-400 font-semibold mt-0.5">ก่อน {earlyOutMin} น.</p>}
            </div>

            {/* Total Hours */}
            <div className="bg-gray-50 rounded-xl py-3.5 px-2 text-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-2">
                <Clock size={15} className="text-indigo-500" />
              </div>
              <p className={`text-[17px] font-black tabular-nums ${hasClockedIn ? "text-gray-800" : "text-gray-300"}`}>
                {hasClockedIn ? `${workH}:${pad(workM)}` : "—:—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total Hours</p>
            </div>
          </div>
        </div>

        {/* ═══════ Check-Out Button (after clock in) ═══════ */}
        {hasClockedIn && !hasClockedOut && (
          <div className="px-5 mb-5 fi2">
            {inRadius ? (
              <button onClick={handleClockOut} disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-[15px] text-white active:scale-[.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200/40"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)" }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                Check-Out
              </button>
            ) : (
              <div className="text-center">
                <div className="w-full py-4 rounded-xl font-bold text-[15px] text-gray-400 bg-gray-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Check-Out
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  {remainSec > 0
                    ? `Check-Out available · กรุณาเข้าใกล้สาขา`
                    : "กรุณาเข้าใกล้สาขาเพื่อเช็คเอ้าท์"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Alert Cards ═══════ */}
        <div className="px-5 space-y-3">
          {/* Late */}
          {isLate && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-100 fi3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">มาสาย {lateMin} นาที</p>
                  <p className="text-[11px] text-gray-400">ต้องการแก้ไขหรือยื่นใบลา?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <FileEdit size={11} /> แก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                  <CalendarClock size={11} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}

          {/* Early out */}
          {hasClockedOut && isEarlyOut && !isLate && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-100 fi3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <LogOut size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">ออกก่อนกำหนด {earlyOutMin} นาที</p>
                  <p className="text-[11px] text-gray-400">ระบบจะหักตามเวลาที่ออกก่อน</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <FileEdit size={11} /> แก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                  <CalendarClock size={11} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}

          {/* On time complete */}
          {hasClockedOut && !isLate && !isEarlyOut && (
            <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 fi3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-indigo-500" />
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
            <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-100 fi3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-rose-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">สาย {lateMin} น. + ออกก่อน {earlyOutMin} น.</p>
                  <p className="text-[11px] text-gray-400">จะถูกหักเงินเดือนทั้ง 2 รายการ</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  <FileEdit size={11} /> แก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                  <CalendarClock size={11} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Map (toggleable) ═══════ */}
        <div className="px-5 mt-4 fi3">
          <button onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 text-[12px] font-semibold text-gray-400 hover:text-gray-600 transition-colors mb-2">
            <MapPin size={12} />
            {showMap ? "ซ่อนแผนที่" : "ดูแผนที่"}
            <ChevronRight size={12} className={`transition-transform ${showMap ? "rotate-90" : ""}`} />
          </button>

          {showMap && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ animation: "fin .3s ease both" }}>
              <div className="relative" style={{ height: 180 }}>
                <div ref={mapRef} className="w-full h-full bg-gray-50" />
                {!mapInited && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
                    {MAPS_KEY
                      ? <><Loader2 size={16} className="animate-spin text-indigo-400" /><p className="text-[11px] text-gray-400">โหลดแผนที่…</p></>
                      : <><MapPin size={18} className="text-gray-300" /><p className="text-[11px] text-gray-400 text-center px-6">ตั้งค่า Google Maps API Key</p></>}
                  </div>
                )}
                <button onClick={getLocation} disabled={gpsLoading}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center z-10 text-gray-400 hover:text-indigo-500 active:scale-95 transition-all border border-gray-100">
                  {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Quick Actions ═══════ */}
        <div className="px-5 mt-4 fi3">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {([
              { href: `/app/leave/new?type=adjustment&date=${today}`, icon: <FileEdit size={14} />, label: "ขอแก้ไขเวลา", desc: "เวลาเข้า-ออกผิดพลาด", iconBg: "bg-indigo-50", iconColor: "text-indigo-500" },
              { href: `/app/leave/new?type=leave&date=${today}`, icon: <CalendarClock size={14} />, label: "ยื่นใบลา", desc: "ลาป่วย ลากิจ พักร้อน", iconBg: "bg-orange-50", iconColor: "text-orange-500" },
              { href: `/app/leave/new?type=overtime&date=${today}`, icon: <Timer size={14} />, label: "ขอทำ OT", desc: "บันทึกเวลาล่วงเวลา", iconBg: "bg-blue-50", iconColor: "text-blue-500" },
              { href: "/app/attendance", icon: <History size={14} />, label: "ประวัติเข้างาน", desc: "ดูสถิติย้อนหลัง", iconBg: "bg-gray-100", iconColor: "text-gray-500" },
            ].map((a, i, arr) => (
              <Link key={a.href} href={a.href}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconColor}`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-700">{a.label}</p>
                  <p className="text-[10px] text-gray-400">{a.desc}</p>
                </div>
                <ChevronRight size={13} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
              </Link>
            )))}
          </div>
        </div>

        {/* ═══════ Branches ═══════ */}
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
                  <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isNearest && ok ? "bg-indigo-50/50" : "bg-gray-50"}`}>
                    <Building2 size={14} className={ok ? "text-indigo-500" : "text-gray-300"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-700 truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400">{b.geo_radius_m}m{d !== null ? ` · ${d}m` : ""}</p>
                    </div>
                    {d !== null && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ok ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                        {ok ? "OK" : "ไกล"}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
