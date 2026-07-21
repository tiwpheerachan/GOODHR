import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// HR อนุมัติ/ยกเลิกอนุมัติเวลาทำงานรายวัน (ล็อกไม่ให้พนักงานแก้/ขอลา)
//   POST { employee_id, work_dates: string[], approved: boolean }
//   สิทธิ์: super_admin / hr_admin เท่านั้น
//   upsert attendance_records — ถ้ายังไม่มี record ของวันนั้นก็สร้าง (approve วันว่างได้)
// ════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const { data: me } = await svc.from("users").select("role, employee_id").eq("id", user.id).single()
  if (!me || !["super_admin", "hr_admin"].includes(me.role)) {
    return NextResponse.json({ error: "เฉพาะ HR/Admin เท่านั้น" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const employeeId = (body?.employee_id ?? "").toString()
  const dates: string[] = Array.isArray(body?.work_dates) ? body.work_dates.filter(Boolean) : []
  const approved = !!body?.approved
  if (!employeeId || dates.length === 0) return NextResponse.json({ error: "missing employee_id / work_dates" }, { status: 400 })

  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employeeId).maybeSingle()
  const now = new Date().toISOString()

  let ok = 0
  for (const d of dates) {
    // มี record อยู่แล้ว → update, ไม่มี → insert (approve วันว่าง = สร้าง record เปล่าที่ถูกล็อก)
    const { data: existing } = await svc.from("attendance_records")
      .select("id").eq("employee_id", employeeId).eq("work_date", d).maybeSingle()
    const patch = {
      hr_time_approved: approved,
      hr_time_approved_by: approved ? (me.employee_id ?? null) : null,
      hr_time_approved_at: approved ? now : null,
    }
    if (existing?.id) {
      const { error } = await svc.from("attendance_records").update(patch).eq("id", existing.id)
      if (!error) ok++
    } else if (approved) {
      const { error } = await svc.from("attendance_records").insert({
        employee_id: employeeId, company_id: emp?.company_id ?? null, work_date: d, ...patch,
      })
      if (!error) ok++
    } else { ok++ } // ยกเลิกอนุมัติวันที่ไม่มี record = ไม่ต้องทำอะไร
  }
  return NextResponse.json({ success: true, updated: ok })
}
