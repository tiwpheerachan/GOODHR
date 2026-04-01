"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Shield, Loader2, ChevronDown, ChevronUp, MessageSquare, CheckCircle2 } from "lucide-react"

const ROUND_LABELS: Record<number, string> = { 1: "รอบที่ 1 (60 วัน)", 2: "รอบที่ 2 (90 วัน)", 3: "รอบที่ 3 (119 วัน)" }

const GRADE_CONF: Record<string, { bg: string; color: string }> = {
  A: { bg: "bg-emerald-50", color: "text-emerald-600" },
  B: { bg: "bg-blue-50", color: "text-blue-600" },
  C: { bg: "bg-amber-50", color: "text-amber-600" },
  D: { bg: "bg-red-50", color: "text-red-600" },
}

export default function EmployeeProbationEvalPage() {
  const { user } = useAuth()
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.employee_id) return
    fetch("/api/probation-evaluation?mode=employee")
      .then(r => r.json())
      .then(data => setForms(data.forms ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.employee_id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="p-4 space-y-4">
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <Shield size={16} className="text-rose-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800">ผลประเมินทดลองงาน</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">ดูผลการประเมินทดลองงานของคุณ</p>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ยังไม่มีผลประเมินทดลองงาน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form: any, fi: number) => {
            const gc = GRADE_CONF[form.grade] || GRADE_CONF.D
            const isOpen = expanded === fi
            const items = (form.items ?? []).sort((a: any, b: any) => a.order_no - b.order_no)

            return (
              <div key={form.id} className="card overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : fi)}
                  className="w-full flex items-center gap-3 text-left">
                  <div className={`w-12 h-12 rounded-2xl ${gc.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-xl font-black ${gc.color}`}>{form.grade}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{ROUND_LABELS[form.round]}</p>
                    <p className="text-xs text-slate-400">
                      คะแนน {form.total_score?.toFixed(1)}% · ประเมินโดย {form.evaluator?.first_name_th} {form.evaluator?.last_name_th}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-bold">อนุมัติ</span>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {items.map((item: any) => (
                      <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center shrink-0">{item.order_no}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700">{item.category}</p>
                            {item.description && <p className="text-xs text-slate-400 whitespace-pre-line mt-0.5 line-clamp-3">{item.description}</p>}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] bg-white text-slate-500 font-bold px-1.5 py-0.5 rounded">น้ำหนัก {item.weight_pct}%</span>
                              <span className="text-[10px] bg-white text-slate-500 font-bold px-1.5 py-0.5 rounded">คะแนน {item.actual_score}</span>
                              <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded">ได้ {item.weighted_score?.toFixed(1)}</span>
                            </div>
                            {item.comment && (
                              <p className="text-xs text-slate-400 italic mt-1 flex items-start gap-1">
                                <MessageSquare size={10} className="shrink-0 mt-0.5" /> {item.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {form.evaluator_note && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-500 mb-1">ความเห็นภาพรวม</p>
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
