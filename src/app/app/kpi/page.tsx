"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Target, ChevronLeft, ChevronRight, Loader2, Award, BarChart3, MessageSquare, User } from "lucide-react"

const MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

const GRADE_CONFIG: Record<string, { color: string; bg: string; ring: string; range: string }> = {
  A: { color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", range: "91-100%" },
  B: { color: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200", range: "81-90%" },
  C: { color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", range: "71-80%" },
  D: { color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200", range: "0-70%" },
}

export default function EmployeeKpiPage() {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!user?.employee_id) return
    setLoading(true)
    fetch(`/api/kpi?mode=employee&year=${year}`)
      .then(r => r.json())
      .then(data => { if (mountedRef.current) setForms(data.forms ?? []) })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false) })
  }, [user?.employee_id, year])

  const avgScore = forms.length > 0 ? forms.reduce((s, f) => s + f.total_score, 0) / forms.length : 0

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Target size={16} className="text-indigo-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800">ผลประเมิน KPI</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">ผลการประเมินการปฏิบัติงานรายเดือน</p>
      </div>

      {/* Year Picker */}
      <div className="card flex items-center justify-between">
        <button onClick={() => setYear(y => y - 1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">ปี {year}</p>
          <p className="text-xs text-slate-400">{forms.length} เดือนที่ได้รับการประเมิน</p>
        </div>
        <button onClick={() => setYear(y => y + 1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Summary Card */}
      {forms.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-200">คะแนนเฉลี่ยทั้งปี</p>
              <p className="text-3xl font-black mt-1">{avgScore.toFixed(1)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-200" />
              <span className="text-xs font-bold text-indigo-200">{forms.length} เดือน</span>
            </div>
          </div>
          {/* Mini chart */}
          <div className="flex items-end gap-1 mt-3 h-10">
            {Array.from({ length: 12 }, (_, i) => {
              const f = forms.find(ff => ff.month === i + 1)
              const score = f?.total_score ?? 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-t-sm transition-all ${f ? "bg-white/80" : "bg-white/20"}`}
                    style={{ height: `${Math.max(score * 0.4, 2)}px` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map(m => (
              <span key={m} className="text-[7px] text-indigo-200 flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-12">
          <Award size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ยังไม่มีผลประเมินในปี {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form: any) => {
            const gc = GRADE_CONFIG[form.grade] || GRADE_CONFIG.D
            const isOpen = expanded === form.id
            const items = (form.items ?? []).sort((a: any, b: any) => a.order_no - b.order_no)

            return (
              <div key={form.id} className="card overflow-hidden">
                {/* Summary row */}
                <button onClick={() => setExpanded(isOpen ? null : form.id)}
                  className="w-full flex items-center gap-3 text-left">
                  <div className={`w-12 h-12 rounded-2xl ${gc.bg} ring-1 ${gc.ring} flex items-center justify-center shrink-0`}>
                    <span className={`text-xl font-black ${gc.color}`}>{form.grade}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{MONTHS[form.month]} {form.year}</p>
                    <p className="text-sm text-slate-500">คะแนน {form.total_score.toFixed(1)}%</p>
                  </div>
                  {form.evaluator && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400">ประเมินโดย</p>
                      <p className="text-xs font-bold text-slate-600">{form.evaluator.first_name_th}</p>
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {items.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
                            {item.order_no}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">{item.category}</p>
                            {item.description && (
                              <p className="text-xs text-slate-400 whitespace-pre-line mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-8 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                            น้ำหนัก {item.weight_pct}%
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                            คะแนน {item.actual_score}/100
                          </span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">
                            ได้ {item.weighted_score.toFixed(1)}
                          </span>
                        </div>
                        {item.comment && (
                          <div className="ml-8 flex items-start gap-1 mt-1">
                            <MessageSquare size={10} className="text-slate-300 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-400 italic">{item.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {form.evaluator_note && (
                      <div className="bg-slate-50 rounded-xl p-3 mt-3">
                        <p className="text-xs font-bold text-slate-500 mb-1">ความเห็นหัวหน้า</p>
                        <p className="text-sm text-slate-600">{form.evaluator_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
