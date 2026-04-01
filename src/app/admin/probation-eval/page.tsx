"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Shield, Search, ChevronDown, ChevronUp, Loader2,
  Award, MessageSquare, Eye, CheckCircle2, XCircle, Clock, Pencil,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"

const ROUND_LABELS: Record<number, string> = { 1: "รอบ 1 (60 วัน)", 2: "รอบ 2 (90 วัน)", 3: "รอบ 3 (119 วัน)" }

const GRADE_CONF: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700" },
  B: { bg: "bg-blue-50", text: "text-blue-700" },
  C: { bg: "bg-amber-50", text: "text-amber-700" },
  D: { bg: "bg-red-50", text: "text-red-700" },
}

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/10 transition-all"

export default function AdminProbationEvalPage() {
  const { user } = useAuth()

  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roundFilter, setRoundFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")

  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation?mode=admin")
      const data = await res.json()
      setForms(data.forms ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const loadDetail = async (formId: string) => {
    if (expanded === formId) { setExpanded(null); setDetail(null); return }
    setExpanded(formId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/probation-evaluation?mode=single&form_id=${formId}`)
      const data = await res.json()
      setDetail(data.form)
    } catch {}
    setDetailLoading(false)
  }

  const handleApprove = async (formId: string) => {
    if (!confirm("ยืนยันอนุมัติผลประเมินทดลองงานนี้?")) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", form_id: formId }),
      })
      const data = await res.json()
      if (data.success) { toast.success("อนุมัติสำเร็จ"); load(); setExpanded(null) }
      else toast.error(data.error || "เกิดข้อผิดพลาด")
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", form_id: showRejectModal, rejection_note: rejectNote }),
      })
      const data = await res.json()
      if (data.success) { toast.success("ส่งคืนสำเร็จ"); setShowRejectModal(null); setRejectNote(""); load(); setExpanded(null) }
      else toast.error(data.error || "เกิดข้อผิดพลาด")
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setActionLoading(false)
  }

  const filtered = forms.filter(f => {
    const name = `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""} ${f.employee?.employee_code ?? ""}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (roundFilter && f.round !== Number(roundFilter)) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (gradeFilter && f.grade !== gradeFilter) return false
    return true
  })

  const pendingCount = filtered.filter(f => f.status === "submitted").length
  const approvedCount = filtered.filter(f => f.status === "approved").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-rose-600" />
          <h1 className="text-xl font-black text-slate-800">ประเมินทดลองงาน</h1>
        </div>
        <p className="text-sm text-slate-400">ตรวจสอบและอนุมัติผลประเมินทดลองงาน</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-black text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-400">ทั้งหมด</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">รอ HR อนุมัติ</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
          <p className="text-2xl font-black text-emerald-700">{approvedCount}</p>
          <p className="text-xs text-emerald-600">อนุมัติแล้ว</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-black text-slate-800">
            {filtered.length > 0 ? (filtered.reduce((s, f) => s + (f.total_score || 0), 0) / filtered.length).toFixed(1) : "0"}%
          </p>
          <p className="text-xs text-slate-400">คะแนนเฉลี่ย</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)} className={inp}>
          <option value="">ทุกรอบ</option>
          {[1, 2, 3].map(r => <option key={r} value={r}>{ROUND_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
          <option value="">ทุกสถานะ</option>
          <option value="submitted">รอ HR อนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ส่งคืน</option>
          <option value="draft">แบบร่าง</option>
        </select>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={inp}>
          <option value="">ทุกเกรด</option>
          {["A", "B", "C", "D"].map(g => <option key={g} value={g}>เกรด {g}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส..."
            className={`${inp} pl-9 w-full`} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ไม่พบข้อมูลประเมินทดลองงาน</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {filtered.map((form: any) => {
            const emp = form.employee
            const isOpen = expanded === form.id
            const items = detail?.items?.sort((a: any, b: any) => a.order_no - b.order_no) ?? []
            const gc = GRADE_CONF[form.grade] || GRADE_CONF.D

            return (
              <div key={form.id} className="border-b border-slate-50 last:border-0">
                <button onClick={() => loadDetail(form.id)}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 transition-colors text-left flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                    {emp?.avatar_url
                      ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-rose-600 text-sm font-bold">{emp?.first_name_th?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{emp?.first_name_th} {emp?.last_name_th}</p>
                    <p className="text-xs text-slate-400">{emp?.employee_code} · {emp?.position?.name}</p>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block">{ROUND_LABELS[form.round]}</span>
                  <span className="text-sm font-bold text-slate-800">{form.total_score?.toFixed(1)}%</span>
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${gc.bg} ${gc.text}`}>{form.grade}</span>
                  <span className={`text-xs font-bold ${
                    form.status === "approved" ? "text-emerald-600" :
                    form.status === "submitted" ? "text-amber-600" :
                    form.status === "rejected" ? "text-red-500" : "text-slate-400"
                  }`}>
                    {form.status === "approved" ? "อนุมัติ" :
                     form.status === "submitted" ? "รอ HR" :
                     form.status === "rejected" ? "ส่งคืน" : "ร่าง"}
                  </span>
                  {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    {detailLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Eye size={12} />
                          <span>ประเมินโดย {detail?.evaluator?.first_name_th} {detail?.evaluator?.last_name_th}</span>
                          <span className="text-slate-400">· {ROUND_LABELS[form.round]}</span>
                        </div>

                        {items.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-white rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-md bg-rose-50 text-xs font-bold text-rose-600 flex items-center justify-center shrink-0">{item.order_no}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">{item.category}</p>
                                {item.description && <p className="text-xs text-slate-400 whitespace-pre-line mt-0.5 line-clamp-2">{item.description}</p>}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">น้ำหนัก {item.weight_pct}%</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">คะแนน {item.actual_score}/100</span>
                                  <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-md">ได้ {item.weighted_score?.toFixed(1)}</span>
                                </div>
                                {item.comment && (
                                  <p className="text-xs text-slate-400 italic mt-1.5 flex items-start gap-1">
                                    <MessageSquare size={10} className="shrink-0 mt-0.5" /> {item.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {detail?.evaluator_note && (
                          <div className="bg-white rounded-xl p-3">
                            <p className="text-xs font-bold text-slate-500 mb-1">ความเห็นภาพรวม</p>
                            <p className="text-sm text-slate-600">{detail.evaluator_note}</p>
                          </div>
                        )}

                        {detail?.rejection_note && detail?.status === "rejected" && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-red-600 mb-1">เหตุผลที่ส่งคืน</p>
                            <p className="text-sm text-red-700">{detail.rejection_note}</p>
                          </div>
                        )}

                        {form.status === "submitted" && (
                          <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => handleApprove(form.id)} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                              <CheckCircle2 size={16} /> อนุมัติ
                            </button>
                            <button onClick={() => { setShowRejectModal(form.id); setRejectNote("") }} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-100 border border-red-200 disabled:opacity-50">
                              <XCircle size={16} /> ส่งคืน
                            </button>
                            <Link href={`/manager/probation-eval/${form.employee_id}?round=${form.round}`}
                              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-slate-200">
                              <Pencil size={14} /> แก้ไข
                            </Link>
                          </div>
                        )}

                        {form.status === "approved" && (
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 size={16} />
                              <span className="text-sm font-bold">อนุมัติแล้ว</span>
                            </div>
                            <Link href={`/manager/probation-eval/${form.employee_id}?round=${form.round}`}
                              className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200">
                              <Pencil size={12} /> แก้ไข
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={20} />
              <h3 className="text-lg font-black">ส่งคืนผลประเมินทดลองงาน</h3>
            </div>
            <p className="text-sm text-slate-500">กรุณาระบุเหตุผลที่ส่งคืน</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="เหตุผลที่ส่งคืน..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px] outline-none focus:border-red-400" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? "กำลังส่ง..." : "ยืนยันส่งคืน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
