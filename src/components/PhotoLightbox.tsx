"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Download, Copy, Check, ExternalLink, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  /** ลิสต์รูปทั้งหมดในข้อนี้/กลุ่มนี้ */
  urls: string[]
  /** index ของรูปแรกที่ต้องการเปิด */
  startIndex?: number
  /** ปิด lightbox */
  onClose: () => void
  /** caption ด้านบน (เช่น "ข้อ 1.1: ความสะอาด") */
  caption?: string
}

export default function PhotoLightbox({ urls, startIndex = 0, onClose, caption }: Props) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, urls.length - 1)))
  const [imgLoading, setImgLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const current = urls[idx]
  const total = urls.length
  const hasMany = total > 1
  const fileName = (() => {
    try {
      const u = new URL(current)
      const last = u.pathname.split("/").pop() || `photo-${idx + 1}.jpg`
      return decodeURIComponent(last)
    } catch { return `photo-${idx + 1}.jpg` }
  })()

  const next = useCallback(() => {
    if (!hasMany) return
    setIdx(i => (i + 1) % total)
    setImgLoading(true)
  }, [hasMany, total])
  const prev = useCallback(() => {
    if (!hasMany) return
    setIdx(i => (i - 1 + total) % total)
    setImgLoading(true)
  }, [hasMany, total])

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [next, prev, onClose])

  // ── Lock body scroll ──
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = original }
  }, [])

  useEffect(() => { setImgLoading(true) }, [idx])

  // ── Mobile swipe ──
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev(); else next()
    }
    touchStart.current = null
  }

  // ── Actions ──
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(current)
      setCopied(true)
      toast.success("คัดลอกลิงก์รูปแล้ว", { duration: 2000 })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("คัดลอกไม่ได้ — เบราว์เซอร์ปฏิเสธ")
    }
  }
  const downloadFile = async () => {
    setDownloading(true)
    try {
      const res = await fetch(current)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("เซฟรูปแล้ว", { duration: 2000 })
    } catch {
      window.open(current, "_blank")
      toast("เปิดในแท็บใหม่แทน", { icon: "💡" })
    } finally { setDownloading(false) }
  }
  const openInNewTab = () => window.open(current, "_blank")

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}>
      {/* ── Blurred backdrop ── */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"/>

      {/* ── Floating close button — อยู่ "นอก" การ์ด ที่มุมขวาบน ── */}
      <button onClick={onClose} title="ปิด (Esc)"
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[70] w-10 h-10 rounded-full bg-white hover:bg-rose-500 text-rose-600 hover:text-white shadow-xl ring-2 ring-white/20 flex items-center justify-center transition-all hover:scale-110">
        <X size={18}/>
      </button>

      {/* ── Centered card ── */}
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl flex flex-col"
        style={{ maxHeight: "85vh" }}>

        {/* Header — เฉพาะตัวอักษร ไม่มีปุ่มมาทับเลย */}
        <div className="border-b border-slate-100 bg-white px-4 py-2.5">
          <p className="text-sm font-black text-slate-800 truncate leading-tight">
            {hasMany
              ? <><span className="text-indigo-600">{idx + 1}</span> <span className="text-slate-400 font-normal">/ {total}</span></>
              : "รูปภาพ"}
            <span className="ml-2 text-[10px] font-normal text-slate-400">{fileName}</span>
          </p>
          {caption && (
            <p className="mt-0.5 text-[10px] text-slate-500 font-bold truncate uppercase tracking-wide leading-tight">
              {caption}
            </p>
          )}
        </div>

        {/* Image area */}
        <div className="relative flex-1 flex items-center justify-center bg-slate-50 min-h-[280px] sm:min-h-[400px] select-none">
          {imgLoading && (
            <Loader2 size={28} className="animate-spin text-slate-400 absolute"/>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={fileName}
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
            className="max-h-full max-w-full object-contain transition-opacity p-3"
            style={{ opacity: imgLoading ? 0.3 : 1 }}/>

          {/* ── Floating action buttons — มุมขวาบนของพื้นที่รูป ── */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <button onClick={copyUrl} title="คัดลอกลิงก์รูป"
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md hover:shadow-lg ring-1 ring-slate-200 flex items-center justify-center transition-all hover:scale-110">
              {copied ? <Check size={15} className="text-emerald-600"/> : <Copy size={15}/>}
            </button>
            <button onClick={downloadFile} disabled={downloading} title="เซฟลงเครื่อง"
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md hover:shadow-lg ring-1 ring-slate-200 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50">
              {downloading ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
            </button>
            <button onClick={openInNewTab} title="เปิดในแท็บใหม่"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md hover:shadow-lg ring-1 ring-slate-200 items-center justify-center transition-all hover:scale-110">
              <ExternalLink size={15}/>
            </button>
          </div>

          {/* Prev / Next arrows */}
          {hasMany && (
            <>
              <button onClick={prev} aria-label="รูปก่อนหน้า"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md hover:shadow-lg text-slate-700 hover:text-indigo-600 flex items-center justify-center transition-all hover:scale-110 ring-1 ring-slate-200">
                <ChevronLeft size={20}/>
              </button>
              <button onClick={next} aria-label="รูปถัดไป"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md hover:shadow-lg text-slate-700 hover:text-indigo-600 flex items-center justify-center transition-all hover:scale-110 ring-1 ring-slate-200">
                <ChevronRight size={20}/>
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {hasMany && (
          <div className="bg-white border-t border-slate-100 px-3 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              {urls.map((u, i) => (
                <button key={i} onClick={() => { setIdx(i); setImgLoading(true) }}
                  className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === idx
                      ? "border-indigo-500 scale-105 shadow-md"
                      : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
                  }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
              <span className="ml-auto pl-2 text-[10px] text-slate-400 font-bold whitespace-nowrap hidden sm:block">
                ← → · Esc
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
