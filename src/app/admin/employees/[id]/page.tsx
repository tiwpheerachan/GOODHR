"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import { ArrowLeft, Save, Loader2, Plus, User, Briefcase, DollarSign, GitBranch } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const cls = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full"

const Field = ({ label, required, children }: any) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

const TABS = [
  { label: "ข้อมูลส่วนตัว", icon: User },
  { label: "การจ้างงาน",    icon: Briefcase },
  { label: "เงินเดือน",     icon: DollarSign },
  { label: "หัวหน้างาน",   icon: GitBranch },
]

export default function EmployeeDetailPage() {
  const { id }   = useParams()
  const { user } = useAuth()
  const supabase = createClient()

  const [emp,        setEmp]        = useState<any>(null)
  const [salary,     setSalary]     = useState<any>(null)
  const [mgrHistory, setMgrHistory] = useState<any[]>([])
  const [allEmps,    setAllEmps]    = useState<any[]>([])
  const [depts,      setDepts]      = useState<any[]>([])
  const [positions,  setPositions]  = useState<any[]>([])
  const [branches,   setBranches]   = useState<any[]>([])
  const [tab,        setTab]        = useState(0)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<any>({})
  const [sf,         setSf]         = useState<any>({})
  const [newMgr,     setNewMgr]     = useState("")
  const [newMgrDate, setNewMgrDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const set  = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setSF = (k: string, v: any) => setSf((f: any) => ({ ...f, [k]: v }))

  // ── fallback company_id ──────────────────────────────────────────
  const companyId: string | undefined =
    emp?.company_id ??
    user?.employee?.company_id ??
    (user as any)?.company_id ?? undefined

  // ── load employee data ───────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from("employees")
        .select("*, position:positions(id,name), department:departments(id,name), branch:branches(id,name)")
        .eq("id", id as string).single(),
      supabase.from("salary_structures")
        .select("*").eq("employee_id", id as string)
        .is("effective_to", null).order("effective_from", { ascending: false })
        .limit(1).maybeSingle(),
      supabase.from("employee_manager_history")
        .select("*, manager:employees!manager_id(id,first_name_th,last_name_th,employee_code)")
        .eq("employee_id", id as string).order("effective_from", { ascending: false }),
    ]).then(([e, s, h]) => {
      if (e.data) { setEmp(e.data); setForm(e.data) }
      if (s.data) { setSalary(s.data); setSf(s.data) }
      setMgrHistory(h.data ?? [])
    })
  }, [id])

  // ── load meta (depts, positions, branches, all employees) ────────
  useEffect(() => {
    if (!companyId) return
    Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("positions").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("branches").select("id,name").eq("company_id", companyId).eq("is_active", true).order("name"),
      supabase.from("employees").select("id,first_name_th,last_name_th,employee_code")
        .eq("company_id", companyId).eq("is_active", true).neq("id", id as string).order("first_name_th"),
    ]).then(([d, p, b, em]) => {
      setDepts(d.data ?? [])
      setPositions(p.data ?? [])
      setBranches(b.data ?? [])
      setAllEmps(em.data ?? [])
    })
  }, [companyId, id])

  // ── save personal info ───────────────────────────────────────────
  const savePersonal = async () => {
    setSaving(true)
    const { error } = await supabase.from("employees").update({
      first_name_th: form.first_name_th,
      last_name_th:  form.last_name_th,
      first_name_en: form.first_name_en || null,
      last_name_en:  form.last_name_en  || null,
      nickname:      form.nickname      || null,
      gender:        form.gender        || null,
      birth_date:    form.birth_date    || null,
      national_id:   form.national_id   || null,
      phone:         form.phone         || null,
      email:         form.email         || null,
      address:       form.address       || null,
      bank_name:     form.bank_name     || null,
      bank_account:  form.bank_account  || null,  // ← ใช้ bank_account ถูกต้อง
      tax_id:        form.tax_id        || null,
      social_security_no: form.social_security_no || null,
    }).eq("id", id as string)
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message)
    else toast.success("✓ บันทึกข้อมูลส่วนตัวแล้ว")
    setSaving(false)
  }

  // ── save employment ──────────────────────────────────────────────
  const saveEmployment = async () => {
    setSaving(true)
    const { error } = await supabase.from("employees").update({
      employment_type:   form.employment_type,
      employment_status: form.employment_status,
      hire_date:         form.hire_date         || null,
      probation_end_date:form.probation_end_date || null,
      resign_date:       form.resign_date        || null,
      department_id:     form.department_id      || null,
      position_id:       form.position_id        || null,
      branch_id:         form.branch_id          || null,
    }).eq("id", id as string)
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message)
    else { toast.success("✓ บันทึกข้อมูลการจ้างงานแล้ว"); setEmp((e: any) => ({ ...e, ...form })) }
    setSaving(false)
  }

  // ── save salary ──────────────────────────────────────────────────
  const saveSalary = async () => {
    if (!sf.base_salary) return toast.error("กรุณากรอกเงินเดือน")
    if (!sf.effective_from) return toast.error("กรุณาระบุวันที่มีผล")
    setSaving(true)
    try {
      if (salary?.id) {
        await supabase.from("salary_structures")
          .update({ effective_to: sf.effective_from }).eq("id", salary.id)
      }
      const { error } = await supabase.from("salary_structures").insert({
        employee_id:          id,
        base_salary:          +sf.base_salary,
        allowance_position:   +(sf.allowance_position  || 0),
        allowance_transport:  +(sf.allowance_transport || 0),
        allowance_food:       +(sf.allowance_food      || 0),
        allowance_phone:      +(sf.allowance_phone     || 0),
        allowance_housing:    +(sf.allowance_housing   || 0),
        ot_rate_normal:       +(sf.ot_rate_normal      || 1.5),
        ot_rate_holiday:      +(sf.ot_rate_holiday     || 3),
        effective_from:       sf.effective_from,
        change_reason:        sf.change_reason || null,
        created_by:           user?.employee_id || null,
      })
      if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message)
      else { toast.success("✓ บันทึกเงินเดือนแล้ว"); setSalary({ ...sf }) }
    } finally {
      setSaving(false)
    }
  }

  // ── add manager ──────────────────────────────────────────────────
  const addMgr = async () => {
    if (!newMgr) return toast.error("กรุณาเลือกหัวหน้า")
    await supabase.from("employee_manager_history")
      .update({ effective_to: newMgrDate })
      .eq("employee_id", id as string).is("effective_to", null)
    const { error } = await supabase.from("employee_manager_history").insert({
      employee_id:   id,
      manager_id:    newMgr,
      effective_from: newMgrDate,
      created_by:    user?.employee_id || null,
    })
    if (error) toast.error(error.message)
    else {
      toast.success("✓ อัปเดตหัวหน้าแล้ว")
      const { data } = await supabase.from("employee_manager_history")
        .select("*, manager:employees!manager_id(id,first_name_th,last_name_th,employee_code)")
        .eq("employee_id", id as string).order("effective_from", { ascending: false })
      setMgrHistory(data ?? [])
      setNewMgr("")
    }
  }

  const totalSalary = sf.base_salary
    ? [sf.base_salary, sf.allowance_position, sf.allowance_transport,
       sf.allowance_food, sf.allowance_phone, sf.allowance_housing]
        .reduce((a, b) => a + (+(b || 0)), 0)
    : 0

  if (!emp) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg overflow-hidden">
            {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.first_name_th?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{emp.first_name_th} {emp.last_name_th}
              {emp.nickname && <span className="text-slate-400 font-normal text-base ml-2">({emp.nickname})</span>}
            </h2>
            <p className="text-slate-400 text-sm">{emp.employee_code} · {emp.position?.name || "ไม่ระบุตำแหน่ง"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === i ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">

        {/* ── Tab 0: Personal ─────────────────────────────────────── */}
        {tab === 0 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800">ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="ชื่อ (ไทย)" required>
                <input value={form.first_name_th || ""} onChange={e => set("first_name_th", e.target.value)} className={cls} />
              </Field>
              <Field label="นามสกุล (ไทย)" required>
                <input value={form.last_name_th || ""} onChange={e => set("last_name_th", e.target.value)} className={cls} />
              </Field>
              <Field label="ชื่อ (EN)">
                <input value={form.first_name_en || ""} onChange={e => set("first_name_en", e.target.value)} className={cls} />
              </Field>
              <Field label="นามสกุล (EN)">
                <input value={form.last_name_en || ""} onChange={e => set("last_name_en", e.target.value)} className={cls} />
              </Field>
              <Field label="ชื่อเล่น">
                <input value={form.nickname || ""} onChange={e => set("nickname", e.target.value)} className={cls} />
              </Field>
              <Field label="เพศ">
                <select value={form.gender || ""} onChange={e => set("gender", e.target.value)} className={cls}>
                  <option value="">ไม่ระบุ</option>
                  <option value="M">ชาย</option>
                  <option value="F">หญิง</option>
                </select>
              </Field>
              <Field label="วันเกิด">
                <input type="date" value={form.birth_date || ""} onChange={e => set("birth_date", e.target.value)} className={cls} />
              </Field>
              <Field label="เลขบัตรประชาชน">
                <input value={form.national_id || ""} onChange={e => set("national_id", e.target.value)} className={cls} maxLength={13} />
              </Field>
              <Field label="เบอร์โทร">
                <input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className={cls} />
              </Field>
              <Field label="อีเมล">
                <input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} className={cls} />
              </Field>
              <Field label="ธนาคาร">
                <input value={form.bank_name || ""} onChange={e => set("bank_name", e.target.value)} className={cls} placeholder="เช่น SCB, KBank" />
              </Field>
              <Field label="เลขบัญชีธนาคาร">
                <input value={form.bank_account || ""} onChange={e => set("bank_account", e.target.value)} className={cls} placeholder="xxx-x-xxxxx-x" />
              </Field>
              <Field label="เลขผู้เสียภาษี">
                <input value={form.tax_id || ""} onChange={e => set("tax_id", e.target.value)} className={cls} />
              </Field>
              <Field label="เลขประกันสังคม">
                <input value={form.social_security_no || ""} onChange={e => set("social_security_no", e.target.value)} className={cls} />
              </Field>
              <div className="md:col-span-2">
                <Field label="ที่อยู่">
                  <textarea value={form.address || ""} onChange={e => set("address", e.target.value)} className={cls + " resize-none h-20"} />
                </Field>
              </div>
            </div>
            <button onClick={savePersonal} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
            </button>
          </div>
        )}

        {/* ── Tab 1: Employment ───────────────────────────────────── */}
        {tab === 1 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800">ข้อมูลการจ้างงาน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="แผนก">
                <select value={form.department_id || ""} onChange={e => set("department_id", e.target.value)} className={cls}>
                  <option value="">ไม่ระบุ</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="ตำแหน่ง">
                <select value={form.position_id || ""} onChange={e => set("position_id", e.target.value)} className={cls}>
                  <option value="">ไม่ระบุ</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="สาขา">
                <select value={form.branch_id || ""} onChange={e => set("branch_id", e.target.value)} className={cls}>
                  <option value="">ไม่ระบุ</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="ประเภทการจ้าง">
                <select value={form.employment_type || ""} onChange={e => set("employment_type", e.target.value)} className={cls}>
                  <option value="full_time">ประจำ</option>
                  <option value="part_time">พาร์ทไทม์</option>
                  <option value="contract">สัญญา</option>
                  <option value="intern">ฝึกงาน</option>
                </select>
              </Field>
              <Field label="สถานะ">
                <select value={form.employment_status || ""} onChange={e => set("employment_status", e.target.value)} className={cls}>
                  <option value="active">ปกติ</option>
                  <option value="probation">ทดลองงาน</option>
                  <option value="resigned">ลาออก</option>
                  <option value="terminated">เลิกจ้าง</option>
                  <option value="on_leave">ลา</option>
                  <option value="suspended">พักงาน</option>
                </select>
              </Field>
              <Field label="วันเริ่มงาน">
                <input type="date" value={form.hire_date || ""} onChange={e => set("hire_date", e.target.value)} className={cls} />
              </Field>
              <Field label="สิ้นสุดทดลองงาน">
                <input type="date" value={form.probation_end_date || ""} onChange={e => set("probation_end_date", e.target.value)} className={cls} />
              </Field>
              <Field label="วันที่ลาออก / สิ้นสุดสัญญา">
                <input type="date" value={form.resign_date || ""} onChange={e => set("resign_date", e.target.value)} className={cls} />
              </Field>
            </div>
            <button onClick={saveEmployment} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
            </button>
          </div>
        )}

        {/* ── Tab 2: Salary ───────────────────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800">โครงสร้างเงินเดือน</h3>
            {salary && (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-4">
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide">เงินเดือนปัจจุบัน</p>
                  <p className="text-2xl font-black text-green-800">฿{salary.base_salary?.toLocaleString()}</p>
                  <p className="text-xs text-green-500 mt-0.5">มีผลตั้งแต่ {format(new Date(salary.effective_from), "d MMMM yyyy", { locale: th })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-500">รวมทั้งสิ้น</p>
                  <p className="text-lg font-black text-green-700">฿{(
                    [salary.base_salary, salary.allowance_position, salary.allowance_transport,
                     salary.allowance_food, salary.allowance_phone, salary.allowance_housing]
                     .reduce((a, b) => a + (+(b || 0)), 0)
                  ).toLocaleString()}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["base_salary",         "เงินเดือนฐาน (บาท)", true],
                ["allowance_position",  "เบี้ยตำแหน่ง"],
                ["allowance_transport", "ค่าเดินทาง"],
                ["allowance_food",      "ค่าอาหาร"],
                ["allowance_phone",     "ค่าโทรศัพท์"],
                ["allowance_housing",   "ค่าที่พัก"],
                ["ot_rate_normal",      "อัตรา OT ปกติ (x)"],
                ["ot_rate_holiday",     "อัตรา OT วันหยุด (x)"],
              ].map(([k, l, req]: any) => (
                <Field key={k} label={l} required={req}>
                  <input type="number" step="0.01" min="0"
                    value={sf[k] || ""} onChange={e => setSF(k, e.target.value)} className={cls} />
                </Field>
              ))}
              <Field label="วันที่มีผล" required>
                <input type="date" value={sf.effective_from || ""} onChange={e => setSF("effective_from", e.target.value)} className={cls} />
              </Field>
              <Field label="เหตุผล">
                <input value={sf.change_reason || ""} onChange={e => setSF("change_reason", e.target.value)} className={cls} placeholder="เช่น ปรับเงินเดือนประจำปี" />
              </Field>
            </div>
            {totalSalary > 0 && (
              <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600">รวมทั้งสิ้น (ที่กำลังกรอก)</span>
                <span className="text-lg font-black text-indigo-700">฿{totalSalary.toLocaleString()}</span>
              </div>
            )}
            <button onClick={saveSalary} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึกเงินเดือน
            </button>
          </div>
        )}

        {/* ── Tab 3: Manager History ──────────────────────────────── */}
        {tab === 3 && (
          <div className="space-y-5">
            <h3 className="font-black text-slate-800">ประวัติหัวหน้างาน</h3>
            <div className="flex gap-3 flex-wrap">
              <select value={newMgr} onChange={e => setNewMgr(e.target.value)} className={cls + " flex-1 min-w-48"}>
                <option value="">เลือกหัวหน้าใหม่...</option>
                {allEmps.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.first_name_th} {e.last_name_th} ({e.employee_code})
                  </option>
                ))}
              </select>
              <input type="date" value={newMgrDate} onChange={e => setNewMgrDate(e.target.value)} className={cls + " w-40"} />
              <button onClick={addMgr}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                <Plus size={14} /> เพิ่ม
              </button>
            </div>
            <div className="space-y-2">
              {mgrHistory.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0">
                    {h.manager?.first_name_th?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">{h.manager?.first_name_th} {h.manager?.last_name_th}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(h.effective_from), "d MMM yyyy", { locale: th })}
                      {" – "}
                      {h.effective_to ? format(new Date(h.effective_to), "d MMM yyyy", { locale: th }) : "ปัจจุบัน"}
                    </p>
                  </div>
                  {!h.effective_to && (
                    <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">ปัจจุบัน</span>
                  )}
                </div>
              ))}
              {mgrHistory.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">ยังไม่มีประวัติหัวหน้างาน</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}