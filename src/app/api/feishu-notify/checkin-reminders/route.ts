import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, todayTH, EMP_FIELDS, recipient, type EmpLite } from "@/lib/feishu-notify"
import { filterEnabled } from "@/lib/notif-rollout"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/checkin-reminders?company_id=&date=
//   คืนรายชื่อพนักงาน (ที่ผูก Feishu แล้ว) ที่ "ยังไม่เช็คอิน" วันนี้ → bot เอาไปเตือน
//   หมายเหตุ: ยังไม่กรองตามเวลากะ (ให้เพื่อนเพิ่ม logic เวลาเข้ากะได้ตามต้องการ)
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const companyId = req.nextUrl.searchParams.get("company_id")
  const date = req.nextUrl.searchParams.get("date") || todayTH()

  // พนักงาน active ที่ผูก Feishu แล้ว (paginate)
  const emps: EmpLite[] = []
  let from = 0
  while (true) {
    let q = s.from("employees").select(EMP_FIELDS)
      .not("employment_status", "in", "(resigned,terminated)")
      .not("feishu_user_id", "is", null)
      .order("id").range(from, from + 999)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    emps.push(...(data as unknown as EmpLite[]))
    if (data.length < 1000) break
    from += 1000
  }

  // ใครเช็คอินแล้ววันนี้ (clock_in ไม่ว่าง)
  const checkedIn = new Set<string>()
  {
    let pf = 0
    while (true) {
      let q = s.from("attendance_records").select("employee_id, clock_in")
        .eq("work_date", date).not("clock_in", "is", null).order("employee_id").range(pf, pf + 999)
      if (companyId) q = q.eq("company_id", companyId)
      const { data } = await q
      if (!data || data.length === 0) break
      for (const r of data) if (r.employee_id) checkedIn.add(r.employee_id)
      if (data.length < 1000) break
      pf += 1000
    }
  }

  const pending = emps.filter((e) => !checkedIn.has(e.id))
  const recips = pending.map(recipient)
  const gated = req.nextUrl.searchParams.get("rollout") !== "0" ? await filterEnabled(s, recips, (r: any) => r.employee_id) : recips
  return NextResponse.json({
    date,
    total_active: emps.length,
    checked_in: checkedIn.size,
    pending_count: gated.length,
    recipients: gated,   // เฉพาะคนที่เปิดสิทธิ์รับ (rollout)
  })
}
