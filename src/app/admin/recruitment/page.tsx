"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Briefcase, Users, Eye, TrendingUp, Loader2, RefreshCw,
  Plus, BarChart3, UserPlus, Activity, ArrowRight,
  CheckCircle2, Clock, Award, AlertCircle, ChevronRight, ExternalLink,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const FUNNEL = [
  { k: "new",       l: "ใหม่",        c: "bg-sky-400",     bg: "bg-sky-50" },
  { k: "screening", l: "คัดกรอง",     c: "bg-indigo-400",  bg: "bg-indigo-50" },
  { k: "interview", l: "สัมภาษณ์",    c: "bg-amber-400",   bg: "bg-amber-50" },
  { k: "offered",   l: "เสนอ Offer",  c: "bg-pink-400",    bg: "bg-pink-50" },
  { k: "hired",     l: "จ้างแล้ว",    c: "bg-emerald-500", bg: "bg-emerald-50" },
]

const SRC_LABEL: Record<string, string> = {
  linkedin: "LinkedIn", facebook: "Facebook", jobsdb: "JobsDB/JobThai",
  referral: "เพื่อนแนะนำ", website: "เว็บไซต์บริษัท", other: "อื่นๆ", unknown: "ไม่ระบุ",
}

export default function RecruitmentDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = () => {
    setLoading(true)
    fetch("/api/recruitment/dashboard").then(r => r.json()).then(d => {
      setData(d); setLoading(false); setLastRefresh(new Date())
    })
  }
  useEffect(() => { load() }, [])

  if (loading && !data) return (
    <div className="space-y-4">
      <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  )

  if (!data) return <div className="p-6 text-center text-slate-400">โหลดไม่สำเร็จ</div>

  const { overview, statusCount, sourceCount } = data
  const maxFunnel = Math.max(1, ...FUNNEL.map(f => statusCount[f.k] || 0))
  const sources = Object.entries(sourceCount).sort((a: any, b: any) => b[1] - a[1])
  const totalConverted = (statusCount.hired || 0)
  const totalReceived = overview.total_applications || 0
  const conversionRate = totalReceived > 0 ? Math.round((totalConverted / totalReceived) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Title bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ระบบรับสมัครงาน</h2>
          <p className="text-slate-400 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="https://careers.shd-technology.co.th" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <ExternalLink size={12} /> เปิดหน้า Careers
          </a>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {format(lastRefresh, "HH:mm")}
          </button>
        </div>
      </div>

      {/* ── Action bar (โดดเด่นเหมือน main dashboard) ─────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm">จัดการตำแหน่งงานและผู้สมัคร</p>
          <p className="text-indigo-100 text-[11px] mt-0.5">สร้างตำแหน่งใหม่ · เผยแพร่ที่ careers.shd-technology.co.th · ดูใบสมัคร</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/admin/recruitment/applicants"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-xl transition-colors">
            <Users size={14} /> ดูผู้สมัคร
          </Link>
          <Link href="/admin/recruitment/positions"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 text-sm font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            <Plus size={14} /> สร้างตำแหน่งใหม่
          </Link>
        </div>
      </div>

      {/* ── KPI row (เรียบ ๆ สีอ่อน เหมือนหน้า dashboard) ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { l: "ตำแหน่งทั้งหมด",  v: overview.total_positions,        icon: Briefcase,  bg: "bg-indigo-50",  ic: "text-indigo-500",  vc: "text-indigo-700",  href: "/admin/recruitment/positions" },
          { l: "เปิดรับสมัคร",     v: overview.open_positions,         icon: CheckCircle2, bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700", href: "/admin/recruitment/positions?status=open" },
          { l: "ฉบับร่าง",         v: overview.draft_positions,        icon: AlertCircle, bg: "bg-slate-50",   ic: "text-slate-500",   vc: "text-slate-700",   href: "/admin/recruitment/positions?status=draft" },
          { l: "ผู้สมัครรวม",      v: overview.total_applications,     icon: Users,       bg: "bg-sky-50",     ic: "text-sky-500",     vc: "text-sky-700",     href: "/admin/recruitment/applicants" },
          { l: "เดือนนี้",          v: overview.applications_this_month, icon: TrendingUp, bg: "bg-amber-50",   ic: "text-amber-500",   vc: "text-amber-700",   href: "/admin/recruitment/applicants" },
          { l: "จ้างเดือนนี้",      v: overview.hired_this_month,       icon: Award,       bg: "bg-rose-50",    ic: "text-rose-500",    vc: "text-rose-700",    href: "/admin/recruitment/applicants?status=hired" },
        ].map(k => (
          <Link key={k.l} href={k.href}
            className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all block">
            <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-2.5`}>
              <k.icon size={14} className={k.ic} />
            </div>
            <p className={`text-xl font-black ${k.vc}`}>{(k.v || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-semibold">{k.l}</p>
          </Link>
        ))}
      </div>

      {/* ── 2-column: Funnel + Sources ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Activity size={14} className="text-indigo-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Pipeline</h3>
                <p className="text-[11px] text-slate-400">ลำดับสถานะของผู้สมัคร</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              อัตราจ้าง {conversionRate}%
            </span>
          </div>
          <div className="p-5 space-y-3">
            {FUNNEL.map(f => {
              const n = statusCount[f.k] || 0
              const pct = (n / maxFunnel) * 100
              return (
                <div key={f.k}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${f.c}`} />
                      <span className="text-xs font-bold text-slate-700">{f.l}</span>
                    </div>
                    <span className="text-xs font-black text-slate-700">{n} <span className="text-[10px] text-slate-400 font-normal">คน</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${f.c} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sources — 1 col */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
              <BarChart3 size={14} className="text-sky-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">ที่มาของผู้สมัคร</h3>
              <p className="text-[11px] text-slate-400">{sources.length} แหล่ง</p>
            </div>
          </div>
          <div className="p-3">
            {sources.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-1">
                {sources.slice(0, 8).map(([src, n]: any) => {
                  const pct = totalReceived > 0 ? Math.round((n / totalReceived) * 100) : 0
                  return (
                    <div key={src} className="px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{SRC_LABEL[src] || src}</span>
                        <span className="text-[11px] text-slate-500"><b className="text-slate-800">{n}</b> <span className="text-slate-400">· {pct}%</span></span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick links (3 menu cards เรียบ) ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MenuCard
          href="/admin/recruitment/positions"
          icon={<Briefcase size={16} />}
          label="ตำแหน่งงาน"
          desc="สร้าง · แก้ไข · เผยแพร่"
          accent="indigo"
          count={overview.total_positions}
        />
        <MenuCard
          href="/admin/recruitment/applicants"
          icon={<Users size={16} />}
          label="ผู้สมัคร"
          desc="ดูใบสมัคร · เปลี่ยนสถานะ · จ้างเข้า"
          accent="sky"
          count={overview.total_applications}
        />
        <MenuCard
          href="https://careers.shd-technology.co.th"
          external
          icon={<ExternalLink size={16} />}
          label="เปิดหน้า Careers"
          desc="ดูฝั่งผู้สมัครภายนอก"
          accent="emerald"
        />
      </div>
    </div>
  )
}

function MenuCard({ href, external, icon, label, desc, accent, count }: {
  href: string; external?: boolean; icon: React.ReactNode; label: string; desc: string
  accent: "indigo" | "sky" | "emerald"; count?: number
}) {
  const cls: Record<string, { bg: string; ic: string; hover: string }> = {
    indigo:  { bg: "bg-indigo-50",  ic: "text-indigo-500",  hover: "hover:border-indigo-200" },
    sky:     { bg: "bg-sky-50",     ic: "text-sky-500",     hover: "hover:border-sky-200" },
    emerald: { bg: "bg-emerald-50", ic: "text-emerald-500", hover: "hover:border-emerald-200" },
  }
  const C = cls[accent]
  const Comp: any = external ? "a" : Link
  return (
    <Comp href={href} target={external ? "_blank" : undefined}
      className={`group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm transition-all flex items-center gap-3 ${C.hover} hover:shadow-md`}>
      <div className={`w-10 h-10 ${C.bg} rounded-xl flex items-center justify-center ${C.ic}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-sm text-slate-800">{label}</p>
          {count !== undefined && count > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${C.bg} ${C.ic}`}>{count}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
    </Comp>
  )
}
