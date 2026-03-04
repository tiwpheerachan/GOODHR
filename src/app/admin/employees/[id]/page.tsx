"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import { ArrowLeft, Save, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const TABS = ["ข้อมูลส่วนตัว","การจ้างงาน","เงินเดือน","ประวัติหัวหน้า"]

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const supabase = createClient()
  const [emp, setEmp] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [mgrHistory, setMgrHistory] = useState<any[]>([])
  const [allEmps, setAllEmps] = useState<any[]>([])
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>({})
  const [sf, setSf] = useState<any>({})
  const [newMgr, setNewMgr] = useState("")
  const [newMgrDate, setNewMgrDate] = useState(format(new Date(),"yyyy-MM-dd"))
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from("employees").select("*, position:positions(name), department:departments(name), branch:branches(name)").eq("id",id as string).single(),
      supabase.from("salary_structures").select("*").eq("employee_id",id as string).is("effective_to",null).order("effective_from",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("employee_manager_history").select("*, manager:employees!manager_id(id,first_name_th,last_name_th)").eq("employee_id",id as string).order("effective_from",{ascending:false}),
    ]).then(([e,s,h]) => {
      if (e.data) { setEmp(e.data); setForm(e.data) }
      if (s.data) { setSalary(s.data); setSf(s.data) }
      setMgrHistory(h.data ?? [])
    })
    if (user?.employee?.company_id) {
      supabase.from("employees").select("id,first_name_th,last_name_th,employee_code").eq("company_id",user.employee.company_id).neq("id",id as string)
        .then(({ data }) => setAllEmps(data ?? []))
    }
  }, [id, user])

  const saveEmployee = async () => {
    setLoading(true)
    const { error } = await supabase.from("employees").update({ first_name_th:form.first_name_th, last_name_th:form.last_name_th, first_name_en:form.first_name_en, last_name_en:form.last_name_en, phone:form.phone, email:form.email, address:form.address, national_id:form.national_id, bank_account:form.bank_account, bank_name:form.bank_name, nickname:form.nickname }).eq("id",id as string)
    if (error) toast.error("เกิดข้อผิดพลาด"); else toast.success("บันทึกสำเร็จ")
    setLoading(false)
  }

  const saveEmployment = async () => {
    setLoading(true)
    const { error } = await supabase.from("employees").update({ employment_type:form.employment_type, employment_status:form.employment_status, hire_date:form.hire_date, probation_end_date:form.probation_end_date||null, resign_date:form.resign_date||null }).eq("id",id as string)
    if (error) toast.error("เกิดข้อผิดพลาด"); else toast.success("บันทึกสำเร็จ")
    setLoading(false)
  }

  const saveSalary = async () => {
    if (!sf.base_salary) return toast.error("กรุณากรอกเงินเดือน")
    setLoading(true)
    if (salary?.id) await supabase.from("salary_structures").update({ effective_to:sf.effective_from }).eq("id",salary.id)
    const { error } = await supabase.from("salary_structures").insert({ employee_id:id, base_salary:+sf.base_salary, allowance_position:+(sf.allowance_position||0), allowance_transport:+(sf.allowance_transport||0), allowance_food:+(sf.allowance_food||0), allowance_phone:+(sf.allowance_phone||0), allowance_housing:+(sf.allowance_housing||0), ot_rate_normal:+(sf.ot_rate_normal||1.5), ot_rate_holiday:+(sf.ot_rate_holiday||3), effective_from:sf.effective_from||format(new Date(),"yyyy-MM-dd"), change_reason:sf.change_reason, created_by:user?.employee_id })
    if (error) toast.error("เกิดข้อผิดพลาด"); else toast.success("บันทึกเงินเดือนสำเร็จ")
    setLoading(false)
  }

  const addMgr = async () => {
    if (!newMgr) return toast.error("กรุณาเลือกหัวหน้า")
    await supabase.from("employee_manager_history").update({ effective_to:newMgrDate }).eq("employee_id",id as string).is("effective_to",null)
    const { error } = await supabase.from("employee_manager_history").insert({ employee_id:id, manager_id:newMgr, effective_from:newMgrDate, created_by:user?.employee_id })
    if (error) toast.error(error.message); else { toast.success("อัปเดตหัวหน้าสำเร็จ"); window.location.reload() }
  }

  if (!emp) return <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18} /></Link>
        <div><h2 className="text-2xl font-bold text-slate-800">{emp.first_name_th} {emp.last_name_th}</h2><p className="text-slate-500 text-sm">{emp.employee_code} · {emp.position?.name}</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t,i) => <button key={t} onClick={() => setTab(i)} className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap " + (tab===i?"bg-primary-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{t}</button>)}
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        {tab === 0 && <>
          <h3 className="font-bold text-slate-800 mb-4">ข้อมูลส่วนตัว</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["first_name_th","ชื่อ (ไทย)"],["last_name_th","นามสกุล (ไทย)"],["first_name_en","ชื่อ (EN)"],["last_name_en","นามสกุล (EN)"],["nickname","ชื่อเล่น"],["phone","เบอร์โทร"],["email","อีเมล"],["national_id","บัตรประชาชน"],["bank_account","เลขบัญชี"],["bank_name","ธนาคาร"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label><input value={form[k]||""} onChange={e => set(k,e.target.value)} className="input-field" /></div>
            ))}
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label><textarea value={form.address||""} onChange={e => set("address",e.target.value)} className="input-field h-20 resize-none" /></div>
          </div>
          <button onClick={saveEmployee} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}<Save size={14} />บันทึก</button>
        </>}
        {tab === 1 && <>
          <h3 className="font-bold text-slate-800 mb-4">ข้อมูลการจ้างงาน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท</label>
              <select value={form.employment_type||""} onChange={e => set("employment_type",e.target.value)} className="input-field">
                {[["full_time","ประจำ"],["part_time","พาร์ทไทม์"],["contract","สัญญา"],["intern","ฝึกงาน"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">สถานะ</label>
              <select value={form.employment_status||""} onChange={e => set("employment_status",e.target.value)} className="input-field">
                {[["active","ปกติ"],["probation","ทดลองงาน"],["resigned","ลาออก"],["terminated","เลิกจ้าง"],["on_leave","ลา"],["suspended","พักงาน"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันเริ่มงาน</label><input type="date" value={form.hire_date||""} onChange={e => set("hire_date",e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">สิ้นสุดทดลองงาน</label><input type="date" value={form.probation_end_date||""} onChange={e => set("probation_end_date",e.target.value)} className="input-field" /></div>
          </div>
          <button onClick={saveEmployment} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}<Save size={14} />บันทึก</button>
        </>}
        {tab === 2 && <>
          <h3 className="font-bold text-slate-800 mb-4">โครงสร้างเงินเดือน</h3>
          {salary && <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm"><p className="text-green-800 font-semibold">เงินเดือนปัจจุบัน: ฿{salary.base_salary?.toLocaleString()}</p><p className="text-green-600 text-xs">มีผล {format(new Date(salary.effective_from),"d MMM yyyy",{locale:th})}</p></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["base_salary","เงินเดือน (บาท)*"],["allowance_position","เบี้ยตำแหน่ง"],["allowance_transport","ค่าเดินทาง"],["allowance_food","ค่าอาหาร"],["allowance_phone","ค่าโทรศัพท์"],["allowance_housing","ค่าที่พัก"],["ot_rate_normal","อัตรา OT ปกติ (x)"],["ot_rate_holiday","อัตรา OT วันหยุด (x)"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label><input type="number" step="0.01" value={sf[k]||""} onChange={e => setSf((f: any) => ({ ...f, [k]:e.target.value }))} className="input-field" /></div>
            ))}
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่มีผล*</label><input type="date" value={sf.effective_from||""} onChange={e => setSf((f: any) => ({ ...f, effective_from:e.target.value }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล</label><input value={sf.change_reason||""} onChange={e => setSf((f: any) => ({ ...f, change_reason:e.target.value }))} className="input-field" placeholder="เช่น ปรับเงินเดือนประจำปี" /></div>
          </div>
          <button onClick={saveSalary} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}<Save size={14} />บันทึกเงินเดือน</button>
        </>}
        {tab === 3 && <>
          <h3 className="font-bold text-slate-800 mb-4">ประวัติหัวหน้างาน</h3>
          <div className="flex gap-3 mb-5">
            <select value={newMgr} onChange={e => setNewMgr(e.target.value)} className="input-field flex-1">
              <option value="">เลือกหัวหน้าใหม่</option>
              {allEmps.map(e => <option key={e.id} value={e.id}>{e.first_name_th} {e.last_name_th} ({e.employee_code})</option>)}
            </select>
            <input type="date" value={newMgrDate} onChange={e => setNewMgrDate(e.target.value)} className="input-field w-40" />
            <button onClick={addMgr} className="btn-primary px-4 py-2 flex items-center gap-1"><Plus size={14} />เพิ่ม</button>
          </div>
          <div className="space-y-3">
            {mgrHistory.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{h.manager?.first_name_th} {h.manager?.last_name_th}</p><p className="text-xs text-slate-500">{format(new Date(h.effective_from),"d MMM yyyy",{locale:th})} - {h.effective_to ? format(new Date(h.effective_to),"d MMM yyyy",{locale:th}) : "ปัจจุบัน"}</p></div>
                {!h.effective_to && <span className="badge bg-green-100 text-green-700">ปัจจุบัน</span>}
              </div>
            ))}
            {mgrHistory.length === 0 && <p className="text-center text-slate-400 text-sm py-4">ไม่มีประวัติ</p>}
          </div>
        </>}
      </div>
    </div>
  )
}
