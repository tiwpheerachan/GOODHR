import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Sync บัญชี Feishu → public.feishu_users
//   1. เรียก GET https://hrms-sync-feishu.vercel.app/api/feishu-accounts (Bearer SYNC_SECRET)
//   2. Map 16 ฟิลด์หลัก → upsert ลง feishu_users (key = feishu_user_id)
//   3. ตามด้วย auto-match กับ employees
//   4. mark "หายไป" → set status='resigned' สำหรับ feishu_user_id ที่ไม่อยู่ใน list รอบนี้
//
//   เรียกได้ 2 ทาง:
//   • POST + admin cookie (manual จาก UI)
//   • POST + Header `Authorization: Bearer <CRON_SECRET หรือ SYNC_SECRET>` (จาก cron job)
// ════════════════════════════════════════════════════════════════════

const FEISHU_ENDPOINT = "https://hrms-sync-feishu.vercel.app/api/feishu-accounts"
const ADMIN_ROLES = ["super_admin", "hr_admin"]

export const maxDuration = 120  // 15-20s pull + upsert + match

// ── helpers ──
const lower = (s: any): string | null => {
  if (s == null) return null
  const v = String(s).trim()
  return v ? v.toLowerCase() : null
}
const trimOrNull = (s: any): string | null => {
  if (s == null) return null
  const v = String(s).trim()
  return v || null
}
// map Feishu employee_type int → text
const EMP_TYPE_MAP: Record<number, string> = {
  1: "Regular",
  2: "Intern",
  3: "Contract",
  4: "Outsource",
}
// map Feishu gender int → text
const GENDER_MAP: Record<number, string> = {
  1: "Male",
  2: "Female",
}
// normalize ISO → YYYY-MM-DD (เก็บแค่วันที่)
const dateOnly = (s: any): string | null => {
  if (!s) return null
  try { return new Date(s).toISOString().slice(0, 10) } catch { return null }
}

async function authOK(req: NextRequest, svc: any): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  // 1) Try bearer (cron mode)
  const authHeader = req.headers.get("authorization") || ""
  const secret = process.env.SYNC_SECRET
  if (secret && authHeader === `Bearer ${secret}`) {
    return { ok: true }
  }
  // 2) Try admin cookie
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return { ok: false, error: "Unauthorized", status: 401 }
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return { ok: false, error: "ไม่มีสิทธิ์", status: 403 }
  }
  return { ok: true }
}

export async function POST(req: NextRequest) {
  const svc = createServiceClient()
  const auth = await authOK(req, svc)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const secret = process.env.SYNC_SECRET
  if (!secret) {
    return NextResponse.json({
      error: "SYNC_SECRET ยังไม่ได้ตั้ง — เซ็ตใน env.local + Netlify ก่อนใช้",
    }, { status: 500 })
  }

  const sp = req.nextUrl.searchParams
  const includeRaw = sp.get("raw") === "1"
  const skipAutoMatch = sp.get("auto_match") === "0"

  // ── 1) Pull accounts จาก Feishu API ──
  let payload: any
  try {
    const url = `${FEISHU_ENDPOINT}${includeRaw ? "?raw=1" : ""}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45_000)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: ac.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json({
        error: `Feishu accounts API ตอบ HTTP ${res.status}`,
        upstream: text.slice(0, 500),
      }, { status: 502 })
    }
    payload = await res.json()
  } catch (e: any) {
    return NextResponse.json({
      error: e?.name === "AbortError"
        ? "Feishu accounts API timeout (>45s)"
        : (e?.message || "เรียก Feishu accounts API ไม่สำเร็จ"),
    }, { status: 502 })
  }

  const accounts: any[] = Array.isArray(payload?.accounts) ? payload.accounts : []
  if (accounts.length === 0) {
    return NextResponse.json({
      error: "ไม่มี accounts ใน response",
      payload_keys: Object.keys(payload ?? {}),
    }, { status: 502 })
  }

  // ── 2) Map + upsert ทีละ batch ──
  let upserted = 0, failed = 0
  const seenFeishuIds: string[] = []
  const failedDetails: string[] = []

  // เตรียม rows สำหรับ upsert
  const rows = accounts.map(a => {
    const fuId = String(a.feishu_user_id || "").trim()
    if (!fuId) return null
    seenFeishuIds.push(fuId)

    // กระจาย enterprise_email → email_work + email_business (ทั้ง 2 คอลัมน์เพื่อช่วย match)
    const entEmail = lower(a.enterprise_email)
    const pEmail = lower(a.email)

    const row: any = {
      feishu_user_id:    fuId,
      name:              trimOrNull(a.name) || fuId,
      name_en:           trimOrNull(a.en_name),
      // name_cn = name ถ้าเป็นจีน (มีอักษรจีนอย่างน้อย 1 ตัว)
      name_cn:           /[一-鿿]/.test(String(a.name || "")) ? trimOrNull(a.name) : null,
      nickname:          trimOrNull(a.nickname),
      employee_number:   trimOrNull(a.employee_no),
      email:             pEmail,
      email_work:        entEmail,
      email_business:    entEmail,
      phone:             trimOrNull(a.mobile),
      department_path:   Array.isArray(a.department_names) && a.department_names.length > 0
        ? a.department_names.join(" / ")
        : trimOrNull(a.primary_department),
      job_title:         trimOrNull(a.job_title),
      workforce_type:    typeof a.employee_type === "number" ? (EMP_TYPE_MAP[a.employee_type] || `Type ${a.employee_type}`) : null,
      start_date:        dateOnly(a.join_time),
      gender:            typeof a.gender === "number" ? (GENDER_MAP[a.gender] || null) : null,
      city:              trimOrNull(a.city),
      status:            a.account_status === "active" ? "Active" : (a.account_status === "resigned" ? "Inactive" : (trimOrNull(a.account_status) || "Active")),
      // ✅ ใช้ leader_name (resolved) ตรงๆ ถ้ามี — fallback ใช้ id
      direct_manager_raw: trimOrNull(a.leader_name) || trimOrNull(a.leader_user_id),
      // ตอน sync ครั้งต่อๆ มา — overwrite raw_payload เผื่อใช้ภายหลัง
      raw_payload:       includeRaw && a.raw ? a.raw : null,
      // metadata
      last_imported_batch: `feishu-api-${new Date().toISOString().slice(0, 10)}`,
    }
    // ── ลบ key ที่ null เพื่อไม่ให้ overwrite ของเดิม (ยกเว้น field ที่ track lifecycle) ──
    //    เก็บ status / phone / department_path เสมอ (อาจเปลี่ยน)
    const PRESERVE_NULL = new Set(["raw_payload"])
    for (const k of Object.keys(row)) {
      if (row[k] === null && !PRESERVE_NULL.has(k)) delete row[k]
    }
    return row
  }).filter(Boolean) as any[]

  // ── batch upsert ──
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { error } = await svc.from("feishu_users")
      .upsert(slice, { onConflict: "feishu_user_id", ignoreDuplicates: false })
    if (error) {
      console.error(`[sync-from-feishu] batch ${i / BATCH} failed:`, error.message)
      failed += slice.length
      failedDetails.push(`batch ${i / BATCH}: ${error.message}`)
    } else {
      upserted += slice.length
    }
  }

  // ── 3) Mark missing → "Inactive" (คนที่หายจาก Feishu = ลาออก) ──
  //    ไม่ลบ row จริงๆ — เก็บ history + รักษา mapping เดิมไว้
  let markedInactive = 0
  if (seenFeishuIds.length > 0) {
    const { data: existing } = await svc.from("feishu_users")
      .select("feishu_user_id, status")
      .neq("status", "Inactive")
    const missing = (existing ?? []).filter(r => !seenFeishuIds.includes(r.feishu_user_id))
    if (missing.length > 0) {
      const { error } = await svc.from("feishu_users")
        .update({ status: "Inactive" })
        .in("feishu_user_id", missing.map(r => r.feishu_user_id))
      if (!error) markedInactive = missing.length
    }
  }

  // ── 4) Run auto-match (skip ถ้าระบุ ?auto_match=0) ──
  let autoMatchSummary: any = null
  if (!skipAutoMatch) {
    try {
      const baseUrl = req.nextUrl.origin
      const res = await fetch(`${baseUrl}/api/feishu-users/auto-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": req.headers.get("cookie") || "",
        },
        body: JSON.stringify({ skip_verified: true }),
      })
      if (res.ok) {
        const d = await res.json()
        autoMatchSummary = d.summary
      }
    } catch (e) {
      // ไม่ critical — sync ถือว่าผ่านแล้ว
    }
  }

  return NextResponse.json({
    success: true,
    fetched_at: payload.generated_at || new Date().toISOString(),
    feishu_total: payload.count ?? accounts.length,
    departments: payload.departments ?? null,
    upserted,
    failed,
    failed_details: failedDetails.slice(0, 5),
    marked_inactive: markedInactive,
    auto_match: autoMatchSummary,
  })
}
