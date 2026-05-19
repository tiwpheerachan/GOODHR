"use client"
import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, GraduationCap, Loader2, Search, ChevronRight, Filter, X } from "lucide-react"
import toast from "react-hot-toast"

const STATUS: Record<string, { l: string; c: string }> = {
  draft: { l: "ร่าง", c: "bg-slate-100 text-slate-600" },
  published: { l: "เผยแพร่", c: "bg-emerald-100 text-emerald-700" },
  archived: { l: "เก็บ", c: "bg-rose-100 text-rose-700" },
}

export default function CoursesManagePage() {
  const sp = useSearchParams()
  const initChan = sp?.get("channel_id") ?? ""
  const [courses, setCourses] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [channelFilter, setChannelFilter] = useState(initChan)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ channel_id: initChan, title: "", description: "" })

  const load = async () => {
    setLoading(true)
    let url = "/api/training/courses?"
    if (channelFilter) url += `channel_id=${channelFilter}&`
    if (statusFilter) url += `status=${statusFilter}&`
    const d = await (await fetch(url)).json()
    setCourses(d.courses ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [channelFilter, statusFilter])
  useEffect(() => {
    fetch("/api/training/channels").then(r => r.json()).then(d => setChannels(d.channels ?? []))
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return courses
    return courses.filter(c => c.title.toLowerCase().includes(s))
  }, [courses, search])

  const create = async () => {
    if (!newForm.channel_id || !newForm.title) { toast.error("กรอกให้ครบ"); return }
    const t = toast.loading("สร้าง...")
    const r = await fetch("/api/training/courses", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error, { id: t }); return }
    toast.success("สร้างแล้ว", { id: t })
    window.location.href = `/app/training/manage/courses/${d.id}`
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4 pb-32">
      <Link href="/app/training/manage" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> จัดการเนื้อหา
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">หลักสูตร</h1>
          <p className="text-xs text-slate-500 mt-1">{filtered.length} คอร์ส</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-xl text-xs lg:text-sm font-bold hover:bg-sky-700 shadow-sm">
          <Plus size={14} /> สร้างคอร์ส
        </button>
      </div>

      <div className="bg-white rounded-2xl p-3 border border-slate-200 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-sky-400" />
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <option value="">ทุกช่อง</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
          <GraduationCap size={32} className="mx-auto mb-2 text-slate-200" />
          ยังไม่มีคอร์ส
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(c => (
            <Link key={c.id} href={`/app/training/manage/courses/${c.id}`}
              className="group bg-white border border-slate-200 rounded-2xl p-3 hover:border-sky-300 hover:shadow-md transition-all flex gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-slate-800 truncate text-sm">{c.title}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS[c.status]?.c}`}>{STATUS[c.status]?.l}</span>
                </div>
                {c.channel && <p className="text-[10px] text-slate-400">📁 {c.channel.name}</p>}
                <p className="text-[10px] text-slate-400 mt-1">เกณฑ์ {c.passing_score}% · สอบซ้ำ {c.max_retries} ครั้ง</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-500 self-center flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="font-black">สร้างคอร์ส</h2>
              <button onClick={() => setShowNew(false)}><X size={18} /></button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">ช่อง *</p>
              <select value={newForm.channel_id} onChange={e => setNewForm(f => ({ ...f, channel_id: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— เลือกช่อง —</option>
                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">ชื่อคอร์ส *</p>
              <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">คำอธิบาย</p>
              <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">ยกเลิก</button>
              <button onClick={create} className="flex-1 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl hover:bg-sky-700">สร้าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
