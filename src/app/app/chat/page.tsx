"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Send, ImagePlus, X, MessageCircle, ChevronDown, Check, CheckCheck, Smile, Paperclip, Download, Plus } from "lucide-react"
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
function isFileUrl(url: string): boolean { return !isImageUrl(url) }
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
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 30)
  }, [])

  // ── Smart load ──
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
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [load])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true); setShowAttachMenu(false)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true); setShowAttachMenu(false)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.files) {
        const newImages: string[] = []
        const newFiles: Array<{ url: string; name: string; size: number; type: string }> = []
        for (const f of d.files) {
          if (f.type?.startsWith("image/")) newImages.push(f.url)
          else newFiles.push(f)
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
    setSending(true); setShowEmoji(false); setShowAttachMenu(false)
    try {
      const allMedia = [...images, ...attachments.map((a: any) => a.url)]
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
        setText(""); setImages([]); setAttachments([])
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

  const fmtTime = (d: string) => { try { return format(new Date(d), "HH:mm", { locale: th }) } catch { return "" } }
  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d)
      if (isToday(dt)) return "วันนี้"
      if (isYesterday(dt)) return "เมื่อวาน"
      return format(dt, "d MMMM yyyy", { locale: th })
    } catch { return "" }
  }

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

  const hasContent = text.trim() || images.length > 0 || attachments.length > 0

  // ── File Card ──
  const FileCard = ({ url, isMe }: { url: string; isMe: boolean }) => (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-1 transition-all hover:opacity-80 max-w-[240px] ${
        isMe ? "bg-white/20 backdrop-blur-sm" : "bg-slate-50 border border-slate-100"
      }`}>
      <span className="text-2xl flex-shrink-0">{getFileIcon(url)}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-bold truncate ${isMe ? "text-white" : "text-slate-700"}`}>{getFileName(url)}</p>
        <p className={`text-[10px] mt-0.5 ${isMe ? "text-white/60" : "text-slate-400"}`}>แตะเพื่อเปิดไฟล์</p>
      </div>
      <Download size={14} className={`flex-shrink-0 ${isMe ? "text-white/50" : "text-slate-300"}`} />
    </a>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#8CABD9] relative overflow-hidden">

      {/* ══════ HEADER — fixed top ══════ */}
      <div className="flex-shrink-0 z-30 bg-gradient-to-r from-[#06C755] to-[#00B341] safe-top shadow-md">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-[15px] font-extrabold text-white tracking-tight">แชทกับ HR</h1>
            <p className="text-[11px] text-white/80 font-medium flex items-center gap-1.5 -mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              พร้อมให้บริการ
            </p>
          </div>
        </div>
      </div>

      {/* ══════ MESSAGES — scrollable middle ══════ */}
      <div ref={chatRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ background: "linear-gradient(180deg, #8CABD9 0%, #7B9ECF 50%, #6B8FC2 100%)" }}>
        <div className="px-3 py-4 min-h-full">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <p className="text-sm text-white/70 font-medium">กำลังโหลด...</p>
            </div>
          ) : (
            <>
              {/* Welcome */}
              {msgs.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle size={32} className="text-white/80" />
                  </div>
                  <p className="text-lg font-extrabold text-white">สวัสดีครับ/ค่ะ!</p>
                  <p className="text-[13px] text-white/70 mt-1 max-w-[250px] mx-auto leading-relaxed">
                    มีอะไรให้ช่วยเหลือ สอบถามได้เลย
                  </p>
                </div>
              )}

              {/* Quick Start */}
              {msgs.length < 3 && (
                <div className={`flex flex-wrap justify-center gap-2 ${msgs.length === 0 ? "mt-1 mb-5" : "my-4"} px-1`}>
                  {QUICK_SUGGESTIONS.map((s: any) => (
                    <button key={s.label} onClick={() => sendMessage(s.label)} disabled={sending}
                      className="px-3.5 py-2 bg-white/90 backdrop-blur-sm rounded-full text-[12px] font-bold text-[#06C755] hover:bg-white transition-all active:scale-95 shadow-sm flex items-center gap-1.5">
                      <span>{s.icon}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="space-y-0.5">
                {grouped.map((g: any) => (
                  <div key={g.date}>
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 bg-black/15 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
                        {fmtDate(g.date)}
                      </span>
                    </div>

                    {g.msgs.map((m: any, mi: number) => {
                      const isMe = m.sender_role === "user"
                      const showAvatar = !isMe && (mi === 0 || g.msgs[mi - 1]?.sender_role === "user")
                      const senderName = m.sender ? (m.sender.nickname || m.sender.first_name_th) : "HR"
                      const allMedia = m.images || []
                      const imgUrls = allMedia.filter((u: string) => isImageUrl(u))
                      const fileUrls = allMedia.filter((u: string) => isFileUrl(u))
                      const isConsecutive = mi > 0 && g.msgs[mi - 1]?.sender_role === m.sender_role

                      return (
                        <div key={m.id} className={`flex gap-2 ${isConsecutive ? "mt-0.5" : "mt-2.5"} ${isMe ? "justify-end" : "justify-start"}`}>
                          {/* HR Avatar */}
                          {!isMe && (
                            <div className="w-9 h-9 flex-shrink-0 mt-auto">
                              {showAvatar ? (
                                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[10px] font-black overflow-hidden shadow-sm">
                                  {m.sender?.avatar_url
                                    ? <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-[#06C755]">HR</span>}
                                </div>
                              ) : <div className="w-9" />}
                            </div>
                          )}

                          {/* Bubble column */}
                          <div className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && showAvatar && (
                              <span className="text-[11px] text-white/70 font-semibold ml-1 mb-0.5">{senderName}</span>
                            )}

                            {/* Images */}
                            {imgUrls.length > 0 && (
                              <div className={`grid gap-1 mb-0.5 ${imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"} max-w-[250px]`}>
                                {imgUrls.map((url: string, ii: number) => (
                                  <img key={ii} src={url} alt="" onClick={() => setImgModal(url)}
                                    className={`rounded-xl object-cover cursor-pointer shadow-md hover:opacity-90 transition-opacity ${
                                      imgUrls.length === 1 ? "max-h-[220px] w-full" : "h-[110px] w-full"
                                    }`} />
                                ))}
                              </div>
                            )}

                            {/* Files */}
                            {fileUrls.length > 0 && (
                              <div className="space-y-0.5 mb-0.5">
                                {fileUrls.map((url: string, fi: number) => (
                                  <FileCard key={fi} url={url} isMe={isMe} />
                                ))}
                              </div>
                            )}

                            {/* Text bubble — LINE style */}
                            {m.message && (
                              <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`px-3 py-2 text-[14px] leading-[1.5] whitespace-pre-wrap break-words ${
                                  isMe
                                    ? "bg-[#06C755] text-white rounded-[18px] rounded-br-[4px] shadow-sm"
                                    : "bg-white text-slate-800 rounded-[18px] rounded-bl-[4px] shadow-sm"
                                }`}>
                                  {m.message}
                                </div>
                                {/* Time beside bubble */}
                                <div className={`flex items-end gap-0.5 flex-shrink-0 pb-0.5 ${isConsecutive ? "hidden" : ""}`}>
                                  {isMe && (
                                    m.is_read
                                      ? <span className="text-[9px] text-white/60 font-medium">อ่านแล้ว</span>
                                      : <Check size={10} className="text-white/40" />
                                  )}
                                  <span className="text-[10px] text-white/50">{fmtTime(m.created_at)}</span>
                                </div>
                              </div>
                            )}

                            {/* Time for media-only messages */}
                            {!m.message && !isConsecutive && (
                              <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? "mr-1" : "ml-1"}`}>
                                {isMe && (
                                  m.is_read
                                    ? <span className="text-[9px] text-white/60 font-medium">อ่านแล้ว</span>
                                    : <Check size={10} className="text-white/40" />
                                )}
                                <span className="text-[10px] text-white/50">{fmtTime(m.created_at)}</span>
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
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* ══════ Scroll-to-bottom FAB ══════ */}
      {showScroll && (
        <button onClick={() => scrollToBottom()}
          className="absolute bottom-[140px] right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center z-20 active:scale-90 transition-transform">
          <ChevronDown size={18} className="text-slate-500" />
        </button>
      )}

      {/* ══════ BOTTOM FIXED AREA — never moves ══════ */}
      <div className="flex-shrink-0 z-30 bg-white border-t border-slate-100">

        {/* Emoji bar */}
        {showEmoji && (
          <div className="border-b border-slate-100 px-2 py-2 flex gap-0.5 overflow-x-auto no-scrollbar">
            {QUICK_EMOJIS.map((e: string) => (
              <button key={e} onClick={() => sendMessage(e)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-90 flex-shrink-0">
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Attachment menu popup */}
        {showAttachMenu && (
          <div className="border-b border-slate-100 px-4 py-3 flex gap-4 justify-center bg-slate-50/80">
            <button onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center shadow-md">
                <ImagePlus size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-slate-500">รูปภาพ</span>
            </button>
            <button onClick={() => docRef.current?.click()}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full bg-[#5B86E5] flex items-center justify-center shadow-md">
                <Paperclip size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-slate-500">ไฟล์</span>
            </button>
          </div>
        )}

        {/* Attachment preview */}
        {(images.length > 0 || attachments.length > 0) && (
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((url: string, i: number) => (
                <div key={`img-${i}`} className="relative flex-shrink-0">
                  <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                  <button onClick={() => setImages((p: any) => p.filter((_: any, j: number) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={8} />
                  </button>
                </div>
              ))}
              {attachments.map((f: any, i: number) => (
                <div key={`file-${i}`} className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-lg">{getFileIcon(f.name || f.url)}</span>
                    <span className="text-[7px] text-slate-400 font-bold">{f.name?.split(".").pop()?.toUpperCase()}</span>
                  </div>
                  <button onClick={() => setAttachments((p: any) => p.filter((_: any, j: number) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div className="border-b border-slate-100 px-4 py-2 flex items-center gap-2 bg-green-50">
            <div className="w-4 h-4 border-2 border-[#06C755]/30 border-t-[#06C755] rounded-full animate-spin" />
            <span className="text-xs text-[#06C755] font-bold">กำลังอัปโหลด...</span>
          </div>
        )}

        {/* ── Input row — LINE style ── */}
        <div className="px-2 py-2 flex items-end gap-1.5 safe-bottom">
          {/* + button (attach menu toggle) */}
          <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false) }}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              showAttachMenu ? "bg-slate-200 rotate-45" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}>
            <Plus size={20} className={showAttachMenu ? "text-slate-600" : "text-slate-400"} />
          </button>

          {/* Text input — rounded like LINE */}
          <div className="flex-1 bg-slate-100 rounded-[22px] px-4 py-2 flex items-end min-h-[38px] max-h-[100px]">
            <textarea ref={inputRef}
              value={text}
              onChange={(e: any) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { setShowEmoji(false); setShowAttachMenu(false) }}
              placeholder="Aa"
              rows={1}
              className="flex-1 bg-transparent text-[14px] text-slate-700 placeholder:text-slate-400 resize-none outline-none max-h-[72px] leading-[1.4]"
            />
          </div>

          {/* Emoji toggle */}
          <button onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false) }}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              showEmoji ? "bg-[#06C755]/10 text-[#06C755]" : "text-slate-400 hover:text-slate-600"
            }`}>
            <Smile size={22} />
          </button>

          {/* Send / Mic */}
          {hasContent ? (
            <button onClick={() => sendMessage()} disabled={sending}
              className="w-9 h-9 flex-shrink-0 rounded-full bg-[#06C755] flex items-center justify-center shadow-md shadow-green-200/50 transition-all active:scale-90">
              {sending
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send size={16} className="text-white ml-0.5" />}
            </button>
          ) : (
            <div className="w-9 h-9 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z,.mp3,.mp4,.mov" multiple className="hidden" onChange={handleFileUpload} />

      {/* ══════ Image lightbox ══════ */}
      {imgModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center z-10"
            onClick={() => setImgModal(null)}>
            <X size={20} className="text-white" />
          </button>
          <img src={imgModal} alt="" className="max-w-[95%] max-h-[85vh] object-contain" onClick={(e: any) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
