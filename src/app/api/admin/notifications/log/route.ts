import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

// GET — ประวัติการส่ง + ฟิลเตอร์ฉลาด
//   ?type= &status= &q=(ค้นชื่อผู้รับ/หัวข้อ) &from=YYYY-MM-DD &to=YYYY-MM-DD
//   &sender=auto|manual  &limit= &offset=  (&export=1 → คืนทั้งหมดไม่แบ่งหน้า)
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const p = req.nextUrl.searchParams
  const type = p.get("type"), status = p.get("status"), qtext = (p.get("q") || "").trim()
  const from = p.get("from"), to = p.get("to"), sender = p.get("sender")
  const isExport = p.get("export") === "1"
  const limit = isExport ? 5000 : Math.min(parseInt(p.get("limit") || "30") || 30, 200)
  const offset = parseInt(p.get("offset") || "0") || 0

  const applyFilters = (query: any) => {
    if (type) query = query.eq("type", type)
    if (status) query = query.eq("status", status)
    if (from) query = query.gte("created_at", `${from}T00:00:00`)
    if (to) query = query.lte("created_at", `${to}T23:59:59`)
    if (sender === "auto") query = query.eq("sent_by_name", "ระบบอัตโนมัติ")
    else if (sender === "manual") query = query.neq("sent_by_name", "ระบบอัตโนมัติ")
    if (qtext) {
      const k = qtext.replace(/[%_,()]/g, "")
      query = query.or(`recipient_name.ilike.%${k}%,title.ilike.%${k}%,recipient_feishu_id.ilike.%${k}%`)
    }
    return query
  }

  let dq = applyFilters(g.svc.from("notification_send_log").select("*")).order("created_at", { ascending: false })
  if (!isExport) dq = dq.range(offset, offset + limit - 1)
  else dq = dq.limit(limit)
  const { data, error } = await dq
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // นับรวม + แยกสำเร็จ/ไม่สำเร็จ (ตามฟิลเตอร์)
  const { count } = await applyFilters(g.svc.from("notification_send_log").select("id", { count: "exact", head: true }))
  const { count: sentCount } = await applyFilters(g.svc.from("notification_send_log").select("id", { count: "exact", head: true }).eq("status", "sent"))

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, sent: sentCount ?? 0, failed: (count ?? 0) - (sentCount ?? 0) })
}
