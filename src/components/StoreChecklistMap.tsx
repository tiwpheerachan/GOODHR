"use client"
import { useEffect, useRef, useState } from "react"

// โหลด Google Maps JS ครั้งเดียว (idempotent)
let mapsPromise: Promise<any> | null = null
function loadMaps(key: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject()
  if ((window as any).google?.maps) return Promise.resolve((window as any).google)
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const cb = "__scMapsCb"
      ;(window as any)[cb] = () => resolve((window as any).google)
      const s = document.createElement("script")
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${cb}&language=th`
      s.async = true
      s.onerror = () => reject(new Error("maps load error"))
      document.head.appendChild(s)
    })
  }
  return mapsPromise
}

type Pt = { lat: number; lng: number; dealer?: string; location_name?: string; by?: string; date?: string; id?: string }

const esc = (s: string) => (s || "").replace(/[<>&]/g, "")

export default function StoreChecklistMap({ points, height = 320, showLabels = true }: { points: Pt[]; height?: number; showLabels?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [err, setErr] = useState(false)
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  useEffect(() => {
    if (!key) { setErr(true); return }
    let markers: any[] = []
    let cancelled = false
    loadMaps(key).then((google) => {
      if (cancelled || !ref.current) return
      const map = mapRef.current || new google.maps.Map(ref.current, {
        center: { lat: 13.736, lng: 100.523 }, zoom: 6,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
      })
      mapRef.current = map
      const bounds = new google.maps.LatLngBounds()
      const info = new google.maps.InfoWindow()
      points.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng }
        const title = p.dealer || p.location_name || ""
        const m = new google.maps.Marker({
          map, position: pos, title,
          // ป้ายชื่อสถานที่ใต้หมุด (เห็นชัดว่าที่ไหน)
          label: showLabels && title ? { text: title.length > 22 ? title.slice(0, 22) + "…" : title, fontSize: "11px", fontWeight: "600", className: "sc-map-label" } : undefined,
        })
        const html = `<div style="font-size:12px;line-height:1.5;min-width:140px">
          <b>${esc(p.dealer || p.location_name || "จุดเข้าเยี่ยม")}</b>
          ${p.location_name && p.location_name !== p.dealer ? `<br><span style="color:#0d9488">📍 ${esc(p.location_name)}</span>` : ""}
          ${p.by ? `<br>👤 ${esc(p.by)}` : ""}
          ${p.date ? `<br>🗓 ${esc(p.date)}` : ""}
        </div>`
        m.addListener("click", () => { info.setContent(html); info.open(map, m) })
        markers.push(m); bounds.extend(pos)
      })
      if (points.length === 1) { map.setCenter(points[0]); map.setZoom(16) }
      else if (points.length > 1) map.fitBounds(bounds)
    }).catch(() => setErr(true))
    return () => { cancelled = true; markers.forEach((m) => m.setMap(null)) }
  }, [points, key, showLabels])

  if (err) return <div className="text-sm text-slate-400 text-center py-8">แผนที่ใช้งานไม่ได้ (ไม่มี Google Maps API key)</div>
  return <div ref={ref} className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height }} />
}

// ── ตัวเลือกตำแหน่งแบบลากหมุดได้ (ใช้ในฟอร์มพนักงาน) ──
export function LocationPicker({ lat, lng, onChange, height = 240 }: {
  lat: number; lng: number; onChange: (lat: number, lng: number) => void; height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [err, setErr] = useState(false)
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  useEffect(() => {
    if (!key) { setErr(true); return }
    let cancelled = false
    loadMaps(key).then((google) => {
      if (cancelled || !ref.current) return
      const pos = { lat, lng }
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(ref.current, {
          center: pos, zoom: 16, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        })
        markerRef.current = new google.maps.Marker({ map: mapRef.current, position: pos, draggable: true })
        // ลากหมุด → อัปเดตพิกัด
        markerRef.current.addListener("dragend", (e: any) => onChange(e.latLng.lat(), e.latLng.lng()))
        // แตะแผนที่ → ย้ายหมุด
        mapRef.current.addListener("click", (e: any) => {
          markerRef.current.setPosition(e.latLng)
          onChange(e.latLng.lat(), e.latLng.lng())
        })
      } else {
        mapRef.current.setCenter(pos)
        markerRef.current.setPosition(pos)
      }
    }).catch(() => setErr(true))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, key])

  if (err) return <div className="text-xs text-slate-400 text-center py-4">แผนที่ใช้งานไม่ได้</div>
  return (
    <div className="relative">
      <div ref={ref} className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height }} />
      <p className="text-[10px] text-slate-400 mt-1">💡 ลากหมุด หรือแตะบนแผนที่เพื่อปรับตำแหน่งให้ตรงจุด</p>
    </div>
  )
}
