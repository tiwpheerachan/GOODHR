"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Minimize2, Trash2, Maximize2, History, Plus, ChevronLeft, X, Copy, Check, Share2, Search } from "lucide-react"

interface Message { role: "user" | "assistant"; content: string }
interface ChatSession { id: string; title: string; messages: Message[]; updatedAt: number }

const STORAGE_KEY = "goodhr_ai_chats"
const MAX_SESSIONS = 30
function loadSessions(): ChatSession[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") } catch { return [] } }
function saveSessions(s: ChatSession[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s.slice(0, MAX_SESSIONS))) }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ── Markdown → HTML with table support ──
function renderMarkdown(text: string) {
  const lines = text.split("\n")
  let html = ""
  let inTable = false
  let tableRows: string[][] = []
  const flushTable = () => {
    if (!tableRows.length) return
    let t = '<div class="ai-table overflow-x-auto my-2"><table class="w-full text-xs border-collapse">'
    tableRows.forEach((cells, ri) => {
      if (cells.every(c => /^[-:\s]+$/.test(c))) return
      const tag = ri === 0 ? "th" : "td"
      const cls = ri === 0 ? 'class="bg-indigo-50 text-indigo-700 font-bold px-2 py-1.5 text-left border-b border-indigo-200"' : 'class="px-2 py-1 border-b border-slate-100"'
      t += "<tr>" + cells.map(c => `<${tag} ${cls}>${c.trim()}</${tag}>`).join("") + "</tr>"
    })
    t += "</table></div>"
    html += t
    tableRows = []
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) { inTable = true; tableRows.push(trimmed.slice(1, -1).split("|")); continue }
    if (inTable) { flushTable(); inTable = false }
    let l = trimmed
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-200 text-indigo-700 px-1 rounded text-[11px]">$1</code>')
      .replace(/^### (.*)$/, '<div class="font-bold text-sm mt-3 mb-1">$1</div>')
      .replace(/^## (.*)$/, '<div class="font-bold mt-3 mb-1">$1</div>')
      .replace(/^- (.*)$/, '<div class="ml-3 text-sm">• $1</div>')
      .replace(/^\d+\. (.*)$/, '<div class="ml-3 text-sm">$1</div>')
    html += (l === trimmed && l !== "") ? l + "<br/>" : l === "" ? "<br/>" : l
  }
  if (inTable) flushTable()
  return html
}

// ── Convert content to rich plain text (preserves tables & chart data) ──
function toPlainText(content: string) {
  let text = content

  // Convert $$CHART{...}$$ to formatted summary
  text = text.replace(/\$\$CHART(\{[\s\S]*?\})\$\$/g, (_match, json) => {
    try {
      const chart = JSON.parse(json)
      const lines: string[] = []
      if (chart.title) lines.push(`📊 ${chart.title}`)
      const maxLabel = Math.max(...(chart.items || []).map((d: any) => (d.label || "").length), 5)
      for (const item of chart.items || []) {
        const label = (item.label || "").padEnd(maxLabel)
        const val = Number(item.value || 0).toLocaleString()
        lines.push(`  ${label}  ${val}`)
      }
      return lines.join("\n")
    } catch { return "" }
  })

  // Convert markdown tables to aligned text
  const lines = text.split("\n")
  const result: string[] = []
  let tableBlock: string[][] = []

  const flushTable = () => {
    if (!tableBlock.length) return
    // Filter separator rows
    const rows = tableBlock.filter(r => !r.every(c => /^[-:\s]+$/.test(c)))
    if (!rows.length) { tableBlock = []; return }
    // Calculate column widths
    const colWidths = rows[0].map((_, ci) => Math.max(...rows.map(r => (r[ci] || "").trim().length)))
    for (let ri = 0; ri < rows.length; ri++) {
      const cells = rows[ri].map((c, ci) => c.trim().padEnd(colWidths[ci]))
      result.push(cells.join(" │ "))
      if (ri === 0) result.push(colWidths.map(w => "─".repeat(w)).join("─┼─"))
    }
    tableBlock = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      tableBlock.push(trimmed.slice(1, -1).split("|"))
    } else {
      flushTable()
      // Clean markdown formatting but keep structure
      result.push(
        trimmed
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`(.*?)`/g, "$1")
          .replace(/^#{1,3}\s*/, "")
      )
    }
  }
  flushTable()

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

// ── Chart Block ──
function ChartBlock({ data }: { data: { type: string; title?: string; items: Array<{ label: string; value: number; color?: string }> } }) {
  const max = Math.max(...data.items.map(d => d.value), 1)
  const colors = ["#818CF8", "#F472B6", "#34D399", "#FBBF24", "#FB923C", "#A78BFA", "#38BDF8", "#F87171"]
  if (data.type === "pie" || data.type === "donut") {
    const total = data.items.reduce((s, d) => s + d.value, 0)
    let cumPct = 0
    return (
      <div className="my-2 rounded-xl border border-slate-200 bg-white p-3">
        {data.title && <div className="mb-2 text-xs font-bold text-slate-600">{data.title}</div>}
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 36 36" width="80" height="80">
            {data.items.map((d, i) => {
              const pct = total > 0 ? (d.value / total) * 100 : 0; const offset = 100 - cumPct; cumPct += pct
              return <circle key={i} cx="18" cy="18" r="15.915" fill="none" stroke={d.color || colors[i % colors.length]}
                strokeWidth={data.type === "donut" ? "3" : "15.915"} strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset} />
            })}
          </svg>
          <div className="flex-1 space-y-1">
            {data.items.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color || colors[i % colors.length] }} />
                <span className="flex-1 text-slate-600">{d.label}</span>
                <span className="font-bold text-slate-700">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="my-2 rounded-xl border border-slate-200 bg-white p-3">
      {data.title && <div className="mb-2 text-xs font-bold text-slate-600">{data.title}</div>}
      <div className="space-y-1.5">
        {data.items.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-20 truncate text-right text-[11px] text-slate-500">{d.label}</span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, background: d.color || colors[i % colors.length] }} />
            </div>
            <span className="w-16 text-right text-[11px] font-bold text-slate-700">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Message content with chart detection ──
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\$\$CHART\{[\s\S]*?\}\$\$)/)
  return <>{parts.map((part, i) => {
    const m = part.match(/^\$\$CHART(\{[\s\S]*?\})\$\$$/)
    if (m) { try { return <ChartBlock key={i} data={JSON.parse(m[1])} /> } catch {} }
    return part.trim() ? <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(part) }} /> : null
  })}</>
}

// ── Share modal: pick employees to forward message ──
function ShareModal({ message, onClose }: { message: string; onClose: () => void }) {
  const [search, setSearch] = useState("")
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Load initial employees + search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(search)}`)
        const data = await res.json()
        setEmployees(data.employees || [])
      } catch { setEmployees([]) }
    }, search.trim() ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search])

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const sendToSelected = async () => {
    if (selected.size === 0) return
    setSending(true)
    try {
      const text = `📋 ข้อมูลจากน้องเอช (AI Assistant):\n\n${toPlainText(message)}`
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "broadcast", target_employee_ids: Array.from(selected), message: text }),
      })
      setSent(true)
      setTimeout(onClose, 1200)
    } catch {} finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Share2 size={16} className="text-indigo-500" />
          <span className="flex-1 text-sm font-bold text-slate-700">ส่งต่อข้อมูล</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100"><Check size={24} className="text-green-600"/></div>
            <p className="text-sm font-bold text-green-700">ส่งแล้ว!</p>
          </div>
        ) : (
          <>
            <div className="p-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search size={14} className="text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาพนักงาน..."
                  className="flex-1 text-sm outline-none" autoFocus />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto px-3">
              {employees.length === 0 && <p className="py-4 text-center text-xs text-slate-400">{search ? "ไม่พบพนักงาน" : "กำลังโหลด..."}</p>}
              {employees.map((e: any) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {e.avatar_url ? <img src={e.avatar_url} className="h-full w-full rounded-full object-cover" /> : (e.first_name_th?.[0] || e.nickname?.[0] || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.first_name_th} {e.last_name_th}</p>
                    <p className="text-[10px] text-slate-400 truncate">{e.employee_code} · {e.department?.name || e.position?.name || ""}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="border-t border-slate-100 p-3">
              <div className="mb-2 max-h-16 overflow-hidden rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 leading-relaxed">
                {toPlainText(message).slice(0, 200)}...
              </div>
              <button onClick={sendToSelected} disabled={selected.size === 0 || sending}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40">
                {sending ? "กำลังส่ง..." : `ส่งถึง ${selected.size} คน`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Message actions toolbar ──
function MessageActions({ content, onShare }: { content: string; onShare: () => void }) {
  const [copied, setCopied] = useState(false)
  const copyText = () => {
    navigator.clipboard.writeText(toPlainText(content))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mt-1 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
      <button onClick={copyText} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="คัดลอก">
        {copied ? <><Check size={11} className="text-green-500"/><span className="text-green-500">คัดลอกแล้ว</span></> : <><Copy size={11}/><span>คัดลอก</span></>}
      </button>
      <button onClick={onShare} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="ส่งต่อ">
        <Share2 size={11}/><span>ส่งต่อ</span>
      </button>
    </div>
  )
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  // Bubble state
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: -1, y: -1 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // Load sessions
  useEffect(() => { const s = loadSessions(); setSessions(s); if (s.length) { setActiveSessionId(s[0].id); setMessages(s[0].messages) } }, [])

  // Save on message change
  useEffect(() => {
    if (!activeSessionId || !messages.length) return
    setSessions(prev => {
      const u = prev.map(s => s.id === activeSessionId ? { ...s, messages, updatedAt: Date.now(), title: messages[0]?.content.slice(0, 40) || "แชทใหม่" } : s).sort((a, b) => b.updatedAt - a.updatedAt)
      saveSessions(u); return u
    })
  }, [messages, activeSessionId])

  // Generate follow-up suggestions after AI replies
  useEffect(() => {
    if (messages.length < 2) { setSuggestions([]); return }
    const last = messages[messages.length - 1]
    if (last.role !== "assistant") { setSuggestions([]); return }
    const c = last.content.toLowerCase()
    const s: string[] = []
    if (c.includes("เงินเดือน") || c.includes("payroll")) { s.push("แยกตามแผนก", "เทียบกับเดือนก่อน") }
    if (c.includes("มาสาย") || c.includes("late")) { s.push("แสดงเป็นกราฟ", "แยกตามแผนก") }
    if (c.includes("พนักงาน") && (c.includes("ชื่อ") || c.includes("name"))) { s.push("ดูการเข้างาน", "ดูเงินเดือน", "ดูประวัติการลา") }
    if (c.includes("ลา") || c.includes("leave")) { s.push("แยกตามประเภทลา", "ใครลาเยอะสุด?") }
    if (c.includes("ot") || c.includes("overtime")) { s.push("OT แยกตามแผนก", "เทียบกับเดือนก่อน") }
    if (s.length === 0) s.push("สรุปเป็นกราฟ", "ดูรายละเอียดเพิ่ม")
    setSuggestions(s.slice(0, 3))
  }, [messages])

  useEffect(() => { if (position.x === -1) setPosition({ x: window.innerWidth - 90, y: window.innerHeight - 90 }) }, [position.x])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, loading])
  useEffect(() => { if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200) }, [isOpen])
  useEffect(() => { const iv = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 150) }, 3000 + Math.random() * 2000); return () => clearInterval(iv) }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!bubbleRef.current) return; const r = bubbleRef.current.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2), d = Math.sqrt(dx*dx+dy*dy); setEyePos({ x: d > 0 ? (dx/d)*3 : 0, y: d > 0 ? (dy/d)*3 : 0 }) }
    window.addEventListener("mousemove", h); return () => window.removeEventListener("mousemove", h)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => { if (isOpen) return; setIsDragging(true); setDragOffset({ x: e.clientX-position.x, y: e.clientY-position.y }); (e.target as HTMLElement).setPointerCapture(e.pointerId) }, [isOpen, position])
  const onPointerMove = useCallback((e: React.PointerEvent) => { if (!isDragging) return; setPosition({ x: Math.max(0, Math.min(window.innerWidth-70, e.clientX-dragOffset.x)), y: Math.max(0, Math.min(window.innerHeight-70, e.clientY-dragOffset.y)) }) }, [isDragging, dragOffset])
  const onPointerUp = useCallback(() => { if (!isDragging) return; setIsDragging(false); setPosition(p => ({ x: p.x < window.innerWidth/2 ? 20 : window.innerWidth-90, y: p.y })) }, [isDragging])

  const startNewChat = () => {
    const id = genId(); const s: ChatSession = { id, title: "แชทใหม่", messages: [], updatedAt: Date.now() }
    setSessions(prev => { const u = [s, ...prev]; saveSessions(u); return u }); setActiveSessionId(id); setMessages([]); setShowHistory(false); setSuggestions([])
  }
  const loadSession = (s: ChatSession) => { setActiveSessionId(s.id); setMessages(s.messages); setShowHistory(false) }
  const deleteSession = (id: string) => {
    setSessions(prev => { const u = prev.filter(s => s.id !== id); saveSessions(u); if (activeSessionId === id) { if (u.length) { setActiveSessionId(u[0].id); setMessages(u[0].messages) } else { setActiveSessionId(null); setMessages([]) } } return u })
  }

  const doSend = async (text: string) => {
    if (!text.trim() || loading) return
    let sid = activeSessionId
    if (!sid) { const id = genId(); const s: ChatSession = { id, title: text.slice(0, 40), messages: [], updatedAt: Date.now() }; setSessions(prev => { const u = [s, ...prev]; saveSessions(u); return u }); sid = id; setActiveSessionId(id) }
    const newMsgs: Message[] = [...messages, { role: "user", content: text }]
    setMessages(newMsgs); setInput(""); setLoading(true); setSuggestions([])
    try {
      const res = await fetch("/api/chat/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMsgs }) })
      const data = await res.json()
      setMessages([...newMsgs, { role: "assistant", content: data.error ? `ขอโทษครับ: ${data.error}` : data.reply }])
    } catch { setMessages([...newMsgs, { role: "assistant", content: "ขอโทษครับ ไม่สามารถเชื่อมต่อได้" }]) }
    finally { setLoading(false) }
  }

  if (position.x === -1) return null
  const panelStyle = isExpanded ? { inset: 16, width: "auto" as const, height: "auto" as const } : { bottom: 24, right: 24, width: Math.min(440, window.innerWidth - 32), height: Math.min(620, window.innerHeight - 48) }

  return (
    <>
      {shareMsg && <ShareModal message={shareMsg} onClose={() => setShareMsg(null)} />}

      {isOpen && (
        <div className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300" style={panelStyle}>
          {/* Header */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-3 py-2.5">
            {showHistory ? (
              <button onClick={() => setShowHistory(false)} className="rounded-lg p-1.5 text-white/80 hover:bg-white/20"><ChevronLeft size={16}/></button>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <svg viewBox="0 0 36 36" width="22" height="22"><circle cx="18" cy="18" r="16" fill="#FFF3C4"/><circle cx="12" cy="15" r="2.5" fill="#1E293B"/><circle cx="24" cy="15" r="2.5" fill="#1E293B"/><path d="M12 22 Q18 27 24 22" stroke="#1E293B" strokeWidth="1.5" fill="none" strokeLinecap="round"/><circle cx="7" cy="19" r="3" fill="#FFB3B3" opacity="0.5"/><circle cx="29" cy="19" r="3" fill="#FFB3B3" opacity="0.5"/></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{showHistory ? "ประวัติแชท" : "น้องเอช"}</p>
              {!showHistory && <p className="text-[10px] text-white/60">HR Assistant AI</p>}
            </div>
            <button onClick={() => { setShowHistory(false); startNewChat() }} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20" title="แชทใหม่"><Plus size={14}/></button>
            <button onClick={() => setShowHistory(!showHistory)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20" title="ประวัติ"><History size={14}/></button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20" title={isExpanded?"ย่อ":"ขยาย"}>{isExpanded?<Minimize2 size={14}/>:<Maximize2 size={14}/>}</button>
            <button onClick={() => { setIsOpen(false); setIsExpanded(false); setShowHistory(false) }} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20"><X size={14}/></button>
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sessions.length === 0 && <p className="text-center text-xs text-slate-400 py-8">ยังไม่มีประวัติแชท</p>}
              {sessions.map(s => (
                <div key={s.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition ${s.id === activeSessionId ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"}`} onClick={() => loadSession(s)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.title}</p>
                    <p className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleString("th-TH", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} · {s.messages.length} ข้อความ</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }} className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-3 pt-4 text-center">
                    <div className="mx-auto w-fit rounded-full bg-indigo-50 p-4">
                      <svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="22" fill="#FFF3C4" stroke="#F59E0B" strokeWidth="1"/><circle cx="16" cy="20" r="3" fill="#1E293B"/><circle cx="32" cy="20" r="3" fill="#1E293B"/><circle cx="17" cy="19" r="1" fill="#FFF"/><circle cx="33" cy="19" r="1" fill="#FFF"/><path d="M16 30 Q24 36 32 30" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="8" cy="25" r="4" fill="#FFB3B3" opacity="0.4"/><circle cx="40" cy="25" r="4" fill="#FFB3B3" opacity="0.4"/></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-700">สวัสดีครับ! ผมน้องเอช</p>
                    <p className="text-xs text-slate-400">ถามอะไรเกี่ยวกับ HR ได้เลยครับ</p>
                    <div className="grid grid-cols-2 gap-1.5 pt-2">
                      {["สรุปเงินเดือนเดือนนี้","ใครมาสายบ่อยที่สุด?","ค้นหาพนักงาน ชื่อ...","วันนี้ใครยังไม่เช็คอิน?","สรุปการลาเดือนนี้","OT เยอะสุดใครบ้าง?"].map(q => (
                        <button key={q} onClick={() => doSend(q)} className="rounded-xl border border-slate-200 px-2.5 py-2 text-left text-[11px] text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50">{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={isExpanded ? "max-w-[70%]" : "max-w-[88%]"}>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-md bg-indigo-500 text-white" : "rounded-bl-md bg-slate-50 text-slate-700 border border-slate-100"}`}>
                        {m.role === "assistant" ? <MessageContent content={m.content} /> : m.content}
                      </div>
                      {m.role === "assistant" && <MessageActions content={m.content} onShare={() => setShareMsg(m.content)} />}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }}/>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }}/>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }}/>
                    </div>
                  </div>
                )}

                {/* Follow-up suggestions */}
                {suggestions.length > 0 && !loading && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => doSend(s)}
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-100">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 p-3">
                <div className="flex items-end gap-2">
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(input) } }}
                    placeholder="ถามอะไรก็ได้เลยครับ..." rows={1}
                    className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  <button onClick={() => doSend(input)} disabled={!input.trim() || loading}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-600 disabled:opacity-40"><Send size={16}/></button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Floating Bubble ── */}
      {!isOpen && (
        <div ref={bubbleRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          onClick={() => { if (!isDragging) setIsOpen(true) }}
          className="fixed z-[9999] cursor-pointer select-none"
          style={{ left: position.x, top: position.y, touchAction: "none", transition: isDragging ? "none" : "left 0.3s ease, top 0.05s" }}>
          <div className="relative animate-bounce" style={{ animationDuration: "3s" }}>
            <div className="absolute -left-20 -top-8 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 opacity-90 shadow-lg">
              ถามได้เลย!<div className="absolute -bottom-1 right-3 h-2.5 w-2.5 rotate-45 bg-white"/>
            </div>
            <svg viewBox="0 0 64 64" width="64" height="64" className="drop-shadow-lg">
              <circle cx="32" cy="32" r="30" fill="url(#faceGrad)" stroke="#818CF8" strokeWidth="2"/>
              <circle cx="12" cy="36" r="6" fill="#FFB3B3" opacity="0.35"/><circle cx="52" cy="36" r="6" fill="#FFB3B3" opacity="0.35"/>
              <g>{blink?(<><path d="M18 28 Q22 26 26 28" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round"/><path d="M38 28 Q42 26 46 28" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>):(<><circle cx={22+eyePos.x} cy={27+eyePos.y} r="4.5" fill="#1E293B"/><circle cx={42+eyePos.x} cy={27+eyePos.y} r="4.5" fill="#1E293B"/><circle cx={23.5+eyePos.x*0.5} cy={25.5+eyePos.y*0.5} r="1.8" fill="#FFF"/><circle cx={43.5+eyePos.x*0.5} cy={25.5+eyePos.y*0.5} r="1.8" fill="#FFF"/></>)}</g>
              <path d="M22 38 Q32 46 42 38" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <g className="animate-pulse"><path d="M52 8 L54 12 L58 10 L54 14 L56 18 L52 14 L48 16 L50 12 Z" fill="#F59E0B" opacity="0.7"/></g>
              <defs><radialGradient id="faceGrad" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#FFF7E0"/><stop offset="100%" stopColor="#FBBF24"/></radialGradient></defs>
            </svg>
            {messages.length === 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"/><span className="relative inline-flex h-4 w-4 rounded-full bg-indigo-500"/></span>}
          </div>
        </div>
      )}
    </>
  )
}
