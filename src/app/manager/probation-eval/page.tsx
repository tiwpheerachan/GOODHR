"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import Link from "next/link"
import { Shield, Loader2, ChevronRight, CheckCircle2, Clock, AlertCircle, FilePlus2, FilePen, ChevronDown, Network } from "lucide-react"

const ROUND_LABELS: Record<number, string> = { 1: "60 วัน", 2: "90 วัน", 3: "119 วัน" }
const ROUND_DAYS: Record<number, number> = { 1: 60, 2: 90, 3: 119 }

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-red-100 text-red-700",
}

function daysBetween(d1: string, d2: string) {
  return Math.ceil((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000)
}

export default function ManagerProbationEvalPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [members, setMembers] = useState<any[]>([])
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSkip, setShowSkip] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!user?.employee_id) return
    setLoading(true)
    fetch("/api/probation-evaluation?mode=manager")
      .then(r => r.json())
      .then(data => {
        if (!mountedRef.current) return
        setMembers(data.members ?? [])
        setForms(data.forms ?? [])
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [user?.employee_id])

  const getFormsForEmployee = (empId: string) => forms.filter(f => f.employee_id === empId)

  const getRoundStatus = (form: any) => {
    if (!form) return { label: t("probation.not_evaluated"), color: "text-slate-400", bg: "bg-slate-100", icon: FilePlus2 }
    if (form.status === "approved") return { label: t("probation.approved"), color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 }
    if (form.status === "submitted") return { label: t("probation.submitted"), color: "text-orange-600", bg: "bg-orange-50", icon: Clock }
    if (form.status === "rejected") return { label: t("probation.rejected"), color: "text-red-600", bg: "bg-red-50", icon: AlertCircle }
    return { label: t("probation.draft"), color: "text-amber-600", bg: "bg-amber-50", icon: FilePen }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <Shield size={16} className="text-rose-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800">{t("probation.title")}</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">{t("probation.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t("probation.no_members")}</p>
        </div>
      ) : (() => {
        const direct = members.filter((m: any) => m.relation === "direct" || !m.relation)
        const skip = members.filter((m: any) => m.relation === "skip")
        const additional = members.filter((m: any) => m.relation === "additional" || m.relation === "view_only")

        const renderMember = (m: any) => {
          const empForms = getFormsForEmployee(m.id)
          const daysFromHire = daysBetween(m.hire_date, today)
          const canEdit = m.relation !== "view_only"

          return (
            <div key={m.id} className={`card space-y-3 ${m.relation === "skip" ? "border-l-4 border-l-rose-300" : ""} ${!canEdit ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-rose-600 font-bold">{m.first_name_th?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{empName(m)}</p>
                  <p className="text-xs text-slate-400 truncate">{m.position?.name} · {m.employee_code}</p>
                  {m.direct_manager && (
                    <p className="text-[10px] text-rose-500 font-bold mt-0.5 flex items-center gap-1">
                      <Network size={9}/> หัวหน้าตรง: {m.direct_manager.first_name_th} {m.direct_manager.last_name_th}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{t("probation.worked_days")}</p>
                  <p className="text-sm font-black text-slate-700">{daysFromHire} วัน</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(round => {
                  const form = empForms.find(f => f.round === round)
                  const rs = getRoundStatus(form)
                  const Icon = rs.icon
                  const isOverdue = daysFromHire > ROUND_DAYS[round] && !form
                  const isEarly = daysFromHire < (ROUND_DAYS[round] - 14) && !form

                  return (
                    <Link key={round}
                      href={canEdit ? `/manager/probation-eval/${m.id}?round=${round}` : "#"}
                      className={`rounded-xl p-2.5 text-center transition-all ${
                        !canEdit ? "opacity-50 pointer-events-none bg-slate-50" :
                        isOverdue ? "bg-red-50 ring-1 ring-red-200 hover:shadow-md active:scale-[0.97]" :
                        isEarly ? "bg-slate-50 ring-1 ring-slate-200 hover:shadow-md active:scale-[0.97]" :
                        `${rs.bg} hover:shadow-md active:scale-[0.97]`
                      }`}>
                      <p className="text-[10px] font-bold text-slate-500 mb-1">{t(`probation.round_${round === 1 ? "60" : round === 2 ? "90" : "119"}`)}</p>
                      <div className="flex items-center justify-center gap-1">
                        <Icon size={12} className={rs.color} />
                        <span className={`text-[11px] font-bold ${rs.color}`}>{rs.label}</span>
                      </div>
                      {form && form.grade && (
                        <span className={`inline-block mt-1 text-xs font-black px-1.5 py-0.5 rounded ${GRADE_STYLE[form.grade] || "bg-slate-100"}`}>
                          {form.grade}
                        </span>
                      )}
                      {isOverdue && <p className="text-[9px] text-red-500 font-bold mt-1">{t("probation.overdue")}</p>}
                      {isEarly && !isOverdue && <p className="text-[9px] text-slate-400 font-bold mt-1">ล่วงหน้า</p>}
                    </Link>
                  )
                })}
              </div>

              {/* แถวข้อมูลผู้ประเมินแต่ละรอบที่ทำแล้ว */}
              {empForms.filter(f => f.status !== "draft" && f.evaluator).length > 0 && (
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  {empForms.filter(f => f.status !== "draft" && f.evaluator).sort((a,b)=>a.round - b.round).map(f => {
                    const roleBadge =
                      f.evaluator_role === "skip_level"     ? { label: "ระดับสูง", color: "bg-indigo-50 text-indigo-700" } :
                      f.evaluator_role === "additional"     ? { label: "เพิ่มเติม", color: "bg-violet-50 text-violet-700" } :
                      f.evaluator_role === "hr_admin"       ? { label: "HR",       color: "bg-rose-50 text-rose-700" } :
                      f.evaluator_role === "direct_manager" ? { label: "หัวหน้าตรง", color: "bg-emerald-50 text-emerald-700" } : null
                    const evalTime = f.submitted_at
                      ? new Date(f.submitted_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : null
                    return (
                      <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-400 w-8">รอบ {f.round}:</span>
                        <span>โดย</span>
                        <span className="font-bold text-slate-700">{f.evaluator?.first_name_th} {f.evaluator?.last_name_th}</span>
                        {roleBadge && (
                          <span className={`font-bold px-1.5 py-0.5 rounded ${roleBadge.color}`}>{roleBadge.label}</span>
                        )}
                        {evalTime && (
                          <span className="text-slate-400">· {evalTime} น.</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        return (
          <>
            {direct.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-black text-slate-600">ทีมตรงของฉัน</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{direct.length} คน</span>
                </div>
                {direct.map(renderMember)}
              </div>
            )}
            {additional.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-black text-slate-600">ผู้ที่กำหนดให้ฉันประเมิน</span>
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{additional.length} คน</span>
                </div>
                {additional.map(renderMember)}
              </div>
            )}
            {skip.length > 0 && (
              <div className="space-y-3 mt-4">
                <button onClick={() => setShowSkip(s => !s)}
                  className="w-full card flex items-center gap-2 hover:bg-slate-50 transition-colors">
                  <Network size={14} className="text-rose-500"/>
                  <span className="text-sm font-black text-slate-700">ทีมในสาย</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{skip.length} คน</span>
                  <span className="text-[10px] text-slate-400 ml-auto">(ลูกของลูกน้องคุณ)</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSkip ? "rotate-180" : ""}`}/>
                </button>
                {showSkip && skip.map(renderMember)}
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
