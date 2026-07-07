"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Search, Plus, Download, ChevronRight, ChevronLeft, Filter, Users, Building2, Trash2, FileUp, Tag, X, Check, Link2, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import ImportModal from "./ImportModal"
import FeishuSyncButton from "@/components/admin/FeishuSyncButton"
import { useBrands } from "@/lib/hooks/useBrands"

const STATUS: Record<string, { l: string; c: string }> = {
  active:     { l: "ปกติ",       c: "bg-green-100 text-green-700"   },
  probation:  { l: "ทดลองงาน",  c: "bg-amber-100 text-amber-700"   },
  resigned:   { l: "ลาออก",     c: "bg-slate-100 text-slate-500"   },
  terminated: { l: "เลิกจ้าง",  c: "bg-red-100 text-red-600"       },
  on_leave:   { l: "ลาพักร้อน", c: "bg-blue-100 text-blue-700"     },
  suspended:  { l: "พักงาน",    c: "bg-orange-100 text-orange-700" },
}
const EMP_TYPE: Record<string, string> = {
  full_time: "ประจำ", part_time: "พาร์ทไทม์", contract: "สัญญา", intern: "ฝึกงาน",
}
const COMPANY_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
]
const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

// ── Brand mini chip color (สีสุภาพ ไม่จี้ตา) ──
function brandMiniColor(brand: string): string {
  const u = brand.toUpperCase()
  if (u.includes("DDPAI")) return "bg-blue-50 text-blue-700"
  if (u.includes("ANKER")) return "bg-sky-50 text-sky-700"
  if (u.includes("DREAME")) return "bg-purple-50 text-purple-700"
  if (u.includes("WANBO")) return "bg-amber-50 text-amber-700"
  if (u.includes("AKASO")) return "bg-rose-50 text-rose-700"
  if (u.includes("MOVA")) return "bg-emerald-50 text-emerald-700"
  if (u.includes("VINKO")) return "bg-teal-50 text-teal-700"
  if (u.includes("XIAOMI") || u.includes("70MAI")) return "bg-orange-50 text-orange-700"
  if (u.includes("MOLLY")) return "bg-pink-50 text-pink-700"
  if (u.includes("LEVOIT")) return "bg-cyan-50 text-cyan-700"
  if (u.includes("JIMMY") || u.includes("JISULIFE")) return "bg-yellow-50 text-yellow-800"
  if (u.includes("SOUNDCORE")) return "bg-violet-50 text-violet-700"
  if (u.includes("UWANT") || u.includes("PERYSMITH")) return "bg-fuchsia-50 text-fuchsia-700"
  if (u.includes("TOP")) return "bg-lime-50 text-lime-700"
  if (u.includes("ZEVIA") || u.includes("AMAZFIT") || u.includes("MIBRO")) return "bg-indigo-50 text-indigo-700"
  return "bg-slate-100 text-slate-600"
}

// ── คำนวณอายุงาน → "2 ปี 4 เดือน" หรือ "8 เดือน" หรือ "3 วัน" ──
function calcTenure(hireDate: string | null | undefined): string {
  if (!hireDate) return ""
  const start = new Date(hireDate)
  if (isNaN(start.getTime())) return ""
  const now = new Date()
  let y = now.getFullYear() - start.getFullYear()
  let m = now.getMonth() - start.getMonth()
  let d = now.getDate() - start.getDate()
  if (d < 0) { m -= 1; d += 30 }
  if (m < 0) { y -= 1; m += 12 }
  if (y > 0) return `${y} ปี${m > 0 ? ` ${m} เดือน` : ""}`
  if (m > 0) return `${m} เดือน${d > 0 ? ` ${d} วัน` : ""}`
  if (d > 0) return `${d} วัน`
  return "วันแรก"
}

// ── ช่วงวันที่ของเดือน "YYYY-MM" → { start, end } ──
function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, "0")}` }
}
function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
// ── ช่วงรอบเงินเดือนของเดือน "YYYY-MM" → 22 เดือนก่อน ถึง 21 เดือนนี้ ──
function payrollRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { start: fmt(new Date(y, m - 2, 22)), end: fmt(new Date(y, m - 1, 21)) }
}

export default function EmployeesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"

  const [employees,        setEmployees]        = useState<any[]>([])
  const [companies,        setCompanies]        = useState<any[]>([])
  const [companyCounts,    setCompanyCounts]    = useState<Record<string, number>>({})
  const [depts,            setDepts]            = useState<any[]>([])
  const [branches,         setBranches]         = useState<any[]>([])
  const [positions,        setPositions]        = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [total,            setTotal]            = useState(0)
  const [page,             setPage]             = useState(0)
  const [search,           setSearch]           = useState("")
  const [debouncedSearch,  setDebouncedSearch]  = useState("")
  const [status,           setStatus]           = useState("")
  const [showInactive,     setShowInactive]     = useState(false)
  const [dept,             setDept]             = useState("")
  const [branch,           setBranch]           = useState("")
  const [position,         setPosition]         = useState("")
  const [empType,          setEmpType]          = useState("")
  const [selectedCompany,  setSelectedCompany]  = useState<string>("")
  const [showImport,       setShowImport]       = useState(false)
  const [showAdvanced,     setShowAdvanced]     = useState(false)
  // ── Smart filters ──
  const [brandFilter,      setBrandFilter]      = useState<string[]>([])  // multi-select
  const [showBrandPicker,  setShowBrandPicker]  = useState(false)
  const [tenureFilter,     setTenureFilter]     = useState<"" | "<1y" | "1-3y" | "3-5y" | "5+y">("")
  const [feishuFilter,     setFeishuFilter]     = useState<"" | "linked" | "unlinked">("")
  // ── แท็บ: ทั้งหมด / ทดลองงาน / ลาออกแล้ว ──
  const [tab,              setTab]              = useState<"all" | "probation" | "resigned">("all")
  // โหมดช่วงเวลา: ทั้งหมด / รอบเดือน (1–สิ้นเดือน) / รอบเงินเดือน (22–21)
  const [rangeMode,        setRangeMode]        = useState<"all" | "month" | "payroll">("all")
  const [monthFilter,      setMonthFilter]      = useState<string>(currentMonthStr())
  const { brands: brandsList } = useBrands()
  const PER = 25

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined

  const activeCompanyId = isSuperAdmin
    ? (selectedCompany || undefined)
    : myCompanyId

  // ── debounce search: รอ 400ms หลังพิมพ์เสร็จค่อย query ──────────
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // ── load companies + per-company counts (ใช้ single query) ───────
  useEffect(() => {
    if (!isSuperAdmin) return
    Promise.all([
      supabase.from("companies").select("id, name_th, code").eq("is_active", true).order("name_th"),
      supabase.from("employees").select("company_id", { count: "exact", head: false }).eq("is_active", true).is("deleted_at", null),
    ]).then(([compRes, empRes]) => {
      setCompanies(compRes.data ?? [])
      // นับจำนวนพนักงานจากผลลัพธ์ครั้งเดียว แทน N+1 queries
      const counts: Record<string, number> = {}
      ;(empRes.data ?? []).forEach((e: any) => {
        counts[e.company_id] = (counts[e.company_id] || 0) + 1
      })
      setCompanyCounts(counts)
    })
  }, [isSuperAdmin])

  // ── load departments / branches / positions (scoped by company) ───
  useEffect(() => {
    setDept(""); setBranch(""); setPosition("")
    const dQ = supabase.from("departments").select("id,name,company_id").order("name")
    const bQ = supabase.from("branches").select("id,name,company_id").order("name")
    const pQ = supabase.from("positions").select("id,name,company_id").order("name")
    const scoped = activeCompanyId
      ? [dQ.eq("company_id", activeCompanyId), bQ.eq("company_id", activeCompanyId), pQ.eq("company_id", activeCompanyId)]
      : [dQ, bQ, pQ]
    Promise.all(scoped).then(([dRes, bRes, pRes]) => {
      setDepts(dRes.data ?? [])
      setBranches(bRes.data ?? [])
      setPositions(pRes.data ?? [])
    })
  }, [activeCompanyId])

  // ── load employees ────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!isSuperAdmin && !myCompanyId) return
    setLoading(true)
    try {
      let q = supabase
        .from("employees")
        .select(
          `id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
           hire_date, resign_date, employment_status, employment_type, company_id, brand,
           feishu_user_id,
           position:positions(name),
           department:departments(name),
           branch:branches(name),
           company:companies(id, name_th, code),
           feishu:feishu_users!feishu_users_goodhr_employee_id_fkey(name_cn, name_en, nickname)`,
          { count: "exact" }
        )
        .order("first_name_th")
        .range(page * PER, (page + 1) * PER - 1)

      // ไม่แสดงพนักงานที่ถูกลบในรายการหลัก (ดูได้ที่ /admin/employees/deleted)
      q = q.is("deleted_at", null)

      // ถ้าเลือกดูลาออก/เลิกจ้าง หรือแท็บ "ลาออกแล้ว" → แสดง is_active=false ด้วย
      if (status === "resigned" || status === "terminated" || showInactive || tab === "resigned") {
        // ไม่ filter is_active เพื่อให้เห็นคนที่ลาออกแล้ว
      } else {
        q = q.eq("is_active", true)
      }

      if (activeCompanyId)       q = q.eq("company_id", activeCompanyId)
      else if (!isSuperAdmin)    q = q.eq("company_id", myCompanyId!)
      if (status)                q = q.eq("employment_status", status)
      if (dept)                  q = q.eq("department_id", dept)
      if (branch)                q = q.eq("branch_id", branch)
      if (position)              q = q.eq("position_id", position)
      if (empType)               q = q.eq("employment_type", empType)
      // ── Brand multi-select (OR — overlaps): match พนักงานที่ดูแลแบรนด์ใดอย่างน้อย 1 ──
      if (brandFilter.length > 0) {
        q = q.overlaps("brand", brandFilter)
      }
      // ── Feishu link filter ──
      if (feishuFilter === "linked")   q = q.not("feishu_user_id", "is", null)
      if (feishuFilter === "unlinked") q = q.is("feishu_user_id", null)
      // ── Tenure (อายุงาน) → แปลงเป็น hire_date range ──
      if (tenureFilter) {
        const now = new Date()
        const yearsAgo = (y: number) => {
          const d = new Date(now); d.setFullYear(d.getFullYear() - y); return d.toISOString().slice(0, 10)
        }
        if (tenureFilter === "<1y")  q = q.gte("hire_date", yearsAgo(1))
        if (tenureFilter === "1-3y") q = q.gte("hire_date", yearsAgo(3)).lt("hire_date", yearsAgo(1))
        if (tenureFilter === "3-5y") q = q.gte("hire_date", yearsAgo(5)).lt("hire_date", yearsAgo(3))
        if (tenureFilter === "5+y")  q = q.lt("hire_date", yearsAgo(5))
      }
      // ── แท็บ ทดลองงาน / ลาออกแล้ว + โหมดช่วง (ทั้งหมด/รอบเดือน/รอบเงินเดือน) ──
      const dr = (rangeMode === "month" && monthFilter) ? monthRange(monthFilter)
               : (rangeMode === "payroll" && monthFilter) ? payrollRange(monthFilter)
               : null
      if (tab === "probation") {
        q = q.eq("employment_status", "probation")
        if (dr) q = q.gte("hire_date", dr.start).lte("hire_date", dr.end)
      }
      if (tab === "resigned") {
        if (dr) q = q.gte("resign_date", dr.start).lte("resign_date", dr.end)
        else    q = q.not("resign_date", "is", null)
      }
      if (debouncedSearch) {
        const k = debouncedSearch.replace(/[%_,()]/g, "")
        q = q.or([
          `first_name_th.ilike.%${k}%`,
          `last_name_th.ilike.%${k}%`,
          `first_name_en.ilike.%${k}%`,
          `last_name_en.ilike.%${k}%`,
          `employee_code.ilike.%${k}%`,
          `nickname.ilike.%${k}%`,
          `nickname_en.ilike.%${k}%`,
        ].join(","))
      }

      const { data, count, error } = await q
      if (error) console.error(error)
      let list = data ?? []
      let listCount = count ?? 0

      // ── Fallback: ค้น Feishu users ที่มี mapping → resolve กลับเป็น GoodHR employee ──
      if (debouncedSearch && list.length < PER) {
        const k = debouncedSearch.replace(/[%_,()]/g, "")
        const { data: fData } = await supabase.from("feishu_users")
          .select(`feishu_user_id,
            employee:employees!feishu_users_goodhr_employee_id_fkey(
              id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
              hire_date, resign_date, employment_status, employment_type, company_id, brand,
              feishu_user_id, deleted_at, is_active,
              position:positions(name), department:departments(name),
              branch:branches(name), company:companies(id, name_th, code)
            ),
            name_cn, name_en, nickname`)
          .not("goodhr_employee_id", "is", null)
          .or([
            `name.ilike.%${k}%`,
            `name_cn.ilike.%${k}%`,
            `name_en.ilike.%${k}%`,
            `nickname.ilike.%${k}%`,
            `employee_number.ilike.%${k}%`,
          ].join(","))
          .limit(PER - list.length)

        const existingIds = new Set(list.map((e: any) => e.id))
        for (const f of (fData ?? [])) {
          const emp: any = (f as any).employee
          if (!emp || existingIds.has(emp.id)) continue
          if (emp.deleted_at) continue
          if (!showInactive && status !== "resigned" && status !== "terminated" && !emp.is_active) continue
          if (activeCompanyId && emp.company_id !== activeCompanyId) continue
          if (!isSuperAdmin && emp.company_id !== myCompanyId) continue
          list.push({
            ...emp,
            // wrap เป็น array ให้ format ตรงกับ JOIN ปกติ — UI จะ pick item แรก
            feishu: [{ name_cn: f.name_cn, name_en: f.name_en, nickname: f.nickname }],
            _matched_via_feishu: true,
          })
          existingIds.add(emp.id)
        }
      }

      setEmployees(list)
      setTotal(listCount + (list.length > (count ?? 0) ? list.length - (count ?? 0) : 0))
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, myCompanyId, activeCompanyId, debouncedSearch, status, dept, branch, position, empType, page, showInactive, brandFilter, tenureFilter, feishuFilter, tab, rangeMode, monthFilter])

  useEffect(() => { load() }, [load])
  const setF = (fn: () => void) => { fn(); setPage(0) }

  // ── export CSV ────────────────────────────────────────────────────
  const exportCSV = async () => {
    let q: any = supabase.from("employees")
      .select(`id, employee_code, first_name_th, last_name_th, nickname, gender, birth_date, phone, email,
               national_id, bank_account, bank_name,
               hire_date, resign_date, employment_status, employment_type, brand,
               position:positions(name), department:departments(name),
               branch:branches(name), company:companies(name_th, code)`)
      .is("deleted_at", null).order("first_name_th")
    const includeInactive = status === "resigned" || status === "terminated" || showInactive || tab === "resigned"
    if (!includeInactive)    q = q.eq("is_active", true)
    if (activeCompanyId)     q = q.eq("company_id", activeCompanyId)
    else if (!isSuperAdmin)  q = q.eq("company_id", myCompanyId!)
    if (status)   q = q.eq("employment_status", status)
    if (dept)     q = q.eq("department_id", dept)
    if (branch)   q = q.eq("branch_id", branch)
    if (position) q = q.eq("position_id", position)
    if (empType)  q = q.eq("employment_type", empType)
    if (brandFilter.length > 0)      q = q.overlaps("brand", brandFilter)
    if (feishuFilter === "linked")   q = q.not("feishu_user_id", "is", null)
    if (feishuFilter === "unlinked") q = q.is("feishu_user_id", null)
    if (tenureFilter) {
      const now = new Date()
      const yearsAgo = (y: number) => { const d = new Date(now); d.setFullYear(d.getFullYear() - y); return d.toISOString().slice(0, 10) }
      if (tenureFilter === "<1y")  q = q.gte("hire_date", yearsAgo(1))
      if (tenureFilter === "1-3y") q = q.gte("hire_date", yearsAgo(3)).lt("hire_date", yearsAgo(1))
      if (tenureFilter === "3-5y") q = q.gte("hire_date", yearsAgo(5)).lt("hire_date", yearsAgo(3))
      if (tenureFilter === "5+y")  q = q.lt("hire_date", yearsAgo(5))
    }
    const dr = (rangeMode === "month" && monthFilter) ? monthRange(monthFilter)
             : (rangeMode === "payroll" && monthFilter) ? payrollRange(monthFilter)
             : null
    if (tab === "probation") {
      q = q.eq("employment_status", "probation")
      if (dr) q = q.gte("hire_date", dr.start).lte("hire_date", dr.end)
    }
    if (tab === "resigned") {
      if (dr) q = q.gte("resign_date", dr.start).lte("resign_date", dr.end)
      else    q = q.not("resign_date", "is", null)
    }
    if (debouncedSearch) {
      const k = debouncedSearch.replace(/[%_,()]/g, "")
      q = q.or([`first_name_th.ilike.%${k}%`,`last_name_th.ilike.%${k}%`,`employee_code.ilike.%${k}%`,`nickname.ilike.%${k}%`].join(","))
    }
    const { data } = await q
    if (!data) return

    // ── ดึงเงินเดือน (salary ล่าสุดที่เปิดอยู่) + KPI มาตรฐาน ต่อพนักงาน ──
    const empIds = data.map((e: any) => e.id).filter(Boolean)
    const salMap: Record<string, number> = {}
    const kpiMap: Record<string, number> = {}
    const reasonMap: Record<string, string> = {}
    if (empIds.length > 0) {
      const { data: sals } = await supabase.from("salary_structures")
        .select("employee_id, base_salary")
        .in("employee_id", empIds).is("effective_to", null)
        .order("effective_from", { ascending: false }).order("created_at", { ascending: false })
      for (const s of (sals ?? [])) if (!(s.employee_id in salMap)) salMap[s.employee_id] = Number(s.base_salary) || 0
      const { data: kpis } = await supabase.from("kpi_bonus_settings")
        .select("employee_id, standard_amount")
        .in("employee_id", empIds).eq("is_active", true)
      for (const k of (kpis ?? [])) if (!(k.employee_id in kpiMap)) kpiMap[k.employee_id] = Number(k.standard_amount) || 0
      // เหตุผลลาออก: เริ่มจาก resignation_history (รายการ resign ล่าสุด)
      const { data: rh } = await supabase.from("resignation_history")
        .select("employee_id, reason, created_at")
        .in("employee_id", empIds).eq("action", "resign").not("reason", "is", null)
        .order("created_at", { ascending: false })
      for (const r of (rh ?? [])) if (!(r.employee_id in reasonMap)) reasonMap[r.employee_id] = r.reason
      // override ด้วย employees.resign_reason (ที่ HR แก้ในแท็บลาออก) — tolerant ถ้ายังไม่ migrate
      const { data: rr } = await supabase.from("employees").select("id, resign_reason").in("id", empIds)
      if (rr) for (const r of rr) if (r.resign_reason) reasonMap[r.id] = r.resign_reason
    }

    const hdr  = ["รหัส","บริษัท","ชื่อ","นามสกุล","ชื่อเล่น","เพศ","วันเกิด","โทร","อีเมล","วันเริ่มงาน","วันลาออก","เหตุผลลาออก","อายุงาน","สถานะ","ประเภท","ตำแหน่ง","แผนก","สาขา","แบรนด์","เลขที่บัตรประชาชน","เลขที่บัญชี","ธนาคาร","เงินเดือน","KPI"]
    const cell = (v: any) => { const s = (v == null ? "" : String(v)).replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s }
    const rows = data.map((e: any) => [
      e.employee_code, (e.company as any)?.name_th,
      e.first_name_th, e.last_name_th, e.nickname, e.gender,
      e.birth_date ? format(new Date(e.birth_date), "dd/MM/yyyy") : "",
      e.phone, e.email,
      e.hire_date ? format(new Date(e.hire_date), "dd/MM/yyyy") : "",
      e.resign_date ? format(new Date(e.resign_date), "dd/MM/yyyy") : "",
      reasonMap[e.id] || "",
      calcTenure(e.hire_date),
      STATUS[e.employment_status]?.l, EMP_TYPE[e.employment_type] || e.employment_type,
      (e.position as any)?.name, (e.department as any)?.name, (e.branch as any)?.name,
      Array.isArray(e.brand) ? e.brand.join(" / ") : "",
      // ⚠️ เลขบัตร/บัญชี เก็บเป็นข้อความ (กัน Excel ตัดเลข 0 หน้า/แปลงเป็น exponential)
      e.national_id ? `="${e.national_id}"` : "",
      e.bank_account ? `="${e.bank_account}"` : "",
      e.bank_name || "",
      salMap[e.id] != null ? salMap[e.id] : "",
      kpiMap[e.id] != null ? kpiMap[e.id] : "",
    ])
    const csv  = [hdr, ...rows].map(r => r.map(cell).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const rangeTag = rangeMode === "payroll" ? `รอบเงินเดือน_${monthFilter}` : rangeMode === "month" ? `รอบเดือน_${monthFilter}` : "ทั้งหมด"
    const tag  = tab === "probation" ? `ทดลองงาน_${rangeTag}` : tab === "resigned" ? `ลาออก_${rangeTag}` : "ทั้งหมด"
    const a    = document.createElement("a"); a.href = url; a.download = `employees_${tag}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const showCompanyCol = isSuperAdmin && !selectedCompany

  // company code lookup สำหรับ label dropdown ตอนเลือก "ทุกบริษัท"
  const companyCode = (cid?: string) => companies.find(c => c.id === cid)?.code
  const optLabel = (name: string, cid?: string) =>
    !activeCompanyId && companyCode(cid) ? `[${companyCode(cid)}] ${name}` : name

  const activeFilterCount =
    (status ? 1 : 0) + (dept ? 1 : 0) + (branch ? 1 : 0) +
    (position ? 1 : 0) + (empType ? 1 : 0) + (showInactive ? 1 : 0) +
    (brandFilter.length > 0 ? 1 : 0) + (tenureFilter ? 1 : 0) + (feishuFilter ? 1 : 0)

  const clearFilters = () => setF(() => {
    setStatus(""); setDept(""); setBranch(""); setPosition(""); setEmpType(""); setShowInactive(false)
    setBrandFilter([]); setTenureFilter(""); setFeishuFilter("")
  })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">พนักงาน</h2>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} คน</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <FeishuSyncButton dataset="employee"/>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export CSV
          </button>
          {isSuperAdmin && (
            <Link href="/admin/employees/deleted"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <Trash2 size={14} /> ประวัติลบ
            </Link>
          )}
          {isSuperAdmin && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
              <FileUp size={14} /> Import Excel
            </button>
          )}
          <Link href="/admin/employees/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={14} /> เพิ่มพนักงาน
          </Link>
          {isSuperAdmin && (
            <Link href="/admin/employees/bulk-add"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
              <Users size={14} /> เพิ่มหลายคน
            </Link>
          )}
        </div>
      </div>

      {/* ── Tabs: ทั้งหมด / ทดลองงาน / ลาออกแล้ว ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {([
            { k: "all",       label: "ทั้งหมด",     Icon: Users },
            { k: "probation", label: "ทดลองงาน",   Icon: Clock },
            { k: "resigned",  label: "ลาออกแล้ว",  Icon: X     },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setF(() => { setTab(t.k); setRangeMode(t.k === "resigned" ? "month" : "all") })}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === t.k ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
              <t.Icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        {tab !== "all" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* โหมดช่วงเวลา */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
              {([
                { k: "all",     label: "ทั้งหมด" },
                { k: "month",   label: "รอบเดือน" },
                { k: "payroll", label: "รอบเงินเดือน" },
              ] as const).map(m => (
                <button key={m.k} onClick={() => setF(() => setRangeMode(m.k))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${rangeMode === m.k ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
                  {m.label}
                </button>
              ))}
            </div>
            {rangeMode !== "all" && (
              <input type="month" value={monthFilter} onChange={e => setF(() => setMonthFilter(e.target.value))}
                className={inp + " py-1.5"} />
            )}
            {rangeMode === "payroll" && monthFilter && (
              <span className="text-[11px] text-slate-400">({payrollRange(monthFilter).start} → {payrollRange(monthFilter).end})</span>
            )}
            <span className="text-[11px] text-slate-400">· {total.toLocaleString()} คน</span>
          </div>
        )}
      </div>

      {/* Company Cards — super_admin only */}
      {isSuperAdmin && companies.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* All companies */}
          <button onClick={() => setF(() => setSelectedCompany(""))}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedCompany === "" ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
            <Building2 size={16} className={selectedCompany === "" ? "text-indigo-500" : "text-slate-300"} />
            <p className={`text-2xl font-black mt-2 ${selectedCompany === "" ? "text-indigo-700" : "text-slate-800"}`}>
              {Object.values(companyCounts).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">ทุกบริษัท</p>
          </button>

          {companies.map((c, i) => {
            const color = COMPANY_COLORS[i % COMPANY_COLORS.length]
            const isSelected = selectedCompany === c.id
            return (
              <button key={c.id} onClick={() => setF(() => setSelectedCompany(c.id))}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${color}`}>{c.code}</span>
                <p className={`text-2xl font-black mt-2 ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                  {companyCounts[c.id] ?? "—"}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                  {c.name_th.replace("บริษัท ", "").replace(" จำกัด", "")}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className={inp + " pl-8 w-full"} placeholder="ค้นหาชื่อ (ไทย/อังกฤษ/จีน), รหัส, ชื่อเล่น, Feishu nickname..." />
          </div>
          {isSuperAdmin && (
            <select value={selectedCompany} onChange={e => setF(() => setSelectedCompany(e.target.value))} className={inp}>
              <option value="">ทุกบริษัท</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <select value={status} onChange={e => setF(() => setStatus(e.target.value))} className={inp}>
            <option value="">ทุกสถานะ</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          {depts.length > 0 && (
            <select value={dept} onChange={e => setF(() => setDept(e.target.value))} className={inp}>
              <option value="">ทุกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{optLabel(d.name, d.company_id)}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => setShowAdvanced(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showAdvanced ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Filter size={12} />
            ตัวกรองเพิ่มเติม
            {(branch ? 1 : 0) + (position ? 1 : 0) + (empType ? 1 : 0) + (brandFilter.length > 0 ? 1 : 0) + (tenureFilter ? 1 : 0) + (feishuFilter ? 1 : 0) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                {(branch ? 1 : 0) + (position ? 1 : 0) + (empType ? 1 : 0) + (brandFilter.length > 0 ? 1 : 0) + (tenureFilter ? 1 : 0) + (feishuFilter ? 1 : 0)}
              </span>
            )}
          </button>
          <label className="flex items-center gap-2 cursor-pointer ml-1">
            <input type="checkbox" checked={showInactive} onChange={e => setF(() => setShowInactive(e.target.checked))} className="rounded border-slate-300"/>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">รวมพนักงานลาออก</span>
          </label>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 underline underline-offset-2">
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Row 1: branch, position, emp_type */}
            <div className="flex flex-wrap gap-3 items-center">
              {branches.length > 0 && (
                <select value={branch} onChange={e => setF(() => setBranch(e.target.value))} className={inp}>
                  <option value="">ทุกสาขา</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{optLabel(b.name, b.company_id)}</option>)}
                </select>
              )}
              {positions.length > 0 && (
                <select value={position} onChange={e => setF(() => setPosition(e.target.value))} className={inp}>
                  <option value="">ทุกตำแหน่ง</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{optLabel(p.name, p.company_id)}</option>)}
                </select>
              )}
              <select value={empType} onChange={e => setF(() => setEmpType(e.target.value))} className={inp}>
                <option value="">ทุกประเภทการจ้าง</option>
                {Object.entries(EMP_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {/* Tenure */}
              <select value={tenureFilter} onChange={e => setF(() => setTenureFilter(e.target.value as any))} className={inp}>
                <option value="">ทุกอายุงาน</option>
                <option value="<1y">น้อยกว่า 1 ปี</option>
                <option value="1-3y">1–3 ปี</option>
                <option value="3-5y">3–5 ปี</option>
                <option value="5+y">5 ปีขึ้นไป</option>
              </select>
              {/* Feishu link */}
              <select value={feishuFilter} onChange={e => setF(() => setFeishuFilter(e.target.value as any))} className={inp}>
                <option value="">ทุก Feishu</option>
                <option value="linked">🔗 มี Feishu</option>
                <option value="unlinked">⛔ ไม่มี Feishu</option>
              </select>
            </div>

            {/* Row 2: brand multi-select */}
            <div className="relative">
              <button type="button" onClick={() => setShowBrandPicker(s => !s)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  brandFilter.length > 0
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                <Tag size={12}/>
                {brandFilter.length === 0
                  ? "เลือกแบรนด์ที่ดูแล..."
                  : `แบรนด์ที่เลือก ${brandFilter.length}`}
                {brandFilter.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {brandFilter.slice(0, 4).map(b => {
                      const info = brandsList.find(x => x.name === b)
                      return (
                        <span key={b} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-white border border-indigo-200 rounded">
                          {info?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={info.logo_url} alt="" className="w-3 h-3 object-contain"/>
                          )}
                          {b}
                          <span onClick={(e) => { e.stopPropagation(); setF(() => setBrandFilter(prev => prev.filter(x => x !== b))) }}
                            className="hover:text-rose-600 cursor-pointer">×</span>
                        </span>
                      )
                    })}
                    {brandFilter.length > 4 && (
                      <span className="text-[10px] text-indigo-600 font-bold">+{brandFilter.length - 4}</span>
                    )}
                  </div>
                )}
                <ChevronRight size={12} className={`ml-auto transition-transform ${showBrandPicker ? "rotate-90" : ""}`}/>
              </button>

              {showBrandPicker && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-h-[320px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase">เลือกได้หลายแบรนด์ ({brandFilter.length} เลือก)</p>
                    <div className="flex gap-1.5">
                      {brandFilter.length > 0 && (
                        <button onClick={() => setF(() => setBrandFilter([]))}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700">ล้าง</button>
                      )}
                      <button onClick={() => setShowBrandPicker(false)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700">ปิด</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {brandsList.map(b => {
                      const active = brandFilter.includes(b.name)
                      return (
                        <button key={b.id} type="button"
                          onClick={() => setF(() => setBrandFilter(prev =>
                            prev.includes(b.name) ? prev.filter(x => x !== b.name) : [...prev, b.name]
                          ))}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                            active
                              ? "bg-indigo-500 text-white border-transparent shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}>
                          {/* swatch / logo */}
                          {b.logo_url
                            ? <div className="w-5 h-5 rounded bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={b.logo_url} alt="" className="w-full h-full object-contain"/>
                              </div>
                            : <span className={`w-4 h-4 rounded ${active ? "bg-white/30" : ""} flex items-center justify-center shrink-0`}
                                style={!active && b.color_hex ? { backgroundColor: b.color_hex } : undefined}>
                                {active && <Check size={9} strokeWidth={3} className="text-white"/>}
                              </span>}
                          <span className="truncate">{b.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">พนักงาน</th>
                {showCompanyCol && <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">บริษัท</th>}
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">สาขา</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">วันเริ่มงาน <span className="text-[10px] text-indigo-400 font-medium">(อายุงาน)</span></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={showCompanyCol ? 7 : 6} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    กำลังโหลด...
                  </div>
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={showCompanyCol ? 7 : 6} className="px-4 py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 text-slate-200" />
                  ไม่พบพนักงาน
                </td></tr>
              ) : employees.map(emp => {
                const compIdx = companies.findIndex(c => c.id === emp.company_id)
                const compColor = COMPANY_COLORS[compIdx >= 0 ? compIdx % COMPANY_COLORS.length : 0]
                // ── feishu join (Supabase reverse FK คืน array — เอา item แรก) ──
                const feishu: any = Array.isArray(emp.feishu) ? emp.feishu[0] : emp.feishu
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0 overflow-hidden">
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                            : emp.first_name_th?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 whitespace-nowrap flex items-center gap-1.5">
                            {emp.first_name_th} {emp.last_name_th}
                            {emp.nickname && <span className="text-xs text-slate-400">({emp.nickname})</span>}
                            {feishu?.name_cn && (
                              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100" title="ชื่อใน Feishu">
                                {feishu.name_cn}
                                {feishu.nickname && feishu.nickname !== emp.nickname && (
                                  <span className="text-indigo-500 ml-0.5">·{feishu.nickname}</span>
                                )}
                              </span>
                            )}
                            {emp._matched_via_feishu && (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">เจอผ่าน Feishu</span>
                            )}
                          </p>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap" style={{ minHeight: 18 }}>
                            <span>{emp.employee_code}</span>
                            {feishu?.name_en && (
                              <span className="text-slate-500 italic">· {feishu.name_en}</span>
                            )}
                            {(() => {
                              // ── ดึง brand จาก employees.brand (กรอกในหน้าเงินเดือน) ──
                              //    เป็น text[] — ถ้าไม่มี ใช้ feishu.brand เป็น fallback
                              let brands: string[] = []
                              if (Array.isArray(emp.brand)) brands = emp.brand.filter(Boolean)
                              else if (typeof emp.brand === "string" && emp.brand) brands = [emp.brand]
                              if (brands.length === 0 && feishu?.brand) {
                                brands = String(feishu.brand)
                                  .split(/[,/、&，；;]|\s+(?=[A-Z一-龥])/g)
                                  .map((s: string) => s.trim()).filter(Boolean)
                              }
                              return brands.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 flex-wrap">
                                  <span className="text-slate-300">·</span>
                                  {brands.map((b, i) => (
                                    <span key={i}
                                      className={"text-[9px] font-black px-1 py-0 rounded leading-[14px] " + brandMiniColor(b)}
                                      title={Array.isArray(emp.brand) && emp.brand.includes(b) ? "จากหน้าเงินเดือน" : "จาก Feishu"}>
                                      {b}
                                    </span>
                                  ))}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {showCompanyCol && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap ${compColor}`}>
                          {(emp.company as any)?.code}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-32 truncate">
                          {(emp.company as any)?.name_th?.replace("บริษัท ","").replace(" จำกัด","")}
                        </p>
                      </td>
                    )}

                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{(emp.position as any)?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{(emp.department as any)?.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{(emp.branch as any)?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {emp.hire_date ? (
                        <>
                          <p>{format(new Date(emp.hire_date), "d MMM yyyy", { locale: th })}</p>
                          <p className="text-[10px] text-indigo-500 font-bold mt-0.5">{calcTenure(emp.hire_date)}</p>
                        </>
                      ) : "—"}
                      {emp.resign_date && (
                        <p className="text-[10px] text-rose-500 font-bold mt-0.5">ออก {format(new Date(emp.resign_date), "d MMM yyyy", { locale: th })}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS[emp.employment_status]?.c || "bg-slate-100 text-slate-500"}`}>
                        {STATUS[emp.employment_status]?.l || emp.employment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/employees/${emp.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                        แก้ไข <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {total > PER && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{page * PER + 1}–{Math.min((page + 1) * PER, total)} จาก {total.toLocaleString()} คน</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={12} /> ก่อนหน้า
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER >= total}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                ถัดไป <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          companies={companies}
          defaultCompanyId={activeCompanyId}
          isSuperAdmin={isSuperAdmin}
          onImported={() => { load(); setShowImport(false) }}
        />
      )}
    </div>
  )
}