"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, BarChart3, TrendingDown, TrendingUp, Store, Calendar,
  RefreshCw, ChevronRight, AlertTriangle, Award, Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function ReportsPage() {
  const [evals, setEvals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  const load = () => {
    setLoading(true)
    fetch("/api/branch-eval/evaluations").then(r => r.json()).then(d => {
      setEvals((d.evaluations ?? []).filter((e: any) => e.status !== "draft"))
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }, [days])

  const filtered = useMemo(() => evals.filter(e => e.visit_date >= cutoff), [evals, cutoff])

  // ── Top / Bottom branches ──
  const byBranch = useMemo(() => {
    const m = new Map<string, { name: string; code: string; scores: number[]; count: number }>()
    for (const e of filtered) {
      const id = e.branch?.id; if (!id) continue
      const prev = m.get(id) ?? { name: e.branch.name, code: e.branch.code, scores: [] as number[], count: 0 }
      prev.scores.push(Number(e.percentage))
      prev.count++
      m.set(id, prev)
    }
    return Array.from(m, ([id, v]) => ({
      id,
      name: v.name,
      code: v.code,
      avg: v.scores.reduce((s, x) => s + x, 0) / v.scores.length,
      count: v.count,
      min: Math.min(...v.scores),
      max: Math.max(...v.scores),
    })).sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const top5 = byBranch.slice(0, 5)
  const bot5 = byBranch.slice(-5).reverse()

  // ── Trend by week ──
  const trend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>()
    for (const e of filtered) {
      const d = new Date(e.visit_date)
      // ISO week label
      const y = d.getFullYear()
      const onejan = new Date(y, 0, 1)
      const wk = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
      const key = `${y}-W${String(wk).padStart(2, "0")}`
      const prev = buckets.get(key) ?? { sum: 0, n: 0 }
      prev.sum += Number(e.percentage); prev.n++
      buckets.set(key, prev)
    }
    return Array.from(buckets, ([key, v]) => ({ key, avg: v.sum / v.n, n: v.n })).sort((a, b) => a.key.localeCompare(b.key))
  }, [filtered])

  // ── Overall stats ──
  const stats = useMemo(() => {
    if (filtered.length === 0) return { avg: 0, n: 0, reviewed: 0 }
    return {
      n: filtered.length,
      avg: filtered.reduce((s, e) => s + Number(e.percentage), 0) / filtered.length,
      reviewed: filtered.filter(e => e.status === "reviewed").length,
    }
  }, [filtered])

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/admin/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบประเมินสาขา
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" /> รายงาน / สถิติ
          </h2>
          <p className="text-slate-400 text-sm">ข้อมูล {filtered.length} ฟอร์ม ({days} วันย้อนหลัง)</p>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none">
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
            <option value={180}>180 วัน</option>
            <option value={365}>1 ปี</option>
          </select>
          <button onClick={load} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 size={22} className="mx-auto animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <BarChart3 size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-500">ยังไม่มีข้อมูลในช่วงนี้</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Kpi color="indigo" label="คะแนนเฉลี่ย" value={`${stats.avg.toFixed(1)}%`} />
            <Kpi color="emerald" label="รีวิวแล้ว" value={`${stats.reviewed}/${stats.n}`}
              sub={`${stats.n > 0 ? Math.round((stats.reviewed / stats.n) * 100) : 0}%`} />
            <Kpi color="sky" label="สาขาที่ตรวจ" value={byBranch.length} sub={`${filtered.length} visits`} />
            <Kpi color="amber" label="ช่วงคะแนน"
              value={byBranch.length > 0 ? `${Math.round(byBranch[byBranch.length-1].avg)}–${Math.round(byBranch[0].avg)}%` : "—"}
              sub="ต่ำสุด – สูงสุด" />
          </div>

          {/* Trend bar chart */}
          {trend.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-slate-800 mb-3">แนวโน้มคะแนนเฉลี่ยรายสัปดาห์</p>
              <div className="flex items-end gap-1 h-32">
                {trend.map(t => (
                  <div key={t.key} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                    <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                      {t.avg.toFixed(0)}%
                    </div>
                    <div className="w-full bg-gradient-to-t from-indigo-500 to-violet-400 rounded-t transition-all hover:from-indigo-600"
                      style={{ height: `${Math.max(4, (t.avg / 100) * 100)}%` }} />
                    <div className="text-[8px] text-slate-400 font-bold">{t.key.slice(-3)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top / Bottom branches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BranchRanking title="Top 5 สาขาคะแนนสูงสุด" icon={<Award size={14} />} color="emerald" items={top5} />
            <BranchRanking title="Bottom 5 สาขาต้องดูแล" icon={<AlertTriangle size={14} />} color="rose" items={bot5} />
          </div>

          {/* All branches */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <p className="text-sm font-black px-4 py-3 border-b border-slate-100 text-slate-800">ทุกสาขา ({byBranch.length})</p>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase">สาขา</th>
                  <th className="px-4 py-2 text-center text-[10px] font-black text-slate-500 uppercase">จำนวนครั้ง</th>
                  <th className="px-4 py-2 text-center text-[10px] font-black text-slate-500 uppercase">ต่ำสุด</th>
                  <th className="px-4 py-2 text-center text-[10px] font-black text-slate-500 uppercase">เฉลี่ย</th>
                  <th className="px-4 py-2 text-center text-[10px] font-black text-slate-500 uppercase">สูงสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byBranch.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-sm">{b.name}</p>
                      <p className="text-[10px] text-slate-400">{b.code}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-600">{b.count}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-rose-600 font-bold">{b.min.toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-sm font-black ${
                        b.avg >= 80 ? "text-emerald-600"
                        : b.avg >= 60 ? "text-amber-600"
                        : "text-rose-600"
                      }`}>{b.avg.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-emerald-600 font-bold">{b.max.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ color, label, value, sub }: any) {
  const palette: Record<string, { bg: string; text: string }> = {
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-700" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700" },
  }
  const p = palette[color]
  return (
    <div className={`${p.bg} border border-white rounded-2xl p-3 shadow-sm`}>
      <p className={`text-[10px] font-bold uppercase ${p.text} opacity-80`}>{label}</p>
      <p className={`text-2xl font-black ${p.text} leading-tight`}>{value}</p>
      {sub && <p className={`text-[10px] font-bold ${p.text} opacity-60 mt-0.5`}>{sub}</p>}
    </div>
  )
}

function BranchRanking({ title, icon, color, items }: any) {
  const palette: Record<string, { ring: string; text: string }> = {
    emerald: { ring: "border-emerald-200", text: "text-emerald-700" },
    rose:    { ring: "border-rose-200",    text: "text-rose-700" },
  }
  const p = palette[color]
  return (
    <div className={`bg-white border ${p.ring} rounded-2xl shadow-sm overflow-hidden`}>
      <p className={`px-4 py-3 border-b ${p.ring} text-sm font-black inline-flex items-center gap-1.5 ${p.text}`}>{icon} {title}</p>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">—</p>
      ) : items.map((b: any, i: number) => (
        <div key={b.id} className="px-4 py-2 flex items-center gap-3 border-b last:border-b-0 border-slate-50">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${p.text} bg-slate-50`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{b.name}</p>
            <p className="text-[10px] text-slate-400">{b.count} ครั้ง</p>
          </div>
          <span className={`text-sm font-black ${p.text}`}>{b.avg.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}
