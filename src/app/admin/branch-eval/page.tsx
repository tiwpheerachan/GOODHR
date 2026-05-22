"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store, FileText, ClipboardCheck, ShieldCheck, ChevronRight,
  Loader2, Layers, BarChart3, Users, RefreshCw, Clock,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function BranchEvalAdminLanding() {
  const [me, setMe] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [evals, setEvals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/templates").then(r => r.json()),
      fetch("/api/branch-eval/evaluations").then(r => r.json()),
    ]).then(([m, t, e]) => {
      setMe(m); setTemplates(t.templates ?? []); setEvals(e.evaluations ?? [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="p-4 max-w-6xl mx-auto space-y-3">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
    </div>
  )

  if (!me?.can_manage && !me?.is_evaluator) return (
    <div className="p-6 text-center">
      <p className="text-sm text-slate-500">ไม่มีสิทธิ์เข้าใช้ระบบประเมินสาขา</p>
    </div>
  )

  const stats = {
    templates: templates.length,
    evals: evals.length,
    draft: evals.filter(e => e.status === "draft").length,
    submitted: evals.filter(e => e.status === "submitted").length,
    reviewed: evals.filter(e => e.status === "reviewed").length,
    avg: evals.length > 0 && evals.some((e: any) => e.percentage > 0)
      ? evals.filter((e: any) => e.percentage > 0).reduce((s: number, e: any) => s + Number(e.percentage), 0) /
        evals.filter((e: any) => e.percentage > 0).length
      : 0,
  }

  const recent = evals.slice(0, 5)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Store size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400">BRANCH EVALUATION ADMIN</p>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">ระบบประเมินสาขา</h1>
              <p className="text-slate-400 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
            </div>
          </div>
          <Link href="/app/branch-eval"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold">
            User Mode →
          </Link>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-4 lg:p-5 text-white shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider opacity-80">{stats.evals} ฟอร์ม · {stats.templates} เทมเพลต</p>
              <h2 className="text-lg font-black">ตรวจสาขาด้วยเทมเพลตที่กำหนด</h2>
              <p className="text-[11px] opacity-90">ผูก Anker, MGS หรือ template อื่น → กระจายให้ supervisor → กรอกในมือถือ</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Kpi icon={<Layers size={16} />} color="indigo" label="เทมเพลต" value={stats.templates} />
        <Kpi icon={<FileText size={16} />} color="sky" label="ฟอร์มทั้งหมด" value={stats.evals} sub={`ร่าง ${stats.draft}`} />
        <Kpi icon={<ClipboardCheck size={16} />} color="amber" label="รอรีวิว" value={stats.submitted} highlight={stats.submitted > 0} />
        <Kpi icon={<BarChart3 size={16} />} color="emerald" label="คะแนนเฉลี่ย" value={stats.avg > 0 ? `${stats.avg.toFixed(0)}%` : "—"} />
      </div>

      {/* Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <MenuCard href="/admin/branch-eval/templates" icon={<Layers size={18} />} color="indigo"
          title="เทมเพลต" desc="สร้าง/แก้/import checklist ต่างๆ" />
        <MenuCard href="/admin/branch-eval/evaluations" icon={<FileText size={18} />} color="sky"
          title="ฟอร์มที่ส่งแล้ว" desc="ดู/รีวิวฟอร์มทุกสาขา" />
        <MenuCard href="/admin/branch-eval/permissions" icon={<ShieldCheck size={18} />} color="rose"
          title="สิทธิ์" desc="มอบ admin / supervisor / evaluator" />
      </div>

      {/* Recent evaluations */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
          <Clock size={13} className="text-slate-500" />
          <p className="font-black text-sm text-slate-800">ฟอร์มล่าสุด</p>
          <Link href="/admin/branch-eval/evaluations" className="ml-auto text-[11px] text-indigo-600 hover:text-indigo-700 font-bold">
            ดูทั้งหมด →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">ยังไม่มีฟอร์ม</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((ev: any) => (
              <Link key={ev.id} href={`/admin/branch-eval/evaluations/${ev.id}`}
                className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <Store size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{ev.branch?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {ev.template?.name} · {format(new Date(ev.visit_date), "d MMM yyyy", { locale: th })}
                    {ev.evaluator && <> · โดย {ev.evaluator.first_name_th}</>}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  ev.status === "draft" ? "bg-slate-100 text-slate-700"
                  : ev.status === "submitted" ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
                }`}>
                  {ev.status === "draft" ? "ร่าง" : ev.status === "submitted" ? "รอรีวิว" : "รีวิวแล้ว"}
                </span>
                {ev.percentage > 0 && <span className="text-sm font-black text-emerald-700">{Number(ev.percentage).toFixed(0)}%</span>}
                <ChevronRight size={13} className="text-slate-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon, color, label, value, sub, highlight }: any) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-200" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     ring: "ring-sky-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
  }
  const p = palette[color] ?? palette.indigo
  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-3 shadow-sm ${highlight ? `ring-2 ${p.ring}` : ""}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${p.bg} flex items-center justify-center ${p.text}`}>{icon}</div>
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1 font-bold">{sub}</p>}
    </div>
  )
}

function MenuCard({ href, icon, color, title, desc }: any) {
  const palette: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 group-hover:border-indigo-200",
    sky:    "bg-sky-50 text-sky-600 group-hover:border-sky-200",
    rose:   "bg-rose-50 text-rose-600 group-hover:border-rose-200",
  }
  return (
    <Link href={href} className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${palette[color]} flex items-center justify-center`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
    </Link>
  )
}
