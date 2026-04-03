"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ScrollText, Search, ChevronLeft, ChevronRight, Filter, Clock, User, FileText,
  RefreshCw, CheckCircle2, XCircle, Calculator, PlusCircle, Pencil, Trash2, Ban,
  Send, Mail, KeyRound, Shield, UserCog, Briefcase, CalendarDays, MapPin,
  Megaphone, Truck, Wrench, ClipboardCheck, Target, UserX, RotateCcw
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { th } from "date-fns/locale"

// ── Action badge colors ──
const ACTION_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  calculate: "bg-blue-100 text-blue-700 border-blue-200",
  bulk_calculate: "bg-blue-100 text-blue-700 border-blue-200",
  create: "bg-indigo-100 text-indigo-700 border-indigo-200",
  update: "bg-amber-100 text-amber-700 border-amber-200",
  edit: "bg-amber-100 text-amber-700 border-amber-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  deactivate: "bg-red-100 text-red-700 border-red-200",
  submit: "bg-violet-100 text-violet-700 border-violet-200",
  change: "bg-orange-100 text-orange-700 border-orange-200",
  reset: "bg-pink-100 text-pink-700 border-pink-200",
  cancel: "bg-slate-100 text-slate-600 border-slate-200",
  force: "bg-red-100 text-red-700 border-red-200",
}

// ── Icon for each action (Lucide components) ──
function ActionIcon({ action, size: s }: { action: string; size?: number }) {
  const size = s || 14
  if (action.includes("approved") || action.includes("approve")) return <CheckCircle2 size={size} className="text-green-600 flex-shrink-0" />
  if (action.includes("rejected") || action.includes("reject")) return <XCircle size={size} className="text-red-500 flex-shrink-0" />
  if (action.includes("calculate")) return <Calculator size={size} className="text-blue-600 flex-shrink-0" />
  if (action.includes("create")) return <PlusCircle size={size} className="text-indigo-600 flex-shrink-0" />
  if (action.includes("delete")) return <Trash2 size={size} className="text-red-500 flex-shrink-0" />
  if (action.includes("deactivate")) return <UserX size={size} className="text-red-500 flex-shrink-0" />
  if (action.includes("submit")) return <Send size={size} className="text-violet-600 flex-shrink-0" />
  if (action.includes("change_email")) return <Mail size={size} className="text-orange-600 flex-shrink-0" />
  if (action.includes("reset_password")) return <KeyRound size={size} className="text-pink-600 flex-shrink-0" />
  if (action.includes("role")) return <Shield size={size} className="text-indigo-600 flex-shrink-0" />
  if (action.includes("supervisor")) return <UserCog size={size} className="text-amber-600 flex-shrink-0" />
  if (action.includes("cancel") || action.includes("force")) return <Ban size={size} className="text-red-500 flex-shrink-0" />
  if (action.includes("update") || action.includes("edit")) return <Pencil size={size} className="text-amber-600 flex-shrink-0" />
  return <FileText size={size} className="text-slate-400 flex-shrink-0" />
}

// ── Entity type icon ──
function EntityIcon({ type }: { type: string }) {
  const size = 11
  const cls = "flex-shrink-0 text-slate-400"
  if (type.includes("leave")) return <CalendarDays size={size} className={cls} />
  if (type.includes("overtime")) return <Clock size={size} className={cls} />
  if (type.includes("time_adjustment")) return <RotateCcw size={size} className={cls} />
  if (type.includes("payroll")) return <Briefcase size={size} className={cls} />
  if (type.includes("employee") || type.includes("user")) return <User size={size} className={cls} />
  if (type.includes("shift")) return <CalendarDays size={size} className={cls} />
  if (type.includes("probation")) return <ClipboardCheck size={size} className={cls} />
  if (type.includes("kpi")) return <Target size={size} className={cls} />
  if (type.includes("equipment")) return <Wrench size={size} className={cls} />
  if (type.includes("transport")) return <Truck size={size} className={cls} />
  if (type.includes("offsite")) return <MapPin size={size} className={cls} />
  if (type.includes("announcement")) return <Megaphone size={size} className={cls} />
  if (type.includes("resignation")) return <UserX size={size} className={cls} />
  return <FileText size={size} className={cls} />
}

function getActionColor(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return cls
  }
  return "bg-slate-100 text-slate-600 border-slate-200"
}

// Map entity_type to Thai label
const ENTITY_TYPE_LABELS: Record<string, string> = {
  leave_request: "คำขอลา",
  overtime_request: "คำขอ OT",
  time_adjustment_request: "แก้ไขเวลา",
  payroll: "เงินเดือน",
  employee: "พนักงาน",
  user: "สิทธิ์ผู้ใช้",
  shift_change_request: "เปลี่ยนกะ",
  shift_template: "ตั้งค่ากะ",
  resignation_request: "ลาออก",
  probation_evaluation: "ทดลองงาน",
  kpi_form: "KPI",
  equipment_request: "อุปกรณ์",
  transport_claim: "ค่าเดินทาง",
  offsite_checkin_request: "เช็คอินนอกสถานที่",
  announcement: "ประกาศ",
  position: "ตำแหน่ง",
}

function getEntityTypeLabel(type: string) {
  return ENTITY_TYPE_LABELS[type] || type.replace(/_/g, " ")
}

// Map action to readable Thai label
function getActionLabel(action: string): string {
  const MAP: Record<string, string> = {
    approved_leave: "อนุมัติลา",
    rejected_leave: "ปฏิเสธลา",
    approved_overtime: "อนุมัติ OT",
    rejected_overtime: "ปฏิเสธ OT",
    approved_time_adjustment: "อนุมัติแก้เวลา",
    rejected_time_adjustment: "ปฏิเสธแก้เวลา",
    approved_resignation: "อนุมัติลาออก",
    rejected_resignation: "ปฏิเสธลาออก",
    approved_shift_change: "อนุมัติเปลี่ยนกะ",
    rejected_shift_change: "ปฏิเสธเปลี่ยนกะ",
    employee_create: "สร้างพนักงาน",
    employee_update: "แก้ไขพนักงาน",
    employee_deactivate: "ปิดการใช้งาน",
    employee_update_salary: "แก้ไขเงินเดือน",
    employee_update_supervisor: "เปลี่ยนหัวหน้า",
    payroll_calculate: "คำนวณเงินเดือน",
    payroll_bulk_calculate: "คำนวณเงินเดือน (batch)",
    payroll_approve: "อนุมัติเงินเดือน",
    payroll_edit: "แก้ไขเงินเดือน",
    update_role: "เปลี่ยนสิทธิ์",
    change_email: "เปลี่ยนอีเมล",
    admin_reset_password: "รีเซ็ตรหัสผ่าน",
    approved_probation_eval: "อนุมัติทดลองงาน",
    rejected_probation_eval: "ส่งคืนทดลองงาน",
    submit_probation_eval: "ส่งประเมินทดลองงาน",
    approved_kpi: "อนุมัติ KPI",
    rejected_kpi: "ส่งคืน KPI",
    approved_equipment: "อนุมัติยืมอุปกรณ์",
    rejected_equipment: "ปฏิเสธยืมอุปกรณ์",
    approved_transport_claim: "อนุมัติค่าเดินทาง",
    rejected_transport_claim: "ปฏิเสธค่าเดินทาง",
    approved_offsite_checkin: "อนุมัติเช็คอินนอกสถานที่",
    rejected_offsite_checkin: "ปฏิเสธเช็คอินนอกสถานที่",
    create_announcement: "สร้างประกาศ",
    update_announcement: "แก้ไขประกาศ",
    delete_announcement: "ลบประกาศ",
    create_shift_template: "สร้างกะ",
    update_shift_template: "แก้ไขกะ",
    request_cancel: "ขอยกเลิกคำขอ",
    approve_cancel_request: "อนุมัติยกเลิก",
    force_cancel_request: "ยกเลิกโดย HR",
    add_allowed_location: "เพิ่มสถานที่เช็คอิน",
    remove_allowed_location: "ลบสถานที่เช็คอิน",
    create_position: "สร้างตำแหน่ง",
  }
  return MAP[action] || action.replace(/_/g, " ")
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filterType, setFilterType] = useState("")
  const [search, setSearch] = useState("")
  const pageSize = 30

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) })
    if (filterType) params.set("entity_type", filterType)
    const res = await fetch(`/api/admin/audit-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, filterType])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? logs.filter(l => l.description?.toLowerCase().includes(search.toLowerCase()) || l.actor_name?.toLowerCase().includes(search.toLowerCase()) || l.action?.includes(search.toLowerCase()))
    : logs

  const totalPages = Math.ceil(total / pageSize)

  const ENTITY_TYPES = [
    { value: "", label: "ทุกประเภท" },
    { value: "leave_request", label: "คำขอลา" },
    { value: "overtime_request", label: "คำขอ OT" },
    { value: "time_adjustment_request", label: "แก้ไขเวลา" },
    { value: "payroll", label: "เงินเดือน" },
    { value: "employee", label: "พนักงาน" },
    { value: "user", label: "สิทธิ์ผู้ใช้" },
    { value: "shift_template", label: "ตั้งค่ากะ" },
    { value: "shift_change_request", label: "เปลี่ยนกะ" },
    { value: "resignation_request", label: "ลาออก" },
    { value: "probation_evaluation", label: "ประเมินทดลองงาน" },
    { value: "kpi_form", label: "KPI" },
    { value: "equipment_request", label: "ยืม/คืนอุปกรณ์" },
    { value: "transport_claim", label: "เบิกค่าเดินทาง" },
    { value: "offsite_checkin_request", label: "เช็คอินนอกสถานที่" },
    { value: "announcement", label: "ประกาศ" },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
            <ScrollText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">บันทึกกิจกรรม</h1>
            <p className="text-xs text-slate-400">ประวัติการดำเนินการทั้งหมดในระบบ · {total.toLocaleString()} รายการ</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
          <RefreshCw size={12} /> รีเฟรช
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white rounded-xl border border-slate-200 px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อคนทำ, รายละเอียด..."
            className="flex-1 text-sm outline-none" />
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-3 py-2">
          <Filter size={14} className="text-slate-400" />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}
            className="text-sm outline-none bg-transparent">
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ScrollText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">ยังไม่มีประวัติ</p>
            <p className="text-xs mt-1">กิจกรรมทั้งหมดจะถูกบันทึกที่นี่</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(log => (
              <div key={log.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ActionIcon action={log.action} size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Action badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      {/* Entity type */}
                      {log.entity_type && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                          <EntityIcon type={log.entity_type} />
                          {getEntityTypeLabel(log.entity_type)}
                        </span>
                      )}
                      {/* Actor */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <User size={10} /> {log.actor_name || "ระบบ"}
                      </span>
                      {/* Time ago */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {formatDistanceToNow(new Date(log.created_at), { locale: th, addSuffix: true })}
                      </span>
                    </div>
                    {/* Metadata changes */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && log.metadata.changes && (
                      <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-[11px] text-slate-500 space-y-0.5">
                        {Object.entries(log.metadata.changes as Record<string, { old: any; new: any }>).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-600">{key}:</span>
                            <span className="text-red-400 line-through">{String(val.old)}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-green-600 font-medium">{String(val.new)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-slate-300 flex-shrink-0 whitespace-nowrap text-right">
                    <div>{format(new Date(log.created_at), "d MMM", { locale: th })}</div>
                    <div>{format(new Date(log.created_at), "HH:mm")}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30 hover:text-indigo-600 transition-colors">
              <ChevronLeft size={14} /> ก่อนหน้า
            </button>
            <span className="text-xs text-slate-400">
              หน้า <span className="font-bold text-slate-600">{page + 1}</span> / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30 hover:text-indigo-600 transition-colors">
              ถัดไป <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
