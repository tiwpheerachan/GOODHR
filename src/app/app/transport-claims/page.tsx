"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  Plus, Car, Clock, CheckCircle2, XCircle,
  ArrowLeft, Loader2, Receipt, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: "รอพิจารณา",  color: "bg-amber-100 text-amber-700",  icon: Clock },
  approved: { label: "อนุมัติแล้ว", color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  rejected: { label: "ไม่อนุมัติ",  color: "bg-red-100 text-red-700",     icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  taxi: "แท็กซี่",
  grab: "Grab / Bolt",
  personal_car: "รถส่วนตัว",
  motorcycle: "มอเตอร์ไซค์",
  bus: "รถเมล์ / รถตู้",
  bts_mrt: "BTS / MRT",
  other: "อื่นๆ",
}

export default function TransportClaimsPage() {
  const { user, loading: authLoading } = useAuth()
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const employeeId = user?.employee?.id

  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    if (!employeeId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ employee_id: employeeId })
        if (filter !== "all") params.set("status", filter)
        const res = await fetch(`/api/transport-claims?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ")
        setClaims(json.data ?? [])
      } catch (e: any) {
        setError(e.message)
        setClaims([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [employeeId, filter])

  const totalApproved = claims
    .filter(c => c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0)

  const totalPending = claims
    .filter(c => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0)

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/app/dashboard" className="p-1 -ml-1 rounded-lg hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">เบิกค่าเดินทาง</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-white/70">อนุมัติแล้ว</p>
            <p className="text-xl font-bold mt-0.5">
              {totalApproved.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/50">บาท</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-white/70">รอพิจารณา</p>
            <p className="text-xl font-bold mt-0.5">
              {totalPending.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/50">บาท</p>
          </div>
        </div>
      </div>

      {/* New claim button */}
      <div className="px-4 -mt-3">
        <Link href="/app/transport-claims/new"
          className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-3.5 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">เบิกค่าเดินทาง</p>
            <p className="text-[10px] text-slate-400">กรอกรายละเอียด + แนบสลิป/ใบเสร็จ</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1 flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : STATUS_MAP[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Claims list */}
      <div className="px-4 mt-4 space-y-3">
        {error ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-red-100 shadow-sm">
            <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-600 mb-1">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="text-xs text-red-400 mb-4 px-6">{error}</p>
            <p className="text-[10px] text-slate-400 px-6">กรุณาตรวจสอบว่าตาราง transport_claims ถูกสร้างใน Supabase แล้ว</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium mb-1">ยังไม่มีรายการเบิกค่าเดินทาง</p>
            <p className="text-xs text-slate-400 mb-4">กดปุ่มด้านบนเพื่อเริ่มเบิกค่าเดินทาง</p>
            <Link href="/app/transport-claims/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              <Plus className="w-4 h-4" /> เบิกค่าเดินทาง
            </Link>
          </div>
        ) : (
          claims.map(c => {
            const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending
            const Icon = st.icon
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>
                        <Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {TYPE_LABELS[c.transport_type] ?? c.transport_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {c.description || "ค่าเดินทาง"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{format(new Date(c.claim_date), "d MMM yyyy", { locale: th })}</span>
                      {c.origin && c.destination && (
                        <span className="truncate">{c.origin} → {c.destination}</span>
                      )}
                    </div>
                    {c.receipt_url && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Receipt className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] text-blue-500">แนบหลักฐาน</span>
                      </div>
                    )}
                    {c.status === "rejected" && c.reject_reason && (
                      <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded-lg px-2 py-1">
                        เหตุผล: {c.reject_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-lg font-bold text-slate-800">
                      {Number(c.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400">บาท</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB - New claim */}
      <Link
        href="/app/transport-claims/new"
        className="fixed bottom-24 right-4 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 z-20"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}
