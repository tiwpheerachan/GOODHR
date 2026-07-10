import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// บันทึกโทษทางวินัย / ใบเตือน (employee discipline records)
//   GET    ?employee_id=... → รายการของพนักงานคนนั้น (admin)
//   POST   {employee_id, punish_date, ...} → เพิ่ม (admin)
//   PATCH  {id, ...} → แก้ไข (admin)
//   DELETE ?id=... → ลบ (admin)
// ════════════════════════════════════════════════════════════════════

async function getAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

// รับเฉพาะฟิลด์ที่อนุญาต + sanitize attachments
function sanitizeBody(body: any) {
  const attachments: { url: string; name: string; size?: number }[] = Array.isArray(body?.attachments)
    ? body.attachments
        .filter((a: any) => a && typeof a.url === "string" && typeof a.name === "string")
        .slice(0, 20)
        .map((a: any) => ({
          url: String(a.url),
          name: String(a.name),
          ...(typeof a.size === "number" ? { size: a.size } : {}),
        }))
    : []
  const str = (v: any) => (v == null || v === "" ? null : String(v).slice(0, 2000))
  return {
    punish_date: body?.punish_date || null,
    end_date: body?.end_date || null,
    offense_type: str(body?.offense_type),
    legal_penalty: str(body?.legal_penalty),
    penalty: str(body?.penalty),
    reference_doc: str(body?.reference_doc),
    detail: str(body?.detail),
    attachments,
  }
}

export async function GET(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const employeeId = req.nextUrl.searchParams.get("employee_id")
  if (!employeeId) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })

  const { data, error } = await svc.from("employee_discipline_records")
    .select("*")
    .eq("employee_id", employeeId)
    .order("punish_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc, dbUser } = a
  const body = await req.json()
  const { employee_id } = body
  if (!employee_id) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })
  const fields = sanitizeBody(body)
  if (!fields.punish_date) return NextResponse.json({ error: "กรุณาระบุวันที่ได้รับโทษ" }, { status: 400 })

  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employee_id).single()

  const { data: created, error } = await svc.from("employee_discipline_records").insert({
    company_id: emp?.company_id ?? null,
    employee_id,
    ...fields,
    created_by: dbUser.employee_id ?? null,
  }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: created })
}

export async function PATCH(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
  const fields = sanitizeBody(body)
  if (!fields.punish_date) return NextResponse.json({ error: "กรุณาระบุวันที่ได้รับโทษ" }, { status: 400 })

  const { data: updated, error } = await svc.from("employee_discipline_records")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: updated })
}

export async function DELETE(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
  const { error } = await svc.from("employee_discipline_records").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
