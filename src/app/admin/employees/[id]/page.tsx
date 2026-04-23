"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, Save, Loader2, Plus, MapPin, Check, X, Building2, Trash2,
  Clock, Calendar, DollarSign, BarChart2, User2, ChevronRight, CalendarClock,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, UserX, UserCheck, History, Globe, ShieldAlert, Pencil
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const TABS = ["สรุปข้อมูล","ข้อมูลส่วนตัว","การจ้างงาน","เงินเดือน","สรุปเงินเดือน","ตารางงาน","สิทธิ์เช็คอิน","ประวัติหัวหน้า","บทบาท","โควต้าการลา"]
const inp = "input-field"

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(n?: number | null) {
  if (n == null) return "—"
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDec(n?: number | null) {
  if (n == null) return "—"
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const supabase = createClient()

  const [emp,        setEmp]        = useState<any>(null)
  const [salary,     setSalary]     = useState<any>(null)
  const [mgrHistory, setMgrHistory] = useState<any[]>([])
  const [allEmps,    setAllEmps]    = useState<any[]>([])
  const [tab,        setTab]        = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [form,       setForm]       = useState<any>({})
  const [sf,         setSf]         = useState<any>({})
  const [newMgr,     setNewMgr]     = useState("")
  const [newMgrDate, setNewMgrDate] = useState(format(new Date(),"yyyy-MM-dd"))
  const [mgrSearch, setMgrSearch] = useState<string | null>(null)
  const [showMgrDropdown, setShowMgrDropdown] = useState(false)
  // KPI evaluator
  const [kpiEvalSearch, setKpiEvalSearch] = useState<string | null>(null)
  const [showKpiEvalDropdown, setShowKpiEvalDropdown] = useState(false)
  // resign modal
  const [kpiSetting, setKpiSetting] = useState<any>(null)
  const [kpiAmount,  setKpiAmount]  = useState<string>("")
  const [showResignModal, setShowResignModal] = useState(false)
  const [resignDate, setResignDate] = useState(format(new Date(),"yyyy-MM-dd"))
  const [resignReason, setResignReason] = useState("")
  const [resignLoading, setResignLoading] = useState(false)
  const [resignHistory, setResignHistory] = useState<any[]>([])
  const [showReinstateModal, setShowReinstateModal] = useState(false)
  // promote (pass probation)
  const [promotion, setPromotion] = useState<any>(null)
  const [promoteLoading, setPromoteLoading] = useState(false)
  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [newPositionName, setNewPositionName] = useState("")
  const [creatingPosition, setCreatingPosition] = useState(false)
  const [newDeptName, setNewDeptName] = useState("")
  const [creatingDept, setCreatingDept] = useState(false)

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const createDepartment = async () => {
    const cid = form?.company_id || emp?.company_id
    if (!newDeptName.trim()) { toast.error("กรุณากรอกชื่อแผนก"); return }
    if (!cid) { toast.error("ไม่พบบริษัท"); return }
    setCreatingDept(true)
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_department", name: newDeptName.trim(), company_id: cid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "สร้างแผนกไม่สำเร็จ")
      const newDept = { id: data.department_id, name: newDeptName.trim() }
      setDepartments((prev: any[]) => [...prev, newDept].sort((a, b) => a.name.localeCompare(b.name)))
      set("department_id", data.department_id)
      setNewDeptName("")
      toast.success(`เพิ่มแผนก "${newDeptName.trim()}" แล้ว`)
    } catch (e: any) { toast.error(e.message || "ไม่สามารถสร้างแผนกได้") }
    setCreatingDept(false)
  }

  const createPosition = async () => {
    const cid = form?.company_id || emp?.company_id
    if (!newPositionName.trim()) { toast.error("กรุณากรอกชื่อตำแหน่ง"); return }
    if (!cid) { toast.error("ไม่พบบริษัท"); return }
    setCreatingPosition(true)
    try {
      const { data, error } = await supabase.from("positions").insert({
        name: newPositionName.trim(), company_id: cid,
      }).select("id, name").single()
      if (error) throw error
      setPositions((prev: any[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      set("position_id", data.id)
      setNewPositionName("")
      toast.success(`เพิ่มตำแหน่ง "${data.name}" แล้ว`)
    } catch (e: any) { toast.error(e.message || "ไม่สามารถสร้างตำแหน่งได้") }
    setCreatingPosition(false)
  }

  // ── โหลดข้อมูลหลักทั้งหมดพร้อมกันใน Promise.all เดียว ──
  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from("employees").select("*, position:positions(name), department:departments(name), branch:branches(name)").eq("id",id as string).single(),
      supabase.from("salary_structures").select("*").eq("employee_id",id as string).is("effective_to",null).order("effective_from",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("employee_manager_history").select("*, manager:employees!manager_id(id,first_name_th,last_name_th)").eq("employee_id",id as string).order("effective_from",{ascending:false}),
      supabase.from("kpi_bonus_settings").select("*").eq("employee_id",id as string).eq("is_active",true).maybeSingle(),
      supabase.from("resignation_history").select("*").eq("employee_id",id as string).order("created_at",{ascending:false}),
      supabase.from("employee_probation_promotions").select("*, new_position:positions(name)").eq("employee_id",id as string).eq("is_applied",false).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th"),
    ]).then(([e, s, h, kpi, resign, promo, comp]) => {
      if (e.data) {
        setEmp(e.data); setForm(e.data)
        // ── โหลด kpi_evaluator แยก (column อาจยังไม่มีถ้ายังไม่รัน migration) ──
        if (e.data.kpi_evaluator_id) {
          supabase.from("employees").select("id,first_name_th,last_name_th,employee_code")
            .eq("id", e.data.kpi_evaluator_id).single()
            .then(({ data: ev }) => {
              if (ev) setKpiEvalSearch(`${ev.first_name_th} ${ev.last_name_th} (${ev.employee_code})`)
            })
        }
      }
      if (s.data) { setSalary(s.data); setSf(s.data) }
      setMgrHistory(h.data ?? [])
      if (kpi.data) { setKpiSetting(kpi.data); setKpiAmount(kpi.data?.standard_amount?.toString() || "") }
      setResignHistory(resign.data ?? [])
      setPromotion(promo.data ?? null)
      setCompanies(comp.data ?? [])
    })
  }, [id, user])

  // ── lazy-load รายชื่อพนักงาน: โหลดเฉพาะเมื่อเปิด dropdown ──
  const allEmpsLoaded = useRef(false)
  const loadAllEmps = useCallback(async () => {
    if (allEmpsLoaded.current || !id) return
    allEmpsLoaded.current = true
    const { data } = await supabase.from("employees").select("id,first_name_th,last_name_th,employee_code").eq("is_active",true).neq("id",id as string).order("first_name_th")
    setAllEmps(data ?? [])
  }, [id])

  // โหลดแผนก/ตำแหน่ง/สาขา ตาม company ของพนักงาน
  useEffect(() => {
    const cid = form.company_id
    if (!cid) return
    Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", cid).order("name"),
      supabase.from("positions").select("id,name").eq("company_id", cid).order("name"),
      supabase.from("branches").select("id,name").eq("company_id", cid).order("name"),
    ]).then(([d, p, b]) => {
      setDepartments(d.data ?? [])
      setPositions(p.data ?? [])
      setBranches(b.data ?? [])
    })
  }, [form.company_id]) // eslint-disable-line

  const saveEmployee = async () => {
    setLoading(true)
    const emailChanged = form.email && form.email !== (emp?.email || "")

    // ── ถ้าอีเมลเปลี่ยน → เรียก API เปลี่ยน auth + users + employees ──
    if (emailChanged) {
      try {
        const res = await fetch("/api/auth/change-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: id, new_email: form.email.trim().toLowerCase() }),
        })
        const d = await res.json()
        if (!res.ok) {
          toast.error(`อีเมล: ${d.error}`)
          setLoading(false)
          return
        }
        toast.success(`เปลี่ยนอีเมลล็อกอินเป็น ${form.email} สำเร็จ`)
      } catch {
        toast.error("ไม่สามารถ sync อีเมลกับระบบล็อกอินได้")
        setLoading(false)
        return
      }
    }

    // ── บันทึกข้อมูลส่วนตัว (รวมอีเมลใหม่) ──
    const { error } = await supabase.from("employees").update({ first_name_th:form.first_name_th, last_name_th:form.last_name_th, first_name_en:form.first_name_en, last_name_en:form.last_name_en, phone:form.phone, email:form.email, address:form.address, national_id:form.national_id, bank_account:form.bank_account, bank_name:form.bank_name, nickname:form.nickname }).eq("id",id as string)
    if (error) toast.error("เกิดข้อผิดพลาดในการบันทึก")
    else if (!emailChanged) toast.success("บันทึกสำเร็จ")

    // อัพเดท emp state ให้ตรงกับข้อมูลใหม่
    setEmp((prev: any) => ({ ...prev, ...form }))
    setLoading(false)
  }

  const saveEmployment = async () => {
    // Validate: ป้องกันปี พ.ศ. (> 2100)
    const yearCheck = (d: string | null | undefined, label: string) => {
      if (!d) return true
      const y = parseInt(d.split("-")[0])
      if (y > 2100) { toast.error(`${label}: ปีต้องเป็น ค.ศ. (เช่น 2026) ไม่ใช่ พ.ศ. (${y})`); return false }
      return true
    }
    if (!yearCheck(form.hire_date, "วันเริ่มงาน") || !yearCheck(form.probation_end_date, "สิ้นสุดทดลองงาน")) return

    setLoading(true)
    const updateData: any = {
      company_id: form.company_id || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      branch_id: form.branch_id || null,
      employment_type: form.employment_type,
      employment_status: form.employment_status,
      hire_date: form.hire_date,
      probation_end_date: form.probation_end_date || null,
      resign_date: form.resign_date || null,
      is_attendance_exempt: !!form.is_attendance_exempt,
    }
    // เพิ่ม kpi_evaluator_id เฉพาะเมื่อมี field อยู่ (หลังรัน migration แล้ว)
    if ("kpi_evaluator_id" in form) updateData.kpi_evaluator_id = form.kpi_evaluator_id || null
    const { error } = await supabase.from("employees").update(updateData).eq("id", id as string)
    if (error) toast.error("เกิดข้อผิดพลาด"); else {
      toast.success("บันทึกสำเร็จ")
      // อัปเดต users table ด้วย company_id ถ้าเปลี่ยน
      if (form.company_id && form.company_id !== emp?.company_id) {
        await supabase.from("users").update({ company_id: form.company_id }).eq("employee_id", id as string)
      }
      setEmp((prev: any) => ({ ...prev, company_id: form.company_id, department_id: form.department_id, position_id: form.position_id, branch_id: form.branch_id }))
    }
    setLoading(false)
  }

  const saveSalary = async () => {
    if (!sf.base_salary) return toast.error("กรุณากรอกเงินเดือน")
    setLoading(true)
    if (salary?.id) await supabase.from("salary_structures").update({ effective_to:sf.effective_from }).eq("id",salary.id)
    const { error } = await supabase.from("salary_structures").insert({ employee_id:id, base_salary:+sf.base_salary, allowance_position:+(sf.allowance_position||0), allowance_transport:+(sf.allowance_transport||0), allowance_food:+(sf.allowance_food||0), allowance_phone:+(sf.allowance_phone||0), allowance_housing:+(sf.allowance_housing||0), ot_rate_normal:+(sf.ot_rate_normal||1.5), ot_rate_holiday:+(sf.ot_rate_holiday||3), tax_withholding_pct: sf.tax_withholding_pct != null && sf.tax_withholding_pct !== "" ? +sf.tax_withholding_pct : null, effective_from:sf.effective_from||format(new Date(),"yyyy-MM-dd"), change_reason:sf.change_reason, created_by:user?.employee_id })
    if (error) toast.error("เกิดข้อผิดพลาด"); else toast.success("บันทึกเงินเดือนสำเร็จ")
    setLoading(false)
  }

  const saveKpi = async () => {
    setLoading(true)
    const amt = parseFloat(kpiAmount) || 0
    if (kpiSetting?.id) {
      // update existing
      const { error } = await supabase.from("kpi_bonus_settings").update({ standard_amount: amt }).eq("id", kpiSetting.id)
      if (error) toast.error("เกิดข้อผิดพลาด"); else { toast.success("บันทึก KPI สำเร็จ"); setKpiSetting({ ...kpiSetting, standard_amount: amt }) }
    } else {
      // insert new
      const { data, error } = await supabase.from("kpi_bonus_settings").insert({ employee_id: id, standard_amount: amt, is_active: true }).select().single()
      if (error) toast.error("เกิดข้อผิดพลาด"); else { toast.success("บันทึก KPI สำเร็จ"); setKpiSetting(data) }
    }
    setLoading(false)
  }

  const addMgr = async () => {
    if (!newMgr) return toast.error("กรุณาเลือกหัวหน้า")
    try {
      const res = await fetch("/api/employees/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id, manager_id: newMgr, effective_from: newMgrDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "อัปเดตหัวหน้าไม่สำเร็จ")
      toast.success("อัปเดตหัวหน้าสำเร็จ")
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleResign = async () => {
    setResignLoading(true)
    try {
      const res = await fetch("/api/employees/resign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resign", employee_id: id, resign_date: resignDate, resign_reason: resignReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "เกิดข้อผิดพลาด"); return }
      toast.success(data.message || "บันทึกลาออกเรียบร้อย")
      setShowResignModal(false)
      setResignReason("")
      // reload
      window.location.reload()
    } catch { toast.error("เกิดข้อผิดพลาด") }
    finally { setResignLoading(false) }
  }

  const handleReinstate = async () => {
    setResignLoading(true)
    try {
      const res = await fetch("/api/employees/resign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstate", employee_id: id, previous_status: "active", resign_reason: resignReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "เกิดข้อผิดพลาด"); return }
      toast.success(data.message || "ดึงกลับเรียบร้อย")
      setShowReinstateModal(false)
      setResignReason("")
      window.location.reload()
    } catch { toast.error("เกิดข้อผิดพลาด") }
    finally { setResignLoading(false) }
  }

  const handlePromote = async () => {
    setPromoteLoading(true)
    try {
      const res = await fetch("/api/employees/promote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id, promotion_id: promotion?.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "เกิดข้อผิดพลาด"); return }
      toast.success(data.message || "ยืนยันผ่านทดลองงานสำเร็จ")
      window.location.reload()
    } catch { toast.error("เกิดข้อผิดพลาด") }
    finally { setPromoteLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/employees/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", employee_id: id, reason: deleteReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "เกิดข้อผิดพลาด"); return }
      toast.success(data.message || "ลบพนักงานเรียบร้อย")
      setShowDeleteModal(false)
      window.location.href = "/admin/employees"
    } catch { toast.error("เกิดข้อผิดพลาด") }
    finally { setDeleteLoading(false) }
  }

  if (!emp) return <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 size={18} className="animate-spin"/>กำลังโหลด...</div>

  const empStatusMap: Record<string,string> = { active:"ปกติ", probation:"ทดลองงาน", resigned:"ลาออก", terminated:"เลิกจ้าง", on_leave:"ลา", suspended:"พักงาน" }
  const empStatusColor: Record<string,string> = { active:"bg-green-100 text-green-700", probation:"bg-amber-100 text-amber-700", resigned:"bg-slate-100 text-slate-500", terminated:"bg-red-100 text-red-600", on_leave:"bg-blue-100 text-blue-700", suspended:"bg-orange-100 text-orange-700" }

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm ${
            emp.employment_status === "resigned" ? "bg-gradient-to-br from-slate-400 to-slate-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"
          }`}>
            {emp.first_name_th?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{emp.first_name_th} {emp.last_name_th}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-400 text-xs">{emp.employee_code}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 text-xs">{emp.position?.name}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 text-xs">{emp.department?.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 ${empStatusColor[emp.employment_status] ?? "bg-slate-100 text-slate-500"}`}>
                {empStatusMap[emp.employment_status] ?? emp.employment_status}
              </span>
            </div>
          </div>
        </div>
        {/* ── Resign / Reinstate button ── */}
        <div className="flex items-center gap-2">
          {emp.employment_status === "resigned" || emp.employment_status === "terminated" ? (
            <button onClick={() => { setResignReason(""); setShowReinstateModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm">
              <UserCheck size={14}/>ดึงกลับ
            </button>
          ) : (
            <button onClick={() => { setResignReason(""); setResignDate(format(new Date(),"yyyy-MM-dd")); setShowResignModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all">
              <UserX size={14}/>แจ้งลาออก
            </button>
          )}
          {/* ── ปุ่มลบ (super_admin/hr_admin เท่านั้น) ── */}
          {(user?.role === "super_admin" || user?.role === "hr_admin") && !emp.deleted_at && (
            <button onClick={() => { setDeleteReason(""); setShowDeleteModal(true) }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all">
              <Trash2 size={13}/>ลบ
            </button>
          )}
        </div>
      </div>

      {/* ── Resigned banner ── */}
      {(emp.employment_status === "resigned" || emp.employment_status === "terminated") && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <UserX size={18} className="text-red-500"/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800">
              {emp.employment_status === "resigned" ? "พนักงานลาออกแล้ว" : "เลิกจ้างแล้ว"}
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              {emp.resign_date ? `วันที่มีผล: ${format(new Date(emp.resign_date + "T00:00:00"),"d MMMM yyyy",{locale:th})}` : "ไม่ระบุวันที่"}
              {" · "}ข้อมูลยังคงอยู่ในระบบ · ไม่รวมในเงินเดือน
            </p>
          </div>
          <button onClick={() => { setResignReason(""); setShowReinstateModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all">
            <UserCheck size={13}/>ดึงกลับเข้ามา
          </button>
        </div>
      )}

      {/* ── Probation promotion banner ── */}
      {emp.employment_status === "probation" && (
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
          promotion
            ? "bg-amber-50 border-2 border-amber-300"
            : "bg-slate-50 border border-slate-200"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${promotion ? "bg-amber-100" : "bg-slate-100"}`}>
            <Clock size={18} className={promotion ? "text-amber-600" : "text-slate-400"}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${promotion ? "text-amber-800" : "text-slate-600"}`}>
              {emp.probation_end_date
                ? `ทดลองงานถึง ${format(new Date(emp.probation_end_date + "T00:00:00"),"d MMMM yyyy",{locale:th})}`
                : "อยู่ในช่วงทดลองงาน"}
            </p>
            {promotion && (
              <p className="text-xs text-amber-600 mt-0.5">
                มีการตั้งค่าหลังผ่านทดลองงานรออยู่
                {promotion.base_salary && ` · เงินเดือนใหม่ ฿${(+promotion.base_salary).toLocaleString()}`}
                {promotion.new_position?.name && ` · ตำแหน่ง "${promotion.new_position.name}"`}
                {promotion.kpi_standard_amount != null && ` · KPI ฿${(+promotion.kpi_standard_amount).toLocaleString()}`}
              </p>
            )}
          </div>
          <button
            onClick={handlePromote}
            disabled={promoteLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm flex-shrink-0">
            {promoteLoading ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
            ยืนยันผ่านทดลองงาน
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              tab===i ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">

        {/* ── Tab 0: สรุปข้อมูล ── */}
        {tab === 0 && <SummaryTab employeeId={id as string} emp={emp} salary={salary} kpiSetting={kpiSetting}/>}

        {/* ── Tab 1: ข้อมูลส่วนตัว ── */}
        {tab === 1 && <>
          <h3 className="font-bold text-slate-800 mb-4">ข้อมูลส่วนตัว</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["first_name_th","ชื่อ (ไทย)"],["last_name_th","นามสกุล (ไทย)"],["first_name_en","ชื่อ (EN)"],["last_name_en","นามสกุล (EN)"],["nickname","ชื่อเล่น"],["phone","เบอร์โทร"],["national_id","บัตรประชาชน"],["bank_account","เลขบัญชี"],["bank_name","ธนาคาร"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label><input value={form[k]||""} onChange={e => set(k,e.target.value)} className={inp}/></div>
            ))}
            {/* อีเมล — แสดงแยกเพื่อบอกว่ากระทบระบบล็อกอิน */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-blue-800 mb-1">อีเมล (ใช้เข้าสู่ระบบ)</label>
              <p className="text-[11px] text-blue-600 mb-2">การเปลี่ยนอีเมลจะอัปเดตอีเมลล็อกอินของพนักงานด้วย — พนักงานต้องใช้อีเมลใหม่ในการเข้าสู่ระบบ</p>
              <input value={form.email||""} onChange={e => set("email",e.target.value)} placeholder="example@company.com" className={inp + " border-blue-300 focus:border-blue-500"}/>
              {form.email && form.email !== (emp?.email || "") && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> จะเปลี่ยนจาก {emp?.email || "ไม่มี"} → {form.email}</p>
              )}
            </div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label><textarea value={form.address||""} onChange={e => set("address",e.target.value)} className={inp + " h-20 resize-none"}/></div>
          </div>
          <button onClick={saveEmployee} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>บันทึก</button>
        </>}

        {/* ── Tab 2: การจ้างงาน ── */}
        {tab === 2 && <>
          <h3 className="font-bold text-slate-800 mb-4">ข้อมูลการจ้างงาน</h3>

          {/* บริษัทที่สังกัด */}
          <div className="mb-4 p-3 rounded-xl border-2 border-blue-100 bg-blue-50/50">
            <label className="block text-sm font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Building2 size={14}/> บริษัทที่สังกัด</label>
            <select value={form.company_id||""} onChange={e => set("company_id",e.target.value)} className={inp}>
              <option value="">— เลือกบริษัท —</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ""}{c.name_th}</option>)}
            </select>
            <p className="text-[11px] text-blue-500 mt-1">เปลี่ยนบริษัทจะอัปเดตแผนก/ตำแหน่ง/สาขาให้เลือกใหม่</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท</label>
              <select value={form.employment_type||""} onChange={e => set("employment_type",e.target.value)} className={inp}>
                {[["full_time","ประจำ"],["part_time","พาร์ทไทม์"],["contract","สัญญา"],["intern","ฝึกงาน"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">สถานะ</label>
              <select value={form.employment_status||""} onChange={e => set("employment_status",e.target.value)} className={inp}>
                {[["active","ปกติ"],["probation","ทดลองงาน"],["resigned","ลาออก"],["terminated","เลิกจ้าง"],["on_leave","ลา"],["suspended","พักงาน"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">แผนก</label>
              <select value={form.department_id||""} onChange={e => set("department_id",e.target.value)} className={inp}>
                <option value="">ไม่ระบุ</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), createDepartment())}
                  placeholder="+ พิมพ์แผนกใหม่..." className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 placeholder-slate-300"/>
                {newDeptName.trim() && (
                  <button type="button" onClick={createDepartment} disabled={creatingDept}
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap">
                    {creatingDept ? <Loader2 size={12} className="animate-spin"/> : "เพิ่ม"}
                  </button>
                )}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">ตำแหน่ง</label>
              <select value={form.position_id||""} onChange={e => set("position_id",e.target.value)} className={inp}>
                <option value="">ไม่ระบุ</option>
                {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newPositionName} onChange={e => setNewPositionName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), createPosition())}
                  placeholder="+ พิมพ์ตำแหน่งใหม่..." className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 placeholder-slate-300"/>
                {newPositionName.trim() && (
                  <button type="button" onClick={createPosition} disabled={creatingPosition}
                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap">
                    {creatingPosition ? <Loader2 size={12} className="animate-spin"/> : "เพิ่ม"}
                  </button>
                )}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">สาขา</label>
              <select value={form.branch_id||""} onChange={e => set("branch_id",e.target.value)} className={inp}>
                <option value="">ไม่ระบุ</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันเริ่มงาน</label><input type="date" value={form.hire_date||""} onChange={e => set("hire_date",e.target.value)} className={inp}/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">สิ้นสุดทดลองงาน</label><input type="date" value={form.probation_end_date||""} onChange={e => set("probation_end_date",e.target.value)} className={inp}/></div>
          </div>

          {/* ── ยกเว้นเช็คอิน ── */}
          <div className="mt-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.is_attendance_exempt} onChange={e => set("is_attendance_exempt", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <span className="text-sm font-medium text-slate-700">ยกเว้นเช็คอิน/เช็คเอาท์</span>
                <p className="text-xs text-slate-400">ไม่หักมาสาย / ขาดงาน / ออกก่อน</p>
              </div>
            </label>
          </div>

          {/* ── ผู้ประเมิน KPI ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-violet-100 bg-violet-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><BarChart2 size={14} className="text-violet-500"/>ผู้ประเมิน KPI</h4>
            <p className="text-xs text-slate-400 mb-3">เว้นว่าง = ใช้หัวหน้าปัจจุบันเป็นผู้ประเมินตามปกติ</p>
            <div className="relative">
              <input
                type="text"
                value={kpiEvalSearch ?? ""}
                onChange={e => { setKpiEvalSearch(e.target.value); setShowKpiEvalDropdown(true); loadAllEmps() }}
                onFocus={() => { setShowKpiEvalDropdown(true); loadAllEmps() }}
                placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน... (เว้นว่าง = หัวหน้า)"
                className={inp}
              />
              {form.kpi_evaluator_id && (
                <button type="button" onClick={() => { set("kpi_evaluator_id", null); setKpiEvalSearch("") }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                  <X size={12} className="text-slate-400 hover:text-red-500" />
                </button>
              )}
              {showKpiEvalDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowKpiEvalDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[240px] overflow-y-auto">
                    {allEmps
                      .filter(e => {
                        const s = (kpiEvalSearch || "").toLowerCase()
                        if (!s) return true
                        return `${e.first_name_th} ${e.last_name_th} ${e.employee_code}`.toLowerCase().includes(s)
                      })
                      .slice(0, 30)
                      .map(e => (
                        <button key={e.id} type="button"
                          onClick={() => { set("kpi_evaluator_id", e.id); setKpiEvalSearch(`${e.first_name_th} ${e.last_name_th} (${e.employee_code})`); setShowKpiEvalDropdown(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2 transition-colors">
                          <span className="font-bold text-slate-800">{e.first_name_th} {e.last_name_th}</span>
                          <span className="text-xs text-slate-400">{e.employee_code}</span>
                        </button>
                      ))}
                    {allEmps.filter(e => {
                      const s = (kpiEvalSearch || "").toLowerCase()
                      if (!s) return true
                      return `${e.first_name_th} ${e.last_name_th} ${e.employee_code}`.toLowerCase().includes(s)
                    }).length === 0 && (
                      <p className="px-3 py-4 text-sm text-slate-400 text-center">ไม่พบพนักงาน</p>
                    )}
                  </div>
                </>
              )}
            </div>
            {form.kpi_evaluator_id && (
              <p className="text-xs text-violet-600 font-medium mt-2 flex items-center gap-1"><CheckCircle2 size={11}/>กำหนดผู้ประเมิน KPI แล้ว — จะใช้แทนหัวหน้า</p>
            )}
          </div>

          <button onClick={saveEmployment} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>บันทึก</button>
        </>}

        {/* ── Tab 3: เงินเดือน ── */}
        {tab === 3 && <>
          <h3 className="font-bold text-slate-800 mb-4">โครงสร้างเงินเดือน</h3>
          {salary && <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm"><p className="text-green-800 font-semibold">เงินเดือนปัจจุบัน: ฿{salary.base_salary?.toLocaleString()}</p><p className="text-green-600 text-xs">มีผล {format(new Date(salary.effective_from),"d MMM yyyy",{locale:th})}</p></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["base_salary","เงินเดือน (บาท)*"],["allowance_position","เบี้ยตำแหน่ง"],["allowance_transport","ค่าเดินทาง"],["allowance_food","ค่าอาหาร"],["allowance_phone","ค่าโทรศัพท์"],["allowance_housing","ค่าที่พัก"],["ot_rate_normal","อัตรา OT ปกติ (x)"],["ot_rate_holiday","อัตรา OT วันหยุด (x)"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label><input type="number" step="0.01" value={sf[k]||""} onChange={e => setSf((f: any) => ({ ...f, [k]:e.target.value }))} className={inp}/></div>
            ))}
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่มีผล*</label><input type="date" value={sf.effective_from||""} onChange={e => setSf((f: any) => ({ ...f, effective_from:e.target.value }))} className={inp}/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล</label><input value={sf.change_reason||""} onChange={e => setSf((f: any) => ({ ...f, change_reason:e.target.value }))} className={inp} placeholder="เช่น ปรับเงินเดือนประจำปี"/></div>
          </div>

          {/* ── ภาษีหัก ณ ที่จ่าย ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1">ภาษีหัก ณ ที่จ่าย</h4>
            <p className="text-xs text-slate-400 mb-3">ตั้งค่า % ที่จะหักจาก Gross Income ทุกเดือน — เว้นว่างเพื่อคำนวณอัตโนมัติตามขั้นบันไดภาษี</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-[200px]">
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="35"
                    value={sf.tax_withholding_pct ?? ""}
                    onChange={e => setSf((f: any) => ({ ...f, tax_withholding_pct: e.target.value === "" ? null : e.target.value }))}
                    className={inp + " pr-8"}
                    placeholder="อัตโนมัติ"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                {sf.tax_withholding_pct != null && sf.tax_withholding_pct !== "" ? (
                  <p className="text-indigo-600 font-bold">หักคงที่ {sf.tax_withholding_pct}% ของรายได้รวม</p>
                ) : (
                  <p className="text-emerald-600 font-bold">คำนวณอัตโนมัติตามขั้นบันไดภาษี</p>
                )}
                <p className="text-slate-400">ประกันสังคม: 5% สูงสุด 875 บาท/เดือน</p>
              </div>
            </div>
          </div>

          {/* ── KPI Bonus ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1">KPI Bonus (ฐานโบนัส KPI)</h4>
            <p className="text-xs text-slate-400 mb-3">จำนวนเงินฐาน KPI มาตรฐาน (เกรด B) — เกรด A ได้ +20%, เกรด C ได้ -20%, เกรด D ได้ 0</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-[250px]">
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={kpiAmount}
                  onChange={e => setKpiAmount(e.target.value)}
                  className={inp}
                  placeholder="0"
                />
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                {parseFloat(kpiAmount) > 0 ? (
                  <>
                    <p className="text-emerald-600 font-bold">A = ฿{(parseFloat(kpiAmount) * 1.2).toLocaleString()} · B = ฿{parseFloat(kpiAmount).toLocaleString()} · C = ฿{(parseFloat(kpiAmount) * 0.8).toLocaleString()}</p>
                    <p className="text-slate-400">D (0-70 คะแนน) = ฿0</p>
                  </>
                ) : (
                  <p className="text-slate-400">ยังไม่ได้ตั้งค่า KPI Bonus</p>
                )}
              </div>
            </div>
            <button onClick={saveKpi} disabled={loading} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/> บันทึก KPI
            </button>
          </div>

          <button onClick={saveSalary} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>บันทึกเงินเดือน</button>
        </>}

        {/* ── Tab 4: สรุปเงินเดือนรายเดือน ── */}
        {tab === 4 && <PayrollHistoryTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 5: ตารางงาน ── */}
        {tab === 5 && <WorkScheduleTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 6: สิทธิ์เช็คอิน ── */}
        {tab === 6 && <CheckinLocationsTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 7: ประวัติหัวหน้า ── */}
        {tab === 7 && <>
          <h3 className="font-bold text-slate-800 mb-4">ประวัติหัวหน้างาน</h3>
          <div className="flex gap-3 mb-5 items-end">
            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">เลือกหัวหน้าใหม่</label>
              <input
                type="text"
                value={mgrSearch ?? (newMgr ? allEmps.find(e => e.id === newMgr)?.first_name_th + " " + allEmps.find(e => e.id === newMgr)?.last_name_th : "")}
                onChange={e => { setMgrSearch(e.target.value); setNewMgr(""); setShowMgrDropdown(true); loadAllEmps() }}
                onFocus={() => { setShowMgrDropdown(true); loadAllEmps() }}
                placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                className={inp}
              />
              {showMgrDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMgrDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[240px] overflow-y-auto">
                    {allEmps
                      .filter(e => {
                        const s = (mgrSearch || "").toLowerCase()
                        if (!s) return true
                        return `${e.first_name_th} ${e.last_name_th} ${e.employee_code}`.toLowerCase().includes(s)
                      })
                      .slice(0, 30)
                      .map(e => (
                        <button key={e.id} type="button"
                          onClick={() => { setNewMgr(e.id); setMgrSearch(`${e.first_name_th} ${e.last_name_th} (${e.employee_code})`); setShowMgrDropdown(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                          <span className="font-bold text-slate-800">{e.first_name_th} {e.last_name_th}</span>
                          <span className="text-xs text-slate-400">{e.employee_code}</span>
                        </button>
                      ))}
                    {allEmps.filter(e => {
                      const s = (mgrSearch || "").toLowerCase()
                      if (!s) return true
                      return `${e.first_name_th} ${e.last_name_th} ${e.employee_code}`.toLowerCase().includes(s)
                    }).length === 0 && (
                      <p className="px-3 py-4 text-sm text-slate-400 text-center">ไม่พบพนักงาน</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <input type="date" value={newMgrDate} onChange={e => setNewMgrDate(e.target.value)} className={inp + " w-40"}/>
            <button onClick={() => { addMgr(); setMgrSearch("") }} disabled={!newMgr} className="btn-primary px-4 py-2 flex items-center gap-1 disabled:opacity-50"><Plus size={14}/>เพิ่ม</button>
          </div>
          <div className="space-y-3">
            {mgrHistory.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{h.manager?.first_name_th} {h.manager?.last_name_th}</p><p className="text-xs text-slate-500">{format(new Date(h.effective_from),"d MMM yyyy",{locale:th})} - {h.effective_to ? format(new Date(h.effective_to),"d MMM yyyy",{locale:th}) : "ปัจจุบัน"}</p></div>
                {!h.effective_to && <span className="badge bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">ปัจจุบัน</span>}
              </div>
            ))}
            {mgrHistory.length === 0 && <p className="text-center text-slate-400 text-sm py-4">ไม่มีประวัติ</p>}
          </div>
        </>}

        {/* ── Tab 8: บทบาท (Role Management) ── */}
        {tab === 8 && <RoleManagementTab employeeId={id as string} employeeName={`${emp?.first_name_th ?? ""} ${emp?.last_name_th ?? ""}`} employeeEmail={emp?.email || ""}/>}

        {/* ── Tab 9: โควต้าการลา ── */}
        {tab === 9 && <LeaveQuotaTab employeeId={id as string} companyId={emp?.company_id} />}

      </div>

      {/* ── ประวัติการลาออก / ดึงกลับ ── */}
      {resignHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-slate-400"/>
            <h3 className="font-bold text-slate-800 text-sm">ประวัติการลาออก / ดึงกลับ</h3>
          </div>
          <div className="space-y-2">
            {resignHistory.map((h: any) => (
              <div key={h.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                h.action === "resign" ? "border-red-100 bg-red-50/50" : "border-emerald-100 bg-emerald-50/50"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  h.action === "resign" ? "bg-red-100" : "bg-emerald-100"
                }`}>
                  {h.action === "resign" ? <UserX size={13} className="text-red-500"/> : <UserCheck size={13} className="text-emerald-500"/>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${h.action === "resign" ? "text-red-700" : "text-emerald-700"}`}>
                    {h.action === "resign" ? "ลาออก" : "ดึงกลับ"}
                    {h.resign_date && <span className="font-normal text-slate-500 ml-2">วันที่มีผล: {format(new Date(h.resign_date + "T00:00:00"),"d MMM yyyy",{locale:th})}</span>}
                  </p>
                  {h.reason && <p className="text-xs text-slate-500 mt-0.5">เหตุผล: {h.reason}</p>}
                </div>
                <p className="text-[10px] text-slate-400 flex-shrink-0">{format(new Date(h.created_at),"d MMM yyyy HH:mm",{locale:th})}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ Resign Modal ═══════════ */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center">
                <UserX size={20} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">แจ้งลาออก</h3>
                <p className="text-xs text-slate-400">{emp.first_name_th} {emp.last_name_th} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่ลาออกมีผล *</label>
                <input type="date" value={resignDate} onChange={e => setResignDate(e.target.value)} className={inp}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล (ถ้ามี)</label>
                <textarea value={resignReason} onChange={e => setResignReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder="เช่น ลาออกเอง, ไม่มาทำงาน, สิ้นสุดสัญญา..."/>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">สิ่งที่จะเกิดขึ้น:</p>
                <ul className="text-xs text-amber-700 space-y-1 ml-3">
                  <li>• สถานะเปลี่ยนเป็น &quot;ลาออก&quot;</li>
                  <li>• ไม่คำนวณเงินเดือนอีกต่อไป</li>
                  <li>• ปิดการเข้าสู่ระบบ</li>
                  <li>• ข้อมูลทั้งหมดยังคงอยู่ — สามารถดึงกลับได้</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowResignModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                ยกเลิก
              </button>
              <button onClick={handleResign} disabled={resignLoading || !resignDate}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {resignLoading ? <Loader2 size={14} className="animate-spin"/> : <UserX size={14}/>}
                ยืนยันลาออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Reinstate Modal ═══════════ */}
      {showReinstateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <UserCheck size={20} className="text-emerald-600"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">ดึงกลับเข้ามา</h3>
                <p className="text-xs text-slate-400">{emp.first_name_th} {emp.last_name_th} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <textarea value={resignReason} onChange={e => setResignReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder="เช่น กลับมาทำงาน, ต่อสัญญาใหม่..."/>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-800 mb-1">สิ่งที่จะเกิดขึ้น:</p>
                <ul className="text-xs text-emerald-700 space-y-1 ml-3">
                  <li>• สถานะเปลี่ยนกลับเป็น &quot;ปกติ&quot;</li>
                  <li>• กลับเข้าสู่ระบบเงินเดือนได้</li>
                  <li>• เปิดการเข้าสู่ระบบ</li>
                  <li>• ข้อมูลเดิมทั้งหมดยังอยู่</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReinstateModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                ยกเลิก
              </button>
              <button onClick={handleReinstate} disabled={resignLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {resignLoading ? <Loader2 size={14} className="animate-spin"/> : <UserCheck size={14}/>}
                ยืนยันดึงกลับ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Delete Modal ═══════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center">
                <ShieldAlert size={20} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">ลบพนักงานออกจากระบบ</h3>
                <p className="text-xs text-slate-400">{emp.first_name_th} {emp.last_name_th} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล (ถ้ามี)</label>
                <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder="เช่น เพิ่มข้อมูลผิด, พนักงานทดลองงานไม่ผ่าน..."/>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-800 mb-1">สิ่งที่จะเกิดขึ้น:</p>
                <ul className="text-xs text-red-700 space-y-1 ml-3">
                  <li>• ซ่อนพนักงานออกจากทุกรายการในระบบ</li>
                  <li>• ปิดการเข้าสู่ระบบทันที</li>
                  <li>• ข้อมูลทั้งหมดยังคงอยู่ — สามารถกู้คืนได้จากหน้า &quot;ประวัติการลบ&quot;</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                ยกเลิก
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {deleteLoading ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── SummaryTab ───────────────────────────────────────────────────────────────
function SummaryTab({ employeeId, emp, salary, kpiSetting }: { employeeId: string; emp: any; salary: any; kpiSetting?: any }) {
  const supabase = createClient()
  const [stats,     setStats]     = useState<any>(null)
  const [schedule,  setSchedule]  = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [recent,    setRecent]    = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // Edit attendance modal
  const [editAttRec,  setEditAttRec]  = useState<any>(null)
  const [editAttForm, setEditAttForm] = useState({ clock_in: "", clock_out: "", clock_in_date: "", clock_out_date: "" })
  const [editAttSaving, setEditAttSaving] = useState(false)

  useEffect(() => {
    const today = new Date()
    const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`
    const todayStr = today.toISOString().slice(0,10)

    Promise.all([
      // attendance stats เดือนนี้
      supabase.from("attendance_records")
        .select("status, late_minutes, early_out_minutes, work_minutes")
        .eq("employee_id", employeeId)
        .gte("work_date", firstOfMonth).lte("work_date", todayStr),
      // current shift schedule
      supabase.from("work_schedules")
        .select("*, shift:shift_templates(*)")
        .eq("employee_id", employeeId)
        .lte("effective_from", todayStr)
        .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
      // allowed checkin locations
      supabase.from("employee_allowed_locations")
        .select("branch:branches(id,name,latitude,longitude,geo_radius_m)")
        .eq("employee_id", employeeId),
      // recent 5 attendance
      supabase.from("attendance_records")
        .select("id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, shift_template_id")
        .eq("employee_id", employeeId)
        .order("work_date", { ascending: false }).limit(7),
    ]).then(([att, sch, loc, rec]) => {
      const records = att.data ?? []
      setStats({
        present: records.filter((r:any) => ["present","late"].includes(r.status)).length,
        late:    records.filter((r:any) => r.status === "late").length,
        absent:  records.filter((r:any) => r.status === "absent").length,
        earlyOut:records.filter((r:any) => r.status === "early_out").length,
        totalLateMin: records.reduce((s:number,r:any) => s+(r.late_minutes||0), 0),
        totalEarlyMin:records.reduce((s:number,r:any) => s+(r.early_out_minutes||0), 0),
        avgWorkMin: records.length > 0
          ? Math.round(records.reduce((s:number,r:any) => s+(r.work_minutes||0),0) / records.filter((r:any)=>r.work_minutes>0).length || 0)
          : 0,
      })
      setSchedule(sch.data)
      setLocations((loc.data??[]).map((r:any)=>r.branch).filter(Boolean))
      setRecent(rec.data ?? [])
      setLoading(false)
    })
  }, [employeeId])

  if (loading) return <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 size={16} className="animate-spin"/>กำลังโหลด...</div>

  const shift = schedule?.shift
  const allAllowances = salary
    ? (salary.allowance_position||0)+(salary.allowance_transport||0)+(salary.allowance_food||0)+(salary.allowance_phone||0)+(salary.allowance_housing||0)
    : 0

  const statusIcon: Record<string,string> = { present:"✅", late:"⏰", absent:"❌", early_out:"🔔", wfh:"🏠", leave:"📝" }
  const statusLabel: Record<string,string> = { present:"มาทำงาน", late:"มาสาย", absent:"ขาดงาน", early_out:"ออกก่อน", wfh:"WFH", leave:"ลา" }
  const statusClr: Record<string,string> = { present:"text-emerald-600 bg-emerald-50", late:"text-amber-600 bg-amber-50", absent:"text-red-600 bg-red-50", early_out:"text-orange-600 bg-orange-50", wfh:"text-teal-600 bg-teal-50", leave:"text-blue-600 bg-blue-50" }

  return (
    <div className="space-y-5">

      {/* ── Bio strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon:<User2 size={14}/>, label:"แผนก",     val:emp.department?.name ?? "—",                  c:"bg-blue-50 text-blue-600"    },
          { icon:<Calendar size={14}/>, label:"เริ่มงาน", val:emp.hire_date ? format(new Date(emp.hire_date),"d MMM yy",{locale:th}) : "—", c:"bg-violet-50 text-violet-600" },
          { icon:<Building2 size={14}/>, label:"สาขา",   val:emp.branch?.name ?? "—",                    c:"bg-sky-50 text-sky-600"       },
          { icon:<DollarSign size={14}/>, label:"เงินเดือน", val:salary ? `฿${fmt(salary.base_salary)}` : "ยังไม่กำหนด", c:"bg-emerald-50 text-emerald-600" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl p-4 ${item.c.split(" ")[0]} border border-white`}>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1 ${item.c.split(" ")[1]}`}>
              {item.icon}{item.label}
            </div>
            <p className="font-black text-slate-800 text-sm truncate">{item.val}</p>
          </div>
        ))}
      </div>

      {/* ── Shift ── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-indigo-500"/>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">กะการทำงานปัจจุบัน</span>
          </div>
        </div>
        {shift ? (
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-indigo-600"/>
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-800">{shift.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {shift.work_start?.slice(0,5)} – {shift.work_end?.slice(0,5)}
                {shift.break_minutes && <span className="ml-2 text-slate-400">พัก {shift.break_minutes} นาที</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">มีผลตั้งแต่</p>
              <p className="text-sm font-bold text-slate-600">{format(new Date(schedule.effective_from),"d MMM yyyy",{locale:th})}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500"/>
            <p className="text-sm text-amber-700 font-medium">ยังไม่ได้กำหนดกะทำงาน</p>
          </div>
        )}
      </div>

      {/* ── Salary breakdown ── */}
      {salary && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
            <DollarSign size={14} className="text-emerald-500"/>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">โครงสร้างเงินเดือน</span>
            <span className="ml-auto font-black text-emerald-600 text-sm">฿{fmt(salary.base_salary + allAllowances)}/เดือน</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100">
            {[
              { l:"เงินเดือนฐาน",   v:salary.base_salary,           show:true },
              { l:"เบี้ยตำแหน่ง",   v:salary.allowance_position,    show:(salary.allowance_position||0)>0 },
              { l:"ค่าเดินทาง",     v:salary.allowance_transport,   show:(salary.allowance_transport||0)>0 },
              { l:"ค่าอาหาร",       v:salary.allowance_food,        show:(salary.allowance_food||0)>0 },
              { l:"ค่าโทรศัพท์",    v:salary.allowance_phone,       show:(salary.allowance_phone||0)>0 },
              { l:"ค่าที่พัก",       v:salary.allowance_housing,     show:(salary.allowance_housing||0)>0 },
            ].filter(i=>i.show).map(item => (
              <div key={item.l} className="px-4 py-3">
                <p className="text-[10px] text-slate-400">{item.l}</p>
                <p className="font-bold text-slate-800 text-sm tabular-nums">฿{fmt(item.v)}</p>
              </div>
            ))}
          </div>
          {kpiSetting?.standard_amount > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <p className="text-[10px] text-emerald-600 font-bold">KPI Bonus (ฐาน)</p>
                <p className="text-[9px] text-slate-400">A=฿{fmt(Math.round(kpiSetting.standard_amount*1.2))} · B=฿{fmt(kpiSetting.standard_amount)} · C=฿{fmt(Math.round(kpiSetting.standard_amount*0.8))}</p>
              </div>
              <p className="font-bold text-emerald-700 text-sm tabular-nums">฿{fmt(kpiSetting.standard_amount)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Stats เดือนนี้ ── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <BarChart2 size={14} className="text-blue-500"/>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">สถิติเดือนนี้</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-slate-100">
          {[
            { l:"มาแล้ว",   v:stats?.present,      unit:"วัน",  c:"text-blue-600" },
            { l:"มาสาย",    v:stats?.late,          unit:"ครั้ง",c:"text-amber-600" },
            { l:"ขาดงาน",   v:stats?.absent,        unit:"วัน",  c:"text-red-500" },
            { l:"ออกก่อน",  v:stats?.earlyOut,      unit:"ครั้ง",c:"text-orange-500" },
            { l:"สายรวม",   v:stats?.totalLateMin,  unit:"นาที", c:"text-amber-500" },
            { l:"ออกก่อนรวม",v:stats?.totalEarlyMin,unit:"นาที", c:"text-orange-500" },
          ].map(s => (
            <div key={s.l} className="px-3 py-4 text-center">
              <p className="text-[10px] text-slate-400 mb-1">{s.l}</p>
              <p className={`text-xl font-black leading-none tabular-nums ${s.c}`}>{s.v ?? 0}</p>
              <p className="text-[9px] text-slate-300 mt-0.5">{s.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Checkin locations ── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-pink-500"/>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">สาขาที่เช็คอินได้</span>
          </div>
          <span className="text-[11px] font-bold text-blue-500">{locations.length} สาขา</span>
        </div>
        {locations.length === 0 ? (
          <div className="px-4 py-5 flex items-center gap-3">
            <AlertTriangle size={15} className="text-amber-500"/>
            <p className="text-sm text-amber-700 font-medium">ยังไม่ได้กำหนดสาขา — ไปที่ Tab สิทธิ์เช็คอิน</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {locations.map((b:any) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-green-600"/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{b.name}</p>
                  {b.geo_radius_m && <p className="text-[10px] text-slate-400">รัศมี {b.geo_radius_m} ม.</p>}
                </div>
                <CheckCircle2 size={14} className="text-green-500"/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent attendance ── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <CalendarClock size={14} className="text-slate-500"/>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">การเข้างานล่าสุด</span>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 && <p className="text-sm text-slate-300 text-center py-6">ไม่มีข้อมูล</p>}
          {recent.map((r:any) => (
            <div key={r.work_date} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 text-center flex-shrink-0">
                <p className="text-[10px] text-slate-400">{format(new Date(r.work_date+"T00:00:00"),"EEE",{locale:th})}</p>
                <p className="text-sm font-black text-slate-700">{format(new Date(r.work_date+"T00:00:00"),"d",{locale:th})}</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-2">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Bangkok"}) : "--:--"}</span>
                  <span className="text-slate-300 mx-1">→</span>
                  <span className="font-bold text-slate-700">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Bangkok"}) : "--:--"}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {r.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold">สาย {r.late_minutes}น.</span>}
                  {r.early_out_minutes > 0 && <span className="text-[10px] text-orange-500 font-bold">ออกก่อน {r.early_out_minutes}น.</span>}
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${statusClr[r.status]??""}`}>
                {statusIcon[r.status]} {statusLabel[r.status]??r.status}
              </span>
              <button onClick={() => {
                const ci = r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}) : ""
                const co = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}) : ""
                const coDate = r.clock_out ? new Date(r.clock_out).toLocaleDateString("sv-SE",{timeZone:"Asia/Bangkok"}) : r.work_date
                setEditAttRec(r)
                setEditAttForm({ clock_in: ci, clock_out: co, clock_in_date: r.work_date, clock_out_date: coDate })
              }} className="text-slate-300 hover:text-indigo-600 flex-shrink-0" title="แก้ไขเวลา">
                <Pencil size={12}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Edit Attendance Modal ═══ */}
      {editAttRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditAttRec(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-600 px-5 py-4">
              <h3 className="text-white font-bold">แก้ไขเวลาเข้า-ออก</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{emp?.first_name_th} {emp?.last_name_th} · {editAttRec.work_date}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ + เวลาเข้างาน</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAttForm.clock_in_date} onChange={e => setEditAttForm(f => ({ ...f, clock_in_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"/>
                  <input type="time" value={editAttForm.clock_in} onChange={e => setEditAttForm(f => ({ ...f, clock_in: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ + เวลาออกงาน</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAttForm.clock_out_date} onChange={e => setEditAttForm(f => ({ ...f, clock_out_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"/>
                  <input type="time" value={editAttForm.clock_out} onChange={e => setEditAttForm(f => ({ ...f, clock_out: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"/>
                </div>
                {editAttForm.clock_out_date && editAttForm.clock_out_date !== editAttForm.clock_in_date && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1">กะข้ามคืน — ออกงานคนละวัน</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditAttRec(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={async () => {
                setEditAttSaving(true)
                try {
                  const res = await fetch("/api/attendance/admin-edit", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      record_id: editAttRec.id,
                      clock_in: editAttForm.clock_in || null,
                      clock_out: editAttForm.clock_out || null,
                      clock_in_date: editAttForm.clock_in_date || editAttRec.work_date,
                      clock_out_date: editAttForm.clock_out_date || editAttRec.work_date,
                    }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    toast.success("แก้ไขเวลาสำเร็จ")
                    setEditAttRec(null)
                    // reload recent attendance
                    const { data: newRec } = await supabase.from("attendance_records")
                      .select("id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, shift_template_id")
                      .eq("employee_id", employeeId).order("work_date", { ascending: false }).limit(7)
                    setRecent(newRec ?? [])
                  } else toast.error(data.error || "เกิดข้อผิดพลาด")
                } catch { toast.error("เกิดข้อผิดพลาด") }
                setEditAttSaving(false)
              }} disabled={editAttSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {editAttSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── PayrollHistoryTab ───────────────────────────────────────────────────────
function PayrollHistoryTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [recalcing, setRecalcing] = useState(false)
  const [breakdown, setBreakdown] = useState<any | null>(null)
  const [bdLoading, setBdLoading] = useState(false)
  const [bdOpen, setBdOpen] = useState(false)
  const bdCache = useRef<Record<string, any>>({})

  const loadRecords = () => {
    return supabase
      .from("payroll_records")
      .select("*")
      .eq("employee_id", employeeId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        const rows = data ?? []
        setRecords(rows)
        // sync selected to latest data
        setSelected((prev: any) => {
          if (!prev) return rows[0] ?? null
          return rows.find((r: any) => r.id === prev.id) ?? prev
        })
        setLoading(false)
      })
  }

  useEffect(() => { loadRecords() }, [employeeId]) // eslint-disable-line

  // ── โหลด breakdown ผ่าน API (service client — ไม่ติด RLS) ──
  useEffect(() => {
    if (!bdOpen || !selected) return
    const cacheKey = `${selected.id}`
    if (bdCache.current[cacheKey]) { setBreakdown(bdCache.current[cacheKey]); return }

    let cancelled = false
    setBdLoading(true)
    setBreakdown(null)

    fetch(`/api/payroll/breakdown?employee_id=${employeeId}&year=${selected.year}&month=${selected.month}&company_id=${companyId || ""}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(result => {
        if (!cancelled) { bdCache.current[cacheKey] = result; setBreakdown(result); setBdLoading(false) }
      })
      .catch(() => {
        if (!cancelled) { setBdLoading(false); setBreakdown({ _error: true }) }
      })

    return () => { cancelled = true }
  }, [bdOpen, selected?.id, employeeId]) // eslint-disable-line

  // เคลียร์ cache เมื่อเปลี่ยน employee
  useEffect(() => { bdCache.current = {} }, [employeeId])

  const recalc = async () => {
    if (!selected?.payroll_period_id) return
    setRecalcing(true)
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId, payroll_period_id: selected.payroll_period_id }),
    })
    await loadRecords()
    setRecalcing(false)
    if (res.ok) toast.success("คำนวณเงินเดือนใหม่แล้ว")
    else toast.error("คำนวณใหม่ไม่สำเร็จ")
  }

  const TH_MONTHS_SHORT = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

  function minToHr(m?: number | null) {
    if (!m) return "0 ชม."
    const h = Math.floor(m / 60)
    const min = m % 60
    return min > 0 ? `${h} ชม. ${min} น.` : `${h} ชม.`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )

  if (records.length === 0) return (
    <div className="py-12 text-center text-slate-400">
      <DollarSign size={36} className="mx-auto mb-3 opacity-30"/>
      <p className="font-medium">ยังไม่มีข้อมูลเงินเดือน</p>
    </div>
  )

  const r = selected

  return (
    <div className="space-y-4">
      {/* Month selector + recalc button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2 flex-1">
          {records.map(rec => {
            const isActive = selected?.id === rec.id
            return (
              <button
                key={rec.id}
                onClick={() => { setSelected(rec); setBreakdown(null) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {TH_MONTHS_SHORT[rec.month]} {rec.year + 543}
              </button>
            )
          })}
        </div>
        {selected && (
          <button
            onClick={recalc}
            disabled={recalcing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {recalcing ? <Loader2 size={12} className="animate-spin"/> : <BarChart2 size={12}/>}
            คำนวณใหม่
          </button>
        )}
      </div>

      {r && (
        <>
          {/* ── รายได้ ── */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
            <h4 className="text-sm font-black text-emerald-800 mb-3 flex items-center gap-2">
              <TrendingUp size={15}/> รายได้
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 mb-0.5">เงินเดือน</p>
                <p className="font-black text-slate-800">฿{fmt(r.base_salary)}</p>
              </div>
              {(r.bonus ?? 0) > 0 && (
                <div className="bg-white rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5">โบนัส</p>
                  <p className="font-black text-emerald-700">฿{fmt(r.bonus)}</p>
                </div>
              )}
              {(r.ot_hours ?? 0) > 0 && (
                <div className="bg-white rounded-xl p-3 col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">โอที ({fmtDec(r.ot_hours)} ชม.)</p>
                  <p className="font-black text-indigo-700 text-lg">฿{fmt(r.ot_amount)}</p>
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                    {(r.ot_weekday_minutes ?? 0) > 0 && (
                      <p>• ปกติ (1.5x): {minToHr(r.ot_weekday_minutes)}</p>
                    )}
                    {(r.ot_holiday_reg_minutes ?? 0) > 0 && (
                      <p>• วันหยุด (1.0x): {minToHr(r.ot_holiday_reg_minutes)}</p>
                    )}
                    {(r.ot_holiday_ot_minutes ?? 0) > 0 && (
                      <p>• วันหยุด OT (3.0x): {minToHr(r.ot_holiday_ot_minutes)}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="bg-emerald-100 rounded-xl p-3 col-span-2 flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-800">รายได้รวม (Gross)</p>
                <p className="font-black text-emerald-800 text-base">฿{fmt(r.gross_income)}</p>
              </div>
            </div>
          </div>

          {/* ── การหัก ── */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
            <h4 className="text-sm font-black text-rose-800 mb-3 flex items-center gap-2">
              <TrendingDown size={15}/> การหัก
            </h4>
            <div className="space-y-2">
              {[
                ["หัก: ขาด/สาย/ออกก่อน", (r.deduct_absent ?? 0) + (r.deduct_late ?? 0) + (r.deduct_early_out ?? 0)],
                ["ประกันสังคม (5%)", r.social_security_amount],
                ["ภาษีหัก ณ ที่จ่าย", r.monthly_tax_withheld],
                ["หักเงินกู้", r.deduct_loan],
                ["หักอื่นๆ", r.deduct_other],
              ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                <div key={label as string} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2">
                  <span className="text-slate-600 font-medium">{label as string}</span>
                  <span className="font-bold text-rose-700">-฿{fmt(val as number)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-rose-100 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-rose-800">หักรวม</span>
                <span className="font-black text-rose-800">-฿{fmt(r.total_deductions)}</span>
              </div>
            </div>
          </div>

          {/* ── เงินสุทธิ + สถิติ ── */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-600 p-4 text-white text-center">
            <p className="text-xs font-bold opacity-70 mb-1">เงินเดือนสุทธิ</p>
            <p className="text-3xl font-black">฿{fmt(r.net_salary)}</p>
            <p className="text-[10px] opacity-60 mt-1">{TH_MONTHS_SHORT[r.month]} {r.year + 543}</p>
          </div>

          {/* ── สถิติการทำงาน ── */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <h4 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
              <BarChart2 size={15}/> สถิติการทำงาน
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["มาทำงาน", r.present_days ?? 0, "text-emerald-600", "วัน"],
                ["ขาด", r.absent_days ?? 0, "text-rose-500", "วัน"],
                ["สาย", r.late_count ?? 0, "text-amber-500", "ครั้ง"],
                ["ลาพักร้อน", r.leave_paid_days ?? 0, "text-sky-500", "วัน"],
                ["OT", fmtDec(r.ot_hours), "text-indigo-600", "ชม."],
              ].map(([label, val, color, unit]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-2">
                  <p className={`text-base font-black ${color}`}>{val}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{unit}</p>
                  <p className="text-[9px] text-slate-500">{label as string}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── รายละเอียดรายวัน (Breakdown) ── */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <button
              onClick={() => setBdOpen(!bdOpen)}
              className="w-full flex items-center justify-between text-sm font-black text-slate-700"
            >
              <span className="flex items-center gap-2">
                <Calendar size={15}/> รายละเอียดรายวัน
              </span>
              <ChevronRight size={16} className={`transition-transform ${bdOpen ? "rotate-90" : ""}`}/>
            </button>

            {bdOpen && (
              <div className="mt-4 space-y-4">
                {bdLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1,2,3].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 w-32 rounded bg-slate-200"/>
                        <div className="flex gap-2">
                          <div className="h-7 w-20 rounded-lg bg-slate-100"/>
                          <div className="h-7 w-24 rounded-lg bg-slate-100"/>
                          <div className="h-7 w-16 rounded-lg bg-slate-100"/>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : breakdown?._error ? (
                  <div className="text-center py-6">
                    <p className="text-slate-400 text-xs mb-2">ไม่สามารถโหลดข้อมูลได้</p>
                    <button
                      onClick={() => { bdCache.current = {}; setBreakdown(null); setBdOpen(false); setTimeout(() => setBdOpen(true), 50) }}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      ลองใหม่
                    </button>
                  </div>
                ) : breakdown ? (
                  <>
                    {/* ขาดงาน */}
                    {breakdown.absent?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1.5">
                          <X size={12}/> ขาดงาน ({breakdown.absent.length} วัน)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.absent.map((d: any) => (
                            <span key={d.date} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* สาย */}
                    {breakdown.late?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1.5">
                          <Clock size={12}/> สาย ({breakdown.late.length} ครั้ง — รวม {breakdown.summary?.late_total_min ?? 0} นาที)
                        </p>
                        <div className="space-y-1">
                          {breakdown.late.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 text-[11px] border border-amber-100">
                              <span className="font-bold text-amber-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-amber-600">สาย {d.minutes} นาที</span>
                              {d.clock_in && <span className="text-amber-400 ml-auto">เข้า {new Date(d.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ออกก่อน */}
                    {breakdown.early_out?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1.5">
                          <ArrowLeft size={12}/> ออกก่อน ({breakdown.early_out.length} ครั้ง — รวม {breakdown.summary?.early_out_total_min ?? 0} นาที)
                        </p>
                        <div className="space-y-1">
                          {breakdown.early_out.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 text-[11px] border border-orange-100">
                              <span className="font-bold text-orange-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-orange-600">ออกก่อน {d.minutes} นาที</span>
                              {d.clock_out && <span className="text-orange-400 ml-auto">ออก {new Date(d.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OT */}
                    {breakdown.ot?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1.5">
                          <TrendingUp size={12}/> OT ({breakdown.ot.length} วัน — รวม {(() => { const t = breakdown.summary?.ot_total_min ?? 0; return `${Math.floor(t/60)} ชม. ${t%60 > 0 ? `${t%60} น.` : ""}` })()})
                        </p>
                        <div className="space-y-1">
                          {breakdown.ot.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-[11px] border border-indigo-100">
                              <span className="font-bold text-indigo-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-indigo-600">{Math.floor(d.minutes / 60)} ชม. {d.minutes % 60 > 0 ? `${d.minutes % 60} น.` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ลา */}
                    {breakdown.leave?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-sky-600 mb-2 flex items-center gap-1.5">
                          <CalendarClock size={12}/> ลา ({breakdown.leave.length} วัน)
                        </p>
                        <div className="space-y-1">
                          {breakdown.leave.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-50 text-[11px] border border-sky-100">
                              <span className="font-bold text-sky-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: d.color || "#6B7280" }}>
                                {d.type_name}
                              </span>
                              {d.is_half_day && <span className="text-sky-400">(ครึ่งวัน)</span>}
                              <span className={`ml-auto text-[10px] ${d.is_paid ? "text-green-500" : "text-rose-400"}`}>
                                {d.is_paid ? "ได้เงิน" : "ไม่ได้เงิน"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* วันหยุดบริษัท */}
                    {breakdown.holidays?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-purple-600 mb-2 flex items-center gap-1.5">
                          <Calendar size={12}/> วันหยุดบริษัท ({breakdown.holidays.length} วัน)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.holidays.map((d: any) => (
                            <span key={d.date} className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200">
                              {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })} — {d.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!breakdown.absent?.length && !breakdown.late?.length && !breakdown.early_out?.length && !breakdown.ot?.length && !breakdown.leave?.length && !breakdown.holidays?.length && (
                      <p className="text-center text-slate-400 text-xs py-4">ไม่มีข้อมูลรายละเอียดรายวัน</p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-slate-400 text-xs py-4">ไม่สามารถโหลดข้อมูลได้</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── WorkScheduleTab ──────────────────────────────────────────────────────────
function WorkScheduleTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const supabase = createClient()
  const { user } = useAuth()

  const [shifts,      setShifts]      = useState<any[]>([])
  const [schedules,   setSchedules]   = useState<any[]>([])
  const [saving,      setSaving]      = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  // form state
  const [mode,        setMode]        = useState<"template"|"custom">("template")
  const [selectedShift, setSelectedShift] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(),"yyyy-MM-dd"))
  const [lateThreshold, setLateThreshold] = useState<string>("")
  // custom time
  const [customName,  setCustomName]  = useState("")
  const [workStart,   setWorkStart]   = useState("09:00")
  const [workEnd,     setWorkEnd]     = useState("18:00")
  const [breakMin,    setBreakMin]    = useState("60")
  const [isOvernight, setIsOvernight] = useState(false)

  const load = useCallback(async () => {
    const [{ data: sh }, { data: sc }] = await Promise.all([
      supabase.from("shift_templates").select("*").eq("company_id", companyId).eq("is_active",true).order("name"),
      supabase.from("work_schedules")
        .select("*, shift:shift_templates(id,name,work_start,work_end,break_minutes,is_overnight)")
        .eq("employee_id", employeeId).order("effective_from", { ascending: false }),
    ])
    setShifts(sh ?? [])
    setSchedules(sc ?? [])
  }, [employeeId, companyId])

  useEffect(() => { load() }, [load])

  const closeForm = () => {
    setShowForm(false); setMode("template"); setSelectedShift("")
    setLateThreshold(""); setCustomName(""); setWorkStart("09:00")
    setWorkEnd("18:00"); setBreakMin("60"); setIsOvernight(false)
  }

  const assign = async () => {
    setSaving(true)
    let shiftId = selectedShift

    // สร้าง custom shift template ถ้าเลือก custom
    if (mode === "custom") {
      if (!workStart || !workEnd) { toast.error("กรุณากรอกเวลา"); setSaving(false); return }
      const name = customName || `${workStart}–${workEnd}`
      const { data: newShift, error: shiftErr } = await supabase.from("shift_templates").insert({
        company_id:           companyId,
        name,
        shift_type:           "normal",
        work_start:           workStart + ":00",
        work_end:             workEnd + ":00",
        break_minutes:        Number(breakMin) || 60,
        is_overnight:         isOvernight,
        ot_start_after_minutes: 30,
        is_active:            true,
      }).select("id").single()
      if (shiftErr || !newShift) { toast.error("สร้างกะไม่สำเร็จ: " + shiftErr?.message); setSaving(false); return }
      shiftId = newShift.id
    }

    if (!shiftId) { toast.error("กรุณาเลือกกะ"); setSaving(false); return }

    // ปิด schedule ปัจจุบัน
    const current = schedules.find(s => !s.effective_to)
    if (current) await supabase.from("work_schedules").update({ effective_to: effectiveFrom }).eq("id", current.id)

    const { error } = await supabase.from("work_schedules").insert({
      employee_id:             employeeId,
      shift_template_id:       shiftId,
      effective_from:          effectiveFrom,
      late_threshold_minutes:  lateThreshold !== "" ? Number(lateThreshold) : null,
      created_by:              user?.employee_id ?? null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success("✓ กำหนดกะทำงานสำเร็จ")
    closeForm(); load()
  }

  const remove = async (id: string) => {
    if (!confirm("ลบการกำหนดกะนี้?")) return
    await supabase.from("work_schedules").delete().eq("id", id)
    toast.success("ลบแล้ว"); load()
  }

  const current = schedules.find(s => !s.effective_to)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-800">กำหนดกะทำงาน</h3>
          <p className="text-xs text-slate-400 mt-0.5">เพิ่มกะได้เรื่อยๆ ระบบจะปิดกะเดิมอัตโนมัติเมื่อกำหนดกะใหม่</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${showForm ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white shadow-sm shadow-blue-200"}`}>
          {showForm ? <X size={12}/> : <Plus size={12}/>}
          {showForm ? "ยกเลิก" : "เพิ่มกะ"}
        </button>
      </div>

      {/* ── Current Shift ── */}
      {current ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-4 mb-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-indigo-600"/>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-0.5">กะปัจจุบัน</p>
            <p className="font-black text-indigo-800">{current.shift?.name}</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              {current.shift?.work_start?.slice(0,5)} – {current.shift?.work_end?.slice(0,5)}
              {current.shift?.break_minutes ? ` · พัก ${current.shift.break_minutes} น.` : ""}
              {current.shift?.is_overnight ? " · ข้ามคืน" : ""}
            </p>
          </div>
          <div className="text-right">
            {current.late_threshold_minutes != null ? (
              <div className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full mb-1">
                สายได้ {current.late_threshold_minutes} นาที
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-400 text-[11px] px-2.5 py-1 rounded-full mb-1">ใช้ค่าแผนก</div>
            )}
            <p className="text-[10px] text-indigo-400">มีผลตั้งแต่ {format(new Date(current.effective_from),"d MMM yyyy",{locale:th})}</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-500"/>
          <p className="text-sm text-amber-800 font-medium">ยังไม่ได้กำหนดกะทำงาน กรุณากด &quot;+ เพิ่มกะ&quot;</p>
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">กำหนดกะใหม่</p>

          {/* Mode toggle */}
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 gap-1">
            {([["template","เลือกจากกะที่มี"],["custom","กำหนดเวลาเอง"]] as const).map(([m,l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode===m ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Template picker */}
          {mode === "template" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">กะทำงาน</label>
              <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className={inp}>
                <option value="">เลือกกะทำงาน</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.work_start?.slice(0,5)}–{s.work_end?.slice(0,5)})</option>
                ))}
              </select>
              {shifts.length === 0 && <p className="text-xs text-amber-600 mt-1">ไม่มีกะ — ไปเพิ่มที่ ตั้งค่า → กะทำงาน</p>}
              {selectedShift && (() => {
                const s = shifts.find(x => x.id === selectedShift)
                if (!s) return null
                return (
                  <div className="mt-2 bg-white border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-sm font-bold text-indigo-700">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.work_start?.slice(0,5)} – {s.work_end?.slice(0,5)} · พัก {s.break_minutes} น.{s.is_overnight?" · ข้ามคืน":""}</p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Custom time */}
          {mode === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อกะ (ถ้าไม่กรอกจะใช้เวลาอัตโนมัติ)</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)} className={inp} placeholder="เช่น กะพิเศษ A"/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">เวลาเข้างาน</label>
                  <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">เวลาออกงาน</label>
                  <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">พักกลางวัน (นาที)</label>
                  <input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} className={inp} min="0" max="120"/>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isOvernight} onChange={e => setIsOvernight(e.target.checked)} className="rounded"/>
                <span className="text-xs text-slate-600 font-medium">กะข้ามคืน (นับ work_date เป็นวันก่อนหน้า)</span>
              </label>
            </div>
          )}

          {/* Late threshold override */}
          <div className="bg-white border border-amber-100 rounded-xl p-4">
            <label className="block text-xs font-bold text-amber-700 mb-2">⏱ อนุโลมมาสายได้กี่นาที (สำหรับคนนี้)</label>
            <div className="flex items-center gap-3">
              <input type="number" value={lateThreshold} onChange={e => setLateThreshold(e.target.value)}
                className={inp + " w-28"} min="0" max="60" placeholder="—"/>
              <p className="text-xs text-slate-400">ถ้าไม่กรอก = ใช้ค่าตามแผนก<br/>0 = หักทันทีถ้าสาย 1 นาที</p>
            </div>
            {lateThreshold !== "" && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ✓ มาสายได้ {lateThreshold} นาที โดยไม่โดนหัก
              </p>
            )}
          </div>

          {/* Effective from */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">วันที่มีผล</label>
            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className={inp + " w-48"}/>
          </div>

          <button onClick={assign} disabled={saving}
            className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            บันทึกกะทำงาน
          </button>
        </div>
      )}

      {/* ── History ── */}
      {schedules.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">ประวัติกะทำงาน ({schedules.length})</p>
          <div className="space-y-2">
            {schedules.map(sc => (
              <div key={sc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${!sc.effective_to ? "border-indigo-100 bg-indigo-50/40" : "border-slate-100 bg-slate-50/50"}`}>
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Clock size={13} className={!sc.effective_to ? "text-indigo-500" : "text-slate-300"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-700">{sc.shift?.name}</p>
                    {sc.late_threshold_minutes != null && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                        สายได้ {sc.late_threshold_minutes} นาที
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sc.shift?.work_start?.slice(0,5)} – {sc.shift?.work_end?.slice(0,5)}
                    &nbsp;·&nbsp;
                    {format(new Date(sc.effective_from),"d MMM yyyy",{locale:th})}
                    {sc.effective_to ? ` – ${format(new Date(sc.effective_to),"d MMM yyyy",{locale:th})}` : " – ปัจจุบัน"}
                  </p>
                </div>
                {!sc.effective_to && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full flex-shrink-0">ปัจจุบัน</span>}
                <button onClick={() => remove(sc.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CheckinLocationsTab ──────────────────────────────────────────────────────
function CheckinLocationsTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const supabase = createClient()
  const { user } = useAuth()

  const [allBranches,   setAllBranches]   = useState<any[]>([])
  const [branchCompanies, setBranchCompanies] = useState<any[]>([])
  const [allowedRows,   setAllowedRows]   = useState<any[]>([])
  const [saving,        setSaving]        = useState<string|null>(null)
  const [showCustom,    setShowCustom]    = useState(false)
  const [customForm,    setCustomForm]    = useState({ name:"", lat:"", lng:"", radius:"200" })
  const [savingCustom,  setSavingCustom]  = useState(false)
  const [checkinAnywhere, setCheckinAnywhere] = useState(false)
  const [savingAnywhere,  setSavingAnywhere]  = useState(false)
  const [canSelfSchedule, setCanSelfSchedule] = useState(false)
  const [savingSelfSched, setSavingSelfSched] = useState(false)

  const load = useCallback(async () => {
    const [{ data: allCompanyBranches }, { data: companiesList }, { data: allowed }, { data: empData }] = await Promise.all([
      // ดึงสาขาจาก ทุกบริษัท
      supabase.from("branches").select("id,name,address,latitude,longitude,geo_radius_m,company_id").eq("is_active", true).order("name"),
      supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th"),
      supabase.from("employee_allowed_locations")
        .select("id,branch_id,custom_name,custom_lat,custom_lng,custom_radius_m,branch:branches(id,name,geo_radius_m)")
        .eq("employee_id", employeeId),
      supabase.from("employees").select("checkin_anywhere, can_self_schedule").eq("id", employeeId).maybeSingle(),
    ])
    setAllBranches(allCompanyBranches ?? [])
    setBranchCompanies(companiesList ?? [])
    setAllowedRows(allowed ?? [])
    setCheckinAnywhere(!!(empData as any)?.checkin_anywhere)
    setCanSelfSchedule(!!(empData as any)?.can_self_schedule)
  }, [employeeId])

  useEffect(() => { load() }, [load])

  const branchAllowedIds = new Set(allowedRows.filter(r => r.branch_id).map(r => r.branch_id))

  const toggleBranch = async (branchId: string) => {
    setSaving(branchId)
    if (branchAllowedIds.has(branchId)) {
      const row = allowedRows.find((r: any) => r.branch_id === branchId)
      if (row) await supabase.from("employee_allowed_locations").delete().eq("id", row.id)
      toast.success("ยกเลิกสิทธิ์แล้ว")
    } else {
      await supabase.from("employee_allowed_locations").insert({ employee_id: employeeId, branch_id: branchId, created_by: user?.employee_id ?? null })
      toast.success("เพิ่มสิทธิ์แล้ว")
    }
    setSaving(null); load()
  }

  const addCustom = async () => {
    const { name, lat, lng, radius } = customForm
    const latNum = parseFloat(lat), lngNum = parseFloat(lng)
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum)) return toast.error("กรุณากรอก Latitude/Longitude ให้ถูกต้อง")
    if (latNum < -90 || latNum > 90) return toast.error("Latitude ต้องอยู่ระหว่าง -90 ถึง 90")
    if (lngNum < -180 || lngNum > 180) return toast.error("Longitude ต้องอยู่ระหว่าง -180 ถึง 180")
    setSavingCustom(true)
    const { error } = await supabase.from("employee_allowed_locations").insert({
      employee_id:       employeeId,
      branch_id:         null,
      custom_name:       name || `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`,
      custom_lat:        latNum,
      custom_lng:        lngNum,
      custom_radius_m:   Number(radius) || 200,
      created_by:        user?.employee_id ?? null,
    })
    setSavingCustom(false)
    if (error) { toast.error(error.message); return }
    toast.success("✓ เพิ่มสถานที่เช็คอินแล้ว")
    setCustomForm({ name:"", lat:"", lng:"", radius:"200" })
    setShowCustom(false); load()
  }

  const pasteLatLng = (val: string) => {
    // รองรับ "13.726932874684474, 100.49304284696417" หรือ "13.7269,100.4930"
    const parts = val.replace(/\s/g,"").split(",")
    if (parts.length >= 2) {
      const latV = parseFloat(parts[0]), lngV = parseFloat(parts[1])
      if (!isNaN(latV) && !isNaN(lngV)) {
        setCustomForm(f => ({ ...f, lat: String(latV), lng: String(lngV) }))
        toast.success("วาง Lat/Lng สำเร็จ")
        return
      }
    }
    setCustomForm(f => ({ ...f, lat: val }))
  }

  const removeCustom = async (id: string) => {
    await supabase.from("employee_allowed_locations").delete().eq("id", id)
    toast.success("ลบแล้ว"); load()
  }

  const customRows = allowedRows.filter(r => !r.branch_id)

  const toggleAnywhere = async () => {
    setSavingAnywhere(true)
    const newVal = !checkinAnywhere
    const { error } = await supabase.from("employees").update({ checkin_anywhere: newVal }).eq("id", employeeId)
    if (error) { toast.error(error.message) } else {
      setCheckinAnywhere(newVal)
      toast.success(newVal ? "เปิดเช็คอิน Anywhere แล้ว" : "ปิดเช็คอิน Anywhere แล้ว")
    }
    setSavingAnywhere(false)
  }

  const toggleSelfSchedule = async () => {
    setSavingSelfSched(true)
    const newVal = !canSelfSchedule
    const { error } = await supabase.from("employees").update({ can_self_schedule: newVal }).eq("id", employeeId)
    if (error) { toast.error(error.message) } else {
      setCanSelfSchedule(newVal)
      toast.success(newVal ? "เปิดวางกะเองแล้ว" : "ปิดวางกะเองแล้ว")
    }
    setSavingSelfSched(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">สิทธิ์เช็คอิน</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            กำหนดสาขาหรือพิกัด GPS ที่พนักงานสามารถเช็คอินได้
            <span className="ml-1.5 font-bold text-indigo-600">{allowedRows.length} สถานที่</span>
          </p>
        </div>
        <button onClick={() => setShowCustom(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all ${showCustom ? "bg-slate-100 text-slate-600" : "bg-pink-600 text-white shadow-sm shadow-pink-200"}`}>
          {showCustom ? <X size={12}/> : <Plus size={12}/>}
          {showCustom ? "ยกเลิก" : "เพิ่มพิกัด"}
        </button>
      </div>

      {/* ── Checkin Anywhere Toggle ── */}
      <div className={`mb-5 p-4 rounded-2xl border-2 transition-all ${checkinAnywhere ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${checkinAnywhere ? "bg-emerald-100" : "bg-slate-200"}`}>
              <Globe size={18} className={checkinAnywhere ? "text-emerald-600" : "text-slate-400"} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">เช็คอิน Anywhere</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {checkinAnywhere
                  ? "พนักงานเช็คอิน/เช็คเอ้าท์ที่ไหนก็ได้ ไม่ตรวจสอบพิกัด GPS"
                  : "เช็คอินได้เฉพาะสาขาหรือพิกัดที่กำหนดเท่านั้น"
                }
              </p>
            </div>
          </div>
          <button onClick={toggleAnywhere} disabled={savingAnywhere}
            className={`relative w-14 h-7 rounded-full transition-all duration-200 ${checkinAnywhere ? "bg-emerald-500" : "bg-slate-300"} ${savingAnywhere ? "opacity-50" : ""}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-200 ${checkinAnywhere ? "left-7" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* ── Self-Schedule Toggle ── */}
      <div className={`mb-5 p-4 rounded-2xl border-2 transition-all ${canSelfSchedule ? "bg-violet-50 border-violet-300" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${canSelfSchedule ? "bg-violet-100" : "bg-slate-200"}`}>
              <CalendarClock size={18} className={canSelfSchedule ? "text-violet-600" : "text-slate-400"} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">วางกะเอง (Self-Schedule)</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {canSelfSchedule
                  ? "พนักงานสามารถวางกะการทำงานด้วยตัวเองได้ — เปลี่ยนกะต้องอนุมัติ"
                  : "พนักงานไม่สามารถวางกะเอง — หัวหน้าหรือ Admin กำหนดให้เท่านั้น"
                }
              </p>
            </div>
          </div>
          <button onClick={toggleSelfSchedule} disabled={savingSelfSched}
            className={`relative w-14 h-7 rounded-full transition-all duration-200 ${canSelfSchedule ? "bg-violet-500" : "bg-slate-300"} ${savingSelfSched ? "opacity-50" : ""}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-200 ${canSelfSchedule ? "left-7" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* ── Custom GPS form ── */}
      {showCustom && (
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-pink-500"/>
            <p className="text-xs font-bold text-pink-700 uppercase tracking-wide">เพิ่มพิกัด GPS</p>
          </div>

          {/* Paste lat,lng single field */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">วางพิกัด (lat, lng)</label>
            <input
              className={inp}
              placeholder="เช่น 13.726932874684474, 100.49304284696417"
              onPaste={e => { e.preventDefault(); pasteLatLng(e.clipboardData.getData("text")) }}
              onBlur={e => { if (e.target.value.includes(",")) pasteLatLng(e.target.value) }}
              onChange={e => e.target.value.includes(",") && pasteLatLng(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">วางค่าจาก Google Maps แล้วระบบจะแยก Lat/Lng ให้อัตโนมัติ</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Latitude</label>
              <input type="number" step="any" value={customForm.lat} onChange={e => setCustomForm(f => ({ ...f, lat:e.target.value }))} className={inp} placeholder="13.7269..."/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Longitude</label>
              <input type="number" step="any" value={customForm.lng} onChange={e => setCustomForm(f => ({ ...f, lng:e.target.value }))} className={inp} placeholder="100.4930..."/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อสถานที่ (ไม่บังคับ)</label>
              <input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name:e.target.value }))} className={inp} placeholder="เช่น ออฟฟิศลาดพร้าว"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">รัศมี (เมตร)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={customForm.radius} onChange={e => setCustomForm(f => ({ ...f, radius:e.target.value }))} className={inp} min="50" max="2000"/>
                <span className="text-xs text-slate-400 flex-shrink-0">ม.</span>
              </div>
              <input type="range" min="50" max="500" step="50" value={customForm.radius}
                onChange={e => setCustomForm(f => ({ ...f, radius:e.target.value }))}
                className="w-full mt-1.5 accent-pink-500"/>
              <div className="flex justify-between text-[9px] text-slate-300 -mt-0.5">
                <span>50</span><span>200</span><span>500ม.</span>
              </div>
            </div>
          </div>

          {/* Map preview text */}
          {customForm.lat && customForm.lng && !isNaN(parseFloat(customForm.lat)) && (
            <a href={`https://www.google.com/maps?q=${customForm.lat},${customForm.lng}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline">
              <MapPin size={11}/> เปิดใน Google Maps เพื่อตรวจสอบ →
            </a>
          )}

          <button onClick={addCustom} disabled={savingCustom}
            className="bg-pink-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-pink-700 disabled:opacity-50 transition-all">
            {savingCustom ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            เพิ่มพิกัดนี้
          </button>
        </div>
      )}

      {/* ── Custom locations ── */}
      {customRows.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">สถานที่ GPS กำหนดเอง ({customRows.length})</p>
          <div className="space-y-2">
            {customRows.map(row => (
              <div key={row.id} className="flex items-center gap-3 p-4 rounded-xl border-2 border-pink-200 bg-pink-50">
                <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-pink-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-pink-800">{row.custom_name || "ไม่มีชื่อ"}</p>
                  <p className="text-[10px] text-pink-500 font-mono mt-0.5">
                    {Number(row.custom_lat).toFixed(6)}, {Number(row.custom_lng).toFixed(6)}
                    <span className="ml-2 not-italic font-sans">· รัศมี {row.custom_radius_m} ม.</span>
                  </p>
                </div>
                <a href={`https://www.google.com/maps?q=${row.custom_lat},${row.custom_lng}`} target="_blank" rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-white border border-pink-100 flex items-center justify-center text-pink-400 hover:text-pink-600 transition-colors">
                  <MapPin size={11}/>
                </a>
                <button onClick={() => removeCustom(row.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Branch list (จัดกลุ่มตามบริษัท) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">สาขาทั้งหมด ({allBranches.length})</p>
          <div className="flex gap-2">
            <button onClick={async () => { const missing = allBranches.filter(b => !branchAllowedIds.has(b.id)); if (!missing.length) return; await supabase.from("employee_allowed_locations").insert(missing.map(b => ({ employee_id: employeeId, branch_id: b.id, created_by: user?.employee_id??null }))); toast.success(`เพิ่ม ${missing.length} สาขา`); load() }} className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">✓ ทั้งหมด</button>
            <button onClick={async () => { if (!confirm("ยกเลิกสาขาทั้งหมด?")) return; const ids = allowedRows.filter(r=>r.branch_id).map(r=>r.id); for (const id of ids) await supabase.from("employee_allowed_locations").delete().eq("id",id); toast.success("ยกเลิกแล้ว"); load() }} className="text-[10px] font-bold px-2.5 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">✗ ล้าง</button>
          </div>
        </div>

        {branchCompanies.map((company: any) => {
          const compBranches = allBranches.filter(b => b.company_id === company.id)
          if (compBranches.length === 0) return null
          const compAllowedCount = compBranches.filter(b => branchAllowedIds.has(b.id)).length
          return (
            <div key={company.id} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <Building2 size={12}/>
                  {company.code ? `[${company.code}] ` : ""}{company.name_th}
                  <span className="text-[10px] font-normal text-slate-400 ml-1">({compBranches.length} สาขา · เลือกแล้ว {compAllowedCount})</span>
                </p>
                <div className="flex gap-1.5">
                  <button onClick={async () => {
                    const missing = compBranches.filter(b => !branchAllowedIds.has(b.id))
                    if (!missing.length) return
                    await supabase.from("employee_allowed_locations").insert(missing.map(b => ({ employee_id: employeeId, branch_id: b.id, created_by: user?.employee_id??null })))
                    toast.success(`เพิ่ม ${missing.length} สาขาของ ${company.code||company.name_th}`)
                    load()
                  }} className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">✓ ทั้งหมด</button>
                  <button onClick={async () => {
                    const ids = allowedRows.filter(r => r.branch_id && compBranches.some(b => b.id === r.branch_id)).map(r => r.id)
                    if (!ids.length) return
                    for (const rid of ids) await supabase.from("employee_allowed_locations").delete().eq("id", rid)
                    toast.success("ยกเลิกแล้ว"); load()
                  }} className="text-[9px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">✗ ล้าง</button>
                </div>
              </div>
              <div className="space-y-2">
                {compBranches.map(b => {
                  const allowed = branchAllowedIds.has(b.id)
                  return (
                    <div key={b.id} onClick={() => !saving && toggleBranch(b.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${allowed ? "border-green-300 bg-green-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${allowed ? "bg-green-100" : "bg-slate-100"}`}>
                        {saving===b.id ? <Loader2 size={14} className="animate-spin text-slate-400"/> : <Building2 size={14} className={allowed?"text-green-600":"text-slate-400"}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${allowed?"text-green-800":"text-slate-700"}`}>{b.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {b.address && b.address+" · "}
                          {b.latitude ? `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` : "ไม่มีพิกัด"}
                          {b.geo_radius_m ? ` · รัศมี ${b.geo_radius_m} ม.` : ""}
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${allowed?"bg-green-500 text-white":"bg-white border-2 border-slate-200 text-slate-300"}`}>
                        {allowed ? <Check size={14}/> : <X size={12}/>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* สาขาที่ไม่มี company (ถ้ามี) */}
        {allBranches.filter(b => !b.company_id || !branchCompanies.some((c: any) => c.id === b.company_id)).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-500 mb-2">สาขาอื่นๆ</p>
            <div className="space-y-2">
              {allBranches.filter(b => !b.company_id || !branchCompanies.some((c: any) => c.id === b.company_id)).map(b => {
                const allowed = branchAllowedIds.has(b.id)
                return (
                  <div key={b.id} onClick={() => !saving && toggleBranch(b.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${allowed ? "border-green-300 bg-green-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${allowed ? "bg-green-100" : "bg-slate-100"}`}>
                      {saving===b.id ? <Loader2 size={14} className="animate-spin text-slate-400"/> : <Building2 size={14} className={allowed?"text-green-600":"text-slate-400"}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${allowed?"text-green-800":"text-slate-700"}`}>{b.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {b.address && b.address+" · "}
                        {b.latitude ? `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` : "ไม่มีพิกัด"}
                        {b.geo_radius_m ? ` · รัศมี ${b.geo_radius_m} ม.` : ""}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${allowed?"bg-green-500 text-white":"bg-white border-2 border-slate-200 text-slate-300"}`}>
                      {allowed ? <Check size={14}/> : <X size={12}/>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {allBranches.length === 0 && <p className="text-center text-slate-300 py-6 text-sm">ยังไม่มีสาขา</p>}
      </div>
    </div>
  )
}

// ─── RoleManagementTab ───────────────────────────────────────────────────────
function RoleManagementTab({ employeeId, employeeName, employeeEmail }: { employeeId: string; employeeName: string; employeeEmail: string }) {
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{ password: string; email_sent: boolean } | null>(null)
  // ── Password & Email management ──
  const [customPassword, setCustomPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentEmail, setCurrentEmail] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [changingEmail, setChangingEmail] = useState(false)
  // ── State สำหรับสร้างบัญชีใหม่ ──
  const [createEmail, setCreateEmail] = useState(employeeEmail)
  const [createPassword, setCreatePassword] = useState("")
  const [showCreatePw, setShowCreatePw] = useState(false)
  const [createRole, setCreateRole] = useState("employee")
  const [creating, setCreating] = useState(false)
  const [emailResult, setEmailResult] = useState<{ old_email: string; new_email: string } | null>(null)

  const ROLES = [
    { value: "employee",        label: "พนักงาน",         desc: "เข้าถึงได้เฉพาะหน้าพนักงาน (เช็คอิน, ดูตาราง, ลา)",                        color: "bg-slate-100 text-slate-700 border-slate-200",    icon: "👤" },
    { value: "manager",         label: "หัวหน้าทีม",       desc: "อนุมัติคำขอ, จัดกะ, ดูข้อมูลลูกทีม + สิทธิ์พนักงาน",                        color: "bg-violet-100 text-violet-700 border-violet-200", icon: "👥" },
    { value: "equipment_admin", label: "ผู้ดูแลอุปกรณ์",   desc: "จัดการอุปกรณ์, สต๊อก, อนุมัติคำขอยืม-คืนอุปกรณ์",                           color: "bg-cyan-100 text-cyan-700 border-cyan-200",       icon: "📦" },
    { value: "hr_admin",        label: "HR Admin",         desc: "จัดการพนักงาน, เงินเดือน, รายงาน, ตั้งค่าทั้งหมดในบริษัท",                   color: "bg-blue-100 text-blue-700 border-blue-200",       icon: "🛡️" },
    { value: "super_admin",     label: "Super Admin",      desc: "สิทธิ์สูงสุด — จัดการทุกบริษัท, ดูข้อมูลข้ามบริษัท",                         color: "bg-amber-100 text-amber-700 border-amber-200",    icon: "⚡" },
  ]

  useEffect(() => {
    fetch(`/api/users/role?employee_id=${employeeId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) {
          setCurrentRole(data.user.role)
          setSelectedRole(data.user.role)
          setHasAccount(true)
          if (data.user.email) setCurrentEmail(data.user.email)
        } else {
          setHasAccount(false)
        }
        setLoading(false)
      })
  }, [employeeId])

  const handleSave = async () => {
    if (!selectedRole || selectedRole === currentRole) return
    setSaving(true)
    const res = await fetch("/api/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId, role: selectedRole }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      setCurrentRole(selectedRole)
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  if (!hasAccount) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-amber-800">พนักงานนี้ยังไม่มีบัญชีล็อกอิน</p>
              <p className="text-xs text-amber-600">สร้างบัญชีด้านล่างเพื่อให้พนักงานเข้าสู่ระบบได้</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-500" />
            สร้างบัญชีล็อกอิน
          </h3>

          {/* อีเมล */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล (ใช้เข้าสู่ระบบ)</label>
            <input
              type="email"
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              placeholder="example@company.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showCreatePw ? "text" : "password"}
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none pr-20"
              />
              <button
                type="button"
                onClick={() => setShowCreatePw(!showCreatePw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                {showCreatePw ? "ซ่อน" : "แสดง"}
              </button>
            </div>
            {createPassword.length > 0 && createPassword.length < 6 && (
              <p className="text-xs text-red-500 mt-1">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
            )}
          </div>

          {/* บทบาท */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">บทบาท</label>
            <select
              value={createRole}
              onChange={e => setCreateRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="employee">👤 พนักงาน</option>
              <option value="manager">👥 หัวหน้าทีม</option>
              <option value="equipment_admin">📦 ผู้ดูแลอุปกรณ์</option>
              <option value="hr_admin">🛡️ HR Admin</option>
              <option value="super_admin">⚡ Super Admin</option>
            </select>
          </div>

          {/* ปุ่มสร้าง */}
          <button
            onClick={async () => {
              if (!createEmail.trim()) { toast.error("กรุณากรอกอีเมล"); return }
              if (createPassword.length < 6) { toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return }
              setCreating(true)
              try {
                const res = await fetch("/api/auth/create-account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    employee_id: employeeId,
                    email: createEmail.trim(),
                    password: createPassword,
                    role: createRole,
                  }),
                })
                const data = await res.json()
                if (data.success) {
                  toast.success(data.message)
                  setHasAccount(true)
                  setCurrentRole(createRole)
                  setSelectedRole(createRole)
                  setCurrentEmail(createEmail.trim().toLowerCase())
                } else {
                  toast.error(data.error || "เกิดข้อผิดพลาด")
                }
              } catch {
                toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ")
              }
              setCreating(false)
            }}
            disabled={creating || !createEmail.trim() || createPassword.length < 6}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {creating ? (
              <><Loader2 size={16} className="animate-spin" /> กำลังสร้างบัญชี...</>
            ) : (
              <><UserCheck size={16} /> สร้างบัญชีล็อกอิน</>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-800">บทบาทและสิทธิ์การเข้าถึง</h3>
          <p className="text-xs text-slate-400 mt-0.5">กำหนดระดับการเข้าถึงระบบของ {employeeName}</p>
        </div>
        {currentRole && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${ROLES.find(r => r.value === currentRole)?.color ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {ROLES.find(r => r.value === currentRole)?.icon} ปัจจุบัน: {ROLES.find(r => r.value === currentRole)?.label ?? currentRole}
          </span>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {ROLES.map(role => {
          const isSelected = selectedRole === role.value
          const isCurrent = currentRole === role.value
          return (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isSelected ? "bg-indigo-100" : "bg-slate-50"}`}>
                  {role.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${isSelected ? "text-indigo-800" : "text-slate-700"}`}>{role.label}</p>
                    {isCurrent && (
                      <span className="text-[9px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded-full">ปัจจุบัน</span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>{role.desc}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                  isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-200"
                }`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedRole !== currentRole && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            บันทึกบทบาท
          </button>
          <button
            onClick={() => setSelectedRole(currentRole ?? "")}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ยกเลิก
          </button>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={12} /> เปลี่ยนจาก {ROLES.find(r => r.value === currentRole)?.label} → {ROLES.find(r => r.value === selectedRole)?.label}
          </p>
        </div>
      )}

      {/* ── Change Email Section ── */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-blue-500" />
          <h3 className="font-bold text-slate-800 text-sm">อีเมลล็อกอิน</h3>
        </div>

        {currentEmail && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-slate-400 mb-0.5">อีเมลปัจจุบัน</p>
            <p className="text-sm font-semibold text-slate-700 select-all">{currentEmail}</p>
          </div>
        )}

        {emailResult ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-sm font-bold text-green-800">เปลี่ยนอีเมลสำเร็จ</p>
            </div>
            <p className="text-xs text-slate-600">
              {emailResult.old_email} → <span className="font-bold text-green-700">{emailResult.new_email}</span>
            </p>
            <button onClick={() => { setEmailResult(null); setNewEmail("") }}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">ซ่อน</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="อีเมลใหม่..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
            />
            <button
              onClick={async () => {
                if (!newEmail.trim()) { toast.error("กรุณากรอกอีเมลใหม่"); return }
                if (!confirm(`เปลี่ยนอีเมลล็อกอินของ ${employeeName}\nจาก: ${currentEmail}\nเป็น: ${newEmail.trim()} ?`)) return
                setChangingEmail(true)
                try {
                  const res = await fetch("/api/auth/change-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_id: employeeId, new_email: newEmail.trim() }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || "เปลี่ยนอีเมลไม่สำเร็จ")
                  setEmailResult({ old_email: data.old_email, new_email: data.new_email })
                  setCurrentEmail(data.new_email)
                  toast.success(data.message)
                } catch (e: any) {
                  toast.error(e.message)
                } finally {
                  setChangingEmail(false)
                }
              }}
              disabled={changingEmail || !newEmail.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {changingEmail ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {changingEmail ? "กำลังเปลี่ยน..." : "เปลี่ยนอีเมล"}
            </button>
          </div>
        )}
      </div>

      {/* ── Reset Password Section ── */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-amber-500" />
          <h3 className="font-bold text-slate-800 text-sm">รีเซ็ตรหัสผ่าน</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          กรอกรหัสผ่านใหม่เอง หรือเว้นว่างเพื่อให้ระบบสุ่มรหัสอัตโนมัติ
        </p>

        {resetResult ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-sm font-bold text-green-800">รีเซ็ตรหัสผ่านสำเร็จ</p>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-green-100 mb-2">
              <p className="text-xs text-slate-400">รหัสผ่านใหม่</p>
              <p className="text-lg font-mono font-bold text-slate-800 tracking-wider select-all">{resetResult.password}</p>
            </div>
            <p className="text-xs text-green-600">
              {resetResult.email_sent ? "ส่งอีเมลแจ้งพนักงานแล้ว" : "ไม่สามารถส่งอีเมลได้ กรุณาแจ้งรหัสผ่านให้พนักงานด้วยตนเอง"}
            </p>
            <button onClick={() => { setResetResult(null); setCustomPassword("") }}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">ซ่อน</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={customPassword}
                onChange={e => setCustomPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่ (เว้นว่าง = สุ่มอัตโนมัติ)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <X size={16} /> : <Globe size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const pw = customPassword.trim()
                  if (pw && pw.length < 6) { toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return }
                  const msg = pw
                    ? `ตั้งรหัสผ่านใหม่ของ ${employeeName} เป็น "${pw}" ?`
                    : `สุ่มรหัสผ่านใหม่ให้ ${employeeName} ?`
                  if (!confirm(msg)) return
                  setResetting(true)
                  try {
                    const body: any = { employee_id: employeeId }
                    if (pw) body.new_password = pw
                    const res = await fetch("/api/auth/admin-reset", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || "รีเซ็ตไม่สำเร็จ")
                    setResetResult({ password: data.password, email_sent: data.email_sent })
                    toast.success(data.message)
                  } catch (e: any) {
                    toast.error(e.message)
                  } finally {
                    setResetting(false)
                  }
                }}
                disabled={resetting}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {resetting ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                {resetting ? "กำลังรีเซ็ต..." : customPassword.trim() ? "ตั้งรหัสผ่านนี้" : "สุ่มรหัสผ่านใหม่"}
              </button>
              {customPassword.trim() && (
                <p className="text-xs text-slate-400">จะตั้งเป็นรหัสที่กรอก</p>
              )}
              {!customPassword.trim() && (
                <p className="text-xs text-slate-400">ระบบจะสุ่มรหัสให้อัตโนมัติ</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Leave Quota Tab ──────────────────────────────────────────────────────────
function LeaveQuotaTab({ employeeId, companyId }: { employeeId: string; companyId?: string }) {
  const [balances, setBalances] = useState<any[]>([])
  const [leaveHistory, setLeaveHistory] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!employeeId) return
    fetch(`/api/admin/leave-quota?company_id=${companyId || "all"}&year=${year}`)
      .then(r => r.json())
      .then(d => {
        const empBalances = (d.balances ?? []).filter((b: any) => b.employee_id === employeeId)
        const leaveTypes = d.leaveTypes ?? []
        const enriched = empBalances.map((b: any) => ({
          ...b,
          leave_type: leaveTypes.find((lt: any) => lt.id === b.leave_type_id) || null,
        }))
        enriched.sort((a: any, b: any) => (b.entitled_days || 0) - (a.entitled_days || 0))
        setBalances(enriched)
        // ประวัติการลาของพนักงานคนนี้
        const empLeaves = (d.leaveRequests ?? [])
          .filter((lr: any) => lr.employee_id === employeeId)
          .map((lr: any) => ({
            ...lr,
            leave_type: leaveTypes.find((lt: any) => lt.id === lr.leave_type_id) || null,
          }))
        setLeaveHistory(empLeaves)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [employeeId, year, companyId])

  if (loading) return <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 size={16} className="animate-spin"/>กำลังโหลด...</div>

  if (balances.length === 0) return (
    <div className="py-16 text-center">
      <Calendar size={24} className="mx-auto text-slate-200 mb-2"/>
      <p className="text-slate-400 text-sm">ยังไม่มีโควต้าการลาสำหรับปี {year}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-500"/>
          โควต้าการลา {year}
        </h3>
        <span className="text-xs text-slate-400">{balances.length} ประเภท</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-bold text-blue-400 uppercase">โควต้ารวม</p>
          <p className="text-xl font-black text-blue-700">{balances.reduce((s, b) => s + (b.entitled_days || 0), 0).toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-[10px] font-bold text-amber-400 uppercase">ใช้ไปรวม</p>
          <p className="text-xl font-black text-amber-700">{balances.reduce((s, b) => s + (b.used_days || 0), 0).toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">คงเหลือรวม</p>
          <p className="text-xl font-black text-emerald-700">{balances.reduce((s, b) => s + (b.remaining_days || 0), 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">ประเภทการลา</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">โควต้า</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">ใช้ไป</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">รอ</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">คงเหลือ</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase w-[120px]">สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b: any) => {
              const lt = b.leave_type
              const hex = lt?.color_hex || "#3b82f6"
              const pct = b.entitled_days > 0 ? Math.min(b.used_days / b.entitled_days * 100, 100) : 0
              const isLow = b.remaining_days <= 2 && b.entitled_days > 0
              return (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex }}/>
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{lt?.name || "—"}</p>
                        <p className="text-[10px] text-slate-400">{lt?.is_paid ? "ได้รับเงิน" : "ไม่ได้รับเงิน"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-slate-600">{b.entitled_days}</td>
                  <td className={`px-3 py-3 text-center font-bold ${pct > 80 ? "text-red-600" : "text-slate-600"}`}>{b.used_days}</td>
                  <td className="px-3 py-3 text-center text-amber-600 font-medium">{b.pending_days}</td>
                  <td className={`px-3 py-3 text-center font-black ${isLow ? "text-red-600" : "text-emerald-600"}`}>{b.remaining_days}</td>
                  <td className="px-3 py-3">
                    <div className="w-full h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: hex }}/>
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-0.5">{pct.toFixed(0)}%</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── ประวัติการลา ── */}
      <div className="mt-4">
        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-sky-500"/>
          ประวัติการลา {year}
        </h4>
        {leaveHistory.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-4">ยังไม่มีประวัติการลาในปีนี้</p>
        ) : (
          <div className="space-y-1.5">
            {leaveHistory.map((lr: any) => {
              const isSameDay = lr.start_date === lr.end_date
              return (
                <div key={lr.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lr.leave_type?.color_hex || "#94a3b8" }} />
                  <span className="font-bold text-slate-600 min-w-[80px]">{lr.leave_type?.name || "ลา"}</span>
                  <span className="text-slate-500">
                    {new Date(lr.start_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    {!isSameDay && ` – ${new Date(lr.end_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                  </span>
                  <span className="text-slate-400">{lr.total_days} วัน</span>
                  {lr.is_half_day && <span className="text-blue-500 text-[10px]">(ครึ่งวัน)</span>}
                  {lr.reason && <span className="text-slate-300 truncate max-w-[150px] ml-auto" title={lr.reason}>{lr.reason}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}