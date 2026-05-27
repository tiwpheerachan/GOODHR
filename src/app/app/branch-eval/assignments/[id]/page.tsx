"use client"
// Evaluator view ของการบ้าน — แสดงเฉพาะงานของลูกน้องคนนี้ + ปุ่ม "เริ่มประเมิน"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, ClipboardList, Calendar, Store, Layers,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Loader2, Play,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export default function MyAssignmentDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/branch-eval/assignments?id=${id}`).then(r => r.json()),
      fetch("/api/branch-eval/me").then(r => r.json()),
    ]).then(([a, m]) => {
      setData(a); setMe(m); setLoading(false)
    })
  }, [id])

  // กรองเฉพาะ targets ของฉัน
  const myTargets = useMemo(() => {
    if (!data?.targets || !me?.employee_id) return []
    return (data.targets as any[]).filter(t => t.assignee_id === me.employee_id)
  }, [data, me])

  // เริ่มประเมินสาขา → ถ้ามี draft อยู่แล้ว ใช้อันเดิม / ถ้าไม่มี สร้างใหม่
  const startEvaluation = async (target: any) => {
    setStartingId(target.id)
    try {
      // ถ้ามี eval อยู่แล้ว (draft) → ไปเลย
      if (target.evaluation?.id) {
        router.push(`/app/branch-eval/${target.evaluation.id}`)
        return
      }
      // สร้างใหม่
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: target.branch_id,
          template_id: target.template?.id || target.template_id || data.assignment.template_id,
          assignment_id: id,
          visit_date: new Date().toISOString().slice(0, 10),
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "เริ่มประเมินไม่สำเร็จ")
        return
      }
      router.push(`/app/branch-eval/${d.id}`)
    } finally {
      setStartingId(null)
    }
  }

  if (loading) return (
    <div className="p-4"><div className="h-32 bg-slate-100 rounded-2xl animate-pulse" /></div>
  )
  if (!data?.assignment) return (
    <div className="p-6 text-center text-slate-400">ไม่พบการบ้าน</div>
  )
  if (myTargets.length === 0) return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <Link href="/app/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14}/> ประเมินสาขา
      </Link>
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
        <p className="font-bold text-slate-500">การบ้านนี้ไม่ใช่ของคุณ</p>
      </div>
    </div>
  )

  const asg = data.assignment
  const total = myTargets.length
  const done = myTargets.filter(t => t.completed_at).length
  const progress = total > 0 ? (done / total) * 100 : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdue = asg.due_date && asg.due_date < today && done < total

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-3 pb-32">
      <Link href="/app/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14}/> ประเมินสาขา
      </Link>

      {/* Header */}
      <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${
        done === total ? "border-emerald-200"
        : overdue ? "border-rose-200"
        : "border-orange-200"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            done === total ? "bg-emerald-100 text-emerald-700"
            : overdue ? "bg-rose-100 text-rose-700"
            : "bg-orange-100 text-orange-700"
          }`}>
            <ClipboardList size={20}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">📋 การบ้านของฉัน</p>
            <h1 className="text-xl font-black text-slate-800">{asg.title}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-slate-500">
              {asg.assigner && (
                <span>มอบโดย <b className="text-slate-700">{asg.assigner.first_name_th} {asg.assigner.last_name_th}</b></span>
              )}
              {asg.due_date && (
                <span className={`inline-flex items-center gap-1 font-bold ${overdue ? "text-rose-700" : "text-amber-700"}`}>
                  · <Calendar size={11}/> ครบ {format(new Date(asg.due_date), "d MMM yyyy", { locale: th })}
                  {overdue && " (เลยกำหนด!)"}
                </span>
              )}
            </div>
            {asg.description && (
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">{asg.description}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-slate-600">ความคืบหน้าของฉัน</p>
            <p className="text-lg font-black text-slate-800">
              <span className={done === total ? "text-emerald-700" : "text-orange-700"}>{done}</span>
              <span className="text-slate-400">/{total}</span>
              <span className="text-xs font-bold text-slate-500 ml-1.5">({progress.toFixed(0)}%)</span>
            </p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${
              done === total ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-orange-500"
            }`} style={{ width: `${progress}%` }}/>
          </div>
        </div>
      </div>

      {/* Pending list — งานที่ต้องทำ */}
      {(() => {
        const pending = myTargets.filter(t => !t.completed_at)
        const completed = myTargets.filter(t => t.completed_at)
        return (
          <>
            {pending.length > 0 && (
              <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100">
                  <p className="font-black text-sm text-amber-900">⏳ ยังต้องทำ ({pending.length})</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">กดปุ่ม <b>"เริ่มประเมิน"</b> เพื่อกรอกฟอร์มของแต่ละสาขา</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {pending.map(t => {
                    const tplName = t.template?.name || asg.template?.name || "—"
                    const isStarting = startingId === t.id
                    const hasDraft = t.evaluation?.id && t.evaluation?.status === "draft"
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                          <Store size={18}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-800 truncate">{t.branch?.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {t.branch?.code} · 📋 <b className="text-violet-700">{tplName}</b>
                            {hasDraft && <span className="ml-1.5 text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">ร่างค้างอยู่</span>}
                          </p>
                        </div>
                        <button onClick={() => startEvaluation(t)}
                          disabled={isStarting}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 font-black text-xs rounded-xl shadow-sm whitespace-nowrap disabled:opacity-50 ${
                            hasDraft
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "bg-orange-500 hover:bg-orange-600 text-white"
                          }`}>
                          {isStarting ? (
                            <Loader2 size={12} className="animate-spin"/>
                          ) : (
                            <Play size={12} className="fill-current"/>
                          )}
                          {hasDraft ? "ทำต่อ" : "เริ่มประเมิน"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Done list */}
            {completed.length > 0 && (
              <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50/40 border-b border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600"/>
                  <p className="font-black text-sm text-emerald-900">✅ ทำแล้ว ({completed.length})</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {completed.map(t => {
                    const tplName = t.template?.name || asg.template?.name || "—"
                    return (
                      <Link key={t.id} href={`/app/branch-eval/${t.evaluation?.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-emerald-50/40">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 size={14}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{t.branch?.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {t.branch?.code} · 📋 {tplName}
                            {t.completed_at && <> · เสร็จ {format(new Date(t.completed_at), "d MMM HH:mm", { locale: th })}</>}
                          </p>
                        </div>
                        {t.evaluation?.percentage != null && (
                          <span className={`text-sm font-black ${
                            Number(t.evaluation.percentage) >= 80 ? "text-emerald-700"
                            : Number(t.evaluation.percentage) >= 60 ? "text-amber-700"
                            : "text-rose-700"
                          }`}>{Number(t.evaluation.percentage).toFixed(0)}%</span>
                        )}
                        <ChevronRight size={13} className="text-slate-300"/>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
