import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// POST /api/companies — สร้างบริษัทใหม่ (super_admin only)
//   body: { code, name_th, name_en?, phone?, email?, tax_id?, address? }
// ════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || dbUser.role !== "super_admin") {
    return NextResponse.json({ error: "เฉพาะ Super Admin เท่านั้นที่สร้างบริษัทใหม่ได้" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const code    = String(body.code ?? "").trim().toUpperCase()
  const name_th = String(body.name_th ?? "").trim()
  const name_en = String(body.name_en ?? "").trim()
  const phone   = String(body.phone ?? "").trim()
  const email   = String(body.email ?? "").trim().toLowerCase()
  const tax_id  = String(body.tax_id ?? "").trim()
  const address = String(body.address ?? "").trim()

  // ── Validate ──
  if (!code)    return NextResponse.json({ error: "กรุณากรอกรหัสบริษัท (Code)" }, { status: 400 })
  if (!name_th) return NextResponse.json({ error: "กรุณากรอกชื่อบริษัท (ไทย)" }, { status: 400 })
  if (!/^[A-Z0-9_-]{2,16}$/.test(code)) {
    return NextResponse.json({ error: "Code ต้องเป็น A-Z, 0-9, - หรือ _ (2-16 ตัว)" }, { status: 400 })
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 })
  }

  // ── ตรวจซ้ำ ──
  const { data: dup } = await svc.from("companies").select("id, name_th").eq("code", code).maybeSingle()
  if (dup) {
    return NextResponse.json({
      error: `Code "${code}" ถูกใช้แล้วโดย "${dup.name_th}" — กรุณาใช้ Code อื่น`,
    }, { status: 409 })
  }

  // ── Insert ──
  const { data, error } = await svc.from("companies").insert({
    code,
    name_th,
    name_en: name_en || null,
    phone:   phone   || null,
    email:   email   || null,
    tax_id:  tax_id  || null,
    address: address || null,
    is_active: true,
  }).select("*").single()

  if (error) {
    console.error("[POST /api/companies]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, company: data })
}
