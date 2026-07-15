"use client"
import { useEffect, useState, useMemo } from "react"
import {
  TrendingUp, Package, Users, CircleDollarSign, Trophy, Calendar,
  Loader2, RefreshCw, Store, Building2, Tag, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function DashboardTab({ canSeeAll, canSeeTeam }: { canSeeAll: boolean; canSeeTeam: boolean }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")

  const [scope, setScope] = useState<string>(canSeeAll ? "all" : canSeeTeam ? "team" : "me")
  const [start, setStart] = useState(monthStart)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>("all")

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ scope, start, end, source })
      const res = await fetch(`/api/products/sales?${p}`)
      const d = await res.json()
      if (res.ok) setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [scope, start, end, source])

  const quickRange = (days: number | "month" | "today") => {
    const t = new Date()
    if (days === "today") { setStart(today); setEnd(today); return }
    if (days === "month") {
      setStart(format(new Date(t.getFullYear(), t.getMonth(), 1), "yyyy-MM-dd"))
      setEnd(today); return
    }
    const s = new Date(t.getTime() - days * 86400 * 1000)
    setStart(s.toISOString().slice(0, 10))
    setEnd(today)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          {canSeeAll && <ScopeBtn active={scope === "all"} onClick={() => setScope("all")} label="ทั้งหมด"/>}
          {(canSeeAll || canSeeTeam) && <ScopeBtn active={scope === "team"} onClick={() => setScope("team")} label="ทีม"/>}
          <ScopeBtn active={scope === "me"} onClick={() => setScope("me")} label="ของฉัน"/>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          <ScopeBtn active={source === "all"} onClick={() => setSource("all")} label="ทุกที่มา"/>
          <ScopeBtn active={source === "manual"} onClick={() => setSource("manual")} label="พนักงานสแกน"/>
          <ScopeBtn active={source === "import"} onClick={() => setSource("import")} label="Import"/>
        </div>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"/>
        <span className="text-slate-400 text-xs">→</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"/>
        <div className="flex gap-1 flex-wrap">
          {[
            { l: "วันนี้", v: "today" }, { l: "7 วัน", v: 7 }, { l: "30 วัน", v: 30 }, { l: "เดือนนี้", v: "month" },
          ].map(b => (
            <button key={String(b.v)} onClick={() => quickRange(b.v as any)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg">
              {b.l}
            </button>
          ))}
        </div>
        <button onClick={load} className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-500" : "text-slate-500"}/>
        </button>
      </div>

      {loading && !data ? (
        <div className="bg-white rounded-2xl p-12 text-center text-sm text-slate-400 border border-slate-100">
          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-400"/>
          กำลังโหลด...
        </div>
      ) : !data ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            <Kpi color="emerald" icon={<CircleDollarSign size={18}/>} label="ยอดขายรวม" value={`฿${(data.stats?.total_amount || 0).toLocaleString()}`}/>
            <Kpi color="indigo" icon={<Package size={18}/>} label="จำนวนสินค้า" value={(data.stats?.total_qty || 0).toLocaleString()} sub="ชิ้น"/>
            <Kpi color="amber" icon={<TrendingUp size={18}/>} label="ธุรกรรม" value={(data.stats?.transactions || 0).toLocaleString()} sub="รายการ"/>
            <Kpi color="rose" icon={<Users size={18}/>} label="พนักงาน" value={data.stats?.employees || 0} sub="คน"/>
            <Kpi color="purple" icon={<Tag size={18}/>} label="ชนิดสินค้า" value={data.stats?.products || 0} sub="รายการ"/>
          </div>

          {/* Trends + rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <RankingCard title="พนักงานยอดเยี่ยม" icon={<Trophy className="text-amber-500"/>} items={data.by_employee || []}
              renderItem={(it: any, i: number) => (
                <div className="flex items-center gap-2">
                  <RankBadge rank={i + 1}/>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {it.avatar ? <img src={it.avatar} alt="" className="w-full h-full object-cover"/> : <Users size={12} className="text-white"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{it.name}</p>
                    <p className="text-[10px] text-slate-400">{it.count} ชิ้น</p>
                  </div>
                  <p className="text-xs font-black text-emerald-700">฿{it.amount.toLocaleString()}</p>
                </div>
              )}
            />
            <RankingCard title="สินค้าขายดี" icon={<Trophy className="text-emerald-500"/>} items={data.by_product || []}
              renderItem={(it: any, i: number) => (
                <div className="flex items-center gap-2">
                  <RankBadge rank={i + 1}/>
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                    <Package size={12} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{it.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{it.brand || ""} · {it.count} ชิ้น</p>
                  </div>
                  <p className="text-xs font-black text-emerald-700">฿{it.amount.toLocaleString()}</p>
                </div>
              )}
            />
            <DailyTrendCard byDate={data.by_date || []}/>
          </div>

          {/* Branch + channel + category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <RankingCard title="สาขา" icon={<Building2 className="text-indigo-500"/>} items={data.by_branch || []}
              renderItem={(it: any, i: number) => <PlainRow rank={i + 1} name={it.key} count={it.count} amount={it.amount} color="indigo"/>}
            />
            <RankingCard title="ช่องทางขาย" icon={<Store className="text-purple-500"/>} items={data.by_channel || []}
              renderItem={(it: any, i: number) => <PlainRow rank={i + 1} name={it.key} count={it.count} amount={it.amount} color="purple"/>}
            />
            <RankingCard title="หมวดสินค้า" icon={<Tag className="text-pink-500"/>} items={data.by_category || []}
              renderItem={(it: any, i: number) => <PlainRow rank={i + 1} name={it.key} count={it.count} amount={it.amount} color="pink"/>}
            />
          </div>

          {/* สรุปพนักงานแต่ละคน × แต่ละวัน */}
          <EmployeeDailyMatrix matrix={data.by_employee_day} start={start} end={end}/>
        </>
      )}
    </div>
  )
}

// ── ตารางเมทริกซ์: พนักงาน (แถว) × วัน (คอลัมน์) → ยอดขายแต่ละวัน ──
function EmployeeDailyMatrix({ matrix, start, end }: { matrix: any; start: string; end: string }) {
  const dates: string[] = matrix?.dates ?? []
  const rows: any[] = matrix?.rows ?? []
  const dayTotals = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of dates) m[d] = 0
    for (const r of rows) for (const d of dates) m[d] += r.cells?.[d]?.amount || 0
    return m
  }, [matrix]) // eslint-disable-line
  const grand = rows.reduce((n, r) => n + (r.total_amount || 0), 0)

  const fmtDay = (d: string) => { try { return format(new Date(d + "T00:00:00"), "d/M") } catch { return d } }
  const money = (n: number) => n ? `฿${Math.round(n).toLocaleString()}` : "-"

  function exportCsv() {
    const head = ["พนักงาน", ...dates.map(fmtDay), "รวม"]
    const body = rows.map(r => [r.name, ...dates.map(d => String(Math.round(r.cells?.[d]?.amount || 0))), String(Math.round(r.total_amount || 0))])
    const csv = "﻿" + [head, ...body].map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = `sales-by-employee-day_${start}_${end}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        <Calendar size={15} className="text-indigo-500"/>
        <p className="font-black text-sm text-slate-700">ยอดขายพนักงานรายวัน</p>
        <span className="text-[10px] text-slate-400 font-bold">{rows.length} คน · {dates.length} วัน</span>
        <button onClick={exportCsv} className="ml-auto text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1">
          ส่งออก CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-xs text-slate-400">ไม่มีข้อมูล</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-black text-slate-600 min-w-[130px]">พนักงาน</th>
                {dates.map(d => (
                  <th key={d} className="px-2 py-2 text-right font-bold text-slate-500 whitespace-nowrap min-w-[54px]">{fmtDay(d)}</th>
                ))}
                <th className="sticky right-0 z-10 bg-slate-100 px-3 py-2 text-right font-black text-slate-700 min-w-[80px]">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.employee_id} className={i % 2 ? "bg-slate-50/40" : ""}>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 font-bold text-slate-700 truncate max-w-[130px]"
                    style={{ backgroundColor: i % 2 ? "#fafbfc" : "#fff" }}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 text-center text-[9px] font-black text-slate-400">{i + 1}</span>
                      {r.name}
                    </span>
                  </td>
                  {dates.map(d => {
                    const c = r.cells?.[d]
                    return (
                      <td key={d} className={"px-2 py-1.5 text-right tabular-nums " + (c?.amount ? "text-slate-700 font-semibold" : "text-slate-300")}>
                        {money(c?.amount || 0)}
                      </td>
                    )
                  })}
                  <td className="sticky right-0 z-10 px-3 py-1.5 text-right font-black text-emerald-700 tabular-nums"
                    style={{ backgroundColor: i % 2 ? "#f6faf7" : "#fff" }}>
                    ฿{Math.round(r.total_amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-200">
                <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 font-black text-slate-700">รวมรายวัน</td>
                {dates.map(d => (
                  <td key={d} className="px-2 py-2 text-right font-black text-slate-600 tabular-nums whitespace-nowrap">{money(dayTotals[d])}</td>
                ))}
                <td className="sticky right-0 z-10 bg-slate-200 px-3 py-2 text-right font-black text-emerald-800 tabular-nums">฿{Math.round(grand).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

function ScopeBtn({ active, onClick, label }: any) {
  return (
    <button onClick={onClick}
      className={"px-3 py-1 rounded-lg text-[11px] font-black transition " + (active ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700")}>
      {label}
    </button>
  )
}

const COLORS: any = {
  emerald: "from-emerald-500 to-teal-500",
  indigo:  "from-indigo-500 to-blue-500",
  amber:   "from-amber-500 to-orange-500",
  rose:    "from-rose-500 to-pink-500",
  purple:  "from-purple-500 to-fuchsia-500",
  pink:    "from-pink-500 to-rose-500",
}
function Kpi({ color, icon, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 relative overflow-hidden">
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${COLORS[color]} opacity-10`}/>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${COLORS[color]} text-white flex items-center justify-center shadow-sm mb-2`}>{icon}</div>
      <p className="text-[10px] uppercase font-black text-slate-400">{label}</p>
      <p className="text-xl font-black text-slate-800 leading-none mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
function RankBadge({ rank }: { rank: number }) {
  const colors = ["from-amber-400 to-orange-500", "from-slate-300 to-slate-400", "from-orange-700 to-orange-900"]
  if (rank > 3) return <div className="w-5 text-center text-[10px] font-black text-slate-400">{rank}</div>
  return <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colors[rank - 1]} text-white flex items-center justify-center text-[9px] font-black flex-shrink-0`}>{rank}</div>
}
function RankingCard({ title, icon, items, renderItem }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        {icon}
        <p className="font-black text-sm text-slate-700">{title}</p>
        <span className="ml-auto text-[10px] text-slate-400 font-bold">{items.length} รายการ</span>
      </div>
      <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">ไม่มีข้อมูล</p>
        ) : items.slice(0, 30).map((it: any, i: number) => (
          <div key={i} className="px-3 py-2 hover:bg-slate-50">{renderItem(it, i)}</div>
        ))}
      </div>
    </div>
  )
}
function PlainRow({ rank, name, count, amount, color }: any) {
  return (
    <div className="flex items-center gap-2">
      <RankBadge rank={rank}/>
      <p className="flex-1 text-xs font-bold truncate text-slate-700">{name}</p>
      <p className="text-[10px] text-slate-400">{count} ชิ้น</p>
      <p className="text-xs font-black text-emerald-700 tabular-nums">฿{amount.toLocaleString()}</p>
    </div>
  )
}
function DailyTrendCard({ byDate }: { byDate: any[] }) {
  const max = Math.max(1, ...byDate.map(d => d.amount))
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        <Calendar size={14} className="text-indigo-500"/>
        <p className="font-black text-sm text-slate-700">ยอดรายวัน</p>
      </div>
      <div className="p-3 max-h-72 overflow-y-auto">
        {byDate.length === 0 ? (
          <p className="text-center text-xs text-slate-400 p-6">ไม่มีข้อมูล</p>
        ) : byDate.slice(-14).reverse().map(d => (
          <div key={d.date} className="mb-2 last:mb-0">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-slate-500 font-bold">{format(new Date(d.date), "d MMM", { locale: th })}</span>
              <span className="text-emerald-700 font-black">฿{d.amount.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${(d.amount / max) * 100}%` }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
