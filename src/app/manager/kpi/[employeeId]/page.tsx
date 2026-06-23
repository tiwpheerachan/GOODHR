"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  ChevronLeft, Plus, Trash2, Save, Send, Loader2, Target, AlertCircle,
  CheckCircle2, GripVertical, MessageSquare, Info, Clock, Copy, Sparkles,
  Coins, Wallet, ListChecks, Paperclip, ImageIcon, FileText, X as XIcon,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import CopyFromPicker, { CopyFromItem } from "@/components/manager/CopyFromPicker"
import {
  KPI_GRADE_INCENTIVE_TABLE,
  calcGradeIncentive,
  type EvaluationType,
} from "@/lib/utils/kpi"

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
  // Admin override: ปลดล็อกแม้ฟอร์มถูก submit/approved แล้ว
  const isAdmin = ["hr_admin", "super_admin"].includes((user as any)?.role ?? "")

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
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  // ── Mode B/C: ประเภทการประเมิน + จำนวนเงิน + bonus ──
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("standard")
  const [incentiveAmount, setIncentiveAmount] = useState<string>("")  // Mode B
  const [moneyReason, setMoneyReason] = useState<string>("")          // Mode B
  const [moneyAttachments, setMoneyAttachments] = useState<{ url: string; name: string }[]>([])  // Mode B
  const [uploadingMoneyAttach, setUploadingMoneyAttach] = useState(false)
  const moneyFileInputRef = useRef<HTMLInputElement>(null)
  const [bonusAmount, setBonusAmount] = useState<string>("")          // Mode A/C
  const [bonusReason, setBonusReason] = useState<string>("")          // Mode A/C
  // ── General attachments (ใช้ได้ทุกโหมด) — รูป/หลักฐานประกอบการประเมิน ──
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size?: number }>>([])
  const [uploadingAttach, setUploadingAttach] = useState(false)
  const attachFileRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)

  // ── Upload handler for money_only attachments ────────────────────
  const handleMoneyAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (moneyAttachments.length + files.length > 10) {
      toast.error("แนบไฟล์ได้สูงสุด 10 ไฟล์")
      return
    }
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        toast.error(`ไฟล์ ${files[i].name} ใหญ่เกินไป (สูงสุด 10 MB)`)
        return
      }
    }
    setUploadingMoneyAttach(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append("files", files[i])
      const res = await fetch("/api/leave/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || "อัปโหลดไม่สำเร็จ")
      const newFiles = (json.files ?? [{ url: json.url, name: json.name }])
        .map((f: any) => ({ url: f.url, name: f.name }))
      setMoneyAttachments(prev => [...prev, ...newFiles])
      toast.success(`แนบ ${newFiles.length} ไฟล์แล้ว`)
    } catch (err: any) {
      toast.error(err.message || "อัปโหลดไฟล์ไม่สำเร็จ")
    } finally {
      setUploadingMoneyAttach(false)
      if (moneyFileInputRef.current) moneyFileInputRef.current.value = ""
    }
  }
  const removeMoneyAttachment = (idx: number) =>
    setMoneyAttachments(prev => prev.filter((_, i) => i !== idx))

  // ── Upload handler สำหรับ general attachments (ทุกโหมด) ──
  const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (attachments.length + files.length > 10) {
      toast.error("แนบไฟล์ได้สูงสุด 10 ไฟล์")
      return
    }
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        toast.error(`ไฟล์ ${files[i].name} ใหญ่เกินไป (สูงสุด 10 MB)`)
        return
      }
    }
    setUploadingAttach(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append("files", files[i])
      const res = await fetch("/api/leave/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || "อัปโหลดไม่สำเร็จ"); return }
      const newFiles: Array<{ url: string; name: string; size?: number }> =
        (json.files ?? [{ url: json.url, name: json.name }])
          .map((f: any, i: number) => ({ url: f.url, name: f.name, size: files[i]?.size }))
      setAttachments(prev => [...prev, ...newFiles])
      toast.success(`อัปโหลด ${newFiles.length} ไฟล์แล้ว`)
    } catch { toast.error("อัปโหลดไม่สำเร็จ") }
    finally {
      setUploadingAttach(false)
      if (attachFileRef.current) attachFileRef.current.value = ""
    }
  }
  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx))

  // Load existing form
  useEffect(() => {
    mountedRef.current = true
    if (!user?.employee_id) return

    const load = async () => {
      try {
        // Load team data to get employee info
        // ส่ง employee_id เพื่อให้ API รู้ว่ากำลังเปิดฟอร์มของคนใด
        //   ปกติ — backend ตรวจ permission ตาม manager chain เหมือนเดิม
        //   Admin (hr_admin/super_admin) — backend จะ unlock เห็นได้แม้ไม่ใช่ลูกน้องตรง
        const res = await fetch(`/api/kpi?mode=manager&year=${year}&month=${month}&employee_id=${employeeId}`)
        const data = await res.json()
        const emp = (data.members ?? []).find((m: any) => m.id === employeeId)
        if (emp && mountedRef.current) setEmployee(emp)

        // Check if form exists
        const form = (data.forms ?? []).find((f: any) => f.employee_id === employeeId)
        if (form) {
          setExistingFormId(form.id)
          // rejected → กลับมาแก้ไขได้, submitted/approved → ล็อค
          // Admin (hr_admin/super_admin) → ปลดล็อกได้เสมอ (สำหรับแก้ไข + อนุมัติใหม่)
          if ((form.status === "submitted" || form.status === "approved") && !isAdmin) {
            setIsSubmitted(true)
          }
          if (form.rejection_note && mountedRef.current) {
            setRejectionNote(form.rejection_note)
          }
          // Load full form with items
          const fRes = await fetch(`/api/kpi?mode=single&form_id=${form.id}`)
          const fData = await fRes.json()
          if (fData.form && mountedRef.current) {
            const f = fData.form
            // โหลดข้อมูลทุกฟิลด์ของฟอร์ม (รองรับ 3 modes)
            if (f.evaluation_type) setEvaluationType(f.evaluation_type)
            if (f.incentive_amount !== null && f.incentive_amount !== undefined) setIncentiveAmount(String(f.incentive_amount))
            if (f.bonus_amount !== null && f.bonus_amount !== undefined) setBonusAmount(String(f.bonus_amount))
            if (f.money_reason) setMoneyReason(f.money_reason)
            if (Array.isArray(f.money_reason_attachments)) setMoneyAttachments(f.money_reason_attachments)
            if (Array.isArray(f.attachments)) setAttachments(f.attachments)
            if (f.bonus_reason) setBonusReason(f.bonus_reason)
            setEvaluatorNote(f.evaluator_note || "")

            if (f.items?.length > 0) {
              const sorted = f.items.sort((a: any, b: any) => a.order_no - b.order_no)
              setItems(sorted.map((it: any) => ({
                category: it.category, description: it.description || "",
                is_mandatory: it.is_mandatory, weight_pct: it.weight_pct,
                actual_score: it.actual_score, comment: it.comment || "",
              })))
            }
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
  const isMoneyOnly = evaluationType === "money_only"
  const isGradeIncentive = evaluationType === "grade_incentive"
  const totalWeight = items.reduce((s, i) => s + (Number(i.weight_pct) || 0), 0)
  const weightValid = isMoneyOnly || Math.abs(totalWeight - 100) < 0.01
  const totalScore = isMoneyOnly ? 0 : items.reduce((s, i) => {
    const w = Number(i.weight_pct) || 0
    const a = Number(i.actual_score) || 0
    return s + Math.round((w * a / 100) * 100) / 100
  }, 0)
  const grade = isMoneyOnly ? "" : (isGradeIncentive ? calcGradeIncentive(totalScore) : calcGrade(totalScore))
  const gradeConf = GRADE_CONFIG[grade] ?? GRADE_CONFIG.D

  // จำนวนเงินที่จะได้ (preview)
  const previewIncentive = isMoneyOnly
    ? (Number(incentiveAmount) || 0)
    : isGradeIncentive
      ? (KPI_GRADE_INCENTIVE_TABLE[grade] ?? 0)
      : 0
  const previewBonus = Number(bonusAmount) || 0
  const previewTotalMoney = previewIncentive + previewBonus

  // Actions
  const updateItem = useCallback((idx: number, field: keyof KpiRow, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }, [])

  const addItem = () => {
    if (items.length >= 15) { toast.error(t("kpi.max_items_15")); return }
    setItems(prev => [...prev, { category: "", description: "", is_mandatory: false, weight_pct: 0, actual_score: 0, comment: "" }])
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) { toast.error(t("kpi.min_items_1")); return }
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
      if (!res.ok) throw new Error(data.error || t("kpi.cannot_copy"))
      toast.success(t("kpi.copy_template_success", { month: MONTHS[nextMonth], year: nextYear }))
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const handleSave = async (action: "save_draft" | "submit") => {
    if (action === "submit") {
      if (isMoneyOnly) {
        const amt = Number(incentiveAmount)
        if (!Number.isFinite(amt) || amt < 0) { toast.error(t("kpi.enter_amount")); return }
      } else {
        if (!weightValid) { toast.error(t("kpi.weight_error")); return }
        // อนุญาตให้กรอก 0 ได้ (กรณีหัวหน้าให้คะแนนต่ำสุด) — เช็คเฉพาะ null/undefined + เกินช่วง
        const missing = items.some(i => i.actual_score == null || i.actual_score < 0 || i.actual_score > 100)
        if (missing) { toast.error(t("kpi.score_error")); return }
        const emptyCat = items.some(i => !i.category.trim())
        if (emptyCat) { toast.error(t("kpi.category_error")); return }
      }
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
        body: JSON.stringify({
          employee_id: employeeId, year, month, action,
          evaluation_type: evaluationType,
          items: isMoneyOnly ? [] : items,
          evaluator_note: evaluatorNote,
          incentive_amount: isMoneyOnly ? (Number(incentiveAmount) || 0) : null,
          bonus_amount: isMoneyOnly ? null : (bonusAmount === "" ? null : Number(bonusAmount) || 0),
          bonus_reason: isMoneyOnly ? null : (bonusReason || null),
          money_reason: isMoneyOnly ? (moneyReason || null) : null,
          money_reason_attachments: isMoneyOnly ? moneyAttachments : [],
          attachments,
        }),
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

      {/* ── ประเภทการประเมิน (Mode selector) ── */}
      {!isSubmitted && (
        <div className="card space-y-2">
          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Target size={12} /> {t("kpi.mode_section_title")}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button onClick={() => setEvaluationType("standard")}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                evaluationType === "standard" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <ListChecks size={16} />
              <span className="font-bold">{t("kpi.mode_standard")}</span>
              <span className="text-[10px] text-slate-400">{t("kpi.mode_standard_desc")}</span>
            </button>
            <button onClick={() => setEvaluationType("money_only")}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                evaluationType === "money_only" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <Wallet size={16} />
              <span className="font-bold">{t("kpi.mode_money_only")}</span>
              <span className="text-[10px] text-slate-400">{t("kpi.mode_money_only_desc")}</span>
            </button>
            <button onClick={() => setEvaluationType("grade_incentive")}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                evaluationType === "grade_incentive" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <Coins size={16} />
              <span className="font-bold">{t("kpi.mode_grade_incentive")}</span>
              <span className="text-[10px] text-slate-400">{t("kpi.mode_grade_incentive_desc")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Score Card — ซ่อนใน money_only */}
      {!isMoneyOnly && (
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
      )}

      {/* ── Mode C: ตารางเงินรางวัลตามเกรด ── */}
      {isGradeIncentive && (
        <div className="card space-y-2">
          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Coins size={12} className="text-amber-500" /> {t("kpi.grade_incentive_table")}
          </p>
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            {(["A","B","C","D"] as const).map(g => (
              <div key={g} className={`rounded-lg py-2 px-1 border-2 ${grade === g ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-slate-100 bg-slate-50"}`}>
                <p className="text-base font-black text-slate-700">{g}</p>
                <p className="text-[10px] text-slate-500">
                  {g === "A" && "≥ 90"}
                  {g === "B" && "80-89"}
                  {g === "C" && "65-79"}
                  {g === "D" && "< 65"}
                </p>
                <p className="text-[11px] font-bold text-amber-600">{KPI_GRADE_INCENTIVE_TABLE[g].toLocaleString()}฿</p>
              </div>
            ))}
          </div>
          {grade && (
            <p className="text-[11px] text-slate-500 mt-1 text-center">
              {t("kpi.current_grade_money", { grade, amount: KPI_GRADE_INCENTIVE_TABLE[grade]?.toLocaleString() ?? "0" })}
            </p>
          )}
        </div>
      )}

      {/* ── Mode B: กล่องกรอกเงิน ── */}
      {isMoneyOnly && (
        <div className="card space-y-3 ring-2 ring-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-1.5">
            <Wallet size={14} className="text-emerald-600" />
            <p className="text-sm font-black text-emerald-700">{t("kpi.money_amount_label")}</p>
          </div>
          <input type="number" inputMode="decimal" min={0} step={1}
            value={incentiveAmount}
            onChange={e => setIncentiveAmount(e.target.value)}
            disabled={isSubmitted}
            placeholder={t("kpi.money_amount_placeholder")}
            className="w-full text-center text-2xl font-black text-emerald-700 bg-white rounded-xl py-3 ring-1 ring-emerald-300 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-60" />
          <textarea
            value={moneyReason}
            onChange={e => setMoneyReason(e.target.value)}
            disabled={isSubmitted}
            placeholder={t("kpi.money_note_placeholder")}
            rows={2}
            className="w-full text-xs text-slate-600 bg-white rounded-xl p-3 outline-none focus:ring-1 focus:ring-emerald-300 resize-none placeholder:text-slate-300 disabled:opacity-60" />

          {/* ── File / Image attachments — proof of evaluation ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Paperclip size={12} className="text-emerald-600" />
              <p className="text-[11px] font-bold text-emerald-700">
                แนบหลักฐาน <span className="font-normal text-emerald-600/70">(รูป/PDF/Word — สูงสุด 10 ไฟล์ · ไฟล์ละไม่เกิน 10 MB)</span>
              </p>
            </div>

            {moneyAttachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {moneyAttachments.map((att, idx) => {
                  const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(att.name)
                  return (
                    <div key={idx} className="relative group bg-white border border-emerald-200 rounded-lg overflow-hidden">
                      {isImage ? (
                        <a href={att.url} target="_blank" rel="noreferrer" className="block">
                          <img src={att.url} alt={att.name} className="w-full h-24 object-cover" />
                        </a>
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer"
                          className="flex flex-col items-center justify-center h-24 text-emerald-700 hover:bg-emerald-50">
                          <FileText size={20} />
                          <p className="text-[10px] mt-1 px-1 truncate w-full text-center">{att.name}</p>
                        </a>
                      )}
                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => removeMoneyAttachment(idx)}
                          className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <XIcon size={11} />
                        </button>
                      )}
                      <p className="text-[10px] text-slate-500 px-2 py-1 truncate border-t border-emerald-100 bg-emerald-50/50">
                        {att.name}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {!isSubmitted && moneyAttachments.length < 10 && (
              <>
                <input
                  ref={moneyFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleMoneyAttachUpload}
                  className="hidden" />
                <button
                  type="button"
                  onClick={() => moneyFileInputRef.current?.click()}
                  disabled={uploadingMoneyAttach}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border-2 border-dashed border-emerald-300 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-60">
                  {uploadingMoneyAttach ? (
                    <><Loader2 size={13} className="animate-spin" /> กำลังอัปโหลด...</>
                  ) : (
                    <><ImageIcon size={13} /> {moneyAttachments.length > 0 ? "เพิ่มไฟล์/รูป" : "แนบรูปหรือไฟล์ที่มาของจำนวนเงิน"}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ค่าผลงานพิเศษ (Mode A & C) ── */}
      {!isMoneyOnly && !isSubmitted && (
        <div className="card space-y-2">
          <div className="flex items-center gap-1.5">
            <Coins size={13} className="text-amber-500" />
            <p className="text-sm font-bold text-slate-700">{t("kpi.bonus_label")} <span className="text-[11px] font-normal text-slate-400">{t("kpi.optional")}</span></p>
          </div>
          <input type="number" inputMode="decimal" min={0} step={1}
            value={bonusAmount}
            onChange={e => setBonusAmount(e.target.value)}
            placeholder="0"
            className="w-full text-right text-base font-bold text-slate-800 bg-slate-50 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-slate-300" />
          {Number(bonusAmount) > 0 && (
            <textarea
              value={bonusReason}
              onChange={e => setBonusReason(e.target.value)}
              placeholder={t("kpi.bonus_reason_placeholder")}
              rows={1}
              className="w-full text-xs text-slate-600 bg-slate-50 rounded-xl p-2 outline-none focus:ring-1 focus:ring-amber-300 resize-none placeholder:text-slate-300" />
          )}
        </div>
      )}

      {/* ── สรุปยอดเงินรวม (Mode B + C) ── */}
      {(isMoneyOnly || isGradeIncentive || previewBonus > 0) && (
        <div className="card flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 ring-1 ring-indigo-200">
          <div className="flex items-center gap-1.5">
            <Wallet size={14} className="text-indigo-600" />
            <p className="text-sm font-bold text-indigo-700">{t("kpi.total_money_label")}</p>
          </div>
          <p className="text-xl font-black text-indigo-700">{previewTotalMoney.toLocaleString()} {t("kpi.baht")}</p>
        </div>
      )}

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

      {/* Copy from past evaluation */}
      {!isSubmitted && (
        <button
          onClick={() => setShowCopyPicker(true)}
          className="w-full card flex items-center justify-center gap-2 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-200 bg-indigo-50/40 active:scale-[0.98]"
        >
          <Sparkles size={15} />
          {t("kpi.start_from_template")}
        </button>
      )}

      {/* KPI Items — ซ่อนใน money_only */}
      {!isMoneyOnly && <div className="space-y-3">
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
                    placeholder={t("kpi.category_placeholder")}
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
                placeholder={t("kpi.description_placeholder")}
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
                    value={item.weight_pct == null ? "" : item.weight_pct}
                    onChange={e => {
                      if (e.target.value === "") { updateItem(idx, "weight_pct", null as any); return }
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) updateItem(idx, "weight_pct", v)
                    }}
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
                    value={item.actual_score == null ? "" : item.actual_score}
                    onChange={e => {
                      // ว่าง = null (ยังไม่กรอก), มีค่า = number (รวม 0)
                      if (e.target.value === "") { updateItem(idx, "actual_score", null as any); return }
                      let v = Number(e.target.value)
                      if (!Number.isFinite(v)) return
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
                  {item.comment ? t("kpi.add_comment") : t("kpi.add_comment_btn")}
                </button>
                {expandedComment === idx && (
                  <textarea
                    value={item.comment}
                    onChange={e => updateItem(idx, "comment", e.target.value)}
                    disabled={isSubmitted}
                    placeholder={t("kpi.comment_placeholder")}
                    rows={2}
                    className="mt-2 w-full text-xs text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-200 resize-none placeholder:text-slate-300 disabled:opacity-60"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>}

      {/* Add Button — ซ่อนใน money_only */}
      {!isMoneyOnly && !isSubmitted && items.length < 15 && (
        <button onClick={addItem}
          className="w-full card flex items-center justify-center gap-2 py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border-dashed border-2 border-indigo-200 bg-transparent shadow-none active:scale-[0.98]">
          <Plus size={16} /> {t("kpi.add_item")}
        </button>
      )}

      {/* Copy as Template for Next Month — ซ่อนใน money_only */}
      {!isMoneyOnly && items.length > 0 && existingFormId && (
        <button onClick={copyAsTemplate} disabled={saving}
          className="w-full card flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border border-emerald-200 bg-transparent shadow-none active:scale-[0.98] disabled:opacity-50">
          <Copy size={15} />
          คัดลอกหัวข้อไปเดือนถัดไป ({MONTHS[month === 12 ? 1 : month + 1]} {month === 12 ? year + 1 : year})
        </button>
      )}

      {/* Evaluator Note — ซ่อนใน money_only */}
      {!isMoneyOnly && (
        <div className="card space-y-2">
          <p className="text-sm font-bold text-slate-700">ความเห็นภาพรวมจากหัวหน้า</p>
          <textarea
            value={evaluatorNote}
            onChange={e => setEvaluatorNote(e.target.value)}
            disabled={isSubmitted}
            placeholder={t("kpi.overall_note_placeholder")}
            rows={3}
            className="w-full text-sm text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-200 resize-none placeholder:text-slate-300 disabled:opacity-60"
          />
        </div>
      )}

      {/* ── หลักฐาน/รูปประกอบ — เห็นได้ทั้งหัวหน้าและพนักงาน (ทุกโหมด) ── */}
      <div className="card space-y-2">
        <div className="flex items-center gap-1.5">
          <Paperclip size={12} className="text-indigo-600"/>
          <p className="text-sm font-bold text-slate-700">หลักฐาน/รูปประกอบการประเมิน</p>
          <span className="text-[10px] font-normal text-slate-400 ml-1">(พนักงานจะเห็น · สูงสุด 10 · ≤ 10 MB)</span>
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attachments.map((att, idx) => {
              const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(att.name)
              return (
                <div key={idx} className="relative group bg-white border border-indigo-200 rounded-lg overflow-hidden">
                  {isImage ? (
                    <a href={att.url} target="_blank" rel="noreferrer" className="block">
                      <img src={att.url} alt={att.name} className="w-full h-24 object-cover"/>
                    </a>
                  ) : (
                    <a href={att.url} target="_blank" rel="noreferrer"
                      className="flex flex-col items-center justify-center h-24 text-indigo-700 hover:bg-indigo-50">
                      <FileText size={20}/>
                      <p className="text-[10px] mt-1 px-1 truncate w-full text-center">{att.name}</p>
                    </a>
                  )}
                  {!isSubmitted && (
                    <button type="button" onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XIcon size={11}/>
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500 px-2 py-1 truncate border-t border-indigo-100 bg-indigo-50/50">
                    {att.name}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {!isSubmitted && attachments.length < 10 && (
          <>
            <input ref={attachFileRef} type="file" multiple
              accept="image/*,.pdf,.doc,.docx" onChange={handleAttachUpload} className="hidden"/>
            <button type="button" onClick={() => attachFileRef.current?.click()} disabled={uploadingAttach}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border-2 border-dashed border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-60">
              {uploadingAttach
                ? <><Loader2 size={13} className="animate-spin"/> กำลังอัปโหลด...</>
                : <><ImageIcon size={13}/> {attachments.length > 0 ? "เพิ่มรูป/ไฟล์" : "แนบรูปหรือไฟล์หลักฐาน"}</>}
            </button>
          </>
        )}
      </div>

      {/* Grade Reference — ซ่อนใน money_only */}
      {!isMoneyOnly && (
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
      )}

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

      {/* Copy-from picker */}
      {showCopyPicker && (
        <CopyFromPicker
          mode="kpi"
          forEmployeeId={employeeId}
          forYear={year}
          forMonth={month}
          hasExistingData={items.some(i => (i.actual_score ?? 0) > 0 || (i.comment?.trim().length ?? 0) > 0) || items.length > DEFAULT_ITEMS.length}
          onApply={(newItems: CopyFromItem[], note: string | null) => {
            setItems(newItems.map(i => ({
              category: i.category, description: i.description,
              is_mandatory: i.is_mandatory, weight_pct: i.weight_pct,
              actual_score: 0, comment: i.comment ?? "",
            })))
            if (note !== null) setEvaluatorNote(note)
          }}
          onClose={() => setShowCopyPicker(false)}
        />
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
