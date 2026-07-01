import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ตรวจสิทธิ์: ต้องเป็น HR/super admin — คืน { svc, dbUser } หรือ NextResponse error
async function requireHR() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์จัดการอีเมลผู้รับ" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

// GET — รายชื่ออีเมลผู้รับของบริษัท
export async function GET() {
  const auth = await requireHR()
  if ("error" in auth) return auth.error
  const { svc, dbUser } = auth

  const { data, error } = await svc
    .from("probation_email_recipients")
    .select("*")
    .eq("company_id", dbUser.company_id)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recipients: data ?? [] })
}

// POST — เพิ่มอีเมลผู้รับ
export async function POST(req: NextRequest) {
  const auth = await requireHR()
  if ("error" in auth) return auth.error
  const { svc, dbUser } = auth

  const body = await req.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const label = body.label ? String(body.label).trim() : null
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 })
  }

  const { data, error } = await svc
    .from("probation_email_recipients")
    .upsert(
      { company_id: dbUser.company_id, email, label, is_active: true, created_by: dbUser.employee_id ?? null },
      { onConflict: "company_id,email" },
    )
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recipient: data })
}

// PATCH — เปิด/ปิด (is_active) อีเมลผู้รับ
export async function PATCH(req: NextRequest) {
  const auth = await requireHR()
  if ("error" in auth) return auth.error
  const { svc, dbUser } = auth

  const body = await req.json()
  const id = String(body.id ?? "")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  const { error } = await svc
    .from("probation_email_recipients")
    .update({ is_active: !!body.is_active })
    .eq("id", id)
    .eq("company_id", dbUser.company_id) // ป้องกันแก้ข้ามบริษัท
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — ลบอีเมลผู้รับ
export async function DELETE(req: NextRequest) {
  const auth = await requireHR()
  if ("error" in auth) return auth.error
  const { svc, dbUser } = auth

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  const { error } = await svc
    .from("probation_email_recipients")
    .delete()
    .eq("id", id)
    .eq("company_id", dbUser.company_id) // ป้องกันลบข้ามบริษัท
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
