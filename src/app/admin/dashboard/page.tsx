"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Users, Clock, Calendar, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function AdminDashboard() {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState({ employees:0, present:0, pendingLeaves:0, pendingAdj:0 })
  const [recentAtt, setRecentAtt] = useState<any[]>([])
  const today = format(new Date(), "yyyy-MM-dd")

  useEffect(() => {
    if (!user?.employee?.company_id) return
    const cid = user.employee.company_id
    Promise.all([
      supabase.from("employees").select("id",{count:"exact",head:true}).eq("company_id",cid).eq("is_active",true),
      supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",cid).eq("work_date",today).in("status",["present","late","wfh"]),
      supabase.from("leave_requests").select("id",{count:"exact",head:true}).eq("company_id",cid).eq("status","pending"),
      supabase.from("time_adjustment_requests").select("id",{count:"exact",head:true}).eq("company_id",cid).eq("status","pending"),
    ]).then(([e,a,l,d]) => setStats({ employees:e.count??0, present:a.count??0, pendingLeaves:l.count??0, pendingAdj:d.count??0 }))
    supabase.from("attendance_records").select("*, employee:employees(first_name_th,last_name_th,position:positions(name))")
      .eq("company_id",cid).eq("work_date",today).order("clock_in",{ascending:false}).limit(10)
      .then(({ data }) => setRecentAtt(data ?? []))
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">ภาพรวมระบบ</h2>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(),"EEEE d MMMM yyyy",{locale:th})}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l:"พนักงาน", v:stats.employees, icon:Users, c:"text-primary-600 bg-primary-50" },{ l:"มาวันนี้", v:stats.present, icon:Clock, c:"text-green-600 bg-green-50" },{ l:"รอ อนุมัติลา", v:stats.pendingLeaves, icon:Calendar, c:"text-yellow-600 bg-yellow-50" },{ l:"รอแก้เวลา", v:stats.pendingAdj, icon:AlertTriangle, c:"text-orange-600 bg-orange-50" }].map(s => (
          <div key={s.l} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={"w-10 h-10 rounded-xl flex items-center justify-center mb-3 " + s.c.split(" ")[1]}><s.icon size={18} className={s.c.split(" ")[0]} /></div>
            <p className="text-2xl font-bold text-slate-800">{s.v}</p><p className="text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4">การเข้างานวันนี้</h3>
        {recentAtt.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีข้อมูล</p> :
          <div className="space-y-3">
            {recentAtt.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500">{a.employee?.first_name_th?.[0]}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{a.employee?.first_name_th} {a.employee?.last_name_th}</p><p className="text-xs text-slate-400">{a.employee?.position?.name}</p></div>
                <div className="text-right text-xs">
                  <p className="font-medium">{a.clock_in ? format(new Date(a.clock_in),"HH:mm") : "--:--"}</p>
                  {a.late_minutes > 0 && <p className="text-yellow-600">สาย {a.late_minutes}น.</p>}
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}
