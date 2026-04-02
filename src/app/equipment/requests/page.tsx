"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { ClipboardList, Loader2, Search, CheckCircle2, XCircle, Package, ArrowLeftRight, Undo2 } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "รอดำเนินการ", color: "text-amber-700",   bg: "bg-amber-50" },
  approved:  { label: "อนุมัติแล้ว",  color: "text-blue-700",    bg: "bg-blue-50" },
  borrowed:  { label: "กำลังยืม",    color: "text-indigo-700",  bg: "bg-indigo-50" },
  returned:  { label: "คืนแล้ว",     color: "text-emerald-700", bg: "bg-emerald-50" },
  rejected:  { label: "ปฏิเสธ",     color: "text-red-700",     bg: "bg-red-50" },
  cancelled: { label: "ยกเลิก",     color: "text-slate-500",   bg: "bg-slate-50" },
}

const TABS = ["all", "pending", "approved", "borrowed", "returned", "rejected"] as const

export default function EquipmentRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/equipment/requests?mode=admin")
    const data = await res.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const doAction = async (action: string, request_id: string, extra?: any) => {
    setActionLoading(request_id)
    try {
      const res = await fetch("/api/equipment/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_id, ...extra }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          action === "approve" ? "อนุมัติสำเร็จ" :
          action === "reject" ? "ปฏิเสธสำเร็จ" :
          action === "mark_borrowed" ? "บันทึกส่งมอบแล้ว" :
          action === "mark_returned" ? "บันทึกรับคืนแล้ว" : "สำเร็จ"
        )
        setShowRejectModal(null); setRejectReason("")
        load()
      } else toast.error(data.error)
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setActionLoading(null)
  }

  const filtered = requests.filter(r => {
    if (tab !== "all" && r.status !== tab) return false
    if (search) {
      const s = search.toLowerCase()
      const name = `${r.employee?.first_name_th || ""} ${r.employee?.last_name_th || ""} ${r.employee?.employee_code || ""} ${r.item?.name || ""}`.toLowerCase()
      if (!name.includes(s)) return false
    }
    return true
  })

  const tabCounts: Record<string, number> = { all: requests.length }
  TABS.forEach(t => { if (t !== "all") tabCounts[t] = requests.filter(r => r.status === t).length })

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">คำขอยืมอุปกรณ์</h1>
        <p className="text-sm text-slate-400">จัดการคำขอยืมทั้งหมด · {requests.length} รายการ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              tab === t ? "bg-cyan-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"}`}>
            {t === "all" ? "ทั้งหมด" : STATUS_CFG[t]?.label || t}
            {tabCounts[t] > 0 && <span className="ml-1 opacity-75">({tabCounts[t]})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อพนักงาน / อุปกรณ์..."
          className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none w-full max-w-md" />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={32} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">ไม่พบคำขอ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(req => {
              const sc = STATUS_CFG[req.status] || STATUS_CFG.pending
              return (
                <div key={req.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                  {/* Employee */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {req.employee?.avatar_url
                      ? <img src={req.employee.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-slate-500 text-sm font-bold">{req.employee?.first_name_th?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {req.employee?.first_name_th} {req.employee?.last_name_th}
                      <span className="text-xs text-slate-400 font-normal ml-1">{req.employee?.employee_code}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {req.item?.name} · จำนวน {req.qty} {req.item?.unit}
                      {req.reason && <span className="text-slate-400"> · {req.reason}</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {format(new Date(req.created_at), "d MMM HH:mm", { locale: th })}
                  </span>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 shrink-0">
                    {req.status === "pending" && (
                      <>
                        <button onClick={() => doAction("approve", req.id)} disabled={!!actionLoading}
                          className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          อนุมัติ
                        </button>
                        <button onClick={() => { setShowRejectModal(req.id); setRejectReason("") }} disabled={!!actionLoading}
                          className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50">
                          ปฏิเสธ
                        </button>
                      </>
                    )}
                    {req.status === "approved" && (
                      <button onClick={() => doAction("mark_borrowed", req.id)} disabled={!!actionLoading}
                        className="text-[11px] font-bold bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                        <ArrowLeftRight size={10} /> ส่งมอบ
                      </button>
                    )}
                    {req.status === "borrowed" && (
                      <button onClick={() => doAction("mark_returned", req.id)} disabled={!!actionLoading}
                        className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                        <Undo2 size={10} /> รับคืน
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800">ปฏิเสธคำขอยืม</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="เหตุผลที่ปฏิเสธ (ไม่บังคับ)..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px] outline-none" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">ยกเลิก</button>
              <button onClick={() => doAction("reject", showRejectModal, { reject_reason: rejectReason })} disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">ปฏิเสธ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
