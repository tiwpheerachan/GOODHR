"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Send, ImagePlus, X, MessageCircle, ChevronDown, ChevronLeft, Smile,
  Download, Plus, File, Search, Users, UserPlus, Check, Hash, Settings,
  LogOut, Camera, Trash2, Edit3, UserMinus, Shield, Pin, Copy,
  ChevronRight as ChevronR, ArrowLeft, ArrowRight, ZoomIn,
} from "lucide-react"
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

// ── Constants ──
const QUICK_EMOJIS = ["👍","❤️","😊","👏","🙏","✅","🎉","😄","😢","🔥"]
const QUICK_SUGGESTIONS = [
  { label: "สอบถามเรื่องลา", icon: "📋" },
  { label: "เงินเดือน/สลิป", icon: "💰" },
  { label: "แจ้งปัญหา", icon: "🔧" },
  { label: "ขอเอกสาร", icon: "📄" },
]
const TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "hr", label: "HR" },
  { key: "direct", label: "ส่วนตัว" },
  { key: "group", label: "กลุ่ม" },
]

// ── Helpers ──
function isImageUrl(url: string): boolean {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  return ["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)
}
function getFileIcon(url: string): string {
  // Try name param first for accurate extension
  try {
    const paramName = new URL(url, "https://x").searchParams.get("name")
    if (paramName) {
      const ext = paramName.split(".").pop()?.toLowerCase() || ""
      if (["pdf"].includes(ext)) return "📕"
      if (["doc","docx"].includes(ext)) return "📘"
      if (["xls","xlsx","csv"].includes(ext)) return "📗"
      if (["ppt","pptx"].includes(ext)) return "📙"
      if (["zip","rar","7z","tar","gz"].includes(ext)) return "📦"
      if (["mp3","wav","ogg","m4a"].includes(ext)) return "🎵"
      if (["mp4","mov","avi","mkv"].includes(ext)) return "🎬"
      if (["txt","rtf"].includes(ext)) return "📝"
    }
  } catch {}
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return "📕"
  if (["doc","docx"].includes(ext)) return "📘"
  if (["xls","xlsx","csv"].includes(ext)) return "📗"
  if (["ppt","pptx"].includes(ext)) return "📙"
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "📦"
  return "📎"
}
function getFileName(url: string): string {
  try {
    // Try to get original name from query param first
    const urlObj = new URL(url, "https://x")
    const paramName = urlObj.searchParams.get("name")
    if (paramName) return paramName
    // Fallback: extract from path
    const parts = url.split("?")[0].split("/")
    const raw = parts[parts.length - 1] || "file"
    const name = decodeURIComponent(raw.replace(/^\d+_[a-z0-9]+_/, ""))
    // If name is mostly underscores (Thai chars were stripped), show extension instead
    const cleaned = name.replace(/_/g, "").replace(/\.[^.]+$/, "")
    if (!cleaned) {
      const ext = name.split(".").pop()?.toUpperCase() || "FILE"
      return `ไฟล์ ${ext}`
    }
    return name
  } catch { return "ไฟล์แนบ" }
}
function timeAgo(d: string) {
  try {
    const dt = new Date(d)
    if (isToday(dt)) return format(dt, "HH:mm")
    if (isYesterday(dt)) return "เมื่อวาน"
    return format(dt, "d MMM", { locale: th })
  } catch { return "" }
}
function fmtTime(d: string) { try { return format(new Date(d), "HH:mm", { locale: th }) } catch { return "" } }
function fmtDate(d: string) {
  try {
    const dt = new Date(d)
    if (isToday(dt)) return "วันนี้"
    if (isYesterday(dt)) return "เมื่อวาน"
    return format(dt, "d MMM yyyy", { locale: th })
  } catch { return "" }
}
function lastSeenText(d: string | null) {
  if (!d) return ""
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: th }) } catch { return "" }
}

// Collect all images from messages for gallery
function collectAllImages(msgs: any[]): { url: string; msgId: string; time: string }[] {
  const images: { url: string; msgId: string; time: string }[] = []
  for (const m of msgs) {
    const allMedia = m.images || []
    for (const u of allMedia) {
      if (isImageUrl(u)) images.push({ url: u, msgId: m.id, time: m.created_at })
    }
  }
  return images
}

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
export default function UserChatPage() {
  type View = "list" | "chat" | "new_chat" | "new_group" | "group_settings" | "add_members"
  const [view, setView] = useState<View>("list")
  const [activeTab, setActiveTab] = useState("all")
  const [searchQ, setSearchQ] = useState("")

  const [conversations, setConversations] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [activeConv, setActiveConv] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [myEmpId, setMyEmpId] = useState<string>("")

  const [text, setText] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number; type: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showScroll, setShowScroll] = useState(false)

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<{ url: string; msgId: string; time: string }[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [showGallery, setShowGallery] = useState(false)

  const [employees, setEmployees] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [loadingEmps, setLoadingEmps] = useState(false)

  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<any[]>([])
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [contextMenu, setContextMenu] = useState<{ msgId: string; isMe: boolean; x: number; y: number; hasImage?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<"conversation" | null>(null)
  const [confirmMsgDelete, setConfirmMsgDelete] = useState<string | null>(null)
  const [pinnedMessage, setPinnedMessage] = useState<any>(null)
  const [showPinBanner, setShowPinBanner] = useState(true)

  // ── Tier 1 features ──
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([])
  const [replyTo, setReplyTo] = useState<{ id: string; message: string; senderName: string } | null>(null)
  const [msgReactions, setMsgReactions] = useState<Record<string, any[]>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [msgSearch, setMsgSearch] = useState("")
  const [msgSearchResults, setMsgSearchResults] = useState<any[]>([])
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const typingTimerRef = useRef<any>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const groupAvatarRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])
  const pollRef = useRef<number>(0)
  const galleryTouchStart = useRef<{ x: number; y: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null) // Cancel in-flight requests
  const lastTsRef = useRef<string>("") // Last server timestamp for delta polling
  const pollIntervalRef = useRef<number>(3000) // Adaptive: starts fast, slows down
  const noChangeCount = useRef<number>(0) // Consecutive polls with no changes

  // ── In-memory conversation cache (LINE-style instant open) ──
  // Keeps last N conversations in memory; evicts oldest when full
  const cacheRef = useRef<Record<string, {
    msgs: any[]; conv: any; members: any[]; pinned: any; ts: string; at: number
  }>>({})
  const MAX_CACHED_CONVS = 20
  const updateCache = useCallback((convId: string, data: { msgs: any[]; conv: any; members: any[]; pinned: any; ts: string }) => {
    cacheRef.current[convId] = { ...data, at: Date.now() }
    // Evict oldest if over limit
    const keys = Object.keys(cacheRef.current)
    if (keys.length > MAX_CACHED_CONVS) {
      let oldestKey = keys[0], oldestAt = cacheRef.current[keys[0]].at
      for (const k of keys) {
        if (cacheRef.current[k].at < oldestAt) { oldestKey = k; oldestAt = cacheRef.current[k].at }
      }
      delete cacheRef.current[oldestKey]
    }
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 50)
  }, [])

  // ── Abort helper ──
  const cancelPending = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
  }, [])

  // ═══════════════════════════════════════
  // LOAD CONVERSATION LIST (with hash-based skip)
  // ═══════════════════════════════════════
  const convHashRef = useRef<string>("")
  const loadConversations = useCallback(async () => {
    try {
      const ctrl = new AbortController()
      const r = await fetch("/api/chat?mode=conversations", { signal: ctrl.signal })
      const d = await r.json()
      if (d.me) setMyEmpId(d.me)
      // Skip re-render if hash unchanged (nothing changed on server)
      if (d.hash && d.hash === convHashRef.current) {
        setLoadingList(false)
        return
      }
      if (d.hash) convHashRef.current = d.hash
      if (d.conversations) {
        setConversations(d.conversations)
        if (d.conversations.length === 1 && (!d.conversations[0].type || d.conversations[0].type === "hr")) {
          openChat(d.conversations[0].id, d.conversations[0].type || "hr")
          return
        }
      }
    } catch (e: any) { if (e.name === "AbortError") return }
    setLoadingList(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Heartbeat: online status every 30s (replaces per-GET upsert) ──
  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return
      fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      }).catch(() => {})
    }
    sendHeartbeat() // Immediate on mount
    const hb = setInterval(sendHeartbeat, 30000)
    // Go offline on tab close
    const onBeforeUnload = () => {
      navigator.sendBeacon?.("/api/chat", new Blob([JSON.stringify({ action: "offline" })], { type: "application/json" }))
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(hb)
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // Adaptive list polling: 8s active, skip when tab hidden
  useEffect(() => {
    if (view !== "list") return
    const poll = () => {
      if (document.visibilityState === "visible") loadConversations()
    }
    const iv = setInterval(poll, 8000)
    // Also poll on tab re-focus
    const onFocus = () => loadConversations()
    document.addEventListener("visibilitychange", onFocus)
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onFocus) }
  }, [view, loadConversations])

  // ═══════════════════════════════════════
  // OPEN CHAT (full load)
  // ═══════════════════════════════════════
  const openChat = useCallback(async (convId: string, convType?: string) => {
    setView("chat")
    setText("")
    setImages([])
    setAttachments([])
    setShowEmoji(false)
    setShowAttach(false)
    setShowPinBanner(true)
    cancelPending()
    pollRef.current += 1
    noChangeCount.current = 0
    pollIntervalRef.current = 3000

    // ── Cache-first: show cached data instantly (no loading spinner) ──
    const cached = cacheRef.current[convId]
    if (cached) {
      msgsRef.current = cached.msgs
      setMsgs(cached.msgs)
      setMembers(cached.members)
      setActiveConv(cached.conv)
      setPinnedMessage(cached.pinned)
      lastTsRef.current = cached.ts
      setLoadingChat(false)
      setTimeout(() => scrollToBottom(false), 50)
    } else {
      // No cache — show loading
      setLoadingChat(true)
      setMsgs([])
      setMembers([])
      setPinnedMessage(null)
      lastTsRef.current = ""
    }

    // ── Background fetch (always, even with cache) ──
    try {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      // If we have cache, use delta polling from last known timestamp
      const sinceParam = cached?.ts ? `&since=${encodeURIComponent(cached.ts)}` : ""
      const r = await fetch(`/api/chat?conversation_id=${convId}${sinceParam}`, { signal: ctrl.signal })
      const d = await r.json()

      let convObj = cached?.conv
      let membersObj = cached?.members ?? []
      let pinnedObj = cached?.pinned ?? null

      if (cached && sinceParam && d.new_messages !== undefined) {
        // Delta response on cached conversation — uses total_count
        const newMsgs = d.new_messages ?? []
        const existingIds = new Set(msgsRef.current.map((m: any) => m.id))
        const added = newMsgs.filter((m: any) => !existingIds.has(m.id))

        // Check for deletions via count mismatch
        const localReal = msgsRef.current.filter((m: any) => !m._sending).length
        const serverTotal = d.total_count ?? localReal
        const needsFullRefresh = serverTotal < localReal

        if (needsFullRefresh) {
          // Deletions happened while away — do a full load
          lastTsRef.current = ""
          const r2 = await fetch(`/api/chat?conversation_id=${convId}`, { signal: ctrl.signal })
          const d2 = await r2.json()
          if (d2.messages) { msgsRef.current = d2.messages; setMsgs(d2.messages) }
          if (d2.members) { membersObj = d2.members; setMembers(d2.members) }
          if (d2.conversation) {
            convObj = { ...d2.conversation, type: d2.conversation.type || convType || "hr" }
            setActiveConv(convObj)
            pinnedObj = d2.conversation.pinned_message || null
            setPinnedMessage(pinnedObj)
          }
          if (d2.ts) lastTsRef.current = d2.ts
        } else if (added.length > 0) {
          const merged = [...msgsRef.current, ...added]
          msgsRef.current = merged
          setMsgs(merged)
          scrollToBottom(true)
        }
        if (d.ts && !needsFullRefresh) lastTsRef.current = d.ts
      } else {
        // Full response
        if (d.conversation) {
          convObj = { ...d.conversation, type: d.conversation.type || convType || "hr" }
          setActiveConv(convObj)
          pinnedObj = d.conversation.pinned_message || null
          if (d.conversation.pinned_message) setPinnedMessage(d.conversation.pinned_message)
          else setPinnedMessage(null)
        }
        if (d.messages) { msgsRef.current = d.messages; setMsgs(d.messages) }
        if (d.members) { membersObj = d.members; setMembers(d.members) }
        if (d.me) setMyEmpId(d.me)
        if (d.ts) lastTsRef.current = d.ts
        setTimeout(() => scrollToBottom(false), 100)
      }

      // ── Update cache using local variables (avoids stale closure) ──
      updateCache(convId, {
        msgs: msgsRef.current.filter((m: any) => !m._sending),
        conv: convObj ?? d.conversation,
        members: membersObj,
        pinned: pinnedObj,
        ts: lastTsRef.current,
      })
    } catch (e: any) { if (e.name === "AbortError") return }
    setLoadingChat(false)
    setLoadingList(false)
  }, [scrollToBottom, cancelPending, updateCache])

  // ═══════════════════════════════════════
  // DELTA POLLING — only fetch new messages since last timestamp
  // Adaptive interval: 3s → 5s → 8s → 12s when idle, resets on activity
  // ═══════════════════════════════════════
  useEffect(() => {
    if (view !== "chat" || !activeConv?.id) return
    const gen = pollRef.current
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      if (gen !== pollRef.current || document.visibilityState !== "visible") {
        timer = setTimeout(poll, pollIntervalRef.current)
        return
      }

      try {
        const ctrl = new AbortController()
        const sinceParam = lastTsRef.current ? `&since=${encodeURIComponent(lastTsRef.current)}` : ""
        const url = `/api/chat?conversation_id=${activeConv.id}${sinceParam}`
        const r = await fetch(url, { signal: ctrl.signal })
        if (gen !== pollRef.current) return
        const d = await r.json()

        if (lastTsRef.current && d.new_messages !== undefined) {
          // Delta response — uses total_count for delete detection (O(1) vs O(n))
          const newMsgs = d.new_messages ?? []
          const serverTotal = d.total_count ?? 0

          // Count non-temp local messages
          const localReal = msgsRef.current.filter((m: any) => !m._sending)
          const expectedAfterAdd = localReal.length + newMsgs.filter((m: any) =>
            !localReal.some((l: any) => l.id === m.id)
          ).length

          // If server total < expected, some messages were deleted — need full refresh
          let existing = msgsRef.current
          if (serverTotal < expectedAfterAdd - newMsgs.length) {
            // Deletions detected — do a full refresh next poll by clearing since
            lastTsRef.current = ""
            noChangeCount.current = 0
            pollIntervalRef.current = 2000
            if (d.ts) lastTsRef.current = "" // Force full reload
            timer = setTimeout(poll, 500)
            return
          }

          // Add new messages
          const existingIds = new Set(existing.map((m: any) => m.id))
          const added = newMsgs.filter((m: any) => !existingIds.has(m.id))

          if (added.length > 0) {
            const merged = [...existing, ...added]
            msgsRef.current = merged
            setMsgs(merged)
            scrollToBottom(true)
            noChangeCount.current = 0
            pollIntervalRef.current = 3000 // Reset to fast
          } else {
            // No changes — slow down polling
            noChangeCount.current++
            if (noChangeCount.current > 5) pollIntervalRef.current = Math.min(12000, pollIntervalRef.current + 1000)
          }

          if (d.ts) lastTsRef.current = d.ts
          // Update typing indicator
          if (d.typing) setTypingUsers(d.typing)
          else setTypingUsers([])
        } else if (d.messages) {
          // Full response (first load or no since param)
          const newMsgs = d.messages ?? []
          const existingIds = new Set(msgsRef.current.map((m: any) => m.id))
          const added = newMsgs.filter((m: any) => !existingIds.has(m.id))
          const newIds = new Set(newMsgs.map((m: any) => m.id))

          let changed = false
          const updated = msgsRef.current
            .filter((m: any) => m._sending || newIds.has(m.id))
            .map((m: any) => {
              if (m._sending) return m
              const fresh = newMsgs.find((n: any) => n.id === m.id)
              if (fresh && fresh.is_read !== m.is_read) { changed = true; return { ...m, is_read: fresh.is_read } }
              return m
            })

          if (added.length > 0 || changed || updated.length !== msgsRef.current.length) {
            const merged = [...updated, ...added]
            msgsRef.current = merged
            setMsgs(merged)
            if (added.length > 0) scrollToBottom(true)
            noChangeCount.current = 0
            pollIntervalRef.current = 3000
          } else {
            noChangeCount.current++
            if (noChangeCount.current > 5) pollIntervalRef.current = Math.min(12000, pollIntervalRef.current + 1000)
          }

          if (d.conversation?.pinned_message) setPinnedMessage(d.conversation.pinned_message)
          else if (d.conversation && !d.conversation.pinned_message_id) setPinnedMessage(null)
          if (d.ts) lastTsRef.current = d.ts
        }

        // Update cache after each successful poll
        if (activeConv?.id && msgsRef.current.length > 0) {
          updateCache(activeConv.id, {
            msgs: msgsRef.current.filter((m: any) => !m._sending),
            conv: activeConv,
            members,
            pinned: pinnedMessage,
            ts: lastTsRef.current,
          })
        }
      } catch (e: any) { if (e.name === "AbortError") return }

      if (gen === pollRef.current) {
        timer = setTimeout(poll, pollIntervalRef.current)
      }
    }

    timer = setTimeout(poll, pollIntervalRef.current)

    // Reset to fast polling on tab re-focus
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        noChangeCount.current = 0
        pollIntervalRef.current = 3000
      }
    }
    document.addEventListener("visibilitychange", onFocus)

    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onFocus) }
  }, [view, activeConv?.id, scrollToBottom])

  // ═══════════════════════════════════════
  // EMPLOYEES LIST
  // ═══════════════════════════════════════
  const loadEmployees = useCallback(async () => {
    setLoadingEmps(true)
    try {
      const r = await fetch("/api/chat?mode=employees")
      const d = await r.json()
      if (d.employees) setEmployees(d.employees)
    } catch {}
    setLoadingEmps(false)
  }, [])

  const openNewChat = () => { setView("new_chat"); setEmpSearch(""); if (!employees.length) loadEmployees() }
  const openNewGroup = () => { setView("new_group"); setGroupName(""); setSelectedMembers([]); setEmpSearch(""); if (!employees.length) loadEmployees() }
  const openAddMembers = () => { setView("add_members"); setSelectedMembers([]); setEmpSearch(""); if (!employees.length) loadEmployees() }

  // ═══════════════════════════════════════
  // CREATE DIRECT / GROUP
  // ═══════════════════════════════════════
  const startDirectChat = async (targetEmpId: string) => {
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_direct", target_employee_id: targetEmpId })
      })
      const d = await r.json()
      if (d.conversation_id) openChat(d.conversation_id, "direct")
    } catch {}
  }

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_group", name: groupName.trim(), member_ids: selectedMembers.map((m: any) => m.id) })
      })
      const d = await r.json()
      if (d.conversation_id) openChat(d.conversation_id, "group")
    } catch {}
  }

  // ═══════════════════════════════════════
  // GROUP MANAGEMENT
  // ═══════════════════════════════════════
  const addMembersToGroup = async () => {
    if (!activeConv?.id || selectedMembers.length === 0) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_members", conversation_id: activeConv.id, member_ids: selectedMembers.map((m: any) => m.id) })
      })
      openChat(activeConv.id, activeConv.type)
    } catch {}
  }

  const removeMember = async (memberId: string) => {
    if (!activeConv?.id) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_member", conversation_id: activeConv.id, member_id: memberId })
      })
      setMembers(prev => prev.filter((m: any) => m.employee_id !== memberId))
    } catch {}
  }

  const leaveGroup = async () => {
    if (!activeConv?.id) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_group", conversation_id: activeConv.id })
      })
      goBack()
    } catch {}
  }

  const updateGroupName = async () => {
    if (!activeConv?.id || !newGroupName.trim()) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_group", conversation_id: activeConv.id, name: newGroupName.trim() })
      })
      setActiveConv((prev: any) => ({ ...prev, name: newGroupName.trim() }))
      setEditingGroupName(false)
    } catch {}
  }

  const updateGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length || !activeConv?.id) return
    try {
      const fd = new FormData()
      fd.append("files", files[0])
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      const url = d.urls?.[0]
      if (url) {
        await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_group", conversation_id: activeConv.id, avatar_url: url })
        })
        setActiveConv((prev: any) => ({ ...prev, avatar_url: url }))
      }
    } catch {}
    if (e.target) e.target.value = ""
  }

  const deleteConversation = async () => {
    if (!activeConv?.id) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_conversation", conversation_id: activeConv.id })
      })
      goBack()
    } catch {}
  }

  const deleteMessage = async (msgId: string) => {
    // Optimistic removal
    const prev = msgsRef.current
    const updated = prev.filter((m: any) => m.id !== msgId)
    msgsRef.current = updated
    setMsgs(updated)
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_message", message_id: msgId })
      })
      const d = await r.json()
      if (!d.success) {
        // Rollback
        msgsRef.current = prev
        setMsgs(prev)
      }
    } catch {
      msgsRef.current = prev
      setMsgs(prev)
    }
  }

  // ═══════════════════════════════════════
  // PIN MESSAGE
  // ═══════════════════════════════════════
  const pinMessage = async (msgId: string) => {
    if (!activeConv?.id) return
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin_message", conversation_id: activeConv.id, message_id: msgId })
      })
      const d = await r.json()
      if (d.success && d.pinned) { setPinnedMessage(d.pinned); setShowPinBanner(true) }
    } catch {}
  }

  const unpinMessage = async () => {
    if (!activeConv?.id) return
    try {
      await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpin_message", conversation_id: activeConv.id })
      })
      setPinnedMessage(null)
    } catch {}
  }

  // ═══════════════════════════════════════
  // UPLOADS
  // ═══════════════════════════════════════
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true); setShowAttach(false)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.urls) setImages(prev => [...prev, ...d.urls])
    } catch {}
    setUploading(false); if (fileRef.current) fileRef.current.value = ""
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true); setShowAttach(false)
    try {
      const fd = new FormData()
      fd.append("files", files[0])
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.urls) setImages(prev => [...prev, ...d.urls])
    } catch {}
    setUploading(false); if (cameraRef.current) cameraRef.current.value = ""
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return
    setUploading(true); setShowAttach(false)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const r = await fetch("/api/chat/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (d.files) {
        const ni: string[] = []; const nf: Array<{ url: string; name: string; size: number; type: string }> = []
        for (const f of d.files) { f.type?.startsWith("image/") ? ni.push(f.url) : nf.push(f) }
        if (ni.length) setImages(p => [...p, ...ni])
        if (nf.length) setAttachments(p => [...p, ...nf])
      }
    } catch {}
    setUploading(false); if (docRef.current) docRef.current.value = ""
  }

  // ═══════════════════════════════════════
  // SAVE IMAGE (download)
  // ═══════════════════════════════════════
  const saveImage = async (url: string) => {
    try {
      const a = document.createElement("a")
      a.href = url
      a.download = getFileName(url)
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {}
  }

  // ═══════════════════════════════════════
  // GALLERY NAVIGATION
  // ═══════════════════════════════════════
  const openGallery = (imageUrl: string) => {
    const allImgs = collectAllImages(msgsRef.current)
    if (allImgs.length === 0) return
    const idx = allImgs.findIndex(i => i.url === imageUrl)
    setGalleryImages(allImgs)
    setGalleryIndex(idx >= 0 ? idx : 0)
    setShowGallery(true)
  }

  const galleryPrev = () => setGalleryIndex(i => Math.max(0, i - 1))
  const galleryNext = () => setGalleryIndex(i => Math.min(galleryImages.length - 1, i + 1))

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    galleryTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (!galleryTouchStart.current) return
    const dx = e.changedTouches[0].clientX - galleryTouchStart.current.x
    if (Math.abs(dx) > 50) {
      if (dx > 0) galleryPrev()
      else galleryNext()
    }
    galleryTouchStart.current = null
  }

  // ═══════════════════════════════════════
  // TYPING INDICATOR
  // ═══════════════════════════════════════
  const sendTyping = useCallback(() => {
    if (!activeConv) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "typing", conversation_id: activeConv.id }),
      }).catch(() => {})
    }, 300)
  }, [activeConv])

  // ═══════════════════════════════════════
  // SEARCH MESSAGES
  // ═══════════════════════════════════════
  const searchMessages = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setMsgSearchResults([]); return }
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query, conversation_id: activeConv?.id }),
    })
    const data = await res.json()
    setMsgSearchResults(data.results ?? [])
  }, [activeConv])

  // ═══════════════════════════════════════
  // REACT TO MESSAGE
  // ═══════════════════════════════════════
  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    setShowReactionPicker(null)
    // Optimistic update
    setMsgReactions(prev => {
      const existing = (prev[messageId] || []).find((r: any) => r.employee_id === myEmpId)
      if (existing?.emoji === emoji) {
        return { ...prev, [messageId]: (prev[messageId] || []).filter((r: any) => r.employee_id !== myEmpId) }
      }
      const filtered = (prev[messageId] || []).filter((r: any) => r.employee_id !== myEmpId)
      return { ...prev, [messageId]: [...filtered, { employee_id: myEmpId, emoji }] }
    })
    await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", message_id: messageId, emoji }),
    }).catch(() => {})
  }, [myEmpId])

  // Load reactions when messages change
  useEffect(() => {
    if (!msgs.length) return
    const ids = msgs.slice(-50).map((m: any) => m.id).filter((id: string) => !id.startsWith("temp_"))
    if (!ids.length) return
    fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_reactions", message_ids: ids }),
    }).then(r => r.json()).then(data => {
      if (data.reactions) setMsgReactions(data.reactions)
    }).catch(() => {})
  }, [msgs.length]) // eslint-disable-line

  // ═══════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════
  const sendMessage = async (msgText?: string) => {
    const finalText = msgText ?? text.trim()
    if (!finalText && images.length === 0 && attachments.length === 0) return
    if (!activeConv) return
    setSending(true); setShowEmoji(false); setShowAttach(false)

    // Reset polling to fast mode (expect response soon)
    noChangeCount.current = 0
    pollIntervalRef.current = 2000

    // Optimistic: add temp message
    const tempId = `temp_${Date.now()}`
    const tempMsg = {
      id: tempId, message: finalText || null,
      images: [...images, ...attachments.map(a => a.url)],
      sender_id: myEmpId, sender_role: "user",
      created_at: new Date().toISOString(), is_read: false, _sending: true,
      sender: null,
    }
    const optimistic = [...msgsRef.current, tempMsg]
    msgsRef.current = optimistic; setMsgs(optimistic)
    setText(""); setImages([]); setAttachments([]); setReplyTo(null); scrollToBottom(true)

    try {
      const allMedia = [...tempMsg.images]
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversation_id: activeConv.id, message: finalText || null, images: allMedia, reply_to_id: replyTo?.id || null }),
      })
      const d = await r.json()
      if (d.success && d.message) {
        // Replace temp with real
        const replaced = msgsRef.current.map((m: any) => m.id === tempId ? d.message : m)
        msgsRef.current = replaced; setMsgs(replaced)
      } else {
        // Remove temp on failure
        const rollback = msgsRef.current.filter((m: any) => m.id !== tempId)
        msgsRef.current = rollback; setMsgs(rollback)
      }
    } catch {
      const rollback = msgsRef.current.filter((m: any) => m.id !== tempId)
      msgsRef.current = rollback; setMsgs(rollback)
    }
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

  const goBack = () => {
    // Save current conversation to cache before leaving
    if (activeConv?.id && msgsRef.current.length > 0) {
      updateCache(activeConv.id, {
        msgs: msgsRef.current.filter((m: any) => !m._sending),
        conv: activeConv,
        members,
        pinned: pinnedMessage,
        ts: lastTsRef.current,
      })
    }
    cancelPending()
    setView("list"); setActiveConv(null); setMsgs([]); msgsRef.current = []
    setPinnedMessage(null); pollRef.current += 1
    lastTsRef.current = ""
    loadConversations()
  }

  // ── Computed ──
  const filteredConvs = useMemo(() => {
    let list = conversations
    if (activeTab !== "all") list = list.filter((c: any) => (c.type || "hr") === activeTab)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter((c: any) => {
        const ct = c.type || "hr"
        const name = ct === "direct"
          ? `${c.other_user?.first_name_th || ""} ${c.other_user?.last_name_th || ""} ${c.other_user?.nickname || ""}`
          : ct === "hr" ? "HR" : c.name || ""
        return name.toLowerCase().includes(q)
      })
    }
    return list
  }, [conversations, activeTab, searchQ])

  const filteredEmps = useMemo(() => {
    let list = employees
    if (view === "add_members") {
      const memberIds = new Set(members.map((m: any) => m.employee_id))
      list = list.filter((e: any) => !memberIds.has(e.id))
    }
    if (!empSearch.trim()) return list
    const q = empSearch.toLowerCase()
    return list.filter((e: any) =>
      `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code || ""}`.toLowerCase().includes(q)
    )
  }, [employees, empSearch, view, members])

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

  // ── Conv display helpers ──
  const getConvInfo = (c: any) => {
    const ct = c?.type || "hr"
    if (ct === "direct") {
      const u = c.other_user
      return {
        name: u ? `${u.nickname || u.first_name_th || ""} ${u.last_name_th || ""}`.trim() : "ผู้ใช้",
        avatar: u?.avatar_url, initials: u?.first_name_th?.[0] || "?",
        isOnline: u?.online?.is_online || false, lastSeen: u?.online?.last_seen,
        gradient: "from-blue-400 to-indigo-500",
      }
    }
    if (ct === "group") return {
      name: c.name || "กลุ่ม", avatar: c.avatar_url, initials: c.name?.[0] || "G",
      isOnline: false, lastSeen: null, gradient: "from-violet-400 to-purple-500",
    }
    if (ct === "department") return {
      name: c.name || "แผนก", avatar: null, initials: "#",
      isOnline: false, lastSeen: null, gradient: "from-amber-400 to-orange-500",
    }
    return {
      name: "แชทกับ HR", avatar: null, initials: "HR",
      isOnline: true, lastSeen: null, gradient: "from-green-400 to-emerald-500",
    }
  }

  const getChatHeader = (): any => {
    if (!activeConv) return { name: "", subtitle: "", avatar: null, initials: "", isOnline: false, lastSeen: null, gradient: "from-gray-400 to-gray-500" }
    const info = getConvInfo(activeConv)
    const ct = activeConv.type || "hr"
    let subtitle = ""
    if (ct === "hr") subtitle = "พร้อมให้บริการ"
    else if (ct === "direct" && info.isOnline) subtitle = "กำลังใช้งาน"
    else if (ct === "direct" && info.lastSeen) subtitle = `ใช้งาน${lastSeenText(info.lastSeen)}`
    else if (ct === "group" || ct === "department") {
      const mc = activeConv.member_count || members.length
      subtitle = mc > 0 ? `สมาชิก ${mc} คน` : ""
    }
    return { ...info, subtitle }
  }

  const myRole = useMemo(() => {
    const me = members.find((m: any) => m.employee_id === myEmpId)
    return me?.role || "member"
  }, [members, myEmpId])

  // ── Components ── (ใช้พื้นขาว + ตัวหนังสือเข้มเสมอ ไม่ว่าใครส่ง)
  const FileCard = ({ url }: { url: string; isMe?: boolean }) => {
    const fileName = getFileName(url)
    const ext = fileName.split(".").pop()?.toUpperCase() || url.split("?")[0].split(".").pop()?.toUpperCase() || "FILE"
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:shadow-md bg-white border border-gray-200 shadow-sm"
        style={{ minWidth: 200, maxWidth: 260 }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
          <span className="text-xl">{getFileIcon(url)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate text-gray-700">{fileName}</p>
          <p className="text-[10px] mt-0.5 text-gray-400">{ext} · แตะเพื่อเปิด</p>
        </div>
        <Download size={14} className="flex-shrink-0 text-gray-300" />
      </a>
    )
  }

  const OnlineDot = ({ size = 10, className = "" }: { size?: number; className?: string }) => (
    <span className={`absolute bg-green-500 border-2 border-white rounded-full ${className}`}
      style={{ width: size, height: size }} />
  )

  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30" style={{ top: 52, bottom: 56 }}>
      <div className="flex flex-col h-full bg-white">{children}</div>
      <style jsx global>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  )

  /* ═══════════════════════════════════════
     VIEW: CONVERSATION LIST
     ═══════════════════════════════════════ */
  if (view === "list") {
    return (
      <PageShell>
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black text-gray-900">แชท</h1>
            <div className="flex items-center gap-1.5">
              <button onClick={openNewGroup}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
                <Users size={17} className="text-gray-600" />
              </button>
              <button onClick={openNewChat}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm active:scale-90">
                <Plus size={17} className="text-white" />
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ค้นหาแชท..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap active:scale-95 ${
                  activeTab === t.key ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"
                }`}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Online now strip */}
        {(() => {
          const onlineUsers = conversations
            .filter((c: any) => c.type === "direct" && c.other_user?.online?.is_online)
            .map((c: any) => ({ ...c.other_user, conv_id: c.id }))
          if (!onlineUsers.length) return null
          return (
            <div className="flex-shrink-0 px-4 py-2 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">กำลังออนไลน์</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {onlineUsers.map((u: any) => (
                  <button key={u.id} onClick={() => openChat(u.conv_id, "direct")}
                    className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden ring-2 ring-green-400 ring-offset-2">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-white text-sm font-bold">{u.first_name_th?.[0]}</span>}
                      </div>
                      <OnlineDot size={12} className="-bottom-0.5 -right-0.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 w-14 truncate text-center">
                      {u.nickname || u.first_name_th}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="divide-y divide-gray-50">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-[52px] h-[52px] rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded-full w-24" />
                    <div className="h-3 bg-gray-100 rounded-full w-40" />
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full w-10" />
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400">{searchQ ? "ไม่พบผลลัพธ์" : "ยังไม่มีแชท"}</p>
              {!searchQ && <p className="text-xs text-gray-300 mt-1">กดปุ่ม + เพื่อเริ่มแชทใหม่</p>}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredConvs.map((c: any) => {
                const info = getConvInfo(c)
                const ct = c.type || "hr"
                const lm = c.last_message
                const unread = c.unread_count || 0
                const preview = lm?.message || (lm?.images?.length ? "📷 ส่งรูปภาพ" : "เริ่มสนทนา...")

                return (
                  <button key={c.id} onClick={() => openChat(c.id, ct)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left">
                    <div className="relative flex-shrink-0">
                      <div className={`rounded-full bg-gradient-to-br ${info.gradient} flex items-center justify-center overflow-hidden`}
                        style={{ width: 52, height: 52 }}>
                        {info.avatar
                          ? <img src={info.avatar} alt="" className="w-full h-full object-cover" />
                          : ct === "group" ? <Users size={20} className="text-white" />
                          : ct === "department" ? <Hash size={20} className="text-white" />
                          : <span className="text-white text-sm font-black">{info.initials}</span>}
                      </div>
                      {info.isOnline && <OnlineDot size={13} className="-bottom-0.5 -right-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[14px] truncate ${unread > 0 ? "font-black text-gray-900" : "font-semibold text-gray-800"}`}>{info.name}</p>
                        <span className={`text-[11px] flex-shrink-0 ${unread > 0 ? "text-blue-500 font-bold" : "text-gray-400"}`}>
                          {lm?.created_at ? timeAgo(lm.created_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[12px] truncate ${unread > 0 ? "text-gray-700 font-semibold" : "text-gray-400"}`}>{preview}</p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PageShell>
    )
  }

  /* ═══════════════════════════════════════
     VIEW: NEW CHAT (pick employee)
     ═══════════════════════════════════════ */
  if (view === "new_chat") {
    return (
      <PageShell>
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={goBack} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90">
            <ChevronLeft size={22} className="text-gray-600" />
          </button>
          <h2 className="text-[16px] font-black text-gray-800">แชทใหม่</h2>
        </div>
        <div className="flex-shrink-0 px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="ค้นหาพนักงาน..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-200" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingEmps ? (
            <div className="flex items-center justify-center py-12"><div className="w-7 h-7 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500" /></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredEmps.map((emp: any) => (
                <button key={emp.id} onClick={() => startDirectChat(emp.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden">
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white text-sm font-bold">{emp.first_name_th?.[0]}</span>}
                    </div>
                    {emp.online?.is_online && <OnlineDot size={11} className="-bottom-0.5 -right-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">{emp.nickname || emp.first_name_th} {emp.last_name_th}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {emp.department?.name || ""}
                      {emp.online?.is_online && <span className="text-green-500 font-semibold ml-1.5">ออนไลน์</span>}
                    </p>
                  </div>
                  <MessageCircle size={18} className="text-blue-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    )
  }

  /* ═══════════════════════════════════════
     VIEW: NEW GROUP / ADD MEMBERS
     ═══════════════════════════════════════ */
  if (view === "new_group" || view === "add_members") {
    const isAddMode = view === "add_members"
    return (
      <PageShell>
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => isAddMode ? setView("group_settings") : goBack()}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90">
            <ChevronLeft size={22} className="text-gray-600" />
          </button>
          <h2 className="text-[16px] font-black text-gray-800 flex-1">
            {isAddMode ? "เพิ่มสมาชิก" : "สร้างกลุ่มใหม่"}
          </h2>
          {(isAddMode ? selectedMembers.length > 0 : groupName.trim() && selectedMembers.length > 0) && (
            <button onClick={isAddMode ? addMembersToGroup : createGroup}
              className="px-4 py-1.5 bg-blue-500 text-white text-[12px] font-bold rounded-full active:scale-95 shadow-sm">
              {isAddMode ? "เพิ่ม" : "สร้าง"}
            </button>
          )}
        </div>

        {!isAddMode && (
          <div className="flex-shrink-0 px-4 pt-4 pb-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ชื่อกลุ่ม</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="ตั้งชื่อกลุ่ม..."
              className="w-full mt-1 px-3 py-2 bg-gray-100 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-blue-200" autoFocus />
          </div>
        )}

        {selectedMembers.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2">
            <p className="text-[11px] font-bold text-gray-400 mb-1.5">เลือกแล้ว {selectedMembers.length} คน</p>
            <div className="flex gap-1.5 flex-wrap">
              {selectedMembers.map((m: any) => (
                <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold">
                  {m.nickname || m.first_name_th}
                  <button onClick={() => setSelectedMembers(prev => prev.filter(p => p.id !== m.id))}
                    className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center"><X size={8} /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-4 py-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="ค้นหาพนักงาน..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingEmps ? (
            <div className="flex items-center justify-center py-12"><div className="w-7 h-7 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500" /></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredEmps.map((emp: any) => {
                const isSel = selectedMembers.some((m: any) => m.id === emp.id)
                return (
                  <button key={emp.id}
                    onClick={() => isSel ? setSelectedMembers(p => p.filter(x => x.id !== emp.id)) : setSelectedMembers(p => [...p, emp])}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white text-sm font-bold">{emp.first_name_th?.[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{emp.nickname || emp.first_name_th} {emp.last_name_th}</p>
                      <p className="text-[11px] text-gray-400 truncate">{emp.department?.name || ""}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSel ? "bg-blue-500" : "border-2 border-gray-300"
                    }`}>{isSel && <Check size={14} className="text-white" />}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PageShell>
    )
  }

  /* ═══════════════════════════════════════
     VIEW: GROUP SETTINGS
     ═══════════════════════════════════════ */
  if (view === "group_settings") {
    const info = getConvInfo(activeConv)
    const isGrpAdmin = myRole === "admin"

    return (
      <PageShell>
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("chat")}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90">
            <ChevronLeft size={22} className="text-gray-600" />
          </button>
          <h2 className="text-[16px] font-black text-gray-800">ตั้งค่ากลุ่ม</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center py-6 border-b border-gray-50">
            <div className="relative mb-3">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${info.gradient} flex items-center justify-center overflow-hidden`}>
                {activeConv?.avatar_url
                  ? <img src={activeConv.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <Users size={32} className="text-white" />}
              </div>
              {isGrpAdmin && (
                <button onClick={() => groupAvatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-md active:scale-90">
                  <Camera size={14} className="text-white" />
                </button>
              )}
              <input ref={groupAvatarRef} type="file" accept="image/*" className="hidden" onChange={updateGroupAvatar} />
            </div>

            {editingGroupName ? (
              <div className="flex items-center gap-2 px-4 w-full max-w-[280px]">
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  className="flex-1 text-center text-[16px] font-bold border-b-2 border-blue-500 outline-none py-1 bg-transparent" autoFocus />
                <button onClick={updateGroupName} className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center active:scale-90">
                  <Check size={16} className="text-white" />
                </button>
                <button onClick={() => setEditingGroupName(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center active:scale-90">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-black text-gray-800">{info.name}</h3>
                {isGrpAdmin && (
                  <button onClick={() => { setEditingGroupName(true); setNewGroupName(activeConv?.name || "") }}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
                    <Edit3 size={13} className="text-gray-500" />
                  </button>
                )}
              </div>
            )}
            <p className="text-[12px] text-gray-400 mt-1">สมาชิก {members.length} คน</p>
          </div>

          {/* Pinned message section */}
          {pinnedMessage && (
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Pin size={13} className="text-amber-500" />
                  <span className="text-[12px] font-bold text-gray-600">ข้อความที่ปักหมุด</span>
                </div>
                {isGrpAdmin && (
                  <button onClick={unpinMessage} className="text-[11px] text-red-400 font-semibold active:scale-95">ยกเลิก</button>
                )}
              </div>
              <p className="text-[12px] text-gray-500 line-clamp-2">{pinnedMessage.message || "📷 รูปภาพ"}</p>
            </div>
          )}

          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold text-gray-700">สมาชิก ({members.length})</p>
              {isGrpAdmin && (
                <button onClick={openAddMembers}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold active:scale-95">
                  <UserPlus size={13} /> เพิ่มสมาชิก
                </button>
              )}
            </div>

            <div className="space-y-1">
              {members.map((m: any) => {
                const emp = m.employee || {}
                const isMe = m.employee_id === myEmpId
                const name = `${emp.nickname || emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim() || "ไม่ระบุ"
                return (
                  <div key={m.employee_id || emp.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-white text-xs font-bold">{emp.first_name_th?.[0] || "?"}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">
                        {name} {isMe && <span className="text-gray-400 font-normal">(คุณ)</span>}
                      </p>
                      {m.role === "admin" && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Shield size={10} className="text-amber-500" />
                          <span className="text-[10px] text-amber-600 font-semibold">แอดมินกลุ่ม</span>
                        </div>
                      )}
                    </div>
                    {isGrpAdmin && !isMe && (
                      <button onClick={() => removeMember(m.employee_id)}
                        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-90">
                        <UserMinus size={14} className="text-red-400" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-50 space-y-2">
            <button onClick={leaveGroup}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-orange-600 active:bg-orange-100">
              <LogOut size={18} />
              <span className="text-[14px] font-bold">ออกจากกลุ่ม</span>
            </button>
            {isGrpAdmin && (
              <button onClick={() => setConfirmDelete("conversation")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 active:bg-red-100">
                <Trash2 size={18} />
                <span className="text-[14px] font-bold">ลบกลุ่มทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-[16px] font-black text-gray-800 text-center mb-1">ลบกลุ่มนี้?</h3>
              <p className="text-[13px] text-gray-500 text-center mb-4">ข้อความทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-bold active:bg-gray-200">ยกเลิก</button>
                <button onClick={() => { setConfirmDelete(null); deleteConversation() }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold active:bg-red-600">ลบ</button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    )
  }

  /* ═══════════════════════════════════════
     VIEW: CHAT ROOM
     ═══════════════════════════════════════ */
  const header = getChatHeader()
  const convType = activeConv?.type || "hr"

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30" style={{ top: 52, bottom: 56 }}>
        <div className="flex flex-col h-full bg-[#7494C0]">

          {/* ═══ CHAT HEADER ═══ */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-2 py-2 flex items-center gap-2">
            <button onClick={goBack}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90 flex-shrink-0">
              <ChevronLeft size={22} className="text-gray-600" />
            </button>
            <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${header.gradient} flex items-center justify-center overflow-hidden flex-shrink-0`}>
              {header.avatar
                ? <img src={header.avatar} alt="" className="w-full h-full object-cover" />
                : convType === "group"
                  ? <Users size={16} className="text-white" />
                  : <span className="text-white text-[11px] font-black">{header.initials}</span>}
              {header.isOnline && <OnlineDot size={10} className="-bottom-0 -right-0" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[14px] font-extrabold text-gray-800 truncate">{header.name}</h1>
              {header.subtitle && (
                <p className={`text-[10px] font-semibold -mt-0.5 ${
                  header.isOnline || convType === "hr" ? "text-green-500" : "text-gray-400"
                }`}>{header.subtitle}</p>
              )}
            </div>
            <button onClick={() => { setShowMsgSearch(!showMsgSearch); setMsgSearch(""); setMsgSearchResults([]) }}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90 flex-shrink-0">
              <Search size={16} className="text-gray-400" />
            </button>
            {(convType === "group" || convType === "department") && (
              <button onClick={() => setView("group_settings")}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-90 flex-shrink-0">
                <Settings size={18} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* ═══ MESSAGE SEARCH BAR ═══ */}
          {showMsgSearch && (
            <div className="bg-white border-b border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={msgSearch} onChange={e => { setMsgSearch(e.target.value); searchMessages(e.target.value) }}
                  placeholder="ค้นหาข้อความ..." autoFocus
                  className="flex-1 text-sm bg-transparent outline-none" />
                {msgSearch && <button onClick={() => { setMsgSearch(""); setMsgSearchResults([]) }} className="text-gray-400"><X size={14}/></button>}
              </div>
              {msgSearchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {msgSearchResults.map(r => (
                    <button key={r.id} onClick={() => { setShowMsgSearch(false); /* TODO: scroll to message */ }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 transition">
                      <p className="text-xs text-gray-500 truncate">{r.message}</p>
                      <p className="text-[10px] text-gray-400">{r.sender?.first_name_th || ""} · {new Date(r.created_at).toLocaleDateString("th-TH", { day:"numeric", month:"short" })}</p>
                    </button>
                  ))}
                </div>
              )}
              {msgSearch.length >= 2 && msgSearchResults.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-3">ไม่พบข้อความ</p>
              )}
            </div>
          )}

          {/* ═══ PINNED MESSAGE BANNER ═══ */}
          {pinnedMessage && showPinBanner && (
            <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center gap-2">
              <Pin size={13} className="text-amber-500 flex-shrink-0" />
              <p className="flex-1 text-[11px] text-amber-800 font-medium truncate">
                {pinnedMessage.message || "📷 รูปภาพ"}
              </p>
              <button onClick={() => setShowPinBanner(false)} className="flex-shrink-0 active:scale-90">
                <X size={14} className="text-amber-400" />
              </button>
            </div>
          )}

          {/* ═══ MESSAGES AREA ═══ */}
          <div ref={chatRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain relative">
            <div className="px-3 py-3 min-h-full">
              {loadingChat ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="w-8 h-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                  <p className="text-xs text-white/60">กำลังโหลด...</p>
                </div>
              ) : (
                <>
                  {msgs.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircle size={28} className="text-white/70" />
                      </div>
                      <p className="text-base font-bold text-white">สวัสดีครับ/ค่ะ!</p>
                      <p className="text-[12px] text-white/60 mt-1">
                        {convType === "hr" ? "มีอะไรให้ช่วยเหลือ สอบถามได้เลย" : "เริ่มสนทนากันเลย!"}
                      </p>
                    </div>
                  )}

                  {convType === "hr" && msgs.length < 3 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mb-3 px-1">
                      {QUICK_SUGGESTIONS.map(s => (
                        <button key={s.label} onClick={() => sendMessage(s.label)} disabled={sending}
                          className="px-3 py-1.5 bg-white/90 rounded-full text-[11px] font-bold text-green-600 active:scale-95 shadow-sm flex items-center gap-1">
                          <span>{s.icon}</span><span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {grouped.map(g => (
                    <div key={g.date}>
                      <div className="flex justify-center my-2.5">
                        <span className="px-3 py-0.5 bg-black/20 text-white/90 text-[10px] font-medium rounded-full">{fmtDate(g.date)}</span>
                      </div>

                      {g.msgs.map((m: any, mi: number) => {
                        const isMe = convType === "hr" ? m.sender_role === "user" : m.sender_id === myEmpId
                        const senderName = m.sender ? (m.sender.nickname || m.sender.first_name_th) : "HR"
                        const allMedia = m.images || []
                        const imgUrls = allMedia.filter((u: string) => isImageUrl(u))
                        const fileUrls = allMedia.filter((u: string) => !isImageUrl(u))
                        const isConsecutive = mi > 0 && g.msgs[mi - 1]?.sender_id === m.sender_id
                        const showAvatar = !isMe && !isConsecutive
                        const isSending = m._sending
                        const isPinned = pinnedMessage?.id === m.id

                        const handleMsgTouchStart = (e: React.TouchEvent) => {
                          const touch = e.touches[0]
                          const x = touch.clientX; const y = touch.clientY
                          longPressTimer.current = setTimeout(() => {
                            const firstImg = imgUrls.length > 0 ? imgUrls[0] : undefined
                            setContextMenu({ msgId: m.id, isMe, x, y, hasImage: firstImg })
                          }, 500)
                        }
                        const handleMsgTouchEnd = () => {
                          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
                        }
                        const handleMsgContextMenu = (e: React.MouseEvent) => {
                          e.preventDefault()
                          const firstImg = imgUrls.length > 0 ? imgUrls[0] : undefined
                          setContextMenu({ msgId: m.id, isMe, x: e.clientX, y: e.clientY, hasImage: firstImg })
                        }

                        return (
                          <div key={m.id}
                            className={`flex gap-1.5 ${isConsecutive ? "mt-0.5" : "mt-2"} ${isMe ? "justify-end" : "justify-start"} ${isSending ? "opacity-60" : ""}`}
                            onTouchStart={handleMsgTouchStart}
                            onTouchEnd={handleMsgTouchEnd}
                            onTouchMove={handleMsgTouchEnd}
                            onContextMenu={handleMsgContextMenu}
                          >
                            {!isMe && (
                              <div className="w-7 flex-shrink-0 mt-auto">
                                {showAvatar ? (
                                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {m.sender?.avatar_url
                                      ? <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                      : <span className="text-[8px] font-black text-green-600">{senderName?.[0] || "?"}</span>}
                                  </div>
                                ) : <div className="w-7" />}
                              </div>
                            )}

                            <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              {!isMe && showAvatar && convType !== "direct" && (
                                <span className="text-[10px] text-white/60 font-medium ml-1 mb-0.5">{senderName}</span>
                              )}

                              {/* Pinned indicator */}
                              {isPinned && (
                                <div className="flex items-center gap-0.5 mb-0.5">
                                  <Pin size={9} className="text-amber-400" />
                                  <span className="text-[9px] text-amber-300 font-medium">ปักหมุด</span>
                                </div>
                              )}

                              {imgUrls.length > 0 && (
                                <div className={`grid gap-1 mb-0.5 ${imgUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`} style={{ maxWidth: 230 }}>
                                  {imgUrls.map((url: string, ii: number) => (
                                    <div key={ii} className="relative group">
                                      <img src={url} alt="" loading="lazy" onClick={() => openGallery(url)}
                                        className={`rounded-2xl object-cover cursor-pointer shadow ${imgUrls.length === 1 ? "max-h-[200px] w-full" : "h-[100px] w-full"}`} />
                                      {/* Image count badge for multiple images */}
                                      {imgUrls.length > 1 && ii === 0 && (
                                        <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                          {imgUrls.length}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {fileUrls.length > 0 && (
                                <div className="space-y-0.5 mb-0.5">
                                  {fileUrls.map((url: string, fi: number) => <FileCard key={fi} url={url} isMe={isMe} />)}
                                </div>
                              )}

                              {/* Reply quote */}
                              {m.reply_to && m.reply_to.message && (
                                <div className={`px-3 py-1.5 mb-0.5 rounded-xl text-[11px] border-l-2 ${isMe ? "bg-green-600/30 border-white/40 text-white/80" : "bg-gray-100 border-indigo-300 text-gray-500"}`}>
                                  <span className="font-bold">{m.reply_to.sender?.nickname || m.reply_to.sender?.first_name_th || ""}</span>
                                  <p className="truncate">{m.reply_to.message}</p>
                                </div>
                              )}

                              {m.message && (
                                <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                  <div className={`px-3 py-2 text-[13px] leading-[1.5] whitespace-pre-wrap break-words ${
                                    isMe ? "bg-[#06C755] text-white rounded-[18px] rounded-br-[5px]"
                                      : "bg-white text-gray-800 rounded-[18px] rounded-bl-[5px] shadow-sm"
                                  }`}>{m.message}</div>
                                  {!isConsecutive && (
                                    <div className="flex-shrink-0 flex flex-col items-end gap-0 pb-0.5">
                                      {isMe && m.is_read && <span className="text-[8px] text-white/50 leading-none">อ่านแล้ว</span>}
                                      <span className="text-[9px] text-white/40 leading-none">{fmtTime(m.created_at)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {!m.message && !isConsecutive && (
                                <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                                  {isMe && m.is_read && <span className="text-[8px] text-white/50">อ่านแล้ว</span>}
                                  <span className="text-[9px] text-white/40">{fmtTime(m.created_at)}</span>
                                </div>
                              )}

                              {/* Reactions display */}
                              {(msgReactions[m.id] || []).length > 0 && (
                                <div className={`flex gap-0.5 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                                  {Object.entries((msgReactions[m.id] || []).reduce((acc: Record<string, number>, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc }, {})).map(([emoji, count]) => (
                                    <button key={emoji} onClick={() => reactToMessage(m.id, emoji)}
                                      className="flex items-center gap-0.5 bg-white/90 border border-gray-200 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm active:scale-95">
                                      {emoji}<span className="text-gray-500 font-bold">{count as number}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Quick action: reply + react (show on hover/tap) */}
                              {!m._sending && (
                                <div className={`flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? "justify-end" : "justify-start"}`}>
                                  <button onClick={() => setReplyTo({ id: m.id, message: m.message || "📷", senderName: m.sender?.nickname || m.sender?.first_name_th || "" })}
                                    className="text-[9px] text-gray-400 hover:text-indigo-500 px-1.5 py-0.5 rounded bg-white/80">ตอบ</button>
                                  <button onClick={() => setShowReactionPicker(showReactionPicker === m.id ? null : m.id)}
                                    className="text-[9px] text-gray-400 hover:text-indigo-500 px-1.5 py-0.5 rounded bg-white/80">😊</button>
                                </div>
                              )}

                              {/* Reaction picker popup */}
                              {showReactionPicker === m.id && (
                                <div className={`flex gap-0.5 bg-white rounded-full shadow-xl border border-gray-200 px-1.5 py-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}
                                  style={{ animation: "scaleIn .15s ease" }}>
                                  {["👍","❤️","😂","😮","😢","🔥"].map(e => (
                                    <button key={e} onClick={() => reactToMessage(m.id, e)}
                                      className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-gray-100 active:scale-110 transition-all">{e}</button>
                                  ))}
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

            {showScroll && (
              <button onClick={() => scrollToBottom()}
                className="sticky bottom-2 left-[calc(100%-44px)] w-8 h-8 bg-white/80 rounded-full shadow flex items-center justify-center z-10 active:scale-90">
                <ChevronDown size={16} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* ═══ TYPING INDICATOR ═══ */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1.5 bg-white/80 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {typingUsers.map(t => t.name).join(", ")} กำลังพิมพ์...
                </span>
              </div>
            </div>
          )}

          {/* ═══ REPLY BAR ═══ */}
          {replyTo && (
            <div className="px-4 py-2 bg-indigo-50/80 border-t border-indigo-100 flex items-center gap-2">
              <div className="w-1 h-8 bg-indigo-400 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-indigo-600">{replyTo.senderName}</p>
                <p className="text-[11px] text-gray-500 truncate">{replyTo.message}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
          )}

          {/* ═══ BOTTOM INPUT ═══ */}
          <div className="flex-shrink-0 bg-white">
            {showEmoji && (
              <div className="border-t border-gray-100 px-2 py-1.5 flex gap-0.5 overflow-x-auto no-scrollbar">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => sendMessage(e)}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-lg active:scale-90 flex-shrink-0">{e}</button>
                ))}
              </div>
            )}

            {showAttach && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex gap-5 justify-center">
                <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-95">
                  <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center shadow"><ImagePlus size={18} className="text-white" /></div>
                  <span className="text-[9px] font-bold text-gray-500">รูปภาพ</span>
                </button>
                <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-95">
                  <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center shadow"><Camera size={18} className="text-white" /></div>
                  <span className="text-[9px] font-bold text-gray-500">กล้อง</span>
                </button>
                <button onClick={() => docRef.current?.click()} className="flex flex-col items-center gap-1 active:scale-95">
                  <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center shadow"><File size={18} className="text-white" /></div>
                  <span className="text-[9px] font-bold text-gray-500">ไฟล์</span>
                </button>
              </div>
            )}

            {(images.length > 0 || attachments.length > 0) && (
              <div className="border-t border-gray-100 px-3 py-1.5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {images.map((url, i) => (
                    <div key={`i${i}`} className="relative flex-shrink-0">
                      <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      <button onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={8} /></button>
                    </div>
                  ))}
                  {attachments.map((f, i) => (
                    <div key={`f${i}`} className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                        <span className="text-base">{getFileIcon(f.name || f.url)}</span>
                        <span className="text-[6px] text-gray-400 font-bold">{f.name?.split(".").pop()?.toUpperCase()}</span>
                      </div>
                      <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={8} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="px-4 py-1.5 flex items-center gap-2 bg-green-50 border-t border-gray-100">
                <div className="w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                <span className="text-[11px] text-green-600 font-semibold">กำลังอัปโหลด...</span>
              </div>
            )}

            <div className="border-t border-gray-100 px-2 py-1 flex items-end gap-1">
              <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false) }}
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center active:scale-90 ${showAttach ? "bg-gray-300 rotate-45" : "bg-gray-100"}`}>
                <Plus size={18} className="text-gray-500" />
              </button>
              <div className="flex-1 bg-gray-100 rounded-[20px] px-3 py-1.5 flex items-end min-h-[36px] max-h-[88px]">
                <textarea value={text} onChange={e => { setText(e.target.value); sendTyping() }} onKeyDown={handleKeyDown}
                  onFocus={() => { setShowEmoji(false); setShowAttach(false) }}
                  placeholder="Aa" rows={1}
                  className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 resize-none outline-none max-h-[64px]"
                  style={{ lineHeight: "1.4" }} />
              </div>
              <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false) }}
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center active:scale-90 ${showEmoji ? "text-green-500" : "text-gray-400"}`}>
                <Smile size={20} />
              </button>
              {hasContent ? (
                <button onClick={() => sendMessage()} disabled={sending}
                  className="w-8 h-8 flex-shrink-0 rounded-full bg-[#06C755] flex items-center justify-center shadow active:scale-90">
                  {sending ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send size={14} className="text-white ml-0.5" />}
                </button>
              ) : <div className="w-8 flex-shrink-0" />}
            </div>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar,.7z,.mp3,.mp4,.mov" multiple className="hidden" onChange={handleFileUpload} />

      {/* ═══ IMAGE GALLERY VIEWER ═══ */}
      {showGallery && galleryImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onTouchStart={handleGalleryTouchStart}
          onTouchEnd={handleGalleryTouchEnd}
        >
          {/* Gallery header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3">
            <button onClick={() => setShowGallery(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
              <X size={20} className="text-white" />
            </button>
            <span className="text-white/70 text-[13px] font-medium">
              {galleryIndex + 1} / {galleryImages.length}
            </span>
            <button onClick={() => saveImage(galleryImages[galleryIndex].url)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
              <Download size={18} className="text-white" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <img src={galleryImages[galleryIndex].url} alt=""
              className="max-w-[95%] max-h-[80vh] object-contain select-none"
              draggable={false}
              onClick={e => e.stopPropagation()} />

            {/* Navigation arrows */}
            {galleryIndex > 0 && (
              <button onClick={galleryPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center active:scale-90">
                <ArrowLeft size={18} className="text-white" />
              </button>
            )}
            {galleryIndex < galleryImages.length - 1 && (
              <button onClick={galleryNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center active:scale-90">
                <ArrowRight size={18} className="text-white" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <div className="flex-shrink-0 py-3 px-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar justify-center">
                {galleryImages.map((img, i) => (
                  <button key={i} onClick={() => setGalleryIndex(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      i === galleryIndex ? "border-white scale-105" : "border-transparent opacity-50"
                    }`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex-shrink-0 text-center pb-4">
            <span className="text-white/40 text-[11px]">{fmtDate(galleryImages[galleryIndex]?.time)} {fmtTime(galleryImages[galleryIndex]?.time)}</span>
          </div>
        </div>
      )}

      {/* ═══ CONTEXT MENU (enhanced with pin & save) ═══ */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div className="absolute bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[160px] overflow-hidden"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
            onClick={e => e.stopPropagation()}>

            {/* Copy text */}
            {(() => {
              const msg = msgsRef.current.find((m: any) => m.id === contextMenu.msgId)
              if (msg?.message) return (
                <button onClick={() => { navigator.clipboard.writeText(msg.message); setContextMenu(null) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100">
                  <Copy size={15} className="text-gray-500" />
                  <span className="text-[13px] font-semibold text-gray-700">คัดลอกข้อความ</span>
                </button>
              )
              return null
            })()}

            {/* Pin message */}
            {convType !== "hr" && (
              pinnedMessage?.id === contextMenu.msgId ? (
                <button onClick={() => { unpinMessage(); setContextMenu(null) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100">
                  <Pin size={15} className="text-amber-500" />
                  <span className="text-[13px] font-semibold text-amber-600">ยกเลิกปักหมุด</span>
                </button>
              ) : (
                <button onClick={() => { pinMessage(contextMenu.msgId); setContextMenu(null) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100">
                  <Pin size={15} className="text-amber-500" />
                  <span className="text-[13px] font-semibold text-gray-700">ปักหมุดข้อความ</span>
                </button>
              )
            )}

            {/* Save image */}
            {contextMenu.hasImage && (
              <button onClick={() => { saveImage(contextMenu.hasImage!); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100">
                <Download size={15} className="text-blue-500" />
                <span className="text-[13px] font-semibold text-gray-700">บันทึกรูปภาพ</span>
              </button>
            )}

            {/* Delete (own messages only) */}
            {contextMenu.isMe && (
              <button onClick={() => { setConfirmMsgDelete(contextMenu.msgId); setContextMenu(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-red-50 active:bg-red-100">
                <Trash2 size={15} className="text-red-500" />
                <span className="text-[13px] font-semibold text-red-600">ลบข้อความ</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message delete confirmation */}
      {confirmMsgDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8" onClick={() => setConfirmMsgDelete(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-[300px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-[15px] font-black text-gray-800 text-center mb-1">ลบข้อความนี้?</h3>
            <p className="text-[12px] text-gray-500 text-center mb-4">ข้อความจะถูกลบถาวร</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmMsgDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-bold active:bg-gray-200">ยกเลิก</button>
              <button onClick={() => { deleteMessage(confirmMsgDelete); setConfirmMsgDelete(null) }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold active:bg-red-600">ลบ</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </>
  )
}
