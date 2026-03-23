"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Car, Clock, CheckCircle2, XCircle, Loader2,
  Search, Filter, ChevronDown, Eye, Receipt,
  Check, X, ArrowLeft, ExternalLink, Users,
  Banknote, AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "รอพิจารณา",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  approved: { label: "อนุมัติแล้ว", color: "text-green-700",  bg: "bg-green-50 border-green-200",  dot: "bg-green-400" },
  rejected: { label: "ไม่อนุมัติ",  color: "text-red-700",    bg: "bg-red-50 border-red-200",      dot: "bg-red-400" },
}

const TYPE_LABELS: Record<string, string> = {
  taxi: "แท็กซี่", grab: "Grab / Bolt", personal_car: "รถส่วนตัว",
  motorcycle: "มอเตอร์ไซค์", bus: "รถเมล์ / รถตู้", bts_mrt: "BTS / MRT", other: "อื่นๆ",
}

export default function AdminTransportClaimsPage() {
  const { user, loading: authLoading } = useAuth()
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [search, setSearch] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  const companyId = (user as any)?.company_id ?? user?.employee?.company_id

  const loadClaims = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const params = new URLSearchParams({ company_id: companyId })
    if (filter !== "all") params.set("status", filter)
    const res = await fetch(`/api/transport-claims?${params}`)
    const json = await res.json()
    setClaims(json.data ?? [])
    setLoading(false)
  }, [companyId, filter])

  useEffect(() => { loadClaims() }, [loadClaims])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch("/api/transport-claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success("อนุมัติเรียบร้อย")
      loadClaims()
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(null) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    try {
      const res = await fetch("/api/transport-claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectModal.id, status: "rejected", reject_reason: rejectReason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success("ปฏิเสธเรียบร้อย")
      setRejectModal(null)
      setRejectReason("")
      loadClaims()
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(null) }
  }

  const handleBulkApprove = async () => {
    const pendings = filteredClaims.filter(c => c.status === "pending")
    if (pendings.length === 0) return
    if (!confirm(`อนุมัติทั้งหมด ${pendings.length} รายการ?`)) return

    let ok = 0, fail = 0
    for (const c of pendings) {
      try {
        const res = await fetch("/api/transport-claims", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, status: "approved" }),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
    toast.success(`อนุมัติ ${ok} รายการ${fail > 0 ? ` / ล้มเหลว ${fail}` : ""}`)
    loadClaims()
  }

  // Filter by search
  const filteredClaims = claims.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    const name = `${c.employee?.first_name_th || ""} ${c.employee?.last_name_th || ""} ${c.employee?.employee_code || ""} ${c.employee?.nickname || ""} ${c.description || ""}`.toLowerCase()
    return name.includes(s)
  })

  // Stats
  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === "pending").length,
    approved: claims.filter(c => c.status === "approved").length,
    totalAmount: claims.filter(c => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0),
    pendingAmount: claims.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0),
  }

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">เบิกค่าเดินทาง</h1>
          <p className="text-sm text-slate-400 mt-0.5">อนุมัติ / ปฏิเสธรายการเบิกค่าเดินทางพนักงาน</p>
        </div>
        {filter === "pending" && stats.pending > 0 && (
          <button
            onClick={handleBulkApprove}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Check className="w-4 h-4" />
            อนุมัติทั้งหมด ({stats.pending})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs text-slate-400">รอพิจารณา</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
          <p className="text-xs text-slate-400">{stats.pendingAmount.toLocaleString("th-TH")} บาท</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-slate-400">อนุมัติแล้ว</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.approved}</p>
          <p className="text-xs text-slate-400">{stats.totalAmount.toLocaleString("th-TH")} บาท</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-slate-400">รายการทั้งหมด</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs text-slate-400">ยอดอนุมัติรวม</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {stats.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400">บาท</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : STATUS_MAP[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Claims table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-16">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">พนักงาน</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">รายละเอียด</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">จำนวนเงิน</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">หลักฐาน</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">สถานะ</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClaims.map(c => {
                  const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending
                  const empName = `${c.employee?.first_name_th || ""} ${c.employee?.last_name_th || ""}`.trim()
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{empName}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.employee?.employee_code} · {c.employee?.department?.name || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {format(new Date(c.claim_date), "d MMM yy", { locale: th })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {TYPE_LABELS[c.transport_type] ?? c.transport_type}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-slate-600 truncate">{c.description || "-"}</p>
                        {c.origin && c.destination && (
                          <p className="text-[10px] text-slate-400 truncate">{c.origin} → {c.destination}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {Number(c.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.receipt_url ? (
                          <button
                            onClick={() => setPreviewUrl(c.receipt_url)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            ดู
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.bg} ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.status === "pending" && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleApprove(c.id)}
                              disabled={processing === c.id}
                              className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors disabled:opacity-50"
                              title="อนุมัติ"
                            >
                              {processing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: c.id, name: empName })}
                              disabled={processing === c.id}
                              className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="ไม่อนุมัติ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">หลักฐาน / ใบเสร็จ</h3>
              <div className="flex items-center gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> เปิดในแท็บใหม่
                </a>
                <button onClick={() => setPreviewUrl(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img src={previewUrl} alt="Receipt" className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">ไม่อนุมัติ</h3>
              <p className="text-xs text-slate-400 mt-0.5">ค่าเดินทางของ {rejectModal.name}</p>
            </div>
            <div className="p-5">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">เหตุผล (ไม่บังคับ)</label>
              <textarea
                rows={3}
                placeholder="ระบุเหตุผลที่ไม่อนุมัติ..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all resize-none"
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setRejectModal(null); setRejectReason("") }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === rejectModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                ไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
