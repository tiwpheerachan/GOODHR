"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Camera, CheckCircle2, XCircle, Clock, MapPin,
  Loader2, ChevronRight, Eye, MessageSquare,
  User, Calendar, Filter, RefreshCw
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"

type OffsiteRequest = {
  id: string
  employee_id: string
  company_id: string
  attendance_id: string | null
  latitude: number
  longitude: number
  location_name: string | null
  photo_url: string
  check_type: "clock_in" | "clock_out"
  checked_at: string
  work_date: string
  note: string | null
  status: "pending" | "approved" | "rejected"
  reviewed_at: string | null
  reject_reason: string | null
  employee: {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    first_name_en: string | null
    last_name_en: string | null
    department: { name: string } | null
    position: { name: string } | null
  } | null
  reviewer: {
    employee: { first_name: string; last_name: string } | null
  } | null
}

export default function OffsiteReviewPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending")
  const [requests, setRequests] = useState<OffsiteRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/checkin/offsite/review?status=${tab}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (requestId: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(requestId)
    try {
      const res = await fetch("/api/checkin/offsite/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action, reject_reason: reason }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setRejectId(null)
        setRejectReason("")
        fetchRequests()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
      setProcessing(null)
    }
  }

  const tabs = [
    { key: "pending" as const, label: "รออนุมัติ", icon: <Clock size={13} />, color: "text-amber-500 bg-amber-50 border-amber-200" },
    { key: "approved" as const, label: "อนุมัติแล้ว", icon: <CheckCircle2 size={13} />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { key: "rejected" as const, label: "ปฏิเสธ", icon: <XCircle size={13} />, color: "text-red-500 bg-red-50 border-red-200" },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
              <Camera size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">เช็คอินนอกสถานที่</h1>
              <p className="text-xs text-gray-400">ตรวจสอบและอนุมัติคำขอเช็คอินนอกสถานที่</p>
            </div>
          </div>
          <button onClick={fetchRequests}
            className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-6 py-3 flex gap-2 border-b border-gray-100">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
              tab === t.key ? t.color : "text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100"
            }`}>
            {t.icon} {t.label}
            {tab === t.key && total > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-current/10 text-[10px]">{total}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Camera size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">ไม่มีคำขอ{tab === "pending" ? "ที่รอ" : tab === "approved" ? "ที่อนุมัติแล้ว" : "ที่ถูกปฏิเสธ"}</p>
          </div>
        ) : (
          requests.map(req => {
            const emp = req.employee
            const isIn = req.check_type === "clock_in"
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Top bar */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isIn ? "bg-indigo-50" : "bg-rose-50"}`}>
                    {isIn ? <Camera size={14} className="text-indigo-500" /> : <Camera size={14} className="text-rose-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">
                      {emp?.first_name} {emp?.last_name}
                      <span className="text-gray-400 font-normal ml-1.5">({emp?.employee_code})</span>
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {emp?.department?.name} · {emp?.position?.name}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    req.status === "pending" ? "bg-amber-50 text-amber-600"
                    : req.status === "approved" ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                  }`}>
                    {req.status === "pending" ? "รออนุมัติ" : req.status === "approved" ? "อนุมัติ" : "ปฏิเสธ"}
                  </span>
                </div>

                {/* Photo + details */}
                <div className="flex gap-3 px-4 py-3">
                  {/* Thumbnail */}
                  <button onClick={() => setPreviewImg(req.photo_url)}
                    className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 group">
                    <img src={req.photo_url} alt="offsite" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Calendar size={10} />
                      <span>{format(new Date(req.work_date + "T00:00:00"), "d MMM yyyy", { locale: th })}</span>
                      <span className="text-gray-300">·</span>
                      <span className={isIn ? "text-indigo-500 font-semibold" : "text-rose-500 font-semibold"}>
                        {isIn ? "เช็คอิน" : "เช็คเอ้าท์"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Clock size={10} />
                      <span className="font-semibold text-gray-700">
                        {format(new Date(req.checked_at), "HH:mm:ss")}
                      </span>
                    </div>
                    {req.location_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <MapPin size={10} />
                        <span className="truncate">{req.location_name}</span>
                      </div>
                    )}
                    {req.note && (
                      <div className="flex items-start gap-1.5 text-[11px] text-gray-500">
                        <MessageSquare size={10} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{req.note}</span>
                      </div>
                    )}
                    {req.reject_reason && (
                      <div className="flex items-start gap-1.5 text-[11px] text-red-500">
                        <XCircle size={10} className="mt-0.5 shrink-0" />
                        <span>เหตุผล: {req.reject_reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons (only for pending) */}
                {req.status === "pending" && (
                  <div className="flex gap-2 px-4 pb-3.5">
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={processing === req.id}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 active:scale-[.98] transition-all"
                      style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                      {processing === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => setRejectId(req.id)}
                      disabled={processing === req.id}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-[.98] transition-all">
                      <XCircle size={12} /> ปฏิเสธ
                    </button>
                  </div>
                )}

                {/* Reviewer info */}
                {req.reviewed_at && req.reviewer && (
                  <div className="px-4 pb-3 text-[10px] text-gray-400">
                    โดย {(req.reviewer as any)?.employee?.first_name} {(req.reviewer as any)?.employee?.last_name}
                    {" · "}{format(new Date(req.reviewed_at), "d MMM HH:mm", { locale: th })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ═══════ Photo Preview Modal ═══════ */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* ═══════ Reject Reason Modal ═══════ */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setRejectId(null); setRejectReason("") }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: "mUp .3s cubic-bezier(.34,1.56,.64,1)" }}>
            <style>{`@keyframes mUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="h-1 w-full bg-gradient-to-r from-red-400 to-orange-400" />
            <div className="px-5 py-5">
              <h3 className="font-bold text-gray-900 text-[15px] mb-1 flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> เหตุผลที่ปฏิเสธ
              </h3>
              <p className="text-[11px] text-gray-400 mb-4">กรุณาระบุเหตุผลเพื่อแจ้งพนักงาน</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {["รูปไม่ชัดเจน", "ตำแหน่งไม่ถูกต้อง", "ไม่ได้รับอนุญาตทำงานนอก", "ข้อมูลไม่ครบถ้วน"].map(r => (
                  <button key={r} onClick={() => setRejectReason(r)}
                    className={`text-[11px] px-3 py-1.5 rounded-full font-medium border transition-all ${rejectReason === r
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {r}
                  </button>
                ))}
              </div>

              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="กรอกเหตุผลเพิ่มเติม..."
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 placeholder-gray-300 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 resize-none mb-4 transition-all" />

              <div className="flex gap-2">
                <button onClick={() => { setRejectId(null); setRejectReason("") }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 active:scale-[.98] transition-all">
                  ยกเลิก
                </button>
                <button onClick={() => handleAction(rejectId, "reject", rejectReason)}
                  disabled={!rejectReason.trim() || processing === rejectId}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 active:scale-[.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {processing === rejectId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={13} />}
                  ยืนยันปฏิเสธ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
