import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Asset API — cache-first
//   GET /api/asset             → list tables [{table_id, name, count, last_full_sync_at}]
//                                อ่านจาก asset_tables_cache (เร็ว) — ถ้าว่างจะ fetch + cache
//   GET /api/asset?table=<id>  → records ของตารางนั้น
//                                อ่านจาก asset_records_cache (เร็ว, < 100ms)
//                                ถ้า cache ว่าง → trigger initial sync
// ════════════════════════════════════════════════════════════════════

const UPSTREAM = "https://hrms-sync-feishu.vercel.app/api/asset"
const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

async function auth(req: NextRequest) {
  const cookie = createClient()
  const { data: { user } } = await cookie.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc }
}

export async function GET(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const svc = a.svc
  const tableId = req.nextUrl.searchParams.get("table")

  // ── Mode 1: list tables ──
  if (!tableId) {
    const { data: tables } = await svc.from("asset_tables_cache").select("*").order("name")
    // ถ้า cache ว่าง → fetch ครั้งแรกจาก Feishu
    if (!tables || tables.length === 0) {
      const upstream = await fetchUpstream(`${UPSTREAM}`)
      if (upstream.error) return NextResponse.json({ error: upstream.error }, { status: 502 })
      const list = upstream.data.tables ?? []
      if (list.length > 0) {
        await svc.from("asset_tables_cache").upsert(list.map((t: any) => ({
          table_id: t.table_id, name: t.name, count: t.count,
        })))
        return NextResponse.json({ tables: list, source: "feishu" })
      }
      return NextResponse.json({ tables: [] })
    }
    return NextResponse.json({
      tables: tables.map(t => ({
        table_id: t.table_id, name: t.name, count: t.count,
        last_full_sync_at: t.last_full_sync_at,
        last_sync_added: t.last_sync_added,
        last_sync_updated: t.last_sync_updated,
        last_sync_deleted: t.last_sync_deleted,
      })),
      source: "cache",
    })
  }

  // ── Mode 2: table records (cache-first) ──
  const [metaRes, recordsRes] = await Promise.all([
    svc.from("asset_tables_cache").select("*").eq("table_id", tableId).maybeSingle(),
    svc.from("asset_records_cache").select("feishu_record_id, fields, synced_at")
      .eq("table_id", tableId).order("synced_at", { ascending: false }),
  ])
  const meta = metaRes.data
  const cachedRecords = recordsRes.data ?? []

  // ถ้า cache ของตารางนี้ว่าง → initial sync
  if (cachedRecords.length === 0) {
    const synced = await runSyncForTable(svc, tableId)
    if (synced.error) return NextResponse.json({ error: synced.error }, { status: 502 })
    return NextResponse.json({
      table_id: tableId,
      count: synced.payload.count,
      fields: synced.payload.fields,
      records: synced.payload.records,
      generated_at: synced.payload.generated_at,
      source: "feishu",
      diff: synced.diff,
    })
  }

  return NextResponse.json({
    table_id: tableId,
    count: cachedRecords.length,
    fields: meta?.fields ?? [],
    records: cachedRecords.map(r => ({
      record_id: r.feishu_record_id,
      fields: r.fields,
    })),
    generated_at: meta?.last_full_sync_at ?? new Date().toISOString(),
    source: "cache",
  })
}

// ════════════════════════════════════════════════════════════════════
// POST /api/asset?table=<id>  → force sync (diff + upsert)
// ════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const a = await auth(req); if ("error" in a) return a.error
  const svc = a.svc
  const tableId = req.nextUrl.searchParams.get("table")
  if (!tableId) {
    // sync table list only
    const upstream = await fetchUpstream(`${UPSTREAM}`)
    if (upstream.error) return NextResponse.json({ error: upstream.error }, { status: 502 })
    const list = upstream.data.tables ?? []
    if (list.length > 0) {
      await svc.from("asset_tables_cache").upsert(list.map((t: any) => ({
        table_id: t.table_id, name: t.name, count: t.count,
      })))
    }
    return NextResponse.json({ ok: true, tables: list })
  }
  const result = await runSyncForTable(svc, tableId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({
    ok: true,
    table_id: tableId,
    count: result.payload.count,
    fields: result.payload.fields,
    records: result.payload.records,
    generated_at: result.payload.generated_at,
    diff: result.diff,
  })
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
async function fetchUpstream(url: string): Promise<{ data?: any; error?: string }> {
  const secret = process.env.SYNC_SECRET
  if (!secret) return { error: "ยังไม่ได้ตั้ง SYNC_SECRET" }
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45_000)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: ac.signal,
      cache: "no-store",
    })
    clearTimeout(timer)
    if (!res.ok) return { error: `Feishu API HTTP ${res.status}` }
    return { data: await res.json() }
  } catch (e: any) {
    return { error: e?.name === "AbortError" ? "Feishu timeout >45s" : (e?.message || "fetch failed") }
  }
}

// stable JSON hash (sorted keys) สำหรับ diff
function fieldHash(fields: any): string {
  try {
    const sorted = stableStringify(fields)
    // ใช้ btoa เป็น "hash" ง่ายๆ — ไม่ใช่ crypto-secure แต่ deterministic
    let h = 5381
    for (let i = 0; i < sorted.length; i++) {
      h = ((h << 5) + h) + sorted.charCodeAt(i)
      h = h & h
    }
    return h.toString(36)
  } catch { return "0" }
}
function stableStringify(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v)
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]"
  const keys = Object.keys(v).sort()
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}"
}

// runSyncForTable: fetch Feishu → diff with cache → upsert + delete missing
async function runSyncForTable(svc: any, tableId: string): Promise<{
  payload: any; diff: { added: number; updated: number; deleted: number; unchanged: number }; error?: string
}> {
  const upstream = await fetchUpstream(`${UPSTREAM}?table=${encodeURIComponent(tableId)}`)
  if (upstream.error) return { error: upstream.error, payload: null, diff: { added: 0, updated: 0, deleted: 0, unchanged: 0 } }
  const payload = upstream.data
  const records: Array<{ record_id: string; fields: any }> = payload.records ?? []

  // load existing cache
  const { data: existing } = await svc.from("asset_records_cache")
    .select("feishu_record_id, field_hash").eq("table_id", tableId)
  const existingMap = new Map((existing ?? []).map((r: any) => [r.feishu_record_id, r.field_hash]))

  let added = 0, updated = 0, unchanged = 0
  const toUpsert: any[] = []
  const seenIds = new Set<string>()

  for (const r of records) {
    seenIds.add(r.record_id)
    const newHash = fieldHash(r.fields)
    const oldHash = existingMap.get(r.record_id)
    if (oldHash === undefined) {
      added++
      toUpsert.push({
        table_id: tableId, feishu_record_id: r.record_id, fields: r.fields, field_hash: newHash,
        synced_at: new Date().toISOString(),
      })
    } else if (oldHash !== newHash) {
      updated++
      toUpsert.push({
        table_id: tableId, feishu_record_id: r.record_id, fields: r.fields, field_hash: newHash,
        synced_at: new Date().toISOString(),
      })
    } else {
      unchanged++
    }
  }

  // batch upsert
  const BATCH = 200
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const slice = toUpsert.slice(i, i + BATCH)
    const { error } = await svc.from("asset_records_cache")
      .upsert(slice, { onConflict: "table_id,feishu_record_id" })
    if (error) console.error(`[asset sync ${tableId}] upsert batch fail:`, error.message)
  }

  // delete records ที่หายไปจาก Feishu (orphaned)
  let deleted = 0
  const toDelete = Array.from(existingMap.keys()).filter(id => !seenIds.has(id as string))
  if (toDelete.length > 0) {
    const { error } = await svc.from("asset_records_cache")
      .delete().eq("table_id", tableId).in("feishu_record_id", toDelete as string[])
    if (!error) deleted = toDelete.length
  }

  // update table meta
  await svc.from("asset_tables_cache").upsert({
    table_id: tableId,
    name: undefined,   // เก็บชื่อเดิม
    count: records.length,
    fields: payload.fields ?? [],
    last_full_sync_at: new Date().toISOString(),
    last_sync_added: added,
    last_sync_updated: updated,
    last_sync_deleted: deleted,
  }, { onConflict: "table_id", ignoreDuplicates: false })

  return { payload, diff: { added, updated, deleted, unchanged } }
}
