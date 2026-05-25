"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Store, ClipboardCheck, Loader2, MapPin, Plus, ChevronRight,
  Clock, CheckCircle2, FileText, ShieldAlert, Search, X,
  BadgeCheck, Settings, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

type Branch = {
  id: string; code: string; name: string
  latitude?: number; longitude?: number
  company?: { name_th?: string }
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
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<{ branch: Branch | null; templateId: string }>({ branch: null, templateId: "" })
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState("")

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/me").then(r => r.json()),
      fetch("/api/branch-eval/branches-for-me").then(r => r.json()),
      fetch("/api/branch-eval/templates").then(r => r.json()),
      fetch("/api/branch-eval/evaluations?evaluator_id=me").then(r => r.json()),
    ]).then(([m, b, t, e]) => {
      setMe(m)
      setBranches(b.branches ?? [])
      setTemplates(t.templates ?? [])
      setEvals(e.evaluations ?? [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filteredBranches = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return branches
    return branches.filter(b => `${b.name} ${b.code}`.toLowerCase().includes(s))
  }, [branches, search])

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

        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2">
          <div className="bg-white/10 backdrop-blur rounded-xl p-2 border border-white/20">
            <p className="text-[10px] font-bold opacity-80 mb-1">สาขา</p>
            <select value={picker.branch?.id ?? ""}
              onChange={e => setPicker(p => ({ ...p, branch: branches.find(b => b.id === e.target.value) || null }))}
              className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-sm outline-none text-white"
              style={{ colorScheme: "dark" }}>
              <option value="" className="text-slate-800">— เลือกสาขา —</option>
              {branches.map(b => (
                <option key={b.id} value={b.id} className="text-slate-800">
                  {b.name}{b.code ? ` (${b.code})` : ""}
                </option>
              ))}
            </select>
          </div>
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
            className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-1.5 shadow">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            เริ่มประเมิน
          </button>
        </div>
      </div>

      {/* Branches accessible */}
      {branches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store size={13} className="text-emerald-600" />
            </div>
            <h2 className="font-black text-slate-800 text-sm">สาขาที่เข้าถึงได้ ({branches.length})</h2>
            <div className="relative ml-auto">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาสาขา"
                className="bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-xs outline-none focus:border-indigo-400 w-44" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredBranches.map(b => (
              <div key={b.id} className="bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-xl p-2.5 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-sm text-slate-800 truncate">{b.name}</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">{b.code}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {b.user_role === "admin" ? "🔴 Admin"
                        : b.user_role === "supervisor" ? "🛡 Supervisor"
                        : b.user_role === "evaluator" ? "📝 Evaluator"
                        : ""}
                      {b.latitude && b.longitude ? <> · <MapPin size={9} className="inline" /> {Number(b.latitude).toFixed(3)}, {Number(b.longitude).toFixed(3)}</> : null}
                    </p>
                  </div>
                  <button onClick={() => setPicker({ branch: b, templateId: templates[0]?.id ?? "" })}
                    title="เริ่มประเมินสาขานี้"
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex-shrink-0">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))}
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
