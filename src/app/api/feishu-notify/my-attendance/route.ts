import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, resolveEmp, recipient, rangeToDates } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/my-attendance?employee_id=|feishu_user_id=&range=today|week|month
//   (หรือ &from=YYYY-MM-DD&to=YYYY-MM-DD)
//   สรุปการเข้างานของพนักงานคนนั้น (ให้ user ตรวจสอบการเข้างานตัวเอง)
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams

  const emp = await resolveEmp(s, {
    employee_id: p.get("employee_id"),
    feishu_user_id: p.get("feishu_user_id"),
    email: p.get("email"),
  })
  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })

  const { from, to } = rangeToDates(p.get("range"), p.get("from"), p.get("to"))

  const { data: rows, error } = await s.from("attendance_records")
    .select("work_date, status, clock_in, clock_out, late_minutes, early_out_minutes, ot_minutes, work_minutes, note")
    .eq("employee_id", emp.id)
    .gte("work_date", from).lte("work_date", to)
    .order("work_date")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const records = rows ?? []
  const summary = {
    days: records.length,
    present: records.filter((r: any) => r.status === "present").length,
    late: records.filter((r: any) => (r.late_minutes ?? 0) > 0).length,
    early_out: records.filter((r: any) => (r.early_out_minutes ?? 0) > 0).length,
    absent: records.filter((r: any) => r.status === "absent").length,
    on_leave: records.filter((r: any) => r.status === "on_leave" || r.status === "leave").length,
    total_late_minutes: records.reduce((n: number, r: any) => n + (r.late_minutes ?? 0), 0),
    total_ot_minutes: records.reduce((n: number, r: any) => n + (r.ot_minutes ?? 0), 0),
  }

  return NextResponse.json({
    employee: recipient(emp),
    range: { from, to },
    summary,
    records,
  })
}
