"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store, FileText, ClipboardCheck, ShieldCheck, ChevronRight,
  Loader2, Layers, BarChart3, Users, RefreshCw, Clock, Trash2,
  Mail, User, ClipboardList, Calendar, Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function BranchEvalAdminLanding() {
  const [me, setMe] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [evals, setEvals] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/templates").then(r => r.json()),
      fetch("/api/branch-eval/evaluations").then(r => r.json()),
      fetch("/api/branch-eval/assignments").then(r => r.json()).catch(() => ({ assignments: [] })),
    ]).then(([m, t, e, a]) => {
      setMe(m); setTemplates(t.templates ?? []); setEvals(e.evaluations ?? [])
      setAssignments(a.assignments ?? [])
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

  // ── Assignment stats ──
  const asgStats = (() => {
    let total = 0, done = 0
    let openAsg = 0, completedAsg = 0, overdueAsg = 0
    const today = new Date().toISOString().slice(0, 10)
    for (const a of assignments as any[]) {
      total += a._stats?.total ?? 0
      done += a._stats?.done ?? 0
      if ((a._stats?.done ?? 0) === (a._stats?.total ?? 0) && (a._stats?.total ?? 0) > 0) completedAsg++
      else openAsg++
      if (a.due_date && a.due_date < today && (a._stats?.done ?? 0) < (a._stats?.total ?? 0)) overdueAsg++
    }
    return { total, done, openAsg, completedAsg, overdueAsg, totalAssignments: assignments.length }
  })()

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
    tagged: evals.filter((e: any) => e.target_manager_id).length,
    assignments: assignments.length,
  }

  // ── Top recipients (top-5 หัวหน้าที่รับฟอร์มเยอะสุด) ──
  const topRecipients = (() => {
    const m = new Map<string, { mgr: any; count: number; submittedCount: number; avgPct: number; pctSum: number; pctN: number }>()
    for (const e of evals as any[]) {
      if (!e.target_manager_id || !e.target_manager) continue
      const k = e.target_manager_id
      if (!m.has(k)) m.set(k, { mgr: e.target_manager, count: 0, submittedCount: 0, avgPct: 0, pctSum: 0, pctN: 0 })
      const r = m.get(k)!
      r.count++
      if (e.status !== "draft") r.submittedCount++
      if (Number(e.percentage) > 0) { r.pctSum += Number(e.percentage); r.pctN++ }
    }
    for (const r of Array.from(m.values())) r.avgPct = r.pctN > 0 ? r.pctSum / r.pctN : 0
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  })()

  // ── Top templates (template ไหนใช้บ่อยสุด) ──
  const topTemplates = (() => {
    const m = new Map<string, { tpl: any; count: number; pctSum: number; pctN: number; mgrIds: Set<string> }>()
    for (const e of evals as any[]) {
      if (!e.template) continue
      const k = e.template.id
      if (!m.has(k)) m.set(k, { tpl: e.template, count: 0, pctSum: 0, pctN: 0, mgrIds: new Set() })
      const r = m.get(k)!
      r.count++
      if (Number(e.percentage) > 0) { r.pctSum += Number(e.percentage); r.pctN++ }
      if (e.target_manager_id) r.mgrIds.add(e.target_manager_id)
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  })()

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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        <Kpi icon={<Layers size={16} />} color="indigo" label="เทมเพลต" value={stats.templates} />
        <Kpi icon={<FileText size={16} />} color="sky" label="ฟอร์มทั้งหมด" value={stats.evals} sub={`ร่าง ${stats.draft}`} />
        <Kpi icon={<Mail size={16} />} color="violet" label="ระบุผู้รับ" value={stats.tagged} sub={`${stats.evals > 0 ? Math.round(stats.tagged / stats.evals * 100) : 0}%`} />
        <Kpi icon={<ClipboardCheck size={16} />} color="amber" label="รอรีวิว" value={stats.submitted} highlight={stats.submitted > 0} />
        <Kpi icon={<BarChart3 size={16} />} color="emerald" label="คะแนนเฉลี่ย" value={stats.avg > 0 ? `${stats.avg.toFixed(0)}%` : "—"} />
        <Kpi icon={<ClipboardList size={16} />} color="orange" label="📋 การบ้าน" value={stats.assignments} sub={`${asgStats.openAsg} เปิด · ${asgStats.completedAsg} เสร็จ`} highlight={asgStats.overdueAsg > 0} />
      </div>

      {/* ── 2 columns: Top Recipients + Top Templates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Recipients */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Mail size={13} className="text-emerald-600" />
            <p className="font-black text-sm text-slate-800">📩 หัวหน้าที่รับฟอร์มเยอะสุด</p>
            <span className="ml-auto text-[10px] font-bold text-slate-400">Top 5</span>
          </div>
          {topRecipients.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Mail size={20} className="mx-auto mb-2 text-slate-300" />
              ยังไม่มีฟอร์มที่ระบุผู้รับ
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {topRecipients.map(r => (
                <Link key={r.mgr.id} href={`/admin/branch-eval/evaluations`}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                    {r.mgr.first_name_th?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {r.mgr.first_name_th} {r.mgr.last_name_th}
                      {r.mgr.nickname && <span className="text-slate-400 ml-1 text-xs">({r.mgr.nickname})</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{r.count} ฟอร์ม</span>
                      {r.submittedCount > 0 && <span className="text-[10px] text-slate-500">รีวิว {r.submittedCount}</span>}
                      {r.avgPct > 0 && <span className="text-[10px] font-bold text-amber-700">เฉลี่ย {r.avgPct.toFixed(0)}%</span>}
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Templates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Layers size={13} className="text-violet-600" />
            <p className="font-black text-sm text-slate-800">📋 Template ที่ใช้บ่อย</p>
            <span className="ml-auto text-[10px] font-bold text-slate-400">Top 5</span>
          </div>
          {topTemplates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Layers size={20} className="mx-auto mb-2 text-slate-300" />
              ยังไม่มีการใช้งาน template
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {topTemplates.map(r => {
                const avg = r.pctN > 0 ? r.pctSum / r.pctN : 0
                return (
                  <Link key={r.tpl.id} href="/admin/branch-eval/evaluations"
                    className="flex items-center gap-3 p-3 hover:bg-slate-50">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                      <Layers size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{r.tpl.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-black text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full">{r.count} ฟอร์ม</span>
                        {r.mgrIds.size > 0 && <span className="text-[10px] font-bold text-emerald-700">ส่งถึง {r.mgrIds.size} คน</span>}
                        {avg > 0 && <span className="text-[10px] font-bold text-amber-700">เฉลี่ย {avg.toFixed(0)}%</span>}
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-slate-300" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <MenuCard href="/admin/branch-eval/templates" icon={<Layers size={18} />} color="indigo"
          title="เทมเพลต" desc="สร้าง/แก้/import checklist ต่างๆ" />
        <MenuCard href="/admin/branch-eval/evaluations" icon={<FileText size={18} />} color="sky"
          title="ฟอร์มที่ส่งแล้ว" desc="ดู/รีวิวฟอร์มทุกสาขา" />
        <MenuCard href="/admin/branch-eval/reports" icon={<BarChart3 size={18} />} color="emerald"
          title="รายงาน / สถิติ" desc="คะแนนเฉลี่ย · แนวโน้ม · จุดอ่อน" />
        <MenuCard href="/admin/branch-eval/permissions" icon={<ShieldCheck size={18} />} color="rose"
          title="สิทธิ์" desc="มอบ admin / supervisor / evaluator" />
        <MenuCard href="/admin/branch-eval/assignments" icon={<ClipboardList size={18} />} color="orange"
          title="📋 การบ้าน" desc="มอบหมาย + ติดตามความคืบหน้า" />
        <MenuCard href="/app/branch-eval/manage/ai-chat" icon={<Sparkles size={18} />} color="violet"
          title="🤖 AI ผู้ช่วย" desc="ถามข้อมูลประเมิน · scoped ปลอดภัย" />
        <MenuCard href="/admin/branch-eval/trash" icon={<Trash2 size={18} />} color="slate"
          title="ถังขยะ" desc="กู้คืน / ลบถาวร template + ฟอร์ม" />
      </div>

      {/* ── 📋 การบ้านที่กำลังดำเนินอยู่ — top 5 ── */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <ClipboardList size={13} className="text-orange-600" />
            <p className="font-black text-sm text-slate-800">📋 การบ้านที่กำลังดำเนิน</p>
            <span className="ml-auto text-[10px] font-bold text-slate-400">
              {asgStats.totalAssignments} ทั้งหมด · {asgStats.openAsg} เปิด · {asgStats.completedAsg} เสร็จ
              {asgStats.overdueAsg > 0 && <span className="text-rose-600"> · {asgStats.overdueAsg} เลยกำหนด</span>}
            </span>
            <Link href="/admin/branch-eval/assignments" className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(assignments as any[]).slice(0, 5).map((a: any) => {
              const stats = a._stats
              const overdue = a.due_date && new Date(a.due_date) < new Date() && stats.done < stats.total
              const isDone = stats.done === stats.total && stats.total > 0
              return (
                <Link key={a.id} href={`/admin/branch-eval/assignments/${a.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDone ? "bg-emerald-100 text-emerald-700"
                    : overdue ? "bg-rose-100 text-rose-700"
                    : "bg-orange-100 text-orange-700"
                  }`}>
                    <ClipboardList size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{a.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {a.template?.name}
                      {a.assigner && <> · มอบโดย {a.assigner.first_name_th} {a.assigner.last_name_th}</>}
                      {a.due_date && <> · <Calendar size={9} className="inline" /> {format(new Date(a.due_date), "d MMM", { locale: th })}</>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${isDone ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-orange-500"}`}
                          style={{ width: `${stats.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-700">{stats.done}/{stats.total}</span>
                    </div>
                  </div>
                  {overdue && <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">เลยกำหนด</span>}
                  {isDone && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">เสร็จ ✓</span>}
                  <ChevronRight size={13} className="text-slate-300" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

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
                    {ev.target_manager && <> · <Mail size={9} className="inline text-emerald-500" /> <span className="font-bold text-emerald-700">{ev.target_manager.first_name_th}</span></>}
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
    violet:  { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-200" },
    orange:  { bg: "bg-orange-50",  text: "text-orange-600",  ring: "ring-orange-300" },
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
    indigo:  "bg-indigo-50 text-indigo-600 group-hover:border-indigo-200",
    sky:     "bg-sky-50 text-sky-600 group-hover:border-sky-200",
    rose:    "bg-rose-50 text-rose-600 group-hover:border-rose-200",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:border-emerald-200",
    slate:   "bg-slate-50 text-slate-600 group-hover:border-slate-200",
    orange:  "bg-orange-50 text-orange-600 group-hover:border-orange-200",
    violet:  "bg-violet-50 text-violet-600 group-hover:border-violet-200",
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
