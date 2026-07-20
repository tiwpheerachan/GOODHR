"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  Users, Calendar, AlertTriangle, TrendingUp, Filter,
  Search, Download, ChevronRight, Briefcase, CircleDollarSign,
  Clock, Building2, BarChart3, X, Loader2, RefreshCw, ArrowRight,
  PieChart as PieIcon, UserPlus, FileBarChart2,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

type Filters = {
  scope: "this_month" | "all" | "custom"
  date_mode: "calendar" | "payroll"  // เดือนปกติ vs รอบเงินเดือน
  year?: number
  month?: number
  company_id?: string
  department_id?: string
  status: "active" | "resigned" | "all"  // กำลังทดลองงาน / ลาออกในรอบ / ทั้งหมด
  search: string
}

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

export default function AdminProbationEmployeesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [filters, setFilters] = useState<Filters>({
    scope: "this_month",
    date_mode: "calendar",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: "active",
    search: "",
  })
  const [selectedEmp, setSelectedEmp] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.scope === "this_month" || filters.scope === "custom") {
      if (filters.year) params.set("year", String(filters.year))
      if (filters.month) params.set("month", String(filters.month))
      params.set("date_mode", filters.date_mode)
    }
    if (filters.company_id) params.set("company_id", filters.company_id)
    if (filters.department_id) params.set("department_id", filters.department_id)
    if (filters.status && filters.status !== "active") params.set("status", filters.status)
    try {
      const res = await fetch(`/api/admin/probation-employees?${params}`)
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โหลดไม่สำเร็จ"); return }
      setData(d)
      setLastRefresh(new Date())
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters.scope, filters.date_mode, filters.year, filters.month, filters.company_id, filters.department_id, filters.status])

  const visibleEmployees = useMemo(() => {
    if (!data?.employees) return []
    const s = filters.search.trim().toLowerCase()
    if (!s) return data.employees
    return data.employees.filter((e: any) => {
      const hay = `${e.first_name_th || ""} ${e.last_name_th || ""} ${e.nickname || ""} ${e.first_name_en || ""} ${e.last_name_en || ""} ${e.employee_code || ""} ${e.department?.name || ""} ${e.position?.name || ""}`.toLowerCase()
      return hay.includes(s)
    })
  }, [data, filters.search])

  const exportXlsx = () => {
    if (!visibleEmployees.length) { toast.error("ไม่มีข้อมูล"); return }
    const rows = visibleEmployees.map((e: any) => ({
      "รหัสพนักงาน": e.employee_code,
      "ชื่อ-นามสกุล": `${e.first_name_th} ${e.last_name_th}`,
      "ชื่อเล่น": e.nickname || "",
      "ชื่อ EN": `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim(),
      "บริษัท": e.company?.code || "",
      "แผนก": e.department?.name || "",
      "ตำแหน่ง": e.position?.name || "",
      "สถานะ": e.resigned || e._derived?.resigned ? "ลาออกแล้ว" : "กำลังทดลองงาน",
      "วันที่ลาออก": e.resign_date || "",
      "วันเริ่มงาน": e.hire_date,
      "วันสิ้นทดลองงาน": e.probation_end_date || "",
      "อายุงาน (วัน)": e._derived?.tenure_days || 0,
      "อายุงาน (เดือน)": e._derived?.tenure_months || 0,
      "เหลือ probation (วัน)": e._derived?.days_left_probation ?? "",
      "อายุ": e._derived?.age || "",
      "เพศ": e.gender || "",
      "เบอร์โทร": e.phone || "",
      "อีเมล": e.email || "",
      "เงินเดือนพื้นฐาน": e._derived?.salary?.base_salary || 0,
      "รวมเงิน + ค่าตำแหน่ง": e._derived?.total_salary || 0,
      "เกินกำหนด probation": e._derived?.is_overdue_probation ? "✗" : "",
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "พนักงานทดลองงาน")
    XLSX.writeFile(wb, `probation_employees_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("ดาวน์โหลดเรียบร้อย")
  }

  const stats = data?.stats || { total: 0, overdue_probation: 0, avg_salary: 0, total_salary: 0 }
  const charts = data?.charts || {}

  return (
    <div className="space-y-4 pb-12">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
              <Briefcase size={22}/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">พนักงานทดลองงาน</h1>
              <p className="text-sm text-slate-400">ข้อมูล + วิเคราะห์ + ติดตามพนักงานที่อยู่ในช่วงทดลองงาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""}/> {format(lastRefresh, "HH:mm")}
            </button>
          </div>
        </div>

        {/* ── ACTION BAR ─ Export & Quick links ─────────────── */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 flex items-center gap-4 flex-wrap shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">ติดตามและประเมินผลพนักงานทดลองงาน</p>
            <p className="text-orange-50 text-[11px] mt-0.5">
              {stats.total} คนทดลองงาน
              {stats.overdue_probation > 0 && <span className="ml-2 bg-rose-600/90 px-1.5 py-0.5 rounded">⚠️ เกินกำหนด {stats.overdue_probation} คน</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/admin/probation-eval"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-xl transition-colors">
              <FileBarChart2 size={14}/> ประเมินผล
            </Link>
            <button onClick={exportXlsx} disabled={!visibleEmployees.length}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-orange-600 text-sm font-black rounded-xl hover:bg-orange-50 disabled:opacity-50 transition-colors shadow-sm">
              <Download size={14}/> Export XLSX
            </button>
          </div>
        </div>

        {/* ── FILTER BAR ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-400"/>
            <p className="text-[10px] font-black text-slate-500 uppercase">Filter</p>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <FilterBtn active={filters.scope === "this_month"} onClick={() => setFilters(f => ({ ...f, scope: "this_month", year: new Date().getFullYear(), month: new Date().getMonth() + 1 }))}>
              📅 เดือนนี้
            </FilterBtn>
            <FilterBtn active={filters.scope === "all"} onClick={() => setFilters(f => ({ ...f, scope: "all", year: undefined, month: undefined }))}>
              🌐 ทั้งหมด
            </FilterBtn>
            <FilterBtn active={filters.scope === "custom"} onClick={() => setFilters(f => ({ ...f, scope: "custom" }))}>
              🗓️ เลือกเดือน
            </FilterBtn>

            {filters.scope === "custom" && (
              <>
                <select value={filters.year || ""} onChange={e => setFilters(f => ({ ...f, year: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:border-indigo-400 outline-none">
                  <option value="">ทุกปี</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filters.month || ""} onChange={e => setFilters(f => ({ ...f, month: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:border-indigo-400 outline-none">
                  <option value="">ทุกเดือน</option>
                  {THAI_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </>
            )}
          </div>

          {/* ── Date Mode Toggle ── (เฉพาะตอน scope ไม่ใช่ "all") */}
          {filters.scope !== "all" && (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-black text-slate-500 uppercase">นับวันที่</p>
              <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setFilters(f => ({ ...f, date_mode: "calendar" }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    filters.date_mode === "calendar" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  📅 เดือนปกติ
                </button>
                <button onClick={() => setFilters(f => ({ ...f, date_mode: "payroll" }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    filters.date_mode === "payroll" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  💰 รอบเงินเดือน
                </button>
              </div>
              {data?.range?.start && data?.range?.end && (
                <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded-md">
                  {filters.date_mode === "payroll" ? "รอบเงินเดือน:" : "ช่วง:"}{" "}
                  <span className="text-slate-700">
                    {format(new Date(data.range.start), "d MMM", { locale: th })} → {format(new Date(data.range.end), "d MMM yyyy", { locale: th })}
                  </span>
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            {/* สถานะ: กำลังทดลองงาน / ลาออกในรอบ / ทั้งหมด */}
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as Filters["status"] }))}
              className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400 ${filters.status!=="active"?"bg-rose-50 border-rose-200 text-rose-700":"bg-slate-50 border-slate-200"}`}>
              <option value="active">🟢 กำลังทดลองงาน</option>
              <option value="resigned">🚪 ลาออกในรอบนี้</option>
              <option value="all">📋 ทั้งหมด</option>
            </select>
            <select value={filters.company_id || ""} onChange={e => setFilters(f => ({ ...f, company_id: e.target.value || undefined }))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-400 outline-none">
              <option value="">🏢 ทุกบริษัท</option>
              {(data?.filters?.companies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.code} · {c.name_th}</option>)}
            </select>
            <select value={filters.department_id || ""} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value || undefined }))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-400 outline-none">
              <option value="">🏬 ทุกแผนก</option>
              {(data?.filters?.departments ?? []).filter((d: any) => !filters.company_id || d.company_id === filters.company_id).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="ค้นหาชื่อ / รหัส / แผนก..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-indigo-400"/>
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="bg-white rounded-2xl p-20 text-center border border-slate-100 shadow-sm">
            <Loader2 size={28} className="animate-spin text-orange-400 mx-auto mb-2"/>
            <p className="text-xs text-slate-400">กำลังโหลด...</p>
          </div>
        ) : !data?.employees?.length ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <Briefcase size={32} className="mx-auto mb-2 text-slate-300"/>
            <p className="font-bold text-slate-500">ไม่มีพนักงานทดลองงาน</p>
            <p className="text-xs text-slate-400 mt-1">ลองปรับ filter หรือเลือกช่วงเวลาอื่น</p>
          </div>
        ) : (
          <>
            {/* ── KPI ROW ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "พนักงานทดลองงาน", v: stats.total, sub: `แสดง ${visibleEmployees.length}`, icon: Users, bg: "bg-orange-50", ic: "text-orange-500", vc: "text-orange-700" },
                { l: "เกินกำหนด", v: stats.overdue_probation, sub: "ต้องประเมินด่วน", icon: AlertTriangle, bg: "bg-rose-50", ic: "text-rose-500", vc: "text-rose-700", highlight: stats.overdue_probation > 0 },
                { l: "เงินเดือนเฉลี่ย", v: stats.avg_salary > 0 ? `${(stats.avg_salary / 1000).toFixed(1)}k` : "—", sub: "รวมเบี้ยเลี้ยง", icon: CircleDollarSign, bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
                { l: "ต้นทุนรวม/เดือน", v: `${(stats.total_salary / 1000).toFixed(0)}k`, sub: "฿ ทั้งหมด", icon: TrendingUp, bg: "bg-violet-50", ic: "text-violet-500", vc: "text-violet-700" },
              ].map(k => (
                <div key={k.l} className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all ${k.highlight ? "ring-2 ring-rose-300" : ""}`}>
                  <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <k.icon size={15} className={k.ic}/>
                  </div>
                  <p className={`text-2xl font-black ${k.vc} leading-none`}>{k.v}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight font-semibold">{k.l}</p>
                  {k.sub && <p className="text-[9px] text-slate-400 mt-0.5">{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN LAYOUT — เต็มความกว้าง 2 columns
                Left (xl:col-span-8): Charts (3 cols เด่นๆ)
                Right (xl:col-span-4): Employee list (sticky)
               ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

              {/* ╭─ LEFT: Analytics ───────────────────────────────╮ */}
              <div className="xl:col-span-8 space-y-4 min-w-0">
                {/* Trend (full width) */}
                {charts.by_month?.length > 1 && (
                  <SectionCard
                    icon={<Calendar size={14} className="text-orange-500"/>}
                    iconBg="bg-orange-50"
                    title="แนวโน้มจ้างงานรายเดือน"
                    badge={`${charts.by_month.length} เดือน`}
                  >
                    <TrendBar data={charts.by_month}/>
                  </SectionCard>
                )}

                {/* Charts grid: 3 cols on wide screens, 2 cols on lg, 1 col on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                  <ChartCard icon={<Building2 size={14} className="text-indigo-500"/>} iconBg="bg-indigo-50" title="แยกตามแผนก" data={charts.by_dept} color="indigo"/>
                  <ChartCard icon={<Building2 size={14} className="text-violet-500"/>} iconBg="bg-violet-50" title="แยกตามบริษัท" data={charts.by_company} color="violet"/>
                  <ChartCard icon={<CircleDollarSign size={14} className="text-emerald-500"/>} iconBg="bg-emerald-50" title="ช่วงเงินเดือน" data={charts.by_salary} color="emerald"/>
                  <ChartCard icon={<Clock size={14} className="text-amber-500"/>} iconBg="bg-amber-50" title="อายุงาน" data={charts.by_tenure} color="amber"/>
                  <ChartCard icon={<TrendingUp size={14} className="text-sky-500"/>} iconBg="bg-sky-50" title="ช่วงอายุ" data={charts.by_age} color="sky"/>
                  <ChartCard icon={<Users size={14} className="text-rose-500"/>} iconBg="bg-rose-50" title="เพศ" data={charts.by_gender} color="rose" useColors/>
                </div>
              </div>

              {/* ╭─ RIGHT: Employee list with detailed cards ──────╮ */}
              <div className="xl:col-span-4 min-w-0">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden xl:sticky xl:top-4">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50 bg-gradient-to-r from-orange-50/40 to-amber-50/40">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Users size={14} className="text-orange-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-800">รายชื่อพนักงานทดลองงาน</p>
                      <p className="text-[10px] text-slate-400">คลิกเพื่อดูรายละเอียดเพิ่มเติม</p>
                    </div>
                    <span className="text-[10px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-full">{visibleEmployees.length} คน</span>
                  </div>
                  <div className="p-3 space-y-2.5 max-h-[calc(100vh-180px)] overflow-y-auto">
                    {visibleEmployees.map((e: any) => (
                      <EmployeeDetailCard key={e.id} emp={e} onClick={() => setSelectedEmp(e)}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedEmp && <DetailModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Reusable components — ใช้ style เดียวกับ dashboard
// ════════════════════════════════════════════════════════════════════
function FilterBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
        active ? "bg-orange-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}>
      {children}
    </button>
  )
}

function SectionCard({ icon, iconBg, title, badge, action, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
        <div className={`w-8 h-8 rounded-xl ${iconBg || "bg-slate-50"} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <p className="font-black text-sm text-slate-800">{title}</p>
        {badge && <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-full">{badge}</span>}
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ChartCard({ icon, iconBg, title, data, color, useColors }: any) {
  if (!data) return null
  const total = data.reduce((s: number, x: any) => s + x.value, 0)
  const max = Math.max(...data.map((x: any) => x.value), 1)
  const colors: Record<string, string> = {
    indigo: "bg-indigo-500", violet: "bg-violet-500",
    emerald: "bg-emerald-500", amber: "bg-amber-500",
    sky: "bg-sky-500", rose: "bg-rose-500", slate: "bg-slate-400",
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
        <div className={`w-8 h-8 rounded-xl ${iconBg || "bg-slate-50"} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <p className="font-black text-sm text-slate-800">{title}</p>
      </div>
      <div className="px-5 py-4">
        {total === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2">
            {data.filter((d: any) => d.value > 0).map((d: any, i: number) => {
              const pct = max > 0 ? (d.value / max) * 100 : 0
              const pctOfTotal = total > 0 ? (d.value / total) * 100 : 0
              const barColor = useColors && d.color ? colors[d.color] : colors[color]
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-700 truncate flex-1 pr-2">{d.label}</span>
                    <span className="font-black text-slate-800 tabular-nums">
                      {d.value} <span className="text-slate-400 font-normal text-[10px]">({pctOfTotal.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all rounded-full`} style={{ width: `${Math.max(2, pct)}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// EmployeeDetailCard — การ์ดพนักงานรายคน แสดงรายละเอียดครบ inline
// ════════════════════════════════════════════════════════════════════
function EmployeeDetailCard({ emp, onClick }: { emp: any; onClick: () => void }) {
  const d = emp._derived
  const isOverdue = d.is_overdue_probation
  const isNearDue = d.days_left_probation != null && d.days_left_probation <= 7 && d.days_left_probation >= 0

  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl border-2 transition-all hover:shadow-md ${
        isOverdue ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
        : isNearDue ? "bg-amber-50/40 border-amber-200 hover:border-amber-300"
        : "bg-white border-slate-100 hover:border-orange-200"
      }`}>
      {/* Header — avatar + name + days left badge */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0 overflow-hidden">
          {emp.avatar_url
            ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>
            : emp.first_name_th?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-slate-800 truncate leading-tight">
            {emp.first_name_th} {emp.last_name_th}
            {emp.nickname && <span className="text-slate-400 font-normal ml-1">({emp.nickname})</span>}
            {(emp.resigned || d.resigned) && <span className="ml-1.5 align-middle text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">🚪 ลาออก{emp.resign_date?` ${new Date(emp.resign_date).toLocaleDateString("th-TH",{day:"numeric",month:"short"})}`:""}</span>}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {emp.employee_code} · {emp.position?.name || emp.department?.name || "—"}
            {emp.company?.code && ` · ${emp.company.code}`}
          </p>
        </div>
        {d.days_left_probation != null && (
          <div className={`text-right flex-shrink-0 px-2 py-1 rounded-lg ${
            isOverdue ? "bg-rose-100"
            : isNearDue ? "bg-amber-100"
            : "bg-slate-100"
          }`}>
            <p className={`text-sm font-black leading-none ${
              isOverdue ? "text-rose-700"
              : isNearDue ? "text-amber-700"
              : "text-slate-600"
            }`}>
              {isOverdue ? "+" : ""}{Math.abs(d.days_left_probation)}
            </p>
            <p className={`text-[9px] font-bold leading-tight mt-0.5 ${
              isOverdue ? "text-rose-600"
              : isNearDue ? "text-amber-600"
              : "text-slate-500"
            }`}>
              {isOverdue ? "เกินกำหนด" : "เหลือ"}
            </p>
          </div>
        )}
      </div>

      {/* Detail rows */}
      <div className="p-3 space-y-1.5">
        <DetailRow icon={<Calendar size={11} className="text-indigo-500"/>}
          label="วันเริ่มงาน"
          value={emp.hire_date ? format(new Date(emp.hire_date), "d MMM yyyy", { locale: th }) : "—"}
          sub={`อายุงาน ${d.tenure_days} วัน · ${d.tenure_months} เดือน`}
        />

        {emp.probation_end_date && (
          <DetailRow icon={<Clock size={11} className="text-amber-500"/>}
            label="วันสิ้นทดลองงาน"
            value={format(new Date(emp.probation_end_date), "d MMM yyyy", { locale: th })}
            valueColor={isOverdue ? "text-rose-700" : isNearDue ? "text-amber-700" : "text-slate-700"}
          />
        )}

        {d.salary && (
          <DetailRow icon={<CircleDollarSign size={11} className="text-emerald-500"/>}
            label="ฐานเงินเดือน"
            value={`฿${Number(d.salary.base_salary).toLocaleString()}`}
            sub={d.total_salary > Number(d.salary.base_salary) ? `รวมเบี้ยเลี้ยง ฿${d.total_salary.toLocaleString()}/ด.` : undefined}
            valueColor="text-emerald-700"
          />
        )}

        {d.payroll && (d.net_this_month || d.gross_this_month) && (
          <DetailRow icon={<TrendingUp size={11} className="text-violet-500"/>}
            label={`เดือนนี้ (${d.payroll.month}/${d.payroll.year})`}
            value={`฿${Number(d.net_this_month ?? d.gross_this_month).toLocaleString()}`}
            sub={d.payroll.total_deductions > 0 ? `หัก ฿${Number(d.payroll.total_deductions).toLocaleString()}` : "ยังไม่หัก"}
            valueColor="text-violet-700"
            strong
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between bg-slate-50/40">
        <span>{emp.department?.name || "—"}</span>
        <span className="text-orange-500 font-bold">ดูรายละเอียด →</span>
      </div>
    </button>
  )
}

function DetailRow({ icon, label, value, sub, valueColor, strong }: any) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
        <p className={`text-xs font-bold leading-tight ${valueColor || "text-slate-800"} ${strong ? "text-sm" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function TrendBar({ data }: { data: any[] }) {
  const max = Math.max(...data.map((d: any) => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d: any) => {
        const h = (d.value / max) * 100
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] font-black text-orange-700 opacity-0 group-hover:opacity-100 transition">{d.value}</span>
            <div className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-md transition-all hover:from-orange-600 cursor-pointer"
              style={{ height: `${Math.max(4, h)}%`, minHeight: 4 }}/>
            <span className="text-[9px] text-slate-400 font-bold">{d.label.slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}

function DetailModal({ emp, onClose }: any) {
  const d = emp._derived
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black overflow-hidden">
              {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/> : emp.first_name_th?.[0]}
            </div>
            <div>
              <h3 className="font-black">{emp.first_name_th} {emp.last_name_th}</h3>
              <p className="text-[11px] opacity-90">
                {emp.employee_code} {emp.nickname && `· (${emp.nickname})`}
                {emp.first_name_en && ` · ${emp.first_name_en} ${emp.last_name_en || ""}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {d.is_overdue_probation && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-500 flex-shrink-0"/>
              <p className="text-xs font-black text-rose-700">
                เกินกำหนด probation แล้ว {Math.abs(d.days_left_probation)} วัน — ต้องประเมินด่วน!
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <StatBox label="อายุงาน" value={`${d.tenure_months} ด.`} sub={`${d.tenure_days} วัน`} color="indigo"/>
            <StatBox label="เหลือ probation"
              value={d.days_left_probation != null ? (d.is_overdue_probation ? `+${Math.abs(d.days_left_probation)}` : `${d.days_left_probation}`) : "—"}
              sub="วัน"
              color={d.is_overdue_probation ? "rose" : d.days_left_probation <= 7 ? "amber" : "emerald"}/>
            <StatBox label="อายุ" value={d.age || "—"} sub="ปี" color="violet"/>
          </div>

          <Section title="🏢 ข้อมูลการทำงาน">
            <Row label="บริษัท" value={emp.company ? `${emp.company.code} · ${emp.company.name_th}` : "—"}/>
            <Row label="แผนก" value={emp.department?.name || "—"}/>
            <Row label="ตำแหน่ง" value={emp.position?.name || "—"}/>
            <Row label="สาขา" value={emp.branch?.name || "—"}/>
            <Row label="ประเภทการจ้าง" value={emp.employment_type || "—"}/>
            <Row label="วันเริ่มงาน" value={emp.hire_date ? format(new Date(emp.hire_date), "d MMMM yyyy", { locale: th }) : "—"} highlight/>
            <Row label="วันสิ้นทดลองงาน" value={emp.probation_end_date ? format(new Date(emp.probation_end_date), "d MMMM yyyy", { locale: th }) : "—"} highlight/>
          </Section>

          <Section title="💰 เงินเดือน + ค่าตอบแทน">
            {d.salary ? (
              <>
                <Row label="เงินเดือนพื้นฐาน" value={`฿${Number(d.salary.base_salary).toLocaleString()}`} highlight/>
                {Number(d.salary.allowance_position) > 0 && <Row label="ค่าตำแหน่ง" value={`฿${Number(d.salary.allowance_position).toLocaleString()}`}/>}
                {Number(d.salary.allowance_transport) > 0 && <Row label="ค่าเดินทาง" value={`฿${Number(d.salary.allowance_transport).toLocaleString()}`}/>}
                {Number(d.salary.allowance_food) > 0 && <Row label="ค่าอาหาร" value={`฿${Number(d.salary.allowance_food).toLocaleString()}`}/>}
                {Number(d.salary.allowance_phone) > 0 && <Row label="ค่าโทรศัพท์" value={`฿${Number(d.salary.allowance_phone).toLocaleString()}`}/>}
                {Number(d.salary.allowance_housing) > 0 && <Row label="ค่าที่พัก" value={`฿${Number(d.salary.allowance_housing).toLocaleString()}`}/>}
                {Number(d.salary.allowance_vehicle) > 0 && <Row label="ค่ายานพาหนะ" value={`฿${Number(d.salary.allowance_vehicle).toLocaleString()}`}/>}
                <Row label="รวมต่อเดือน" value={`฿${d.total_salary.toLocaleString()}`} highlight strong/>
                {d.salary.effective_from && <Row label="มีผลตั้งแต่" value={format(new Date(d.salary.effective_from), "d MMM yyyy", { locale: th })}/>}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">ไม่พบข้อมูลเงินเดือน</p>
            )}
          </Section>

          <Section title="👤 ข้อมูลส่วนตัว">
            <Row label="เพศ" value={emp.gender || "—"}/>
            <Row label="วันเกิด" value={emp.birth_date ? format(new Date(emp.birth_date), "d MMMM yyyy", { locale: th }) : "—"}/>
            <Row label="เบอร์โทร" value={emp.phone || "—"}/>
            <Row label="อีเมล" value={emp.email || "—"}/>
          </Section>

          <div className="grid grid-cols-2 gap-2">
            <Link href={`/admin/employees/${emp.id}`} className="block bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black py-3 rounded-xl text-center">
              ดูข้อมูลพนักงาน →
            </Link>
            <Link href={`/admin/probation-eval`} className="block bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-black py-3 rounded-xl text-center shadow-sm">
              📋 ประเมินผล →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, sub, color }: any) {
  const palette: Record<string, { bg: string; text: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700" },
    rose: { bg: "bg-rose-50", text: "text-rose-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    violet: { bg: "bg-violet-50", text: "text-violet-700" },
  }
  const p = palette[color] || palette.indigo
  return (
    <div className={`${p.bg} rounded-xl p-2.5 text-center`}>
      <p className={`text-[9px] font-bold uppercase ${p.text} opacity-70`}>{label}</p>
      <p className={`text-xl font-black ${p.text} leading-none mt-0.5`}>{value}</p>
      <p className={`text-[9px] font-bold ${p.text} opacity-60 mt-0.5`}>{sub}</p>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs font-black text-slate-800 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight, strong }: any) {
  return (
    <div className={`flex items-center justify-between text-xs py-1 ${strong ? "border-t border-slate-200 pt-2 mt-1" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${strong ? "text-emerald-700 text-sm" : highlight ? "text-orange-700" : "text-slate-700"}`}>{value}</span>
    </div>
  )
}
