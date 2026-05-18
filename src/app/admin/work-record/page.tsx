"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Search, Sparkles, Filter, ChevronRight, Users, Building2,
  Clock, CheckCircle2, AlertTriangle, Calendar,
} from "lucide-react"
import Link from "next/link"
import { format, addMonths, subMonths } from "date-fns"
import { th } from "date-fns/locale"

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 transition-all"

type Emp = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  nickname?: string | null
  avatar_url?: string | null
  company_id: string
  position?: { name: string } | null
  department?: { name: string } | null
  company?: { code: string; name_th: string } | null
}
type Stats = { present: number; late: number; absent: number; leave: number; ot: number }

export default function WorkRecordListPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"
  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined

  const [employees, setEmployees] = useState<Emp[]>([])
  const [companies, setCompanies] = useState<{ id: string; code: string; name_th: string }[]>([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [statsMap, setStatsMap] = useState<Record<string, Stats>>({})
  const [todayShiftMap, setTodayShiftMap] = useState<Record<string, { shift?: string; in?: string; out?: string; status?: string }>>({})
  const [loading, setLoading] = useState(true)

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

  // load employees + monthly stats + today's shift/attendance
  useEffect(() => {
    if (!isSuperAdmin && !myCompanyId) return
    const run = async () => {
      setLoading(true)
      try {
        let q = supabase.from("employees")
          .select(`id, employee_code, first_name_th, last_name_th, nickname, avatar_url, company_id,
                   position:positions(name), department:departments(name), company:companies(code, name_th)`)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("first_name_th")
          .limit(300)
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
          if (a.assignment_type === "dayoff") t.shift = "วันหยุด"
          else if (a.assignment_type === "leave") t.shift = "ลา"
          else if (a.assignment_type === "holiday") t.shift = "วันหยุดนักขัตฤกษ์"
          else if ((a.shift as any)?.name) t.shift = (a.shift as any).name
        }
        setTodayShiftMap(today_)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [isSuperAdmin, myCompanyId, activeCompanyId])

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase()
    if (!s) return employees
    return employees.filter(e =>
      e.first_name_th?.toLowerCase().includes(s) ||
      e.last_name_th?.toLowerCase().includes(s) ||
      e.nickname?.toLowerCase().includes(s) ||
      e.employee_code?.toLowerCase().includes(s)
    )
  }, [employees, debounced])

  return (
    <div className="space-y-5">
      {/* Hero header — pastel cyan/teal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-200 via-teal-100 to-emerald-200 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-teal-300/30 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-teal-800/80">
              <Sparkles size={16} />
              <span className="text-xs font-black tracking-wider">PRO MAX</span>
            </div>
            <h1 className="text-3xl font-black text-teal-900 mt-1">บันทึกการเข้างาน Pro Max</h1>
            <p className="text-sm text-teal-800/80 mt-1 max-w-xl">
              ดู/แก้ไขเวลาเข้า-ออก, กะการทำงาน, OT, การลาของพนักงานแต่ละคนแบบครบจบในหน้าเดียว
            </p>
          </div>
          <div className="bg-white/50 backdrop-blur rounded-2xl px-4 py-3">
            <p className="text-[11px] font-bold text-teal-800/70">รอบเงินเดือนปัจจุบัน</p>
            <p className="text-lg font-black text-teal-900">22 {format(subMonths(new Date(), new Date().getDate() <= 21 ? 1 : 0), "MMM", { locale: th })} – 21 {format(addMonths(new Date(), new Date().getDate() <= 21 ? 0 : 1), "MMM yyyy", { locale: th })}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
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
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} คน</span>
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
                className="group bg-white rounded-2xl border border-slate-100 hover:border-teal-300 hover:shadow-md transition-all overflow-hidden">
                {/* Header strip */}
                <div className="bg-gradient-to-br from-cyan-50 to-teal-50 px-4 py-3 flex items-center gap-3 border-b border-teal-100/50">
                  <CardAvatar url={emp.avatar_url} fallback={emp.first_name_th?.[0] || "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">
                      {emp.first_name_th} {emp.last_name_th}
                      {emp.nickname && <span className="text-xs text-slate-400 ml-1.5">({emp.nickname})</span>}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {emp.employee_code} · {emp.position?.name || "—"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
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
    <div className="w-12 h-12 rounded-full bg-white shadow-sm ring-2 ring-white flex items-center justify-center font-black text-teal-700 overflow-hidden flex-shrink-0">
      {show
        ? <img src={url!} alt="" className="w-full h-full object-cover" onError={() => setErrored(true)} referrerPolicy="no-referrer" />
        : fallback}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    rose: "text-rose-700 bg-rose-50",
    violet: "text-violet-700 bg-violet-50",
  }
  return (
    <div className={`rounded-lg ${styles[color]} px-2 py-1.5 text-center`}>
      <p className="text-base font-black leading-none">{value}</p>
      <p className="text-[9px] font-bold mt-0.5 opacity-70">{label}</p>
    </div>
  )
}
