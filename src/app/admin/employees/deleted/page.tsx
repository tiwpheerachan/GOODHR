"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Loader2, RotateCcw, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export default function DeletedEmployeesPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [employees, setEmployees] = useState<any[]>([])
  const [logs,      setLogs]      = useState<Record<string, any[]>>({})
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [restoring, setRestoring] = useState<string | null>(null)

  const isAdmin = user?.role === "super_admin" || user?.role === "hr_admin"

  const load = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from("employees")
        .select(`
          id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
          employment_status, employment_type, deleted_at, deleted_by,
          company_id,
          position:positions(name),
          department:departments(name),
          company:companies(name_th, code)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })

      // hr_admin ที่ไม่ใช่ super_admin → เห็นแค่บริษัทตัวเอง
      if (user?.role === "hr_admin" && (user as any)?.employee?.company_id) {
        q = q.eq("company_id", (user as any).employee.company_id)
      }

      if (search) {
        q = q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`)
      }

      const { data } = await q
      setEmployees(data ?? [])

      // ดึง deletion log ทุกคน
      if (data && data.length > 0) {
        const ids = data.map((e: any) => e.id)
        const { data: logData } = await supabase
          .from("employee_deletion_log")
          .select("*")
          .in("employee_id", ids)
          .order("created_at", { ascending: false })

        const grouped: Record<string, any[]> = {}
        for (const l of logData ?? []) {
          if (!grouped[l.employee_id]) grouped[l.employee_id] = []
          grouped[l.employee_id].push(l)
        }
        setLogs(grouped)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, search]) // eslint-disable-line

  const handleRestore = async (employeeId: string, name: string) => {
    setRestoring(employeeId)
    try {
      const res = await fetch("/api/employees/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", employee_id: employeeId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "เกิดข้อผิดพลาด"); return }
      toast.success(data.message || `กู้คืน ${name} เรียบร้อย`)
      load()
    } catch { toast.error("เกิดข้อผิดพลาด") }
    finally { setRestoring(null) }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Trash2 size={40} className="text-slate-300"/>
        <p>ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={18}/>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-800">ประวัติการลบพนักงาน</h2>
          <p className="text-slate-400 text-sm mt-0.5">พนักงานที่ถูกลบออกจากระบบ — สามารถกู้คืนได้</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin"/>กำลังโหลด...
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Trash2 size={40} className="text-slate-200"/>
          <p className="text-sm">ไม่มีพนักงานที่ถูกลบ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp: any) => {
            const empLogs = logs[emp.id] ?? []
            const deleteLog = empLogs.find((l: any) => l.action === "delete")
            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm bg-gradient-to-br from-slate-400 to-slate-500 flex-shrink-0">
                    {emp.first_name_th?.[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-800">{emp.first_name_th} {emp.last_name_th}</p>
                      {emp.nickname && <span className="text-slate-400 text-xs">({emp.nickname})</span>}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">ถูกลบ</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-slate-400">{emp.employee_code}</span>
                      {(emp.position as any)?.name && <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{(emp.position as any).name}</span>
                      </>}
                      {(emp.company as any)?.name_th && <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{(emp.company as any).name_th}</span>
                      </>}
                    </div>

                    {/* Delete info */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-500">
                        ลบเมื่อ: {emp.deleted_at ? format(new Date(emp.deleted_at), "d MMM yyyy HH:mm", { locale: th }) : "—"}
                      </span>
                      {deleteLog?.reason && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">เหตุผล: {deleteLog.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Restore button */}
                  <button
                    onClick={() => handleRestore(emp.id, `${emp.first_name_th} ${emp.last_name_th}`)}
                    disabled={restoring === emp.id}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm flex-shrink-0">
                    {restoring === emp.id
                      ? <Loader2 size={13} className="animate-spin"/>
                      : <RotateCcw size={13}/>
                    }
                    กู้คืน
                  </button>
                </div>

                {/* Deletion log history */}
                {empLogs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {empLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          log.action === "delete" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                        }`}>
                          {log.action === "delete" ? "ลบ" : "กู้คืน"}
                        </span>
                        <span>{format(new Date(log.created_at), "d MMM yyyy HH:mm", { locale: th })}</span>
                        {log.reason && <span className="text-slate-400">— {log.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
