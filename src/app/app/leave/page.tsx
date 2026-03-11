"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  Plus, Clock, FileEdit, Timer, CalendarCheck,
  X, AlertCircle, CheckCircle2, XCircle, Loader2,
  CalendarClock, RefreshCw,
} from "lucide-react"

type ReqKind = "leave" | "adjustment" | "overtime"
type AnyReq = {
  id: string; kind: ReqKind; title: string; subtitle: string
  dateLabel: string; reason?: string; status: string
  created_at: string; can_cancel: boolean
}

function safeFmt(ts: string | null | undefined, fmt: string): string {
  if (!ts) return "—"
  try { return format(new Date(ts), fmt, { locale: th }) } catch { return "—" }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: "รออนุมัติ",   cls: "bg-amber-50 text-amber-700 border border-amber-200",      icon: <Clock size={10} /> },
    approved:  { label: "อนุมัติแล้ว", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 size={10} /> },
    rejected:  { label: "ปฏิเสธ",      cls: "bg-red-50 text-red-600 border border-red-200",            icon: <XCircle size={10} /> },
    cancelled: { label: "ยกเลิกแล้ว",  cls: "bg-slate-100 text-slate-400 border border-slate-200",     icon: <X size={10} /> },
  }
  const c = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-xl ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

function KindIcon({ kind }: { kind: ReqKind }) {
  if (kind === "leave")      return <div className="w-10 h-10 rounded-2xl bg-blue-100   flex items-center justify-center flex-shrink-0"><CalendarClock size={18} className="text-blue-600"   /></div>
  if (kind === "adjustment") return <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0"><FileEdit      size={18} className="text-violet-600" /></div>
  return                            <div className="w-10 h-10 rounded-2xl bg-amber-100  flex items-center justify-center flex-shrink-0"><Timer          size={18} className="text-amber-600"  /></div>
}

function CancelModal({ item, onConfirm, onClose, loading }: {
  item: AnyReq; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">ยืนยันการยกเลิก</h3>
              <p className="text-sm text-slate-500 mt-0.5">คำขอ <b>{item.title}</b> · {item.dateLabel}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
              ไม่ยกเลิก
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-red-600">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              ยกเลิกคำขอ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { user }  = useAuth()
  const supabase  = useRef(createClient()).current   // stable ref ไม่ recreate

  const empId     = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const { balances } = useLeaveBalance(empId)

  const [tab,         setTab]        = useState<"balance" | "history">("balance")
  const [reqs,        setReqs]       = useState<AnyReq[]>([])
  const [loading,     setLoading]    = useState(false)
  const [err,         setErr]        = useState<string | null>(null)
  const [cancelItem,  setCancelItem] = useState<AnyReq | null>(null)
  const [cancelling,  setCancelling] = useState(false)
  const [kind,        setKind]       = useState<"all" | ReqKind>("all")

  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true); setErr(null)
    try {
      const [lv, adj, ot] = await Promise.all([
        supabase.from("leave_requests")
          .select("id,status,start_date,end_date,total_days,reason,created_at,leave_type:leave_types(name,color_hex)")
          .eq("employee_id", empId).is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("time_adjustment_requests")
          .select("id,status,work_date,requested_clock_in,requested_clock_out,reason,created_at")
          .eq("employee_id", empId).order("created_at", { ascending: false }),
        supabase.from("overtime_requests")
          .select("id,status,work_date,ot_start,ot_end,reason,created_at")
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
            created_at: r.created_at, can_cancel: r.status === "pending" })
        } catch { /* skip malformed */ }
      }
      for (const r of (adj.data ?? [])) {
        try {
          out.push({ id: r.id, kind: "adjustment", title: "ขอแก้ไขเวลา",
            subtitle: `เข้า ${safeFmt(r.requested_clock_in,"HH:mm")} · ออก ${safeFmt(r.requested_clock_out,"HH:mm")}`,
            dateLabel: safeFmt(r.work_date + "T00:00:00", "d MMM yy"),
            reason: r.reason ?? undefined, status: r.status,
            created_at: r.created_at, can_cancel: r.status === "pending" })
        } catch { /* skip */ }
      }
      for (const r of (ot.data ?? [])) {
        try {
          out.push({ id: r.id, kind: "overtime", title: "คำขอโอที",
            subtitle: `${safeFmt(r.ot_start,"HH:mm")} – ${safeFmt(r.ot_end,"HH:mm")}`,
            dateLabel: safeFmt(r.work_date + "T00:00:00", "d MMM yy"),
            reason: r.reason ?? undefined, status: r.status,
            created_at: r.created_at, can_cancel: r.status === "pending" })
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

  // โหลดทันที + ทุกครั้งที่ empId พร้อม
  useEffect(() => { if (empId) load() }, [empId, load])

  const doCancel = async () => {
    if (!cancelItem) return
    setCancelling(true)
    const tbl = { leave: "leave_requests", adjustment: "time_adjustment_requests", overtime: "overtime_requests" }
    const { error } = await supabase.from(tbl[cancelItem.kind]).update({ status: "cancelled" }).eq("id", cancelItem.id)
    setCancelling(false)
    if (error) { setErr(error.message); return }
    setCancelItem(null)
    setReqs(prev => prev.map(r => r.id === cancelItem.id ? { ...r, status: "cancelled", can_cancel: false } : r))
  }

  const shown   = kind === "all" ? reqs : reqs.filter(r => r.kind === kind)
  const pending = reqs.filter(r => r.status === "pending").length

  return (
    <>
      {cancelItem && <CancelModal item={cancelItem} onConfirm={doCancel} onClose={() => setCancelItem(null)} loading={cancelling} />}

      <div className="min-h-screen bg-slate-50 pb-12">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-6 pb-14 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%,#fff,transparent 60%)" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">คำขอ & การลา</h1>
              <p className="text-blue-200 text-xs mt-0.5">ประวัติและสถานะทั้งหมด</p>
            </div>
            <Link href="/app/leave/new"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-2xl transition-all">
              <Plus size={14} /> ยื่นคำขอ
            </Link>
          </div>
        </div>

        <div className="px-4 -mt-8 space-y-3 relative z-10">

          {/* Tab */}
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-1 flex border border-slate-100">
            {([ ["balance", "โควต้าการลา"], ["history", "ประวัติคำขอ"] ] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === k ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {l}
                {k === "history" && pending > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === "history" ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Balance Tab ─────────────────────────────────────── */}
          {tab === "balance" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { href: "/app/leave/new?type=leave",      icon: <CalendarClock size={18} />, label: "ยื่นใบลา",  cls: "text-blue-600   border-blue-100   hover:bg-blue-50"   },
                  { href: "/app/leave/new?type=adjustment", icon: <FileEdit      size={18} />, label: "แก้ไขเวลา", cls: "text-violet-600 border-violet-100 hover:bg-violet-50" },
                  { href: "/app/leave/new?type=overtime",   icon: <Timer         size={18} />, label: "ขอโอที",    cls: "text-amber-600  border-amber-100  hover:bg-amber-50"  },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className={`flex flex-col items-center gap-2 py-4 bg-white rounded-2xl border text-xs font-bold transition-all shadow-sm ${a.cls}`}>
                    {a.icon}{a.label}
                  </Link>
                ))}
              </div>

              {balances.length > 0 ? balances.map((b: any) => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.leave_type?.color_hex || "#60a5fa" }} />
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{b.leave_type?.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.leave_type?.is_paid ? "ได้รับเงิน" : "ไม่ได้รับเงิน"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600 leading-none">{b.remaining_days ?? 0}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">คงเหลือ / วัน</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: b.entitled_days > 0 ? Math.min(b.used_days / b.entitled_days * 100, 100) + "%" : "0%" }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>ใช้ไป <b className="text-slate-600">{b.used_days}</b> วัน</span>
                    <span>รอ <b className="text-amber-600">{b.pending_days}</b> วัน</span>
                    <span>ทั้งหมด <b className="text-slate-600">{b.entitled_days}</b> วัน</span>
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center shadow-sm">
                  <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">ไม่มีข้อมูลโควต้าการลา</p>
                </div>
              )}
            </div>
          )}

          {/* ── History Tab ─────────────────────────────────────── */}
          {tab === "history" && (
            <div className="space-y-3">

              {/* reload */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{loading ? "กำลังโหลด..." : `${reqs.length} รายการ`}</p>
                <button onClick={load} disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40">
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> รีเฟรช
                </button>
              </div>

              {/* error */}
              {err && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-600">โหลดข้อมูลไม่สำเร็จ</p>
                    <p className="text-xs text-red-400 mt-0.5">{err}</p>
                  </div>
                </div>
              )}

              {/* stats */}
              {reqs.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "ทั้งหมด",    v: reqs.length,                                   c: "text-slate-700"   },
                    { l: "รออนุมัติ",  v: reqs.filter(r => r.status === "pending").length,  c: "text-amber-600"   },
                    { l: "อนุมัติแล้ว",v: reqs.filter(r => r.status === "approved").length, c: "text-emerald-600" },
                  ].map(s => (
                    <div key={s.l} className="bg-white rounded-2xl border border-slate-100 py-3 text-center shadow-sm">
                      <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* filter */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["all", "leave", "adjustment", "overtime"] as const).map(k => (
                  <button key={k} onClick={() => setKind(k)}
                    className={`whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${
                      kind === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                    }`}>
                    {{ all: "ทั้งหมด", leave: "ใบลา", adjustment: "แก้เวลา", overtime: "โอที" }[k]}
                  </button>
                ))}
              </div>

              {/* loading */}
              {loading && (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin" /><span className="text-sm">กำลังโหลด...</span>
                </div>
              )}

              {/* cards */}
              {!loading && shown.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <KindIcon kind={r.kind} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{r.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.dateLabel} · {r.subtitle}</p>
                          {r.reason && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.reason}</p>}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.can_cancel && (
                        <button onClick={() => setCancelItem(r)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors">
                          <X size={11} /> ยกเลิกคำขอนี้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* empty */}
              {!loading && !err && shown.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center shadow-sm">
                  <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2" />
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