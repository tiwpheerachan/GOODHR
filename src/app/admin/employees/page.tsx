"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Search, Plus, Download, ChevronRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_LABELS: Record<string,{ l:string; c:string }> = {
  active:{ l:"ปกติ", c:"bg-green-100 text-green-700" },
  probation:{ l:"ทดลองงาน", c:"bg-yellow-100 text-yellow-700" },
  resigned:{ l:"ลาออก", c:"bg-gray-100 text-gray-600" },
  terminated:{ l:"เลิกจ้าง", c:"bg-red-100 text-red-700" },
  on_leave:{ l:"ลาพักร้อน", c:"bg-blue-100 text-blue-700" },
  suspended:{ l:"พักงาน", c:"bg-orange-100 text-orange-700" },
}

export default function EmployeesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("active")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const PER = 20

  const fetch = useCallback(async () => {
    if (!user?.employee?.company_id) return
    setLoading(true)
    let q = supabase.from("employees").select("*, position:positions(name), department:departments(name)", { count:"exact" })
      .eq("company_id", user.employee.company_id).is("deleted_at", null).order("first_name_th").range(page*PER, (page+1)*PER-1)
    if (status) q = q.eq("employment_status", status)
    if (search) q = q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`)
    const { data, count } = await q
    setEmployees(data ?? []); setTotal(count ?? 0); setLoading(false)
  }, [user, search, status, page])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800">พนักงาน</h2><p className="text-slate-500 text-sm">{total} คน</p></div>
        <Link href="/admin/employees/new" className="btn-primary py-2 px-4 text-sm flex items-center gap-2"><Plus size={14} /> เพิ่มพนักงาน</Link>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} className="input-field pl-9 py-2 text-sm" placeholder="ค้นหาชื่อ, รหัส..." /></div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0) }} className="input-field py-2 text-sm w-auto">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["พนักงาน","ตำแหน่ง","แผนก","วันเริ่มงาน","สถานะ",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td></tr> :
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-xs font-bold text-primary-600">{emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : emp.first_name_th?.[0]}</div>
                        <div><p className="font-medium text-slate-800">{emp.first_name_th} {emp.last_name_th}</p><p className="text-xs text-slate-400">{emp.employee_code}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.position?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{emp.hire_date ? format(new Date(emp.hire_date),"d MMM yyyy",{locale:th}) : "-"}</td>
                    <td className="px-4 py-3"><span className={"badge " + (STATUS_LABELS[emp.employment_status]?.c || "bg-gray-100 text-gray-600")}>{STATUS_LABELS[emp.employment_status]?.l || emp.employment_status}</span></td>
                    <td className="px-4 py-3"><Link href={"/admin/employees/"+emp.id} className="text-primary-600 text-xs font-medium flex items-center gap-1">แก้ไข<ChevronRight size={12} /></Link></td>
                  </tr>
                ))
              }
              {!loading && employees.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
        {total > PER && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">แสดง {page*PER+1}–{Math.min((page+1)*PER,total)} จาก {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">ก่อนหน้า</button>
              <button onClick={() => setPage(p => p+1)} disabled={(page+1)*PER>=total} className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">ถัดไป</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
