"use client"
import { useEffect, useState } from "react"
import { Shield, Plus, X, Loader2, UserCheck, CheckCircle2, Clock, FilePlus2, AlertCircle, CalendarClock, Network } from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage, useEmployeeName } from "@/lib/i18n"

type Assignment = {
  id: string
  round: number
  label?: string | null
  due_days?: number | null
  evaluator_id: string
  evaluator_is_direct?: boolean | null
  evaluator?: { first_name_th: string; last_name_th: string; nickname?: string; employee_code: string; avatar_url?: string }
  form?: { id: string; status: string; grade?: string; total_score?: number; is_passed?: boolean } | null
}

// รอบมาตรฐาน + กำหนดเอง (99)
type TFn = (key: string, vars?: Record<string, any>) => string

function roundOpts(t: TFn): { v: number; l: string }[] {
  return [
    { v: 1, l: t("admin.emp_detail.probassign_round_opt_1") },
    { v: 2, l: t("admin.emp_detail.probassign_round_opt_2") },
    { v: 99, l: t("admin.emp_detail.probassign_round_opt_custom") },
  ]
}

function roundText(a: Assignment, t: TFn) {
  if (a.round === 99) return a.label || t("admin.emp_detail.probassign_round_custom_default")
  return roundOpts(t).find(r => r.v === a.round)?.l || t("admin.emp_detail.probassign_round_n", { n: a.round })
}

function statusMeta(f: Assignment["form"], t: TFn) {
  if (!f) return { l: t("admin.emp_detail.probassign_status_not_evaluated"), c: "bg-slate-100 text-slate-500", I: FilePlus2 }
  if (f.status === "approved") return { l: t("admin.emp_detail.probassign_status_approved", { grade: f.grade ?? "" }), c: "bg-emerald-50 text-emerald-700", I: CheckCircle2 }
  if (f.status === "submitted") return { l: t("admin.emp_detail.probassign_status_wait_hr"), c: "bg-orange-50 text-orange-700", I: Clock }
  if (f.status === "rejected") return { l: t("admin.emp_detail.probassign_status_returned"), c: "bg-red-50 text-red-600", I: AlertCircle }
  return { l: t("admin.emp_detail.probassign_status_draft"), c: "bg-amber-50 text-amber-700", I: Clock }
}

export default function ProbationAssignmentsSection({
  employeeId, allEmps, loadAllEmps,
}: {
  employeeId: string
  allEmps: any[]
  loadAllEmps: () => void
}) {
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [list, setList] = useState<Assignment[]>([])
  const [useCustomPlan, setUseCustomPlan] = useState(false)
  const [togglingPlan, setTogglingPlan] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState("")
  const [evaluatorMode, setEvaluatorMode] = useState<"direct" | "pick">("direct")
  const [pickEvalId, setPickEvalId] = useState<string | null>(null)
  const [round, setRound] = useState<number>(2)
  const [customLabel, setCustomLabel] = useState("")
  const [customDays, setCustomDays] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/probation-evaluation/assignments?employee_id=${employeeId}`)
      const data = await res.json()
      setList(data.assignments ?? [])
      setUseCustomPlan(!!data.use_custom_plan)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [employeeId])

  async function togglePlan(next: boolean) {
    setTogglingPlan(true)
    try {
      const res = await fetch("/api/probation-evaluation/assignments", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, use_custom_plan: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.probassign_toast_plan_failed"))
      setUseCustomPlan(next)
      toast.success(t("admin.emp_detail.probassign_toast_plan_updated"))
    } catch (e: any) { toast.error(e.message) }
    setTogglingPlan(false)
  }

  function resetForm() {
    setShowAdd(false); setEvaluatorMode("direct"); setPickEvalId(null); setSearch("")
    setRound(2); setCustomLabel(""); setCustomDays("")
  }

  async function handleAdd() {
    if (evaluatorMode === "pick" && !pickEvalId) { toast.error(t("admin.emp_detail.probassign_toast_select_evaluator")); return }
    if (round === 99 && (!customLabel.trim() || !Number(customDays))) { toast.error(t("admin.emp_detail.probassign_toast_fill_custom")); return }
    setSaving(true)
    try {
      const res = await fetch("/api/probation-evaluation/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId, round,
          ...(evaluatorMode === "direct" ? { evaluator_mode: "direct_manager" } : { evaluator_id: pickEvalId }),
          label: round === 99 ? customLabel.trim() : undefined,
          due_days: round === 99 ? Number(customDays) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.probassign_toast_add_failed"))
      toast.success(t("admin.emp_detail.probassign_toast_add_success"))
      resetForm()
      load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  async function handleRemove(id: string) {
    if (!confirm(t("admin.emp_detail.probassign_confirm_remove"))) return
    try {
      const res = await fetch(`/api/probation-evaluation/assignments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.probassign_toast_remove_failed"))
      toast.success(t("admin.emp_detail.probassign_toast_remove_success"))
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const filtered = allEmps.filter(e => {
    if (e.id === employeeId) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return `${e.first_name_th} ${e.last_name_th} ${e.employee_code} ${e.nickname ?? ""}`.toLowerCase().includes(s)
  })
  const pickEmp = allEmps.find(e => e.id === pickEvalId)

  return (
    <div className="mt-6 p-4 rounded-2xl border-2 border-violet-100 bg-violet-50/40">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Shield size={14} className="text-violet-500"/>
          {t("admin.emp_detail.probassign_title")}
          {list.length > 0 && <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">{list.length}</span>}
        </h4>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); loadAllEmps() }}
            className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50">
            <Plus size={12}/> {t("admin.emp_detail.probassign_add")}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.probassign_description")}</p>

      {/* ── Toggle: กำหนดรอบเอง (แทนที่ 45/90) ── */}
      <div className="flex items-start gap-3 bg-white rounded-xl border border-violet-200 px-3 py-2.5 mb-3">
        <button
          type="button"
          role="switch"
          aria-checked={useCustomPlan}
          disabled={togglingPlan}
          onClick={() => togglePlan(!useCustomPlan)}
          className={`mt-0.5 relative w-10 h-6 rounded-full shrink-0 transition-colors ${useCustomPlan ? "bg-violet-600" : "bg-slate-200"} disabled:opacity-60`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${useCustomPlan ? "translate-x-4" : ""}`}/>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            {t("admin.emp_detail.probassign_plan_toggle_label")}
            {togglingPlan && <Loader2 size={11} className="animate-spin text-violet-400"/>}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{t("admin.emp_detail.probassign_plan_toggle_desc")}</p>
        </div>
      </div>

      {/* ── Info / warning ตามโหมด ── */}
      {!useCustomPlan ? (
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
          <CalendarClock size={12} className="text-slate-400 mt-0.5 shrink-0"/> {t("admin.emp_detail.probassign_default_info")}
        </p>
      ) : list.length === 0 && !loading ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
          <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0"/> {t("admin.emp_detail.probassign_plan_empty_warn")}
        </p>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300"/></div>
      ) : list.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">{t("admin.emp_detail.probassign_empty")}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {list.map(a => {
            const st = statusMeta(a.form, t)
            const Icon = st.I
            const e = a.evaluator
            return (
              <div key={a.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {e?.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/> : <span className="text-violet-600 font-bold text-sm">{e?.first_name_th?.[0] ?? "?"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1">
                    <UserCheck size={12} className="text-violet-400 shrink-0"/> {empName(e)}
                    {a.evaluator_is_direct && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Network size={8}/> {t("admin.emp_detail.probassign_badge_direct")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <span className="font-bold text-violet-600">{roundText(a, t)}</span>
                    {a.round === 99 && a.due_days && <span className="flex items-center gap-0.5"><CalendarClock size={9}/> {t("admin.emp_detail.probassign_days", { n: a.due_days })}</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0 ${st.c}`}>
                  <Icon size={10}/> {st.l}
                </span>
                <button onClick={() => handleRemove(a.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center shrink-0">
                  <X size={13} className="text-slate-400 hover:text-red-500"/>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-violet-200 p-3 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">{t("admin.emp_detail.probassign_form_title")}</p>
            <button onClick={resetForm} className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center">
              <X size={11} className="text-slate-400"/>
            </button>
          </div>

          {/* รอบ */}
          <p className="text-xs font-bold text-slate-700">{t("admin.emp_detail.probassign_round_label")}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {roundOpts(t).map(r => (
              <button key={r.v} onClick={() => setRound(r.v)}
                className={`text-xs font-bold border rounded-lg px-2 py-1.5 ${round === r.v ? "bg-violet-50 text-violet-700 border-violet-300 ring-2 ring-violet-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                {r.l}
              </button>
            ))}
          </div>
          {round === 99 && (
            <div className="grid grid-cols-3 gap-1.5">
              <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder={t("admin.emp_detail.probassign_custom_label_placeholder")}
                className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-violet-400"/>
              <div className="relative">
                <input value={customDays} onChange={e => setCustomDays(e.target.value.replace(/\D/g, ""))} placeholder={t("admin.emp_detail.probassign_days_placeholder")} inputMode="numeric"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-violet-400 pr-8"/>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{t("admin.emp_detail.probassign_days_unit")}</span>
              </div>
            </div>
          )}

          {/* Evaluator: หัวหน้าตรง (อัตโนมัติ) หรือ เลือกเอง */}
          <p className="text-xs font-bold text-slate-700 mt-1">{t("admin.emp_detail.probassign_evaluator_label")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { setEvaluatorMode("direct"); setPickEvalId(null) }}
              className={`text-xs font-bold border rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 ${evaluatorMode === "direct" ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              <Network size={11}/> {t("admin.emp_detail.probassign_evaluator_direct")}
            </button>
            <button onClick={() => setEvaluatorMode("pick")}
              className={`text-xs font-bold border rounded-lg px-2 py-1.5 ${evaluatorMode === "pick" ? "bg-violet-50 text-violet-700 border-violet-300 ring-2 ring-violet-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              {t("admin.emp_detail.probassign_evaluator_pick_other")}
            </button>
          </div>

          {evaluatorMode === "pick" && (
            !pickEmp ? (
              <div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.emp_detail.probassign_search_placeholder")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400"/>
                <div className="mt-2 max-h-[180px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                  {filtered.slice(0, 30).map(e => (
                    <button key={e.id} onClick={() => setPickEvalId(e.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2">
                      <span className="font-bold text-slate-800">{empName(e)}</span>
                      <span className="text-xs text-slate-400">{e.employee_code}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 text-center">{t("admin.emp_detail.probassign_not_found")}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2">
                <span className="font-bold text-sm text-slate-800">{empName(pickEmp)}</span>
                <span className="text-xs text-slate-500">{pickEmp.employee_code}</span>
                <button onClick={() => setPickEvalId(null)} className="ml-auto text-xs text-violet-600 hover:underline">{t("admin.emp_detail.probassign_change")}</button>
              </div>
            )
          )}

          <button onClick={handleAdd} disabled={saving || (evaluatorMode === "pick" && !pickEvalId)}
            className="w-full mt-2 bg-violet-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {t("admin.emp_detail.probassign_submit")}
          </button>
        </div>
      )}
    </div>
  )
}
