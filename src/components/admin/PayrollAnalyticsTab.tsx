"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Banknote, Building2, Users, Tag, Loader2, RefreshCw, TrendingUp,
  PieChart as PieIcon, BarChart3, ChevronRight, Percent, Award, AlertCircle,
  Layers, Calendar, Sparkles, ArrowUpRight, Target, Search, ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { useBrands } from "@/lib/hooks/useBrands"
import type { Brand } from "@/lib/utils/brands"

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")
const fmtSh = (n: number) => {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}k`
  return `฿${fmt(n)}`
}
function hexToRgba(hex: string, a = 0.15): string {
  if (!hex) return `rgba(99,102,241,${a})`
  const m = hex.replace("#", "").match(/.{1,2}/g)
  if (!m || m.length < 3) return `rgba(99,102,241,${a})`
  const [r, g, b] = m.map(x => parseInt(x, 16))
  return `rgba(${r},${g},${b},${a})`
}

// ── Brand logo / avatar ──
function BrandLogo({ brand, size = 32 }: { brand: { name: string; logo_url?: string | null; color_hex?: string | null }; size?: number }) {
  const [err, setErr] = useState(false)
  const showLogo = brand.logo_url && !err
  return (
    <div className="rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-white border border-slate-100"
      style={{ width: size, height: size, backgroundColor: showLogo ? "white" : (brand.color_hex || "#94a3b8") }}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo_url!} alt={brand.name} className="w-full h-full object-contain p-0.5"
          onError={() => setErr(true)}/>
      ) : (
        <span className="text-[9px] font-black text-white">{brand.name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}

// ── Donut for brand share ──
function BrandDonut({ data, total }: { data: Array<{ name: string; value: number; color: string }>; total: number }) {
  const r = 54, circ = 2 * Math.PI * r
  let off = 0
  const arcs = data.map(d => {
    const pct = total > 0 ? d.value / total : 0
    const len = pct * circ
    const arc = { color: d.color, da: `${len} ${circ - len}`, do: -(off) + (circ * 0.25) }
    off += len
    return arc
  })
  return (
    <div className="relative flex items-center justify-center">
      <svg width={150} height={150} className="-rotate-90">
        <circle cx={75} cy={75} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14}/>
        {arcs.map((a, i) => (
          <circle key={i} cx={75} cy={75} r={r} fill="none" stroke={a.color} strokeWidth={14}
            strokeDasharray={a.da} strokeDashoffset={a.do}/>
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-base font-black text-slate-800">{fmtSh(total)}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">รวม</p>
      </div>
    </div>
  )
}

interface Props {
  companyId: string
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
  const { brands: brandRecords } = useBrands()
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodKey, setPeriodKey] = useState<string>("")
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showAllEmps, setShowAllEmps] = useState<Record<string, boolean>>({})

  // ── Build brand info map from DB ──
  const brandInfo = useMemo(() => {
    const m = new Map<string, Brand>()
    for (const b of brandRecords) m.set(b.name, b)
    return m
  }, [brandRecords])

  const getColor = (name: string): string => brandInfo.get(name)?.color_hex || "#64748b"
  const getInfo  = (name: string) => brandInfo.get(name) || { name, logo_url: null, color_hex: null }

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (companyId && companyId !== "all") sp.set("company_id", companyId)
    if (periodKey) {
      const [y, m] = periodKey.split("-")
      sp.set("year", y); sp.set("month", m)
    }
    const res = await fetch(`/api/dashboard/payroll-insights?${sp.toString()}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [companyId, periodKey])

  useEffect(() => { load() }, [load])

  const activeBrands = useMemo(() => {
    const list = data?.by_brand.filter(b => b.employee_count > 0) ?? []
    if (!search.trim()) return list
    const s = search.toLowerCase()
    return list.filter(b => b.brand.toLowerCase().includes(s))
  }, [data, search])
  const idleBrands = useMemo(() => data?.by_brand.filter(b => b.employee_count === 0) ?? [], [data])
  const totalBrandCost = useMemo(() => (data?.by_brand ?? []).filter(b => b.employee_count > 0).reduce((s, b) => s + b.total_cost, 0), [data])
  const maxBrandCost = useMemo(() => Math.max(...activeBrands.map(b => b.total_cost), 1), [activeBrands])
  const maxDeptCost  = useMemo(() => Math.max(...(data?.by_department ?? []).map(d => d.total_cost), 1), [data])
  const maxCoCost    = useMemo(() => Math.max(...(data?.by_company ?? []).map(c => c.total_cost), 1), [data])

  // donut: top 7 + อื่นๆ — color from DB
  const donutData = useMemo(() => {
    const all = (data?.by_brand ?? []).filter(b => b.employee_count > 0)
    const sorted = [...all].sort((a, b) => b.total_cost - a.total_cost)
    const top = sorted.slice(0, 7).map(b => ({ name: b.brand, value: b.total_cost, color: getColor(b.brand) }))
    const restSum = sorted.slice(7).reduce((s, b) => s + b.total_cost, 0)
    if (restSum > 0) top.push({ name: "อื่นๆ", value: restSum, color: "#cbd5e1" })
    return top
  }, [data, brandInfo]) // eslint-disable-line

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center gap-2.5">
        <Loader2 size={24} className="animate-spin text-indigo-400"/>
        <p className="text-xs text-slate-400">กำลังวิเคราะห์...</p>
      </div>
    )
  }
  if (!data) return null

  const { summary, brand_coverage, period, by_company, by_department, periods } = data
  const cov = brand_coverage
  const allocPct = cov.with_brand > 0 ? Math.round((cov.with_allocations / cov.with_brand) * 100) : 0
  const brandPct = cov.total_with_payroll > 0 ? Math.round((cov.with_brand / cov.total_with_payroll) * 100) : 0

  return (
    <div className="space-y-4">

      {/* ═══ COMPACT HERO ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-md">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-purple-400/30 rounded-full blur-3xl pointer-events-none"/>

        <div className="relative p-4 lg:p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Banknote size={18} className="text-white"/>
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Payroll Analytics</p>
                <h2 className="text-lg font-black text-white">วิเคราะห์เงินเดือน · {period.label}</h2>
                {!period.hasData && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-400/30 text-amber-100 text-[10px] font-bold">ไม่มีข้อมูล</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select value={periodKey} onChange={e => setPeriodKey(e.target.value)}
                className="bg-white/15 backdrop-blur border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white outline-none cursor-pointer">
                <option value="" className="text-slate-800">งวดล่าสุด</option>
                {periods.map(p => (
                  <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`} className="text-slate-800">{p.label}</option>
                ))}
              </select>
              {isSuperAdmin && companies.length > 0 && (
                <select value={companyId} onChange={e => onCompanyChange(e.target.value)}
                  className="bg-white/15 backdrop-blur border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white outline-none cursor-pointer">
                  <option value="" className="text-slate-800">ทุกบริษัท</option>
                  {companies.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.name_th}</option>)}
                </select>
              )}
              <button onClick={load} disabled={loading}
                className="p-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-lg text-white hover:bg-white/25 disabled:opacity-50">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""}/>
              </button>
            </div>
          </div>

          {/* KPI strip — tighter, 4-up */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <HeroKpi icon={Users}      label="พนักงาน"    value={fmt(summary.employee_count)} suffix=" คน"/>
            <HeroKpi icon={Banknote}   label="Gross"      value={fmtSh(summary.total_gross)} highlight/>
            <HeroKpi icon={TrendingUp} label="Net"        value={fmtSh(summary.total_net)}/>
            <HeroKpi icon={Award}      label="เฉลี่ย/คน" value={fmtSh(summary.avg_gross)}/>
          </div>
        </div>
      </div>

      {/* ═══ BRAND ANALYSIS ═══ — main section, 2-column */}
      {data.by_brand.some(b => b.employee_count > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <PieIcon size={14} className="text-white"/>
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-sm">ต้นทุนการจ้างงาน · แยกตามแบรนด์</h3>
              <p className="text-[10px] text-slate-400">{activeBrands.length} แบรนด์ที่มีคนดูแล · กระจายตาม % allocation</p>
            </div>
            {/* search */}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นแบรนด์..."
                className="pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 w-44"/>
            </div>
          </div>

          <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">

            {/* Left: Donut + legend */}
            <div className="lg:sticky lg:top-3 space-y-3">
              <BrandDonut data={donutData} total={totalBrandCost}/>
              <div className="space-y-1">
                {donutData.map(d => {
                  const pct = totalBrandCost > 0 ? Math.round((d.value / totalBrandCost) * 100) : 0
                  const info = d.name === "อื่นๆ" ? null : getInfo(d.name)
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-[11px]">
                      {info ? <BrandLogo brand={info} size={18}/> : <span className="w-[18px] h-[18px] rounded shrink-0" style={{ backgroundColor: d.color }}/>}
                      <span className="flex-1 truncate font-semibold text-slate-700">{d.name}</span>
                      <span className="font-black text-slate-800">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Brand list — tighter rows */}
            <div className="space-y-1.5">
              {activeBrands.map(b => {
                const color = getColor(b.brand)
                const info  = getInfo(b.brand)
                const w = (b.total_cost / maxBrandCost) * 100
                const isOpen = expandedBrand === b.brand
                const sharePct = totalBrandCost > 0 ? Math.round((b.total_cost / totalBrandCost) * 1000) / 10 : 0
                const showAll = !!showAllEmps[b.brand]
                const earners = showAll ? b.top_earners : b.top_earners.slice(0, 5)
                return (
                  <div key={b.brand}
                    className={`rounded-xl border transition-all ${
                      isOpen ? "border-indigo-300 shadow-sm" : "border-slate-100 hover:border-slate-200"
                    }`}
                    style={isOpen ? { backgroundColor: hexToRgba(color, 0.04) } : undefined}>
                    {/* Row header */}
                    <button onClick={() => setExpandedBrand(isOpen ? null : b.brand)}
                      className="w-full px-3 py-2 text-left">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo brand={info} size={32}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-black text-slate-800 truncate">{b.brand}</p>
                            <span className="text-[10px] font-bold text-slate-500">· {b.employee_count} คน</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${w}%`, backgroundColor: color }}/>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-800 leading-tight">{fmtSh(b.total_cost)}</p>
                          <p className="text-[9px] font-bold leading-tight" style={{ color }}>{sharePct}% · ⌀{fmtSh(b.avg_cost)}</p>
                        </div>
                        <ChevronRight size={11} className={`text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`}/>
                      </div>
                    </button>

                    {/* Expanded: ALL employees */}
                    {isOpen && b.top_earners.length > 0 && (
                      <div className="border-t border-slate-100 px-2.5 py-2 space-y-0.5">
                        <div className="flex items-center justify-between mb-1 px-1">
                          <p className="text-[9px] font-black uppercase tracking-wide flex items-center gap-1" style={{ color }}>
                            <Award size={9}/> ผู้รับผลประโยชน์ · {b.top_earners.length} คน
                          </p>
                          {b.top_earners.length > 5 && (
                            <button onClick={() => setShowAllEmps(s => ({ ...s, [b.brand]: !showAll }))}
                              className="text-[9px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5">
                              {showAll ? "ย่อ" : `+${b.top_earners.length - 5} เพิ่มเติม`}
                              <ChevronDown size={9} className={showAll ? "rotate-180" : ""}/>
                            </button>
                          )}
                        </div>
                        {earners.map((e, idx) => (
                          <Link key={e.id} href={`/admin/employees/${e.id}`}
                            className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all group">
                            <span className="text-[9px] font-black text-slate-400 w-3 text-center">{idx + 1}</span>
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                              {e.avatar_url
                                ? // eslint-disable-next-line @next/next/no-img-element
                                  <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/>
                                : <span className="text-[9px] font-bold text-slate-500">{e.name?.[0] || "?"}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 truncate">{e.name}</p>
                              <p className="text-[9px] text-slate-400 truncate">{e.code}</p>
                            </div>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-black text-[9px] shrink-0"
                              style={{ backgroundColor: hexToRgba(color, 0.15), color }}>
                              <Percent size={7}/>{e.pct}
                            </span>
                            <p className="text-[11px] font-black text-slate-800 whitespace-nowrap min-w-[55px] text-right">{fmtSh(e.cost)}</p>
                            <ArrowUpRight size={9} className="text-slate-300 group-hover:text-indigo-500 transition-colors"/>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {activeBrands.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  {search ? `ไม่พบแบรนด์ "${search}"` : "ไม่มีข้อมูลในงวดนี้"}
                </div>
              )}

              {idleBrands.length > 0 && !search && (
                <details className="mt-2">
                  <summary className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1 px-1 py-1">
                    <Layers size={9}/> ยังไม่มีคนดูแล ({idleBrands.length})
                  </summary>
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {idleBrands.map(b => (
                      <span key={b.brand} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-dashed border-slate-200 rounded">
                        <BrandLogo brand={getInfo(b.brand)} size={14}/> {b.brand}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2-col: Data Quality + Company ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Data Quality */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Target size={13} className="text-white"/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">คุณภาพข้อมูล</h3>
              <p className="text-[10px] text-slate-400">ความครอบคลุมที่ใช้คำนวณต้นทุน</p>
            </div>
          </div>

          <div className="space-y-2 mb-2.5">
            <ProgressTile label="พนักงานมีแบรนด์" value={cov.with_brand} total={cov.total_with_payroll}
              pct={brandPct} tone="emerald"
              hint={cov.no_brand > 0 ? `ยังไม่มี ${cov.no_brand}` : "ครบถ้วน"}/>
            <ProgressTile label="กรอก % แบรนด์" value={cov.with_allocations} total={cov.with_brand}
              pct={allocPct} tone="indigo"
              hint={cov.without_allocations > 0 ? `หารเท่ากันให้ ${cov.without_allocations}` : "ครบถ้วน"}/>
          </div>

          {/* Compact stats grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <MiniStat label="แบรนด์เดียว" value={cov.single_brand} icon={Tag} tone="blue"/>
            <MiniStat label="หลายแบรนด์" value={cov.multi_brand} icon={Layers} tone="violet"/>
            <MiniStat label="เฉลี่ย/คน" value={cov.avg_brands_per_person} suffix=" แบรนด์" icon={Sparkles} tone="amber"/>
            <MiniStat label="ไม่มีแบรนด์" value={cov.no_brand} icon={AlertCircle} tone="rose"/>
          </div>
        </div>

        {/* Company breakdown */}
        {by_company.length > 1 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Building2 size={13} className="text-white"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm">แยกตามบริษัท</h3>
                <p className="text-[10px] text-slate-400">{by_company.length} บริษัท</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {by_company.map((co, i) => {
                const w = (co.total_cost / maxCoCost) * 100
                const colors = ["bg-indigo-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-blue-500"]
                const grad = colors[i % colors.length]
                return (
                  <div key={co.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                    <div className={`w-7 h-7 rounded-md ${grad} flex items-center justify-center text-white font-black text-[9px] shrink-0`}>
                      {co.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{co.name.replace("บริษัท ", "").replace(" จำกัด", "")}</p>
                        <span className="text-[9px] text-slate-400 ml-auto">{co.employee_count} คน</span>
                        <span className="text-[10px] font-black text-slate-800 whitespace-nowrap">{fmtSh(co.total_cost)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${grad} rounded-full transition-all duration-500`} style={{ width: `${w}%` }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // Dept goes here when no company breakdown
          by_department.length > 0 && <DeptCard list={by_department.slice(0, 8)} max={maxDeptCost} total={by_department.length}/>
        )}
      </div>

      {/* ═══ Department breakdown — full width ═══ */}
      {by_company.length > 1 && by_department.length > 0 && (
        <DeptCard list={by_department} max={maxDeptCost} total={by_department.length}/>
      )}

    </div>
  )
}

// ── Department card ──
function DeptCard({ list, max, total }: { list: Insights["by_department"]; max: number; total: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <BarChart3 size={13} className="text-white"/>
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-sm">แยกตามแผนก</h3>
          <p className="text-[10px] text-slate-400">{total} แผนก</p>
        </div>
      </div>
      <div className="space-y-0.5 max-h-[360px] overflow-y-auto pr-1">
        {list.map((d, i) => {
          const w = (d.total_cost / max) * 100
          return (
            <div key={d.id} className="px-2 py-1.5 hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                <p className="text-[11px] font-bold text-slate-700 flex-1 truncate">{d.name}</p>
                <span className="text-[9px] text-slate-400">{d.employee_count} คน</span>
                <p className="text-[11px] font-black text-slate-800 whitespace-nowrap min-w-[60px] text-right">{fmtSh(d.total_cost)}</p>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden ml-7">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${w}%` }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Hero KPI tile (compact) ──
function HeroKpi({ icon: Icon, label, value, suffix, highlight }: any) {
  return (
    <div className={`relative overflow-hidden rounded-xl backdrop-blur p-2.5 border border-white/20 ${highlight ? "bg-white/20" : "bg-white/10"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-white/80"/>
        <p className="text-[9px] font-bold text-white/80 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-base font-black text-white leading-tight">
        {value}{suffix && <span className="text-[10px] text-white/70 font-normal">{suffix}</span>}
      </p>
    </div>
  )
}

// ── Progress tile (compact) ──
function ProgressTile({ label, value, total, pct, tone, hint }: {
  label: string; value: number; total: number; pct: number
  tone: "emerald" | "indigo"; hint: string
}) {
  const t = {
    emerald: { from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    indigo:  { from: "from-indigo-500",  to: "to-purple-500", text: "text-indigo-700", bg: "bg-indigo-50" },
  }[tone]
  return (
    <div className={`${t.bg} rounded-xl p-2.5 border border-slate-100`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{label}</p>
        <p className={`text-base font-black ${t.text} leading-none`}>{pct}%</p>
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1">
        <div className={`h-full bg-gradient-to-r ${t.from} ${t.to} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <p className="text-slate-500"><b className="text-slate-700">{value}</b>/{total} คน</p>
        <p className="text-slate-400 font-semibold">{hint}</p>
      </div>
    </div>
  )
}

// ── Mini stat (compact) ──
function MiniStat({ label, value, suffix, icon: Icon, tone }: {
  label: string; value: number | string; suffix?: string; icon: any
  tone: "blue" | "violet" | "amber" | "rose"
}) {
  const t = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   icon: "text-blue-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-500" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-700",  icon: "text-amber-500" },
    rose:   { bg: "bg-rose-50",   text: "text-rose-700",   icon: "text-rose-500" },
  }[tone]
  return (
    <div className={`${t.bg} border border-slate-100 rounded-lg p-2 flex items-center gap-2`}>
      <Icon size={13} className={t.icon}/>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate leading-tight">{label}</p>
        <p className={`text-sm font-black ${t.text} leading-tight`}>{value}{suffix && <span className="text-[9px] text-slate-400">{suffix}</span>}</p>
      </div>
    </div>
  )
}
