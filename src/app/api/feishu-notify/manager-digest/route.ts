import { NextRequest, NextResponse } from "next/server"
import {
  checkBotAuth, svc, todayTH, EMP_FIELDS, recipient, empName, chunk,
  resolveEmp, currentManagerMap, type EmpLite,
} from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/manager-digest?date=&company_id=&manager_employee_id=|manager_feishu_id=
//   สรุปเช้าให้หัวหน้า (digest): สถานะทีมวันนี้ + จำนวนคำขอค้างอนุมัติ
//   - ระบุ manager → เฉพาะคนนั้น / ไม่ระบุ → ทุกหัวหน้า (bot วนยิง)
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
const PENDING_SOURCES = [
  { table: "leave_requests", type: "leave" },
  { table: "overtime_requests", type: "ot" },
  { table: "time_adjustment_requests", type: "adjustment" },
  { table: "offsite_checkin_requests", type: "offsite" },
]

export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const date = p.get("date") || todayTH()
  // offsite ค้างสะสมมาก → นับเฉพาะที่สร้างใน N วันล่าสุด (กันสรุปเช้าตัวเลขบวม)
  const offsiteDays = Math.max(0, parseInt(p.get("offsite_days") || "3") || 3)
  const offsiteCutoff = new Date(Date.now() - offsiteDays * 86_400_000).toISOString()

  let onlyManager: EmpLite | null = null
  if (p.get("manager_employee_id") || p.get("manager_feishu_id")) {
    onlyManager = await resolveEmp(s, {
      employee_id: p.get("manager_employee_id"),
      feishu_user_id: p.get("manager_feishu_id"),
    })
    if (!onlyManager) return NextResponse.json({ error: "ไม่พบหัวหน้า" }, { status: 404 })
  }

  // 1) พนักงาน active ทั้งหมด → หา manager ปัจจุบัน → group เป็นทีม
  const emps: EmpLite[] = []
  {
    let from = 0
    while (true) {
      let q = s.from("employees").select(EMP_FIELDS)
        .not("employment_status", "in", "(resigned,terminated)")
        .order("id").range(from, from + 999)
      if (companyId) q = q.eq("company_id", companyId)
      const { data } = await q
      if (!data || data.length === 0) break
      emps.push(...(data as unknown as EmpLite[]))
      if (data.length < 1000) break
      from += 1000
    }
  }
  const empById = new Map(emps.map((e) => [e.id, e]))
  const mgrMap = await currentManagerMap(s, emps.map((e) => e.id))
  const teams = new Map<string, string[]>()   // manager_id → member ids
  for (const [eid, mid] of Array.from(mgrMap.entries())) {
    if (onlyManager && mid !== onlyManager.id) continue
    if (!teams.has(mid)) teams.set(mid, [])
    teams.get(mid)!.push(eid)
  }
  if (teams.size === 0) return NextResponse.json({ date, managers: [] })

  const allMemberIds = Array.from(new Set(Array.from(teams.values()).flat()))

  // 2) attendance ของสมาชิกทีมวันนี้
  const attByEmp = new Map<string, any>()
  for (const ids of chunk(allMemberIds, 300)) {
    const { data } = await s.from("attendance_records")
      .select("employee_id, status, clock_in, clock_out, late_minutes")
      .eq("work_date", date).in("employee_id", ids)
    for (const r of (data ?? []) as any[]) if (r.employee_id) attByEmp.set(r.employee_id, r)
  }

  // 3) คำขอ pending ของสมาชิกทีม → นับต่อ manager
  const pendingByEmp = new Map<string, number>()
  for (const src of PENDING_SOURCES) {
    for (const ids of chunk(allMemberIds, 300)) {
      let q = s.from(src.table).select("employee_id").eq("status", "pending").in("employee_id", ids)
      if (src.type === "offsite") q = q.gte("created_at", offsiteCutoff)
      const { data, error } = await q
      if (error) continue
      for (const r of (data ?? []) as any[]) if (r.employee_id)
        pendingByEmp.set(r.employee_id, (pendingByEmp.get(r.employee_id) || 0) + 1)
    }
  }

  // 4) ข้อมูลหัวหน้า
  const mgrIds = Array.from(teams.keys())
  const mgrMapEmp = new Map<string, EmpLite>()
  for (const ids of chunk(mgrIds, 300)) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", ids)
    for (const e of (data ?? []) as unknown as EmpLite[]) mgrMapEmp.set(e.id, e)
  }

  const managers = mgrIds.map((mid) => {
    const members = teams.get(mid)!
    let present = 0, late = 0, leave = 0, absent = 0, not_checked_in = 0, pending = 0
    const detail = members.map((eid) => {
      const a = attByEmp.get(eid)
      const st = a?.status
      if (st === "late") late++
      else if (st === "leave" || st === "on_leave") leave++
      else if (st === "absent") absent++
      else if (a?.clock_in) present++
      else not_checked_in++
      pending += pendingByEmp.get(eid) || 0
      return {
        employee_id: eid,
        name: empName(empById.get(eid)),
        status: st ?? (a?.clock_in ? "present" : "not_checked_in"),
        clock_in: a?.clock_in ?? null,
        clock_out: a?.clock_out ?? null,
        late_minutes: a?.late_minutes ?? 0,
      }
    })
    const mgr = mgrMapEmp.get(mid)
    return {
      manager: mgr ? recipient(mgr) : { employee_id: mid, feishu_user_id: null, name: mid },
      date,
      team_size: members.length,
      summary: { present, late, leave, absent, not_checked_in, pending_approvals: pending },
      members: detail,
    }
  }).sort((a, b) => b.team_size - a.team_size)

  return NextResponse.json({ date, manager_count: managers.length, managers })
}
