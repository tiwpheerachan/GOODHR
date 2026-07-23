import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { autoSend } from "@/lib/notif-autosend"
import { enabledRecipientSet } from "@/lib/notif-rollout"

export const maxDuration = 300

const empNameOf = (e: any) => e ? `${e.first_name_th || ""} ${e.last_name_th || ""}${e.nickname ? ` (${e.nickname})` : ""}`.trim() : null
function colorForNoti(n: any): string {
  const title = n.title || ""
  if (/ปฏิเสธ|ไม่ผ่าน|reject|fail/i.test(title)) return "red"
  if (/อนุมัติ|ผ่าน|approve|pass|สำเร็จ/i.test(title)) return "green"
  return "blue"
}

// ════════════════════════════════════════════════════════════════════
// GET/POST /api/cron/notify?type=all|checkin_due|checkout_reminder|manager_digest|
//                                celebrations|stale_approvals|probation_due
//   (auth: Bearer CRON_SECRET หรือ ?secret=)
//   GoodHR ส่งแจ้งเตือนอัตโนมัติ "เอง" → เฉพาะคนที่เปิดสิทธิ์รับ (rollout gated)
//   + เคารพ enabled ของ notification_templates + เขียน log ทุกครั้ง
//   ตั้ง cron หลายเวลา: checkin ~08:50, checkout ~18:00, digest ~09:15, ฯลฯ
// ════════════════════════════════════════════════════════════════════
const ALL_TYPES = ["checkin_due", "checkout_reminder", "manager_digest", "celebrations", "stale_approvals", "probation_due"]

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  const tok = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("secret") || ""
  if (!secret || tok !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const botSecret = process.env.FEISHU_BOT_SECRET
  if (!botSecret) return NextResponse.json({ error: "missing FEISHU_BOT_SECRET" }, { status: 500 })
  const origin = req.nextUrl.origin
  const svc = createServiceClient()

  const typeParam = req.nextUrl.searchParams.get("type") || "all"
  const types = typeParam === "all" ? ALL_TYPES : typeParam.split(",").map((t) => t.trim()).filter(Boolean)

  // config template (enabled + custom ข้อความ/สี)
  const { data: tmpls } = await svc.from("notification_templates").select("*")
  const tMap = new Map<string, any>((tmpls ?? []).map((t: any) => [t.key, t]))

  // ดึงข้อมูลจาก pull endpoint (rollout gated อยู่แล้ว)
  const pull = async (path: string) => {
    const r = await fetch(`${origin}/api/feishu-notify/${path}`, { headers: { Authorization: `Bearer ${botSecret}` } })
    return r.ok ? r.json() : null
  }

  const out: Record<string, any> = {}
  for (const type of types) {
    const t = tMap.get(type)
    if (t && t.enabled === false) { out[type] = { skipped: "ปิดใช้งาน" }; continue }
    const title = t?.title_tmpl || type
    const color = t?.header_color || "blue"
    const bodyT = t?.body_tmpl || ""
    let sent = 0, failed = 0

    try {
      if (type === "relay") {
        // relay in-app notifications (อนุมัติ/ปฏิเสธ/มอบหมาย ฯลฯ) → Feishu โดย GoodHR เอง
        const win = new Date(Date.now() - 20 * 60_000).toISOString()   // 20 นาทีล่าสุด
        const { data: notis } = await svc.from("notifications").select("*").gte("created_at", win).order("created_at").limit(500)
        const list = notis ?? []
        if (list.length) {
          // dedup: ที่ relay ไปแล้ว (จาก send_log)
          const { data: done } = await svc.from("notification_send_log").select("meta").eq("type", "relay").gte("created_at", win).limit(3000)
          const doneSet = new Set((done ?? []).map((d: any) => d.meta?.notif_id).filter(Boolean))
          const fresh = list.filter((n: any) => !doneSet.has(n.id) && (n.employee_id || n.recipient_id))
          const recIds = Array.from(new Set(fresh.map((n: any) => n.employee_id || n.recipient_id)))
          // map emp → feishu + ชื่อ + rollout
          const feishu = new Map<string, any>(), names = new Map<string, string>()
          for (let i = 0; i < recIds.length; i += 300) {
            const c = recIds.slice(i, i + 300)
            const { data: fus } = await svc.from("feishu_users").select("goodhr_employee_id, open_id, feishu_user_id, status").in("goodhr_employee_id", c)
            for (const f of fus ?? []) if (f.goodhr_employee_id && !feishu.has(f.goodhr_employee_id)) feishu.set(f.goodhr_employee_id, f)
            const { data: es } = await svc.from("employees").select("id, first_name_th, last_name_th, nickname").in("id", c)
            for (const e of es ?? []) names.set(e.id, empNameOf(e) || "")
          }
          const enabled = await enabledRecipientSet(svc, recIds as string[])
          for (const n of fresh) {
            const eid = n.employee_id || n.recipient_id
            if (!enabled.has(eid)) { failed++; continue }   // ยังไม่เปิดสิทธิ์รับ → ข้าม (ไม่ log ป้องกัน retry มั่ว)
            const f = feishu.get(eid)
            const ok = await autoSend(svc, {
              type: "relay", title: n.title || "แจ้งเตือนจาก GOODHR", body: n.body ?? n.message ?? "",
              headerColor: colorForNoti(n), meta: { notif_id: n.id },
            }, { employee_id: eid, name: names.get(eid) || null, feishu_open_id: f?.open_id ?? null, feishu_user_id: f?.feishu_user_id ?? null })
            ok ? sent++ : failed++
          }
        }
        out[type] = { sent, failed }
        continue
      }
      if (type === "checkin_due") {
        const d = await pull("checkin-due")
        for (const r of d?.recipients ?? []) {
          const rows = [{ label: "🕘 กะเริ่ม", value: r.shift_start }, { label: "⏳ อีก", value: `${r.minutes_until_start} นาที` }, { label: "📍 สาขา", value: r.branch || "-" }]
          ;(await autoSend(svc, { type, title, body: bodyT, rows, headerColor: color }, r)) ? sent++ : failed++
        }
      } else if (type === "checkout_reminder") {
        const d = await pull("checkout-reminders")
        for (const r of d?.recipients ?? []) {
          const rows = [{ label: "🕕 กะเลิก", value: r.shift_end }, { label: "ผ่านมา", value: `${r.minutes_since_end} นาที` }]
          ;(await autoSend(svc, { type, title, body: bodyT, rows, headerColor: color }, r)) ? sent++ : failed++
        }
      } else if (type === "manager_digest") {
        const d = await pull("manager-digest")
        for (const m of d?.managers ?? []) {
          const s = m.summary || {}
          const rows = [
            { label: "✅ มาแล้ว", value: String(s.present ?? 0) }, { label: "🕐 มาสาย", value: String(s.late ?? 0) },
            { label: "🏖️ ลา", value: String(s.leave ?? 0) }, { label: "⏳ ยังไม่เช็คอิน", value: String(s.not_checked_in ?? 0) },
            { label: "📋 คำขอค้าง", value: String(s.pending_approvals ?? 0) },
          ]
          ;(await autoSend(svc, { type, title, body: `ทีมคุณวันนี้ ${m.team_size ?? 0} คน`, rows, headerColor: color }, m.manager)) ? sent++ : failed++
        }
      } else if (type === "stale_approvals") {
        const d = await pull("stale-approvals?days=3")
        for (const m of d?.managers ?? []) {
          const rows = [{ label: "ค้างทั้งหมด", value: `${m.stale_count} รายการ` }, { label: "เก่าสุด", value: `${m.max_age_days} วัน` }]
          ;(await autoSend(svc, { type, title, body: bodyT, rows, headerColor: color }, m.manager)) ? sent++ : failed++
        }
      } else if (type === "celebrations") {
        const d = await pull("celebrations")
        for (const r of d?.birthdays ?? []) (await autoSend(svc, { type, title, body: bodyT || "สุขสันต์วันเกิดนะ 🎉 ทีมงาน GOODHR คิดถึงคุณ 💛", headerColor: color }, r)) ? sent++ : failed++
        for (const r of d?.anniversaries ?? []) (await autoSend(svc, { type, title: "🎊 ครบรอบการทำงาน", body: `ขอบคุณที่อยู่กับเรามาครบ ${r.years} ปี 🎉`, headerColor: "green" }, r)) ? sent++ : failed++
      } else if (type === "probation_due") {
        const d = await pull("probation-due?before=3")
        const names = (d?.employees ?? []).map((e: any) => e.name).join(", ")
        const rows = [{ label: "จำนวน", value: `${(d?.employees ?? []).length} คน` }, { label: "รายชื่อ", value: names || "-" }]
        for (const hr of d?.hr_recipients ?? []) (await autoSend(svc, { type, title, body: bodyT, rows, headerColor: color }, hr)) ? sent++ : failed++
      } else { out[type] = { error: "ไม่รู้จักชนิดนี้" }; continue }
      out[type] = { sent, failed }
    } catch (e: any) { out[type] = { error: e.message } }
  }

  return NextResponse.json({ ok: true, result: out })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
