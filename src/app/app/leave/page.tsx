"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  Plus, Clock, FileEdit, Timer, CalendarCheck,
  X, AlertCircle, CheckCircle2, XCircle, Loader2,
  CalendarClock, RefreshCw, UserX,
  ChevronRight, CalendarDays,
} from "lucide-react"

type ReqKind = "leave" | "adjustment" | "overtime"
type AnyReq = {
  id: string; kind: ReqKind; title: string; subtitle: string
  dateLabel: string; reason?: string; status: string
  created_at: string; can_cancel: boolean; can_request_cancel?: boolean; is_cancel_requested?: boolean
}

function safeFmt(ts: string | null | undefined, fmt: string): string {
  if (!ts) return "—"
  try { return format(new Date(ts), fmt, { locale: th }) } catch { return "—" }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:          { label: "รออนุมัติ",      color: "#92400e", bg: "#fef9c3", icon: <Clock size={10} /> },
    approved:         { label: "อนุมัติแล้ว",    color: "#065f46", bg: "#d1fae5", icon: <CheckCircle2 size={10} /> },
    rejected:         { label: "ปฏิเสธ",         color: "#991b1b", bg: "#fee2e2", icon: <XCircle size={10} /> },
    cancelled:        { label: "ยกเลิกแล้ว",     color: "#64748b", bg: "#f1f5f9", icon: <X size={10} /> },
    cancel_requested: { label: "ขอยกเลิก (รอ HR)", color: "#d97706", bg: "#fff7ed", icon: <Clock size={10} /> },
  }
  const c = map[status] ?? map.pending
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.color }}>
      {c.icon}{c.label}
    </span>
  )
}

function KindIcon({ kind }: { kind: ReqKind }) {
  const cfg = {
    leave:      { color: "#3b82f6", bg: "#eff6ff", icon: <CalendarClock size={16} /> },
    adjustment: { color: "#8b5cf6", bg: "#f5f3ff", icon: <FileEdit size={16} /> },
    overtime:   { color: "#f59e0b", bg: "#fffbeb", icon: <Timer size={16} /> },
  }
  const c = cfg[kind]
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: c.bg, color: c.color }}>
      {c.icon}
    </div>
  )
}

function CancelModal({ item, onConfirm, onClose, loading }: {
  item: AnyReq; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease]">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {item.status === "approved" ? "ขอยกเลิกคำขอที่อนุมัติแล้ว" : "ยืนยันการยกเลิก"}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">คำขอ <b>{item.title}</b> · {item.dateLabel}</p>
              {item.status === "approved" && (
                <p className="text-xs text-amber-600 mt-1 bg-amber-50 rounded-lg px-2 py-1">
                  คำขอนี้อนุมัติแล้ว — จะส่งคำขอยกเลิกไปให้ HR พิจารณา
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all">
              ไม่ยกเลิก
            </button>
            <button onClick={onConfirm} disabled={loading}
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all ${
                item.status === "approved"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              {item.status === "approved" ? "ส่งคำขอยกเลิก" : "ยกเลิกคำขอ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { user }  = useAuth()
  const supabase  = useRef(createClient()).current

  const empId     = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const { balances } = useLeaveBalance(empId)

  const [tab,         setTab]        = useState<"balance" | "history">("balance")
  const [reqs,        setReqs]       = useState<AnyReq[]>([])
  const [loading,     setLoading]    = useState(false)
  const [err,         setErr]        = useState<string | null>(null)
  const [cancelItem,  setCancelItem] = useState<AnyReq | null>(null)
  const [cancelling,  setCancelling] = useState(false)
  const [kind,        setKind]       = useState<"all" | ReqKind>("all")
  const [visible,     setVisible]    = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 60) }, [])

  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true); setErr(null)
    try {
      const [lv, adj, ot] = await Promise.all([
        supabase.from("leave_requests")
          .select("id,status,start_date,end_date,total_days,reason,review_note,created_at,leave_type:leave_types(name,color_hex)")
          .eq("employee_id", empId).is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("time_adjustment_requests")
          .select("id,status,work_date,requested_clock_in,requested_clock_out,reason,review_note,created_at")
          .eq("employee_id", empId).order("created_at", { ascending: false }),
        supabase.from("overtime_requests")
          .select("id,status,work_date,ot_start,ot_end,reason,review_note,created_at")
          .eq("employee_id", empId).order("created_at", { ascending: false }),
      ])

      if (lv.error)  throw new Error("leave_requests: " + lv.error.message)
      if (adj.error) throw new Error("time_adjustment_requests: " + adj.error.message)
      if (ot.error)  throw new Error("overtime_requests: " + ot.error.message)

      const out: AnyReq[] = []

      for (const r of (lv.data ?? [])) {
        try {
          const s = safeFmt(r.start_date, "d MMM yy")
          const e = r.start_date !== r.end_date ? " – " + safeFmt(r.end_date, "d MMM yy") : ""
          out.push({ id: r.id, kind: "leave", title: (r as any).leave_type?.name ?? "ใบลา",
            subtitle: `${r.total_days} วัน`, dateLabel: s + e,
            reason: r.reason ?? undefined, status: r.status,
            created_at: r.created_at,
            can_cancel: r.status === "pending",
            can_request_cancel: r.status === "approved" && !((r as any).review_note || "").includes("CANCEL_REQ"),
            is_cancel_requested: r.status === "approved" && ((r as any).review_note || "").includes("CANCEL_REQ") })
        } catch { /* skip malformed */ }
      }
      for (const r of (adj.data ?? [])) {
        try {
          out.push({ id: r.id, kind: "adjustment", title: "ขอแก้ไขเวลา",
            subtitle: `เข้า ${safeFmt(r.requested_clock_in,"HH:mm")} · ออก ${safeFmt(r.requested_clock_out,"HH:mm")}`,
            dateLabel: safeFmt(r.work_date + "T00:00:00", "d MMM yy"),
            reason: r.reason ?? undefined, status: r.status,
            created_at: r.created_at,
            can_cancel: r.status === "pending",
            can_request_cancel: r.status === "approved" && !((r as any).review_note || "").includes("CANCEL_REQ"),
            is_cancel_requested: r.status === "approved" && ((r as any).review_note || "").includes("CANCEL_REQ") })
        } catch { /* skip */ }
      }
      for (const r of (ot.data ?? [])) {
        try {
          out.push({ id: r.id, kind: "overtime", title: "คำขอโอที",
            subtitle: `${safeFmt(r.ot_start,"HH:mm")} – ${safeFmt(r.ot_end,"HH:mm")}`,
            dateLabel: safeFmt(r.work_date + "T00:00:00", "d MMM yy"),
            reason: r.reason ?? undefined, status: r.status,
            created_at: r.created_at,
            can_cancel: r.status === "pending",
            can_request_cancel: r.status === "approved" && !((r as any).review_note || "").includes("CANCEL_REQ"),
            is_cancel_requested: r.status === "approved" && ((r as any).review_note || "").includes("CANCEL_REQ") })
        } catch { /* skip */ }
      }

      out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setReqs(out)
    } catch (e: any) {
      setErr(e.message ?? "โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [empId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (empId) load() }, [empId, load])

  const doCancel = async () => {
    if (!cancelItem) return
    setCancelling(true)

    if (cancelItem.can_request_cancel && cancelItem.status === "approved") {
      // Approved → ส่งคำขอยกเลิกไป HR (ไม่ยกเลิกตรง)
      const res = await fetch("/api/requests/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_cancel",
          request_id: cancelItem.id,
          request_type: cancelItem.kind,
          reason: "พนักงานขอยกเลิก",
        }),
      })
      const data = await res.json()
      setCancelling(false)
      if (!res.ok) { setErr(data.error || "เกิดข้อผิดพลาด"); setCancelItem(null); return }
      toast.success("ส่งคำขอยกเลิกไป HR แล้ว")
      setCancelItem(null)
      setReqs(prev => prev.map(r => r.id === cancelItem.id
        ? { ...r, can_cancel: false, can_request_cancel: false, is_cancel_requested: true }
        : r))
    } else {
      // Pending → ยกเลิกตรง
      const tbl: Record<string, string> = { leave: "leave_requests", adjustment: "time_adjustment_requests", overtime: "overtime_requests" }
      const { error } = await supabase.from(tbl[cancelItem.kind]).update({ status: "cancelled" }).eq("id", cancelItem.id)
      setCancelling(false)
      if (error) { setErr(error.message); return }
      setCancelItem(null)
      setReqs(prev => prev.map(r => r.id === cancelItem.id ? { ...r, status: "cancelled", can_cancel: false } : r))
    }
  }

  const shown   = kind === "all" ? reqs : reqs.filter(r => r.kind === kind)
  const pending = reqs.filter(r => r.status === "pending").length

  const up = (d: number) => ({
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition: `opacity .45s cubic-bezier(.22,1,.36,1) ${d}ms, transform .45s cubic-bezier(.22,1,.36,1) ${d}ms`,
    }
  })

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        .press { transition:transform .15s ease }
        .press:active { transform:scale(0.98) }
      `}</style>

      {cancelItem && <CancelModal item={cancelItem} onConfirm={doCancel} onClose={() => setCancelItem(null)} loading={cancelling} />}

      <div className="min-h-screen pb-12" style={{ background:"#f7f8fa" }}>

        {/* ── Header ───────────────────────────────── */}
        <div style={{ background:"linear-gradient(135deg,#3b82f6 0%,#6366f1 60%,#8b5cf6 100%)" }}
          className="relative overflow-hidden px-5 pt-6 pb-16">
          <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full" style={{ background:"rgba(255,255,255,.06)" }} />
          <div className="absolute bottom-2 left-[-30px] w-28 h-28 rounded-full" style={{ background:"rgba(255,255,255,.04)" }} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">คำขอ & การลา</h1>
              <p className="text-blue-200/70 text-xs mt-0.5">จัดการวันลาและคำร้องทั้งหมด</p>
            </div>
            <Link href="/app/leave/new"
              className="press flex items-center gap-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-bold rounded-xl backdrop-blur-sm">
              <Plus size={14} /> ยื่นคำขอ
            </Link>
          </div>
        </div>

        <div className="px-4 -mt-10 space-y-3 relative z-10">

          {/* ── Tab ─────────────────────────────────── */}
          <div {...up(0)} className="bg-white rounded-2xl shadow-sm p-1 flex border border-slate-100">
            {([ ["balance","โควต้าการลา"], ["history","ประวัติคำขอ"] ] as const).map(([k,l]) => (
              <button key={k} onClick={() => setTab(k as any)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  tab === k ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}>
                {l}
                {k === "history" && pending > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === "history" ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"
                  }`}>{pending}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Balance Tab ─────────────────────────── */}
          {tab === "balance" && (
            <div className="space-y-2.5">

              {/* Quick Actions */}
              <div {...up(50)} className="grid grid-cols-4 gap-2">
                {[
                  { href:"/app/leave/new?type=leave",      icon:<CalendarClock size={17}/>, label:"ยื่นใบลา",  color:"#3b82f6", bg:"#eff6ff" },
                  { href:"/app/leave/new?type=adjustment", icon:<FileEdit size={17}/>,      label:"แก้เวลา",   color:"#8b5cf6", bg:"#f5f3ff" },
                  { href:"/app/leave/new?type=overtime",   icon:<Timer size={17}/>,         label:"ขอโอที",    color:"#f59e0b", bg:"#fffbeb" },
                  { href:"/app/resignation",               icon:<UserX size={17}/>,         label:"ลาออก",     color:"#ef4444", bg:"#fef2f2" },
                ].map((a,i) => (
                  <Link key={a.href} href={a.href} {...up(60 + i * 20)}
                    className="press flex flex-col items-center gap-2 py-3.5 bg-white rounded-xl border border-slate-100">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:a.bg, color:a.color }}>
                      {a.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{a.label}</span>
                  </Link>
                ))}
              </div>

              {/* Leave Balance Cards — clean & minimal */}
              {balances.length > 0 ? balances.map((b: any, idx: number) => {
                const pct = b.entitled_days > 0 ? Math.min(b.used_days / b.entitled_days * 100, 100) : 0
                const hex = b.leave_type?.color_hex || "#3b82f6"

                return (
                  <div key={b.id} {...up(100 + idx * 35)}
                    className="press bg-white rounded-xl border border-slate-100 p-4">

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                        <div>
                          <p className="font-bold text-slate-800 text-[13px] leading-tight">{b.leave_type?.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {b.leave_type?.is_paid ? "ได้รับเงิน" : "ไม่ได้รับเงิน"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold leading-none" style={{ color: hex }}>
                          {b.remaining_days ?? 0}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-0.5">วัน</span>
                      </div>
                    </div>

                    {/* Thin progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 mb-2.5">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: hex }} />
                    </div>

                    {/* Stats row — simple text */}
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>ใช้ไป <b className="text-slate-600">{b.used_days}</b></span>
                      <span>รอ <b className="text-amber-600">{b.pending_days}</b></span>
                      <span>ทั้งหมด <b className="text-slate-600">{b.entitled_days}</b></span>
                    </div>
                  </div>
                )
              }) : (
                <div {...up(100)} className="bg-white rounded-xl border border-slate-100 py-14 text-center">
                  <CalendarCheck size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">ไม่มีข้อมูลโควต้าการลา</p>
                  <p className="text-slate-300 text-xs mt-1">ติดต่อ HR เพื่อตั้งค่าโควต้า</p>
                </div>
              )}
            </div>
          )}

          {/* ── History Tab ─────────────────────────── */}
          {tab === "history" && (
            <div className="space-y-2.5">

              {/* Reload */}
              <div {...up(50)} className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{loading ? "กำลังโหลด..." : `${reqs.length} รายการ`}</p>
                <button onClick={load} disabled={loading}
                  className="press flex items-center gap-1.5 text-xs font-semibold text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40">
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> รีเฟรช
                </button>
              </div>

              {/* Error */}
              {err && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-600">โหลดข้อมูลไม่สำเร็จ</p>
                    <p className="text-xs text-red-400 mt-0.5">{err}</p>
                  </div>
                </div>
              )}

              {/* Stats */}
              {reqs.length > 0 && (
                <div {...up(70)} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <div className="grid grid-cols-3">
                    {[
                      { l:"ทั้งหมด",     v:reqs.length,                                    color:"#1e293b" },
                      { l:"รออนุมัติ",   v:reqs.filter(r => r.status === "pending").length,  color:"#f59e0b" },
                      { l:"อนุมัติแล้ว", v:reqs.filter(r => r.status === "approved").length, color:"#10b981" },
                    ].map((s,i) => (
                      <div key={s.l} className="py-3 text-center" style={{ borderRight: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                        <p className="text-lg font-extrabold" style={{ color:s.color }}>{s.v}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter chips */}
              <div {...up(90)} className="flex gap-1.5 overflow-x-auto pb-1">
                {(["all","leave","adjustment","overtime"] as const).map(k => {
                  const labels = { all:"ทั้งหมด", leave:"ใบลา", adjustment:"แก้เวลา", overtime:"โอที" }
                  const active = kind === k
                  return (
                    <button key={k} onClick={() => setKind(k)}
                      className={`whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}>
                      {labels[k]}
                    </button>
                  )
                })}
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin text-blue-500" /><span className="text-sm">กำลังโหลด...</span>
                </div>
              )}

              {/* Request Cards */}
              {!loading && shown.map((r, idx) => (
                <div key={r.id} {...up(110 + idx * 25)}
                  className="press bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start gap-3">
                    <KindIcon kind={r.kind} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[13px]">{r.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{r.dateLabel} · {r.subtitle}</p>
                          {r.reason && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.reason}</p>}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.can_cancel && (
                        <button onClick={() => setCancelItem(r)}
                          className="press mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors">
                          <X size={11} /> ยกเลิกคำขอนี้
                        </button>
                      )}
                      {r.can_request_cancel && (
                        <button onClick={() => setCancelItem(r)}
                          className="press mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-amber-200 text-amber-600 text-xs font-semibold hover:bg-amber-50 transition-colors">
                          <X size={11} /> ขอยกเลิก (ส่ง HR อนุมัติ)
                        </button>
                      )}
                      {r.is_cancel_requested && (
                        <div className="mt-2 text-center text-[10px] font-bold text-amber-600 bg-amber-50 rounded-lg py-1.5">
                          รอ HR อนุมัติยกเลิก...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty */}
              {!loading && !err && shown.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-100 py-14 text-center">
                  <CalendarCheck size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">ยังไม่มีคำขอ</p>
                  <Link href="/app/leave/new"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={12} /> ยื่นคำขอแรก
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
