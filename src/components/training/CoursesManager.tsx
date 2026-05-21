"use client"
import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, GraduationCap, Loader2, Search, Filter, ChevronRight,
  ArrowLeft, Trophy, Eye, FileText, Layers, Target, RotateCcw,
  RefreshCw, X, CheckCircle2, AlertCircle,
} from "lucide-react"
import toast from "react-hot-toast"
import CoverImageUpload from "@/components/training/CoverImageUpload"

type Course = {
  id: string; title: string; description?: string | null
  thumbnail_url?: string | null
  status: "draft" | "published" | "archived"
  open_date?: string | null; close_date?: string | null
  passing_score: number; max_retries: number
  affect_kpi: boolean; version: number
  channel?: { id: string; name: string; brand?: string | null }
  updated_at: string
}

const STATUS: Record<string, { l: string; c: string; bg: string; dot: string }> = {
  draft:     { l: "ฉบับร่าง",    c: "text-slate-700",   bg: "bg-slate-100",   dot: "bg-slate-400" },
  published: { l: "เผยแพร่แล้ว", c: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500" },
  archived:  { l: "เก็บถาวร",    c: "text-rose-700",    bg: "bg-rose-50",     dot: "bg-rose-400" },
}

export default function CoursesManager({ basePath }: { basePath: string }) {
  const sp = useSearchParams()
  const channelIdFilter = sp?.get("channel_id") ?? ""
  const [courses, setCourses] = useState<Course[]>([])
  const [channels, setChannels] = useState<{ id: string; name: string; brand?: string | null }[]>([])
  const [channelFilter, setChannelFilter] = useState(channelIdFilter)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    channel_id: channelIdFilter, title: "", description: "",
    thumbnail_url: null as string | null,
  })

  const load = async () => {
    setLoading(true)
    let url = "/api/training/courses?"
    if (channelFilter) url += `channel_id=${channelFilter}&`
    if (statusFilter) url += `status=${statusFilter}&`
    const d = await fetch(url).then(r => r.json())
    setCourses(d.courses ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [channelFilter, statusFilter])
  useEffect(() => {
    fetch("/api/training/channels").then(r => r.json()).then(d => setChannels(d.channels ?? []))
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return courses
    return courses.filter(c => c.title.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s))
  }, [courses, search])

  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter(c => c.status === "published").length,
    draft: courses.filter(c => c.status === "draft").length,
    affectKpi: courses.filter(c => c.affect_kpi).length,
  }), [courses])

  const create = async () => {
    if (!newForm.channel_id || !newForm.title) { toast.error("เลือกช่องและตั้งชื่อก่อน"); return }
    const t = toast.loading("สร้างคอร์ส...")
    const res = await fetch("/api/training/courses", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newForm),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("สร้างแล้ว", { id: t })
    setShowNew(false)
    window.location.href = `${basePath}/courses/${d.id}`
  }

  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบเรียนรู้
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">หลักสูตร (Courses)</h2>
          <p className="text-slate-400 text-sm">{filtered.length} / {courses.length} คอร์ส</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
            <Plus size={14} /> สร้างคอร์สใหม่
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "ทั้งหมด",  v: stats.total,     icon: Layers,   bg: "bg-indigo-50", ic: "text-indigo-500",  vc: "text-indigo-700" },
          { l: "เผยแพร่",  v: stats.published, icon: Eye,      bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
          { l: "ฉบับร่าง", v: stats.draft,     icon: FileText, bg: "bg-slate-50",  ic: "text-slate-500",   vc: "text-slate-700" },
          { l: "ผูก KPI",  v: stats.affectKpi, icon: Target,   bg: "bg-amber-50",  ic: "text-amber-500",   vc: "text-amber-700" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                <k.icon size={14} className={k.ic} />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{k.l}</span>
            </div>
            <p className={`text-2xl font-black ${k.vc}`}>{k.v.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-2 items-center shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาคอร์ส..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400">
          <option value="">ทุกช่อง</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        {(search || channelFilter || statusFilter) && (
          <button onClick={() => { setSearch(""); setChannelFilter(""); setStatusFilter("") }}
            className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-100 rounded-2xl h-72 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <GraduationCap size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{search ? "ไม่พบคอร์ส" : "ยังไม่มีคอร์ส"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const S = STATUS[c.status] || STATUS.draft
            return (
              <Link key={c.id} href={`${basePath}/courses/${c.id}`}
                className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="relative h-32 bg-slate-100 overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center">
                      <GraduationCap size={36} className="text-sky-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${S.bg} ${S.c}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${S.dot}`} />
                      {S.l}
                    </span>
                    {c.affect_kpi && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black inline-flex items-center gap-0.5">
                        <Target size={8} /> KPI
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <p className="font-black text-slate-800 text-sm line-clamp-2 group-hover:text-indigo-700 min-h-[2.5rem]">{c.title}</p>
                  {c.channel && (
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      📁 {c.channel.name}{c.channel.brand ? ` · ${c.channel.brand}` : ""}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 min-h-[2.5rem]">
                    {c.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-md font-bold">
                      <Trophy size={10} /> ผ่าน {c.passing_score}%
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-md font-bold">
                      <RotateCcw size={10} /> ×{c.max_retries}
                    </span>
                    <span className="ml-auto text-[9px] text-slate-400">v{c.version}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-black text-indigo-600 group-hover:text-indigo-700">
                    <span>เปิดคอร์ส</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <GraduationCap size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800">สร้างคอร์สใหม่</h3>
                <p className="text-[11px] text-slate-400">ตั้งค่าพื้นฐาน — เพิ่มบทเรียน/ควิซในขั้นถัดไป</p>
              </div>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <CoverImageUpload value={newForm.thumbnail_url}
                onChange={url => setNewForm(f => ({ ...f, thumbnail_url: url }))}
                aspectRatio="16:9" label="ภาพปกคอร์ส" height="h-36" />
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">ช่อง *</p>
                <select value={newForm.channel_id} onChange={e => setNewForm(f => ({ ...f, channel_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  <option value="">— เลือกช่อง —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand ? ` · ${c.brand}` : ""}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">ชื่อคอร์ส *</p>
                <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">คำอธิบาย</p>
                <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={create}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5">
                <ChevronRight size={13} /> สร้างและแก้ไขต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
