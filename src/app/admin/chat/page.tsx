"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Send, ImagePlus, X, MessageCircle, ArrowLeft, Search,
  Check, CheckCheck, Smile, Paperclip, Download,
  Plus, Users, Megaphone, Loader2, Building2, ChevronDown, UserCheck,
  Filter, Hash, Clock, Bell,
} from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

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

  // ── New chat / Broadcast state ──
  const [view, setView] = useState<"list"|"pick"|"broadcast">("list")
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [empLoading, setEmpLoading] = useState(false)
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set())
  const [broadcastMsg, setBroadcastMsg] = useState("")
  const [broadcasting, setBroadcasting] = useState(false)
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const msgsRef = useRef<any[]>([])
  const convsRef = useRef<any[]>([])
  const deptDropdownRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" }), 30)
  }, [])

  // Close dept dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) setShowDeptDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
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

  // ── Load employees for picker ──
  const loadEmployees = useCallback(async () => {
    setEmpLoading(true)
    try {
      const r = await fetch("/api/chat?mode=employees")
      const d = await r.json()
      setEmployees(d.employees ?? [])
      setDepartments(d.departments ?? [])
    } catch { toast.error("โหลดรายชื่อไม่สำเร็จ") }
    finally { setEmpLoading(false) }
  }, [])

  const openPicker = (mode: "pick" | "broadcast") => {
    setView(mode); setEmpSearch(""); setSelectedEmps(new Set()); setBroadcastMsg("")
    setSelectedDept("all"); loadEmployees()
  }

  // ── Start new HR chat with single employee ──
  const startChatWith = async (targetEmpId: string) => {
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_hr_chat", target_employee_id: targetEmpId }),
      })
      const d = await r.json()
      if (d.conversation_id) {
        setView("list")
        setSelectedId(d.conversation_id)
        loadMsgs(d.conversation_id, true)
        const emp = employees.find((e: any) => e.id === targetEmpId)
        if (emp) setSelectedEmp(emp)
        loadConvs(true)
      } else { toast.error(d.error || "เริ่มแชทไม่สำเร็จ") }
    } catch { toast.error("เริ่มแชทไม่สำเร็จ") }
  }

  // ── Toggle employee selection for broadcast ──
  const toggleEmp = (id: string) => {
    setSelectedEmps(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Select/deselect all visible employees ──
  const selectAllVisible = () => {
    const visible = filteredEmps
    if (visible.every((e: any) => selectedEmps.has(e.id))) {
      // Deselect all visible
      setSelectedEmps(prev => {
        const next = new Set(prev)
        visible.forEach((e: any) => next.delete(e.id))
        return next
      })
    } else {
      // Select all visible
      setSelectedEmps(prev => {
        const next = new Set(prev)
        visible.forEach((e: any) => next.add(e.id))
        return next
      })
    }
  }

  // ── Select entire department ──
  const selectDept = (deptId: string) => {
    const deptEmps = employees.filter((e: any) => e.department_id === deptId)
    const allSelected = deptEmps.every((e: any) => selectedEmps.has(e.id))
    setSelectedEmps(prev => {
      const next = new Set(prev)
      deptEmps.forEach((e: any) => allSelected ? next.delete(e.id) : next.add(e.id))
      return next
    })
  }

  // ── Send broadcast ──
  const sendBroadcast = async () => {
    if (selectedEmps.size === 0 || !broadcastMsg.trim()) return
    setBroadcasting(true)
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          target_employee_ids: Array.from(selectedEmps),
          message: broadcastMsg.trim(),
        }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success(`ส่งข้อความถึง ${d.sent}/${d.total} คนสำเร็จ`)
        setView("list"); loadConvs()
      } else { toast.error(d.error || "ส่งไม่สำเร็จ") }
    } catch { toast.error("ส่งข้อความไม่สำเร็จ") }
    finally { setBroadcasting(false) }
  }

  // ── Filter employees by search + department ──
  const filteredEmps = useMemo(() => employees.filter((e: any) => {
    if (selectedDept !== "all" && e.department_id !== selectedDept) return false
    if (!empSearch) return true
    return `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code} ${e.department?.name || ""}`.toLowerCase().includes(empSearch.toLowerCase())
  }), [employees, empSearch, selectedDept])

  // ── Group filtered employees by department ──
  const groupedByDept = useMemo(() => {
    const map: Record<string, { name: string; emps: any[] }> = {}
    const noDepth: any[] = []
    for (const e of filteredEmps) {
      const deptName = e.department?.name
      const deptId = e.department_id
      if (deptId && deptName) {
        if (!map[deptId]) map[deptId] = { name: deptName, emps: [] }
        map[deptId].emps.push(e)
      } else {
        noDepth.push(e)
      }
    }
    const sorted = Object.entries(map).sort((a, b) => a[1].name.localeCompare(b[1].name, "th"))
    if (noDepth.length > 0) sorted.push(["none", { name: "ไม่ระบุแผนก", emps: noDepth }])
    return sorted
  }, [filteredEmps])

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
    return `${emp.first_name_th || ""} ${emp.last_name_th || ""} ${emp.nickname || ""} ${emp.employee_code || ""} ${emp.department?.name || ""}`
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

  // ── Department badge color ──
  const deptColor = (idx: number) => {
    const colors = [
      "bg-blue-50 text-blue-700 border-blue-200",
      "bg-emerald-50 text-emerald-700 border-emerald-200",
      "bg-violet-50 text-violet-700 border-violet-200",
      "bg-amber-50 text-amber-700 border-amber-200",
      "bg-rose-50 text-rose-700 border-rose-200",
      "bg-cyan-50 text-cyan-700 border-cyan-200",
      "bg-pink-50 text-pink-700 border-pink-200",
      "bg-teal-50 text-teal-700 border-teal-200",
    ]
    return colors[idx % colors.length]
  }

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

  // ── Employee Card Component ──
  const EmpCard = ({ e, mode, checked }: { e: any; mode: "pick" | "broadcast"; checked?: boolean }) => (
    <button
      onClick={() => mode === "pick" ? startChatWith(e.id) : toggleEmp(e.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left group ${
        mode === "broadcast" && checked
          ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-sm"
          : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md hover:bg-gradient-to-r hover:from-slate-50 hover:to-white"
      }`}
    >
      {mode === "broadcast" && (
        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? "bg-indigo-500 border-indigo-500 shadow-sm shadow-indigo-200" : "border-slate-300 group-hover:border-indigo-300"
        }`}>
          {checked && <Check size={12} className="text-white" />}
        </div>
      )}
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black overflow-hidden shadow-sm ${
          mode === "broadcast" && checked
            ? "bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-indigo-200"
            : "bg-gradient-to-br from-slate-300 to-slate-400"
        }`}>
          {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover" /> : e.first_name_th?.[0]}
        </div>
        {e.online?.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">{e.first_name_th} {e.last_name_th} {e.nickname ? `(${e.nickname})` : ""}</p>
        <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
          <span className="font-mono">{e.employee_code}</span>
          {e.department?.name && <><span className="text-slate-200">·</span><span>{e.department.name}</span></>}
        </p>
      </div>
      {mode === "pick" && (
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageCircle size={14} className="text-indigo-500" />
        </div>
      )}
    </button>
  )

  // ══════════════════════════════════════════════════════════
  // ── EMPLOYEE PICKER VIEW (เลือกพนักงานเพื่อเริ่มแชท) ──
  // ══════════════════════════════════════════════════════════
  if (!selectedId && view === "pick") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Plus size={15} className="text-white" />
              </div>
              เริ่มแชทกับพนักงาน
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-10">เลือกพนักงานเพื่อเริ่มสนทนา HR</p>
          </div>
        </div>

        {/* Search + Department Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={empSearch} onChange={(e: any) => setEmpSearch(e.target.value)} placeholder="ค้นหาชื่อ, รหัส..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-sm" />
          </div>
          {/* Dept dropdown */}
          <div className="relative" ref={deptDropdownRef}>
            <button onClick={() => setShowDeptDropdown(!showDeptDropdown)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm whitespace-nowrap ${
                selectedDept !== "all" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <Building2 size={14} />
              {selectedDept === "all" ? "ทุกแผนก" : departments.find((d: any) => d.id === selectedDept)?.name || "แผนก"}
              <ChevronDown size={13} className={`transition-transform ${showDeptDropdown ? "rotate-180" : ""}`} />
            </button>
            {showDeptDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto py-1">
                  <button onClick={() => { setSelectedDept("all"); setShowDeptDropdown(false) }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${
                      selectedDept === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                    }`}>
                    <Users size={14} /> ทุกแผนก
                    <span className="ml-auto text-[11px] text-slate-400">{employees.length}</span>
                  </button>
                  <div className="h-px bg-slate-100 mx-3 my-1" />
                  {departments.map((d: any) => (
                    <button key={d.id} onClick={() => { setSelectedDept(d.id); setShowDeptDropdown(false) }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${
                        selectedDept === d.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <Building2 size={14} /> <span className="truncate flex-1 text-left">{d.name}</span>
                      <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{d.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
          <Hash size={11} /> พบ {filteredEmps.length} คน
          {selectedDept !== "all" && (
            <button onClick={() => setSelectedDept("all")} className="text-indigo-500 hover:text-indigo-700 font-bold ml-1">ล้างตัวกรอง</button>
          )}
        </div>

        {/* Employee list grouped by department */}
        {empLoading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-indigo-400" />
            </div>
            <p className="text-xs text-slate-400">กำลังโหลดรายชื่อ...</p>
          </div>
        ) : filteredEmps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">ไม่พบพนักงาน</p>
            <p className="text-[11px] text-slate-300 mt-1">ลองเปลี่ยนคำค้นหาหรือแผนก</p>
          </div>
        ) : selectedDept !== "all" ? (
          // Flat list when filtering by dept
          <div className="space-y-1.5">
            {filteredEmps.map((e: any) => <EmpCard key={e.id} e={e} mode="pick" />)}
          </div>
        ) : (
          // Grouped by department
          <div className="space-y-4">
            {groupedByDept.map(([deptId, { name, emps }], idx) => (
              <div key={deptId}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${deptColor(idx)}`}>
                    <Building2 size={10} className="inline mr-1 -mt-0.5" />{name}
                  </span>
                  <span className="text-[10px] text-slate-300">{emps.length} คน</span>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
                <div className="space-y-1">
                  {emps.map((e: any) => <EmpCard key={e.id} e={e} mode="pick" />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // ── BROADCAST VIEW (ส่งข้อความหลายคน / ตามแผนก) ──
  // ══════════════════════════════════════════════════════════
  if (!selectedId && view === "broadcast") {
    const allVisibleSelected = filteredEmps.length > 0 && filteredEmps.every((e: any) => selectedEmps.has(e.id))
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                <Megaphone size={15} className="text-white" />
              </div>
              ส่งข้อความกลุ่ม
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-10">เลือกพนักงานหรือเลือกตามแผนก แล้วพิมพ์ข้อความ</p>
          </div>
        </div>

        {/* Quick dept buttons */}
        {departments.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-2 px-1 flex items-center gap-1.5">
              <Building2 size={11} /> เลือกทั้งแผนก
            </p>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d: any, idx: number) => {
                const deptEmps = employees.filter((e: any) => e.department_id === d.id)
                const allDeptSelected = deptEmps.length > 0 && deptEmps.every((e: any) => selectedEmps.has(e.id))
                const someSelected = deptEmps.some((e: any) => selectedEmps.has(e.id))
                return (
                  <button key={d.id} onClick={() => selectDept(d.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      allDeptSelected
                        ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-indigo-400 shadow-md shadow-indigo-200/50"
                        : someSelected
                          ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                    }`}>
                    {allDeptSelected ? <UserCheck size={12} /> : <Building2 size={12} />}
                    {d.name}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      allDeptSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                    }`}>{d.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected count + search */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={empSearch} onChange={(e: any) => setEmpSearch(e.target.value)} placeholder="ค้นหาพนักงาน..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
          </div>
          <button onClick={selectAllVisible}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shadow-sm ${
              allVisibleSelected ? "bg-indigo-500 text-white border-indigo-400" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}>
            {allVisibleSelected ? "ยกเลิก" : "เลือกทั้งหมด"}
          </button>
        </div>

        {/* Dept filter pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button onClick={() => setSelectedDept("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              selectedDept === "all" ? "bg-slate-800 text-white border-slate-700" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            }`}>
            ทั้งหมด ({employees.length})
          </button>
          {departments.map((d: any) => (
            <button key={d.id} onClick={() => setSelectedDept(selectedDept === d.id ? "all" : d.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                selectedDept === d.id ? "bg-slate-800 text-white border-slate-700" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
              }`}>
              {d.name} ({d.count})
            </button>
          ))}
        </div>

        {/* Selected badge */}
        {selectedEmps.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Users size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-indigo-700">เลือกแล้ว {selectedEmps.size} คน</p>
              <p className="text-[10px] text-indigo-400">
                {(() => {
                  const deptCounts: Record<string, number> = {}
                  employees.filter((e: any) => selectedEmps.has(e.id)).forEach((e: any) => {
                    const name = e.department?.name || "ไม่ระบุ"
                    deptCounts[name] = (deptCounts[name] || 0) + 1
                  })
                  return Object.entries(deptCounts).map(([n, c]) => `${n} (${c})`).join(", ")
                })()}
              </p>
            </div>
            <button onClick={() => setSelectedEmps(new Set())} className="text-xs text-indigo-400 hover:text-indigo-600 font-bold">ล้าง</button>
          </div>
        )}

        {/* Employee list with checkboxes */}
        {empLoading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 size={22} className="animate-spin text-indigo-400" /><p className="text-xs text-slate-400">กำลังโหลด...</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[250px] overflow-y-auto rounded-2xl">
            {filteredEmps.map((e: any) => (
              <EmpCard key={e.id} e={e} mode="broadcast" checked={selectedEmps.has(e.id)} />
            ))}
            {filteredEmps.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">ไม่พบพนักงาน</p>
            )}
          </div>
        )}

        {/* Message input + send */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <textarea value={broadcastMsg} onChange={(e: any) => setBroadcastMsg(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการส่ง..." rows={3}
              className="w-full px-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-sm" />
            {broadcastMsg.trim() && (
              <span className="absolute bottom-3 right-3 text-[10px] text-slate-300">{broadcastMsg.length} ตัวอักษร</span>
            )}
          </div>
          <button onClick={sendBroadcast} disabled={broadcasting || selectedEmps.size === 0 || !broadcastMsg.trim()}
            className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2.5 ${
              selectedEmps.size > 0 && broadcastMsg.trim()
                ? "bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl active:scale-[0.98]"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }`}>
            {broadcasting ? <><Loader2 size={16} className="animate-spin" /> กำลังส่ง...</>
              : <><Send size={16} /> ส่งข้อความถึง {selectedEmps.size} คน</>}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // ── CONVERSATION LIST VIEW ──
  // ══════════════════════════════════════════════════════════
  if (!selectedId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <span className="block leading-tight">แชท HR</span>
              <span className="text-[11px] font-medium text-slate-400 block -mt-0.5">สนทนากับพนักงาน</span>
            </div>
          </h1>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-100 shadow-sm">
              <Bell size={13} className="text-red-500" />
              <span className="text-xs font-black text-red-600">{totalUnread} ข้อความใหม่</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => openPicker("pick")}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200/40 hover:shadow-xl transition-all active:scale-[0.98]">
            <Plus size={16} /> เริ่มแชทใหม่
          </button>
          <button onClick={() => openPicker("broadcast")}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-amber-200/40 hover:shadow-xl transition-all active:scale-[0.98]">
            <Megaphone size={16} /> ส่งกลุ่ม/แผนก
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={search} onChange={(e: any) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, แผนก..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-sm" />
          </div>
          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {(["all","unread"] as const).map((f: any) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-2.5 text-xs font-bold transition-all ${
                  filter === f
                    ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-50"
                }`}>
                {f === "all" ? "ทั้งหมด" : "ยังไม่อ่าน"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-500" />
            </div>
            <p className="text-xs text-slate-400">กำลังโหลดสนทนา...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
              <MessageCircle size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">
              {filter === "unread" ? "ไม่มีข้อความที่ยังไม่อ่าน" : "ยังไม่มีการสนทนา"}
            </p>
            <p className="text-xs text-slate-300 mt-1.5">กดปุ่ม &quot;เริ่มแชทใหม่&quot; เพื่อทักพนักงาน</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c: any) => {
              const emp = c.employee || {}
              const name = emp.nickname || `${emp.first_name_th || ""} ${emp.last_name_th || ""}`.trim() || "ไม่ระบุ"
              const dept = emp.department?.name || ""
              const lastMsg = c.last_message
              const unread = c.unread_count || 0
              return (
                <button key={c.id} onClick={() => openConv(c)}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl border transition-all hover:shadow-lg group ${
                    unread > 0
                      ? "bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border-indigo-100 shadow-md shadow-indigo-100/30"
                      : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                  }`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black overflow-hidden shadow-sm ${
                      unread > 0
                        ? "bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-indigo-200"
                        : "bg-gradient-to-br from-slate-300 to-slate-400"
                    }`}>
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : name[0]}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white shadow-sm">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread > 0 ? "font-black text-slate-800" : "font-semibold text-slate-600"}`}>{name}</p>
                      <span className={`text-[10px] flex-shrink-0 flex items-center gap-1 ${unread > 0 ? "text-indigo-500 font-bold" : "text-slate-300"}`}>
                        <Clock size={10} />
                        {lastMsg ? timeAgo(lastMsg.created_at) : ""}
                      </span>
                    </div>
                    {dept && (
                      <p className="text-[11px] text-slate-400 truncate -mt-0.5 flex items-center gap-1">
                        <Building2 size={10} className="text-slate-300" />{dept}
                      </p>
                    )}
                    {lastMsg && (
                      <p className={`text-xs truncate mt-1 ${unread > 0 ? "text-slate-600 font-bold" : "text-slate-400"}`}>
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
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-lg"
      style={{ height: "calc(100vh - 120px)" }}>

      {/* ── Chat header ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-white to-slate-50/50 border-b border-slate-100 px-5 py-3.5 flex items-center gap-3">
        <button onClick={goBack}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm flex-shrink-0">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-black overflow-hidden shadow-md ring-2 ring-white flex-shrink-0">
          {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : empName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{empName}</p>
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            {emp.employee_code && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{emp.employee_code}</span>}
            {emp.department?.name && (
              <span className="flex items-center gap-1"><Building2 size={10} />{emp.department.name}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-b from-slate-50/80 to-white">
        {loadingMsgs ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-500" />
            </div>
            <p className="text-xs text-slate-400">กำลังโหลดข้อความ...</p>
          </div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center shadow-inner">
              <MessageCircle size={28} className="text-indigo-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">เริ่มสนทนากับ {empName}</p>
            <p className="text-xs text-slate-300 mt-1.5">ส่งข้อความ รูปภาพ หรือไฟล์ได้เลย</p>
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map((g: any) => (
              <div key={g.date}>
                <div className="flex items-center justify-center my-5">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-1" />
                  <span className="px-4 py-1.5 text-[11px] font-bold text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm mx-3">
                    {fmtDate(g.date)}
                  </span>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-1" />
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
                              ? "bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-indigo-200/30"
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
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-2.5 flex gap-1 overflow-x-auto no-scrollbar">
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
                <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-200 shadow-sm" />
                <button onClick={() => setImages((p: any) => p.filter((_: any, j: number) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
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
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3.5 flex items-end gap-2">
        <button onClick={() => setShowEmoji(!showEmoji)}
          className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
            showEmoji ? "bg-indigo-100 text-indigo-600 shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
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
              ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200/50"
              : "bg-slate-100 text-slate-300"
          }`}>
          {sending ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Lightbox */}
      {imgModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setImgModal(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all"
            onClick={() => setImgModal(null)}>
            <X size={20} className="text-white" />
          </button>
          <img src={imgModal} alt="" className="max-w-[90%] max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={(e: any) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
