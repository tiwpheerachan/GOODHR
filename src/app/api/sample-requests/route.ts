import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Sample Request — อ่าน/เขียนตาราง public.sample_requests
//   Source of truth = ฟอร์ม Feishu (sync ทุก ~5 นาที)
//   HRMS เขียนได้เฉพาะ 6 คอลัมน์ส่งคืน/ไฟล์ เท่านั้น (ข้อจำกัด column-level grants)
// ════════════════════════════════════════════════════════════════════

const ALLOWED_RETURN_FIELDS = [
  "return_done", "return_note", "return_date", "return_files",
] as const

// ── GET /api/sample-requests ──
//   ?q=          (search request_no/sku/requester/brand)
//   ?status=     (Approved/Rejected/Pending)
//   ?situation=  (Not returned&不退回 / Returned&退回 / ...)
//   ?return_done=true|false
//   ?requester=  (exact match — for employee tab)
//   ?limit=100&offset=0
export async function GET(req: NextRequest) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ใช้ service role สำหรับอ่าน (มี ~826 แถว, RLS เปิด)
  const svc = createServiceClient()

  const sp = req.nextUrl.searchParams
  const q          = (sp.get("q") || "").trim()
  const status     = (sp.get("status") || "").trim()
  const situation  = (sp.get("situation") || "").trim()
  const returnDone = sp.get("return_done")
  const requester  = (sp.get("requester") || "").trim()
  const limit  = Math.min(parseInt(sp.get("limit") || "100"), 1000)
  const offset = parseInt(sp.get("offset") || "0")

  let query = svc.from("sample_requests").select("*", { count: "exact" })
    .order("application_date", { ascending: false, nullsFirst: false })
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (status)     query = query.eq("status", status)
  if (situation)  query = query.eq("situation", situation)
  if (returnDone === "true")  query = query.eq("return_done", true)
  if (returnDone === "false") query = query.eq("return_done", false)
  if (requester) {
    // match ชื่อผู้ขอ (string คั่น ", ") — ใช้ ilike เผื่อมีหลายชื่อ
    const safe = requester.replace(/[%_,()]/g, "")
    query = query.ilike("requester", `%${safe}%`)
  }
  if (q) {
    const k = q.replace(/[%_,()]/g, "")
    query = query.or([
      `request_no.ilike.%${k}%`,
      `sku.ilike.%${k}%`,
      `requester.ilike.%${k}%`,
      `brand.ilike.%${k}%`,
      `current_assignee.ilike.%${k}%`,
      `shipping_address.ilike.%${k}%`,
    ].join(","))
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Summary stats (รวมทั้งตาราง, ไม่ filter) ──
  const { data: stats } = await svc.from("sample_requests")
    .select("status, situation, return_done")
  const sArr = stats ?? []

  const summary = {
    total: sArr.length,
    approved:        sArr.filter(s => s.status === "Approved").length,
    pending:         sArr.filter(s => s.status === "Pending" || s.status === "In Progress").length,
    rejected:        sArr.filter(s => s.status === "Rejected").length,
    not_returned:    sArr.filter(s => s.situation?.includes("Not returned") || s.situation?.includes("不退回")).length,
    returned_field:  sArr.filter(s => s.return_done === true).length,
    pending_return:  sArr.filter(s => !s.return_done && (s.situation?.includes("Not returned") || s.situation?.includes("不退回"))).length,
  }

  return NextResponse.json({
    requests: data ?? [],
    total: count ?? 0,
    summary,
  })
}

// ── PATCH /api/sample-requests ──
//   body: { feishu_record_id, return_done?, return_note?, return_date?, return_files? }
//   ⚠️ ใช้ "authenticated cookie client" (ไม่ใช่ service role) — เพื่อให้ column grants เช็คอัตโนมัติ
//   ⚠️ บังคับเซ็ต return_updated_by='hrms' + return_updated_at=now() เสมอ (kill conflict resolution)
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { feishu_record_id } = body as { feishu_record_id: string }
  if (!feishu_record_id) {
    return NextResponse.json({ error: "feishu_record_id required" }, { status: 400 })
  }

  // ── สร้าง payload ที่มีเฉพาะ field ที่อนุญาต ──
  //   (ถ้ามี key อื่นปนมา → DB จะ reject ทั้ง statement)
  const updates: Record<string, any> = {
    return_updated_by: "hrms",
    return_updated_at: new Date().toISOString(),
  }
  for (const k of ALLOWED_RETURN_FIELDS) {
    if (k in body) updates[k] = body[k]
  }

  // Validate return_date format (YYYY-MM-DD) ตามเอกสาร — กัน timezone issue
  if ("return_date" in updates && updates.return_date) {
    const v = String(updates.return_date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return NextResponse.json({ error: "return_date ต้องเป็น YYYY-MM-DD" }, { status: 400 })
    }
  }
  // Validate return_files = array of {name, url}
  if ("return_files" in updates) {
    const files = updates.return_files
    if (!Array.isArray(files)) {
      return NextResponse.json({ error: "return_files ต้องเป็น array" }, { status: 400 })
    }
    updates.return_files = files
      .filter((f: any) => f && typeof f.name === "string" && typeof f.url === "string")
      .map((f: any) => ({ name: String(f.name), url: String(f.url) }))
  }

  // ใช้ authenticated client (cookies) → column-level grants จะคอย enforce
  const { data, error } = await supabase
    .from("sample_requests")
    .update(updates)
    .eq("feishu_record_id", feishu_record_id)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("[sample-requests PATCH]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "ไม่พบ record (อาจถูกลบจาก Feishu)" }, { status: 404 })
  }

  return NextResponse.json({ success: true, request: data })
}
