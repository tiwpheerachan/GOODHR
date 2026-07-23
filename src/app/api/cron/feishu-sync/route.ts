import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { batchOpenIds } from "@/lib/feishu-send"

export const maxDuration = 300

// ════════════════════════════════════════════════════════════════════
// GET/POST /api/cron/feishu-sync   (auth: Bearer CRON_SECRET หรือ ?secret=)
//   งาน cron อัตโนมัติ:
//   1) ดึงพนักงานจาก Feishu → upsert feishu_users + auto-match กับ GoodHR
//      (เรียก /api/feishu-users/sync-from-feishu ด้วย SYNC_SECRET)
//   2) backfill open_id ให้คนใหม่ที่ยังไม่มี (จาก Feishu batch API)
//   → ตั้ง cron ทุก 1 ชม. บน Render/บอท: พนักงานใหม่จาก Feishu เข้า+แมทเอง
// ════════════════════════════════════════════════════════════════════
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("secret") || ""
  if (!secret || token !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const out: any = { ok: true }

  // 1) sync + auto-match (เรียก endpoint เดิมด้วย SYNC_SECRET)
  const syncSecret = process.env.SYNC_SECRET
  if (syncSecret) {
    try {
      const url = new URL("/api/feishu-users/sync-from-feishu", req.nextUrl.origin).toString()
      const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${syncSecret}` } })
      out.sync = await r.json().catch(() => ({ status: r.status }))
    } catch (e: any) { out.sync_error = e.message }
  } else out.sync_skipped = "ไม่มี SYNC_SECRET"

  // 2) backfill open_id คนที่ยังไม่มี
  const svc = createServiceClient()
  const { data: need } = await svc.from("feishu_users")
    .select("feishu_user_id").not("feishu_user_id", "is", null).is("open_id", null).limit(1000)
  const uids = Array.from(new Set((need ?? []).map((r: any) => r.feishu_user_id).filter(Boolean)))
  let backfilled = 0
  if (uids.length) {
    const map = await batchOpenIds(uids)
    for (const [uid, oid] of Array.from(map.entries())) {
      const { error } = await svc.from("feishu_users").update({ open_id: oid }).eq("feishu_user_id", uid)
      if (!error) backfilled++
    }
  }
  out.open_id = { needed: uids.length, backfilled }

  return NextResponse.json(out)
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
