"use client"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveBalance, useLeaveRequests } from "@/lib/hooks/useLeave"
import Link from "next/link"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

function StatusBadge({ s }: { s: string }) {
  const m: Record<string,string> = { pending:"status-pending", approved:"status-approved", rejected:"status-rejected", cancelled:"status-cancelled" }
  const l: Record<string,string> = { pending:"รออนุมัติ", approved:"อนุมัติ", rejected:"ปฏิเสธ", cancelled:"ยกเลิก" }
  return <span className={m[s]}>{l[s] ?? s}</span>
}

export default function LeavePage() {
  const { user } = useAuth()
  const { balances } = useLeaveBalance(user?.employee_id)
  const { requests, loading } = useLeaveRequests(user?.employee_id)
  const [tab, setTab] = useState<"balance"|"history">("balance")

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div><h1 className="text-xl font-bold text-slate-800">การลา</h1></div>
        <Link href="/app/leave/new" className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5"><Plus size={14} /> ยื่นลา</Link>
      </div>
      <div className="flex bg-slate-100 rounded-xl p-1">
        {([["balance","โควต้าการลา"],["history","ประวัติการลา"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} className={"flex-1 py-2 text-sm font-semibold rounded-lg transition-all " + (tab===k?"bg-white text-primary-700 shadow-sm":"text-slate-500")}>{l}</button>
        ))}
      </div>
      {tab === "balance" && (
        <div className="space-y-3">
          {balances.map(b => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.leave_type?.color_hex || "#60a5fa" }} />
                  <div><p className="font-semibold text-slate-800 text-sm">{b.leave_type?.name}</p><p className="text-xs text-slate-400">{b.leave_type?.is_paid?"ลาได้รับเงิน":"ลาไม่ได้รับเงิน"}</p></div>
                </div>
                <div className="text-right"><p className="text-xl font-bold text-primary-600">{b.remaining_days}</p><p className="text-xs text-slate-400">คงเหลือ</p></div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-primary-500" style={{ width: b.entitled_days > 0 ? (b.used_days/b.entitled_days*100)+"%" : "0%" }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                <span>ใช้ {b.used_days} วัน</span><span>รอ {b.pending_days} วัน</span><span>ได้รับ {b.entitled_days} วัน</span>
              </div>
            </div>
          ))}
          {balances.length === 0 && <p className="text-center text-slate-400 text-sm py-8">ไม่มีข้อมูลโควต้าการลา</p>}
        </div>
      )}
      {tab === "history" && (
        <div className="space-y-3">
          {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
          {!loading && requests.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{r.leave_type?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{format(new Date(r.start_date), "d MMM", { locale: th })} {r.start_date !== r.end_date && "- " + format(new Date(r.end_date), "d MMM", { locale: th })} · {r.total_days} วัน</p>
                  {r.reason && <p className="text-xs text-slate-400 mt-1 truncate max-w-48">{r.reason}</p>}
                </div>
                <StatusBadge s={r.status} />
              </div>
            </div>
          ))}
          {!loading && requests.length === 0 && <p className="text-center text-slate-400 text-sm py-8">ไม่มีประวัติการลา</p>}
        </div>
      )}
    </div>
  )
}
