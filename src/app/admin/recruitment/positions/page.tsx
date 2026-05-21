"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus, Briefcase, ArrowLeft, Eye, Users, Edit2, Loader2, Trash2,
  Search, Filter, RefreshCw, Copy, ExternalLink, Calendar, MapPin,
  CheckCircle2, X, ChevronRight,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS: Record<string, { l: string; c: string; bg: string; dot: string }> = {
  draft:    { l: "ฉบับร่าง",    c: "text-slate-700",   bg: "bg-slate-100",   dot: "bg-slate-400" },
  open:     { l: "เปิดรับสมัคร", c: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500" },
  closed:   { l: "ปิดรับ",       c: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-500" },
  archived: { l: "เก็บถาวร",     c: "text-rose-700",    bg: "bg-rose-50",     dot: "bg-rose-400" },
}

const EMPLOYMENT: Record<string, string> = {
  full_time: "ประจำ", part_time: "พาร์ทไทม์", contract: "สัญญา", intern: "ฝึกงาน", freelance: "ฟรีแลนซ์",
}

export default function PositionsPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/recruitment/positions").then(r => r.json())
      .then(d => { setList(d.positions || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let rows = list
    if (statusFilter) rows = rows.filter(p => p.status === statusFilter)
    const s = search.trim().toLowerCase()
    if (s) {
      rows = rows.filter(p => {
        const blob = `${p.title?.th || ""} ${p.title?.en || ""} ${p.title?.zh || ""} ${p.department?.name || ""} ${p.location_city || ""}`.toLowerCase()
        return blob.includes(s)
      })
    }
    return rows
  }, [list, search, statusFilter])

  // Stats
  const stats = useMemo(() => ({
    total:     list.length,
    open:      list.filter(p => p.status === "open").length,
    draft:     list.filter(p => p.status === "draft").length,
    closed:    list.filter(p => ["closed", "archived"].includes(p.status)).length,
    totalApps: list.reduce((s, p) => s + (p.applications_count || 0), 0),
    totalViews: list.reduce((s, p) => s + (p.views_count || 0), 0),
  }), [list])

  const create = async () => {
    if (!newTitle.trim()) { toast.error("กรุณาตั้งชื่อตำแหน่ง"); return }
    setCreating(true)
    const res = await fetch("/api/recruitment/positions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: { th: newTitle.trim(), en: newTitle.trim(), zh: newTitle.trim() }, status: "draft" }),
    })
    const d = await res.json()
    setCreating(false)
    if (!res.ok) { toast.error(d.error); return }
    toast.success("สร้างแล้ว — แก้ไขรายละเอียดต่อ")
    window.location.href = `/admin/recruitment/positions/${d.id}`
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`เก็บถาวรตำแหน่ง "${title}"?`)) return
    await fetch(`/api/recruitment/positions?id=${id}`, { method: "DELETE" })
    toast.success("เก็บถาวรแล้ว"); load()
  }

  const copyLink = (slug: string) => {
    const url = `https://careers.shd-technology.co.th/jobs/${slug}`
    navigator.clipboard?.writeText(url)
    toast.success("คัดลอกลิงก์แล้ว")
  }

  const togglePublish = async (p: any) => {
    const newStatus = p.status === "open" ? "closed" : "open"
    await fetch("/api/recruitment/positions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status: newStatus }),
    })
    toast.success(newStatus === "open" ? "เผยแพร่แล้ว" : "ปิดรับแล้ว")
    load()
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/recruitment" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> Dashboard
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ตำแหน่งงาน</h2>
          <p className="text-slate-400 text-sm">{filtered.length} / {list.length} ตำแหน่ง</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setNewTitle(""); setShowCreate(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
            <Plus size={14} /> สร้างตำแหน่งใหม่
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { l: "ทั้งหมด",   v: stats.total,     bg: "bg-slate-50",   ic: "text-slate-500",   vc: "text-slate-700" },
          { l: "เปิดรับ",   v: stats.open,      bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
          { l: "ฉบับร่าง",  v: stats.draft,     bg: "bg-amber-50",   ic: "text-amber-500",   vc: "text-amber-700" },
          { l: "ปิด/เก็บ",  v: stats.closed,    bg: "bg-rose-50",    ic: "text-rose-500",    vc: "text-rose-700" },
          { l: "ผู้สมัคร",  v: stats.totalApps, bg: "bg-sky-50",     ic: "text-sky-500",     vc: "text-sky-700" },
          { l: "ยอดเข้าชม", v: stats.totalViews, bg: "bg-indigo-50",  ic: "text-indigo-500",  vc: "text-indigo-700" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
            <p className={`text-[10px] text-slate-400 font-bold ${k.ic}`}>{k.l}</p>
            <p className={`text-2xl font-black ${k.vc} mt-1`}>{k.v.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อตำแหน่ง · แผนก · เมือง..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(""); setStatusFilter("") }}
            className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
      </div>

      {/* Empty / Loading / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-100 rounded-2xl h-60 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Briefcase size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{search || statusFilter ? "ไม่พบตำแหน่งตามตัวกรอง" : "ยังไม่มีตำแหน่งเปิดรับสมัคร"}</p>
          <p className="text-xs text-slate-400 mt-1">กดสร้างตำแหน่งใหม่เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const S = STATUS[p.status] || STATUS.draft
            const title = p.title?.th || p.title?.en || "(ยังไม่ตั้งชื่อ)"
            const closing = p.close_date ? new Date(p.close_date) : null
            const isClosingSoon = closing && (closing.getTime() - Date.now()) < 7 * 86400000 && closing.getTime() > Date.now()
            return (
              <div key={p.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
                {/* Cover */}
                <div className="relative h-28 bg-slate-100 overflow-hidden">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <Briefcase size={32} className="text-indigo-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${S.bg} ${S.c}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${S.dot}`} />
                      {S.l}
                    </span>
                    {isClosingSoon && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/95 text-white">
                        ⚠ ใกล้ปิด
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-black text-slate-800 text-sm line-clamp-2 min-h-[2.5rem]">{title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 flex-wrap">
                    {p.department?.name && (
                      <span className="inline-flex items-center gap-1"><Briefcase size={10} /> {p.department.name}</span>
                    )}
                    {p.location_city && (
                      <span className="inline-flex items-center gap-1"><MapPin size={10} /> {p.location_city}</span>
                    )}
                    {p.employment_type && (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-bold">· {EMPLOYMENT[p.employment_type] || p.employment_type}</span>
                    )}
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                    <div className="bg-sky-50 rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-sky-600 font-bold uppercase">ผู้สมัคร</p>
                      <p className="text-sm font-black text-sky-700 flex items-center gap-1">
                        <Users size={11} /> {p.applications_count || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-amber-600 font-bold uppercase">ยอดเข้าชม</p>
                      <p className="text-sm font-black text-amber-700 flex items-center gap-1">
                        <Eye size={11} /> {p.views_count || 0}
                      </p>
                    </div>
                  </div>

                  {p.close_date && (
                    <p className="text-[10px] text-slate-400 mb-2 inline-flex items-center gap-1">
                      <Calendar size={10} /> ปิดรับ {format(new Date(p.close_date), "d MMM yy", { locale: th })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 mt-auto pt-2 border-t border-slate-50">
                    <Link href={`/admin/recruitment/positions/${p.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                      <Edit2 size={11} /> แก้ไข
                    </Link>
                    <Link href={`/admin/recruitment/applicants?position_id=${p.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold">
                      <Users size={11} /> {p.applications_count || 0}
                    </Link>
                    {p.status === "open" ? (
                      <button onClick={() => copyLink(p.slug)}
                        title="คัดลอกลิงก์สำหรับแชร์"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Copy size={12} />
                      </button>
                    ) : null}
                    <button onClick={() => togglePublish(p)}
                      title={p.status === "open" ? "ปิดรับสมัคร" : "เผยแพร่"}
                      className={`p-1.5 rounded-lg ${p.status === "open" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                      {p.status === "open" ? <X size={12} /> : <CheckCircle2 size={12} />}
                    </button>
                    <button onClick={() => del(p.id, title)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="เก็บถาวร">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Plus size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800">สร้างตำแหน่งใหม่</h3>
                <p className="text-[11px] text-slate-400">ตั้งชื่อก่อน — เพิ่มรายละเอียดในขั้นถัดไป</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">ชื่อตำแหน่ง (ภาษาไทย)</p>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && create()} autoFocus
                  placeholder="เช่น Business Development Analyst"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                💡 หลังกด "สร้าง" จะเข้าหน้าแก้ไขทันที — กรอกชื่อภาษาอังกฤษ/จีน, รายละเอียด, ภาพปก, ฯลฯ ก่อนเผยแพร่
              </p>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={create} disabled={creating || !newTitle.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                สร้างและแก้ไขต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
