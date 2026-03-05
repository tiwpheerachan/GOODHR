"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance, useCheckin } from "@/lib/hooks/useAttendance"
import { calcGeoDistance, formatTime } from "@/lib/utils/attendance"
import { MapPin, CheckCircle, Clock, Loader2, Navigation, RefreshCw, AlertCircle, Building2 } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

// จุดหลัก HQ — ทุกคนเช็คอินได้เสมอ
// HR เพิ่มจุดเพิ่มเติมรายบุคคลในตาราง branches
const HQ_BRANCH = {
  id: "hq-main",
  name: "สำนักงานใหญ่ (Charoen Nakhon)",
  latitude: 13.726304006803693,
  longitude: 100.50832360980517,
  geo_radius_m: 100,
  address: "168 Charoen Nakhon Rd, Bangkok",
}

declare global { interface Window { google: any; _gmapsLoaded?: boolean } }
const GMAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
export default function CheckInPage() {
  const { user } = useAuth()
  const { todayRecord, refetch } = useAttendance(user?.employee_id)
  const { clockIn, clockOut, loading } = useCheckin()
  const [pos, setPos]           = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsL]   = useState(false)
  const [gpsError, setGpsErr]   = useState<string | null>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [nearest, setNearest]   = useState<any>(null)
  const [distance, setDist]     = useState<number | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [clock, setClock] = useState<Date | null>(null)
  const mapRef      = useRef<HTMLDivElement>(null)
  const gmap        = useRef<any>(null)
  const userDot     = useRef<any>(null)
  const accCircle   = useRef<any>(null)
  const initialized = useRef(false)

  useEffect(() => {
    setClock(new Date())
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  // Load branches + inject HQ
  useEffect(() => {
    if (!user?.employee?.company_id) return
    supabase.from("branches").select("*")
      .eq("company_id", user.employee.company_id).eq("is_active", true)
      .then(({ data }) => {
        const list = data ?? []
        const hasHQ = list.some((b: any) => b.latitude && Math.abs(b.latitude - HQ_BRANCH.latitude) < 0.0001)
        setBranches(hasHQ ? list : [{ ...HQ_BRANCH, company_id: user.employee!.company_id }, ...list])
      })
  }, [user?.employee?.company_id])
  // Find nearest branch
  const computeNearest = useCallback((lat: number, lng: number, bList: any[]) => {
    if (!bList.length) return
    let near = bList[0], minD = Infinity
    for (const b of bList) {
      if (b.latitude && b.longitude) {
        const d = calcGeoDistance(lat, lng, b.latitude, b.longitude)
        if (d < minD) { minD = d; near = b }
      }
    }
    setNearest(near); setDist(minD)
  }, [])
  // Update user dot on map
  const updateUserDot = useCallback((lat: number, lng: number) => {
    if (!gmap.current || !window.google) return
    const g = window.google.maps
    const latLng = new g.LatLng(lat, lng)
    if (userDot.current) {
      userDot.current.setPosition(latLng)
      accCircle.current?.setCenter(latLng)
    } else {
      userDot.current = new g.Marker({
        position: latLng, map: gmap.current, zIndex: 10,
        icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: "#0ea5e9", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2.5 },
        title: "ตำแหน่งของคุณ",
      })
      accCircle.current = new g.Circle({
        map: gmap.current, center: latLng, radius: 18,
        strokeColor: "#0ea5e9", strokeOpacity: 0.3, strokeWeight: 1,
        fillColor: "#0ea5e9", fillOpacity: 0.1,
      })
    }
    gmap.current.panTo(latLng)
  }, [])
  // GPS
  const getLocation = useCallback(() => {
    setGpsL(true); setGpsErr(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setPos({ lat: latitude, lng: longitude })
        computeNearest(latitude, longitude, branches)
        updateUserDot(latitude, longitude)
        setGpsL(false)
      },
      (err) => {
        const msg = err.code === 1 ? "กรุณาอนุญาต GPS ในเบราว์เซอร์" : err.code === 2 ? "ไม่พบสัญญาณ GPS" : "GPS หมดเวลา"
        setGpsErr(msg); toast.error(msg); setGpsL(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }, [branches, computeNearest, updateUserDot])
  useEffect(() => { if (branches.length > 0 && !pos) getLocation() }, [branches])
  // Load Google Maps SDK
  useEffect(() => {
    if (window._gmapsLoaded) { setMapReady(true); return }
    const s = document.createElement("script")
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}`
    s.async = true; s.defer = true
    s.onload = () => { window._gmapsLoaded = true; setMapReady(true) }
    document.head.appendChild(s)
  }, [])
  // Init map + draw radius
  useEffect(() => {
    if (!mapReady || !mapRef.current || initialized.current || !branches.length) return
    initialized.current = true
    const g = window.google.maps
    const first = branches.find((b: any) => b.latitude) || HQ_BRANCH
    const map = new g.Map(mapRef.current, {
      center: { lat: first.latitude, lng: first.longitude }, zoom: 17,
      disableDefaultUI: true, zoomControl: true,
      zoomControlOptions: { position: g.ControlPosition.RIGHT_BOTTOM },
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    })
    gmap.current = map
    for (const b of branches) {
      if (!b.latitude || !b.longitude) continue
      const r = b.geo_radius_m || 100
      const center = { lat: b.latitude, lng: b.longitude }
      new g.Circle({ map, center, radius: r, strokeColor: "#6366f1", strokeOpacity: 0.7, strokeWeight: 2, fillColor: "#818cf8", fillOpacity: 0.12 })
      const svgPin = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
        `<path d="M16 0C7.16 0 0 7.16 0 16c0 10.84 16 24 16 24S32 26.84 32 16C32 7.16 24.84 0 16 0z" fill="#6366f1"/>` +
        `<text x="16" y="22" text-anchor="middle" font-size="16">&#x1F3E2;</text></svg>`
      )
      const marker = new g.Marker({
        position: center, map,
        icon: { url: "data:image/svg+xml;charset=UTF-8," + svgPin, scaledSize: new g.Size(32, 40), anchor: new g.Point(16, 40) },
      })
      const info = new g.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 2px"><b style="color:#1e293b">${b.name}</b><br><span style="color:#6366f1;font-size:11px;font-weight:600">รัศมี ${r} เมตร</span>${b.address ? `<br><span style="color:#94a3b8;font-size:10px">${b.address}</span>` : ""}</div>`,
      })
      marker.addListener("click", () => info.open(map, marker))
    }
    if (branches.length > 1) {
      const bounds = new g.LatLngBounds()
      branches.filter((b: any) => b.latitude).forEach((b: any) => bounds.extend({ lat: b.latitude, lng: b.longitude }))
      map.fitBounds(bounds)
    }
  }, [mapReady, branches])
  const inRadius   = nearest && distance !== null && distance <= (nearest.geo_radius_m || 100)
  const alreadyIn  = !!todayRecord?.clock_in
  const alreadyOut = !!todayRecord?.clock_out
  const handleClockIn = async () => {
    if (!pos) return toast.error("กรุณาเปิด GPS ก่อน")
    const r = await clockIn(pos.lat, pos.lng)
    if (r.success) { toast.success("✅ เช็คอินสำเร็จ!"); refetch() }
    else toast.error(r.error || "เกิดข้อผิดพลาด")
  }
  const handleClockOut = async () => {
    if (!pos) return toast.error("กรุณาเปิด GPS ก่อน")
    const r = await clockOut(pos.lat, pos.lng)
    if (r.success) { toast.success("✅ เช็คเอ้าท์สำเร็จ!"); refetch() }
    else toast.error(r.error || "เกิดข้อผิดพลาด")
  }
  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">เช็คอิน / เช็คเอ้าท์</h1>
            <p className="text-xs text-slate-400 mt-0.5">{clock ? format(clock, "EEEE d MMMM yyyy", { locale: th }) : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tabular-nums tracking-tight text-slate-800 leading-none">
              {clock ? clock.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">เวลาปัจจุบัน</p>
          </div>
        </div>
      </div>
      <div className="relative bg-slate-100" style={{ height: 260 }}>
        <div ref={mapRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">กำลังโหลดแผนที่...</p>
          </div>
        )}
        <button onClick={getLocation} disabled={gpsLoading}
          className="absolute top-3 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center active:scale-95 transition-all">
          {gpsLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Navigation size={16} className={pos ? "text-indigo-600" : "text-slate-400"} />}
        </button>
        {distance !== null && (
          <div className={`absolute bottom-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-md ${inRadius ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {inRadius ? "✓ ในรัศมี" : "✗ นอกรัศมี"} · {distance}ม.
          </div>
        )}
      </div>
      <div className="px-4 mt-3 space-y-2.5">
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-medium ${
          gpsLoading ? "bg-slate-50 border-slate-200 text-slate-400"
          : gpsError  ? "bg-red-50 border-red-200 text-red-600"
          : inRadius  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : pos       ? "bg-amber-50 border-amber-200 text-amber-700"
          :             "bg-slate-50 border-slate-200 text-slate-400"
        }`}>
          {gpsLoading ? <Loader2 size={14} className="animate-spin shrink-0" />
          : gpsError  ? <AlertCircle size={14} className="shrink-0" />
          : inRadius  ? <CheckCircle size={14} className="shrink-0" />
          :              <MapPin size={14} className="shrink-0" />}
          <span className="flex-1">
            {gpsLoading ? "กำลังหาตำแหน่ง..."
            : gpsError  ? gpsError
            : !pos      ? "กด GPS เพื่อหาตำแหน่ง"
            : inRadius  ? `อยู่ในรัศมีเช็คอิน — ${nearest?.name}`
            : `ห่างจาก ${nearest?.name} ${distance}ม. (รัศมี ${nearest?.geo_radius_m || 100}ม.)`}
          </span>
        </div>
        {branches.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4">
            {branches.map((b: any) => {
              const d = pos ? calcGeoDistance(pos.lat, pos.lng, b.latitude, b.longitude) : null
              const ok = d !== null && d <= (b.geo_radius_m || 100)
              return (
                <div key={b.id} className={`flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium border ${ok ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500"}`}>
                  <Building2 size={9} className="shrink-0 opacity-70" />
                  <span className="max-w-[100px] truncate">{b.name}</span>
                  {d !== null && <span className="font-mono opacity-50">{d}ม.</span>}
                </div>
              )
            })}
          </div>
        )}
        {alreadyIn && (
          <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5">
              <p className="text-white text-[11px] font-bold tracking-widest uppercase">บันทึกวันนี้</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">Clock In</p>
                <p className="text-2xl font-black text-slate-800 tabular-nums">{formatTime(todayRecord?.clock_in)}</p>
                <div className="mt-1.5">
                  {(todayRecord?.late_minutes ?? 0) > 0
                    ? <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">สาย {todayRecord!.late_minutes} นาที</span>
                    : <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">ตรงเวลา ✓</span>}
                </div>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">Clock Out</p>
                <p className="text-2xl font-black text-slate-800 tabular-nums">{formatTime(todayRecord?.clock_out)}</p>
                <div className="mt-1.5">
                  {(todayRecord?.work_minutes ?? 0) > 0
                    ? <span className="text-[10px] text-slate-500">{Math.floor(todayRecord!.work_minutes / 60)}ชม. {todayRecord!.work_minutes % 60}นาที</span>
                    : <span className="text-[10px] text-slate-300">--</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Link
              href={"/app/checkin/correction?date=" + format(new Date(), "yyyy-MM-dd")}
              className={
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98] " +
                ((todayRecord?.late_minutes ?? 0) > 0
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-500")
              }
            >
              <span className="flex items-center gap-2">
                <Clock size={15} />
                {(todayRecord?.late_minutes ?? 0) > 0
                  ? "ขอแก้ไขเวลา (มาสาย " + (todayRecord?.late_minutes ?? 0) + " นาที)"
                  : "ขอแก้ไขเวลาเข้า-ออก"}
              </span>
              <span className="text-xs opacity-60">→</span>
            </Link>
          </div>
          </>
        )}
        <button onClick={handleClockIn} disabled={loading || !inRadius || alreadyIn}
          className={`w-full py-[18px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${inRadius && !alreadyIn ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : alreadyIn ? <CheckCircle size={20} className="opacity-60" /> : <MapPin size={20} />}
          {alreadyIn ? "เช็คอินแล้ว ✓" : "เช็คอิน"}
        </button>
        <button onClick={handleClockOut} disabled={loading || !inRadius || !alreadyIn || alreadyOut}
          className={`w-full py-[18px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${inRadius && alreadyIn && !alreadyOut ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : alreadyOut ? <CheckCircle size={20} className="opacity-60" /> : <Clock size={20} />}
          {alreadyOut ? "เช็คเอ้าท์แล้ว ✓" : "เช็คเอ้าท์"}
        </button>
        {gpsError && (
          <button onClick={getLocation}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            <RefreshCw size={14} /> ลองหาตำแหน่งใหม่
          </button>
        )}
        {pos && !inRadius && !gpsError && nearest && (
          <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4">
            กรุณาเข้าใกล้ <b>{nearest.name}</b> ให้อยู่ในรัศมี <b>{nearest.geo_radius_m || 200} เมตร</b>
          </p>
        )}
        <div className="flex items-center gap-5 justify-center py-2 pb-28">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><div className="w-3 h-3 rounded-full bg-indigo-400 opacity-60" /> จุดเช็คอิน (200ม.)</span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><div className="w-3 h-3 rounded-full bg-sky-400" /> ตำแหน่งของคุณ</span>
        </div>
      </div>
    </div>
  )
}