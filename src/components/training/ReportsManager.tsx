"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  BarChart3, Loader2, Users, CheckCircle2, Clock, AlertTriangle,
  Trophy, GraduationCap, ArrowUpRight, FileQuestion, Layers,
  ArrowLeft, Activity, RefreshCw, Download, FileSpreadsheet,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Overview = {
  total_courses: number; published_courses: number
  total_enrollments: number; completed_enrollments: number
  in_progress_enrollments: number; failed_enrollments: number
  completion_rate: number
}

export default function ReportsManager({ basePath }: { basePath: string }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [channelFilter, setChannelFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [exporting, setExporting] = useState(false)

  const exportXlsx = async (opts: { channel_id?: string; course_id?: string } = {}) => {
    if (exporting) return
    setExporting(true)
    const t = toast.loading("กำลังสร้างไฟล์ Excel...")
    try {
      const qs = new URLSearchParams()
      if (opts.channel_id) qs.set("channel_id", opts.channel_id)
      if (opts.course_id)  qs.set("course_id", opts.course_id)
      const res = await fetch(`/api/training/reports/export${qs.toString() ? "?" + qs.toString() : ""}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j.error || `ดาวน์โหลดไม่สำเร็จ (${res.status})`, { id: t })
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") || ""
      const m = cd.match(/filename="?([^"]+)"?/)
      const filename = m?.[1] || `training_report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success("ดาวน์โหลดแล้ว", { id: t })
    } catch (e: any) {
      toast.error(e?.message || "เกิดข้อผิดพลาด", { id: t })
    } finally {
      setExporting(false)
    }
  }

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/training/reports?type=overview").then(r => r.json()),
      fetch("/api/training/courses").then(r => r.json()),
      fetch("/api/training/channels").then(r => r.json()),
    ]).then(([o, c, ch]) => {
      setOverview(o.overview)
      setCourses(c.courses ?? [])
      setChannels(ch.channels ?? [])
      setLoading(false); setLastRefresh(new Date())
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filteredCourses = useMemo(() => {
    return channelFilter ? courses.filter(c => c.channel?.id === channelFilter) : courses
  }, [courses, channelFilter])

  if (loading && !overview) return (
    <div className="space-y-5">
      <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบเรียนรู้
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">รายงานระบบเรียนรู้</h2>
          <p className="text-slate-400 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportXlsx(channelFilter ? { channel_id: channelFilter } : {})}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            ดาวน์โหลด Excel
            {channelFilter && <span className="ml-1 px-1.5 py-0.5 bg-white/25 rounded-full text-[9px]">{channels.find(c => c.id === channelFilter)?.name}</span>}
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {format(lastRefresh, "HH:mm")}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "หลักสูตรทั้งหมด", v: overview.total_courses, sub: `เผยแพร่ ${overview.published_courses}`, icon: Layers, bg: "bg-indigo-50", ic: "text-indigo-500", vc: "text-indigo-700" },
            { l: "ผู้เรียนทั้งหมด", v: overview.total_enrollments, sub: `${overview.in_progress_enrollments} กำลังเรียน`, icon: Users, bg: "bg-sky-50", ic: "text-sky-500", vc: "text-sky-700" },
            { l: "จบหลักสูตร", v: overview.completed_enrollments, sub: `อัตรา ${overview.completion_rate}%`, icon: Trophy, bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
            { l: "ไม่ผ่าน", v: overview.failed_enrollments, sub: overview.total_enrollments > 0 ? `${((overview.failed_enrollments / overview.total_enrollments) * 100).toFixed(1)}%` : "—", icon: AlertTriangle, bg: "bg-rose-50", ic: "text-rose-500", vc: "text-rose-700" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon size={14} className={k.ic} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{k.l}</span>
              </div>
              <p className={`text-2xl font-black ${k.vc}`}>{(k.v || 0).toLocaleString()}</p>
              {k.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Status breakdown */}
      {overview && overview.total_enrollments > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Activity size={14} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">สถานะการเรียนของพนักงานทั้งหมด</h3>
              <p className="text-[11px] text-slate-400">รวม {overview.total_enrollments} ใบลงทะเบียน</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <StatusBar label="จบหลักสูตร" count={overview.completed_enrollments} total={overview.total_enrollments}
              color="bg-emerald-500" dot="bg-emerald-500" />
            <StatusBar label="กำลังเรียน" count={overview.in_progress_enrollments} total={overview.total_enrollments}
              color="bg-amber-400" dot="bg-amber-400" />
            <StatusBar label="ยังไม่เริ่ม"
              count={overview.total_enrollments - overview.completed_enrollments - overview.in_progress_enrollments - overview.failed_enrollments}
              total={overview.total_enrollments} color="bg-slate-300" dot="bg-slate-400" />
            <StatusBar label="ไม่ผ่าน" count={overview.failed_enrollments} total={overview.total_enrollments}
              color="bg-rose-400" dot="bg-rose-400" />
          </div>
        </div>
      )}

      {/* Courses table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
              <GraduationCap size={14} className="text-sky-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">รายงานรายคอร์ส</h3>
              <p className="text-[11px] text-slate-400">{filteredCourses.length} คอร์ส</p>
            </div>
          </div>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
            <option value="">ทุกช่อง</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <GraduationCap size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm">ยังไม่มีคอร์ส</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <Th>คอร์ส</Th><Th>ช่อง</Th><Th>สถานะ</Th><Th>KPI</Th><Th>เกณฑ์ผ่าน</Th><Th>v</Th><Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCourses.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 text-sm">{c.title}</p>
                      {c.description && <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.channel?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "published" ? "bg-emerald-50 text-emerald-700" :
                        c.status === "archived" ? "bg-rose-50 text-rose-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {c.status === "published" ? "เผยแพร่" : c.status === "archived" ? "เก็บ" : "ฉบับร่าง"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.affect_kpi
                        ? <span className="text-amber-600 font-bold">⭐ {c.kpi_weight ?? 0}%</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{c.passing_score}%</td>
                    <td className="px-4 py-3 text-xs text-slate-400">v{c.version}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => exportXlsx({ course_id: c.id })}
                          disabled={exporting}
                          title="ดาวน์โหลด Excel เฉพาะคอร์สนี้"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold disabled:opacity-50">
                          <Download size={11} /> Excel
                        </button>
                        <Link href={`${basePath}/courses/${c.id}/dashboard`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                          Dashboard <ArrowUpRight size={11} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickLink href={`${basePath}/channels`} icon={<Layers size={16} />} label="จัดการช่อง" desc={`${channels.length} ช่อง`} color="indigo" />
        <QuickLink href={`${basePath}/courses`} icon={<GraduationCap size={16} />} label="จัดการคอร์ส" desc={`${courses.length} คอร์ส`} color="sky" />
        <QuickLink href={`${basePath}/question-bank`} icon={<FileQuestion size={16} />} label="คลังคำถาม" desc="สุ่มใช้ในควิซ" color="amber" />
      </div>
    </div>
  )
}

function StatusBar({ label, count, total, color, dot }: { label: string; count: number; total: number; color: string; dot: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-xs font-bold text-slate-700 flex-1">{label}</span>
        <span className="text-xs font-bold text-slate-700">
          {count.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 whitespace-nowrap uppercase tracking-wider">{children}</th>
}

function QuickLink({ href, icon, label, desc, color }: any) {
  const cls: Record<string, { bg: string; ic: string; hover: string }> = {
    indigo:  { bg: "bg-indigo-50",  ic: "text-indigo-500",  hover: "hover:border-indigo-200" },
    sky:     { bg: "bg-sky-50",     ic: "text-sky-500",     hover: "hover:border-sky-200" },
    amber:   { bg: "bg-amber-50",   ic: "text-amber-500",   hover: "hover:border-amber-200" },
  }
  const C = cls[color] || cls.sky
  return (
    <Link href={href} className={`group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all ${C.hover} hover:shadow-md`}>
      <div className={`w-10 h-10 ${C.bg} rounded-xl flex items-center justify-center ${C.ic}`}>{icon}</div>
      <div className="flex-1">
        <p className="font-black text-sm text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400">{desc}</p>
      </div>
      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-600" />
    </Link>
  )
}
