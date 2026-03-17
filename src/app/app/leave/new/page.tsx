"use client"
import { useState, Suspense } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveTypes } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, CalendarClock, FileEdit, Timer, Send, AlertCircle, UserX, Sparkles, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

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
  const [success, setSuccess] = useState(false)
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
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)

      } else if (formType === "adjustment") {
        const { error } = await supabase.from("time_adjustment_requests").insert({
          employee_id: empId, company_id: companyId,
          work_date: form.work_date, request_type: "time_adjustment",
          requested_clock_in:  form.requested_clock_in  ? `${form.work_date}T${form.requested_clock_in}:00+07:00`  : null,
          requested_clock_out: form.requested_clock_out ? `${form.work_date}T${form.requested_clock_out}:00+07:00` : null,
          reason: form.reason, status: "pending",
        })
        if (error) throw error
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)

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
        setSuccess(true)
        setTimeout(() => router.push("/app/leave"), 1200)
      }
    } catch (err: any) {
      setSubmitErr(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
  const labelCls = "block text-sm font-black text-slate-700 mb-2"

  const TITLES: Record<string, string> = { leave: "ยื่นใบลา", adjustment: "แก้ไขเวลาเข้า-ออก", overtime: "ขอทำ OT" }
  const TYPE_ICONS: Record<string, { gradient: string; icon: React.ReactNode }> = {
    leave:      { gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", icon: <CalendarClock size={15} className="text-white" /> },
    adjustment: { gradient: "linear-gradient(135deg,#8b5cf6,#a855f7)", icon: <FileEdit size={15} className="text-white" /> },
    overtime:   { gradient: "linear-gradient(135deg,#f59e0b,#f97316)", icon: <Timer size={15} className="text-white" /> },
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes successPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        .form-card { transition: transform .15s ease }
        .form-card:active { transform: scale(0.99) }
      `}</style>

      {/* Success overlay */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(8px)" }}>
          <div className="text-center" style={{ animation: "successPop .4s cubic-bezier(.22,1,.36,1)" }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: "0 8px 30px rgba(16,185,129,.4)" }}>
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <p className="text-white font-black text-lg">ส่งคำร้องสำเร็จ!</p>
            <p className="text-white/60 text-sm mt-1">กำลังกลับไปหน้าคำขอ...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen pb-12" style={{ background: "linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)" }}>

        {/* Header */}
        <div className="relative overflow-hidden" style={{
          background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)",
        }}>
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.06)" }} />

          <div className="relative z-10 px-5 pt-6 pb-16">
            <div className="flex items-center gap-3">
              <Link href="/app/leave"
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 transition-colors backdrop-blur-sm">
                <ArrowLeft size={17} className="text-white" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={11} className="text-blue-200" />
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">New Request</p>
                </div>
                <h1 className="text-white font-black text-lg tracking-tight">{TITLES[formType]}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-10 space-y-3 relative z-10">

          {/* Type switcher */}
          <div className="bg-white rounded-2xl shadow-lg p-1.5 flex border border-slate-100/80"
            style={{ boxShadow: "0 4px 20px rgba(99,102,241,.12)" }}>
            {[
              { k: "leave",      l: "ใบลา",    icon: <CalendarClock size={12} /> },
              { k: "adjustment", l: "แก้เวลา", icon: <FileEdit size={12} />      },
              { k: "overtime",   l: "OT",      icon: <Timer size={12} />          },
            ].map(({ k, l, icon }) => (
              <Link key={k} href={`/app/leave/new?type=${k}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all`}
                style={formType === k ? {
                  background: TYPE_ICONS[k].gradient,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(99,102,241,.2)",
                } : {
                  color: "#94a3b8",
                }}>
                {icon}{l}
              </Link>
            ))}
          </div>

          {/* Resignation shortcut */}
          <Link href="/app/resignation/new"
            className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100/80 shadow-sm p-3.5 transition-all active:scale-[0.98]">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg,#ef4444,#f43f5e)" }}>
              <UserX size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-700">ยื่นใบลาออก</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ต้องการยื่นใบลาออกจากบริษัท</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <ArrowLeft size={12} className="text-red-400 rotate-180" />
            </div>
          </Link>

          {/* Form */}
          <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
            {/* Form header accent */}
            <div className="h-1" style={{ background: TYPE_ICONS[formType]?.gradient || "linear-gradient(135deg,#3b82f6,#6366f1)" }} />

            <div className="p-5">
              {submitErr && (
                <div className="mb-4 rounded-2xl px-4 py-3 flex items-start gap-2.5"
                  style={{ background: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "1px solid #fecaca" }}>
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-semibold">{submitErr}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── ใบลา ─────────────────────────── */}
                {formType === "leave" && <>
                  <div>
                    <label className={labelCls}>ประเภทการลา *</label>
                    <select value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)}
                      className={inputCls} required>
                      <option value="">— เลือกประเภทการลา —</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {types.length === 0 && <p className="text-xs text-amber-500 mt-1.5 font-semibold">กำลังโหลดประเภทการลา...</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>วันที่เริ่ม</label>
                      <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>วันที่สิ้นสุด</label>
                      <input type="date" value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} className={inputCls} required /></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <input type="checkbox" id="half" checked={form.is_half_day} onChange={e => set("is_half_day", e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-blue-500" />
                    <label htmlFor="half" className="text-sm font-bold text-slate-700 flex-1">ลาครึ่งวัน</label>
                    {form.is_half_day && (
                      <select value={form.half_day_period} onChange={e => set("half_day_period", e.target.value)}
                        className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-400 font-semibold">
                        <option value="morning">ช่วงเช้า</option>
                        <option value="afternoon">ช่วงบ่าย</option>
                      </select>
                    )}
                  </div>
                </>}

                {/* ── แก้ไขเวลา ──────────────────── */}
                {formType === "adjustment" && <>
                  <div><label className={labelCls}>วันที่</label>
                    <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>เวลาเข้างาน</label>
                      <input type="time" value={form.requested_clock_in} onChange={e => set("requested_clock_in", e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>เวลาออกงาน</label>
                      <input type="time" value={form.requested_clock_out} onChange={e => set("requested_clock_out", e.target.value)} className={inputCls} /></div>
                  </div>
                  <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                    style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1px solid #c7d2fe" }}>
                    <Sparkles size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-indigo-700 font-semibold">กรอกเฉพาะเวลาที่ต้องการแก้ไข ไม่จำเป็นต้องกรอกทั้งคู่</p>
                  </div>
                </>}

                {/* ── โอที ────────────────────────── */}
                {formType === "overtime" && <>
                  <div><label className={labelCls}>วันที่</label>
                    <input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className={inputCls} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>เวลาเริ่ม OT</label>
                      <input type="time" value={form.ot_start} onChange={e => set("ot_start", e.target.value)} className={inputCls} required /></div>
                    <div><label className={labelCls}>เวลาสิ้นสุด OT</label>
                      <input type="time" value={form.ot_end} onChange={e => set("ot_end", e.target.value)} className={inputCls} required /></div>
                  </div>
                  <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                    style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a" }}>
                    <Sparkles size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-semibold">OT rate เริ่มต้น 1.5× — HR จะตรวจสอบและอนุมัติ</p>
                  </div>
                </>}

                {/* เหตุผล */}
                <div>
                  <label className={labelCls}>เหตุผล *</label>
                  <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
                    placeholder="ระบุเหตุผล..." className={`${inputCls} h-28 resize-none`} required />
                </div>

                <button type="submit" disabled={loading || !empId}
                  className="w-full py-3.5 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)",
                    boxShadow: "0 4px 15px rgba(99,102,241,.3)",
                  }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                  {loading ? "กำลังส่ง..." : "ส่งคำร้อง"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LeaveNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)" }}>
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    }>
      <LeaveNewInner />
    </Suspense>
  )
}
