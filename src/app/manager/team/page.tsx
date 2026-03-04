"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Phone, Mail, Calendar, Loader2 } from "lucide-react"
import { format, differenceInMonths } from "date-fns"
import { th } from "date-fns/locale"

const supabase = createClient()

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const [balances, setBalances] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const year = new Date().getFullYear()

  useEffect(() => {
    mountedRef.current = true
    if (!user?.employee_id) return
    const load = async () => {
      try {
        const { data: history } = await supabase
          .from("employee_manager_history")
          .select("employee_id, employee:employees!employee_id(*, position:positions(name), department:departments(name))")
          .eq("manager_id", user.employee_id)
          .is("effective_to", null)
        if (!mountedRef.current) return
        const memberList = (history ?? []).map((d: any) => d.employee).filter(Boolean)
        setMembers(memberList)
        if (memberList.length === 0) { setLoading(false); return }
        const ids = memberList.map((m: any) => m.id)
        const { data: bals } = await supabase
          .from("leave_balances")
          .select("*, leave_type:leave_types(name,color_hex)")
          .in("employee_id", ids)
          .eq("year", year)
        if (!mountedRef.current) return
        const grouped: Record<string, any[]> = {}
        for (const b of (bals ?? [])) {
          if (!grouped[b.employee_id]) grouped[b.employee_id] = []
          grouped[b.employee_id].push(b)
        }
        setBalances(grouped)
      } catch (e) {
        console.error("team load error:", e)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()
    return () => { mountedRef.current = false }
  }, [user?.employee_id])

  const workLabel = (hireDate: string) => {
    const m = differenceInMonths(new Date(), new Date(hireDate))
    const y = Math.floor(m / 12), mo = m % 12
    if (y > 0 && mo > 0) return `${y} ปี ${mo} เดือน`
    if (y > 0) return `${y} ปี`
    return `${mo} เดือน`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">สมาชิกในทีม</h1>
        <p className="text-sm text-slate-500">{members.length} คน</p>
      </div>
      {loading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>}
      <div className="space-y-4">
        {members.map(m => {
          const memberBals = balances[m.id] ?? []
          return (
            <div key={m.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                    : <span className="text-indigo-600 text-lg font-bold">{m.first_name_th?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{m.first_name_th} {m.last_name_th}</p>
                  <p className="text-sm text-primary-600 font-medium">{m.position?.name}</p>
                  <p className="text-xs text-slate-400">{m.department?.name} · {m.employee_code}</p>
                </div>
                <span className={"badge shrink-0 " + (
                  m.employment_status === "active"    ? "bg-green-100 text-green-700" :
                  m.employment_status === "probation" ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-500")}>
                  {m.employment_status === "active" ? "ปกติ" : m.employment_status === "probation" ? "ทดลองงาน" : m.employment_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                {m.email && <span className="flex items-center gap-1 col-span-2 truncate"><Mail size={11} className="shrink-0" /><span className="truncate">{m.email}</span></span>}
                {m.phone && <span className="flex items-center gap-1"><Phone size={11} className="shrink-0" />{m.phone}</span>}
                {m.hire_date && <span className="flex items-center gap-1"><Calendar size={11} className="shrink-0" />{workLabel(m.hire_date)}</span>}
              </div>
              {memberBals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">วันลาคงเหลือ {year}</p>
                  <div className="flex flex-wrap gap-2">
                    {memberBals.map(b => (
                      <div key={b.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.leave_type?.color_hex || "#94a3b8" }} />
                        <span className="text-xs text-slate-600">{b.leave_type?.name}</span>
                        <span className="text-xs font-bold text-slate-800">{b.remaining_days}/{b.entitled_days}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!loading && members.length === 0 && <p className="text-center py-12 text-slate-400 text-sm">ไม่มีสมาชิกในทีม</p>}
      </div>
    </div>
  )
}