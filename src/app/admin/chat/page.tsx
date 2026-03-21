"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Send, ImagePlus, X, MessageCircle, ArrowLeft, Search,
  Check, CheckCheck, Smile, Paperclip, Download,
} from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"

const QUICK_EMOJIS = ["👍","❤️","😊","👏","🙏","✅","📝","🎉"]

// ── File helpers ──
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

export default function AdminChatPage() {
  const [convs, setConvs] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [text, setText] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [imgModal, setImgModal] = useState<string | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [filter, setFilter] = useState<"all"|"unread">("all")

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])
  const convsRef = useRef<any[]>([])

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 30)
  }, [])

  const loadConvs = useCallback(async (silent = false) => {
    try {
      const r = await fetch("/api/chat?mode=admin")
      const d = await r.json()
      const newConvs = d.conversations ?? []
      if (JSON.stringify(newConvs.map((c: any) => c.id + (c.last_message?.created_at || "") + (c.unread_count || 0)))
        !== JSON.stringify(convsRef.current.map((c: any) => c.id + (c.last_message?.created_at || "") + (c.unread_count || 0)))) {
        convsRef.current = newConvs
        setConvs(newConvs)
      }
      setTotalUnread(d.totalUnread ?? 0)
    } catch { }
    if (!silent) setLoading(false)
  }, [])

  const loadMsgs = useCallback(async (convId: string, initial = false) => {
    if (initial) setLoadingMsgs(true)
    try {
      const r = await fetch(`/api/chat?mode=admin&conversation_id=${convId}`)
      const d = await r.json()
      const newMsgs = d.messages ?? []
      if (initial) {
        msgsRef.current = newMsgs
        setMsgs(newMsgs)
        if (d.conversation?.employee) setSelectedEmp(d.conversation.employee)
        scrollToBottom(false)
      } else {
        const existingIds = new Set(msgsRef.current.map((m: any) => m.id))
        const added = newMsgs.filter((m: any) => !existingIds.has(m.id))
        let readChanged = false
        const updatedMsgs = msgsRef.current.map((m: any) => {
          const fresh = newMsgs.find((n: any) => n.id === m.id)
          if (fresh && fresh.is_read !== m.is_read) { readChanged = true; return { ...m, is_read: fresh.is_read } }
          return m
        })
        if (added.length > 0 || readChanged) {
          const merged = [...updatedMsgs, ...added]
          msgsRef.current = merged
          setMsgs(merged)
          if (added.length > 0) scrollToBottom(true)
        }
      }
    } catch { }
    if (initial) setLoadingMsgs(false)
  }, [scrollToBottom])

  useEffect(() => { loadConvs() }, [loadConvs])
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return
      loadConvs(true)
      if (selectedId) loadMsgs(selectedId, false)
    }, 6000)
    return () => clearInterval(interval)
  }, [selectedId, loadConvs, loadMsgs])

  const openConv = (conv: any) => {
    setSelectedId(conv.id); setSelectedEmp(conv.employee || null)
    setMsgs([]); msgsRef.current = []; loadMsgs(conv.id, true)
  }
  const goBack = () => {
    setSelectedId(null); setSelectedEmp(null); setMsgs([]); msgsRef.current = []
    setText(""); setImages([]); setAttachments([]); loadConvs()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f: any) => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.urls) setImages((p: any) => [...p, ...d.urls])
    } catch { }
    setUploading(false); if (fileRef.current) fileRef.current.value = ""
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true)
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

  const sendMessage = async (msgText?: string) => {
    const finalText = msgText ?? text.trim()
    if (!finalText && images.length === 0 && attachments.length === 0) return
    if (!selectedId) return
    setSending(true); setShowEmoji(false)
    try {
      const allMedia = [...images, ...attachments.map((a: any) => a.url)]
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversation_id: selectedId, message: finalText || null, images: allMedia }),
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

  const fmtTime = (d: string) => { try { return format(new Date(d), "HH:mm") } catch { return "" } }
  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d)
      if (isToday(dt)) return "วันนี้"
      if (isYesterday(dt)) return "เมื่อวาน"
      return format(dt, "d MMMM yyyy", { locale: th })
    } catch { return "" }
  }
  const timeAgo = (d: string) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: th }) } catch { return "" }
  }

  const filtered = useMemo(() => convs.filter((c: any) => {
    if (filter === "unread" && !(c.unread_count > 0)) return false
    if (!search) return true
    const emp = c.employee || {}
    return `${emp.first_name_th || ""} ${emp.last_name_th || ""} ${emp.nickname || ""} ${emp.employee_code || ""}`
      .toLowerCase().includes(search.toLowerCase())
  }), [convs, search, filter])

  const grouped = useMemo(() => {
    const g: { date: string; msgs: any[] }[] = []; let ld = ""
    for (const m of msgs) {
      const d = m.created_at?.slice(0, 10) || ""
      if (d !== ld) { g.push({ date: d, msgs: [] }); ld = d }
      g[g.length - 1].msgs.push(m)
    }
    return g
  }, [msgs])

  // ── File Card ──
  const FileCard = ({ url, isMe }: { url: string; isMe: boolean }) => (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:shadow-md ${
        isMe
          ? "bg-white/20 backdrop-blur-sm border border-white/20"
          : "bg-white border border-slate-200 shadow-sm"
      }`}
      style={{ minWidth: 200, maxWidth: 300 }}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isMe ? "bg-white/20" : "bg-slate-100"
      }`}>
        <span className="text-xl">{getFileIcon(url)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold truncate ${isMe ? "text-white" : "text-slate-700"}`}>
          {getFileName(url)}
        </p>
        <p className={`text-[11px] mt-0.5 ${isMe ? "text-white/60" : "text-slate-400"}`}>
          แตะเพื่อดาวน์โหลด
        </p>
      </div>
      <Download size={16} className={`flex-shrink-0 ${isMe ? "text-white/50" : "text-slate-300"}`} />
    </a>
  )

  // ══════════════════════════════════════════════════════════
  // ── CONVERSATION LIST VIEW ──
  // ══════════════════════════════════════════════════════════
  if (!selectedId) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <MessageCircle size={17} className="text-white" />
            </div>
            แชทกับพนักงาน
          </h1>
          {totalUnread > 0 && (
            <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-full border border-red-100">
              {totalUnread} ใหม่
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={search} onChange={(e: any) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
          </div>
          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
            {(["all","unread"] as const).map((f: any) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-bold transition-all ${filter === f ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-50"}`}>
                {f === "all" ? "ทั้งหมด" : "ยังไม่อ่าน"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
            <p className="text-xs text-slate-400">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <MessageCircle size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">
              {filter === "unread" ? "ไม่มีข้อความที่ยังไม่อ่าน" : "ยังไม่มีการสนทนา"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((c: any) => {
              const emp = c.employee || {}
              const name = emp.nickname || `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim() || "ไม่ระบุ"
              const dept = emp.department?.name || ""
              const lastMsg = c.last_message
              const unread = c.unread_count || 0
              return (
                <button key={c.id} onClick={() => openConv(c)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all hover:shadow-md ${
                    unread > 0 ? "bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-indigo-100 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                  }`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-black overflow-hidden shadow-sm ${
                      unread > 0 ? "bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-indigo-200" : "bg-gradient-to-br from-slate-300 to-slate-400"
                    }`}>
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : name[0]}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread > 0 ? "font-black text-slate-800" : "font-semibold text-slate-600"}`}>{name}</p>
                      <span className={`text-[10px] flex-shrink-0 ${unread > 0 ? "text-indigo-500 font-bold" : "text-slate-300"}`}>
                        {lastMsg ? timeAgo(lastMsg.created_at) : ""}
                      </span>
                    </div>
                    {dept && <p className="text-[11px] text-slate-400 truncate -mt-0.5">{dept}</p>}
                    {lastMsg && (
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-slate-600 font-bold" : "text-slate-400"}`}>
                        {lastMsg.sender_role !== "user" ? "คุณ: " : ""}
                        {lastMsg.message || (lastMsg.images?.length > 0 ? "📎 ส่งไฟล์/รูปภาพ" : "")}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // ── CHAT VIEW ──
  // ══════════════════════════════════════════════════════════
  const emp = selectedEmp || {}
  const empName = emp.nickname || `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim() || "พนักงาน"

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
      style={{ height: "calc(100vh - 120px)" }}>

      {/* ── Chat header — always visible ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-3">
        <button onClick={goBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-black overflow-hidden shadow-sm ring-2 ring-white flex-shrink-0">
          {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : empName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{empName}</p>
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            {emp.employee_code && <span className="font-mono">{emp.employee_code}</span>}
            {emp.department?.name && (
              <><span className="text-slate-200">·</span><span>{emp.department.name}</span></>
            )}
          </p>
        </div>
      </div>

      {/* ── Messages — only this part scrolls ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-b from-slate-50 to-white">
        {loadingMsgs ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
            <p className="text-xs text-slate-400">กำลังโหลดข้อความ...</p>
          </div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <MessageCircle size={28} className="text-indigo-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">เริ่มสนทนากับ {empName}</p>
            <p className="text-xs text-slate-300 mt-1">ส่งข้อความ รูปภาพ หรือไฟล์ได้เลย</p>
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map((g: any) => (
              <div key={g.date}>
                <div className="flex items-center justify-center my-4">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="px-3 py-1 text-[11px] font-bold text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm mx-3">
                    {fmtDate(g.date)}
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                {g.msgs.map((m: any, mi: number) => {
                  const isUser = m.sender_role === "user"
                  const isMe = !isUser
                  const showAvatar = isUser && (mi === 0 || g.msgs[mi - 1]?.sender_role !== "user")
                  const senderName = m.sender ? (m.sender.nickname || m.sender.first_name_th) : ""
                  const allMedia = m.images || []
                  const imgUrls = allMedia.filter((u: string) => isImageUrl(u))
                  const fileUrls = allMedia.filter((u: string) => !isImageUrl(u))
                  const isConsecutive = mi > 0 && g.msgs[mi - 1]?.sender_role === m.sender_role

                  return (
                    <div key={m.id} className={`flex gap-2.5 ${isConsecutive ? "mt-0.5" : "mt-3"} ${isMe ? "justify-end" : "justify-start"}`}>
                      {isUser && (
                        <div className="w-9 h-9 flex-shrink-0 mt-auto">
                          {showAvatar ? (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] font-black overflow-hidden shadow-sm">
                              {m.sender?.avatar_url
                                ? <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                : senderName?.[0] || "?"}
                            </div>
                          ) : <div className="w-9" />}
                        </div>
                      )}

                      <div className={`max-w-[65%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {/* Images */}
                        {imgUrls.length > 0 && (
                          <div className={`grid gap-1.5 mb-1 ${imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`} style={{ maxWidth: 300 }}>
                            {imgUrls.map((url: string, ii: number) => (
                              <img key={ii} src={url} alt="" onClick={() => setImgModal(url)}
                                className={`rounded-2xl object-cover cursor-pointer shadow-sm hover:opacity-90 transition-opacity ${
                                  imgUrls.length === 1 ? "max-h-[240px] w-full" : "h-[120px] w-full"
                                }`} />
                            ))}
                          </div>
                        )}

                        {/* File attachments */}
                        {fileUrls.length > 0 && (
                          <div className="space-y-1.5 mb-1">
                            {fileUrls.map((url: string, fi: number) => (
                              <FileCard key={fi} url={url} isMe={isMe} />
                            ))}
                          </div>
                        )}

                        {/* Text bubble */}
                        {m.message && (
                          <div className={`px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                            isMe
                              ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md"
                              : "bg-white text-slate-700 rounded-2xl rounded-bl-md shadow-sm border border-slate-100"
                          }`}>
                            {m.message}
                          </div>
                        )}

                        {/* Time + read */}
                        {!isConsecutive && (
                          <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "mr-1" : "ml-1"}`}>
                            <span className="text-[10px] text-slate-300">{fmtTime(m.created_at)}</span>
                            {isMe && (
                              m.is_read
                                ? <CheckCheck size={13} className="text-blue-400" />
                                : <Check size={13} className="text-slate-300" />
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
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Emoji bar ── */}
      {showEmoji && (
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-2 flex gap-1 overflow-x-auto no-scrollbar">
          {QUICK_EMOJIS.map((e: string) => (
            <button key={e} onClick={() => sendMessage(e)}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 flex-shrink-0">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── Preview bar ── */}
      {(images.length > 0 || attachments.length > 0) && (
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-2.5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((url: string, i: number) => (
              <div key={`img-${i}`} className="relative flex-shrink-0 group">
                <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-200" />
                <button onClick={() => setImages((p: any) => p.filter((_: any, j: number) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
            {attachments.map((f: any, i: number) => (
              <div key={`file-${i}`} className="relative flex-shrink-0 group">
                <div className="w-16 h-16 rounded-xl bg-indigo-50 border-2 border-indigo-200 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl">{getFileIcon(f.name || f.url)}</span>
                  <span className="text-[8px] text-slate-500 font-bold">{f.name?.split(".").pop()?.toUpperCase()}</span>
                </div>
                <button onClick={() => setAttachments((p: any) => p.filter((_: any, j: number) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar — always at bottom ── */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3 flex items-end gap-2.5">
        <button onClick={() => setShowEmoji(!showEmoji)}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
            showEmoji ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
          }`}>
          <Smile size={20} />
        </button>

        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
          {uploading ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> : <ImagePlus size={20} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

        <button onClick={() => docRef.current?.click()} disabled={uploading}
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
          <Paperclip size={20} />
        </button>
        <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z,.mp3,.mp4,.mov" multiple className="hidden" onChange={handleFileUpload} />

        <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 min-h-[44px] max-h-[120px] flex items-end">
          <textarea value={text} onChange={(e: any) => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..." rows={1}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none max-h-[80px] leading-[1.4]" />
        </div>

        <button onClick={() => sendMessage()} disabled={sending || (!text.trim() && images.length === 0 && attachments.length === 0)}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            text.trim() || images.length > 0 || attachments.length > 0
              ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg"
              : "bg-slate-100 text-slate-300"
          }`}>
          {sending ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Lightbox */}
      {imgModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            onClick={() => setImgModal(null)}>
            <X size={20} className="text-white" />
          </button>
          <img src={imgModal} alt="" className="max-w-[90%] max-h-[85vh] object-contain rounded-lg" onClick={(e: any) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
