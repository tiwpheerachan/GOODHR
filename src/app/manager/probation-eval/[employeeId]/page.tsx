"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  ChevronLeft, Plus, Trash2, Save, Send, Loader2, Shield, AlertCircle,
  CheckCircle2, MessageSquare, Clock, Sparkles, Paperclip, Image as ImageIcon,
  FileText, X as XIcon,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import CopyFromPicker, { CopyFromItem } from "@/components/manager/CopyFromPicker"

const ROUND_LABELS: Record<number, string> = { 1: "รอบที่ 1 (60 วัน)", 2: "รอบที่ 2 (90 วัน)", 3: "รอบที่ 3 (119 วัน)" }

function calcGrade(score: number) {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

const GRADE_CONFIG: Record<string, { bg: string; color: string; ring: string }> = {
  A: { bg: "bg-emerald-50", color: "text-emerald-600", ring: "ring-emerald-200" },
  B: { bg: "bg-blue-50", color: "text-blue-600", ring: "ring-blue-200" },
  C: { bg: "bg-amber-50", color: "text-amber-600", ring: "ring-amber-200" },
  D: { bg: "bg-red-50", color: "text-red-600", ring: "ring-red-200" },
}

type EvalRow = { category: string; description: string; is_mandatory: boolean; weight_pct: number; actual_score: number; comment: string }

const MANDATORY_ITEMS: EvalRow[] = [
  {
    category: "ความประพฤติ (พนักงาน)",
    description: "1. ไม่ขาดงาน/ลางาน/มาสาย\n2. ให้ความร่วมมือในกิจกรรมต่างๆที่บริษัทจัดขึ้น\n3. มีความประพฤติส่วนตัวที่เหมาะสม",
    is_mandatory: true, weight_pct: 20, actual_score: 0, comment: "",
  },
  {
    category: "ความประพฤติ (หัวหน้างาน)",
    description: "4. ประพฤติตนตามระเบียบวินัย และคำสั่งของผู้บังคับบัญชา\n5. ไม่มีพฤติกรรมสร้างความแตกแยกในองค์กร\n6. ซื่อสัตย์สุจริตต่อหน้าที่ และรักษาผลประโยชน์ของบริษัท\n7. ไม่ทำให้บริษัทเสียหาย และหรือเสื่อมเสียชื่อเสียง",
    is_mandatory: true, weight_pct: 20, actual_score: 0, comment: "",
  },
]

const inp = "bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all disabled:bg-slate-50 disabled:text-slate-400"

export default function ProbationEvalFormPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const employeeId = params.employeeId as string
  const round = Number(searchParams.get("round")) || 1

  const [employee, setEmployee] = useState<any>(null)
  const [items, setItems] = useState<EvalRow[]>([...MANDATORY_ITEMS])
  const [evaluatorNote, setEvaluatorNote] = useState("")
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size?: number }>>([])
  const [uploadingAttach, setUploadingAttach] = useState(false)
  const attachFileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [existingFormId, setExistingFormId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ grade: string; score: number } | null>(null)
  const [rejectionNote, setRejectionNote] = useState("")
  const [expandedComment, setExpandedComment] = useState<number | null>(null)
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!user?.employee_id) return

    const load = async () => {
      try {
        const res = await fetch("/api/probation-evaluation?mode=manager")
        const data = await res.json()
        const emp = (data.members ?? []).find((m: any) => m.id === employeeId)
        if (emp && mountedRef.current) setEmployee(emp)

        const form = (data.forms ?? []).find((f: any) => f.employee_id === employeeId && f.round === round)
        if (form) {
          setExistingFormId(form.id)
          if (form.status === "submitted" || form.status === "approved") setIsSubmitted(true)
          if (form.rejection_note && mountedRef.current) setRejectionNote(form.rejection_note)

          const fRes = await fetch(`/api/probation-evaluation?mode=single&form_id=${form.id}`)
          const fData = await fRes.json()
          if (fData.form?.items?.length > 0 && mountedRef.current) {
            const sorted = fData.form.items.sort((a: any, b: any) => a.order_no - b.order_no)
            setItems(sorted.map((it: any) => ({
              category: it.category, description: it.description || "",
              is_mandatory: it.is_mandatory, weight_pct: it.weight_pct,
              actual_score: it.actual_score, comment: it.comment || "",
            })))
            setEvaluatorNote(fData.form.evaluator_note || "")
            if (Array.isArray(fData.form.attachments)) setAttachments(fData.form.attachments)
          }
        }
      } catch (e) { console.error("Load error:", e) }
      finally { if (mountedRef.current) setLoading(false) }
    }
    load()
    return () => { mountedRef.current = false }
  }, [user?.employee_id, employeeId, round])

  const totalWeight = items.reduce((s, i) => s + (Number(i.weight_pct) || 0), 0)
  const weightValid = Math.abs(totalWeight - 100) < 0.01
  const totalScore = items.reduce((s, i) => {
    const w = Number(i.weight_pct) || 0
    const a = Number(i.actual_score) || 0
    return s + Math.round((w * a / 100) * 100) / 100
  }, 0)
  const grade = calcGrade(totalScore)
  const gradeConf = GRADE_CONFIG[grade]

  const updateItem = useCallback((idx: number, field: keyof EvalRow, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }, [])

  // ── Attachments upload (reuse /api/leave/upload — generic image/file uploader) ──
  const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (attachments.length + files.length > 10) {
      toast.error("แนบได้สูงสุด 10 ไฟล์")
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

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const addItem = () => {
    if (items.length >= 7) { toast.error(t("probation.max_items_error")); return }
    setItems(prev => [...prev, { category: "", description: "", is_mandatory: false, weight_pct: 0, actual_score: 0, comment: "" }])
  }

  const removeItem = (idx: number) => {
    if (items[idx].is_mandatory) { toast.error(t("probation.cannot_delete_mandatory")); return }
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async (action: "save_draft" | "submit") => {
    if (action === "submit") {
      if (!weightValid) { toast.error(t("probation.weight_error")); return }
      // อนุญาตให้กรอก 0 ได้ (กรณีหัวหน้าให้คะแนนต่ำสุด) — เช็คเฉพาะ null/undefined + เกินช่วง
      const missing = items.some(i => i.actual_score == null || i.actual_score < 0 || i.actual_score > 100)
      if (missing) { toast.error(t("probation.score_error")); return }
      setShowConfirm(true)
      return
    }
    await doSave(action)
  }

  const doSave = async (action: "save_draft" | "submit") => {
    setSaving(true)
    setShowConfirm(false)
    try {
      const res = await fetch("/api/probation-evaluation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, round, items, evaluator_note: evaluatorNote, attachments, action }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      if (action === "submit") {
        setSubmitResult({ grade: data.grade, score: data.total_score })
        setShowSuccess(true)
        setIsSubmitted(true)
      } else {
        toast.success(t("probation.draft_saved"))
        if (data.form_id) setExistingFormId(data.form_id)
      }
    } catch { toast.error(t("common.error")) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="p-4 pb-36 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/manager/probation-eval" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <ChevronLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-slate-800">{t("probation.title")}</h1>
          <p className="text-xs text-slate-400">{ROUND_LABELS[round]}</p>
        </div>
      </div>

      {/* Employee Card */}
      {employee && (
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
            {employee.avatar_url
              ? <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-rose-600 text-lg font-bold">{employee.first_name_th?.[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800">{empName(employee)}</p>
            <p className="text-xs text-slate-400">{employee.position?.name} · {employee.department?.name}</p>
          </div>
        </div>
      )}

      {/* Live Score */}
      <div className={`card flex items-center justify-between ${gradeConf.bg} ring-1 ${gradeConf.ring}`}>
        <div>
          <p className="text-xs text-slate-500">{t("probation.total_score")}</p>
          <p className="text-2xl font-black text-slate-800">{totalScore.toFixed(1)}<span className="text-sm">/100</span></p>
        </div>
        <div className={`w-14 h-14 rounded-2xl ${gradeConf.bg} flex items-center justify-center`}>
          <span className={`text-3xl font-black ${gradeConf.color}`}>{grade}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{t("probation.weight_sum")}</p>
          <p className={`text-sm font-black ${weightValid ? "text-emerald-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
            {totalWeight}% / 100%
          </p>
        </div>
      </div>

      {/* Status banners */}
      {isSubmitted && (
        <div className="flex items-center justify-between bg-orange-50 text-orange-700 text-sm font-bold px-4 py-3 rounded-2xl ring-1 ring-orange-200">
          <div className="flex items-center gap-2">
            <Clock size={16} /> ฟอร์มนี้ถูกส่งแล้ว
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
            <AlertCircle size={16} /> HR ส่งคืน — กรุณาแก้ไขและส่งใหม่
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
          เริ่มจากแม่แบบ — คัดลอกจากการประเมินที่ผ่านมา
        </button>
      )}

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const weighted = Math.round(((Number(item.weight_pct) || 0) * (Number(item.actual_score) || 0) / 100) * 100) / 100
          return (
            <div key={idx} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 text-xs font-black flex items-center justify-center">{idx + 1}</span>
                  {/* Badge "บังคับ" — คลิกเพื่อยกเลิก (เปลี่ยนเป็นข้อ optional ที่ลบได้) */}
                  {item.is_mandatory ? (
                    <button type="button"
                      disabled={isSubmitted}
                      onClick={() => updateItem(idx, "is_mandatory", false)}
                      title="คลิกเพื่อยกเลิก 'บังคับ' (ทำให้ลบ/แก้ข้อนี้ได้)"
                      className="group flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {t("probation.mandatory_badge")}
                      {!isSubmitted && <XIcon size={9} className="opacity-60 group-hover:opacity-100" />}
                    </button>
                  ) : (
                    !isSubmitted && (
                      <button type="button"
                        onClick={() => updateItem(idx, "is_mandatory", true)}
                        title="คลิกเพื่อตั้งเป็น 'บังคับ' (ห้ามลบ)"
                        className="text-[9px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-dashed border-slate-200 hover:border-rose-200 px-1.5 py-0.5 rounded transition-colors">
                        + บังคับ
                      </button>
                    )
                  )}
                </div>
                {!item.is_mandatory && !isSubmitted && (
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                )}
              </div>

              <input value={item.category} onChange={e => updateItem(idx, "category", e.target.value)}
                disabled={isSubmitted} placeholder="ชื่อหมวดหมู่"
                className={`${inp} w-full font-bold`} />

              {/* รายละเอียด/เกณฑ์ — แก้ได้ (auto-resize ตามจำนวนบรรทัด) */}
              <div>
                <p className="text-[10px] text-slate-400 mb-1">รายละเอียด / เกณฑ์ประเมิน</p>
                <textarea
                  value={item.description || ""}
                  onChange={e => updateItem(idx, "description", e.target.value)}
                  disabled={isSubmitted}
                  placeholder="ระบุเกณฑ์หรือรายละเอียดที่จะประเมิน (1. ... 2. ... หรือ A) ... B) ...)"
                  rows={Math.max(3, Math.min(16, (item.description || "").split("\n").length + 1))}
                  className={`${inp} w-full text-xs leading-relaxed text-slate-700 whitespace-pre-line resize-y`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">น้ำหนัก (%)</p>
                  <input type="number" min={0} max={100}
                    value={item.weight_pct == null ? "" : item.weight_pct}
                    onChange={e => {
                      if (e.target.value === "") { updateItem(idx, "weight_pct", null as any); return }
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) updateItem(idx, "weight_pct", v)
                    }}
                    disabled={isSubmitted} className={`${inp} w-full text-center`} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">คะแนน (0-100)</p>
                  <input type="number" min={0} max={100}
                    value={item.actual_score == null ? "" : item.actual_score}
                    onChange={e => {
                      if (e.target.value === "") { updateItem(idx, "actual_score", null as any); return }
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) updateItem(idx, "actual_score", v)
                    }}
                    disabled={isSubmitted} className={`${inp} w-full text-center`} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">ถ่วงน้ำหนัก</p>
                  <div className="bg-rose-50 text-rose-600 font-bold text-sm rounded-xl px-3 py-2 text-center">
                    {weighted.toFixed(1)}
                  </div>
                </div>
              </div>

              <button onClick={() => setExpandedComment(expandedComment === idx ? null : idx)}
                className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600">
                <MessageSquare size={11} /> ความเห็น
              </button>
              {expandedComment === idx && (
                <textarea value={item.comment} onChange={e => updateItem(idx, "comment", e.target.value)}
                  disabled={isSubmitted} placeholder="ความเห็นเพิ่มเติม..."
                  className={`${inp} w-full`} rows={2} />
              )}
            </div>
          )
        })}
      </div>

      {!isSubmitted && items.length < 7 && (
        <button onClick={addItem} className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 flex items-center justify-center gap-2 hover:border-rose-300 hover:text-rose-500">
          <Plus size={16} /> {t("probation.add_item")}
        </button>
      )}

      {/* Evaluator Note */}
      <div className="card">
        <p className="text-xs font-bold text-slate-500 mb-2">ความเห็นภาพรวม</p>
        <textarea value={evaluatorNote} onChange={e => setEvaluatorNote(e.target.value)}
          disabled={isSubmitted} placeholder="ความเห็นเพิ่มเติม..."
          className={`${inp} w-full`} rows={3} />
      </div>

      {/* ── Attachments (ภาพ/หลักฐานประกอบ) — เห็นได้ทั้งหัวหน้าและพนักงาน ── */}
      <div className="card">
        <div className="flex items-center gap-1.5 mb-2">
          <Paperclip size={12} className="text-rose-600" />
          <p className="text-xs font-bold text-slate-700">หลักฐาน/รูปประกอบการประเมิน</p>
          <span className="text-[10px] font-normal text-slate-400">(พนักงานจะเห็น · สูงสุด 10 ไฟล์ · ไฟล์ละ ≤ 10 MB)</span>
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            {attachments.map((att, idx) => {
              const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(att.name)
              return (
                <div key={idx} className="relative group bg-white border border-rose-200 rounded-lg overflow-hidden">
                  {isImage ? (
                    <a href={att.url} target="_blank" rel="noreferrer" className="block">
                      <img src={att.url} alt={att.name} className="w-full h-24 object-cover"/>
                    </a>
                  ) : (
                    <a href={att.url} target="_blank" rel="noreferrer"
                      className="flex flex-col items-center justify-center h-24 text-rose-700 hover:bg-rose-50">
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
                  <p className="text-[10px] text-slate-500 px-2 py-1 truncate border-t border-rose-100 bg-rose-50/50">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border-2 border-dashed border-rose-300 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-400 transition-colors disabled:opacity-60">
              {uploadingAttach
                ? <><Loader2 size={13} className="animate-spin"/> กำลังอัปโหลด...</>
                : <><ImageIcon size={13}/> {attachments.length > 0 ? "เพิ่มรูป/ไฟล์" : "แนบรูปหรือไฟล์หลักฐาน"}</>}
            </button>
          </>
        )}
      </div>

      {/* Grade reference */}
      <div className="card">
        <p className="text-xs font-bold text-slate-500 mb-2">เกณฑ์เกรด</p>
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
          {[
            { g: "A", range: "91-100%", ...GRADE_CONFIG.A },
            { g: "B", range: "81-90%", ...GRADE_CONFIG.B },
            { g: "C", range: "71-80%", ...GRADE_CONFIG.C },
            { g: "D", range: "0-70%", ...GRADE_CONFIG.D },
          ].map(x => (
            <div key={x.g} className={`${x.bg} ${x.color} rounded-xl py-2`}>
              <p className="text-lg font-black">{x.g}</p>
              <p className="text-[10px]">{x.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons — อยู่เหนือ bottom nav */}
      {!isSubmitted && (
        <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-slate-100 px-4 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex gap-3">
            <button onClick={() => handleSave("save_draft")} disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.97] transition-all disabled:opacity-50">
              <Save size={15} /> {t("probation.save_draft")}
            </button>
            <button onClick={() => handleSave("submit")} disabled={saving || !weightValid}
              className="flex-[1.5] py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-700 active:scale-[0.97] transition-all shadow-lg shadow-rose-200 disabled:opacity-50">
              <Send size={15} /> {saving ? t("common.sending") : t("probation.submit")}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden">
            <div className={`${gradeConf.bg} px-6 py-5 text-center`}>
              <p className={`text-4xl font-black ${gradeConf.color}`}>{grade}</p>
              <p className="text-sm text-slate-600 mt-1">{totalScore.toFixed(1)}%</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <h3 className="text-lg font-black text-slate-800 text-center">{t("probation.confirm_title")}</h3>
              <p className="text-sm text-slate-500 text-center">
                {empName(employee)} · {ROUND_LABELS[round]}
              </p>
              <p className="text-[11px] text-amber-600 text-center">{t("probation.confirm_desc")}</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 font-bold text-sm">{t("common.cancel")}</button>
              <button onClick={() => doSave("submit")} disabled={saving}
                className="flex-[1.5] py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm disabled:opacity-50">
                {saving ? t("common.sending") : t("probation.confirm_submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy-from picker */}
      {showCopyPicker && (
        <CopyFromPicker
          mode="probation"
          forEmployeeId={employeeId}
          forRound={round}
          hasExistingData={items.some(i => (i.actual_score ?? 0) > 0 || (i.comment?.trim().length ?? 0) > 0) || items.length > MANDATORY_ITEMS.length}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
            <div className="bg-emerald-50 px-6 py-5 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-lg font-black text-slate-800">{t("probation.success_title")}</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{t("probation.total_score")}</p>
                  <p className="text-3xl font-black text-slate-800">{submitResult.score.toFixed(1)}%</p>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{t("probation.grade")}</p>
                  <div className={`w-12 h-12 rounded-xl ${GRADE_CONFIG[submitResult.grade]?.bg} flex items-center justify-center`}>
                    <span className={`text-2xl font-black ${GRADE_CONFIG[submitResult.grade]?.color}`}>{submitResult.grade}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-blue-700">{t("probation.success_sent_to_hr")}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">{t("probation.success_when_approved")}</p>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => { setShowSuccess(false); router.push("/manager/probation-eval") }}
                className="w-full py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm">{t("probation.back_to_list")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
