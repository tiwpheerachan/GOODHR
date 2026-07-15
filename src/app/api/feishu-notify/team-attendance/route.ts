import { NextRequest, NextResponse } from "next/server"
import {
  checkBotAuth, svc, resolveEmp, recipient, todayTH, teamMemberIds, EMP_FIELDS, empName, type EmpLite,
} from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/team-attendance?manager_employee_id=|manager_feishu_id=&date=
//   สรุปการเข้างานลูกทีมของหัวหน้า "วันนี้" (ให้ manager ดูภาพรวมทีม)
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const date = p.get("date") || todayTH()

  const manager = await resolveEmp(s, {
    employee_id: p.get("manager_employee_id"),
    feishu_user_id: p.get("manager_feishu_id"),
    email: p.get("email"),
  })
  if (!manager) return NextResponse.json({ error: "ไม่พบหัวหน้า" }, { status: 404 })

  const memberIds = await teamMemberIds(s, manager.id)
  if (memberIds.length === 0) {
    return NextResponse.json({ manager: recipient(manager), date, summary: emptySummary(), members: [] })
  }

  // ข้อมูลลูกทีม
  const memberMap = new Map<string, EmpLite>()
  for (let i = 0; i < memberIds.length; i += 300) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", memberIds.slice(i, i + 300))
    for (const e of (data ?? []) as unknown as EmpLite[]) memberMap.set(e.id, e)
  }

  // attendance วันนี้
  const attMap = new Map<string, any>()
  for (let i = 0; i < memberIds.length; i += 300) {
    const { data } = await s.from("attendance_records")
      .select("employee_id, status, clock_in, clock_out, late_minutes, early_out_minutes, ot_minutes")
      .eq("work_date", date).in("employee_id", memberIds.slice(i, i + 300))
    for (const r of data ?? []) if (r.employee_id) attMap.set(r.employee_id, r)
  }

  const members = memberIds.map((id) => {
    const e = memberMap.get(id)
    const a = attMap.get(id)
    let state: "present" | "late" | "absent" | "on_leave" | "not_checked_in"
    if (!a || !a.clock_in) state = a?.status === "on_leave" || a?.status === "leave" ? "on_leave" : (a?.status === "absent" ? "absent" : "not_checked_in")
    else state = (a.late_minutes ?? 0) > 0 ? "late" : "present"
    return {
      employee_id: id,
      name: e ? empName(e) : id,
      feishu_user_id: e?.feishu_user_id ?? null,
      department: e?.department?.name ?? null,
      state,
      clock_in: a?.clock_in ?? null,
      clock_out: a?.clock_out ?? null,
      late_minutes: a?.late_minutes ?? 0,
      ot_minutes: a?.ot_minutes ?? 0,
    }
  })

  const summary = {
    team_size: members.length,
    present: members.filter((m) => m.state === "present").length,
    late: members.filter((m) => m.state === "late").length,
    on_leave: members.filter((m) => m.state === "on_leave").length,
    absent: members.filter((m) => m.state === "absent").length,
    not_checked_in: members.filter((m) => m.state === "not_checked_in").length,
  }

  return NextResponse.json({ manager: recipient(manager), date, summary, members })
}

function emptySummary() {
  return { team_size: 0, present: 0, late: 0, on_leave: 0, absent: 0, not_checked_in: 0 }
}
