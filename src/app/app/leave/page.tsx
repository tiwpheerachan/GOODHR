"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  Plus, Clock, FileEdit, Timer, CalendarCheck,
  ChevronRight, X, AlertCircle, CheckCircle2,
  XCircle, Loader2, CalendarClock
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────
type AnyRequest = {
  id: string
  kind: "leave" | "adjustment" | "overtime"
  title: string
  subtitle: string
  dateLabel: string
  reason?: string
  status: string
  created_at: string
  can_cancel: boolean
}

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending:   { label: "รออนุมัติ", className: "bg-amber-50  text-amber-700  border border-amber-200",  icon: <Clock size={10}/> },
    approved:  { label: "อนุมัติแล้ว",className: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 size={10}/> },
    rejected:  { label: "ปฏิเสธ",    className: "bg-red-50    text-red-600    border border-red-200",    icon: <XCircle size={10}/> },
    cancelled: { label: "ยกเลิกแล้ว",className: "bg-slate-100 text-slate-500  border border-slate-200", icon: <X size={10}/> },
  }
  const c = cfg[status] ?? cfg.pending
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-xl ${c.className}`}>
      {c.icon}{c.label}
    </span>
  )
}

// ── Kind Icon + Color ─────────────────────────────────────────
function KindIcon({ kind }: { kind: AnyRequest["kind"] }) {
  if (kind === "leave")      return <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><CalendarClock size={16} className="text-blue-600"/></div>
  if (kind === "adjustment") return <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0"><FileEdit size={16} className="text-violet-600"/></div>
  return                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><Timer size={16} className="text-amber-600"/></div>
}

// ── Cancel Confirm Modal ──────────────────────────────────────
function CancelModal({
  item, onConfirm, onClose, loading
}: {
  item: AnyRequest
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500"/>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-red-500"/>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">ยืนยันการยกเลิก</h3>
              <p className="text-sm text-slate-500 mt-0.5">คำขอ <b className="text-slate-700">{item.title}</b></p>
              <p className="text-xs text-slate-400 mt-0.5">{item.dateLabel}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-amber-700">เมื่อยกเลิกแล้วจะไม่สามารถแก้ไขได้ ต้องยื่นคำขอใหม่หากต้องการ</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              ไม่ยกเลิก
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin"/> : <X size={14}/>}
              ยกเลิกคำขอ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function LeavePage() {
  const { user }       = useAuth()
  const supabase       = createClient()
  const { balances }   = useLeaveBalance(user?.employee_id)

  const [tab,         setTab]         = useState<"balance"|"history">("balance")
  const [requests,    setRequests]    = useState<AnyRequest[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [cancelItem,  setCancelItem]  = useState<AnyRequest|null>(null)
  const [cancelling,  setCancelling]  = useState(false)
  const [filterKind,  setFilterKind]  = useState<"all"|"leave"|"adjustment"|"overtime">("all")

  // โหลดคำขอทั้งหมด
  const loadRequests = useCallback(async () => {
    if (!user?.employee_id) return
    setLoadingReqs(true)
    const empId = user.employee_id

    // โหลด parallel
    const [leaveRes, adjRes, otRes] = await Promise.all([
      supabase.from("leave_requests")
        .select("id,status,start_date,end_date,total_days,reason,created_at,leave_type:leave_types(name,color_hex)")
        .eq("employee_id", empId).is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("time_adjustment_requests")
        .select("id,status,work_date,requested_clock_in,requested_clock_out,reason,created_at")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false }),
      supabase.from("overtime_requests")
        .select("id,status,work_date,ot_start,ot_end,reason,created_at")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false }),
    ])

    const mapped: AnyRequest[] = []

    // Leave requests
    ;(leaveRes.data ?? []).forEach((r: any) => {
      const start = format(new Date(r.start_date), "d MMM yy", { locale: th })
      const end   = r.start_date !== r.end_date ? " – " + format(new Date(r.end_date), "d MMM yy", { locale: th }) : ""
      mapped.push({
        id: r.id, kind: "leave",
        title:     r.leave_type?.name ?? "ใบลา",
        subtitle:  `${r.total_days} วัน`,
        dateLabel: start + end,
        reason:    r.reason,
        status:    r.status,
        created_at: r.created_at,
        can_cancel: r.status === "pending",
      })
    })

    // Adjustment requests
    ;(adjRes.data ?? []).forEach((r: any) => {
      const fmt = (t?: string) => t ? format(new Date(t), "HH:mm") : "—"
      mapped.push({
        id: r.id, kind: "adjustment",
        title:     "ขอแก้ไขเวลา",
        subtitle:  `เข้า ${fmt(r.requested_clock_in)} · ออก ${fmt(r.requested_clock_out)}`,
        dateLabel: r.work_date ? format(new Date(r.work_date), "d MMM yy", { locale: th }) : "—",
        reason:    r.reason,
        status:    r.status,
        created_at: r.created_at,
        can_cancel: r.status === "pending",
      })
    })

    // OT requests
    ;(otRes.data ?? []).forEach((r: any) => {
      const fmt = (t?: string) => t ? format(new Date(t), "HH:mm") : "—"
      mapped.push({
        id: r.id, kind: "overtime",
        title:     "คำขอโอที",
        subtitle:  `${fmt(r.ot_start)} – ${fmt(r.ot_end)}`,
        dateLabel: r.work_date ? format(new Date(r.work_date), "d MMM yy", { locale: th }) : "—",
        reason:    r.reason,
        status:    r.status,
        created_at: r.created_at,
        can_cancel: r.status === "pending",
      })
    })

    // เรียงตาม created_at
    mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setRequests(mapped)
    setLoadingReqs(false)
  }, [user?.employee_id])

  useEffect(() => { if (tab === "history") loadRequests() }, [tab, loadRequests])

  // ยกเลิก
  const handleCancel = async () => {
    if (!cancelItem) return
    setCancelling(true)
    let error: any = null

    if (cancelItem.kind === "leave") {
      const { error: e } = await supabase.from("leave_requests")
        .update({ status: "cancelled" }).eq("id", cancelItem.id)
      error = e
    } else if (cancelItem.kind === "adjustment") {
      const { error: e } = await supabase.from("time_adjustment_requests")
        .update({ status: "cancelled" }).eq("id", cancelItem.id)
      error = e
    } else if (cancelItem.kind === "overtime") {
      const { error: e } = await supabase.from("overtime_requests")
        .update({ status: "cancelled" }).eq("id", cancelItem.id)
      error = e
    }

    setCancelling(false)
    if (error) { toast.error(error.message); return }

    toast.success("ยกเลิกคำขอสำเร็จ")
    setCancelItem(null)
    // อัปเดต local state ทันทีไม่ต้อง reload
    setRequests(prev => prev.map(r => r.id === cancelItem.id ? { ...r, status: "cancelled", can_cancel: false } : r))
  }

  const kindLabels = { all:"ทั้งหมด", leave:"ใบลา", adjustment:"แก้เวลา", overtime:"โอที" }
  const filtered   = filterKind === "all" ? requests : requests.filter(r => r.kind === filterKind)

  const stats = {
    pending:  requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    total:    requests.length,
  }

  return (
    <>
      {cancelItem && (
        <CancelModal item={cancelItem} onConfirm={handleCancel} onClose={() => setCancelItem(null)} loading={cancelling}/>
      )}

      <div className="min-h-screen bg-slate-50 pb-10">

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-6 pb-14 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage:"radial-gradient(circle at 80% 20%,#fff,transparent 60%)" }}/>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-xl font-bold text-white">คำขอ & การลา</h1>
              <p className="text-blue-200 text-xs mt-0.5">ประวัติและสถานะทั้งหมด</p>
            </div>
            <Link href="/app/leave/new"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-2xl transition-all backdrop-blur-sm">
              <Plus size={14}/> ยื่นคำขอ
            </Link>
          </div>
        </div>

        <div className="px-4 -mt-8 space-y-3 relative z-10">

          {/* ── Tab Switch ── */}
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-1 flex border border-slate-100">
            {([["balance","โควต้าการลา"],["history","ประวัติคำขอ"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  tab === k ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>{l}
                {k === "history" && stats.pending > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab==="history"?"bg-white/30 text-white":"bg-amber-100 text-amber-700"}`}>
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Balance Tab ── */}
          {tab === "balance" && (
            <div className="space-y-3">
              {/* quick action buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { href:"/app/leave/new?type=leave",      icon:<CalendarClock size={16}/>, label:"ยื่นใบลา",    color:"bg-blue-50 text-blue-600 border-blue-100"    },
                  { href:"/app/leave/new?type=adjustment", icon:<FileEdit size={16}/>,      label:"แก้ไขเวลา",   color:"bg-violet-50 text-violet-600 border-violet-100"},
                  { href:"/app/leave/new?type=overtime",   icon:<Timer size={16}/>,         label:"ขอโอที",      color:"bg-amber-50 text-amber-600 border-amber-100"  },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm bg-white ${a.color}`}>
                    {a.icon}{a.label}
                  </Link>
                ))}
              </div>

              {/* leave balances */}
              {balances.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.leave_type?.color_hex || "#60a5fa" }}/>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{b.leave_type?.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.leave_type?.is_paid ? "ได้รับเงิน" : "ไม่ได้รับเงิน"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600 leading-none">{b.remaining_days}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">คงเหลือ / วัน</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: b.entitled_days > 0 ? Math.min(b.used_days / b.entitled_days * 100, 100) + "%" : "0%" }}/>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>ใช้ไป <b className="text-slate-600">{b.used_days}</b> วัน</span>
                    <span>รอ <b className="text-amber-600">{b.pending_days}</b> วัน</span>
                    <span>ทั้งหมด <b className="text-slate-600">{b.entitled_days}</b> วัน</span>
                  </div>
                </div>
              ))}
              {balances.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
                  <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2"/>
                  <p className="text-slate-400 text-sm">ไม่มีข้อมูลโควต้าการลา</p>
                </div>
              )}
            </div>
          )}

          {/* ── History Tab ── */}
          {tab === "history" && (
            <div className="space-y-3">

              {/* stats row */}
              {requests.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label:"ทั้งหมด",   val: stats.total,    color:"text-slate-700"  },
                    { label:"รออนุมัติ", val: stats.pending,  color:"text-amber-600"  },
                    { label:"อนุมัติแล้ว",val: stats.approved, color:"text-emerald-600"},
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 py-3 text-center shadow-sm">
                      <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(["all","leave","adjustment","overtime"] as const).map(k => (
                  <button key={k} onClick={() => setFilterKind(k)}
                    className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${
                      filterKind === k
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                    }`}>{kindLabels[k]}
                  </button>
                ))}
              </div>

              {/* request cards */}
              {loadingReqs && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin"/><span className="text-sm">กำลังโหลด...</span>
                </div>
              )}

              {!loadingReqs && filtered.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <KindIcon kind={r.kind}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{r.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.dateLabel} · {r.subtitle}</p>
                          {r.reason && (
                            <p className="text-[11px] text-slate-400 mt-1 truncate">{r.reason}</p>
                          )}
                        </div>
                        <StatusBadge status={r.status}/>
                      </div>

                      {/* cancel button */}
                      {r.can_cancel && (
                        <button onClick={() => setCancelItem(r)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors">
                          <X size={12}/> ยกเลิกคำขอนี้
                        </button>
                      )}

                      {r.status === "cancelled" && (
                        <p className="mt-2 text-[10px] text-slate-300 flex items-center gap-1">
                          <X size={10}/> ถูกยกเลิกแล้ว
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {!loadingReqs && filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
                  <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2"/>
                  <p className="text-slate-400 text-sm">ยังไม่มีคำขอ</p>
                  <Link href="/app/leave/new" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-600 hover:underline">
                    <Plus size={12}/> ยื่นคำขอแรก
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}