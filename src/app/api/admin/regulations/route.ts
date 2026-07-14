import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import reg from "@/lib/regulations-content.json"

// ════════════════════════════════════════════════════════════════════
// ระเบียบข้อบังคับการทำงาน — ฝั่งแอดมิน
//   GET → { version, total, signed, employees: [{...emp, ack}] }
//         รายชื่อพนักงาน (active) พร้อมสถานะการลงนาม
// ════════════════════════════════════════════════════════════════════

const VERSION = (reg as any).version as string

async function getAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("id, role, company_id").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

export async function GET(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a

  const companyId = req.nextUrl.searchParams.get("company_id")

  let empQ = svc.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, employment_status, company_id, branch:branches(id,name), department:departments(id,name)")
    .not("employment_status", "in", "(resigned,terminated)")
    .order("employee_code")
  if (companyId) empQ = empQ.eq("company_id", companyId)
  const { data: emps } = await empQ

  const empList = emps ?? []
  const ids = empList.map((e: any) => e.id)

  // acks เวอร์ชันปัจจุบัน
  let ackMap = new Map<string, any>()
  if (ids.length > 0) {
    const { data: acks } = await svc.from("regulation_acknowledgements")
      .select("employee_id, signed_name, signature_url, acknowledged_at")
      .eq("version", VERSION).in("employee_id", ids)
    ackMap = new Map((acks ?? []).map((a: any) => [a.employee_id, a]))
  }

  const employees = empList.map((e: any) => ({ ...e, ack: ackMap.get(e.id) ?? null }))
  const signed = employees.filter((e: any) => e.ack).length

  return NextResponse.json({
    version: VERSION,
    total: employees.length,
    signed,
    employees,
  })
}
