"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft, Sparkles, Phone, Mail, CalendarDays, CreditCard, Building2,
  ChevronLeft, ChevronRight, Pencil, Plus, ExternalLink,
  FileText, Receipt, Calendar, CheckCircle2, RefreshCw, Loader2,
} from "lucide-react"
import Link from "next/link"
import { format, addMonths, subMonths } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import { AttendanceDetail, OTDetail, ShiftDetail, LeaveDetail, type Manager } from "./DetailModal"

type Tab = "schedule" | "documents" | "payroll"
type DayType = "work" | "dayoff" | "holiday"

const inp = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 transition-all"
const TH_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

// รอบเงินเดือน: 22 ของเดือนก่อน → 21 ของเดือนปัจจุบัน
function payrollPeriod(year: number, month: number) {
  const prevM = month === 1 ? 12 : month - 1
  const prevY = month === 1 ? year - 1 : year
  const from = `${prevY}-${String(prevM).padStart(2, "0")}-22`
  const to = `${year}-${String(month).padStart(2, "0")}-21`
  return { from, to, label: `${TH_MONTHS[month]} ${year + 543}` }
}

const DAY_TYPE_LABEL: Record<DayType, string> = {
  work: "วันทำงาน",
  dayoff: "วันหยุดพนักงาน",
  holiday: "วันหยุดนักขัตฤกษ์",
}
const DAY_TYPE_STYLE: Record<DayType, string> = {
  work: "text-slate-500",
  dayoff: "text-slate-500",
  holiday: "text-rose-600",
}

const STATUS_BADGE: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-rose-50 text-rose-700",
  leave: "bg-violet-50 text-violet-700",
  wfh: "bg-sky-50 text-sky-700",
  holiday: "bg-slate-50 text-slate-500",
  day_off: "bg-slate-50 text-slate-500",
  early_out: "bg-orange-50 text-orange-700",
}
const STATUS_LABEL: Record<string, string> = {
  present: "มาทำงาน", late: "สาย", absent: "ขาดงาน", leave: "ลา",
  wfh: "WFH", holiday: "วันหยุด", day_off: "วันหยุด", early_out: "กลับก่อน",
}

const fmtTime = (ts?: string | null) => {
  if (!ts) return ""
  try { return format(new Date(ts), "HH:mm") } catch { return "" }
}
const minToHM = (m?: number | null) => {
  if (!m) return ""
  const h = Math.floor(m / 60); const mm = m % 60
  return h > 0 ? `${h}.${String(mm).padStart(2, "0")} ชม.` : `${mm} นาที`
}

export default function WorkRecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [emp, setEmp] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([])
  const [defaultShiftId, setDefaultShiftId] = useState<string | null>(null)  // fallback กะมาตรฐานของพนักงาน
  const [managers, setManagers] = useState<Manager[]>([])
  const [monthDate, setMonthDate] = useState<Date>(new Date())
  const [recalculating, setRecalculating] = useState(false)
  const [tab, setTab] = useState<Tab>("schedule")

  const [days, setDays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── modal state ──────────────────────────────────────────────────
  const [modal, setModal] = useState<
    | { kind: "attendance"; row: any }
    | { kind: "ot"; row: any; ot: any | null }
    | { kind: "shift"; row: any }
    | { kind: "leave"; row: any }
    | null
  >(null)

  const [documents, setDocuments] = useState<any[]>([])
  const [payslips, setPayslips] = useState<any[]>([])

  // ── load employee profile + salary + shift templates ──────────────
  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from("employees")
        .select(`*, position:positions(name), department:departments(name),
                 branch:branches(name), company:companies(id, code, name_th)`)
        .eq("id", id).single(),
      supabase.from("salary_structures")
        .select("base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing")
        .eq("employee_id", id).is("effective_to", null)
        .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([eRes, sRes]) => {
      setEmp(eRes.data)
      setSalary(sRes.data)
      const cid = (eRes.data as any)?.company_id
      if (cid) {
        supabase.from("shift_templates")
          .select("id, name, work_start, work_end")
          .eq("company_id", cid)
          .order("work_start")
          .then(({ data }) => setShiftTemplates(data ?? []))
      }
      // ── load default shift จาก schedule profile (fallback กะมาตรฐาน) ──
      supabase.from("employee_schedule_profiles")
        .select("default_shift_id")
        .eq("employee_id", id)
        .maybeSingle()
        .then(({ data }) => setDefaultShiftId(data?.default_shift_id ?? null))
      // ── load approval chain (managers) ────────────────────────
      supabase.from("employee_manager_history")
        .select("manager:employees!manager_id(id, first_name_th, last_name_th, nickname, avatar_url, position:positions(name))")
        .eq("employee_id", id).is("effective_to", null)
        .then(({ data }) => {
          const list: Manager[] = (data ?? [])
            .map((r: any) => r.manager).filter(Boolean)
            .map((m: any) => ({
              id: m.id, first_name_th: m.first_name_th, last_name_th: m.last_name_th,
              nickname: m.nickname, avatar_url: m.avatar_url,
              position: m.position?.name ?? null,
            }))
          setManagers(list)
        })
    })
  }, [id])

  // ── period (รอบเงินเดือน 22 → 21) ────────────────────────────────
  const period = useMemo(() => payrollPeriod(monthDate.getFullYear(), monthDate.getMonth() + 1), [monthDate])

  // ── load period days (shift + attendance + leave + ot) ────────────
  const loadMonth = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const from = period.from
      const to = period.to

      // ใช้ API endpoint ที่ใช้ service client → bypass RLS, ดึงข้อมูลครบจากตารางเดียวกับหน้าจัดกะ/เงินเดือน
      const res = await fetch(`/api/work-record/period?employee_id=${id}&from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        console.error("[work-record/period]", data.error || "load failed")
        setDays([])
        return
      }

      // sync shift templates + default shift จาก API response
      if (Array.isArray(data.shift_templates) && data.shift_templates.length > 0) {
        setShiftTemplates(data.shift_templates)
      }
      if (data.default_shift_id !== undefined) {
        setDefaultShiftId(data.default_shift_id)
      }

      const attMap = new Map<string, any>((data.attendance ?? []).map((r: any) => [r.work_date, r]))
      const shiftMap = new Map<string, any>((data.assignments ?? []).map((r: any) => [r.work_date, r]))
      const otByDate = new Map<string, any[]>()
      for (const o of (data.overtimes ?? [])) {
        if (!otByDate.has(o.work_date)) otByDate.set(o.work_date, [])
        otByDate.get(o.work_date)!.push(o)
      }
      // normalize start_date/end_date เป็น "YYYY-MM-DD" (กัน timestamp string)
      const leaves = (data.leaves ?? []).map((lv: any) => ({
        ...lv,
        start_date: typeof lv.start_date === "string" ? lv.start_date.slice(0, 10) : lv.start_date,
        end_date:   typeof lv.end_date   === "string" ? lv.end_date.slice(0, 10)   : lv.end_date,
      }))

      // Build day rows (รอบเงินเดือน 22 prev → 21 current)
      const [fy, fm, fd] = from.split("-").map(Number)
      const [ty, tm, td] = to.split("-").map(Number)
      const start = new Date(fy, fm - 1, fd)
      const end = new Date(ty, tm - 1, td)
      const rows: any[] = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dStr = format(d, "yyyy-MM-dd")
        const att = attMap.get(dStr)
        const sh = shiftMap.get(dStr)
        const ots = otByDate.get(dStr) || []
        const onLeave = leaves.find((lv: any) => dStr >= lv.start_date && dStr <= lv.end_date)
        rows.push({
          work_date: dStr,
          dow: new Date(d).getDay(),
          attendance: att,
          shift_assignment: sh,
          overtimes: ots,
          leave: onLeave,
        })
      }
      setDays(rows)
    } finally {
      setLoading(false)
    }
  }, [id, period.from, period.to])

  useEffect(() => { loadMonth() }, [loadMonth])

  // ── load documents tab data on demand ─────────────────────────────
  useEffect(() => {
    if (tab !== "documents" || !id) return
    Promise.all([
      supabase.from("leave_requests")
        .select("id, leave_type:leave_types(name), start_date, end_date, total_days, status, reason, requested_at")
        .eq("employee_id", id).order("requested_at", { ascending: false }).limit(50),
      supabase.from("overtime_requests")
        .select("id, work_date, ot_start, ot_end, ot_rate, status, reason, created_at")
        .eq("employee_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("time_adjustment_requests")
        .select("id, work_date, request_type, requested_clock_in, requested_clock_out, status, reason, created_at")
        .eq("employee_id", id).order("created_at", { ascending: false }).limit(50),
    ]).then(([lv, ot, adj]) => {
      const docs = [
        ...((lv.data ?? []).map((r: any) => ({ kind: "leave", title: `ลา ${(r.leave_type as any)?.name || ""}`, date: r.start_date, end: r.end_date, status: r.status, when: r.requested_at, reason: r.reason, meta: `${r.total_days} วัน` }))),
        ...((ot.data ?? []).map((r: any) => ({ kind: "ot", title: `OT (x${r.ot_rate})`, date: r.work_date, status: r.status, when: r.created_at, reason: r.reason, meta: `${fmtTime(r.ot_start)}–${fmtTime(r.ot_end)}` }))),
        ...((adj.data ?? []).map((r: any) => {
          const parts: string[] = []
          if (r.requested_clock_in) parts.push(`เข้า ${fmtTime(r.requested_clock_in)}`)
          if (r.requested_clock_out) parts.push(`ออก ${fmtTime(r.requested_clock_out)}`)
          return { kind: "adj", title: "แก้ไขเวลา", date: r.work_date, status: r.status, when: r.created_at, reason: r.reason, meta: parts.join(" / ") || "—" }
        })),
      ].sort((a, b) => (b.when || "").localeCompare(a.when || ""))
      setDocuments(docs)
    })
  }, [tab, id])

  // ── load payslips on demand ───────────────────────────────────────
  useEffect(() => {
    if (tab !== "payroll" || !id) return
    supabase.from("payroll_records")
      .select("id, year, month, base_salary, gross_income, net_salary, total_deductions, monthly_tax_withheld, social_security_amount, ot_amount, status")
      .eq("employee_id", id).order("year", { ascending: false }).order("month", { ascending: false }).limit(24)
      .then(({ data }) => setPayslips(data ?? []))
  }, [tab, id])

  // ── monthly summary ────────────────────────────────────────────────
  const summary = useMemo(() => {
    const s = { present: 0, late: 0, absent: 0, leave: 0, otMin: 0, lateMin: 0 }
    for (const d of days) {
      const a = d.attendance
      if (!a) continue
      if (a.status === "present") s.present++
      else if (a.status === "late") { s.late++; s.present++; s.lateMin += a.late_minutes || 0 }
      else if (a.status === "absent") s.absent++
      else if (a.status === "leave") s.leave++
      if (a.ot_minutes) s.otMin += a.ot_minutes
    }
    return s
  }, [days])

  const totalSalary = useMemo(() => {
    if (!salary) return 0
    return (salary.base_salary || 0) + (salary.allowance_position || 0) +
      (salary.allowance_transport || 0) + (salary.allowance_food || 0) +
      (salary.allowance_phone || 0) + (salary.allowance_housing || 0)
  }, [salary])

  if (!emp) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors">
        <ArrowLeft size={14} /> กลับ
      </button>

      {/* Profile header — pastel cyan/teal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-200 via-teal-100 to-emerald-200 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-teal-300/30 blur-2xl" />
        <div className="absolute right-4 top-4 flex items-center gap-1 bg-white/50 backdrop-blur rounded-full px-2.5 py-1">
          <Sparkles size={11} className="text-teal-800" />
          <span className="text-[10px] font-black text-teal-800 tracking-wider">PRO MAX</span>
        </div>

        <div className="relative flex flex-col md:flex-row gap-5 items-start">
          {/* Avatar */}
          <Avatar url={emp.avatar_url} fallback={emp.first_name_th?.[0] || "?"} />

          {/* Info */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-teal-900">
            <div className="md:col-span-2">
              <p className="text-2xl font-black">{emp.first_name_th} {emp.last_name_th}
                {emp.nickname && <span className="text-base font-bold opacity-70 ml-2">({emp.nickname})</span>}
              </p>
            </div>
            <Field label="รหัสพนักงาน" value={emp.employee_code} />
            <Field label="เงินเดือนรวม" value={totalSalary ? `${totalSalary.toLocaleString()} บาท` : "—"} icon={<CreditCard size={12} />} />
            <Field label="ตำแหน่ง" value={emp.position?.name || "—"} />
            <Field label="วันที่เริ่มงาน" value={emp.hire_date ? format(new Date(emp.hire_date), "d MMM yyyy", { locale: th }) : "—"} icon={<CalendarDays size={12} />} />
            <Field label="แผนก" value={emp.department?.name || "—"} icon={<Building2 size={12} />} />
            <Field label="เบอร์โทร" value={emp.phone || "—"} icon={<Phone size={12} />} />
            <Field label="สาขา" value={emp.branch?.name || "—"} />
            <Field label="อีเมล" value={emp.email || "—"} icon={<Mail size={12} />} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100">
        <TabBtn icon={<Calendar size={14} />} active={tab === "schedule"} onClick={() => setTab("schedule")}>ตารางเวลาการทำงาน</TabBtn>
        <TabBtn icon={<FileText size={14} />} active={tab === "documents"} onClick={() => setTab("documents")}>ประวัติการยื่นเอกสาร</TabBtn>
        <TabBtn icon={<Receipt size={14} />} active={tab === "payroll"} onClick={() => setTab("payroll")}>รายรับรายจ่าย</TabBtn>
      </div>

      {/* ─── Schedule tab ─────────────────────────────────────────── */}
      {tab === "schedule" && (
        <>
          {/* Period switcher + summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <button onClick={() => setMonthDate(subMonths(monthDate, 1))}
              className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft size={16} /></button>
            <div className="min-w-48 text-center">
              <p className="text-base font-black text-slate-800">รอบเงินเดือน {period.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {format(new Date(period.from), "d MMM", { locale: th })} – {format(new Date(period.to), "d MMM yyyy", { locale: th })}
              </p>
            </div>
            <button onClick={() => setMonthDate(addMonths(monthDate, 1))}
              className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight size={16} /></button>
            <button onClick={() => setMonthDate(new Date())}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100">รอบปัจจุบัน</button>

            <button
              onClick={async () => {
                if (recalculating || !id) return
                setRecalculating(true)
                const t = toast.loading("คำนวณเวลาใหม่ตามกะปัจจุบัน...")
                try {
                  const r = await fetch("/api/attendance/recalc-late", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_id: id, from: period.from, to: period.to }),
                  })
                  const d = await r.json()
                  if (!r.ok) throw new Error(d.error || "คำนวณไม่สำเร็จ")
                  toast.success(`อัปเดต ${d.updated ?? 0} วัน`, { id: t })
                  await loadMonth()
                } catch (e: any) {
                  toast.error(e.message, { id: t })
                } finally {
                  setRecalculating(false)
                }
              }}
              disabled={recalculating}
              title="คำนวณ มาสาย / กลับก่อน ใหม่ตามกะปัจจุบัน — แก้ปัญหาเมื่อเปลี่ยนกะย้อนหลัง"
              className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 disabled:opacity-60 flex items-center gap-1.5 shadow-sm">
              {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              คำนวณเวลาใหม่
            </button>

            <div className="flex flex-wrap gap-2 ml-auto text-xs">
              <Pill color="emerald" label="มา" value={summary.present} />
              <Pill color="amber" label="สาย" value={summary.late} sub={summary.lateMin ? `${summary.lateMin} นาที` : undefined} />
              <Pill color="rose" label="ขาด" value={summary.absent} />
              <Pill color="violet" label="ลา" value={summary.leave} />
              <Pill color="indigo" label="OT" value={minToHM(summary.otMin) || "—"} />
            </div>
          </div>

          {/* Schedule table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <Th>วันที่</Th>
                    <Th>กะการทำงาน</Th>
                    <Th>เวลาทำงาน</Th>
                    <Th>มาสาย / ขาดงาน / กลับก่อน</Th>
                    <Th>OT</Th>
                    <Th>การลางาน</Th>
                    <Th>หมายเหตุ</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        กำลังโหลด...
                      </div>
                    </td></tr>
                  ) : days.map(row => {
                    const att = row.attendance
                    const sh = row.shift_assignment
                    const assignType: DayType = sh?.assignment_type === "dayoff" ? "dayoff"
                      : sh?.assignment_type === "holiday" ? "holiday"
                      : "work"
                    // resolve shift: assignment > schedule_profile default > none
                    const explicitShift: any = sh?.shift
                    const fallbackShift: any = !explicitShift && assignType === "work" && defaultShiftId
                      ? shiftTemplates.find((s: any) => s.id === defaultShiftId)
                      : null
                    const shiftTpl: any = explicitShift || fallbackShift
                    const isFallback = !explicitShift && !!fallbackShift
                    const isWeekend = row.dow === 0 || row.dow === 6
                    const openModal = (m: typeof modal) => () => setModal(m)
                    return (
                      <tr key={row.work_date} className={`hover:bg-teal-50/30 ${assignType === "holiday" ? "bg-rose-50/30" : isWeekend ? "bg-slate-50/30" : ""}`}>
                        {/* Date — กดดู/แก้ประเภทวัน */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <p className="font-bold text-slate-800 text-xs">
                            {TH_DAYS[row.dow]} {format(new Date(row.work_date), "dd/MM/yyyy")}
                          </p>
                          <button onClick={openModal({ kind: "shift", row })}
                            className={`group mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${DAY_TYPE_STYLE[assignType]} hover:text-teal-600`}>
                            {row.leave ? "ลา" : DAY_TYPE_LABEL[assignType]}
                            <Pencil size={9} className="text-teal-400" />
                          </button>
                        </td>

                        {/* Shift — คลิกเปิด modal */}
                        <td className="px-3 py-2.5">
                          {assignType !== "work" ? (
                            <button onClick={openModal({ kind: "shift", row })}
                              className="text-xs text-slate-400 hover:text-teal-600">—</button>
                          ) : (
                            <button onClick={openModal({ kind: "shift", row })}
                              className="group flex items-center gap-1.5 text-xs hover:text-teal-600"
                              title={isFallback ? "ยังไม่ได้กำหนดกะวันนี้ — แสดงกะมาตรฐานของพนักงาน คลิกเพื่อเปลี่ยน" : "คลิกเพื่อเปลี่ยนกะ"}>
                              {shiftTpl?.work_start ? (
                                <span className={`font-semibold ${isFallback ? "text-slate-500" : "text-slate-700"}`}>
                                  {shiftTpl.name} <span className="text-slate-400 font-mono">{shiftTpl.work_start.slice(0,5)}–{shiftTpl.work_end?.slice(0,5)}</span>
                                  {isFallback && <span className="ml-1 text-[9px] text-amber-600 font-normal">(กะมาตรฐาน)</span>}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">เลือกกะ</span>
                              )}
                              <Pencil size={11} className="text-teal-400" />
                            </button>
                          )}
                        </td>

                        {/* Clock in/out — คลิกเปิด modal */}
                        <td className="px-3 py-2.5">
                          <button onClick={openModal({ kind: "attendance", row })}
                            disabled={!att?.id}
                            className="group flex items-center gap-1.5 text-xs disabled:cursor-not-allowed">
                            {att?.clock_in || att?.clock_out ? (
                              <span className="font-mono font-bold text-slate-700">
                                (IN) {fmtTime(att?.clock_in) || "--:--"} <span className="text-slate-300">{'>'}</span> (OUT) {fmtTime(att?.clock_out) || "--:--"}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                            {att?.id && <Pencil size={11} className="text-teal-400" />}
                          </button>
                        </td>

                        {/* Late / Absent / Early */}
                        <td className="px-3 py-2.5">
                          <button onClick={openModal({ kind: "attendance", row })}
                            disabled={!att?.id}
                            className="space-y-0.5 text-left disabled:cursor-default">
                            {att?.status === "absent" && <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ขาดงาน</span>}
                            {att?.late_minutes > 0 && <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">สาย {att.late_minutes} นาที</span>}
                            {att?.early_out_minutes > 0 && <span className="inline-block text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">กลับก่อน {att.early_out_minutes} นาที</span>}
                            {!att?.status || (att.status === "present" && !att.late_minutes && !att.early_out_minutes) ? <span className="text-slate-300 text-xs">—</span> : null}
                          </button>
                        </td>

                        {/* OT — แต่ละ row คลิกได้, "+ เพิ่ม OT" เปิด modal ในโหมด add */}
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            {row.overtimes.map((o: any) => (
                              <button key={o.id} onClick={openModal({ kind: "ot", row, ot: o })}
                                className="group flex items-center gap-1 text-[10px]">
                                <span className={`font-bold px-2 py-0.5 rounded ${o.status === "approved" ? "text-indigo-700 bg-indigo-50 hover:bg-indigo-100" : o.status === "pending" ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-slate-500 bg-slate-50"}`}>
                                  OT (x{o.ot_rate}) {fmtTime(o.ot_start)}-{fmtTime(o.ot_end)}
                                </span>
                                <Pencil size={10} className="text-teal-400" />
                              </button>
                            ))}
                            {att?.ot_minutes > 0 && row.overtimes.length === 0 && (
                              <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                OT = {minToHM(att.ot_minutes)}
                              </span>
                            )}
                            <button onClick={openModal({ kind: "ot", row, ot: null })}
                              className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700">
                              <Plus size={10} /> เพิ่ม OT
                            </button>
                          </div>
                        </td>

                        {/* Leave — คลิกเปิด modal */}
                        <td className="px-3 py-2.5">
                          {row.leave ? (() => {
                            const lv = row.leave
                            const lt: any = lv.leave_type
                            const cls = lv.status === "approved" ? "text-violet-700 bg-violet-50 hover:bg-violet-100"
                              : lv.status === "pending"  ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                              : lv.status === "rejected" ? "text-rose-700 bg-rose-50 hover:bg-rose-100 line-through opacity-70"
                              : "text-slate-500 bg-slate-50"
                            const dot = lt?.color_hex ? (
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: lt.color_hex }} />
                            ) : null
                            return (
                              <button onClick={openModal({ kind: "leave", row })}
                                className={`group inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${cls}`}
                                title={lv.status === "pending" ? "รออนุมัติ" : lv.status === "rejected" ? "ถูกปฏิเสธ" : "อนุมัติแล้ว"}>
                                {dot}
                                {lt?.name || "ลา"} = {Number(lv.total_days || 0).toFixed(2)}
                                <Pencil size={9} className="opacity-70" />
                              </button>
                            )
                          })() : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Note */}
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-[160px] truncate">
                          {att?.note || ""}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
            <p className="text-xs font-bold text-slate-500 mr-2 self-center">ไปยังหน้าอื่น:</p>
            <QuickLink href={`/admin/employees/${id}`} icon={<ExternalLink size={12} />}>ข้อมูลพนักงาน</QuickLink>
            <QuickLink href="/admin/shifts" icon={<ExternalLink size={12} />}>จัดกะรวม</QuickLink>
            <QuickLink href="/admin/work-log" icon={<ExternalLink size={12} />}>บันทึกเข้างาน</QuickLink>
            <QuickLink href="/admin/leave" icon={<ExternalLink size={12} />}>การลา</QuickLink>
            <QuickLink href="/admin/approvals" icon={<ExternalLink size={12} />}>คำร้องรอพิจารณา</QuickLink>
            <QuickLink href={`/admin/payroll?employee=${encodeURIComponent(emp?.employee_code ?? "")}`} icon={<ExternalLink size={12} />}>เงินเดือน</QuickLink>
          </div>

          {/* Sync notice */}
          <div className="bg-teal-50/60 border border-teal-200/60 rounded-xl p-3 flex items-start gap-2.5">
            <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-800 leading-relaxed">
              <span className="font-bold">ระบบเชื่อมโยงอัตโนมัติ:</span> การเปลี่ยนกะ / ประเภทวัน / เวลาเข้า-ออก / OT
              ในหน้านี้จะมีผลต่อการคำนวณเงินเดือนทันที (ดูได้ที่หน้า "เงินเดือน" หรือแท็บ "รายรับรายจ่าย")
            </p>
          </div>
        </>
      )}

      {/* ─── Documents tab ────────────────────────────────────────── */}
      {tab === "documents" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={32} className="mx-auto mb-2 text-slate-200" />
              ยังไม่มีประวัติการยื่นเอกสาร
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <Th>ประเภท</Th>
                  <Th>วันที่</Th>
                  <Th>รายละเอียด</Th>
                  <Th>เหตุผล</Th>
                  <Th>สถานะ</Th>
                  <Th>ยื่นเมื่อ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.kind === "leave" ? "text-violet-700 bg-violet-50" : d.kind === "ot" ? "text-indigo-700 bg-indigo-50" : "text-amber-700 bg-amber-50"}`}>{d.title}</span></td>
                    <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{format(new Date(d.date), "d MMM yyyy", { locale: th })}{d.end && d.end !== d.date ? ` – ${format(new Date(d.end), "d MMM", { locale: th })}` : ""}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{d.meta}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[280px] truncate">{d.reason || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.status === "approved" ? "text-emerald-700 bg-emerald-50" : d.status === "pending" ? "text-amber-700 bg-amber-50" : d.status === "rejected" ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-100"}`}>
                        {d.status === "approved" ? "อนุมัติ" : d.status === "pending" ? "รอพิจารณา" : d.status === "rejected" ? "ปฏิเสธ" : d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{d.when ? format(new Date(d.when), "d MMM yyyy HH:mm", { locale: th }) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Payroll tab ──────────────────────────────────────────── */}
      {tab === "payroll" && (
        <div className="space-y-3">
          {/* Link to full payroll page */}
          <div className="flex justify-between items-center bg-teal-50/60 border border-teal-200/60 rounded-xl px-4 py-3">
            <p className="text-xs text-teal-800">
              <span className="font-bold">เชื่อมกับหน้าเงินเดือน:</span> สรุปด้านล่างคำนวณจากการเข้างาน/OT/ลาในรอบจริง
            </p>
            <Link href={`/admin/payroll?employee=${encodeURIComponent(emp?.employee_code ?? "")}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded-lg text-xs font-bold transition-colors">
              เปิดในหน้าเงินเดือน <ExternalLink size={11} />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {payslips.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt size={32} className="mx-auto mb-2 text-slate-200" />
              ยังไม่มีบันทึกเงินเดือน
              <p className="text-[11px] mt-2">ไปคำนวณได้ที่หน้า <Link href="/admin/payroll" className="text-teal-600 hover:underline font-bold">เงินเดือน</Link></p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <Th>เดือน</Th>
                  <Th align="right">เงินเดือนฐาน</Th>
                  <Th align="right">รายได้รวม</Th>
                  <Th align="right">OT</Th>
                  <Th align="right">ประกันสังคม</Th>
                  <Th align="right">ภาษี</Th>
                  <Th align="right">หักรวม</Th>
                  <Th align="right">รับสุทธิ</Th>
                  <Th>สถานะ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payslips.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{format(new Date(p.year, p.month - 1, 1), "MMMM yyyy", { locale: th })}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono">{(p.base_salary || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono font-bold text-emerald-700">{(p.gross_income || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono">{(p.ot_amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono">{(p.social_security_amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono">{(p.monthly_tax_withheld || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono text-rose-600">{(p.total_deductions || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-mono font-black text-indigo-700">{(p.net_salary || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "paid" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                        {p.status === "paid" ? "จ่ายแล้ว" : "ค้างจ่าย"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {/* ─── Detail modals ───────────────────────────────────────── */}
      {modal?.kind === "attendance" && (
        <AttendanceDetail
          employee={emp} managers={managers} row={modal.row}
          shiftTemplates={shiftTemplates}
          onClose={() => setModal(null)}
          onSaved={loadMonth}
        />
      )}
      {modal?.kind === "ot" && (
        <OTDetail
          employee={emp} managers={managers} row={modal.row} ot={modal.ot}
          shiftTemplates={shiftTemplates}
          onClose={() => setModal(null)}
          onSaved={loadMonth}
        />
      )}
      {modal?.kind === "shift" && (
        <ShiftDetail
          employee={emp} managers={managers} row={modal.row}
          shiftTemplates={shiftTemplates}
          defaultShiftId={defaultShiftId}
          onClose={() => setModal(null)}
          onSaved={loadMonth}
        />
      )}
      {modal?.kind === "leave" && (
        <LeaveDetail
          employee={emp} managers={managers} row={modal.row}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────
function Avatar({ url, fallback }: { url?: string | null; fallback: string }) {
  const [errored, setErrored] = useState(false)
  const show = url && !errored
  return (
    <div className="w-28 h-28 rounded-full bg-white shadow-lg ring-4 ring-white/60 overflow-hidden flex items-center justify-center text-3xl font-black text-teal-700 flex-shrink-0">
      {show
        ? <img src={url!} alt="" className="w-full h-full object-cover" onError={() => setErrored(true)} referrerPolicy="no-referrer" />
        : fallback}
    </div>
  )
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-bold opacity-70 flex items-center gap-1 flex-shrink-0">{icon}{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}

function TabBtn({ children, active, onClick, icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${active ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
      {icon} {children}
    </button>
  )
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-3 py-2.5 text-${align} text-[11px] font-black text-slate-500 whitespace-nowrap`}>{children}</th>
}

function Pill({ color, label, value, sub }: { color: string; label: string; value: number | string; sub?: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    indigo: "bg-indigo-50 text-indigo-700",
  }
  return (
    <div className={`${styles[color]} rounded-lg px-2.5 py-1.5 text-center min-w-16`}>
      <p className="text-[9px] font-bold opacity-70 leading-none">{label}</p>
      <p className="text-sm font-black mt-0.5">{value}</p>
      {sub && <p className="text-[9px] mt-0.5 opacity-70">{sub}</p>}
    </div>
  )
}

function QuickLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-xs font-bold transition-colors">
      {children} {icon}
    </Link>
  )
}
