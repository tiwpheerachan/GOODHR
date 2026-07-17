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
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${cb}`
      s.async = true
      s.onerror = () => reject(new Error("maps load error"))
      document.head.appendChild(s)
    })
  }
  return mapsPromise
}

type Pt = { lat: number; lng: number; dealer?: string; date?: string; id?: string }

export default function StoreChecklistMap({ points }: { points: Pt[] }) {
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
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      })
      mapRef.current = map
      const bounds = new google.maps.LatLngBounds()
      points.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng }
        const m = new google.maps.Marker({ map, position: pos, title: p.dealer || "" })
        const info = new google.maps.InfoWindow({
          content: `<div style="font-size:12px"><b>${(p.dealer || "").replace(/</g, "")}</b><br>${p.date || ""}</div>`,
        })
        m.addListener("click", () => info.open(map, m))
        markers.push(m); bounds.extend(pos)
      })
      if (points.length === 1) { map.setCenter(points[0]); map.setZoom(15) }
      else if (points.length > 1) map.fitBounds(bounds)
    }).catch(() => setErr(true))
    return () => { cancelled = true; markers.forEach((m) => m.setMap(null)) }
  }, [points, key])

  if (err) return <div className="text-sm text-slate-400 text-center py-8">แผนที่ใช้งานไม่ได้ (ไม่มี Google Maps API key)</div>
  return <div ref={ref} className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-100" />
}
