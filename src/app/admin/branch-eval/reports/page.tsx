"use client"
import { useEffect, useMemo, useState, Fragment } from "react"
import Link from "next/link"
import {
  ArrowLeft, BarChart3, Store, RefreshCw, Loader2,
  AlertTriangle, Award, Download, Users, FileSpreadsheet,
  Sparkles, X, FileText, Mail, Layers, ChevronDown, ChevronRight as ChevRight,
  Calendar, Clock, Target, TrendingUp, ClipboardList,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

type Tab = "overview" | "branches" | "evaluators" | "recipients" | "evaluatees" | "templates" | "assignments"

export default function ReportsPage() {
  const [evals, setEvals] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)
  const [tab, setTab] = useState<Tab>("overview")
  const [exporting, setExporting] = useState(false)
  const [exportingDeep, setExportingDeep] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiBranchId, setAiBranchId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiCharts, setAiCharts] = useState<any | null>(null)
  const [aiStats, setAiStats] = useState<any | null>(null)
  const [aiBranchName, setAiBranchName] = useState<string>("")
  // ── expand state สำหรับ drill-down (key = row id) ──
  const [expandedRow, setExpandedRow] = useState<Set<string>>(new Set())
  const toggleRow = (k: string) => setExpandedRow(prev => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  // ── lastRefresh สำหรับแสดง timestamp + indicator ──
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // ── silent=false: initial load (แสดง skeleton) / silent=true: auto-refresh (ไม่กระตุก) ──
  const load = (silent: boolean = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    Promise.all([
      fetch("/api/branch-eval/evaluations").then(r => r.json()),
      fetch("/api/branch-eval/assignments").then(r => r.json()).catch(() => ({ assignments: [] })),
    ]).then(([e, a]) => {
      setEvals((e.evaluations ?? []).filter((x: any) => x.status !== "draft"))
      setAssignments(a.assignments ?? [])
      setLastRefresh(new Date())
    }).finally(() => {
      if (silent) setRefreshing(false)
      else setLoading(false)
    })
  }
  useEffect(() => { load(false) }, [])

  // ── auto-refresh ทุก 30 วินาที (silent — ไม่กระตุก) ──
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── refresh เมื่อ tab กลับมา active (สลับ tab/window กลับมา) ──
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(true) }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

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

  // ── Per-recipient (target_manager) ──
  const byRecipient = useMemo(() => {
    const m = new Map<string, {
      id: string; name: string; nickname: string
      received: number; branches: Set<string>; templates: Set<string>; scores: number[]; lastDate: string
    }>()
    let unset = 0  // ไม่ระบุผู้รับ
    for (const e of filtered) {
      if (!e.target_manager_id || !e.target_manager) { unset++; continue }
      const tm = e.target_manager
      const prev = m.get(tm.id) ?? {
        id: tm.id,
        name: `${tm.first_name_th} ${tm.last_name_th}`,
        nickname: tm.nickname ?? "",
        received: 0,
        branches: new Set<string>(),
        templates: new Set<string>(),
        scores: [] as number[],
        lastDate: "",
      }
      prev.received++
      if (e.branch?.id) prev.branches.add(e.branch.id)
      if (e.template?.id) prev.templates.add(e.template.id)
      prev.scores.push(Number(e.percentage))
      if (e.visit_date > prev.lastDate) prev.lastDate = e.visit_date
      m.set(tm.id, prev)
    }
    const list = Array.from(m.values()).map(v => ({
      ...v,
      branchCount: v.branches.size,
      templateCount: v.templates.size,
      avg: v.scores.length > 0 ? v.scores.reduce((s, x) => s + x, 0) / v.scores.length : 0,
    })).sort((a, b) => b.received - a.received)
    return { list, unset }
  }, [filtered])

  // ── Per-evaluatee (ผู้ถูกประเมิน) ──
  const byEvaluatee = useMemo(() => {
    const m = new Map<string, {
      id: string; name: string; nickname: string
      count: number; branches: Set<string>; templates: Set<string>; scores: number[]; lastDate: string
    }>()
    let unset = 0
    for (const e of filtered as any[]) {
      if (!e.evaluatee_id || !e.evaluatee) { unset++; continue }
      const ee = e.evaluatee
      const prev = m.get(ee.id) ?? {
        id: ee.id,
        name: `${ee.first_name_th} ${ee.last_name_th}`,
        nickname: ee.nickname ?? "",
        count: 0,
        branches: new Set<string>(),
        templates: new Set<string>(),
        scores: [] as number[],
        lastDate: "",
      }
      prev.count++
      if (e.branch?.id) prev.branches.add(e.branch.id)
      if (e.template?.id) prev.templates.add(e.template.id)
      prev.scores.push(Number(e.percentage))
      if (e.visit_date > prev.lastDate) prev.lastDate = e.visit_date
      m.set(ee.id, prev)
    }
    const list = Array.from(m.values()).map(v => ({
      ...v,
      branchCount: v.branches.size,
      templateCount: v.templates.size,
      avg: v.scores.length > 0 ? v.scores.reduce((s, x) => s + x, 0) / v.scores.length : 0,
    })).sort((a, b) => b.count - a.count)
    return { list, unset }
  }, [filtered])

  // ── Per-template ──
  const byTemplate = useMemo(() => {
    const m = new Map<string, {
      id: string; name: string
      uses: number; branches: Set<string>; evaluators: Set<string>; recipients: Set<string>
      scores: number[]; lastDate: string
    }>()
    for (const e of filtered) {
      if (!e.template?.id) continue
      const t = e.template
      const prev = m.get(t.id) ?? {
        id: t.id, name: t.name,
        uses: 0,
        branches: new Set<string>(),
        evaluators: new Set<string>(),
        recipients: new Set<string>(),
        scores: [] as number[],
        lastDate: "",
      }
      prev.uses++
      if (e.branch?.id) prev.branches.add(e.branch.id)
      if (e.evaluator?.id) prev.evaluators.add(e.evaluator.id)
      if (e.target_manager_id) prev.recipients.add(e.target_manager_id)
      prev.scores.push(Number(e.percentage))
      if (e.visit_date > prev.lastDate) prev.lastDate = e.visit_date
      m.set(t.id, prev)
    }
    return Array.from(m.values()).map(v => ({
      ...v,
      branchCount: v.branches.size,
      evaluatorCount: v.evaluators.size,
      recipientCount: v.recipients.size,
      avg: v.scores.length > 0 ? v.scores.reduce((s, x) => s + x, 0) / v.scores.length : 0,
    })).sort((a, b) => b.uses - a.uses)
  }, [filtered])

  // ── Score distribution (A/B/C/D) ──
  const distribution = useMemo(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0 }
    for (const e of filtered) {
      const p = Number(e.percentage)
      if (p >= 90) buckets.A++
      else if (p >= 75) buckets.B++
      else if (p >= 60) buckets.C++
      else buckets.D++
    }
    const total = filtered.length || 1
    return [
      { grade: "A", label: "ดีเยี่ยม (≥90%)",  count: buckets.A, pct: (buckets.A / total) * 100, color: "emerald" },
      { grade: "B", label: "ดี (75-89%)",       count: buckets.B, pct: (buckets.B / total) * 100, color: "sky" },
      { grade: "C", label: "พอใช้ (60-74%)",   count: buckets.C, pct: (buckets.C / total) * 100, color: "amber" },
      { grade: "D", label: "ต้องปรับปรุง (<60%)", count: buckets.D, pct: (buckets.D / total) * 100, color: "rose" },
    ]
  }, [filtered])

  // ── Activity by day-of-week ──
  const byDayOfWeek = useMemo(() => {
    const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    const counts: { day: string; count: number; sum: number; avg: number }[] = days.map(d => ({ day: d, count: 0, sum: 0, avg: 0 }))
    for (const e of filtered) {
      const dow = new Date(e.visit_date).getDay()
      counts[dow].count++
      counts[dow].sum += Number(e.percentage)
    }
    for (const c of counts) c.avg = c.count > 0 ? c.sum / c.count : 0
    return counts
  }, [filtered])

  // ── Branch quadrant — visits × avg score ──
  const branchQuadrant = useMemo(() => {
    if (byBranch.length === 0) return { stars: [], focus: [], steady: [], forgotten: [] }
    const avgVisits = byBranch.reduce((s, b) => s + b.count, 0) / byBranch.length
    const stars: typeof byBranch = []      // high visits, high score
    const focus: typeof byBranch = []      // high visits, low score
    const steady: typeof byBranch = []     // low visits, high score
    const forgotten: typeof byBranch = []  // low visits, low score
    for (const b of byBranch) {
      const highVisits = b.count >= avgVisits
      const highScore = b.avg >= 75
      if (highVisits && highScore) stars.push(b)
      else if (highVisits && !highScore) focus.push(b)
      else if (!highVisits && highScore) steady.push(b)
      else forgotten.push(b)
    }
    return { stars, focus, steady, forgotten, avgVisits }
  }, [byBranch])

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
      // ตัดสินใจแล้ว = reviewed (legacy) + approved + rejected
      reviewed: filtered.filter(e =>
        e.status === "reviewed" || e.status === "approved" || e.status === "rejected"
      ).length,
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
        ["จำนวนฟอร์มที่ตัดสินใจแล้ว (อนุมัติ/ปฏิเสธ/รีวิว)", stats.reviewed],
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
        "สถานะ": e.status === "submitted" ? "รออนุมัติ"
          : e.status === "approved" ? "อนุมัติ"
          : e.status === "rejected" ? "ปฏิเสธ"
          : e.status === "reviewed" ? "รีวิวแล้ว"
          : "ร่าง",
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

  const askAI = async (branchId?: string, branchName?: string) => {
    setAiOpen(true); setAiLoading(true); setAiSummary(null); setAiCharts(null); setAiStats(null)
    setAiBranchId(branchId ?? null); setAiBranchName(branchName ?? "")
    try {
      const res = await fetch("/api/branch-eval/ai-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: branchId, days }),
      })
      const d = await res.json()
      if (!res.ok) { setAiSummary(d.error || "AI วิเคราะห์ไม่สำเร็จ"); return }
      setAiSummary(d.summary || "—")
      setAiCharts(d.charts ?? null)
      setAiStats(d.stats ?? null)
    } catch (e: any) {
      setAiSummary(e?.message || "Network error")
    } finally { setAiLoading(false) }
  }

  const exportDeepXlsx = async () => {
    setExportingDeep(true)
    const t = toast.loading("กำลังดึงทุกฟอร์ม + คำตอบ...")
    try {
      const res = await fetch(`/api/branch-eval/export-all?days=${days}`)
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ดึงข้อมูลไม่สำเร็จ", { id: t }); return }
      const fullEvals: any[] = d.evaluations ?? []
      const itemsByTpl: Record<string, any[]> = d.items_by_template ?? {}
      const answersByEval: Record<string, Record<string, any>> = d.answers_by_eval ?? {}

      if (fullEvals.length === 0) { toast.error("ไม่มีฟอร์ม", { id: t }); return }

      const wb = XLSX.utils.book_new()

      // Sheet 1: Summary
      const sum: any[][] = [
        ["รายงานประเมินสาขา — เต็มรูปแบบ"],
        ["วันที่ออกรายงาน", format(new Date(), "d MMM yyyy HH:mm", { locale: th })],
        ["ช่วงข้อมูล", `${days} วันย้อนหลัง`],
        [""],
        ["จำนวนฟอร์ม", fullEvals.length],
        ["จำนวนสาขา", new Set(fullEvals.map(e => e.branch?.id).filter(Boolean)).size],
        ["จำนวนผู้ตรวจ", new Set(fullEvals.map(e => e.evaluator?.id).filter(Boolean)).size],
      ]
      const wsSum = XLSX.utils.aoa_to_sheet(sum)
      wsSum["!cols"] = [{ wch: 30 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsSum, "สรุป")

      // Sheet 2: All forms header
      const headRows = fullEvals.map(e => ({
        "ID": e.id,
        "วันที่": e.visit_date,
        "เวลา": e.visit_time ?? "",
        "บริษัท": e.branch?.company?.name_th ?? "",
        "สาขา": e.branch?.name ?? "",
        "รหัสสาขา": e.branch?.code ?? "",
        "เทมเพลต": e.template?.name ?? "",
        "ผู้ตรวจ": e.evaluator ? `${e.evaluator.first_name_th} ${e.evaluator.last_name_th}` : "",
        "รหัส": e.evaluator?.employee_code ?? "",
        "สถานะ": e.status === "submitted" ? "รออนุมัติ"
          : e.status === "approved" ? "อนุมัติ"
          : e.status === "rejected" ? "ปฏิเสธ"
          : e.status === "reviewed" ? "รีวิวแล้ว"
          : "ร่าง",
        "คะแนน (%)": Number(Number(e.percentage).toFixed(2)),
        "คะแนนได้": Number(e.total_score),
        "คะแนนเต็ม": Number(e.total_weight),
        "เกรด": e.percentage >= 90 ? "A" : e.percentage >= 75 ? "B" : e.percentage >= 60 ? "C" : "D",
        "Check-in": e.checkin_at ? format(new Date(e.checkin_at), "yyyy-MM-dd HH:mm") : "",
        "ห่างจากสาขา (m)": e.checkin_distance_m ?? "",
        "ส่งเมื่อ": e.submitted_at ? format(new Date(e.submitted_at), "yyyy-MM-dd HH:mm") : "",
        "รีวิวโดย": e.reviewer ? `${e.reviewer.first_name_th} ${e.reviewer.last_name_th}` : "",
        "รีวิวเมื่อ": e.reviewed_at ? format(new Date(e.reviewed_at), "yyyy-MM-dd HH:mm") : "",
        "หมายเหตุทั่วไป": e.general_notes ?? "",
        "Action Plan": e.action_plan ?? "",
        "Reviewer Notes": e.reviewer_notes ?? "",
      }))
      const wsHead = XLSX.utils.json_to_sheet(headRows)
      wsHead["!cols"] = headRows.length > 0 ? Object.keys(headRows[0]).map(k =>
        ({ wch: ["ID","หมายเหตุทั่วไป","Action Plan","Reviewer Notes"].includes(k) ? 40 : 14 })
      ) : []
      XLSX.utils.book_append_sheet(wb, wsHead, "ฟอร์ม (header)")

      // Sheet 3: All answers (row per answer)
      const answerRows: any[] = []
      for (const ev of fullEvals) {
        const items = itemsByTpl[ev.template?.id ?? ""] ?? []
        const evAnswers = answersByEval[ev.id] ?? {}
        for (const it of items) {
          if (it.is_section) continue
          const a = evAnswers[it.id]
          const val = a?.answer_value
          const valDisplay = val?.yes === true ? "YES"
            : val?.yes === false ? "NO"
            : val?.score != null ? String(val.score)
            : val?.text ?? val?.value ?? ""
          answerRows.push({
            "วันที่ตรวจ": ev.visit_date,
            "สาขา": ev.branch?.name ?? "",
            "ผู้ตรวจ": ev.evaluator ? `${ev.evaluator.first_name_th} ${ev.evaluator.last_name_th}` : "",
            "ข้อ": it.code,
            "คำถาม": it.question_th,
            "น้ำหนัก": Number(it.weight) || 0,
            "ประเภท": it.answer_type === "yes_no" ? "✓/✗" : it.answer_type === "score_1_5" ? "1-5" : it.answer_type,
            "คำตอบ": valDisplay,
            "ผ่าน/ตก": a?.is_pass === true ? "PASS" : a?.is_pass === false ? "FAIL" : "—",
            "ได้คะแนน": Number(a?.earned_weight) || 0,
            "หมายเหตุผู้ตรวจ": a?.note ?? "",
            "รูปแนบ": Array.isArray(a?.photo_urls) ? a.photo_urls.length : 0,
          })
        }
      }
      const wsAnswers = XLSX.utils.json_to_sheet(answerRows)
      wsAnswers["!cols"] = answerRows.length > 0 ? [
        { wch: 12 }, { wch: 24 }, { wch: 20 }, { wch: 6 }, { wch: 50 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 8 },
      ] : []
      XLSX.utils.book_append_sheet(wb, wsAnswers, "คำตอบรายข้อ")

      const filename = `branch-eval-FULL_${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`ดาวน์โหลด ${filename} (${fullEvals.length} ฟอร์ม · ${answerRows.length} คำตอบ)`, { id: t })
    } catch (e: any) {
      toast.error(e?.message || "Export ไม่สำเร็จ", { id: t })
    } finally { setExportingDeep(false) }
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
          <p className="text-slate-400 text-sm flex items-center gap-1.5 flex-wrap">
            ข้อมูล {filtered.length} ฟอร์ม ({days} วันย้อนหลัง)
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              {refreshing
                ? <><Loader2 size={9} className="animate-spin" /> กำลังอัปเดต</>
                : <>· อัปเดต {lastRefresh.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>}
            </span>
            <span className="text-[9px] text-emerald-600 inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> live · refresh ทุก 30 วิ
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none">
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
            <option value={180}>180 วัน</option>
            <option value={365}>1 ปี</option>
          </select>
          <button onClick={() => load(true)} disabled={refreshing}
            title="รีเฟรชเดี๋ยวนี้"
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => askAI()} disabled={aiLoading || filtered.length === 0}
            className="px-3 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI วิเคราะห์
          </button>
          <button onClick={exportXlsx} disabled={exporting || filtered.length === 0}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
            สรุป Excel
          </button>
          <button onClick={exportDeepXlsx} disabled={exportingDeep}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            title="ดาวน์โหลดทุกฟอร์ม + คำตอบรายข้อ (ละเอียด)">
            {exportingDeep ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            ดาวน์โหลดทุกฟอร์ม
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
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
            <Kpi color="indigo" label="คะแนนเฉลี่ย" value={`${stats.avg.toFixed(1)}%`} />
            <Kpi color="emerald" label="ตัดสินใจแล้ว" value={`${stats.reviewed}/${stats.n}`}
              sub={`${stats.n > 0 ? Math.round((stats.reviewed / stats.n) * 100) : 0}%`} />
            <Kpi color="sky" label="สาขาที่ตรวจ" value={byBranch.length} sub={`${filtered.length} visits`} />
            <Kpi color="amber" label="ผู้ตรวจ" value={byEvaluator.length} sub="คน" />
            <Kpi color="violet" label="📩 ส่งถึง" value={byRecipient.list.length} sub={`${byRecipient.unset} ไม่ระบุ`} />
            <Kpi color="rose" label="📋 Template" value={byTemplate.length} sub="ใช้งาน" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 ภาพรวม</TabBtn>
            <TabBtn active={tab === "branches"} onClick={() => setTab("branches")}>🏪 รายสาขา</TabBtn>
            <TabBtn active={tab === "evaluators"} onClick={() => setTab("evaluators")}>👤 รายผู้ตรวจ</TabBtn>
            <TabBtn active={tab === "recipients"} onClick={() => setTab("recipients")}>📩 ส่งมอบถึงใคร</TabBtn>
            <TabBtn active={tab === "evaluatees"} onClick={() => setTab("evaluatees")}>👤 ประเมินใคร</TabBtn>
            <TabBtn active={tab === "templates"} onClick={() => setTab("templates")}>📋 Template</TabBtn>
            <TabBtn active={tab === "assignments"} onClick={() => setTab("assignments")}>🗂️ การบ้าน</TabBtn>
          </div>

          {/* Tab: Overview */}
          {tab === "overview" && (
            <>
              {/* ── แนวโน้มคะแนน (line + area chart with axis + values) ── */}
              <TrendChart trend={trend} />

              {/* ── 2 columns: Score Distribution + Activity by Day ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DistributionChart data={distribution} total={filtered.length} />
                <DayOfWeekChart data={byDayOfWeek} />
              </div>

              {/* ── Branch Performance Quadrant ── */}
              <QuadrantChart q={branchQuadrant} />

              {/* ── Top 5 / Bottom 5 ── */}
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
                      <Th center>AI</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byBranch.map((b, i) => {
                      const grade = b.avg >= 90 ? "A" : b.avg >= 75 ? "B" : b.avg >= 60 ? "C" : "D"
                      const gradeColor = grade === "A" ? "bg-emerald-500"
                        : grade === "B" ? "bg-sky-500"
                        : grade === "C" ? "bg-amber-500" : "bg-rose-500"
                      const expanded = expandedRow.has(`br_${b.id}`)
                      const myForms = filtered.filter((f: any) => f.branch?.id === b.id)
                        .sort((a: any, c: any) => c.visit_date.localeCompare(a.visit_date))
                      return (
                        <Fragment key={b.id}>
                          <tr className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => toggleRow(`br_${b.id}`)}>
                            <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">
                              {expanded ? <ChevronDown size={12} className="inline text-indigo-500"/> : <ChevRight size={12} className="inline text-slate-400"/>}
                              <span className="ml-1">{i + 1}</span>
                            </td>
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
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={e => { e.stopPropagation(); askAI(b.id, b.name) }}
                                title={`AI วิเคราะห์ ${b.name}`}
                                className="p-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg inline-flex items-center gap-1">
                                <Sparkles size={11} />
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr><td colSpan={9} className="bg-sky-50/30 p-0">
                              <DrillDown forms={myForms} />
                            </td></tr>
                          )}
                        </Fragment>
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
                      {byEvaluator.map((ev, i) => {
                        const expanded = expandedRow.has(`ev_${ev.id}`)
                        const myForms = filtered.filter((f: any) => f.evaluator?.id === ev.id)
                          .sort((a: any, b: any) => b.visit_date.localeCompare(a.visit_date))
                        return (
                          <Fragment key={ev.id}>
                            <tr className="hover:bg-indigo-50/40 cursor-pointer"
                              onClick={() => toggleRow(`ev_${ev.id}`)}>
                              <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">
                                {expanded ? <ChevronDown size={12} className="inline text-indigo-500" /> : <ChevRight size={12} className="inline text-slate-400" />}
                                <span className="ml-1">{i + 1}</span>
                              </td>
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
                            {expanded && (
                              <tr>
                                <td colSpan={8} className="bg-indigo-50/30 p-0">
                                  <DrillDown forms={myForms} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Recipients (ส่งมอบถึงใคร) */}
          {tab === "recipients" && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Mail size={14} className="text-emerald-500" />
                <p className="text-sm font-black text-slate-800">ส่งมอบถึงใคร ({byRecipient.list.length})</p>
                {byRecipient.unset > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                    + {byRecipient.unset} ฟอร์ม "ไม่ระบุผู้รับ"
                  </span>
                )}
              </div>
              {byRecipient.list.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Mail size={26} className="mx-auto mb-2 text-slate-300" />
                  ยังไม่มีฟอร์มที่ระบุผู้รับในช่วงนี้
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <Th>#</Th>
                        <Th>ผู้รับฟอร์ม</Th>
                        <Th center>รับมาแล้ว</Th>
                        <Th center>จำนวนสาขา</Th>
                        <Th center>Template ใช้</Th>
                        <Th center>คะแนนเฉลี่ย</Th>
                        <Th>รับล่าสุด</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byRecipient.list.map((r, i) => {
                        const expanded = expandedRow.has(`rc_${r.id}`)
                        const myForms = filtered.filter((f: any) => f.target_manager_id === r.id)
                          .sort((a: any, b: any) => b.visit_date.localeCompare(a.visit_date))
                        return (
                          <Fragment key={r.id}>
                            <tr className="hover:bg-emerald-50/40 cursor-pointer"
                              onClick={() => toggleRow(`rc_${r.id}`)}>
                              <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">
                                {expanded ? <ChevronDown size={12} className="inline text-emerald-500" /> : <ChevRight size={12} className="inline text-slate-400" />}
                                <span className="ml-1">{i + 1}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-bold text-sm">
                                  {r.name}
                                  {r.nickname && <span className="text-xs text-slate-400 ml-1">({r.nickname})</span>}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 text-xs font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                                  {r.received} ฟอร์ม
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{r.branchCount}</td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-violet-700">{r.templateCount}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-sm font-black ${
                                  r.avg >= 80 ? "text-emerald-600"
                                  : r.avg >= 60 ? "text-amber-600"
                                  : "text-rose-600"
                                }`}>{r.avg.toFixed(1)}%</span>
                              </td>
                              <td className="px-3 py-2.5 text-[10px] text-slate-500">
                                {r.lastDate && format(new Date(r.lastDate), "d MMM yyyy", { locale: th })}
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={7} className="bg-emerald-50/30 p-0">
                                  <DrillDown forms={myForms} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Evaluatees (ผู้ถูกประเมิน) */}
          {tab === "evaluatees" && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users size={14} className="text-indigo-500" />
                <p className="text-sm font-black text-slate-800">ผู้ถูกประเมิน ({byEvaluatee.list.length})</p>
                {byEvaluatee.unset > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                    + {byEvaluatee.unset} ฟอร์ม "ไม่ระบุผู้ถูกประเมิน"
                  </span>
                )}
              </div>
              {byEvaluatee.list.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Users size={26} className="mx-auto mb-2 text-slate-300" />
                  ยังไม่มีฟอร์มที่ระบุผู้ถูกประเมินในช่วงนี้
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <Th>#</Th>
                        <Th>ผู้ถูกประเมิน</Th>
                        <Th center>ถูกประเมิน</Th>
                        <Th center>จำนวนสาขา</Th>
                        <Th center>Template ใช้</Th>
                        <Th center>คะแนนเฉลี่ย</Th>
                        <Th>ล่าสุด</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byEvaluatee.list.map((r, i) => {
                        const expanded = expandedRow.has(`ee_${r.id}`)
                        const myForms = filtered.filter((f: any) => f.evaluatee_id === r.id)
                          .sort((a: any, b: any) => b.visit_date.localeCompare(a.visit_date))
                        return (
                          <Fragment key={r.id}>
                            <tr className="hover:bg-indigo-50/40 cursor-pointer"
                              onClick={() => toggleRow(`ee_${r.id}`)}>
                              <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">
                                {expanded ? <ChevronDown size={12} className="inline text-indigo-500" /> : <ChevRight size={12} className="inline text-slate-400" />}
                                <span className="ml-1">{i + 1}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-bold text-sm">
                                  {r.name}
                                  {r.nickname && <span className="text-xs text-slate-400 ml-1">({r.nickname})</span>}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                  {r.count} ฟอร์ม
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{r.branchCount}</td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-violet-700">{r.templateCount}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-sm font-black ${
                                  r.avg >= 80 ? "text-emerald-600"
                                  : r.avg >= 60 ? "text-amber-600"
                                  : "text-rose-600"
                                }`}>{r.avg.toFixed(1)}%</span>
                              </td>
                              <td className="px-3 py-2.5 text-[10px] text-slate-500">
                                {r.lastDate && format(new Date(r.lastDate), "d MMM yyyy", { locale: th })}
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={7} className="bg-indigo-50/30 p-0">
                                  <DrillDown forms={myForms} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Templates */}
          {tab === "templates" && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Layers size={14} className="text-violet-500" />
                <p className="text-sm font-black text-slate-800">เทมเพลตที่ใช้ ({byTemplate.length})</p>
              </div>
              {byTemplate.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Layers size={26} className="mx-auto mb-2 text-slate-300" />
                  ยังไม่มีการใช้งาน template ในช่วงนี้
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <Th>#</Th>
                        <Th>Template</Th>
                        <Th center>ใช้</Th>
                        <Th center>ผู้ตรวจ</Th>
                        <Th center>สาขา</Th>
                        <Th center>📩 ผู้รับ</Th>
                        <Th center>คะแนนเฉลี่ย</Th>
                        <Th>ใช้ล่าสุด</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byTemplate.map((t, i) => {
                        const expanded = expandedRow.has(`tp_${t.id}`)
                        const myForms = filtered.filter((f: any) => f.template?.id === t.id)
                          .sort((a: any, b: any) => b.visit_date.localeCompare(a.visit_date))
                        return (
                          <Fragment key={t.id}>
                            <tr className="hover:bg-violet-50/40 cursor-pointer"
                              onClick={() => toggleRow(`tp_${t.id}`)}>
                              <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">
                                {expanded ? <ChevronDown size={12} className="inline text-violet-500" /> : <ChevRight size={12} className="inline text-slate-400" />}
                                <span className="ml-1">{i + 1}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-bold text-sm flex items-center gap-1.5">
                                  <Layers size={12} className="text-violet-500" />
                                  {t.name}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 text-xs font-black bg-violet-50 text-violet-700 px-2 py-1 rounded">
                                  {t.uses} ครั้ง
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-indigo-700">{t.evaluatorCount}</td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{t.branchCount}</td>
                              <td className="px-3 py-2.5 text-center text-xs font-bold text-emerald-700">{t.recipientCount}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-sm font-black ${
                                  t.avg >= 80 ? "text-emerald-600"
                                  : t.avg >= 60 ? "text-amber-600"
                                  : "text-rose-600"
                                }`}>{t.avg.toFixed(1)}%</span>
                              </td>
                              <td className="px-3 py-2.5 text-[10px] text-slate-500">
                                {t.lastDate && format(new Date(t.lastDate), "d MMM yyyy", { locale: th })}
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={8} className="bg-violet-50/30 p-0">
                                  <DrillDown forms={myForms} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Assignments (การบ้าน) */}
          {tab === "assignments" && (
            <AssignmentsTab assignments={assignments} />
          )}
        </>
      )}

      {/* AI Summary Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAiOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <div>
                  <h3 className="font-black">AI วิเคราะห์ผลประเมิน</h3>
                  <p className="text-[10px] opacity-90">
                    {aiBranchId ? `สาขา: ${aiBranchName}` : "ภาพรวมทั้งระบบ"} · {days} วันย้อนหลัง
                  </p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {aiLoading ? (
                <div className="py-16 text-center">
                  <Loader2 size={28} className="mx-auto animate-spin text-violet-400 mb-2" />
                  <p className="text-xs text-slate-500">กำลังวิเคราะห์... ขอเวลา 5-15 วินาที</p>
                </div>
              ) : (
                <>
                  {/* stats summary */}
                  {aiStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <MiniStat label="ฟอร์ม" value={aiStats.n} sub="ทั้งหมด" />
                      <MiniStat label="คะแนนเฉลี่ย" value={`${aiStats.avg?.toFixed(1)}%`}
                        color={aiStats.avg >= 80 ? "emerald" : aiStats.avg >= 60 ? "amber" : "rose"} />
                      <MiniStat label="ต่ำสุด" value={`${aiStats.min?.toFixed(0)}%`} color="rose" />
                      <MiniStat label="สูงสุด" value={`${aiStats.max?.toFixed(0)}%`} color="emerald" />
                    </div>
                  )}

                  {/* AI text — natural Thai prose */}
                  {aiSummary && (
                    <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                      <div className="text-sm text-slate-700 leading-loose whitespace-pre-wrap font-sans"
                        style={{ lineHeight: 1.85 }}>
                        {aiSummary
                          .replace(/\*\*/g, "")  // safety: strip ** ถ้า AI ลืม
                          .replace(/__/g, "")
                          .replace(/^#+\s*/gm, "")  // strip heading markdown
                        }
                      </div>
                    </div>
                  )}

                  {/* Inline charts */}
                  {aiCharts?.top_fail_items?.length > 0 && (
                    <ChartCard
                      title="ข้อที่ตกบ่อยที่สุด"
                      subtitle="% อัตราตก · top 8 — ยิ่งสูงยิ่งต้องแก้"
                      data={aiCharts.top_fail_items}
                      color="rose"
                      suffix="%"
                    />
                  )}

                  {!aiBranchId && aiCharts?.branch_ranking?.length > 0 && (
                    <ChartCard
                      title="Top 8 สาขาคะแนนสูงสุด"
                      subtitle="คะแนนเฉลี่ย %"
                      data={aiCharts.branch_ranking}
                      color="emerald"
                      suffix="%"
                    />
                  )}

                  {!aiBranchId && aiCharts?.branch_bottom?.length > 0 && (
                    <ChartCard
                      title="สาขาที่ต้องเข้าไปดูแล"
                      subtitle="คะแนนต่ำสุด 5 อันดับ"
                      data={aiCharts.branch_bottom}
                      color="amber"
                      suffix="%"
                    />
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400">
                <Sparkles size={9} className="inline" /> พัฒนาโดยทีม SHD Technology · AI อาจมี error ตรวจสอบเสมอ
              </p>
              <button onClick={() => setAiOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                ปิด
              </button>
            </div>
          </div>
        </div>
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
    violet:  { bg: "bg-violet-50",  text: "text-violet-700" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700" },
    orange:  { bg: "bg-orange-50",  text: "text-orange-700" },
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

// ─────────────────────────────────────────────────────────────────
// Trend Chart — line + area + value labels + grid axis
// ─────────────────────────────────────────────────────────────────
function TrendChart({ trend }: { trend: { key: string; avg: number; n: number }[] }) {
  if (trend.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <p className="text-sm font-black text-slate-800 mb-2">📈 แนวโน้มคะแนนเฉลี่ย</p>
        <p className="py-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูล</p>
      </div>
    )
  }
  // คำนวณค่าสำคัญ
  const max = Math.max(100, ...trend.map(t => t.avg))
  const min = Math.min(0, ...trend.map(t => t.avg))
  const avg = trend.reduce((s, t) => s + t.avg, 0) / trend.length
  const first = trend[0]?.avg ?? 0
  const last = trend[trend.length - 1]?.avg ?? 0
  const delta = last - first
  const trending = delta > 5 ? "up" : delta < -5 ? "down" : "flat"

  // SVG dimensions
  const W = 600
  const H = 180
  const PADL = 28; const PADR = 12; const PADT = 18; const PADB = 22
  const innerW = W - PADL - PADR
  const innerH = H - PADT - PADB

  const xStep = trend.length > 1 ? innerW / (trend.length - 1) : 0
  const yScale = (v: number) => PADT + innerH - ((v - min) / (max - min || 1)) * innerH

  const points = trend.map((t, i) => ({
    x: PADL + i * xStep,
    y: yScale(t.avg),
    label: t.key.slice(-3),
    avg: t.avg,
    n: t.n,
  }))

  // line path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  // area path (close to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADT + innerH} L ${points[0].x} ${PADT + innerH} Z`

  // gridlines (0, 25, 50, 75, 100)
  const yTicks = [0, 25, 50, 75, 100].filter(v => v <= max + 5)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <p className="text-sm font-black text-slate-800">📈 แนวโน้มคะแนนเฉลี่ยรายสัปดาห์</p>
          <p className="text-[10px] text-slate-400">{trend.length} สัปดาห์ · เฉลี่ย {avg.toFixed(1)}%</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {trending === "up" && (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full font-bold">
              📈 ขึ้น {delta.toFixed(1)}%
            </span>
          )}
          {trending === "down" && (
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded-full font-bold">
              📉 ลง {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {trending === "flat" && (
            <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded-full font-bold">
              ➡️ คงที่
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ maxHeight: 240 }}>
        {/* gridlines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PADL} x2={W - PADR} y1={yScale(v)} y2={yScale(v)}
              stroke="#e2e8f0" strokeDasharray="2 3" strokeWidth="1" />
            <text x={PADL - 4} y={yScale(v) + 3} fontSize="9" textAnchor="end" fill="#94a3b8">
              {v}
            </text>
          </g>
        ))}
        {/* avg line */}
        <line x1={PADL} x2={W - PADR} y1={yScale(avg)} y2={yScale(avg)}
          stroke="#a78bfa" strokeDasharray="4 3" strokeWidth="1.2" opacity="0.7" />
        <text x={W - PADR - 2} y={yScale(avg) - 3} fontSize="8" textAnchor="end" fill="#a78bfa" fontWeight="bold">
          เฉลี่ย {avg.toFixed(0)}%
        </text>
        {/* area fill */}
        {points.length > 1 && (
          <>
            <defs>
              <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#trendArea)" />
          </>
        )}
        {/* line */}
        <path d={linePath} stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#6366f1" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} fontSize="9.5" textAnchor="middle" fill="#4f46e5" fontWeight="bold">
              {p.avg.toFixed(0)}%
            </text>
            <text x={p.x} y={H - 6} fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="bold">
              {p.label}
            </text>
            <text x={p.x} y={H + 2} fontSize="7.5" textAnchor="middle" fill="#cbd5e1">
              {p.n}f
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Score Distribution — bar with % + count
// ─────────────────────────────────────────────────────────────────
function DistributionChart({ data, total }: { data: any[]; total: number }) {
  const palette: Record<string, { bg: string; bar: string; text: string }> = {
    emerald: { bg: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" },
    sky:     { bg: "bg-sky-50",     bar: "bg-sky-500",     text: "text-sky-700" },
    amber:   { bg: "bg-amber-50",   bar: "bg-amber-500",   text: "text-amber-700" },
    rose:    { bg: "bg-rose-50",    bar: "bg-rose-500",    text: "text-rose-700" },
  }
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-black text-slate-800 mb-1">🎯 การกระจายเกรด</p>
      <p className="text-[10px] text-slate-400 mb-3">ฟอร์มทั้งหมด {total} แบ่งตามคะแนน</p>
      <div className="space-y-2">
        {data.map(d => {
          const p = palette[d.color]
          return (
            <div key={d.grade}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[11px] ${p.bar}`}>
                  {d.grade}
                </span>
                <span className="text-[11px] font-bold text-slate-700 flex-1 truncate">{d.label}</span>
                <span className={`text-[11px] font-black ${p.text}`}>{d.count} ฟอร์ม ({d.pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${p.bar} rounded-full transition-all`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Day-of-week activity chart
// ─────────────────────────────────────────────────────────────────
function DayOfWeekChart({ data }: { data: { day: string; count: number; avg: number }[] }) {
  const maxCount = Math.max(1, ...data.map(d => d.count))
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-black text-slate-800 mb-1">📅 กิจกรรมรายวัน (ของสัปดาห์)</p>
      <p className="text-[10px] text-slate-400 mb-3">วันไหนตรวจเยอะที่สุด · สีตามคะแนนเฉลี่ย</p>
      <div className="flex items-end gap-1.5 h-24">
        {data.map(d => {
          const h = Math.max(4, (d.count / maxCount) * 100)
          const color = d.count === 0 ? "bg-slate-200"
            : d.avg >= 80 ? "bg-emerald-500"
            : d.avg >= 60 ? "bg-amber-500"
            : "bg-rose-500"
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-[9px] font-bold text-slate-500 leading-none">
                {d.count > 0 ? d.count : ""}
              </div>
              <div className="w-full flex-1 flex items-end">
                <div className={`w-full ${color} rounded-t transition-all hover:opacity-80`}
                  style={{ height: `${h}%` }}
                  title={`${d.day}: ${d.count} ฟอร์ม · เฉลี่ย ${d.avg.toFixed(0)}%`} />
              </div>
              <div className="text-[10px] text-slate-500 font-bold">{d.day}</div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded"/>≥80%</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded"/>60-79</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded"/>&lt;60%</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Quadrant Chart — Branch Performance Matrix
// ─────────────────────────────────────────────────────────────────
function QuadrantChart({ q }: { q: any }) {
  const total = q.stars.length + q.focus.length + q.steady.length + q.forgotten.length
  if (total === 0) return null
  const items = [
    { key: "stars",     items: q.stars,     icon: "⭐", title: "ดาวเด่น",       desc: "ตรวจบ่อย + คะแนนดี",       color: "emerald" },
    { key: "focus",     items: q.focus,     icon: "🚨", title: "ต้องโฟกัส",    desc: "ตรวจบ่อย + คะแนนต่ำ",     color: "rose" },
    { key: "steady",    items: q.steady,    icon: "💎", title: "ดีอย่างเงียบๆ", desc: "ตรวจน้อย + คะแนนดี",       color: "sky" },
    { key: "forgotten", items: q.forgotten, icon: "🌑", title: "ถูกลืม",         desc: "ตรวจน้อย + คะแนนต่ำ",      color: "amber" },
  ]
  const palette: Record<string, { border: string; bg: string; text: string }> = {
    emerald: { border: "border-emerald-200", bg: "bg-emerald-50/40", text: "text-emerald-700" },
    rose:    { border: "border-rose-200",    bg: "bg-rose-50/40",    text: "text-rose-700" },
    sky:     { border: "border-sky-200",     bg: "bg-sky-50/40",     text: "text-sky-700" },
    amber:   { border: "border-amber-200",   bg: "bg-amber-50/40",   text: "text-amber-700" },
  }
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-sm font-black text-slate-800">🗺️ แผนที่สาขา (Performance Quadrant)</p>
          <p className="text-[10px] text-slate-400">แบ่งสาขาตามจำนวนการตรวจ × คะแนน — เพื่อจัดลำดับความสำคัญ</p>
        </div>
        {q.avgVisits && (
          <span className="text-[10px] text-slate-400">เฉลี่ย {q.avgVisits.toFixed(1)} visits/สาขา</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(g => {
          const p = palette[g.color]
          return (
            <div key={g.key} className={`border-2 ${p.border} ${p.bg} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{g.icon}</span>
                <div>
                  <p className={`text-xs font-black ${p.text}`}>{g.title}</p>
                  <p className="text-[9px] text-slate-500">{g.desc}</p>
                </div>
                <span className={`ml-auto text-sm font-black ${p.text}`}>{g.items.length}</span>
              </div>
              {g.items.length > 0 && (
                <div className="space-y-0.5 mt-1.5 max-h-[60px] overflow-y-auto">
                  {g.items.slice(0, 5).map((b: any) => (
                    <p key={b.id} className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                      <span className="font-bold flex-1 truncate">{b.name}</span>
                      <span className={`font-black ${p.text}`}>{b.avg.toFixed(0)}%</span>
                      <span className="text-slate-400 text-[9px]">·{b.count}x</span>
                    </p>
                  ))}
                  {g.items.length > 5 && (
                    <p className="text-[9px] text-slate-400 italic">+ {g.items.length - 5} อื่นๆ</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// AssignmentsTab — แสดงสรุป "การบ้าน" + breakdown per assigner
// ─────────────────────────────────────────────────────────────────
function AssignmentsTab({ assignments }: { assignments: any[] }) {
  const today = new Date().toISOString().slice(0, 10)

  // ── Overall ──
  const total = assignments.length
  const completed = assignments.filter((a: any) => (a._stats?.done ?? 0) === (a._stats?.total ?? 0) && (a._stats?.total ?? 0) > 0).length
  const overdue = assignments.filter((a: any) => {
    const d = a._stats?.done ?? 0, t = a._stats?.total ?? 0
    return a.due_date && a.due_date < today && d < t
  }).length
  const totalTargets = assignments.reduce((s, a: any) => s + (a._stats?.total ?? 0), 0)
  const doneTargets = assignments.reduce((s, a: any) => s + (a._stats?.done ?? 0), 0)
  const overallPct = totalTargets > 0 ? (doneTargets / totalTargets) * 100 : 0

  // ── Performance aggregates ──
  const allScoredCount = assignments.reduce((s, a: any) => s + (a._stats?.scored_count ?? 0), 0)
  const weightedAvg = (() => {
    let sumWeighted = 0, sumN = 0
    for (const a of assignments) {
      const n = a._stats?.scored_count ?? 0
      const av = a._stats?.avg_score
      if (n > 0 && av != null) { sumWeighted += Number(av) * n; sumN += n }
    }
    return sumN > 0 ? sumWeighted / sumN : 0
  })()
  const allPass = assignments.reduce((s, a: any) => s + (a._stats?.pass_count ?? 0), 0)
  const allMid = assignments.reduce((s, a: any) => s + (a._stats?.mid_count ?? 0), 0)
  const allLow = assignments.reduce((s, a: any) => s + (a._stats?.low_count ?? 0), 0)
  const avgDaysAll = (() => {
    const arr = assignments.map(a => a._stats?.avg_days_to_complete).filter(x => x != null)
    if (arr.length === 0) return null
    return arr.reduce((s: number, x: number) => s + x, 0) / arr.length
  })()

  // ── Group by assigner ──
  type AsgGroup = { id: string; name: string; rows: any[]; total: number; done: number; sumPct: number; cntPct: number }
  const byAssigner = (() => {
    const m = new Map<string, AsgGroup>()
    for (const a of assignments as any[]) {
      if (!a.assigner) continue
      const k = a.assigned_by
      if (!m.has(k)) m.set(k, {
        id: k, name: `${a.assigner.first_name_th} ${a.assigner.last_name_th}`,
        rows: [], total: 0, done: 0, sumPct: 0, cntPct: 0,
      })
      const g = m.get(k)!
      g.rows.push(a)
      g.total += a._stats?.total ?? 0
      g.done += a._stats?.done ?? 0
      const n = a._stats?.scored_count ?? 0
      if (n > 0 && a._stats?.avg_score != null) {
        g.sumPct += Number(a._stats.avg_score) * n
        g.cntPct += n
      }
    }
    return Array.from(m.values()).sort((a, b) => b.rows.length - a.rows.length)
  })()

  // ── Per-assignment performance ranking ──
  const perfRank = [...assignments]
    .filter(a => (a._stats?.scored_count ?? 0) > 0)
    .sort((a, b) => Number(b._stats.avg_score) - Number(a._stats.avg_score))

  if (total === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center">
        <p className="text-sm text-slate-500">ยังไม่มีการบ้านในระบบ</p>
        <p className="text-[10px] text-slate-400 mt-1">หัวหน้า/Supervisor สร้างการบ้านได้ที่ /app/branch-eval/manage/assignments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Overall stats */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-black text-slate-800 mb-3 flex items-center gap-1.5">
          <ClipboardList size={14} className="text-orange-500"/> 🗂️ ภาพรวมการบ้านทั้งระบบ
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Kpi color="indigo" label="การบ้าน" value={total} />
          <Kpi color="orange" label="กำลังทำ" value={total - completed} />
          <Kpi color="emerald" label="เสร็จ" value={completed} sub={`${total > 0 ? Math.round(completed/total*100) : 0}%`} />
          <Kpi color="rose" label="เลยกำหนด" value={overdue} />
          <Kpi color="violet" label="งานรวม" value={`${doneTargets}/${totalTargets}`} sub={`${overallPct.toFixed(0)}%`} />
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-emerald-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Performance summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-black text-slate-800 mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-violet-500"/> 📈 ประสิทธิภาพรวม
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Kpi color="violet" label="ฟอร์มที่มีคะแนน" value={allScoredCount} sub="จากการบ้านทั้งหมด" />
          <Kpi color={weightedAvg >= 80 ? "emerald" : weightedAvg >= 60 ? "amber" : "rose"}
            label="คะแนนเฉลี่ย" value={`${weightedAvg.toFixed(1)}%`} sub="weighted avg" />
          <Kpi color="emerald" label="ดีเยี่ยม (≥80%)" value={allPass}
            sub={allScoredCount > 0 ? `${((allPass/allScoredCount)*100).toFixed(0)}%` : "—"} />
          <Kpi color="rose" label="ต้องปรับ (<60%)" value={allLow}
            sub={allScoredCount > 0 ? `${((allLow/allScoredCount)*100).toFixed(0)}%` : "—"} />
        </div>
        {avgDaysAll != null && (
          <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 flex items-center gap-2">
            <Clock size={12} className="text-slate-500"/>
            ⏱️ <b>เวลาเฉลี่ยที่ลูกน้องใช้</b>: {avgDaysAll.toFixed(1)} วัน (จากวันที่มอบหมาย → วันที่ส่ง)
          </div>
        )}
        {allScoredCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <AsgDistRow label="≥ 80% ดีเยี่ยม" color="emerald" count={allPass} total={allScoredCount} />
            <AsgDistRow label="60-79% พอใช้" color="amber" count={allMid} total={allScoredCount} />
            <AsgDistRow label="< 60% ต้องปรับ" color="rose" count={allLow} total={allScoredCount} />
          </div>
        )}
      </div>

      {/* Per-assignment performance ranking */}
      {perfRank.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-sm font-black text-slate-800 border-b border-slate-100 flex items-center gap-1.5">
            <Target size={14} className="text-emerald-500"/> 🎯 ประสิทธิภาพแต่ละการบ้าน ({perfRank.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px]">
                <tr>
                  <Th>#</Th>
                  <Th>การบ้าน</Th>
                  <Th>ผู้มอบ</Th>
                  <Th center>คืบหน้า</Th>
                  <Th center>เฉลี่ย%</Th>
                  <Th center>สูง/ต่ำ</Th>
                  <Th center>ดี / กลาง / ต่ำ</Th>
                  <Th center>วันเฉลี่ย</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perfRank.map((a: any, i: number) => {
                  const s = a._stats
                  const avg = Number(s.avg_score)
                  return (
                    <tr key={a.id} className="hover:bg-emerald-50/30">
                      <td className="px-2 py-2 text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-2 py-2">
                        <a href={`/admin/branch-eval/assignments/${a.id}`}
                          className="font-bold text-slate-800 hover:text-orange-700 truncate block max-w-[180px]">
                          {a.title}
                        </a>
                        <p className="text-[9px] text-slate-400">{a.template?.name}</p>
                      </td>
                      <td className="px-2 py-2 text-[10px] text-slate-600">
                        {a.assigner ? `${a.assigner.first_name_th}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-xs font-black text-slate-700">{s.done}/{s.total}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-xs font-black ${
                          avg >= 80 ? "text-emerald-700" : avg >= 60 ? "text-amber-700" : "text-rose-700"
                        }`}>{avg.toFixed(1)}%</span>
                      </td>
                      <td className="px-2 py-2 text-center text-[10px] text-slate-500">
                        <span className="text-emerald-600 font-bold">{Number(s.max_score).toFixed(0)}</span>
                        {" / "}
                        <span className="text-rose-600 font-bold">{Number(s.min_score).toFixed(0)}</span>
                      </td>
                      <td className="px-2 py-2 text-center text-[10px]">
                        <span className="text-emerald-700 font-bold">{s.pass_count}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-amber-700 font-bold">{s.mid_count}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-rose-700 font-bold">{s.low_count}</span>
                      </td>
                      <td className="px-2 py-2 text-center text-[10px] text-slate-600 font-bold">
                        {s.avg_days_to_complete != null ? `${Number(s.avg_days_to_complete).toFixed(1)} วัน` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By assigner */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <p className="px-4 py-3 text-sm font-black text-slate-800 border-b border-slate-100">
          👥 หัวหน้าที่มอบการบ้าน ({byAssigner.length})
        </p>
        {byAssigner.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-left">#</th>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-left">ผู้มอบ</th>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-center">การบ้าน</th>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-center">งานทั้งหมด</th>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-center">เสร็จ</th>
                  <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase text-center">ความคืบหน้า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byAssigner.map((g, i) => {
                  const pct = g.total > 0 ? (g.done / g.total) * 100 : 0
                  return (
                    <tr key={g.id} className="hover:bg-orange-50/30">
                      <td className="px-3 py-2.5 text-xs text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2.5"><p className="font-bold text-sm">{g.name}</p></td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black bg-orange-50 text-orange-700 px-2 py-1 rounded">{g.rows.length}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">{g.total}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-emerald-700">{g.done}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-black ${pct === 100 ? "text-emerald-700" : "text-slate-700"}`}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All assignments list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <p className="px-4 py-3 text-sm font-black text-slate-800 border-b border-slate-100">
          📋 รายการการบ้านทั้งหมด ({total})
        </p>
        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
          {assignments.map((a: any) => {
            const stats = a._stats
            const isDone = stats.done === stats.total && stats.total > 0
            const isOverdue = a.due_date && a.due_date < today && !isDone
            return (
              <a key={a.id} href={`/admin/branch-eval/assignments/${a.id}`}
                className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDone ? "bg-emerald-100 text-emerald-700"
                  : isOverdue ? "bg-rose-100 text-rose-700"
                  : "bg-orange-100 text-orange-700"
                }`}>
                  <Layers size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{a.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {a.template?.name}
                    {a.assigner && <> · {a.assigner.first_name_th}</>}
                    {a.due_date && <> · ครบ {format(new Date(a.due_date), "d MMM", { locale: th })}</>}
                  </p>
                </div>
                {stats.avg_score != null && (
                  <span className={`text-xs font-black ${
                    Number(stats.avg_score) >= 80 ? "text-emerald-700"
                    : Number(stats.avg_score) >= 60 ? "text-amber-700"
                    : "text-rose-700"
                  }`}>{Number(stats.avg_score).toFixed(0)}%</span>
                )}
                <div className="text-right text-xs">
                  <p className="font-black">{stats.done}/{stats.total}</p>
                  <div className="w-20 h-1 bg-slate-100 rounded-full mt-1">
                    <div className={`h-full rounded-full ${isDone ? "bg-emerald-500" : isOverdue ? "bg-rose-500" : "bg-orange-500"}`}
                      style={{ width: `${stats.progress}%` }} />
                  </div>
                </div>
                {isOverdue && <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">เลย</span>}
                {isDone && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">✓</span>}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AsgDistRow({ label, color, count, total }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500",
  }
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="font-bold text-slate-600 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-black text-slate-700 w-20 text-right flex-shrink-0">{count} ({pct.toFixed(0)}%)</span>
    </div>
  )
}

// DrillDown — แสดงรายการฟอร์มของ evaluator / recipient / template ที่ user คลิกขยาย
function DrillDown({ forms }: { forms: any[] }) {
  if (forms.length === 0) return <p className="px-4 py-3 text-xs text-slate-400 italic">ไม่มีฟอร์มในช่วงนี้</p>
  return (
    <div className="px-4 py-2 space-y-1.5">
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-1.5 mb-1">
        ตรวจอะไรไปบ้าง ({forms.length} ฟอร์ม)
      </p>
      <div className="space-y-1">
        {forms.slice(0, 20).map(f => (
          <Link key={f.id} href={`/admin/branch-eval/evaluations/${f.id}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
            <Store size={11} className="text-sky-500 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-700 truncate">{f.branch?.name}</span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">·</span>
            <span className="text-[10px] text-slate-500 truncate hidden sm:inline">{f.template?.name}</span>
            <span className="text-[9px] text-slate-400">·</span>
            <Calendar size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500">{format(new Date(f.visit_date), "d MMM", { locale: th })}</span>
            {f.target_manager && (
              <>
                <span className="text-[9px] text-slate-400">·</span>
                <Mail size={9} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold text-emerald-700 truncate">{f.target_manager.first_name_th}</span>
              </>
            )}
            {f.evaluatee && (
              <>
                <span className="text-[9px] text-slate-400">·</span>
                <Users size={9} className="text-indigo-500 flex-shrink-0" />
                <span className="text-[10px] font-bold text-indigo-700 truncate">{f.evaluatee.first_name_th}</span>
              </>
            )}
            <span className={`ml-auto text-xs font-black flex-shrink-0 ${
              Number(f.percentage) >= 80 ? "text-emerald-600"
              : Number(f.percentage) >= 60 ? "text-amber-600"
              : "text-rose-600"
            }`}>{Number(f.percentage).toFixed(0)}%</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              f.status === "draft" ? "bg-slate-100 text-slate-600"
              : f.status === "submitted" ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
            }`}>
              {f.status === "draft" ? "ร่าง" : f.status === "submitted" ? "รอ" : "✓"}
            </span>
          </Link>
        ))}
        {forms.length > 20 && (
          <p className="text-center text-[10px] text-slate-400 italic pt-1">+ อีก {forms.length - 20} ฟอร์ม — ดูทั้งหมดใน "ฟอร์มที่ส่งแล้ว"</p>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color = "slate" }: any) {
  const palette: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  }
  return (
    <div className={`${palette[color]} rounded-lg p-2 border border-white`}>
      <p className="text-[10px] font-bold opacity-80 uppercase">{label}</p>
      <p className="text-lg font-black leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-60">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, data, color = "indigo", suffix = "" }: {
  title: string; subtitle?: string
  data: Array<{ label: string; full_label?: string; value: number; sub?: string }>
  color?: string; suffix?: string
}) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const colorMap: Record<string, string> = {
    rose: "from-rose-400 to-rose-600",
    emerald: "from-emerald-400 to-emerald-600",
    amber: "from-amber-400 to-amber-600",
    indigo: "from-indigo-400 to-indigo-600",
  }
  const grad = colorMap[color] ?? colorMap.indigo

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-sm font-black text-slate-800">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          return (
            <div key={i} className="group">
              <div className="flex items-center gap-2 text-[11px] mb-0.5">
                <span className="text-slate-700 font-bold truncate flex-1" title={d.full_label ?? d.label}>{d.label}</span>
                <span className="text-slate-500 font-bold flex-shrink-0">{d.value}{suffix}</span>
                {d.sub && <span className="text-slate-400 flex-shrink-0">{d.sub}</span>}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all`}
                  style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
              {d.full_label && d.full_label !== d.label && (
                <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1 group-hover:line-clamp-none">
                  {d.full_label}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
