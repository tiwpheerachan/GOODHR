"use client"
import { useState, Suspense } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveTypes } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, CalendarClock, FileEdit, Timer, Send, AlertCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

// ── ต้องแยก component ออกมาเพราะใช้ useSearchParams ──────────────
function LeaveNewInner() {
  const { user }    = useAuth()
  const router      = useRouter()
  const sp          = useSearchParams()
  const formType    = sp.get("type") || "leave"
  const defaultDate = sp.get("date") || format(new Date(), "yyyy-MM-dd")
  const supabase    = createClient()

  const empId     = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const companyId = (user as any)?.company_id   ?? (user as any)?.employee?.company_id

  const { types } = useLeaveTypes(companyId)

  const [loading, setLoading] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    leave_type_id: "", start_date: defaultDate, end_date: defaultDate,
    is_half_day: false, half_day_period: "morning", reason: "",
    work_date: defaultDate, requested_clock_in: "", requested_clock_out: "",
    ot_start: "", ot_end: "",
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitErr(null)
    if (!empId || !companyId) {
      setSubmitErr("ไม่พบข้อมูลพนักงาน กรุณาล็อกอินใหม่")
      return
    }
    setLoading(true)
    try {
      if (formType === "leave") {
        const days = form.is_half_day
          ? 0.5
          : Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1
        const { error } = await supabase.from("leave_requests").insert({
          employee_id: empId, company_id: companyId,
          leave_type_id: form.leave_type_id,
          start_date: form.start_date, end_date: form.end_date,
          total_days: days, is_half_day: form.is_half_day,
          half_day_period: form.is_half_day ? form.half_day_period : null,
          reason: form.reason, status: "pending",
        })
        if (error) throw error
        router.push("/app/leave")

      } else if (formType === "adjustment") {
        const { error } = await supabase.from("time_adjustment_requests").insert({
          employee_id: empId, company_id: companyId,
          work_date: form.work_date, request_type: "time_adjustment",
          requested_clock_in:  form.requested_clock_in  ? `${form.work_date}T${form.requested_clock_in}:00+07:00`  : null,
          requested_clock_out: form.requested_clock_out ? `${form.work_date}T${form.requested_clock_out}:00+07:00` : null,
          reason: form.reason, status: "pending",
        })
        if (error) throw error
        router.push("/app/leave")

      } else if (formType === "overtime") {
        if (!form.ot_start || !form.ot_end) throw new Error("กรุณากรอกเวลาเริ่ม-สิ้นสุด OT")
        const { error } = await supabase.from("overtime_requests").insert({
          employee_id: empId, company_id: companyId,
          work_date: form.work_date,
          ot_start: `${form.work_date}T${form.ot_start}:00+07:00`,
          ot_end:   `${form.work_date}T${form.ot_end}:00+07:00`,
          reason: form.reason, status: "pending", ot_rate: 1.5,
        })
        if (error) throw error
        router.push("/app/leave")
      }
    } catch (err: any) {
      setSubmitErr(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
  const labelCls = "block text-sm font-bold text-slate-700 mb-1.5"
  const TITLES: Record<string, string> = { leave: "ยื่นใบลา", adjustment: "แก้ไขเวลาเข้า-ออก", overtime: "ขอทำ OT" }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-6 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%,#fff,transparent 60%)" }} />
        <div className="flex items-center gap-3 relative z-10">
          <Link href="/app/leave"
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors">
            <ArrowLeft size={17} className="text-white" />
          </Link>
          <div>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">ยื่นคำร้อง</p>
            <h1 className="text-white font-black text-lg tracking-tight">{TITLES[formType]}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-3 relative z-10">

        {/* Type switcher */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-1 flex border border-slate-100">
          {[
            { k: "leave",      l: "ใบลา",    icon: <CalendarClock size={13} /> },
            { k: "adjustment", l: "แก้เวลา", icon: <FileEdit size={13} />      },
            { k: "overtime",   l: "OT",      icon: <Timer size={13} />          },
          ].map(({ k, l, icon }) => (
            <Link key={k} href={`/app/leave/new?type=${k}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                formType === k ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {icon}{l}
            </Link>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">

          {submitErr && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{submitErr}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── ใบลา ─────────────────────────────────────── */}
            {formType === "leave" && <>
              <div>
                <label className={labelCls}>ประเภทการลา *</label>
                <select value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)}
                  className={inputCls} required>
                  <option value="">— เลือกประเภทการลา —</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {types.length === 0 && <p className="text-xs text-amber-500 mt-1">กำลังโหลดประเภทการลา...</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>วันที่เริ่ม</label>
                  <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls} required /></div>
                <div><label className={labelCls}>วันที่สิ้นสุด</label>
                  <input type="date" value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} className={inputCls} required /></div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                <input type="checkbox" id="half" checked={form.is_half_day} onChange={e => set("is_half_day", e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="half" className="text-sm font-semibold text-slate-700 flex-1">ลาครึ่งวัน</label>
                {form.is_half_day && (
                  <select value={form.half_day_period} onChange={e => set("half_day_period", e.target.value)}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:border-blue-400">
                    <option value="morning">ช่วงเช้า</option>
                    <option value="afternoon">ช่วงบ่าย</option>
                  </select>
                )}
              </div>
            </>}

            {/* ── แก้ไขเวลา ─────────────────────────────── */}
            {formType === "adjustment" && <>
              <div><label className={labelCls}>วันที่</label>
                <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>เวลาเข้างาน</label>
                  <input type="time" value={form.requested_clock_in} onChange={e => set("requested_clock_in", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>เวลาออกงาน</label>
                  <input type="time" value={form.requested_clock_out} onChange={e => set("requested_clock_out", e.target.value)} className={inputCls} /></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
                💡 กรอกเฉพาะเวลาที่ต้องการแก้ไข ไม่จำเป็นต้องกรอกทั้งคู่
              </div>
            </>}

            {/* ── โอที ──────────────────────────────────── */}
            {formType === "overtime" && <>
              <div><label className={labelCls}>วันที่</label>
                <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>เวลาเริ่ม OT</label>
                  <input type="time" value={form.ot_start} onChange={e => set("ot_start", e.target.value)} className={inputCls} required /></div>
                <div><label className={labelCls}>เวลาสิ้นสุด OT</label>
                  <input type="time" value={form.ot_end} onChange={e => set("ot_end", e.target.value)} className={inputCls} required /></div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
                💡 OT rate เริ่มต้น 1.5× — HR จะตรวจสอบและอนุมัติ
              </div>
            </>}

            {/* เหตุผล */}
            <div>
              <label className={labelCls}>เหตุผล *</label>
              <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
                placeholder="ระบุเหตุผล..." className={`${inputCls} h-28 resize-none`} required />
            </div>

            <button type="submit" disabled={loading || !empId}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              {loading ? "กำลังส่ง..." : "ส่งคำร้อง"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Suspense wrapper บังคับโดย Next.js 14 สำหรับ useSearchParams ──
export default function LeaveNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    }>
      <LeaveNewInner />
    </Suspense>
  )
}