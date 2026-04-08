"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Megaphone, Pin, Clock, Heart, MessageCircle, Eye, ChevronDown, X, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

const REACTIONS = [
  { type: "like",  emoji: "👍", label: "ถูกใจ" },
  { type: "love",  emoji: "❤️", label: "รัก" },
  { type: "laugh", emoji: "😂", label: "ฮ่าๆ" },
  { type: "wow",   emoji: "😮", label: "ว้าว" },
  { type: "sad",   emoji: "😢", label: "เศร้า" },
]

// ── Facebook-style Image Grid ──
function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (idx: number) => void }) {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <div className="relative cursor-pointer" onClick={() => onOpen(0)}>
        <img src={images[0]} alt="" className="w-full max-h-[400px] object-cover" loading="lazy" />
      </div>
    )
  }

  if (images.length === 2) {
    return (
      <div className="flex gap-0.5 h-[280px] cursor-pointer">
        {images.map((url, i) => (
          <div key={i} className="flex-1 overflow-hidden" onClick={() => onOpen(i)}>
            <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }

  if (images.length === 3) {
    return (
      <div className="flex gap-0.5 h-[320px] cursor-pointer">
        <div className="flex-1 overflow-hidden" onClick={() => onOpen(0)}>
          <img src={images[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
        <div className="flex flex-col gap-0.5 w-[40%]">
          {images.slice(1).map((url, i) => (
            <div key={i} className="flex-1 overflow-hidden" onClick={() => onOpen(i + 1)}>
              <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (images.length === 4) {
    return (
      <div className="cursor-pointer">
        <div className="h-[220px] overflow-hidden mb-0.5" onClick={() => onOpen(0)}>
          <img src={images[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
        <div className="flex gap-0.5 h-[120px]">
          {images.slice(1).map((url, i) => (
            <div key={i} className="flex-1 overflow-hidden" onClick={() => onOpen(i + 1)}>
              <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 5+ images: 2 top + 3 bottom (last one has +N overlay)
  return (
    <div className="cursor-pointer">
      <div className="flex gap-0.5 h-[200px] mb-0.5">
        {images.slice(0, 2).map((url, i) => (
          <div key={i} className="flex-1 overflow-hidden" onClick={() => onOpen(i)}>
            <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 h-[120px]">
        {images.slice(2, 5).map((url, i) => (
          <div key={i} className="flex-1 overflow-hidden relative" onClick={() => onOpen(i + 2)}>
            <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
            {i === 2 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-black">+{images.length - 5}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Image Lightbox with Swipe ──
function ImageLightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [saving, setSaving] = useState(false)

  const goPrev = () => setCurrent(c => (c > 0 ? c - 1 : images.length - 1))
  const goNext = () => setCurrent(c => (c < images.length - 1 ? c + 1 : 0))

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") goPrev()
    else if (e.key === "ArrowRight") goNext()
    else if (e.key === "Escape") onClose()
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [handleKeyDown])

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) setTouchDelta(e.touches[0].clientX - touchStart)
  }
  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 60) {
      if (touchDelta > 0) goPrev()
      else goNext()
    }
    setTouchStart(null)
    setTouchDelta(0)
  }

  const saveImage = async () => {
    setSaving(true)
    try {
      const res = await fetch(images[current])
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `announcement-image-${current + 1}.${blob.type.split("/")[1] || "jpg"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // fallback: open in new tab
      window.open(images[current], "_blank")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <X size={20} className="text-white" />
        </button>
        <span className="text-white/80 text-sm font-bold">{current + 1} / {images.length}</span>
        <button onClick={saveImage} disabled={saving}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <Download size={18} className="text-white" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

        {/* Navigation arrows (desktop) */}
        {images.length > 1 && (
          <>
            <button onClick={goPrev}
              className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors hidden sm:flex">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button onClick={goNext}
              className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors hidden sm:flex">
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}

        <img
          key={current}
          src={images[current]}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          style={{ transform: touchDelta !== 0 ? `translateX(${touchDelta}px)` : undefined, transition: touchDelta === 0 ? "transform 0.3s ease" : "none" }}
          draggable={false}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {images.map((url, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === current ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-80"
              }`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Reactor Profiles Modal ──
function ReactorModal({ reactors, onClose }: { reactors: any[]; onClose: () => void }) {
  const [filter, setFilter] = useState<string | null>(null)
  const filtered = filter ? reactors.filter(r => r.type === filter) : reactors

  const typeCounts: Record<string, number> = {}
  for (const r of reactors) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col animate-[slideUp_0.25s_ease]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-black text-slate-800">ความรู้สึกทั้งหมด</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              !filter ? "bg-indigo-500 text-white shadow-md" : "bg-slate-100 text-slate-500"
            }`}>
            ทั้งหมด {reactors.length}
          </button>
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const r = REACTIONS.find(r => r.type === type)
            return (
              <button key={type} onClick={() => setFilter(filter === type ? null : type)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                  filter === type ? "bg-indigo-500 text-white shadow-md" : "bg-slate-100 text-slate-500"
                }`}>
                <span className="text-sm">{r?.emoji}</span> {count}
              </button>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-black overflow-hidden flex-shrink-0 shadow-sm">
                {r.avatar_url
                  ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  : r.name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">{r.name}</p>
              </div>
              <span className="text-lg">{REACTIONS.find(rx => rx.type === r.type)?.emoji}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── Expandable Text ──
function ExpandableText({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const [needsExpand, setNeedsExpand] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (ref.current) {
      const lineH = parseFloat(getComputedStyle(ref.current).lineHeight) || 20
      setNeedsExpand(ref.current.scrollHeight > lineH * maxLines + 2)
    }
  }, [text, maxLines])

  return (
    <div>
      <p ref={ref}
        className={`text-[15px] text-slate-600 whitespace-pre-wrap leading-relaxed ${!expanded && needsExpand ? `line-clamp-${maxLines}` : ""}`}
        style={!expanded && needsExpand ? { display: "-webkit-box", WebkitLineClamp: maxLines, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}}>
        {text}
      </p>
      {needsExpand && (
        <button onClick={() => setExpanded(!expanded)} className="text-indigo-500 text-sm font-bold mt-1 hover:underline">
          {expanded ? "แสดงน้อยลง" : "...อ่านเพิ่มเติม"}
        </button>
      )}
    </div>
  )
}

// ── Comment Section (Facebook-style) ──
function CommentSection({ announcementId }: { announcementId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadComments = useCallback(async () => {
    const r = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list_comments", announcement_id: announcementId }) })
    const d = await r.json()
    setComments(d.comments ?? [])
    setLoaded(true)
  }, [announcementId])

  useEffect(() => { loadComments() }, [loadComments])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_comment", announcement_id: announcementId, body: text.trim(), parent_id: replyTo?.id || null }) })
    const d = await res.json()
    if (d.comment) setComments(p => [...p, d.comment])
    setText(""); setReplyTo(null); setSending(false)
  }

  const deleteComment = async (id: string) => {
    await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_comment", comment_id: id }) })
    setComments(p => p.filter(c => c.id !== id))
  }

  const topLevel = comments.filter(c => !c.parent_id)
  const replies = comments.filter(c => c.parent_id)

  if (!loaded) return <div className="px-4 py-3 text-xs text-slate-400 text-center">กำลังโหลด...</div>

  return (
    <div className="border-t border-slate-100 bg-slate-50/50">
      {topLevel.length > 0 && (
        <div className="px-4 pt-3 pb-1 space-y-3">
          {topLevel.map(c => {
            const emp = c.employee || {}
            const name = emp.nickname || `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim() || "?"
            const childReplies = replies.filter(r => r.parent_id === c.id)
            return (
              <div key={c.id}>
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                    {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl rounded-tl-md px-3 py-2 inline-block max-w-full">
                      <p className="text-[12px] font-bold text-slate-700">{name}</p>
                      <p className="text-[13px] text-slate-600 whitespace-pre-wrap break-words">{c.body}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 px-1">
                      <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(c.created_at), { locale: th, addSuffix: true })}</span>
                      <button onClick={() => setReplyTo({ id: c.id, name })} className="text-[10px] font-bold text-slate-400 hover:text-indigo-500">ตอบกลับ</button>
                      <button onClick={() => deleteComment(c.id)} className="text-[10px] text-slate-300 hover:text-red-400">ลบ</button>
                    </div>
                  </div>
                </div>
                {childReplies.length > 0 && (
                  <div className="ml-10 mt-2 space-y-2">
                    {childReplies.map(r => {
                      const re = r.employee || {}
                      const rn = re.nickname || `${re.first_name_th || ""} ${re.last_name_th || ""}`.trim() || "?"
                      return (
                        <div key={r.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 overflow-hidden">
                            {re.avatar_url ? <img src={re.avatar_url} alt="" className="w-full h-full object-cover" /> : rn[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-2xl rounded-tl-md px-2.5 py-1.5 inline-block max-w-full">
                              <p className="text-[11px] font-bold text-slate-600">{rn}</p>
                              <p className="text-[12px] text-slate-600 whitespace-pre-wrap break-words">{r.body}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 px-1">
                              <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(r.created_at), { locale: th, addSuffix: true })}</span>
                              <button onClick={() => deleteComment(r.id)} className="text-[10px] text-slate-300 hover:text-red-400">ลบ</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 py-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[10px] text-slate-400">ตอบกลับ <strong>{replyTo.name}</strong></span>
            <button onClick={() => setReplyTo(null)} className="text-[10px] text-slate-400 hover:text-red-400">ยกเลิก</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={replyTo ? `ตอบกลับ ${replyTo.name}...` : "เขียนคอมเมนต์..."}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          <button onClick={send} disabled={!text.trim() || sending}
            className="h-9 w-9 flex-shrink-0 rounded-full bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper: get images array from announcement ──
function getImages(a: any): string[] {
  if (a.image_urls && a.image_urls.length > 0) return a.image_urls
  if (a.image_url) return [a.image_url]
  return []
}

// ── Main Page ──
export default function UserAnnouncementsPage() {
  const [anns, setAnns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<string | null>(null)
  const [reactorModal, setReactorModal] = useState<any[] | null>(null)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/announcements")
    const d = await r.json()
    setAnns(d.announcements ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = async (id: string) => {
    await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read", announcement_id: id }) })
    setAnns(p => p.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  const react = async (annId: string, type: string) => {
    setPicker(null)
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "react", announcement_id: annId, reaction_type: type }) })
    const d = await res.json()
    if (!d.success) return
    setAnns(p => p.map(a => {
      if (a.id !== annId) return a
      const rc = { ...a.reactions, counts: { ...a.reactions.counts }, reactors: [...(a.reactions.reactors || [])] }
      if (d.action === "removed") {
        if (rc.counts[type]) rc.counts[type]--
        if (rc.counts[type] <= 0) delete rc.counts[type]
        rc.total = Math.max(0, rc.total - 1)
        rc.reactors = rc.reactors.filter((r: any) => !(r.type === type && r.name === "คุณ"))
        rc.my = null
      } else if (d.action === "added") {
        rc.counts[type] = (rc.counts[type] || 0) + 1
        rc.total++
        rc.reactors.push({ type, name: "คุณ", avatar_url: null })
        rc.my = type
      } else {
        if (rc.my && rc.counts[rc.my]) { rc.counts[rc.my]--; if (rc.counts[rc.my] <= 0) delete rc.counts[rc.my] }
        rc.counts[type] = (rc.counts[type] || 0) + 1
        rc.reactors = rc.reactors.filter((r: any) => r.name !== "คุณ")
        rc.reactors.push({ type, name: "คุณ", avatar_url: null })
        rc.my = type
      }
      return { ...a, reactions: rc }
    }))
  }

  const timeAgo = (d: string) => {
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: th })
    } catch {
      try { return format(new Date(d), "d MMM yy HH:mm", { locale: th }) }
      catch { return d }
    }
  }

  const unread = anns.filter(a => !a.is_read).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <Megaphone size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800">ประกาศ</h1>
            {unread > 0 && <p className="text-[11px] text-indigo-500 font-bold -mt-0.5">{unread} ข่าวใหม่</p>}
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-400 font-medium">กำลังโหลด...</p>
        </div>
      ) : anns.length === 0 ? (
        <div className="text-center py-20 px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Megaphone size={32} className="text-indigo-300" />
          </div>
          <p className="text-lg font-bold text-slate-400">ยังไม่มีประกาศ</p>
          <p className="text-sm text-slate-300 mt-1">ประกาศใหม่จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="pb-24">
          {anns.map((a, idx) => {
            const rc = a.reactions || { counts: {}, total: 0, my: null, reactors: [] }
            const myR = REACTIONS.find(r => r.type === rc.my)
            const isUrgent = a.priority === "urgent"
            const isHigh = a.priority === "high"
            const topEmojis = Object.entries(rc.counts as Record<string, number>)
              .sort((a, b) => b[1] - a[1]).slice(0, 3)
            const reactorAvatars = (rc.reactors || []).slice(0, 5)
            const images = getImages(a)

            return (
              <div key={a.id}
                onClick={() => { if (!a.is_read) markRead(a.id) }}
                className={`bg-white ${idx > 0 ? "mt-2" : ""} ${!a.is_read ? "border-l-[3px] border-l-indigo-500" : ""}`}>

                {/* Priority banner */}
                {isUrgent && (
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-[11px] font-black text-white tracking-wide">ประกาศด่วน</span>
                  </div>
                )}
                {isHigh && !isUrgent && (
                  <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1.5">
                    <span className="text-[11px] font-black text-white tracking-wide">ประกาศสำคัญ</span>
                  </div>
                )}

                {/* Author header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-black overflow-hidden flex-shrink-0 ring-2 ring-white shadow-md">
                    {a.creator?.avatar_url
                      ? <img src={a.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      : a.creator?.first_name_th?.[0] || "H"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-800 truncate">
                        {a.creator ? `${a.creator.first_name_th} ${a.creator.last_name_th}` : "HR"}
                      </p>
                      {a.is_pinned && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded-full">
                          <Pin size={8} /> ปักหมุด
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(a.published_at)}</p>
                  </div>
                  {!a.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200 flex-shrink-0" />
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <h3 className="font-black text-[16px] text-slate-800 leading-snug mb-1">{a.title}</h3>
                  {a.body && <ExpandableText text={a.body} />}
                </div>

                {/* Image Grid (Facebook-style) */}
                {images.length > 0 && (
                  <ImageGrid
                    images={images}
                    onOpen={(idx) => { setLightbox({ images, index: idx }) }}
                  />
                )}

                {/* Reaction summary bar */}
                {rc.total > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <button onClick={e => { e.stopPropagation(); setReactorModal(rc.reactors || []) }}
                      className="flex items-center gap-2 group">
                      <div className="flex -space-x-0.5">
                        {topEmojis.map(([t]) => (
                          <span key={t} className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs">
                            {REACTIONS.find(r => r.type === t)?.emoji}
                          </span>
                        ))}
                      </div>
                      {reactorAvatars.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {reactorAvatars.map((r: any, i: number) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white overflow-hidden flex items-center justify-center text-[8px] font-bold text-slate-500">
                              {r.avatar_url
                                ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                                : r.name?.[0] || "?"}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
                        {rc.total} คน
                      </span>
                    </button>
                    <span className="text-[10px] text-slate-300 flex items-center gap-1">
                      <Eye size={10} /> {a.is_read ? "อ่านแล้ว" : "ใหม่"}
                    </span>
                  </div>
                )}

                {/* Action bar */}
                <div className="px-4 py-1 border-t border-slate-100 flex items-center relative">
                  <button onClick={e => { e.stopPropagation(); setPicker(picker === a.id ? null : a.id) }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      rc.my ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    }`}>
                    {myR ? <span className="text-lg">{myR.emoji}</span> : <Heart size={18} />}
                    <span>{myR ? myR.label : "ถูกใจ"}</span>
                  </button>

                  <button onClick={e => { e.stopPropagation(); setOpenComments(prev => { const n = new Set(Array.from(prev)); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n }) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-all active:scale-95">
                    <MessageCircle size={18} />
                    <span>{a.comment_count > 0 ? `${a.comment_count}` : "คอมเมนต์"}</span>
                  </button>

                  {/* Reaction picker */}
                  {picker === a.id && (
                    <div className="absolute bottom-14 left-4 bg-white rounded-full shadow-2xl border border-slate-200 px-2 py-1.5 flex gap-0.5 z-10"
                      style={{ animation: "scaleIn .2s cubic-bezier(.34,1.56,.64,1)" }}>
                      {REACTIONS.map(r => (
                        <button key={r.type} onClick={e => { e.stopPropagation(); react(a.id, r.type) }}
                          className={`w-12 h-12 flex flex-col items-center justify-center rounded-full text-2xl transition-all hover:scale-125 hover:-translate-y-1 ${
                            rc.my === r.type ? "bg-indigo-50 scale-110" : "hover:bg-slate-50"
                          }`}
                          title={r.label}>
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment section */}
                {openComments.has(a.id) && <CommentSection announcementId={a.id} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Overlay to close picker */}
      {picker && <div className="fixed inset-0 z-[5]" onClick={() => setPicker(null)} />}

      {/* Reactor modal */}
      {reactorModal && <ReactorModal reactors={reactorModal} onClose={() => setReactorModal(null)} />}

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <style jsx global>{`
        @keyframes scaleIn {
          from { transform: translateX(-50%) scale(0.5); opacity: 0; }
          to { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
