"use client"
import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, GraduationCap, Loader2, Search, Filter, ChevronRight,
  ArrowLeft, Sparkles, Trophy, Eye, FileText, Layers, Target, RotateCcw,
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

const STATUS_BADGE: Record<string, { l: string; c: string; gradient: string }> = {
  draft:     { l: "ฉบับร่าง",    c: "bg-slate-100 text-slate-700",     gradient: "from-slate-400 to-slate-500" },
  published: { l: "เผยแพร่แล้ว", c: "bg-emerald-100 text-emerald-700", gradient: "from-emerald-500 to-green-500" },
  archived:  { l: "เก็บถาวร",    c: "bg-rose-100 text-rose-700",       gradient: "from-rose-500 to-pink-500" },
}

/**
 * Shared Courses Manager — ใช้ทั้งฝั่ง admin และ trainer
 * basePath: "/admin/training" หรือ "/app/training/manage"
 */
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
    const res = await fetch(url)
    const d = await res.json()
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
    return courses.filter(c =>
      c.title.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s)
    )
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-700 p-6 lg:p-8 text-white shadow-2xl anim-fade-up">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl anim-float" />
        <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" style={{ animation: "floatY 4s ease-in-out infinite" }} />
        <div className="absolute top-6 right-24 w-2 h-2 bg-white rounded-full opacity-70 anim-pulse-glow" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={basePath} className="p-2 bg-white/15 backdrop-blur-xl rounded-xl hover:bg-white/25 transition-colors border border-white/20">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center anim-float border border-white/20 shadow-lg">
              <GraduationCap size={32} className="drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2 anim-slide-in">
                <Sparkles size={12} className="opacity-80" />
                <span className="text-[10px] font-black tracking-[0.2em] opacity-90">COURSES</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black mt-1 drop-shadow">หลักสูตร (Courses)</h1>
              <p className="text-xs opacity-90 mt-1">สร้าง · แก้ไข · เผยแพร่ คอร์ส + บทเรียน + ภาพปก</p>
            </div>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-sky-700 hover:bg-sky-50 rounded-2xl text-sm font-black shadow-lg shadow-sky-900/20 transition-all card-lift">
            <Plus size={16} /> สร้างคอร์สใหม่
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-stagger">
        <MiniStat label="ทั้งหมด" value={stats.total} icon={<Layers />} color="indigo" />
        <MiniStat label="เผยแพร่" value={stats.published} icon={<Eye />} color="emerald" />
        <MiniStat label="ฉบับร่าง" value={stats.draft} icon={<FileText />} color="slate" />
        <MiniStat label="ผูก KPI" value={stats.affectKpi} icon={<Target />} color="amber" />
      </div>

      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center anim-fade-up">
        <Filter size={14} className="text-slate-400 ml-1" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="ค้นหาคอร์ส..." />
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-400">
          <option value="">ทุกช่อง</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-400">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        {(search || channelFilter || statusFilter) && (
          <button onClick={() => { setSearch(""); setChannelFilter(""); setStatusFilter("") }}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 inline-flex items-center gap-1">
            <RotateCcw size={11} /> เคลียร์
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton rounded-3xl h-80" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center anim-fade-up">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-3xl flex items-center justify-center anim-float">
            <GraduationCap size={36} className="text-sky-500" />
          </div>
          <p className="font-black text-slate-700 mb-1">{search ? "ไม่พบคอร์สที่ค้นหา" : "ยังไม่มีคอร์ส"}</p>
          <p className="text-xs text-slate-400">{search ? "ลองเปลี่ยนคำค้นหา" : "กดสร้างคอร์สใหม่เพื่อเริ่มต้น"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 anim-stagger">
          {filtered.map(c => (
            <Link key={c.id} href={`${basePath}/courses/${c.id}`}
              className="group relative bg-white border border-slate-200 rounded-3xl overflow-hidden card-lift">
              <div className="relative h-44 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap size={56} className="text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                  <span className={`px-2.5 py-1 bg-white/95 backdrop-blur rounded-full text-[10px] font-black ${STATUS_BADGE[c.status]?.c.split(" ").find(cl => cl.startsWith("text-")) ?? "text-slate-700"} shadow-sm`}>
                    {STATUS_BADGE[c.status]?.l}
                  </span>
                  {c.affect_kpi && (
                    <span className="px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-[10px] font-black shadow-sm flex items-center gap-1">
                      <Target size={9} /> KPI
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  {c.channel && (
                    <p className="text-[10px] text-white/90 mb-1 drop-shadow font-bold">
                      📁 {c.channel.name}{c.channel.brand ? ` · ${c.channel.brand}` : ""}
                    </p>
                  )}
                  <p className="font-black text-white text-lg drop-shadow-lg line-clamp-2 leading-snug">{c.title}</p>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                  {c.description || <span className="text-slate-300">— ไม่มีคำอธิบาย —</span>}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg font-bold">
                    <Trophy size={10} /> ผ่าน {c.passing_score}%
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg font-bold">
                    <RotateCcw size={10} /> ×{c.max_retries}
                  </span>
                  <span className="ml-auto text-[9px] text-slate-400">v{c.version}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-black text-sky-600 group-hover:text-sky-700">
                  <span>เปิดคอร์ส</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade-up" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} />
                <h2 className="text-lg font-black">สร้างคอร์สใหม่</h2>
              </div>
              <button onClick={() => setShowNew(false)} className="p-1.5 hover:bg-white/20 rounded-lg">×</button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <CoverImageUpload
                value={newForm.thumbnail_url}
                onChange={url => setNewForm(f => ({ ...f, thumbnail_url: url }))}
                aspectRatio="16:9"
                label="ภาพปกคอร์ส"
                height="h-40"
              />
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">ช่อง *</p>
                <select value={newForm.channel_id} onChange={e => setNewForm(f => ({ ...f, channel_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">— เลือกช่อง —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand ? ` · ${c.brand}` : ""}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">ชื่อคอร์ส *</p>
                <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">คำอธิบาย</p>
                <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex gap-2 border-t border-slate-100">
              <button onClick={() => setShowNew(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={create}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-sky-200">
                สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const cls: Record<string, string> = {
    indigo:  "from-indigo-500 to-indigo-600 shadow-indigo-200",
    sky:     "from-sky-500 to-blue-600 shadow-sky-200",
    amber:   "from-amber-500 to-orange-600 shadow-amber-200",
    emerald: "from-emerald-500 to-green-600 shadow-emerald-200",
    slate:   "from-slate-500 to-slate-600 shadow-slate-200",
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cls[color]} text-white rounded-2xl p-4 shadow-lg card-lift`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5 opacity-90">
          <span className="text-[11px] font-bold">{label}</span>
          <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-3xl font-black">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
