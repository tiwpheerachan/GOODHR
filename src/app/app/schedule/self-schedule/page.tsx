"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ChevronLeft, ChevronRight, Clock, Moon, Save, Check, X,
  AlertCircle, CalendarClock, Loader2, Undo2, Thermometer, Briefcase,
  Palmtree, Building2, GraduationCap
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface Shift { id: string; name: string; work_start: string; work_end: string; is_overnight?: boolean }
interface DayInfo {
  date: string
  assignment: {
    assignment_type: string
    shift_id: string | null
    shift?: Shift
    has_pending_change?: boolean
    submitted_by?: string
    leave_type?: string
  } | null
}

const LEAVE_OPTIONS = [
  { key: "sick",       label: "ลาป่วย",       icon: Thermometer,  bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200" },
  { key: "personal",   label: "ลากิจ",        icon: Briefcase,    bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
  { key: "vacation",   label: "ลาพักร้อน",    icon: Palmtree,     bg: "bg-green-50",   text: "text-green-600",  border: "border-green-200" },
  { key: "company",    label: "หยุดบริษัท",   icon: Building2,    bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-200" },
  { key: "graduation", label: "ลารับปริญญา",  icon: GraduationCap,bg: "bg-sky-50",     text: "text-sky-600",    border: "border-sky-200" },
] as const

const LEAVE_LABEL: Record<string, string> = {
  sick: "ลาป่วย", personal: "ลากิจ", vacation: "ลาพักร้อน",
  company: "หยุดบริษัท", graduation: "ลารับปริญญา",
}
interface ChangeReq {
  id: string
  work_date: string
  requested_shift_id: string | null
  requested_assignment_type: string
  current_shift_id: string | null
  current_assignment_type: string | null
  status: string
  reason: string | null
  review_note: string | null
  requested_shift?: Shift
  current_shift?: Shift
}

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

const SHIFT_COLORS: Record<string, { bg: string; text: string }> = {
  "09": { bg: "bg-blue-100", text: "text-blue-700" },
  "10": { bg: "bg-cyan-100", text: "text-cyan-700" },
  "11": { bg: "bg-violet-100", text: "text-violet-700" },
  "12": { bg: "bg-amber-100", text: "text-amber-700" },
  "13": { bg: "bg-rose-100", text: "text-rose-700" },
  "15": { bg: "bg-indigo-100", text: "text-indigo-700" },
  "16": { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
}

function shiftColor(start: string | undefined) {
  if (!start) return { bg: "bg-slate-100", text: "text-slate-500" }
  return SHIFT_COLORS[start.substring(0, 2)] ?? { bg: "bg-slate-100", text: "text-slate-600" }
}

export default function SelfSchedulePage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [schedule, setSchedule] = useState<DayInfo[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [pendingReqs, setPendingReqs] = useState<ChangeReq[]>([])
  const [loading, setLoading] = useState(true)
  const [canSelfSchedule, setCanSelfSchedule] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── ข้อมูลที่กำลังแก้ไข ──
  const [edits, setEdits] = useState<Map<string, { shift_id: string | null; assignment_type: "work" | "dayoff" | "leave"; leave_type?: string; reason?: string }>>(new Map())
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [editReason, setEditReason] = useState("")

  const monthStr = `${year}-${String(month).padStart(2, "0")}`
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  // ── Load ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const [schedRes, shiftRes, pendingRes] = await Promise.all([
      fetch(`/api/shifts/my-schedule?month=${monthStr}`),
      fetch("/api/shifts/definitions"),
      fetch(`/api/shifts/self-schedule/pending?status=all&month=${monthStr}`),
    ])

    const schedData = await schedRes.json()
    const shiftData = await shiftRes.json()
    const pendingData = await pendingRes.json()

    if (schedData.success) {
      setSchedule(schedData.schedule ?? [])
      setCanSelfSchedule(schedData.can_self_schedule ?? false)
    }
    if (shiftData.success) setShifts(shiftData.shifts ?? [])
    if (pendingData.success) setPendingReqs(pendingData.requests ?? [])

    setLoading(false)
    setEdits(new Map())
  }, [monthStr])

  useEffect(() => { load() }, [load])

  // ── Edit helpers ──────────────────────────────────────────────
  const setEdit = (date: string, shift_id: string | null, assignment_type: "work" | "dayoff" | "leave", leave_type?: string) => {
    setEdits(prev => {
      const next = new Map(prev)
      next.set(date, { shift_id, assignment_type, leave_type, reason: editReason })
      return next
    })
    setPickerDate(null)
    setEditReason("")
  }

  const removeEdit = (date: string) => {
    setEdits(prev => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (edits.size === 0) return
    setSaving(true)

    const changes = Array.from(edits.entries()).map(([date, e]) => ({
      work_date: date,
      shift_id: e.shift_id,
      assignment_type: e.assignment_type,
      leave_type: e.leave_type || undefined,
      reason: e.reason || undefined,
    }))

    const res = await fetch("/api/shifts/self-schedule/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    })
    const data = await res.json()

    if (data.success) {
      toast.success(data.message)
      load()
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  // ── Withdraw ──────────────────────────────────────────────────
  const handleWithdraw = async (reqId: string) => {
    const res = await fetch("/api/shifts/self-schedule/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", request_id: reqId }),
    })
    const data = await res.json()
    if (data.success) { toast.success("ถอนคำขอสำเร็จ"); load() }
    else toast.error(data.error)
  }

  // ── Pending map ───────────────────────────────────────────────
  const pendingMap = new Map(pendingReqs.map(r => [r.work_date, r]))

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    )
  }

  if (!canSelfSchedule) {
    return (
      <div className="px-4 py-8 max-w-[430px] mx-auto text-center">
        <CalendarClock size={48} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-lg font-black text-slate-700 mb-2">ยังไม่ได้เปิดสิทธิ์วางกะเอง</h2>
        <p className="text-sm text-slate-400 mb-4">กรุณาติดต่อ HR หรือ Admin เพื่อเปิดสิทธิ์ Self-Schedule</p>
        <Link href="/app/schedule" className="text-sm font-bold text-violet-600 hover:underline">
          ← กลับดูตารางงาน
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-[430px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link href="/app/schedule" className="flex items-center gap-1 text-sm font-bold text-violet-600">
          <ChevronLeft size={16} /> ตารางงาน
        </Link>
        <h2 className="text-base font-black text-slate-800">วางกะเอง</h2>
        <div className="w-16" />
      </div>

      {/* ── Month Nav ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl px-4 py-3 text-white">
        <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black">{TH_MONTHS[month]} {year + 543}</p>
          {edits.size > 0 && (
            <p className="text-[10px] text-white/70">{edits.size} วันที่ยังไม่บันทึก</p>
          )}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Save Bar ───────────────────────────────────────────── */}
      {edits.size > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium flex-1">
            {edits.size} วันที่ยังไม่บันทึก
          </p>
          <button onClick={() => setEdits(new Map())} className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-amber-100">
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-1 text-xs font-bold text-white bg-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            บันทึก
          </button>
        </div>
      )}

      {/* ── Day List ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {schedule.map(day => {
          const d = new Date(day.date)
          const dow = d.getDay()
          const isPast = day.date < todayStr
          const isToday = day.date === todayStr
          const aType = day.assignment?.assignment_type
          const shiftStart = day.assignment?.shift?.work_start
          const pending = pendingMap.get(day.date)
          const edit = edits.get(day.date)
          const hasPending = pending?.status === "pending"
          const sc = shiftColor(shiftStart)

          // ── แสดงข้อมูล edit ถ้ามี ──
          if (edit) {
            const editShift = shifts.find(s => s.id === edit.shift_id)
            const editSc = shiftColor(editShift?.work_start)
            return (
              <div key={day.date} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 border-amber-400 bg-amber-50">
                <div className="w-8 text-center">
                  <p className={`text-[9px] font-bold ${dow === 0 || dow === 6 ? "text-red-400" : "text-slate-400"}`}>{TH_DAYS[dow]}</p>
                  <p className="text-sm font-black text-slate-700">{d.getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  {edit.assignment_type === "leave" ? (
                    <p className="text-xs font-bold text-sky-600">→ {LEAVE_LABEL[edit.leave_type ?? ""] ?? "วันลา"}</p>
                  ) : edit.assignment_type === "dayoff" ? (
                    <p className="text-xs font-bold text-slate-500">→ วันหยุด (OFF)</p>
                  ) : editShift ? (
                    <p className={`text-xs font-bold ${editSc.text}`}>
                      → {editShift.work_start.substring(0, 5)} - {editShift.work_end.substring(0, 5)}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-amber-600">→ เลือกกะแล้ว</p>
                  )}
                  <p className="text-[9px] text-amber-500 font-medium">ยังไม่บันทึก</p>
                </div>
                <button onClick={() => removeEdit(day.date)} className="p-1.5 rounded-lg hover:bg-amber-100">
                  <X size={14} className="text-amber-500" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={day.date}
              onClick={() => !hasPending && setPickerDate(day.date)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all
                ${hasPending ? "cursor-default" : "cursor-pointer active:scale-[.98]"}
                ${isPast ? "opacity-70" : ""}
                ${isToday ? "ring-2 ring-violet-400" : ""}
                ${hasPending ? "border-amber-300 bg-amber-50/50" : "border-slate-100 bg-white"}
              `}
            >
              <div className="w-8 text-center">
                <p className={`text-[9px] font-bold ${dow === 0 || dow === 6 ? "text-red-400" : "text-slate-400"}`}>{TH_DAYS[dow]}</p>
                <p className="text-sm font-black text-slate-700">{d.getDate()}</p>
              </div>

              {/* Content */}
              {aType === "dayoff" || !day.assignment ? (
                <div className="flex items-center gap-2 flex-1">
                  <Moon size={14} className="text-slate-300" />
                  <span className="text-xs font-bold text-slate-400">วันหยุด</span>
                </div>
              ) : aType === "leave" ? (
                <div className="flex items-center gap-2 flex-1 px-2 py-1 rounded-lg bg-sky-50">
                  <Thermometer size={13} className="text-sky-500" />
                  <span className="text-xs font-bold text-sky-600">{LEAVE_LABEL[day.assignment?.leave_type ?? ""] ?? "วันลา"}</span>
                </div>
              ) : aType === "holiday" ? (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-red-500">วันหยุดนักขัตฤกษ์</span>
                </div>
              ) : shiftStart ? (
                <div className={`flex items-center gap-2 flex-1 px-2 py-1 rounded-lg ${sc.bg}`}>
                  <Clock size={13} className={sc.text} />
                  <span className={`text-xs font-bold ${sc.text}`}>
                    {shiftStart.substring(0, 5)} - {day.assignment?.shift?.work_end?.substring(0, 5)}
                  </span>
                </div>
              ) : (
                <div className="flex-1">
                  <span className="text-xs text-slate-300">ยังไม่มีกะ — แตะเพื่อวาง</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isToday && <span className="text-[8px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">วันนี้</span>}
                {hasPending && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">รออนุมัติ</span>}
                {pending?.status === "approved" && <span className="text-[8px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">อนุมัติแล้ว</span>}
                {pending?.status === "rejected" && <span className="text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">ปฏิเสธ</span>}
                {isPast && !hasPending && <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">ย้อนหลัง</span>}
                {!hasPending && <ChevronRight size={14} className="text-slate-300" />}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Pending Requests Section ─────────────────────────────── */}
      {pendingReqs.filter(r => r.status === "pending").length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-black text-slate-600 mb-2 px-1">คำขอเปลี่ยนกะที่รออนุมัติ</h3>
          <div className="space-y-1.5">
            {pendingReqs.filter(r => r.status === "pending").map(req => {
              const d = new Date(req.work_date)
              return (
                <div key={req.id} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <div className="w-8 text-center">
                    <p className="text-[9px] font-bold text-amber-400">{TH_DAYS[d.getDay()]}</p>
                    <p className="text-sm font-black text-amber-700">{d.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400">
                      {req.current_assignment_type === "work" && req.current_shift_id
                        ? `เดิม: ${(req as any).current_shift?.work_start?.substring(0, 5) || "?"}`
                        : "เดิม: วันหยุด"
                      }
                      {" → "}
                      {req.requested_assignment_type === "work" && req.requested_shift_id
                        ? `ขอเปลี่ยน: ${(req as any).requested_shift?.work_start?.substring(0, 5) || "?"}`
                        : "ขอเป็นวันหยุด"
                      }
                    </p>
                    {req.reason && <p className="text-[9px] text-amber-500 truncate">เหตุผล: {req.reason}</p>}
                  </div>
                  <button onClick={() => handleWithdraw(req.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 px-2 py-1 rounded-lg bg-white hover:bg-slate-50">
                    <Undo2 size={10} /> ถอน
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Shift Picker Bottom Sheet ─────────────────────────── */}
      {pickerDate && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setPickerDate(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-4 pb-8 shadow-2xl max-w-[430px] mx-auto">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400 mb-1">
              {new Date(pickerDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" })}
            </p>

            {/* ถ้ามีกะอยู่แล้ว → แสดงเหตุผล field */}
            {schedule.find(s => s.date === pickerDate)?.assignment && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-600 mb-1">มีกะอยู่แล้ว — การเปลี่ยนจะต้องรอหัวหน้าอนุมัติ</p>
                <input
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="เหตุผลที่ขอเปลี่ยน (ไม่บังคับ)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-violet-400"
                />
              </div>
            )}

            {/* วันหยุด */}
            <button onClick={() => setEdit(pickerDate, null, "dayoff")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors mb-1">
              <Moon size={18} className="text-slate-400" /> วันหยุด (OFF)
            </button>

            {/* ── ประเภทลา ── */}
            <p className="text-[10px] font-bold text-slate-400 mt-2 mb-1 px-1">วันลา</p>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {LEAVE_OPTIONS.map(lo => {
                const Icon = lo.icon
                return (
                  <button key={lo.key} onClick={() => setEdit(pickerDate, null, "leave", lo.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${lo.bg} ${lo.text} border ${lo.border} hover:opacity-80 transition-colors`}>
                    <Icon size={14} />
                    {lo.label}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-slate-100 my-2" />

            {/* กะ */}
            <p className="text-[10px] font-bold text-slate-400 mb-1 px-1">เลือกกะ</p>
            {shifts.map(s => {
              const sc = shiftColor(s.work_start)
              return (
                <button key={s.id} onClick={() => setEdit(pickerDate, s.id, "work")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${sc.bg} ${sc.text} hover:opacity-80 transition-colors mb-1`}>
                  <Clock size={18} />
                  <span>{s.work_start?.substring(0, 5)} - {s.work_end?.substring(0, 5)}</span>
                  <span className="ml-auto text-xs opacity-60">{s.name}</span>
                  {s.is_overnight && <span className="text-[9px] opacity-50">(ข้ามคืน)</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
