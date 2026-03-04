"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Check, X } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function AdminLeavePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")

  const load = async () => {
    if (!user?.employee?.company_id) return
    setLoading(true)
    let q = supabase.from("leave_requests").select("*, employee:employees(id,first_name_th,last_name_th,position:positions(name)), leave_type:leave_types(*)").eq("company_id",user.employee.company_id).is("deleted_at",null).order("created_at",{ascending:false})
    if (filter) q = q.eq("status",filter)
    const { data } = await q
    setRequests(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, user])

  const handle = async (id: string, action: "approved"|"rejected", note?: string) => {
    await supabase.from("leave_requests").update({ status:action, reviewed_by:user?.employee_id, reviewed_at:new Date().toISOString() }).eq("id",id)
    const item = requests.find(r => r.id === id)
    if (item) await supabase.from("notifications").insert({ employee_id:item.employee_id, type:"leave", title:action==="approved"?"ใบลาของคุณได้รับการอนุมัติ":"ใบลาของคุณถูกปฏิเสธ" })
    toast.success(action==="approved"?"อนุมัติแล้ว":"ปฏิเสธแล้ว")
    load()
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-800">การลา</h2><p className="text-slate-500 text-sm">{requests.length} รายการ</p></div>
      <div className="flex gap-2">
        {[["pending","รออนุมัติ"],["approved","อนุมัติแล้ว"],["rejected","ปฏิเสธ"],["","ทั้งหมด"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={"px-4 py-2 rounded-xl text-sm font-semibold " + (filter===v?"bg-primary-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{l}</button>
        ))}
      </div>
      {loading ? <p className="text-center py-8 text-slate-400">กำลังโหลด...</p> :
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100"><tr>{["พนักงาน","ประเภท","วันที่","จำนวน","เหตุผล","สถานะ",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-50">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{r.employee?.first_name_th} {r.employee?.last_name_th}</p><p className="text-xs text-slate-400">{r.employee?.position?.name}</p></td>
                  <td className="px-4 py-3 text-slate-600">{r.leave_type?.name}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{format(new Date(r.start_date),"d MMM",{locale:th})} {r.start_date!==r.end_date && "- "+format(new Date(r.end_date),"d MMM",{locale:th})}</td>
                  <td className="px-4 py-3 text-slate-600">{r.total_days} วัน</td>
                  <td className="px-4 py-3 text-slate-500 max-w-32 truncate">{r.reason || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={r.status==="pending"?"status-pending":r.status==="approved"?"status-approved":r.status==="rejected"?"status-rejected":"badge bg-gray-100 text-gray-600"}>
                      {r.status==="pending"?"รออนุมัติ":r.status==="approved"?"อนุมัติ":r.status==="rejected"?"ปฏิเสธ":"ยกเลิก"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && <div className="flex gap-1">
                      <button onClick={() => handle(r.id,"rejected")} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><X size={12} /></button>
                      <button onClick={() => handle(r.id,"approved")} className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"><Check size={12} /></button>
                    </div>}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      }
    </div>
  )
}
