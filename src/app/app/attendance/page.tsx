"use client"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { formatTime } from "@/lib/utils/attendance"
import {
  ChevronLeft, ChevronRight, Clock, LogIn, LogOut,
  AlertTriangle, TrendingDown, Info, FileEdit, CalendarClock, XCircle,
} from "lucide-react"
import Link from "next/link"
import {
  format, addMonths, subMonths, getDaysInMonth,
  startOfMonth, getDay, eachDayOfInterval, endOfMonth,
} from "date-fns"
import { th } from "date-fns/locale"

// ── constants ─────────────────────────────────────────────────────────

const STATUS_TH: Record<string, string> = {
  present:   "มาทำงาน",
  late:      "มาสาย",
  absent:    "ขาดงาน",
  early_out: "ออกก่อน",
  leave:     "ลา",
  holiday:   "วันหยุด",
  wfh:       "WFH",
}
const STATUS_CLS: Record<string, string> = {
  present:   "bg-green-100 text-green-700",
  late:      "bg-amber-100 text-amber-700",
  absent:    "bg-red-100 text-red-600",
  early_out: "bg-orange-100 text-orange-600",
  leave:     "bg-blue-100 text-blue-700",
  holiday:   "bg-rose-100 text-rose-700",
  wfh:       "bg-teal-100 text-teal-700",
}
const STATUS_CAL: Record<string, string> = {
  present:   "bg-green-100 text-green-700",
  late:      "bg-amber-100 text-amber-700",
  absent:    "bg-red-100 text-red-600",
  early_out: "bg-orange-100 text-orange-600",
  leave:     "bg-blue-100 text-blue-700",
  wfh:       "bg-teal-100 text-teal-700",
}

function badge(status: string) {
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
    STATUS_CLS[status] ?? "bg-slate-100 text-slate-500"
  }`
}

// ── helpers ───────────────────────────────────────────────────────────

function isWeekend(ds: string) {
  const dow = getDay(new Date(ds + "T00:00:00"))
  return dow === 0 || dow === 6
}

/**
 * สร้าง virtual "absent" records สำหรับวันทำงาน (จ–ศ) ที่:
 *  - ผ่านมาแล้ว (< today)
 *  - ไม่ใช่วันหยุดบริษัท
 *  - ไม่มี attendance record จริงอยู่ใน DB
 */
function buildDisplayList(
  records:    any[],
  month:      Date,
  todayStr:   string,
  holidayMap: Record<string, string>,
): any[] {
  const existMap = new Map<string, any>(records.map(r => [r.work_date as string, r]))

  const first = startOfMonth(month)
  const last  = endOfMonth(month)
  const allDays = eachDayOfInterval({ start: first, end: last })

  const absentRows: any[] = []

  for (const d of allDays) {
    const ds = format(d, "yyyy-MM-dd")
    if (ds >= todayStr)          continue   // วันนี้ + อนาคต ไม่นับ
    if (isWeekend(ds))           continue   // เสาร์-อาทิตย์
    if (holidayMap[ds])          continue   // วันหยุดบริษัท
    if (existMap.has(ds))        continue   // มี record แล้ว
    // ✅ วันนี้คือวันขาดงาน — สร้าง virtual record
    absentRows.push({
      _virtual:  true,        // flag ว่าไม่มีใน DB
      id:        `absent-${ds}`,
      work_date: ds,
      status:    "absent",
      clock_in:  null,
      clock_out: null,
      late_minutes:      0,
      early_out_minutes: 0,
      work_minutes:      0,
      ot_minutes:        0,
    })
  }

  // รวม + เรียงล่าสุดก่อน
  const all = [...records, ...absentRows]
  all.sort((a, b) => (a.work_date > b.work_date ? -1 : 1))
  return all
}

// ── Page ─────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(new Date())

  const empId = (user as any)?.employee_id ?? (user as any)?.employee?.id
  const { records, periodRecords, period, holidayMap, loading } = useAttendance(empId, month)

  const today    = format(new Date(), "yyyy-MM-dd")
  const monthPfx = format(month, "yyyy-MM")

  // calendar map (เฉพาะ real records)
  const recMap = Object.fromEntries(records.map((r: any) => [r.work_date, r]))

  // display list = real records + virtual absent rows
  const displayList = loading ? [] : buildDisplayList(records, month, today, holidayMap)

  // ── stats ทั้งเดือน (รวม virtual absent) ─────────────────────────
  const stats = {
    present:       records.filter((r: any) => r.status === "present").length,
    late:          records.filter((r: any) => r.status === "late").length,
    absent:        displayList.filter((r: any) => r.status === "absent").length, // รวม virtual
    earlyOut:      records.filter((r: any) => r.status === "early_out").length,
    leave:         records.filter((r: any) => r.status === "leave").length,
    wfh:           records.filter((r: any) => r.status === "wfh").length,
    holidays:      Object.keys(holidayMap).filter(d => d.startsWith(monthPfx)).length,
    totalLateMin:  records.reduce((s: number, r: any) => s + (r.late_minutes      || 0), 0),
    totalEarlyMin: records.reduce((s: number, r: any) => s + (r.early_out_minutes || 0), 0),
  }

  // ── stats งวดเงินเดือน 22→21 ─────────────────────────────────────
  const periodStats = {
    late:         periodRecords.filter((r: any) => r.status === "late"      || (r.late_minutes      || 0) > 0).length,
    earlyOut:     periodRecords.filter((r: any) => r.status === "early_out" || (r.early_out_minutes || 0) > 0).length,
    absent:       periodRecords.filter((r: any) => r.status === "absent").length,
    totalLateMin: periodRecords.reduce((s: number, r: any) => s + (r.late_minutes      || 0), 0),
    totalEarlyMin:periodRecords.reduce((s: number, r: any) => s + (r.early_out_minutes || 0), 0),
  }
  const hasIssues = periodStats.late > 0 || periodStats.absent > 0 || periodStats.earlyOut > 0

  const periodLabel = (() => {
    try {
      const s = new Date(period.start + "T00:00:00")
      const e = new Date(period.end   + "T00:00:00")
      return `${format(s, "d MMM", { locale: th })} – ${format(e, "d MMM", { locale: th })}`
    } catch { return "" }
  })()

  return (
    <div className="bg-slate-50 min-h-screen pb-10">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-slate-100">
        <h1 className="text-lg font-black text-slate-800">ประวัติการเข้างาน</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {(user as any)?.employee?.first_name_th} {(user as any)?.employee?.last_name_th}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Month nav ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-2.5">
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-bold text-slate-800">
            {format(month, "MMMM yyyy", { locale: th })}
          </h2>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={format(addMonths(month, 1), "yyyy-MM") > format(new Date(), "yyyy-MM")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* ── Summary row ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-3">
          <div className="grid grid-cols-7 gap-1 text-center">
            {[
              { l: "มาแล้ว",  v: stats.present,  c: "text-green-600"  },
              { l: "มาสาย",   v: stats.late,     c: "text-amber-600"  },
              { l: "ขาดงาน",  v: stats.absent,   c: "text-red-600"    },
              { l: "ออกก่อน", v: stats.earlyOut, c: "text-orange-500" },
              { l: "ลาหยุด",  v: stats.leave,    c: "text-blue-600"   },
              { l: "วันหยุด", v: stats.holidays, c: "text-rose-500"   },
              { l: "WFH",     v: stats.wfh,      c: "text-teal-600"   },
            ].map(s => (
              <div key={s.l}>
                <p className={`text-lg font-black leading-none ${s.c}`}>{s.v}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
          {(stats.totalLateMin > 0 || stats.totalEarlyMin > 0) && (
            <div className="flex gap-3 justify-center mt-2.5 pt-2.5 border-t border-slate-100 flex-wrap">
              {stats.totalLateMin > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  ⏰ สายรวม {stats.totalLateMin} นาที
                </span>
              )}
              {stats.totalEarlyMin > 0 && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  🔔 ออกก่อนรวม {stats.totalEarlyMin} นาที
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Deduction card ─────────────────────────────────────── */}
        {hasIssues && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-red-500" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  รายการที่ส่งผลต่อเงินเดือน
                </p>
              </div>
              {periodLabel ? (
                <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  งวด {periodLabel}
                </span>
              ) : null}
            </div>
            <div className="divide-y divide-slate-50">
              {periodStats.late > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock size={12} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">มาสาย {periodStats.late} ครั้ง</p>
                      <p className="text-[10px] text-slate-400">รวม {periodStats.totalLateMin} นาที ในงวดนี้</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">หักเงิน</span>
                </div>
              )}
              {periodStats.earlyOut > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-100 rounded-xl flex items-center justify-center">
                      <LogOut size={12} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">ออกก่อนกำหนด {periodStats.earlyOut} ครั้ง</p>
                      <p className="text-[10px] text-slate-400">รวม {periodStats.totalEarlyMin} นาที ในงวดนี้</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">หักเงิน</span>
                </div>
              )}
              {periodStats.absent > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle size={12} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">ขาดงาน {periodStats.absent} วัน</p>
                      <p className="text-[10px] text-slate-400">หักวันละ 1/30 ของเงินเดือน</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">หักเงิน</span>
                </div>
              )}
              {stats.late > periodStats.late && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/60">
                  <Info size={11} className="text-blue-400 flex-shrink-0" />
                  <p className="text-[10px] text-blue-600">
                    สาย {stats.late - periodStats.late} ครั้งหลังวันที่ 21 — จะนับในงวดเดือนถัดไป
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50">
                <Info size={11} className="text-slate-400 flex-shrink-0" />
                <p className="text-[10px] text-slate-400">
                  ดูยอดหักจริงได้ที่หน้า{" "}
                  <Link href="/app/salary" className="text-blue-500 font-bold underline">เงินเดือน</Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Calendar ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { c: "bg-rose-100 text-rose-600",    l: "วันหยุด"  },
              { c: "bg-green-100 text-green-700",  l: "มาทำงาน"  },
              { c: "bg-amber-100 text-amber-700",  l: "มาสาย"    },
              { c: "bg-orange-100 text-orange-600",l: "ออกก่อน"  },
              { c: "bg-red-100 text-red-600",      l: "ขาดงาน"   },
              { c: "bg-blue-100 text-blue-700",    l: "ลาหยุด"   },
            ].map(s => (
              <span key={s.l} className={`${s.c} text-[9px] font-bold px-2 py-0.5 rounded-lg`}>{s.l}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["อา","จ","อ","พ","พฤ","ศ","ส"].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(getDay(startOfMonth(month))).fill(null).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
              const day      = i + 1
              const ds       = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd")
              const rec      = recMap[ds]
              const hol      = holidayMap[ds]
              const isToday  = ds === today
              const isFuture = ds > today
              const dow      = getDay(new Date(ds + "T00:00:00"))
              const wknd     = dow === 0 || dow === 6

              // virtual absent (ไม่มีใน recMap)
              const isPastWorkday = !isFuture && ds !== today && !wknd && !hol
              const isVirtualAbsent = isPastWorkday && !rec

              let cls = "", sub = ""
              if      (isToday)        { cls = "bg-indigo-600 text-white";               sub = rec ? (STATUS_TH[rec.status] || "").slice(0, 2) : "วันนี้" }
              else if (hol)            { cls = "bg-rose-100 text-rose-700 ring-1 ring-rose-200"; sub = "หยุด" }
              else if (isFuture)       { cls = "text-slate-200" }
              else if (rec)            { cls = STATUS_CAL[rec.status] ?? "bg-slate-100 text-slate-500"; sub = (STATUS_TH[rec.status] || "").slice(0, 2) }
              else if (isVirtualAbsent){ cls = "bg-red-100 text-red-600";                sub = "ขาด" }
              else if (wknd)           { cls = "text-slate-200" }
              else                     { cls = "text-slate-400 bg-slate-50" }

              return (
                <div
                  key={day}
                  title={hol || undefined}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold ${cls}`}
                >
                  <span>{day}</span>
                  {sub ? <span className="text-[8px] leading-none mt-0.5 font-semibold">{sub}</span> : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Record list (รวม virtual absent) ───────────────────── */}
        {loading ? (
          <p className="text-center py-8 text-slate-400 text-sm">กำลังโหลด...</p>
        ) : (
          <div className="space-y-2">
            {displayList.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">ไม่มีข้อมูล</p>
            )}
            {displayList.map((r: any) => {
              const hol           = holidayMap[r.work_date]
              const lateMin       = r.late_minutes      || 0
              const earlyOutMin   = r.early_out_minutes || 0
              const isLate        = r.status === "late"      || lateMin > 0
              const isEarlyOut    = r.status === "early_out" || earlyOutMin > 0
              const isAbsent      = r.status === "absent"
              const isVirtual     = !!r._virtual   // ไม่มีใน DB
              const hasClockedIn  = !!r.clock_in
              const hasIssue      = isLate || isEarlyOut || isAbsent

              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    isAbsent ? "border-red-200" :
                    hasIssue ? "border-orange-100" :
                    "border-slate-100"
                  }`}
                >
                  {/* ── main row ──────────────────────────────────── */}
                  <div className={`flex items-center gap-3 px-4 py-3 ${isAbsent && isVirtual ? "bg-red-50/40" : ""}`}>
                    {/* date */}
                    <div className="w-10 text-center flex-shrink-0">
                      <p className="text-lg font-black text-slate-800 leading-none">
                        {r.work_date.split("-")[2]}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(r.work_date + "T00:00:00"), "EEE", { locale: th })}
                      </p>
                    </div>

                    {/* status + time */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={badge(r.status)}>{STATUS_TH[r.status] ?? r.status}</span>
                        {hol ? (
                          <span className="text-[9px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-lg">
                            🎌{hol.slice(0, 10)}
                          </span>
                        ) : null}
                        {isVirtual ? (
                          <span className="text-[9px] bg-red-100 text-red-500 font-bold px-1.5 py-0.5 rounded-lg">
                            ไม่มีการเช็คอิน
                          </span>
                        ) : null}
                      </div>

                      {/* clock in / out row */}
                      {!isVirtual ? (
                        <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <LogIn size={10} className="text-green-500" />
                            <span className="font-bold text-slate-700">{formatTime(r.clock_in) || "--:--"}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <LogOut size={10} className="text-slate-400" />
                            <span className="font-bold text-slate-700">{formatTime(r.clock_out) || "--:--"}</span>
                          </span>
                          {r.work_minutes > 0 ? (
                            <span className="text-slate-400">
                              {Math.floor(r.work_minutes / 60)}ชม.{r.work_minutes % 60}น.
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[11px] text-red-400 mt-1">
                          ไม่พบประวัติการเช็คอิน — กรุณาส่งคำขอแก้ไขหรือยื่นลาย้อนหลัง
                        </p>
                      )}
                    </div>

                    {/* badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {lateMin > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock size={9} />สาย {lateMin}น.
                        </span>
                      ) : null}
                      {earlyOutMin > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          <LogOut size={9} />ออกก่อน {earlyOutMin}น.
                        </span>
                      ) : null}
                      {isAbsent ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle size={9} />ขาดงาน
                        </span>
                      ) : null}
                      {(r.ot_minutes || 0) > 0 ? (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          OT {r.ot_minutes}น.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* ── deduction bar ─────────────────────────────── */}
                  {(lateMin > 0 || earlyOutMin > 0) ? (
                    <div className="flex border-t border-dashed border-orange-100 bg-orange-50/40">
                      {lateMin > 0 ? (
                        <div className="flex-1 flex items-center gap-1.5 px-4 py-2 text-[10px] text-amber-700">
                          <TrendingDown size={10} />
                          <span>หักสาย: <strong>{lateMin} นาที</strong></span>
                        </div>
                      ) : null}
                      {earlyOutMin > 0 ? (
                        <div className="flex-1 flex items-center gap-1.5 px-4 py-2 text-[10px] text-orange-700 border-l border-dashed border-orange-100">
                          <TrendingDown size={10} />
                          <span>หักออกก่อน: <strong>{earlyOutMin} นาที</strong></span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* ── action buttons ────────────────────────────── */}
                  {!hol && r.status !== "leave" && r.status !== "holiday" &&
                   (isAbsent || isLate || isEarlyOut || !hasClockedIn) ? (
                    <div className={`flex border-t divide-x ${
                      isAbsent ? "border-red-100 divide-red-100" : "border-slate-100 divide-slate-100"
                    }`}>
                      <Link
                        href={`/app/leave/new?type=adjustment&date=${r.work_date}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <FileEdit size={12} /> ขอแก้ไขเวลา
                      </Link>
                      <Link
                        href={`/app/leave/new?type=leave&date=${r.work_date}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <CalendarClock size={12} /> ยื่นใบลา
                      </Link>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Holiday list ───────────────────────────────────────── */}
        {Object.keys(holidayMap).filter(d => d.startsWith(monthPfx)).length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-black text-slate-500 mb-3 uppercase tracking-wide">
              🎌 วันหยุดบริษัทเดือนนี้
            </p>
            <div className="space-y-1.5">
              {(Object.entries(holidayMap) as [string, string][])
                .filter(([d]) => d.startsWith(monthPfx))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, name]) => (
                  <div key={date} className="flex items-center gap-3 bg-rose-50 rounded-xl px-3 py-2">
                    <div className="w-8 text-center">
                      <p className="text-sm font-black text-rose-700">{date.split("-")[2]}</p>
                      <p className="text-[9px] text-rose-400">
                        {format(new Date(date + "T00:00:00"), "EEE", { locale: th })}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-rose-800">{name}</p>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  )
}