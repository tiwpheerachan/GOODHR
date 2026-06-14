"use client"
import { useEffect, useState } from "react"
import {
  Loader2, ArrowUp, ArrowDown, Users, Network, Eye, BarChart2, Shield,
  ChevronDown, User, Plus, AlertTriangle,
} from "lucide-react"

type Person = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  nickname?: string
  avatar_url?: string
  position?: { name: string } | null
  employment_status?: string
  // ── diagnostic fields (subordinate side) ──
  is_active?: boolean
  deleted_at?: string | null
  kpi_evaluator_id?: string | null
  hire_date?: string | null
  probation_end_date?: string | null
  _kpi_visible?: boolean
  _kpi_hidden_reason?: string | null
  _probation_visible?: boolean
  _probation_hidden_reason?: string | null
}

type ChainData = {
  evaluators: {
    direct_manager: Person | null
    skip_level: Person | null
    additional: Array<Person & { scope: string; note?: string }>
  }
  subordinates: {
    direct: Person[]
    skip: Array<Person & { direct_manager?: Person | null }>
    additional: Array<Person & { scope: string }>
  }
  stats: { total: number; direct_count: number; skip_count: number; additional_count: number }
}

const SCOPE_LABEL: Record<string, { label: string; color: string }> = {
  kpi:       { label: "KPI", color: "bg-violet-50 text-violet-700" },
  probation: { label: "ทดลองงาน", color: "bg-rose-50 text-rose-700" },
  all:       { label: "ทั้งหมด", color: "bg-indigo-50 text-indigo-700" },
  view_only: { label: "ดูเท่านั้น", color: "bg-slate-50 text-slate-600" },
}

function PersonRow({ p, badge, sub, dim, showVisibility }: { p: Person; badge?: { label: string; color: string }; sub?: string; dim?: boolean; showVisibility?: boolean }) {
  const hasIssue = showVisibility && (p._kpi_visible === false || p._probation_visible === false)
  return (
    <div className={`flex flex-col gap-1.5 px-3 py-2 bg-white rounded-xl border ${hasIssue ? "border-amber-200" : "border-slate-100"} ${dim ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
          {p.avatar_url
            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-indigo-600 text-sm font-bold">{p.first_name_th?.[0] ?? "?"}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">{p.first_name_th} {p.last_name_th}</p>
            {p.nickname && <span className="text-[10px] text-slate-400">({p.nickname})</span>}
            {p.is_active === false && (
              <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">inactive</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">{p.employee_code} · {p.position?.name ?? "—"}</p>
          {sub && <p className="text-[10px] text-indigo-500 font-bold mt-0.5 flex items-center gap-1"><Network size={9}/> {sub}</p>}
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.color}`}>{badge.label}</span>
        )}
      </div>

      {/* Visibility chips — KPI / Probation */}
      {showVisibility && (
        <div className="flex items-center gap-1.5 flex-wrap pl-12">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
            p._kpi_visible === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {p._kpi_visible === false ? "❌" : "✓"} KPI
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
            p._probation_visible === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {p._probation_visible === false ? "❌" : "✓"} ทดลองงาน
          </span>
          {(p._kpi_hidden_reason || p._probation_hidden_reason) && (
            <span className="text-[10px] text-amber-700 inline-flex items-center gap-1">
              <AlertTriangle size={9}/>
              {p._kpi_hidden_reason || p._probation_hidden_reason}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function EvaluationChainPanel({ employeeId, employeeName }: { employeeId: string; employeeName?: string }) {
  const [data, setData] = useState<ChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/employees/evaluation-chain?employee_id=${employeeId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
  }
  if (!data) return null

  const ev = data.evaluators
  const sub = data.subordinates
  const evCount = (ev.direct_manager ? 1 : 0) + (ev.skip_level ? 1 : 0) + ev.additional.length

  return (
    <div className="space-y-4">
      {/* ── (A) ใครประเมินคนนี้ได้บ้าง ── */}
      <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <ArrowUp size={14} className="text-indigo-600"/>
            ใครประเมินคนนี้ได้บ้าง
          </h3>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{evCount} คน</span>
        </div>

        <div className="space-y-2">
          {ev.direct_manager && (
            <PersonRow p={ev.direct_manager} badge={{ label: "หัวหน้าตรง", color: "bg-emerald-50 text-emerald-700" }} sub="ระดับ 1" />
          )}
          {ev.skip_level && (
            <PersonRow p={ev.skip_level} badge={{ label: "หัวหน้าระดับสูง", color: "bg-indigo-50 text-indigo-700" }} sub="ระดับ 2 (skip-level)" />
          )}
          {ev.additional.map((a, i) => {
            const meta = SCOPE_LABEL[a.scope] ?? SCOPE_LABEL.all
            return (
              <PersonRow key={i} p={a} badge={{ label: `เพิ่มเติม · ${meta.label}`, color: meta.color }} sub={a.note} />
            )
          })}

          {evCount === 0 && (
            <div className="bg-white rounded-xl p-4 text-center border border-slate-100">
              <User size={20} className="mx-auto text-slate-300 mb-1"/>
              <p className="text-xs text-slate-500 font-bold">ยังไม่มีหัวหน้า</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ตั้งหัวหน้าได้ที่แถบ "ประวัติหัวหน้า"</p>
            </div>
          )}
        </div>
      </div>

      {/* ── (B) คนนี้เป็นหัวหน้าใครบ้าง ── */}
      <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <ArrowDown size={14} className="text-emerald-600"/>
            {employeeName ?? "คนนี้"} เป็นหัวหน้าใคร
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{data.stats.total} คน</span>
        </div>

        {/* Quick counts */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-xl px-2 py-2 text-center border border-slate-100">
            <p className="text-lg font-black text-emerald-700">{data.stats.direct_count}</p>
            <p className="text-[9px] text-slate-500 font-bold">ทีมตรง</p>
          </div>
          <div className="bg-white rounded-xl px-2 py-2 text-center border border-slate-100">
            <p className="text-lg font-black text-indigo-700">{data.stats.skip_count}</p>
            <p className="text-[9px] text-slate-500 font-bold">ทีมในสาย</p>
          </div>
          <div className="bg-white rounded-xl px-2 py-2 text-center border border-slate-100">
            <p className="text-lg font-black text-violet-700">{data.stats.additional_count}</p>
            <p className="text-[9px] text-slate-500 font-bold">เพิ่มเติม</p>
          </div>
        </div>

        {/* Direct subs */}
        {sub.direct.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-[11px] font-black text-slate-600 px-1">
              <span className="text-emerald-600">●</span> ทีมตรง — ลูกน้องของคุณ
            </p>
            {sub.direct.map(p => (
              <PersonRow key={p.id} p={p} sub={p.position?.name} showVisibility/>
            ))}
          </div>
        )}

        {/* Additional subs */}
        {sub.additional.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-[11px] font-black text-slate-600 px-1">
              <span className="text-violet-600">●</span> ผู้ที่กำหนดให้ประเมินเพิ่ม
            </p>
            {sub.additional.map(p => {
              const meta = SCOPE_LABEL[p.scope] ?? SCOPE_LABEL.all
              return <PersonRow key={p.id} p={p} badge={{ label: meta.label, color: meta.color }} showVisibility/>
            })}
          </div>
        )}

        {/* Skip subs — collapsible */}
        {sub.skip.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowSkip(s => !s)}
              className="w-full bg-white rounded-xl px-3 py-2 border border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-2 text-left">
              <Network size={12} className="text-indigo-500"/>
              <span className="text-[11px] font-black text-slate-700">ทีมในสาย (ลูกของลูกน้อง)</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{sub.skip.length}</span>
              <ChevronDown size={12} className={`ml-auto text-slate-400 transition-transform ${showSkip ? "rotate-180" : ""}`}/>
            </button>
            {showSkip && sub.skip.map(p => (
              <PersonRow
                key={p.id}
                p={p}
                sub={p.direct_manager ? `หัวหน้าตรง: ${p.direct_manager.first_name_th} ${p.direct_manager.last_name_th}` : undefined}
                badge={{ label: "skip-1", color: "bg-indigo-50 text-indigo-700" }}
                showVisibility
              />
            ))}
          </div>
        )}

        {data.stats.total === 0 && (
          <div className="bg-white rounded-xl p-4 text-center border border-slate-100">
            <Users size={20} className="mx-auto text-slate-300 mb-1"/>
            <p className="text-xs text-slate-500 font-bold">ไม่ใช่หัวหน้าของใคร</p>
            <p className="text-[10px] text-slate-400 mt-0.5">คนนี้ยังไม่มีลูกน้องในระบบ</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500">
        <p className="font-bold mb-1">หมายเหตุ:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li><b>หัวหน้าตรง</b> = ตั้งจาก "ประวัติหัวหน้า"</li>
          <li><b>หัวหน้าระดับสูง</b> = หัวหน้าของหัวหน้า — มีสิทธิ์ takeover ประเมินแทนได้</li>
          <li><b>ผู้ประเมินเพิ่มเติม</b> = กำหนดจากปุ่ม "เพิ่ม" ในแถบ "การจ้างงาน"</li>
          <li><b>ทีมในสาย</b> = ลูกของลูกน้องคุณ — เห็นใน /manager/kpi ในส่วน "ทีมในสาย"</li>
        </ul>
      </div>
    </div>
  )
}
