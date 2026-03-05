"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import { ArrowLeft, Save, Loader2, User, Briefcase, Banknote, ChevronRight } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

const STEPS = [
  { icon: User,     label: "ข้อมูลส่วนตัว" },
  { icon: Briefcase,label: "การจ้างงาน"   },
  { icon: Banknote, label: "เงินเดือน"    },
]

const Field = ({ label, required, children }: any) => (
  <div>
    <label className="block text-sm font-semibold text-slate-600 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

const Input = ({ ...props }) => (
  <input {...props} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all placeholder-slate-300" />
)

const Select = ({ children, ...props }: any) => (
  <select {...props} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all">
    {children}
  </select>
)

export default function NewEmployeePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions]     = useState<any[]>([])
  const [branches, setBranches]       = useState<any[]>([])

  const [f, setF] = useState<any>({
    // personal
    first_name_th: "", last_name_th: "", first_name_en: "", last_name_en: "",
    nickname: "", email: "", phone: "", gender: "", birth_date: "",
    national_id: "", address: "", bank_account: "", bank_name: "", tax_id: "", social_security_no: "",
    // employment
    employee_code: "", hire_date: "", probation_end_date: "",
    employment_type: "full_time", employment_status: "probation", role: "employee",
    department_id: "", position_id: "", branch_id: "",
    // salary
    base_salary: "", allowance_position: "0", allowance_transport: "0",
    allowance_food: "0", allowance_phone: "0", allowance_housing: "0",
  })
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }))

  const companyId = user?.employee?.company_id ?? (user as any)?.company_id

  useEffect(() => {
    if (!companyId) return
    Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("positions").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("branches").select("id,name").eq("company_id", companyId).order("name"),
    ]).then(([d, p, b]) => {
      setDepartments(d.data ?? [])
      setPositions(p.data ?? [])
      setBranches(b.data ?? [])
    })
  }, [companyId])

  const validateStep = () => {
    if (step === 0) {
      if (!f.first_name_th) return "กรุณากรอกชื่อ"
      if (!f.last_name_th)  return "กรุณากรอกนามสกุล"
      if (!f.email)         return "กรุณากรอกอีเมล"
    }
    if (step === 1) {
      if (!f.employee_code) return "กรุณากรอกรหัสพนักงาน"
      if (!f.hire_date)     return "กรุณาเลือกวันเริ่มงาน"
    }
    return null
  }

  const next = () => {
    const err = validateStep()
    if (err) { toast.error(err); return }
    setStep(s => s + 1)
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
        body: JSON.stringify({ ...f, company_id: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("เพิ่มพนักงานสำเร็จ!")
      router.push(`/admin/employees/${data.employee_id}`)
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    }
    setLoading(false)
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
              <Field label="ชื่อ (EN)"><Input value={f.first_name_en} onChange={(e:any) => set("first_name_en", e.target.value)} placeholder="First name" /></Field>
              <Field label="นามสกุล (EN)"><Input value={f.last_name_en} onChange={(e:any) => set("last_name_en", e.target.value)} placeholder="Last name" /></Field>
              <Field label="ชื่อเล่น"><Input value={f.nickname} onChange={(e:any) => set("nickname", e.target.value)} placeholder="ชื่อเล่น" /></Field>
              <Field label="เพศ">
                <Select value={f.gender} onChange={(e:any) => set("gender", e.target.value)}>
                  <option value="">ไม่ระบุ</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </Select>
              </Field>
              <Field label="อีเมล" required><Input type="email" value={f.email} onChange={(e:any) => set("email", e.target.value)} placeholder="email@example.com" /></Field>
              <Field label="เบอร์โทร"><Input value={f.phone} onChange={(e:any) => set("phone", e.target.value)} placeholder="08x-xxx-xxxx" /></Field>
              <Field label="วันเกิด"><Input type="date" value={f.birth_date} onChange={(e:any) => set("birth_date", e.target.value)} /></Field>
              <Field label="บัตรประชาชน"><Input value={f.national_id} onChange={(e:any) => set("national_id", e.target.value)} placeholder="13 หลัก" /></Field>
              <Field label="เลขบัญชีธนาคาร"><Input value={f.bank_account} onChange={(e:any) => set("bank_account", e.target.value)} placeholder="xxx-x-xxxxx-x" /></Field>
              <Field label="ธนาคาร"><Input value={f.bank_name} onChange={(e:any) => set("bank_name", e.target.value)} placeholder="ชื่อธนาคาร" /></Field>
              <Field label="เลขประกันสังคม"><Input value={f.social_security_no} onChange={(e:any) => set("social_security_no", e.target.value)} /></Field>
              <Field label="เลขประจำตัวผู้เสียภาษี"><Input value={f.tax_id} onChange={(e:any) => set("tax_id", e.target.value)} /></Field>
            </div>
            <Field label="ที่อยู่">
              <textarea value={f.address} onChange={(e:any) => set("address", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all resize-none h-20" placeholder="ที่อยู่ปัจจุบัน" />
            </Field>
          </div>
        )}

        {/* Step 1 — การจ้างงาน */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800 text-base">ข้อมูลการจ้างงาน</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสพนักงาน" required><Input value={f.employee_code} onChange={(e:any) => set("employee_code", e.target.value)} placeholder="EMP001" /></Field>
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
              <Field label="วันเริ่มงาน" required><Input type="date" value={f.hire_date} onChange={(e:any) => set("hire_date", e.target.value)} /></Field>
              <Field label="สิ้นสุดทดลองงาน"><Input type="date" value={f.probation_end_date} onChange={(e:any) => set("probation_end_date", e.target.value)} /></Field>
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="เงินเดือนฐาน (บาท)" required><Input type="number" value={f.base_salary} onChange={(e:any) => set("base_salary", e.target.value)} placeholder="0" /></Field>
              <Field label="เบี้ยตำแหน่ง"><Input type="number" value={f.allowance_position} onChange={(e:any) => set("allowance_position", e.target.value)} placeholder="0" /></Field>
              <Field label="ค่าเดินทาง"><Input type="number" value={f.allowance_transport} onChange={(e:any) => set("allowance_transport", e.target.value)} placeholder="0" /></Field>
              <Field label="ค่าอาหาร"><Input type="number" value={f.allowance_food} onChange={(e:any) => set("allowance_food", e.target.value)} placeholder="0" /></Field>
              <Field label="ค่าโทรศัพท์"><Input type="number" value={f.allowance_phone} onChange={(e:any) => set("allowance_phone", e.target.value)} placeholder="0" /></Field>
              <Field label="ค่าที่พัก"><Input type="number" value={f.allowance_housing} onChange={(e:any) => set("allowance_housing", e.target.value)} placeholder="0" /></Field>
            </div>
            {/* Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">เงินเดือนฐาน</span><span className="font-bold text-slate-800">฿{(+f.base_salary||0).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">รวมเบี้ยเลี้ยง</span><span className="font-bold text-slate-800">฿{((+f.allowance_position||0)+(+f.allowance_transport||0)+(+f.allowance_food||0)+(+f.allowance_phone||0)+(+f.allowance_housing||0)).toLocaleString()}</span></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm"><span className="text-slate-700 font-semibold">รวมทั้งหมด</span><span className="font-black text-indigo-700 text-base">฿{((+f.base_salary||0)+(+f.allowance_position||0)+(+f.allowance_transport||0)+(+f.allowance_food||0)+(+f.allowance_phone||0)+(+f.allowance_housing||0)).toLocaleString()}</span></div>
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