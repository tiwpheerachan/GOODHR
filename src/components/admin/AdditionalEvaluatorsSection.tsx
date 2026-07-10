"use client"
import { useEffect, useState } from "react"
import { Users, Plus, X, Loader2, Eye, BarChart2, Shield } from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/i18n"

type Evaluator = {
  id: string
  evaluator_id: string
  scope: "kpi" | "probation" | "all" | "view_only"
  note?: string
  created_at: string
  evaluator?: {
    employee_code: string
    first_name_th: string
    last_name_th: string
    nickname?: string
    position?: { name: string } | null
  }
}

const SCOPE_LABEL: Record<string, { labelKey: string; color: string; icon: any }> = {
  kpi:        { labelKey: "addeval_scope_kpi",       color: "bg-violet-50 text-violet-700 border-violet-200", icon: BarChart2 },
  probation:  { labelKey: "addeval_scope_probation", color: "bg-rose-50 text-rose-700 border-rose-200",       icon: Shield },
  all:        { labelKey: "addeval_scope_all",       color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Users },
  view_only:  { labelKey: "addeval_scope_view_only", color: "bg-slate-50 text-slate-600 border-slate-200",   icon: Eye },
}

export default function AdditionalEvaluatorsSection({
  employeeId, allEmps, loadAllEmps,
}: {
  employeeId: string
  allEmps: any[]
  loadAllEmps: () => void
}) {
  const { t } = useLanguage()
  const [list, setList] = useState<Evaluator[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [pickEvalId, setPickEvalId] = useState<string | null>(null)
  const [pickScope, setPickScope] = useState<"kpi" | "probation" | "all" | "view_only">("kpi")
  const [pickNote, setPickNote] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/evaluators?employee_id=${employeeId}`)
      const data = await res.json()
      setList(data.evaluators ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [employeeId])

  async function handleAdd() {
    if (!pickEvalId) { toast.error(t("admin.emp_detail.addeval_toast_select_evaluator")); return }
    setSaving(true)
    try {
      const res = await fetch("/api/employees/evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, evaluator_id: pickEvalId, scope: pickScope, note: pickNote || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.addeval_err_add_failed"))
      toast.success(t("admin.emp_detail.addeval_toast_add_success"))
      setShowAdd(false); setPickEvalId(null); setPickScope("kpi"); setPickNote(""); setSearch("")
      load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  async function handleRemove(id: string) {
    if (!confirm(t("admin.emp_detail.addeval_confirm_remove"))) return
    try {
      const res = await fetch(`/api/employees/evaluators?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.addeval_err_remove_failed"))
      toast.success(t("admin.emp_detail.addeval_toast_remove_success"))
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const filtered = allEmps.filter(e => {
    if (e.id === employeeId) return false // self
    if (list.find(x => x.evaluator_id === e.id && (x.scope === pickScope || x.scope === "all"))) return false // already added with same scope
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return `${e.first_name_th} ${e.last_name_th} ${e.employee_code} ${e.nickname ?? ""}`.toLowerCase().includes(s)
  })

  const pickEmp = allEmps.find(e => e.id === pickEvalId)

  return (
    <div className="mt-6 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Users size={14} className="text-indigo-500"/>
          {t("admin.emp_detail.addeval_title")}
          {list.length > 0 && <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{list.length}</span>}
        </h4>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); loadAllEmps() }}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50">
            <Plus size={12}/> {t("admin.emp_detail.addeval_add_btn")}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.addeval_subtitle")}</p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300"/></div>
      ) : list.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">{t("admin.emp_detail.addeval_empty")}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {list.map(ev => {
            const meta = SCOPE_LABEL[ev.scope]
            const Icon = meta.icon
            const e = ev.evaluator
            return (
              <div key={ev.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 font-bold text-sm">{e?.first_name_th?.[0] ?? "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{e?.first_name_th} {e?.last_name_th}</p>
                  <p className="text-[11px] text-slate-400 truncate">{e?.employee_code} · {e?.position?.name ?? "—"}</p>
                </div>
                <span className={`text-[10px] font-bold border px-2 py-1 rounded-md flex items-center gap-1 ${meta.color}`}>
                  <Icon size={10}/> {t(`admin.emp_detail.${meta.labelKey}`)}
                </span>
                <button onClick={() => handleRemove(ev.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
                  <X size={13} className="text-slate-400 hover:text-red-500"/>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-indigo-200 p-3 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">{t("admin.emp_detail.addeval_pick_evaluator")}</p>
            <button onClick={() => { setShowAdd(false); setPickEvalId(null); setSearch(""); setPickNote("") }} className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center">
              <X size={11} className="text-slate-400"/>
            </button>
          </div>

          {/* Employee picker */}
          {!pickEmp ? (
            <div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("admin.emp_detail.addeval_search_ph")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <div className="mt-2 max-h-[180px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                {filtered.slice(0, 30).map(e => (
                  <button key={e.id} onClick={() => setPickEvalId(e.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2">
                    <span className="font-bold text-slate-800">{e.first_name_th} {e.last_name_th}</span>
                    <span className="text-xs text-slate-400">{e.employee_code}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 text-center">{t("admin.emp_detail.addeval_not_found")}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              <span className="font-bold text-sm text-slate-800">{pickEmp.first_name_th} {pickEmp.last_name_th}</span>
              <span className="text-xs text-slate-500">{pickEmp.employee_code}</span>
              <button onClick={() => setPickEvalId(null)} className="ml-auto text-xs text-indigo-600 hover:underline">{t("admin.emp_detail.addeval_change")}</button>
            </div>
          )}

          {/* Scope picker */}
          {pickEvalId && (
            <>
              <p className="text-xs font-bold text-slate-700 mt-2">{t("admin.emp_detail.addeval_permission")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["kpi","probation","all","view_only"] as const).map(s => {
                  const meta = SCOPE_LABEL[s]
                  const Icon = meta.icon
                  const active = pickScope === s
                  return (
                    <button key={s} onClick={() => setPickScope(s)}
                      className={`text-xs font-bold border rounded-lg px-2 py-1.5 flex items-center gap-1 ${active ? meta.color + " ring-2 ring-indigo-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      <Icon size={11}/> {t(`admin.emp_detail.${meta.labelKey}`)}
                    </button>
                  )
                })}
              </div>

              <input
                value={pickNote}
                onChange={e => setPickNote(e.target.value)}
                placeholder={t("admin.emp_detail.addeval_note_ph")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 mt-1"
              />

              <button onClick={handleAdd} disabled={saving}
                className="w-full mt-2 bg-indigo-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                {t("admin.emp_detail.addeval_save")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
