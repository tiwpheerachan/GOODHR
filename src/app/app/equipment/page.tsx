"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Package, Loader2, Clock, CheckCircle2, XCircle, Send, X, ChevronDown, ChevronUp, Undo2 } from "lucide-react"
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

export default function EmployeeEquipmentPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<"browse" | "my">("browse")
  const [items, setItems] = useState<any[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState("")

  // Borrow modal
  const [borrowItem, setBorrowItem] = useState<any>(null)
  const [borrowQty, setBorrowQty] = useState(1)
  const [borrowReason, setBorrowReason] = useState("")
  const [borrowReturn, setBorrowReturn] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const [iRes, cRes, rRes] = await Promise.all([
      fetch("/api/equipment/items?mode=employee").then(r => r.json()),
      fetch("/api/equipment/categories").then(r => r.json()),
      fetch("/api/equipment/requests?mode=employee").then(r => r.json()),
    ])
    setItems(iRes.items ?? [])
    setCategories((cRes.categories ?? []).filter((c: any) => c.is_active))
    setMyRequests(rRes.requests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const handleBorrow = async () => {
    if (!borrowItem) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/equipment/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request", item_id: borrowItem.id,
          qty: borrowQty, reason: borrowReason, expected_return: borrowReturn || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("ส่งคำขอยืมสำเร็จ")
        setBorrowItem(null); setBorrowQty(1); setBorrowReason(""); setBorrowReturn("")
        load()
      } else toast.error(data.error)
    } catch { toast.error("เกิดข้อผิดพลาด") }
    setSubmitting(false)
  }

  const handleCancel = async (id: string) => {
    if (!confirm("ยกเลิกคำขอยืมนี้?")) return
    const res = await fetch("/api/equipment/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", request_id: id }),
    })
    const data = await res.json()
    if (data.success) { toast.success("ยกเลิกสำเร็จ"); load() }
    else toast.error(data.error)
  }

  const filteredItems = catFilter ? items.filter(i => i.category_id === catFilter) : items
  const activeRequests = myRequests.filter(r => ["pending", "approved", "borrowed"].includes(r.status))

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center">
            <Package size={16} className="text-cyan-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800">ยืมอุปกรณ์</h1>
        </div>
        <p className="text-sm text-slate-400 ml-10">ดูอุปกรณ์ที่มีและส่งคำขอยืม</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("browse")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${tab === "browse" ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
          อุปกรณ์ทั้งหมด
        </button>
        <button onClick={() => setTab("my")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors relative ${tab === "my" ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
          การยืมของฉัน
          {activeRequests.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{activeRequests.length}</span>
          )}
        </button>
      </div>

      {/* Browse Tab */}
      {tab === "browse" && (
        <>
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCatFilter("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${!catFilter ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                ทั้งหมด
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${catFilter === c.id ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Items grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package size={32} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">ไม่มีอุปกรณ์ที่พร้อมให้ยืม</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => { if (item.available_qty > 0) { setBorrowItem(item); setBorrowQty(1) } }}
                  disabled={item.available_qty === 0}
                  className={`card text-left space-y-2 transition-all ${item.available_qty > 0 ? "hover:shadow-md active:scale-[0.98]" : "opacity-60"}`}>
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Package size={18} className="text-cyan-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-2">{item.name}</p>
                  <p className="text-[10px] text-slate-400">{item.category?.name}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${item.available_qty > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {item.available_qty > 0 ? `ว่าง ${item.available_qty} ${item.unit}` : "หมด"}
                    </span>
                    <span className="text-[10px] text-slate-400">/ {item.total_qty}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Requests Tab */}
      {tab === "my" && (
        <div className="space-y-2">
          {myRequests.length === 0 ? (
            <div className="text-center py-12">
              <Package size={32} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">ยังไม่มีประวัติการยืม</p>
            </div>
          ) : (
            myRequests.map(req => {
              const sc = STATUS_CFG[req.status] || STATUS_CFG.pending
              return (
                <div key={req.id} className="card space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                      <Package size={16} className="text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{req.item?.name}</p>
                      <p className="text-xs text-slate-400">จำนวน {req.qty} {req.item?.unit}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>
                  {req.reason && <p className="text-xs text-slate-500">เหตุผล: {req.reason}</p>}
                  {req.reject_reason && <p className="text-xs text-red-500">เหตุผลปฏิเสธ: {req.reject_reason}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(req.created_at), "d MMM yyyy HH:mm", { locale: th })}
                    </span>
                    {req.status === "pending" && (
                      <button onClick={() => handleCancel(req.id)}
                        className="text-[11px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100">
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Borrow Modal */}
      {borrowItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setBorrowItem(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-cyan-50 px-6 py-5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                <Package size={24} className="text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{borrowItem.name}</h3>
                <p className="text-xs text-slate-500">{borrowItem.category?.name} · ว่าง {borrowItem.available_qty} {borrowItem.unit}</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">จำนวนที่ต้องการ</label>
                <input type="number" min={1} max={borrowItem.available_qty} value={borrowQty}
                  onChange={e => setBorrowQty(Math.min(borrowItem.available_qty, Math.max(1, Number(e.target.value))))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none text-center" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">เหตุผล</label>
                <textarea value={borrowReason} onChange={e => setBorrowReason(e.target.value)}
                  placeholder="เช่น ใช้ประชุม, ใช้งานชั่วคราว..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">วันที่คืน (คาดการณ์)</label>
                <input type="date" value={borrowReturn} onChange={e => setBorrowReturn(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setBorrowItem(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleBorrow} disabled={submitting}
                className="flex-[1.5] py-3 rounded-2xl bg-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-cyan-700 disabled:opacity-50">
                <Send size={14} /> {submitting ? "กำลังส่ง..." : "ส่งคำขอยืม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
