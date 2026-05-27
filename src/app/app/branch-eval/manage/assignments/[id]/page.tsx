"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, ClipboardList, Calendar, Users, Store, Layers,
  CheckCircle2, Clock, AlertCircle, ChevronRight, ChevronDown,
  Loader2, Plus, X, Search, BarChart3, FileDown, Sparkles, TrendingUp,
  AlertTriangle, Award,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import * as XLSX from "xlsx"

const supabase = createClient()

type Group = {
  assignee: any
  rows: any[]
  done: number
  total: number
}

export default function AssignmentDetailPage() {
  const { id } = useParams() as { id: string }
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [tab, setTab] = useState<"progress" | "analytics" | "ai">("progress")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  // โหลด assignment + templates
  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [aRes, tRes] = await Promise.all([
        fetch(`/api/branch-eval/assignments?id=${id}`).then(r => r.json()),
        fetch(`/api/branch-eval/templates`).then(r => r.json()).catch(() => ({ templates: [] })),
      ])
      setData(aRes)
      setTemplates(tRes.templates ?? [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  // ⚠️ Hooks ทุกตัวต้องอยู่ก่อน early return เพื่อให้ลำดับ hooks คงที่ในทุก render
  const targets: any[] = data?.targets ?? []
  const byAssignee = useMemo(() => {
    const m = new Map<string, Group>()
    for (const t of targets) {
      const k = t.assignee_id
      if (!m.has(k)) m.set(k, { assignee: t.assignee, rows: [], done: 0, total: 0 })
      const g = m.get(k)!
      g.rows.push(t)
      g.total++
      if (t.completed_at) g.done++
    }
    return Array.from(m.values()).sort((a, b) => b.done / Math.max(1, b.total) - a.done / Math.max(1, a.total))
  }, [targets])

  // ── PATCH template ของ target (optimistic) ──
  const updateTargetTemplate = async (targetId: string, tplId: string) => {
    const tplObj = templates.find(t => t.id === tplId)
    // optimistic: อัพเดต UI ก่อน
    setData((d: any) => ({
      ...d,
      targets: d.targets.map((t: any) =>
        t.id === targetId
          ? { ...t, template_id: tplId, template: tplObj ? { id: tplObj.id, name: tplObj.name } : t.template }
          : t
      ),
    }))
    const res = await fetch("/api/branch-eval/assignments/targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetId, template_id: tplId }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || "เปลี่ยน template ไม่สำเร็จ")
      load(true) // revert
      return
    }
    toast.success("เปลี่ยน template แล้ว")
  }

  // ── XLSX export ──
  const exportXlsx = () => {
    if (!data?.targets) return
    const asg = data.assignment
    // Sheet 1: รายการ targets ทั้งหมด
    const rows = data.targets.map((t: any) => ({
      "ลูกน้อง": `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th || ""}`,
      "ชื่อเล่น": t.assignee?.nickname || "",
      "รหัสพนักงาน": t.assignee?.employee_code || "",
      "สาขา": t.branch?.name || "",
      "รหัสสาขา": t.branch?.code || "",
      "Template": t.template?.name || asg.template?.name || "",
      "สถานะ": t.completed_at ? "✅ เสร็จแล้ว" : "⏳ รอทำ",
      "วันที่เสร็จ": t.completed_at ? format(new Date(t.completed_at), "yyyy-MM-dd HH:mm") : "",
      "คะแนน %": t.evaluation?.percentage != null ? Number(t.evaluation.percentage).toFixed(2) : "",
      "คะแนนรวม": t.evaluation?.total_score ?? "",
      "คะแนนเต็ม": t.evaluation?.total_weight ?? "",
      "Eval ID": t.evaluation?.id || "",
    }))
    // Sheet 2: สรุปต่อคน
    const byA = new Map<string, { name: string; total: number; done: number; sumPct: number; cntPct: number }>()
    for (const t of data.targets as any[]) {
      const key = t.assignee_id
      const cur = byA.get(key) ?? {
        name: `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th || ""}`,
        total: 0, done: 0, sumPct: 0, cntPct: 0,
      }
      cur.total++
      if (t.completed_at) {
        cur.done++
        if (t.evaluation?.percentage != null) {
          cur.sumPct += Number(t.evaluation.percentage)
          cur.cntPct++
        }
      }
      byA.set(key, cur)
    }
    const summaryRows = Array.from(byA.values()).map(v => ({
      "ลูกน้อง": v.name,
      "ทั้งหมด": v.total,
      "เสร็จแล้ว": v.done,
      "คงเหลือ": v.total - v.done,
      "ความคืบหน้า %": ((v.done / v.total) * 100).toFixed(1),
      "คะแนนเฉลี่ย %": v.cntPct > 0 ? (v.sumPct / v.cntPct).toFixed(2) : "",
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(rows)
    const ws2 = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, ws2, "สรุปต่อคน")
    XLSX.utils.book_append_sheet(wb, ws1, "รายการทั้งหมด")
    const safeTitle = asg.title.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 30)
    XLSX.writeFile(wb, `assignment_${safeTitle}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`)
    toast.success("ดาวน์โหลด xlsx แล้ว")
  }

  // ── AI insight ──
  const runAiInsight = async () => {
    setAiLoading(true)
    setAiResult("")
    try {
      const res = await fetch(`/api/branch-eval/assignments/${id}/ai`, { method: "POST" })
      if (!res.ok) {
        // Error path — อาจเป็น JSON หรือ text
        const text = await res.text()
        let msg = text
        try { msg = JSON.parse(text).error || text } catch {}
        toast.error(msg || "AI วิเคราะห์ไม่สำเร็จ")
        setAiResult(null)
        return
      }
      // Streaming response → append chunks
      const reader = res.body?.getReader()
      if (!reader) {
        const text = await res.text()
        // อาจเป็น JSON เก่า { summary: ... } หรือ plain text
        try { setAiResult(JSON.parse(text).summary || text) } catch { setAiResult(text) }
        return
      }
      const decoder = new TextDecoder()
      let acc = ""
      let pending = false
      const flush = () => { pending = false; setAiResult(acc) }
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        if (!pending) { pending = true; requestAnimationFrame(flush) }
      }
      flush()
    } catch (e: any) {
      toast.error(e.message || "AI error")
      setAiResult(null)
    } finally {
      setAiLoading(false)
    }
  }

  // ── DELETE target ──
  const deleteTarget = async (targetId: string) => {
    if (!confirm("ลบงานนี้ออกจากการบ้าน?")) return
    setData((d: any) => ({ ...d, targets: d.targets.filter((t: any) => t.id !== targetId) }))
    const res = await fetch(`/api/branch-eval/assignments/targets?id=${targetId}`, { method: "DELETE" })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || "ลบไม่สำเร็จ")
      load(true) // revert
      return
    }
    toast.success("ลบแล้ว")
  }

  if (loading) return (
    <div className="p-4 max-w-4xl mx-auto"><div className="h-20 bg-slate-100 rounded-2xl animate-pulse" /></div>
  )
  if (!data?.assignment) return (
    <div className="p-6 text-center text-slate-400">ไม่พบการบ้าน</div>
  )

  const asg = data.assignment
  const tpl = asg.template

  // Overall stats
  const total = targets.length
  const done = targets.filter(t => t.completed_at).length
  const progress = total > 0 ? (done / total) * 100 : 0
  const overdue = asg.due_date && new Date(asg.due_date) < new Date() && done < total

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <Link href="/app/branch-eval/manage/assignments" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
          <ArrowLeft size={14} /> การบ้าน
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={exportXlsx}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm">
            <FileDown size={14} /> Export XLSX
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-lg shadow-sm">
            <Plus size={14} /> เพิ่มงาน / template
          </button>
        </div>
      </div>

      {/* Header */}
      <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${
        done === total ? "border-emerald-200"
        : overdue ? "border-rose-200"
        : "border-orange-100"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            done === total ? "bg-emerald-100 text-emerald-700"
            : overdue ? "bg-rose-100 text-rose-700"
            : "bg-orange-100 text-orange-700"
          }`}>
            <ClipboardList size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-800">{asg.title}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-slate-500">
              {/* นับ unique template ใน targets — ถ้ามีหลาย → แสดง "N templates" */}
              {(() => {
                const uniqTpls = new Set(targets.map((t: any) => t.template?.id || t.template_id).filter(Boolean))
                if (uniqTpls.size <= 1) {
                  return <span className="inline-flex items-center gap-1"><Layers size={11}/>{tpl?.name}</span>
                }
                return (
                  <span className="inline-flex items-center gap-1">
                    <Layers size={11}/><b className="text-violet-700">{uniqTpls.size} templates</b>
                    <span className="text-slate-400">(default: {tpl?.name})</span>
                  </span>
                )
              })()}
              {asg.assigner && <span>· มอบโดย <b className="text-slate-700">{asg.assigner.first_name_th} {asg.assigner.last_name_th}</b></span>}
              {asg.due_date && (
                <span className={`inline-flex items-center gap-1 font-bold ${overdue ? "text-rose-700" : "text-amber-700"}`}>
                  · <Calendar size={11}/> ครบ {format(new Date(asg.due_date), "d MMM yyyy", { locale: th })}
                  {overdue && " (เลยกำหนด!)"}
                </span>
              )}
            </div>
            {asg.description && (
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">{asg.description}</p>
            )}
          </div>
        </div>

        {/* Big progress */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat color="indigo" label="ความคืบหน้า" value={`${progress.toFixed(0)}%`} sub={`${done}/${total} งาน`} />
          <Stat color="emerald" label="เสร็จแล้ว" value={done} sub="งาน" />
          <Stat color="amber" label="คงเหลือ" value={total - done} sub="งาน" />
          <Stat color="violet" label="ลูกน้อง" value={byAssignee.length} sub="คน" />
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${
            done === total ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-orange-500"
          }`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        <TabBtn active={tab === "progress"} onClick={() => setTab("progress")} icon={<Users size={13}/>}>
          ลูกน้อง ({byAssignee.length})
        </TabBtn>
        <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<BarChart3 size={13}/>}>
          📊 วิเคราะห์
        </TabBtn>
        <TabBtn active={tab === "ai"} onClick={() => setTab("ai")} icon={<Sparkles size={13}/>}>
          🤖 AI Insight
        </TabBtn>
      </div>

      {/* Tab: Progress (per-assignee) */}
      {tab === "progress" && (
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Users size={14}/> ความคืบหน้าของลูกน้องแต่ละคน
        </h2>
        {byAssignee.map(g => {
          const pct = g.total > 0 ? (g.done / g.total) * 100 : 0
          return (
            <div key={g.assignee.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className={`px-4 py-3 flex items-center gap-3 ${
                g.done === g.total ? "bg-emerald-50/40" : "bg-orange-50/40"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs ${
                  g.done === g.total ? "bg-emerald-500" : "bg-orange-500"
                }`}>
                  {g.assignee.avatar_url
                    ? <img src={g.assignee.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    : g.assignee.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-800">
                    {g.assignee.first_name_th} {g.assignee.last_name_th}
                    {g.assignee.nickname && <span className="text-slate-400 font-normal ml-1 text-xs">({g.assignee.nickname})</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">{g.assignee.employee_code}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${g.done === g.total ? "text-emerald-700" : "text-orange-700"}`}>
                    {g.done}/{g.total}
                  </p>
                  <p className="text-[10px] text-slate-500">{pct.toFixed(0)}%</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100">
                <div className={`h-full transition-all ${g.done === g.total ? "bg-emerald-500" : "bg-orange-500"}`}
                  style={{ width: `${pct}%` }} />
              </div>
              {/* Branches list */}
              <div className="divide-y divide-slate-50">
                {g.rows.map(t => {
                  const currentTplId = t.template?.id || t.template_id || asg.template_id
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        t.completed_at ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                      }`}>
                        {t.completed_at ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{t.branch?.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {t.branch?.code}
                          {t.completed_at && <> · เสร็จ {format(new Date(t.completed_at), "d MMM HH:mm", { locale: th })}</>}
                        </p>
                      </div>

                      {/* Inline template dropdown — edit ได้ถ้ายังไม่เสร็จ */}
                      {t.completed_at ? (
                        <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded">
                          📋 {t.template?.name ?? tpl?.name ?? "—"}
                        </span>
                      ) : templates.length > 0 ? (
                        <select value={currentTplId}
                          onChange={e => updateTargetTemplate(t.id, e.target.value)}
                          className="text-[10px] font-bold bg-violet-50 border border-violet-200 text-violet-700 rounded px-1.5 py-1 outline-none focus:border-violet-400 max-w-[140px]">
                          {templates.map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold text-violet-700">📋 {t.template?.name ?? tpl?.name}</span>
                      )}

                      {t.evaluation && (
                        <>
                          <span className={`text-xs font-black ${
                            Number(t.evaluation.percentage) >= 80 ? "text-emerald-700"
                            : Number(t.evaluation.percentage) >= 60 ? "text-amber-700"
                            : "text-rose-700"
                          }`}>{Number(t.evaluation.percentage).toFixed(0)}%</span>
                          <Link href={`/app/branch-eval/manage/evaluations/${t.evaluation.id}`}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                            <ChevronRight size={12} />
                          </Link>
                        </>
                      )}

                      {/* ปุ่มลบ — เฉพาะที่ยังไม่ completed */}
                      {!t.completed_at && (
                        <button onClick={() => deleteTarget(t.id)}
                          title="ลบงานนี้"
                          className="p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Tab: Analytics */}
      {tab === "analytics" && <AnalyticsTab targets={targets} assignment={asg} />}

      {/* Tab: AI Insight */}
      {tab === "ai" && (
        <AiTab loading={aiLoading} result={aiResult} onRun={runAiInsight} canRun={done > 0} />
      )}

      {/* Add targets modal */}
      {showAddModal && (
        <AddTargetsModal
          assignmentId={id}
          defaultTemplateId={asg.template_id}
          existingPairs={new Set(targets.map((t: any) => `${t.assignee_id}|${t.branch_id}`))}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); load(true) }}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
        active ? "border-orange-500 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}>
      {icon}{children}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════
// AnalyticsTab — สรุปสถานะ + คะแนน + breakdown ต่างๆ
// ════════════════════════════════════════════════════════════════════
function AnalyticsTab({ targets, assignment }: { targets: any[]; assignment: any }) {
  if (targets.length === 0) {
    return <div className="text-center py-12 text-slate-400">ยังไม่มี target</div>
  }

  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = assignment.due_date && assignment.due_date < today

  // Status counts
  const done = targets.filter(t => t.completed_at).length
  const pending = targets.length - done
  const inProgress = 0  // (TODO: ถ้ามี draft eval → in progress)

  // Score stats (เฉพาะที่เสร็จแล้ว + มี % )
  const scored = targets.filter(t => t.completed_at && t.evaluation?.percentage != null)
  const pcts = scored.map(t => Number(t.evaluation.percentage))
  const avg = pcts.length > 0 ? pcts.reduce((s, x) => s + x, 0) / pcts.length : 0
  const max = pcts.length > 0 ? Math.max(...pcts) : 0
  const min = pcts.length > 0 ? Math.min(...pcts) : 0
  const above80 = pcts.filter(p => p >= 80).length
  const mid = pcts.filter(p => p >= 60 && p < 80).length
  const below60 = pcts.filter(p => p < 60).length

  // Per-assignee
  const byA = new Map<string, { name: string; nickname?: string; code: string; total: number; done: number; sumPct: number; cntPct: number }>()
  for (const t of targets) {
    const k = t.assignee_id
    const cur = byA.get(k) ?? {
      name: `${t.assignee?.first_name_th || ""} ${t.assignee?.last_name_th || ""}`,
      nickname: t.assignee?.nickname,
      code: t.assignee?.employee_code || "",
      total: 0, done: 0, sumPct: 0, cntPct: 0,
    }
    cur.total++
    if (t.completed_at) {
      cur.done++
      if (t.evaluation?.percentage != null) {
        cur.sumPct += Number(t.evaluation.percentage)
        cur.cntPct++
      }
    }
    byA.set(k, cur)
  }
  const perAssignee = Array.from(byA.values()).sort((a, b) => b.done / b.total - a.done / a.total)

  // Per-template
  const byT = new Map<string, { name: string; total: number; done: number; sumPct: number; cntPct: number }>()
  for (const t of targets) {
    const tid = t.template?.id || t.template_id || assignment.template_id
    const name = t.template?.name || assignment.template?.name || "—"
    const cur = byT.get(tid) ?? { name, total: 0, done: 0, sumPct: 0, cntPct: 0 }
    cur.total++
    if (t.completed_at) {
      cur.done++
      if (t.evaluation?.percentage != null) {
        cur.sumPct += Number(t.evaluation.percentage)
        cur.cntPct++
      }
    }
    byT.set(tid, cur)
  }
  const perTemplate = Array.from(byT.values()).sort((a, b) => b.total - a.total)

  // รายการที่ทำแล้ว / ยังไม่ทำ
  const doneList = targets.filter(t => t.completed_at)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
  const pendingList = targets.filter(t => !t.completed_at)

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase text-emerald-700 opacity-80">✅ เสร็จแล้ว</p>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">{done}</p>
          <p className="text-[10px] text-emerald-600">{targets.length > 0 ? ((done/targets.length)*100).toFixed(0) : 0}% ของทั้งหมด</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase text-amber-700 opacity-80">⏳ ยังไม่ทำ</p>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{pending}</p>
          <p className="text-[10px] text-amber-600">{targets.length > 0 ? ((pending/targets.length)*100).toFixed(0) : 0}% คงเหลือ</p>
        </div>
        <div className={`border rounded-2xl p-3 ${isOverdue ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100"}`}>
          <p className={`text-[10px] font-bold uppercase opacity-80 ${isOverdue ? "text-rose-700" : "text-slate-700"}`}>
            {isOverdue ? "⚠️ เลยกำหนด" : "📅 ครบกำหนด"}
          </p>
          <p className={`text-sm font-black mt-1 ${isOverdue ? "text-rose-700" : "text-slate-700"}`}>
            {assignment.due_date
              ? format(new Date(assignment.due_date), "d MMM yyyy", { locale: th })
              : "—"}
          </p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase text-violet-700 opacity-80">📊 คะแนนเฉลี่ย</p>
          <p className="text-2xl font-black text-violet-700 mt-0.5">{pcts.length > 0 ? `${avg.toFixed(0)}%` : "—"}</p>
          <p className="text-[10px] text-violet-600">จาก {pcts.length} ฟอร์ม</p>
        </div>
      </div>

      {/* Score distribution */}
      {pcts.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-3">
            <Award size={14} className="text-violet-500"/> การกระจายคะแนน ({pcts.length} ฟอร์ม)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ScoreBar color="emerald" label="≥ 80% (ดีเยี่ยม)" count={above80} total={pcts.length} />
            <ScoreBar color="amber" label="60–79% (พอใช้)" count={mid} total={pcts.length} />
            <ScoreBar color="rose" label="< 60% (ต้องปรับ)" count={below60} total={pcts.length} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Stat color="emerald" label="สูงสุด" value={`${max.toFixed(0)}%`} sub="" />
            <Stat color="indigo" label="เฉลี่ย" value={`${avg.toFixed(0)}%`} sub="" />
            <Stat color="amber" label="ต่ำสุด" value={`${min.toFixed(0)}%`} sub="" />
          </div>
        </div>
      )}

      {/* Per-assignee table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <p className="text-sm font-black text-slate-800 px-4 py-3 border-b border-slate-100">
          👥 สรุปต่อลูกน้อง ({perAssignee.length} คน)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px]">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-slate-600">ลูกน้อง</th>
                <th className="text-center px-2 py-2 font-bold text-slate-600">ทั้งหมด</th>
                <th className="text-center px-2 py-2 font-bold text-emerald-700">เสร็จ</th>
                <th className="text-center px-2 py-2 font-bold text-amber-700">คงเหลือ</th>
                <th className="text-center px-2 py-2 font-bold text-slate-600">ความคืบหน้า</th>
                <th className="text-center px-2 py-2 font-bold text-violet-700">เฉลี่ย%</th>
              </tr>
            </thead>
            <tbody>
              {perAssignee.map((r, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-bold text-slate-800 truncate">{r.name}{r.nickname && <span className="text-slate-400 font-normal ml-1">({r.nickname})</span>}</p>
                    <p className="text-[9px] text-slate-400">{r.code}</p>
                  </td>
                  <td className="text-center px-2 py-2 font-bold text-slate-700">{r.total}</td>
                  <td className="text-center px-2 py-2 font-bold text-emerald-700">{r.done}</td>
                  <td className="text-center px-2 py-2 font-bold text-amber-700">{r.total - r.done}</td>
                  <td className="text-center px-2 py-2">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${r.done === r.total ? "bg-emerald-500" : "bg-orange-500"}`}
                          style={{ width: `${(r.done/r.total)*100}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-600">{((r.done/r.total)*100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 font-black text-violet-700">
                    {r.cntPct > 0 ? `${(r.sumPct/r.cntPct).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-template (only if >1 template) */}
      {perTemplate.length > 1 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <p className="text-sm font-black text-slate-800 px-4 py-3 border-b border-slate-100">
            📋 สรุปต่อ Template ({perTemplate.length} แบบ)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px]">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Template</th>
                  <th className="text-center px-2 py-2 font-bold text-slate-600">งาน</th>
                  <th className="text-center px-2 py-2 font-bold text-emerald-700">เสร็จ</th>
                  <th className="text-center px-2 py-2 font-bold text-violet-700">เฉลี่ย%</th>
                </tr>
              </thead>
              <tbody>
                {perTemplate.map((r, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-800">{r.name}</td>
                    <td className="text-center px-2 py-2 font-bold text-slate-700">{r.total}</td>
                    <td className="text-center px-2 py-2 font-bold text-emerald-700">{r.done}/{r.total}</td>
                    <td className="text-center px-2 py-2 font-black text-violet-700">
                      {r.cntPct > 0 ? `${(r.sumPct/r.cntPct).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Split: Done vs Pending lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ✅ Done */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl shadow-sm overflow-hidden">
          <p className="text-sm font-black text-emerald-800 px-4 py-3 border-b border-emerald-100 bg-emerald-50/40">
            ✅ ทำแล้ว ({doneList.length})
          </p>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {doneList.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">ยังไม่มี</p>
            ) : doneList.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.branch?.name}</p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {t.assignee?.first_name_th} · {format(new Date(t.completed_at), "d MMM HH:mm", { locale: th })}
                  </p>
                </div>
                {t.evaluation?.percentage != null && (
                  <span className={`text-xs font-black ${
                    Number(t.evaluation.percentage) >= 80 ? "text-emerald-700"
                    : Number(t.evaluation.percentage) >= 60 ? "text-amber-700"
                    : "text-rose-700"
                  }`}>{Number(t.evaluation.percentage).toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ⏳ Pending */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-sm overflow-hidden">
          <p className="text-sm font-black text-amber-800 px-4 py-3 border-b border-amber-100 bg-amber-50/40">
            ⏳ ยังไม่ทำ ({pendingList.length})
          </p>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {pendingList.length === 0 ? (
              <p className="text-center py-6 text-emerald-600 text-xs font-bold">🎉 ทำหมดแล้ว!</p>
            ) : pendingList.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                <Clock size={13} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{t.branch?.name}</p>
                  <p className="text-[9px] text-slate-400 truncate">{t.assignee?.first_name_th} · {t.assignee?.employee_code}</p>
                </div>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">รอ</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ color, label, count, total }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const palette: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }
  return (
    <div className="bg-slate-50 rounded-xl p-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-slate-600">{label}</p>
        <p className="text-xs font-black text-slate-800">{count}</p>
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden">
        <div className={`h-full ${palette[color]}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-slate-500 mt-0.5">{pct.toFixed(0)}%</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// AiTab — AI วิเคราะห์การบ้านนี้
// ════════════════════════════════════════════════════════════════════
function AiTab({ loading, result, onRun, canRun }: any) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-violet-900 text-lg">🤖 AI วิเคราะห์การบ้านนี้</h3>
            <p className="text-xs text-violet-700 mt-1">
              AI จะดูข้อมูลการบ้านนี้ทั้งหมด → สรุปความคืบหน้า, จุดที่ต้องดูแล, recommendation
            </p>
            <button onClick={onRun} disabled={loading || !canRun}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-sm">
              {loading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
              {loading ? "กำลังวิเคราะห์..." : result ? "วิเคราะห์ใหม่" : "เริ่มวิเคราะห์"}
            </button>
            {!canRun && (
              <p className="text-[10px] text-amber-700 mt-2 inline-flex items-center gap-1">
                <AlertTriangle size={10}/> ยังไม่มีฟอร์มที่เสร็จ — รอลูกน้องทำก่อนถึงจะวิเคราะห์ได้
              </p>
            )}
          </div>
        </div>
      </div>

      {(result || loading) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm text-slate-700 whitespace-pre-wrap font-[Sarabun] leading-relaxed">
            {result ? result.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#+\s*/gm, "") : ""}
            {loading && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-violet-500 align-middle animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ color, label, value, sub }: any) {
  const palette: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  }
  return (
    <div className={`${palette[color]} rounded-xl p-2.5`}>
      <p className="text-[10px] font-bold opacity-70 uppercase">{label}</p>
      <p className="text-xl font-black mt-0.5 leading-none">{value}</p>
      <p className="text-[10px] font-bold opacity-60 mt-0.5">{sub}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// AddTargetsModal — เพิ่มงาน/template เข้า assignment เดิม
// ════════════════════════════════════════════════════════════════════
function AddTargetsModal({
  assignmentId, defaultTemplateId, existingPairs, onClose, onAdded,
}: {
  assignmentId: string
  defaultTemplateId: string
  existingPairs: Set<string>
  onClose: () => void
  onAdded: () => void
}) {
  const [templates, setTemplates] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [assignees, setAssignees] = useState<Set<string>>(new Set())
  // perPerson: Map<assigneeId, Map<branchId, templateId>>
  const [perPerson, setPerPerson] = useState<Map<string, Map<string, string>>>(new Map())
  const [empSearch, setEmpSearch] = useState("")
  const [brSearch, setBrSearch] = useState("")
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [addingBranchFor, setAddingBranchFor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/branch-eval/templates").then(r => r.json()).catch(() => ({ templates: [] })),
      supabase.from("employees").select("id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code, department:departments(name)")
        .eq("is_active", true).order("first_name_th").limit(2000),
      supabase.from("branches").select("id, code, name, company_id, company:companies(code,name_th)")
        .eq("is_active", true).order("name").limit(1500),
    ]).then(([t, e, b]) => {
      setTemplates(t.templates ?? [])
      setEmployees(e.data ?? [])
      setBranches(b.data ?? [])
    })
  }, [])

  // ── per-person helpers ──
  const getPersonBranches = (aid: string): Map<string, string> => perPerson.get(aid) ?? new Map()
  const addBranchToPerson = (aid: string, bid: string) => setPerPerson(m => {
    const next = new Map(m)
    const inner = new Map(next.get(aid) ?? new Map())
    if (!inner.has(bid)) inner.set(bid, defaultTemplateId)
    next.set(aid, inner)
    return next
  })
  const removeBranchFromPerson = (aid: string, bid: string) => setPerPerson(m => {
    const next = new Map(m)
    const inner = new Map(next.get(aid) ?? new Map())
    inner.delete(bid)
    next.set(aid, inner)
    return next
  })
  const setBranchTplForPerson = (aid: string, bid: string, tid: string) => setPerPerson(m => {
    const next = new Map(m)
    const inner = new Map(next.get(aid) ?? new Map())
    inner.set(bid, tid)
    next.set(aid, inner)
    return next
  })
  const copyFromPerson = (toAid: string, fromAid: string) => setPerPerson(m => {
    const fromBranches = m.get(fromAid)
    if (!fromBranches) return m
    const next = new Map(m)
    next.set(toAid, new Map(fromBranches))
    return next
  })

  const empFiltered = useMemo(() => {
    const terms = empSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return employees.slice(0, 50)
    return employees.filter((e: any) => {
      const hay = `${e.first_name_th || ""} ${e.last_name_th || ""} ${e.first_name_en || ""} ${e.last_name_en || ""} ${e.nickname || ""} ${e.employee_code || ""} ${e.department?.name || ""}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    }).slice(0, 80)
  }, [employees, empSearch])

  const brFiltered = useMemo(() => {
    const terms = brSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return branches.slice(0, 80)
    return branches.filter((b: any) => {
      const hay = `${b.name || ""} ${b.code || ""} ${b.company?.name_th || ""} ${b.company?.code || ""}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    }).slice(0, 100)
  }, [branches, brSearch])

  const toggleEmp = (id: string) => {
    setAssignees(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
    setPerPerson(m => {
      const next = new Map(m)
      if (assignees.has(id)) next.delete(id)
      else if (!next.has(id)) next.set(id, new Map())
      return next
    })
  }

  // นับ targets ทั้งหมด (filter dupe ออก)
  const selectedAssigneeObjs = employees.filter((e: any) => assignees.has(e.id))
  let newCount = 0
  let dupeCount = 0
  for (const [aid, branches] of Array.from(perPerson.entries())) {
    for (const bid of Array.from(branches.keys())) {
      if (existingPairs.has(`${aid}|${bid}`)) dupeCount++
      else newCount++
    }
  }
  const defaultTplName = templates.find(t => t.id === defaultTemplateId)?.name ?? "—"

  const save = async () => {
    if (newCount === 0) {
      toast.error("ไม่มีงานใหม่ที่จะเพิ่ม")
      return
    }
    setSaving(true)
    const tid = toast.loading("กำลังเพิ่มงาน...")
    try {
      // Flatten perPerson → payload, ตัด dupe
      const payload: { assignee_id: string; branch_id: string; template_id: string }[] = []
      for (const [aid, branches] of Array.from(perPerson.entries())) {
        for (const [bid, t] of Array.from(branches.entries())) {
          if (existingPairs.has(`${aid}|${bid}`)) continue
          payload.push({ assignee_id: aid, branch_id: bid, template_id: t })
        }
      }
      const res = await fetch("/api/branch-eval/assignments/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId, targets: payload }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "เพิ่มงานไม่สำเร็จ", { id: tid }); return }
      toast.success(`เพิ่ม ${d.added} งาน${d.skipped > 0 ? ` (ซ้ำ ${d.skipped})` : ""}`, { id: tid })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus size={18} />
            <h3 className="font-black">เพิ่มงาน / template เข้าการบ้านนี้</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-[11px] text-orange-900">
            <p className="font-black">💡 วิธีใช้</p>
            <p className="mt-0.5">
              1. เลือกลูกน้อง → 2. กดเปิดการ์ดของแต่ละคน → 3. กด <b>"+ เพิ่มสาขา"</b> → 4. เลือก template ของแต่ละสาขา
            </p>
            <p className="mt-1">
              💎 default = <b>{defaultTplName}</b> · เพิ่มใหม่ <b className="text-orange-700">{newCount}</b> งาน
              {dupeCount > 0 && <span className="text-amber-700 ml-1">(ซ้ำ {dupeCount} จะถูกข้าม)</span>}
            </p>
          </div>

          {/* 1. ลูกน้อง */}
          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-1">👥 เลือกลูกน้องที่จะเพิ่มงาน</p>
            <div className="relative mb-1.5">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัส / แผนก..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <p className="text-[10px] text-slate-500 mb-1">เลือกแล้ว <b className="text-orange-700">{assignees.size}</b> คน · พบ {empFiltered.length}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto">
              {empFiltered.map((e: any) => {
                const picked = assignees.has(e.id)
                return (
                  <label key={e.id}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer border-2 transition ${picked ? "bg-orange-50 border-orange-300" : "bg-white border-slate-100 hover:border-orange-200"}`}>
                    <input type="checkbox" checked={picked} onChange={() => toggleEmp(e.id)} className="w-4 h-4 accent-orange-500" />
                    <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">{e.first_name_th?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{e.first_name_th} {e.last_name_th}{e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}</p>
                      <p className="text-[9px] text-slate-400">{e.employee_code} · {e.department?.name || "—"}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* 2. Per-person cards */}
          {selectedAssigneeObjs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-600">📦 สาขาของแต่ละคน</p>
              {selectedAssigneeObjs.map((person: any) => {
                const personBranches = getPersonBranches(person.id)
                const isExpanded = expandedPerson === person.id
                const isEmpty = personBranches.size === 0
                const otherPeople = selectedAssigneeObjs.filter((p: any) =>
                  p.id !== person.id && (perPerson.get(p.id)?.size ?? 0) > 0
                )
                return (
                  <div key={person.id} className={`rounded-2xl border-2 overflow-hidden transition ${
                    isEmpty ? "border-rose-200 bg-rose-50/20" : "border-slate-200 bg-white"
                  }`}>
                    <button onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                      className="w-full flex items-center gap-2.5 p-3 hover:bg-slate-50/50">
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                        {person.first_name_th?.[0]}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-black text-sm text-slate-800 truncate">
                          {person.first_name_th} {person.last_name_th}
                          {person.nickname && <span className="text-slate-400 font-normal ml-1">({person.nickname})</span>}
                        </p>
                        <p className="text-[10px] mt-0.5">
                          {isEmpty ? (
                            <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                              <AlertCircle size={10}/> ยังไม่ได้เพิ่มสาขา
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              <b className="text-orange-700">{personBranches.size}</b> สาขา · <b>{new Set(Array.from(personBranches.values())).size}</b> template
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronDown size={16} className={`text-slate-400 transition flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/30 p-3 space-y-2">
                        {Array.from(personBranches.entries()).map(([bid, tid]) => {
                          const branch = branches.find((b: any) => b.id === bid)
                          if (!branch) return null
                          const isDupe = existingPairs.has(`${person.id}|${bid}`)
                          const isOverride = tid !== defaultTemplateId
                          return (
                            <div key={bid} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
                              isDupe ? "bg-amber-50/40 border-amber-200" : "bg-white border-slate-100"
                            }`}>
                              <Store size={12} className="text-sky-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{branch.name}</p>
                                <p className="text-[9px] text-slate-400">
                                  {branch.code}
                                  {isDupe && <span className="text-amber-700 font-bold ml-1">⚠️ มีงานนี้อยู่แล้ว — จะถูกข้าม</span>}
                                </p>
                              </div>
                              <select value={tid}
                                disabled={isDupe}
                                onChange={e => setBranchTplForPerson(person.id, bid, e.target.value)}
                                className={`text-[10px] font-bold rounded px-1.5 py-1 outline-none max-w-[140px] disabled:opacity-50 ${
                                  isOverride
                                    ? "bg-amber-50 border border-amber-300 text-amber-800"
                                    : "bg-slate-50 border border-slate-200 text-slate-700"
                                }`}>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <button onClick={() => removeBranchFromPerson(person.id, bid)}
                                className="p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded flex-shrink-0">
                                <X size={11} />
                              </button>
                            </div>
                          )
                        })}

                        {addingBranchFor === person.id ? (
                          <div className="bg-white border-2 border-orange-200 rounded-xl p-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Search size={13} className="text-slate-400 flex-shrink-0 ml-1" />
                              <input value={brSearch} onChange={e => setBrSearch(e.target.value)}
                                autoFocus
                                placeholder="ค้นหาสาขา..."
                                className="flex-1 bg-transparent text-xs outline-none" />
                              <button onClick={() => { setAddingBranchFor(null); setBrSearch("") }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-1.5 py-0.5">
                                ปิด
                              </button>
                            </div>
                            {(() => {
                              const visible = brFiltered.filter((b: any) => !personBranches.has(b.id))
                              return (
                                <>
                                  {visible.length > 0 && (
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                                      <span>พบ {visible.length} สาขา</span>
                                      <button onClick={() => visible.slice(0, 50).forEach((b: any) => addBranchToPerson(person.id, b.id))}
                                        className="font-bold text-orange-600 hover:text-orange-800 underline">
                                        + เพิ่มทั้งหมดที่เห็น
                                      </button>
                                    </div>
                                  )}
                                  <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {visible.map((b: any) => {
                                      const isDupe = existingPairs.has(`${person.id}|${b.id}`)
                                      return (
                                        <button key={b.id} onClick={() => addBranchToPerson(person.id, b.id)}
                                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition ${
                                            isDupe
                                              ? "bg-amber-50/40 border-amber-200 hover:bg-amber-50"
                                              : "bg-slate-50 hover:bg-orange-50 border-transparent hover:border-orange-200"
                                          }`}>
                                          <Store size={11} className="text-sky-500 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold truncate">{b.name}</p>
                                            <p className="text-[9px] text-slate-400">
                                              {b.code}
                                              {isDupe && <span className="text-amber-700 ml-1">⚠️ มีอยู่แล้ว</span>}
                                            </p>
                                          </div>
                                          <Plus size={11} className="text-orange-500 flex-shrink-0" />
                                        </button>
                                      )
                                    })}
                                    {visible.length === 0 && (
                                      <p className="col-span-2 text-center text-[10px] text-slate-400 py-3 italic">
                                        ไม่พบสาขา
                                      </p>
                                    )}
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => { setAddingBranchFor(person.id); setBrSearch("") }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-lg shadow-sm">
                              <Plus size={12} /> เพิ่มสาขา
                            </button>
                            {otherPeople.length > 0 && (
                              <select onChange={e => {
                                if (e.target.value) {
                                  copyFromPerson(person.id, e.target.value)
                                  e.target.value = ""
                                }
                              }}
                                className="text-[10px] font-bold bg-violet-50 border border-violet-200 text-violet-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
                                <option value="">📋 คัดลอกจาก...</option>
                                {otherPeople.map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.first_name_th} ({perPerson.get(p.id)?.size} สาขา)
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button onClick={onClose}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
            ยกเลิก
          </button>
          <button onClick={save} disabled={saving || newCount === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-lg inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            เพิ่ม {newCount} งาน
          </button>
        </div>
      </div>
    </div>
  )
}
