"use client"
import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, GraduationCap, Loader2, Search, Filter, ChevronRight,
  ArrowLeft, Trophy, Eye, FileText, Layers, Target, RotateCcw,
  RefreshCw, X, CheckCircle2, AlertCircle, Trash2, Archive, AlertTriangle,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
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
  deleted_at?: string | null
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
  const [trash, setTrash] = useState<Course[]>([])
  const [view, setView] = useState<"active" | "trash">("active")
  const [perm, setPerm] = useState<any>(null)
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
  const [busyId, setBusyId] = useState<string | null>(null)
  const [delTarget, setDelTarget] = useState<Course | null>(null)
  const [delConfirmText, setDelConfirmText] = useState("")
  const [delCounts, setDelCounts] = useState<{ enrollments: number; loading: boolean } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const qsActive = new URLSearchParams()
      if (channelFilter) qsActive.set("channel_id", channelFilter)
      if (statusFilter) qsActive.set("status", statusFilter)
      const qsTrash = new URLSearchParams({ deleted: "1" })
      if (channelFilter) qsTrash.set("channel_id", channelFilter)
      const [act, del] = await Promise.all([
        fetch(`/api/training/courses?${qsActive.toString()}`).then(r => r.json()),
        fetch(`/api/training/courses?${qsTrash.toString()}`).then(r => r.json()).catch(() => ({ courses: [] })),
      ])
      setCourses(act.courses ?? [])
      setTrash(del.courses ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [channelFilter, statusFilter])
  useEffect(() => {
    fetch("/api/training/channels").then(r => r.json()).then(d => setChannels(d.channels ?? []))
    fetch("/api/training/me").then(r => r.json()).then(d => setPerm(d))
  }, [])

  // Can user manage (write) THIS course's channel?
  const canManage = (c: Course) => {
    if (!perm) return false
    if (perm.is_training_admin || perm.is_base_admin) return true
    const chId = c.channel?.id
    if (!chId) return false
    return (perm.supervisor_channel_ids ?? []).includes(chId)
  }
  const canCreate = perm?.is_training_admin || perm?.is_base_admin ||
    (perm?.supervisor_channel_ids?.length ?? 0) > 0
  const isViewerOnly = perm && !canCreate && perm.is_viewer

  const source = view === "trash" ? trash : courses
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return source
    return source.filter(c => c.title.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s))
  }, [source, search])

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

  // Soft delete — move to recycle bin
  const softDelete = async (c: Course, e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation()
    if (!confirm(`ย้ายคอร์ส "${c.title}" ไปถังขยะ?\n\nเนื้อหา · ผู้เรียน · คะแนนทั้งหมดจะถูกซ่อนแต่ไม่ถูกลบ — กู้คืนได้ภายหลัง`)) return
    setBusyId(c.id)
    const t = toast.loading("กำลังย้ายไปถังขยะ...")
    try {
      const res = await fetch(`/api/training/courses?id=${c.id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
      toast.success("ย้ายไปถังขยะแล้ว · กู้คืนได้ในแท็บ \"ถังขยะ\"", { id: t, duration: 4500 })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "ลบไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  // Restore from trash
  const restore = async (c: Course, e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation()
    setBusyId(c.id)
    const t = toast.loading("กำลังกู้คืน...")
    try {
      const res = await fetch("/api/training/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, deleted_at: null }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "กู้คืนไม่สำเร็จ", { id: t }); return }
      toast.success(`กู้คืน "${c.title}" แล้ว`, { id: t })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "กู้คืนไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  // Hard delete confirmation
  const askHardDelete = async (c: Course, e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation()
    setDelTarget(c); setDelConfirmText("")
    setDelCounts({ enrollments: 0, loading: true })
    try {
      const r = await fetch(`/api/training/enrollments?course_id=${c.id}`).then(r => r.json())
      setDelCounts({ enrollments: (r.enrollments ?? []).length, loading: false })
    } catch { setDelCounts({ enrollments: 0, loading: false }) }
  }
  const closeDelete = () => { setDelTarget(null); setDelConfirmText(""); setDelCounts(null) }
  const confirmHardDelete = async () => {
    if (!delTarget) return
    if (delConfirmText.trim() !== delTarget.title.trim()) {
      toast.error("กรุณาพิมพ์ชื่อคอร์สให้ตรง")
      return
    }
    setDeleting(true)
    const t = toast.loading("กำลังลบถาวร...")
    try {
      const res = await fetch(`/api/training/courses?id=${delTarget.id}&hard=1`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
      const k = d.deleted
      toast.success(
        k ? `ลบถาวรคอร์ส "${k.course}" · บทเรียน ${k.modules} · ควิซ ${k.quizzes} · ผู้เรียน ${k.enrollments}`
          : "ลบถาวรแล้ว",
        { id: t, duration: 5000 },
      )
      closeDelete(); await load()
    } catch (err: any) {
      toast.error(err?.message || "ลบไม่สำเร็จ", { id: t })
    } finally { setDeleting(false) }
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
          <p className="text-slate-400 text-sm">
            {view === "active"
              ? <>{filtered.length} / {courses.length} คอร์ส</>
              : <>ถังขยะ · {filtered.length} / {trash.length} คอร์ส — กู้คืนได้</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView("active")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === "active" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"
              }`}>
              <GraduationCap size={12} /> ใช้งาน
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${view === "active" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                {courses.length}
              </span>
            </button>
            <button onClick={() => setView("trash")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === "trash" ? "bg-white shadow-sm text-amber-700" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Archive size={12} /> ถังขยะ
              {trash.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${view === "trash" ? "bg-amber-100 text-amber-700" : "bg-amber-200 text-amber-800"}`}>
                  {trash.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          {view === "active" && canCreate && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
              <Plus size={14} /> สร้างคอร์สใหม่
            </button>
          )}
        </div>
      </div>

      {/* Viewer banner */}
      {isViewerOnly && view === "active" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers size={14} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-900">โหมดอ่านอย่างเดียว · Viewer</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              ดูคอร์สและคลิก dashboard เพื่อตรวจคะแนน · ดาวน์โหลด Excel ได้ — แต่ไม่สามารถสร้าง/แก้ไข/ลบคอร์ส
            </p>
          </div>
        </div>
      )}

      {/* Trash banner */}
      {view === "trash" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Archive size={14} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-900">คอร์สในถังขยะ</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              ข้อมูลทั้งหมดยังอยู่ครบ — กดปุ่ม <b>กู้คืน</b> เพื่อนำกลับมาใช้ หรือกด <b>ลบถาวร</b> เพื่อลบทั้งคอร์ส + ผู้เรียน + คะแนนทั้งหมดอย่างถาวร
            </p>
          </div>
        </div>
      )}

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
          {view === "trash"
            ? <Archive size={36} className="mx-auto mb-2 text-slate-300" />
            : <GraduationCap size={36} className="mx-auto mb-2 text-slate-300" />}
          <p className="font-black text-slate-700">
            {search
              ? "ไม่พบคอร์ส"
              : view === "trash" ? "ถังขยะว่าง" : "ยังไม่มีคอร์ส"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {search
              ? "ลองเปลี่ยนคำค้นหา"
              : view === "trash" ? "คอร์สที่ลบจะแสดงที่นี่ และสามารถกู้คืนได้" : "กดสร้างคอร์สใหม่เพื่อเริ่มต้น"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const S = STATUS[c.status] || STATUS.draft
            const inTrash = view === "trash"
            const canManageThis = canManage(c)
            const cardHref = canManageThis ? `${basePath}/courses/${c.id}` : `${basePath}/courses/${c.id}/dashboard`
            const cardClass = `group relative bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
              inTrash ? "border-amber-200 hover:border-amber-300" : "border-slate-100 hover:border-indigo-200"
            }`
            const inner = (
              <>
                <div className={`relative h-32 overflow-hidden ${inTrash ? "bg-amber-50" : "bg-slate-100"}`}>
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title}
                      className={`w-full h-full object-cover ${inTrash ? "opacity-50 grayscale" : ""}`} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      inTrash ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gradient-to-br from-sky-100 to-indigo-100"
                    }`}>
                      <GraduationCap size={36} className={inTrash ? "text-amber-300" : "text-sky-300"} />
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
                  {inTrash && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black inline-flex items-center gap-1">
                      <Archive size={9} /> ถูกลบ
                    </span>
                  )}
                  {/* Action buttons (hover) */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inTrash ? (
                      <>
                        <button onClick={(e) => restore(c, e)} disabled={busyId === c.id}
                          title="กู้คืน"
                          className="p-1.5 bg-emerald-500/95 hover:bg-emerald-500 rounded-lg shadow text-white disabled:opacity-50">
                          {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        </button>
                        <button onClick={(e) => askHardDelete(c, e)}
                          title="ลบถาวร"
                          className="p-1.5 bg-rose-600/95 hover:bg-rose-700 rounded-lg shadow text-white">
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : canManageThis ? (
                      <button onClick={(e) => softDelete(c, e)} disabled={busyId === c.id}
                        title="ย้ายไปถังขยะ (กู้คืนได้)"
                        className="p-1.5 bg-rose-500/90 hover:bg-rose-500 rounded-lg shadow text-white disabled:opacity-50">
                        {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="p-4">
                  <p className={`font-black text-sm line-clamp-2 min-h-[2.5rem] ${inTrash ? "text-slate-600" : "text-slate-800 group-hover:text-indigo-700"}`}>{c.title}</p>
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
                  {inTrash ? (
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={(e) => restore(c, e)} disabled={busyId === c.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                        {busyId === c.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        กู้คืน
                      </button>
                      <button onClick={(e) => askHardDelete(c, e)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors">
                        <Trash2 size={11} /> ลบถาวร
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between text-xs font-black text-indigo-600 group-hover:text-indigo-700">
                      <span>{canManageThis ? "เปิดคอร์ส" : "ดู Dashboard"}</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                  {inTrash && c.deleted_at && (
                    <p className="text-[10px] text-amber-700 mt-2 text-center">
                      ลบเมื่อ {format(new Date(c.deleted_at), "d MMM yyyy HH:mm", { locale: th })}
                    </p>
                  )}
                </div>
              </>
            )
            return inTrash ? (
              <div key={c.id} className={cardClass}>{inner}</div>
            ) : (
              <Link key={c.id} href={cardHref} className={cardClass}>{inner}</Link>
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

      {/* Permanent delete confirmation modal */}
      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeDelete}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-rose-900">ลบถาวร — กู้คืนไม่ได้</h3>
                <p className="text-[11px] text-rose-700">คอร์ส + เนื้อหา + คะแนน จะถูกลบจากระบบอย่างถาวร</p>
              </div>
              <button onClick={closeDelete} className="p-1 hover:bg-rose-100 rounded text-rose-700"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">คอร์ส</p>
                <p className="font-black text-slate-800 truncate">{delTarget.title}</p>
                {delTarget.channel && (
                  <p className="text-[11px] text-slate-500 mt-0.5">📁 {delTarget.channel.name}</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-black">⚠ จะลบสิ่งเหล่านี้ทั้งหมด:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900">
                  <li>บทเรียน · วิดีโอ · ไฟล์แนบทั้งหมดในคอร์ส</li>
                  <li>ควิซ · คำถาม · checkpoint ระหว่างวิดีโอ</li>
                  <li>
                    ใบลงทะเบียนของผู้เรียน
                    {delCounts?.loading
                      ? <Loader2 size={10} className="animate-spin inline ml-1" />
                      : <b className="ml-1">{delCounts?.enrollments ?? 0} คน</b>}
                  </li>
                  <li>ความคืบหน้า · คะแนนสอบ · ประวัติการตอบ checkpoint</li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5">
                  พิมพ์ชื่อคอร์ส <span className="font-mono text-rose-600">{delTarget.title}</span> เพื่อยืนยัน
                </p>
                <input value={delConfirmText} onChange={e => setDelConfirmText(e.target.value)}
                  autoFocus
                  placeholder={delTarget.title}
                  className="w-full bg-white border-2 border-rose-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500 font-mono" />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 flex gap-2 border-t border-slate-100 justify-end">
              <button onClick={closeDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={confirmHardDelete}
                disabled={deleting || delConfirmText.trim() !== delTarget.title.trim()}
                className="px-4 py-2 text-sm font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
