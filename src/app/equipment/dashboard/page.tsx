"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Package, ClipboardList, CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

export default function EquipmentDashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetch("/api/equipment/items?mode=admin").then(r => r.json()),
      fetch("/api/equipment/requests?mode=admin").then(r => r.json()),
    ]).then(([iData, rData]) => {
      setItems(iData.items ?? [])
      setRequests(rData.requests ?? [])
    }).finally(() => setLoading(false))
  }, [user])

  const handleApprove = async (id: string) => {
    const res = await fetch("/api/equipment/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", request_id: id }),
    })
    const data = await res.json()
    if (data.success) { toast.success("อนุมัติสำเร็จ"); window.location.reload() }
    else toast.error(data.error || "เกิดข้อผิดพลาด")
  }

  const totalItems = items.length
  const activeItems = items.filter(i => i.is_active).length
  const borrowedCount = requests.filter(r => r.status === "borrowed").length
  const pendingCount = requests.filter(r => r.status === "pending").length
  const lowStock = items.filter(i => i.is_active && i.available_qty === 0).length
  const pendingRequests = requests.filter(r => r.status === "pending")

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">ภาพรวมอุปกรณ์</h1>
        <p className="text-sm text-slate-400">สรุปสถานะอุปกรณ์และคำขอยืม</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center"><Package size={18} className="text-cyan-600" /></div>
            <div><p className="text-2xl font-black text-slate-800">{activeItems}</p><p className="text-xs text-slate-400">รายการอุปกรณ์</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><ClipboardList size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-black text-slate-800">{borrowedCount}</p><p className="text-xs text-slate-400">กำลังยืม</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-black text-slate-800">{pendingCount}</p><p className="text-xs text-slate-400">รอดำเนินการ</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle size={18} className="text-red-600" /></div>
            <div><p className="text-2xl font-black text-slate-800">{lowStock}</p><p className="text-xs text-slate-400">หมดสต๊อก</p></div>
          </div>
        </div>
      </div>

      {/* Pending requests */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">คำขอยืมที่รอดำเนินการ</h2>
          <Link href="/equipment/requests" className="text-xs text-cyan-600 font-bold hover:underline">ดูทั้งหมด →</Link>
        </div>
        {pendingRequests.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-400">ไม่มีคำขอรอดำเนินการ</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendingRequests.slice(0, 10).map(req => (
              <div key={req.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Package size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{req.item?.name}</p>
                  <p className="text-xs text-slate-400">
                    {req.employee?.first_name_th} {req.employee?.last_name_th} · จำนวน {req.qty} {req.item?.unit}
                  </p>
                </div>
                <button onClick={() => handleApprove(req.id)}
                  className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                  อนุมัติ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low stock items */}
      {lowStock > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <h2 className="text-sm font-bold text-red-700 mb-2">อุปกรณ์หมดสต๊อก</h2>
          <div className="space-y-1">
            {items.filter(i => i.is_active && i.available_qty === 0).map(i => (
              <p key={i.id} className="text-xs text-red-600">· {i.name} ({i.category?.name})</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
