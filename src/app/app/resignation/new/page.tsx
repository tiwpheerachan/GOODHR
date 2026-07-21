"use client"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  FileText, AlertTriangle, ClipboardList, PackageCheck, UserX, Calendar, Info, Clock, Send,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

// ── ส่วนที่ 2.1 สาเหตุหลักในการลาออก / Main Reasons for Leaving (เลือกได้มากกว่า 1) ──
const RESIGN_REASONS = [
  { key: "compensation", label: "ค่าตอบแทนและสวัสดิการไม่เพียงพอ / Compensation & Benefits" },
  { key: "career",       label: "โอกาสความก้าวหน้าในสายงานจำกัด / Limited Career Advancement" },
  { key: "better_offer", label: "ได้รับข้อเสนองานใหม่ที่ดีกว่า / Better Job Offer Received" },
  { key: "environment",  label: "สภาพแวดล้อมการทำงานไม่เหมาะสม / Unsuitable Work Environment" },
  { key: "manager",      label: "ความสัมพันธ์กับผู้บังคับบัญชา / Relationship with Direct Manager" },
  { key: "colleagues",   label: "ความสัมพันธ์กับเพื่อนร่วมงาน / Relationship with Colleagues" },
  { key: "work_life",    label: "ความสมดุลชีวิตและการทำงาน / Work-Life Balance" },
  { key: "relocation",   label: "ย้ายที่อยู่อาศัย / Relocation" },
  { key: "study",        label: "ต้องการศึกษาต่อ / Pursuing Further Education" },
  { key: "retirement",   label: "เกษียณอายุ / Retirement" },
  { key: "other",        label: "อื่นๆ โปรดระบุด้านล่าง / Other (please specify below)" },
]

// ── ส่วนที่ 3 ประเมินความพึงพอใจ / Satisfaction (ให้คะแนน 1-5) ──
const SAT_TOPICS = [
  { key: "compensation",  label: "ค่าตอบแทนและสวัสดิการ / Compensation & Benefits" },
  { key: "career",        label: "โอกาสความก้าวหน้าในสายงาน / Career Advancement" },
  { key: "work_life",     label: "ความสมดุลชีวิตและการทำงาน / Work-Life Balance" },
  { key: "environment",   label: "สภาพแวดล้อมและบรรยากาศการทำงาน / Work Environment" },
  { key: "management",    label: "การบริหารจัดการขององค์กร / Management" },
  { key: "manager",       label: "ความสัมพันธ์กับผู้บังคับบัญชา / Relationship with Manager" },
  { key: "colleagues",    label: "ความสัมพันธ์กับเพื่อนร่วมงาน / Relationship with Colleagues" },
  { key: "job_challenge", label: "ความท้าทายและความน่าสนใจของงาน / Job Challenge & Interest" },
  { key: "communication", label: "การสื่อสารภายในองค์กร / Internal Communication" },
  { key: "training",      label: "การพัฒนาทักษะและการฝึกอบรม / Training & Development" },
]
const SAT_SCALE = ["น้อยที่สุด", "น้อย", "ปานกลาง", "ดี", "ดีมาก"] // 1..5

const ASSETS = [
  { k: "computer", l: "คอมพิวเตอร์" },
  { k: "phone",    l: "โทรศัพท์" },
  { k: "id_card",  l: "บัตรพนักงาน" },
  { k: "parking",  l: "บัตรที่จอดรถ" },
  { k: "uniform",  l: "ยูนิฟอร์ม" },
  { k: "other",    l: "อื่นๆ" },
]

const STEPS = [
  { id: 1, label: "วันที่",      icon: FileText },
  { id: 2, label: "เหตุผล",     icon: AlertTriangle },
  { id: 3, label: "แบบสอบถาม", icon: ClipboardList },
  { id: 4, label: "ทรัพย์สิน", icon: PackageCheck },
]

// ── shared input style ──
const inputCls = "w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-400"

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors" onClick={onChange}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300 group-hover:border-blue-400"}`}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700 leading-snug">{label}</span>
    </label>
  )
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  )
}

export default function ResignationNewPage() {
  const { user } = useAuth()
  const router   = useRouter()
  const supabase = useRef(createClient()).current
  const emp      = user?.employee as any

  const [step,       setStep]       = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // ── Gate: ต้องขออนุญาต (คำขอลาออก) → HR เปิดสิทธิ์ ก่อนกรอกฟอร์ม ──
  const [gate, setGate] = useState<"loading" | "need_intent" | "pending_intent" | "form" | "done">("loading")
  const [intentRow, setIntentRow] = useState<any>(null)
  const [intentReason, setIntentReason] = useState("")
  const [intentSubmitting, setIntentSubmitting] = useState(false)

  useEffect(() => {
    if (!emp?.id) return
    supabase.from("resignation_requests").select("*")
      .eq("employee_id", emp.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        const st = data?.status
        if (!st || st === "rejected") setGate("need_intent")
        else if (st === "pending_intent") setGate("pending_intent")
        else if (st === "intent_approved") { setIntentRow(data); setGate("form") }
        else { setGate("done"); router.replace("/app/resignation") } // pending_manager / pending_hr / approved
      })
  }, [emp?.id]) // eslint-disable-line

  const submitIntent = async () => {
    if (!emp?.id) return
    setIntentSubmitting(true)
    try {
      const companyId = emp.company_id ?? (user as any)?.company_id
      const { error } = await supabase.from("resignation_requests").insert({
        employee_id: emp.id,
        company_id:  companyId,
        status:      "pending_intent",
        intent_reason: intentReason.trim() || null,
      })
      if (error) throw error
      // แจ้ง HR (best-effort — ถ้า RLS ไม่ให้อ่าน users ก็ข้าม, คำขอยังขึ้นในแท็บแอดมิน)
      try {
        const { data: hrUsers } = await supabase.from("users")
          .select("employee_id").eq("company_id", companyId).in("role", ["hr_admin", "super_admin"])
        for (const h of (hrUsers ?? [])) {
          if (h.employee_id) await supabase.from("notifications").insert({
            employee_id: h.employee_id, type: "resignation",
            title: `${emp.first_name_th} ${emp.last_name_th} ยื่นคำขอลาออก`,
            body:  "รอ HR เปิดสิทธิ์ให้ลาออก",
          })
        }
      } catch {}
      toast.success("ยื่นคำขอลาออกแล้ว — รอ HR อนุมัติ")
      setGate("pending_intent")
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    } finally {
      setIntentSubmitting(false)
    }
  }

  const today = format(new Date(), "yyyy-MM-dd")
  const [lastWorkDate,  setLastWorkDate]  = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [reasons,       setReasons]       = useState<string[]>([])   // 2.1
  const [otherReason,   setOtherReason]   = useState("")             // 2.1 other specify
  const [additionalDetails, setAdditionalDetails] = useState("")     // 2.2
  const [consulted,     setConsulted]     = useState<"" | "yes" | "no">("") // 2.3
  const [consultedDetail, setConsultedDetail] = useState("")
  const [ratings,       setRatings]       = useState<Record<string, number>>({}) // ส่วนที่ 3 (1-5)
  const [nps,           setNps]           = useState<number | null>(null)        // 3.11 (0-10)
  const [suggestion,    setSuggestion]    = useState("")
  const [comment,       setComment]       = useState("")
  const [assets,        setAssets]        = useState<Record<string, boolean>>({})
  const [assetNotes,    setAssetNotes]    = useState<Record<string, string>>({})
  const [deductAmount,  setDeductAmount]  = useState("")

  const toggleReason = (k: string) => setReasons(r => r.includes(k) ? r.filter(x => x !== k) : [...r, k])
  const toggleAsset  = (k: string) => setAssets(a => ({ ...a, [k]: !a[k] }))
  const setRating    = (k: string, v: number) => setRatings(a => ({ ...a, [k]: v }))

  const canNext = () => {
    if (step === 1) return !!lastWorkDate && !!effectiveDate
    if (step === 2) return reasons.length > 0
    return true
  }

  const submit = async () => {
    if (!emp?.id) return
    setSubmitting(true)
    try {
      // ต่อยอดจากแถวคำขอที่ HR เปิดสิทธิ์แล้ว (intent_approved) → กรอกฟอร์มเต็ม → รอหัวหน้าอนุมัติ
      if (!intentRow?.id) { toast.error("ไม่พบสิทธิ์การลาออก กรุณายื่นคำขอใหม่"); setSubmitting(false); return }
      // ── หา "หัวหน้าปัจจุบัน" จาก history ก่อน (fallback = supervisor_id) กันชี้หัวหน้าเก่า ──
      let currentManagerId: string | null = null
      {
        const { data: mh } = await supabase.from("employee_manager_history")
          .select("manager_id").eq("employee_id", emp.id).is("effective_to", null)
          .order("effective_from", { ascending: false }).limit(1).maybeSingle()
        currentManagerId = mh?.manager_id ?? emp.supervisor_id ?? emp.manager_id ?? null
      }
      const { error } = await supabase.from("resignation_requests").update({
        last_work_date: lastWorkDate,
        effective_date: effectiveDate,
        reasons,
        other_reason:   otherReason || null,
        exit_interview: {
          additional_details: additionalDetails || "",   // 2.2
          consulted,                                       // 2.3
          consulted_detail: consultedDetail || "",
          ratings,                                         // ส่วนที่ 3 (1-5)
          nps,                                             // 3.11 (0-10)
          suggestion, comment,
        },
        assets:         { items: assets, notes: assetNotes, deduct_amount: deductAmount || 0 },
        status:         "pending_manager",
        manager_id:     currentManagerId,
      }).eq("id", intentRow.id)
      if (error) throw error
      if (currentManagerId) {
        await supabase.from("notifications").insert({
          employee_id: currentManagerId,
          type:        "resignation",
          title:       `${emp.first_name_th} ${emp.last_name_th} ยื่นใบลาออก`,
          body:        `วันสุดท้าย ${format(new Date(lastWorkDate), "d MMM yyyy", { locale: th })}`,
        })
      }
      toast.success("ยื่นใบลาออกเรียบร้อยแล้ว")
      router.push("/app/resignation")
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  if (!emp || gate === "loading" || gate === "done") return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 size={18} className="animate-spin mr-2" /> กำลังโหลด…
    </div>
  )

  // ── ยังไม่ได้ยื่นคำขอ / เคยถูกปฏิเสธ → ให้ยื่น "คำขอลาออก" ก่อน ──
  if (gate === "need_intent") return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1"><h1 className="text-[15px] font-bold text-gray-900">ขออนุญาตลาออก</h1></div>
        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center"><UserX size={15} className="text-rose-500" /></div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">ก่อนกรอกใบลาออก ต้อง<strong>ยื่นคำขอให้ HR อนุมัติก่อน</strong> เมื่อ HR เปิดสิทธิ์แล้ว คุณจึงจะกรอกแบบฟอร์มลาออกได้</p>
        </div>
        <SectionCard>
          <SectionHeader label="เหตุผล (ไม่บังคับ)" />
          <div className="px-5 py-4">
            <textarea value={intentReason} onChange={e => setIntentReason(e.target.value)}
              placeholder="แจ้งเหตุผล/รายละเอียดให้ HR ทราบเบื้องต้น (ถ้ามี)…"
              className={inputCls + " resize-none h-24"} />
          </div>
        </SectionCard>
        <button onClick={submitIntent} disabled={intentSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-600 text-white font-bold text-sm rounded-2xl hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-rose-200">
          {intentSubmitting ? <><Loader2 size={15} className="animate-spin" /> กำลังส่ง…</> : <><Send size={15} /> ยื่นคำขอลาออก</>}
        </button>
      </div>
    </div>
  )

  // ── ยื่นคำขอแล้ว รอ HR เปิดสิทธิ์ ──
  if (gate === "pending_intent") return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.push("/app/resignation")} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1"><h1 className="text-[15px] font-bold text-gray-900">คำขอลาออก</h1></div>
      </div>
      <div className="px-4 pt-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Clock size={28} className="text-amber-500" />
        </div>
        <p className="font-bold text-gray-900">รอ HR อนุมัติคำขอลาออก</p>
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs">เมื่อ HR เปิดสิทธิ์ให้แล้ว คุณจะกลับมากรอกแบบฟอร์มลาออกได้ที่หน้านี้</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-gray-900 leading-tight">ใบลาออก</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">ขั้นตอนที่ {step} จาก {STEPS.length}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <UserX size={15} className="text-rose-500" />
          </div>
        </div>

        {/* Step bar */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-center gap-1">
                  {/* line before */}
                  {i > 0 && (
                    <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${step > s.id || step === s.id ? "bg-blue-500" : "bg-gray-200"}`} />
                  )}
                  {/* dot */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step > s.id  ? "bg-blue-600" :
                    step === s.id ? "bg-blue-600 ring-4 ring-blue-100" :
                    "bg-gray-200"
                  }`}>
                    {step > s.id
                      ? <CheckCircle2 size={13} className="text-white" />
                      : <s.icon size={11} className={step === s.id ? "text-white" : "text-gray-400"} />
                    }
                  </div>
                  {/* line after */}
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${step > s.id ? "bg-blue-500" : "bg-gray-200"}`} />
                  )}
                </div>
                <span className={`text-[9px] font-bold whitespace-nowrap transition-colors ${step === s.id ? "text-blue-600" : step > s.id ? "text-gray-500" : "text-gray-300"}`}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* ── STEP 1: วันที่ ── */}
        {step === 1 && (
          <div className="space-y-3">
            {/* warning */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">การยื่นใบลาออกจะแจ้งหัวหน้าทีมของคุณทันที และต้องรอการอนุมัติ 2 ขั้นตอน</p>
            </div>

            {/* employee info */}
            <SectionCard>
              <SectionHeader label="ข้อมูลพนักงาน" />
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-base shrink-0 overflow-hidden">
                  {emp?.avatar_url
                    ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                    : emp?.first_name_th?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{emp.first_name_th} {emp.last_name_th}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{emp.position?.name}{emp.department?.name ? ` · ${emp.department.name}` : ""}</p>
                  <p className="text-xs text-gray-400">
                    รหัส {emp.employee_code}{emp.hire_date ? ` · เริ่มงาน ${format(new Date(emp.hire_date + "T00:00:00"), "d MMM yyyy", { locale: th })}` : ""}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* dates */}
            <SectionCard>
              <SectionHeader label="กำหนดวันที่" />
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">
                    วันทำงานวันสุดท้าย <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input type="date" value={lastWorkDate} min={today}
                      onChange={e => { setLastWorkDate(e.target.value); if (!effectiveDate) setEffectiveDate(e.target.value) }}
                      className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">
                    วันที่มีผลบังคับ <span className="text-rose-500">*</span>
                  </label>
                  <input type="date" value={effectiveDate} min={lastWorkDate || today}
                    onChange={e => setEffectiveDate(e.target.value)}
                    className={inputCls} />
                  <p className="text-[10px] text-gray-400 mt-1.5">ควรแจ้งล่วงหน้าอย่างน้อย 30 วัน</p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 2: สาเหตุการลาออก ── */}
        {step === 2 && (
          <div className="space-y-3">
            <SectionCard>
              <SectionHeader label="2.1 สาเหตุหลักในการลาออก · เลือกได้มากกว่า 1 ข้อ" />
              <div className="px-2 py-3 space-y-0.5">
                {RESIGN_REASONS.map(r => (
                  <Checkbox key={r.key}
                    checked={reasons.includes(r.key)}
                    onChange={() => toggleReason(r.key)}
                    label={r.label} />
                ))}
              </div>
              {reasons.includes("other") && (
                <div className="px-5 pb-4">
                  <textarea value={otherReason} onChange={e => setOtherReason(e.target.value)}
                    placeholder="ระบุเหตุผลอื่นๆ…"
                    className={inputCls + " resize-none h-16"} />
                </div>
              )}
            </SectionCard>

            {/* 2.2 รายละเอียดเพิ่มเติม */}
            <SectionCard>
              <SectionHeader label="2.2 รายละเอียดเพิ่มเติม / Additional Details" />
              <div className="px-5 py-4">
                <textarea value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder="อธิบายเพิ่มเติมเกี่ยวกับสาเหตุการลาออก (ถ้ามี)…"
                  className={inputCls + " resize-none h-24"} />
              </div>
            </SectionCard>

            {/* 2.3 ปรึกษาก่อนลาออก */}
            <SectionCard>
              <SectionHeader label="2.3 ก่อนตัดสินใจลาออก" />
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-gray-700">ท่านได้ปรึกษาหรือแจ้งผู้บังคับบัญชาหรือ HR หรือไม่?</p>
                <div className="grid grid-cols-2 gap-2">
                  {([["yes","ได้ปรึกษา / แจ้งแล้ว"],["no","ไม่ได้ปรึกษา / ไม่ได้แจ้ง"]] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setConsulted(v)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${consulted===v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <textarea value={consultedDetail} onChange={e => setConsultedDetail(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)…"
                  className={inputCls + " resize-none h-16"} />
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 3: ประเมินความพึงพอใจ ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Info size={12} className="text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400">คำตอบจะถูกเก็บเป็นความลับ ใช้เพื่อพัฒนาองค์กรเท่านั้น</p>
            </div>

            <SectionCard>
              <SectionHeader label="ส่วนที่ 3 · ให้คะแนน 1 (น้อยที่สุด) – 5 (ดีมาก)" />
              <div className="px-4 py-2 flex items-center justify-between text-[9px] text-gray-400 font-semibold">
                {SAT_SCALE.map((s, i) => <span key={i} className="text-center flex-1">{i + 1} {s}</span>)}
              </div>
              <div className="divide-y divide-gray-50">
                {SAT_TOPICS.map((t, i) => (
                  <div key={t.key} className="px-4 py-3">
                    <p className="text-[13px] text-gray-700 mb-2 leading-snug">{i + 1}. {t.label}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRating(t.key, n)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${ratings[t.key] === n ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 3.11 NPS */}
            <SectionCard>
              <SectionHeader label="3.11 คุณจะแนะนำบริษัทให้คนอื่นมาสมัครงานหรือไม่?" />
              <div className="px-4 py-4">
                <div className="flex justify-between text-[9px] text-gray-400 font-semibold mb-1.5 px-0.5">
                  <span>0 · ไม่แนะนำเลย</span><span>แนะนำอย่างยิ่ง · 10</span>
                </div>
                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} onClick={() => setNps(n)}
                      className={`py-2 rounded-md text-[11px] font-bold border transition-all ${nps === n ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader label="ความคิดเห็นเพิ่มเติม" />
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">คำแนะนำสำหรับทีม/แผนก</label>
                  <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)}
                    placeholder="คุณมีคำแนะนำอะไรสำหรับทีมหรือแผนกบ้าง…"
                    className={inputCls + " resize-none h-20"} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">ข้อเสนอแนะต่อบริษัท</label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="มีสิ่งที่อยากบอกบริษัทก่อนออกไหม…"
                    className={inputCls + " resize-none h-20"} />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 4: ทรัพย์สิน ── */}
        {step === 4 && (
          <div className="space-y-3">
            <SectionCard>
              <SectionHeader label="ทรัพย์สินที่ต้องส่งคืน" />
              <div className="px-2 py-2 divide-y divide-gray-50">
                {ASSETS.map(a => (
                  <div key={a.k} className="py-1">
                    <Checkbox checked={!!assets[a.k]} onChange={() => toggleAsset(a.k)} label={a.l} />
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
                    placeholder="0"
                    className={inputCls} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">บาท</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">เช่น ค่าอุปกรณ์ชำรุด, เงินยืมทดลองจ่าย</p>
              </div>
            </SectionCard>

            {/* summary */}
            <SectionCard>
              <SectionHeader label="สรุปใบลาออก" />
              <div className="px-5 py-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0 overflow-hidden text-xs">
                    {emp?.avatar_url
                      ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                      : emp?.first_name_th?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{emp.first_name_th} {emp.last_name_th}</p>
                    <p className="text-xs text-gray-400">{emp.position?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 mb-0.5">วันสุดท้าย</p>
                    <p className="font-bold text-gray-900 text-xs">
                      {lastWorkDate ? format(new Date(lastWorkDate + "T00:00:00"), "d MMM yyyy", { locale: th }) : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 mb-0.5">มีผลบังคับ</p>
                    <p className="font-bold text-gray-900 text-xs">
                      {effectiveDate ? format(new Date(effectiveDate + "T00:00:00"), "d MMM yyyy", { locale: th }) : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 mb-0.5">เหตุผล</p>
                    <p className="font-bold text-gray-900 text-xs">{reasons.length} ข้อ</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 mb-0.5">ส่งคืนทรัพย์สิน</p>
                    <p className="font-bold text-gray-900 text-xs">{Object.values(assets).filter(Boolean).length} รายการ</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-2 pt-1">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center justify-center gap-1.5 px-5 py-3.5 border border-gray-200 bg-white text-gray-600 font-semibold text-sm rounded-2xl hover:bg-gray-50 transition-colors">
              <ChevronLeft size={15} />
            </button>
          )}

          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
              ถัดไป <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-600 text-white font-bold text-sm rounded-2xl hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-rose-200">
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> กำลังส่ง…</>
                : <><CheckCircle2 size={15} /> ยืนยันยื่นใบลาออก</>}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}