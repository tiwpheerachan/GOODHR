"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, Loader2, CalendarDays } from "lucide-react"
import Link from "next/link"
import { format, subDays } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

const supabase = createClient()

function toDisplay(iso?: string | null) {
  if (!iso) return "--:--"
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
}
function toInput(iso?: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export default function CorrectionPage() {
  const { user } = useAuth()
  const sp = useSearchParams()
  const today = format(new Date(), "yyyy-MM-dd")

  // วันที่เลือก — รับจาก ?date= หรือเลือกเอง
  const [selectedDate, setSelectedDate] = useState(sp.get("date") || today)

  // attendance record ของวันที่เลือก
  const [record, setRecord]     = useState<any>(null)
  const [recLoading, setRecLoading] = useState(false)

  // ประวัติคำขอทั้งหมด (ไม่จำกัดวัน)
  const [history, setHistory]   = useState<any[]>([])
  const [histLoading, setHistLoading] = useState(true)

  const [form, setForm] = useState({ requested_clock_in: "", requested_clock_out: "", reason: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // โหลด attendance record เมื่อเปลี่ยนวัน
  useEffect(() => {
    const empId = user?.employee_id ?? (user as any)?.employee?.id
    if (!empId || !selectedDate) return
    setRecLoading(true)
    setRecord(null)
    setForm({ requested_clock_in: "", requested_clock_out: "", reason: "" })
    supabase
      .from("attendance_records")
      .select("*")
      .eq("employee_id", empId)
      .eq("work_date", selectedDate)
      .maybeSingle()
      .then(({ data }) => {
        setRecord(data)
        if (data) {
          setForm(f => ({
            ...f,
            requested_clock_in:  toInput(data.clock_in),
            requested_clock_out: toInput(data.clock_out),
          }))
        }
        setRecLoading(false)
      })
  }, [user?.employee_id, (user as any)?.employee?.id, selectedDate])

  // โหลดประวัติคำขอทั้งหมด
  const loadHistory = () => {
    const empId = user?.employee_id ?? (user as any)?.employee?.id
    if (!empId) return
    setHistLoading(true)
    supabase
      .from("time_adjustment_requests")
      .select("*")
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { setHistory(data ?? []); setHistLoading(false) })
  }

  useEffect(() => { loadHistory() }, [user?.employee_id, (user as any)?.employee?.id, submitted])

  const handleSubmit = async () => {
    if (!form.requested_clock_in && !form.requested_clock_out)
      return toast.error("กรุณากรอกเวลาที่ต้องการแก้ไข")
    if (!form.reason.trim())
      return toast.error("กรุณาระบุเหตุผล")

    const empId     = user?.employee_id ?? (user as any)?.employee?.id
    const companyId = (user as any)?.company_id ?? user?.employee?.company_id

    setSubmitting(true)
    try {
      const { error } = await supabase.from("time_adjustment_requests").insert({
        employee_id: empId,
        company_id:  companyId,
        work_date:   selectedDate,
        request_type: "time_adjustment",
        requested_clock_in:  form.requested_clock_in  ? selectedDate + "T" + form.requested_clock_in  + ":00+07:00" : null,
        requested_clock_out: form.requested_clock_out ? selectedDate + "T" + form.requested_clock_out + ":00+07:00" : null,
        reason: form.reason.trim(),
        status: "pending",
      })
      if (error) throw error
      toast.success("ส่งคำขอแก้ไขเวลาสำเร็จ!")
      setSubmitted(s => !s)
      setForm({ requested_clock_in: "", requested_clock_out: "", reason: "" })
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด")
    }
    setSubmitting(false)
  }

  const statusInfo = (s: string) => {
    if (s === "approved") return { label: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" }
    if (s === "rejected") return { label: "ไม่อนุมัติ",  cls: "bg-red-100 text-red-700",     dot: "bg-red-500"     }
    return                        { label: "รออนุมัติ",   cls: "bg-amber-100 text-amber-700",  dot: "bg-amber-400"   }
  }

  const lateMin  = record?.late_minutes ?? 0
  const maxDate  = today
  const minDate  = format(subDays(new Date(), 30), "yyyy-MM-dd") // ย้อนหลังได้ 30 วัน

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-10">

      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
        <Link href="/app/checkin" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-[17px] font-bold text-slate-800">ขอแก้ไขเวลา</h1>
          <p className="text-xs text-slate-400">ย้อนหลังได้สูงสุด 30 วัน</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">

        {/* ── Date picker ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            วันที่ต้องการแก้ไข
          </label>
          <div className="flex items-center gap-3">
            <CalendarDays size={16} className="text-indigo-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
            />
            <span className="text-xs text-slate-400 shrink-0">
              {format(new Date(selectedDate + "T00:00:00"), "EEE d MMM", { locale: th })}
            </span>
          </div>
        </div>

        {/* ── Current record card ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2.5 flex items-center gap-2">
            <Clock size={13} className="text-slate-300" />
            <p className="text-white text-[11px] font-bold tracking-widest uppercase">เวลาจริงที่บันทึก</p>
          </div>
          {recLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin" /><span className="text-sm">กำลังโหลด...</span>
            </div>
          ) : !record ? (
            <div className="px-4 py-5 text-center text-slate-400 text-sm">ไม่พบข้อมูลการเข้างานของวันนี้</div>
          ) : (
            <>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">Clock In</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums">{toDisplay(record.clock_in)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">Clock Out</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums">{toDisplay(record.clock_out)}</p>
                </div>
              </div>
              {lateMin > 0 && (
                <div className="mx-4 mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <AlertCircle size={13} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">มาสาย {lateMin} นาที — ยื่นขอแก้ไขเวลาเพื่อให้หัวหน้าพิจารณา</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Form ────────────────────────────────────── */}
        {record && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
              <Clock size={13} className="text-indigo-200" />
              <p className="text-white text-[11px] font-bold tracking-widest uppercase">เวลาที่ต้องการขอแก้ไข</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">เวลาเข้างาน</label>
                  <input
                    type="time"
                    value={form.requested_clock_in}
                    onChange={e => set("requested_clock_in", e.target.value)}
                    className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums font-semibold text-slate-800"
                  />
                  {record.clock_in && form.requested_clock_in && toInput(record.clock_in) !== form.requested_clock_in && (
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      เดิม {toDisplay(record.clock_in)} → <span className="text-indigo-600 font-semibold">{form.requested_clock_in}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">เวลาออกงาน</label>
                  <input
                    type="time"
                    value={form.requested_clock_out}
                    onChange={e => set("requested_clock_out", e.target.value)}
                    className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums font-semibold text-slate-800"
                  />
                  {record.clock_out && form.requested_clock_out && toInput(record.clock_out) !== form.requested_clock_out && (
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      เดิม {toDisplay(record.clock_out)} → <span className="text-indigo-600 font-semibold">{form.requested_clock_out}</span>
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  เหตุผล <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.reason}
                  onChange={e => set("reason", e.target.value)}
                  placeholder="เช่น ลืมเช็คอิน, ระบบขัดข้อง, GPS มีปัญหา..."
                  rows={3}
                  className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-slate-800 placeholder:text-slate-300"
                />
              </div>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  คำขอนี้จะถูกส่งให้หัวหน้าพิจารณา หากอนุมัติแล้วระบบจะอัปเดตเวลาและสถานะการมาสายโดยอัตโนมัติ
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!form.requested_clock_in && !form.requested_clock_out)}
                className={
                  "w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] " +
                  (submitting || (!form.requested_clock_in && !form.requested_clock_out)
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white shadow-xl shadow-indigo-200")
                }
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> กำลังส่ง...</>
                  : <><Clock size={18} /> ส่งคำขอแก้ไขเวลา</>}
              </button>
            </div>
          </div>
        )}

        {/* ── History ─────────────────────────────────── */}
        {!histLoading && history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">ประวัติคำขอทั้งหมด</p>
              <p className="text-xs text-slate-400 mt-0.5">ย้อนหลัง 20 รายการล่าสุด</p>
            </div>
            <div className="divide-y divide-slate-50">
              {history.map(h => {
                const si   = statusInfo(h.status)
                const cin  = h.requested_clock_in  ? new Date(h.requested_clock_in).toLocaleTimeString("th-TH",  { hour: "2-digit", minute: "2-digit", hour12: false }) : null
                const cout = h.requested_clock_out ? new Date(h.requested_clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) : null
                const workDate = h.work_date ? format(new Date(h.work_date + "T00:00:00"), "d MMM yyyy", { locale: th }) : "-"
                return (
                  <div key={h.id} className="px-4 py-3">
                    {/* วันที่ + สถานะ */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={"w-1.5 h-1.5 rounded-full shrink-0 " + si.dot} />
                        <span className="text-xs font-bold text-slate-700">{workDate}</span>
                      </div>
                      <span className={"text-[11px] font-bold px-2 py-0.5 rounded-full " + si.cls}>{si.label}</span>
                    </div>
                    {/* เวลาที่ขอ */}
                    <div className="flex items-center gap-2 text-sm">
                      {cin  && <span className="font-black tabular-nums text-indigo-700">{cin}</span>}
                      {cin && cout && <span className="text-slate-300 text-xs">–</span>}
                      {cout && <span className="font-black tabular-nums text-indigo-700">{cout}</span>}
                      {!cin && !cout && <span className="text-slate-300 text-xs">ไม่ระบุเวลา</span>}
                    </div>
                    {/* เหตุผล */}
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{h.reason}</p>
                    {/* review_note ถ้าถูกปฏิเสธ */}
                    {h.status === "rejected" && h.review_note && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> {h.review_note}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {submitted && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">ส่งคำขอแล้ว รอหัวหน้าอนุมัติ</p>
          </div>
        )}

      </div>
    </div>
  )
}