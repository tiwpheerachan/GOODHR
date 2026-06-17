import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Asset Two-way — read/write tables ที่ sync 5 นาทีกับ Feishu
//
//   GET ?dataset=asset_main|live|tel_user → from feishu_asset_twoway
//   GET ?dataset=tel                      → from feishu_tel_records
//
//   PATCH body:
//     { dataset, feishu_record_id, edit?: {...}, files?: [...], chk?: bool, note?: string }
//     → จะ filter เฉพาะ keys ที่อนุญาตตาม dataset (กัน 403 จาก DB)
//     → บังคับ updated_by='hrms' + updated_at=now() (ตามกฎ conflict resolution)
//
//   POST ?dataset=... → trigger manual sync ที่ Feishu side
// ════════════════════════════════════════════════════════════════════

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]
const UPSTREAM_PULL = "https://hrms-sync-feishu.vercel.app/api/cron/pull"

// ── Whitelist ของ edit fields ตาม dataset ──
const EDIT_WHITELIST: Record<string, string[]> = {
  asset_main: ["maint_status", "damage_level", "damage_detail", "is_correct", "note"],
  live:       ["maint_status", "damage_level", "damage_detail", "is_correct", "note"],
  tel_user:   ["note"],
}

const TEL_DATASET = "tel"
const ALL_DATASETS = ["asset_main", "live", "tel_user", "tel"]
const isValidDataset = (s: string) => ALL_DATASETS.includes(s)

async function auth(req: NextRequest) {
  const cookie = createClient()
  const { data: { user } } = await cookie.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("id, role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, user }
}

// ═══════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const svc = a.svc
  const dataset = req.nextUrl.searchParams.get("dataset") || ""
  if (!isValidDataset(dataset)) {
    return NextResponse.json({ error: `dataset ต้องเป็น: ${ALL_DATASETS.join(", ")}` }, { status: 400 })
  }

  if (dataset === TEL_DATASET) {
    // อ่านจาก feishu_tel_records
    const { data, error, count } = await svc.from("feishu_tel_records")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(5000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      dataset, count: count ?? 0,
      records: data ?? [],
      editable_fields: ["chk", "note", "files"],
    })
  }

  // asset_main / live / tel_user
  const { data, error, count } = await svc.from("feishu_asset_twoway")
    .select("*", { count: "exact" })
    .eq("dataset", dataset)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    dataset, count: count ?? 0,
    records: data ?? [],
    editable_fields: EDIT_WHITELIST[dataset] ?? [],
  })
}

// ═══════════════════════════════════════════════════
// PATCH
// ═══════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const svc = a.svc

  const body = await req.json().catch(() => ({}))
  const { dataset, feishu_record_id } = body
  if (!dataset || !isValidDataset(dataset)) {
    return NextResponse.json({ error: `dataset ไม่ถูกต้อง` }, { status: 400 })
  }
  if (!feishu_record_id) {
    return NextResponse.json({ error: "feishu_record_id required" }, { status: 400 })
  }

  const nowISO = new Date().toISOString()

  if (dataset === TEL_DATASET) {
    // ── Tel: update chk/note/files ──
    const updates: any = { updated_by: "hrms", updated_at: nowISO }
    if ("chk"  in body) updates.chk  = !!body.chk
    if ("note" in body) updates.note = body.note ?? null
    if ("files" in body) {
      const files = Array.isArray(body.files) ? body.files : []
      updates.files = files
        .filter((f: any) => f && typeof f.url === "string" && typeof f.name === "string")
        .slice(0, 10)
        .map((f: any) => ({ name: String(f.name), url: String(f.url) }))
    }
    const { data, error } = await svc.from("feishu_tel_records")
      .update(updates).eq("feishu_record_id", feishu_record_id)
      .select("*").maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "ไม่พบ record" }, { status: 404 })
    return NextResponse.json({ success: true, record: data })
  }

  // ── feishu_asset_twoway (asset_main/live/tel_user) ──
  const whitelist = EDIT_WHITELIST[dataset] ?? []
  const newEdit: Record<string, any> = {}
  if (body.edit && typeof body.edit === "object") {
    for (const k of whitelist) {
      if (k in body.edit) newEdit[k] = body.edit[k]
    }
  }
  const updates: any = { updated_by: "hrms", updated_at: nowISO }

  // merge กับ edit เดิม (กันลบ field อื่นที่ไม่ได้ส่งมา)
  const { data: existing } = await svc.from("feishu_asset_twoway")
    .select("edit").eq("dataset", dataset).eq("feishu_record_id", feishu_record_id).maybeSingle()
  const merged = { ...(existing?.edit ?? {}), ...newEdit }
  updates.edit = merged

  if ("files" in body) {
    const files = Array.isArray(body.files) ? body.files : []
    updates.files = files
      .filter((f: any) => f && typeof f.url === "string" && typeof f.name === "string")
      .slice(0, 10)
      .map((f: any) => ({ name: String(f.name), url: String(f.url) }))
  }

  const { data, error } = await svc.from("feishu_asset_twoway")
    .update(updates)
    .eq("dataset", dataset).eq("feishu_record_id", feishu_record_id)
    .select("*").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "ไม่พบ record" }, { status: 404 })
  return NextResponse.json({ success: true, record: data })
}

// ═══════════════════════════════════════════════════
// POST — trigger manual sync (ดึง Feishu → push GoodHR)
// ═══════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const dataset = req.nextUrl.searchParams.get("dataset") || ""
  if (!isValidDataset(dataset)) {
    return NextResponse.json({ error: "dataset ไม่ถูกต้อง" }, { status: 400 })
  }
  const secret = process.env.SYNC_SECRET
  if (!secret) return NextResponse.json({ error: "ยังไม่ได้ตั้ง SYNC_SECRET" }, { status: 500 })

  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45_000)
    const res = await fetch(`${UPSTREAM_PULL}?dataset=${encodeURIComponent(dataset)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: ac.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      return NextResponse.json({ error: `Sync HTTP ${res.status}` }, { status: 502 })
    }
    const d = await res.json()
    return NextResponse.json(d)
  } catch (e: any) {
    return NextResponse.json({
      error: e?.name === "AbortError" ? "Sync timeout >45s" : (e?.message || "Sync failed"),
    }, { status: 502 })
  }
}
