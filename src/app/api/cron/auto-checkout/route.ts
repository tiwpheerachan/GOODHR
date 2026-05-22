import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// ── ความปลอดภัย: ต้องส่ง Authorization: Bearer <CRON_SECRET> ──────────────
// Set CRON_SECRET ใน Netlify Environment Variables
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// ── GET: ทดสอบ dry-run ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ ok: true, message: "cron/auto-checkout ready" })
}

// ── POST: ไม่ทำ auto-checkout แล้ว — เก็บ endpoint ไว้แค่รายงานจำนวน stuck record ─
// นโยบายใหม่: ไม่ปิด clock_out อัตโนมัติ — ให้พนักงานยื่นคำขอแก้ไขเวลาเอง
// UI ฝั่งพนักงาน (forgotCheckout banner) จะ prompt ให้ส่งคำขอ
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const nowBKK = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  // นับ record ค้างเพื่อรายงาน (ไม่แก้)
  const { count, error: cntErr } = await supa
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .not("clock_in", "is", null)
    .is("clock_out", null)
    .lt("work_date", nowBKK)

  if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 500 })

  return NextResponse.json({
    ok:               true,
    auto_checkout:    "disabled",
    stuck_records:    count ?? 0,
    message:          "auto-checkout ถูกปิดใช้งาน — พนักงานต้องยื่นแก้ไขเวลาเอง",
    run_at:           new Date().toISOString(),
  })
}
