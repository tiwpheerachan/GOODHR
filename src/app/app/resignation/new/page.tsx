"use client"
import { useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  FileText, AlertTriangle, ClipboardList, PackageCheck, UserX, Calendar, Info,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

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

  const today = format(new Date(), "yyyy-MM-dd")
  const [lastWorkDate,  setLastWorkDate]  = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [reasons,       setReasons]       = useState<string[]>([])
  const [otherReason,   setOtherReason]   = useState("")
  const [exitAnswers,   setExitAnswers]   = useState<Record<string, string | string[]>>({})
  const [suggestion,    setSuggestion]    = useState("")
  const [comment,       setComment]       = useState("")
  const [assets,        setAssets]        = useState<Record<string, boolean>>({})
  const [assetNotes,    setAssetNotes]    = useState<Record<string, string>>({})
  const [deductAmount,  setDeductAmount]  = useState("")

  const toggleReason = (k: string) => setReasons(r => r.includes(k) ? r.filter(x => x !== k) : [...r, k])
  const toggleAsset  = (k: string) => setAssets(a => ({ ...a, [k]: !a[k] }))
  const setExitAns   = (k: string, v: string, multi: boolean) => {
    if (!multi) { setExitAnswers(a => ({ ...a, [k]: v })); return }
    setExitAnswers(a => {
      const cur = (a[k] as string[]) || []
      return { ...a, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
    })
  }

  const canNext = () => {
    if (step === 1) return !!lastWorkDate && !!effectiveDate
    if (step === 2) return reasons.length > 0
    return true
  }

  const submit = async () => {
    if (!emp?.id) return
    setSubmitting(true)
    try {
      const companyId = emp.company_id ?? (user as any)?.company_id
      const { error } = await supabase.from("resignation_requests").insert({
        employee_id:    emp.id,
        company_id:     companyId,
        last_work_date: lastWorkDate,
        effective_date: effectiveDate,
        reasons,
        other_reason:   otherReason || null,
        exit_interview: { ...exitAnswers, suggestion, comment },
        assets:         { items: assets, notes: assetNotes, deduct_amount: deductAmount || 0 },
        status:         "pending_manager",
        manager_id:     emp.manager_id ?? null,
      })
      if (error) throw error
      if (emp.manager_id) {
        await supabase.from("notifications").insert({
          employee_id: emp.manager_id,
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

  if (!emp) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 size={18} className="animate-spin mr-2" /> กำลังโหลด…
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

        {/* ── STEP 2: เหตุผล ── */}
        {step === 2 && (
          <SectionCard>
            <SectionHeader label="เหตุผลการลาออก · เลือกได้มากกว่า 1 ข้อ" />
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
                  placeholder="ระบุเหตุผลเพิ่มเติม…"
                  className={inputCls + " resize-none h-20"} />
              </div>
            )}
          </SectionCard>
        )}

        {/* ── STEP 3: Exit Interview ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Info size={12} className="text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400">คำตอบจะไม่ถูกเปิดเผย ใช้เพื่อพัฒนาองค์กรเท่านั้น</p>
            </div>

            {EXIT_Q.map((q, qi) => (
              <SectionCard key={q.k}>
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800">{qi + 1}. {q.q}</p>
                  {q.multi && <p className="text-[10px] text-blue-500 font-semibold mt-0.5">เลือกได้มากกว่า 1 ข้อ</p>}
                </div>
                <div className="px-2 py-2 space-y-0.5">
                  {q.opts.map(o => {
                    const ans = exitAnswers[q.k]
                    const checked = q.multi ? ((ans as string[]) || []).includes(o) : ans === o
                    return <Checkbox key={o} checked={checked} onChange={() => setExitAns(q.k, o, q.multi)} label={o} />
                  })}
                </div>
              </SectionCard>
            ))}

            <SectionCard>
              <SectionHeader label="ความคิดเห็นเพิ่มเติม" />
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">คำแนะนำสำหรับทีม</label>
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