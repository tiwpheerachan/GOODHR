"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, Sparkles, Send, Loader2, Shield, AlertCircle, User, Bot,
  RotateCw, Globe, ClipboardList, FileText, UserCog, ChevronDown, X,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Msg = { role: "user" | "assistant"; content: string }
type Scope =
  | { type: "system" }
  | { type: "assignment"; id: string; label: string }
  | { type: "evaluation"; id: string; label: string }
  | { type: "supervisor"; id: string; label: string }

const SUGGESTIONS_SYSTEM = [
  "📊 สรุปสถานะการประเมินสาขาช่วงนี้",
  "🏆 สาขาไหนคะแนนสูงสุด 5 อันดับ?",
  "⚠️ สาขาไหนต้องดูแลด่วน (คะแนนต่ำ)?",
  "📋 มีการบ้านที่กำลังดำเนินกี่อัน?",
  "👤 ผู้ประเมินคนไหนทำงานสม่ำเสมอที่สุด?",
  "📅 มีการบ้านที่เลยกำหนดไหม?",
]
const SUGGESTIONS_ASG = [
  "📊 การบ้านนี้ความคืบหน้าเป็นยังไง?",
  "👥 ใครยังไม่ทำบ้าง?",
  "🏪 สาขาไหนที่ทำแล้ว / ยังไม่ทำ?",
  "🎯 คะแนนเฉลี่ยเป็นยังไง? สาขาไหนต่ำ?",
  "📝 มี action plan หรือ note อะไรน่าสนใจไหม?",
  "🚨 จุดเสี่ยงและ recommendation",
]
const SUGGESTIONS_EVAL = [
  "📊 ฟอร์มนี้คะแนนเป็นยังไง?",
  "❌ ข้อไหนที่ตก (failed) บ้าง?",
  "📝 notes / action plan ของฟอร์มนี้",
  "🎯 จุดที่ควรปรับปรุงคืออะไร?",
  "✅ ผู้ประเมินสรุปจุดเด่นยังไง?",
]
const SUGGESTIONS_SUP = [
  "📋 หัวหน้าคนนี้มอบการบ้านอะไรบ้าง?",
  "📊 ลูกน้องของเขาทำได้แค่ไหน?",
  "🏆 การบ้านไหนเสร็จแล้ว / ยังไม่เสร็จ?",
  "🎯 คะแนนเฉลี่ยของทีมเขาเป็นยังไง?",
]

export default function BranchEvalAiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<Scope>({ type: "system" })
  const [showScopePicker, setShowScopePicker] = useState(false)
  const [lists, setLists] = useState<{ assignments: any[]; evaluations: any[]; supervisors: any[] }>({
    assignments: [], evaluations: [], supervisors: [],
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  // โหลด dropdown lists
  useEffect(() => {
    fetch("/api/branch-eval/chat").then(r => r.json()).then(d => {
      setLists({
        assignments: d.assignments ?? [],
        evaluations: d.evaluations ?? [],
        supervisors: d.supervisors ?? [],
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const newMsgs: Msg[] = [...messages, { role: "user", content }]
    setMessages(newMsgs)
    setInput("")
    setLoading(true)
    try {
      const scopePayload: any = { type: scope.type }
      if ("id" in scope) scopePayload.id = scope.id
      const res = await fetch("/api/branch-eval/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, scope: scopePayload }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "AI error")
        setMessages(m => [...m, { role: "assistant", content: `⚠️ ${d.error || "เกิดข้อผิดพลาด"}` }])
        return
      }
      setMessages(m => [...m, { role: "assistant", content: d.reply }])
    } catch (e: any) {
      toast.error(e.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    if (messages.length === 0) return
    if (confirm("ล้างประวัติแชท?")) setMessages([])
  }

  const setNewScope = (s: Scope) => {
    setScope(s)
    setShowScopePicker(false)
    setMessages([])  // reset chat เพราะ context เปลี่ยน
  }

  const suggestions =
    scope.type === "assignment" ? SUGGESTIONS_ASG
    : scope.type === "evaluation" ? SUGGESTIONS_EVAL
    : scope.type === "supervisor" ? SUGGESTIONS_SUP
    : SUGGESTIONS_SYSTEM

  const scopeIcon =
    scope.type === "assignment" ? <ClipboardList size={12}/>
    : scope.type === "evaluation" ? <FileText size={12}/>
    : scope.type === "supervisor" ? <UserCog size={12}/>
    : <Globe size={12}/>

  const scopeColor =
    scope.type === "assignment" ? "bg-orange-100 text-orange-800 border-orange-200"
    : scope.type === "evaluation" ? "bg-sky-100 text-sky-800 border-sky-200"
    : scope.type === "supervisor" ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-emerald-100 text-emerald-800 border-emerald-200"

  const scopeLabel =
    scope.type === "system" ? "🌐 ทั้งระบบ (60 วันล่าสุด)"
    : `${scope.type === "assignment" ? "📋" : scope.type === "evaluation" ? "📝" : "👤"} ${scope.label}`

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-32 flex flex-col h-[calc(100vh-100px)]">
      <Link href="/app/branch-eval/manage" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-2">
        <ArrowLeft size={14} /> จัดการสาขา
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 border-2 border-violet-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-violet-900 flex items-center gap-2">
              🤖 AI ผู้ช่วยระบบประเมินสาขา
            </h1>
            <p className="text-xs text-violet-700 mt-0.5">
              เลือก scope ด้านล่าง → AI จะ focus เฉพาะข้อมูลนั้น
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-700 bg-white/80 px-2 py-1 rounded-full border border-rose-200">
              <Shield size={11}/> ปลอดภัย: ตอบเฉพาะข้อมูลประเมินสาขา · ไม่ตอบเงินเดือน/ส่วนตัว
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={reset} className="p-2 text-slate-400 hover:bg-white rounded-lg" title="ล้างแชท">
              <RotateCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Scope picker */}
      <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-slate-500 uppercase">Scope:</span>
          <button onClick={() => setShowScopePicker(!showScopePicker)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${scopeColor}`}>
            {scopeIcon} {scopeLabel}
            <ChevronDown size={11} className={`transition ${showScopePicker ? "rotate-180" : ""}`} />
          </button>
          {scope.type !== "system" && (
            <button onClick={() => setNewScope({ type: "system" })}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-bold">
              <X size={11}/> รีเซ็ต
            </button>
          )}
        </div>

        {showScopePicker && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            {/* Buttons */}
            <button onClick={() => setNewScope({ type: "system" })}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-emerald-50 text-left">
              <Globe size={14} className="text-emerald-600 flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800">🌐 ทั้งระบบ</p>
                <p className="text-[10px] text-slate-500">ภาพรวม 60 วันล่าสุด — สถิติ, top/bottom, assignments</p>
              </div>
            </button>

            {/* Pick assignment */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1 mt-2">📋 เลือกการบ้านเฉพาะ ({lists.assignments.length})</p>
              <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                {lists.assignments.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-2 px-2">ยังไม่มีการบ้าน</p>
                ) : lists.assignments.map((a: any) => (
                  <button key={a.id}
                    onClick={() => setNewScope({ type: "assignment", id: a.id, label: a.title })}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-orange-50 text-left">
                    <ClipboardList size={11} className="text-orange-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{a.title}</p>
                      {a.due_date && (
                        <p className="text-[9px] text-slate-400">ครบ {format(new Date(a.due_date), "d MMM yyyy", { locale: th })}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pick evaluation */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1 mt-2">📝 เลือกฟอร์มเฉพาะ ({lists.evaluations.length})</p>
              <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                {lists.evaluations.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-2 px-2">ยังไม่มีฟอร์ม</p>
                ) : lists.evaluations.slice(0, 50).map((e: any) => (
                  <button key={e.id}
                    onClick={() => setNewScope({
                      type: "evaluation", id: e.id,
                      label: `${e.branch?.name} · ${e.template?.name} · ${e.visit_date}`,
                    })}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sky-50 text-left">
                    <FileText size={11} className="text-sky-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{e.branch?.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {e.template?.name} · {format(new Date(e.visit_date), "d MMM", { locale: th })}
                        {e.evaluator && <> · {e.evaluator.first_name_th}</>}
                      </p>
                    </div>
                    {e.percentage > 0 && (
                      <span className={`text-[10px] font-black ${Number(e.percentage) >= 80 ? "text-emerald-700" : Number(e.percentage) >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                        {Number(e.percentage).toFixed(0)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pick supervisor (admin only) */}
            {lists.supervisors.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1 mt-2">👤 เลือกหัวหน้าเฉพาะ ({lists.supervisors.length})</p>
                <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                  {lists.supervisors.map((s: any) => (
                    <button key={s.id}
                      onClick={() => setNewScope({
                        type: "supervisor", id: s.id,
                        label: `${s.first_name_th} ${s.last_name_th}${s.nickname ? ` (${s.nickname})` : ""}`,
                      })}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 text-left">
                      <UserCog size={11} className="text-amber-500 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">
                          {s.first_name_th} {s.last_name_th}
                          {s.nickname && <span className="text-slate-400 font-normal ml-1">({s.nickname})</span>}
                        </p>
                        <p className="text-[9px] text-slate-400">{s.employee_code}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto mt-3 space-y-3 px-1">
        {messages.length === 0 && (
          <div className="space-y-3 py-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-slate-800 mb-2">
                💡 ตัวอย่างคำถาม ({scope.type === "system" ? "ทั้งระบบ" : scope.type === "assignment" ? "การบ้านนี้" : scope.type === "evaluation" ? "ฟอร์มนี้" : "หัวหน้าคนนี้"})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-xs bg-violet-50 hover:bg-violet-100 text-violet-900 px-3 py-2 rounded-xl border border-violet-100 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800">
              <p className="font-bold flex items-center gap-1"><AlertCircle size={12}/> ขอบเขต AI</p>
              <p className="mt-1">✅ ตอบ: ประเมินสาขา, คะแนน, การบ้าน, template, ผู้ประเมิน, สถิติ</p>
              <p>❌ ไม่ตอบ: เงินเดือน, ลา, OT, ข้อมูลส่วนตัว, เรื่องอื่นใดนอกระบบประเมิน</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot size={14} />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              m.role === "user"
                ? "bg-orange-500 text-white"
                : "bg-white border border-slate-100 text-slate-800 shadow-sm"
            }`}>
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "" : "font-[Sarabun]"}`}>
                {m.content}
              </p>
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
              <Loader2 size={14} className="animate-spin text-violet-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={`ถาม AI เรื่อง ${scope.type === "system" ? "ระบบประเมิน" : scope.type === "assignment" ? "การบ้านนี้" : scope.type === "evaluation" ? "ฟอร์มนี้" : "หัวหน้าคนนี้"}... (Enter ส่ง)`}
            rows={1}
            className="flex-1 bg-transparent outline-none px-3 py-2 text-sm resize-none max-h-32"
            disabled={loading} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl flex-shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
      </div>
    </div>
  )
}
