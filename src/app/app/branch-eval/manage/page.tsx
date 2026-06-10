"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store, FileText, ShieldCheck, ChevronRight,
  Layers, BarChart3, Clock, ArrowLeft, ShieldAlert, Trash2, Mail,
  ClipboardList, Sparkles, Calendar,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function SupervisorManagePage() {
  const [me, setMe] = useState<any>(null)
  const [evals, setEvals] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/evaluations").then(r => r.json()),
      fetch("/api/branch-eval/branches-for-me").then(r => r.json()),
      fetch("/api/branch-eval/assignments").then(r => r.json()).catch(() => ({ assignments: [] })),
    ]).then(([m, e, b, a]) => {
      setMe(m); setEvals(e.evaluations ?? []); setBranches(b.branches ?? [])
      setAssignments(a.assignments ?? [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto space-y-3">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
    </div>
  )

  if (!me?.is_supervisor && !me?.is_eval_admin && !me?.is_base_admin) return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-rose-50 rounded-2xl mx-auto mb-3 flex items-center justify-center">
          <ShieldAlert size={24} className="text-rose-400" />
        </div>
        <p className="font-black text-slate-800">ต้องเป็น Supervisor หรือ Admin</p>
        <p className="text-xs text-slate-500 mt-2">ติดต่อ HR เพื่อขอสิทธิ์</p>
      </div>
    </div>
  )

  const stats = {
    total: evals.length,
    draft: evals.filter(e => e.status === "draft").length,
    submitted: evals.filter(e => e.status === "submitted").length,
    reviewed: evals.filter(e => e.status === "reviewed").length,
    approved: evals.filter(e => e.status === "approved").length,
    rejected: evals.filter(e => e.status === "rejected").length,
    avg: evals.length > 0 && evals.some((e: any) => e.percentage > 0)
      ? evals.filter((e: any) => e.percentage > 0).reduce((s: number, e: any) => s + Number(e.percentage), 0) /
        evals.filter((e: any) => e.percentage > 0).length
      : 0,
    sentToMe: evals.filter((e: any) => e.target_manager_id === me?.employee_id).length,
    assignments: assignments.length,
  }

  // ── Assignment stats ──
  const asgStats = (() => {
    let openAsg = 0, completedAsg = 0, overdueAsg = 0
    const today = new Date().toISOString().slice(0, 10)
    for (const a of assignments as any[]) {
      if ((a._stats?.done ?? 0) === (a._stats?.total ?? 0) && (a._stats?.total ?? 0) > 0) completedAsg++
      else openAsg++
      if (a.due_date && a.due_date < today && (a._stats?.done ?? 0) < (a._stats?.total ?? 0)) overdueAsg++
    }
    return { openAsg, completedAsg, overdueAsg }
  })()

  const recent = evals.slice(0, 5)
  // ฟอร์มที่ "ส่งถึงฉัน" (target_manager_id = me) — ผู้ส่งไม่ใช่ตัวเอง
  const sentToMe = evals.filter((e: any) => e.target_manager_id === me?.employee_id && e.evaluator_id !== me?.employee_id).slice(0, 5)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/app/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ประเมินสาขา
      </Link>

      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ShieldCheck size={22} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-indigo-500">
              {me?.is_eval_admin ? "ADMIN MODE" : "SUPERVISOR MODE"}
            </p>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">
              {me?.is_eval_admin ? "จัดการระบบประเมินสาขา" : "จัดการสาขาที่ดูแล"}
            </h1>
            <p className="text-slate-400 text-sm">
              {branches.length} สาขา · {evals.length} ฟอร์ม
              {stats.submitted > 0 && <span className="ml-1.5 text-amber-600 font-bold">· {stats.submitted} รออนุมัติ</span>}
            </p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        <Kpi color="slate" label="ฟอร์มทั้งหมด" value={stats.total} />
        <Kpi color="amber" label="รออนุมัติ" value={stats.submitted} highlight={stats.submitted > 0} />
        <Kpi color="emerald" label="อนุมัติแล้ว" value={stats.approved} sub={stats.rejected > 0 ? `ปฏิเสธ ${stats.rejected}` : undefined}/>
        <Kpi color="indigo" label="คะแนนเฉลี่ย" value={stats.avg > 0 ? `${stats.avg.toFixed(0)}%` : "—"} />
        <Kpi color="violet" label="📩 ส่งถึงฉัน" value={stats.sentToMe} highlight={stats.sentToMe > 0} />
        <Kpi color="orange" label="📋 การบ้าน" value={stats.assignments}
          sub={`${asgStats.openAsg} เปิด · ${asgStats.completedAsg} เสร็จ`}
          highlight={asgStats.overdueAsg > 0} />
      </div>

      {/* ── 📩 ฟอร์มที่ส่งถึงฉัน — ขึ้นเฉพาะถ้ามี ── */}
      {sentToMe.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-100 flex items-center gap-2 bg-emerald-50/40">
            <Mail size={13} className="text-emerald-600" />
            <p className="font-black text-sm text-emerald-900">📩 ฟอร์มที่ส่งถึงฉัน ({sentToMe.length})</p>
            <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              จากลูกน้อง
            </span>
          </div>
          <div className="divide-y divide-emerald-50">
            {sentToMe.map((ev: any) => (
              <Link key={ev.id} href={`/app/branch-eval/manage/evaluations/${ev.id}`}
                className="flex items-center gap-3 p-3 hover:bg-emerald-50/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center flex-shrink-0">
                  <Store size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{ev.branch?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {ev.template?.name} · {format(new Date(ev.visit_date), "d MMM yyyy", { locale: th })}
                    {ev.evaluator && <> · จาก <span className="font-bold text-emerald-700">{ev.evaluator.first_name_th} {ev.evaluator.last_name_th}</span></>}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  ev.status === "draft" ? "bg-slate-100 text-slate-700"
                  : ev.status === "submitted" ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
                }`}>
                  {ev.status === "draft" ? "ร่าง"
                  : ev.status === "submitted" ? "รออนุมัติ"
                  : ev.status === "approved" ? "✓ อนุมัติ"
                  : ev.status === "rejected" ? "✗ ปฏิเสธ"
                  : "รีวิวแล้ว"}
                </span>
                {ev.percentage > 0 && <span className="text-sm font-black text-emerald-700">{Number(ev.percentage).toFixed(0)}%</span>}
                <ChevronRight size={13} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Menu — 1 col mobile / 2 col tablet / 3 col desktop / 4 col wide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {me?.is_eval_admin && (
          <MenuCard href="/app/branch-eval/manage/templates"
            icon={<Layers size={18} />} color="violet"
            title="เทมเพลต" desc="สร้าง / แก้ / import checklist" />
        )}
        <MenuCard href="/app/branch-eval/manage/pending-approvals"
          icon={<ClipboardList size={18} />} color="amber"
          title={`รออนุมัติ ${stats.submitted > 0 ? `(${stats.submitted})` : ""}`.trim()}
          desc="ฟอร์มที่ส่งถึงคุณ + รอตัดสินใจ ✓ หรือ ✗" />
        <MenuCard href="/app/branch-eval/manage/evaluations"
          icon={<FileText size={18} />} color="sky"
          title={me?.is_eval_admin ? "ฟอร์มทั้งระบบ" : "ฟอร์มในสาขาฉันดูแล"}
          desc="ดู / รีวิว / comment ฟอร์ม" />
        <MenuCard href="/app/branch-eval/manage/assignments"
          icon={<ClipboardList size={18} />} color="orange"
          title="📋 มอบการบ้าน"
          desc="มอบหมายให้ลูกน้องประเมิน + ติดตามความคืบหน้า" />
        <MenuCard href="/app/branch-eval/manage/permissions"
          icon={<ShieldCheck size={18} />} color="rose"
          title="จัดสิทธิ์"
          desc={me?.is_eval_admin ? "มอบ admin / supervisor / evaluator" : "มอบ Evaluator ในสาขาฉัน"} />
        <MenuCard href="/app/branch-eval/manage/reports"
          icon={<BarChart3 size={18} />} color="emerald"
          title="รายงาน / สถิติ" desc="คะแนน · แนวโน้ม · top/bottom" />
        <MenuCard href="/app/branch-eval/manage/ai-chat"
          icon={<Sparkles size={18} />} color="violet"
          title="🤖 AI ผู้ช่วย"
          desc="ถามข้อมูลประเมินสาขา · scoped ปลอดภัย" />
        {me?.is_eval_admin && (
          <MenuCard href="/app/branch-eval/manage/trash"
            icon={<Trash2 size={18} />} color="slate"
            title="ถังขยะ" desc="กู้คืน / ลบถาวร" />
        )}
        <MenuCard href="/app/branch-eval"
          icon={<Store size={18} />} color="indigo"
          title="กลับไปกรอกฟอร์มเอง" desc="โหมดผู้ประเมิน — เริ่มประเมินใหม่" />
      </div>

      {/* ── 📋 การบ้านที่กำลังดำเนิน — top 5 ── */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2 flex-wrap">
            <ClipboardList size={13} className="text-orange-600" />
            <p className="font-black text-sm text-slate-800">📋 การบ้านที่กำลังดำเนิน</p>
            <span className="text-[10px] font-bold text-slate-400">
              {assignments.length} ทั้งหมด · {asgStats.openAsg} เปิด · {asgStats.completedAsg} เสร็จ
              {asgStats.overdueAsg > 0 && <span className="text-rose-600"> · {asgStats.overdueAsg} เลยกำหนด</span>}
            </span>
            <Link href="/app/branch-eval/manage/assignments" className="ml-auto text-[11px] text-indigo-600 hover:text-indigo-700 font-bold">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(assignments as any[]).slice(0, 5).map((a: any) => {
              const s = a._stats
              const overdue = a.due_date && new Date(a.due_date) < new Date() && s.done < s.total
              const isDone = s.done === s.total && s.total > 0
              return (
                <Link key={a.id} href={`/app/branch-eval/manage/assignments/${a.id}`}
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
                          style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-700">{s.done}/{s.total}</span>
                      {s.avg_score != null && (
                        <span className={`text-[10px] font-black ${
                          Number(s.avg_score) >= 80 ? "text-emerald-700"
                          : Number(s.avg_score) >= 60 ? "text-amber-700"
                          : "text-rose-700"
                        }`}>{Number(s.avg_score).toFixed(0)}%</span>
                      )}
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

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
          <Clock size={13} className="text-slate-500" />
          <p className="font-black text-sm text-slate-800">ฟอร์มล่าสุดในสาขาฉัน</p>
          <Link href="/app/branch-eval/manage/evaluations" className="ml-auto text-[11px] text-indigo-600 hover:text-indigo-700 font-bold">
            ดูทั้งหมด →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">ยังไม่มีฟอร์ม</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((ev: any) => (
              <Link key={ev.id} href={`/app/branch-eval/manage/evaluations/${ev.id}`}
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
                  {ev.status === "draft" ? "ร่าง"
                  : ev.status === "submitted" ? "รออนุมัติ"
                  : ev.status === "approved" ? "✓ อนุมัติ"
                  : ev.status === "rejected" ? "✗ ปฏิเสธ"
                  : "รีวิวแล้ว"}
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

function Kpi({ color, label, value, sub, highlight }: any) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   ring: "ring-slate-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  ring: "ring-indigo-200" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-300" },
    orange:  { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-300" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-300" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className={`${p.bg} border border-white rounded-2xl p-3 shadow-sm ${highlight ? `ring-2 ${p.ring}` : ""}`}>
      <p className={`text-[10px] font-bold uppercase ${p.text} opacity-80`}>{label}</p>
      <p className={`text-xl font-black ${p.text} leading-none mt-1`}>{value}</p>
      {sub && <p className={`text-[10px] font-bold ${p.text} opacity-60 mt-0.5`}>{sub}</p>}
    </div>
  )
}

function MenuCard({ href, icon, color, title, desc }: any) {
  const palette: Record<string, string> = {
    sky:     "bg-sky-50 text-sky-600 group-hover:border-sky-200",
    rose:    "bg-rose-50 text-rose-600 group-hover:border-rose-200",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:border-emerald-200",
    indigo:  "bg-indigo-50 text-indigo-600 group-hover:border-indigo-200",
    violet:  "bg-violet-50 text-violet-600 group-hover:border-violet-200",
    slate:   "bg-slate-50 text-slate-600 group-hover:border-slate-200",
    orange:  "bg-orange-50 text-orange-600 group-hover:border-orange-200",
    amber:   "bg-amber-50 text-amber-600 group-hover:border-amber-200",
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
