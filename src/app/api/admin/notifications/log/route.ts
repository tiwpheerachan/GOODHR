import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

// GET — list send log + filter(type/status) + pagination
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const p = req.nextUrl.searchParams
  const type = p.get("type")
  const status = p.get("status")
  const limit = Math.min(parseInt(p.get("limit") || "30") || 30, 200)
  const offset = parseInt(p.get("offset") || "0") || 0

  let q = g.svc.from("notification_send_log").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1)
  if (type) q = q.eq("type", type)
  if (status) q = q.eq("status", status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let cq = g.svc.from("notification_send_log").select("id", { count: "exact", head: true })
  if (type) cq = cq.eq("type", type)
  if (status) cq = cq.eq("status", status)
  const { count } = await cq

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
