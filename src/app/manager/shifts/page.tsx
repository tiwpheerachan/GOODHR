"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ChevronLeft, ChevronRight, Save, Clock, Moon, Calendar, Wand2, Copy, Users, AlertCircle,
  CheckCircle2, X as XIcon, Trash2, CalendarDays
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface Shift { id: string; name: string; shift_type: string; work_start: string; work_end: string }
interface Assignment {
  employee_id: string; work_date: string; shift_id: string | null
  assignment_type: string; shift?: Shift
}
interface EmpRow {
  employee: { id: string; employee_code: string; first_name_th: string; last_name_th: string; department: string }
  profile: any
  days: Array<{ date: string; assignment: Assignment | null }>
}

const SHIFT_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  "09:00": { bg: "bg-blue-200", text: "text-blue-800", short: "9" },
  "10:00": { bg: "bg-cyan-200", text: "text-cyan-800", short: "10" },
  "10:30": { bg: "bg-teal-200", text: "text-teal-800", short: "10½" },
  "11:00": { bg: "bg-purple-200", text: "text-purple-800", short: "11" },
  "12:00": { bg: "bg-amber-200", text: "text-amber-800", short: "12" },
  "12:30": { bg: "bg-orange-200", text: "text-orange-800", short: "12½" },
  "13:00": { bg: "bg-rose-200", text: "text-rose-800", short: "13" },
  "15:30": { bg: "bg-indigo-200", text: "text-indigo-800", short: "15½" },
  "16:00": { bg: "bg-fuchsia-200", text: "text-fuchsia-800", short: "16" },
}

function shiftStyle(startTime: string | null | undefined) {
  if (!startTime) return { bg: "bg-slate-100", text: "text-slate-500", short: "-" }
  return SHIFT_COLORS[startTime.substring(0, 5)] ?? { bg: "bg-slate-100", text: "text-slate-600", short: startTime.substring(0, 5) }
}

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export default function ManagerShiftsPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [grid, setGrid] = useState<EmpRow[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [days, setDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modifications, setModifications] = useState<Map<string, any>>(new Map())
  const [picker, setPicker] = useState<{ empId: string; date: string; x: number; y: number } | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "variable" | "fixed">("all")
  const [searchText, setSearchText] = useState("")

  const monthStr = `${year}-${String(month).padStart(2, "0")}`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/shifts/monthly?month=${monthStr}&schedule_type=${filterType}`)
    const data = await res.json()
    if (data.success) {
      setGrid(data.grid)
      setShifts(data.shifts ?? [])
      setDays(data.days)
    }
    setLoading(false)
    setModifications(new Map())
  }, [monthStr, filterType])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  // ── Approve/Reject pending request ────────────────────────────
  const handlePendingAction = async (reqId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/shifts/self-schedule/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, request_id: reqId }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว")
      load()
    } else toast.error(data.error)
    setPicker(null)
  }

  // ── Clear shift ───────────────────────────────────────────────
  const handleClearShift = async (empId: string, date: string) => {
    const res = await fetch("/api/shifts/self-schedule/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_shift", employee_id: empId, work_date: date }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success("ลบกะสำเร็จ")
      setGrid(prev => prev.map(row => {
        if (row.employee.id !== empId) return row
        return { ...row, days: row.days.map((d: any) => d.date === date ? { ...d, assignment: null, pending_request: null } : d) }
      }))
    } else toast.error(data.error)
    setPicker(null)
  }

  const applyShift = (empId: string, date: string, shiftId: string | null, type: "work" | "dayoff" | "leave", leaveType?: string) => {
    const key = `${empId}_${date}`
    setModifications(prev => { const n = new Map(prev); n.set(key, { employee_id: empId, work_date: date, shift_id: shiftId, assignment_type: type, leave_type: leaveType ?? null }); return n })
    setGrid(prev => prev.map(row => {
      if (row.employee.id !== empId) return row
      return { ...row, days: row.days.map(d => {
        if (d.date !== date) return d
        const s = shifts.find(sh => sh.id === shiftId)
        return { date, assignment: { employee_id: empId, work_date: date, shift_id: shiftId, assignment_type: type, leave_type: leaveType, shift: s ?? undefined } as any }
      })}
    }))
    setPicker(null)
  }

  const LEAVE_OPTIONS_MGR = [
    { key: "sick",       label: "ลาป่วย",       bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200" },
    { key: "personal",   label: "ลากิจ",        bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
    { key: "vacation",   label: "ลาพักร้อน",    bg: "bg-green-50",   text: "text-green-600",  border: "border-green-200" },
    { key: "company",    label: "หยุดบริษัท",   bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-200" },
    { key: "graduation", label: "ลารับปริญญา",  bg: "bg-sky-50",     text: "text-sky-600",    border: "border-sky-200" },
  ]

  const LEAVE_LABEL: Record<string, string> = {
    sick: "ป่วย", personal: "กิจ", vacation: "ร้อน",
    company: "บ.หยุด", graduation: "ปริญญา",
  }

  const handleSave = async () => {
    if (modifications.size === 0) return
    setSaving(true)
    const res = await fetch("/api/shifts/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", assignments: Array.from(modifications.values()) }) })
    const data = await res.json()
    if (data.success) { toast.success(`บันทึก ${data.updated} รายการ`); setModifications(new Map()) }
    else toast.error(data.error)
    setSaving(false)
  }

  const handleCopy = async () => {
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    const res = await fetch("/api/shifts/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "copy", from_month: `${py}-${String(pm).padStart(2, "0")}`, to_month: monthStr }) })
    const data = await res.json()
    if (data.success) { toast.success(`คัดลอก ${data.copied} รายการ`); load() }
    else toast.error(data.error)
  }

  // Filter + search
  const filtered = grid.filter(row => {
    if (!searchText) return true
    const s = searchText.toLowerCase()
    return (
      row.employee.first_name_th?.toLowerCase().includes(s) ||
      row.employee.last_name_th?.toLowerCase().includes(s) ||
      row.employee.employee_code?.toLowerCase().includes(s) ||
      row.employee.department?.toLowerCase().includes(s)
    )
  })

  // Mobile: show employee list first, then individual schedule
  const selectedRow = grid.find(r => r.employee.id === selectedEmp)

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-base font-black text-slate-800">{TH_MONTHS[month]} {year + 543}</p>
          <p className="text-[10px] text-slate-400">{filtered.length} คน</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar link */}
      <Link href="/manager/calendar"
        className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
        <CalendarDays size={14} /> ปฏิทินสรุปตารางงาน
      </Link>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl border border-slate-200 bg-white p-0.5">
          {([
            { key: "all", label: "ทั้งหมด" },
            { key: "fixed", label: "แน่นอน" },
            { key: "variable", label: "ไม่แน่นอน" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${filterType === t.key ? "bg-indigo-600 text-white" : "text-slate-500"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder="ค้นหาชื่อ / รหัส..."
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600">
          <Copy size={14} /> คัดลอกเดือนก่อน
        </button>
        {modifications.size > 0 && (
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">
            <Save size={14} /> บันทึก ({modifications.size})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : !selectedEmp ? (
        /* ── Employee List ──────────────────────────────────────── */
        <div className="space-y-2">
          {filtered.map(row => {
            const isVariable = row.profile?.schedule_type === "variable"
            const canSelfSched = (row.employee as any).can_self_schedule
            const assigned = row.days.filter(d => d.assignment).length
            const total = row.days.length
            return (
              <button
                key={row.employee.id}
                onClick={() => setSelectedEmp(row.employee.id)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all text-left"
              >
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${isVariable ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-indigo-400 to-violet-500"}`}>
                  {row.employee.first_name_th?.[0]}
                  {canSelfSched && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-[7px] text-white font-black">S</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {row.employee.first_name_th} {row.employee.last_name_th}
                    {isVariable && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-black">ไม่แน่นอน</span>}
                    {canSelfSched && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-black">วางกะเอง</span>}
                  </p>
                  <p className="text-[10px] text-slate-400">{row.employee.employee_code} · {row.employee.department}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-black text-indigo-600">{assigned}/{total}</p>
                  <p className="text-[9px] text-slate-400">จัดแล้ว</p>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">ไม่พบพนักงาน</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Individual Schedule ─────────────────────────────────── */
        <div>
          <button onClick={() => setSelectedEmp(null)} className="flex items-center gap-1 text-sm text-indigo-600 font-bold mb-3">
            <ChevronLeft size={16} /> กลับ
          </button>

          <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm mb-4">
            <p className="font-black text-slate-800">{selectedRow?.employee.first_name_th} {selectedRow?.employee.last_name_th}</p>
            <p className="text-xs text-slate-400">{selectedRow?.employee.employee_code} · {selectedRow?.employee.department}</p>
          </div>

          <div className="space-y-1.5">
            {selectedRow?.days.map(({ date, assignment, pending_request }: any) => {
              const d = new Date(date)
              const dow = d.getDay()
              const aType = assignment?.assignment_type
              const shiftStart = assignment?.shift?.work_start
              const s = shiftStyle(shiftStart)
              const isModified = modifications.has(`${selectedEmp}_${date}`)
              const hasPending = !!pending_request

              return (
                <div key={date}>
                  <div
                    onClick={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setPicker({ empId: selectedEmp!, date, x: rect.left, y: rect.bottom + 4 })
                    }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all cursor-pointer active:scale-[.98] ${
                      hasPending ? "border-yellow-300 bg-yellow-50" :
                      isModified ? "border-amber-300 bg-amber-50" :
                      aType === "dayoff" ? "border-slate-100 bg-slate-50" :
                      aType === "leave" ? "border-sky-200 bg-sky-50" :
                      aType === "holiday" ? "border-red-200 bg-red-100" :
                      aType === "work" ? `border-slate-100 ${s.bg}` :
                      "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="w-8 text-center">
                      <p className={`text-[9px] font-bold ${dow === 0 || dow === 6 ? "text-red-400" : "text-slate-400"}`}>{TH_DAYS[dow]}</p>
                      <p className="text-sm font-black text-slate-700">{d.getDate()}</p>
                    </div>
                    {aType === "dayoff" ? (
                      <div className="flex items-center gap-2">
                        <Moon size={14} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-400">วันหยุด</span>
                      </div>
                    ) : aType === "leave" ? (
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-sky-50">
                        <span className="text-xs font-bold text-sky-600">{LEAVE_LABEL[(assignment as any)?.leave_type ?? ""] ?? "ลา"}</span>
                      </div>
                    ) : aType === "holiday" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-500">วันหยุดนักขัตฤกษ์</span>
                      </div>
                    ) : aType === "work" && shiftStart ? (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className={s.text} />
                        <span className={`text-xs font-bold ${s.text}`}>
                          {shiftStart.substring(0, 5)} - {assignment?.shift?.work_end?.substring(0, 5)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">ยังไม่จัด — แตะเพื่อเลือก</span>
                    )}
                    {hasPending && <span className="text-[8px] font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full ml-auto">รอเปลี่ยน</span>}
                  </div>
                  {/* Quick approve/reject for pending */}
                  {hasPending && (
                    <div className="flex gap-1.5 mt-1 ml-11">
                      <button onClick={() => handlePendingAction(pending_request.id, "approve")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600">
                        <CheckCircle2 size={11} /> อนุมัติ
                      </button>
                      <button onClick={() => handlePendingAction(pending_request.id, "reject")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-red-500 hover:bg-red-600">
                        <XIcon size={11} /> ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Shift Picker Popup ─────────────────────────────────── */}
      {picker && (() => {
        const pickerRow = grid.find(r => r.employee.id === picker.empId)
        const pickerDay = pickerRow?.days.find((d: any) => d.date === picker.date) as any
        const pickerPending = pickerDay?.pending_request
        const pickerAssignment = pickerDay?.assignment

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setPicker(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-4 pb-8 shadow-2xl max-w-[430px] mx-auto" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400 mb-3">
                {new Date(picker.date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" })}
              </p>

              {/* Pending Request Info */}
              {pickerPending && (
                <div className="mb-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                  <p className="text-[10px] font-bold text-yellow-700 mb-1">คำขอเปลี่ยนกะรออนุมัติ</p>
                  {/* แสดงรายละเอียดเวลา: จากกะไหน → เป็นกะไหน */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 bg-white rounded-lg px-2 py-1 border border-yellow-200">
                      <p className="text-[8px] text-yellow-500 font-bold">กะเดิม</p>
                      <p className="text-[10px] font-black text-yellow-800">
                        {pickerPending.current_assignment_type === "dayoff" ? "วันหยุด" :
                          pickerPending.current_shift ? `${pickerPending.current_shift.work_start?.substring(0,5)}-${pickerPending.current_shift.work_end?.substring(0,5)}` : "-"}
                      </p>
                    </div>
                    <span className="text-[10px] text-yellow-400 font-black">→</span>
                    <div className="flex-1 bg-white rounded-lg px-2 py-1 border border-emerald-200">
                      <p className="text-[8px] text-emerald-500 font-bold">ขอเปลี่ยน</p>
                      <p className="text-[10px] font-black text-emerald-700">
                        {pickerPending.requested_assignment_type === "dayoff" ? "วันหยุด" :
                          pickerPending.requested_shift ? `${pickerPending.requested_shift.work_start?.substring(0,5)}-${pickerPending.requested_shift.work_end?.substring(0,5)}` : "-"}
                      </p>
                    </div>
                  </div>
                  {pickerPending.reason && (
                    <p className="text-[9px] text-yellow-600 mb-1.5 truncate" title={pickerPending.reason}>เหตุผล: {pickerPending.reason}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePendingAction(pickerPending.id, "approve")}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600"
                    >
                      <CheckCircle2 size={13} /> อนุมัติ
                    </button>
                    <button
                      onClick={() => handlePendingAction(pickerPending.id, "reject")}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600"
                    >
                      <XIcon size={13} /> ปฏิเสธ
                    </button>
                  </div>
                </div>
              )}

              <button onClick={() => applyShift(picker.empId, picker.date, null, "dayoff")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors mb-1">
                <Moon size={18} className="text-slate-400" /> วันหยุด (OFF)
              </button>

              {/* ── ประเภทลา ── */}
              <p className="text-[10px] font-bold text-slate-400 mt-2 mb-1 px-1">วันลา</p>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {LEAVE_OPTIONS_MGR.map(lo => (
                  <button key={lo.key} onClick={() => applyShift(picker.empId, picker.date, null, "leave", lo.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${lo.bg} ${lo.text} border ${lo.border} hover:opacity-80 transition-colors`}>
                    {lo.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 my-2" />
              <p className="text-[10px] font-bold text-slate-400 mb-1 px-1">เลือกกะ</p>
              {shifts.map(s => {
                const st = shiftStyle(s.work_start)
                return (
                  <button key={s.id} onClick={() => applyShift(picker.empId, picker.date, s.id, "work")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${st.bg} ${st.text} hover:opacity-80 transition-colors mb-1`}>
                    <Clock size={18} />
                    <span>{s.work_start?.substring(0, 5)} - {s.work_end?.substring(0, 5)}</span>
                    <span className="ml-auto text-xs opacity-60">{s.name}</span>
                  </button>
                )
              })}

              {/* ลบกะ (Clear Shift) — เฉพาะเมื่อมี assignment อยู่ */}
              {pickerAssignment && (
                <>
                  <div className="border-t border-slate-100 my-2" />
                  <button
                    onClick={() => handleClearShift(picker.empId, picker.date)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} className="text-red-400" /> ลบกะ (ไม่มีกะ)
                  </button>
                </>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
