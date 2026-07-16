import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// ตั้งค่า Feishu Webhook (push realtime) — admin เท่านั้น
//   GET  → { configured, url_masked, enabled }
//   PUT  { feishu_url, secret, enabled }  → บันทึกค่า
//   POST { test:true }  → ยิง payload ทดสอบไป URL ที่ตั้งไว้
// ════════════════════════════════════════════════════════════════════

async function getAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc }
}

function mask(url: string | null) {
  if (!url) return null
  try { const u = new URL(url); return `${u.origin}/…${u.pathname.slice(-6)}` } catch { return url.slice(0, 24) + "…" }
}

export async function GET() {
  const a = await getAdmin(); if (a.error) return a.error
  const { data } = await a.svc.from("webhook_config").select("feishu_url, enabled, updated_at").eq("id", 1).maybeSingle()
  return NextResponse.json({
    configured: !!data?.feishu_url,
    url_masked: mask(data?.feishu_url ?? null),
    enabled: data?.enabled ?? false,
    updated_at: data?.updated_at ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const a = await getAdmin(); if (a.error) return a.error
  const body = await req.json().catch(() => ({}))
  const feishu_url = (body?.feishu_url ?? "").toString().trim() || null
  const secret = body?.secret !== undefined ? (body.secret ?? "").toString().trim() || null : undefined
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : undefined
  if (feishu_url && !/^https?:\/\//.test(feishu_url)) {
    return NextResponse.json({ error: "URL ต้องขึ้นต้นด้วย http(s)://" }, { status: 400 })
  }
  const update: any = { updated_at: new Date().toISOString() }
  if (feishu_url !== undefined) update.feishu_url = feishu_url
  if (secret !== undefined) update.secret = secret
  if (enabled !== undefined) update.enabled = enabled
  const { error } = await a.svc.from("webhook_config").upsert({ id: 1, ...update }, { onConflict: "id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ยิง payload ทดสอบไป URL ของเพื่อน (ให้เพื่อนเช็ค receiver)
export async function POST() {
  const a = await getAdmin(); if (a.error) return a.error
  const { data: cfg } = await a.svc.from("webhook_config").select("feishu_url, secret").eq("id", 1).maybeSingle()
  if (!cfg?.feishu_url) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า URL" }, { status: 400 })
  try {
    const res = await fetch(cfg.feishu_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-GoodHR-Secret": cfg.secret || "" },
      body: JSON.stringify({
        event: "test", request_type: "test", request_id: "00000000-test",
        employee_id: null, status: "test", at: new Date().toISOString(),
        note: "ทดสอบ webhook จาก GOODHR",
      }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text().catch(() => "")
    return NextResponse.json({ success: res.ok, status: res.status, response: text.slice(0, 300) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "ยิงไม่สำเร็จ" }, { status: 502 })
  }
}
