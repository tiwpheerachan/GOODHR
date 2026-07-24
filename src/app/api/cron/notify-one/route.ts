import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { enabledRecipientSet } from "@/lib/notif-rollout"
import { autoSend } from "@/lib/notif-autosend"
import { shouldRelayType, mutedForSuperAdmin } from "@/lib/notif-relay-config"

// ════════════════════════════════════════════════════════════════════
// POST /api/cron/notify-one   (auth: Bearer CRON_SECRET / X-GoodHR-Secret / ?secret)
//   body: { notif_id }
//   ส่ง in-app notification "1 อัน" เข้า Feishu แบบ "เรียลไทม์"
//   (เรียกจาก DB trigger บน notifications INSERT — ดู add_notification_realtime.sql)
//   • recipient = ตามที่แอปเขียนไว้ (ถูกสิทธิ์ GoodHR แล้ว)
//   • ข้ามชนิด queue (kpi/probation pending) + mute kpi/probation ให้ super_admin
//   • gated ด้วย rollout · dedup meta.notif_id (กันซ้ำกับ cron relay)
// ════════════════════════════════════════════════════════════════════
const nameOf = (e: any) => e ? `${e.first_name_th || ""} ${e.last_name_th || ""}${e.nickname ? ` (${e.nickname})` : ""}`.trim() : null
function colorFor(title: string): string {
  if (/ปฏิเสธ|ไม่ผ่าน|reject|fail/i.test(title)) return "red"
  if (/อนุมัติ|ผ่าน|approve|pass|สำเร็จ/i.test(title)) return "green"
  return "blue"
}

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  const tok = auth.startsWith("Bearer ") ? auth.slice(7) : (req.headers.get("x-goodhr-secret") || req.nextUrl.searchParams.get("secret") || "")
  if (!secret || tok !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const id = body?.notif_id || req.nextUrl.searchParams.get("notif_id")
  if (!id) return NextResponse.json({ error: "ต้องระบุ notif_id" }, { status: 400 })

  const svc = createServiceClient()
  const { data: n } = await svc.from("notifications").select("*").eq("id", id).maybeSingle()
  if (!n) return NextResponse.json({ skipped: "ไม่พบ notification" })

  // 1) ชนิด queue → ไม่ auto (ถามใน risemanu)
  if (!shouldRelayType(n.type)) return NextResponse.json({ skipped: `ชนิด ${n.type} ไม่ auto-relay` })

  const eid = n.employee_id || n.recipient_id
  if (!eid) return NextResponse.json({ skipped: "ไม่มีผู้รับ" })

  // 2) กันซ้ำกับ cron relay (ถ้าเคยส่งแล้ว)
  const { data: dup } = await svc.from("notification_send_log").select("id").eq("type", "relay").filter("meta->>notif_id", "eq", id).limit(1).maybeSingle()
  if (dup) return NextResponse.json({ skipped: "ส่งไปแล้ว" })

  // 3) rollout gate
  const enabled = await enabledRecipientSet(svc, [eid])
  if (!enabled.has(eid)) return NextResponse.json({ blocked: "ยังไม่เปิดสิทธิ์รับ" })

  // 4) super_admin mute (kpi/probation/branch_eval เยอะ → ไม่ต้อง auto)
  if (mutedForSuperAdmin(n.type)) {
    const { data: u } = await svc.from("users").select("role").eq("employee_id", eid).maybeSingle()
    if (u?.role === "super_admin") return NextResponse.json({ skipped: "super_admin mute (ถามใน risemanu)" })
  }

  // 5) resolve feishu + ส่ง
  const { data: fu } = await svc.from("feishu_users").select("open_id, feishu_user_id").eq("goodhr_employee_id", eid).limit(1).maybeSingle()
  const { data: e } = await svc.from("employees").select("first_name_th, last_name_th, nickname").eq("id", eid).maybeSingle()
  const title = n.title || "แจ้งเตือนจาก GOODHR"
  const ok = await autoSend(svc, { type: "relay", title, body: n.body ?? n.message ?? "", headerColor: colorFor(title), meta: { notif_id: id, realtime: true } },
    { employee_id: eid, name: nameOf(e), feishu_open_id: fu?.open_id ?? null, feishu_user_id: fu?.feishu_user_id ?? null })

  return NextResponse.json({ sent: ok })
}

export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }
