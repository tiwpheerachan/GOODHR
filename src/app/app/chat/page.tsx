"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Send, ImagePlus, X, MessageCircle, ChevronDown, Check, CheckCheck, Smile, Paperclip, Download, Plus, Camera, File } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"

const QUICK_EMOJIS = ["👍","❤️","😊","👏","🙏","✅","🎉","😄","😢","🔥"]
const QUICK_SUGGESTIONS = [
  { label: "สอบถามเรื่องลา", icon: "📋" },
  { label: "เงินเดือน/สลิป", icon: "💰" },
  { label: "แจ้งปัญหา", icon: "🔧" },
  { label: "ขอเอกสาร", icon: "📄" },
]

function isImageUrl(url: string): boolean {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  return ["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)
}
function getFileIcon(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return "📕"
  if (["doc","docx"].includes(ext)) return "📘"
  if (["xls","xlsx","csv"].includes(ext)) return "📗"
  if (["ppt","pptx"].includes(ext)) return "📙"
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "📦"
  if (["mp3","wav","ogg","m4a"].includes(ext)) return "🎵"
  if (["mp4","mov","avi","mkv"].includes(ext)) return "🎬"
  return "📎"
}
function getFileName(url: string): string {
  try {
    const parts = url.split("?")[0].split("/")
    const name = parts[parts.length - 1] || "file"
    return decodeURIComponent(name.replace(/^\d+_[a-z0-9]+_/, ""))
  } catch { return "file" }
}

export default function UserChatPage() {
  const [conv, setConv] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [imgModal, setImgModal] = useState<string | null>(null)
  const [showScroll, setShowScroll] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 50)
  }, [])

  // ── Data loading ──
  const load = useCallback(async (initial = false) => {
    try {
      const r = await fetch("/api/chat")
      const d = await r.json()
      if (d.conversation) setConv(d.conversation)
      const newMsgs = d.messages ?? []
      if (initial || msgsRef.current.length === 0) {
        msgsRef.current = newMsgs
        setMsgs(newMsgs)
        scrollToBottom(false)
      } else {
        const existingIds = new Set(msgsRef.current.map((m: any) => m.id))
        const added = newMsgs.filter((m: any) => !existingIds.has(m.id))
        let changed = false
        const updated = msgsRef.current.map((m: any) => {
          const fresh = newMsgs.find((n: any) => n.id === m.id)
          if (fresh && fresh.is_read !== m.is_read) { changed = true; return { ...m, is_read: fresh.is_read } }
          return m
        })
        if (added.length > 0 || changed) {
          const merged = [...updated, ...added]
          msgsRef.current = merged
          setMsgs(merged)
          if (added.length > 0) scrollToBottom(true)
        }
      }
    } catch { }
    setLoading(false)
  }, [scrollToBottom])

  useEffect(() => { load(true) }, [load])
  useEffect(() => {
    const iv = setInterval(() => { if (document.visibilityState === "visible") load(false) }, 5000)
    return () => clearInterval(iv)
  }, [load])

  // ── Upload handlers ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true); setShowAttach(false)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.urls) setImages((prev: any) => [...prev, ...d.urls])
    } catch { }
    setUploading(false); if (fileRef.current) fileRef.current.value = ""
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true); setShowAttach(false)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.files) {
        const ni: string[] = []; const nf: Array<{ url: string; name: string; size: number; type: string }> = []
        for (const f of d.files) { f.type?.startsWith("image/") ? ni.push(f.url) : nf.push(f) }
        if (ni.length) setImages((p: any) => [...p, ...ni])
        if (nf.length) setAttachments((p: any) => [...p, ...nf])
      }
    } catch { }
    setUploading(false); if (docRef.current) docRef.current.value = ""
  }

  // ── Send ──
  const sendMessage = async (msgText?: string) => {
    const finalText = msgText ?? text.trim()
    if (!finalText && images.length === 0 && attachments.length === 0) return
    if (!conv) return
    setSending(true); setShowEmoji(false); setShowAttach(false)
    try {
      const allMedia = [...images, ...attachments.map((a: any) => a.url)]
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversation_id: conv.id, message: finalText || null, images: allMedia }),
      })
      const d = await r.json()
      if (d.success && d.message) {
        const merged = [...msgsRef.current, d.message]
        msgsRef.current = merged; setMsgs(merged)
        setText(""); setImages([]); setAttachments([]); scrollToBottom(true)
      }
    } catch { }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }
  const handleScroll = () => {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    setShowScroll(scrollHeight - scrollTop - clientHeight > 200)
  }

  // ── Formatters ──
  const fmtTime = (d: string) => { try { return format(new Date(d), "HH:mm", { locale: th }) } catch { return "" } }
  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d)
      if (isToday(dt)) return "วันนี้"
      if (isYesterday(dt)) return "เมื่อวาน"
      return format(dt, "d MMM yyyy", { locale: th })
    } catch { return "" }
  }

  const grouped = useMemo(() => {
    const g: { date: string; msgs: any[] }[] = []; let ld = ""
    for (const m of msgs) {
      const d = m.created_at?.slice(0, 10) || ""
      if (d !== ld) { g.push({ date: d, msgs: [] }); ld = d }
      g[g.length - 1].msgs.push(m)
    }
    return g
  }, [msgs])

  const hasContent = text.trim() || images.length > 0 || attachments.length > 0

  // ── File card ──
  const FileCard = ({ url, isMe }: { url: string; isMe: boolean }) => (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all hover:opacity-80 ${
        isMe ? "bg-white/25" : "bg-gray-50 border border-gray-100"
      }`} style={{ maxWidth: 220 }}>
      <span className="text-xl flex-shrink-0">{getFileIcon(url)}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-bold truncate ${isMe ? "text-white" : "text-gray-700"}`}>{getFileName(url)}</p>
        <p className={`text-[9px] ${isMe ? "text-white/60" : "text-gray-400"}`}>แตะเพื่อเปิด</p>
      </div>
      <Download size={12} className={isMe ? "text-white/50" : "text-gray-300"} />
    </a>
  )

  /* ================================================================
     LAYOUT: fixed between app-header(52px) and bottom-nav(72px)
     This ensures input bar is ALWAYS visible and never scrolls away
     ================================================================ */
  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30"
        style={{ top: 52, bottom: 72 }}>
        <div className="flex flex-col h-full bg-[#7494C0]">

          {/* ═══ CHAT HEADER ═══ */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[14px] font-extrabold text-gray-800">แชทกับ HR</h1>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                <span className="text-[10px] text-green-600 font-semibold">ออนไลน์</span>
              </div>
            </div>
          </div>

          {/* ═══ MESSAGES AREA (only this scrolls) ═══ */}
          <div ref={chatRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto overscroll-contain relative">
            <div className="px-3 py-3 min-h-full">

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="w-8 h-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                  <p className="text-xs text-white/60">กำลังโหลด...</p>
                </div>
              ) : (
                <>
                  {/* Welcome */}
                  {msgs.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircle size={28} className="text-white/70" />
                      </div>
                      <p className="text-base font-bold text-white">สวัสดีครับ/ค่ะ!</p>
                      <p className="text-[12px] text-white/60 mt-1">มีอะไรให้ช่วยเหลือ สอบถามได้เลย</p>
                    </div>
                  )}

                  {/* Quick start */}
                  {msgs.length < 3 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mb-3 px-1">
                      {QUICK_SUGGESTIONS.map((s: any) => (
                        <button key={s.label} onClick={() => sendMessage(s.label)} disabled={sending}
                          className="px-3 py-1.5 bg-white/90 rounded-full text-[11px] font-bold text-green-600 active:scale-95 transition-transform shadow-sm flex items-center gap-1">
                          <span>{s.icon}</span><span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Messages */}
                  {grouped.map((g: any) => (
                    <div key={g.date}>
                      {/* Date pill */}
                      <div className="flex justify-center my-2.5">
                        <span className="px-3 py-0.5 bg-black/20 text-white/90 text-[10px] font-medium rounded-full">
                          {fmtDate(g.date)}
                        </span>
                      </div>

                      {g.msgs.map((m: any, mi: number) => {
                        const isMe = m.sender_role === "user"
                        const showAvatar = !isMe && (mi === 0 || g.msgs[mi - 1]?.sender_role === "user")
                        const senderName = m.sender ? (m.sender.nickname || m.sender.first_name_th) : "HR"
                        const allMedia = m.images || []
                        const imgUrls = allMedia.filter((u: string) => isImageUrl(u))
                        const fileUrls = allMedia.filter((u: string) => !isImageUrl(u))
                        const isConsecutive = mi > 0 && g.msgs[mi - 1]?.sender_role === m.sender_role

                        return (
                          <div key={m.id} className={`flex gap-1.5 ${isConsecutive ? "mt-0.5" : "mt-2"} ${isMe ? "justify-end" : "justify-start"}`}>
                            {/* Avatar */}
                            {!isMe && (
                              <div className="w-8 flex-shrink-0 mt-auto">
                                {showAvatar ? (
                                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {m.sender?.avatar_url
                                      ? <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                      : <span className="text-[9px] font-black text-green-600">HR</span>}
                                  </div>
                                ) : <div className="w-8" />}
                              </div>
                            )}

                            <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              {!isMe && showAvatar && (
                                <span className="text-[10px] text-white/60 font-medium ml-1 mb-0.5">{senderName}</span>
                              )}

                              {/* Images */}
                              {imgUrls.length > 0 && (
                                <div className={`grid gap-1 mb-0.5 ${imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`} style={{ maxWidth: 230 }}>
                                  {imgUrls.map((url: string, ii: number) => (
                                    <img key={ii} src={url} alt="" onClick={() => setImgModal(url)}
                                      className={`rounded-2xl object-cover cursor-pointer shadow ${
                                        imgUrls.length === 1 ? "max-h-[200px] w-full" : "h-[100px] w-full"
                                      }`} />
                                  ))}
                                </div>
                              )}

                              {/* Files */}
                              {fileUrls.length > 0 && (
                                <div className="space-y-0.5 mb-0.5">
                                  {fileUrls.map((url: string, fi: number) => <FileCard key={fi} url={url} isMe={isMe} />)}
                                </div>
                              )}

                              {/* Text + time row */}
                              {m.message && (
                                <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                  <div className={`px-3 py-2 text-[13px] leading-[1.5] whitespace-pre-wrap break-words ${
                                    isMe
                                      ? "bg-[#06C755] text-white rounded-[18px] rounded-br-[5px]"
                                      : "bg-white text-gray-800 rounded-[18px] rounded-bl-[5px] shadow-sm"
                                  }`}>{m.message}</div>
                                  {!isConsecutive && (
                                    <div className="flex-shrink-0 flex flex-col items-end gap-0 pb-0.5">
                                      {isMe && (
                                        <span className="text-[8px] text-white/50 leading-none">
                                          {m.is_read ? "อ่านแล้ว" : ""}
                                        </span>
                                      )}
                                      <span className="text-[9px] text-white/40 leading-none">{fmtTime(m.created_at)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Time for media-only */}
                              {!m.message && !isConsecutive && (
                                <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                                  {isMe && m.is_read && <span className="text-[8px] text-white/50">อ่านแล้ว</span>}
                                  <span className="text-[9px] text-white/40">{fmtTime(m.created_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* Scroll FAB */}
            {showScroll && (
              <button onClick={() => scrollToBottom()}
                className="sticky bottom-2 left-[calc(100%-44px)] w-8 h-8 bg-white/80 rounded-full shadow flex items-center justify-center z-10 active:scale-90">
                <ChevronDown size={16} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* ═══ BOTTOM SECTION — ALWAYS FIXED, NEVER SCROLLS ═══ */}
          <div className="flex-shrink-0 bg-white">

            {/* Emoji row */}
            {showEmoji && (
              <div className="border-t border-gray-100 px-2 py-1.5 flex gap-0.5 overflow-x-auto no-scrollbar">
                {QUICK_EMOJIS.map((e: string) => (
                  <button key={e} onClick={() => sendMessage(e)}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-lg active:scale-90 flex-shrink-0">
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Attach menu */}
            {showAttach && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex gap-5 justify-center">
                <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-95">
                  <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center shadow"><ImagePlus size={18} className="text-white" /></div>
                  <span className="text-[9px] font-bold text-gray-500">รูปภาพ</span>
                </button>
                <button onClick={() => docRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-95">
                  <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center shadow"><File size={18} className="text-white" /></div>
                  <span className="text-[9px] font-bold text-gray-500">ไฟล์</span>
                </button>
              </div>
            )}

            {/* Previews */}
            {(images.length > 0 || attachments.length > 0) && (
              <div className="border-t border-gray-100 px-3 py-1.5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {images.map((url: string, i: number) => (
                    <div key={`i${i}`} className="relative flex-shrink-0">
                      <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      <button onClick={() => setImages((p: any) => p.filter((_: any, j: number) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={8} /></button>
                    </div>
                  ))}
                  {attachments.map((f: any, i: number) => (
                    <div key={`f${i}`} className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                        <span className="text-base">{getFileIcon(f.name || f.url)}</span>
                        <span className="text-[6px] text-gray-400 font-bold">{f.name?.split(".").pop()?.toUpperCase()}</span>
                      </div>
                      <button onClick={() => setAttachments((p: any) => p.filter((_: any, j: number) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={8} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload indicator */}
            {uploading && (
              <div className="px-4 py-1.5 flex items-center gap-2 bg-green-50 border-t border-gray-100">
                <div className="w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                <span className="text-[11px] text-green-600 font-semibold">กำลังอัปโหลด...</span>
              </div>
            )}

            {/* ── INPUT ROW ── */}
            <div className="border-t border-gray-100 px-2 py-1.5 flex items-end gap-1">
              {/* + */}
              <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false) }}
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  showAttach ? "bg-gray-300 rotate-45" : "bg-gray-100"
                }`}>
                <Plus size={18} className="text-gray-500" />
              </button>

              {/* Text */}
              <div className="flex-1 bg-gray-100 rounded-[20px] px-3 py-1.5 flex items-end min-h-[36px] max-h-[88px]">
                <textarea
                  value={text}
                  onChange={(e: any) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { setShowEmoji(false); setShowAttach(false) }}
                  placeholder="Aa"
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 resize-none outline-none max-h-[64px]"
                  style={{ lineHeight: "1.4" }}
                />
              </div>

              {/* Emoji */}
              <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false) }}
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center active:scale-90 ${
                  showEmoji ? "text-green-500" : "text-gray-400"
                }`}>
                <Smile size={20} />
              </button>

              {/* Send */}
              {hasContent ? (
                <button onClick={() => sendMessage()} disabled={sending}
                  className="w-8 h-8 flex-shrink-0 rounded-full bg-[#06C755] flex items-center justify-center shadow active:scale-90">
                  {sending
                    ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send size={14} className="text-white ml-0.5" />}
                </button>
              ) : (
                <div className="w-8 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z,.mp3,.mp4,.mov" multiple className="hidden" onChange={handleFileUpload} />

      {/* Lightbox */}
      {imgModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
            onClick={() => setImgModal(null)}><X size={20} className="text-white" /></button>
          <img src={imgModal} alt="" className="max-w-[95%] max-h-[85vh] object-contain" onClick={(e: any) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}
