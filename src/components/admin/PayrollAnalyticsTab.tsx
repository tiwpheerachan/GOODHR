"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Banknote, Building2, Users, Tag, Loader2, RefreshCw, TrendingUp,
  PieChart, BarChart3, ChevronRight, Percent, Award, AlertCircle, Layers,
} from "lucide-react"
import Link from "next/link"

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")
const fmtSh = (n: number) => {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}k`
  return `฿${fmt(n)}`
}

// brand color (subtle)
function brandColor(brand: string): { bar: string; chip: string } {
  const u = brand.toUpperCase()
  if (u.includes("DDPAI"))   return { bar: "bg-blue-500",   chip: "bg-blue-50 text-blue-700" }
  if (u.includes("ANKER"))   return { bar: "bg-sky-500",    chip: "bg-sky-50 text-sky-700" }
  if (u.includes("DREAME"))  return { bar: "bg-purple-500", chip: "bg-purple-50 text-purple-700" }
  if (u.includes("WANBO"))   return { bar: "bg-amber-500",  chip: "bg-amber-50 text-amber-700" }
  if (u.includes("MOVA"))    return { bar: "bg-emerald-500",chip: "bg-emerald-50 text-emerald-700" }
  if (u.includes("VINKO"))   return { bar: "bg-teal-500",   chip: "bg-teal-50 text-teal-700" }
  if (u.includes("XIAOMI") || u.includes("70MAI")) return { bar: "bg-orange-500", chip: "bg-orange-50 text-orange-700" }
  if (u.includes("LEVOIT"))  return { bar: "bg-cyan-500",   chip: "bg-cyan-50 text-cyan-700" }
  if (u.includes("JIMMY"))   return { bar: "bg-yellow-500", chip: "bg-yellow-50 text-yellow-700" }
  if (u.includes("SOUNDCORE")) return { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-700" }
  if (u.includes("UWANT"))   return { bar: "bg-fuchsia-500",chip: "bg-fuchsia-50 text-fuchsia-700" }
  if (u.includes("TOPTOY"))  return { bar: "bg-lime-500",   chip: "bg-lime-50 text-lime-700" }
  if (u.includes("MIBRO") || u.includes("ZEPP")) return { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" }
  if (u.includes("THAIMALL"))return { bar: "bg-rose-500",   chip: "bg-rose-50 text-rose-700" }
  return { bar: "bg-slate-500", chip: "bg-slate-50 text-slate-700" }
}

interface Props {
  companyId: string                    // "" หรือ "all" = ทุกบริษัท
  companies: Array<{ id: string; name_th: string; code: string }>
  isSuperAdmin: boolean
  onCompanyChange: (id: string) => void
}

interface Insights {
  period: { year: number; month: number; label: string; hasData: boolean }
  summary: { employee_count: number; total_gross: number; total_net: number; total_base: number; avg_gross: number }
  by_brand: Array<{
    brand: string; employee_count: number; total_cost: number; avg_cost: number; share_pct: number
    top_earners: Array<{ id: string; name: string; cost: number; pct: number; code?: string; avatar_url?: string }>
  }>
  by_company: Array<{ id: string; name: string; code: string; employee_count: number; total_cost: number; share_pct: number }>
  by_department: Array<{ id: string; name: string; employee_count: number; total_cost: number; avg_cost: number }>
  brand_coverage: {
    total_with_payroll: number; with_brand: number; no_brand: number
    single_brand: number; multi_brand: number; avg_brands_per_person: number
    with_allocations: number; without_allocations: number
  }
  periods: Array<{ year: number; month: number; label: string }>
}

export default function PayrollAnalyticsTab({ companyId, companies, isSuperAdmin, onCompanyChange }: Props) {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodKey, setPeriodKey] = useState<string>("")   // "year-month" หรือว่าง = ล่าสุด
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (companyId && companyId !== "all") sp.set("company_id", companyId)
    if (periodKey) {
      const [y, m] = periodKey.split("-")
      sp.set("year", y); sp.set("month", m)
    }
    const res = await fetch(`/api/dashboard/payroll-insights?${sp.toString()}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
    setLoading(false)
  }, [companyId, periodKey])

  useEffect(() => { load() }, [load])

  // Brands ที่มีคนดูแลจริง (count > 0)
  const activeBrands = useMemo(() => data?.by_brand.filter(b => b.employee_count > 0) ?? [], [data])
  const idleBrands   = useMemo(() => data?.by_brand.filter(b => b.employee_count === 0) ?? [], [data])
  const maxBrandCost = useMemo(() => Math.max(...activeBrands.map(b => b.total_cost), 1), [activeBrands])
  const maxDeptCost  = useMemo(() => Math.max(...(data?.by_department ?? []).map(d => d.total_cost), 1), [data])

  if (loading && !data) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-indigo-400"/>
        <p className="text-sm text-slate-400">กำลังโหลดข้อมูลเงินเดือน...</p>
      </div>
    )
  }
  if (!data) return null

  const { summary, brand_coverage, period, by_company, by_department, periods } = data
  const cov = brand_coverage
  const allocPct = cov.with_brand > 0 ? Math.round((cov.with_allocations / cov.with_brand) * 100) : 0

  return (
    <div className="space-y-5">

      {/* ── Header / Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 size={18} className="text-white"/>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">วิเคราะห์เงินเดือน · {period.label}</h3>
            <p className="text-[11px] text-slate-400">
              ต้นทุนการจ้างงาน แยกตามแบรนด์ · บริษัท · แผนก
              {!period.hasData && <span className="ml-2 text-amber-600 font-bold">⚠ ไม่มีข้อมูล payroll ในงวดนี้</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* period */}
          <select value={periodKey}
            onChange={e => setPeriodKey(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
            <option value="">งวดล่าสุด</option>
            {periods.map(p => (
              <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{p.label}</option>
            ))}
          </select>
          {/* company */}
          {isSuperAdmin && companies.length > 0 && (
            <select value={companyId} onChange={e => onCompanyChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
              <option value="">ทุกบริษัท</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="พนักงานในงวด" value={fmt(summary.employee_count)} suffix="คน" color="from-indigo-500 to-purple-600"/>
        <KpiCard icon={Banknote} label="ต้นทุนรวม (Gross)" value={fmtSh(summary.total_gross)} color="from-emerald-500 to-teal-600"/>
        <KpiCard icon={TrendingUp} label="Net ที่จ่ายจริง" value={fmtSh(summary.total_net)} color="from-blue-500 to-indigo-600"/>
        <KpiCard icon={Award} label="ค่าเฉลี่ย/คน" value={fmtSh(summary.avg_gross)} color="from-amber-500 to-orange-600"/>
      </div>

      {/* ── Brand coverage / data quality ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Tag size={15} className="text-indigo-500"/>
          <h3 className="font-black text-slate-800 text-sm">ความครอบคลุมข้อมูลแบรนด์</h3>
          <span className="text-[10px] text-slate-400">— คุณภาพข้อมูลที่ใช้คำนวณต้นทุน</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <MiniStat label="มีแบรนด์" value={`${cov.with_brand}/${cov.total_with_payroll}`} tone="emerald"/>
          <MiniStat label="ไม่มีแบรนด์" value={String(cov.no_brand)} tone="rose"/>
          <MiniStat label="ดูแลแบรนด์เดียว" value={String(cov.single_brand)} tone="blue"/>
          <MiniStat label="ดูแลหลายแบรนด์" value={String(cov.multi_brand)} tone="violet"/>
          <MiniStat label="เฉลี่ย/คน" value={`${cov.avg_brands_per_person} แบรนด์`} tone="slate"/>
        </div>

        {/* Allocation coverage bar */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Percent size={11}/> กรอก % แบรนด์ครบ
            </p>
            <p className="text-[11px] font-black text-slate-700">
              {cov.with_allocations}/{cov.with_brand} คน ({allocPct}%)
            </p>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${allocPct}%` }}/>
          </div>
          {cov.without_allocations > 0 && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2 flex items-start gap-1.5">
              <AlertCircle size={11} className="shrink-0 mt-0.5"/>
              <span>มี {cov.without_allocations} คนที่ยังไม่ได้กรอก % แบรนด์ — ระบบจะคิดต้นทุนแบบ <b>หารเท่ากัน</b> ระหว่างแบรนด์ที่ดูแล</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Brand cost breakdown ── */}
      {activeBrands.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <PieChart size={14} className="text-purple-600"/>
            </div>
            <h3 className="font-black text-slate-800 text-sm">ต้นทุนการจ้างงาน · แยกตามแบรนด์</h3>
            <span className="text-[10px] text-slate-400">{activeBrands.length} แบรนด์ที่มีคนดูแล</span>
          </div>

          <div className="space-y-2">
            {activeBrands.map(b => {
              const c = brandColor(b.brand)
              const w = (b.total_cost / maxBrandCost) * 100
              const isOpen = expandedBrand === b.brand
              return (
                <div key={b.brand} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedBrand(isOpen ? null : b.brand)}
                    className="w-full px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg ${c.chip} min-w-[110px] truncate`}>
                        {b.brand}
                      </span>
                      <div className="flex-1 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                        <span><b className="text-slate-700">{b.employee_count}</b> คน</span>
                        <span>เฉลี่ย <b className="text-slate-700">{fmtSh(b.avg_cost)}</b>/คน</span>
                        <span className="text-indigo-600 font-bold">{b.share_pct}%</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 whitespace-nowrap">{fmtSh(b.total_cost)}</p>
                      <ChevronRight size={13} className={`text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`}/>
                    </div>
                    {/* bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${w}%` }}/>
                    </div>
                  </button>

                  {/* Expanded: top earners */}
                  {isOpen && b.top_earners.length > 0 && (
                    <div className="bg-slate-50/70 border-t border-slate-100 px-3.5 py-3 space-y-1.5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">ผู้รับสูงสุด — top {b.top_earners.length}</p>
                      {b.top_earners.map(e => (
                        <Link key={e.id} href={`/admin/employees/${e.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {e.avatar_url
                              ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/>
                              : <span className="text-[10px] font-bold text-slate-500">{e.name?.[0] || "?"}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{e.name}</p>
                            <p className="text-[10px] text-slate-400">{e.code} · ดูแล {e.pct}%</p>
                          </div>
                          <p className="text-xs font-black text-slate-800 whitespace-nowrap">{fmtSh(e.cost)}</p>
                          <ChevronRight size={12} className="text-slate-300"/>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {idleBrands.length > 0 && (
            <details className="mt-3">
              <summary className="text-[11px] font-bold text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1">
                <Layers size={11}/> แบรนด์ที่ยังไม่มีคนดูแล ({idleBrands.length})
              </summary>
              <div className="flex flex-wrap gap-1.5 mt-2 pl-4">
                {idleBrands.map(b => (
                  <span key={b.brand}
                    className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg">
                    {b.brand}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Company breakdown ── */}
      {by_company.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 size={14} className="text-blue-600"/>
            </div>
            <h3 className="font-black text-slate-800 text-sm">แยกตามบริษัท</h3>
          </div>
          <div className="space-y-2">
            {by_company.map(co => (
              <div key={co.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg min-w-[50px] text-center">{co.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{co.name}</p>
                  <p className="text-[10px] text-slate-400">{co.employee_count} คน · {co.share_pct}%</p>
                </div>
                <p className="text-sm font-black text-slate-800 whitespace-nowrap">{fmtSh(co.total_cost)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Department breakdown ── */}
      {by_department.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <BarChart3 size={14} className="text-emerald-600"/>
            </div>
            <h3 className="font-black text-slate-800 text-sm">แยกตามแผนก ({by_department.length})</h3>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {by_department.map(d => {
              const w = (d.total_cost / maxDeptCost) * 100
              return (
                <div key={d.id} className="px-2 py-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-slate-700 flex-1 truncate">{d.name}</p>
                    <span className="text-[10px] text-slate-400">{d.employee_count} คน</span>
                    <p className="text-xs font-black text-slate-800 whitespace-nowrap min-w-[80px] text-right">{fmtSh(d.total_cost)}</p>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${w}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function KpiCard({ icon: Icon, label, value, suffix, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 relative overflow-hidden">
      <div className={`absolute -top-3 -right-3 w-16 h-16 rounded-2xl bg-gradient-to-br ${color} opacity-15`}/>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
        <Icon size={15} className="text-white"/>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-black text-slate-800 mt-0.5">
        {value}{suffix && <span className="text-xs text-slate-400 ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "blue" | "violet" | "slate" }) {
  const t = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose:    "bg-rose-50 text-rose-700 border-rose-100",
    blue:    "bg-blue-50 text-blue-700 border-blue-100",
    violet:  "bg-violet-50 text-violet-700 border-violet-100",
    slate:   "bg-slate-50 text-slate-700 border-slate-100",
  }[tone]
  return (
    <div className={`border rounded-xl px-3 py-2 ${t}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-base font-black mt-0.5">{value}</p>
    </div>
  )
}
