"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Check, X, Clock, CalendarDays, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Tab = "leave" | "overtime" | "adjustment"

export default function ApprovalsPage() {
  const { user } = useAuth()
  const [tab, setTab]     = useState<Tab>("leave")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState<string | null>(null)
  const [notes, setNotes]       = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadItems = async () => {
    const supabase = createClient()

    // ── ดึง employee_id ของ manager ──────────────────────────
    const empId: string | undefined =
      (user as any)?.employee_id ?? (user as any)?.employee?.id
    const companyId: string | undefined =
      (user as any)?.company_id ?? (user as any)?.employee?.company_id

    console.log("[approvals] user:", user)
    console.log("[approvals] empId:", empId, "companyId:", companyId)

    if (!empId || !companyId) return
    setLoading(true)

    // ── ดึง team ──────────────────────────────────────────────
    const { data: teamRows, error: teamErr } = await supabase
      .from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", empId)
      .is("effective_to", null)

    const teamIds: string[] = (teamRows ?? []).map((r: any) => String(r.employee_id))
    console.log("[approvals] teamErr:", teamErr, "teamIds:", teamIds)

    // ── Query helper — in หรือ company fallback ───────────────
    async function fetchPending(table: string, selectStr: string) {
      if (teamIds.length > 0) {
        const res = await supabase
          .from(table)
          .select(selectStr)
          .in("employee_id", teamIds)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
        console.log(`[approvals] ${table} by teamIds:`, res.data?.length, res.error)
        return res
      } else {
        const res = await supabase
          .from(table)
          .select(selectStr)
          .eq("company_id", companyId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
        console.log(`[approvals] ${table} by companyId:`, res.data?.length, res.error)
        return res
      }
    }

    // ── LEAVE ─────────────────────────────────────────────────
    if (tab === "leave") {
      const { data, error } = await fetchPending(
        "leave_requests",
        "*, employee:employees!employee_id(id,first_name_th,last_name_th,employee_code,position:positions(name)), leave_type:leave_types(*)"
      )
      if (error) toast.error("โหลดข้อมูลผิดพลาด: " + error.message)
      setItems(data ?? [])

    // ── OVERTIME ──────────────────────────────────────────────
    } else if (tab === "overtime") {
      const { data, error } = await fetchPending(
        "overtime_requests",
        "*, employee:employees!employee_id(id,first_name_th,last_name_th,employee_code,position:positions(name))"
      )
      if (error) toast.error("โหลดข้อมูลผิดพลาด: " + error.message)
      setItems(data ?? [])

    // ── ADJUSTMENT ────────────────────────────────────────────
    } else {
      const { data, error } = await fetchPending(
        "time_adjustment_requests",
        "*, employee:employees!employee_id(id,first_name_th,last_name_th,employee_code,position:positions(name),department:departments(name))"
      )
      if (error) { toast.error("โหลดข้อมูลผิดพลาด: " + error.message); setItems([]); setLoading(false); return }
      if (!data || data.length === 0) { setItems([]); setLoading(false); return }

      // เพิ่ม actual clock-in/out เพื่อแสดงเวลาจริง
      const enriched = await Promise.all(data.map(async (item: any) => {
        const { data: rec } = await supabase
          .from("attendance_records")
          .select("clock_in, clock_out, late_minutes, status")
          .eq("employee_id", item.employee_id)
          .eq("work_date", item.work_date)
          .maybeSingle()
        return { ...item, actual_record: rec }
      }))
      setItems(enriched)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (user?.employee_id || (user as any)?.employee?.id) {
      loadItems()
    }
  }, [tab, user?.employee_id, (user as any)?.employee?.id])

  // ── approve/reject leave & overtime ───────────────────────
  const handleLeaveOT = async (id: string, action: "approved" | "rejected") => {
    setActing(id)
    const supabase = createClient()
    const tbl = tab === "leave" ? "leave_requests" : "overtime_requests"
    const empId = (user as any)?.employee_id ?? (user as any)?.employee?.id
    const { error } = await supabase
      .from(tbl)
      .update({ status: action, reviewed_by: empId, reviewed_at: new Date().toISOString(), review_note: notes[id] || null })
      .eq("id", id)
    if (error) { toast.error(error.message); setActing(null); return }
    const item = items.find(i => i.id === id)
    if (item) {
      await supabase.from("notifications").insert({
        employee_id: item.employee_id, type: "leave",
        title: action === "approved" ? "คำร้องได้รับการอนุมัติ" : "คำร้องถูกปฏิเสธ",
        body: notes[id] || "", ref_table: tbl, ref_id: id,
      })
    }
    toast.success(action === "approved" ? "✅ อนุมัติแล้ว" : "ปฏิเสธแล้ว")
    setActing(null)
    loadItems()
  }

  // ── approve/reject adjustment ผ่าน /api/correction ────────
  const handleAdjustment = async (id: string, action: "approve" | "reject") => {
    setActing(id)
    const supabase = createClient()
    try {
      const res = await fetch("/api/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_id: id, review_note: notes[id] || null }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "เกิดข้อผิดพลาด")
      if (action === "approve" && json.updated) {
        const { late_minutes, status } = json.updated
        toast.success(
          status === "present" ? "✅ อนุมัติแล้ว — สถานะเปลี่ยนเป็น ตรงเวลา"
            : `✅ อนุมัติแล้ว — ยังสาย ${late_minutes} นาที`,
          { duration: 4000 }
        )
      } else {
        toast.success(action === "approve" ? "✅ อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      }
      const item = items.find(i => i.id === id)
      if (item) {
        await supabase.from("notifications").insert({
          employee_id: item.employee_id, type: "leave",
          title: action === "approve" ? "คำขอแก้ไขเวลาได้รับการอนุมัติ" : "คำขอแก้ไขเวลาถูกปฏิเสธ",
          body: notes[id] || "", ref_table: "time_adjustment_requests", ref_id: id,
        })
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setActing(null)
    loadItems()
  }

  const fmtTime = (iso?: string | null) => {
    if (!iso) return "--:--"
    return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const TABS: Record<Tab, string> = { leave: "ใบลา", overtime: "OT", adjustment: "แก้เวลา" }

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">

      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-[17px] font-bold text-slate-800">คำร้องรออนุมัติ</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {!loading && (items.length > 0 ? `${items.length} รายการรออนุมัติ` : "ไม่มีคำร้องค้างอยู่")}
        </p>
      </div>

      <div className="bg-white px-4 pb-3 border-b border-slate-100">
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(Object.keys(TABS) as Tab[]).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={"flex-1 py-2 text-sm font-semibold rounded-lg transition-all " +
                (tab === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500")}>
              {TABS[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">

        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">กำลังโหลด...</span>
          </div>
        )}

        {/* ── LEAVE ─────────────────────────────────── */}
        {!loading && tab === "leave" && items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-l-4 border-l-blue-400 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  {item.employee?.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{item.employee?.first_name_th} {item.employee?.last_name_th}</p>
                  <p className="text-xs text-slate-400">{item.employee?.position?.name}</p>
                </div>
                <p className="text-[11px] text-slate-400 shrink-0">{format(new Date(item.created_at), "d MMM", { locale: th })}</p>
              </div>
              <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 space-y-1 text-xs text-slate-600">
                <p><span className="text-slate-400">ประเภท:</span> <b>{item.leave_type?.name}</b></p>
                <p><span className="text-slate-400">วันที่:</span> {format(new Date(item.start_date), "d MMM", { locale: th })} – {format(new Date(item.end_date), "d MMM yyyy", { locale: th })} <b>({item.total_days} วัน)</b></p>
                {item.reason && <p><span className="text-slate-400">เหตุผล:</span> {item.reason}</p>}
              </div>
              <input placeholder="หมายเหตุ (ไม่บังคับ)" value={notes[item.id] || ""} onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                className="w-full mt-3 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleLeaveOT(item.id, "rejected")} disabled={acting === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-600 font-semibold text-sm rounded-xl active:scale-[0.98]">
                  {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} ปฏิเสธ
                </button>
                <button onClick={() => handleLeaveOT(item.id, "approved")} disabled={acting === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl active:scale-[0.98]">
                  {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} อนุมัติ
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* ── OVERTIME ──────────────────────────────── */}
        {!loading && tab === "overtime" && items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-l-4 border-l-orange-400 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                  {item.employee?.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{item.employee?.first_name_th} {item.employee?.last_name_th}</p>
                  <p className="text-xs text-slate-400">{item.employee?.position?.name}</p>
                </div>
                <p className="text-[11px] text-slate-400 shrink-0">{format(new Date(item.created_at), "d MMM", { locale: th })}</p>
              </div>
              <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 space-y-1 text-xs text-slate-600">
                <p><span className="text-slate-400">วันที่:</span> <b>{format(new Date(item.work_date), "d MMMM yyyy", { locale: th })}</b></p>
                <p><span className="text-slate-400">เวลา OT:</span> <b>{fmtTime(item.ot_start)} – {fmtTime(item.ot_end)}</b></p>
                {item.reason && <p><span className="text-slate-400">เหตุผล:</span> {item.reason}</p>}
              </div>
              <input placeholder="หมายเหตุ (ไม่บังคับ)" value={notes[item.id] || ""} onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                className="w-full mt-3 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleLeaveOT(item.id, "rejected")} disabled={acting === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-600 font-semibold text-sm rounded-xl active:scale-[0.98]">
                  {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} ปฏิเสธ
                </button>
                <button onClick={() => handleLeaveOT(item.id, "approved")} disabled={acting === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl active:scale-[0.98]">
                  {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} อนุมัติ
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* ── ADJUSTMENT ────────────────────────────── */}
        {!loading && tab === "adjustment" && items.map(item => {
          const actual = item.actual_record
          const isLate = (actual?.late_minutes ?? 0) > 0
          const isOpen = expanded === item.id
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="border-l-4 border-l-amber-400 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-sm font-bold text-amber-600 shrink-0">
                    {item.employee?.first_name_th?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{item.employee?.first_name_th} {item.employee?.last_name_th}</p>
                    <p className="text-xs text-slate-400">{item.employee?.position?.name} · {item.employee?.department?.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-400">{format(new Date(item.created_at), "d MMM", { locale: th })}</p>
                    {isLate && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">สาย {actual.late_minutes} น.</span>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays size={12} />
                  <span className="font-semibold text-slate-700">{item.work_date ? format(new Date(item.work_date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th }) : "-"}</span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">เวลาจริง</p>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span className="text-[11px] text-slate-400">เข้า</span><span className="text-sm font-black tabular-nums text-slate-700">{fmtTime(actual?.clock_in)}</span></div>
                      <div className="flex justify-between"><span className="text-[11px] text-slate-400">ออก</span><span className="text-sm font-black tabular-nums text-slate-700">{fmtTime(actual?.clock_out)}</span></div>
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100">
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest mb-1.5">ขอแก้เป็น</p>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span className="text-[11px] text-indigo-400">เข้า</span><span className={"text-sm font-black tabular-nums " + (item.requested_clock_in ? "text-indigo-700" : "text-slate-300")}>{item.requested_clock_in ? fmtTime(item.requested_clock_in) : "--:--"}</span></div>
                      <div className="flex justify-between"><span className="text-[11px] text-indigo-400">ออก</span><span className={"text-sm font-black tabular-nums " + (item.requested_clock_out ? "text-indigo-700" : "text-slate-300")}>{item.requested_clock_out ? fmtTime(item.requested_clock_out) : "--:--"}</span></div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="mt-2.5 w-full text-left text-xs text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} className="text-slate-400" />
                    <span className="truncate max-w-[220px]">{item.reason}</span>
                  </span>
                  <span className="text-slate-300 shrink-0">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <input
                    placeholder="หมายเหตุถึงพนักงาน (ไม่บังคับ)"
                    value={notes[item.id] || ""}
                    onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                    className="w-full mt-2.5 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAdjustment(item.id, "reject")} disabled={acting === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-600 font-semibold text-sm rounded-xl active:scale-[0.98]">
                    {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} ปฏิเสธ
                  </button>
                  <button onClick={() => handleAdjustment(item.id, "approve")} disabled={acting === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl active:scale-[0.98]">
                    {acting === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} อนุมัติ
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Clock size={40} strokeWidth={1.5} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-400">ไม่มีคำร้องรออนุมัติ</p>
          </div>
        )}

      </div>
    </div>
  )
}