"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Check, X, Clock, Calendar, Timer, FileEdit, Search, Filter,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Building2,
  Download, Users, Ban, ArrowRightLeft,
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"

const TYPE_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  leave:        { label: "ลางาน",      icon: Calendar,       color: "text-sky-700",     bg: "bg-sky-100" },
  adjustment:   { label: "แก้ไขเวลา",  icon: FileEdit,       color: "text-violet-700",  bg: "bg-violet-100" },
  overtime:     { label: "โอที",       icon: Timer,          color: "text-amber-700",   bg: "bg-amber-100" },
  shift_change: { label: "เปลี่ยนกะ",  icon: ArrowRightLeft, color: "text-emerald-700", bg: "bg-emerald-100" },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "รออนุมัติ",      color: "text-amber-700",  bg: "bg-amber-100" },
  approved:         { label: "อนุมัติแล้ว",    color: "text-green-700",  bg: "bg-green-100" },
  rejected:         { label: "ปฏิเสธ",         color: "text-red-700",    bg: "bg-red-100" },
  cancelled:        { label: "ยกเลิกแล้ว",     color: "text-slate-500",  bg: "bg-slate-100" },
  cancel_requested: { label: "ขอยกเลิก",      color: "text-orange-700", bg: "bg-orange-100" },
}

const STATUS_TABS = [
  { key: "pending",          label: "รออนุมัติ",   icon: Clock },
  { key: "cancel_requested", label: "ขอยกเลิก",   icon: Ban },
  { key: "approved",         label: "อนุมัติแล้ว", icon: Check },
  { key: "rejected",         label: "ปฏิเสธ",      icon: X },
  { key: "all",              label: "ทั้งหมด",     icon: Filter },
]

const TYPE_TABS = [
  { key: "all",          label: "ทั้งหมด" },
  { key: "leave",        label: "ลางาน" },
  { key: "adjustment",   label: "แก้ไขเวลา" },
  { key: "overtime",     label: "โอที" },
  { key: "shift_change", label: "เปลี่ยนกะ" },
]

export default function AdminApprovalsPage() {
  const { user } = useAuth()
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
      toast.error("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่")
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
          action === "approve" ? "อนุมัติแล้ว" :
          action === "reject" ? "ปฏิเสธแล้ว" :
          action === "approve_cancel" ? "อนุมัติยกเลิกแล้ว" :
          action === "reject_cancel" ? "คงอนุมัติเดิม" :
          action === "force_cancel" ? "ยกเลิกแล้ว" : "สำเร็จ"
        )
        setRejectItem(null)
        setRejectNote("")
        load()
        // แจ้ง sidebar ให้ refresh badge ทันที
        window.dispatchEvent(new Event("approvals-changed"))
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด")
      }
    } catch (e: any) {
      console.error("Action error:", e)
      toast.error("ดำเนินการไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setProcessing(null)
    }
  }

  const safeFmt = (d: string | null, fmt = "d MMM yy") => {
    if (!d) return "-"
    try { return format(new Date(d), fmt, { locale: th }) } catch { return d }
  }

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">คำร้องทั้งหมด</h2>
          <p className="text-xs text-slate-400">รวมคำขอลา · แก้ไขเวลา · โอที · ขอยกเลิก ในที่เดียว</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/approvals/supervisors"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">
            <Users size={13}/> ภาพรวมหัวหน้า-ลูกน้อง
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={13}/> <b className="text-slate-800">{requests.length}</b> รายการ
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Company */}
        <select value={filterCo} onChange={e => setFilterCo(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm outline-none">
          <option value="all">ทุกบริษัท</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>

        {/* Type tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {TYPE_TABS.map(t => (
            <button key={t.key} onClick={() => setFilterType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === t.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}>
              {t.label}
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ/รหัส..."
            className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs shadow-sm outline-none w-44"/>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="flex gap-1.5">
        {STATUS_TABS.map(t => {
          const cnt = t.key === "all" ? counts.all : counts[t.key]
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setFilterStatus(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === t.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}>
              <Icon size={12}/>
              {t.label}
              {(cnt ?? 0) > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  filterStatus === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
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
          <p className="font-medium">ไม่พบคำร้อง</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-bold text-slate-600">พนักงาน</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">ประเภท</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">รายละเอียด</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">วันที่</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">เหตุผล</th>
                  <th className="px-3 py-3 text-center font-bold text-slate-600">สถานะ</th>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">ส่งเมื่อ</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-600">จัดการ</th>
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
                            <p className="font-bold text-slate-800 truncate">{emp?.first_name_th} {emp?.last_name_th}</p>
                            <p className="text-[9px] text-slate-400 truncate">{emp?.employee_code} · {emp?.department?.name} · {emp?.company?.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${tc.bg} ${tc.color}`}>
                          <TypeIcon size={10}/> {tc.label}
                        </span>
                      </td>

                      {/* Detail */}
                      <td className="px-3 py-3 text-slate-700 font-medium max-w-[200px] truncate">{r.detail}</td>

                      {/* Date */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{safeFmt(r.date_label?.split(" → ")[0])}</td>

                      {/* Reason */}
                      <td className="px-3 py-3 text-slate-500 max-w-[150px] truncate">{r.reason || "-"}</td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.color}`}>
                          {sc.label}
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
                                <X size={10} className="inline mr-0.5"/> ปฏิเสธ
                              </button>
                              <button onClick={() => handleAction("approve", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 disabled:opacity-50">
                                {isProc ? <Loader2 size={10} className="inline animate-spin"/> : <Check size={10} className="inline mr-0.5"/>}
                                อนุมัติ
                              </button>
                            </>
                          )}
                          {isCancel && (
                            <>
                              <button onClick={() => handleAction("reject_cancel", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 disabled:opacity-50">
                                คงอนุมัติ
                              </button>
                              <button onClick={() => handleAction("approve_cancel", r)}
                                disabled={isProc}
                                className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 disabled:opacity-50">
                                {isProc ? <Loader2 size={10} className="inline animate-spin"/> : <Check size={10} className="inline mr-0.5"/>}
                                อนุมัติยกเลิก
                              </button>
                            </>
                          )}
                          {r.status === "approved" && !isCancel && (
                            <button onClick={() => handleAction("force_cancel", r)}
                              disabled={isProc}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                              ยกเลิก
                            </button>
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
                <h3 className="font-black text-slate-800">ปฏิเสธคำร้อง</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rejectItem.employee?.first_name_th} · {TYPE_CFG[rejectItem.request_type]?.label} · {rejectItem.detail}
                </p>
              </div>
            </div>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="เหตุผลที่ปฏิเสธ (ไม่บังคับ)..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 h-20 resize-none"/>
            <div className="flex gap-2">
              <button onClick={() => setRejectItem(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={() => handleAction("reject", rejectItem, rejectNote)}
                disabled={processing === rejectItem.id}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {processing === rejectItem.id ? <Loader2 size={14} className="inline animate-spin mr-1"/> : null}
                ปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
