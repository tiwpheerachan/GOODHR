"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Target, Search, ChevronDown, ChevronUp, Loader2, BarChart3,
  Award, MessageSquare, Eye, TrendingUp, Users, Building2, Filter,
  CheckCircle2, XCircle, Clock, AlertCircle, Pencil, Paperclip, FileText, ExternalLink,
  Download,
} from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import FeishuSyncButton from "@/components/admin/FeishuSyncButton"
import { useLanguage, useEmployeeName } from "@/lib/i18n"

const MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

const GRADE_CONF: Record<string, { bg: string; text: string; ring: string; barColor: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", barColor: "bg-emerald-500" },
  B: { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    barColor: "bg-blue-500" },
  C: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   barColor: "bg-amber-500" },
  D: { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     barColor: "bg-red-500" },
}

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

// ── Mini Donut ────────────────────────────────────────────────────────────────
function GradeDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const r = 36, circ = 2 * Math.PI * r
  const colors = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#ef4444" }
  let off = 0
  const arcs = (["A", "B", "C", "D"] as const).map(g => {
    const len = total > 0 ? (counts[g] / total) * circ : 0
    const arc = { color: colors[g], da: `${len} ${circ - len}`, do: -(off) + (circ * 0.25) }
    off += len; return arc
  })
  return (
    <svg width={88} height={88} className="-rotate-90">
      <circle cx={44} cy={44} r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
      {arcs.map((a, i) => (
        <circle key={i} cx={44} cy={44} r={r} fill="none" stroke={a.color} strokeWidth={12}
          strokeDasharray={a.da} strokeDashoffset={a.do} strokeLinecap="butt" />
      ))}
    </svg>
  )
}

export default function AdminKpiPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const supabase = createClient()

  const [year, setYear] = useState(new Date().getFullYear())
  // default = เดือนปัจจุบัน → ให้ section "ยังไม่ได้ประเมิน" ทำงานทันที
  const [month, setMonth] = useState<number | null>(new Date().getMonth() + 1)
  const [forms, setForms] = useState<any[]>([])
  const [pendingEmps, setPendingEmps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── Main tab: ผลประเมิน vs ยังไม่ได้ประเมิน ──
  const [mainTab, setMainTab] = useState<"evaluated" | "pending">("evaluated")

  // ── Filters เฉพาะ tab "pending" ──
  const [pStatusFilter, setPStatusFilter] = useState<Set<string>>(new Set()) // not_started/draft/rejected
  const [pDeptFilter,   setPDeptFilter]   = useState("")
  const [pPosFilter,    setPPosFilter]    = useState("")
  const [pMgrFilter,    setPMgrFilter]    = useState("")
  const [pSearch,       setPSearch]       = useState("")
  const [pCompanyFilter, setPCompanyFilter] = useState("")

  // Filters
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [evaluatorFilter, setEvaluatorFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // Companies for multi-company orgs
  const [companies, setCompanies] = useState<any[]>([])

  // Detail expand
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Approve/Reject
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Load companies (for super_admin)
  useEffect(() => {
    if (!user) return
    const role = (user as any)?.role
    if (role === "super_admin") {
      supabase.from("companies").select("id, name_th, code").eq("is_active", true)
        .then(({ data }) => setCompanies(data ?? []))
    }
  }, [user]) // eslint-disable-line

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ mode: "admin", year: String(year) })
    if (month) params.set("month", String(month))
    try {
      const res = await fetch(`/api/kpi?${params}`)
      const data = await res.json()
      setForms(data.forms ?? [])
      setPendingEmps(data.pending_employees ?? [])
    } catch {}
    setLoading(false)
  }, [year, month])

  useEffect(() => { if (user) load() }, [user, load])

  const loadDetail = async (formId: string) => {
    if (expanded === formId) { setExpanded(null); setDetail(null); return }
    setExpanded(formId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/kpi?mode=single&form_id=${formId}`)
      const data = await res.json()
      setDetail(data.form)
    } catch {}
    setDetailLoading(false)
  }

  // ── Approve / Reject handlers ──
  const handleApprove = async (formId: string) => {
    if (!confirm(t("admin.kpi.confirm_approve"))) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/kpi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", form_id: formId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t("admin.kpi.toast_approved"))
        load()
        setExpanded(null)
      } else {
        toast.error(data.error || t("admin.kpi.err_generic"))
      }
    } catch { toast.error(t("admin.kpi.err_generic")) }
    setActionLoading(false)
  }

  // ── Revert (ย้อนสถานะ): approved/rejected → submitted (รออนุมัติ) ──
  const handleRevert = async (formId: string, targetStatus: "submitted" | "draft" = "submitted") => {
    const targetLabel = targetStatus === "draft" ? t("admin.kpi.status_draft_pending") : t("admin.kpi.revert_pending")
    if (!confirm(t("admin.kpi.confirm_revert", { label: targetLabel }))) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/kpi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert", form_id: formId, target_status: targetStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t("admin.kpi.toast_reverted", { label: targetLabel }))
        load()
        setExpanded(null)
      } else {
        toast.error(data.error || t("admin.kpi.err_generic"))
      }
    } catch { toast.error(t("admin.kpi.err_generic")) }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/kpi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", form_id: showRejectModal, rejection_note: rejectNote }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t("admin.kpi.toast_rejected"))
        setShowRejectModal(null)
        setRejectNote("")
        load()
        setExpanded(null)
      } else {
        toast.error(data.error || t("admin.kpi.err_generic"))
      }
    } catch { toast.error(t("admin.kpi.err_generic")) }
    setActionLoading(false)
  }

  // Derived filter options
  const departments = Array.from(new Set(forms.map((f: any) => f.employee?.department?.name).filter(Boolean)))
  const evaluators = Array.from(new Set(forms.map((f: any) => {
    const ev = f.evaluator
    return ev ? `${ev.first_name_th} ${ev.last_name_th}` : null
  }).filter(Boolean)))

  // Apply filters
  const filtered = forms.filter(f => {
    const name = `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""} ${f.employee?.employee_code ?? ""}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (gradeFilter && f.grade !== gradeFilter) return false
    if (deptFilter && f.employee?.department?.name !== deptFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (evaluatorFilter) {
      const evName = f.evaluator ? `${f.evaluator.first_name_th} ${f.evaluator.last_name_th}` : ""
      if (evName !== evaluatorFilter) return false
    }
    return true
  })

  // Stats
  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  filtered.forEach(f => { if (gradeCount[f.grade] !== undefined) gradeCount[f.grade]++ })
  const avgScore = filtered.length > 0 ? filtered.reduce((s: number, f: any) => s + f.total_score, 0) / filtered.length : 0
  const pendingCount = filtered.filter(f => f.status === "submitted").length
  const approvedCount = filtered.filter(f => f.status === "approved").length
  const rejectedCount = filtered.filter(f => f.status === "rejected").length
  const draftCount = filtered.filter(f => f.status === "draft").length

  // Department averages
  const deptAvg: Record<string, { sum: number; count: number }> = {}
  filtered.filter(f => ["submitted", "approved", "acknowledged"].includes(f.status)).forEach(f => {
    const dept = f.employee?.department?.name || "ไม่ระบุ"
    if (!deptAvg[dept]) deptAvg[dept] = { sum: 0, count: 0 }
    deptAvg[dept].sum += f.total_score
    deptAvg[dept].count++
  })
  const deptAvgList = Object.entries(deptAvg)
    .map(([name, d]) => ({ name, avg: d.sum / d.count, count: d.count }))
    .sort((a, b) => b.avg - a.avg)

  const activeFilters = [gradeFilter, deptFilter, evaluatorFilter, statusFilter, search].filter(Boolean).length

  // ── Export to xlsx ─────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportXlsx = async () => {
    if (filtered.length === 0) { toast.error(t("admin.kpi.no_data_export")); return }
    setExporting(true); setExportProgress(0)
    const tid = toast.loading(t("admin.kpi.loading_details", { done: 0, total: filtered.length }))
    try {
      // ── โหลด detail ของทุกฟอร์ม (ทีละ 5 พร้อมกัน) เพื่อได้ items ──
      const details: any[] = []
      const BATCH = 5
      for (let i = 0; i < filtered.length; i += BATCH) {
        const slice = filtered.slice(i, i + BATCH)
        const got = await Promise.all(slice.map(async (f: any) => {
          try {
            const r = await fetch(`/api/kpi?mode=single&form_id=${f.id}`)
            const d = await r.json()
            return d.form
          } catch { return f }
        }))
        details.push(...got)
        setExportProgress(details.length)
        toast.loading(t("admin.kpi.loading_details", { done: details.length, total: filtered.length }), { id: tid })
      }

      const XLSX = await import("xlsx")
      const period = `${MONTHS[month ?? 1] || "ทั้งปี"} ${(year + 543)}`

      // ── Sheet 1: สรุปรายคน ──────────────────────────────────────
      const summary = details.map((f: any, idx: number) => ({
        "ลำดับ": idx + 1,
        "รหัสพนักงาน": f.employee?.employee_code ?? "",
        "ชื่อ-นามสกุล": `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""}`.trim(),
        "ชื่อเล่น": f.employee?.nickname ?? "",
        "แผนก": f.employee?.department?.name ?? "",
        "ตำแหน่ง": f.employee?.position?.name ?? "",
        "บริษัท": f.employee?.company?.name_th ?? "",
        "ผู้ประเมิน": f.evaluator ? `${f.evaluator.first_name_th} ${f.evaluator.last_name_th}` : "",
        "คะแนนรวม": Number(f.total_score ?? 0).toFixed(2),
        "เกรด": f.grade ?? "",
        "สถานะ": f.status === "draft" ? "ฉบับร่าง"
          : f.status === "submitted" ? "รออนุมัติ"
          : f.status === "approved" ? "อนุมัติแล้ว"
          : f.status === "acknowledged" ? "รับทราบแล้ว"
          : f.status === "rejected" ? "ถูกปฏิเสธ" : f.status,
        "ประเภทการประเมิน": f.evaluation_type === "money_only" ? "เงินรางวัลล้วน"
          : f.evaluation_type === "grade_incentive" ? "เกรด + เงินรางวัล" : "เกรดเท่านั้น",
        "เงินรางวัล (บาท)": Number(f.incentive_amount ?? 0).toLocaleString(),
        "โบนัส (บาท)": Number(f.bonus_amount ?? 0).toLocaleString(),
        "วันที่ส่ง": f.submitted_at ? format(new Date(f.submitted_at), "dd/MM/yyyy HH:mm") : "",
        "วันที่อนุมัติ": f.approved_at ? format(new Date(f.approved_at), "dd/MM/yyyy HH:mm") : "",
        "หมายเหตุ": f.review_note ?? "",
      }))
      const ws1 = XLSX.utils.json_to_sheet(summary)
      ws1["!cols"] = [
        { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 22 },
        { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 20 },
        { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 30 },
      ]

      // ── Sheet 2: รายละเอียดรายข้อ ────────────────────────────────
      const itemRows: any[] = []
      for (const f of details) {
        const items: any[] = f.kpi_items ?? f.items ?? []
        for (const item of items) {
          itemRows.push({
            "รหัสพนักงาน": f.employee?.employee_code ?? "",
            "ชื่อ-นามสกุล": `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""}`.trim(),
            "แผนก": f.employee?.department?.name ?? "",
            "หัวข้อ #": item.order_no,
            "หมวด": item.category,
            "รายละเอียด": item.description ?? "",
            "บังคับ": item.is_mandatory ? "✓" : "",
            "น้ำหนัก (%)": Number(item.weight_pct ?? 0),
            "คะแนนจริง (0-100)": Number(item.actual_score ?? 0),
            "คะแนนถ่วงน้ำหนัก": Number(item.weighted_score ?? 0).toFixed(2),
            "ความเห็นผู้ประเมิน": item.comment ?? "",
          })
        }
      }
      const ws2 = XLSX.utils.json_to_sheet(itemRows)
      ws2["!cols"] = [
        { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 22 }, { wch: 36 },
        { wch: 8 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 36 },
      ]

      // ── Sheet 3: สถิติรวม (เกรด + แผนก) ─────────────────────────
      const statRows: any[] = []
      statRows.push({ "หัวข้อ": "ช่วงเวลา", "ค่า": period })
      statRows.push({ "หัวข้อ": "จำนวนพนักงานทั้งหมด", "ค่า": filtered.length })
      statRows.push({ "หัวข้อ": "คะแนนเฉลี่ย", "ค่า": Number(avgScore.toFixed(2)) })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── นับตามเกรด ──", "ค่า": "" })
      for (const g of ["A", "B", "C", "D"] as const) statRows.push({ "หัวข้อ": `เกรด ${g}`, "ค่า": gradeCount[g] })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── นับตามสถานะ ──", "ค่า": "" })
      statRows.push({ "หัวข้อ": "อนุมัติแล้ว", "ค่า": approvedCount })
      statRows.push({ "หัวข้อ": "รออนุมัติ", "ค่า": pendingCount })
      statRows.push({ "หัวข้อ": "ฉบับร่าง", "ค่า": draftCount })
      statRows.push({ "หัวข้อ": "ถูกปฏิเสธ", "ค่า": rejectedCount })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── คะแนนเฉลี่ยตามแผนก ──", "ค่า": "" })
      for (const d of deptAvgList) {
        statRows.push({ "หัวข้อ": `${d.name} (${d.count} คน)`, "ค่า": Number(d.avg.toFixed(2)) })
      }
      const ws3 = XLSX.utils.json_to_sheet(statRows)
      ws3["!cols"] = [{ wch: 36 }, { wch: 18 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, "สรุปรายคน")
      XLSX.utils.book_append_sheet(wb, ws2, "รายละเอียดรายข้อ")
      XLSX.utils.book_append_sheet(wb, ws3, "สถิติรวม")

      const fname = `kpi_${year}${month ? `_${String(month).padStart(2, "0")}` : ""}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      XLSX.writeFile(wb, fname)
      toast.success(t("admin.kpi.export_success", { n: summary.length, items: itemRows.length }), { id: tid })
    } catch (e: any) {
      toast.error(e.message || t("admin.kpi.export_failed"), { id: tid })
    } finally {
      setExporting(false); setExportProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={20} className="text-indigo-600" />
            <h1 className="text-xl font-black text-slate-800">{t("admin.kpi.title")}</h1>
          </div>
          <p className="text-sm text-slate-400">{t("admin.kpi.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FeishuSyncButton dataset="kpi" variant="subtle"/>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setGradeFilter(""); setDeptFilter(""); setEvaluatorFilter(""); setStatusFilter("") }}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
              {t("admin.kpi.clear_filters", { n: activeFilters })}
            </button>
          )}
          <button onClick={exportXlsx} disabled={exporting || filtered.length === 0}
            title={filtered.length === 0 ? t("admin.kpi.no_data_export") : t("admin.kpi.export_title", { n: filtered.length })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm transition-all">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exporting ? t("admin.kpi.exporting_progress", { done: exportProgress, total: filtered.length }) : t("admin.kpi.export_excel", { n: filtered.length })}
          </button>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={() => setMainTab("evaluated")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            mainTab === "evaluated" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          <Target size={14} /> {t("admin.kpi.tab_evaluated")}
          {forms.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${mainTab === "evaluated" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}>
              {forms.length}
            </span>
          )}
        </button>
        <button onClick={() => setMainTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            mainTab === "pending" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          <AlertCircle size={14} /> {t("admin.kpi.tab_pending")}
          {pendingEmps.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${mainTab === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
              {pendingEmps.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Row */}
      <div className={`flex flex-wrap gap-2 ${mainTab === "pending" ? "hidden" : ""}`}>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={inp}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month ?? ""} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)} className={inp}>
          <option value="">{t("admin.kpi.all_months")}</option>
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        {companies.length > 1 && (
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className={inp}>
            <option value="">{t("admin.kpi.all_companies")}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
          </select>
        )}
        {departments.length > 0 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={inp}>
            <option value="">{t("admin.kpi.all_departments")}</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={inp}>
          <option value="">{t("admin.kpi.all_grades")}</option>
          {["A", "B", "C", "D"].map(g => <option key={g} value={g}>{t("admin.kpi.grade_label", { g })}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
          <option value="">{t("admin.kpi.all_statuses")}</option>
          <option value="submitted">{t("admin.kpi.status_submitted")}</option>
          <option value="approved">{t("admin.kpi.status_approved")}</option>
          <option value="rejected">{t("admin.kpi.status_rejected")}</option>
          <option value="draft">{t("admin.kpi.status_draft")}</option>
        </select>
        {evaluators.length > 0 && (
          <select value={evaluatorFilter} onChange={e => setEvaluatorFilter(e.target.value)} className={inp}>
            <option value="">{t("admin.kpi.all_evaluators")}</option>
            {evaluators.map(ev => <option key={ev} value={ev!}>{ev}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("admin.kpi.search_placeholder")}
            className={`${inp} pl-9 w-full`}
          />
        </div>
      </div>

      {/* Analytics Cards — เฉพาะ tab "evaluated" */}
      {mainTab === "evaluated" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grade Overview */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">{t("admin.kpi.grade_ratio")}</p>
          <div className="flex items-center gap-4">
            <GradeDonut counts={gradeCount} total={filtered.length} />
            <div className="flex-1 space-y-1.5">
              {(["A", "B", "C", "D"] as const).map(g => {
                const gc = GRADE_CONF[g]
                const pct = filtered.length > 0 ? ((gradeCount[g] / filtered.length) * 100) : 0
                return (
                  <div key={g} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md ${gc.bg} ${gc.text} text-[10px] font-black flex items-center justify-center`}>{g}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${gc.barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{gradeCount[g]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">{t("admin.kpi.score_summary")}</p>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.avg_score")}</span>
              <span className="text-2xl font-black text-slate-800">{avgScore.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.total")}</span>
              <span className="text-sm font-black text-slate-700">{t("admin.kpi.forms_count", { n: filtered.length })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.status_submitted")}</span>
              <span className="text-sm font-bold text-amber-600">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.status_approved")}</span>
              <span className="text-sm font-bold text-emerald-600">{approvedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.status_rejected")}</span>
              <span className="text-sm font-bold text-red-500">{rejectedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t("admin.kpi.status_draft")}</span>
              <span className="text-sm font-bold text-slate-400">{draftCount}</span>
            </div>
          </div>
        </div>

        {/* Department Ranking */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">
            <Building2 size={12} className="inline mr-1" />
            {t("admin.kpi.dept_avg_title")}
          </p>
          {deptAvgList.length === 0 ? (
            <p className="text-xs text-slate-300 py-6 text-center">{t("admin.kpi.no_data_yet")}</p>
          ) : (
            <div className="space-y-2.5">
              {deptAvgList.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                    i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{d.name}</span>
                  <span className="text-xs text-slate-400">{d.count} {t("admin.kpi.people_unit")}</span>
                  <span className={`text-sm font-black ${d.avg >= 81 ? "text-emerald-600" : d.avg >= 71 ? "text-amber-600" : "text-red-500"}`}>
                    {d.avg.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ═════════ TAB: ยังไม่ได้ประเมิน ═════════ */}
      {mainTab === "pending" && (() => {
        // ── หากเลือก "ทุกเดือน" — ไม่ส่ง query (API จะส่ง pending_employees=[]) ──
        if (!month) {
          return (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-indigo-800">{t("admin.kpi.pick_month_title")}</p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  {t("admin.kpi.pick_month_desc")}
                </p>
              </div>
            </div>
          )
        }

        // ── filter pendingEmps ตาม filters ที่กำหนด ──
        const lc = pSearch.toLowerCase().trim()
        const pFiltered = pendingEmps.filter((p: any) => {
          if (pStatusFilter.size > 0 && !pStatusFilter.has(p.pending_status)) return false
          if (pDeptFilter && p.department?.name !== pDeptFilter) return false
          if (pPosFilter && p.position?.name !== pPosFilter) return false
          if (pCompanyFilter && p.company_id !== pCompanyFilter) return false
          if (pMgrFilter) {
            const mn = p.direct_manager ? `${p.direct_manager.first_name_th} ${p.direct_manager.last_name_th}` : ""
            if (mn !== pMgrFilter) return false
          }
          if (lc) {
            const hay = `${p.first_name_th ?? ""} ${p.last_name_th ?? ""} ${p.employee_code ?? ""} ${p.nickname ?? ""}`.toLowerCase()
            if (!hay.includes(lc)) return false
          }
          return true
        })

        const pDepts = Array.from(new Set(pendingEmps.map((p: any) => p.department?.name).filter(Boolean))).sort() as string[]
        const pPositions = Array.from(new Set(pendingEmps.map((p: any) => p.position?.name).filter(Boolean))).sort() as string[]
        const pMgrs = Array.from(new Set(pendingEmps.map((p: any) => p.direct_manager ? `${p.direct_manager.first_name_th} ${p.direct_manager.last_name_th}` : null).filter(Boolean))).sort() as string[]

        const ns = pendingEmps.filter((p: any) => p.pending_status === "not_started").length
        const dr = pendingEmps.filter((p: any) => p.pending_status === "draft").length
        const rj = pendingEmps.filter((p: any) => p.pending_status === "rejected").length

        const toggleStatus = (s: string) => {
          const next = new Set(pStatusFilter)
          if (next.has(s)) next.delete(s); else next.add(s)
          setPStatusFilter(next)
        }
        const pActiveFilters = pStatusFilter.size + (pDeptFilter ? 1 : 0) + (pPosFilter ? 1 : 0) + (pMgrFilter ? 1 : 0) + (pSearch ? 1 : 0) + (pCompanyFilter ? 1 : 0)

        const exportPending = async () => {
          if (pFiltered.length === 0) { toast.error(t("admin.kpi.no_data_export")); return }
          try {
            const XLSX = await import("xlsx")
            const rows = pFiltered.map((p: any, idx: number) => ({
              "ลำดับ": idx + 1,
              "รหัสพนักงาน": p.employee_code ?? "",
              "ชื่อ-นามสกุล": `${p.first_name_th ?? ""} ${p.last_name_th ?? ""}`.trim(),
              "ชื่อเล่น": p.nickname ?? "",
              "แผนก": p.department?.name ?? "",
              "ตำแหน่ง": p.position?.name ?? "",
              "หัวหน้าตรง": p.direct_manager ? `${p.direct_manager.first_name_th} ${p.direct_manager.last_name_th}${p.direct_manager.nickname ? ` (${p.direct_manager.nickname})` : ""}` : "",
              "ฐาน KPI (บาท)": Number(p.standard_amount ?? 0),
              "สถานะ": p.pending_status === "not_started" ? "ยังไม่เริ่ม"
                : p.pending_status === "draft" ? "ฉบับร่าง"
                : p.pending_status === "rejected" ? "ถูกส่งคืน" : p.pending_status,
            }))
            const ws = XLSX.utils.json_to_sheet(rows)
            ws["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 14 }]
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "ยังไม่ได้ประเมิน")
            const fname = `kpi_pending_${MONTHS[month]}${year + 543}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
            XLSX.writeFile(wb, fname)
            toast.success(t("admin.kpi.export_success_people", { n: rows.length }))
          } catch (e: any) { toast.error(e.message || t("admin.kpi.export_failed")) }
        }

        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-400">{t("admin.kpi.pending_total")}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{pendingEmps.length} <span className="text-xs font-bold text-slate-400">{t("admin.kpi.people_unit")}</span></p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-rose-100 p-4">
                <p className="text-xs font-bold text-rose-600">{t("admin.kpi.status_not_started")}</p>
                <p className="text-2xl font-black text-rose-700 mt-1">{ns}</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500">{t("admin.kpi.status_draft_pending")}</p>
                <p className="text-2xl font-black text-slate-700 mt-1">{dr}</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-orange-100 p-4">
                <p className="text-xs font-bold text-orange-600">{t("admin.kpi.status_returned")}</p>
                <p className="text-2xl font-black text-orange-700 mt-1">{rj}</p>
              </div>
            </div>

            {/* Filters bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter size={12} /> {t("admin.kpi.filters_round", { month: MONTHS[month], year: year + 543 })}
                </p>
                <div className="flex items-center gap-2">
                  {pActiveFilters > 0 && (
                    <button onClick={() => {
                      setPStatusFilter(new Set()); setPDeptFilter(""); setPPosFilter("")
                      setPMgrFilter(""); setPSearch(""); setPCompanyFilter("")
                    }} className="text-[11px] font-bold text-indigo-600 hover:underline">{t("admin.kpi.clear_short", { n: pActiveFilters })}</button>
                  )}
                  <button onClick={exportPending} disabled={pFiltered.length === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                    <Download size={11} /> {t("admin.kpi.export_short", { n: pFiltered.length })}
                  </button>
                </div>
              </div>

              {/* Status pills (multi-select) */}
              <div className="flex flex-wrap gap-1.5">
                {([
                  { k: "not_started", l: t("admin.kpi.status_not_started"), c: "rose",   n: ns },
                  { k: "draft",       l: t("admin.kpi.status_draft_pending"), c: "slate",  n: dr },
                  { k: "rejected",    l: t("admin.kpi.status_returned"),  c: "orange", n: rj },
                ] as const).map(s => {
                  const on = pStatusFilter.has(s.k)
                  const colorOn = s.c === "rose" ? "bg-rose-500 border-rose-500 text-white"
                    : s.c === "slate" ? "bg-slate-700 border-slate-700 text-white"
                    : "bg-orange-500 border-orange-500 text-white"
                  return (
                    <button key={s.k} onClick={() => toggleStatus(s.k)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${on ? colorOn : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                      {s.l} <span className="opacity-70">({s.n})</span>
                    </button>
                  )
                })}
              </div>

              {/* Dropdowns + search */}
              <div className="flex flex-wrap gap-2">
                {companies.length > 1 && (
                  <select value={pCompanyFilter} onChange={e => setPCompanyFilter(e.target.value)} className={inp}>
                    <option value="">{t("admin.kpi.all_companies")}</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
                  </select>
                )}
                <select value={pDeptFilter} onChange={e => setPDeptFilter(e.target.value)} className={inp}>
                  <option value="">{t("admin.kpi.all_departments")}</option>
                  {pDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={pPosFilter} onChange={e => setPPosFilter(e.target.value)} className={inp}>
                  <option value="">{t("admin.kpi.all_positions")}</option>
                  {pPositions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={pMgrFilter} onChange={e => setPMgrFilter(e.target.value)} className={inp}>
                  <option value="">{t("admin.kpi.all_managers")}</option>
                  {pMgrs.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={pSearch} onChange={e => setPSearch(e.target.value)}
                    placeholder={t("admin.kpi.search_placeholder_nick")}
                    className={`${inp} pl-9 w-full`} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {t("admin.kpi.showing_count", { shown: pFiltered.length, total: pendingEmps.length })}
              </p>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : pFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <CheckCircle2 size={36} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">
                  {pendingEmps.length === 0 ? t("admin.kpi.no_pending_round", { month: MONTHS[month], year: year + 543 }) : t("admin.kpi.no_match_filter")}
                </p>
                {pendingEmps.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">{t("admin.kpi.all_evaluated_desc")}</p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                {pFiltered.map((p: any) => {
                  const stCfg =
                    p.pending_status === "not_started" ? { label: t("admin.kpi.status_not_started"),   cls: "bg-rose-50 text-rose-700 border-rose-200",   icon: <XCircle size={11} /> } :
                    p.pending_status === "draft"       ? { label: t("admin.kpi.status_draft_pending"),      cls: "bg-slate-50 text-slate-600 border-slate-200", icon: <FileText size={11} /> } :
                    p.pending_status === "rejected"    ? { label: t("admin.kpi.status_returned"),     cls: "bg-orange-50 text-orange-700 border-orange-200", icon: <AlertCircle size={11} /> } :
                                                         { label: p.pending_status, cls: "bg-slate-50 text-slate-500 border-slate-200", icon: <Clock size={11} /> }
                  return (
                    <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-black text-sm flex items-center justify-center shrink-0">
                          {p.first_name_th?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {empName(p)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">{p.employee_code}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.position?.name || "—"} · {p.department?.name || "—"}
                          {p.direct_manager && (
                            <span className="text-slate-400">
                              {" · " + t("admin.kpi.manager_label") + ": "}
                              <span className="text-indigo-600 font-semibold">
                                {empName(p.direct_manager)}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                      {p.standard_amount > 0 && (
                        <div className="text-right shrink-0 hidden md:block">
                          <p className="text-[10px] text-slate-400">{t("admin.kpi.kpi_base")}</p>
                          <p className="text-xs font-bold text-slate-700">฿{p.standard_amount.toLocaleString()}</p>
                        </div>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${stCfg.cls}`}>
                        {stCfg.icon} {stCfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ═════════ TAB: ผลประเมิน — Table ═════════ */}
      {mainTab === "evaluated" && (
      <>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Award size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{t("admin.kpi.no_kpi_data")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Bulk approve bar */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-sm font-bold text-amber-700">{t("admin.kpi.bulk_pending", { n: pendingCount })}</p>
              <button onClick={async () => {
                if (!confirm(t("admin.kpi.confirm_approve_all", { n: pendingCount }))) return
                setActionLoading(true)
                const pending = filtered.filter(f => f.status === "submitted")
                let ok = 0
                for (const f of pending) {
                  try {
                    const res = await fetch("/api/kpi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", form_id: f.id }) })
                    const d = await res.json()
                    if (d.success) ok++
                  } catch {}
                }
                toast.success(t("admin.kpi.toast_approved_n", { n: ok }))
                setActionLoading(false)
                load()
              }} disabled={actionLoading}
                className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> {t("admin.kpi.approve_all")}
              </button>
            </div>
          )}

          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_0.7fr_0.7fr_0.5fr_0.7fr_320px_40px] gap-3 px-4 pr-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
            <span>{t("admin.kpi.col_employee")}</span>
            <span>{t("admin.kpi.col_department")}</span>
            <span>{t("admin.kpi.col_month")}</span>
            <span>{t("admin.kpi.col_score")}</span>
            <span>{t("admin.kpi.col_grade")}</span>
            <span>{t("admin.kpi.col_evaluator")}</span>
            <span>{t("admin.kpi.col_status")}</span>
            <span></span>
          </div>

          {filtered.map((form: any) => {
            const emp = form.employee
            const isOpen = expanded === form.id
            const items = detail?.items?.sort((a: any, b: any) => a.order_no - b.order_no) ?? []
            const gc = GRADE_CONF[form.grade] || GRADE_CONF.D

            return (
              <div key={form.id} className="border-b border-slate-50 last:border-0">
                <div className="w-full lg:grid lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_0.5fr_0.7fr_320px_40px] gap-3 px-4 pr-6 py-3.5 hover:bg-slate-50 transition-colors text-left flex flex-wrap items-center">
                  {/* Employee */}
                  <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto mb-2 lg:mb-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                      {emp?.avatar_url
                        ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-indigo-600 text-sm font-bold">{emp?.first_name_th?.[0]}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{empName(emp)}</p>
                      <p className="text-xs text-slate-400">{emp?.employee_code} · {emp?.position?.name}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 hidden lg:block truncate">{emp?.department?.name}</span>
                  <span className="text-sm text-slate-600">{MONTHS[form.month]}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {form.evaluation_type === "money_only" ? "—" : `${form.total_score?.toFixed(1) ?? 0}%`}
                  </span>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ring-1 ${gc.bg} ${gc.text} ${gc.ring}`}>
                      {form.evaluation_type === "money_only" ? "฿" : (form.grade ?? "-")}
                    </span>
                    {form.evaluation_type === "money_only" && (
                      <span className="text-[9px] font-bold text-emerald-600 whitespace-nowrap">{t("admin.kpi.tag_money_manual")}</span>
                    )}
                    {form.evaluation_type === "grade_incentive" && (
                      <span className="text-[9px] font-bold text-amber-600 whitespace-nowrap">{t("admin.kpi.tag_grade_money")}</span>
                    )}
                    {((Number(form.incentive_amount) || 0) + (Number(form.bonus_amount) || 0)) > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 whitespace-nowrap">
                        {((Number(form.incentive_amount) || 0) + (Number(form.bonus_amount) || 0)).toLocaleString()}฿
                      </span>
                    )}
                  </div>
                  <div className="text-xs hidden lg:block min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-slate-700 font-medium truncate">{empName(form.evaluator)}</span>
                      {form.evaluator_role === "skip_level" && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded whitespace-nowrap">{t("admin.kpi.role_skip_level_short")}</span>
                      )}
                      {form.evaluator_role === "additional" && (
                        <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded whitespace-nowrap">{t("admin.kpi.role_additional_short")}</span>
                      )}
                      {form.evaluator_role === "hr_admin" && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded whitespace-nowrap">HR</span>
                      )}
                      {form.evaluator_role === "direct_manager" && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">{t("admin.kpi.role_direct_manager")}</span>
                      )}
                    </div>
                    {form.direct_manager && form.evaluator?.first_name_th !== form.direct_manager?.first_name_th && (
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {t("admin.kpi.role_direct_manager")}: {empName(form.direct_manager)}
                      </div>
                    )}
                    {form.submitted_at && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(form.submitted_at).toLocaleString("th-TH", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} น.
                      </div>
                    )}
                  </div>
                  {/* Quick action buttons */}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {/* ── ปุ่ม "ดูฟอร์ม" — เปิดดูได้ทุก status (read-only) ── */}
                    <button onClick={() => loadDetail(form.id)}
                      title={t("admin.kpi.btn_view_form_title")}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1">
                      <Eye size={11} /> {isOpen ? t("admin.kpi.btn_hide") : t("admin.kpi.btn_view_form")}
                    </button>

                    {form.status === "submitted" ? (
                      <>
                        <button onClick={() => handleApprove(form.id)} disabled={actionLoading}
                          className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          ✓ {t("admin.kpi.approve")}
                        </button>
                        <button onClick={() => { setShowRejectModal(form.id); setRejectNote("") }} disabled={actionLoading}
                          className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50">
                          {t("admin.kpi.status_rejected")}
                        </button>
                        <Link href={`/manager/kpi/${form.employee_id}?year=${form.year}&month=${form.month}`}
                          title={t("admin.kpi.btn_edit_title")}
                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1">
                          <Pencil size={10} /> {t("admin.kpi.btn_edit")}
                        </Link>
                      </>
                    ) : (form.status === "approved" || form.status === "rejected" || form.status === "acknowledged") ? (
                      <>
                        <span className={`text-xs font-bold ${
                          form.status === "approved" ? "text-emerald-600" :
                          form.status === "acknowledged" ? "text-emerald-600" :
                          "text-red-500"
                        }`}>
                          {form.status === "approved" ? `✓ ${t("admin.kpi.status_approved")}` :
                           form.status === "acknowledged" ? `✓ ${t("admin.kpi.status_acknowledged")}` : `✗ ${t("admin.kpi.status_rejected")}`}
                        </span>
                        <button onClick={() => handleRevert(form.id, "submitted")} disabled={actionLoading}
                          title={t("admin.kpi.btn_revert_title")}
                          className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 border border-amber-200 disabled:opacity-50 flex items-center gap-1">
                          ↶ {t("admin.kpi.btn_revert")}
                        </button>
                        <Link href={`/manager/kpi/${form.employee_id}?year=${form.year}&month=${form.month}`}
                          title={t("admin.kpi.btn_edit_title2")}
                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1">
                          <Pencil size={10} /> {t("admin.kpi.btn_edit")}
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-slate-400">📝 {t("admin.kpi.draft_short")}</span>
                        <Link href={`/manager/kpi/${form.employee_id}?year=${form.year}&month=${form.month}`}
                          title={t("admin.kpi.btn_edit_draft_title")}
                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1">
                          <Pencil size={10} /> {t("admin.kpi.btn_edit")}
                        </Link>
                      </>
                    )}
                  </div>
                  <button onClick={() => loadDetail(form.id)} className="shrink-0" title={t("admin.kpi.btn_expand_title")}>
                    {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4">
                    {detailLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        {/* ── สรุปสายผู้ประเมิน ── */}
                        <div className="bg-white rounded-xl p-3 space-y-1.5 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 mb-1">{t("admin.kpi.eval_chain")}</p>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <Eye size={12} className="text-slate-400"/>
                            <span className="text-slate-500">{t("admin.kpi.evaluated_by")}</span>
                            <span className="font-bold text-slate-800">{empName(detail?.evaluator)}</span>
                            {form.evaluator_role === "skip_level" && (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">{t("admin.kpi.role_skip_level_full")}</span>
                            )}
                            {form.evaluator_role === "additional" && (
                              <span className="text-[9px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">{t("admin.kpi.role_additional_full")}</span>
                            )}
                            {form.evaluator_role === "hr_admin" && (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">HR</span>
                            )}
                            {form.evaluator_role === "direct_manager" && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{t("admin.kpi.role_direct_manager")}</span>
                            )}
                          </div>
                          {detail?.submitted_at && (
                            <p className="text-[11px] text-slate-400">
                              {t("admin.kpi.submitted_at", { date: format(new Date(detail.submitted_at), "d MMM yyyy HH:mm", { locale: th }) })}
                            </p>
                          )}
                          {detail?.approved_at && (
                            <p className="text-[11px] text-emerald-600">
                              {t("admin.kpi.approved_at", { date: format(new Date(detail.approved_at), "d MMM yyyy HH:mm", { locale: th }) })}
                            </p>
                          )}
                          {/* หัวหน้าตรงปัจจุบัน (ถ้าต่างจากผู้ประเมิน — แสดงให้ตรวจสอบ) */}
                          {form.direct_manager && (
                            form.direct_manager.first_name_th !== detail?.evaluator?.first_name_th ||
                            form.direct_manager.last_name_th !== detail?.evaluator?.last_name_th
                          ) && (
                            <p className="text-[11px] text-slate-500">
                              <span className="font-bold">{t("admin.kpi.current_direct_manager")}</span> {empName(form.direct_manager)}
                              <span className="text-amber-600 ml-1">{t("admin.kpi.not_same_evaluator")}</span>
                            </p>
                          )}
                        </div>
                        {items.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-white rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-md bg-indigo-50 text-xs font-bold text-indigo-600 flex items-center justify-center shrink-0">{item.order_no}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">{item.category}</p>
                                  {item.is_mandatory && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{t("admin.kpi.mandatory")}</span>}
                                </div>
                                {item.description && <ExpandableText text={item.description} />}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">{t("admin.kpi.weight_pct", { n: item.weight_pct })}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">{t("admin.kpi.score_of_100", { n: item.actual_score })}</span>
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">{t("admin.kpi.weighted_got", { n: item.weighted_score?.toFixed(1) })}</span>
                                </div>
                                {item.comment && (
                                  <p className="text-xs text-slate-400 italic mt-1.5 flex items-start gap-1">
                                    <MessageSquare size={10} className="shrink-0 mt-0.5" /> {item.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* ── เงินรางวัล + ค่าผลงาน (ถ้ามี) ── */}
                        {(detail?.evaluation_type === "money_only" || detail?.evaluation_type === "grade_incentive" || (Number(detail?.bonus_amount) || 0) > 0) && (
                          <div className="bg-white rounded-xl p-3 space-y-1.5">
                            <p className="text-xs font-bold text-slate-500 mb-1">{t("admin.kpi.kpi_incentive_title")}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Number(detail?.incentive_amount) > 0 && (
                                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-emerald-600 font-bold">
                                    {detail?.evaluation_type === "money_only" ? t("admin.kpi.money_manual_full") : t("admin.kpi.by_grade")}
                                  </p>
                                  <p className="text-lg font-black text-emerald-700">{Number(detail.incentive_amount).toLocaleString()} ฿</p>
                                </div>
                              )}
                              {Number(detail?.bonus_amount) > 0 && (
                                <div className="bg-amber-50 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-amber-600 font-bold">{t("admin.kpi.special_bonus")}</p>
                                  <p className="text-lg font-black text-amber-700">{Number(detail.bonus_amount).toLocaleString()} ฿</p>
                                  {detail.bonus_reason && <p className="text-[10px] text-amber-600 italic mt-1">{detail.bonus_reason}</p>}
                                </div>
                              )}
                            </div>
                            {detail?.money_reason && (
                              <p className="text-[11px] text-slate-500 italic">{t("admin.kpi.note_prefix")}: {detail.money_reason}</p>
                            )}

                            {/* ── HR verification: attachments จากหัวหน้า ── */}
                            {Array.isArray(detail?.money_reason_attachments) && detail.money_reason_attachments.length > 0 && (
                              <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <Paperclip size={12} className="text-emerald-600" />
                                  <p className="text-xs font-black text-emerald-700">
                                    {t("admin.kpi.evidence_files", { n: detail.money_reason_attachments.length })}
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {detail.money_reason_attachments.map((att: any, i: number) => {
                                    const isImage = /\.(jpe?g|png|webp|gif|heic)$/i.test(att.name || "")
                                    return (
                                      <a key={i} href={att.url} target="_blank" rel="noreferrer"
                                        className="group relative block bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:border-emerald-400 hover:shadow-sm transition-all">
                                        {isImage ? (
                                          <img src={att.url} alt={att.name} className="w-full h-20 object-cover" />
                                        ) : (
                                          <div className="flex flex-col items-center justify-center h-20 text-emerald-700">
                                            <FileText size={18} />
                                            <p className="text-[9px] mt-1 px-1 truncate w-full text-center">{att.name}</p>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                          <ExternalLink size={14} className="text-white opacity-0 group-hover:opacity-100" />
                                        </div>
                                        <p className="text-[9px] text-slate-500 px-1.5 py-0.5 truncate border-t border-slate-100 bg-white" title={att.name}>
                                          {att.name}
                                        </p>
                                      </a>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {detail?.evaluator_note && (
                          <div className="bg-white rounded-xl p-3">
                            <p className="text-xs font-bold text-slate-500 mb-1">{t("admin.kpi.overall_comment")}</p>
                            <p className="text-sm text-slate-600">{detail.evaluator_note}</p>
                          </div>
                        )}

                        {/* Rejection note (if rejected) */}
                        {detail?.rejection_note && detail?.status === "rejected" && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-red-600 mb-1">{t("admin.kpi.rejection_reason")}</p>
                            <p className="text-sm text-red-700">{detail.rejection_note}</p>
                          </div>
                        )}

                        {/* Approve / Reject / Edit buttons (for submitted forms) */}
                        {form.status === "submitted" && (
                          <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => handleApprove(form.id)} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <CheckCircle2 size={16} /> {t("admin.kpi.approve")}
                            </button>
                            <button onClick={() => { setShowRejectModal(form.id); setRejectNote("") }} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50">
                              <XCircle size={16} /> {t("admin.kpi.status_rejected")}
                            </button>
                            <Link href={`/manager/kpi/${form.employee_id}?year=${form.year}&month=${form.month}`}
                              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors">
                              <Pencil size={14} /> {t("admin.kpi.btn_edit")}
                            </Link>
                          </div>
                        )}

                        {/* Approved badge + edit button */}
                        {form.status === "approved" && (
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 size={16} />
                              <span className="text-sm font-bold">{t("admin.kpi.status_approved")}</span>
                              {detail?.approved_at && (
                                <span className="text-xs text-slate-400">
                                  · {format(new Date(detail.approved_at), "d MMM yyyy HH:mm", { locale: th })}
                                </span>
                              )}
                            </div>
                            <Link href={`/manager/kpi/${form.employee_id}?year=${form.year}&month=${form.month}`}
                              className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                              <Pencil size={12} /> {t("admin.kpi.btn_edit")}
                            </Link>
                          </div>
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
      </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={20} />
              <h3 className="text-lg font-black">{t("admin.kpi.reject_modal_title")}</h3>
            </div>
            <p className="text-sm text-slate-500">{t("admin.kpi.reject_modal_desc")}</p>
            <textarea
              value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder={t("admin.kpi.reject_placeholder")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
                {t("admin.kpi.cancel")}
              </button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? t("admin.kpi.sending") : t("admin.kpi.confirm_reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Reusable: long-text แสดงแบบ truncate + toggle "ดูเพิ่ม / ย่อ"
// ─────────────────────────────────────────────────────────────
function ExpandableText({ text }: { text: string }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  // เกณฑ์ตัด: เกิน 120 ตัวอักษร หรือ มีบรรทัดเกิน 2 บรรทัด
  const lineCount = text.split(/\r?\n/).length
  const needsTrunc = text.length > 120 || lineCount > 2
  return (
    <div className="mt-0.5">
      <p className={`text-xs text-slate-500 whitespace-pre-line leading-relaxed ${!expanded && needsTrunc ? "line-clamp-2" : ""}`}>
        {text}
      </p>
      {needsTrunc && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold mt-0.5 inline-flex items-center gap-0.5"
        >
          {expanded ? <>{t("admin.kpi.collapse")} <ChevronUp size={11} /></> : <>{t("admin.kpi.show_more")} <ChevronDown size={11} /></>}
        </button>
      )}
    </div>
  )
}
