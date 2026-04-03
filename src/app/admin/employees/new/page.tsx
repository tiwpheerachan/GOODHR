"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, Save, Loader2, User, Briefcase, Banknote, ChevronRight,
  Key, Copy, Check, Eye, EyeOff, RefreshCw, Sparkles, Search, X, Building2,
  Clock, CalendarDays, MapPin, Shield,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

const STEPS = [
  { icon: User,      label: "ข้อมูลส่วนตัว" },
  { icon: Briefcase, label: "การจ้างงาน"   },
  { icon: Banknote,  label: "เงินเดือน"    },
]

const Field = ({ label, required, hint, children }: any) => (
  <div>
    <label className="block text-sm font-semibold text-slate-600 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
  </div>
)

const Input = ({ ...props }) => (
  <input {...props} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all placeholder-slate-300 ${props.className || ""}`} />
)

const Select = ({ children, ...props }: any) => (
  <select {...props} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all">
    {children}
  </select>
)

// ── Password generator ──────────────────────────────────────────
function generatePassword(): string {
  const upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower  = "abcdefghjkmnpqrstuvwxyz"
  const digits = "23456789"
  const special = "!@#$"
  const all    = upper + lower + digits + special
  let pw = ""
  // ensure at least 1 of each type
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += lower[Math.floor(Math.random() * lower.length)]
  pw += digits[Math.floor(Math.random() * digits.length)]
  pw += special[Math.floor(Math.random() * special.length)]
  for (let i = 0; i < 6; i++) pw += all[Math.floor(Math.random() * all.length)]
  // shuffle
  return pw.split("").sort(() => Math.random() - 0.5).join("")
}

export default function NewEmployeePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies]     = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions]     = useState<any[]>([])
  const [branches, setBranches]       = useState<any[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [supervisorSearch, setSupervisorSearch] = useState("")
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false)
  const [showPw, setShowPw]           = useState(false)
  const [copied, setCopied]           = useState<string | null>(null)
  const [created, setCreated]         = useState<{ email: string; password: string; name: string } | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [hasPostPromo, setHasPostPromo] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([])
  const [newPositionName, setNewPositionName] = useState("")
  const [creatingPosition, setCreatingPosition] = useState(false)

  const [f, setF] = useState<any>({
    // personal
    first_name_th: "", last_name_th: "", first_name_en: "", last_name_en: "",
    nickname: "", email: "", phone: "", gender: "", birth_date: "",
    national_id: "", address: "", bank_account: "", bank_name: "", social_security_no: "",
    // employment
    employee_code: "", hire_date: "", probation_end_date: "",
    employment_type: "full_time", employment_status: "probation", role: "employee",
    department_id: "", position_id: "", branch_id: "", supervisor_id: "",
    // salary (ช่วงทดลองงาน)
    base_salary: "", allowance_position: "0", allowance_transport: "0",
    allowance_food: "0", allowance_phone: "0", allowance_housing: "0",
    ot_rate_normal: "1.5", ot_rate_holiday: "3.0", tax_withholding_pct: "",
    kpi_standard_amount: "0",
    // post-probation promotion
    post_base_salary: "", post_allowance_position: "", post_allowance_transport: "",
    post_allowance_food: "", post_allowance_phone: "", post_allowance_housing: "",
    post_ot_rate_normal: "", post_ot_rate_holiday: "", post_tax_withholding_pct: "",
    post_position_id: "", post_kpi_amount: "",
    // schedule
    schedule_type: "fixed", // fixed | variable
    default_shift_id: "",
    fixed_dayoffs: ["sat", "sun"] as string[],
    can_self_schedule: false,
    // checkin settings
    checkin_anywhere: false,
    is_attendance_exempt: false,
    allowed_branch_ids: [] as string[],
    // auth
    password: generatePassword(),
  })
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }))

  const defaultCompanyId = user?.employee?.company_id ?? (user as any)?.company_id

  // โหลดรายชื่อบริษัท + set default
  useEffect(() => {
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        if (!selectedCompanyId && defaultCompanyId) setSelectedCompanyId(defaultCompanyId)
      })
  }, [defaultCompanyId]) // eslint-disable-line

  // โหลดแผนก/ตำแหน่ง/สาขา/พนักงาน ตาม company ที่เลือก
  useEffect(() => {
    if (!selectedCompanyId) return
    // reset ค่าที่ขึ้นกับ company เดิม
    set("department_id", ""); set("position_id", ""); set("branch_id", ""); set("supervisor_id", "")
    setSupervisorSearch("")
    Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", selectedCompanyId).order("name"),
      supabase.from("positions").select("id,name").eq("company_id", selectedCompanyId).order("name"),
      supabase.from("branches").select("id,name").eq("company_id", selectedCompanyId).order("name"),
      supabase.from("employees").select("id,first_name_th,last_name_th,nickname,employee_code,position:positions(name)").eq("company_id", selectedCompanyId).eq("is_active", true).order("first_name_th"),
      supabase.from("shift_templates").select("id,name,work_start,work_end,is_overnight,break_minutes").eq("company_id", selectedCompanyId).order("work_start"),
    ]).then(([d, p, b, e, s]) => {
      setDepartments(d.data ?? [])
      setPositions(p.data ?? [])
      setBranches(b.data ?? [])
      setAllEmployees(e.data ?? [])
      setShiftTemplates(s.data ?? [])
      // ถ้ามีกะเริ่มต้น 09:00-18:00 ให้เลือกอัตโนมัติ
      if (!f.default_shift_id && s.data?.length) {
        const defaultShift = s.data.find((sh: any) => sh.work_start === "09:00" && sh.work_end === "18:00") || s.data[0]
        if (defaultShift) set("default_shift_id", defaultShift.id)
      }
    })
  }, [selectedCompanyId]) // eslint-disable-line

  // Close supervisor dropdown on outside click
  useEffect(() => {
    const handler = () => setShowSupervisorDropdown(false)
    if (showSupervisorDropdown) {
      const timer = setTimeout(() => document.addEventListener("click", handler), 100)
      return () => { clearTimeout(timer); document.removeEventListener("click", handler) }
    }
  }, [showSupervisorDropdown])

  // Auto-calculate probation end (119 days = ~4 months from hire)
  const autoCalcProbation = useCallback(() => {
    if (f.hire_date && !f.probation_end_date) {
      const d = new Date(f.hire_date)
      d.setDate(d.getDate() + 119)
      set("probation_end_date", d.toISOString().split("T")[0])
    }
  }, [f.hire_date]) // eslint-disable-line

  const validateStep = () => {
    if (step === 0) {
      if (!f.first_name_th) return "กรุณากรอกชื่อ"
      if (!f.last_name_th)  return "กรุณากรอกนามสกุล"
      if (!f.national_id)   return "กรุณากรอกเลขบัตรประชาชน"
      if (f.national_id.length !== 13) return "เลขบัตรประชาชนต้องมี 13 หลัก"
    }
    if (step === 1) {
      if (!selectedCompanyId) return "กรุณาเลือกบริษัทที่สังกัด"
      if (!f.employee_code) return "กรุณากรอกรหัสพนักงาน"
      if (!f.email)         return "กรุณากรอกอีเมล"
      if (!f.hire_date)     return "กรุณาเลือกวันเริ่มงาน"
    }
    return null
  }

  const next = () => {
    const err = validateStep()
    if (err) { toast.error(err); return }
    setStep(s => s + 1)
  }

  const generateCode = async () => {
    if (!selectedCompanyId) { toast.error("กรุณาเลือกบริษัทก่อน"); return }
    setGeneratingCode(true)
    try {
      const res = await fetch(`/api/employees/next-code?company_id=${selectedCompanyId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set("employee_code", data.code)
      toast.success(`สร้างรหัส ${data.code} แล้ว`)
    } catch (e: any) {
      toast.error(e.message || "ไม่สามารถสร้างรหัสอัตโนมัติได้")
    }
    setGeneratingCode(false)
  }

  const createPosition = async () => {
    if (!newPositionName.trim()) { toast.error("กรุณากรอกชื่อตำแหน่ง"); return }
    if (!selectedCompanyId) { toast.error("กรุณาเลือกบริษัทก่อน"); return }
    setCreatingPosition(true)
    try {
      const { data, error } = await supabase.from("positions").insert({
        name: newPositionName.trim(),
        company_id: selectedCompanyId,
      }).select("id, name").single()
      if (error) throw error
      setPositions(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      set("position_id", data.id)
      setNewPositionName("")
      toast.success(`เพิ่มตำแหน่ง "${data.name}" แล้ว`)
    } catch (e: any) {
      toast.error(e.message || "ไม่สามารถสร้างตำแหน่งได้")
    }
    setCreatingPosition(false)
  }

  const submit = async () => {
    const err = validateStep()
    if (err) { toast.error(err); return }
    if (!f.base_salary) { toast.error("กรุณากรอกเงินเดือน"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          company_id: selectedCompanyId,
          tax_id: f.national_id,
          // ส่ง post-probation เฉพาะเมื่อ toggle เปิด
          ...(hasPostPromo ? {} : {
            post_base_salary: "", post_allowance_position: "", post_allowance_transport: "",
            post_allowance_food: "", post_allowance_phone: "", post_allowance_housing: "",
            post_ot_rate_normal: "", post_ot_rate_holiday: "", post_tax_withholding_pct: "",
            post_position_id: "", post_kpi_amount: "",
          }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // แสดง credentials ให้ admin ส่งให้พนักงาน
      setCreated({
        email: f.email,
        password: f.password,
        name: `${f.first_name_th} ${f.last_name_th}`,
      })
      toast.success("เพิ่มพนักงานสำเร็จ!")
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    }
    setLoading(false)
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      toast.success(`คัดลอก${label}แล้ว`)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const copyAllCredentials = () => {
    if (!created) return
    const text = `ข้อมูลเข้าสู่ระบบ GOODHR\n──────────────────\nชื่อ: ${created.name}\nอีเมล: ${created.email}\nรหัสผ่าน: ${created.password}\n──────────────────\nเว็บไซต์: ${window.location.origin}\nกรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก`
    navigator.clipboard.writeText(text).then(() => {
      toast.success("คัดลอกข้อมูลเข้าสู่ระบบทั้งหมดแล้ว")
    })
  }

  // ── Credentials created modal ────────────────────────────────
  if (created) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pt-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800">เพิ่มพนักงานสำเร็จ!</h2>
          <p className="text-sm text-slate-500">ส่งข้อมูลด้านล่างให้พนักงานใหม่เพื่อเข้าสู่ระบบ</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3">
            <p className="text-white font-bold text-sm flex items-center gap-2">
              <Key size={14}/> ข้อมูลเข้าสู่ระบบ
            </p>
          </div>
          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <p className="text-[11px] text-slate-400 font-medium mb-1">ชื่อพนักงาน</p>
              <p className="text-sm font-bold text-slate-800">{created.name}</p>
            </div>

            {/* Email */}
            <div>
              <p className="text-[11px] text-slate-400 font-medium mb-1">อีเมล (ใช้เป็น Username)</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-indigo-700 border border-slate-200">
                  {created.email}
                </div>
                <button onClick={() => copyText(created.email, "อีเมล")}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                  {copied === "อีเมล" ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} className="text-slate-400"/>}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <p className="text-[11px] text-slate-400 font-medium mb-1">รหัสผ่าน (ใช้ครั้งแรก)</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-rose-700 border border-slate-200">
                  {showPw ? created.password : "••••••••••"}
                </div>
                <button onClick={() => setShowPw(!showPw)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                  {showPw ? <EyeOff size={14} className="text-slate-400"/> : <Eye size={14} className="text-slate-400"/>}
                </button>
                <button onClick={() => copyText(created.password, "รหัสผ่าน")}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                  {copied === "รหัสผ่าน" ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} className="text-slate-400"/>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5">
          <button onClick={copyAllCredentials}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            <Copy size={14}/> คัดลอกข้อมูลทั้งหมด (ส่งให้พนักงาน)
          </button>
          <div className="flex gap-2.5">
            <button onClick={() => { setCreated(null); setStep(0); setF((p: any) => ({ ...p, first_name_th: "", last_name_th: "", first_name_en: "", last_name_en: "", nickname: "", email: "", phone: "", national_id: "", password: generatePassword() })) }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Sparkles size={14}/> เพิ่มพนักงานอีกคน
            </button>
            <Link href="/admin/employees"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors">
              กลับรายชื่อพนักงาน
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h2 className="text-xl font-black text-slate-800">เพิ่มพนักงานใหม่</h2>
          <p className="text-slate-400 text-sm">กรอกข้อมูลพนักงานใหม่ให้ครบถ้วน</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                i < step  ? "bg-green-500"  :
                i === step ? "bg-indigo-600" : "bg-slate-100"}`}>
                {i < step
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : <Icon size={16} className={i === step ? "text-white" : "text-slate-400"} />}
              </div>
              <span className={`text-[11px] font-semibold ${i === step ? "text-indigo-600" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 rounded-full ${i < step ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

        {/* Step 0 — ข้อมูลส่วนตัว */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800 text-base">ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อ (ไทย)" required><Input value={f.first_name_th} onChange={(e:any) => set("first_name_th", e.target.value)} placeholder="ชื่อจริง" /></Field>
              <Field label="นามสกุล (ไทย)" required><Input value={f.last_name_th} onChange={(e:any) => set("last_name_th", e.target.value)} placeholder="นามสกุล" /></Field>
              <Field label="ชื่อ (EN)" hint="ใช้สร้างอีเมลอัตโนมัติ"><Input value={f.first_name_en} onChange={(e:any) => set("first_name_en", e.target.value)} placeholder="First name" /></Field>
              <Field label="นามสกุล (EN)" hint="ใช้สร้างอีเมลอัตโนมัติ"><Input value={f.last_name_en} onChange={(e:any) => set("last_name_en", e.target.value)} placeholder="Last name" /></Field>
              <Field label="ชื่อเล่น"><Input value={f.nickname} onChange={(e:any) => set("nickname", e.target.value)} placeholder="ชื่อเล่น" /></Field>
              <Field label="เพศ">
                <Select value={f.gender} onChange={(e:any) => set("gender", e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </Select>
              </Field>
            </div>

            {/* National ID - prominent */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <Field label="หมายเลขบัตรประชาชน" required hint="13 หลัก (ใช้เป็นเลขผู้เสียภาษีด้วย)">
                <Input
                  value={f.national_id}
                  onChange={(e:any) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 13)
                    set("national_id", v)
                  }}
                  placeholder="X-XXXX-XXXXX-XX-X"
                  maxLength={13}
                  className="!bg-white font-mono text-base tracking-wider"
                />
                {f.national_id && f.national_id.length === 13 && (
                  <p className="text-emerald-600 text-[11px] mt-1 flex items-center gap-1"><Check size={10}/> ครบ 13 หลัก</p>
                )}
                {f.national_id && f.national_id.length > 0 && f.national_id.length < 13 && (
                  <p className="text-amber-600 text-[11px] mt-1">{f.national_id.length}/13 หลัก</p>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="เบอร์โทร"><Input value={f.phone} onChange={(e:any) => set("phone", e.target.value)} placeholder="08x-xxx-xxxx" /></Field>
              <Field label="วันเกิด"><Input type="date" value={f.birth_date} onChange={(e:any) => set("birth_date", e.target.value)} /></Field>
              <Field label="เลขบัญชีธนาคาร"><Input value={f.bank_account} onChange={(e:any) => set("bank_account", e.target.value)} placeholder="xxx-x-xxxxx-x" /></Field>
              <Field label="ธนาคาร"><Input value={f.bank_name} onChange={(e:any) => set("bank_name", e.target.value)} placeholder="ชื่อธนาคาร" /></Field>
              <Field label="เลขประกันสังคม"><Input value={f.social_security_no} onChange={(e:any) => set("social_security_no", e.target.value)} /></Field>
            </div>
            <Field label="ที่อยู่">
              <textarea value={f.address} onChange={(e:any) => set("address", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all resize-none h-20" placeholder="ที่อยู่ปัจจุบัน" />
            </Field>
          </div>
        )}

        {/* Step 1 — การจ้างงาน + Login Credentials */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800 text-base">ข้อมูลการจ้างงาน</h3>

            {/* ── เลือกบริษัท ── */}
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-600"/>
                <h4 className="font-bold text-blue-800 text-sm">บริษัทที่สังกัด</h4>
              </div>
              <Field label="เลือกบริษัท" required hint="เปลี่ยนบริษัทจะ reset แผนก/ตำแหน่ง/สาขา/หัวหน้า">
                <Select value={selectedCompanyId} onChange={(e:any) => setSelectedCompanyId(e.target.value)}>
                  <option value="">— เลือกบริษัท —</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ""}{c.name_th}</option>)}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสพนักงาน" required>
                <div className="flex gap-2">
                  <Input value={f.employee_code} onChange={(e:any) => set("employee_code", e.target.value)} placeholder="690001" className="flex-1" />
                  <button type="button" onClick={generateCode} disabled={generatingCode} className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5" title="สร้างรหัสอัตโนมัติ">
                    {generatingCode ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    สร้างรหัส
                  </button>
                </div>
              </Field>
              <Field label="สิทธิ์การเข้าถึง">
                <Select value={f.role} onChange={(e:any) => set("role", e.target.value)}>
                  <option value="employee">พนักงาน</option>
                  <option value="manager">หัวหน้าทีม</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="super_admin">Super Admin</option>
                </Select>
              </Field>
              <Field label="แผนก">
                <Select value={f.department_id} onChange={(e:any) => set("department_id", e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="ตำแหน่ง">
                <Select value={f.position_id} onChange={(e:any) => set("position_id", e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={newPositionName}
                    onChange={(e) => setNewPositionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createPosition())}
                    placeholder="+ พิมพ์ตำแหน่งใหม่..."
                    className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 placeholder-slate-300"
                  />
                  {newPositionName.trim() && (
                    <button type="button" onClick={createPosition} disabled={creatingPosition}
                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap">
                      {creatingPosition ? <Loader2 size={12} className="animate-spin"/> : "เพิ่ม"}
                    </button>
                  )}
                </div>
              </Field>
              <Field label="สาขา">
                <Select value={f.branch_id} onChange={(e:any) => set("branch_id", e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="ประเภทการจ้าง">
                <Select value={f.employment_type} onChange={(e:any) => set("employment_type", e.target.value)}>
                  <option value="full_time">พนักงานประจำ</option>
                  <option value="part_time">พาร์ทไทม์</option>
                  <option value="contract">สัญญาจ้าง</option>
                  <option value="intern">ฝึกงาน</option>
                </Select>
              </Field>
              <Field label="สถานะ">
                <Select value={f.employment_status} onChange={(e:any) => set("employment_status", e.target.value)}>
                  <option value="probation">ทดลองงาน</option>
                  <option value="active">ปกติ</option>
                </Select>
              </Field>
              <Field label="วันเริ่มงาน" required>
                <Input type="date" value={f.hire_date} onChange={(e:any) => { set("hire_date", e.target.value) }} onBlur={autoCalcProbation} />
              </Field>
              <Field label="สิ้นสุดทดลองงาน" hint="คำนวณอัตโนมัติ 120 วัน (แก้ไขได้)">
                <Input type="date" value={f.probation_end_date} onChange={(e:any) => set("probation_end_date", e.target.value)} />
              </Field>
            </div>

            {/* ── หัวหน้า / ผู้อนุมัติ ──────────────────────────── */}
            <div className="border-2 border-violet-200 bg-violet-50/50 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-violet-800 text-sm">หัวหน้า / ผู้อนุมัติ</h4>
              <Field label="เลือกหัวหน้างาน" hint="ผู้อนุมัติคำขอลา, OT, การลาออก ฯลฯ">
                <div className="relative">
                  {f.supervisor_id ? (
                    <div className="flex items-center gap-2 bg-white border border-violet-300 rounded-xl px-3.5 py-2.5">
                      <div className="flex-1 text-sm text-slate-800">
                        {(() => {
                          const sup = allEmployees.find((e: any) => e.id === f.supervisor_id)
                          return sup ? `${sup.first_name_th} ${sup.last_name_th}${sup.nickname ? ` (${sup.nickname})` : ""} — ${sup.employee_code}` : f.supervisor_id
                        })()}
                      </div>
                      <button type="button" onClick={() => { set("supervisor_id", ""); setSupervisorSearch("") }}
                        className="p-1 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={14} className="text-red-400"/>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                          value={supervisorSearch}
                          onChange={(e) => { setSupervisorSearch(e.target.value); setShowSupervisorDropdown(true) }}
                          onFocus={() => setShowSupervisorDropdown(true)}
                          placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 transition-all placeholder-slate-300"
                        />
                      </div>
                      {showSupervisorDropdown && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {allEmployees
                            .filter((e: any) => {
                              if (!supervisorSearch) return true
                              const q = supervisorSearch.toLowerCase()
                              return (
                                e.first_name_th?.toLowerCase().includes(q) ||
                                e.last_name_th?.toLowerCase().includes(q) ||
                                e.nickname?.toLowerCase().includes(q) ||
                                e.employee_code?.toLowerCase().includes(q)
                              )
                            })
                            .slice(0, 20)
                            .map((e: any) => (
                              <button key={e.id} type="button"
                                onClick={() => {
                                  set("supervisor_id", e.id)
                                  setSupervisorSearch("")
                                  setShowSupervisorDropdown(false)
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-violet-50 transition-colors border-b border-slate-50 last:border-0">
                                <p className="text-sm font-medium text-slate-800">
                                  {e.first_name_th} {e.last_name_th}
                                  {e.nickname && <span className="text-slate-400 ml-1">({e.nickname})</span>}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {e.employee_code}{e.position?.name && ` · ${e.position.name}`}
                                </p>
                              </button>
                            ))
                          }
                          {allEmployees.filter((e: any) => {
                            if (!supervisorSearch) return true
                            const q = supervisorSearch.toLowerCase()
                            return e.first_name_th?.toLowerCase().includes(q) || e.last_name_th?.toLowerCase().includes(q) || e.nickname?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q)
                          }).length === 0 && (
                            <p className="px-3.5 py-3 text-sm text-slate-400 text-center">ไม่พบพนักงาน</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Field>
            </div>

            {/* ── กะการทำงาน ──────────────────────────────────── */}
            <div className="border-2 border-teal-200 bg-teal-50/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-teal-600"/>
                <h4 className="font-bold text-teal-800 text-sm">กะการทำงาน</h4>
              </div>

              {/* ประเภทกะ */}
              <Field label="ประเภทตารางงาน">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => set("schedule_type", "fixed")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${f.schedule_type === "fixed" ? "border-teal-500 bg-teal-50 ring-2 ring-teal-400/20" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                    <p className={`text-sm font-bold ${f.schedule_type === "fixed" ? "text-teal-700" : "text-slate-700"}`}>กะแน่นอน</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">เข้างานเวลาเดิมทุกวัน</p>
                  </button>
                  <button type="button" onClick={() => set("schedule_type", "variable")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${f.schedule_type === "variable" ? "border-teal-500 bg-teal-50 ring-2 ring-teal-400/20" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                    <p className={`text-sm font-bold ${f.schedule_type === "variable" ? "text-teal-700" : "text-slate-700"}`}>วางกะเอง</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">แอดมิน/หัวหน้าจัดกะรายเดือน</p>
                  </button>
                </div>
              </Field>

              {/* เลือกกะเริ่มต้น */}
              <Field label={f.schedule_type === "fixed" ? "กะประจำ" : "กะเริ่มต้น (ค่าเริ่มต้น)"} hint={shiftTemplates.length === 0 ? "ยังไม่มีกะในบริษัทนี้ — ไปเพิ่มที่หน้า ตั้งค่ากะ ก่อน" : undefined}>
                <Select value={f.default_shift_id} onChange={(e:any) => set("default_shift_id", e.target.value)}>
                  <option value="">— เลือกกะ —</option>
                  {shiftTemplates.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name || `${s.work_start}-${s.work_end}`} ({s.work_start}-{s.work_end}){s.is_overnight ? " [ข้ามคืน]" : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* แสดงเวลาทำงานของกะที่เลือก */}
              {f.default_shift_id && (() => {
                const sel = shiftTemplates.find((s: any) => s.id === f.default_shift_id)
                if (!sel) return null
                return (
                  <div className="bg-white border border-teal-200 rounded-xl p-3 flex items-center gap-3">
                    <CalendarDays size={18} className="text-teal-500 shrink-0"/>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{sel.name || `กะ ${sel.work_start}-${sel.work_end}`}</p>
                      <p className="text-xs text-slate-400">เวลา {sel.work_start} - {sel.work_end} {sel.is_overnight ? "(ข้ามคืน)" : ""} · พัก {sel.break_minutes} นาที</p>
                    </div>
                  </div>
                )
              })()}

              {/* วันหยุดประจำ (สำหรับกะแน่นอน) */}
              {f.schedule_type === "fixed" && (
                <Field label="วันหยุดประจำสัปดาห์" hint="เลือกวันที่หยุดเป็นประจำ">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "mon", label: "จ." },
                      { key: "tue", label: "อ." },
                      { key: "wed", label: "พ." },
                      { key: "thu", label: "พฤ." },
                      { key: "fri", label: "ศ." },
                      { key: "sat", label: "ส." },
                      { key: "sun", label: "อา." },
                    ].map(d => {
                      const active = (f.fixed_dayoffs as string[]).includes(d.key)
                      return (
                        <button key={d.key} type="button"
                          onClick={() => {
                            const current = f.fixed_dayoffs as string[]
                            if (active) {
                              setF((p: any) => ({ ...p, fixed_dayoffs: current.filter((x: string) => x !== d.key) }))
                            } else {
                              setF((p: any) => ({ ...p, fixed_dayoffs: [...current, d.key] }))
                            }
                          }}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${active ? "bg-red-100 text-red-700 border-2 border-red-300" : "bg-slate-50 text-slate-500 border border-slate-200 hover:border-teal-300"}`}>
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              )}

              {/* สิทธิ์วางกะเอง */}
              {f.schedule_type === "variable" && (
                <div className="flex items-center gap-3 bg-white border border-teal-200 rounded-xl p-3">
                  <input type="checkbox" checked={f.can_self_schedule}
                    onChange={(e) => set("can_self_schedule", e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"/>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">อนุญาตให้พนักงานเสนอกะเอง</p>
                    <p className="text-[11px] text-slate-400">พนักงานสามารถเสนอกะที่ต้องการ แล้วรอหัวหน้าอนุมัติ</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── สิทธิ์การเช็คอิน ──────────────────────────────── */}
            <div className="border-2 border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600"/>
                <h4 className="font-bold text-blue-800 text-sm">สิทธิ์การเช็คอิน</h4>
              </div>

              {/* เลือกสาขาที่เช็คอินได้ (หลายที่) */}
              <Field label="สาขาที่อนุญาตให้เช็คอิน" hint="เลือกได้หลายสาขา — ระบบตรวจพิกัด GPS ตามรัศมีของแต่ละสาขา">
                {branches.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    ยังไม่มีสาขาในบริษัทนี้ — เพิ่มได้ที่หน้าตั้งค่าองค์กร
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {/* เลือกทั้งหมด / ยกเลิกทั้งหมด */}
                    <div className="flex gap-2 mb-1">
                      <button type="button" onClick={() => setF((p: any) => ({ ...p, allowed_branch_ids: branches.map((b: any) => b.id) }))}
                        className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        เลือกทั้งหมด
                      </button>
                      {(f.allowed_branch_ids as string[]).length > 0 && (
                        <button type="button" onClick={() => setF((p: any) => ({ ...p, allowed_branch_ids: [] }))}
                          className="text-[10px] font-bold px-2.5 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                          ยกเลิกทั้งหมด
                        </button>
                      )}
                    </div>
                    {branches.map((b: any) => {
                      const checked = (f.allowed_branch_ids as string[]).includes(b.id)
                      return (
                        <label key={b.id} className={`flex items-center gap-3 bg-white border rounded-xl p-2.5 cursor-pointer transition-all ${checked ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200 hover:border-blue-300"}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              const ids = f.allowed_branch_ids as string[]
                              setF((p: any) => ({
                                ...p,
                                allowed_branch_ids: checked ? ids.filter(x => x !== b.id) : [...ids, b.id],
                              }))
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${checked ? "text-blue-700" : "text-slate-700"}`}>{b.name}</p>
                          </div>
                          {checked && <MapPin size={14} className="text-blue-400"/>}
                        </label>
                      )
                    })}
                  </div>
                )}
              </Field>

              {/* เช็คอินได้ทุกที่ */}
              <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl p-3">
                <input type="checkbox" checked={f.checkin_anywhere}
                  onChange={(e) => set("checkin_anywhere", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <div>
                  <p className="text-sm font-semibold text-slate-700">เช็คอินได้ทุกที่ (ไม่ต้องอยู่ในรัศมีสาขา)</p>
                  <p className="text-[11px] text-slate-400">สำหรับพนักงานที่ทำงานนอกสถานที่เป็นประจำ เช่น พนักงานขาย, ช่างซ่อม</p>
                </div>
              </div>

              {/* ยกเว้นบันทึกเวลา */}
              <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl p-3">
                <input type="checkbox" checked={f.is_attendance_exempt}
                  onChange={(e) => set("is_attendance_exempt", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <div>
                  <p className="text-sm font-semibold text-slate-700">ยกเว้นการบันทึกเวลา (ไม่คิดมาสาย/ออกก่อน)</p>
                  <p className="text-[11px] text-slate-400">สำหรับผู้บริหาร, หัวหน้างาน ที่เวลาทำงานยืดหยุ่น ไม่ต้องคิดค่าปรับสาย</p>
                </div>
              </div>
            </div>

            {/* ── Email & Password ─────────────────────────────── */}
            <div className="border-2 border-indigo-200 bg-indigo-50/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-indigo-600"/>
                <h4 className="font-bold text-indigo-800 text-sm">ข้อมูลเข้าสู่ระบบ</h4>
              </div>

              {/* Email — admin กรอกเอง */}
              <Field label="อีเมล (ใช้เป็น Username)" required>
                <Input value={f.email} onChange={(e:any) => set("email", e.target.value)} placeholder="email@company.com" className="!bg-white" />
              </Field>

              {/* Password — สุ่มให้อัตโนมัติ */}
              <Field label="รหัสผ่าน (ใช้เข้าสู่ระบบครั้งแรก)" hint="สุ่มให้อัตโนมัติ กดสุ่มใหม่ได้ หรือพิมพ์เอง">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={f.password}
                      onChange={(e:any) => set("password", e.target.value)}
                      className="!bg-white font-mono pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  <button type="button" onClick={() => set("password", generatePassword())}
                    className="flex items-center gap-1.5 px-3 py-2 border border-indigo-300 text-indigo-700 bg-white rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors whitespace-nowrap">
                    <RefreshCw size={12}/> สุ่มใหม่
                  </button>
                </div>
              </Field>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-700">
                <strong>หมายเหตุ:</strong> หลังบันทึก ระบบจะแสดงข้อมูลเข้าสู่ระบบให้คัดลอกส่งพนักงาน
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — เงินเดือน */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800 text-base">โครงสร้างเงินเดือน</h3>
            <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 font-medium">
              สามารถแก้ไขเงินเดือนได้ภายหลังในหน้าแก้ไขพนักงาน
            </div>

            {/* ── เงินเดือนช่วงทดลองงาน ── */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">เงินเดือนช่วงทดลองงาน</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="เงินเดือนฐาน (บาท)" required><Input type="number" value={f.base_salary} onChange={(e:any) => set("base_salary", e.target.value)} placeholder="0" /></Field>
                <Field label="เบี้ยตำแหน่ง"><Input type="number" value={f.allowance_position} onChange={(e:any) => set("allowance_position", e.target.value)} placeholder="0" /></Field>
                <Field label="ค่าเดินทาง"><Input type="number" value={f.allowance_transport} onChange={(e:any) => set("allowance_transport", e.target.value)} placeholder="0" /></Field>
                <Field label="ค่าอาหาร"><Input type="number" value={f.allowance_food} onChange={(e:any) => set("allowance_food", e.target.value)} placeholder="0" /></Field>
                <Field label="ค่าโทรศัพท์"><Input type="number" value={f.allowance_phone} onChange={(e:any) => set("allowance_phone", e.target.value)} placeholder="0" /></Field>
                <Field label="ค่าที่พัก"><Input type="number" value={f.allowance_housing} onChange={(e:any) => set("allowance_housing", e.target.value)} placeholder="0" /></Field>
                <Field label="อัตรา OT ปกติ (x)" hint="เช่น 1.5 เท่า"><Input type="number" step="0.5" value={f.ot_rate_normal} onChange={(e:any) => set("ot_rate_normal", e.target.value)} placeholder="1.5" /></Field>
                <Field label="อัตรา OT วันหยุด (x)" hint="เช่น 3 เท่า"><Input type="number" step="0.5" value={f.ot_rate_holiday} onChange={(e:any) => set("ot_rate_holiday", e.target.value)} placeholder="3.0" /></Field>
              </div>

              {/* ภาษีหัก ณ ที่จ่าย */}
              <div className="border border-indigo-100 bg-indigo-50/60 rounded-xl p-4">
                <p className="text-xs font-bold text-indigo-700 mb-1">ภาษีหัก ณ ที่จ่าย</p>
                <p className="text-[11px] text-slate-400 mb-3">เว้นว่าง = คำนวณอัตโนมัติตามขั้นบันไดภาษี</p>
                <div className="flex items-center gap-3 max-w-[220px]">
                  <div className="relative flex-1">
                    <Input type="number" step="0.5" min="0" max="35"
                      value={f.tax_withholding_pct} onChange={(e:any) => set("tax_withholding_pct", e.target.value)}
                      placeholder="อัตโนมัติ" className="pr-8"/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                  </div>
                  {f.tax_withholding_pct !== "" && (
                    <button type="button" onClick={() => set("tax_withholding_pct", "")}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors">ล้าง</button>
                  )}
                </div>
              </div>
            </div>

            {/* ── KPI ช่วงทดลองงาน ── */}
            <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-emerald-800 text-sm">ฐาน KPI Bonus (ช่วงทดลองงาน)</h4>
              <Field label="ฐาน KPI มาตรฐาน (บาท/เดือน)" hint="เกรด A = x1.2 · เกรด B = x1.0 · เกรด C = x0.8 · เว้นว่าง = ไม่มี KPI">
                <Input type="number" value={f.kpi_standard_amount} onChange={(e:any) => set("kpi_standard_amount", e.target.value)} placeholder="0" />
              </Field>
              {+f.kpi_standard_amount > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2 border border-emerald-200"><p className="text-[10px] text-slate-400">เกรด A</p><p className="font-bold text-emerald-700 text-sm">฿{Math.round(+f.kpi_standard_amount*1.2).toLocaleString()}</p></div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-200"><p className="text-[10px] text-slate-400">เกรด B</p><p className="font-bold text-indigo-700 text-sm">฿{(+f.kpi_standard_amount).toLocaleString()}</p></div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-200"><p className="text-[10px] text-slate-400">เกรด C</p><p className="font-bold text-amber-700 text-sm">฿{Math.round(+f.kpi_standard_amount*0.8).toLocaleString()}</p></div>
                </div>
              )}
            </div>

            {/* ── สรุปเงินเดือนทดลองงาน ── */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">เงินเดือนฐาน</span><span className="font-bold text-slate-800">฿{(+f.base_salary||0).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">รวมเบี้ยเลี้ยง</span><span className="font-bold text-slate-800">฿{((+f.allowance_position||0)+(+f.allowance_transport||0)+(+f.allowance_food||0)+(+f.allowance_phone||0)+(+f.allowance_housing||0)).toLocaleString()}</span></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm"><span className="text-slate-700 font-semibold">รวมทั้งหมด</span><span className="font-black text-indigo-700 text-base">฿{((+f.base_salary||0)+(+f.allowance_position||0)+(+f.allowance_transport||0)+(+f.allowance_food||0)+(+f.allowance_phone||0)+(+f.allowance_housing||0)).toLocaleString()}</span></div>
              {+f.kpi_standard_amount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-emerald-600">ฐาน KPI (เกรด B)</span><span className="font-bold text-emerald-700">฿{(+f.kpi_standard_amount).toLocaleString()}</span></div>
              )}
            </div>

            {/* ════════ หลังผ่านทดลองงาน ════════ */}
            <div className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">ตั้งค่าหลังผ่านทดลองงาน</h4>
                  <p className="text-[11px] text-amber-600 mt-0.5">เงินเดือน/ตำแหน่ง/KPI ที่จะปรับอัตโนมัติเมื่อ admin กด &quot;ยืนยันผ่านทดลองงาน&quot;</p>
                </div>
                <button type="button" onClick={() => setHasPostPromo(v => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${hasPostPromo ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                  {hasPostPromo ? "เปิดอยู่" : "เปิดใช้"}
                </button>
              </div>

              {hasPostPromo && (
                <div className="space-y-4">
                  {/* ตำแหน่งใหม่ */}
                  <Field label="ตำแหน่งใหม่หลังผ่านทดลองงาน" hint="เว้นว่าง = ไม่เปลี่ยนตำแหน่ง">
                    <Select value={f.post_position_id} onChange={(e:any) => set("post_position_id", e.target.value)}>
                      <option value="">— ไม่เปลี่ยนตำแหน่ง —</option>
                      {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>

                  {/* เงินเดือนใหม่ */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-3">เงินเดือนใหม่ (เว้นว่างช่องที่ไม่เปลี่ยน)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="เงินเดือนฐาน (บาท)"><Input type="number" value={f.post_base_salary} onChange={(e:any) => set("post_base_salary", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="เบี้ยตำแหน่ง"><Input type="number" value={f.post_allowance_position} onChange={(e:any) => set("post_allowance_position", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="ค่าเดินทาง"><Input type="number" value={f.post_allowance_transport} onChange={(e:any) => set("post_allowance_transport", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="ค่าอาหาร"><Input type="number" value={f.post_allowance_food} onChange={(e:any) => set("post_allowance_food", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="ค่าโทรศัพท์"><Input type="number" value={f.post_allowance_phone} onChange={(e:any) => set("post_allowance_phone", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="ค่าที่พัก"><Input type="number" value={f.post_allowance_housing} onChange={(e:any) => set("post_allowance_housing", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="OT ปกติ (x)"><Input type="number" step="0.5" value={f.post_ot_rate_normal} onChange={(e:any) => set("post_ot_rate_normal", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                      <Field label="OT วันหยุด (x)"><Input type="number" step="0.5" value={f.post_ot_rate_holiday} onChange={(e:any) => set("post_ot_rate_holiday", e.target.value)} placeholder="ไม่เปลี่ยน" /></Field>
                    </div>
                  </div>

                  {/* KPI ใหม่ */}
                  <Field label="ฐาน KPI ใหม่ (บาท/เดือน)" hint="เว้นว่าง = ไม่เปลี่ยน KPI">
                    <Input type="number" value={f.post_kpi_amount} onChange={(e:any) => set("post_kpi_amount", e.target.value)} placeholder="ไม่เปลี่ยน" />
                  </Field>

                  {/* แสดง preview ถ้ากรอกเงินเดือนใหม่ */}
                  {(+f.post_base_salary > 0 || +f.post_kpi_amount > 0) && (
                    <div className="bg-white rounded-xl border border-amber-200 p-3 space-y-1.5">
                      <p className="text-xs font-bold text-amber-800">เงินเดือนหลังผ่านทดลองงาน</p>
                      {+f.post_base_salary > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">เงินเดือนฐาน</span>
                          <span className="font-bold text-amber-700">฿{(+f.post_base_salary).toLocaleString()}</span>
                        </div>
                      )}
                      {(+f.post_base_salary > 0 && +f.base_salary > 0) && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>เพิ่มขึ้น</span>
                          <span className={`font-bold ${+f.post_base_salary > +f.base_salary ? "text-emerald-600" : "text-red-500"}`}>
                            {+f.post_base_salary > +f.base_salary ? "+" : ""}
                            ฿{((+f.post_base_salary)-(+f.base_salary)).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {+f.post_kpi_amount > 0 && (
                        <div className="flex justify-between text-sm"><span className="text-slate-500">ฐาน KPI ใหม่ (เกรด B)</span><span className="font-bold text-emerald-700">฿{(+f.post_kpi_amount).toLocaleString()}</span></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
          <ArrowLeft size={14} /> {step > 0 ? "ย้อนกลับ" : "ยกเลิก"}
        </button>
        {step < STEPS.length - 1
          ? <button onClick={next} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
              ถัดไป <ChevronRight size={14} />
            </button>
          : <button onClick={submit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              บันทึกพนักงาน
            </button>
        }
      </div>
    </div>
  )
}
