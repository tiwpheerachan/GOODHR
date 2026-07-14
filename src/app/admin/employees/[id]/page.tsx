"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, Save, Loader2, Plus, MapPin, Check, X, Building2, Trash2,
  Clock, Calendar, DollarSign, BarChart2, User2, ChevronRight, CalendarClock,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, UserX, UserCheck, History, Globe, ShieldAlert, Pencil,
  Briefcase, Layers, Store, Mail, Phone, Shield,
  LayoutDashboard, Receipt, Network, Tag, Link2, Package, DoorOpen, Gavel, CalendarDays, FileText,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { recomputePayroll } from "@/lib/utils/payroll"
import AdditionalEvaluatorsSection from "@/components/admin/AdditionalEvaluatorsSection"
import ProbationAssignmentsSection from "@/components/admin/ProbationAssignmentsSection"
import EvaluationChainPanel from "@/components/admin/EvaluationChainPanel"
import { computePhase2Start } from "@/lib/utils/payroll"
import { systemEffectivePassedDate, probationEvalDeadline, nextPayrollCycleEnd } from "@/lib/utils/payrollCycle"
import FeishuLinkTab from "@/components/employees/FeishuLinkTab"
import BrandsTab from "@/components/employees/BrandsTab"
import EmployeeBorrowingTab from "@/components/employees/EmployeeBorrowingTab"
import DisciplineTab from "@/components/employees/DisciplineTab"
import DocumentsTab from "@/components/employees/DocumentsTab"
import EmployeeShaderBg from "@/components/ui/employee-shader-bg"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { usePayrollAccess } from "@/lib/hooks/usePayrollAccess"

// แท็บที่ต้องมีสิทธิ์เงินเดือน (payroll_access) ถึงจะเห็น
const PAYROLL_TAB_KEYS = ["tab_salary", "tab_payroll_summary"]

const TAB_KEYS = ["tab_summary","tab_personal","tab_employment","tab_salary","tab_payroll_summary","tab_schedule","tab_checkin","tab_mgr_history","tab_roles","tab_leave_quota","tab_eval_chain","tab_brands","tab_feishu","tab_borrow","tab_resign","tab_discipline","tab_documents"]

const TAB_ICONS: Record<string, any> = {
  tab_summary: LayoutDashboard,
  tab_personal: User2,
  tab_employment: Briefcase,
  tab_salary: DollarSign,
  tab_payroll_summary: Receipt,
  tab_schedule: CalendarDays,
  tab_checkin: MapPin,
  tab_mgr_history: History,
  tab_roles: Shield,
  tab_leave_quota: CalendarClock,
  tab_eval_chain: Network,
  tab_brands: Tag,
  tab_feishu: Link2,
  tab_borrow: Package,
  tab_resign: DoorOpen,
  tab_discipline: Gavel,
  tab_documents: FileText,
}
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
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const { canCompany } = usePayrollAccess()
  const supabase = createClient()

  const [emp,        setEmp]        = useState<any>(null)
  // สิทธิ์ดูเงินเดือน "รายบริษัท" — ต้องมีสิทธิ์บริษัทของพนักงานคนนี้
  const canPayroll = canCompany(emp?.company_id)
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
  // Probation evaluator
  const [probEvalSearch, setProbEvalSearch] = useState<string | null>(null)
  const [showProbEvalDropdown, setShowProbEvalDropdown] = useState(false)
  // resign modal
  const [kpiSetting, setKpiSetting] = useState<any>(null)
  const [kpiAmount,  setKpiAmount]  = useState<string>("")
  const [showResignModal, setShowResignModal] = useState(false)
  const [resignDate, setResignDate] = useState(format(new Date(),"yyyy-MM-dd"))
  const [resignReason, setResignReason] = useState("")
  const [resignLoading, setResignLoading] = useState(false)
  const [resignHistory, setResignHistory] = useState<any[]>([])
  const [showReinstateModal, setShowReinstateModal] = useState(false)
  // ── แท็บลาออก: เหตุผล + หลักฐาน ──
  const [resignReasonEdit,    setResignReasonEdit]    = useState("")
  const [resignAttach,        setResignAttach]        = useState<Array<{ url: string; name: string; size?: number }>>([])
  const [resignAttachUploading, setResignAttachUploading] = useState(false)
  const [resignTabSaving,     setResignTabSaving]     = useState(false)
  const resignFileRef = useRef<HTMLInputElement>(null)
  // promote (pass probation)
  const [promotion, setPromotion] = useState<any>(null)
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false)
  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  // ── ประวัติเงินเดือน + ตำแหน่ง ──
  const [salaryHistory, setSalaryHistory] = useState<any[]>([])
  const [positionHistory, setPositionHistory] = useState<any[]>([])
  const [historyTick, setHistoryTick] = useState(0)
  const [branches, setBranches] = useState<any[]>([])
  const [newPositionName, setNewPositionName] = useState("")
  const [creatingPosition, setCreatingPosition] = useState(false)
  const [newDeptName, setNewDeptName] = useState("")
  const [creatingDept, setCreatingDept] = useState(false)

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const createDepartment = async () => {
    const cid = form?.company_id || emp?.company_id
    if (!newDeptName.trim()) { toast.error(t("admin.emp_detail.toast_enter_dept_name")); return }
    if (!cid) { toast.error(t("admin.emp_detail.toast_no_company")); return }
    setCreatingDept(true)
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_department", name: newDeptName.trim(), company_id: cid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.toast_dept_create_fail"))
      const newDept = { id: data.department_id, name: newDeptName.trim() }
      setDepartments((prev: any[]) => [...prev, newDept].sort((a, b) => a.name.localeCompare(b.name)))
      set("department_id", data.department_id)
      setNewDeptName("")
      toast.success(t("admin.emp_detail.toast_dept_added", { name: newDeptName.trim() }))
    } catch (e: any) { toast.error(e.message || t("admin.emp_detail.toast_dept_create_fail")) }
    setCreatingDept(false)
  }

  const createPosition = async () => {
    const cid = form?.company_id || emp?.company_id
    const name = newPositionName.trim()
    if (!name) { toast.error(t("admin.emp_detail.toast_enter_pos_name")); return }
    if (!cid) { toast.error(t("admin.emp_detail.toast_no_company")); return }
    setCreatingPosition(true)
    try {
      // Auto-generate code (column NOT NULL)
      const slug = name.slice(0, 20).replace(/[^A-Za-z0-9]/g, "_")
      const hash = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16)).replace(/-/g, "").slice(0, 6)
      const code = `${slug}_${hash}`
      const { data, error } = await supabase.from("positions").insert({
        name, code, company_id: cid,
      }).select("id, name").single()
      if (error) throw error
      setPositions((prev: any[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      set("position_id", data.id)
      setNewPositionName("")
      toast.success(t("admin.emp_detail.toast_pos_added", { name: data.name }))
    } catch (e: any) { toast.error(e.message || t("admin.emp_detail.toast_pos_create_fail")) }
    setCreatingPosition(false)
  }

  // ── โหลดข้อมูลหลักทั้งหมดพร้อมกันใน Promise.all เดียว ──
  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from("employees").select("*, position:positions(name), department:departments(name), branch:branches(name), feishu:feishu_users!feishu_users_goodhr_employee_id_fkey(brand, name_cn, name_en, nickname)").eq("id",id as string).single(),
      supabase.from("salary_structures").select("*").eq("employee_id",id as string).is("effective_to",null).order("effective_from",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("employee_manager_history").select("*, manager:employees!manager_id(id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en)").eq("employee_id",id as string).order("effective_from",{ascending:false}),
      supabase.from("kpi_bonus_settings").select("*").eq("employee_id",id as string).eq("is_active",true).maybeSingle(),
      supabase.from("resignation_history").select("*").eq("employee_id",id as string).order("created_at",{ascending:false}),
      supabase.from("employee_probation_promotions").select("*, new_position:positions(name)").eq("employee_id",id as string).eq("is_applied",false).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th"),
    ]).then(([e, s, h, kpi, resign, promo, comp]) => {
      if (e.data) {
        setEmp(e.data); setForm(e.data)
        setResignReasonEdit(e.data.resign_reason || "")
        setResignAttach(Array.isArray(e.data.resign_attachments) ? e.data.resign_attachments : [])
        // ── โหลด kpi_evaluator แยก (column อาจยังไม่มีถ้ายังไม่รัน migration) ──
        if (e.data.kpi_evaluator_id) {
          supabase.from("employees").select("id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code")
            .eq("id", e.data.kpi_evaluator_id).single()
            .then(({ data: ev }) => {
              if (ev) setKpiEvalSearch(`${empName(ev)} (${ev.employee_code})`)
            })
        }
        // ── โหลด probation_evaluator แยก (column อาจยังไม่มีถ้ายังไม่รัน migration) ──
        if (e.data.probation_evaluator_id) {
          supabase.from("employees").select("id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code")
            .eq("id", e.data.probation_evaluator_id).single()
            .then(({ data: ev }) => {
              if (ev) setProbEvalSearch(`${empName(ev)} (${ev.employee_code})`)
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

  // ── โหลดประวัติเงินเดือน (ทุกเวอร์ชัน) + ประวัติตำแหน่ง (reload เมื่อบันทึก) ──
  useEffect(() => {
    if (!id) return
    supabase.from("salary_structures").select("*").eq("employee_id", id as string)
      .order("effective_from", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data }) => setSalaryHistory(data ?? []))
    supabase.from("employee_position_history")
      .select("*, from_pos:positions!from_position_id(name), to_pos:positions!to_position_id(name), changer:employees!changed_by(first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en)")
      .eq("employee_id", id as string).order("changed_at", { ascending: false })
      .then(({ data }) => setPositionHistory(data ?? []))
  }, [id, historyTick])

  // ── lazy-load รายชื่อพนักงาน: โหลดเฉพาะเมื่อเปิด dropdown ──
  const allEmpsLoaded = useRef(false)
  const loadAllEmps = useCallback(async () => {
    if (allEmpsLoaded.current || !id) return
    allEmpsLoaded.current = true
    // ── ดึงรวม EN names + nickname ด้วย เพื่อให้ client-side search match ได้กว้างขึ้น
    //    (limit เป็น 2000 row — กัน truncate ใน org ใหญ่)
    const { data } = await supabase.from("employees")
      .select("id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code")
      .eq("is_active",true).neq("id",id as string)
      .order("first_name_th").limit(2000)
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
      const newEmail = form.email.trim().toLowerCase()
      try {
        const res = await fetch("/api/auth/change-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: id, new_email: newEmail }),
        })
        const d = await res.json()

        // ── 404 "ไม่พบบัญชี" → fallback ไปสร้างบัญชีใหม่ ───────────────
        if (res.status === 404 && /ไม่พบบัญชี/.test(d?.error || "")) {
          // สุ่มรหัสผ่านเริ่มต้น (12 ตัวอักษร) — admin ต้องส่งให้พนักงาน
          const tempPw = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase()
          const ok = confirm(
            t("admin.emp_detail.confirm_create_account_l1") + `\n\n` +
            t("admin.emp_detail.confirm_create_account_l2") + `\n` +
            t("admin.emp_detail.confirm_create_account_email", { email: newEmail }) + `\n` +
            t("admin.emp_detail.confirm_create_account_pw", { pw: tempPw }) + `\n` +
            t("admin.emp_detail.confirm_create_account_role") + `\n\n` +
            t("admin.emp_detail.confirm_create_account_l3")
          )
          if (!ok) { setLoading(false); return }

          const cRes = await fetch("/api/auth/create-account", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employee_id: id, email: newEmail, password: tempPw, role: "employee",
            }),
          })
          const cD = await cRes.json()
          if (!cRes.ok || !cD.success) {
            toast.error(cD.error || t("admin.emp_detail.toast_create_account_fail"))
            setLoading(false)
            return
          }
          // copy password to clipboard (best effort)
          try { await navigator.clipboard.writeText(tempPw) } catch {}
          toast.success(t("admin.emp_detail.toast_account_created", { email: newEmail, pw: tempPw }), { duration: 10_000 })
        } else if (!res.ok) {
          toast.error(t("admin.emp_detail.toast_email_error", { error: d.error }))
          setLoading(false)
          return
        } else {
          toast.success(t("admin.emp_detail.toast_email_changed", { email: form.email }))
        }
      } catch {
        toast.error(t("admin.emp_detail.toast_email_sync_fail"))
        setLoading(false)
        return
      }
    }

    // ── บันทึกข้อมูลส่วนตัว (รวมอีเมลใหม่) ──
    const { error } = await supabase.from("employees").update({
      title_th: form.title_th || null,
      first_name_th: form.first_name_th, last_name_th: form.last_name_th,
      first_name_en: form.first_name_en, last_name_en: form.last_name_en,
      phone: form.phone, email: form.email, address: form.address,
      national_id: form.national_id, bank_account: form.bank_account, bank_name: form.bank_name,
      nickname: form.nickname,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      nationality: form.nationality || null,
      religion: form.religion || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      emergency_contact_relation: form.emergency_contact_relation || null,
    }).eq("id",id as string)
    if (error) toast.error(t("admin.emp_detail.toast_save_error"))
    else if (!emailChanged) toast.success(t("admin.emp_detail.toast_saved"))

    // อัพเดท emp state ให้ตรงกับข้อมูลใหม่
    setEmp((prev: any) => ({ ...prev, ...form }))
    setLoading(false)
  }

  const saveEmployment = async () => {
    // Validate: ป้องกันปี พ.ศ. (> 2100)
    const yearCheck = (d: string | null | undefined, label: string) => {
      if (!d) return true
      const y = parseInt(d.split("-")[0])
      if (y > 2100) { toast.error(t("admin.emp_detail.toast_year_must_be_ce", { label, y })); return false }
      return true
    }
    if (!yearCheck(form.hire_date, t("admin.emp_detail.emp_hire_date")) || !yearCheck(form.probation_end_date, t("admin.emp_detail.emp_probation_end"))) return

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
    if ("probation_evaluator_id" in form) updateData.probation_evaluator_id = form.probation_evaluator_id || null
    // จ้างงาน 2 เฟส — เขียนเมื่อมี field (migration-safe) + คำนวณ phase2_start_date สดจากวันสิ้นสุด Phase 1
    if ("pre_employment_enabled" in form) {
      const on = !!form.pre_employment_enabled
      updateData.pre_employment_enabled = on
      updateData.pre_employment_from = on ? (form.pre_employment_from || null) : null
      updateData.pre_employment_to = on ? (form.pre_employment_to || null) : null
      updateData.pre_employment_daily_rate = on ? (Number(form.pre_employment_daily_rate) || 500) : null
      // อัตโนมัติเป็นค่าเริ่มต้น แต่ถ้า admin กรอก/แก้เอง → ใช้ค่าที่กรอก
      updateData.phase2_start_date = on ? (form.phase2_start_date || computePhase2Start(form.pre_employment_to)) : null
    }
    const { error } = await supabase.from("employees").update(updateData).eq("id", id as string)
    if (error) toast.error(t("admin.emp_detail.toast_error")); else {
      toast.success(t("admin.emp_detail.toast_saved"))
      // อัปเดต users table ด้วย company_id ถ้าเปลี่ยน
      if (form.company_id && form.company_id !== emp?.company_id) {
        await supabase.from("users").update({ company_id: form.company_id }).eq("employee_id", id as string)
      }
      // ── บันทึกประวัติเปลี่ยนตำแหน่ง (ถ้าเปลี่ยน) ──
      const oldPos = emp?.position_id || null
      const newPos = form.position_id || null
      if (oldPos !== newPos) {
        try {
          await supabase.from("employee_position_history").insert({
            employee_id: id as string,
            company_id: form.company_id || emp?.company_id || null,
            from_position_id: oldPos,
            to_position_id: newPos,
            changed_by: user?.employee_id ?? null,
          })
          setHistoryTick(prev => prev + 1)
        } catch { /* ตาราง position history อาจยังไม่ถูกสร้าง (ยังไม่รัน migration) */ }
      }
      setEmp((prev: any) => ({ ...prev, company_id: form.company_id, department_id: form.department_id, position_id: form.position_id, branch_id: form.branch_id }))
    }
    setLoading(false)
  }

  const saveSalary = async () => {
    if (!sf.base_salary) return toast.error(t("admin.emp_detail.toast_enter_salary"))
    setLoading(true)
    // ปิด salary ที่ยังเปิดอยู่ "ทุกตัว" ของพนักงานคนนี้ ก่อน insert ตัวใหม่
    //   กัน duplicate open structures (effective_to=null) ที่ทำให้ payroll เลือก structure ผิด
    //   → flag is_sso_exempt / is_tax_3pct ไม่ถูกใช้สำหรับบางคน
    await supabase.from("salary_structures")
      .update({ effective_to: sf.effective_from || format(new Date(),"yyyy-MM-dd") })
      .eq("employee_id", id as string)
      .is("effective_to", null)
    const { error } = await supabase.from("salary_structures").insert({
      employee_id:id,
      base_salary:+sf.base_salary,
      allowance_position:+(sf.allowance_position||0),
      allowance_transport:+(sf.allowance_transport||0),
      allowance_food:+(sf.allowance_food||0),
      allowance_phone:+(sf.allowance_phone||0),
      allowance_housing:+(sf.allowance_housing||0),
      // ⚠️ ต้องบันทึกค่าเสื่อมรถยนต์ด้วย (เคยลืม → ค่าหาย)
      allowance_vehicle:+(sf.allowance_vehicle||0),
      ot_rate_normal:+(sf.ot_rate_normal||1.5),
      ot_rate_holiday:+(sf.ot_rate_holiday||3),
      tax_withholding_pct: sf.tax_withholding_pct != null && sf.tax_withholding_pct !== "" ? +sf.tax_withholding_pct : null,
      is_sso_exempt: !!sf.is_sso_exempt,
      is_tax_3pct: !!sf.is_tax_3pct,
      provident_fund_pct: +(sf.provident_fund_pct || 0),
      effective_from:sf.effective_from||format(new Date(),"yyyy-MM-dd"),
      change_reason:sf.change_reason,
      created_by:user?.employee_id,
    })
    if (error) toast.error(t("admin.emp_detail.toast_error")); else { toast.success(t("admin.emp_detail.toast_salary_saved")); setHistoryTick(prev => prev + 1) }
    setLoading(false)
  }

  const saveKpi = async () => {
    setLoading(true)
    const amt = parseFloat(kpiAmount) || 0
    if (kpiSetting?.id) {
      const { error } = await supabase.from("kpi_bonus_settings").update({ standard_amount: amt }).eq("id", kpiSetting.id)
      if (error) { console.error("KPI update error:", error); toast.error(t("admin.emp_detail.toast_error") + ": " + error.message) }
      else { toast.success(t("admin.emp_detail.toast_kpi_saved")); setKpiSetting({ ...kpiSetting, standard_amount: amt }) }
    } else {
      const { data, error } = await supabase.from("kpi_bonus_settings")
        .insert({ employee_id: id, company_id: emp?.company_id, standard_amount: amt, is_active: true })
        .select().single()
      if (error) { console.error("KPI insert error:", error); toast.error(t("admin.emp_detail.toast_error") + ": " + error.message) }
      else { toast.success(t("admin.emp_detail.toast_kpi_saved")); setKpiSetting(data) }
    }
    setLoading(false)
  }

  const addMgr = async () => {
    if (!newMgr) return toast.error(t("admin.emp_detail.toast_select_manager"))
    try {
      const res = await fetch("/api/employees/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id, manager_id: newMgr, effective_from: newMgrDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.toast_manager_update_fail"))
      toast.success(t("admin.emp_detail.toast_manager_updated"))
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
      if (!res.ok) { toast.error(data.error || t("admin.emp_detail.toast_error")); return }
      toast.success(data.message || t("admin.emp_detail.toast_resign_saved"))
      setShowResignModal(false)
      setResignReason("")
      // reload
      window.location.reload()
    } catch { toast.error(t("admin.emp_detail.toast_error")) }
    finally { setResignLoading(false) }
  }

  // ── แท็บลาออก: อัปโหลดหลักฐาน / บันทึก ──
  const uploadResignFiles = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files
    if (!files || files.length === 0) return
    if (resignAttach.length + files.length > 10) { toast.error(t("admin.emp_detail.toast_max_10_files")); return }
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) { toast.error(t("admin.emp_detail.toast_file_too_large", { name: files[i].name })); return }
    }
    setResignAttachUploading(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append("files", files[i])
      const res = await fetch("/api/leave/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || t("admin.emp_detail.toast_upload_fail")); return }
      const newFiles = (json.files ?? [{ url: json.url, name: json.name }])
        .map((f: any, i: number) => ({ url: f.url, name: f.name, size: files[i]?.size }))
      setResignAttach(prev => [...prev, ...newFiles])
      toast.success(t("admin.emp_detail.toast_upload_done", { n: newFiles.length }))
    } catch { toast.error(t("admin.emp_detail.toast_upload_fail")) }
    finally { setResignAttachUploading(false); if (resignFileRef.current) resignFileRef.current.value = "" }
  }

  const saveResignInfo = async () => {
    setResignTabSaving(true)
    try {
      const { error } = await supabase.from("employees").update({
        resign_reason: resignReasonEdit || null,
        resign_attachments: resignAttach,
        resign_date: form.resign_date || null,
      }).eq("id", id as string)
      if (error) { toast.error(error.message.includes("resign_reason") ? t("admin.emp_detail.toast_migration_needed") : error.message); return }
      toast.success(t("admin.emp_detail.toast_resign_info_saved"))
      setEmp((p: any) => ({ ...p, resign_reason: resignReasonEdit, resign_attachments: resignAttach }))
    } catch (e: any) { toast.error(e.message || t("admin.emp_detail.toast_save_fail")) }
    finally { setResignTabSaving(false) }
  }

  const handleReinstate = async () => {
    setResignLoading(true)
    try {
      const res = await fetch("/api/employees/resign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstate", employee_id: id, previous_status: "active", resign_reason: resignReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || t("admin.emp_detail.toast_error")); return }
      toast.success(data.message || t("admin.emp_detail.toast_reinstated"))
      setShowReinstateModal(false)
      setResignReason("")
      window.location.reload()
    } catch { toast.error(t("admin.emp_detail.toast_error")) }
    finally { setResignLoading(false) }
  }

  const handlePromote = async (opts?: { markEndToday?: boolean }) => {
    setPromoteLoading(true)
    try {
      const res = await fetch("/api/employees/promote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: id, promotion_id: promotion?.id, mark_end_today: !!opts?.markEndToday }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || t("admin.emp_detail.toast_error")); return }
      toast.success(data.message || t("admin.emp_detail.toast_probation_passed"))
      window.location.reload()
    } catch { toast.error(t("admin.emp_detail.toast_error")) }
    finally { setPromoteLoading(false) }
  }

  // จำนวนวันที่เหลือก่อนครบกำหนดทดลองงาน (>0 = ยังไม่ครบ → ผ่านก่อนกำหนด)
  const _todayISO = format(new Date(), "yyyy-MM-dd")
  const probationDaysLeft: number | null = emp?.probation_end_date
    ? Math.round(
        (new Date(emp.probation_end_date + "T00:00:00").getTime() -
          new Date(_todayISO + "T00:00:00").getTime()) / 86_400_000,
      )
    : null
  const isEarlyPass = probationDaysLeft != null && probationDaysLeft > 0
  // แสดงปุ่มผ่านทดลองงานเมื่อ: สถานะ = ทดลองงาน หรือ ยังอยู่ในช่วงทดลองงาน (วันสิ้นสุดยังไม่ถึง)
  //   ยกเว้นคนที่ลาออก/เลิกจ้างแล้ว
  const showProbationPass = !!emp &&
    !["resigned", "terminated"].includes(emp.employment_status) &&
    (emp.employment_status === "probation" || isEarlyPass)

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/employees/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", employee_id: id, reason: deleteReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || t("admin.emp_detail.toast_error")); return }
      toast.success(data.message || t("admin.emp_detail.toast_deleted"))
      setShowDeleteModal(false)
      window.location.href = "/admin/employees"
    } catch { toast.error(t("admin.emp_detail.toast_error")) }
    finally { setDeleteLoading(false) }
  }

  if (!emp) return <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 size={18} className="animate-spin"/>{t("admin.emp_detail.common_loading")}</div>

  const empStatusMap: Record<string,string> = { active:t("admin.emp_detail.status_active"), probation:t("admin.emp_detail.status_probation"), resigned:t("admin.emp_detail.status_resigned"), terminated:t("admin.emp_detail.status_terminated"), on_leave:t("admin.emp_detail.status_on_leave"), suspended:t("admin.emp_detail.status_suspended") }
  const empStatusColor: Record<string,string> = { active:"bg-green-100 text-green-700", probation:"bg-amber-100 text-amber-700", resigned:"bg-slate-100 text-slate-500", terminated:"bg-red-100 text-red-600", on_leave:"bg-blue-100 text-blue-700", suspended:"bg-orange-100 text-orange-700" }

  return (
    <div className="space-y-4">

      {/* ── Top bar: back + actions ── */}
      <div className="flex items-center gap-3">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link>
        <h1 className="text-sm font-bold text-slate-500">{t("admin.emp_detail.hdr_title")}</h1>
        <div className="flex-1"/>
        {/* Resign / Reinstate */}
        {emp.employment_status === "resigned" || emp.employment_status === "terminated" ? (
          <button onClick={() => { setResignReason(""); setShowReinstateModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm">
            <UserCheck size={14}/>{t("admin.emp_detail.hdr_reinstate")}
          </button>
        ) : (
          <button onClick={() => { setResignReason(""); setResignDate(format(new Date(),"yyyy-MM-dd")); setShowResignModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all">
            <UserX size={14}/>{t("admin.emp_detail.hdr_resign")}
          </button>
        )}
        {(user?.role === "super_admin" || user?.role === "hr_admin") && !emp.deleted_at && (
          <button onClick={() => { setDeleteReason(""); setShowDeleteModal(true) }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all">
            <Trash2 size={13}/>{t("admin.emp_detail.hdr_delete")}
          </button>
        )}
      </div>

      {/* ── Resigned banner ── */}
      {(emp.employment_status === "resigned" || emp.employment_status === "terminated") && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <UserX size={18} className="text-red-500"/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800">
              {emp.employment_status === "resigned" ? t("admin.emp_detail.card_resigned_banner") : t("admin.emp_detail.card_terminated_banner")}
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              {emp.resign_date ? t("admin.emp_detail.card_effective_date", { date: format(new Date(emp.resign_date + "T00:00:00"),"d MMMM yyyy",{locale:th}) }) : t("admin.emp_detail.card_no_date")}
              {" · "}{t("admin.emp_detail.card_resigned_note")}
            </p>
          </div>
          <button onClick={() => { setResignReason(""); setShowReinstateModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all">
            <UserCheck size={13}/>{t("admin.emp_detail.card_reinstate_full")}
          </button>
        </div>
      )}

      {/* ── Probation promotion banner ── */}
      {showProbationPass && (
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
                ? t("admin.emp_detail.card_probation_until", { date: format(new Date(emp.probation_end_date + "T00:00:00"),"d MMMM yyyy",{locale:th}) })
                : t("admin.emp_detail.card_in_probation")}
            </p>
            {promotion && (
              <p className="text-xs text-amber-600 mt-0.5">
                {t("admin.emp_detail.card_promo_pending")}
                {promotion.base_salary && t("admin.emp_detail.card_promo_new_salary", { amount: (+promotion.base_salary).toLocaleString() })}
                {promotion.new_position?.name && t("admin.emp_detail.card_promo_new_position", { name: promotion.new_position.name })}
                {promotion.kpi_standard_amount != null && t("admin.emp_detail.card_promo_kpi", { amount: (+promotion.kpi_standard_amount).toLocaleString() })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowPromoteConfirm(true)}
            disabled={promoteLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm flex-shrink-0">
            {promoteLoading ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
            {isEarlyPass ? t("admin.emp_detail.card_confirm_pass_early") : t("admin.emp_detail.card_confirm_pass")}
          </button>
        </div>
      )}

      {/* ── 2-column layout: sticky sidebar + main content ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">

        {/* ── LEFT: Sticky sidebar ── */}
        <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {(emp.employment_status === "resigned" || emp.employment_status === "terminated") ? (
              <div className="p-5 text-center bg-gradient-to-br from-slate-400 to-slate-500">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-3xl shadow-lg mb-2 overflow-hidden">
                  {emp.avatar_url
                    ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>
                    : emp.first_name_th?.[0]}
                </div>
                <h2 className="text-base font-black text-white">{empName(emp)}</h2>
                <p className="text-[10px] text-white/80 font-mono mt-0.5">{emp.employee_code}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${empStatusColor[emp.employment_status] ?? "bg-slate-100 text-slate-500"}`}>
                  {empStatusMap[emp.employment_status] ?? emp.employment_status}
                </span>
              </div>
            ) : (
              <EmployeeShaderBg seed={emp.id || emp.employee_code || "default"} speed={0.55}>
                <div className="p-5 text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-white font-black text-3xl shadow-lg mb-2 overflow-hidden ring-2 ring-white/30">
                    {emp.avatar_url
                      ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>
                      : emp.first_name_th?.[0]}
                  </div>
                  <h2 className="text-base font-black text-white drop-shadow-md">{empName(emp)}</h2>
                  <p className="text-[10px] text-white/90 font-mono mt-0.5 drop-shadow">{emp.employee_code}</p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${empStatusColor[emp.employment_status] ?? "bg-slate-100 text-slate-500"}`}>
                    {empStatusMap[emp.employment_status] ?? emp.employment_status}
                  </span>
                </div>
              </EmployeeShaderBg>
            )}
            <div className="p-3 space-y-1.5 border-t border-slate-100">
              {emp.position?.name && (
                <div className="flex items-center gap-2 text-xs">
                  <Briefcase size={11} className="text-slate-400 flex-shrink-0"/>
                  <span className="font-bold text-slate-700 truncate">{emp.position.name}</span>
                </div>
              )}
              {emp.department?.name && (
                <div className="flex items-center gap-2 text-xs">
                  <Layers size={11} className="text-slate-400 flex-shrink-0"/>
                  <span className="text-slate-600 truncate">{emp.department.name}</span>
                </div>
              )}
              {(emp as any).branch?.name && (
                <div className="flex items-center gap-2 text-xs">
                  <Store size={11} className="text-slate-400 flex-shrink-0"/>
                  <span className="text-slate-600 truncate">{(emp as any).branch.name}</span>
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail size={11} className="text-slate-400 flex-shrink-0"/>
                  <span className="text-slate-500 truncate">{emp.email}</span>
                </div>
              )}
              {emp.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone size={11} className="text-slate-400 flex-shrink-0"/>
                  <span className="text-slate-500">{emp.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tab navigation — vertical on desktop */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 space-y-0.5">
            {TAB_KEYS.map((key,i) => {
              // ซ่อนแท็บเงินเดือน/สรุปเงินเดือน ถ้าไม่มีสิทธิ์ (payroll_access)
              if (PAYROLL_TAB_KEYS.includes(key) && !canPayroll) return null
              const Icon = TAB_ICONS[key] ?? ChevronRight
              return (
              <button key={key} onClick={() => setTab(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                  tab===i
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}>
                <span className={`w-1 h-4 rounded-full ${tab === i ? "bg-white/80" : "bg-transparent"}`}/>
                <Icon size={15} className={`shrink-0 ${tab === i ? "text-white" : "text-slate-400"}`}/>
                <span className="flex-1 truncate">{t(`admin.emp_detail.${key}`)}</span>
              </button>
            )})}
          </div>
        </aside>

        {/* ── RIGHT: Main content ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-w-0">

        {/* ── Tab 0: สรุปข้อมูล ── */}
        {tab === 0 && <SummaryTab employeeId={id as string} emp={emp} salary={canPayroll ? salary : null} kpiSetting={kpiSetting}/>}

        {/* ── Tab 1: ข้อมูลส่วนตัว ── */}
        {tab === 1 && <>
          <h3 className="font-bold text-slate-800 mb-4">{t("admin.emp_detail.personal_title")}</h3>

          {/* คำนำหน้า + เพศ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_title_prefix")}</label>
              <select value={form.title_th || ""} onChange={e => set("title_th", e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_select")}</option>
                <option value="นาย">{t("admin.emp_detail.personal_title_mr")}</option>
                <option value="นาง">{t("admin.emp_detail.personal_title_mrs")}</option>
                <option value="นางสาว">{t("admin.emp_detail.personal_title_miss")}</option>
                <option value="ดร.">{t("admin.emp_detail.personal_title_dr")}</option>
                <option value="อื่นๆ">{t("admin.emp_detail.common_other")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_gender")}</label>
              <select value={form.gender || ""} onChange={e => set("gender", e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_unspecified")}</option>
                <option value="male">{t("admin.emp_detail.personal_gender_male")}</option>
                <option value="female">{t("admin.emp_detail.personal_gender_female")}</option>
                <option value="other">{t("admin.emp_detail.common_other")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["first_name_th","personal_first_name_th"],["last_name_th","personal_last_name_th"],["first_name_en","personal_first_name_en"],["last_name_en","personal_last_name_en"],["nickname","personal_nickname"],["phone","personal_phone"],["national_id","personal_national_id"],["bank_account","personal_bank_account"],["bank_name","personal_bank_name"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{t(`admin.emp_detail.${l}`)}</label><input value={form[k]||""} onChange={e => set(k,e.target.value)} className={inp}/></div>
            ))}
            {/* วันเกิด + อายุที่คำนวณอัตโนมัติ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("admin.emp_detail.personal_birthdate")} {form.birth_date && (() => {
                  const b = new Date(form.birth_date)
                  const now = new Date()
                  let age = now.getFullYear() - b.getFullYear()
                  const m = now.getMonth() - b.getMonth()
                  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
                  return <span className="text-indigo-600 font-bold">{t("admin.emp_detail.personal_age", { n: age })}</span>
                })()}
              </label>
              <input type="date" value={form.birth_date || ""} onChange={e => set("birth_date", e.target.value)} className={inp}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_nationality")}</label>
              <input value={form.nationality || ""} onChange={e => set("nationality", e.target.value)} placeholder={t("admin.emp_detail.personal_nationality_ph")} className={inp}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_religion")}</label>
              <select value={form.religion || ""} onChange={e => set("religion", e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_unspecified")}</option>
                <option value="พุทธ">{t("admin.emp_detail.personal_religion_buddhist")}</option>
                <option value="อิสลาม">{t("admin.emp_detail.personal_religion_islam")}</option>
                <option value="คริสต์">{t("admin.emp_detail.personal_religion_christian")}</option>
                <option value="ฮินดู">{t("admin.emp_detail.personal_religion_hindu")}</option>
                <option value="ซิกข์">{t("admin.emp_detail.personal_religion_sikh")}</option>
                <option value="อื่นๆ">{t("admin.emp_detail.common_other")}</option>
              </select>
            </div>

            {/* อีเมล — แสดงแยกเพื่อบอกว่ากระทบระบบล็อกอิน */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-blue-800 mb-1">{t("admin.emp_detail.personal_email_login")}</label>
              <p className="text-[11px] text-blue-600 mb-2">{t("admin.emp_detail.personal_email_note")}</p>
              <input value={form.email||""} onChange={e => set("email",e.target.value)} placeholder="example@company.com" className={inp + " border-blue-300 focus:border-blue-500"}/>
              {form.email && form.email !== (emp?.email || "") && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> {t("admin.emp_detail.personal_email_change_hint", { old: emp?.email || t("admin.emp_detail.common_none"), new: form.email })}</p>
              )}
            </div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_address")}</label><textarea value={form.address||""} onChange={e => set("address",e.target.value)} className={inp + " h-20 resize-none"}/></div>

            {/* ── ผู้ติดต่อกรณีฉุกเฉิน ── */}
            <div className="md:col-span-2 bg-rose-50/50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-rose-600">🚨</span>
                <h4 className="font-bold text-rose-800 text-sm">{t("admin.emp_detail.personal_emergency_contact")}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_full_name")}</label>
                  <input value={form.emergency_contact_name || ""} onChange={e => set("emergency_contact_name", e.target.value)} placeholder={t("admin.emp_detail.personal_contact_name_ph")} className={inp}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_relation")}</label>
                  <select value={form.emergency_contact_relation || ""} onChange={e => set("emergency_contact_relation", e.target.value)} className={inp}>
                    <option value="">{t("admin.emp_detail.common_select")}</option>
                    <option value="พ่อ">{t("admin.emp_detail.personal_rel_father")}</option>
                    <option value="แม่">{t("admin.emp_detail.personal_rel_mother")}</option>
                    <option value="พี่ชาย">{t("admin.emp_detail.personal_rel_older_brother")}</option>
                    <option value="พี่สาว">{t("admin.emp_detail.personal_rel_older_sister")}</option>
                    <option value="น้องชาย">{t("admin.emp_detail.personal_rel_younger_brother")}</option>
                    <option value="น้องสาว">{t("admin.emp_detail.personal_rel_younger_sister")}</option>
                    <option value="สามี">{t("admin.emp_detail.personal_rel_husband")}</option>
                    <option value="ภรรยา">{t("admin.emp_detail.personal_rel_wife")}</option>
                    <option value="แฟน">{t("admin.emp_detail.personal_rel_partner")}</option>
                    <option value="ลูก">{t("admin.emp_detail.personal_rel_child")}</option>
                    <option value="ญาติ">{t("admin.emp_detail.personal_rel_relative")}</option>
                    <option value="เพื่อน">{t("admin.emp_detail.personal_rel_friend")}</option>
                    <option value="อื่นๆ">{t("admin.emp_detail.common_other")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_phone")}</label>
                  <input value={form.emergency_contact_phone || ""} onChange={e => set("emergency_contact_phone", e.target.value)} placeholder="08x-xxx-xxxx" className={inp}/>
                </div>
              </div>
            </div>
          </div>
          <button onClick={saveEmployee} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>{t("admin.emp_detail.common_save")}</button>
        </>}

        {/* ── Tab 2: การจ้างงาน ── */}
        {tab === 2 && <>
          <h3 className="font-bold text-slate-800 mb-4">{t("admin.emp_detail.emp_title")}</h3>

          {/* ── ทดลองงาน: ยืนยันผ่านก่อนกำหนด ── */}
          {showProbationPass && (
            <div className="mb-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CalendarClock size={18} className="text-amber-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-800 text-sm">{t("admin.emp_detail.card_in_probation")}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {emp.probation_end_date
                      ? <>{t("admin.emp_detail.emp_probation_due", { date: format(new Date(emp.probation_end_date + "T00:00:00"), "d MMMM yyyy", { locale: th }) })}
                          {isEarlyPass && <span className="font-bold">{t("admin.emp_detail.emp_days_left", { n: probationDaysLeft })}</span>}
                          {probationDaysLeft != null && probationDaysLeft <= 0 && <span className="font-bold">{t("admin.emp_detail.emp_due_reached")}</span>}
                        </>
                      : t("admin.emp_detail.emp_no_probation_end")}
                  </p>
                  {promotion && (
                    <p className="text-xs text-amber-700 mt-1 bg-amber-100/60 rounded-lg px-2 py-1 inline-block">
                      {t("admin.emp_detail.card_promo_pending")}
                      {promotion.base_salary && t("admin.emp_detail.card_promo_new_salary", { amount: (+promotion.base_salary).toLocaleString() })}
                      {promotion.new_position?.name && t("admin.emp_detail.card_promo_new_position", { name: promotion.new_position.name })}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoteConfirm(true)}
                disabled={promoteLoading}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm">
                {promoteLoading ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
                {isEarlyPass ? t("admin.emp_detail.card_confirm_pass_early") : t("admin.emp_detail.card_confirm_pass")}
              </button>
            </div>
          )}

          {/* บริษัทที่สังกัด */}
          <div className="mb-4 p-3 rounded-xl border-2 border-blue-100 bg-blue-50/50">
            <label className="block text-sm font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Building2 size={14}/> {t("admin.emp_detail.emp_company")}</label>
            <select value={form.company_id||""} onChange={e => {
              const newCid = e.target.value
              setForm((f: any) => f.company_id === newCid ? f : ({
                ...f, company_id: newCid,
                // เปลี่ยนบริษัท → ล้างแผนก/ตำแหน่ง/สาขา (เพราะเป็นของบริษัทเดิม ไม่งั้นค้างทำให้ผังองค์กรเพี้ยน)
                department_id: null, position_id: null, branch_id: null,
              }))
            }} className={inp}>
              <option value="">{t("admin.emp_detail.emp_select_company")}</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ""}{c.name_th}</option>)}
            </select>
            <p className="text-[11px] text-blue-500 mt-1">{t("admin.emp_detail.emp_company_note")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_type")}</label>
              <select value={form.employment_type||""} onChange={e => set("employment_type",e.target.value)} className={inp}>
                {[["full_time","emp_type_full_time"],["part_time","emp_type_part_time"],["contract","emp_type_contract"],["intern","emp_type_intern"]].map(([v,l]) => <option key={v} value={v}>{t(`admin.emp_detail.${l}`)}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_status")}</label>
              <select value={form.employment_status||""} onChange={e => set("employment_status",e.target.value)} className={inp}>
                {[["active","status_active"],["probation","status_probation"],["resigned","status_resigned"],["terminated","status_terminated"],["on_leave","status_on_leave"],["suspended","status_suspended"]].map(([v,l]) => <option key={v} value={v}>{t(`admin.emp_detail.${l}`)}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_department")}</label>
              <select value={form.department_id||""} onChange={e => set("department_id",e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_unspecified")}</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), createDepartment())}
                  placeholder={t("admin.emp_detail.emp_new_dept_ph")} className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 placeholder-slate-300"/>
                {newDeptName.trim() && (
                  <button type="button" onClick={createDepartment} disabled={creatingDept}
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap">
                    {creatingDept ? <Loader2 size={12} className="animate-spin"/> : t("admin.emp_detail.common_add")}
                  </button>
                )}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_position")}</label>
              <select value={form.position_id||""} onChange={e => set("position_id",e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_unspecified")}</option>
                {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newPositionName} onChange={e => setNewPositionName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), createPosition())}
                  placeholder={t("admin.emp_detail.emp_new_pos_ph")} className="flex-1 bg-white border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 placeholder-slate-300"/>
                {newPositionName.trim() && (
                  <button type="button" onClick={createPosition} disabled={creatingPosition}
                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap">
                    {creatingPosition ? <Loader2 size={12} className="animate-spin"/> : t("admin.emp_detail.common_add")}
                  </button>
                )}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_branch")}</label>
              <select value={form.branch_id||""} onChange={e => set("branch_id",e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.common_unspecified")}</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_hire_date")}</label><input type="date" value={form.hire_date||""} onChange={e => set("hire_date",e.target.value)} className={inp}/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.emp_probation_end")}</label><input type="date" value={form.probation_end_date||""} onChange={e => set("probation_end_date",e.target.value)} className={inp}/></div>
          </div>

          {/* ── จ้างงาน 2 เฟส (Pre-Employee) ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-amber-100 bg-amber-50/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.pre_employment_enabled}
                onChange={e => {
                  const on = e.target.checked
                  const from = form.pre_employment_from || form.hire_date || ""
                  let to = form.pre_employment_to
                  if (on && from && !to) { const d = new Date(from); d.setDate(d.getDate() + 6); to = d.toISOString().split("T")[0] }
                  setForm((p:any) => ({ ...p, pre_employment_enabled: on, pre_employment_from: from, pre_employment_to: to, phase2_start_date: on ? (p.phase2_start_date || computePhase2Start(to)) : p.phase2_start_date }))
                }} className="w-4 h-4 accent-amber-500" />
              <span className="font-bold text-amber-800 text-sm flex items-center gap-1.5"><Briefcase size={14}/>{t("admin.emp_detail.emp_two_phase_label")}</span>
            </label>
            {form.pre_employment_enabled && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-amber-700 mb-1">{t("admin.emp_detail.emp_phase1_start")}</label>
                    <input type="date" value={form.pre_employment_from||""} onChange={e => set("pre_employment_from", e.target.value)} className={inp}/></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.emp_detail.emp_phase1_end")}</label>
                    <input type="date" value={form.pre_employment_to||""}
                      onChange={e => { const to = e.target.value; setForm((p:any) => ({ ...p, pre_employment_to: to, phase2_start_date: computePhase2Start(to) || p.phase2_start_date })) }}
                      className={inp}/></div>
                  <div><label className="block text-xs font-medium text-emerald-700 mb-1">{t("admin.emp_detail.emp_phase2_start")}</label>
                    <input type="date" value={form.phase2_start_date||""} onChange={e => set("phase2_start_date", e.target.value)} className={inp}/>
                    <p className="text-[10px] text-slate-400 mt-1">{t("admin.emp_detail.emp_phase2_note")}</p></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.emp_detail.emp_phase1_rate")}</label>
                    <input type="number" value={form.pre_employment_daily_rate ?? 500} onChange={e => set("pre_employment_daily_rate", e.target.value)} className={inp}/></div>
                </div>
                {/* Phase 1 / Phase 2 สรุปเกณฑ์ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-amber-200 p-3">
                    <p className="text-xs font-black text-amber-700 mb-1">Phase 1 · Pre-Employee</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {form.pre_employment_from || "—"} → {form.pre_employment_to || "—"}<br/>
                      {t("admin.emp_detail.emp_phase1_wage_line", { rate: form.pre_employment_daily_rate ?? 500 })}<br/>
                      {t("admin.emp_detail.emp_phase1_tax")} <span className="text-rose-500 font-bold">{t("admin.emp_detail.emp_no_deduct")}</span> {t("admin.emp_detail.emp_phase1_sso_pf")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-emerald-200 p-3">
                    <p className="text-xs font-black text-emerald-700 mb-1">{t("admin.emp_detail.emp_phase2_heading")}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {t("admin.emp_detail.emp_phase2_start_prefix")} <span className="text-emerald-600 font-black">{form.phase2_start_date || computePhase2Start(form.pre_employment_to) || "—"}</span>{!form.phase2_start_date && t("admin.emp_detail.emp_phase2_auto_note")}<br/>
                      {t("admin.emp_detail.emp_phase2_wage_line")}<br/>
                      <span className="font-bold">{t("admin.emp_detail.emp_phase2_probation_start")}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Termination Notice — วันผ่านทดลองงาน + กฎ 1 รอบจ่าย (แสดงผลอย่างเดียว) ── */}
          {form.probation_end_date && (() => {
            const fmtTH = (s: string) => s ? format(new Date(s + "T00:00:00"), "d MMM yyyy", { locale: th }) : "—"
            const today = format(new Date(), "yyyy-MM-dd")
            const sysEff = systemEffectivePassedDate(form.probation_end_date)
            const deadline = probationEvalDeadline(form.probation_end_date)
            const termEff = nextPayrollCycleEnd(today)
            return (
              <div className="mt-6 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70">
                <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><CalendarClock size={14} className="text-slate-500"/>{t("admin.emp_detail.emp_term_title")}</h4>
                <p className="text-[11px] text-slate-400 mb-3">{t("admin.emp_detail.emp_term_note")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-[11px] text-slate-400">{t("admin.emp_detail.emp_probation_passed_date")}</p>
                    <p className="font-bold text-slate-800">{fmtTH(form.probation_end_date)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-[11px] text-slate-400">System Effective Passed Date</p>
                    <p className="font-bold text-indigo-700">{fmtTH(sysEff)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 px-3 py-2">
                    <p className="text-[11px] text-amber-600">{t("admin.emp_detail.emp_eval_deadline")}</p>
                    <p className="font-bold text-amber-700">{fmtTH(deadline)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-rose-200 px-3 py-2">
                    <p className="text-[11px] text-rose-500">{t("admin.emp_detail.emp_term_if_today", { date: fmtTH(today) })}</p>
                    <p className="font-bold text-rose-700">{fmtTH(termEff)} <span className="font-normal text-[11px] text-slate-400">{t("admin.emp_detail.emp_term_next_cycle")}</span></p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── ยกเว้นเช็คอิน ── */}
          <div className="mt-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.is_attendance_exempt} onChange={e => set("is_attendance_exempt", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <span className="text-sm font-medium text-slate-700">{t("admin.emp_detail.emp_attendance_exempt")}</span>
                <p className="text-xs text-slate-400">{t("admin.emp_detail.emp_attendance_exempt_note")}</p>
              </div>
            </label>
          </div>

          {/* ── ผู้ประเมิน KPI ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-violet-100 bg-violet-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><BarChart2 size={14} className="text-violet-500"/>{t("admin.emp_detail.emp_kpi_evaluator")}</h4>
            <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.emp_evaluator_note")}</p>
            <div className="relative">
              <input
                type="text"
                value={kpiEvalSearch ?? ""}
                onChange={e => { setKpiEvalSearch(e.target.value); setShowKpiEvalDropdown(true); loadAllEmps() }}
                onFocus={() => { setShowKpiEvalDropdown(true); loadAllEmps() }}
                placeholder={t("admin.emp_detail.emp_search_evaluator_ph")}
                className={inp}
              />
              {form.kpi_evaluator_id && (
                <button type="button" onClick={() => { set("kpi_evaluator_id", null); setKpiEvalSearch("") }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                  <X size={12} className="text-slate-400 hover:text-red-500" />
                </button>
              )}
              {showKpiEvalDropdown && (() => {
                // ── multi-field search: ค้นจาก TH/EN names + nickname + code
                //    แยก term ด้วย space — ทุก term ต้อง match
                const raw = (kpiEvalSearch || "").toLowerCase().trim()
                const terms = raw ? raw.split(/\s+/).filter(Boolean) : []
                const matches = allEmps.filter(e => {
                  if (terms.length === 0) return true
                  const hay = [
                    e.first_name_th, e.last_name_th,
                    e.first_name_en, e.last_name_en,
                    e.nickname, e.nickname_en,
                    e.employee_code,
                  ].filter(Boolean).join(" ").toLowerCase()
                  return terms.every(term => hay.includes(term))
                })
                return (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowKpiEvalDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[240px] overflow-y-auto">
                      {matches.slice(0, 50).map(e => (
                        <button key={e.id} type="button"
                          onClick={() => { set("kpi_evaluator_id", e.id); setKpiEvalSearch(`${empName(e)} (${e.employee_code})`); setShowKpiEvalDropdown(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2 transition-colors">
                          <span className="font-bold text-slate-800">{empName(e)}</span>
                          <span className="text-xs text-slate-400">{e.employee_code}</span>
                        </button>
                      ))}
                      {matches.length === 0 && (
                        <p className="px-3 py-4 text-sm text-slate-400 text-center">{t("admin.emp_detail.emp_no_employee_found")}</p>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
            {form.kpi_evaluator_id && (
              <p className="text-xs text-violet-600 font-medium mt-2 flex items-center gap-1"><CheckCircle2 size={11}/>{t("admin.emp_detail.emp_kpi_evaluator_set")}</p>
            )}
          </div>

          {/* ── ผู้ประเมินทดลองงาน ── */}
          {(() => {
            const currentMgr = mgrHistory.find((h: any) => !h.effective_to)?.manager
            return (
          <div className="mt-6 p-4 rounded-2xl border-2 border-rose-100 bg-rose-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><Shield size={14} className="text-rose-500"/>{t("admin.emp_detail.emp_probation_evaluator")}</h4>
            <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.emp_evaluator_note")}</p>
            <div className="relative">
              <input
                type="text"
                value={probEvalSearch ?? ""}
                onChange={e => { setProbEvalSearch(e.target.value); setShowProbEvalDropdown(true); loadAllEmps() }}
                onFocus={() => { setShowProbEvalDropdown(true); loadAllEmps() }}
                placeholder={t("admin.emp_detail.emp_search_evaluator_ph")}
                className={inp}
              />
              {form.probation_evaluator_id && (
                <button type="button" onClick={() => { set("probation_evaluator_id", null); setProbEvalSearch("") }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                  <X size={12} className="text-slate-400 hover:text-red-500" />
                </button>
              )}
              {showProbEvalDropdown && (() => {
                const raw = (probEvalSearch || "").toLowerCase().trim()
                const terms = raw ? raw.split(/\s+/).filter(Boolean) : []
                const matches = allEmps.filter(e => {
                  if (terms.length === 0) return true
                  const hay = [
                    e.first_name_th, e.last_name_th,
                    e.first_name_en, e.last_name_en,
                    e.nickname, e.nickname_en,
                    e.employee_code,
                  ].filter(Boolean).join(" ").toLowerCase()
                  return terms.every(term => hay.includes(term))
                })
                return (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProbEvalDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[240px] overflow-y-auto">
                      {matches.slice(0, 50).map(e => (
                        <button key={e.id} type="button"
                          onClick={() => { set("probation_evaluator_id", e.id); setProbEvalSearch(`${empName(e)} (${e.employee_code})`); setShowProbEvalDropdown(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 flex items-center gap-2 transition-colors">
                          <span className="font-bold text-slate-800">{empName(e)}</span>
                          <span className="text-xs text-slate-400">{e.employee_code}</span>
                        </button>
                      ))}
                      {matches.length === 0 && (
                        <p className="px-3 py-4 text-sm text-slate-400 text-center">{t("admin.emp_detail.emp_no_employee_found")}</p>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
            {/* ── ผู้ประเมินปัจจุบัน (designated หรือหัวหน้าตรง) ── */}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-slate-400">{t("admin.emp_detail.emp_current_prob_evaluator")}</span>
              {form.probation_evaluator_id ? (
                <span className="font-bold text-rose-600 flex items-center gap-1">
                  <UserCheck size={12}/> {probEvalSearch || "—"} <span className="font-normal text-slate-400">{t("admin.emp_detail.emp_designated")}</span>
                </span>
              ) : currentMgr ? (
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-400"/> {empName(currentMgr)} <span className="font-normal text-slate-400">{t("admin.emp_detail.emp_direct_manager")}</span>
                </span>
              ) : (
                <span className="text-amber-600 font-medium">{t("admin.emp_detail.emp_no_manager_warning")}</span>
              )}
            </div>
          </div>
            )
          })()}

          {/* ── ผู้ประเมินเพิ่มเติม (multi) ── */}
          <AdditionalEvaluatorsSection employeeId={id as string} allEmps={allEmps} loadAllEmps={loadAllEmps} />

          {/* ── มอบหมายประเมินทดลองงาน หลายคน/หลายรอบ ── */}
          <ProbationAssignmentsSection employeeId={id as string} allEmps={allEmps} loadAllEmps={loadAllEmps} />

          <button onClick={saveEmployment} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>{t("admin.emp_detail.common_save")}</button>

          {/* ── ประวัติการเปลี่ยนตำแหน่ง ── */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><History size={15} className="text-violet-500"/>{t("admin.emp_detail.emp_position_history", { n: positionHistory.length })}</h4>
            {positionHistory.length === 0 ? (
              <p className="text-sm text-slate-400">{t("admin.emp_detail.emp_position_history_empty")}</p>
            ) : (
              <div className="space-y-2">
                {positionHistory.map((h: any) => (
                  <div key={h.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-400 line-through">{h.from_pos?.name ?? "—"}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-sm font-bold text-violet-700">{h.to_pos?.name ?? "—"}</span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {h.changed_at ? format(new Date(h.changed_at), "d MMM yyyy HH:mm", { locale: th }) : ""}
                      {h.changer && <span>{t("admin.emp_detail.emp_by", { name: empName(h.changer) })}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}

        {/* ── Tab 3: เงินเดือน ── */}
        {tab === 3 && canPayroll && <>
          <h3 className="font-bold text-slate-800 mb-4">{t("admin.emp_detail.salary_structure")}</h3>
          {salary && <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm"><p className="text-green-800 font-semibold">{t("admin.emp_detail.salary_current", { amount: salary.base_salary?.toLocaleString() })}</p><p className="text-green-600 text-xs">{t("admin.emp_detail.salary_effective", { date: format(new Date(salary.effective_from),"d MMM yyyy",{locale:th}) })}</p></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[["base_salary","salary_base_input"],["allowance_position","salary_allow_position"],["allowance_transport","salary_allow_transport"],["allowance_food","salary_allow_food"],["allowance_phone","salary_allow_phone"],["allowance_housing","salary_allow_housing"],["allowance_vehicle","salary_allow_vehicle"],["ot_rate_normal","salary_ot_normal"],["ot_rate_holiday","salary_ot_holiday"]].map(([k,l]) => (
              <div key={k}><label className="block text-sm font-medium text-slate-700 mb-1.5">{t(`admin.emp_detail.${l}`)}</label><input type="number" step="0.01" value={sf[k]||""} onChange={e => setSf((f: any) => ({ ...f, [k]:e.target.value }))} className={inp}/></div>
            ))}
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.salary_effective_from")}</label><input type="date" value={sf.effective_from||""} onChange={e => setSf((f: any) => ({ ...f, effective_from:e.target.value }))} className={inp}/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.salary_reason")}</label><input value={sf.change_reason||""} onChange={e => setSf((f: any) => ({ ...f, change_reason:e.target.value }))} className={inp} placeholder={t("admin.emp_detail.salary_reason_ph")}/></div>
          </div>

          {/* ── ประกันสังคม + ภาษี ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{t("admin.emp_detail.salary_wht")}</h4>
              <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.salary_wht_note")}</p>
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
                      placeholder={t("admin.emp_detail.salary_auto")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">%</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  {sf.tax_withholding_pct != null && sf.tax_withholding_pct !== "" ? (
                    <p className="text-indigo-600 font-bold">{t("admin.emp_detail.salary_fixed_deduct", { pct: sf.tax_withholding_pct })}</p>
                  ) : (
                    <p className="text-emerald-600 font-bold">{t("admin.emp_detail.salary_auto_progressive")}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-200 pt-4 space-y-3">
              {/* ประกันสังคม */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!sf.is_sso_exempt}
                  onChange={e => setSf((f: any) => ({ ...f, is_sso_exempt: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{t("admin.emp_detail.salary_no_sso")}</p>
                  <p className="text-[11px] text-slate-400">{t("admin.emp_detail.salary_no_sso_note")}</p>
                </div>
                {sf.is_sso_exempt && <span className="ml-auto text-xs font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg">{t("admin.emp_detail.salary_badge_no_sso")}</span>}
              </label>

              {/* ภาษี 3% */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!sf.is_tax_3pct}
                  onChange={e => setSf((f: any) => ({ ...f, is_tax_3pct: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{t("admin.emp_detail.salary_tax_3pct")}</p>
                  <p className="text-[11px] text-slate-400">{t("admin.emp_detail.salary_tax_3pct_note")}</p>
                </div>
                {sf.is_tax_3pct && <span className="ml-auto text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{t("admin.emp_detail.salary_badge_3pct")}</span>}
              </label>

              {/* กองทุนสำรองเลี้ยงชีพ (PF) */}
              <div className="pt-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">{t("admin.emp_detail.salary_pf")}</label>
                <p className="text-[11px] text-slate-400 mb-2">{t("admin.emp_detail.salary_pf_note")}</p>
                <div className="relative max-w-[180px]">
                  <input type="number" step="0.5" min="0" max="15"
                    value={sf.provident_fund_pct ?? ""}
                    onChange={e => setSf((f: any) => ({ ...f, provident_fund_pct: e.target.value }))}
                    placeholder="0" className={`${inp} pr-8`}/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Bonus ── */}
          <div className="mt-6 p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-1">{t("admin.emp_detail.salary_kpi_bonus")}</h4>
            <p className="text-xs text-slate-400 mb-3">{t("admin.emp_detail.salary_kpi_note")}</p>
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
                    <p className="text-slate-400">{t("admin.emp_detail.salary_kpi_grade_d")}</p>
                  </>
                ) : (
                  <p className="text-slate-400">{t("admin.emp_detail.salary_kpi_unset")}</p>
                )}
              </div>
            </div>
            <button onClick={saveKpi} disabled={loading} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/> {t("admin.emp_detail.salary_save_kpi")}
            </button>
          </div>

          <button onClick={saveSalary} disabled={loading} className="btn-primary mt-4 flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>{t("admin.emp_detail.salary_save")}</button>

          {/* ── ประวัติการปรับเงินเดือน (ทุกเวอร์ชันจาก salary_structures) ── */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><History size={15} className="text-indigo-500"/>{t("admin.emp_detail.salary_history", { n: salaryHistory.length })}</h4>
            {salaryHistory.length === 0 ? (
              <p className="text-sm text-slate-400">{t("admin.emp_detail.common_no_history")}</p>
            ) : (
              <div className="space-y-2">
                {salaryHistory.map((s: any, i: number) => {
                  const allw = (Number(s.allowance_position)||0)+(Number(s.allowance_food)||0)+(Number(s.allowance_phone)||0)+(Number(s.allowance_housing)||0)+(Number(s.allowance_vehicle)||0)+(Number(s.allowance_transport)||0)
                  const prev = salaryHistory[i + 1]
                  const diff = prev ? Number(s.base_salary) - Number(prev.base_salary) : 0
                  const isCurrent = !s.effective_to
                  return (
                    <div key={s.id} className={`rounded-xl border p-3 ${isCurrent ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-slate-800">฿{Number(s.base_salary).toLocaleString()}</span>
                        {allw > 0 && <span className="text-xs text-slate-400">{t("admin.emp_detail.salary_plus_allowance", { amount: allw.toLocaleString() })}</span>}
                        {diff !== 0 && (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${diff > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {diff > 0 ? "▲" : "▼"} ฿{Math.abs(diff).toLocaleString()}
                          </span>
                        )}
                        {isCurrent && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{t("admin.emp_detail.common_current")}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {t("admin.emp_detail.salary_effective_prefix")} {s.effective_from ? format(new Date(s.effective_from + "T00:00:00"), "d MMM yyyy", { locale: th }) : "—"}
                        {s.effective_to ? ` – ${format(new Date(s.effective_to + "T00:00:00"), "d MMM yyyy", { locale: th })}` : t("admin.emp_detail.salary_until_present")}
                        {s.change_reason && <span className="text-slate-500"> · {s.change_reason}</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>}

        {/* ── Tab 4: สรุปเงินเดือนรายเดือน ── */}
        {tab === 4 && canPayroll && <PayrollHistoryTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 5: ตารางงาน ── */}
        {tab === 5 && <WorkScheduleTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 6: สิทธิ์เช็คอิน ── */}
        {tab === 6 && <CheckinLocationsTab employeeId={id as string} companyId={emp.company_id}/>}

        {/* ── Tab 7: ประวัติหัวหน้า ── */}
        {tab === 7 && <>
          <h3 className="font-bold text-slate-800 mb-4">{t("admin.emp_detail.mgr_title")}</h3>
          <div className="flex gap-3 mb-5 items-end">
            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.mgr_select_new")}</label>
              <input
                type="text"
                value={mgrSearch ?? (newMgr ? empName(allEmps.find(e => e.id === newMgr)) : "")}
                onChange={e => { setMgrSearch(e.target.value); setNewMgr(""); setShowMgrDropdown(true); loadAllEmps() }}
                onFocus={() => { setShowMgrDropdown(true); loadAllEmps() }}
                placeholder={t("admin.emp_detail.mgr_search_ph")}
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
                          onClick={() => { setNewMgr(e.id); setMgrSearch(`${empName(e)} (${e.employee_code})`); setShowMgrDropdown(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                          <span className="font-bold text-slate-800">{empName(e)}</span>
                          <span className="text-xs text-slate-400">{e.employee_code}</span>
                        </button>
                      ))}
                    {allEmps.filter(e => {
                      const s = (mgrSearch || "").toLowerCase()
                      if (!s) return true
                      return `${e.first_name_th} ${e.last_name_th} ${e.employee_code}`.toLowerCase().includes(s)
                    }).length === 0 && (
                      <p className="px-3 py-4 text-sm text-slate-400 text-center">{t("admin.emp_detail.emp_no_employee_found")}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <input type="date" value={newMgrDate} onChange={e => setNewMgrDate(e.target.value)} className={inp + " w-40"}/>
            <button onClick={() => { addMgr(); setMgrSearch("") }} disabled={!newMgr} className="btn-primary px-4 py-2 flex items-center gap-1 disabled:opacity-50"><Plus size={14}/>{t("admin.emp_detail.common_add")}</button>
          </div>
          <div className="space-y-3">
            {mgrHistory.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{empName(h.manager)}</p><p className="text-xs text-slate-500">{format(new Date(h.effective_from),"d MMM yyyy",{locale:th})} - {h.effective_to ? format(new Date(h.effective_to),"d MMM yyyy",{locale:th}) : t("admin.emp_detail.common_present")}</p></div>
                {!h.effective_to && <span className="badge bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">{t("admin.emp_detail.common_current")}</span>}
              </div>
            ))}
            {mgrHistory.length === 0 && <p className="text-center text-slate-400 text-sm py-4">{t("admin.emp_detail.common_no_history_short")}</p>}
          </div>
        </>}

        {/* ── Tab 8: บทบาท (Role Management) ── */}
        {tab === 8 && <RoleManagementTab employeeId={id as string} employeeName={`${emp?.first_name_th ?? ""} ${emp?.last_name_th ?? ""}`} employeeEmail={emp?.email || ""}/>}

        {/* ── Tab 9: โควต้าการลา ── */}
        {tab === 9 && <LeaveQuotaTab employeeId={id as string} companyId={emp?.company_id} />}

        {/* ── Tab 10: สาย/ผู้ประเมิน ── */}
        {tab === 10 && (
          <>
            <h3 className="font-bold text-slate-800 mb-4">{t("admin.emp_detail.evalchain_title")}</h3>
            <EvaluationChainPanel employeeId={id as string} employeeName={empName(emp)} />
          </>
        )}

        {tab === 11 && (
          <BrandsTab employeeId={id as string}
            employeeName={`${emp?.first_name_th ?? ""} ${emp?.last_name_th ?? ""}`.trim()}
            initialBrands={(emp as any)?.brand}
            initialAllocations={(emp as any)?.brand_allocations ?? null}
            feishuBrand={(Array.isArray((emp as any)?.feishu) ? (emp as any).feishu[0]?.brand : (emp as any)?.feishu?.brand) ?? null}/>
        )}

        {tab === 12 && (
          <FeishuLinkTab employeeId={id as string} employeeName={`${emp?.first_name_th ?? ""} ${emp?.last_name_th ?? ""}`.trim()}/>
        )}

        {tab === 13 && (
          <EmployeeBorrowingTab
            employeeId={id as string}
            employeeName={`${emp?.first_name_th ?? ""} ${emp?.last_name_th ?? ""}`.trim()}
            employeeNickname={emp?.nickname ?? undefined}
            employeeFirstNameEn={emp?.first_name_en ?? undefined}
          />
        )}

        {/* ── Tab 14: ลาออก / หลักฐาน ── */}
        {tab === 14 && <>
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><UserX size={16} className="text-rose-500"/>{t("admin.emp_detail.resign_tab_title")}</h3>

          {/* สถานะ */}
          <div className={`mb-4 p-3 rounded-xl border ${(emp.employment_status === "resigned" || emp.employment_status === "terminated") ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-sm font-bold text-slate-700">
              {t("admin.emp_detail.resign_status", { status: empStatusMap[emp.employment_status] || emp.employment_status })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {(emp.employment_status === "resigned" || emp.employment_status === "terminated")
                ? t("admin.emp_detail.resign_note_resigned")
                : t("admin.emp_detail.resign_note_active")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_effective_date")}</label>
              <input type="date" value={form.resign_date || ""} onChange={e => set("resign_date", e.target.value)} className={inp}/>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_reason_label")}</label>
            <textarea value={resignReasonEdit} onChange={e => setResignReasonEdit(e.target.value)}
              className={inp + " h-28 resize-none"} placeholder={t("admin.emp_detail.resign_reason_ph")}/>
          </div>

          {/* แนบหลักฐาน */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_attach_label")}</label>
            <input ref={resignFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={uploadResignFiles} className="hidden"/>
            <button type="button" onClick={() => resignFileRef.current?.click()} disabled={resignAttachUploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border-2 border-dashed border-rose-300 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60 transition-colors">
              {resignAttachUploading ? <><Loader2 size={13} className="animate-spin"/> {t("admin.emp_detail.resign_uploading")}</> : <><Plus size={13}/> {resignAttach.length > 0 ? t("admin.emp_detail.resign_add_file") : t("admin.emp_detail.resign_attach_btn")}</>}
            </button>
            {resignAttach.length > 0 && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resignAttach.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                    {/\.(png|jpe?g|webp|gif)$/i.test(f.url)
                      ? <img src={f.url} alt="" className="w-9 h-9 rounded object-cover shrink-0"/>
                      : <div className="w-9 h-9 rounded bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">FILE</div>}
                    <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-xs text-indigo-600 truncate hover:underline">{f.name}</a>
                    <button type="button" onClick={() => setResignAttach(prev => prev.filter((_, x) => x !== i))}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center shrink-0">
                      <X size={12} className="text-slate-400 hover:text-red-500"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={saveResignInfo} disabled={resignTabSaving} className="btn-primary mt-4 flex items-center gap-2">
            {resignTabSaving && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>{t("admin.emp_detail.resign_save")}
          </button>

          {/* ประวัติการลาออก/ดึงกลับ */}
          {resignHistory.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{t("admin.emp_detail.resign_history_title")}</p>
              <div className="space-y-1.5">
                {resignHistory.map((h: any) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className={`font-bold px-2 py-0.5 rounded ${h.action === "resign" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {h.action === "resign" ? t("admin.emp_detail.resign_action_resign") : t("admin.emp_detail.resign_action_reinstate")}
                    </span>
                    {h.resign_date && <span className="text-slate-500">{format(new Date(h.resign_date + "T00:00:00"), "d MMM yyyy", { locale: th })}</span>}
                    {h.reason && <span className="text-slate-600 truncate">· {h.reason}</span>}
                    <span className="text-slate-300 ml-auto whitespace-nowrap">{h.created_at ? format(new Date(h.created_at), "d MMM yy", { locale: th }) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}

        {/* ── Tab 15: โทษทางวินัย / ใบเตือน ── */}
        {tab === 15 && <DisciplineTab employeeId={id as string}/>}
        {tab === 16 && <DocumentsTab employeeId={id as string}/>}

        </div>  {/* end main content */}
      </div>  {/* end grid 2-column */}

      {/* ── ประวัติการลาออก / ดึงกลับ ── */}
      {resignHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-slate-400"/>
            <h3 className="font-bold text-slate-800 text-sm">{t("admin.emp_detail.resign_history_title")}</h3>
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
                    {h.action === "resign" ? t("admin.emp_detail.resign_action_resign") : t("admin.emp_detail.resign_action_reinstate")}
                    {h.resign_date && <span className="font-normal text-slate-500 ml-2">{t("admin.emp_detail.resign_effective_prefix", { date: format(new Date(h.resign_date + "T00:00:00"),"d MMM yyyy",{locale:th}) })}</span>}
                  </p>
                  {h.reason && <p className="text-xs text-slate-500 mt-0.5">{t("admin.emp_detail.resign_reason_prefix", { reason: h.reason })}</p>}
                </div>
                <p className="text-[10px] text-slate-400 flex-shrink-0">{format(new Date(h.created_at),"d MMM yyyy HH:mm",{locale:th})}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ Resign Modal ═══════════ */}
      {/* ═══════════ Promote (pass probation) Modal ═══════════ */}
      {showPromoteConfirm && emp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-amber-600"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">
                  {isEarlyPass ? t("admin.emp_detail.card_confirm_pass_early") : t("admin.emp_detail.card_confirm_pass")}
                </h3>
                <p className="text-xs text-slate-400">{empName(emp)} ({emp.employee_code})</p>
              </div>
            </div>

            {isEarlyPass && (
              <div className="mb-4 flex items-center gap-2 bg-amber-100/70 border border-amber-200 rounded-xl px-3 py-2">
                <CalendarClock size={15} className="text-amber-600 flex-shrink-0"/>
                <p className="text-xs text-amber-800">
                  {t("admin.emp_detail.promote_early_before")} <span className="font-black">{t("admin.emp_detail.promote_days", { n: probationDaysLeft })}</span>
                  {emp.probation_end_date && <>{t("admin.emp_detail.promote_orig_due", { date: format(new Date(emp.probation_end_date + "T00:00:00"), "d MMM yyyy", { locale: th }) })}</>}
                </p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-700 mb-1.5">{t("admin.emp_detail.modal_what_happens")}</p>
              <ul className="text-xs text-slate-600 space-y-1 ml-3 list-disc">
                <li>{t("admin.emp_detail.promote_li_status")}</li>
                <li>{t("admin.emp_detail.promote_li_end_today", { date: format(new Date(), "d MMM yyyy", { locale: th }) })}</li>
                {promotion?.base_salary && <li>{t("admin.emp_detail.promote_li_new_salary", { amount: (+promotion.base_salary).toLocaleString() })}</li>}
                {promotion?.new_position?.name && <li>{t("admin.emp_detail.promote_li_new_position", { name: promotion.new_position.name })}</li>}
                {promotion?.kpi_standard_amount != null && <li>{t("admin.emp_detail.promote_li_kpi", { amount: (+promotion.kpi_standard_amount).toLocaleString() })}</li>}
                {!promotion && <li className="text-slate-400">{t("admin.emp_detail.promote_li_none")}</li>}
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPromoteConfirm(false)} disabled={promoteLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-all">
                {t("admin.emp_detail.common_cancel")}
              </button>
              <button
                onClick={async () => { setShowPromoteConfirm(false); await handlePromote({ markEndToday: true }) }}
                disabled={promoteLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {promoteLoading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                {t("admin.emp_detail.card_confirm_pass")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center">
                <UserX size={20} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">{t("admin.emp_detail.hdr_resign")}</h3>
                <p className="text-xs text-slate-400">{empName(emp)} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_effective_date_req")}</label>
                <input type="date" value={resignDate} onChange={e => setResignDate(e.target.value)} className={inp}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_reason_optional")}</label>
                <textarea value={resignReason} onChange={e => setResignReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder={t("admin.emp_detail.resign_reason_ph2")}/>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">{t("admin.emp_detail.modal_what_happens")}</p>
                <ul className="text-xs text-amber-700 space-y-1 ml-3">
                  <li>• {t("admin.emp_detail.resign_modal_li1")}</li>
                  <li>• {t("admin.emp_detail.resign_modal_li2")}</li>
                  <li>• {t("admin.emp_detail.resign_modal_li3")}</li>
                  <li>• {t("admin.emp_detail.resign_modal_li4")}</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowResignModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                {t("admin.emp_detail.common_cancel")}
              </button>
              <button onClick={handleResign} disabled={resignLoading || !resignDate}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {resignLoading ? <Loader2 size={14} className="animate-spin"/> : <UserX size={14}/>}
                {t("admin.emp_detail.resign_confirm")}
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
                <h3 className="font-black text-slate-800 text-lg">{t("admin.emp_detail.card_reinstate_full")}</h3>
                <p className="text-xs text-slate-400">{empName(emp)} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.reinstate_note_optional")}</label>
                <textarea value={resignReason} onChange={e => setResignReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder={t("admin.emp_detail.reinstate_note_ph")}/>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-800 mb-1">{t("admin.emp_detail.modal_what_happens")}</p>
                <ul className="text-xs text-emerald-700 space-y-1 ml-3">
                  <li>• {t("admin.emp_detail.reinstate_modal_li1")}</li>
                  <li>• {t("admin.emp_detail.reinstate_modal_li2")}</li>
                  <li>• {t("admin.emp_detail.reinstate_modal_li3")}</li>
                  <li>• {t("admin.emp_detail.reinstate_modal_li4")}</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReinstateModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                {t("admin.emp_detail.common_cancel")}
              </button>
              <button onClick={handleReinstate} disabled={resignLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {resignLoading ? <Loader2 size={14} className="animate-spin"/> : <UserCheck size={14}/>}
                {t("admin.emp_detail.reinstate_confirm")}
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
                <h3 className="font-black text-slate-800 text-lg">{t("admin.emp_detail.delete_title")}</h3>
                <p className="text-xs text-slate-400">{empName(emp)} ({emp.employee_code})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.resign_reason_optional")}</label>
                <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                  className={inp + " h-20 resize-none"} placeholder={t("admin.emp_detail.delete_reason_ph")}/>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-800 mb-1">{t("admin.emp_detail.modal_what_happens")}</p>
                <ul className="text-xs text-red-700 space-y-1 ml-3">
                  <li>• {t("admin.emp_detail.delete_modal_li1")}</li>
                  <li>• {t("admin.emp_detail.delete_modal_li2")}</li>
                  <li>• {t("admin.emp_detail.delete_modal_li3")}</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                {t("admin.emp_detail.common_cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {deleteLoading ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                {t("admin.emp_detail.delete_confirm")}
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
  const { t } = useLanguage()
  const empName = useEmployeeName()
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

  // Payroll period navigation (22 เดือนก่อน - 21 เดือนนี้)
  const [attPeriodOffset, setAttPeriodOffset] = useState(0)
  const getPayrollPeriod = (offset: number) => {
    const now = new Date()
    const d = now.getDate()
    // ถ้าวันที่ ≥ 22 แสดงว่าอยู่ในงวดถัดไป
    let baseMonth = d >= 22 ? now.getMonth() + 1 : now.getMonth()
    let baseYear = now.getFullYear()
    // Apply offset
    baseMonth += offset
    while (baseMonth > 11) { baseMonth -= 12; baseYear++ }
    while (baseMonth < 0) { baseMonth += 12; baseYear-- }
    // start = 22 ของเดือนก่อน
    const startMonth = baseMonth === 0 ? 11 : baseMonth - 1
    const startYear = baseMonth === 0 ? baseYear - 1 : baseYear
    const start = `${startYear}-${String(startMonth + 1).padStart(2, "0")}-22`
    const end = `${baseYear}-${String(baseMonth + 1).padStart(2, "0")}-21`
    const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
    const label = `${MONTHS_TH[baseMonth]} ${baseYear + 543}`
    return { start, end, label }
  }
  const currentPeriod = getPayrollPeriod(attPeriodOffset)

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0,10)

    Promise.all([
      // attendance stats ตามรอบตัดเงินเดือน
      supabase.from("attendance_records")
        .select("status, late_minutes, early_out_minutes, work_minutes")
        .eq("employee_id", employeeId)
        .gte("work_date", currentPeriod.start).lte("work_date", currentPeriod.end),
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
      // attendance ตามรอบตัดเงินเดือน
      supabase.from("attendance_records")
        .select("id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, shift_template_id")
        .eq("employee_id", employeeId)
        .gte("work_date", currentPeriod.start).lte("work_date", currentPeriod.end)
        .order("work_date", { ascending: false }),
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
  }, [employeeId, attPeriodOffset])

  if (loading) return <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 size={16} className="animate-spin"/>{t("admin.emp_detail.common_loading")}</div>

  const shift = schedule?.shift
  const allAllowances = salary
    ? (salary.allowance_position||0)+(salary.allowance_transport||0)+(salary.allowance_food||0)+(salary.allowance_phone||0)+(salary.allowance_housing||0)
    : 0

  const statusIcon: Record<string,string> = { present:"✅", late:"⏰", absent:"❌", early_out:"🔔", wfh:"🏠", leave:"📝" }
  const statusLabel: Record<string,string> = { present:t("admin.emp_detail.checkin_st_present"), late:t("admin.emp_detail.checkin_st_late"), absent:t("admin.emp_detail.checkin_st_absent"), early_out:t("admin.emp_detail.checkin_st_early_out"), wfh:"WFH", leave:t("admin.emp_detail.checkin_st_leave") }
  const statusClr: Record<string,string> = { present:"text-emerald-600 bg-emerald-50", late:"text-amber-600 bg-amber-50", absent:"text-red-600 bg-red-50", early_out:"text-orange-600 bg-orange-50", wfh:"text-teal-600 bg-teal-50", leave:"text-blue-600 bg-blue-50" }

  return (
    <div className="space-y-5">

      {/* ── Bio strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon:<User2 size={14}/>, label:t("admin.emp_detail.card_department"),     val:emp.department?.name ?? "—",                  c:"bg-blue-50 text-blue-600"    },
          { icon:<Calendar size={14}/>, label:t("admin.emp_detail.card_start_work"), val:emp.hire_date ? format(new Date(emp.hire_date),"d MMM yy",{locale:th}) : "—", c:"bg-violet-50 text-violet-600" },
          { icon:<Building2 size={14}/>, label:t("admin.emp_detail.card_branch"),   val:emp.branch?.name ?? "—",                    c:"bg-sky-50 text-sky-600"       },
          { icon:<DollarSign size={14}/>, label:t("admin.emp_detail.card_salary"), val:salary ? `฿${fmt(salary.base_salary)}` : t("admin.emp_detail.card_salary_unset"), c:"bg-emerald-50 text-emerald-600" },
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
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t("admin.emp_detail.sched_current_shift")}</span>
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
                {shift.break_minutes && <span className="ml-2 text-slate-400">{t("admin.emp_detail.sched_break_min", { n: shift.break_minutes })}</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">{t("admin.emp_detail.sched_effective_since")}</p>
              <p className="text-sm font-bold text-slate-600">{format(new Date(schedule.effective_from),"d MMM yyyy",{locale:th})}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500"/>
            <p className="text-sm text-amber-700 font-medium">{t("admin.emp_detail.sched_no_shift")}</p>
          </div>
        )}
      </div>

      {/* ── Salary breakdown ── */}
      {salary && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
            <DollarSign size={14} className="text-emerald-500"/>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t("admin.emp_detail.salary_structure")}</span>
            <span className="ml-auto font-black text-emerald-600 text-sm">฿{fmt(salary.base_salary + allAllowances)}{t("admin.emp_detail.card_per_month")}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100">
            {[
              { l:t("admin.emp_detail.salary_base_label"),   v:salary.base_salary,           show:true },
              { l:t("admin.emp_detail.salary_allow_position"),   v:salary.allowance_position,    show:(salary.allowance_position||0)>0 },
              { l:t("admin.emp_detail.salary_allow_transport"),     v:salary.allowance_transport,   show:(salary.allowance_transport||0)>0 },
              { l:t("admin.emp_detail.salary_allow_food"),       v:salary.allowance_food,        show:(salary.allowance_food||0)>0 },
              { l:t("admin.emp_detail.salary_allow_phone"),    v:salary.allowance_phone,       show:(salary.allowance_phone||0)>0 },
              { l:t("admin.emp_detail.salary_allow_housing"),       v:salary.allowance_housing,     show:(salary.allowance_housing||0)>0 },
              { l:t("admin.emp_detail.salary_allow_vehicle"), v:salary.allowance_vehicle,     show:(salary.allowance_vehicle||0)>0 },
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
                <p className="text-[10px] text-emerald-600 font-bold">{t("admin.emp_detail.stat_kpi_base")}</p>
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
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t("admin.emp_detail.stat_month_title")}</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-slate-100">
          {[
            { l:t("admin.emp_detail.stat_present"),   v:stats?.present,      unit:t("admin.emp_detail.stat_unit_day"),  c:"text-blue-600" },
            { l:t("admin.emp_detail.stat_late"),    v:stats?.late,          unit:t("admin.emp_detail.stat_unit_times"),c:"text-amber-600" },
            { l:t("admin.emp_detail.stat_absent"),   v:stats?.absent,        unit:t("admin.emp_detail.stat_unit_day"),  c:"text-red-500" },
            { l:t("admin.emp_detail.stat_early_out"),  v:stats?.earlyOut,      unit:t("admin.emp_detail.stat_unit_times"),c:"text-orange-500" },
            { l:t("admin.emp_detail.stat_late_total"),   v:stats?.totalLateMin,  unit:t("admin.emp_detail.stat_unit_min"), c:"text-amber-500" },
            { l:t("admin.emp_detail.stat_early_total"),v:stats?.totalEarlyMin,unit:t("admin.emp_detail.stat_unit_min"), c:"text-orange-500" },
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
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t("admin.emp_detail.checkin_allowed_branches")}</span>
          </div>
          <span className="text-[11px] font-bold text-blue-500">{t("admin.emp_detail.checkin_branches_unit", { n: locations.length })}</span>
        </div>
        {locations.length === 0 ? (
          <div className="px-4 py-5 flex items-center gap-3">
            <AlertTriangle size={15} className="text-amber-500"/>
            <p className="text-sm text-amber-700 font-medium">{t("admin.emp_detail.checkin_no_branch")}</p>
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
                  {b.geo_radius_m && <p className="text-[10px] text-slate-400">{t("admin.emp_detail.checkin_radius", { n: b.geo_radius_m })}</p>}
                </div>
                <CheckCircle2 size={14} className="text-green-500"/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Attendance by payroll period ── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-slate-500"/>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{t("admin.emp_detail.checkin_attendance")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAttPeriodOffset(o => o - 1)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500 text-xs font-bold">←</button>
            <span className="text-xs font-bold text-indigo-600 min-w-[80px] text-center">{currentPeriod.label}</span>
            <button onClick={() => setAttPeriodOffset(o => o + 1)} disabled={attPeriodOffset >= 0}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500 text-xs font-bold disabled:opacity-30">→</button>
          </div>
          <span className="text-[10px] text-slate-400">{currentPeriod.start.slice(5)} – {currentPeriod.end.slice(5)}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 && <p className="text-sm text-slate-300 text-center py-6">{t("admin.emp_detail.common_no_data")}</p>}
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
                  {r.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold">{t("admin.emp_detail.checkin_late_min", { n: r.late_minutes })}</span>}
                  {r.early_out_minutes > 0 && <span className="text-[10px] text-orange-500 font-bold">{t("admin.emp_detail.checkin_early_min", { n: r.early_out_minutes })}</span>}
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
              }} className="text-slate-300 hover:text-indigo-600 flex-shrink-0" title={t("admin.emp_detail.checkin_edit_time_title")}>
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
              <h3 className="text-white font-bold">{t("admin.emp_detail.checkin_edit_inout")}</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{empName(emp)} · {editAttRec.work_date}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t("admin.emp_detail.checkin_date_time_in")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAttForm.clock_in_date} onChange={e => setEditAttForm(f => ({ ...f, clock_in_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"/>
                  <input type="time" value={editAttForm.clock_in} onChange={e => setEditAttForm(f => ({ ...f, clock_in: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t("admin.emp_detail.checkin_date_time_out")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAttForm.clock_out_date} onChange={e => setEditAttForm(f => ({ ...f, clock_out_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"/>
                  <input type="time" value={editAttForm.clock_out} onChange={e => setEditAttForm(f => ({ ...f, clock_out: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"/>
                </div>
                {editAttForm.clock_out_date && editAttForm.clock_out_date !== editAttForm.clock_in_date && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1">{t("admin.emp_detail.checkin_overnight_note")}</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditAttRec(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{t("admin.emp_detail.common_cancel")}</button>
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
                    toast.success(t("admin.emp_detail.toast_edit_time_saved"))
                    setEditAttRec(null)
                    // reload attendance ตามรอบตัดเงินเดือน
                    const { data: newRec } = await supabase.from("attendance_records")
                      .select("id, work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, shift_template_id")
                      .eq("employee_id", employeeId)
                      .gte("work_date", currentPeriod.start).lte("work_date", currentPeriod.end)
                      .order("work_date", { ascending: false })
                    setRecent(newRec ?? [])
                  } else toast.error(data.error || t("admin.emp_detail.toast_error"))
                } catch { toast.error(t("admin.emp_detail.toast_error")) }
                setEditAttSaving(false)
              }} disabled={editAttSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {editAttSaving ? t("admin.emp_detail.common_saving") : t("admin.emp_detail.common_save")}
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
  const { t } = useLanguage()
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
    if (res.ok) toast.success(t("admin.emp_detail.toast_recalc_done"))
    else toast.error(t("admin.emp_detail.toast_recalc_fail"))
  }

  const TH_MONTHS_SHORT = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
  const hrU = t("admin.emp_detail.paysum_unit_hr")
  const minU = t("admin.emp_detail.paysum_unit_min")

  function minToHr(m?: number | null) {
    if (!m) return `0 ${hrU}`
    const h = Math.floor(m / 60)
    const min = m % 60
    return min > 0 ? `${h} ${hrU} ${min} ${minU}` : `${h} ${hrU}`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )

  if (records.length === 0) return (
    <div className="py-12 text-center text-slate-400">
      <DollarSign size={36} className="mx-auto mb-3 opacity-30"/>
      <p className="font-medium">{t("admin.emp_detail.paysum_no_payroll")}</p>
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
            {t("admin.emp_detail.paysum_recalc")}
          </button>
        )}
      </div>

      {r && (
        <>
          {/* ── รายได้ ── */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
            <h4 className="text-sm font-black text-emerald-800 mb-3 flex items-center gap-2">
              <TrendingUp size={15}/> {t("admin.emp_detail.paysum_income")}
            </h4>
            <div className="space-y-1.5">
              {(() => {
                const rc = recomputePayroll(r)
                const fullBase = Number(r.base_salary) || 0
                const rph = fullBase / 30 / 8  // OT rate ใช้ฐานเต็มตามสัญญา
                const ot15 = Math.round(rph * (Number(r.ot_weekday_minutes)||0) / 60 * 1.5 * 100) / 100
                const ot10 = Math.round(rph * (Number(r.ot_holiday_reg_minutes)||0) / 60 * 100) / 100
                const ot30 = Math.round(rph * (Number(r.ot_holiday_ot_minutes)||0) / 60 * 3.0 * 100) / 100
                const items: [string, number][] = [
                  [rc.factor < 1 ? t("admin.emp_detail.paysum_base_prorated", { days: rc.prorateDays }) : t("admin.emp_detail.salary_base_label"), rc.effBase],
                  [t("admin.emp_detail.paysum_allow_position"), Number(r.allowance_position)||0],
                  [t("admin.emp_detail.salary_allow_transport"), Number(r.allowance_transport)||0],
                  [t("admin.emp_detail.salary_allow_food"), Number(r.allowance_food)||0],
                  [t("admin.emp_detail.salary_allow_phone"), Number(r.allowance_phone)||0],
                  [t("admin.emp_detail.salary_allow_housing"), Number(r.allowance_housing)||0],
                  [t("admin.emp_detail.salary_allow_vehicle"), Number(r.allowance_vehicle)||0],
                  [t("admin.emp_detail.paysum_other_allowance"), Number(r.allowance_other)||0],
                  [t("admin.emp_detail.paysum_ot_weekday", { time: minToHr(r.ot_weekday_minutes) }), ot15],
                  [t("admin.emp_detail.paysum_ot_holiday_reg", { time: minToHr(r.ot_holiday_reg_minutes) }), ot10],
                  [t("admin.emp_detail.paysum_ot_holiday_ot", { time: minToHr(r.ot_holiday_ot_minutes) }), ot30],
                  [`${t("admin.emp_detail.paysum_kpi_bonus")}${r.kpi_grade && r.kpi_grade !== "pending" ? t("admin.emp_detail.paysum_grade_suffix", { grade: r.kpi_grade }) : ""}`, rc.effBonus],
                  [t("admin.emp_detail.paysum_commission"), Number(r.commission)||0],
                  [t("admin.emp_detail.paysum_other_income"), Number(r.other_income)||0],
                ]
                return items.filter(([,v]) => v > 0).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="font-bold text-emerald-700">+฿{fmt(val)}</span>
                  </div>
                ))
              })()}
              {/* Income extras */}
              {r.income_extras && Object.entries(r.income_extras as Record<string, number>).filter(([, v]) => v > 0).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2">
                  <span className="text-slate-600 font-medium">{key}</span>
                  <span className="font-bold text-emerald-700">+฿{fmt(val)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-emerald-100 rounded-xl px-3 py-2 mt-1">
                <span className="text-xs font-bold text-emerald-800">{t("admin.emp_detail.paysum_gross")}</span>
                <span className="font-black text-emerald-800 text-base">฿{fmt(recomputePayroll(r).gross)}</span>
              </div>
            </div>
          </div>

          {/* ── การหัก ── */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
            <h4 className="text-sm font-black text-rose-800 mb-3 flex items-center gap-2">
              <TrendingDown size={15}/> {t("admin.emp_detail.paysum_deductions")}
            </h4>
            <div className="space-y-1.5">
              {(() => {
                const rc = recomputePayroll(r)
                return [
                  [t("admin.emp_detail.paysum_deduct_absent"), r.deduct_absent],
                  [t("admin.emp_detail.paysum_deduct_late"), r.deduct_late],
                  [t("admin.emp_detail.paysum_deduct_early"), r.deduct_early_out],
                  [t("admin.emp_detail.paysum_sso"), rc.sso],
                  [t("admin.emp_detail.salary_wht"), rc.tax],
                  [t("admin.emp_detail.paysum_deduct_loan"), r.deduct_loan],
                  [t("admin.emp_detail.paysum_deduct_other"), r.deduct_other],
                ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2">
                    <span className="text-slate-600 font-medium">{label as string}</span>
                    <span className="font-bold text-rose-700">-฿{fmt(val as number)}</span>
                  </div>
                ))
              })()}
              {/* Deduction extras */}
              {r.deduction_extras && Object.entries(r.deduction_extras as Record<string, number>).filter(([, v]) => v > 0).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2">
                  <span className="text-slate-600 font-medium">{key}</span>
                  <span className="font-bold text-rose-700">-฿{fmt(val)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-rose-100 rounded-xl px-3 py-2 mt-1">
                <span className="text-xs font-bold text-rose-800">{t("admin.emp_detail.paysum_total_deduct")}</span>
                <span className="font-black text-rose-800">-฿{fmt(recomputePayroll(r).totalDed)}</span>
              </div>
            </div>
          </div>

          {/* ── เงินสุทธิ + สถิติ ── */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-600 p-4 text-white text-center">
            <p className="text-xs font-bold opacity-70 mb-1">{t("admin.emp_detail.paysum_net")}</p>
            <p className="text-3xl font-black">฿{fmt(recomputePayroll(r).net)}</p>
            <p className="text-[10px] opacity-60 mt-1">{TH_MONTHS_SHORT[r.month]} {r.year + 543}</p>
          </div>

          {/* ── สถิติการทำงาน ── */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <h4 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
              <BarChart2 size={15}/> {t("admin.emp_detail.paysum_work_stats")}
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [t("admin.emp_detail.paysum_stat_present"), r.present_days ?? 0, "text-emerald-600", t("admin.emp_detail.stat_unit_day")],
                [t("admin.emp_detail.paysum_stat_absent"), r.absent_days ?? 0, "text-rose-500", t("admin.emp_detail.stat_unit_day")],
                [t("admin.emp_detail.paysum_stat_late"), r.late_count ?? 0, "text-amber-500", t("admin.emp_detail.stat_unit_times")],
                [t("admin.emp_detail.paysum_stat_vacation"), r.leave_paid_days ?? 0, "text-sky-500", t("admin.emp_detail.stat_unit_day")],
                ["OT", fmtDec(r.ot_hours), "text-indigo-600", t("admin.emp_detail.paysum_unit_hr")],
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
                <Calendar size={15}/> {t("admin.emp_detail.paysum_daily_detail")}
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
                    <p className="text-slate-400 text-xs mb-2">{t("admin.emp_detail.paysum_load_fail")}</p>
                    <button
                      onClick={() => { bdCache.current = {}; setBreakdown(null); setBdOpen(false); setTimeout(() => setBdOpen(true), 50) }}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      {t("admin.emp_detail.paysum_retry")}
                    </button>
                  </div>
                ) : breakdown ? (
                  <>
                    {/* ขาดงาน */}
                    {breakdown.absent?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1.5">
                          <X size={12}/> {t("admin.emp_detail.paysum_absent_days", { n: breakdown.absent.length })}
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
                          <Clock size={12}/> {t("admin.emp_detail.paysum_late_detail", { n: breakdown.late.length, m: breakdown.summary?.late_total_min ?? 0 })}
                        </p>
                        <div className="space-y-1">
                          {breakdown.late.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 text-[11px] border border-amber-100">
                              <span className="font-bold text-amber-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-amber-600">{t("admin.emp_detail.paysum_late_n_min", { n: d.minutes })}</span>
                              {d.clock_in && <span className="text-amber-400 ml-auto">{t("admin.emp_detail.paysum_clock_in", { time: new Date(d.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) })}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ออกก่อน */}
                    {breakdown.early_out?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1.5">
                          <ArrowLeft size={12}/> {t("admin.emp_detail.paysum_early_detail", { n: breakdown.early_out.length, m: breakdown.summary?.early_out_total_min ?? 0 })}
                        </p>
                        <div className="space-y-1">
                          {breakdown.early_out.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 text-[11px] border border-orange-100">
                              <span className="font-bold text-orange-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-orange-600">{t("admin.emp_detail.paysum_early_n_min", { n: d.minutes })}</span>
                              {d.clock_out && <span className="text-orange-400 ml-auto">{t("admin.emp_detail.paysum_clock_out", { time: new Date(d.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) })}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OT */}
                    {breakdown.ot?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1.5">
                          <TrendingUp size={12}/> {t("admin.emp_detail.paysum_ot_detail", { n: breakdown.ot.length, time: (() => { const tot = breakdown.summary?.ot_total_min ?? 0; return `${Math.floor(tot/60)} ${hrU} ${tot%60 > 0 ? `${tot%60} ${minU}` : ""}` })() })}
                        </p>
                        <div className="space-y-1">
                          {breakdown.ot.map((d: any) => (
                            <div key={d.date} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-[11px] border border-indigo-100">
                              <span className="font-bold text-indigo-800 min-w-[60px]">
                                {new Date(d.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-indigo-600">{Math.floor(d.minutes / 60)} {hrU} {d.minutes % 60 > 0 ? `${d.minutes % 60} ${minU}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ลา */}
                    {breakdown.leave?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-sky-600 mb-2 flex items-center gap-1.5">
                          <CalendarClock size={12}/> {t("admin.emp_detail.paysum_leave_days", { n: breakdown.leave.length })}
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
                              {d.is_half_day && <span className="text-sky-400">{t("admin.emp_detail.paysum_half_day")}</span>}
                              <span className={`ml-auto text-[10px] ${d.is_paid ? "text-green-500" : "text-rose-400"}`}>
                                {d.is_paid ? t("admin.emp_detail.paysum_paid") : t("admin.emp_detail.paysum_unpaid")}
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
                          <Calendar size={12}/> {t("admin.emp_detail.paysum_holidays", { n: breakdown.holidays.length })}
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
                      <p className="text-center text-slate-400 text-xs py-4">{t("admin.emp_detail.paysum_no_daily")}</p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-slate-400 text-xs py-4">{t("admin.emp_detail.paysum_load_fail")}</p>
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
  const { t } = useLanguage()
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
      if (!workStart || !workEnd) { toast.error(t("admin.emp_detail.toast_enter_time")); setSaving(false); return }
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
      if (shiftErr || !newShift) { toast.error(t("admin.emp_detail.toast_create_shift_fail") + (shiftErr?.message || "")); setSaving(false); return }
      shiftId = newShift.id
    }

    if (!shiftId) { toast.error(t("admin.emp_detail.toast_select_shift")); setSaving(false); return }

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
    toast.success(t("admin.emp_detail.toast_shift_assigned"))
    closeForm(); load()
  }

  const remove = async (id: string) => {
    if (!confirm(t("admin.emp_detail.confirm_delete_shift"))) return
    await supabase.from("work_schedules").delete().eq("id", id)
    toast.success(t("admin.emp_detail.toast_deleted_short")); load()
  }

  const current = schedules.find(s => !s.effective_to)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-800">{t("admin.emp_detail.sched_assign_title")}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("admin.emp_detail.sched_assign_note")}</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${showForm ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white shadow-sm shadow-blue-200"}`}>
          {showForm ? <X size={12}/> : <Plus size={12}/>}
          {showForm ? t("admin.emp_detail.common_cancel") : t("admin.emp_detail.sched_add_shift")}
        </button>
      </div>

      {/* ── Current Shift ── */}
      {current ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-4 mb-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-indigo-600"/>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-0.5">{t("admin.emp_detail.sched_current")}</p>
            <p className="font-black text-indigo-800">{current.shift?.name}</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              {current.shift?.work_start?.slice(0,5)} – {current.shift?.work_end?.slice(0,5)}
              {current.shift?.break_minutes ? ` · ${t("admin.emp_detail.sched_break_short", { n: current.shift.break_minutes })}` : ""}
              {current.shift?.is_overnight ? ` · ${t("admin.emp_detail.sched_overnight")}` : ""}
            </p>
          </div>
          <div className="text-right">
            {current.late_threshold_minutes != null ? (
              <div className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full mb-1">
                {t("admin.emp_detail.sched_late_allow", { n: current.late_threshold_minutes })}
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-400 text-[11px] px-2.5 py-1 rounded-full mb-1">{t("admin.emp_detail.sched_use_dept")}</div>
            )}
            <p className="text-[10px] text-indigo-400">{t("admin.emp_detail.sched_effective_from", { date: format(new Date(current.effective_from),"d MMM yyyy",{locale:th}) })}</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-500"/>
          <p className="text-sm text-amber-800 font-medium">{t("admin.emp_detail.sched_no_shift_hint")}</p>
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t("admin.emp_detail.sched_new_shift")}</p>

          {/* Mode toggle */}
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 gap-1">
            {([["template","sched_mode_template"],["custom","sched_mode_custom"]] as const).map(([m,l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode===m ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
                {t(`admin.emp_detail.${l}`)}
              </button>
            ))}
          </div>

          {/* Template picker */}
          {mode === "template" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_shift")}</label>
              <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className={inp}>
                <option value="">{t("admin.emp_detail.sched_select_shift")}</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.work_start?.slice(0,5)}–{s.work_end?.slice(0,5)})</option>
                ))}
              </select>
              {shifts.length === 0 && <p className="text-xs text-amber-600 mt-1">{t("admin.emp_detail.sched_no_shifts")}</p>}
              {selectedShift && (() => {
                const s = shifts.find(x => x.id === selectedShift)
                if (!s) return null
                return (
                  <div className="mt-2 bg-white border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-sm font-bold text-indigo-700">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.work_start?.slice(0,5)} – {s.work_end?.slice(0,5)} · {t("admin.emp_detail.sched_break_short", { n: s.break_minutes })}{s.is_overnight?` · ${t("admin.emp_detail.sched_overnight")}`:""}</p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Custom time */}
          {mode === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_shift_name")}</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)} className={inp} placeholder={t("admin.emp_detail.sched_shift_name_ph")}/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_time_in")}</label>
                  <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_time_out")}</label>
                  <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_break_label")}</label>
                  <input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} className={inp} min="0" max="120"/>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isOvernight} onChange={e => setIsOvernight(e.target.checked)} className="rounded"/>
                <span className="text-xs text-slate-600 font-medium">{t("admin.emp_detail.sched_overnight_label")}</span>
              </label>
            </div>
          )}

          {/* Late threshold override */}
          <div className="bg-white border border-amber-100 rounded-xl p-4">
            <label className="block text-xs font-bold text-amber-700 mb-2">{t("admin.emp_detail.sched_late_threshold")}</label>
            <div className="flex items-center gap-3">
              <input type="number" value={lateThreshold} onChange={e => setLateThreshold(e.target.value)}
                className={inp + " w-28"} min="0" max="60" placeholder="—"/>
              <p className="text-xs text-slate-400">{t("admin.emp_detail.sched_late_threshold_note1")}<br/>{t("admin.emp_detail.sched_late_threshold_note2")}</p>
            </div>
            {lateThreshold !== "" && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                {t("admin.emp_detail.sched_late_allow_ok", { n: lateThreshold })}
              </p>
            )}
          </div>

          {/* Effective from */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.sched_effective_date")}</label>
            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className={inp + " w-48"}/>
          </div>

          <button onClick={assign} disabled={saving}
            className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {t("admin.emp_detail.sched_save")}
          </button>
        </div>
      )}

      {/* ── History ── */}
      {schedules.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{t("admin.emp_detail.sched_history", { n: schedules.length })}</p>
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
                        {t("admin.emp_detail.sched_late_allow", { n: sc.late_threshold_minutes })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sc.shift?.work_start?.slice(0,5)} – {sc.shift?.work_end?.slice(0,5)}
                    &nbsp;·&nbsp;
                    {format(new Date(sc.effective_from),"d MMM yyyy",{locale:th})}
                    {sc.effective_to ? ` – ${format(new Date(sc.effective_to),"d MMM yyyy",{locale:th})}` : t("admin.emp_detail.salary_until_present")}
                  </p>
                </div>
                {!sc.effective_to && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full flex-shrink-0">{t("admin.emp_detail.common_current")}</span>}
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
  const { t } = useLanguage()
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
      toast.success(t("admin.emp_detail.toast_perm_removed"))
    } else {
      await supabase.from("employee_allowed_locations").insert({ employee_id: employeeId, branch_id: branchId, created_by: user?.employee_id ?? null })
      toast.success(t("admin.emp_detail.toast_perm_added"))
    }
    setSaving(null); load()
  }

  const addCustom = async () => {
    const { name, lat, lng, radius } = customForm
    const latNum = parseFloat(lat), lngNum = parseFloat(lng)
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum)) return toast.error(t("admin.emp_detail.toast_invalid_latlng"))
    if (latNum < -90 || latNum > 90) return toast.error(t("admin.emp_detail.toast_lat_range"))
    if (lngNum < -180 || lngNum > 180) return toast.error(t("admin.emp_detail.toast_lng_range"))
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
    toast.success(t("admin.emp_detail.toast_location_added"))
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
        toast.success(t("admin.emp_detail.toast_latlng_pasted"))
        return
      }
    }
    setCustomForm(f => ({ ...f, lat: val }))
  }

  const removeCustom = async (id: string) => {
    await supabase.from("employee_allowed_locations").delete().eq("id", id)
    toast.success(t("admin.emp_detail.toast_deleted_short")); load()
  }

  const customRows = allowedRows.filter(r => !r.branch_id)

  const toggleAnywhere = async () => {
    setSavingAnywhere(true)
    const newVal = !checkinAnywhere
    const { error } = await supabase.from("employees").update({ checkin_anywhere: newVal }).eq("id", employeeId)
    if (error) { toast.error(error.message) } else {
      setCheckinAnywhere(newVal)
      toast.success(newVal ? t("admin.emp_detail.toast_anywhere_on") : t("admin.emp_detail.toast_anywhere_off"))
    }
    setSavingAnywhere(false)
  }

  const toggleSelfSchedule = async () => {
    setSavingSelfSched(true)
    const newVal = !canSelfSchedule
    const { error } = await supabase.from("employees").update({ can_self_schedule: newVal }).eq("id", employeeId)
    if (error) { toast.error(error.message) } else {
      setCanSelfSchedule(newVal)
      toast.success(newVal ? t("admin.emp_detail.toast_selfsched_on") : t("admin.emp_detail.toast_selfsched_off"))
    }
    setSavingSelfSched(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">{t("admin.emp_detail.tab_checkin")}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("admin.emp_detail.checkin_subtitle")}
            <span className="ml-1.5 font-bold text-indigo-600">{t("admin.emp_detail.checkin_location_count", { n: allowedRows.length })}</span>
          </p>
        </div>
        <button onClick={() => setShowCustom(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all ${showCustom ? "bg-slate-100 text-slate-600" : "bg-pink-600 text-white shadow-sm shadow-pink-200"}`}>
          {showCustom ? <X size={12}/> : <Plus size={12}/>}
          {showCustom ? t("admin.emp_detail.common_cancel") : t("admin.emp_detail.checkin_add_coord")}
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
              <p className="font-bold text-sm text-slate-800">{t("admin.emp_detail.checkin_anywhere_title")}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {checkinAnywhere
                  ? t("admin.emp_detail.checkin_anywhere_on")
                  : t("admin.emp_detail.checkin_anywhere_off")
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
              <p className="font-bold text-sm text-slate-800">{t("admin.emp_detail.checkin_selfsched_title")}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {canSelfSchedule
                  ? t("admin.emp_detail.checkin_selfsched_on")
                  : t("admin.emp_detail.checkin_selfsched_off")
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
            <p className="text-xs font-bold text-pink-700 uppercase tracking-wide">{t("admin.emp_detail.checkin_add_gps")}</p>
          </div>

          {/* Paste lat,lng single field */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.checkin_paste_coord")}</label>
            <input
              className={inp}
              placeholder="เช่น 13.726932874684474, 100.49304284696417"
              onPaste={e => { e.preventDefault(); pasteLatLng(e.clipboardData.getData("text")) }}
              onBlur={e => { if (e.target.value.includes(",")) pasteLatLng(e.target.value) }}
              onChange={e => e.target.value.includes(",") && pasteLatLng(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">{t("admin.emp_detail.checkin_paste_hint")}</p>
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
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.checkin_place_name")}</label>
              <input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name:e.target.value }))} className={inp} placeholder={t("admin.emp_detail.checkin_place_name_ph")}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("admin.emp_detail.checkin_radius_label")}</label>
              <div className="flex items-center gap-2">
                <input type="number" value={customForm.radius} onChange={e => setCustomForm(f => ({ ...f, radius:e.target.value }))} className={inp} min="50" max="2000"/>
                <span className="text-xs text-slate-400 flex-shrink-0">{t("admin.emp_detail.checkin_meter_unit")}</span>
              </div>
              <input type="range" min="50" max="500" step="50" value={customForm.radius}
                onChange={e => setCustomForm(f => ({ ...f, radius:e.target.value }))}
                className="w-full mt-1.5 accent-pink-500"/>
              <div className="flex justify-between text-[9px] text-slate-300 -mt-0.5">
                <span>50</span><span>200</span><span>{t("admin.emp_detail.checkin_500m")}</span>
              </div>
            </div>
          </div>

          {/* Map preview text */}
          {customForm.lat && customForm.lng && !isNaN(parseFloat(customForm.lat)) && (
            <a href={`https://www.google.com/maps?q=${customForm.lat},${customForm.lng}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline">
              <MapPin size={11}/> {t("admin.emp_detail.checkin_open_gmaps")}
            </a>
          )}

          <button onClick={addCustom} disabled={savingCustom}
            className="bg-pink-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-pink-700 disabled:opacity-50 transition-all">
            {savingCustom ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {t("admin.emp_detail.checkin_add_this_coord")}
          </button>
        </div>
      )}

      {/* ── Custom locations ── */}
      {customRows.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">{t("admin.emp_detail.checkin_custom_locations", { n: customRows.length })}</p>
          <div className="space-y-2">
            {customRows.map(row => (
              <div key={row.id} className="flex items-center gap-3 p-4 rounded-xl border-2 border-pink-200 bg-pink-50">
                <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-pink-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-pink-800">{row.custom_name || t("admin.emp_detail.checkin_no_name")}</p>
                  <p className="text-[10px] text-pink-500 font-mono mt-0.5">
                    {Number(row.custom_lat).toFixed(6)}, {Number(row.custom_lng).toFixed(6)}
                    <span className="ml-2 not-italic font-sans">· {t("admin.emp_detail.checkin_radius", { n: row.custom_radius_m })}</span>
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t("admin.emp_detail.checkin_all_branches", { n: allBranches.length })}</p>
          <div className="flex gap-2">
            <button onClick={async () => { const missing = allBranches.filter(b => !branchAllowedIds.has(b.id)); if (!missing.length) return; await supabase.from("employee_allowed_locations").insert(missing.map(b => ({ employee_id: employeeId, branch_id: b.id, created_by: user?.employee_id??null }))); toast.success(t("admin.emp_detail.checkin_added_n_branches", { n: missing.length })); load() }} className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">{t("admin.emp_detail.checkin_select_all")}</button>
            <button onClick={async () => { if (!confirm(t("admin.emp_detail.checkin_confirm_clear_all"))) return; const ids = allowedRows.filter(r=>r.branch_id).map(r=>r.id); for (const id of ids) await supabase.from("employee_allowed_locations").delete().eq("id",id); toast.success(t("admin.emp_detail.toast_cancelled")); load() }} className="text-[10px] font-bold px-2.5 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">{t("admin.emp_detail.checkin_clear")}</button>
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
                  <span className="text-[10px] font-normal text-slate-400 ml-1">{t("admin.emp_detail.checkin_branch_summary", { n: compBranches.length, m: compAllowedCount })}</span>
                </p>
                <div className="flex gap-1.5">
                  <button onClick={async () => {
                    const missing = compBranches.filter(b => !branchAllowedIds.has(b.id))
                    if (!missing.length) return
                    await supabase.from("employee_allowed_locations").insert(missing.map(b => ({ employee_id: employeeId, branch_id: b.id, created_by: user?.employee_id??null })))
                    toast.success(t("admin.emp_detail.checkin_added_company_branches", { n: missing.length, company: company.code||company.name_th }))
                    load()
                  }} className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">{t("admin.emp_detail.checkin_select_all")}</button>
                  <button onClick={async () => {
                    const ids = allowedRows.filter(r => r.branch_id && compBranches.some(b => b.id === r.branch_id)).map(r => r.id)
                    if (!ids.length) return
                    for (const rid of ids) await supabase.from("employee_allowed_locations").delete().eq("id", rid)
                    toast.success(t("admin.emp_detail.toast_cancelled")); load()
                  }} className="text-[9px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">{t("admin.emp_detail.checkin_clear")}</button>
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
                          {b.latitude ? `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` : t("admin.emp_detail.checkin_no_coord")}
                          {b.geo_radius_m ? ` · ${t("admin.emp_detail.checkin_radius", { n: b.geo_radius_m })}` : ""}
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
            <p className="text-xs font-bold text-slate-500 mb-2">{t("admin.emp_detail.checkin_other_branches")}</p>
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
                        {b.latitude ? `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` : t("admin.emp_detail.checkin_no_coord")}
                        {b.geo_radius_m ? ` · ${t("admin.emp_detail.checkin_radius", { n: b.geo_radius_m })}` : ""}
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

        {allBranches.length === 0 && <p className="text-center text-slate-300 py-6 text-sm">{t("admin.emp_detail.checkin_no_branches_yet")}</p>}
      </div>
    </div>
  )
}

// ─── RoleManagementTab ───────────────────────────────────────────────────────
function RoleManagementTab({ employeeId, employeeName, employeeEmail }: { employeeId: string; employeeName: string; employeeEmail: string }) {
  const { t } = useLanguage()
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
    { value: "employee",        label: t("admin.emp_detail.role_employee_label"),         desc: t("admin.emp_detail.role_employee_desc"),                        color: "bg-slate-100 text-slate-700 border-slate-200",    icon: "👤" },
    { value: "manager",         label: t("admin.emp_detail.role_manager_label"),       desc: t("admin.emp_detail.role_manager_desc"),                        color: "bg-violet-100 text-violet-700 border-violet-200", icon: "👥" },
    { value: "equipment_admin", label: t("admin.emp_detail.role_equip_label"),   desc: t("admin.emp_detail.role_equip_desc"),                           color: "bg-cyan-100 text-cyan-700 border-cyan-200",       icon: "📦" },
    { value: "hr_admin",        label: "HR Admin",         desc: t("admin.emp_detail.role_hr_desc"),                   color: "bg-blue-100 text-blue-700 border-blue-200",       icon: "🛡️" },
    { value: "super_admin",     label: "Super Admin",      desc: t("admin.emp_detail.role_super_desc"),                         color: "bg-amber-100 text-amber-700 border-amber-200",    icon: "⚡" },
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
              <p className="font-bold text-amber-800">{t("admin.emp_detail.role_no_account_title")}</p>
              <p className="text-xs text-amber-600">{t("admin.emp_detail.role_no_account_note")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-500" />
            {t("admin.emp_detail.role_create_account")}
          </h3>

          {/* อีเมล */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.personal_email_login")}</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.role_password")}</label>
            <div className="relative">
              <input
                type={showCreatePw ? "text" : "password"}
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder={t("admin.emp_detail.role_pw_min_ph")}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none pr-20"
              />
              <button
                type="button"
                onClick={() => setShowCreatePw(!showCreatePw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                {showCreatePw ? t("admin.emp_detail.common_hide") : t("admin.emp_detail.common_show")}
              </button>
            </div>
            {createPassword.length > 0 && createPassword.length < 6 && (
              <p className="text-xs text-red-500 mt-1">{t("admin.emp_detail.role_pw_min")}</p>
            )}
          </div>

          {/* บทบาท */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("admin.emp_detail.role_label")}</label>
            <select
              value={createRole}
              onChange={e => setCreateRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="employee">👤 {t("admin.emp_detail.role_employee_label")}</option>
              <option value="manager">👥 {t("admin.emp_detail.role_manager_label")}</option>
              <option value="equipment_admin">📦 {t("admin.emp_detail.role_equip_label")}</option>
              <option value="hr_admin">🛡️ HR Admin</option>
              <option value="super_admin">⚡ Super Admin</option>
            </select>
          </div>

          {/* ปุ่มสร้าง */}
          <button
            onClick={async () => {
              if (!createEmail.trim()) { toast.error(t("admin.emp_detail.toast_enter_email")); return }
              if (createPassword.length < 6) { toast.error(t("admin.emp_detail.role_pw_min")); return }
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
                  toast.error(data.error || t("admin.emp_detail.toast_error"))
                }
              } catch {
                toast.error(t("admin.emp_detail.toast_connection_error"))
              }
              setCreating(false)
            }}
            disabled={creating || !createEmail.trim() || createPassword.length < 6}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {creating ? (
              <><Loader2 size={16} className="animate-spin" /> {t("admin.emp_detail.role_creating_account")}</>
            ) : (
              <><UserCheck size={16} /> {t("admin.emp_detail.role_create_account")}</>
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
          <h3 className="font-bold text-slate-800">{t("admin.emp_detail.role_title")}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("admin.emp_detail.role_subtitle", { name: employeeName })}</p>
        </div>
        {currentRole && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${ROLES.find(r => r.value === currentRole)?.color ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {ROLES.find(r => r.value === currentRole)?.icon} {t("admin.emp_detail.role_current", { label: ROLES.find(r => r.value === currentRole)?.label ?? currentRole })}
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
                      <span className="text-[9px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{t("admin.emp_detail.common_current")}</span>
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
            {t("admin.emp_detail.role_save")}
          </button>
          <button
            onClick={() => setSelectedRole(currentRole ?? "")}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            {t("admin.emp_detail.common_cancel")}
          </button>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {t("admin.emp_detail.role_change_hint", { from: ROLES.find(r => r.value === currentRole)?.label, to: ROLES.find(r => r.value === selectedRole)?.label })}
          </p>
        </div>
      )}

      {/* ── Change Email Section ── */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-blue-500" />
          <h3 className="font-bold text-slate-800 text-sm">{t("admin.emp_detail.role_login_email")}</h3>
        </div>

        {currentEmail && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-slate-400 mb-0.5">{t("admin.emp_detail.role_current_email")}</p>
            <p className="text-sm font-semibold text-slate-700 select-all">{currentEmail}</p>
          </div>
        )}

        {emailResult ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-sm font-bold text-green-800">{t("admin.emp_detail.role_email_changed")}</p>
            </div>
            <p className="text-xs text-slate-600">
              {emailResult.old_email} → <span className="font-bold text-green-700">{emailResult.new_email}</span>
            </p>
            <button onClick={() => { setEmailResult(null); setNewEmail("") }}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">{t("admin.emp_detail.common_hide")}</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={t("admin.emp_detail.role_new_email_ph")}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
            />
            <button
              onClick={async () => {
                if (!newEmail.trim()) { toast.error(t("admin.emp_detail.toast_enter_new_email")); return }
                if (!confirm(t("admin.emp_detail.role_confirm_change_email", { name: employeeName, from: currentEmail, to: newEmail.trim() }))) return
                setChangingEmail(true)
                try {
                  const res = await fetch("/api/auth/change-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_id: employeeId, new_email: newEmail.trim() }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || t("admin.emp_detail.role_email_change_fail"))
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
              {changingEmail ? t("admin.emp_detail.role_changing") : t("admin.emp_detail.role_change_email")}
            </button>
          </div>
        )}
      </div>

      {/* ── Reset Password Section ── */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-amber-500" />
          <h3 className="font-bold text-slate-800 text-sm">{t("admin.emp_detail.role_reset_pw")}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          {t("admin.emp_detail.role_reset_pw_note")}
        </p>

        {resetResult ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-sm font-bold text-green-800">{t("admin.emp_detail.role_reset_success")}</p>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-green-100 mb-2">
              <p className="text-xs text-slate-400">{t("admin.emp_detail.role_new_pw")}</p>
              <p className="text-lg font-mono font-bold text-slate-800 tracking-wider select-all">{resetResult.password}</p>
            </div>
            <p className="text-xs text-green-600">
              {resetResult.email_sent ? t("admin.emp_detail.role_email_sent") : t("admin.emp_detail.role_email_not_sent")}
            </p>
            <button onClick={() => { setResetResult(null); setCustomPassword("") }}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">{t("admin.emp_detail.common_hide")}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={customPassword}
                onChange={e => setCustomPassword(e.target.value)}
                placeholder={t("admin.emp_detail.role_reset_pw_ph")}
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
                  if (pw && pw.length < 6) { toast.error(t("admin.emp_detail.role_pw_min")); return }
                  const msg = pw
                    ? t("admin.emp_detail.role_confirm_set_pw", { name: employeeName, pw })
                    : t("admin.emp_detail.role_confirm_random_pw", { name: employeeName })
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
                    if (!res.ok) throw new Error(data.error || t("admin.emp_detail.role_reset_fail"))
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
                {resetting ? t("admin.emp_detail.role_resetting") : customPassword.trim() ? t("admin.emp_detail.role_set_this_pw") : t("admin.emp_detail.role_random_pw")}
              </button>
              {customPassword.trim() && (
                <p className="text-xs text-slate-400">{t("admin.emp_detail.role_will_set_entered")}</p>
              )}
              {!customPassword.trim() && (
                <p className="text-xs text-slate-400">{t("admin.emp_detail.role_will_random")}</p>
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
  const { t } = useLanguage()
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

  if (loading) return <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 size={16} className="animate-spin"/>{t("admin.emp_detail.common_loading")}</div>

  if (balances.length === 0) return (
    <div className="py-16 text-center">
      <Calendar size={24} className="mx-auto text-slate-200 mb-2"/>
      <p className="text-slate-400 text-sm">{t("admin.emp_detail.quota_no_quota", { year })}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-500"/>
          {t("admin.emp_detail.quota_title", { year })}
        </h3>
        <span className="text-xs text-slate-400">{t("admin.emp_detail.quota_types_count", { n: balances.length })}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-bold text-blue-400 uppercase">{t("admin.emp_detail.quota_total")}</p>
          <p className="text-xl font-black text-blue-700">{balances.reduce((s, b) => s + (b.entitled_days || 0), 0).toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-[10px] font-bold text-amber-400 uppercase">{t("admin.emp_detail.quota_used_total")}</p>
          <p className="text-xl font-black text-amber-700">{balances.reduce((s, b) => s + (b.used_days || 0), 0).toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">{t("admin.emp_detail.quota_remaining_total")}</p>
          <p className="text-xl font-black text-emerald-700">{balances.reduce((s, b) => s + (b.remaining_days || 0), 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">{t("admin.emp_detail.quota_leave_type")}</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{t("admin.emp_detail.quota_quota")}</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{t("admin.emp_detail.quota_used")}</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{t("admin.emp_detail.quota_pending")}</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{t("admin.emp_detail.quota_remaining")}</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase w-[120px]">{t("admin.emp_detail.quota_proportion")}</th>
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
                        <p className="text-[10px] text-slate-400">{lt?.is_paid ? t("admin.emp_detail.quota_paid") : t("admin.emp_detail.quota_unpaid")}</p>
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
          {t("admin.emp_detail.quota_leave_history", { year })}
        </h4>
        {leaveHistory.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-4">{t("admin.emp_detail.quota_no_leave_history")}</p>
        ) : (
          <div className="space-y-1.5">
            {leaveHistory.map((lr: any) => {
              const isSameDay = lr.start_date === lr.end_date
              return (
                <div key={lr.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lr.leave_type?.color_hex || "#94a3b8" }} />
                  <span className="font-bold text-slate-600 min-w-[80px]">{lr.leave_type?.name || t("admin.emp_detail.quota_leave_default")}</span>
                  <span className="text-slate-500">
                    {new Date(lr.start_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    {!isSameDay && ` – ${new Date(lr.end_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
                  </span>
                  <span className="text-slate-400">{lr.total_days} {t("admin.emp_detail.stat_unit_day")}</span>
                  {lr.is_half_day && <span className="text-blue-500 text-[10px]">{t("admin.emp_detail.paysum_half_day")}</span>}
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