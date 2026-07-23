import { NextRequest, NextResponse } from "next/server"
import { notifGuard, canSend } from "@/lib/notif-admin"
import { EMP_FIELDS, realOpenId, realFeishuId, empName, chunk, type EmpLite } from "@/lib/feishu-notify"
import { buildCard, sendCard } from "@/lib/feishu-send"
import { enabledRecipientSet } from "@/lib/notif-rollout"

// POST { type, title, body, header_color?, rows?, employee_ids[] }
//   ส่งการ์ดหาผู้รับที่เลือก → ส่งจริงเข้า Feishu + เขียน log ทุกครั้ง
export async function POST(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  if (!(await canSend(g.svc, g.role, g.empId))) {
    return NextResponse.json({ error: "คุณไม่มีสิทธิ์ส่งแจ้งเตือน" }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const title: string = (body?.title || "").trim()
  const text: string = (body?.body || "").trim()
  const type: string = body?.type || "custom"
  const audience: string = body?.audience || "employee"
  const headerColor: string = body?.header_color || "blue"
  const rows = Array.isArray(body?.rows) ? body.rows : undefined
  const ids: string[] = Array.isArray(body?.employee_ids) ? body.employee_ids : []
  if (!title) return NextResponse.json({ error: "ต้องมีหัวข้อ" }, { status: 400 })
  if (!ids.length) return NextResponse.json({ error: "ต้องเลือกผู้รับอย่างน้อย 1 คน" }, { status: 400 })

  // ดึงพนักงาน (พร้อม fmap → open_id จริง)
  const empMap = new Map<string, EmpLite>()
  for (const c of chunk(ids, 200)) {
    const { data } = await g.svc.from("employees").select(EMP_FIELDS).in("id", c)
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }

  const card = buildCard({ header_color: headerColor, title, body: text, rows, note: `ส่งโดย ${g.name || "แอดมิน"} · GOODHR` })

  // rollout gate: ส่งเฉพาะคนที่ "เปิดสิทธิ์รับแจ้งเตือน" แล้ว (นำร่อง)
  const enabled = await enabledRecipientSet(g.svc, ids)

  const results: any[] = []
  let sent = 0, failed = 0, blocked = 0
  for (const id of ids) {
    const e = empMap.get(id)
    const rname = e ? empName(e) : null
    const openId = e ? realOpenId(e) : null
    const userId = e ? realFeishuId(e) : null
    const recvId = openId || userId
    const idType = openId ? "open_id" : "user_id"

    let status = "failed", messageId: string | undefined, err: string | undefined
    if (!enabled.has(id)) {
      status = "blocked"; err = "ยังไม่เปิดสิทธิ์รับแจ้งเตือน (นำร่อง)"
    } else if (!recvId) {
      err = "ไม่มี Feishu ID (ยังไม่ผูก)"
    } else {
      const r = await sendCard(recvId, card, idType as any)
      if (r.ok) { status = "sent"; messageId = r.message_id } else { err = r.error }
    }
    if (status === "sent") sent++; else if (status === "blocked") blocked++; else failed++

    // log ทุกครั้ง
    await g.svc.from("notification_send_log").insert({
      type, audience, title, body: text,
      recipient_employee_id: id, recipient_name: rname, recipient_feishu_id: recvId,
      sent_by: g.userId, sent_by_name: g.name,
      status, message_id: messageId, error: err,
      meta: { header_color: headerColor, id_type: recvId ? idType : null },
    })
    results.push({ employee_id: id, name: rname, status, error: err })
  }

  return NextResponse.json({ sent, failed, blocked, total: ids.length, results })
}
