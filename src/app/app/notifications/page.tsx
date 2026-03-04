"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types/database"
import { Bell, CheckCheck } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const ICONS: Record<string,string> = { leave:"📋", attendance:"⏰", payroll:"💰", announcement:"📢", system:"⚙️" }

export default function NotificationsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<Notification[]>([])

  useEffect(() => {
    if (!user?.employee_id) return
    supabase.from("notifications").select("*").eq("employee_id", user.employee_id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setItems(data as Notification[] ?? []))
  }, [user])

  const markAllRead = async () => {
    if (!user?.employee_id) return
    await supabase.from("notifications").update({ is_read: true }).eq("employee_id", user.employee_id).eq("is_read", false)
    setItems(n => n.map(x => ({ ...x, is_read: true })))
  }

  const unread = items.filter(n => !n.is_read).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div><h1 className="text-xl font-bold text-slate-800">การแจ้งเตือน</h1>{unread > 0 && <p className="text-sm text-slate-500">ยังไม่อ่าน {unread} รายการ</p>}</div>
        {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary-600 font-semibold flex items-center gap-1"><CheckCheck size={14} /> อ่านทั้งหมด</button>}
      </div>
      <div className="space-y-2">
        {items.map(n => (
          <div key={n.id} className={"card flex gap-3 " + (!n.is_read?"bg-primary-50 border-primary-100":"")}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">{ICONS[n.type] || "🔔"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                {!n.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />}
              </div>
              {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
              <p className="text-xs text-slate-400 mt-1">{format(new Date(n.created_at), "d MMM HH:mm", { locale: th })}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-center py-12"><Bell size={32} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">ไม่มีการแจ้งเตือน</p></div>}
      </div>
    </div>
  )
}
