"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Send, ImagePlus, X, MessageCircle, ChevronDown, Check, CheckCheck, Smile, Paperclip, Download } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"

const QUICK_EMOJIS = ["👍","❤️","😊","👏","🙏","✅","🎉","😄"]

const QUICK_SUGGESTIONS = [
  { label: "สอบถามเรื่องลา", icon: "📋" },
  { label: "เงินเดือน/สลิป", icon: "💰" },
  { label: "แจ้งปัญหา", icon: "🔧" },
  { label: "ขอเอกสาร", icon: "📄" },
]

// Detect if a URL is an image
function isImageUrl(url: string): boolean {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  return ["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)
}

// Detect if a URL looks like a file (non-image)
function isFileUrl(url: string): boolean {
  return !isImageUrl(url)
}

// Get file icon based on extension
function getFileIcon(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return "📕"
  if (["doc","docx"].includes(ext)) return "📘"
  if (["xls","xlsx","csv"].includes(ext)) return "📗"
  if (["ppt","pptx"].includes(ext)) return "📙"
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "📦"
  if (["mp3","wav","ogg","m4a"].includes(ext)) return "🎵"
  if (["mp4","mov","avi","mkv"].includes(ext)) return "🎬"
  if (["txt","rtf"].includes(ext)) return "📝"
  return "📎"
}

// Extract filename from URL
function getFileName(url: string): string {
  try {
    const path = url.split("?")[0]
    const parts = path.split("/")
    const name = parts[parts.length - 1] || "file"
    // Remove the timestamp/random prefix we add during upload (e.g., "1234567890_abc123_")
    const cleaned = name.replace(/^\d+_[a-z0-9]+_/, "")
    return decodeURIComponent(cleaned)
  } catch { return "file" }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 30)
  }, [])

  // ── Smart load (merge only new messages) ──
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

  // Poll every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [load])

  // Upload images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.urls) setImages((prev: any) => [...prev, ...d.urls])
    } catch { }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  // Upload files (documents)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.files) {
        // Separate images from files
        const newImages: string[] = []
        const newFiles: Array<{ url: string; name: string; size: number; type: string }> = []
        for (const f of d.files) {
          if (f.type?.startsWith("image/")) {
            newImages.push(f.url)
          } else {
            newFiles.push(f)
          }
        }
        if (newImages.length) setImages((prev: any) => [...prev, ...newImages])
        if (newFiles.length) setAttachments((prev: any) => [...prev, ...newFiles])
      }
    } catch { }
    setUploading(false)
    if (docRef.current) docRef.current.value = ""
  }

  const sendMessage = async (msgText?: string) => {
    const finalText = msgText ?? text.trim()
    if (!finalText && images.length === 0 && attachments.length === 0) return
    if (!conv) return
    setSending(true)
    setShowEmoji(false)
    try {
      // Combine image URLs and file URLs into the images array
      const allMedia = [
        ...images,
        ...attachments.map((a: any) => a.url),
      ]
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversation_id: conv.id, message: finalText || null, images: allMedia }),
      })
      const d = await r.json()
      if (d.success && d.message) {
        const merged = [...msgsRef.current, d.message]
        msgsRef.current = merged
        setMsgs(merged)
        setText("")
        setImages([])
        setAttachments([])
        scrollToBottom(true)
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

  const fmtTime = (d: string) => {
    try { return format(new Date(d), "HH:mm", { locale: th }) } catch { return "" }
  }
  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d)
      if (isToday(dt)) return "วันนี้"
      if (isYesterday(dt)) return "เมื่อวาน"
      return format(dt, "d MMMM yyyy", { locale: th })
    } catch { return "" }
  }

  // Group messages by date
  const grouped = useMemo(() => {
    const g: { date: string; msgs: any[] }[] = []
    let ld = ""
    for (const m of msgs) {
      const d = m.created_at?.slice(0, 10) || ""
      if (d !== ld) { g.push({ date: d, msgs: [] }); ld = d }
      g[g.length - 1].msgs.push(m)
    }
    return g
  }, [msgs])

  // Render file attachment card in chat bubble
  const FileCard = ({ url, isMe }: { url: string; isMe: boolean }) => {
    const name = getFileName(url)
    const icon = getFileIcon(url)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 transition-all hover:opacity-80 ${
          isMe
            ? "bg-white/20 border border-white/30"
            : "bg-slate-50 border border-slate-200"
        }`}>
        <div className="text-2xl flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isMe ? "text-white" : "text-slate-700"}`}>{name}</p>
          <p className={`text-[10px] ${isMe ? "text-white/70" : "text-slate-400"}`}>แตะเพื่อเปิด</p>
        </div>
        <Download size={14} className={`flex-shrink-0 ${isMe ? "text-white/70" : "text-slate-400"}`} />
      </a>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-blue-50/30 via-white to-slate-50/50">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm safe-top flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-black text-slate-800">แชทกับ HR</h1>
            <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1.5 -mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              พร้อมให้บริการ
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div ref={chatRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: (images.length > 0 || attachments.length > 0 ? 88 : 0) + (showEmoji ? 56 : 0) + 8 }}>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-400 font-medium">กำลังโหลด...</p>
          </div>
        ) : (
          <>
            {/* ── Welcome + Quick Start (always show if no messages or few messages) ── */}
            {msgs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner">
                  <MessageCircle size={36} className="text-indigo-300" />
                </div>
                <p className="text-lg font-black text-slate-500">สวัสดีครับ/ค่ะ!</p>
                <p className="text-sm text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
                  มีอะไรให้ช่วยเหลือ สอบถามได้เลย ส่งข้อความ รูปภาพ หรือไฟล์ได้ตลอด
                </p>
              </div>
            )}

            {/* Quick Start Suggestions — show if less than 3 messages */}
            {msgs.length < 3 && (
              <div className={`flex flex-wrap justify-center gap-2 ${msgs.length === 0 ? "mt-2 mb-4" : "my-4"} px-2`}>
                {QUICK_SUGGESTIONS.map((s: any) => (
                  <button key={s.label}
                    onClick={() => sendMessage(s.label)}
                    disabled={sending}
                    className="px-3.5 py-2.5 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-indigo-500 hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 shadow-sm flex items-center gap-1.5">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="space-y-1">
              {grouped.map((g: any, gi: number) => (
                <div key={g.date}>
                  {/* Date divider */}
                  <div className="flex items-center justify-center my-4">
                    <div className="h-px bg-slate-200/70 flex-1" />
                    <span className="px-3 py-1 bg-white text-slate-400 text-[11px] font-bold rounded-full border border-slate-100 shadow-sm mx-3">
                      {fmtDate(g.date)}
                    </span>
                    <div className="h-px bg-slate-200/70 flex-1" />
                  </div>

                  {/* Messages */}
                  {g.msgs.map((m: any, mi: number) => {
                    const isMe = m.sender_role === "user"
                    const showAvatar = !isMe && (mi === 0 || g.msgs[mi - 1]?.sender_role === "user")
                    const senderName = m.sender ? (m.sender.nickname || `${m.sender.first_name_th}`) : "HR"
                    const allMedia = m.images || []
                    const imgUrls = allMedia.filter((u: string) => isImageUrl(u))
                    const fileUrls = allMedia.filter((u: string) => isFileUrl(u))
                    const isConsecutive = mi > 0 && g.msgs[mi - 1]?.sender_role === m.sender_role

                    return (
                      <div key={m.id} className={`flex gap-2 ${isConsecutive ? "mt-0.5" : "mt-3"} ${isMe ? "justify-end" : "justify-start"}`}>
                        {/* HR Avatar */}
                        {!isMe && (
                          <div className="w-9 h-9 flex-shrink-0 mt-auto">
                            {showAvatar ? (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black overflow-hidden shadow-md ring-2 ring-white">
                                {m.sender?.avatar_url
                                  ? <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : "HR"}
                              </div>
                            ) : <div className="w-9" />}
                          </div>
                        )}

                        <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          {/* HR name label */}
                          {!isMe && showAvatar && (
                            <span className="text-[10px] text-indigo-400 font-bold ml-1 mb-0.5">{senderName}</span>
                          )}

                          {/* Images */}
                          {imgUrls.length > 0 && (
                            <div className={`grid gap-1.5 mb-1 ${imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"} max-w-[260px]`}>
                              {imgUrls.map((url: string, ii: number) => (
                                <img key={ii} src={url} alt="" onClick={() => setImgModal(url)}
                                  className={`rounded-2xl object-cover cursor-pointer shadow-md hover:opacity-90 transition-opacity border-2 border-white ${
                                    imgUrls.length === 1 ? "max-h-[240px] w-full" : "h-[120px] w-full"
                                  }`} />
                              ))}
                            </div>
                          )}

                          {/* File attachments */}
                          {fileUrls.length > 0 && (
                            <div className="w-full max-w-[260px] space-y-1 mb-1">
                              {fileUrls.map((url: string, fi: number) => (
                                <FileCard key={fi} url={url} isMe={isMe} />
                              ))}
                            </div>
                          )}

                          {/* Text bubble */}
                          {m.message && (
                            <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                              isMe
                                ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-200/40"
                                : "bg-white text-slate-700 rounded-2xl rounded-bl-md shadow-sm border border-slate-100"
                            }`}>
                              {m.message}
                            </div>
                          )}

                          {/* Time + read status */}
                          {!isConsecutive && (
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? "mr-1" : "ml-1"}`}>
                              <span className="text-[10px] text-slate-300">{fmtTime(m.created_at)}</span>
                              {isMe && (
                                m.is_read
                                  ? <CheckCheck size={12} className="text-blue-400" />
                                  : <Check size={12} className="text-slate-300" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Scroll to bottom ── */}
      {showScroll && (
        <button onClick={() => scrollToBottom()}
          className="absolute bottom-32 right-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center z-20 hover:shadow-xl transition-shadow">
          <ChevronDown size={18} className="text-slate-500" />
        </button>
      )}

      {/* ── Quick emoji bar ── */}
      {showEmoji && (
        <div className="bg-white border-t border-slate-100 px-3 py-2 flex gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
          {QUICK_EMOJIS.map((e: string) => (
            <button key={e} onClick={() => sendMessage(e)}
              className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 flex-shrink-0">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── Attachment preview bar (images + files) ── */}
      {(images.length > 0 || attachments.length > 0) && (
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-2.5 flex-shrink-0">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {/* Image previews */}
            {images.map((url: string, i: number) => (
              <div key={`img-${i}`} className="relative flex-shrink-0 group">
                <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-200 shadow-sm" />
                <button onClick={() => setImages((p: any) => p.filter((_: any, j: number) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <X size={10} />
                </button>
              </div>
            ))}
            {/* File previews */}
            {attachments.map((f: any, i: number) => (
              <div key={`file-${i}`} className="relative flex-shrink-0 group">
                <div className="w-16 h-16 rounded-xl bg-indigo-50 border-2 border-indigo-200 shadow-sm flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl">{getFileIcon(f.name || f.url)}</span>
                  <span className="text-[8px] text-slate-500 font-bold truncate max-w-[52px] px-0.5">{f.name?.split(".").pop()?.toUpperCase()}</span>
                </div>
                <button onClick={() => setAttachments((p: any) => p.filter((_: any, j: number) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-3 py-2.5 safe-bottom flex-shrink-0">
        <div className="flex items-end gap-1.5">
          {/* Emoji toggle */}
          <button onClick={() => setShowEmoji(!showEmoji)}
            className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              showEmoji ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 hover:text-slate-600"
            }`}>
            <Smile size={18} />
          </button>

          {/* Image upload */}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all active:scale-95">
            {uploading
              ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              : <ImagePlus size={18} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

          {/* File upload */}
          <button onClick={() => docRef.current?.click()} disabled={uploading}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all active:scale-95">
            <Paperclip size={18} />
          </button>
          <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z,.mp3,.mp4,.mov" multiple className="hidden" onChange={handleFileUpload} />

          {/* Text input */}
          <div className="flex-1 bg-slate-100 rounded-2xl px-3.5 py-2.5 flex items-end min-h-[42px] max-h-[120px]">
            <textarea
              value={text}
              onChange={(e: any) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์ข้อความ..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none max-h-[80px]"
              style={{ lineHeight: "1.4" }}
            />
          </div>

          {/* Send button */}
          <button onClick={() => sendMessage()}
            disabled={sending || (!text.trim() && images.length === 0 && attachments.length === 0)}
            className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              text.trim() || images.length > 0 || attachments.length > 0
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/50"
                : "bg-slate-100 text-slate-300"
            }`}>
            {sending
              ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* ── Image lightbox ── */}
      {imgModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors z-10"
            onClick={() => setImgModal(null)}>
            <X size={20} className="text-white" />
          </button>
          <img src={imgModal} alt="" className="max-w-[95%] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={(e: any) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
