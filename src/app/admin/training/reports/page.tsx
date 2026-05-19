"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  BarChart3, Loader2, Users, CheckCircle2, Clock, AlertTriangle,
  Trophy, GraduationCap, Star, TrendingUp, Award, Activity,
  ArrowUpRight, FileQuestion, Layers,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Overview = {
  total_courses: number
  published_courses: number
  total_enrollments: number
  completed_enrollments: number
  in_progress_enrollments: number
  failed_enrollments: number
  completion_rate: number
}

export default function TrainingReportsPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [channelFilter, setChannelFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/training/reports?type=overview").then(r => r.json()),
      fetch("/api/training/courses").then(r => r.json()),
      fetch("/api/training/channels").then(r => r.json()),
    ]).then(([o, c, ch]) => {
      setOverview(o.overview)
      setCourses(c.courses ?? [])
      setChannels(ch.channels ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredCourses = useMemo(() => {
    return channelFilter ? courses.filter(c => c.channel?.id === channelFilter) : courses
  }, [courses, channelFilter])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" /></div>

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 p-6 text-white shadow-md">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={20} />
              <span className="text-xs font-black tracking-wider opacity-90">REPORTS</span>
            </div>
            <h1 className="text-3xl font-black">รายงานระบบเรียนรู้</h1>
            <p className="text-sm opacity-90 mt-1">ภาพรวมการเรียน + คอร์สทั้งหมด + ความคืบหน้า KPI</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3">
            <p className="text-[11px] opacity-80">อัปเดตล่าสุด</p>
            <p className="text-lg font-black">{format(new Date(), "d MMM yyyy HH:mm", { locale: th })}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards — overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="หลักสูตรทั้งหมด"
            value={overview.total_courses}
            sub={`เผยแพร่ ${overview.published_courses}`}
            icon={<Layers size={20} />}
            color="indigo"
          />
          <KpiCard
            label="ผู้เรียนทั้งหมด"
            value={overview.total_enrollments}
            sub={`${overview.in_progress_enrollments} กำลังเรียน`}
            icon={<Users size={20} />}
            color="sky"
          />
          <KpiCard
            label="จบหลักสูตร"
            value={overview.completed_enrollments}
            sub={`อัตรา ${overview.completion_rate}%`}
            icon={<Trophy size={20} />}
            color="emerald"
            highlight
          />
          <KpiCard
            label="ไม่ผ่าน"
            value={overview.failed_enrollments}
            sub={overview.total_enrollments > 0 ? `${((overview.failed_enrollments / overview.total_enrollments) * 100).toFixed(1)}%` : "—"}
            icon={<AlertTriangle size={20} />}
            color="rose"
          />
        </div>
      )}

      {/* Visual breakdown — bars */}
      {overview && overview.total_enrollments > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-500" />
            <h2 className="font-black text-slate-800">สถานะการเรียนของพนักงานทั้งหมด</h2>
          </div>
          <div className="space-y-3">
            <StatusBar
              label="จบหลักสูตร"
              count={overview.completed_enrollments}
              total={overview.total_enrollments}
              color="bg-emerald-500"
              icon={<CheckCircle2 size={14} className="text-emerald-500" />}
            />
            <StatusBar
              label="กำลังเรียน"
              count={overview.in_progress_enrollments}
              total={overview.total_enrollments}
              color="bg-amber-500"
              icon={<Clock size={14} className="text-amber-500" />}
            />
            <StatusBar
              label="ยังไม่เริ่ม"
              count={overview.total_enrollments - overview.completed_enrollments - overview.in_progress_enrollments - overview.failed_enrollments}
              total={overview.total_enrollments}
              color="bg-slate-400"
              icon={<Clock size={14} className="text-slate-400" />}
            />
            <StatusBar
              label="ไม่ผ่าน"
              count={overview.failed_enrollments}
              total={overview.total_enrollments}
              color="bg-rose-500"
              icon={<AlertTriangle size={14} className="text-rose-500" />}
            />
          </div>
        </div>
      )}

      {/* Courses table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-indigo-500" />
            <h2 className="font-black text-slate-800">รายงานรายคอร์ส ({filteredCourses.length})</h2>
          </div>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">ทุกช่อง</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <GraduationCap size={32} className="mx-auto mb-2 text-slate-200" />
            ยังไม่มีคอร์ส
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>คอร์ส</Th>
                  <Th>ช่อง</Th>
                  <Th>สถานะ</Th>
                  <Th>KPI</Th>
                  <Th>เกณฑ์ผ่าน</Th>
                  <Th>v</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{c.title}</p>
                      {c.description && <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.channel?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "published" ? "bg-emerald-100 text-emerald-700" :
                        c.status === "archived" ? "bg-rose-100 text-rose-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {c.status === "published" ? "เผยแพร่" : c.status === "archived" ? "เก็บ" : "ฉบับร่าง"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.affect_kpi
                        ? <span className="text-amber-600 font-bold">⭐ มีผล {c.kpi_weight ?? 0}%</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{c.passing_score}%</td>
                    <td className="px-4 py-3 text-xs text-slate-400">v{c.version}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/training/courses/${c.id}/dashboard`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                        Dashboard <ArrowUpRight size={11} />
                      </Link>
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
        <QuickLink href="/admin/training/channels" icon={<Layers size={18} />}
          label="จัดการช่อง" desc={`${channels.length} ช่อง`} color="indigo" />
        <QuickLink href="/admin/training/courses" icon={<GraduationCap size={18} />}
          label="จัดการคอร์ส" desc={`${courses.length} คอร์ส`} color="sky" />
        <QuickLink href="/admin/training/question-bank" icon={<FileQuestion size={18} />}
          label="คลังคำถาม" desc="สุ่มใช้ในควิซ" color="amber" />
      </div>
    </div>
  )
}

// ─────────── Sub-components ────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, highlight }: any) {
  const cls: Record<string, string> = {
    indigo:  "from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200",
    sky:     "from-sky-50 to-sky-100 text-sky-700 border-sky-200",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    amber:   "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    rose:    "from-rose-50 to-rose-100 text-rose-700 border-rose-200",
  }
  return (
    <div className={`bg-gradient-to-br ${cls[color]} border rounded-2xl p-4 ${highlight ? "ring-2 ring-emerald-300 shadow-md" : ""}`}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        <span className="text-[11px] font-bold">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-black">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

function StatusBar({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: React.ReactNode }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-bold text-slate-700 flex-1">{label}</span>
        <span className="text-xs font-bold text-slate-700">
          {count.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 whitespace-nowrap uppercase tracking-wider">{children}</th>
}

function QuickLink({ href, icon, label, desc, color }: any) {
  const cls: Record<string, string> = {
    indigo: "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50",
    sky:    "border-sky-200 hover:border-sky-400 hover:bg-sky-50/50",
    amber:  "border-amber-200 hover:border-amber-400 hover:bg-amber-50/50",
  }
  const iconCls: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    sky:    "bg-sky-100 text-sky-700",
    amber:  "bg-amber-100 text-amber-700",
  }
  return (
    <Link href={href} className={`bg-white border ${cls[color]} rounded-2xl p-4 transition-all flex items-center gap-3 group`}>
      <div className={`w-10 h-10 rounded-xl ${iconCls[color]} flex items-center justify-center`}>{icon}</div>
      <div className="flex-1">
        <p className="font-black text-sm text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-600" />
    </Link>
  )
}
