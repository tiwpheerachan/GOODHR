"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, BarChart3, Store, RefreshCw, Loader2,
  AlertTriangle, Award, Download, Users, FileSpreadsheet,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

type Tab = "overview" | "branches" | "evaluators"

export default function ReportsPage() {
  const [evals, setEvals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)
  const [tab, setTab] = useState<Tab>("overview")
  const [exporting, setExporting] = useState(false)

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

  // ── Per-branch ──
  const byBranch = useMemo(() => {
    const m = new Map<string, { name: string; code: string; scores: number[]; count: number; lastDate: string }>()
    for (const e of filtered) {
      const id = e.branch?.id; if (!id) continue
      const prev = m.get(id) ?? { name: e.branch.name, code: e.branch.code, scores: [] as number[], count: 0, lastDate: "" }
      prev.scores.push(Number(e.percentage))
      prev.count++
      if (e.visit_date > prev.lastDate) prev.lastDate = e.visit_date
      m.set(id, prev)
    }
    return Array.from(m, ([id, v]) => ({
      id, name: v.name, code: v.code,
      avg: v.scores.reduce((s, x) => s + x, 0) / v.scores.length,
      count: v.count,
      min: Math.min(...v.scores),
      max: Math.max(...v.scores),
      lastDate: v.lastDate,
    })).sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const top5 = byBranch.slice(0, 5)
  const bot5 = byBranch.slice(-5).reverse()

  // ── Per-evaluator ──
  const byEvaluator = useMemo(() => {
    const m = new Map<string, {
      id: string; name: string; nickname: string; code: string
      visits: number; branches: Set<string>; scores: number[]; lastDate: string
    }>()
    for (const e of filtered) {
      const ev = e.evaluator; if (!ev) continue
      const prev = m.get(ev.id) ?? {
        id: ev.id,
        name: `${ev.first_name_th} ${ev.last_name_th}`,
        nickname: ev.nickname ?? "",
        code: ev.employee_code ?? "",
        visits: 0,
        branches: new Set<string>(),
        scores: [] as number[],
        lastDate: "",
      }
      prev.visits++
      if (e.branch?.id) prev.branches.add(e.branch.id)
      prev.scores.push(Number(e.percentage))
      if (e.visit_date > prev.lastDate) prev.lastDate = e.visit_date
      m.set(ev.id, prev)
    }
    return Array.from(m.values()).map(v => ({
      ...v,
      branchCount: v.branches.size,
      avg: v.scores.length > 0 ? v.scores.reduce((s, x) => s + x, 0) / v.scores.length : 0,
      min: v.scores.length > 0 ? Math.min(...v.scores) : 0,
      max: v.scores.length > 0 ? Math.max(...v.scores) : 0,
    })).sort((a, b) => b.visits - a.visits)
  }, [filtered])

  // ── Trend by week ──
  const trend = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>()
    for (const e of filtered) {
      const d = new Date(e.visit_date)
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

  // ── XLSX export — รวมหลาย sheet ──
  const exportXlsx = async () => {
    if (filtered.length === 0) { toast.error("ไม่มีข้อมูล"); return }
    setExporting(true)
    const t = toast.loading("กำลังสร้างไฟล์...")
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Summary
      const summary = [
        ["รายงานประเมินสาขา", ""],
        ["วันที่ออกรายงาน", format(new Date(), "d MMM yyyy HH:mm", { locale: th })],
        ["ช่วงข้อมูล", `${days} วันย้อนหลัง (ตั้งแต่ ${cutoff})`],
        [""],
        ["จำนวนฟอร์มทั้งหมด", stats.n],
        ["จำนวนรีวิวแล้ว", stats.reviewed],
        ["คะแนนเฉลี่ย (%)", Number(stats.avg.toFixed(2))],
        ["จำนวนสาขาที่ตรวจ", byBranch.length],
        ["จำนวนผู้ตรวจ", byEvaluator.length],
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summary)
      wsSummary["!cols"] = [{ wch: 30 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุป")

      // Sheet 2: All evaluations (detail)
      const allRows = filtered.map(e => ({
        "วันที่ตรวจ": e.visit_date,
        "สาขา": e.branch?.name ?? "",
        "รหัสสาขา": e.branch?.code ?? "",
        "เทมเพลต": e.template?.name ?? "",
        "ผู้ตรวจ": e.evaluator ? `${e.evaluator.first_name_th} ${e.evaluator.last_name_th}` : "",
        "รหัสพนักงาน": e.evaluator?.employee_code ?? "",
        "คะแนน (%)": Number(Number(e.percentage).toFixed(2)),
        "คะแนนได้": Number(e.total_score),
        "คะแนนเต็ม": Number(e.total_weight),
        "สถานะ": e.status === "submitted" ? "รอรีวิว" : e.status === "reviewed" ? "รีวิวแล้ว" : "ร่าง",
        "เช็คอินเวลา": e.checkin_at ? format(new Date(e.checkin_at), "yyyy-MM-dd HH:mm") : "",
        "ห่างจากสาขา (m)": e.checkin_distance_m ?? "",
      }))
      const wsAll = XLSX.utils.json_to_sheet(allRows)
      wsAll["!cols"] = [
        { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 25 },
        { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      ]
      XLSX.utils.book_append_sheet(wb, wsAll, "ฟอร์มทั้งหมด")

      // Sheet 3: Branch summary
      const branchRows = byBranch.map(b => ({
        "สาขา": b.name,
        "รหัส": b.code,
        "จำนวนครั้ง": b.count,
        "คะแนนต่ำสุด (%)": Number(b.min.toFixed(2)),
        "คะแนนเฉลี่ย (%)": Number(b.avg.toFixed(2)),
        "คะแนนสูงสุด (%)": Number(b.max.toFixed(2)),
        "ตรวจครั้งล่าสุด": b.lastDate,
        "เกรด": b.avg >= 90 ? "A" : b.avg >= 75 ? "B" : b.avg >= 60 ? "C" : "D",
      }))
      const wsBranches = XLSX.utils.json_to_sheet(branchRows)
      wsBranches["!cols"] = [
        { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 },
      ]
      XLSX.utils.book_append_sheet(wb, wsBranches, "สรุปรายสาขา")

      // Sheet 4: Per-evaluator
      const evalRows = byEvaluator.map(ev => ({
        "ผู้ตรวจ": ev.name + (ev.nickname ? ` (${ev.nickname})` : ""),
        "รหัสพนักงาน": ev.code,
        "จำนวนครั้งที่ตรวจ": ev.visits,
        "จำนวนสาขาที่ตรวจ": ev.branchCount,
        "คะแนนต่ำสุดที่ให้ (%)": Number(ev.min.toFixed(2)),
        "คะแนนเฉลี่ยที่ให้ (%)": Number(ev.avg.toFixed(2)),
        "คะแนนสูงสุดที่ให้ (%)": Number(ev.max.toFixed(2)),
        "ตรวจครั้งล่าสุด": ev.lastDate,
      }))
      const wsEvals = XLSX.utils.json_to_sheet(evalRows)
      wsEvals["!cols"] = [
        { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, wsEvals, "สรุปรายผู้ตรวจ")

      // Sheet 5: Weekly trend
      const trendRows = trend.map(t => ({
        "สัปดาห์": t.key,
        "จำนวนฟอร์ม": t.n,
        "คะแนนเฉลี่ย (%)": Number(t.avg.toFixed(2)),
      }))
      const wsTrend = XLSX.utils.json_to_sheet(trendRows)
      wsTrend["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, wsTrend, "แนวโน้มรายสัปดาห์")

      const filename = `branch-eval-report_${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`ดาวน์โหลด ${filename}`, { id: t })
    } catch (e: any) {
      toast.error(e?.message || "Export ไม่สำเร็จ", { id: t })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/admin/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบประเมินสาขา
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" /> รายงาน / Dashboard
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
          <button onClick={exportXlsx} disabled={exporting || filtered.length === 0}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
            ดาวน์โหลด Excel
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
            <Kpi color="amber" label="ผู้ตรวจ" value={byEvaluator.length} sub="คน" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 ภาพรวม</TabBtn>
            <TabBtn active={tab === "branches"} onClick={() => setTab("branches")}>🏪 รายสาขา</TabBtn>
            <TabBtn active={tab === "evaluators"} onClick={() => setTab("evaluators")}>👤 รายผู้ตรวจ</TabBtn>
          </div>

          {/* Tab: Overview */}
          {tab === "overview" && (
            <>
              {trend.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-sm font-black text-slate-800 mb-3">แนวโน้มคะแนนเฉลี่ยรายสัปดาห์</p>
                  <div className="flex items-end gap-1 h-32">
                    {trend.map(t => (
                      <div key={t.key} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                        <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                          {t.avg.toFixed(0)}% · {t.n}
                        </div>
                        <div className="w-full bg-gradient-to-t from-indigo-500 to-violet-400 rounded-t transition-all hover:from-indigo-600"
                          style={{ height: `${Math.max(4, (t.avg / 100) * 100)}%` }} />
                        <div className="text-[8px] text-slate-400 font-bold">{t.key.slice(-3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <BranchRanking title="Top 5 สาขาคะแนนสูงสุด" icon={<Award size={14} />} color="emerald" items={top5} />
                <BranchRanking title="Bottom 5 สาขาต้องดูแล" icon={<AlertTriangle size={14} />} color="rose" items={bot5} />
              </div>
            </>
          )}

          {/* Tab: Branches */}
          {tab === "branches" && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <p className="text-sm font-black px-4 py-3 border-b border-slate-100 text-slate-800">
                เปรียบเทียบรายสาขา ({byBranch.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <Th>#</Th>
                      <Th>สาขา</Th>
                      <Th center>ตรวจ</Th>
                      <Th center>ต่ำสุด</Th>
                      <Th center>เฉลี่ย</Th>
                      <Th center>สูงสุด</Th>
                      <Th center>เกรด</Th>
                      <Th>ครั้งล่าสุด</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byBranch.map((b, i) => {
                      const grade = b.avg >= 90 ? "A" : b.avg >= 75 ? "B" : b.avg >= 60 ? "C" : "D"
                      const gradeColor = grade === "A" ? "bg-emerald-500"
                        : grade === "B" ? "bg-sky-500"
                        : grade === "C" ? "bg-amber-500" : "bg-rose-500"
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-sm">{b.name}</p>
                            <p className="text-[10px] text-slate-400">{b.code}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{b.count}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-rose-600 font-bold">{b.min.toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`text-sm font-black ${
                                b.avg >= 80 ? "text-emerald-600"
                                : b.avg >= 60 ? "text-amber-600"
                                : "text-rose-600"
                              }`}>{b.avg.toFixed(1)}%</span>
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden md:block">
                                <div className={`h-full ${
                                  b.avg >= 80 ? "bg-emerald-500"
                                  : b.avg >= 60 ? "bg-amber-500" : "bg-rose-500"
                                }`} style={{ width: `${Math.min(100, b.avg)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-emerald-600 font-bold">{b.max.toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded-md text-white font-black text-xs ${gradeColor}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] text-slate-500">
                            {b.lastDate && format(new Date(b.lastDate), "d MMM yyyy", { locale: th })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Evaluators */}
          {tab === "evaluators" && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users size={14} className="text-indigo-500" />
                <p className="text-sm font-black text-slate-800">เปรียบเทียบรายผู้ตรวจ ({byEvaluator.length})</p>
              </div>
              {byEvaluator.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีผู้ตรวจในช่วงนี้</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <Th>#</Th>
                        <Th>ผู้ตรวจ</Th>
                        <Th center>จำนวนตรวจ</Th>
                        <Th center>จำนวนสาขา</Th>
                        <Th center>คะแนนต่ำ</Th>
                        <Th center>คะแนนเฉลี่ย</Th>
                        <Th center>คะแนนสูง</Th>
                        <Th>ตรวจล่าสุด</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byEvaluator.map((ev, i) => (
                        <tr key={ev.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-sm">
                              {ev.name}
                              {ev.nickname && <span className="text-xs text-slate-400 ml-1">({ev.nickname})</span>}
                            </p>
                            <p className="text-[10px] text-slate-400">{ev.code}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                              {ev.visits} ครั้ง
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{ev.branchCount}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-rose-600 font-bold">{ev.min.toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-sm font-black ${
                              ev.avg >= 80 ? "text-emerald-600"
                              : ev.avg >= 60 ? "text-amber-600"
                              : "text-rose-600"
                            }`}>{ev.avg.toFixed(1)}%</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-emerald-600 font-bold">{ev.max.toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-[10px] text-slate-500">
                            {ev.lastDate && format(new Date(ev.lastDate), "d MMM yyyy", { locale: th })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
        active ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}>
      {children}
    </button>
  )
}

function Th({ children, center }: any) {
  return <th className={`px-3 py-2 text-[10px] font-black text-slate-500 uppercase ${center ? "text-center" : "text-left"}`}>{children}</th>
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
