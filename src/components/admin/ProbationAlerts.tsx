"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { differenceInDays, format } from "date-fns"
import { th } from "date-fns/locale"
import { AlertTriangle, Bell, ChevronRight, X } from "lucide-react"
import Link from "next/link"

type ProbationEmp = {
  id: string
  name: string
  dept: string
  probation_end_date: string
  daysLeft: number
  level: "critical" | "warning" | "notice"   // ≤30 | ≤90 | ≤119
}

export function ProbationAlerts({ companyId }: { companyId: string }) {
  const [alerts, setAlerts]   = useState<ProbationEmp[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!companyId) return
    supabase.from("employees")
      .select("id,first_name_th,last_name_th,probation_end_date,department:departments(name)")
      .eq("company_id", companyId)
      .eq("employment_status", "probation")
      .eq("is_active", true)
      .not("probation_end_date", "is", null)
      .then(({ data }) => {
        const today = new Date()
        const list: ProbationEmp[] = (data ?? [])
          .map((e: any) => {
            const daysLeft = differenceInDays(new Date(e.probation_end_date), today)
            const level: ProbationEmp["level"] =
              daysLeft <= 30  ? "critical" :
              daysLeft <= 90  ? "warning"  :
              daysLeft <= 119 ? "notice"   : "notice"
            return { id:e.id, name:`${e.first_name_th} ${e.last_name_th}`,
              dept:e.department?.name||"-", probation_end_date:e.probation_end_date, daysLeft, level }
          })
          .filter(e => e.daysLeft >= 0 && e.daysLeft <= 119)
          .sort((a,b) => a.daysLeft - b.daysLeft)
        setAlerts(list)
      })
  }, [companyId])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  const critical = visible.filter(a => a.level === "critical")
  const warning  = visible.filter(a => a.level === "warning")
  const notice   = visible.filter(a => a.level === "notice")

  const displayed = expanded ? visible : visible.slice(0, 3)

  const levelCfg = {
    critical: { bg:"bg-rose-50",    border:"border-rose-200",   dot:"bg-rose-500",   text:"text-rose-800",   badge:"bg-rose-100 text-rose-700",   label:"ด่วน!",    badgeBg:"bg-rose-500"   },
    warning:  { bg:"bg-amber-50",   border:"border-amber-200",  dot:"bg-amber-500",  text:"text-amber-800",  badge:"bg-amber-100 text-amber-700",  label:"แจ้งเตือน", badgeBg:"bg-amber-500"  },
    notice:   { bg:"bg-blue-50",    border:"border-blue-200",   dot:"bg-blue-400",   text:"text-blue-800",   badge:"bg-blue-100 text-blue-700",    label:"แจ้งล่วงหน้า", badgeBg:"bg-blue-400" },
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Bell size={15} className="text-amber-500"/>
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-800 text-sm leading-none">การแจ้งเตือนทดลองงาน</p>
          <p className="text-[11px] text-slate-400 mt-0.5">ใกล้สิ้นสุดระยะทดลองงาน</p>
        </div>
        <div className="flex gap-1.5">
          {critical.length > 0 && (
            <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
              {critical.length} ด่วน
            </span>
          )}
          {warning.length > 0 && (
            <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
              {warning.length} เตือน
            </span>
          )}
          {notice.length > 0 && (
            <span className="text-[10px] font-black bg-blue-400 text-white px-2 py-0.5 rounded-full">
              {notice.length} แจ้ง
            </span>
          )}
        </div>
      </div>

      {/* legend */}
      <div className="px-5 py-2 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
        {[
          { color:"bg-rose-500",  label:"≤ 30 วัน (ด่วน)" },
          { color:"bg-amber-500", label:"31–90 วัน (เตือน)" },
          { color:"bg-blue-400",  label:"91–119 วัน (แจ้งล่วงหน้า)" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.color}`}/>
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* list */}
      <div className="divide-y divide-slate-50">
        {displayed.map(a => {
          const cfg = levelCfg[a.level]
          return (
            <div key={a.id} className={`relative flex items-center gap-3 px-5 py-3.5 ${cfg.bg} border-l-4 ${cfg.border}`}>
              {/* colored left bar already from border-l */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                <AlertTriangle size={15}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-black text-[13px] ${cfg.text}`}>{a.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{a.dept}</p>
                <p className={`text-[11px] font-bold mt-0.5 ${cfg.text}`}>
                  สิ้นสุด {format(new Date(a.probation_end_date),"d MMMM yyyy",{locale:th})} · เหลืออีก{" "}
                  <span className="font-black text-[13px]">{a.daysLeft}</span> วัน
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link href={`/admin/employees?highlight=${a.id}`}
                  className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1">
                  ดูข้อมูล <ChevronRight size={10}/>
                </Link>
                <button onClick={() => setDismissed(s => new Set([...Array.from(s), a.id]))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors">
                  <X size={13}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* show more / less */}
      {visible.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full py-2.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-1">
          {expanded ? "แสดงน้อยลง ↑" : `ดูอีก ${visible.length - 3} คน ↓`}
        </button>
      )}
    </div>
  )
}