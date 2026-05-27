"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Store, ClipboardCheck, Loader2, MapPin, Plus, ChevronRight,
  Clock, CheckCircle2, FileText, ShieldAlert, Search, X,
  BadgeCheck, Settings, RefreshCw, Building2, ChevronDown, Check,
  ClipboardList, Calendar,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

type Branch = {
  id: string; code: string; name: string
  latitude?: number; longitude?: number
  company_id?: string
  company?: { name_th?: string; code?: string }
  user_role: "admin" | "supervisor" | "evaluator" | null
}
type Template = { id: string; name: string; description?: string; total_weight: number }
type Eval = {
  id: string; template_id: string; branch_id: string
  visit_date: string; status: "draft" | "submitted" | "reviewed"
  percentage: number; total_score: number; total_weight: number
  store_manager?: string; created_at: string
  branch?: { id: string; name: string; code: string }
  template?: { id: string; name: string }
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: "bg-slate-100",   text: "text-slate-700",   label: "ร่าง" },
  submitted: { bg: "bg-sky-100",     text: "text-sky-700",     label: "ส่งแล้ว" },
  reviewed:  { bg: "bg-emerald-100", text: "text-emerald-700", label: "รีวิวแล้ว" },
}

export default function BranchEvalLandingPage() {
  const [me, setMe] = useState<any>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [evals, setEvals] = useState<Eval[]>([])
  // ── ฟอร์มที่ "ส่งถึงฉัน" (target_manager_id = me) ──
  const [evalsToMe, setEvalsToMe] = useState<any[]>([])
  // ── การบ้านที่ฉันได้รับ ──
  const [myAssignments, setMyAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<{ branch: Branch | null; templateId: string }>({ branch: null, templateId: "" })
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/branches-for-me").then(r => r.json()),
      fetch("/api/branch-eval/templates").then(r => r.json()),
      fetch("/api/branch-eval/evaluations?evaluator_id=me").then(r => r.json()),
      fetch("/api/branch-eval/evaluations?target_manager_id=me").then(r => r.json()).catch(() => ({ evaluations: [] })),
      fetch("/api/branch-eval/assignments?assignee_id=me&status=open").then(r => r.json()).catch(() => ({ assignments: [] })),
    ]).then(([m, b, t, e, sentMe, asgMe]) => {
      setMe(m)
      setBranches(b.branches ?? [])
      setTemplates(t.templates ?? [])
      setEvals(e.evaluations ?? [])
      setEvalsToMe((sentMe.evaluations ?? []).filter((x: any) => x.evaluator_id !== m?.employee_id))
      // เก็บเฉพาะการบ้านที่ "ฉัน" ยังทำไม่เสร็จ (เทียบ _my_stats ไม่ใช่ overall)
      setMyAssignments((asgMe.assignments ?? []).filter((a: any) => {
        const my = a._my_stats
        return my && my.total > 0 && my.done < my.total
      }))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: evals.length,
    draft: evals.filter(e => e.status === "draft").length,
    submitted: evals.filter(e => e.status === "submitted").length,
    reviewed: evals.filter(e => e.status === "reviewed").length,
    avgScore: evals.length > 0 && evals.some(e => e.percentage > 0)
      ? evals.filter(e => e.percentage > 0).reduce((s, e) => s + Number(e.percentage), 0) /
        evals.filter(e => e.percentage > 0).length
      : 0,
  }), [evals])

  const startEval = async () => {
    if (!picker.branch || !picker.templateId) return
    setCreating(true)
    const t = toast.loading("กำลังสร้างฟอร์ม...")
    try {
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: picker.branch.id, template_id: picker.templateId }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "สร้างไม่สำเร็จ", { id: t }); return }
      toast.success("เริ่มประเมิน", { id: t })
      window.location.href = `/app/branch-eval/${d.id}`
    } finally { setCreating(false) }
  }

  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto space-y-3">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!me?.can_access) return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-rose-50 rounded-2xl mx-auto mb-3 flex items-center justify-center">
          <ShieldAlert size={24} className="text-rose-400" />
        </div>
        <p className="font-black text-slate-800">ไม่มีสิทธิ์ใช้ระบบประเมินสาขา</p>
        <p className="text-xs text-slate-500 mt-2">ติดต่อ HR เพื่อขอสิทธิ์</p>
      </div>
    </div>
  )

  const roleLabel = me.is_eval_admin ? "EVAL ADMIN"
    : me.is_supervisor ? "SUPERVISOR"
    : me.is_evaluator ? "EVALUATOR"
    : ""

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Store size={22} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold tracking-wider text-slate-400">BRANCH EVALUATION</p>
                {roleLabel && <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{roleLabel}</span>}
              </div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">ประเมินสาขา</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {branches.length} สาขาที่เข้าถึงได้ · {evals.length} ฟอร์มของฉัน
              </p>
            </div>
          </div>
          {me.is_base_admin ? (
            // super_admin / hr_admin — เข้า /admin ได้ (ผ่าน middleware)
            <Link href="/admin/branch-eval"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Settings size={12} /> Admin
            </Link>
          ) : (me.is_eval_admin || me.is_supervisor) ? (
            // พนักงาน (role=employee) ที่ได้ branch_eval_admin หรือ supervisor
            //   → middleware block /admin → ใช้หน้าจัดการใน /app แทน
            <Link href="/app/branch-eval/manage"
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700">
              <Settings size={12} /> {me.is_eval_admin ? "จัดการระบบ" : "จัดการสาขา"}
            </Link>
          ) : null}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard icon={<FileText size={16} />} color="slate" label="ฟอร์มของฉัน" value={stats.total} />
        <KpiCard icon={<Clock size={16} />} color="amber" label="ร่าง" value={stats.draft} highlight={stats.draft > 0} />
        <KpiCard icon={<ClipboardCheck size={16} />} color="sky" label="ส่งแล้ว" value={stats.submitted} />
        <KpiCard icon={<BadgeCheck size={16} />} color="emerald" label="คะแนนเฉลี่ย"
          value={stats.avgScore > 0 ? `${stats.avgScore.toFixed(0)}%` : "—"} />
      </div>

      {/* Start new evaluation */}
      <div className="bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 rounded-2xl p-4 lg:p-5 text-white shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"><Plus size={18} /></div>
          <div>
            <p className="text-[10px] font-bold tracking-wider opacity-80">เริ่มประเมินใหม่</p>
            <h2 className="text-lg font-black">เลือกสาขา + เทมเพลต</h2>
          </div>
        </div>

        <div className="space-y-2">
          <BranchCombobox branches={branches} value={picker.branch}
            onChange={b => setPicker(p => ({ ...p, branch: b }))} />
          <div className="bg-white/10 backdrop-blur rounded-xl p-2 border border-white/20">
            <p className="text-[10px] font-bold opacity-80 mb-1">เทมเพลต</p>
            <select value={picker.templateId}
              onChange={e => setPicker(p => ({ ...p, templateId: e.target.value }))}
              className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-sm outline-none text-white"
              style={{ colorScheme: "dark" }}>
              <option value="" className="text-slate-800">— เลือกเทมเพลต —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
              ))}
            </select>
          </div>
          <button onClick={startEval} disabled={!picker.branch || !picker.templateId || creating}
            className="w-full px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-1.5 shadow">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            เริ่มประเมิน
          </button>
        </div>
      </div>


      {/* 📋 การบ้านของฉัน (assignments) — สำคัญที่สุด */}
      {myAssignments.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
              <ClipboardList size={13} className="text-orange-700" />
            </div>
            <h2 className="font-black text-slate-800 text-sm">📋 การบ้านที่ต้องทำ ({myAssignments.length})</h2>
            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-full">จากหัวหน้า</span>
          </div>
          <div className="space-y-2">
            {myAssignments.map((a: any) => {
              // ใช้ _my_stats (เฉพาะงานของฉัน) ไม่ใช่ _stats (รวมทุกคน)
              const my = a._my_stats ?? { total: 0, done: 0, progress: 0 }
              const overdue = a.due_date && new Date(a.due_date) < new Date() && my.done < my.total
              return (
                <Link key={a.id} href={`/app/branch-eval/assignments/${a.id}`}
                  className="group block p-3 bg-orange-50/40 hover:bg-white border border-orange-100 hover:border-orange-300 rounded-xl transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-black text-sm text-slate-800 truncate flex-1">{a.title}</p>
                    {overdue && <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">เลยกำหนด!</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mb-1.5">
                    📋 {a.template?.name}
                    {a.assigner && <> · มอบโดย {a.assigner.first_name_th}</>}
                    {a.due_date && <> · <Calendar size={9} className="inline" /> ครบ {format(new Date(a.due_date), "d MMM yyyy", { locale: th })}</>}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all" style={{ width: `${my.progress}%` }} />
                    </div>
                    <span className="text-[11px] font-black text-orange-700">{my.done}/{my.total} สาขา</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 📩 Sent to me — แสดงเฉพาะถ้ามี (รวมจากทุกคนที่ส่งฟอร์มถึงเรา) */}
      {evalsToMe.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <BadgeCheck size={13} className="text-emerald-700" />
            </div>
            <h2 className="font-black text-slate-800 text-sm">📩 ฟอร์มที่ส่งถึงฉัน ({evalsToMe.length})</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">จากลูกน้อง/ทีมงาน</span>
          </div>
          <div className="space-y-2">
            {evalsToMe.slice(0, 5).map((ev: any) => {
              const S = STATUS_COLOR[ev.status]
              return (
                <Link key={ev.id} href={`/app/branch-eval/${ev.id}`}
                  className="group flex items-center gap-3 p-2.5 bg-emerald-50/40 hover:bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center flex-shrink-0">
                    <Store size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{ev.branch?.name}</p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${S.bg} ${S.text}`}>{S.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      📋 {ev.template?.name} · 🗓 {format(new Date(ev.visit_date), "d MMM yyyy", { locale: th })}
                      {ev.evaluator && <> · จาก <span className="font-bold text-emerald-700">{ev.evaluator.first_name_th} {ev.evaluator.last_name_th}</span></>}
                    </p>
                  </div>
                  {ev.status !== "draft" && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-emerald-700">{Number(ev.percentage).toFixed(0)}%</p>
                    </div>
                  )}
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-600 flex-shrink-0" />
                </Link>
              )
            })}
            {evalsToMe.length > 5 && (
              <p className="text-center text-[11px] text-emerald-600 font-bold pt-1">+ อีก {evalsToMe.length - 5} ฟอร์ม</p>
            )}
          </div>
        </div>
      )}

      {/* My evaluations */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
            <FileText size={13} className="text-sky-600" />
          </div>
          <h2 className="font-black text-slate-800 text-sm">ฟอร์มของฉัน ({evals.length})</h2>
          <button onClick={load} className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
            <RefreshCw size={12} />
          </button>
        </div>
        {evals.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ClipboardCheck size={28} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm">ยังไม่มีฟอร์ม — เริ่มประเมินใหม่ได้เลย</p>
          </div>
        ) : (
          <div className="space-y-2">
            {evals.map(ev => {
              const S = STATUS_COLOR[ev.status]
              return (
                <Link key={ev.id} href={`/app/branch-eval/${ev.id}`}
                  className="group flex items-center gap-3 p-2.5 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                    <Store size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{ev.branch?.name}</p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${S.bg} ${S.text}`}>{S.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      📋 {ev.template?.name} · 🗓 {format(new Date(ev.visit_date), "d MMM yyyy", { locale: th })}
                    </p>
                  </div>
                  {ev.status !== "draft" && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-emerald-700">{Number(ev.percentage).toFixed(0)}%</p>
                      <p className="text-[9px] text-slate-400">{ev.total_score}/{ev.total_weight}</p>
                    </div>
                  )}
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Smart branch picker — search + group by company
// ─────────────────────────────────────────────────────────────
function BranchCombobox({ branches, value, onChange }: {
  branches: Branch[]
  value: Branch | null
  onChange: (b: Branch | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return branches
    return branches.filter(b => {
      const hay = `${b.name} ${b.code ?? ""} ${b.company?.name_th ?? ""} ${b.company?.code ?? ""}`.toLowerCase()
      return hay.includes(s)
    })
  }, [branches, search])

  // group by company
  const grouped = useMemo(() => {
    const m = new Map<string, { companyName: string; companyCode: string; items: Branch[] }>()
    for (const b of filtered) {
      const key = b.company?.code ?? b.company?.name_th ?? "—"
      const cur = m.get(key) ?? {
        companyName: b.company?.name_th ?? "ไม่ระบุบริษัท",
        companyCode: b.company?.code ?? "",
        items: [] as Branch[],
      }
      cur.items.push(b)
      m.set(key, cur)
    }
    return Array.from(m.values()).sort((a, b) => a.companyName.localeCompare(b.companyName))
  }, [filtered])

  return (
    <>
      <div className="bg-white/10 backdrop-blur rounded-xl p-2 border border-white/20">
        <p className="text-[10px] font-bold opacity-80 mb-1">สาขา · {branches.length} ทั้งหมด</p>
        <button type="button" onClick={() => setOpen(true)}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-sm text-white text-left flex items-center gap-1.5 hover:bg-white/30">
          {value ? (
            <>
              <Store size={13} className="opacity-80 flex-shrink-0" />
              <span className="truncate flex-1 font-bold">{value.name}</span>
              {value.code && <span className="text-[10px] opacity-70 flex-shrink-0">{value.code}</span>}
            </>
          ) : (
            <>
              <Search size={13} className="opacity-70 flex-shrink-0" />
              <span className="opacity-70 flex-1">เลือกสาขา · กดเพื่อค้นหา</span>
            </>
          )}
          <ChevronDown size={12} className="opacity-70 flex-shrink-0" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Store size={16} className="text-indigo-600" />
              <h3 className="font-black text-slate-800">เลือกสาขา</h3>
              <span className="text-[10px] text-slate-400 font-bold ml-auto">{filtered.length} / {branches.length}</span>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded ml-1"><X size={16} /></button>
            </div>

            {/* search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="พิมพ์ชื่อสาขา / รหัส / บริษัท..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400" />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {grouped.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Store size={28} className="mx-auto mb-2 text-slate-200" />
                  ไม่พบสาขา
                </div>
              ) : grouped.map(group => (
                <div key={group.companyCode + group.companyName} className="mb-2">
                  <div className="px-3 py-1.5 bg-slate-50 sticky top-0 z-10 rounded-md mb-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Building2 size={10} /> {group.companyName}
                      {group.companyCode && <span className="text-slate-400 ml-1">({group.companyCode})</span>}
                      <span className="text-slate-400 ml-auto">{group.items.length} สาขา</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map(b => {
                      const isSelected = value?.id === b.id
                      return (
                        <button key={b.id} type="button"
                          onClick={() => { onChange(b); setOpen(false); setSearch("") }}
                          className={`w-full px-3 py-2.5 text-left rounded-lg flex items-start gap-2.5 transition ${
                            isSelected
                              ? "bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            <Store size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm break-words leading-tight">{b.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                              {b.code && <span className="px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded font-bold">{b.code}</span>}
                              {b.user_role && (
                                <span className={`px-1.5 py-0.5 rounded font-black ${
                                  b.user_role === "admin" ? "bg-rose-100 text-rose-700"
                                  : b.user_role === "supervisor" ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700"
                                }`}>
                                  {b.user_role === "admin" ? "Admin" : b.user_role === "supervisor" ? "Supervisor" : "Evaluator"}
                                </span>
                              )}
                              {b.latitude && b.longitude && (
                                <span className="text-slate-400 inline-flex items-center gap-0.5">
                                  <MapPin size={9} /> GPS
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-indigo-600 flex-shrink-0 mt-1" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {value && (
              <div className="border-t border-slate-100 p-2 flex gap-2">
                <button onClick={() => { onChange(null); setSearch(""); setOpen(false) }}
                  className="flex-1 text-xs text-rose-600 hover:bg-rose-50 py-2 rounded-lg font-bold">
                  ล้างการเลือก
                </button>
                <button onClick={() => setOpen(false)}
                  className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg font-bold">
                  ใช้สาขานี้
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function KpiCard({ icon, color, label, value, highlight }: any) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   ring: "ring-slate-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-300" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     ring: "ring-sky-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-3 shadow-sm ${highlight ? `ring-2 ${p.ring}` : ""}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${p.bg} flex items-center justify-center ${p.text}`}>{icon}</div>
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
    </div>
  )
}
