import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Feishu Media Proxy
//   GET /api/feishu-media?url=<encoded Feishu URL>
//
//   ลอง proxy ผ่าน upstream `/api/media` (ถ้าทีม Feishu เปิด endpoint แล้ว)
//   ถ้าไม่มี → คืน 404 พร้อมข้อความให้ client fallback เป็น "เปิดใน Feishu"
//
//   เมื่อ Feishu team ทำ /api/media ให้แล้ว → endpoint นี้จะทำงานทันที (zero refactor)
// ════════════════════════════════════════════════════════════════════

const UPSTREAM_BASE = "https://hrms-sync-feishu.vercel.app"
const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]
export const maxDuration = 30

export async function GET(req: NextRequest) {
  // ── auth ──
  const cookie = createClient()
  const { data: { user } } = await cookie.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const targetUrl = req.nextUrl.searchParams.get("url")
  if (!targetUrl) return NextResponse.json({ error: "url required" }, { status: 400 })

  // ── ตรวจว่าเป็น Feishu URL จริง — กัน open proxy ──
  if (!targetUrl.startsWith("https://open.feishu.cn/") && !targetUrl.startsWith("https://s1-imfile.feishucdn.com/") && !targetUrl.startsWith("https://s3-imfile.feishucdn.com/")) {
    return NextResponse.json({ error: "ต้องเป็น Feishu URL เท่านั้น" }, { status: 400 })
  }

  const secret = process.env.SYNC_SECRET
  if (!secret) return NextResponse.json({ error: "ยังไม่ได้ตั้ง SYNC_SECRET" }, { status: 500 })

  // ── ลองเรียก upstream media proxy (ถ้ามี) ──
  try {
    const proxyUrl = `${UPSTREAM_BASE}/api/media?url=${encodeURIComponent(targetUrl)}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 25_000)
    const res = await fetch(proxyUrl, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: ac.signal,
    })
    clearTimeout(timer)

    if (res.ok) {
      // pipe binary content type
      const contentType = res.headers.get("content-type") || "application/octet-stream"
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    if (res.status === 404) {
      return NextResponse.json({
        error: "Feishu media proxy ยังไม่เปิด — ต้องขอทีม Feishu เพิ่ม endpoint /api/media",
        fallback_url: targetUrl,
      }, { status: 404 })
    }

    return NextResponse.json({
      error: `Upstream returned ${res.status}`,
      fallback_url: targetUrl,
    }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({
      error: e?.name === "AbortError" ? "Timeout" : (e?.message || "fetch failed"),
      fallback_url: targetUrl,
    }, { status: 502 })
  }
}
