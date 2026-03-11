"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Download, Check, X, RefreshCw, AlertCircle } from "lucide-react"
import { format, subDays } from "date-fns"
import { th } from "date-fns/locale"
import { statusToTH, statusColor } from "@/lib/utils/attendance"
import toast from "react-hot-toast"

const PER = 30

export default function AdminAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useRef(createClient()).current

  // ✅ fallback chain เหมือนหน้าอื่น
  const companyId = (user as any)?.company_id
    ?? (user as any)?.employee?.company_id
    ?? null

  const isSuperAdmin = (user as any)?.role === "super_admin"

  const [records,  setRecords]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(0)
  const [adjReqs,  setAdjReqs]  = useState<any[]>([])
  const [filters,  setFilters]  = useState({
    start:  format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end:    format(new Date(), "yyyy-MM-dd"),
    status: "",
  })

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true); setErr(null)

    let q = supabase
      .from("attendance_records")
      .select(
        "*, employee:employees!attendance_records_employee_id_fkey(id,first_name_th,last_name_th,employee_code,position:positions(name))",
        { count: "exact" }
      )
      .eq("company_id", companyId)
      .gte("work_date", filters.start)
      .lte("work_date", filters.end)
      .order("work_date", { ascending: false })
      .range(page * PER, (page + 1) * PER - 1)

    if (filters.status) q = q.eq("status", filters.status)

    const { data, count, error } = await q

    if (error) {
      console.error("attendance query error:", error)
      setErr(error.message)
    } else {
      setRecords(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [companyId, filters, page]) // eslint-disable-line

  const loadAdj = useCallback(async () => {
    if (!companyId) return
    const { data, error } = await supabase
      .from("time_adjustment_requests")
      .select("*, employee:employees!time_adjustment_requests_employee_id_fkey(id,first_name_th,last_name_th)")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
    if (!error) setAdjReqs(data ?? [])
  }, [companyId]) // eslint-disable-line

  // โหลดเมื่อ companyId พร้อม (รอ auth โหลดเสร็จก่อน)
  useEffect(() => {
    if (!authLoading && companyId) {
      load()
      loadAdj()
    }
  }, [authLoading, companyId, load, loadAdj])

  const approveAdj = async (req: any, action: "approved" | "rejected") => {
    const res  = await fetch("/api/attendance/approve-adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ request_id: req.id, action }),
    })
    const json = await res.json()
    if (!res.ok || json.error) { toast.error(json.error ?? "เกิดข้อผิดพลาด"); return }
    toast.success(action === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
    setAdjReqs(r => r.filter(x => x.id !== req.id))
    load()
  }

  const exportCSV = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from("attendance_records")
      .select("work_date,clock_in,clock_out,status,late_minutes,ot_minutes,employee:employees!attendance_records_employee_id_fkey(employee_code,first_name_th,last_name_th)")
      .eq("company_id", companyId)
      .gte("work_date", filters.start)
      .lte("work_date", filters.end)
    if (!data) return
    const hdr = ["วันที่","รหัส","ชื่อ","นามสกุล","เข้างาน","ออกงาน","สถานะ","สาย(น.)","OT(น.)"]
    const rows = data.map((r: any) => [
      r.work_date,
      r.employee?.employee_code,
      r.employee?.first_name_th,
      r.employee?.last_name_th,
      r.clock_in  ? format(new Date(r.clock_in),  "HH:mm") : "",
      r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "",
      statusToTH(r.status),
      r.late_minutes, r.ot_minutes,
    ])
    const csv  = [hdr, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `attendance_${filters.start}_${filters.end}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const safeFmt = (ts: string | null | undefined, fmt: string) => {
    if (!ts) return "--:--"
    try { return format(new Date(ts), fmt) } catch { return "--:--" }
  }

  // ── แสดง loading ขณะรอ auth ────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin" />
        <span>กำลังโหลด...</span>
      </div>
    )
  }

  // ── ไม่มี companyId ────────────────────────────────────────────
  if (!companyId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
        <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-red-700">ไม่พบ company_id</p>
          <p className="text-sm text-red-500 mt-1">
            user.company_id = {String((user as any)?.company_id)}<br/>
            user.employee?.company_id = {String((user as any)?.employee?.company_id)}
          </p>
          <p className="text-xs text-red-400 mt-2">กรุณา logout แล้ว login ใหม่ หรือตรวจสอบ users table ว่ามี company_id</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">การเข้างาน</h2>
          <p className="text-slate-500 text-sm">{loading ? "กำลังโหลด..." : `${total} รายการ`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { load(); loadAdj() }}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{err}</p>
        </div>
      )}

      {/* Pending Adjustments */}
      {adjReqs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">คำขอแก้ไขเวลา ({adjReqs.length})</h3>
          <div className="space-y-3">
            {adjReqs.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                <div className="flex-1 text-sm">
                  <p className="font-medium">{req.employee?.first_name_th} {req.employee?.last_name_th}</p>
                  <p className="text-xs text-slate-500">
                    {safeFmt(req.work_date + "T00:00:00", "d MMM yyyy")}
                    {req.requested_clock_in  && " · เข้า "  + safeFmt(req.requested_clock_in,  "HH:mm")}
                    {req.requested_clock_out && " · ออก " + safeFmt(req.requested_clock_out, "HH:mm")}
                  </p>
                  {req.reason && <p className="text-xs text-slate-400">{req.reason}</p>}
                </div>
                <button onClick={() => approveAdj(req, "rejected")}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                  ปฏิเสธ
                </button>
                <button onClick={() => approveAdj(req, "approved")}
                  className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">
                  อนุมัติ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3">
        <input type="date" value={filters.start}
          onChange={e => { setPage(0); setFilters(f => ({ ...f, start: e.target.value })) }}
          className="input-field py-2 text-sm w-auto" />
        <input type="date" value={filters.end}
          onChange={e => { setPage(0); setFilters(f => ({ ...f, end: e.target.value })) }}
          className="input-field py-2 text-sm w-auto" />
        <select value={filters.status}
          onChange={e => { setPage(0); setFilters(f => ({ ...f, status: e.target.value })) }}
          className="input-field py-2 text-sm w-auto">
          <option value="">ทุกสถานะ</option>
          {["present","absent","late","leave","wfh","holiday"].map(s => (
            <option key={s} value={s}>{statusToTH(s)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["วันที่","พนักงาน","เข้างาน","ออกงาน","สาย","OT","สถานะ"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  <RefreshCw size={18} className="animate-spin mx-auto mb-1" /><br/>กำลังโหลด...
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  ไม่พบข้อมูลในช่วงวันที่เลือก
                </td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {safeFmt(r.work_date + "T00:00:00", "d MMM")}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.employee?.first_name_th} {r.employee?.last_name_th}</p>
                    <p className="text-xs text-slate-400">{r.employee?.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{safeFmt(r.clock_in,  "HH:mm")}</td>
                  <td className="px-4 py-3 text-slate-600">{safeFmt(r.clock_out, "HH:mm")}</td>
                  <td className="px-4 py-3">
                    {(r.late_minutes ?? 0) > 0
                      ? <span className="text-amber-600 font-medium">{r.late_minutes}น.</span>
                      : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {(r.ot_minutes ?? 0) > 0
                      ? <span className="text-blue-600 font-medium">{r.ot_minutes}น.</span>
                      : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"badge " + statusColor(r.status)}>{statusToTH(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PER && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">{page * PER + 1}–{Math.min((page + 1) * PER, total)} จาก {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">ก่อนหน้า</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER >= total}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">ถัดไป</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}