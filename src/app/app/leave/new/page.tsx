"use client"
import { useState, Suspense, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveTypes } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Loader2, CalendarClock, FileEdit, Timer, Send, AlertCircle,
  UserX, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Info,
  FileText, AlertTriangle, ClipboardList, PackageCheck,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// ── Resignation constants ──
const RESIGN_REASONS = [
  { key: "heavy_work",  label: "งานหนัก / พนักงานในทีมน้อย" },
  { key: "boss",        label: "มีปัญหากับหัวหน้า / ผู้บังคับบัญชา" },
  { key: "low_salary",  label: "เงินเดือนน้อย ไม่เพียงพอต่อค่าครองชีพ" },
  { key: "study",       label: "ศึกษาต่อ" },
  { key: "own_biz",     label: "ประกอบธุรกิจส่วนตัว" },
  { key: "family",      label: "มีปัญหาครอบครัว" },
  { key: "health",      label: "มีปัญหาด้านสุขภาพ" },
  { key: "new_job",     label: "ได้งานใหม่" },
  { key: "mismatch",    label: "ไม่เหมาะสมกับตำแหน่งงาน" },
  { key: "no_prob",     label: "ไม่ผ่านทดลองงาน" },
  { key: "other",       label: "อื่นๆ (ระบุ)" },
]

const EXIT_Q = [
  { k: "q1", q: "สถานที่การทำงานของบริษัทฯ",          opts: ["ดีเยี่ยม","ดี","ปานกลาง","น้อยที่สุด"], multi: false },
  { k: "q2", q: "สาเหตุที่ท้อแท้ ไม่อยากทำงานต่อ",    opts: ["ปริมาณงานเยอะ","เงินเดือน","การบริหาร/ระบบ","ผู้บังคับบัญชา","เพื่อนร่วมงาน","งานที่รับผิดชอบ","ไม่มีอำนาจตัดสินใจ","ไม่มีโอกาสเลื่อนตำแหน่ง","อื่นๆ"], multi: true },
  { k: "q3", q: "เหตุผลหลักที่ทำให้ลาออก",             opts: ["โอกาสที่ดีกว่า","โอกาสเลื่อนตำแหน่งน้อย","เงินเดือนมากกว่า","ผลตอบแทนดีกว่า","สวัสดิการดีกว่า","ทิศทางนโยบายบริษัท","ระยะทางเดินทาง","อื่นๆ"], multi: true },
  { k: "q4", q: "การเป็นผู้นำของหัวหน้างาน",           opts: ["ดีเยี่ยม","ดี","ปานกลาง","แย่","ไม่มีความคิดเห็น"], multi: false },
  { k: "q5", q: "ความคิดเห็นต่อหัวหน้างาน",            opts: ["ดีเยี่ยม","ดี","ปานกลาง","แย่"], multi: false },
  { k: "q6", q: "ผลตอบแทนแข่งกับบริษัทอื่นได้หรือไม่", opts: ["ได้","ไม่ได้"], multi: false },
  { k: "q7", q: "สวัสดิการที่ได้รับ",                  opts: ["ดีเยี่ยม","ดี","ปานกลาง","แย่"], multi: false },
  { k: "q8", q: "ปริมาณงานที่ได้รับมอบหมาย",           opts: ["มากเกินไป","เหมาะสม","น้อยเกินไป"], multi: false },
]

const ASSETS = [
  { k: "computer", l: "คอมพิวเตอร์" },
  { k: "phone",    l: "โทรศัพท์" },
  { k: "id_card",  l: "บัตรพนักงาน" },
  { k: "parking",  l: "บัตรที่จอดรถ" },
  { k: "uniform",  l: "ยูนิฟอร์ม" },
  { k: "other",    l: "อื่นๆ" },
]

const RESIGN_STEPS = [
  { id: 1, label: "วันที่",      icon: FileText },
  { id: 2, label: "เหตุผล",     icon: AlertTriangle },
  { id: 3, label: "แบบสอบถาม", icon: ClipboardList },
  { id: 4, label: "ทรัพย์สิน", icon: PackageCheck },
]

// ── Shared components ──
function ResignCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors" onClick={onChange}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-blue-400"}`}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-700 leading-snug">{label}</span>
    </label>
  )
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/60">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function LeaveNewInner() {
  const { user }    = useAuth()
  const router      = useRouter()
  const sp          = useSearchParams()
  const formType    = sp.get("type") || "leave"
  const defaultDate = sp.get("date") || format(new Date(), "yyyy-MM-dd")
  const supabase    = useRef(createClient()).current

  const empId     = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const companyId = (user as any)?.company_id   ?? (user as any)?.employee?.company_id
  const emp       = (user as any)?.employee as any

  const { types, loading: typesLoading, loaded: typesLoaded } = useLeaveTypes(companyId)

  const [loading, setLoading] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    leave_type_id: "", start_date: defaultDate, end_date: defaultDate,
    is_half_day: false, half_day_period: "morning", reason: "",
    work_date: defaultDate, requested_clock_in: "", requested_clock_out: "",
    ot_start: "", ot_end: "",
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  // ── Resignation state ──
  const [resignStep, setResignStep] = useState(1)
  const [lastWorkDate, setLastWorkDate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [reasons, setReasons] = useState<string[]>([])
  const [otherReason, setOtherReason] = useState("")
  const [exitAnswers, setExitAnswers] = useState<Record<string, string | string[]>>({})
  const [suggestion, setSuggestion] = useState("")
  const [comment, setComment] = useState("")
  const [assets, setAssets] = useState<Record<string, boolean>>({})
  const [assetNotes, setAssetNotes] = useState<Record<string, string>>({})
  const [deductAmount, setDeductAmount] = useState("")

  const toggleReason = (k: string) => setReasons(r => r.includes(k) ? r.filter(x => x !== k) : [...r, k])
  const toggleAsset  = (k: string) => setAssets(a => ({ ...a, [k]: !a[k] }))
  const setExitAns   = (k: string, v: string, multi: boolean) => {
    if (!multi) { setExitAnswers(a => ({ ...a, [k]: v })); return }
    setExitAnswers(a => {
      const cur = (a[k] as string[]) || []
      return { ...a, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
    })
  }

  const canResignNext = () => {
    if (resignStep === 1) return !!lastWorkDate && !!effectiveDate
    if (resignStep === 2) return reasons.length > 0
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitErr(null)
    if (!empId || !companyId) {
      setSubmitErr("ไม่พบข้อมูลพนักงาน กรุณาล็อกอินใหม่")
      return
    }
    setLoading(true)
    try {
      if (formType === "leave") {
        const days = form.is_half_day
          ? 0.5
          : Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1
        const { error } = await supabase.from("leave_requests").insert({
          employee_id: empId, company_id: companyId,
          leave_type_id: form.leave_type_id,
          start_date: form.start_date, end_date: form.end_date,
          total_days: days, is_half_day: form.is_half_day,
          half_day_period: form.is_half_day ? form.half_day_period : null,
          reason: form.reason, status: "pending",
        })
        if (error) throw error
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)

      } else if (formType === "adjustment") {
        const { error } = await supabase.from("time_adjustment_requests").insert({
          employee_id: empId, company_id: companyId,
          work_date: form.work_date, request_type: "time_adjustment",
          requested_clock_in:  form.requested_clock_in  ? `${form.work_date}T${form.requested_clock_in}:00+07:00`  : null,
          requested_clock_out: form.requested_clock_out ? `${form.work_date}T${form.requested_clock_out}:00+07:00` : null,
          reason: form.reason, status: "pending",
        })
        if (error) throw error
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)

      } else if (formType === "overtime") {
        if (!form.ot_start || !form.ot_end) throw new Error("กรุณากรอกเวลาเริ่ม-สิ้นสุด OT")
        const { error } = await supabase.from("overtime_requests").insert({
          employee_id: empId, company_id: companyId,
          work_date: form.work_date,
          ot_start: `${form.work_date}T${form.ot_start}:00+07:00`,
          ot_end:   `${form.work_date}T${form.ot_end}:00+07:00`,
          reason: form.reason, status: "pending", ot_rate: 1.5,
        })
        if (error) throw error
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)
      }
    } catch (err: any) {
      setSubmitErr(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  const handleResignSubmit = async () => {
    if (!empId) return
    setLoading(true)
    setSubmitErr(null)
    try {
      const { error } = await supabase.from("resignation_requests").insert({
        employee_id:    empId,
        company_id:     companyId,
        last_work_date: lastWorkDate,
        effective_date: effectiveDate,
        reasons,
        other_reason:   otherReason || null,
        exit_interview: { ...exitAnswers, suggestion, comment },
        assets:         { items: assets, notes: assetNotes, deduct_amount: deductAmount || 0 },
        status:         "pending_manager",
        manager_id:     emp?.manager_id ?? null,
      })
      if (error) throw error
      if (emp?.manager_id) {
        await supabase.from("notifications").insert({
          employee_id: emp.manager_id,
          type:        "resignation",
          title:       `${emp.first_name_th} ${emp.last_name_th} ยื่นใบลาออก`,
          body:        `วันสุดท้าย ${format(new Date(lastWorkDate), "d MMM yyyy", { locale: th })}`,
        }).then(() => {})
      }
      setSuccess(true)
      setTimeout(() => router.push("/app/leave"), 1200)
    } catch (err: any) {
      setSubmitErr(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
  const labelCls = "block text-sm font-black text-slate-700 mb-2"

  const TITLES: Record<string, string> = {
    leave: "ยื่นใบลา", adjustment: "แก้ไขเวลาเข้า-ออก",
    overtime: "ขอทำ OT", resignation: "ยื่นใบลาออก",
  }
  const TYPE_ICONS: Record<string, { gradient: string; icon: React.ReactNode }> = {
    leave:       { gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", icon: <CalendarClock size={15} className="text-white" /> },
    adjustment:  { gradient: "linear-gradient(135deg,#8b5cf6,#a855f7)", icon: <FileEdit size={15} className="text-white" /> },
    overtime:    { gradient: "linear-gradient(135deg,#f59e0b,#f97316)", icon: <Timer size={15} className="text-white" /> },
    resignation: { gradient: "linear-gradient(135deg,#ef4444,#f43f5e)", icon: <UserX size={15} className="text-white" /> },
  }

  const today = format(new Date(), "yyyy-MM-dd")

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes successPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        .form-card { transition: transform .15s ease }
        .form-card:active { transform: scale(0.99) }
      `}</style>

      {/* Success overlay */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(8px)" }}>
          <div className="text-center" style={{ animation: "successPop .4s cubic-bezier(.22,1,.36,1)" }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: formType === "resignation" ? "linear-gradient(135deg,#ef4444,#f43f5e)" : "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: formType === "resignation" ? "0 8px 30px rgba(239,68,68,.4)" : "0 8px 30px rgba(16,185,129,.4)" }}>
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <p className="text-white font-black text-lg">{formType === "resignation" ? "ยื่นใบลาออกสำเร็จ!" : "ส่งคำร้องสำเร็จ!"}</p>
            <p className="text-white/60 text-sm mt-1">กำลังกลับไปหน้าคำขอ...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen pb-12" style={{ background: "linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)" }}>

        {/* Header */}
        <div className="relative overflow-hidden" style={{
          background: formType === "resignation"
            ? "linear-gradient(135deg,#ef4444 0%,#f43f5e 50%,#e11d48 100%)"
            : "linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)",
        }}>
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.06)" }} />

          <div className="relative z-10 px-5 pt-6 pb-16">
            <div className="flex items-center gap-3">
              <Link href="/app/leave"
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 transition-colors backdrop-blur-sm">
                <ArrowLeft size={17} className="text-white" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={11} className="text-blue-200" />
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">New Request</p>
                </div>
                <h1 className="text-white font-black text-lg tracking-tight">{TITLES[formType]}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-10 space-y-3 relative z-10">

          {/* Type switcher — 4 tabs including ลาออก */}
          <div className="bg-white rounded-2xl shadow-lg p-1.5 flex border border-slate-100/80"
            style={{ boxShadow: "0 4px 20px rgba(99,102,241,.12)" }}>
            {[
              { k: "leave",       l: "ใบลา",    icon: <CalendarClock size={11} /> },
              { k: "adjustment",  l: "แก้เวลา", icon: <FileEdit size={11} />      },
              { k: "overtime",    l: "OT",      icon: <Timer size={11} />          },
              { k: "resignation", l: "ลาออก",   icon: <UserX size={11} />          },
            ].map(({ k, l, icon }) => (
              <Link key={k} href={`/app/leave/new?type=${k}`}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-black rounded-xl transition-all`}
                style={formType === k ? {
                  background: TYPE_ICONS[k].gradient,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(99,102,241,.2)",
                } : {
                  color: "#94a3b8",
                }}>
                {icon}{l}
              </Link>
            ))}
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* Resignation form (multi-step inline) */}
          {/* ═══════════════════════════════════════ */}
          {formType === "resignation" && (
            <div className="space-y-3">

              {/* Step indicator */}
              <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4">
                <div className="flex items-center gap-1.5">
                  {RESIGN_STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5 flex-1">
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-center gap-1">
                          {i > 0 && (
                            <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${resignStep >= s.id ? "bg-red-400" : "bg-slate-200"}`} />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            resignStep > s.id  ? "bg-red-500" :
                            resignStep === s.id ? "bg-red-500 ring-4 ring-red-100" :
                            "bg-slate-200"
                          }`}>
                            {resignStep > s.id
                              ? <CheckCircle2 size={13} className="text-white" />
                              : <s.icon size={11} className={resignStep === s.id ? "text-white" : "text-slate-400"} />
                            }
                          </div>
                          {i < RESIGN_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${resignStep > s.id ? "bg-red-400" : "bg-slate-200"}`} />
                          )}
                        </div>
                        <span className={`text-[9px] font-bold whitespace-nowrap transition-colors ${resignStep === s.id ? "text-red-500" : resignStep > s.id ? "text-slate-500" : "text-slate-300"}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {submitErr && (
                <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                  style={{ background: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "1px solid #fecaca" }}>
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-semibold">{submitErr}</p>
                </div>
              )}

              {/* STEP 1: วันที่ */}
              {resignStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 leading-relaxed">การยื่นใบลาออกจะแจ้งหัวหน้าทีมของคุณทันที และต้องรอการอนุมัติ 2 ขั้นตอน</p>
                  </div>

                  {/* Employee info */}
                  {emp && (
                    <SectionCard>
                      <SectionHeader label="ข้อมูลพนักงาน" />
                      <div className="px-5 py-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-base shrink-0 overflow-hidden">
                          {emp?.avatar_url
                            ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                            : emp?.first_name_th?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{emp.first_name_th} {emp.last_name_th}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{emp.position?.name}{emp.department?.name ? ` · ${emp.department.name}` : ""}</p>
                          <p className="text-xs text-slate-400">
                            รหัส {emp.employee_code}{emp.hire_date ? ` · เริ่มงาน ${format(new Date(emp.hire_date + "T00:00:00"), "d MMM yyyy", { locale: th })}` : ""}
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  <SectionCard>
                    <SectionHeader label="กำหนดวันที่" />
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          วันทำงานวันสุดท้าย <span className="text-rose-500">*</span>
                        </label>
                        <input type="date" value={lastWorkDate} min={today}
                          onChange={e => { setLastWorkDate(e.target.value); if (!effectiveDate) setEffectiveDate(e.target.value) }}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          วันที่มีผลบังคับ <span className="text-rose-500">*</span>
                        </label>
                        <input type="date" value={effectiveDate} min={lastWorkDate || today}
                          onChange={e => setEffectiveDate(e.target.value)}
                          className={inputCls} />
                        <p className="text-[10px] text-slate-400 mt-1.5">ควรแจ้งล่วงหน้าอย่างน้อย 30 วัน</p>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* STEP 2: เหตุผล */}
              {resignStep === 2 && (
                <SectionCard>
                  <SectionHeader label="เหตุผลการลาออก · เลือกได้มากกว่า 1 ข้อ" />
                  <div className="px-2 py-3 space-y-0.5">
                    {RESIGN_REASONS.map(r => (
                      <ResignCheckbox key={r.key}
                        checked={reasons.includes(r.key)}
                        onChange={() => toggleReason(r.key)}
                        label={r.label} />
                    ))}
                  </div>
                  {reasons.includes("other") && (
                    <div className="px-5 pb-4">
                      <textarea value={otherReason} onChange={e => setOtherReason(e.target.value)}
                        placeholder="ระบุเหตุผลเพิ่มเติม…"
                        className={inputCls + " resize-none h-20"} />
                    </div>
                  )}
                </SectionCard>
              )}

              {/* STEP 3: Exit Interview */}
              {resignStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Info size={12} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-400">คำตอบจะไม่ถูกเปิดเผย ใช้เพื่อพัฒนาองค์กรเท่านั้น</p>
                  </div>
                  {EXIT_Q.map((q, qi) => (
                    <SectionCard key={q.k}>
                      <div className="px-5 py-3 border-b border-slate-50">
                        <p className="text-sm font-bold text-slate-800">{qi + 1}. {q.q}</p>
                        {q.multi && <p className="text-[10px] text-blue-500 font-semibold mt-0.5">เลือกได้มากกว่า 1 ข้อ</p>}
                      </div>
                      <div className="px-2 py-2 space-y-0.5">
                        {q.opts.map(o => {
                          const ans = exitAnswers[q.k]
                          const checked = q.multi ? ((ans as string[]) || []).includes(o) : ans === o
                          return <ResignCheckbox key={o} checked={checked} onChange={() => setExitAns(q.k, o, q.multi)} label={o} />
                        })}
                      </div>
                    </SectionCard>
                  ))}
                  <SectionCard>
                    <SectionHeader label="ความคิดเห็นเพิ่มเติม" />
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">คำแนะนำสำหรับทีม</label>
                        <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)}
                          placeholder="คุณมีคำแนะนำอะไรสำหรับทีมหรือแผนกบ้าง…"
                          className={inputCls + " resize-none h-20"} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">ข้อเสนอแนะต่อบริษัท</label>
                        <textarea value={comment} onChange={e => setComment(e.target.value)}
                          placeholder="มีสิ่งที่อยากบอกบริษัทก่อนออกไหม…"
                          className={inputCls + " resize-none h-20"} />
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* STEP 4: ทรัพย์สิน */}
              {resignStep === 4 && (
                <div className="space-y-3">
                  <SectionCard>
                    <SectionHeader label="ทรัพย์สินที่ต้องส่งคืน" />
                    <div className="px-2 py-2 divide-y divide-slate-50">
                      {ASSETS.map(a => (
                        <div key={a.k} className="py-1">
                          <ResignCheckbox checked={!!assets[a.k]} onChange={() => toggleAsset(a.k)} label={a.l} />
                          {assets[a.k] && (
                            <div className="ml-11 mt-1 mb-1">
                              <input value={assetNotes[a.k] || ""}
                                onChange={e => setAssetNotes(n => ({ ...n, [a.k]: e.target.value }))}
                                placeholder="หมายเหตุ เช่น S/N, สภาพ"
                                className={inputCls + " text-xs py-2"} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <SectionHeader label="เงินชดใช้ (ถ้ามี)" />
                    <div className="px-5 py-4">
                      <div className="relative">
                        <input type="number" value={deductAmount} onChange={e => setDeductAmount(e.target.value)}
                          placeholder="0" className={inputCls} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">บาท</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">เช่น ค่าอุปกรณ์ชำรุด, เงินยืมทดลองจ่าย</p>
                    </div>
                  </SectionCard>

                  {/* Summary */}
                  <SectionCard>
                    <SectionHeader label="สรุปใบลาออก" />
                    <div className="px-5 py-4 space-y-2.5 text-sm">
                      {emp && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0 overflow-hidden text-xs">
                            {emp?.avatar_url
                              ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                              : emp?.first_name_th?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{emp.first_name_th} {emp.last_name_th}</p>
                            <p className="text-xs text-slate-400">{emp.position?.name}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400 mb-0.5">วันสุดท้าย</p>
                          <p className="font-bold text-slate-900 text-xs">
                            {lastWorkDate ? format(new Date(lastWorkDate + "T00:00:00"), "d MMM yyyy", { locale: th }) : "-"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400 mb-0.5">มีผลบังคับ</p>
                          <p className="font-bold text-slate-900 text-xs">
                            {effectiveDate ? format(new Date(effectiveDate + "T00:00:00"), "d MMM yyyy", { locale: th }) : "-"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400 mb-0.5">เหตุผล</p>
                          <p className="font-bold text-slate-900 text-xs">{reasons.length} ข้อ</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400 mb-0.5">ส่งคืนทรัพย์สิน</p>
                          <p className="font-bold text-slate-900 text-xs">{Object.values(assets).filter(Boolean).length} รายการ</p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-2 pt-1">
                {resignStep > 1 && (
                  <button onClick={() => setResignStep(s => s - 1)}
                    className="flex items-center justify-center gap-1.5 px-5 py-3.5 border border-slate-200 bg-white text-slate-600 font-semibold text-sm rounded-2xl hover:bg-slate-50 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                )}
                {resignStep < 4 ? (
                  <button onClick={() => setResignStep(s => s + 1)} disabled={!canResignNext()}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    style={{ background: "linear-gradient(135deg,#ef4444,#f43f5e)", boxShadow: "0 4px 15px rgba(239,68,68,.25)" }}>
                    ถัดไป <ChevronRight size={15} />
                  </button>
                ) : (
                  <button onClick={handleResignSubmit} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
                    style={{ background: "linear-gradient(135deg,#ef4444,#e11d48)", boxShadow: "0 4px 15px rgba(239,68,68,.3)" }}>
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> กำลังส่ง…</>
                      : <><CheckCircle2 size={15} /> ยืนยันยื่นใบลาออก</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* Leave / Adjustment / OT form */}
          {/* ═══════════════════════════════════════ */}
          {formType !== "resignation" && (
            <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
              {/* Form header accent */}
              <div className="h-1" style={{ background: TYPE_ICONS[formType]?.gradient || "linear-gradient(135deg,#3b82f6,#6366f1)" }} />

              <div className="p-5">
                {submitErr && (
                  <div className="mb-4 rounded-2xl px-4 py-3 flex items-start gap-2.5"
                    style={{ background: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "1px solid #fecaca" }}>
                    <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600 font-semibold">{submitErr}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* ── ใบลา ─────────────────────────── */}
                  {formType === "leave" && <>
                    <div>
                      <label className={labelCls}>ประเภทการลา *</label>
                      <select value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)}
                        className={inputCls} required>
                        <option value="">— เลือกประเภทการลา —</option>
                        {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      {typesLoading && <p className="text-xs text-amber-500 mt-1.5 font-semibold">กำลังโหลดประเภทการลา...</p>}
                      {typesLoaded && types.length === 0 && <p className="text-xs text-red-500 mt-1.5 font-semibold">ไม่พบประเภทการลาสำหรับบริษัทของคุณ — กรุณาแจ้ง HR Admin ตั้งค่าระบบ</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>วันที่เริ่ม</label>
                        <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls} required /></div>
                      <div><label className={labelCls}>วันที่สิ้นสุด</label>
                        <input type="date" value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} className={inputCls} required /></div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <input type="checkbox" id="half" checked={form.is_half_day} onChange={e => set("is_half_day", e.target.checked)}
                        className="w-5 h-5 rounded-lg accent-blue-500" />
                      <label htmlFor="half" className="text-sm font-bold text-slate-700 flex-1">ลาครึ่งวัน</label>
                      {form.is_half_day && (
                        <select value={form.half_day_period} onChange={e => set("half_day_period", e.target.value)}
                          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-400 font-semibold">
                          <option value="morning">ช่วงเช้า</option>
                          <option value="afternoon">ช่วงบ่าย</option>
                        </select>
                      )}
                    </div>
                  </>}

                  {/* ── แก้ไขเวลา ──────────────────── */}
                  {formType === "adjustment" && <>
                    <div><label className={labelCls}>วันที่</label>
                      <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>เวลาเข้างาน</label>
                        <input type="time" value={form.requested_clock_in} onChange={e => set("requested_clock_in", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>เวลาออกงาน</label>
                        <input type="time" value={form.requested_clock_out} onChange={e => set("requested_clock_out", e.target.value)} className={inputCls} /></div>
                    </div>
                    <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                      style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1px solid #c7d2fe" }}>
                      <Sparkles size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-indigo-700 font-semibold">กรอกเฉพาะเวลาที่ต้องการแก้ไข ไม่จำเป็นต้องกรอกทั้งคู่</p>
                    </div>
                  </>}

                  {/* ── โอที ────────────────────────── */}
                  {formType === "overtime" && <>
                    <div><label className={labelCls}>วันที่</label>
                      <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>เวลาเริ่ม OT</label>
                        <input type="time" value={form.ot_start} onChange={e => set("ot_start", e.target.value)} className={inputCls} required /></div>
                      <div><label className={labelCls}>เวลาสิ้นสุด OT</label>
                        <input type="time" value={form.ot_end} onChange={e => set("ot_end", e.target.value)} className={inputCls} required /></div>
                    </div>
                    <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                      style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a" }}>
                      <Sparkles size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-semibold">OT rate เริ่มต้น 1.5× — HR จะตรวจสอบและอนุมัติ</p>
                    </div>
                  </>}

                  {/* เหตุผล */}
                  <div>
                    <label className={labelCls}>เหตุผล *</label>
                    <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
                      placeholder="ระบุเหตุผล..." className={`${inputCls} h-28 resize-none`} required />
                  </div>

                  <button type="submit" disabled={loading || !empId}
                    className="w-full py-3.5 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)",
                      boxShadow: "0 4px 15px rgba(99,102,241,.3)",
                    }}>
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                    {loading ? "กำลังส่ง..." : "ส่งคำร้อง"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function LeaveNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)" }}>
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    }>
      <LeaveNewInner />
    </Suspense>
  )
}
