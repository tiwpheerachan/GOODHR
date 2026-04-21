"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import Link from "next/link"
import { Target, ChevronLeft, ChevronRight, Loader2, FileCheck, FilePen, FilePlus2, Clock, AlertCircle, CheckCircle2 } from "lucide-react"

// Month names resolved via i18n T.months

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  B: "bg-blue-100 text-blue-700 ring-blue-200",
  C: "bg-amber-100 text-amber-700 ring-amber-200",
  D: "bg-red-100 text-red-700 ring-red-200",
}

export default function ManagerKpiPage() {
  const { user } = useAuth()
  const { t, T } = useLanguage()
  const empName = useEmployeeName()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
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
    fetch(`/api/kpi?mode=manager&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        if (!mountedRef.current) return
        setMembers(data.members ?? [])
        setForms(data.forms ?? [])
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [user?.employee_id, year, month])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const getFormForEmployee = (empId: string) => forms.find(f => f.employee_id === empId)

  const statusInfo = (form: any) => {
    if (!form) return { label: t("kpi.not_evaluated"), icon: FilePlus2, color: "text-slate-400", bg: "bg-slate-50" }
    if (form.status === "draft") return { label: t("kpi.draft"), icon: FilePen, color: "text-amber-600", bg: "bg-amber-50" }
    if (form.status === "rejected") return { label: t("kpi.rejected"), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" }
    if (form.status === "submitted") return { label: t("kpi.submitted"), icon: Clock, color: "text-orange-600", bg: "bg-orange-50" }
    if (form.status === "approved") return { label: t("kpi.approved"), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" }
    return { label: t("kpi.submitted"), icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" }
  }

  const approvedCount = forms.filter(f => f.status === "approved").length
  const pendingCount = forms.filter(f => f.status === "submitted").length
  const rejectedCount = forms.filter(f => f.status === "rejected").length
  const drafted = forms.filter(f => f.status === "draft").length
  const notDone = members.length - forms.length

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Target size={16} className="text-indigo-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800">{t("kpi.title")}</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">{t("kpi.subtitle")}</p>
      </div>

      {/* Month Picker */}
      <div className="card flex items-center justify-between">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">{T.months[month]}</p>
          <p className="text-xs text-slate-400">{year}</p>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">{approvedCount}</p>
          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{t("kpi.stats_approved")}</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-orange-700">{pendingCount}</p>
          <p className="text-[10px] font-bold text-orange-600 mt-0.5">{t("kpi.stats_pending")}</p>
        </div>
        {rejectedCount > 0 && (
          <div className="bg-red-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-black text-red-700">{rejectedCount}</p>
            <p className="text-[10px] font-bold text-red-600 mt-0.5">{t("kpi.stats_rejected")}</p>
          </div>
        )}
        <div className="bg-slate-100 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-slate-600">{notDone > 0 ? notDone : 0}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5">{t("kpi.stats_not_done")}</p>
        </div>
      </div>

      {/* Member Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-center py-12 text-slate-400 text-sm">{t("kpi.no_members")}</p>
      ) : (
        <div className="space-y-2">
          {members.map((m: any) => {
            const form = getFormForEmployee(m.id)
            const si = statusInfo(form)
            const Icon = si.icon
            return (
              <Link key={m.id} href={`/manager/kpi/${m.id}?year=${year}&month=${month}`}
                className="card flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-indigo-600 font-bold">{m.first_name_th?.[0]}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {empName(m)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{m.position?.name} · {m.employee_code}</p>
                </div>

                {/* Status / Grade */}
                <div className="flex items-center gap-2 shrink-0">
                  {form && ["submitted", "approved", "acknowledged"].includes(form.status) && (
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ring-1 ${GRADE_STYLE[form.grade] || "bg-slate-100 text-slate-600"}`}>
                      {form.grade}
                    </span>
                  )}
                  <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${si.bg} ${si.color}`}>
                    <Icon size={12} />
                    <span className="hidden xs:inline">{si.label}</span>
                  </div>
                </div>

                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
