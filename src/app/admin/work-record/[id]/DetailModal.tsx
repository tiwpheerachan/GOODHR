"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  X, Check, Trash2, AlertCircle, CheckCircle2, Loader2, Pencil,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export type ModalKind = "attendance" | "ot" | "shift" | "leave"

export type Manager = {
  id: string
  first_name_th: string
  last_name_th: string
  nickname?: string | null
  avatar_url?: string | null
  position?: string | null
}

interface BaseProps {
  employee: any
  managers: Manager[]
  row: any                 // day row (work_date, attendance, shift_assignment, overtimes, leave, ...)
  shiftTemplates: any[]
  onClose: () => void
  onSaved: () => void      // call after save to reload day
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  approved: { label: "อนุมัติ", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  rejected: { label: "ปฏิเสธ", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  cancelled: { label: "ยกเลิก", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  present: { label: "มาทำงาน", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  late: { label: "มาสาย", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  absent: { label: "ขาดงาน", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  early_out: { label: "กลับก่อน", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  leave: { label: "ลา", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  holiday: { label: "วันหยุดนักขัตฤกษ์", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  day_off: { label: "วันหยุดพนักงาน", cls: "bg-slate-100 text-slate-600 border-slate-200" },
}

const fmtTime = (ts?: string | null) => {
  if (!ts) return "—"
  try { return format(new Date(ts), "HH:mm") } catch { return "—" }
}

// ───────────────────────────────────────────────────────────────────
// Modal shell — header + body + footer
// ───────────────────────────────────────────────────────────────────
export function ModalShell({
  title, subtitle, status, headerColor = "teal",
  onClose, children, footer,
}: {
  title: string
  subtitle?: string
  status?: { label: string; cls: string }
  headerColor?: "teal" | "blue" | "red"
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const headerGradient = {
    teal: "from-teal-500 to-cyan-500",
    blue: "from-blue-500 to-indigo-500",
    red: "from-rose-500 to-red-500",
  }[headerColor]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerGradient} px-6 py-4 text-white flex items-center justify-between`}>
          <div>
            <h2 className="text-lg font-black">{title}</h2>
            {subtitle && <p className="text-xs opacity-90 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-white/90 ${status.cls.replace(/bg-\S+\s*/, "")}`}>
                {status.label}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20"><X size={18} /></button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-100 px-6 py-3 flex justify-end gap-2 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Approval chain — list managers / HR
// ───────────────────────────────────────────────────────────────────
function ApprovalChain({ reviewedById, reviewerName, reviewedAt, reviewNote, managers }: {
  reviewedById?: string | null
  reviewerName?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  managers: Manager[]
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
        <p className="text-xs font-black text-slate-600">ลำดับขั้นการอนุมัติ</p>
      </div>
      <div className="p-3 space-y-2">
        {reviewedById && reviewerName && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
            <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800">
              {reviewerName?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{reviewerName}</p>
              <p className="text-[11px] text-slate-500">
                อนุมัติแล้ว{reviewedAt ? ` · ${format(new Date(reviewedAt), "d MMM yyyy HH:mm", { locale: th })}` : ""}
              </p>
            </div>
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          </div>
        )}
        {managers.length === 0 && !reviewedById && (
          <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีหัวหน้าที่กำหนดไว้</p>
        )}
        {managers.map((m, i) => (
          <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-black text-slate-600">
              {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.first_name_th?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {m.first_name_th} {m.last_name_th}
                {m.nickname && <span className="text-xs text-slate-400 ml-1.5">({m.nickname})</span>}
              </p>
              <p className="text-[11px] text-slate-500">ผู้อนุมัติขั้นที่ {i + 1}{m.position ? ` · ${m.position}` : ""}</p>
            </div>
          </div>
        ))}
        {reviewNote && (
          <div className="border-t border-slate-100 pt-2 mt-2">
            <p className="text-[11px] font-bold text-slate-500 mb-1">หมายเหตุ:</p>
            <p className="text-xs text-slate-700">{reviewNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Info row helper
// ───────────────────────────────────────────────────────────────────
function InfoRow({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[11px] font-bold text-slate-500 mb-1">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  )
}

const fld = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"

// ───────────────────────────────────────────────────────────────────
// 1) AttendanceDetail — view/edit clock in/out
// ───────────────────────────────────────────────────────────────────
export function AttendanceDetail({ employee, managers, row, onClose, onSaved }: BaseProps) {
  const att = row.attendance
  const sh = row.shift_assignment
  const shiftTpl = sh?.shift as any
  // ถ้ายังไม่มีบันทึก → เปิด edit mode ทันที (สำหรับสร้างใหม่ — รวมวันหยุดที่มีคนมาทำงาน)
  const [editing, setEditing] = useState(!att?.id)
  const [clockIn, setClockIn] = useState(att?.clock_in ? fmtTime(att.clock_in) : "")
  const [clockOut, setClockOut] = useState(att?.clock_out ? fmtTime(att.clock_out) : "")
  const [saving, setSaving] = useState(false)

  const status = att?.status ? STATUS_BADGE[att.status] : undefined

  const save = async () => {
    if (!clockIn && !clockOut) { toast.error("กรอกเวลาเข้าหรือเวลาออกอย่างน้อย 1 ช่อง"); return }
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const body: any = att?.id
        ? { record_id: att.id }
        : { employee_id: employee.id, work_date: row.work_date }
      if (clockIn) body.clock_in = clockIn
      if (clockOut) body.clock_out = clockOut
      const res = await fetch("/api/attendance/admin-edit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ")
      toast.success(att?.id ? "บันทึกแล้ว — คำนวณเงินเดือนใหม่อัตโนมัติ" : "เพิ่มบันทึกการเข้างานแล้ว", { id: t })
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="รายละเอียดการเข้างาน"
      subtitle={`${format(new Date(row.work_date), "EEEE d MMMM yyyy", { locale: th })}`}
      status={status}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ปิด</button>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} บันทึก
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center gap-1.5">
              <Pencil size={13} /> แก้ไข
            </button>
          )}
        </>
      }
    >
      {/* Day summary card */}
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-teal-100 rounded-xl p-4 text-center">
        <p className="text-xl font-black text-slate-800">{format(new Date(row.work_date), "d MMMM yyyy", { locale: th })}</p>
        <p className="text-sm text-slate-600 mt-1">
          สถานะ: <span className="font-bold">{sh?.assignment_type === "dayoff" ? "วันหยุดพนักงาน" : sh?.assignment_type === "holiday" ? "วันหยุดนักขัตฤกษ์" : "วันทำงาน"}</span>
        </p>
        {shiftTpl?.work_start && (
          <p className="text-sm text-slate-600">
            กะการทำงาน: <span className="font-bold">{shiftTpl.name}</span> <span className="font-mono">{shiftTpl.work_start.slice(0, 5)} – {shiftTpl.work_end?.slice(0, 5)}</span>
          </p>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="ชื่อพนักงาน">
          {employee?.first_name_th} {employee?.last_name_th}
          {employee?.nickname && <span className="text-xs text-slate-400 ml-1.5">({employee.nickname})</span>}
        </InfoRow>
        <InfoRow label="รหัสพนักงาน">{employee?.employee_code}</InfoRow>

        <InfoRow label="เวลาเข้างาน">
          {editing ? (
            <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)} className={fld} />
          ) : (
            <span className="font-mono text-base font-bold">{fmtTime(att?.clock_in)}</span>
          )}
        </InfoRow>
        <InfoRow label="เวลาออกงาน">
          {editing ? (
            <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)} className={fld} />
          ) : (
            <span className="font-mono text-base font-bold">{fmtTime(att?.clock_out)}</span>
          )}
        </InfoRow>

        <InfoRow label="มาสาย">
          {att?.late_minutes > 0
            ? <span className="text-amber-700 font-bold">{att.late_minutes} นาที</span>
            : <span className="text-slate-400">—</span>}
        </InfoRow>
        <InfoRow label="กลับก่อน">
          {att?.early_out_minutes > 0
            ? <span className="text-orange-700 font-bold">{att.early_out_minutes} นาที</span>
            : <span className="text-slate-400">—</span>}
        </InfoRow>

        <InfoRow label="OT ที่บันทึก">
          {att?.ot_minutes > 0 ? `${Math.floor(att.ot_minutes / 60)}.${String(att.ot_minutes % 60).padStart(2, "0")} ชม.` : <span className="text-slate-400">—</span>}
        </InfoRow>
        <InfoRow label="ชั่วโมงทำงาน">
          {att?.work_minutes > 0 ? `${Math.floor(att.work_minutes / 60)}.${String(att.work_minutes % 60).padStart(2, "0")} ชม.` : <span className="text-slate-400">—</span>}
        </InfoRow>

        {att?.note && <InfoRow label="หมายเหตุ" full>{att.note}</InfoRow>}
      </div>

      {editing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">หมายเหตุ:</span> เมื่อบันทึกแล้ว ระบบจะคำนวณ "สาย / กลับก่อน / สถานะ" ใหม่อัตโนมัติ (ตาม grace period ของแผนก/บริษัท) และอัปเดตการคำนวณเงินเดือนทันที
          </p>
        </div>
      )}

      <ApprovalChain managers={managers} />
    </ModalShell>
  )
}

// ───────────────────────────────────────────────────────────────────
// 2) OTDetail — view/edit/delete OT
// ───────────────────────────────────────────────────────────────────
export function OTDetail({ employee, managers, row, ot, onClose, onSaved }: BaseProps & { ot: any | null }) {
  const supabase = createClient()
  const att = row.attendance
  const sh = row.shift_assignment
  const shiftTpl = sh?.shift as any
  const [editing, setEditing] = useState(!ot) // ถ้าไม่มี ot → mode add ตรงๆ
  const [otStart, setOtStart] = useState(ot?.ot_start ? fmtTime(ot.ot_start) : "")
  const [otEnd, setOtEnd] = useState(ot?.ot_end ? fmtTime(ot.ot_end) : "")
  const [otRate, setOtRate] = useState(String(ot?.ot_rate ?? "1.5"))
  const [reason, setReason] = useState(ot?.reason ?? "")
  const [reviewerName, setReviewerName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!ot?.reviewed_by) return
    supabase.from("employees").select("first_name_th, last_name_th, nickname")
      .eq("id", ot.reviewed_by).maybeSingle()
      .then(({ data }) => {
        if (data) setReviewerName(`${data.first_name_th} ${data.last_name_th}${data.nickname ? ` (${data.nickname})` : ""}`)
      })
  }, [ot?.reviewed_by])

  const status = ot?.status ? STATUS_BADGE[ot.status] : { label: "ยังไม่มี", cls: "bg-slate-100 text-slate-500 border-slate-200" }
  const otHours = (() => {
    if (!otStart || !otEnd) return 0
    const [sh1, sm] = otStart.split(":").map(Number)
    const [eh, em] = otEnd.split(":").map(Number)
    const mins = (eh * 60 + em) - (sh1 * 60 + sm)
    return mins > 0 ? mins / 60 : 0
  })()

  const save = async () => {
    if (!otStart || !otEnd) { toast.error("กรอกเวลาเริ่ม-สิ้นสุด"); return }
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const payload = {
        employee_id: employee.id,
        company_id: employee.company_id,
        work_date: row.work_date,
        ot_start: `${row.work_date}T${otStart}:00+07:00`,
        ot_end: `${row.work_date}T${otEnd}:00+07:00`,
        ot_rate: Number(otRate) || 1.5,
        reason: reason || "เพิ่มโดยแอดมิน",
        status: "approved",
        reviewed_at: new Date().toISOString(),
      }
      const op = ot?.id
        ? supabase.from("overtime_requests").update(payload).eq("id", ot.id)
        : supabase.from("overtime_requests").insert(payload)
      const { error } = await op
      if (error) throw error
      // ── sync attendance_records.ot_minutes จาก source of truth ──
      await fetch("/api/work-record/recompute-ot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employee.id, work_date: row.work_date }),
      }).catch(() => {})
      toast.success("บันทึกแล้ว — คำนวณเงินเดือนใหม่อัตโนมัติ", { id: t })
      onSaved(); onClose()
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!ot?.id) return
    if (!confirm("ลบรายการ OT นี้?")) return
    setDeleting(true)
    const t = toast.loading("กำลังลบ...")
    try {
      const { error } = await supabase.from("overtime_requests").delete().eq("id", ot.id)
      if (error) throw error
      // ── sync attendance_records.ot_minutes หลังลบ ──
      await fetch("/api/work-record/recompute-ot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employee.id, work_date: row.work_date }),
      }).catch(() => {})
      toast.success("ลบแล้ว", { id: t })
      onSaved(); onClose()
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ModalShell
      title={ot ? "รายละเอียดการขอ OT" : "เพิ่ม OT"}
      subtitle={`${format(new Date(row.work_date), "EEEE d MMMM yyyy", { locale: th })}`}
      status={status}
      headerColor="blue"
      onClose={onClose}
      footer={
        <>
          {ot?.id && !editing && (
            <button onClick={del} disabled={deleting}
              className="px-3 py-2 text-sm font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 flex items-center gap-1.5">
              <Trash2 size={13} /> ลบ
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ปิด</button>
          {editing ? (
            <>
              {ot && <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>}
              <button onClick={save} disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {ot ? "บันทึก" : "เพิ่ม OT"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center gap-1.5">
              <Pencil size={13} /> แก้ไข
            </button>
          )}
        </>
      }
    >
      {/* Day summary */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-100 rounded-xl p-4 text-center">
        <p className="text-xl font-black text-slate-800">{format(new Date(row.work_date), "d MMMM yyyy", { locale: th })}</p>
        <p className="text-sm text-slate-600 mt-1">
          สถานะวัน: <span className="font-bold">{sh?.assignment_type === "dayoff" ? "วันหยุดพนักงาน" : sh?.assignment_type === "holiday" ? "วันหยุดนักขัตฤกษ์" : "วันทำงาน"}</span>
        </p>
        {shiftTpl?.work_start && (
          <p className="text-sm text-slate-600">
            กะการทำงาน: <span className="font-bold">{shiftTpl.name}</span> <span className="font-mono">{shiftTpl.work_start.slice(0, 5)} – {shiftTpl.work_end?.slice(0, 5)}</span>
          </p>
        )}
        {att?.clock_in && (
          <p className="text-sm text-slate-700 mt-1 font-mono">
            (IN) {fmtTime(att.clock_in)} <span className="text-slate-300">→</span> (OUT) {fmtTime(att.clock_out)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="ชื่อพนักงาน">
          {employee?.first_name_th} {employee?.last_name_th}
          {employee?.nickname && <span className="text-xs text-slate-400 ml-1.5">({employee.nickname})</span>}
        </InfoRow>
        <InfoRow label="ประเภท OT">
          {editing ? (
            <select value={otRate} onChange={e => setOtRate(e.target.value)} className={fld}>
              <option value="1">โอทีล่วงเวลา (x1.0)</option>
              <option value="1.5">โอทีล่วงเวลา (x1.5)</option>
              <option value="2">โอทีวันหยุด (x2.0)</option>
              <option value="3">โอทีวันหยุดล่วงเวลา (x3.0)</option>
            </select>
          ) : (
            <span className="font-bold">โอที (x{ot?.ot_rate ?? "—"})</span>
          )}
        </InfoRow>

        <InfoRow label="ตั้งแต่เวลา">
          {editing ? (
            <input type="time" value={otStart} onChange={e => setOtStart(e.target.value)} className={fld} />
          ) : (
            <span className="font-mono text-base font-bold">{fmtTime(ot?.ot_start)}</span>
          )}
        </InfoRow>
        <InfoRow label="จนถึงเวลา">
          {editing ? (
            <input type="time" value={otEnd} onChange={e => setOtEnd(e.target.value)} className={fld} />
          ) : (
            <span className="font-mono text-base font-bold">{fmtTime(ot?.ot_end)}</span>
          )}
        </InfoRow>

        <InfoRow label="รายละเอียด" full>
          {editing ? (
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className={fld} placeholder="ระบุเหตุผล (ถ้ามี)" />
          ) : (
            <span className="text-slate-700">{ot?.reason || <span className="text-slate-400">—</span>}</span>
          )}
        </InfoRow>
      </div>

      {/* Calculation result */}
      {editing && otHours > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[11px] font-black text-emerald-700 mb-1">ผลการคำนวณ</p>
          <p className="text-sm text-emerald-800">
            ขอ OT <span className="font-bold">{otHours.toFixed(2)} ชั่วโมง</span> (x{otRate})
          </p>
        </div>
      )}

      <ApprovalChain
        managers={managers}
        reviewedById={ot?.reviewed_by}
        reviewerName={reviewerName}
        reviewedAt={ot?.reviewed_at}
        reviewNote={ot?.review_note}
      />
    </ModalShell>
  )
}

// ───────────────────────────────────────────────────────────────────
// 3) ShiftDetail — change shift / day type
// ───────────────────────────────────────────────────────────────────
type DayType = "work" | "dayoff" | "holiday"
const DAY_TYPE_LABEL: Record<DayType, string> = {
  work: "วันทำงาน",
  dayoff: "วันหยุดพนักงาน",
  holiday: "วันหยุดนักขัตฤกษ์",
}

export function ShiftDetail({ employee, managers, row, shiftTemplates, defaultShiftId, onClose, onSaved }: BaseProps & { defaultShiftId?: string | null }) {
  const sh = row.shift_assignment
  const att = row.attendance
  const currentType: DayType = sh?.assignment_type === "dayoff" ? "dayoff" :
    sh?.assignment_type === "holiday" ? "holiday" : "work"
  const [dayType, setDayType] = useState<DayType>(currentType)
  // pre-fill: assignment > default schedule profile > ""
  const [shiftId, setShiftId] = useState<string>(sh?.shift_id || defaultShiftId || "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const res = await fetch("/api/shifts/monthly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign", company_id: employee.company_id,
          assignments: [{
            employee_id: employee.id, work_date: row.work_date,
            // ⭐ ส่ง shift_id ได้กับทุก day type (วันหยุดก็อาจมีกะถ้าต้องมาทำงาน)
            shift_id: shiftId || null,
            assignment_type: dayType,
          }],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "บันทึกไม่สำเร็จ")
      toast.success("บันทึกแล้ว — คำนวณการเข้างานใหม่อัตโนมัติ", { id: t })
      onSaved(); onClose()
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="ตั้งค่ากะการทำงาน"
      subtitle={`${format(new Date(row.work_date), "EEEE d MMMM yyyy", { locale: th })}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ปิด</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} บันทึก
          </button>
        </>
      }
    >
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-teal-100 rounded-xl p-4 text-center">
        <p className="text-xl font-black text-slate-800">{format(new Date(row.work_date), "d MMMM yyyy", { locale: th })}</p>
        <p className="text-sm text-slate-600 mt-1">
          กำลังแก้ไขให้: <span className="font-bold">{employee?.first_name_th} {employee?.last_name_th}</span>
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-black text-slate-600 mb-2">ประเภทวัน</p>
          <div className="grid grid-cols-3 gap-2">
            {(["work", "dayoff", "holiday"] as DayType[]).map(t => (
              <button key={t} onClick={() => setDayType(t)}
                className={`px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                  dayType === t ? (t === "holiday" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-teal-400 bg-teal-50 text-teal-700") : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {DAY_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black text-slate-600 mb-2">
            เลือกกะ
            {dayType !== "work" && <span className="ml-1.5 font-normal text-[10px] text-amber-600">(ถ้ามีคนมาทำงานวันหยุด — ใส่กะได้)</span>}
          </p>
          <select value={shiftId} onChange={e => setShiftId(e.target.value)} className={fld}>
            <option value="">— ไม่กำหนดกะ —</option>
            {shiftTemplates.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.work_start?.slice(0, 5)} – {s.work_end?.slice(0, 5)})</option>
            ))}
          </select>
        </div>

        {att?.clock_in && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              วันนี้มีการเช็คอินแล้ว <span className="font-mono font-bold">{fmtTime(att.clock_in)}</span> หากเปลี่ยนกะ ระบบจะคำนวณ "สาย / กลับก่อน" ใหม่ตามกะที่เลือก
            </p>
          </div>
        )}

        {/* Sync notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-teal-800 leading-relaxed">
            <span className="font-bold">การเปลี่ยนกะนี้จะมีผลกับ:</span>
            <span className="block mt-0.5">• หน้า "จัดกะ" (ตารางกะรายเดือน)</span>
            <span className="block">• การคำนวณสาย / กลับก่อน / OT</span>
            <span className="block">• การคำนวณเงินเดือนรอบนี้</span>
            <span className="block">• แอปพนักงาน (หน้าตารางกะของตัวเอง)</span>
          </p>
        </div>
      </div>

      <ApprovalChain managers={managers} />
    </ModalShell>
  )
}

// ───────────────────────────────────────────────────────────────────
// 4) LeaveDetail — view leave (mostly read-only)
// ───────────────────────────────────────────────────────────────────
export function LeaveDetail({ employee, managers, row, onClose }: Omit<BaseProps, "onSaved" | "shiftTemplates">) {
  const supabase = createClient()
  const [leaveDetail, setLeaveDetail] = useState<any>(row.leave)
  const [reviewerName, setReviewerName] = useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; entitled: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!row.leave) return
    // normalize start_date (กัน timestamp string)
    const startDate = typeof row.leave.start_date === "string" ? row.leave.start_date.slice(0, 10) : row.leave.start_date
    Promise.all([
      supabase.from("leave_requests")
        .select("*, leave_type:leave_types(id, name, color_hex, days_per_year, is_paid)")
        .eq("employee_id", employee.id)
        .eq("start_date", startDate)
        .limit(1)
        .maybeSingle(),
    ]).then(([lvRes]) => {
      if (lvRes.error) console.error("[leave_detail]", lvRes.error)
      if (lvRes.data) {
        setLeaveDetail(lvRes.data)
        if (lvRes.data.reviewed_by) {
          supabase.from("employees").select("first_name_th, last_name_th, nickname")
            .eq("id", lvRes.data.reviewed_by).maybeSingle()
            .then(({ data }) => {
              if (data) setReviewerName(`${data.first_name_th} ${data.last_name_th}${data.nickname ? ` (${data.nickname})` : ""}`)
            })
        }
        const ltId = (lvRes.data.leave_type as any)?.id
        if (ltId) {
          supabase.from("leave_balances")
            .select("entitled_days, used_days")
            .eq("employee_id", employee.id)
            .eq("leave_type_id", ltId)
            .eq("year", new Date(row.leave.start_date).getFullYear())
            .maybeSingle()
            .then(({ data }) => {
              if (data) setQuotaInfo({ used: data.used_days, entitled: data.entitled_days })
            })
        }
      }
      setLoading(false)
    })
  }, [row.leave, employee.id])

  const status = leaveDetail?.status ? STATUS_BADGE[leaveDetail.status] : undefined
  const leaveType: any = leaveDetail?.leave_type

  return (
    <ModalShell
      title="รายละเอียดการลา"
      subtitle={`${format(new Date(row.work_date), "EEEE d MMMM yyyy", { locale: th })}`}
      status={status}
      headerColor="blue"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">ปิด</button>
      }
    >
      {loading && !leaveDetail ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-teal-500" /></div>
      ) : !leaveDetail ? (
        <p className="text-center text-slate-400 py-8">ไม่พบข้อมูลการลา</p>
      ) : (
        <>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 text-center">
            <p className="text-xl font-black text-slate-800">
              {format(new Date(leaveDetail.start_date), "d MMM", { locale: th })}
              {leaveDetail.start_date !== leaveDetail.end_date && ` – ${format(new Date(leaveDetail.end_date), "d MMM yyyy", { locale: th })}`}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-bold">{leaveType?.name || "ลา"}</span> · {leaveDetail.total_days?.toFixed(2)} วัน
              {leaveDetail.is_half_day && ` (ครึ่งวัน${leaveDetail.half_day_period === "morning" ? "เช้า" : "บ่าย"})`}
            </p>
            {quotaInfo && (
              <p className="text-xs text-slate-500 mt-1">
                โควต้าการลา: <span className="font-bold">{quotaInfo.used.toFixed(2)} / {quotaInfo.entitled.toFixed(2)} วัน</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="ชื่อพนักงาน">
              {employee?.first_name_th} {employee?.last_name_th}
            </InfoRow>
            <InfoRow label="ประเภทการลา">
              <span className="inline-flex items-center gap-1.5">
                {leaveType?.color_hex && <span className="w-2 h-2 rounded-full" style={{ background: leaveType.color_hex }} />}
                <span className="font-bold">{leaveType?.name || "—"}</span>
                {leaveType?.is_paid && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">มีค่าจ้าง</span>}
              </span>
            </InfoRow>

            <InfoRow label="ตั้งแต่วันที่">{format(new Date(leaveDetail.start_date), "d MMM yyyy", { locale: th })}</InfoRow>
            <InfoRow label="จนถึงวันที่">{format(new Date(leaveDetail.end_date), "d MMM yyyy", { locale: th })}</InfoRow>

            {leaveDetail.reason && <InfoRow label="เหตุผล" full>{leaveDetail.reason}</InfoRow>}
            {leaveDetail.attachment_url && (
              <InfoRow label="ไฟล์แนบ" full>
                <a href={leaveDetail.attachment_url} target="_blank" rel="noreferrer"
                  className="text-teal-600 hover:underline text-sm font-bold">{leaveDetail.attachment_name || "เปิดไฟล์"}</a>
              </InfoRow>
            )}
          </div>

          <ApprovalChain
            managers={managers}
            reviewedById={leaveDetail.reviewed_by}
            reviewerName={reviewerName}
            reviewedAt={leaveDetail.reviewed_at}
            reviewNote={leaveDetail.review_note}
          />

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">
              💡 หากต้องการอนุมัติ/ปฏิเสธ/ยกเลิก ไปที่หน้า{" "}
              <a href="/admin/approvals" className="text-teal-600 font-bold hover:underline">คำร้องรอพิจารณา</a>
            </p>
          </div>
        </>
      )}
    </ModalShell>
  )
}
