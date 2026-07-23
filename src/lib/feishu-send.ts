// ════════════════════════════════════════════════════════════════════
// Feishu sender — ส่งข้อความเข้า Feishu จาก GoodHR โดยตรง
//   ใช้ FEISHU_APP_ID / FEISHU_APP_SECRET (app ของบอท) — server-side เท่านั้น
//   ⚠️ ห้าม import ในฝั่ง client
// ════════════════════════════════════════════════════════════════════

const FEISHU_BASE = "https://open.feishu.cn"

let _token: { value: string; exp: number } | null = null

// mint tenant_access_token + cache in-memory (~1.9 ชม.)
export async function tenantToken(): Promise<string | null> {
  const now = Date.now()
  if (_token && _token.exp > now + 60_000) return _token.value
  const app_id = process.env.FEISHU_APP_ID
  const app_secret = process.env.FEISHU_APP_SECRET
  if (!app_id || !app_secret) return null
  const res = await fetch(`${FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id, app_secret }),
  })
  const j = await res.json().catch(() => null)
  if (!j || j.code !== 0 || !j.tenant_access_token) return null
  _token = { value: j.tenant_access_token, exp: now + (Number(j.expire || 7000) * 1000) }
  return _token.value
}

// สี header → template ของ Feishu card
const COLOR: Record<string, string> = {
  blue: "blue", green: "green", orange: "orange", red: "red",
  grey: "grey", gray: "grey", purple: "purple", turquoise: "turquoise",
}

// batch: user_id[] → Map<user_id, open_id> (authoritative จาก Feishu, ครั้งละ 45)
export async function batchOpenIds(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const token = await tenantToken()
  if (!token || !userIds.length) return out
  for (let i = 0; i < userIds.length; i += 45) {
    const slice = userIds.slice(i, i + 45)
    const qs = slice.map((u) => `user_ids=${encodeURIComponent(u)}`).join("&")
    const res = await fetch(`${FEISHU_BASE}/open-apis/contact/v3/users/batch?user_id_type=user_id&${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    const j = await res.json().catch(() => null)
    for (const it of j?.data?.items ?? []) if (it.user_id && it.open_id) out.set(it.user_id, it.open_id)
  }
  return out
}

export type CardRow = { label: string; value: string }

// สร้าง interactive card JSON (แบบเดียวกับที่ทดสอบส่ง pilot สำเร็จ)
export function buildCard(opts: {
  header_color?: string
  title: string
  body?: string
  rows?: CardRow[]
  summary?: string
  note?: string
}): any {
  const elements: any[] = []
  if (opts.body) elements.push({ tag: "div", text: { tag: "lark_md", content: opts.body } })
  if (opts.rows && opts.rows.length) {
    if (opts.body) elements.push({ tag: "hr" })
    elements.push({
      tag: "div",
      fields: opts.rows.map((r) => ({
        is_short: true,
        text: { tag: "lark_md", content: `**${r.label}**\n${r.value}` },
      })),
    })
  }
  if (opts.summary) elements.push({ tag: "div", text: { tag: "lark_md", content: opts.summary } })
  elements.push({
    tag: "note",
    elements: [{ tag: "plain_text", content: opts.note || "GOODHR Bot" }],
  })
  return {
    config: { wide_screen_mode: true },
    header: {
      template: COLOR[opts.header_color || "blue"] || "blue",
      title: { tag: "plain_text", content: opts.title },
    },
    elements,
  }
}

// ส่งการ์ดหา 1 ผู้รับ → { ok, message_id, error }
export async function sendCard(
  receiveId: string,
  card: any,
  idType: "open_id" | "user_id" | "email" | "chat_id" = "open_id",
): Promise<{ ok: boolean; message_id?: string; error?: string }> {
  const token = await tenantToken()
  if (!token) return { ok: false, error: "ไม่มี FEISHU_APP_ID/SECRET หรือ mint token ไม่ได้" }
  const res = await fetch(`${FEISHU_BASE}/open-apis/im/v1/messages?receive_id_type=${idType}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ receive_id: receiveId, msg_type: "interactive", content: JSON.stringify(card) }),
  })
  const j = await res.json().catch(() => null)
  if (j && j.code === 0) return { ok: true, message_id: j.data?.message_id }
  return { ok: false, error: j ? `${j.code}: ${j.msg}` : `HTTP ${res.status}` }
}

// ส่งข้อความธรรมดา (text) — เผื่อ fallback
export async function sendText(
  receiveId: string,
  text: string,
  idType: "open_id" | "user_id" | "email" = "open_id",
): Promise<{ ok: boolean; message_id?: string; error?: string }> {
  const token = await tenantToken()
  if (!token) return { ok: false, error: "ไม่มี FEISHU_APP_ID/SECRET" }
  const res = await fetch(`${FEISHU_BASE}/open-apis/im/v1/messages?receive_id_type=${idType}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ receive_id: receiveId, msg_type: "text", content: JSON.stringify({ text }) }),
  })
  const j = await res.json().catch(() => null)
  if (j && j.code === 0) return { ok: true, message_id: j.data?.message_id }
  return { ok: false, error: j ? `${j.code}: ${j.msg}` : `HTTP ${res.status}` }
}
