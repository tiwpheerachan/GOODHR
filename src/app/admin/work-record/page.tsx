"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Search, Sparkles, Filter, ChevronRight, Users, Building2,
  Clock, CheckCircle2, AlertTriangle, Calendar, ArrowUpDown, X, RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { format, addMonths, subMonths } from "date-fns"
import { th } from "date-fns/locale"

// ── Module-scoped cache: survives client-side back-nav (does NOT survive hard reload) ──
type CacheData = {
  scopeKey: string
  fetchedAt: number
  employees: any[]
  statsMap: Record<string, any>
  todayShiftMap: Record<string, any>
}
type CacheFilters = {
  selectedCompany: string
  selectedDept: string
  selectedBranch: string
  selectedPosition: string
  selectedEmpType: string
  todayStatus: string
  issue: string
  sortBy: string
  search: string
  showAdvanced: boolean
}
let cachedData: CacheData | null = null
let cachedFilters: CacheFilters | null = null
let cachedScrollY = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 นาที

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 transition-all"

type Emp = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  nickname?: string | null
  avatar_url?: string | null
  company_id: string
  department_id?: string | null
  branch_id?: string | null
  position_id?: string | null
  employment_type?: string | null
  position?: { name: string } | null
  department?: { name: string } | null
  branch?: { name: string } | null
  company?: { code: string; name_th: string } | null
}
type Stats = { present: number; late: number; absent: number; leave: number; ot: number }

type SortKey = "name" | "code" | "late_desc" | "absent_desc" | "ot_desc" | "present_desc"
type TodayStatus = "" | "checked_in" | "late" | "absent" | "leave" | "not_checked" | "dayoff"
type Issue = "" | "has_late" | "has_absent" | "no_shift_today"

const EMP_TYPE: Record<string, string> = {
  full_time: "ประจำ", part_time: "พาร์ทไทม์", contract: "สัญญา", intern: "ฝึกงาน",
}

export default function WorkRecordListPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"
  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined

  // ── Restore cached data + filters on mount (so back-nav doesn't reset everything) ──
  const [employees, setEmployees] = useState<Emp[]>(() => (cachedData?.employees as Emp[]) ?? [])
  const [companies, setCompanies] = useState<{ id: string; code: string; name_th: string }[]>([])
  const [depts, setDepts] = useState<{ id: string; name: string; company_id: string }[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string; company_id: string }[]>([])
  const [positions, setPositions] = useState<{ id: string; name: string; company_id: string }[]>([])
  const [selectedCompany, setSelectedCompany] = useState(cachedFilters?.selectedCompany ?? "")
  const [selectedDept, setSelectedDept] = useState(cachedFilters?.selectedDept ?? "")
  const [selectedBranch, setSelectedBranch] = useState(cachedFilters?.selectedBranch ?? "")
  const [selectedPosition, setSelectedPosition] = useState(cachedFilters?.selectedPosition ?? "")
  const [selectedEmpType, setSelectedEmpType] = useState(cachedFilters?.selectedEmpType ?? "")
  const [todayStatus, setTodayStatus] = useState<TodayStatus>((cachedFilters?.todayStatus as TodayStatus) ?? "")
  const [issue, setIssue] = useState<Issue>((cachedFilters?.issue as Issue) ?? "")
  const [sortBy, setSortBy] = useState<SortKey>((cachedFilters?.sortBy as SortKey) ?? "name")
  const [showAdvanced, setShowAdvanced] = useState(cachedFilters?.showAdvanced ?? false)
  const [search, setSearch] = useState(cachedFilters?.search ?? "")
  const [debounced, setDebounced] = useState(cachedFilters?.search ?? "")
  const [statsMap, setStatsMap] = useState<Record<string, Stats>>(cachedData?.statsMap ?? {})
  const [todayShiftMap, setTodayShiftMap] = useState<Record<string, { shift?: string; in?: string; out?: string; status?: string; assignment_type?: string }>>(cachedData?.todayShiftMap ?? {})
  const [loading, setLoading] = useState(() => !cachedData)
  const [refreshing, setRefreshing] = useState(false)

  const activeCompanyId = isSuperAdmin ? (selectedCompany || undefined) : myCompanyId

  // debounce search
  const t = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    t.current = setTimeout(() => setDebounced(search), 400)
    return () => clearTimeout(t.current)
  }, [search])

  // load companies (super admin)
  useEffect(() => {
    if (!isSuperAdmin) return
    supabase.from("companies").select("id, name_th, code").eq("is_active", true).order("name_th")
      .then(({ data }) => setCompanies(data ?? []))
  }, [isSuperAdmin])

  // load depts / branches / positions (scoped by company selection)
  // Skip the first reset if we just hydrated dept/branch/position from cache
  const skipResetOnce = useRef(!!cachedFilters)
  useEffect(() => {
    if (skipResetOnce.current) {
      skipResetOnce.current = false
    } else {
      setSelectedDept(""); setSelectedBranch(""); setSelectedPosition("")
    }
    const dQ = supabase.from("departments").select("id, name, company_id").order("name")
    const bQ = supabase.from("branches").select("id, name, company_id").order("name")
    const pQ = supabase.from("positions").select("id, name, company_id").order("name")
    const scoped = activeCompanyId
      ? [dQ.eq("company_id", activeCompanyId), bQ.eq("company_id", activeCompanyId), pQ.eq("company_id", activeCompanyId)]
      : [dQ, bQ, pQ]
    Promise.all(scoped).then(([dRes, bRes, pRes]) => {
      setDepts(dRes.data ?? [])
      setBranches(bRes.data ?? [])
      setPositions(pRes.data ?? [])
    })
  }, [activeCompanyId])

  // load employees + monthly stats + today's shift/attendance
  // ── Cache strategy: if cache scope == current scope and fresh, skip fetch ──
  const run = async (forceRefresh = false) => {
    if (!isSuperAdmin && !myCompanyId) return
    const scopeKey = `${isSuperAdmin ? "super" : myCompanyId}|${activeCompanyId ?? ""}`
    if (!forceRefresh && cachedData && cachedData.scopeKey === scopeKey &&
        (Date.now() - cachedData.fetchedAt) < CACHE_TTL_MS) {
      // hydrate from cache (already happened on initial state); just make sure loading=false
      setLoading(false)
      return
    }
    if (forceRefresh) setRefreshing(true)
    else if (!cachedData) setLoading(true)
    try {
        let q = supabase.from("employees")
          .select(`id, employee_code, first_name_th, last_name_th, nickname, avatar_url, company_id,
                   department_id, branch_id, position_id, employment_type,
                   position:positions(name), department:departments(name), branch:branches(name), company:companies(code, name_th)`)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("first_name_th")
          .limit(500)
        if (activeCompanyId) q = q.eq("company_id", activeCompanyId)
        else if (!isSuperAdmin) q = q.eq("company_id", myCompanyId!)
        const { data: emps } = await q
        setEmployees((emps ?? []) as any)

        const empIds = (emps ?? []).map((e: any) => e.id)
        if (!empIds.length) { setStatsMap({}); setTodayShiftMap({}); return }

        // ── current payroll period (22 prev → 21 current) ─────────
        const now = new Date()
        const y = now.getFullYear(); const m = now.getMonth() + 1; const d = now.getDate()
        // ถ้าวันที่ <= 21 → รอบนี้คือ 22 ของ (เดือนก่อน) → 21 ของเดือนนี้
        // ถ้าวันที่ >= 22 → รอบใหม่ → 22 ของเดือนนี้ → 21 ของเดือนถัดไป
        const periodMonth = d <= 21 ? m : (m === 12 ? 1 : m + 1)
        const periodYear  = d <= 21 ? y : (m === 12 ? y + 1 : y)
        const prevM = periodMonth === 1 ? 12 : periodMonth - 1
        const prevY = periodMonth === 1 ? periodYear - 1 : periodYear
        const monthStart = `${prevY}-${String(prevM).padStart(2, "0")}-22`
        const monthEnd   = `${periodYear}-${String(periodMonth).padStart(2, "0")}-21`
        const today = format(now, "yyyy-MM-dd")

        // ── batch query เพื่อเลี่ยง Supabase 1000-row limit ──────
        // 300 คน × 30 วัน = 9000 rows → ต้อง batch
        const BATCH = 30 // 30 emps × 31 วัน ≈ 930 < 1000
        const allAtts: any[] = []
        for (let i = 0; i < empIds.length; i += BATCH) {
          const batch = empIds.slice(i, i + BATCH)
          const { data } = await supabase.from("attendance_records")
            .select("employee_id, work_date, status, ot_minutes")
            .in("employee_id", batch)
            .gte("work_date", monthStart)
            .lte("work_date", monthEnd)
            .limit(1500)
          allAtts.push(...(data ?? []))
        }

        const stats: Record<string, Stats> = {}
        for (const r of allAtts) {
          const s = stats[r.employee_id] || (stats[r.employee_id] = { present: 0, late: 0, absent: 0, leave: 0, ot: 0 })
          if (r.status === "present") s.present++
          else if (r.status === "late") { s.late++; s.present++ }
          else if (r.status === "absent") s.absent++
          else if (r.status === "leave") s.leave++
          if (r.ot_minutes) s.ot += r.ot_minutes
        }
        setStatsMap(stats)

        // ── today's clock-in/out (single small query) ─────────────
        const today_: Record<string, any> = {}
        const { data: todayAtts } = await supabase.from("attendance_records")
          .select("employee_id, clock_in, clock_out, status")
          .in("employee_id", empIds)
          .eq("work_date", today)
          .limit(empIds.length + 10)
        for (const r of (todayAtts ?? [])) {
          today_[r.employee_id] = { in: r.clock_in, out: r.clock_out, status: r.status }
        }

        // ── today shift assignments ────────────────────────────────
        const { data: assigns } = await supabase.from("monthly_shift_assignments")
          .select("employee_id, shift_id, assignment_type, shift:shift_templates(name, work_start, work_end)")
          .in("employee_id", empIds)
          .eq("work_date", today)
          .limit(empIds.length + 10)
        for (const a of (assigns ?? [])) {
          const t = today_[a.employee_id] || (today_[a.employee_id] = {})
          t.assignment_type = a.assignment_type
          if (a.assignment_type === "dayoff") t.shift = "วันหยุด"
          else if (a.assignment_type === "leave") t.shift = "ลา"
          else if (a.assignment_type === "holiday") t.shift = "วันหยุดนักขัตฤกษ์"
          else if ((a.shift as any)?.name) t.shift = (a.shift as any).name
        }
        setTodayShiftMap(today_)
        // ── Save to module cache ──
        cachedData = {
          scopeKey,
          fetchedAt: Date.now(),
          employees: (emps ?? []) as any[],
          statsMap: stats,
          todayShiftMap: today_,
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
  }
  useEffect(() => { run() }, [isSuperAdmin, myCompanyId, activeCompanyId])

  // ── Persist filter values + restore scroll on mount ──
  useEffect(() => {
    cachedFilters = {
      selectedCompany, selectedDept, selectedBranch, selectedPosition,
      selectedEmpType, todayStatus, issue, sortBy, search, showAdvanced,
    }
  }, [selectedCompany, selectedDept, selectedBranch, selectedPosition,
      selectedEmpType, todayStatus, issue, sortBy, search, showAdvanced])

  useEffect(() => {
    if (cachedScrollY > 0) {
      // Wait one tick so cards render before scrolling
      const t = setTimeout(() => window.scrollTo(0, cachedScrollY), 0)
      return () => clearTimeout(t)
    }
  }, [])

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase()
    let out = employees.filter(e => {
      if (selectedDept && e.department_id !== selectedDept) return false
      if (selectedBranch && e.branch_id !== selectedBranch) return false
      if (selectedPosition && e.position_id !== selectedPosition) return false
      if (selectedEmpType && e.employment_type !== selectedEmpType) return false

      // today status filter
      if (todayStatus) {
        const t = todayShiftMap[e.id]
        if (todayStatus === "checked_in" && !t?.in) return false
        if (todayStatus === "late" && t?.status !== "late") return false
        if (todayStatus === "absent" && t?.status !== "absent") return false
        if (todayStatus === "leave" && t?.status !== "leave") return false
        if (todayStatus === "not_checked" && (t?.in || t?.assignment_type === "dayoff" || t?.assignment_type === "holiday")) return false
        if (todayStatus === "dayoff" && t?.assignment_type !== "dayoff" && t?.assignment_type !== "holiday") return false
      }

      // problem filter (in period)
      if (issue) {
        const st = statsMap[e.id]
        if (issue === "has_late" && (!st || st.late === 0)) return false
        if (issue === "has_absent" && (!st || st.absent === 0)) return false
        if (issue === "no_shift_today" && todayShiftMap[e.id]?.shift) return false
      }

      // search
      if (s) {
        const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })

    // sort
    out = [...out].sort((a, b) => {
      const sa = statsMap[a.id] || { present: 0, late: 0, absent: 0, leave: 0, ot: 0 }
      const sb = statsMap[b.id] || { present: 0, late: 0, absent: 0, leave: 0, ot: 0 }
      switch (sortBy) {
        case "code":         return (a.employee_code || "").localeCompare(b.employee_code || "")
        case "late_desc":    return sb.late - sa.late
        case "absent_desc":  return sb.absent - sa.absent
        case "ot_desc":      return sb.ot - sa.ot
        case "present_desc": return sb.present - sa.present
        case "name":
        default:             return (a.first_name_th || "").localeCompare(b.first_name_th || "", "th")
      }
    })
    return out
  }, [employees, debounced, selectedDept, selectedBranch, selectedPosition, selectedEmpType, todayStatus, issue, sortBy, statsMap, todayShiftMap])

  const advancedActive = (selectedBranch ? 1 : 0) + (selectedPosition ? 1 : 0) + (selectedEmpType ? 1 : 0) + (issue ? 1 : 0)
  const totalActive = advancedActive + (selectedCompany ? 1 : 0) + (selectedDept ? 1 : 0) + (todayStatus ? 1 : 0) + (sortBy !== "name" ? 1 : 0)
  const clearAll = () => {
    setSelectedDept(""); setSelectedBranch(""); setSelectedPosition(""); setSelectedEmpType("")
    setTodayStatus(""); setIssue(""); setSortBy("name"); setSearch("")
  }

  return (
    <div className="space-y-5">
      {/* Hero header — deeper teal/cyan */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-500 p-6 shadow-md">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-teal-800/20 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-white/90">
              <Sparkles size={16} />
              <span className="text-xs font-black tracking-wider">PRO MAX</span>
            </div>
            <h1 className="text-3xl font-black text-white mt-1 drop-shadow-sm">บันทึกการเข้างาน Pro Max</h1>
            <p className="text-sm text-white/90 mt-1 max-w-xl">
              ดู/แก้ไขเวลาเข้า-ออก, กะการทำงาน, OT, การลาของพนักงานแต่ละคนแบบครบจบในหน้าเดียว
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold text-teal-700">รอบเงินเดือนปัจจุบัน</p>
            <p className="text-lg font-black text-teal-900">22 {format(subMonths(new Date(), new Date().getDate() <= 21 ? 1 : 0), "MMM", { locale: th })} – 21 {format(addMonths(new Date(), new Date().getDate() <= 21 ? 0 : 1), "MMM yyyy", { locale: th })}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        {/* Primary row */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-slate-400" />
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className={inp + " pl-8 w-full"} placeholder="ค้นหาชื่อ, รหัส, ชื่อเล่น..." />
          </div>
          {isSuperAdmin && (
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className={inp}>
              <option value="">ทุกบริษัท</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          {depts.length > 0 && (
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className={inp}>
              <option value="">ทุกแผนก</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <select value={todayStatus} onChange={e => setTodayStatus(e.target.value as TodayStatus)} className={inp}>
            <option value="">สถานะวันนี้ทั้งหมด</option>
            <option value="checked_in">✓ เช็คอินแล้ว</option>
            <option value="not_checked">⊘ ยังไม่เช็คอิน</option>
            <option value="late">⚠ มาสาย</option>
            <option value="absent">✗ ขาดงาน</option>
            <option value="leave">⏸ ลา</option>
            <option value="dayoff">🌴 วันหยุด</option>
          </select>
          <button onClick={() => setShowAdvanced(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showAdvanced ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Filter size={12} />
            ตัวกรองเพิ่มเติม
            {advancedActive > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-black">
                {advancedActive}
              </span>
            )}
          </button>
          {totalActive > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600">
              <X size={12} /> ล้างตัวกรอง
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => run(true)} disabled={refreshing}
              title="ดึงข้อมูลใหม่จาก server"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-teal-700 hover:bg-teal-50 disabled:opacity-50">
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "กำลังโหลด" : "รีเฟรช"}
            </button>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              <span className="font-bold text-slate-700">{filtered.length}</span> / {employees.length} คน
            </span>
          </div>
        </div>

        {/* Advanced row */}
        {showAdvanced && (
          <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-slate-100">
            {branches.length > 0 && (
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className={inp}>
                <option value="">ทุกสาขา</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {positions.length > 0 && (
              <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} className={inp}>
                <option value="">ทุกตำแหน่ง</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={selectedEmpType} onChange={e => setSelectedEmpType(e.target.value)} className={inp}>
              <option value="">ทุกประเภทการจ้าง</option>
              {Object.entries(EMP_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={issue} onChange={e => setIssue(e.target.value as Issue)} className={inp}>
              <option value="">ปัญหาในรอบ (ทั้งหมด)</option>
              <option value="has_late">มีวันมาสาย ≥ 1 วัน</option>
              <option value="has_absent">มีวันขาดงาน ≥ 1 วัน</option>
              <option value="no_shift_today">ยังไม่จัดกะวันนี้</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className={inp}>
                <option value="name">เรียงตามชื่อ (ก-ฮ)</option>
                <option value="code">เรียงตามรหัสพนักงาน</option>
                <option value="late_desc">สายมากสุด</option>
                <option value="absent_desc">ขาดมากสุด</option>
                <option value="ot_desc">OT มากสุด</option>
                <option value="present_desc">มาทำงานมากสุด</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <Users size={32} className="mx-auto mb-2 text-slate-200" />
          ไม่พบพนักงาน
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => {
            const s = statsMap[emp.id] || { present: 0, late: 0, absent: 0, leave: 0, ot: 0 }
            const today = todayShiftMap[emp.id]
            return (
              <Link key={emp.id} href={`/admin/work-record/${emp.id}`}
                onClick={() => { cachedScrollY = window.scrollY }}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-lg shadow-sm transition-all overflow-hidden">
                {/* Header strip — darker */}
                <div className="bg-gradient-to-br from-teal-500 to-cyan-500 px-4 py-3 flex items-center gap-3">
                  <CardAvatar url={emp.avatar_url} fallback={emp.first_name_th?.[0] || "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">
                      {emp.first_name_th} {emp.last_name_th}
                      {emp.nickname && <span className="text-xs text-white/70 ml-1.5">({emp.nickname})</span>}
                    </p>
                    <p className="text-[11px] text-white/80 truncate">
                      {emp.employee_code} · {emp.position?.name || "—"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                </div>

                {/* Today */}
                <div className="px-4 py-3 border-b border-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider">วันนี้</span>
                    <span className="text-[10px] font-bold text-slate-500">{today?.shift || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-700">
                      {today?.in ? format(new Date(today.in), "HH:mm") : "--:--"}
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="font-bold text-slate-700">
                      {today?.out ? format(new Date(today.out), "HH:mm") : "--:--"}
                    </span>
                  </div>
                </div>

                {/* Monthly stats */}
                <div className="px-4 py-3 grid grid-cols-4 gap-2">
                  <Stat label="มา" value={s.present} color="emerald" />
                  <Stat label="สาย" value={s.late} color="amber" />
                  <Stat label="ขาด" value={s.absent} color="rose" />
                  <Stat label="ลา" value={s.leave} color="violet" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CardAvatar({ url, fallback }: { url?: string | null; fallback: string }) {
  const [errored, setErrored] = useState(false)
  const show = url && !errored
  return (
    <div className="w-12 h-12 rounded-full bg-white shadow-md ring-2 ring-white/50 flex items-center justify-center font-black text-teal-700 overflow-hidden flex-shrink-0">
      {show
        ? <img src={url!} alt="" className="w-full h-full object-cover" onError={() => setErrored(true)} referrerPolicy="no-referrer" />
        : fallback}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: "text-emerald-800 bg-emerald-100",
    amber: "text-amber-800 bg-amber-100",
    rose: "text-rose-800 bg-rose-100",
    violet: "text-violet-800 bg-violet-100",
  }
  return (
    <div className={`rounded-lg ${styles[color]} px-2 py-1.5 text-center`}>
      <p className="text-base font-black leading-none">{value}</p>
      <p className="text-[9px] font-bold mt-0.5 opacity-70">{label}</p>
    </div>
  )
}
