"use client"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { formatTime, statusToTH, statusColor } from "@/lib/utils/attendance"
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import Link from "next/link"
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns"
import { th } from "date-fns/locale"

export default function AttendancePage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(new Date())
  const { records, holidayMap, loading } = useAttendance(user?.employee_id, month)

  const map   = Object.fromEntries(records.map(r => [r.work_date, r]))
  const today = format(new Date(), "yyyy-MM-dd")

  const currentMonthPrefix = format(month, "yyyy-MM")
  const stats = {
    present:  records.filter(r => r.status === "present").length,
    late:     records.filter(r => r.status === "late").length,
    absent:   records.filter(r => r.status === "absent").length,
    leave:    records.filter(r => r.status === "leave").length,
    holidays: Object.keys(holidayMap).filter(d => d.startsWith(currentMonthPrefix)).length,
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800 pt-2">ประวัติการเข้างาน</h1>

      {/* Nav */}
      <div className="flex items-center justify-between card py-3">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-2 hover:bg-slate-100 rounded-xl">
          <ChevronLeft size={18}/>
        </button>
        <h2 className="font-bold text-slate-800">{format(month, "MMMM yyyy", { locale: th })}</h2>
        <button onClick={() => setMonth(m => addMonths(m, 1))}
          disabled={format(addMonths(month, 1), "yyyy-MM") > format(new Date(), "yyyy-MM")}
          className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30">
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { l: "มา",     v: stats.present,  c: "text-green-600 bg-green-50"   },
          { l: "สาย",    v: stats.late,     c: "text-yellow-600 bg-yellow-50" },
          { l: "ขาด",    v: stats.absent,   c: "text-red-600 bg-red-50"       },
          { l: "ลา",     v: stats.leave,    c: "text-blue-600 bg-blue-50"     },
          { l: "หยุด",   v: stats.holidays, c: "text-rose-600 bg-rose-50"     },
        ].map(s => (
          <div key={s.l} className={`${s.c.split(" ")[1]} rounded-xl p-2 text-center`}>
            <p className={`text-xl font-bold ${s.c.split(" ")[0]}`}>{s.v}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card">
        {/* legend */}
        <div className="flex gap-3 flex-wrap mb-3 text-[10px] font-bold">
          {[
            { c: "bg-rose-100 text-rose-600", l: "วันหยุดบริษัท" },
            { c: "bg-slate-100 text-slate-400", l: "วันเสาร์-อาทิตย์" },
            { c: "bg-green-100 text-green-700", l: "มาทำงาน" },
            { c: "bg-yellow-100 text-yellow-700", l: "มาสาย" },
            { c: "bg-red-100 text-red-600", l: "ขาดงาน" },
          ].map(s => (
            <span key={s.l} className={`${s.c} px-2 py-0.5 rounded-lg`}>{s.l}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 mb-2">
          {["อา","จ","อ","พ","พฤ","ศ","ส"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array(getDay(startOfMonth(month))).fill(null).map((_, i) => <div key={"e" + i}/>)}
          {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
            const day  = i + 1
            const ds   = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd")
            const rec  = map[ds]
            const hol  = holidayMap[ds]
            const isToday  = ds === today
            const isFuture = ds > today
            const dow  = getDay(new Date(ds))
            const wknd = dow === 0 || dow === 6

            let cls = ""
            let label = ""
            let sub = ""

            if (isToday) {
              cls = "bg-indigo-600 text-white"
              label = String(day)
              sub = rec ? statusToTH(rec.status).slice(0, 2) : "วันนี้"
            } else if (hol) {
              cls = "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
              label = String(day)
              sub = "หยุด"
            } else if (isFuture) {
              cls = "text-slate-300"
              label = String(day)
            } else if (rec) {
              cls = statusColor(rec.status)
              label = String(day)
              sub = statusToTH(rec.status).slice(0, 2)
            } else if (wknd) {
              cls = "text-slate-300"
              label = String(day)
            } else {
              cls = "text-slate-400 bg-slate-50"
              label = String(day)
            }

            return (
              <div key={day} title={hol || undefined}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium ${cls}`}>
                <span>{label}</span>
                {sub && <span className="text-[9px] leading-none mt-0.5">{sub}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Holiday list for this month */}
      {Object.keys(holidayMap).filter(d => d.startsWith(format(month, "yyyy-MM"))).length > 0 && (
        <div className="card">
          <p className="text-xs font-black text-slate-500 mb-2.5 uppercase tracking-wide">
            🎌 วันหยุดบริษัทเดือนนี้
          </p>
          <div className="space-y-1.5">
            {(Object.entries(holidayMap) as [string, string][])
              .filter(([d]) => d.startsWith(format(month, "yyyy-MM")))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, name]) => (
                <div key={date} className="flex items-center gap-3 bg-rose-50 rounded-xl px-3 py-2">
                  <div className="w-8 text-center">
                    <p className="text-sm font-black text-rose-700">{date.split("-")[2]}</p>
                    <p className="text-[9px] text-rose-400">{format(new Date(date), "EEE", { locale: th })}</p>
                  </div>
                  <p className="text-xs font-semibold text-rose-800">{name}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Record list */}
      {loading ? <p className="text-center py-8 text-slate-400">กำลังโหลด...</p> : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="text-center w-10">
                <p className="text-lg font-bold text-slate-800">{r.work_date.split("-")[2]}</p>
                <p className="text-xs text-slate-400">{format(new Date(r.work_date), "EEE", { locale: th })}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusColor(r.status)}`}>{statusToTH(r.status)}</span>
                  {holidayMap[r.work_date] && (
                    <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-lg">
                      🎌 {holidayMap[r.work_date].slice(0, 12)}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  <span>เข้า: <span className="font-medium text-slate-700">{formatTime(r.clock_in)}</span></span>
                  <span>ออก: <span className="font-medium text-slate-700">{formatTime(r.clock_out)}</span></span>
                </div>
              </div>
              {(!r.clock_in || !r.clock_out) && !holidayMap[r.work_date] && (
                <Link href={"/app/leave/new?type=adjustment&date=" + r.work_date}
                  className="p-2 bg-yellow-50 rounded-xl">
                  <AlertCircle size={16} className="text-yellow-600"/>
                </Link>
              )}
            </div>
          ))}
          {records.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">ไม่มีข้อมูล</p>}
        </div>
      )}
    </div>
  )
}