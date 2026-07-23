import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, todayTH, addDays, recipient, hrRecipients, empName, chunk } from "@/lib/feishu-notify"
import { filterEnabled } from "@/lib/notif-rollout"
import { effectiveEmploymentStart, ROUND_DAYS } from "@/lib/constants/probation"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/probation-due?before=3&round=2&company_id=
//   คืนพนักงานทดลองงานที่ "ครบกำหนดประเมินในอีก <before> วัน" + รายชื่อ HR ที่ควรเตือน
//   (เสริมจาก cron email เดิม — เพื่อยิง Feishu หา HR)
//   round: 1=45วัน, 2=90วัน (default 2) · before: ล่วงหน้ากี่วัน (default 3)
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const before = Math.max(0, parseInt(p.get("before") || "3"))
  const round = parseInt(p.get("round") || "2") === 1 ? 1 : 2
  const today = todayTH()
  const targetDue = addDays(today, before)   // ครบกำหนดในอีก <before> วัน

  // พนักงานที่ยังทดลองงาน
  let q = s.from("employees")
    .select("id, employee_code, feishu_user_id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, employment_status, company_id, hire_date, phase2_start_date, probation_use_custom_plan, branch:branches(id,name), department:departments(id,name), position:positions(id,name)")
    .eq("employment_status", "probation").eq("is_active", true).is("deleted_at", null)
  if (companyId) q = q.eq("company_id", companyId)
  const { data: emps, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const due = (emps ?? []).filter((e: any) => {
    if (e.probation_use_custom_plan) return false      // แผนกำหนดเอง → เตือนแยก
    const start = effectiveEmploymentStart(e)
    if (!start) return false
    return addDays(start, ROUND_DAYS[round]) === targetDue
  })

  // ตัดคนที่ประเมินรอบนี้ไปแล้ว (submitted/approved)
  let doneSet = new Set<string>()
  if (due.length) {
    const { data: done } = await s.from("probation_evaluations")
      .select("employee_id, status, round")
      .eq("round", round).in("status", ["submitted", "approved"])
      .in("employee_id", due.map((e: any) => e.id))
    doneSet = new Set((done ?? []).map((d: any) => d.employee_id))
  }
  const pending = due.filter((e: any) => !doneSet.has(e.id))

  // HR ที่ควรเตือน (ผูก Feishu)
  const hr = await hrRecipients(s, companyId)

  return NextResponse.json({
    date: today, round, before, due_date: targetDue,
    due_count: pending.length,
    employees: pending.map((e: any) => ({
      employee_id: e.id, employee_code: e.employee_code, name: empName(e),
      department: e.department?.name ?? null, branch: e.branch?.name ?? null,
      due_date: targetDue,
    })),
    hr_recipients: p.get("rollout") !== "0" ? await filterEnabled(s, hr.map(recipient), (r: any) => r.employee_id) : hr.map(recipient),
  })
}
