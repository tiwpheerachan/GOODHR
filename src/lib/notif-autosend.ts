// ── ส่งการ์ดอัตโนมัติ (ระบบส่งเอง) + เขียน log — ใช้ใน cron ───────────
import { sendCard, buildCard, type CardRow } from "@/lib/feishu-send"

type Rec = { employee_id?: string | null; name?: string | null; feishu_user_id?: string | null; feishu_open_id?: string | null }

// ส่งการ์ดหา 1 ผู้รับ + log · คืน true ถ้าส่งสำเร็จ
export async function autoSend(
  svc: any,
  opts: { type: string; title: string; body?: string; rows?: CardRow[]; headerColor?: string },
  rec: Rec,
): Promise<boolean> {
  const card = buildCard({ header_color: opts.headerColor, title: opts.title, body: opts.body, rows: opts.rows, note: "GOODHR · แจ้งเตือนอัตโนมัติ" })
  const recvId = rec.feishu_open_id || rec.feishu_user_id
  const idType = rec.feishu_open_id ? "open_id" : "user_id"
  let status = "failed", messageId: string | undefined, err: string | undefined
  if (!recvId) err = "ไม่มี Feishu ID"
  else {
    const r = await sendCard(recvId, card, idType as any)
    if (r.ok) { status = "sent"; messageId = r.message_id } else err = r.error
  }
  await svc.from("notification_send_log").insert({
    type: opts.type, title: opts.title, body: opts.body ?? null,
    recipient_employee_id: rec.employee_id ?? null, recipient_name: rec.name ?? null, recipient_feishu_id: recvId ?? null,
    sent_by_name: "ระบบอัตโนมัติ", status, message_id: messageId, error: err, meta: { auto: true },
  })
  return status === "sent"
}
