"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { formatTime } from "@/lib/utils/attendance"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Clock, ChevronRight, CalendarDays, TrendingUp, AlertCircle, Banknote, ArrowRight, CheckCircle2, XCircle, FileText, Zap, Building2, Users } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function DashboardPage() {
  const { user } = useAuth()
  const empId = user?.employee_id ?? (user as any)?.employee?.id
  const { todayRecord, records } = useAttendance(empId)
  const { balances } = useLeaveBalance(empId)
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set())
  const [netSalary, setNetSalary]       = useState<number | null>(null)

  useEffect(() => {
    if (!empId) return
    const supabase = createClient()
    const now = new Date()
    // pending corrections
    supabase.from("time_adjustment_requests")
      .select("work_date").eq("employee_id", empId).eq("status", "pending")
      .then(({ data }) => setPendingDates(new Set((data ?? []).map((r: any) => r.work_date))))
    // เงินเดือนล่าสุด
    supabase.from("payroll_records")
      .select("net_salary, year, month")
      .eq("employee_id", empId)
      .order("year",  { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setNetSalary(data.net_salary) })
  }, [empId])

  const lateRecords  = records.filter(r => r.status === "late")
  const pendingFixed = lateRecords.filter(r => pendingDates.has(r.work_date)).length
  const stats = {
    present: records.filter(r => ["present","late"].includes(r.status)).length,
    late:    lateRecords.length,
    absent:  records.filter(r => r.status === "absent").length,
  }

  const emp        = user?.employee as any
  const isLate     = (todayRecord?.late_minutes ?? 0) > 0
  const alreadyIn  = !!todayRecord?.clock_in
  const noClockOut = alreadyIn && !todayRecord?.clock_out
  const todayDate  = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-24">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-4 pt-5 pb-20 overflow-hidden">
        {/* bg orbs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-16 -left-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <p className="text-indigo-200 text-xs">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
          <h1 className="text-white font-black text-2xl mt-1">
            สวัสดี, {emp?.first_name_th ?? "..."}
          </h1>
          <p className="text-indigo-300 text-sm">{emp?.position?.name ?? emp?.department?.name ?? ""}</p>
        </div>
      </div>

      {/* ── Content overlaps hero ──────────────────────────── */}
      <div className="px-4 -mt-14 space-y-3 relative">

        {/* Today card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">สถานะวันนี้</p>
            {alreadyIn && (
              <span className={"text-[11px] font-bold px-2.5 py-0.5 rounded-full " +
                (isLate ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                {isLate ? `สาย ${todayRecord!.late_minutes} นาที` : "ตรงเวลา ✓"}
              </span>
            )}
          </div>

          {alreadyIn ? (
            <>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">เข้างาน</p>
                  <p className="text-3xl font-black text-slate-800 tabular-nums">{formatTime(todayRecord?.clock_in)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1">ออกงาน</p>
                  <p className={"text-3xl font-black tabular-nums " + (todayRecord?.clock_out ? "text-slate-800" : "text-slate-300")}>
                    {formatTime(todayRecord?.clock_out)}
                  </p>
                  {(todayRecord?.work_minutes ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {Math.floor(todayRecord!.work_minutes / 60)}ชม. {todayRecord!.work_minutes % 60}น.
                    </p>
                  )}
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <Link href="/app/checkin"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl active:scale-[0.97] transition-all shadow-md shadow-indigo-200">
                  <Clock size={15} />
                  {noClockOut ? "เช็คเอ้าท์" : "ตรวจสอบ"}
                </Link>
                {isLate && (
                  <Link href={"/app/checkin/correction?date=" + todayDate}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl border border-amber-200 active:scale-[0.97] transition-all">
                    <Clock size={15} />
                    ขอแก้ไขเวลา
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-slate-700">ยังไม่ได้เช็คอิน</p>
                <p className="text-xs text-slate-400 mt-0.5">กรุณาเช็คอินเมื่อถึงที่ทำงาน</p>
              </div>
              <Link href="/app/checkin"
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 active:scale-95 transition-all">
                <Clock size={14} /> เช็คอิน
              </Link>
            </div>
          )}
        </div>

        {/* ลืมเช็คออก */}
        {noClockOut && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-semibold flex-1">อย่าลืมเช็คเอ้าท์ก่อนกลับบ้านนะ!</p>
            <Link href="/app/checkin" className="text-xs font-bold text-amber-700 shrink-0">ไปเลย →</Link>
          </div>
        )}

        {/* pending correction banner */}
        {pendingFixed > 0 && (
          <Link href="/app/checkin/correction"
            className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={14} className="text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-violet-700">รอแก้ไขเวลา {pendingFixed} วัน</p>
              <p className="text-[11px] text-violet-400">รอหัวหน้าอนุมัติ</p>
            </div>
            <ArrowRight size={14} className="text-violet-400" />
          </Link>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">สถิติเดือนนี้</p>
            <Link href="/app/attendance" className="text-[11px] text-indigo-600 font-bold">ดูปฏิทิน →</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/app/attendance?filter=present"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><CheckCircle2 size={17} className="text-emerald-500" /></div>
              <p className="text-2xl font-black text-emerald-600">{stats.present}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">มาแล้ว</p>
            </Link>
            <Link href="/app/attendance?filter=late"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><Clock size={17} className="text-amber-500" /></div>
              <p className="text-2xl font-black text-amber-500">{stats.late}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">มาสาย</p>
              {pendingFixed > 0 && (
                <p className="text-[9px] text-violet-500 font-bold">รอแก้ {pendingFixed}</p>
              )}
            </Link>
            <Link href="/app/attendance?filter=absent"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center active:scale-95 transition-all">
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-1.5"><XCircle size={17} className="text-red-400" /></div>
              <p className="text-2xl font-black text-red-500">{stats.absent}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">ขาดงาน</p>
            </Link>
          </div>
        </div>

        {/* ── Salary shortcut ──────────────────────────────── */}
        <Link href="/app/salary"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-4 py-4 flex items-center gap-3 shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Banknote size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">เงินเดือนล่าสุด</p>
            <p className="text-emerald-100 text-xs mt-0.5">
              {netSalary != null
                ? "฿" + netSalary.toLocaleString("th-TH", { minimumFractionDigits: 2 })
                : "ดูรายละเอียดรายได้"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1.5">
            <TrendingUp size={13} className="text-white" />
            <span className="text-white text-xs font-bold">ดูเพิ่ม</span>
          </div>
        </Link>

        {/* ── Leave balances ───────────────────────────────── */}
        {balances.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <p className="text-sm font-bold text-slate-700">โควต้าการลา</p>
              <Link href="/app/leave" className="text-[11px] font-bold text-indigo-600">ดูทั้งหมด →</Link>
            </div>
            <div className="px-4 pb-3 space-y-2.5">
              {balances.slice(0, 3).map(b => {
                const used = (b.entitled_days ?? 0) - (b.remaining_days ?? 0)
                const pct  = b.entitled_days > 0 ? (used / b.entitled_days) * 100 : 0
                const color = (b.leave_type as any)?.color_hex || "#818cf8"
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-600 font-medium">{(b.leave_type as any)?.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        <span className="font-black text-slate-800">{b.remaining_days}</span>/{b.entitled_days} วัน
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: (100 - pct) + "%", backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <p className="text-sm font-bold text-slate-700 px-4 pt-3.5 pb-2">ทำรายการด่วน</p>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-50">
            {[
              { href: "/app/leave/new",          Icon: FileText,  iconBg: "bg-blue-50",   iconColor: "text-blue-600",   label: "ยื่นใบลา",       sub: "ลาป่วย / ลาพักร้อน" },
              { href: "/app/checkin/correction",  Icon: Clock,     iconBg: "bg-violet-50", iconColor: "text-violet-600", label: "ขอแก้ไขเวลา",   sub: "ย้อนหลัง 30 วัน"    },
              { href: "/app/leave/new?type=overtime", Icon: Zap,       iconBg: "bg-orange-50",iconColor: "text-orange-600", label: "ขอทำ OT",       sub: "ล่วงเวลา"           },
              { href: "/app/salary",             Icon: Banknote,  iconBg: "bg-emerald-50",iconColor: "text-emerald-600", label: "สลิปเงินเดือน",  sub: "รายได้ & การหัก"    },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + a.iconBg}><a.Icon size={16} className={a.iconColor} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">{a.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{a.sub}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Role shortcuts ───────────────────────────────── */}
        {["manager", "hr_admin", "super_admin"].includes(user?.role || "") && (
          <Link href="/manager/dashboard"
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm active:bg-slate-50">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0"><Users size={16} className="text-indigo-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">ระบบหัวหน้าทีม</p>
              <p className="text-[11px] text-slate-400">อนุมัติใบลา / แก้ไขเวลา</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
        )}
        {["hr_admin","super_admin"].includes(user?.role || "") && (
          <Link href="/admin/dashboard"
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm active:bg-slate-50">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0"><Building2 size={16} className="text-slate-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">ระบบ HR Admin</p>
              <p className="text-[11px] text-slate-400">จัดการพนักงาน / เงินเดือน</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
        )}

      </div>
    </div>
  )
}