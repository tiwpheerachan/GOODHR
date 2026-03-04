"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { statusToTH, statusColor } from "@/lib/utils/attendance"

// Singleton
const supabase = createClient()

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const [pending, setPending] = useState(0)
  const [todayAtt, setTodayAtt] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const today = format(new Date(), "yyyy-MM-dd")

  const load = useCallback(async () => {
    if (!user?.employee_id) return
    setLoading(true)
    try {
      // ✅ ระบุ FK ชัดเจน !employee_id แก้ "ambiguous relationship" error
      const { data: history, error: hErr } = await supabase
        .from("employee_manager_history")
        .select("employee_id, employee:employees!employee_id(id,first_name_th,last_name_th,position:positions(name))")
        .eq("manager_id", user.employee_id)
        .is("effective_to", null)

      if (hErr) { console.error("history error:", hErr.message); setLoading(false); return }
      if (!mountedRef.current) return
      const memberList = (history ?? []).map((d: any) => d.employee).filter(Boolean)
      setMembers(memberList)

      if (memberList.length === 0) {
        setPending(0)
        setTodayAtt([])
        setLoading(false)
        return
      }

      const ids = memberList.map((m: any) => m.id)

      // ดึงข้อมูลพร้อมกัน — pending เฉพาะลูกทีม ไม่ใช่ทั้งบริษัท
      const [attRes, pendingRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("employee_id,status,clock_in,late_minutes")
          .in("employee_id", ids)
          .eq("work_date", today),
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .in("employee_id", ids)     // ✅ เฉพาะลูกทีม
          .eq("status", "pending"),
      ])

      if (!mountedRef.current) return
      setTodayAtt(attRes.data ?? [])
      setPending(pendingRes.count ?? 0)
    } catch (e) {
      console.error("manager dashboard load error:", e)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [user?.employee_id, today])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <p className="text-slate-500 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
        <h1 className="text-xl font-bold text-slate-800">ภาพรวมทีม</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "สมาชิก",   v: members.length, c: "bg-indigo-50 text-indigo-600" },
          { l: "มาวันนี้",  v: todayAtt.filter(a => ["present","late","wfh"].includes(a.status)).length, c: "bg-green-50 text-green-600" },
          { l: "รออนุมัติ", v: pending,        c: "bg-yellow-50 text-yellow-600" },
        ].map(s => (
          <div key={s.l} className={s.c.split(" ")[0] + " card text-center"}>
            <p className={"text-2xl font-bold " + s.c.split(" ")[1]}>{s.v}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Banner รออนุมัติ */}
      {pending > 0 && (
        <Link href="/manager/approvals" className="card bg-yellow-50 border-yellow-200 flex items-center justify-between hover:bg-yellow-100">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-800">มี {pending} รายการรออนุมัติ</span>
          </div>
          <span className="text-xs text-yellow-700">ดูเลย →</span>
        </Link>
      )}

      {/* การเข้างานวันนี้ */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">การเข้างานวันนี้</h3>
          <Link href="/manager/team" className="text-xs text-indigo-600">ดูทีม</Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">กำลังโหลด...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">ไม่มีสมาชิกในทีม</p>
        ) : (
          <div className="space-y-2">
            {members.map((m: any) => {
              const att = todayAtt.find(a => a.employee_id === m.id)
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-sm font-bold text-indigo-600">
                    {m.first_name_th?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.first_name_th} {m.last_name_th}</p>
                    <p className="text-xs text-slate-400">{m.position?.name}</p>
                  </div>
                  <div className="text-right">
                    {att ? (
                      <>
                        <span className={"badge " + statusColor(att.status)}>{statusToTH(att.status)}</span>
                        {att.clock_in && (
                          <p className="text-xs text-slate-400 mt-0.5">{format(new Date(att.clock_in), "HH:mm")}</p>
                        )}
                      </>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-400">ยังไม่มาสแกน</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}