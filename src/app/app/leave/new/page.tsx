"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveTypes } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function LeaveNewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const sp = useSearchParams()
  const formType = sp.get("type") || "leave"
  const defaultDate = sp.get("date") || format(new Date(), "yyyy-MM-dd")
  const { types } = useLeaveTypes(user?.employee?.company_id)
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ leave_type_id:"", start_date:defaultDate, end_date:defaultDate, is_half_day:false, half_day_period:"morning", reason:"", work_date:defaultDate, requested_clock_in:"", requested_clock_out:"", ot_start:"", ot_end:"" })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (formType === "leave") {
        const totalDays = form.is_half_day ? 0.5 : Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1
        const { error } = await supabase.from("leave_requests").insert({ employee_id:user?.employee_id, company_id:user?.employee?.company_id, leave_type_id:form.leave_type_id, start_date:form.start_date, end_date:form.end_date, total_days:totalDays, is_half_day:form.is_half_day, half_day_period:form.is_half_day?form.half_day_period:null, reason:form.reason, status:"pending" })
        if (error) throw error
        toast.success("ส่งใบลาสำเร็จ"); router.push("/app/leave")
      } else if (formType === "adjustment") {
        const { error } = await supabase.from("time_adjustment_requests").insert({ employee_id:user?.employee_id, company_id:user?.employee?.company_id, work_date:form.work_date, request_type:"time_adjustment", requested_clock_in:form.requested_clock_in?form.work_date+"T"+form.requested_clock_in+":00+07:00":null, requested_clock_out:form.requested_clock_out?form.work_date+"T"+form.requested_clock_out+":00+07:00":null, reason:form.reason, status:"pending" })
        if (error) throw error
        toast.success("ส่งคำขอแก้ไขเวลาสำเร็จ"); router.push("/app/attendance")
      } else if (formType === "overtime") {
        const { error } = await supabase.from("overtime_requests").insert({ employee_id:user?.employee_id, company_id:user?.employee?.company_id, work_date:form.work_date, ot_start:form.work_date+"T"+form.ot_start+":00+07:00", ot_end:form.work_date+"T"+form.ot_end+":00+07:00", reason:form.reason, status:"pending", ot_rate:1.5 })
        if (error) throw error
        toast.success("ส่งคำขอ OT สำเร็จ"); router.push("/app/attendance")
      }
    } catch (err: any) { toast.error(err.message || "เกิดข้อผิดพลาด") }
    setLoading(false)
  }

  const TITLES: Record<string,string> = { leave:"ยื่นใบลา", adjustment:"แก้ไขเวลาเข้า-ออก", overtime:"ขอทำ OT" }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/app/leave" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18} className="text-slate-600" /></Link>
        <h1 className="text-xl font-bold text-slate-800">{TITLES[formType]}</h1>
      </div>
      <div className="flex bg-slate-100 rounded-xl p-1">
        {[["leave","ใบลา"],["adjustment","แก้เวลา"],["overtime","OT"]].map(([k,l]) => (
          <Link key={k} href={"/app/leave/new?type="+k} className={"flex-1 py-2 text-xs font-semibold rounded-lg text-center " + (formType===k?"bg-white text-primary-700 shadow-sm":"text-slate-500")}>{l}</Link>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formType === "leave" && <>
          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภทการลา *</label>
            <select value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)} className="input-field" required>
              <option value="">เลือกประเภทการลา</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่เริ่ม</label><input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่สิ้นสุด</label><input type="date" value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} className="input-field" required /></div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="half" checked={form.is_half_day} onChange={e => set("is_half_day", e.target.checked)} className="w-4 h-4 text-primary-600" />
            <label htmlFor="half" className="text-sm font-medium text-slate-700">ลาครึ่งวัน</label>
            {form.is_half_day && <select value={form.half_day_period} onChange={e => set("half_day_period", e.target.value)} className="input-field flex-1 py-2"><option value="morning">ช่วงเช้า</option><option value="afternoon">ช่วงบ่าย</option></select>}
          </div>
        </>}
        {formType === "adjustment" && <>
          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่</label><input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาเข้างาน</label><input type="time" value={form.requested_clock_in} onChange={e => set("requested_clock_in", e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาออกงาน</label><input type="time" value={form.requested_clock_out} onChange={e => set("requested_clock_out", e.target.value)} className="input-field" /></div>
          </div>
        </>}
        {formType === "overtime" && <>
          <div><label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่</label><input type="date" value={form.work_date} onChange={e => set("work_date", e.target.value)} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาเริ่ม OT</label><input type="time" value={form.ot_start} onChange={e => set("ot_start", e.target.value)} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาสิ้นสุด OT</label><input type="time" value={form.ot_end} onChange={e => set("ot_end", e.target.value)} className="input-field" required /></div>
          </div>
        </>}
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">เหตุผล *</label><textarea value={form.reason} onChange={e => set("reason", e.target.value)} className="input-field h-24 resize-none" required /></div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />} ส่งคำร้อง
        </button>
      </form>
    </div>
  )
}