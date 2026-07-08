"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Shield, Search, ChevronDown, ChevronUp, Loader2,
  Award, MessageSquare, Eye, CheckCircle2, XCircle, Clock, Pencil, Download,
  Mail, Plus, Trash2, X, Power, AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"
import FeishuSyncButton from "@/components/admin/FeishuSyncButton"
import { PROBATION_ROUNDS, ROUND_LABELS, ROUND_SHORT } from "@/lib/constants/probation"

const GRADE_CONF: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700" },
  B: { bg: "bg-blue-50", text: "text-blue-700" },
  C: { bg: "bg-amber-50", text: "text-amber-700" },
  D: { bg: "bg-red-50", text: "text-red-700" },
}

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/10 transition-all"

export default function AdminProbationEvalPage() {
  const { user } = useAuth()

  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roundFilter, setRoundFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")

  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // ── แท็บ: รายการประเมิน (review) | ยังไม่ได้ประเมิน (pending) ──
  const [view, setView] = useState<"review" | "pending">("review")
  const [pending, setPending] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const loadPending = useCallback(async () => {
    setPendingLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation?mode=pending")
      const data = await res.json()
      setPending(data.items ?? [])
    } catch {}
    setPendingLoading(false)
  }, [])
  useEffect(() => { if (view === "pending" && user) loadPending() }, [view, user, loadPending])

  // ── ฟิลเตอร์แท็บ "ยังไม่ได้ประเมิน" ──
  const [pSearch, setPSearch] = useState("")
  const [pRound, setPRound] = useState("")       // "" | "1" | "2"
  const [pTiming, setPTiming] = useState("")     // "" | "overdue" | "due"
  const [pOverdue, setPOverdue] = useState("")   // "" | "le30" | "31_90" | "gt90"
  const [pDept, setPDept] = useState("")
  const pendingDepts = Array.from(new Set(pending.map((it: any) => it.employee?.department?.name).filter(Boolean))).sort()
  const filteredPending = pending.filter((it: any) => {
    const e = it.employee
    if (pRound && String(it.round) !== pRound) return false
    if (pTiming === "overdue" && it.days_overdue <= 0) return false
    if (pTiming === "due" && it.days_overdue > 0) return false
    if (pOverdue === "le30" && !(it.days_overdue > 0 && it.days_overdue <= 30)) return false
    if (pOverdue === "31_90" && !(it.days_overdue > 30 && it.days_overdue <= 90)) return false
    if (pOverdue === "gt90" && !(it.days_overdue > 90)) return false
    if (pDept && e?.department?.name !== pDept) return false
    if (pSearch.trim()) {
      const s = pSearch.toLowerCase()
      const hay = `${e?.first_name_th ?? ""} ${e?.last_name_th ?? ""} ${e?.nickname ?? ""} ${e?.employee_code ?? ""} ${it.direct_manager?.first_name_th ?? ""} ${it.direct_manager?.last_name_th ?? ""}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  // ── อีเมลผู้รับแจ้งเตือน ──
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [recipients, setRecipients] = useState<any[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [emailSaving, setEmailSaving] = useState(false)
  // ค้นหาพนักงานในระบบ → ดึงอีเมลอัตโนมัติ
  const [empQuery, setEmpQuery] = useState("")
  const [empResults, setEmpResults] = useState<any[]>([])
  const [empSearching, setEmpSearching] = useState(false)
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)

  useEffect(() => {
    if (!showEmailModal) return
    const q = empQuery.trim()
    if (!q) { setEmpResults([]); return }
    let cancelled = false
    setEmpSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}&limit=50&all_companies=1`)
        const data = await res.json()
        if (!cancelled) setEmpResults(data.employees ?? [])
      } catch { if (!cancelled) setEmpResults([]) }
      finally { if (!cancelled) setEmpSearching(false) }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [empQuery, showEmailModal])

  const pickEmployee = (emp: any) => {
    if (!emp.email) { toast.error("พนักงานคนนี้ยังไม่มีอีเมลในระบบ — กรอกอีเมลเองได้"); return }
    setNewEmail(emp.email)
    setNewLabel(`${emp.first_name_th ?? ""} ${emp.last_name_th ?? ""}`.trim())
    setEmpQuery(""); setEmpResults([]); setShowEmpDropdown(false)
  }

  const loadRecipients = useCallback(async () => {
    setRecipientsLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation/recipients")
      const data = await res.json()
      if (res.ok) setRecipients(data.recipients ?? [])
      else toast.error(data.error || "โหลดรายชื่อไม่สำเร็จ")
    } catch { toast.error("โหลดรายชื่อไม่สำเร็จ") }
    setRecipientsLoading(false)
  }, [])

  const addRecipient = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) { toast.error("กรุณากรอกอีเมล"); return }
    setEmailSaving(true)
    try {
      const res = await fetch("/api/probation-evaluation/recipients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, label: newLabel.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เพิ่มไม่สำเร็จ")
      toast.success("เพิ่มอีเมลผู้รับแล้ว")
      setNewEmail(""); setNewLabel("")
      loadRecipients()
    } catch (e: any) { toast.error(e.message) }
    setEmailSaving(false)
  }

  const toggleRecipient = async (r: any) => {
    try {
      const res = await fetch("/api/probation-evaluation/recipients", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "แก้ไขไม่สำเร็จ")
      loadRecipients()
    } catch (e: any) { toast.error(e.message) }
  }

  const removeRecipient = async (id: string) => {
    if (!confirm("ลบอีเมลผู้รับนี้?")) return
    try {
      const res = await fetch(`/api/probation-evaluation/recipients?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ")
      toast.success("ลบแล้ว")
      loadRecipients()
    } catch (e: any) { toast.error(e.message) }
  }

  const openEmailModal = () => { setShowEmailModal(true); loadRecipients() }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation?mode=admin")
      const data = await res.json()
      setForms(data.forms ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const loadDetail = async (formId: string) => {
    if (expanded === formId) { setExpanded(null); setDetail(null); return }
    setExpanded(formId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/probation-evaluation?mode=single&form_id=${formId}`)
      const data = await res.json()
      setDetail(data.form)
    } catch {}
    setDetailLoading(false)
  }

  const handleApprove = async (formId: string) => {
    if (!confirm("ยืนยันอนุมัติผลประเมินทดลองงานนี้?")) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", form_id: formId }),
      })
      const data = await res.json()
      if (data.success) { toast.success("อนุมัติสำเร็จ"); load(); setExpanded(null) }
      else toast.error(data.error || "เกิดข้อผิดพลาด")
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/probation-evaluation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", form_id: showRejectModal, rejection_note: rejectNote }),
      })
      const data = await res.json()
      if (data.success) { toast.success("ส่งคืนสำเร็จ"); setShowRejectModal(null); setRejectNote(""); load(); setExpanded(null) }
      else toast.error(data.error || "เกิดข้อผิดพลาด")
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setActionLoading(false)
  }

  const filtered = forms.filter(f => {
    const name = `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""} ${f.employee?.employee_code ?? ""}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (roundFilter && f.round !== Number(roundFilter)) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (gradeFilter && f.grade !== gradeFilter) return false
    return true
  })

  const pendingCount = filtered.filter(f => f.status === "submitted").length
  const approvedCount = filtered.filter(f => f.status === "approved").length

  // ── Export to xlsx ─────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportXlsx = async () => {
    if (filtered.length === 0) { toast.error("ไม่มีข้อมูลให้ export"); return }
    setExporting(true); setExportProgress(0)
    const t = toast.loading(`กำลังโหลดรายละเอียด 0/${filtered.length}...`)
    try {
      // โหลด detail ทุกฟอร์มทีละ 5 ขนาน
      const details: any[] = []
      const BATCH = 5
      for (let i = 0; i < filtered.length; i += BATCH) {
        const slice = filtered.slice(i, i + BATCH)
        const got = await Promise.all(slice.map(async (f: any) => {
          try {
            const r = await fetch(`/api/probation-evaluation?mode=single&form_id=${f.id}`)
            const d = await r.json()
            return d.form ?? f
          } catch { return f }
        }))
        details.push(...got)
        setExportProgress(details.length)
        toast.loading(`กำลังโหลดรายละเอียด ${details.length}/${filtered.length}...`, { id: t })
      }

      const XLSX = await import("xlsx")
      const statusLabel = (s: string) =>
        s === "draft" ? "แบบร่าง" :
        s === "submitted" ? "รอ HR อนุมัติ" :
        s === "approved" ? "อนุมัติแล้ว" :
        s === "rejected" ? "ส่งคืน" : s

      // ── Sheet 1: สรุปรายคน ──────────────────────────────────────
      const summary = details.map((f: any, idx: number) => ({
        "ลำดับ": idx + 1,
        "รหัสพนักงาน": f.employee?.employee_code ?? "",
        "ชื่อ-นามสกุล": `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""}`.trim(),
        "ชื่อเล่น": f.employee?.nickname ?? "",
        "แผนก": f.employee?.department?.name ?? "",
        "ตำแหน่ง": f.employee?.position?.name ?? "",
        "บริษัท": f.employee?.company?.name_th ?? "",
        "วันเริ่มงาน": f.employee?.hire_date ? format(new Date(f.employee.hire_date), "dd/MM/yyyy") : "",
        "รอบ": ROUND_LABELS[f.round] ?? `รอบ ${f.round}`,
        "ผู้ประเมิน": f.evaluator ? `${f.evaluator.first_name_th} ${f.evaluator.last_name_th}` : "",
        "คะแนนรวม (%)": Number(f.total_score ?? 0).toFixed(2),
        "เกรด": f.grade ?? "",
        "สถานะ": statusLabel(f.status),
        "ความเห็น/สรุปของผู้ประเมิน": f.summary_comment ?? f.overall_comment ?? "",
        "วันที่ส่ง": f.submitted_at ? format(new Date(f.submitted_at), "dd/MM/yyyy HH:mm") : "",
        "วันที่อนุมัติ": f.approved_at ? format(new Date(f.approved_at), "dd/MM/yyyy HH:mm") : "",
        "หมายเหตุ HR": f.review_note ?? f.rejection_note ?? "",
      }))
      const ws1 = XLSX.utils.json_to_sheet(summary)
      ws1["!cols"] = [
        { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 22 },
        { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 13 },
        { wch: 8 }, { wch: 16 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 32 },
      ]

      // ── Sheet 2: รายละเอียดรายข้อ ────────────────────────────────
      const itemRows: any[] = []
      for (const f of details) {
        const items: any[] = f.items ?? f.criteria ?? []
        for (const item of items) {
          itemRows.push({
            "รหัสพนักงาน": f.employee?.employee_code ?? "",
            "ชื่อ-นามสกุล": `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""}`.trim(),
            "แผนก": f.employee?.department?.name ?? "",
            "รอบ": ROUND_LABELS[f.round] ?? `รอบ ${f.round}`,
            "หัวข้อ #": item.order_no,
            "หมวด": item.category,
            "รายละเอียด": item.description ?? "",
            "น้ำหนัก (%)": Number(item.weight_pct ?? 0),
            "คะแนนจริง (0-100)": Number(item.actual_score ?? 0),
            "คะแนนถ่วงน้ำหนัก": Number(item.weighted_score ?? 0).toFixed(2),
            "ความเห็น": item.comment ?? "",
          })
        }
      }
      const ws2 = XLSX.utils.json_to_sheet(itemRows)
      ws2["!cols"] = [
        { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 8 },
        { wch: 22 }, { wch: 36 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 36 },
      ]

      // ── Sheet 3: สถิติรวม ────────────────────────────────────────
      const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
      const roundCount: Record<number, number> = { 1: 0, 2: 0 }
      const deptAvg: Record<string, { sum: number; count: number }> = {}
      for (const f of filtered) {
        if (gradeCount[f.grade] !== undefined) gradeCount[f.grade]++
        if (roundCount[f.round] !== undefined) roundCount[f.round]++
        if (["submitted", "approved"].includes(f.status)) {
          const dept = f.employee?.department?.name || "ไม่ระบุ"
          if (!deptAvg[dept]) deptAvg[dept] = { sum: 0, count: 0 }
          deptAvg[dept].sum += Number(f.total_score) || 0
          deptAvg[dept].count++
        }
      }
      const avgScore = filtered.length > 0 ? filtered.reduce((s, f) => s + (f.total_score || 0), 0) / filtered.length : 0
      const deptAvgList = Object.entries(deptAvg)
        .map(([name, d]) => ({ name, avg: d.sum / d.count, count: d.count }))
        .sort((a, b) => b.avg - a.avg)

      const statRows: any[] = []
      statRows.push({ "หัวข้อ": "วันที่ export", "ค่า": format(new Date(), "dd/MM/yyyy HH:mm") })
      statRows.push({ "หัวข้อ": "จำนวนการประเมินทั้งหมด", "ค่า": filtered.length })
      statRows.push({ "หัวข้อ": "คะแนนเฉลี่ยรวม", "ค่า": Number(avgScore.toFixed(2)) })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── นับตามเกรด ──", "ค่า": "" })
      for (const g of ["A", "B", "C", "D"] as const) statRows.push({ "หัวข้อ": `เกรด ${g}`, "ค่า": gradeCount[g] })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── นับตามรอบ ──", "ค่า": "" })
      for (const r of PROBATION_ROUNDS) statRows.push({ "หัวข้อ": ROUND_LABELS[r], "ค่า": roundCount[r] })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── นับตามสถานะ ──", "ค่า": "" })
      statRows.push({ "หัวข้อ": "อนุมัติแล้ว", "ค่า": approvedCount })
      statRows.push({ "หัวข้อ": "รอ HR อนุมัติ", "ค่า": pendingCount })
      statRows.push({ "หัวข้อ": "ส่งคืน", "ค่า": filtered.filter(f => f.status === "rejected").length })
      statRows.push({ "หัวข้อ": "แบบร่าง", "ค่า": filtered.filter(f => f.status === "draft").length })
      statRows.push({ "หัวข้อ": "", "ค่า": "" })
      statRows.push({ "หัวข้อ": "── คะแนนเฉลี่ยตามแผนก ──", "ค่า": "" })
      for (const d of deptAvgList) {
        statRows.push({ "หัวข้อ": `${d.name} (${d.count} คน)`, "ค่า": Number(d.avg.toFixed(2)) })
      }
      const ws3 = XLSX.utils.json_to_sheet(statRows)
      ws3["!cols"] = [{ wch: 36 }, { wch: 22 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, "สรุปรายคน")
      XLSX.utils.book_append_sheet(wb, ws2, "รายละเอียดรายข้อ")
      XLSX.utils.book_append_sheet(wb, ws3, "สถิติรวม")

      const fname = `probation_eval_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
      XLSX.writeFile(wb, fname)
      toast.success(`Export สำเร็จ ${summary.length} คน (${itemRows.length} หัวข้อ)`, { id: t })
    } catch (e: any) {
      toast.error(e.message || "Export ไม่สำเร็จ", { id: t })
    } finally {
      setExporting(false); setExportProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-rose-600" />
            <h1 className="text-xl font-black text-slate-800">ประเมินทดลองงาน</h1>
          </div>
          <p className="text-sm text-slate-400">ตรวจสอบและอนุมัติผลประเมินทดลองงาน</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openEmailModal}
            title="ตั้งค่าอีเมลรับแจ้งเตือนเมื่อหัวหน้าส่งประเมิน"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-sm transition-all">
            <Mail size={13} /> อีเมลแจ้งเตือน
          </button>
          <FeishuSyncButton dataset="probation" variant="subtle"/>
          <button onClick={exportXlsx} disabled={exporting || filtered.length === 0}
            title={filtered.length === 0 ? "ไม่มีข้อมูลให้ export" : `Export ${filtered.length} คน เป็น xlsx`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm transition-all">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exporting ? `กำลัง Export ${exportProgress}/${filtered.length}` : `Export Excel (${filtered.length})`}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-slate-100 rounded-xl p-1">
        <button onClick={() => setView("review")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === "review" ? "bg-white shadow-sm text-rose-600" : "text-slate-500 hover:text-slate-700"}`}>
          รายการประเมิน
        </button>
        <button onClick={() => setView("pending")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${view === "pending" ? "bg-white shadow-sm text-amber-600" : "text-slate-500 hover:text-slate-700"}`}>
          ยังไม่ได้ประเมิน
          {pending.length > 0 && <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{pending.length}</span>}
        </button>
      </div>

      {view === "pending" ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            <p className="text-sm font-bold text-slate-700">พนักงานที่ถึง/เลยกำหนดประเมิน แต่ยังไม่ถูกประเมิน (รอบ 45 / 90 วัน)</p>
            <span className="ml-auto text-xs font-bold text-slate-400">{filteredPending.length} / {pending.length} รายการ</span>
          </div>
          {/* Smart Filters */}
          <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส / หัวหน้า..."
                className={`${inp} pl-9 w-full`} />
            </div>
            <select value={pRound} onChange={e => setPRound(e.target.value)} className={inp}>
              <option value="">ทุกรอบ</option>
              {PROBATION_ROUNDS.map(r => <option key={r} value={r}>{ROUND_SHORT[r]}</option>)}
            </select>
            <select value={pTiming} onChange={e => setPTiming(e.target.value)} className={inp}>
              <option value="">ทุกสถานะ</option>
              <option value="overdue">เลยกำหนดแล้ว</option>
              <option value="due">ยังไม่เลย (ถึงกำหนด)</option>
            </select>
            <select value={pOverdue} onChange={e => setPOverdue(e.target.value)} className={inp}>
              <option value="">ช่วงเลยกำหนด: ทั้งหมด</option>
              <option value="le30">เลย ≤ 30 วัน</option>
              <option value="31_90">เลย 31–90 วัน</option>
              <option value="gt90">เลย &gt; 90 วัน (ค้างนาน)</option>
            </select>
            <select value={pDept} onChange={e => setPDept(e.target.value)} className={inp}>
              <option value="">ทุกแผนก</option>
              {pendingDepts.map((d: any) => <option key={d} value={d}>{d}</option>)}
            </select>
            {(pSearch || pRound || pTiming || pOverdue || pDept) && (
              <button onClick={() => { setPSearch(""); setPRound(""); setPTiming(""); setPOverdue(""); setPDept("") }}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 px-2">ล้างตัวกรอง</button>
            )}
          </div>
          {pendingLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : filteredPending.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={32} className="text-emerald-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">{pending.length === 0 ? "ไม่มีพนักงานค้างประเมิน 🎉" : "ไม่พบรายการตามตัวกรอง"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredPending.map((it: any, idx: number) => {
                const emp = it.employee
                const overdue = it.days_overdue > 0
                return (
                  <div key={`${emp.id}-${it.round}`} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-rose-600 text-sm font-bold">{emp.first_name_th?.[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{emp.first_name_th} {emp.last_name_th}{emp.nickname && <span className="text-slate-400 font-normal"> ({emp.nickname})</span>}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {emp.employee_code} · {emp.position?.name ?? "—"}
                        {it.direct_manager && <span> · หัวหน้า: {it.direct_manager.first_name_th} {it.direct_manager.last_name_th}</span>}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap">{ROUND_SHORT[it.round] ?? `รอบ ${it.round}`}</span>
                    <div className="text-right shrink-0 w-[110px]">
                      <p className="text-[11px] text-slate-400">ครบกำหนด {format(new Date(it.due_date + "T00:00:00"), "d MMM", { locale: th })}</p>
                      <p className={`text-xs font-black ${overdue ? "text-rose-600" : "text-amber-600"}`}>
                        {overdue ? `เลยกำหนด ${it.days_overdue} วัน` : it.days_overdue === 0 ? "ถึงกำหนดวันนี้" : `อีก ${-it.days_overdue} วัน`}
                      </p>
                    </div>
                    <Link href={`/manager/probation-eval/${emp.id}?round=${it.round}`}
                      className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
                      ประเมิน
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (<>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-black text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-400">ทั้งหมด</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">รอ HR อนุมัติ</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
          <p className="text-2xl font-black text-emerald-700">{approvedCount}</p>
          <p className="text-xs text-emerald-600">อนุมัติแล้ว</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-black text-slate-800">
            {filtered.length > 0 ? (filtered.reduce((s, f) => s + (f.total_score || 0), 0) / filtered.length).toFixed(1) : "0"}%
          </p>
          <p className="text-xs text-slate-400">คะแนนเฉลี่ย</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)} className={inp}>
          <option value="">ทุกรอบ</option>
          {PROBATION_ROUNDS.map(r => <option key={r} value={r}>{ROUND_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
          <option value="">ทุกสถานะ</option>
          <option value="submitted">รอ HR อนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ส่งคืน</option>
          <option value="draft">แบบร่าง</option>
        </select>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={inp}>
          <option value="">ทุกเกรด</option>
          {["A", "B", "C", "D"].map(g => <option key={g} value={g}>เกรด {g}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส..."
            className={`${inp} pl-9 w-full`} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ไม่พบข้อมูลประเมินทดลองงาน</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {filtered.map((form: any) => {
            const emp = form.employee
            const isOpen = expanded === form.id
            const items = detail?.items?.sort((a: any, b: any) => a.order_no - b.order_no) ?? []
            const gc = GRADE_CONF[form.grade] || GRADE_CONF.D

            return (
              <div key={form.id} className="border-b border-slate-50 last:border-0">
                <button onClick={() => loadDetail(form.id)}
                  className="w-full px-4 py-3.5 hover:bg-slate-50 transition-colors text-left flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                    {emp?.avatar_url
                      ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-rose-600 text-sm font-bold">{emp?.first_name_th?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{emp?.first_name_th} {emp?.last_name_th}</p>
                    <p className="text-xs text-slate-400">{emp?.employee_code} · {emp?.position?.name}</p>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block">{ROUND_LABELS[form.round]}</span>
                  <span className="text-sm font-bold text-slate-800">{form.total_score?.toFixed(1)}%</span>
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${gc.bg} ${gc.text}`}>{form.grade}</span>
                  {/* ผ่าน / ไม่ผ่าน ที่หัวหน้าติ๊ก */}
                  {form.is_passed === true ? (
                    <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 whitespace-nowrap">✓ ผ่าน</span>
                  ) : form.is_passed === false ? (
                    <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-rose-100 text-rose-700 whitespace-nowrap">✕ ไม่ผ่าน</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-400 whitespace-nowrap">—</span>
                  )}
                  <span className={`text-xs font-bold ${
                    form.status === "approved" ? "text-emerald-600" :
                    form.status === "submitted" ? "text-amber-600" :
                    form.status === "rejected" ? "text-red-500" : "text-slate-400"
                  }`}>
                    {form.status === "approved" ? "อนุมัติ" :
                     form.status === "submitted" ? "รอ HR" :
                     form.status === "rejected" ? "ส่งคืน" : "ร่าง"}
                  </span>
                  {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    {detailLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Eye size={12} />
                          <span>ประเมินโดย {detail?.evaluator?.first_name_th} {detail?.evaluator?.last_name_th}</span>
                          <span className="text-slate-400">· {ROUND_LABELS[form.round]}</span>
                        </div>

                        {items.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-white rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-md bg-rose-50 text-xs font-bold text-rose-600 flex items-center justify-center shrink-0">{item.order_no}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">{item.category}</p>
                                {item.description && <p className="text-xs text-slate-400 whitespace-pre-line mt-0.5 line-clamp-2">{item.description}</p>}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">น้ำหนัก {item.weight_pct}%</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">คะแนน {item.actual_score}/100</span>
                                  <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-md">ได้ {item.weighted_score?.toFixed(1)}</span>
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

                        {detail?.evaluator_note && (
                          <div className="bg-white rounded-xl p-3">
                            <p className="text-xs font-bold text-slate-500 mb-1">ความเห็นภาพรวม</p>
                            <p className="text-sm text-slate-600">{detail.evaluator_note}</p>
                          </div>
                        )}

                        {detail?.rejection_note && detail?.status === "rejected" && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-red-600 mb-1">เหตุผลที่ส่งคืน</p>
                            <p className="text-sm text-red-700">{detail.rejection_note}</p>
                          </div>
                        )}

                        {form.status === "submitted" && (
                          <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => handleApprove(form.id)} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                              <CheckCircle2 size={16} /> อนุมัติ
                            </button>
                            <button onClick={() => { setShowRejectModal(form.id); setRejectNote("") }} disabled={actionLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-100 border border-red-200 disabled:opacity-50">
                              <XCircle size={16} /> ส่งคืน
                            </button>
                            <Link href={form.assignment_id ? `/manager/probation-eval/${form.employee_id}?assignment=${form.assignment_id}` : `/manager/probation-eval/${form.employee_id}?round=${form.round}`}
                              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-slate-200">
                              <Pencil size={14} /> แก้ไข
                            </Link>
                          </div>
                        )}

                        {form.status === "approved" && (
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 size={16} />
                              <span className="text-sm font-bold">อนุมัติแล้ว</span>
                            </div>
                            <Link href={form.assignment_id ? `/manager/probation-eval/${form.employee_id}?assignment=${form.assignment_id}` : `/manager/probation-eval/${form.employee_id}?round=${form.round}`}
                              className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200">
                              <Pencil size={12} /> แก้ไข
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
      </>)}

      {/* Email Recipients Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <Mail size={15} className="text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-800">อีเมลรับแจ้งเตือนประเมินทดลองงาน</h3>
                <p className="text-xs text-slate-400">เมื่อหัวหน้ากดส่งประเมิน ระบบจะส่งอีเมลไปยังทุกอีเมลที่เปิดใช้งาน</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* add form */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 space-y-2">
              {/* ค้นหาพนักงานในระบบ → ดึงอีเมลอัตโนมัติ */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={empQuery}
                  onChange={e => { setEmpQuery(e.target.value); setShowEmpDropdown(true) }}
                  onFocus={() => setShowEmpDropdown(true)}
                  placeholder="ค้นหาพนักงานในระบบ (ชื่อ / รหัส) เพื่อดึงอีเมลอัตโนมัติ..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-400" />
                {showEmpDropdown && empQuery.trim() && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmpDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[220px] overflow-y-auto">
                      {empSearching ? (
                        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
                      ) : empResults.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-slate-400 text-center">ไม่พบพนักงาน</p>
                      ) : (
                        empResults.map((emp: any) => (
                          <button key={emp.id} type="button" onClick={() => pickEmployee(emp)}
                            className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-rose-600 text-xs font-bold">{emp.first_name_th?.[0] ?? "?"}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {emp.first_name_th} {emp.last_name_th}
                                {emp.nickname && <span className="text-xs text-rose-500 ml-1">({emp.nickname})</span>}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {emp.email ? emp.email : <span className="text-amber-500">ไม่มีอีเมลในระบบ</span>} · {emp.employee_code}
                                {emp.company?.name_th && <span className="text-indigo-400"> · {emp.company.name_th}</span>}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400">หรือกรอกอีเมลภายนอกเอง</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addRecipient() }}
                  type="email" placeholder="อีเมลผู้รับ (เช่น hr@company.com)"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addRecipient() }}
                  placeholder="ชื่อ/หมายเหตุ (ไม่บังคับ)"
                  className="sm:w-40 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
                <button onClick={addRecipient} disabled={emailSaving}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                  {emailSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} เพิ่ม
                </button>
              </div>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {recipientsLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-8">
                  <Mail size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">ยังไม่มีอีเมลผู้รับ — เพิ่มด้านบน</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipients.map((r: any) => (
                    <div key={r.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${r.is_active ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{r.email}</p>
                        {r.label && <p className="text-[11px] text-slate-400 truncate">{r.label}</p>}
                      </div>
                      {!r.is_active && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">ปิดอยู่</span>}
                      <button onClick={() => toggleRecipient(r)}
                        title={r.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => removeRecipient(r.id)} title="ลบ"
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={20} />
              <h3 className="text-lg font-black">ส่งคืนผลประเมินทดลองงาน</h3>
            </div>
            <p className="text-sm text-slate-500">กรุณาระบุเหตุผลที่ส่งคืน</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="เหตุผลที่ส่งคืน..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px] outline-none focus:border-red-400" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? "กำลังส่ง..." : "ยืนยันส่งคืน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
