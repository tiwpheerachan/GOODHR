import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]
const ALLOWED_DATASETS = ["payroll", "attendance", "kpi", "leave", "employee", "probation"] as const
type Dataset = typeof ALLOWED_DATASETS[number]

const SYNC_ENDPOINT = "https://hrms-sync-feishu.vercel.app/api/cron/pull"

// Allow up to 90s for slow datasets (attendance)
export const maxDuration = 90

export async function POST(req: NextRequest) {
  // ── Auth: admin only ──
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).maybeSingle()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  // ── Validate dataset ──
  const body = await req.json().catch(() => ({}))
  const dataset = String(body?.dataset || "").trim() as Dataset
  if (!ALLOWED_DATASETS.includes(dataset)) {
    return NextResponse.json({
      error: `dataset ต้องเป็นหนึ่งใน: ${ALLOWED_DATASETS.join(", ")}`,
    }, { status: 400 })
  }

  // ── Validate secret ──
  const secret = process.env.SYNC_SECRET
  if (!secret) {
    return NextResponse.json({
      error: "ระบบยังไม่ได้ตั้งค่า SYNC_SECRET — โปรดติดต่อผู้ดูแลระบบ",
    }, { status: 500 })
  }

  // ── Proxy → external sync service ──
  try {
    const url = `${SYNC_ENDPOINT}?dataset=${encodeURIComponent(dataset)}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 85_000)
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: ac.signal,
    })
    clearTimeout(timer)

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!res.ok) {
      return NextResponse.json({
        error: data?.error || `Sync service ตอบ HTTP ${res.status}`,
        upstream_status: res.status,
        upstream: data,
      }, { status: 502 })
    }

    // Normalize response — pull written count from results[0]
    const result = Array.isArray(data?.results) ? data.results[0] : null
    return NextResponse.json({
      ok: true,
      dataset,
      written: result?.written ?? 0,
      table:   result?.table   ?? null,
      results: data?.results   ?? [],
    })
  } catch (e: any) {
    const isTimeout = e?.name === "AbortError"
    return NextResponse.json({
      error: isTimeout
        ? "Sync ใช้เวลานานเกิน 85 วินาที — ลองอีกครั้ง หรือดู log ฝั่ง Feishu sync"
        : (e?.message || "เรียก Sync service ไม่สำเร็จ"),
    }, { status: isTimeout ? 504 : 500 })
  }
}
