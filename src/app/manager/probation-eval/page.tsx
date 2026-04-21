"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import Link from "next/link"
import { Shield, Loader2, ChevronRight, CheckCircle2, Clock, AlertCircle, FilePlus2, FilePen } from "lucide-react"

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
    if (form.status === "submitted") return { label: t("probation.awaiting_hr"), color: "text-orange-600", bg: "bg-orange-50", icon: Clock }
    if (form.status === "rejected") return { label: t("probation.returned"), color: "text-red-600", bg: "bg-red-50", icon: AlertCircle }
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
      ) : (
        <div className="space-y-3">
          {members.map((m: any) => {
            const empForms = getFormsForEmployee(m.id)
            const daysFromHire = daysBetween(m.hire_date, today)

            return (
              <div key={m.id} className="card space-y-3">
                {/* Employee info */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-rose-600 font-bold">{m.first_name_th?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{empName(m)}</p>
                    <p className="text-xs text-slate-400 truncate">{m.position?.name} · {m.employee_code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{t("probation.worked_days")}</p>
                    <p className="text-sm font-black text-slate-700">{daysFromHire} วัน</p>
                  </div>
                </div>

                {/* 3 Rounds */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(round => {
                    const form = empForms.find(f => f.round === round)
                    const rs = getRoundStatus(form)
                    const Icon = rs.icon
                    const isAvailable = daysFromHire >= (ROUND_DAYS[round] - 14) // เปิดให้ประเมินก่อน 14 วัน
                    const isOverdue = daysFromHire > ROUND_DAYS[round] && !form

                    return (
                      <Link key={round}
                        href={isAvailable || form ? `/manager/probation-eval/${m.id}?round=${round}` : "#"}
                        className={`rounded-xl p-2.5 text-center transition-all ${
                          !isAvailable && !form ? "opacity-40 pointer-events-none bg-slate-50" :
                          isOverdue ? "bg-red-50 ring-1 ring-red-200" :
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
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
