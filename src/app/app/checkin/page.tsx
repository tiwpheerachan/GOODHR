"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import Script from "next/script"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance, useCheckin } from "@/lib/hooks/useAttendance"
import { calcGeoDistance, formatTime } from "@/lib/utils/attendance"
import {
  Loader2, RefreshCw, X, Send, LogIn, LogOut,
  Building2, MapPin, AlertTriangle, Clock, CheckCircle2,
  FileEdit, CalendarClock, Timer, History, ChevronRight,
  Zap, AlertCircle, Navigation
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

declare global { interface Window { google: any; initCheckinMap: () => void } }
type Branch = { id: string; name: string; latitude: number; longitude: number; geo_radius_m: number }

// ── Ripple Animation ─────────────────────────────────────────────────────────
function RippleEffect({ active, color = "#3b82f6" }: { active: boolean; color?: string }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
      <span className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ backgroundColor: color }} />
      <span className="absolute inset-0 rounded-2xl animate-ping opacity-10 animation-delay-150" style={{ backgroundColor: color }} />
    </div>
  )
}

// ── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ show, type, time, onDone }: { show: boolean; type: "in" | "out"; time: string; onDone: () => void }) {
  const [closing, setClosing] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!show) { setClosing(false); setProgress(100); return }
    // progress bar countdown
    const start = Date.now()
    const duration = 5000
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct <= 0) clearInterval(tick)
    }, 30)
    // auto dismiss after 5s
    const t = setTimeout(() => { setClosing(true); setTimeout(onDone, 400) }, 5000)
    return () => { clearTimeout(t); clearInterval(tick) }
  }, [show, onDone])

  const handleTap = useCallback(() => {
    setClosing(true); setTimeout(onDone, 400)
  }, [onDone])

  if (!show) return null

  const isIn = type === "in"
  const gradient = isIn
    ? "from-blue-600 via-blue-500 to-indigo-600"
    : "from-indigo-600 via-purple-500 to-violet-600"
  const iconBg = isIn ? "bg-white/20" : "bg-white/20"
  const label = isIn ? "เช็คอินสำเร็จ" : "เช็คเอ้าท์สำเร็จ"
  const sublabel = isIn ? "ระบบบันทึกเวลาเข้างานแล้ว" : "ระบบบันทึกเวลาออกงานแล้ว"

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-400 ${closing ? "opacity-0" : "opacity-100"}`}
      onClick={handleTap}
    >
      {/* gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

      {/* floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="absolute rounded-full bg-white/30"
            style={{
              width: 4 + Math.random() * 8, height: 4 + Math.random() * 8,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animation: `floatUp ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* content */}
      <div className="relative z-10 flex flex-col items-center px-8" style={{ animation: "successEnter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
        {/* animated rings */}
        <div className="relative mb-6">
          {[0, 1, 2].map(i => (
            <span key={i} className="absolute rounded-full border-2 border-white/30"
              style={{
                width: 100 + i * 50, height: 100 + i * 50,
                top: -(i * 25), left: -(i * 25),
                animation: `ringPulse 2s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
          {/* check icon */}
          <div className={`w-[100px] h-[100px] rounded-full ${iconBg} backdrop-blur-sm flex items-center justify-center`}
            style={{ animation: "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
            <div className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center shadow-2xl">
              <CheckCircle2 size={40} className={isIn ? "text-blue-600" : "text-purple-600"} strokeWidth={2.5}
                style={{ animation: "checkDraw 0.4s ease 0.5s both" }} />
            </div>
          </div>
        </div>

        {/* text */}
        <h2 className="text-white text-2xl font-black tracking-tight mb-1"
          style={{ animation: "fadeSlideUp2 0.4s ease 0.4s both" }}>
          {label}
        </h2>
        <p className="text-white/70 text-sm font-medium mb-6"
          style={{ animation: "fadeSlideUp2 0.4s ease 0.5s both" }}>
          {sublabel}
        </p>

        {/* time card */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20 mb-8"
          style={{ animation: "fadeSlideUp2 0.5s ease 0.6s both" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              {isIn ? <LogIn size={20} className="text-white" /> : <LogOut size={20} className="text-white" />}
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-semibold tracking-wider uppercase">
                {isIn ? "เวลาเข้างาน" : "เวลาออกงาน"}
              </p>
              <p className="text-white text-3xl font-black tabular-nums tracking-tight leading-none mt-0.5">
                {time}
              </p>
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mb-3"
          style={{ animation: "fadeSlideUp2 0.4s ease 0.7s both" }}>
          <div className="h-full bg-white/70 rounded-full transition-none"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-white/40 text-[11px] font-medium"
          style={{ animation: "fadeSlideUp2 0.4s ease 0.8s both" }}>
          แตะเพื่อปิด
        </p>
      </div>

      <style>{`
        @keyframes successEnter { from{opacity:0;transform:scale(0.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes bounceIn { from{transform:scale(0)} to{transform:scale(1)} }
        @keyframes fadeSlideUp2 { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.15);opacity:0.1} }
        @keyframes checkDraw { from{opacity:0;transform:scale(0) rotate(-45deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes floatUp { 0%,100%{transform:translateY(0) scale(1);opacity:0.3} 50%{transform:translateY(-40px) scale(1.3);opacity:0.6} }
      `}</style>
    </div>
  )
}

// ── Adjust Modal ─────────────────────────────────────────────────────────────
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
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <style>{`@keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

        <div className="h-1 w-full bg-blue-500" />
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileEdit size={15} className="text-blue-500" /> ขอแก้ไขเวลา
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {record.work_date ? format(new Date(record.work_date + "T00:00:00"), "d MMMM yyyy", { locale: th }) : ""}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* current times */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              { label: "เวลาเข้าที่บันทึก", icon: <LogIn size={11} />, val: formatTime(record.clock_in) },
              { label: "เวลาออกที่บันทึก", icon: <LogOut size={11} />, val: formatTime(record.clock_out) },
            ].map(({ label, icon, val }) => (
              <div key={label} className="bg-gray-50 rounded-2xl px-3 py-3 text-center border border-gray-100">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  {icon}<p className="text-[10px]">{label}</p>
                </div>
                <p className="text-xl font-black text-gray-700 tabular-nums">{val || "—"}</p>
              </div>
            ))}
          </div>

          {/* new times */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { label: "เวลาเข้าใหม่", val: reqIn, set: setReqIn },
              { label: "เวลาออกใหม่", val: reqOut, set: setReqOut },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{label}</p>
                <input type="time" value={val} onChange={e => set(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            ))}
          </div>

          {/* quick reasons */}
          <p className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <Zap size={11} className="text-blue-400" /> เหตุผลด่วน
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["ลืมเช็คอิน", "ลืมเช็คเอ้าท์", "ระบบขัดข้อง", "ประชุมนอกสถานที่", "เหตุฉุกเฉิน"].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`text-[11px] px-3 py-1.5 rounded-xl font-medium border transition-all ${reason === r
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                {r}
              </button>
            ))}
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="หรือกรอกเหตุผลเพิ่มเติม..."
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none mb-4 transition-all" />

          <button onClick={send} disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
            ส่งคำขอแก้ไข
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
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
  const [clock, setClock] = useState("")
  const [showAdj, setShowAdj] = useState(false)
  const [burst, setBurst] = useState(false)
  const [burstType, setBurstType] = useState<"in" | "out">("in")
  const [burstTime, setBurstTime] = useState("")
  const [pulseIn, setPulseIn] = useState(false)
  const [pulseOut, setPulseOut] = useState(false)

  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

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

  useEffect(() => {
    if (!pos || branches.length === 0) { setNearest(null); setDistance(null); return }
    let near = branches[0], minD = Infinity
    for (const b of branches) { const d = calcGeoDistance(pos.lat, pos.lng, b.latitude, b.longitude); if (d < minD) { minD = d; near = b } }
    setNearest(near); setDistance(Math.round(minD))
  }, [pos, branches])

  const redraw = useCallback((lat: number, lng: number, bl: Branch[]) => {
    const map = mapObj.current; if (!map || !window.google) return
    drawables.current.forEach(d => d.setMap(null)); drawables.current = []
    bl.forEach(b => {
      const distM = calcGeoDistance(lat, lng, b.latitude, b.longitude), inR = distM <= b.geo_radius_m
      const fill = inR ? "#3b82f6" : "#94a3b8", stroke = inR ? "#2563eb" : "#64748b"
      const circle = new window.google.maps.Circle({
        map, center: { lat: b.latitude, lng: b.longitude }, radius: b.geo_radius_m,
        fillColor: fill, fillOpacity: 0.1, strokeColor: stroke, strokeOpacity: 0.8, strokeWeight: 2, clickable: false,
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 12 18 26 18 26S36 30 36 18C36 8.06 27.94 0 18 0z" fill="${inR ? "#2563eb" : "#64748b"}" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="18" r="9" fill="white"/><circle cx="18" cy="18" r="4" fill="${inR ? "#2563eb" : "#94a3b8"}"/>
      </svg>`
      const marker = new window.google.maps.Marker({
        map, position: { lat: b.latitude, lng: b.longitude }, title: b.name,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(36, 44), anchor: new window.google.maps.Point(18, 44) }
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:8px;min-width:160px">
          <b style="font-size:13px;color:#1e293b">${b.name}</b>
          <p style="font-size:11px;color:#64748b;margin:4px 0 2px">รัศมี: <b>${b.geo_radius_m} ม.</b></p>
          <p style="font-size:11px;color:#64748b;margin:0">ห่าง: <b>${Math.round(distM)} ม.</b></p>
          <p style="font-size:12px;font-weight:bold;margin:5px 0 0;color:${inR ? "#2563eb" : "#dc2626"}">${inR ? "เช็คอินได้" : "อยู่นอกรัศมี"}</p></div>`,
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
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      ],
    })
    mapObj.current = map
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#3b82f6" stroke="white" stroke-width="2.5"/><circle cx="10" cy="10" r="3" fill="white"/></svg>`
    userPin.current = new window.google.maps.Marker({
      map, position: { lat, lng }, zIndex: 99,
      icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(20, 20), anchor: new window.google.maps.Point(10, 10) }
    })
    setMapInited(true)
  }, [])

  const panToUser = useCallback((lat: number, lng: number) => {
    setPos({ lat, lng }); setGpsL(false)
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#3b82f6" stroke="white" stroke-width="2.5"/><circle cx="10" cy="10" r="3" fill="white"/></svg>`
    const pinIcon = { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`, scaledSize: new window.google.maps.Size(20, 20), anchor: new window.google.maps.Point(10, 10) }
    if (userPin.current) { userPin.current.setPosition({ lat, lng }); mapObj.current?.panTo({ lat, lng }); mapObj.current?.setZoom(17) }
    else if (mapObj.current) { userPin.current = new window.google.maps.Marker({ map: mapObj.current, position: { lat, lng }, zIndex: 99, icon: pinIcon }); mapObj.current.panTo({ lat, lng }); mapObj.current.setZoom(17) }
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
    setPulseIn(true)
    setTimeout(() => setPulseIn(false), 600)
    const r = await clockIn(pos.lat, pos.lng)
    if (r.success) {
      setBurstType("in")
      setBurstTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }))
      setBurst(true)
      refetch()
    } else toast.error(r.error || "เกิดข้อผิดพลาด")
  }

  const handleClockOut = async () => {
    if (!pos) return toast.error("กรุณาเปิด GPS ก่อน")
    setPulseOut(true)
    setTimeout(() => setPulseOut(false), 600)
    const r = await clockOut(pos.lat, pos.lng)
    if (r.success) {
      setBurstType("out")
      setBurstTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }))
      setBurst(true)
      refetch()
    } else toast.error(r.error || "เกิดข้อผิดพลาด")
  }

  return (
    <>
      {MAPS_KEY && <Script src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initCheckinMap`} strategy="afterInteractive" onLoad={handleScriptLoad} />}
      {showAdj && todayRecord && <AdjustModal record={todayRecord} onClose={() => setShowAdj(false)} />}
      <SuccessOverlay show={burst} type={burstType} time={burstTime} onDone={() => setBurst(false)} />

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes clockPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .card-enter { animation: fadeSlideUp 0.4s ease forwards }
        .card-enter-1 { animation: fadeSlideUp 0.4s ease 0.05s both }
        .card-enter-2 { animation: fadeSlideUp 0.4s ease 0.1s both }
        .card-enter-3 { animation: fadeSlideUp 0.4s ease 0.15s both }
        .card-enter-4 { animation: fadeSlideUp 0.4s ease 0.2s both }
        .colon-blink { animation: clockPulse 1s ease-in-out infinite }
      `}</style>

      <div className="min-h-screen bg-gray-50 pb-12">

        {/* ── Header ── */}
        <div className="bg-blue-600 px-5 pt-6 pb-20 relative overflow-hidden">
          {/* subtle texture */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle at 15% 85%, #fff 0%, transparent 50%), radial-gradient(circle at 85% 15%, #fff 0%, transparent 50%)" }} />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase">
                {format(new Date(), "EEEE", { locale: th })}
              </p>
              <p className="text-white/80 text-sm mt-0.5">
                {format(new Date(), "d MMMM yyyy", { locale: th })}
              </p>
            </div>

            {/* clock */}
            <div className="text-right">
              <p className="text-white font-black tabular-nums leading-none tracking-tight"
                style={{ fontSize: 32, letterSpacing: "-1.5px" }}>
                {clock}
              </p>
              <p className="text-blue-300 text-[10px] mt-1 tracking-widest uppercase font-medium">เวลาปัจจุบัน</p>
            </div>
          </div>
        </div>

        {/* ── floating cards ── */}
        <div className="px-4 -mt-14 space-y-3 relative z-10">

          {/* ── Main Clock Card ── */}
          <div className="bg-white rounded-3xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden card-enter">

            {/* status bar */}
            {hasClockedIn && (
              <div className={`px-5 py-2.5 flex items-center gap-2 text-xs font-semibold border-b ${
                hasClockedOut && !isLate
                  ? "bg-sky-50 text-sky-700 border-sky-100"
                  : isLate
                    ? "bg-orange-50 text-orange-700 border-orange-100"
                    : "bg-blue-50 text-blue-700 border-blue-100"
              }`}>
                {hasClockedOut && !isLate
                  ? <><CheckCircle2 size={13} /> เสร็จสิ้นการทำงานวันนี้</>
                  : isLate
                    ? <><AlertTriangle size={13} /> มาสาย {lateMin} นาที</>
                    : <><Clock size={13} /> กำลังทำงานอยู่</>}
              </div>
            )}

            {/* time display */}
            {hasClockedIn && (
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                <div className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <LogIn size={11} /><span className="text-[10px] font-medium">เข้างาน</span>
                  </div>
                  <p className={`text-2xl font-black tabular-nums tracking-tight ${isLate ? "text-orange-500" : "text-blue-600"}`}>
                    {formatTime(todayRecord?.clock_in)}
                  </p>
                  {isLate && <p className="text-[10px] text-orange-400 mt-0.5 font-semibold">สาย {lateMin} นาที</p>}
                </div>
                <div className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                    <LogOut size={11} /><span className="text-[10px] font-medium">ออกงาน</span>
                  </div>
                  <p className={`text-2xl font-black tabular-nums tracking-tight ${hasClockedOut ? "text-blue-600" : "text-gray-200"}`}>
                    {formatTime(todayRecord?.clock_out) || "—"}
                  </p>
                </div>
              </div>
            )}

            {/* buttons */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {/* Clock In */}
              <button onClick={handleClockIn}
                disabled={loading || !inRadius || hasClockedIn || branches.length === 0}
                className={`relative py-5 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 overflow-hidden ${
                  inRadius && !hasClockedIn
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                    : hasClockedIn
                      ? "bg-blue-50 text-blue-400 cursor-default"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}>
                <RippleEffect active={pulseIn} color="#ffffff" />
                {loading ? <Loader2 size={24} className="animate-spin" />
                  : hasClockedIn ? <CheckCircle2 size={24} />
                    : <LogIn size={24} />}
                <span className="text-sm">เช็คอิน</span>
                {hasClockedIn && (
                  <span className="text-[10px] opacity-60 font-normal">{formatTime(todayRecord?.clock_in)}</span>
                )}
              </button>

              {/* Clock Out */}
              <button onClick={handleClockOut}
                disabled={loading || !inRadius || !hasClockedIn || hasClockedOut || branches.length === 0}
                className={`relative py-5 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 overflow-hidden ${
                  inRadius && hasClockedIn && !hasClockedOut
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                    : hasClockedOut
                      ? "bg-blue-50 text-blue-400 cursor-default"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}>
                <RippleEffect active={pulseOut} color="#ffffff" />
                {loading ? <Loader2 size={24} className="animate-spin" />
                  : hasClockedOut ? <CheckCircle2 size={24} />
                    : <LogOut size={24} />}
                <span className="text-sm">เช็คเอ้าท์</span>
                {hasClockedOut && (
                  <span className="text-[10px] opacity-60 font-normal">{formatTime(todayRecord?.clock_out)}</span>
                )}
              </button>
            </div>
          </div>

          {/* ── Map ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden card-enter-1">
            <div className="relative" style={{ height: 210 }}>
              <div ref={mapRef} className="w-full h-full bg-gray-100" />
              {!mapInited && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
                  {MAPS_KEY
                    ? <><Loader2 size={18} className="animate-spin text-blue-400" /><p className="text-xs text-gray-400">กำลังโหลดแผนที่…</p></>
                    : <><MapPin size={20} className="text-gray-300" /><p className="text-xs text-gray-400 text-center px-6">ตั้งค่า NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p></>}
                </div>
              )}
              <button onClick={getLocation} disabled={gpsLoading}
                className="absolute top-3 right-3 w-9 h-9 bg-white rounded-2xl shadow-md flex items-center justify-center z-10 text-gray-500 hover:text-blue-600 transition-colors border border-gray-100">
                {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </button>
              {pos && (
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1 z-10 shadow-sm text-[10px] font-mono text-gray-500 border border-gray-100">
                  {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                </div>
              )}
            </div>

            {nearest && distance !== null && (
              <div className={`flex items-center gap-3 px-4 py-3 border-t ${inRadius ? "border-blue-50 bg-blue-50/50" : "border-gray-100"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${inRadius ? "bg-blue-100" : "bg-gray-100"}`}>
                  <Building2 size={15} className={inRadius ? "text-blue-600" : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${inRadius ? "text-blue-700" : "text-gray-600"}`}>{nearest.name}</p>
                  <p className="text-[10px] text-gray-400">รัศมีเช็คอิน {nearest.geo_radius_m} ม.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xl font-black tabular-nums leading-none ${inRadius ? "text-blue-600" : "text-red-500"}`}>
                    {distance}<span className="text-xs font-semibold ml-0.5">ม.</span>
                  </p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${inRadius ? "text-blue-500" : "text-red-400"}`}>
                    {inRadius ? "เช็คอินได้" : "นอกรัศมี"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── no permission ── */}
          {!gpsLoading && branches.length === 0 && user?.employee_id && (
            <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-4 flex items-start gap-3 card-enter-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">ยังไม่ได้รับสิทธิ์เช็คอิน</p>
                <p className="text-xs text-gray-400 mt-0.5">กรุณาติดต่อ HR เพื่อกำหนดสาขา</p>
              </div>
            </div>
          )}

          {/* ── Alert banners ── */}
          {isLate && (
            <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-4 space-y-3 card-enter-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">บันทึกว่ามาสาย {lateMin} นาที</p>
                  <p className="text-xs text-gray-400 mt-0.5">ต้องการแก้ไขหรือยื่นใบลาแทน?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-colors">
                  <FileEdit size={12} /> ขอแก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-orange-200 text-orange-600 flex items-center justify-center gap-1.5 hover:bg-orange-50 transition-colors">
                  <CalendarClock size={12} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}

          {hasClockedIn && !hasClockedOut && !isLate && (
            <div className="bg-white rounded-3xl shadow-sm border border-yellow-100 p-4 flex items-center gap-3 card-enter-2">
              <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-700 text-sm">ยังไม่ได้เช็คเอ้าท์</p>
                <p className="text-xs text-gray-400 mt-0.5">อย่าลืมเช็คเอ้าท์ก่อนกลับบ้าน</p>
              </div>
              <button onClick={() => setShowAdj(true)}
                className="text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl hover:bg-yellow-100 transition-colors whitespace-nowrap">
                <FileEdit size={11} className="inline mr-1" />แจ้งเวลา
              </button>
            </div>
          )}

          {hasClockedOut && isEarlyOut && (
            <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-4 space-y-3 card-enter-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <LogOut size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">ออกก่อนกำหนด {earlyOutMin} นาที</p>
                  <p className="text-xs text-gray-400 mt-0.5">ระบบจะหักเงินเดือนตามเวลาที่ออกก่อน</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdj(true)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-colors">
                  <FileEdit size={12} /> ขอแก้ไขเวลา
                </button>
                <Link href={`/app/leave/new?type=leave&date=${today}`}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-orange-200 text-orange-600 flex items-center justify-center gap-1.5 hover:bg-orange-50 transition-colors">
                  <CalendarClock size={12} /> ยื่นใบลา
                </Link>
              </div>
            </div>
          )}

          {hasClockedOut && !isLate && !isEarlyOut && (
            <div className="bg-white rounded-3xl shadow-sm border border-sky-100 p-4 flex items-center gap-3 card-enter-2">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-sky-500" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">มาตรงเวลา วันนี้ทำได้ดี 🎉</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  เข้า {formatTime(todayRecord?.clock_in)} · ออก {formatTime(todayRecord?.clock_out)}
                </p>
              </div>
            </div>
          )}

          {hasClockedOut && isLate && isEarlyOut && (
            <div className="bg-white rounded-3xl shadow-sm border border-red-200 p-4 space-y-2 card-enter-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">สาย {lateMin} น. + ออกก่อน {earlyOutMin} น.</p>
                  <p className="text-xs text-gray-400 mt-0.5">จะถูกหักเงินเดือนทั้ง 2 รายการ</p>
                </div>
              </div>
              <button onClick={() => setShowAdj(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors">
                <FileEdit size={12} /> ขอแก้ไขเวลา
              </button>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden card-enter-3">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">ดำเนินการเพิ่มเติม</p>
            </div>
            {([
              { href: `/app/leave/new?type=adjustment&date=${today}`, icon: <FileEdit size={15} />, label: "ขอแก้ไขเวลาเข้า-ออก", desc: "ถ้าระบบบันทึกเวลาผิด", bg: "bg-blue-50", text: "text-blue-600" },
              { href: `/app/leave/new?type=leave&date=${today}`, icon: <CalendarClock size={15} />, label: "ยื่นใบลา", desc: "ลาป่วย ลากิจ ลาพักร้อน", bg: "bg-violet-50", text: "text-violet-600" },
              { href: `/app/leave/new?type=overtime&date=${today}`, icon: <Timer size={15} />, label: "ขอทำโอที", desc: "บันทึกเวลาล่วงเวลา", bg: "bg-amber-50", text: "text-amber-600" },
              { href: "/app/attendance", icon: <History size={15} />, label: "ประวัติการเข้างาน", desc: "ดูสถิติและประวัติย้อนหลัง", bg: "bg-gray-100", text: "text-gray-600" },
            ].map((a, i, arr) => (
              <Link key={a.href} href={a.href}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.bg} ${a.text}`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{a.label}</p>
                  <p className="text-[10px] text-gray-400">{a.desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
              </Link>
            )))}
          </div>

          {/* ── Branch list ── */}
          {branches.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 card-enter-4">
              <div className="flex items-center gap-2 mb-3">
                <Navigation size={12} className="text-blue-500" />
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">สาขาที่เช็คอินได้</p>
              </div>
              <div className="space-y-2">
                {branches.map(b => {
                  const d = pos ? Math.round(calcGeoDistance(pos.lat, pos.lng, b.latitude, b.longitude)) : null
                  const ok = d !== null && d <= b.geo_radius_m
                  return (
                    <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors ${nearest?.id === b.id ? "border-blue-100 bg-blue-50/40" : "border-gray-100 bg-gray-50/50"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ok ? "bg-blue-100" : "bg-gray-100"}`}>
                        <Building2 size={13} className={ok ? "text-blue-600" : "text-gray-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{b.name}</p>
                        <p className="text-[10px] text-gray-400">รัศมี {b.geo_radius_m}ม.{d !== null ? ` · ห่าง ${d}ม.` : ""}</p>
                      </div>
                      {d !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${ok ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                          {ok ? "เช็คอินได้" : "นอกรัศมี"}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}