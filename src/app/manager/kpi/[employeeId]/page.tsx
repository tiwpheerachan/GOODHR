"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  ChevronLeft, Plus, Trash2, Save, Send, Loader2, Target, AlertCircle,
  CheckCircle2, GripVertical, MessageSquare, Info, Clock, Copy,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

const MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

const GRADE_CONFIG: Record<string, { label: string; range: string; color: string; bg: string; ring: string }> = {
  A: { label: "A", range: "91-100%", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  B: { label: "B", range: "81-90%",  color: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-200" },
  C: { label: "C", range: "71-80%",  color: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200" },
  D: { label: "D", range: "0-70%",   color: "text-red-700",     bg: "bg-red-50",     ring: "ring-red-200" },
}

const DEFAULT_ITEMS: KpiRow[] = [
  {
    category: "ความประพฤติ (พนักงาน)",
    description: "1. ไม่ขาดงาน/ลางาน/มาสาย\n2. ให้ความร่วมมือในกิจกรรมต่างๆที่บริษัทจัดขึ้น\n3. มีความประพฤติส่วนตัวที่เหมาะสม",
    is_mandatory: false,
    weight_pct: 20,
    actual_score: 0,
    comment: "",
  },
  {
    category: "ความประพฤติ (หัวหน้างาน)",
    description: "4. ประพฤติตนตามระเบียบวินัย และคำสั่งของผู้บังคับบัญชา\n5. ไม่มีพฤติกรรมสร้างความแตกแยกในองค์กร\n6. ซื่อสัตย์สุจริตต่อหน้าที่ และรักษาผลประโยชน์ของบริษัท\n7. ไม่ทำให้บริษัทเสียหาย และหรือเสื่อมเสียชื่อเสียง",
    is_mandatory: false,
    weight_pct: 20,
    actual_score: 0,
    comment: "",
  },
]

interface KpiRow {
  category: string
  description: string
  is_mandatory: boolean
  weight_pct: number
  actual_score: number
  comment: string
}

function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

export default function KpiFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { t, T } = useLanguage()
  const empName = useEmployeeName()

  const employeeId = params.employeeId as string
  const year = Number(searchParams.get("year")) || new Date().getFullYear()
  const month = Number(searchParams.get("month")) || (new Date().getMonth() + 1)

  const [employee, setEmployee] = useState<any>(null)
  const [items, setItems] = useState<KpiRow[]>([...DEFAULT_ITEMS])
  const [evaluatorNote, setEvaluatorNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [existingFormId, setExistingFormId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ grade: string; score: number } | null>(null)
  const [expandedComment, setExpandedComment] = useState<number | null>(null)
  const [rejectionNote, setRejectionNote] = useState("")
  const mountedRef = useRef(true)

  // Load existing form
  useEffect(() => {
    mountedRef.current = true
    if (!user?.employee_id) return

    const load = async () => {
      try {
        // Load team data to get employee info
        const res = await fetch(`/api/kpi?mode=manager&year=${year}&month=${month}`)
        const data = await res.json()
        const emp = (data.members ?? []).find((m: any) => m.id === employeeId)
        if (emp && mountedRef.current) setEmployee(emp)

        // Check if form exists
        const form = (data.forms ?? []).find((f: any) => f.employee_id === employeeId)
        if (form) {
          setExistingFormId(form.id)
          // rejected → กลับมาแก้ไขได้, submitted/approved → ล็อค
          if (form.status === "submitted" || form.status === "approved") {
            setIsSubmitted(true)
          }
          if (form.rejection_note && mountedRef.current) {
            setRejectionNote(form.rejection_note)
          }
          // Load full form with items
          const fRes = await fetch(`/api/kpi?mode=single&form_id=${form.id}`)
          const fData = await fRes.json()
          if (fData.form?.items?.length > 0 && mountedRef.current) {
            const sorted = fData.form.items.sort((a: any, b: any) => a.order_no - b.order_no)
            setItems(sorted.map((it: any) => ({
              category: it.category,
              description: it.description || "",
              is_mandatory: it.is_mandatory,
              weight_pct: it.weight_pct,
              actual_score: it.actual_score,
              comment: it.comment || "",
            })))
            setEvaluatorNote(fData.form.evaluator_note || "")
          }
        }
      } catch (e) {
        console.error("Load KPI error:", e)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()
    return () => { mountedRef.current = false }
  }, [user?.employee_id, employeeId, year, month])

  // Calculations
  const totalWeight = items.reduce((s, i) => s + (Number(i.weight_pct) || 0), 0)
  const weightValid = Math.abs(totalWeight - 100) < 0.01
  const totalScore = items.reduce((s, i) => {
    const w = Number(i.weight_pct) || 0
    const a = Number(i.actual_score) || 0
    return s + Math.round((w * a / 100) * 100) / 100
  }, 0)
  const grade = calcGrade(totalScore)
  const gradeConf = GRADE_CONFIG[grade]

  // Actions
  const updateItem = useCallback((idx: number, field: keyof KpiRow, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }, [])

  const addItem = () => {
    if (items.length >= 15) { toast.error("สูงสุด 15 หัวข้อ"); return }
    setItems(prev => [...prev, { category: "", description: "", is_mandatory: false, weight_pct: 0, actual_score: 0, comment: "" }])
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) { toast.error("ต้องมีอย่างน้อย 1 หัวข้อ"); return }
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Copy items as template for next month
  const copyAsTemplate = async () => {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const templateItems = items.map(i => ({
      ...i,
      actual_score: 0,
      comment: "",
    }))
    setSaving(true)
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          year: nextYear,
          month: nextMonth,
          items: templateItems,
          evaluator_note: "",
          action: "save_draft",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ไม่สามารถคัดลอกได้")
      toast.success(`คัดลอก template ไป ${MONTHS[nextMonth]} ${nextYear} แล้ว`)
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const handleSave = async (action: "save_draft" | "submit") => {
    if (action === "submit") {
      if (!weightValid) { toast.error(t("kpi.weight_error")); return }
      const missing = items.some(i => !i.actual_score || i.actual_score < 1 || i.actual_score > 100)
      if (missing) { toast.error(t("kpi.score_error")); return }
      const emptyCat = items.some(i => !i.category.trim())
      if (emptyCat) { toast.error(t("kpi.category_error")); return }
      setShowConfirm(true)
      return
    }
    await doSave(action)
  }

  const doSave = async (action: "save_draft" | "submit") => {
    setSaving(true)
    setShowConfirm(false)
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, year, month, items, evaluator_note: evaluatorNote, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("common.error"))
      if (action === "submit") {
        setSubmitResult({ grade: data.grade, score: data.total_score })
        setShowSuccess(true)
        setIsSubmitted(true)
      } else {
        toast.success(t("kpi.draft_saved"))
        setExistingFormId(data.form_id)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-slate-300" />
    </div>
  )

  return (
    <div className="p-4 space-y-4 pb-32">
      {/* Back */}
      <Link href={`/manager/kpi`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        <ChevronLeft size={16} /> {t("common.back")}
      </Link>

      {/* Employee Header */}
      {employee && (
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
            {employee.avatar_url
              ? <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-indigo-600 text-lg font-bold">{employee.first_name_th?.[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800">{empName(employee)}</p>
            <p className="text-sm text-indigo-600 font-medium">{employee.position?.name}</p>
            <p className="text-xs text-slate-400">{employee.department?.name} · {employee.employee_code}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">{t("kpi.evaluation_month")}</p>
            <p className="font-black text-slate-700">{T.months_short?.[month] || MONTHS[month]} {year}</p>
          </div>
        </div>
      )}

      {/* Live Score Card */}
      <div className={`rounded-2xl p-4 ring-1 ${gradeConf.bg} ${gradeConf.ring} transition-all`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">{t("kpi.total_score")}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${gradeConf.color}`}>{totalScore.toFixed(1)}</span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="text-center">
            <div className={`w-14 h-14 rounded-2xl ${gradeConf.bg} ring-2 ${gradeConf.ring} flex items-center justify-center`}>
              <span className={`text-2xl font-black ${gradeConf.color}`}>{grade}</span>
            </div>
            <p className={`text-[10px] font-bold mt-1 ${gradeConf.color}`}>{gradeConf.range}</p>
          </div>
        </div>

        {/* Weight bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">{t("kpi.weight_sum")}</span>
            <span className={`text-[11px] font-black ${weightValid ? "text-emerald-600" : "text-red-500"}`}>
              {totalWeight}% / 100%
            </span>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weightValid ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-400"
              }`}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {isSubmitted && (
        <div className="flex items-center justify-between bg-orange-50 text-orange-700 text-sm font-bold px-4 py-3 rounded-2xl ring-1 ring-orange-200">
          <div className="flex items-center gap-2">
            <Clock size={16} />
            ฟอร์มนี้ถูกส่งแล้ว
          </div>
          <button onClick={() => setIsSubmitted(false)}
            className="text-xs bg-white text-orange-600 font-bold px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors border border-orange-200">
            แก้ไข
          </button>
        </div>
      )}

      {rejectionNote && !isSubmitted && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
            <AlertCircle size={16} />
            HR ส่งคืน — กรุณาแก้ไขและส่งใหม่
          </div>
          <p className="text-sm text-red-700 ml-6">{rejectionNote}</p>
        </div>
      )}

      {/* KPI Items */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const weighted = Math.round(((Number(item.weight_pct) || 0) * (Number(item.actual_score) || 0) / 100) * 100) / 100
          return (
            <div key={idx} className="card space-y-3">
              {/* Header Row */}
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black bg-slate-100 text-slate-500">
                    {idx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.category}
                    onChange={e => updateItem(idx, "category", e.target.value)}
                    disabled={isSubmitted}
                    placeholder="ชื่อหมวดหมู่งาน..."
                    className="w-full font-bold text-slate-800 text-sm bg-transparent border-b border-dashed border-slate-200 pb-1 outline-none focus:border-indigo-400 placeholder:text-slate-300 disabled:opacity-60"
                  />
                </div>

                {!isSubmitted && (
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                )}
              </div>

              {/* Description */}
              <textarea
                value={item.description}
                onChange={e => updateItem(idx, "description", e.target.value)}
                disabled={isSubmitted}
                placeholder="รายละเอียด / เป้าหมาย..."
                rows={2}
                className="ml-9 w-[calc(100%-36px)] text-xs text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-200 resize-none placeholder:text-slate-300 disabled:opacity-60"
              />

              {/* Score Row */}
              <div className="ml-9 flex items-center gap-2 flex-wrap">
                {/* Weight */}
                <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">น้ำหนัก</span>
                  <input
                    type="number"
                    value={item.weight_pct || ""}
                    onChange={e => updateItem(idx, "weight_pct", Number(e.target.value))}
                    disabled={isSubmitted}
                    min={0} max={100}
                    className="w-12 text-center text-sm font-black text-slate-800 bg-transparent outline-none disabled:opacity-60"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>

                {/* Actual Score */}
                <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">คะแนน</span>
                  <input
                    type="number"
                    value={item.actual_score || ""}
                    onChange={e => {
                      let v = Number(e.target.value)
                      if (v > 100) v = 100
                      if (v < 0) v = 0
                      updateItem(idx, "actual_score", v)
                    }}
                    disabled={isSubmitted}
                    min={0} max={100}
                    className="w-12 text-center text-sm font-black text-slate-800 bg-transparent outline-none disabled:opacity-60"
                  />
                  <span className="text-xs text-slate-400">/100</span>
                </div>

                {/* Weighted Result */}
                <div className={`px-3 py-2 rounded-xl ${weighted > 0 ? "bg-indigo-50" : "bg-slate-50"}`}>
                  <span className="text-[10px] font-bold text-slate-400 mr-1">ได้</span>
                  <span className={`text-sm font-black ${weighted > 0 ? "text-indigo-600" : "text-slate-400"}`}>
                    {weighted.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Comment Toggle */}
              <div className="ml-9">
                <button
                  onClick={() => setExpandedComment(expandedComment === idx ? null : idx)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <MessageSquare size={11} />
                  {item.comment ? "ดู/แก้ความเห็น" : "เพิ่มความเห็น"}
                </button>
                {expandedComment === idx && (
                  <textarea
                    value={item.comment}
                    onChange={e => updateItem(idx, "comment", e.target.value)}
                    disabled={isSubmitted}
                    placeholder="ความเห็นเพิ่มเติม..."
                    rows={2}
                    className="mt-2 w-full text-xs text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-200 resize-none placeholder:text-slate-300 disabled:opacity-60"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Button */}
      {!isSubmitted && items.length < 15 && (
        <button onClick={addItem}
          className="w-full card flex items-center justify-center gap-2 py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border-dashed border-2 border-indigo-200 bg-transparent shadow-none active:scale-[0.98]">
          <Plus size={16} /> {t("kpi.add_item")}
        </button>
      )}

      {/* Copy as Template for Next Month */}
      {items.length > 0 && existingFormId && (
        <button onClick={copyAsTemplate} disabled={saving}
          className="w-full card flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border border-emerald-200 bg-transparent shadow-none active:scale-[0.98] disabled:opacity-50">
          <Copy size={15} />
          คัดลอกหัวข้อไปเดือนถัดไป ({MONTHS[month === 12 ? 1 : month + 1]} {month === 12 ? year + 1 : year})
        </button>
      )}

      {/* Evaluator Note */}
      <div className="card space-y-2">
        <p className="text-sm font-bold text-slate-700">ความเห็นภาพรวมจากหัวหน้า</p>
        <textarea
          value={evaluatorNote}
          onChange={e => setEvaluatorNote(e.target.value)}
          disabled={isSubmitted}
          placeholder="ความเห็นเพิ่มเติม สรุปภาพรวม..."
          rows={3}
          className="w-full text-sm text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-200 resize-none placeholder:text-slate-300 disabled:opacity-60"
        />
      </div>

      {/* Grade Reference */}
      <div className="card">
        <div className="flex items-center gap-1.5 mb-2">
          <Info size={13} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-500">เกณฑ์การให้เกรด</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(GRADE_CONFIG).map(([g, c]) => (
            <div key={g} className={`text-center rounded-xl p-2 ${c.bg} ring-1 ${c.ring}`}>
              <p className={`text-lg font-black ${c.color}`}>{g}</p>
              <p className={`text-[10px] font-bold ${c.color}`}>{c.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {!isSubmitted && (
        <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-slate-100 p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex gap-3">
            <button
              onClick={() => handleSave("save_draft")}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t("kpi.save_draft")}
            </button>
            <button
              onClick={() => handleSave("submit")}
              disabled={saving || !weightValid}
              className="flex-[1.5] flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {t("kpi.submit")}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-6 pt-6 pb-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 left-6 w-16 h-16 border-2 border-white rounded-full" />
                <div className="absolute bottom-1 right-8 w-10 h-10 border-2 border-white rounded-full" />
              </div>
              <div className={`w-20 h-20 rounded-2xl ${gradeConf.bg} ring-4 ring-white/30 flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <span className={`text-4xl font-black ${gradeConf.color}`}>{grade}</span>
              </div>
              <h3 className="font-black text-white text-lg">{t("kpi.confirm_title")}</h3>
              <p className="text-indigo-200 text-sm mt-1">
                {empName(employee)} — {T.months_short?.[month] || MONTHS[month]} {year}
              </p>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-500">{t("kpi.total_score")}</span>
                <span className="text-lg font-black text-slate-800">{totalScore.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-500">{t("kpi.items_count")}</span>
                <span className="text-lg font-black text-slate-800">{items.length} {t("kpi.items_unit")}</span>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-amber-50 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700">{t("kpi.warning_title")}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">{t("kpi.warning_desc")}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={() => doSave("submit")}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {saving ? t("common.sending") : t("kpi.confirm_submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && submitResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Success Banner */}
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-6 pt-8 pb-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-8 w-12 h-12 border-2 border-white rounded-full" />
                <div className="absolute bottom-2 right-6 w-8 h-8 border-2 border-white rounded-full" />
                <div className="absolute top-8 right-16 w-4 h-4 bg-white rounded-full" />
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <h3 className="font-black text-white text-xl">{t("kpi.success_title")}</h3>
              <p className="text-emerald-100 text-sm mt-1">
                {t("kpi.success_desc")}
              </p>
            </div>

            {/* Result */}
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{t("kpi.total_score")}</p>
                  <p className="text-3xl font-black text-slate-800">{submitResult.score.toFixed(1)}%</p>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{t("kpi.grade")}</p>
                  <div className={`w-12 h-12 rounded-xl ${GRADE_CONFIG[submitResult.grade]?.bg || "bg-slate-100"} flex items-center justify-center`}>
                    <span className={`text-2xl font-black ${GRADE_CONFIG[submitResult.grade]?.color || "text-slate-600"}`}>
                      {submitResult.grade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <Send size={13} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-700">{t("kpi.success_sent_to_hr")}</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      {t("kpi.success_when_approved", { name: empName(employee) })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setShowSuccess(false); router.push("/manager/kpi") }}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                {t("kpi.back_to_list")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
