"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import {
  Check, X, Clock, Calendar, Timer, FileEdit, Search, Filter,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Building2,
  Download, Users, Ban, ArrowRightLeft, Paperclip, Pencil, CheckCheck,
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"
import ApprovalsExportModal from "./ExportModal"

const TYPE_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  leave:        { label: "admin.requests.type_leave",        icon: Calendar,       color: "text-sky-700",     bg: "bg-sky-100" },
  adjustment:   { label: "admin.requests.type_adjustment",   icon: FileEdit,       color: "text-violet-700",  bg: "bg-violet-100" },
  overtime:     { label: "admin.requests.type_overtime",     icon: Timer,          color: "text-amber-700",   bg: "bg-amber-100" },
  shift_change: { label: "admin.requests.type_shift_change", icon: ArrowRightLeft, color: "text-emerald-700", bg: "bg-emerald-100" },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "admin.requests.status_pending",          color: "text-amber-700",  bg: "bg-amber-100" },
  approved:         { label: "admin.requests.status_approved",         color: "text-green-700",  bg: "bg-green-100" },
  rejected:         { label: "admin.requests.status_rejected",         color: "text-red-700",    bg: "bg-red-100" },
  cancelled:        { label: "admin.requests.status_cancelled",        color: "text-slate-500",  bg: "bg-slate-100" },
  cancel_requested: { label: "admin.requests.status_cancel_requested", color: "text-orange-700", bg: "bg-orange-100" },
}

const STATUS_TABS = [
  { key: "pending",          label: "admin.requests.status_pending",          icon: Clock },
  { key: "cancel_requested", label: "admin.requests.status_cancel_requested", icon: Ban },
  { key: "approved",         label: "admin.requests.status_approved",         icon: Check },
  { key: "rejected",         label: "admin.requests.status_rejected",         icon: X },
  { key: "all",              label: "admin.requests.status_all",              icon: Filter },
]

const TYPE_TABS = [
  { key: "all",          label: "admin.requests.type_all" },
  { key: "leave",        label: "admin.requests.type_leave" },
  { key: "adjustment",   label: "admin.requests.type_adjustment" },
  { key: "overtime",     label: "admin.requests.type_overtime" },
  { key: "shift_change", label: "admin.requests.type_shift_change" },
]

export default function AdminApprovalsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const supabase = createClient()

  const [requests, setRequests] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  // Filters
  const [companies, setCompanies] = useState<any[]>([])
  const [filterCo, setFilterCo] = useState("all")
  const [filterStatus, setFilterStatus] = useState("pending")
  const [filterType, setFilterType] = useState("all")
  const [filterFrom, setFilterFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [filterTo, setFilterTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [search, setSearch] = useState("")
  const [rejectItem, setRejectItem] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [showExport, setShowExport] = useState(false)
  const [showOnBehalf, setShowOnBehalf] = useState(false)
  const [editAdj, setEditAdj] = useState<any>(null)
  const [editAdjSaving, setEditAdjSaving] = useState(false)

  // Bulk approve
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 })

  // Load companies
  useEffect(() => {
    supabase.from("companies").select("id,code,name_th").eq("is_active", true).order("code")
      .then(({ data }) => setCompanies(data ?? []))
  }, [])

  // Load requests
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        type: filterType,
        company_id: filterCo,
      })
      if (filterStatus !== "pending" && filterStatus !== "cancel_requested") {
        params.set("date_from", filterFrom)
        params.set("date_to", filterTo)
      }
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/approvals?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRequests(data.requests ?? [])
      setCounts(data.counts ?? {})
    } catch (e: any) {
      console.error("Load approvals error:", e)
      toast.error(t("admin.requests.toast_load_error"))
      setRequests([])
      setCounts({})
    } finally {
      setLoading(false)
    }
  }, [filterCo, filterStatus, filterType, filterFrom, filterTo, search])

  useEffect(() => { load() }, [load])

  // Action handler
  const handleAction = async (action: string, item: any, note?: string) => {
    setProcessing(item.id)
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          request_id: item.id,
          request_type: item.request_type,
          note: note || undefined,
        }),
      })
      const data = await res.json()
      if (data.success || data.status === "approved" || data.status === "rejected") {
        toast.success(
          action === "approve" ? t("admin.requests.toast_approved") :
          action === "reject" ? t("admin.requests.toast_rejected") :
          action === "approve_cancel" ? t("admin.requests.toast_approve_cancel") :
          action === "reject_cancel" ? t("admin.requests.toast_keep_approved") :
          action === "force_cancel" ? t("admin.requests.toast_force_cancelled") : t("admin.requests.toast_success")
        )
        setRejectItem(null)
        setRejectNote("")
        load()
        // แจ้ง sidebar ให้ refresh badge ทันที
        window.dispatchEvent(new Event("approvals-changed"))
      } else {
        toast.error(data.error || t("admin.requests.toast_error"))
      }
    } catch (e: any) {
      console.error("Action error:", e)
      toast.error(t("admin.requests.toast_action_error"))
    } finally {
      setProcessing(null)
    }
  }

  const safeFmt = (d: string | null, fmt = "d MMM yy") => {
    if (!d) return "-"
    try { return format(new Date(d), fmt, { locale: th }) } catch { return d }
  }

  // รายการที่จะถูก bulk approve ตาม tab ปัจจุบัน
  const bulkMode: "approve" | "approve_cancel" | null =
    filterStatus === "pending" ? "approve" :
    filterStatus === "cancel_requested" ? "approve_cancel" : null

  const bulkItems = bulkMode === "approve"
    ? requests.filter(r => r.status === "pending" && !r.is_cancel_requested)
    : bulkMode === "approve_cancel"
      ? requests.filter(r => r.is_cancel_requested)
      : []

  const handleBulkApprove = async () => {
    if (!bulkMode || bulkItems.length === 0) return
    setBulkRunning(true)
    setBulkProgress({ done: 0, total: bulkItems.length, failed: 0 })

    let done = 0
    let failed = 0
    for (const item of bulkItems) {
      try {
        const res = await fetch("/api/admin/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: bulkMode,
            request_id: item.id,
            request_type: item.request_type,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && (data.success || data.status === "approved" || data.status === "rejected")) {
          done++
        } else {
          failed++
        }
      } catch {
        failed++
      }
      setBulkProgress({ done: done + failed, total: bulkItems.length, failed })
    }

    setBulkRunning(false)
    setShowBulkConfirm(false)
    if (failed === 0) {
      toast.success(t("admin.requests.toast_bulk_success", { count: done }))
    } else if (done === 0) {
      toast.error(t("admin.requests.toast_bulk_all_failed", { count: failed }))
    } else {
      toast(t("admin.requests.toast_bulk_partial", { done, failed }), { icon: "⚠️" })
    }
    load()
    window.dispatchEvent(new Event("approvals-changed"))
  }

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">{t("admin.requests.title")}</h2>
          <p className="text-xs text-slate-400">{t("admin.requests.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowOnBehalf(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Pencil size={13}/> ยื่นคำร้องแทนพนักงาน
          </button>
          <Link href="/admin/approvals/supervisors"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">
            <Users size={13}/> {t("admin.requests.supervisors_overview")}
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={13}/> <b className="text-slate-800">{requests.length}</b> {t("admin.requests.items_unit")}
          </div>
          {bulkMode && bulkItems.length > 0 && (
            <button onClick={() => setShowBulkConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm shadow-green-200">
              <CheckCheck size={13}/>
              {bulkMode === "approve_cancel" ? t("admin.requests.approve_all_cancel") : t("admin.requests.approve_all")}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{bulkItems.length}</span>
            </button>
          )}
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">
            <Download size={13}/> {t("admin.requests.export_excel")}
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Company */}
        <select value={filterCo} onChange={e => setFilterCo(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm outline-none">
          <option value="all">{t("admin.requests.all_companies")}</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>

        {/* Type tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {TYPE_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === tab.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}>
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Date range (only when not pending/cancel_requested) */}
        {filterStatus !== "pending" && filterStatus !== "cancel_requested" && (
          <>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs shadow-sm outline-none"/>
            <span className="text-slate-300">→</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs shadow-sm outline-none"/>
          </>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.requests.search_placeholder")}
            className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs shadow-sm outline-none w-44"/>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="flex gap-1.5">
        {STATUS_TABS.map(tab => {
          const cnt = tab.key === "all" ? counts.all : counts[tab.key]
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === tab.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <Icon size={12}/>
              {t(tab.label)}
              {(cnt ?? 0) > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  filterStatus === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>{cnt}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400"/></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar size={40} className="mx-auto mb-2 opacity-30"/>
          <p className="font-medium">{t("admin.requests.empty")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_employee")}</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_type")}</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_detail")}</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_date")}</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_reason")}</th>
                  <th className="px-3 py-3 text-center font-bold text-slate-600">{t("admin.requests.th_status")}</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">{t("admin.requests.th_submitted")}</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-600">{t("admin.requests.th_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map(r => {
                  const emp = r.employee
                  const tc = TYPE_CFG[r.request_type] || TYPE_CFG.leave
                  const isCancel = r.is_cancel_requested
                  const displayStatus = isCancel ? "cancel_requested" : r.status
                  const sc = STATUS_CFG[displayStatus] || STATUS_CFG.pending
                  const isProc = processing === r.id
                  const TypeIcon = tc.icon

                  return (
                    <tr key={`${r.request_type}-${r.id}`} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0 overflow-hidden">
                            {emp?.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : emp?.first_name_th?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{empName(emp)}</p>
                            <p className="text-[9px] text-slate-400 truncate">{emp?.employee_code} · {emp?.department?.name} · {emp?.company?.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${tc.bg} ${tc.color}`}>
                          <TypeIcon size={10}/> {t(tc.label)}
                        </span>
                      </td>

                      {/* Detail */}
                      <td className="px-3 py-3 text-slate-700 font-medium max-w-[200px] truncate">{r.detail}</td>

                      {/* Date */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{safeFmt(r.date_label?.split(" → ")[0])}</td>

                      {/* Reason + Attachment(s) */}
                      <td className="px-3 py-3 text-slate-500 max-w-[180px]">
                        <span className="truncate block">{r.reason || "-"}</span>
                        {(() => {
                          const urls = (r.attachment_urls?.length > 0 ? r.attachment_urls : r.attachment_url ? [r.attachment_url] : []) as string[]
                          const names = (r.attachment_names?.length > 0 ? r.attachment_names : r.attachment_name ? [r.attachment_name] : []) as string[]
                          if (urls.length === 0) return null
                          if (urls.length === 1) {
                            return (
                              <a href={urls[0]} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                                <Paperclip size={10}/> {names[0] || t("admin.requests.attachment")}
                              </a>
                            )
                          }
                          return (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {urls.map((u: string, i: number) => (
                                <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                  title={names[i] || t("admin.requests.file_n", { n: i + 1 })}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[10px] text-blue-600 hover:bg-blue-100 font-bold">
                                  <Paperclip size={9}/> {i + 1}
                                </a>
                              ))}
                              <span className="text-[9px] text-slate-400 font-bold self-center ml-0.5">{t("admin.requests.files_count", { count: urls.length })}</span>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.color}`}>
                          {t(sc.label)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{safeFmt(r.created_at, "d MMM HH:mm")}</td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {r.status === "pending" && !isCancel && (
                            <>
                              <button onClick={() => { setRejectItem(r); setRejectNote("") }}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 disabled:opacity-50">
                                <X size={10} className="inline mr-0.5"/> {t("admin.requests.reject")}
                              </button>
                              {r.request_type === "adjustment" && (
                                <button onClick={() => {
                                  const ci = r.requested_clock_in ? new Date(r.requested_clock_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                                  const co = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                                  const ciDate = r.work_date || ""
                                  const coDate = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : ciDate
                                  setEditAdj({ ...r, edit_clock_in: ci, edit_clock_out: co, edit_clock_in_date: ciDate, edit_clock_out_date: coDate })
                                }}
                                  className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-50">
                                  <Pencil size={10} className="inline mr-0.5"/> {t("admin.requests.edit")}
                                </button>
                              )}
                              <button onClick={() => handleAction("approve", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 disabled:opacity-50">
                                {isProc ? <Loader2 size={10} className="inline animate-spin"/> : <Check size={10} className="inline mr-0.5"/>}
                                {t("admin.requests.approve")}
                              </button>
                            </>
                          )}
                          {isCancel && (
                            <>
                              <button onClick={() => handleAction("reject_cancel", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 disabled:opacity-50">
                                {t("admin.requests.keep_approved")}
                              </button>
                              <button onClick={() => handleAction("approve_cancel", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 disabled:opacity-50">
                                {isProc ? <Loader2 size={10} className="inline animate-spin"/> : <Check size={10} className="inline mr-0.5"/>}
                                {t("admin.requests.approve_cancel")}
                              </button>
                            </>
                          )}
                          {r.status === "approved" && !isCancel && (
                            <button onClick={() => handleAction("force_cancel", r)}
                              disabled={isProc}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                              {t("admin.requests.force_cancel")}
                            </button>
                          )}
                          {r.status === "rejected" && !isCancel && (
                            <>
                              {r.request_type === "adjustment" && (
                                <button onClick={() => {
                                  const ci = r.requested_clock_in ? new Date(r.requested_clock_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                                  const co = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                                  const ciDate = r.work_date || ""
                                  const coDate = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : ciDate
                                  setEditAdj({ ...r, edit_clock_in: ci, edit_clock_out: co, edit_clock_in_date: ciDate, edit_clock_out_date: coDate })
                                }}
                                  disabled={isProc}
                                  className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-50">
                                  <Pencil size={10} className="inline mr-0.5"/> {t("admin.requests.edit")}
                                </button>
                              )}
                              <button onClick={() => handleAction("approve", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 disabled:opacity-50">
                                {isProc ? <Loader2 size={10} className="inline animate-spin"/> : <Check size={10} className="inline mr-0.5"/>}
                                {t("admin.requests.change_to_approved")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export modal */}
      <ApprovalsExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        companies={companies}
        initialFilters={{
          company: filterCo,
          type: filterType,
          status: filterStatus,
          dateFrom: filterFrom,
          dateTo: filterTo,
          search,
        }}
      />

      {/* ยื่นคำร้องแทนพนักงาน */}
      {showOnBehalf && <OnBehalfModal onClose={() => setShowOnBehalf(false)} onDone={() => { setShowOnBehalf(false); load() }} />}

      {/* Reject modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectItem(null)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <X size={18} className="text-red-500"/>
              </div>
              <div>
                <h3 className="font-black text-slate-800">{t("admin.requests.reject_title")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {empName(rejectItem.employee)} · {t(TYPE_CFG[rejectItem.request_type]?.label)} · {rejectItem.detail}
                </p>
              </div>
            </div>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder={t("admin.requests.reject_note_placeholder")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 h-20 resize-none"/>
            <div className="flex gap-2">
              <button onClick={() => setRejectItem(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                {t("admin.requests.cancel")}
              </button>
              <button onClick={() => handleAction("reject", rejectItem, rejectNote)}
                disabled={processing === rejectItem.id}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {processing === rejectItem.id ? <Loader2 size={14} className="inline animate-spin mr-1"/> : null}
                {t("admin.requests.reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Bulk Approve Confirm Modal ═══ */}
      {showBulkConfirm && bulkMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !bulkRunning && setShowBulkConfirm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                bulkMode === "approve_cancel" ? "bg-orange-50" : "bg-green-50"
              }`}>
                <CheckCheck size={18} className={bulkMode === "approve_cancel" ? "text-orange-500" : "text-green-600"}/>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800">
                  {bulkMode === "approve_cancel" ? t("admin.requests.bulk_title_cancel") : t("admin.requests.bulk_title_approve")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {bulkMode === "approve_cancel" ? t("admin.requests.bulk_desc_cancel_pre") : t("admin.requests.bulk_desc_approve_pre")}<b className="text-slate-800">{bulkItems.length}</b> {t("admin.requests.items_unit")}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
              {bulkItems.slice(0, 50).map(r => {
                const tc = TYPE_CFG[r.request_type] || TYPE_CFG.leave
                return (
                  <div key={`${r.request_type}-${r.id}`} className="flex items-center gap-2 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${tc.bg} ${tc.color}`}>{t(tc.label)}</span>
                    <span className="font-bold text-slate-700 truncate">{empName(r.employee)}</span>
                    <span className="text-slate-400 truncate">· {r.detail}</span>
                  </div>
                )
              })}
              {bulkItems.length > 50 && (
                <p className="text-[10px] text-slate-400 text-center pt-1">{t("admin.requests.and_more", { count: bulkItems.length - 50 })}</p>
              )}
            </div>

            {bulkRunning && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>{t("admin.requests.processing")}</span>
                  <span>{bulkProgress.done}/{bulkProgress.total}{bulkProgress.failed > 0 && ` · ${t("admin.requests.bulk_failed", { count: bulkProgress.failed })}`}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all"
                    style={{ width: `${(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100}%` }}/>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowBulkConfirm(false)} disabled={bulkRunning}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {t("admin.requests.cancel")}
              </button>
              <button onClick={handleBulkApprove} disabled={bulkRunning}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 ${
                  bulkMode === "approve_cancel" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"
                }`}>
                {bulkRunning ? <><Loader2 size={14} className="inline animate-spin mr-1"/> {t("admin.requests.bulk_running")}</> : <>{bulkMode === "approve_cancel" ? t("admin.requests.bulk_confirm_cancel") : t("admin.requests.bulk_confirm_approve")}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Adjustment Modal ═══ */}
      {editAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditAdj(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-600 px-5 py-4">
              <h3 className="text-white font-bold">{t("admin.requests.edit_adj_title")}</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{empName(editAdj.employee)} · {editAdj.work_date || editAdj.date_label}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t("admin.requests.label_clockin")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAdj.edit_clock_in_date}
                    onChange={e => setEditAdj((p: any) => ({ ...p, edit_clock_in_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="time" value={editAdj.edit_clock_in}
                    onChange={e => setEditAdj((p: any) => ({ ...p, edit_clock_in: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t("admin.requests.label_clockout")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editAdj.edit_clock_out_date}
                    onChange={e => setEditAdj((p: any) => ({ ...p, edit_clock_out_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="time" value={editAdj.edit_clock_out}
                    onChange={e => setEditAdj((p: any) => ({ ...p, edit_clock_out: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold" />
                </div>
                {editAdj.edit_clock_out_date && editAdj.edit_clock_out_date !== editAdj.edit_clock_in_date && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1">{t("admin.requests.overnight_note")}</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditAdj(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{t("admin.requests.cancel")}</button>
              <button onClick={async () => {
                setEditAdjSaving(true)
                try {
                  // อัพเดท requested_clock_in/out ใน time_adjustment_requests ก่อน
                  const supabase = createClient()
                  const updates: any = {}
                  if (editAdj.edit_clock_in) updates.requested_clock_in = `${editAdj.edit_clock_in_date}T${editAdj.edit_clock_in}:00+07:00`
                  if (editAdj.edit_clock_out) updates.requested_clock_out = `${editAdj.edit_clock_out_date}T${editAdj.edit_clock_out}:00+07:00`
                  await supabase.from("time_adjustment_requests").update(updates).eq("id", editAdj.id)

                  // แล้ว approve เลย
                  await handleAction("approve", editAdj)
                  setEditAdj(null)
                  toast.success(t("admin.requests.toast_edit_approved"))
                } catch { toast.error(t("admin.requests.toast_error")) }
                setEditAdjSaving(false)
              }} disabled={editAdjSaving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {editAdjSaving ? t("admin.requests.edit_adj_saving") : t("admin.requests.edit_adj_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ยื่นคำร้องแทนพนักงาน (HR/Admin) — ค้นหาพนักงาน + คีย์ ลา/OT/แก้เวลา
// ══════════════════════════════════════════════════════════════════
function OnBehalfModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const [q, setQ] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [emp, setEmp] = useState<any>(null)
  const [type, setType] = useState<"leave" | "overtime" | "adjustment">("leave")
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")

  // form fields
  const [f, setF] = useState<any>({
    leave_type_id: "", start_date: today, end_date: today, is_half_day: false, half_day_period: "morning",
    work_date: today, ot_start: "18:00", ot_end: "20:00", ot_rate: "1.5",
    requested_clock_in: "", requested_clock_out: "", clock_out_date: "",
    reason: "",
  })
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }))

  // ค้นหาพนักงาน (ข้ามบริษัท)
  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const tmr = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}&all_companies=1&limit=15`)
        const d = await res.json()
        setResults(d.employees ?? [])
      } catch { setResults([]) } finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(tmr)
  }, [q])

  // โหลดประเภทลาของบริษัทพนักงานที่เลือก
  useEffect(() => {
    if (!emp?.company_id) { setLeaveTypes([]); return }
    supabase.from("leave_types").select("id, name, color_hex").eq("company_id", emp.company_id).eq("is_active", true).order("name")
      .then(({ data }) => { setLeaveTypes(data ?? []); if (data?.[0]) set("leave_type_id", data[0].id) })
  }, [emp?.company_id]) // eslint-disable-line

  const submit = async () => {
    if (!emp) return toast.error("กรุณาเลือกพนักงาน")
    setSaving(true)
    try {
      const body: any = { employee_id: emp.id, type, reason: f.reason }
      if (type === "leave") Object.assign(body, { leave_type_id: f.leave_type_id, start_date: f.start_date, end_date: f.end_date, is_half_day: f.is_half_day, half_day_period: f.half_day_period })
      else if (type === "overtime") Object.assign(body, { work_date: f.work_date, ot_start: f.ot_start, ot_end: f.ot_end, ot_rate: f.ot_rate })
      else Object.assign(body, { work_date: f.work_date, requested_clock_in: f.requested_clock_in, requested_clock_out: f.requested_clock_out, clock_out_date: f.clock_out_date })
      const res = await fetch("/api/admin/submit-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ยื่นไม่สำเร็จ"); return }
      toast.success("ยื่นคำร้องแทนพนักงานแล้ว — เข้าคิวรออนุมัติ")
      onDone()
    } finally { setSaving(false) }
  }

  const inp = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
  const fullName = (e: any) => `${e.first_name_th || ""} ${e.last_name_th || ""}`.trim() + (e.nickname ? ` (${e.nickname})` : "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Pencil size={16} /> ยื่นคำร้องแทนพนักงาน</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* เลือกพนักงาน */}
          {!emp ? (
            <div>
              <label className="text-[11px] font-bold text-slate-500">ค้นหาพนักงาน (ข้ามบริษัทได้)</label>
              <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                <Search size={15} className="text-slate-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="ชื่อ / รหัสพนักงาน" className="flex-1 text-sm outline-none" />
                {searching && <Loader2 size={14} className="animate-spin text-slate-300" />}
              </div>
              {q.trim() && (
                <div className="mt-1.5 border border-slate-100 rounded-lg divide-y max-h-56 overflow-y-auto">
                  {results.length === 0 && !searching ? <p className="px-3 py-4 text-center text-xs text-slate-400">ไม่พบพนักงาน</p> :
                    results.map(e => (
                      <button key={e.id} onClick={() => setEmp(e)} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 grid place-items-center text-blue-700 font-bold text-xs overflow-hidden shrink-0">
                          {e.avatar_url ? <img src={e.avatar_url} className="w-full h-full object-cover" alt="" /> : (e.first_name_th?.[0] || "?")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{fullName(e)}</p>
                          <p className="text-[11px] text-slate-400 truncate">{e.employee_code} · {(e.company as any)?.code || ""} · {e.department?.name || ""}</p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 grid place-items-center text-blue-700 font-bold text-sm overflow-hidden shrink-0">
                {emp.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover" alt="" /> : (emp.first_name_th?.[0] || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{fullName(emp)}</p>
                <p className="text-[11px] text-slate-500">{emp.employee_code} · {(emp.company as any)?.code || ""} · {emp.department?.name || ""}</p>
              </div>
              <button onClick={() => { setEmp(null); setQ("") }} className="text-xs text-blue-600 font-bold">เปลี่ยน</button>
            </div>
          )}

          {emp && (
            <>
              {/* ประเภทคำร้อง */}
              <div className="flex gap-1.5">
                {([["leave", "ลา", Calendar], ["overtime", "OT", Timer], ["adjustment", "แก้เวลา", FileEdit]] as const).map(([k, l, Ic]) => (
                  <button key={k} onClick={() => setType(k)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition ${type === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}`}>
                    <Ic size={13} /> {l}
                  </button>
                ))}
              </div>

              {/* ── ฟอร์มตามประเภท ── */}
              {type === "leave" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500">ประเภทการลา</label>
                    <select value={f.leave_type_id} onChange={e => set("leave_type_id", e.target.value)} className={inp}>
                      {leaveTypes.length === 0 && <option value="">— ไม่มีประเภทลาของบริษัทนี้ —</option>}
                      {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-500">วันเริ่ม</label><input type="date" value={f.start_date} onChange={e => set("start_date", e.target.value)} className={inp} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500">วันสิ้นสุด</label><input type="date" value={f.end_date} onChange={e => set("end_date", e.target.value)} className={inp} disabled={f.is_half_day} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.is_half_day} onChange={e => set("is_half_day", e.target.checked)} className="accent-blue-600" /> ลาครึ่งวัน</label>
                  {f.is_half_day && (
                    <select value={f.half_day_period} onChange={e => set("half_day_period", e.target.value)} className={inp}>
                      <option value="morning">ครึ่งวันเช้า</option><option value="afternoon">ครึ่งวันบ่าย</option>
                    </select>
                  )}
                </div>
              )}
              {type === "overtime" && (
                <div className="space-y-3">
                  <div><label className="text-[11px] font-bold text-slate-500">วันที่ทำ OT</label><input type="date" value={f.work_date} onChange={e => set("work_date", e.target.value)} className={inp} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-500">เริ่ม</label><input type="time" value={f.ot_start} onChange={e => set("ot_start", e.target.value)} className={inp} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500">ถึง</label><input type="time" value={f.ot_end} onChange={e => set("ot_end", e.target.value)} className={inp} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500">เรต</label>
                      <select value={f.ot_rate} onChange={e => set("ot_rate", e.target.value)} className={inp}>
                        <option value="1.5">1.5x</option><option value="1">1x</option><option value="3">3x</option>
                      </select></div>
                  </div>
                </div>
              )}
              {type === "adjustment" && (
                <div className="space-y-3">
                  <div><label className="text-[11px] font-bold text-slate-500">วันที่</label><input type="date" value={f.work_date} onChange={e => set("work_date", e.target.value)} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-500">เวลาเข้า (แก้เป็น)</label><input type="time" value={f.requested_clock_in} onChange={e => set("requested_clock_in", e.target.value)} className={inp} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500">เวลาออก (แก้เป็น)</label><input type="time" value={f.requested_clock_out} onChange={e => set("requested_clock_out", e.target.value)} className={inp} /></div>
                  </div>
                  <p className="text-[10px] text-slate-400">เว้นว่างช่องที่ไม่ต้องการแก้ · ถ้าออกข้ามวันให้ระบุวันออกในหมายเหตุ</p>
                </div>
              )}

              <div><label className="text-[11px] font-bold text-slate-500">เหตุผล / หมายเหตุ</label>
                <textarea value={f.reason} onChange={e => set("reason", e.target.value)} rows={2} className={inp + " resize-none"} placeholder="เช่น พนักงานแจ้งทางไลน์ / ลืมเช็คอิน" /></div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-700">
                ℹ️ คำร้องจะถูกยื่นในนามพนักงาน (สถานะ "รออนุมัติ") แล้วอนุมัติได้ตามปกติในแท็บนี้ · มีป้าย "[ยื่นโดย HR แทน]" กำกับในเหตุผล
              </div>

              <button onClick={submit} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} ยื่นคำร้องแทน
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
