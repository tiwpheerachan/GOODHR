"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { formatTime, statusToTH, statusColor } from "@/lib/utils/attendance"
import { ChevronLeft, ChevronRight, AlertCircle, Clock, Filter } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns"
import { th } from "date-fns/locale"

type Filter = "all" | "present" | "late" | "absent" | "leave"

const FILTER_META: Record<Filter, { label: string; color: string; bg: string; border: string }> = {
  all:     { label: "ทั้งหมด",  color: "text-slate-700",   bg: "bg-slate-100",   border: "border-slate-200"  },
  present: { label: "มาแล้ว",   color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200"},
  late:    { label: "มาสาย",    color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"  },
  absent:  { label: "ขาดงาน",  color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"    },
  leave:   { label: "ลาหยุด",   color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"   },
}

export default function AttendancePage() {
  const { user }   = useAuth()
  const sp         = useSearchParams()
  const router     = useRouter()
  const [month, setMonth]   = useState(new Date())
  const [filter, setFilter] = useState<Filter>((sp.get("filter") as Filter) ?? "all")
  const { records, loading } = useAttendance(user?.employee_id, month)

  // sync filter จาก URL เมื่อเข้าหน้าครั้งแรก
  useEffect(() => {
    const f = sp.get("filter") as Filter
    if (f && f in FILTER_META) setFilter(f)
  }, [])

  // อัปเดต URL เมื่อ filter เปลี่ยน (ไม่ push history ใหม่)
  useEffect(() => {
    const url = filter === "all" ? "/app/attendance" : `/app/attendance?filter=${filter}`
    router.replace(url)
  }, [filter])

  const map   = Object.fromEntries(records.map(r => [r.work_date, r]))
  const today = format(new Date(), "yyyy-MM-dd")

  const stats = {
    present: records.filter(r => ["present", "late"].includes(r.status)).length,
    late:    records.filter(r => r.status === "late").length,
    absent:  records.filter(r => r.status === "absent").length,
    leave:   records.filter(r => r.status === "leave").length,
  }

  // กรองรายการตาม filter
  const filtered = filter === "all" ? records
    : filter === "present" ? records.filter(r => ["present", "late"].includes(r.status))
    : records.filter(r => r.status === filter)

  const meta = FILTER_META[filter]

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-[17px] font-bold text-slate-800">ประวัติการเข้างาน</h1>
        <p className="text-xs text-slate-400 mt-0.5">{format(month, "MMMM yyyy", { locale: th })}</p>
      </div>

      <div className="px-4 mt-3 space-y-3">

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-2 py-1">
          <button onClick={() => setMonth(m => subMonths(m, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800 text-sm">{format(month, "MMMM yyyy", { locale: th })}</h2>
          <button onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={format(addMonths(month, 1), "yyyy-MM") > format(new Date(), "yyyy-MM")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Stats chips — กดเพื่อ filter */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4">
          {(Object.entries(FILTER_META) as [Filter, typeof FILTER_META[Filter]][]).map(([key, m]) => {
            const count = key === "all" ? records.length
              : key === "present" ? stats.present
              : key === "late"    ? stats.late
              : key === "absent"  ? stats.absent
              : stats.leave
            const active = filter === key
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={
                  "flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition-all " +
                  (active
                    ? m.bg + " " + m.color + " " + m.border + " shadow-sm"
                    : "bg-white text-slate-500 border-slate-200")
                }>
                <span>{m.label}</span>
                <span className={"px-1.5 py-0.5 rounded-full text-[10px] font-black " +
                  (active ? "bg-white/60 " + m.color : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Calendar — highlight ตาม filter */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="grid grid-cols-7 mb-2">
            {["อา","จ","อ","พ","พฤ","ศ","ส"].map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(getDay(startOfMonth(month))).fill(null).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
              const day = i + 1
              const ds  = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd")
              const rec = map[ds]
              const isToday  = ds === today
              const isFuture = ds > today
              const dow = getDay(new Date(ds))
              const wknd = dow === 0 || dow === 6

              // dim วันที่ไม่ match filter
              const matchFilter = filter === "all" ? true
                : filter === "present" ? rec && ["present", "late"].includes(rec.status)
                : rec?.status === filter

              return (
                <div key={day}
                  className={
                    "aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all " +
                    (isToday      ? "bg-indigo-600 text-white" :
                     isFuture     ? "text-slate-200" :
                     !matchFilter && filter !== "all" ? "opacity-25 " + (rec ? statusColor(rec.status) : wknd ? "text-slate-300" : "text-slate-300") :
                     rec          ? statusColor(rec.status) :
                     wknd         ? "text-slate-300" :
                     "text-slate-400 bg-slate-50")
                  }>
                  <span>{day}</span>
                  {rec && !isToday && (
                    <span className="text-[8px] mt-0.5 leading-none">
                      {statusToTH(rec.status).slice(0, 2)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter header */}
        {filter !== "all" && (
          <div className={"flex items-center gap-2 px-3 py-2 rounded-xl border " + meta.bg + " " + meta.border}>
            <Filter size={12} className={meta.color} />
            <p className={"text-xs font-bold " + meta.color}>
              กรอง: {meta.label} — {filtered.length} รายการ
            </p>
            <button onClick={() => setFilter("all")}
              className={"ml-auto text-[10px] font-bold " + meta.color + " opacity-60"}>
              ล้าง ✕
            </button>
          </div>
        )}

        {/* Record list */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลด...</div>
        ) : (
          <div className="space-y-2 pb-6">
            {filtered.map(r => {
              const isLate   = r.status === "late"
              const noOut    = !r.clock_out && !!r.clock_in
              const isAbsent = r.status === "absent"
              return (
                <div key={r.id}
                  className={"bg-white rounded-2xl border shadow-sm overflow-hidden " +
                    (isLate   ? "border-amber-200" :
                     isAbsent ? "border-red-200" :
                     "border-slate-100")}>
                  <div className="flex items-stretch">

                    {/* Date badge */}
                    <div className={"flex flex-col items-center justify-center px-4 py-3 min-w-[52px] " +
                      (isLate ? "bg-amber-50" : isAbsent ? "bg-red-50" : "bg-slate-50")}>
                      <p className={"text-lg font-black leading-none " +
                        (isLate ? "text-amber-700" : isAbsent ? "text-red-600" : "text-slate-800")}>
                        {r.work_date.split("-")[2]}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(r.work_date), "EEE", { locale: th })}
                      </p>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 px-3 py-3 border-l border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <span className={"inline-block text-[11px] font-bold px-2 py-0.5 rounded-full " + statusColor(r.status)}>
                          {statusToTH(r.status)}
                        </span>
                        {isLate && (
                          <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                            สาย {r.late_minutes} นาที
                          </span>
                        )}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>เข้า <span className="font-bold text-slate-700 tabular-nums">{formatTime(r.clock_in)}</span></span>
                        <span>ออก <span className="font-bold text-slate-700 tabular-nums">{formatTime(r.clock_out)}</span></span>
                        {(r.work_minutes ?? 0) > 0 && (
                          <span className="text-slate-400">
                            {Math.floor(r.work_minutes / 60)}ชม.{r.work_minutes % 60}น.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center pr-3">
                      {isLate && (
                        <Link href={"/app/checkin/correction?date=" + r.work_date}
                          className="w-8 h-8 flex items-center justify-center bg-amber-50 rounded-xl border border-amber-200 active:scale-90 transition-all">
                          <Clock size={14} className="text-amber-600" />
                        </Link>
                      )}
                      {noOut && (
                        <Link href={"/app/leave/new?type=adjustment&date=" + r.work_date}
                          className="w-8 h-8 flex items-center justify-center bg-yellow-50 rounded-xl border border-yellow-200 active:scale-90 transition-all">
                          <AlertCircle size={14} className="text-yellow-600" />
                        </Link>
                      )}
                      {isAbsent && (
                        <Link href={"/app/leave/new?type=adjustment&date=" + r.work_date}
                          className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-xl border border-red-200 active:scale-90 transition-all">
                          <AlertCircle size={14} className="text-red-500" />
                        </Link>
                      )}
                    </div>

                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-300">
                <p className="text-sm font-medium text-slate-400">
                  {filter === "all" ? "ไม่มีข้อมูลเดือนนี้" : `ไม่มีรายการ "${meta.label}"`}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}