"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Users, ChevronDown, ChevronUp, Check, X, Clock,
  Calendar, FileEdit, Timer, Building2, Search, Filter,
  ArrowLeft, UserCheck, Loader2, Shield, RefreshCw,
  CalendarDays,
} from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import toast from "react-hot-toast"

/* ─── configs ─────────────────────────────────────────── */
const TYPE_CFG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  leave:      { label: "ลางาน",     icon: Calendar, color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-200" },
  adjustment: { label: "แก้ไขเวลา", icon: FileEdit, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  overtime:   { label: "โอที",      icon: Timer,    color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
}
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "รออนุมัติ",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  approved: { label: "อนุมัติแล้ว", color: "text-green-700",  bg: "bg-green-50 border-green-200",  dot: "bg-green-400" },
  rejected: { label: "ปฏิเสธ",      color: "text-red-700",    bg: "bg-red-50 border-red-200",      dot: "bg-red-400" },
}
const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  hr_admin:    { label: "HR Admin",    color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  manager:     { label: "ผู้จัดการ",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  employee:    { label: "พนักงาน",    color: "text-slate-600",   bg: "bg-slate-50 border-slate-200" },
}
const inp = "bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all shadow-sm"

/* ─── types ───────────────────────────────────────────── */
interface Supervisor {
  id: string
  first_name_th: string
  last_name_th: string
  nickname: string | null
  avatar_url: string | null
  position: { name: string } | null
  company: { id: string; name_th: string; code: string } | null
  role: string
  subordinates: Subordinate[]
  stats: { pending: number; approved: number; rejected: number; total: number }
}
interface Subordinate {
  id: string
  first_name_th: string
  last_name_th: string
  nickname: string | null
  employee_code: string
  position: { name: string } | null
  requests: RequestItem[]
}
interface RequestItem {
  id: string
  type: "leave" | "adjustment" | "overtime"
  status: string
  created_at: string
  detail: string
  reviewed_by_name: string | null
  reviewed_at: string | null
}

/* ─── main ────────────────────────────────────────────── */
export default function SupervisorOverviewPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSA = user?.role === "super_admin" || user?.role === "hr_admin"

  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openCards, setOpenCards] = useState<Set<string>>(new Set())
  const [selectedCompany, setSelectedCompany] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [processing, setProcessing] = useState<string | null>(null)

  const myCompanyId = user?.employee?.company_id ?? (user as any)?.company_id
  const activeCompanyId = isSA ? (selectedCompany || undefined) : myCompanyId

  // load companies
  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => setCompanies(data ?? []))
  }, [isSA])

  // ─── LOAD DATA ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. ลูกน้องทั้งหมดที่มี supervisor
      let empQ = supabase.from("employees")
        .select(`id, first_name_th, last_name_th, nickname, employee_code,
                 supervisor_id, company_id, position:positions(name)`)
        .eq("is_active", true).not("supervisor_id", "is", null)

      if (activeCompanyId) empQ = empQ.eq("company_id", activeCompanyId)
      else if (!isSA) empQ = empQ.eq("company_id", myCompanyId!)

      const { data: subordinateEmps } = await empQ
      if (!subordinateEmps || subordinateEmps.length === 0) {
        setSupervisors([]); setLoading(false); return
      }

      // 2. หัวหน้า
      const supIds = Array.from(new Set(subordinateEmps.map((e: any) => e.supervisor_id)))
      const { data: supervisorEmps } = await supabase.from("employees")
        .select(`id, first_name_th, last_name_th, nickname, avatar_url,
                 position:positions(name), company:companies(id, name_th, code)`)
        .in("id", supIds)
      const supMap = new Map((supervisorEmps ?? []).map((s: any) => [s.id, s]))

      // 2.5 หา role ของหัวหน้า
      const { data: supUsers } = await supabase.from("users")
        .select("employee_id, role").in("employee_id", supIds)
      const roleMap = new Map((supUsers ?? []).map((u: any) => [u.employee_id, u.role]))

      // 3. requests (กรองตามช่วงวันที่)
      const subIds = subordinateEmps.map((e: any) => e.id)

      const [{ data: leaves }, { data: adjustments }, { data: overtimes }] = await Promise.all([
        supabase.from("leave_requests")
          .select(`id, employee_id, status, created_at, reviewed_by, reviewed_at,
                   leave_type:leave_types(name), start_date, end_date, total_days`)
          .in("employee_id", subIds)
          .in("status", ["pending", "approved", "rejected"])
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }).limit(500),
        supabase.from("time_adjustment_requests")
          .select(`id, employee_id, status, created_at, reviewed_by, reviewed_at,
                   work_date, requested_clock_in, requested_clock_out`)
          .in("employee_id", subIds)
          .in("status", ["pending", "approved", "rejected"])
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }).limit(500),
        supabase.from("overtime_requests")
          .select(`id, employee_id, status, created_at, reviewed_by, reviewed_at,
                   work_date, ot_start, ot_end`)
          .in("employee_id", subIds)
          .in("status", ["pending", "approved", "rejected"])
          .gte("created_at", dateFrom + "T00:00:00")
          .lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }).limit(500),
      ])

      // 4. ชื่อผู้อนุมัติ
      const reviewerIds = [
        ...(leaves ?? []).map((r: any) => r.reviewed_by),
        ...(adjustments ?? []).map((r: any) => r.reviewed_by),
        ...(overtimes ?? []).map((r: any) => r.reviewed_by),
      ].filter(Boolean)
      const uniqueReviewerIds = Array.from(new Set(reviewerIds))
      const reviewerMap = new Map<string, string>()
      if (uniqueReviewerIds.length > 0) {
        const { data: reviewers } = await supabase.from("employees")
          .select("id, first_name_th, last_name_th, nickname").in("id", uniqueReviewerIds)
        ;(reviewers ?? []).forEach((r: any) => {
          reviewerMap.set(r.id, `${r.first_name_th} ${r.last_name_th}${r.nickname ? ` (${r.nickname})` : ""}`)
        })
      }

      // 5. จัด requests ตาม employee
      const reqsByEmp = new Map<string, RequestItem[]>()
      const addReqs = (items: any[], type: "leave" | "adjustment" | "overtime", detailFn: (r: any) => string) => {
        ;(items ?? []).forEach((r: any) => {
          const list = reqsByEmp.get(r.employee_id) ?? []
          list.push({
            id: r.id, type, status: r.status, created_at: r.created_at,
            detail: detailFn(r),
            reviewed_by_name: r.reviewed_by ? (reviewerMap.get(r.reviewed_by) ?? "—") : null,
            reviewed_at: r.reviewed_at,
          })
          reqsByEmp.set(r.employee_id, list)
        })
      }
      addReqs(leaves ?? [], "leave", (r) => {
        const lt = (r.leave_type as any)?.name ?? "ลา"
        return `${lt} ${r.start_date ? format(new Date(r.start_date), "d MMM", { locale: th }) : ""}${r.end_date && r.end_date !== r.start_date ? ` – ${format(new Date(r.end_date), "d MMM", { locale: th })}` : ""} (${r.total_days ?? "?"} วัน)`
      })
      addReqs(adjustments ?? [], "adjustment", (r) => {
        const fmtAdj = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }) : "?"
        return `แก้ไขเวลา ${r.work_date ? format(new Date(r.work_date), "d MMM yy", { locale: th }) : ""} → เข้า ${fmtAdj(r.requested_clock_in)} ออก ${fmtAdj(r.requested_clock_out)}`
      })
      addReqs(overtimes ?? [], "overtime", (r) =>
        `OT ${r.work_date ? format(new Date(r.work_date), "d MMM yy", { locale: th }) : ""} ${r.ot_start?.slice(0, 5) ?? "?"} – ${r.ot_end?.slice(0, 5) ?? "?"}`
      )

      // 6. จัดกลุ่ม
      const supGroupMap = new Map<string, Subordinate[]>()
      subordinateEmps.forEach((e: any) => {
        const subs = supGroupMap.get(e.supervisor_id) ?? []
        subs.push({
          id: e.id, first_name_th: e.first_name_th, last_name_th: e.last_name_th,
          nickname: e.nickname, employee_code: e.employee_code,
          position: e.position, requests: reqsByEmp.get(e.id) ?? [],
        })
        supGroupMap.set(e.supervisor_id, subs)
      })

      const result: Supervisor[] = []
      supGroupMap.forEach((subs, supId) => {
        const sup = supMap.get(supId)
        if (!sup) return
        const allReqs = subs.flatMap((s) => s.requests)
        result.push({
          ...sup,
          role: roleMap.get(supId) ?? "employee",
          subordinates: subs.sort((a, b) => a.first_name_th.localeCompare(b.first_name_th)),
          stats: {
            pending: allReqs.filter((r) => r.status === "pending").length,
            approved: allReqs.filter((r) => r.status === "approved").length,
            rejected: allReqs.filter((r) => r.status === "rejected").length,
            total: allReqs.length,
          },
        })
      })
      result.sort((a, b) => b.stats.pending - a.stats.pending || a.first_name_th.localeCompare(b.first_name_th))
      setSupervisors(result)
    } finally { setLoading(false) }
  }, [activeCompanyId, isSA, myCompanyId, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  /* ─── approve / reject ─── */
  const handleAction = async (req: RequestItem, action: "approved" | "rejected") => {
    const empId = user?.employee_id ?? (user?.employee as any)?.id
    if (!empId) return
    setProcessing(req.id)
    try {
      const table = req.type === "leave" ? "leave_requests"
        : req.type === "adjustment" ? "time_adjustment_requests" : "overtime_requests"
      const { error } = await supabase.from(table).update({
        status: action, reviewed_by: empId, reviewed_at: new Date().toISOString(),
      }).eq("id", req.id)
      if (error) throw error
      toast.success(action === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(null) }
  }

  /* ─── filter ─── */
  const filtered = supervisors
    .filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const nameMatch = `${s.first_name_th} ${s.last_name_th} ${s.nickname ?? ""}`.toLowerCase().includes(q)
        const subMatch = s.subordinates.some((sub) =>
          `${sub.first_name_th} ${sub.last_name_th} ${sub.nickname ?? ""} ${sub.employee_code}`.toLowerCase().includes(q)
        )
        if (!nameMatch && !subMatch) return false
      }
      return true
    })
    .map((s) => ({
      ...s,
      subordinates: s.subordinates.map((sub) => ({
        ...sub,
        requests: statusFilter === "all" ? sub.requests : sub.requests.filter((r) => r.status === statusFilter),
      })),
    }))

  const totalPending = supervisors.reduce((a, s) => a + s.stats.pending, 0)
  const totalApproved = supervisors.reduce((a, s) => a + s.stats.approved, 0)
  const totalRejected = supervisors.reduce((a, s) => a + s.stats.rejected, 0)

  const toggleCard = (id: string) => {
    const next = new Set(openCards)
    next.has(id) ? next.delete(id) : next.add(id)
    setOpenCards(next)
  }

  /* ─── date presets ─── */
  const setPreset = (key: string) => {
    const now = new Date()
    if (key === "today") { const d = format(now, "yyyy-MM-dd"); setDateFrom(d); setDateTo(d) }
    else if (key === "week") { setDateFrom(format(subDays(now, 6), "yyyy-MM-dd")); setDateTo(format(now, "yyyy-MM-dd")) }
    else if (key === "month") { setDateFrom(format(startOfMonth(now), "yyyy-MM-dd")); setDateTo(format(endOfMonth(now), "yyyy-MM-dd")) }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/approvals"
            className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={14} /> คำร้อง
          </Link>
          <div>
            <h2 className="text-2xl font-black text-slate-800">ภาพรวมหัวหน้า — ลูกน้อง</h2>
            <p className="text-slate-400 text-sm mt-0.5">ดูคำขอแยกรายหัวหน้า พร้อมสิทธิ์และสถานะ</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
          <RefreshCw size={13} /> รีเฟรช
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Users size={15} className="text-indigo-500" /><span className="text-xs font-bold text-slate-400">หัวหน้าทั้งหมด</span></div>
          <p className="text-3xl font-black text-slate-800">{supervisors.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Clock size={15} className="text-amber-500" /><span className="text-xs font-bold text-amber-500">รออนุมัติ</span></div>
          <p className="text-3xl font-black text-amber-600">{totalPending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Check size={15} className="text-green-500" /><span className="text-xs font-bold text-green-500">อนุมัติแล้ว</span></div>
          <p className="text-3xl font-black text-green-600">{totalApproved}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><X size={15} className="text-red-400" /><span className="text-xs font-bold text-red-400">ปฏิเสธ</span></div>
          <p className="text-3xl font-black text-red-500">{totalRejected}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className={inp + " pl-8 w-full"} placeholder="ค้นหาชื่อหัวหน้าหรือลูกน้อง..." />
          </div>
          {isSA && (
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className={inp}>
              <option value="">ทุกบริษัท</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={inp}>
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รออนุมัติ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>
        {/* Date range */}
        <div className="flex flex-wrap gap-2 items-center">
          <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inp + " text-xs"} />
          <span className="text-xs text-slate-400">ถึง</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inp + " text-xs"} />
          <div className="flex gap-1 ml-1">
            {[
              { key: "today", label: "วันนี้" },
              { key: "week", label: "7 วัน" },
              { key: "month", label: "เดือนนี้" },
            ].map((p) => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content: Supervisor Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> กำลังโหลด...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users size={40} className="mb-3 text-slate-200" />
          <p className="font-semibold">ไม่พบข้อมูลหัวหน้า-ลูกน้อง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((sup) => {
            const isOpen = openCards.has(sup.id)
            const rl = ROLE_LABEL[sup.role] ?? ROLE_LABEL.employee
            const allSubReqs = sup.subordinates.flatMap((s) => s.requests)
            const filteredPending = allSubReqs.filter((r) => r.status === "pending").length
            const filteredApproved = allSubReqs.filter((r) => r.status === "approved").length
            const filteredRejected = allSubReqs.filter((r) => r.status === "rejected").length

            return (
              <div key={sup.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                sup.stats.pending > 0 ? "border-amber-200" : "border-slate-100"
              }`}>

                {/* ── Card Header ── */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg flex-shrink-0 overflow-hidden shadow-sm">
                      {sup.avatar_url
                        ? <img src={sup.avatar_url} alt="" className="w-full h-full object-cover" />
                        : sup.first_name_th?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-base">
                          {sup.first_name_th} {sup.last_name_th}
                        </p>
                        {sup.nickname && <span className="text-xs text-slate-400">({sup.nickname})</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(sup.position as any)?.name ?? "—"} · {(sup.company as any)?.code ?? ""}
                      </p>
                      {/* Role + Subordinate count */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rl.bg} ${rl.color}`}>
                          <Shield size={10} /> {rl.label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-500">
                          <Users size={10} /> {sup.subordinates.length} ลูกน้อง
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="flex gap-3 mt-4">
                    {filteredPending > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-bold text-amber-700">{filteredPending} รอ</span>
                      </div>
                    )}
                    {filteredApproved > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-xs font-bold text-green-700">{filteredApproved} อนุมัติ</span>
                      </div>
                    )}
                    {filteredRejected > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-xs font-bold text-red-700">{filteredRejected} ปฏิเสธ</span>
                      </div>
                    )}
                    {filteredPending === 0 && filteredApproved === 0 && filteredRejected === 0 && (
                      <span className="text-xs text-slate-300 italic">ไม่มีคำขอในช่วงนี้</span>
                    )}
                  </div>
                </div>

                {/* ── Toggle Button ── */}
                <button onClick={() => toggleCard(sup.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  {isOpen ? <><ChevronUp size={13} /> ซ่อนรายละเอียด</> : <><ChevronDown size={13} /> ดูลูกน้อง {sup.subordinates.length} คน</>}
                </button>

                {/* ── Expanded: Subordinates ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {sup.subordinates.map((sub) => {
                      const reqs = sub.requests
                      return (
                        <div key={sub.id} className="px-5 py-3">
                          {/* Sub header */}
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 flex-shrink-0">
                              {sub.first_name_th?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700">
                                {sub.first_name_th} {sub.last_name_th}
                                {sub.nickname && <span className="text-xs text-slate-400 ml-1">({sub.nickname})</span>}
                              </p>
                              <p className="text-[10px] text-slate-400">{sub.employee_code} · {(sub.position as any)?.name ?? "—"}</p>
                            </div>
                            {reqs.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {reqs.length} รายการ
                              </span>
                            )}
                          </div>

                          {/* Requests list */}
                          {reqs.length === 0 ? (
                            <p className="text-[11px] text-slate-300 pl-9 italic">ไม่มีคำขอในช่วงนี้</p>
                          ) : (
                            <div className="pl-9 space-y-1.5">
                              {reqs.map((req) => {
                                const cfg = TYPE_CFG[req.type] ?? TYPE_CFG.leave
                                const stCfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending
                                const Icon = cfg.icon
                                return (
                                  <div key={req.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                                    <Icon size={13} className={cfg.color + " flex-shrink-0"} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-700 leading-snug">{req.detail}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        {format(new Date(req.created_at), "d MMM yy HH:mm", { locale: th })}
                                        {req.reviewed_by_name && (
                                          <span className="ml-1.5">
                                            · <UserCheck size={9} className="inline -mt-0.5" /> {req.reviewed_by_name}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stCfg.bg} ${stCfg.color} flex-shrink-0`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                                      {stCfg.label}
                                    </span>
                                    {req.status === "pending" && (
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button disabled={processing === req.id}
                                          onClick={() => handleAction(req, "approved")}
                                          className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-40"
                                          title="อนุมัติ">
                                          {processing === req.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        </button>
                                        <button disabled={processing === req.id}
                                          onClick={() => handleAction(req, "rejected")}
                                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-40"
                                          title="ปฏิเสธ">
                                          <X size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
