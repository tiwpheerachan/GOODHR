"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Users, ArrowLeft, Search, Mail, Phone, Calendar, FileText, Loader2,
  Eye, ExternalLink, Globe, Filter, X, RefreshCw, Download,
  Briefcase, MapPin, Building2, Star, ChevronRight, Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

const STATUS: Record<string, { l: string; c: string; bg: string; ring: string; dot: string }> = {
  new:       { l: "ใหม่",        c: "text-sky-700",     bg: "bg-sky-50",     ring: "ring-sky-200",     dot: "bg-sky-400" },
  screening: { l: "คัดกรอง",     c: "text-indigo-700",  bg: "bg-indigo-50",  ring: "ring-indigo-200",  dot: "bg-indigo-400" },
  interview: { l: "สัมภาษณ์",    c: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200",   dot: "bg-amber-400" },
  offered:   { l: "เสนอ Offer",  c: "text-pink-700",    bg: "bg-pink-50",    ring: "ring-pink-200",    dot: "bg-pink-400" },
  hired:     { l: "จ้างแล้ว",    c: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  rejected:  { l: "ปฏิเสธ",      c: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200",    dot: "bg-rose-400" },
  withdrawn: { l: "ถอนตัว",      c: "text-slate-600",   bg: "bg-slate-100",  ring: "ring-slate-200",   dot: "bg-slate-400" },
}

export default function ApplicantsPage() {
  const sp = useSearchParams()
  const positionFilter = sp?.get("position_id") || ""
  const statusFromUrl = sp?.get("status") || ""
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(statusFromUrl)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [view, setView] = useState<"table" | "kanban">("table")

  const load = () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (positionFilter) qs.set("position_id", positionFilter)
    if (statusFilter) qs.set("status", statusFilter)
    fetch(`/api/recruitment/applicants?${qs}`).then(r => r.json())
      .then(d => { setList(d.applications || []); setLoading(false) })
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [positionFilter, statusFilter])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return list
    return list.filter(a =>
      `${a.first_name} ${a.last_name} ${a.email} ${a.phone || ""} ${a.application_code} ${a.position?.title?.th || ""} ${a.position?.title?.en || ""}`.toLowerCase().includes(s))
  }, [list, search])

  // Stats — count by status (จาก list ที่ไม่ผ่าน status filter — ใช้ all list)
  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, screening: 0, interview: 0, offered: 0, hired: 0, rejected: 0, withdrawn: 0 }
    for (const a of list) c[a.status] = (c[a.status] || 0) + 1
    return c
  }, [list])

  const openDetail = async (id: string) => {
    const d = await fetch(`/api/recruitment/applicants?id=${id}`).then(r => r.json())
    setSelected(d.application)
  }

  const changeStatus: (id: string, status: string) => Promise<void> = async (id, status) => {
    await fetch("/api/recruitment/applicants", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    toast.success(`เปลี่ยนเป็น "${STATUS[status]?.l}" แล้ว`)
    load()
    if (selected?.id === id) openDetail(id)
  }

  const exportCsv = () => {
    const rows = filtered.map(a => ({
      code: a.application_code,
      name: `${a.first_name} ${a.last_name}`,
      email: a.email,
      phone: a.phone || "",
      position: a.position?.title?.th || a.position?.title?.en || "",
      status: STATUS[a.status]?.l || a.status,
      applied: a.applied_at,
      source: a.source || "",
    }))
    const headers = ["รหัส", "ชื่อ-นามสกุล", "อีเมล", "โทร", "ตำแหน่ง", "สถานะ", "วันที่สมัคร", "ที่มา"]
    const csv = [
      headers.join(","),
      ...rows.map(r => [r.code, r.name, r.email, r.phone, r.position, r.status, r.applied, r.source]
        .map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `applicants_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success(`Export ${rows.length} ใบสมัครแล้ว`)
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/recruitment" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> Dashboard
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ผู้สมัครงาน</h2>
          <p className="text-slate-400 text-sm">{filtered.length} / {list.length} ใบสมัคร</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === "table" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              ตาราง
            </button>
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              Kanban
            </button>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={exportCsv} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Status quick filters (chips) */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            !statusFilter
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}>
          ทั้งหมด <span className="ml-1 opacity-70">{list.length}</span>
        </button>
        {Object.entries(STATUS).map(([k, v]) => {
          const active = statusFilter === k
          return (
            <button key={k} onClick={() => setStatusFilter(active ? "" : k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                active ? `${v.bg} ${v.c} border-current shadow-sm` : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
              {v.l}
              <span className="opacity-70">{counts[k] || 0}</span>
            </button>
          )
        })}
      </div>

      {/* Search bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อ · อีเมล · โทร · รหัสใบสมัคร · ตำแหน่ง..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
      </div>

      {/* View body */}
      {loading ? (
        <div className="bg-slate-100 rounded-2xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Users size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{search || statusFilter ? "ไม่พบใบสมัคร" : "ยังไม่มีใบสมัคร"}</p>
        </div>
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={openDetail} />
      ) : (
        <KanbanView rows={filtered} onOpen={openDetail} onMove={changeStatus} />
      )}

      {selected && (
        <ApplicantDetail data={selected} onClose={() => setSelected(null)} onStatus={(s: string) => changeStatus(selected.id, s)} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Table view
function TableView({ rows, onOpen }: { rows: any[]; onOpen: (id: string) => void }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <Th>รหัสใบสมัคร</Th><Th>ผู้สมัคร</Th><Th>ตำแหน่ง</Th>
              <Th>สถานะ</Th><Th>ที่มา</Th><Th>วันที่สมัคร</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(a => {
              const S = STATUS[a.status] || STATUS.new
              return (
                <tr key={a.id} onClick={() => onOpen(a.id)}
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{a.application_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${a.first_name} ${a.last_name}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{a.first_name} {a.last_name}</p>
                        <p className="text-[10px] text-slate-400 truncate inline-flex items-center gap-1">
                          <Mail size={9} /> {a.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-bold text-slate-700 truncate max-w-44">{a.position?.title?.th || a.position?.title?.en || "—"}</p>
                    {a.position?.employment_type && <p className="text-[10px] text-slate-400">{a.position.employment_type}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${S.bg} ${S.c}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${S.dot}`} />
                      {S.l}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{a.source || "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {format(new Date(a.applied_at), "d MMM HH:mm", { locale: th })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onOpen(a.id) }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Kanban view
function KanbanView({ rows, onOpen, onMove }: { rows: any[]; onOpen: (id: string) => void; onMove: (id: string, status: string) => void }) {
  const cols: (keyof typeof STATUS)[] = ["new", "screening", "interview", "offered", "hired"]
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {cols.map(c => {
          const S = STATUS[c]
          const items = rows.filter(a => a.status === c)
          return (
            <div key={c} className="w-72 flex-shrink-0">
              <div className={`px-3 py-2 rounded-t-xl ${S.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${S.dot}`} />
                  <p className={`font-black text-xs ${S.c}`}>{S.l}</p>
                </div>
                <span className={`text-[10px] font-black ${S.c}`}>{items.length}</span>
              </div>
              <div className="bg-slate-50 rounded-b-xl border-x border-b border-slate-100 p-2 min-h-[60vh] space-y-2">
                {items.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-400 py-6">— ว่าง —</p>
                ) : items.map(a => (
                  <div key={a.id} onClick={() => onOpen(a.id)}
                    className="bg-white border border-slate-100 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar name={`${a.first_name} ${a.last_name}`} size={6} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{a.first_name} {a.last_name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{a.email}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold line-clamp-1">{a.position?.title?.th || a.position?.title?.en}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-mono">{a.application_code} · {format(new Date(a.applied_at), "d MMM", { locale: th })}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Detail modal
function ApplicantDetail({ data, onClose, onStatus }: any) {
  const S = STATUS[data.status] || STATUS.new
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Avatar name={`${data.first_name} ${data.last_name}`} size={12} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-800">{data.first_name} {data.last_name}</h2>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${S.bg} ${S.c}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${S.dot}`} />
                {S.l}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">{data.application_code} · {data.position?.title?.th || data.position?.title?.en}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {/* Status pipeline */}
          <Sec title="เปลี่ยนสถานะ" icon={<Sparkles size={14} className="text-indigo-500" />}>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS).map(([k, v]) => (
                <button key={k} onClick={() => onStatus(k)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    data.status === k
                      ? `${v.bg} ${v.c} border-current ring-2 ring-offset-1 ring-current`
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
                  {v.l}
                </button>
              ))}
            </div>
          </Sec>

          {/* Contact + position grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Sec title="ติดต่อ" icon={<Mail size={14} className="text-sky-500" />}>
              <Row icon={<Mail size={11} />} label="Email"><a href={`mailto:${data.email}`} className="text-sky-600 hover:underline">{data.email}</a></Row>
              {data.phone && <Row icon={<Phone size={11} />} label="โทร"><a href={`tel:${data.phone}`} className="text-sky-600 hover:underline">{data.phone}</a></Row>}
              {data.website_url && <Row icon={<Globe size={11} />} label="Website"><a href={data.website_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline truncate inline-block max-w-44">{data.website_url}</a></Row>}
              <Row icon={<MapPin size={11} />} label="ประเทศ">{data.current_country || "—"}</Row>
            </Sec>

            <Sec title="ตำแหน่ง" icon={<Briefcase size={14} className="text-indigo-500" />}>
              <Row label="ตำแหน่ง">{data.position?.title?.th || data.position?.title?.en || "—"}</Row>
              <Row label="ประเภท">{data.position?.employment_type || "—"}</Row>
              <Row label="ที่มา">{data.source || "—"}</Row>
              <Row icon={<Calendar size={11} />} label="วันที่สมัคร">{format(new Date(data.applied_at), "d MMM yyyy HH:mm", { locale: th })}</Row>
            </Sec>
          </div>

          {/* Resume */}
          {data.resume_signed_url && (
            <Sec title="Resume" icon={<FileText size={14} className="text-emerald-500" />}>
              <a href={data.resume_signed_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold transition-colors">
                <FileText size={14} /> {data.resume_filename || "Resume"} <ExternalLink size={11} />
              </a>
            </Sec>
          )}

          {/* Skills */}
          {data.skills?.length > 0 && (
            <Sec title="ทักษะ" icon={<Star size={14} className="text-amber-500" />}>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((s: string) => (
                  <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-bold">{s}</span>
                ))}
              </div>
            </Sec>
          )}

          {/* Education */}
          {data.education?.length > 0 && (
            <Sec title="การศึกษา" icon={<Building2 size={14} className="text-purple-500" />}>
              <div className="space-y-2">
                {data.education.map((e: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-3">
                    <p className="font-bold text-sm text-slate-800">{e.school || "—"}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{e.level || "—"} · {e.from || "—"} – {e.to || "—"}</p>
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* Experience */}
          {data.experience?.length > 0 && (
            <Sec title="ประสบการณ์" icon={<Briefcase size={14} className="text-pink-500" />}>
              <div className="space-y-2">
                {data.experience.map((e: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-3">
                    <p className="font-bold text-sm text-slate-800">{e.title || "—"}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{e.company || "—"} · {e.from || "—"} – {e.to || "—"}</p>
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* Attachments */}
          {data.attachments?.length > 0 && (
            <Sec title="เอกสารแนบ" icon={<FileText size={14} className="text-slate-500" />}>
              <div className="space-y-1">
                {data.attachments.map((a: any, i: number) => (
                  <a key={i} href={a.signed_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-lg text-xs">
                    <FileText size={12} className="text-slate-400" />
                    <span className="flex-1 truncate">{a.filename}</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </a>
                ))}
              </div>
            </Sec>
          )}

          {/* Other info */}
          <Sec title="ข้อมูลอื่น" icon={<Sparkles size={14} className="text-slate-400" />}>
            <Row label="Visa support">{data.visa_support === "yes" ? "ต้องการ" : "ไม่ต้องการ"}</Row>
            <Row label="พร้อมเริ่ม">{data.available_start_date ? format(new Date(data.available_start_date), "d MMM yyyy", { locale: th }) : "—"}</Row>
            {data.address_detail && <Row label="ที่อยู่">{data.address_detail}</Row>}
          </Sec>
        </div>

        {/* Footer with mailto */}
        <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-slate-400">
            สมัครเมื่อ {format(new Date(data.applied_at), "d MMM yyyy HH:mm", { locale: th })}
          </p>
          <div className="flex gap-2">
            <a href={`mailto:${data.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
              <Mail size={12} /> ตอบกลับอีเมล
            </a>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 whitespace-nowrap uppercase tracking-wider">{children}</th>
}
function Sec({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
      <p className="text-xs font-black text-slate-600 mb-2 flex items-center gap-1.5">
        {icon} {title}
      </p>
      {children}
    </div>
  )
}
function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm py-0.5">
      {icon && <span className="text-slate-400 mt-0.5 w-3 flex-shrink-0">{icon}</span>}
      <span className="text-slate-500 w-24 flex-shrink-0 text-xs">{label}</span>
      <span className="flex-1 text-slate-800 text-xs">{children}</span>
    </div>
  )
}
function Avatar({ name, size = 9 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  // Color from name hash (consistent)
  const colors = ["bg-sky-100 text-sky-700", "bg-indigo-100 text-indigo-700", "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700"]
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const cls = colors[hash % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full ${cls} flex items-center justify-center font-black text-[10px] flex-shrink-0`}>
      {initials}
    </div>
  )
}
