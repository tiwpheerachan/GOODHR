"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Megaphone, Pin, Clock, Heart, MessageCircle, Eye, ChevronDown, X } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

const REACTIONS = [
  { type: "like",  emoji: "👍", label: "ถูกใจ" },
  { type: "love",  emoji: "❤️", label: "รัก" },
  { type: "laugh", emoji: "😂", label: "ฮ่าๆ" },
  { type: "wow",   emoji: "😮", label: "ว้าว" },
  { type: "sad",   emoji: "😢", label: "เศร้า" },
]

// ── Reactor Profiles Modal ──
function ReactorModal({ reactors, onClose }: { reactors: any[]; onClose: () => void }) {
  const [filter, setFilter] = useState<string | null>(null)
  const filtered = filter ? reactors.filter(r => r.type === filter) : reactors

  // Group counts
  const typeCounts: Record<string, number> = {}
  for (const r of reactors) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col animate-[slideUp_0.25s_ease]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-black text-slate-800">ความรู้สึกทั้งหมด</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Filter tabs */}
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

        {/* Reactor list */}
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
          {expanded ? "แสดงน้อยลง" : "อ่านเพิ่มเติม..."}
        </button>
      )}
    </div>
  )
}

// ── Main Page ──
export default function UserAnnouncementsPage() {
  const [anns, setAnns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<string | null>(null)
  const [reactorModal, setReactorModal] = useState<any[] | null>(null)
  const [imgModal, setImgModal] = useState<string | null>(null)

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
        // updated
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

                {/* Image */}
                {a.image_url && (
                  <div className="relative cursor-pointer" onClick={e => { e.stopPropagation(); setImgModal(a.image_url) }}>
                    <img src={a.image_url} alt="" className="w-full max-h-[400px] object-cover" />
                  </div>
                )}

                {/* Reaction summary bar */}
                {rc.total > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <button onClick={e => { e.stopPropagation(); setReactorModal(rc.reactors || []) }}
                      className="flex items-center gap-2 group">
                      {/* Emoji stack */}
                      <div className="flex -space-x-0.5">
                        {topEmojis.map(([t]) => (
                          <span key={t} className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs">
                            {REACTIONS.find(r => r.type === t)?.emoji}
                          </span>
                        ))}
                      </div>
                      {/* Avatar stack */}
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
                    <span>{myR ? myR.label : "แสดงความรู้สึก"}</span>
                  </button>

                  {/* Reaction picker */}
                  {picker === a.id && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-2 py-1.5 flex gap-0.5 z-10"
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
              </div>
            )
          })}
        </div>
      )}

      {/* Overlay to close picker */}
      {picker && <div className="fixed inset-0 z-[5]" onClick={() => setPicker(null)} />}

      {/* Reactor modal */}
      {reactorModal && <ReactorModal reactors={reactorModal} onClose={() => setReactorModal(null)} />}

      {/* Image lightbox */}
      {imgModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center z-10" onClick={() => setImgModal(null)}>
            <X size={20} className="text-white" />
          </button>
          <img src={imgModal} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
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
