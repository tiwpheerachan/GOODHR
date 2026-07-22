import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, todayTH, EMP_FIELDS, recipient, chunk, toMin, nowMinTH, type EmpLite } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/checkout-reminders
//     ?company_id=&date=&now=HH:MM&lead=0&window=15&fallback=1
//   คืนพนักงานที่ "เช็คอินแล้วแต่ยังไม่เช็คเอาท์ และกะเพิ่งเลิก" → เตือนให้เช็คเอาท์
//   match เมื่อ  lead ≤ (ตอนนี้ − เวลาเลิกกะ) < lead + window
//     • lead   = เตือนหลังเลิกกะกี่นาที (default 0 = ทันทีที่เลิก)
//     • window = ช่วงกันพลาด = รอบ cron ของ bot (default 15)
//   เลือกเวลาเลิกกะจาก monthly_shift_assignments (fallback work_schedules)
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const date = p.get("date") || todayTH()
  const lead = Math.max(0, parseInt(p.get("lead") || "0") || 0)
  const window = Math.max(1, parseInt(p.get("window") || "15") || 15)
  const useFallback = p.get("fallback") !== "0"
  const nowMin = toMin(p.get("now")) ?? nowMinTH()

  // 1) ใครเช็คอินแล้ววันนี้ + ยังไม่เช็คเอาท์
  const openEmpIds: string[] = []
  {
    let pf = 0
    while (true) {
      let q = s.from("attendance_records").select("employee_id, clock_in, clock_out")
        .eq("work_date", date).not("clock_in", "is", null).is("clock_out", null)
        .order("employee_id").range(pf, pf + 999)
      if (companyId) q = q.eq("company_id", companyId)
      const { data } = await q
      if (!data || data.length === 0) break
      for (const r of data as any[]) if (r.employee_id) openEmpIds.push(r.employee_id)
      if (data.length < 1000) break
      pf += 1000
    }
  }
  if (openEmpIds.length === 0) {
    return NextResponse.json({ date, now: nowMin, lead, window, open_count: 0, due_count: 0, recipients: [] })
  }

  // 2) เวลาเลิกกะของแต่ละคน (monthly_shift_assignments → fallback work_schedules)
  const endByEmp = new Map<string, number>()
  const hasAssignment = new Set<string>()
  for (const ids of chunk(openEmpIds, 300)) {
    const { data } = await s.from("monthly_shift_assignments")
      .select("employee_id, assignment_type, shift_id, shift:shift_templates(work_start, work_end)")
      .eq("work_date", date).in("employee_id", ids)
    for (const r of (data ?? []) as any[]) {
      if (!r.employee_id) continue
      hasAssignment.add(r.employee_id)
      if (r.shift_id && (r.assignment_type == null || r.assignment_type === "work")) {
        let end = toMin(r.shift?.work_end)
        const start = toMin(r.shift?.work_start)
        // กะข้ามเที่ยงคืน (เลิก < เริ่ม) → +1 วัน
        if (end != null && start != null && end < start) end += 1440
        if (end != null) endByEmp.set(r.employee_id, end)
      }
    }
  }
  if (useFallback) {
    const missing = openEmpIds.filter((id) => !hasAssignment.has(id))
    for (const ids of chunk(missing, 300)) {
      const { data } = await s.from("work_schedules")
        .select("employee_id, effective_from, shift:shift_templates(work_start, work_end)")
        .in("employee_id", ids).lte("effective_from", date)
        .order("effective_from", { ascending: false })
      const seen = new Set<string>()
      for (const r of (data ?? []) as any[]) {
        if (!r.employee_id || seen.has(r.employee_id)) continue
        seen.add(r.employee_id)
        let end = toMin(r.shift?.work_end)
        const start = toMin(r.shift?.work_start)
        if (end != null && start != null && end < start) end += 1440
        if (end != null) endByEmp.set(r.employee_id, end)
      }
    }
  }
  if (endByEmp.size === 0) {
    return NextResponse.json({ date, now: nowMin, lead, window, open_count: openEmpIds.length, due_count: 0, recipients: [] })
  }

  // 3) เลือกคนที่ lead ≤ (ตอนนี้ − เลิกกะ) < lead + window
  const dueIds = Array.from(endByEmp.entries())
    .map(([id, endMin]) => ({ id, endMin, since: nowMin - endMin }))
    .filter((x) => x.since >= lead && x.since < lead + window)
  if (dueIds.length === 0) {
    return NextResponse.json({ date, now: nowMin, lead, window, open_count: openEmpIds.length, due_count: 0, recipients: [] })
  }

  // 4) ดึงข้อมูลพนักงาน (ต้องผูก Feishu)
  const empMap = new Map<string, EmpLite>()
  for (const ids of chunk(dueIds.map((x) => x.id), 300)) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", ids)
      .not("feishu_user_id", "is", null)
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }

  const recipients = dueIds
    .filter((x) => empMap.has(x.id))
    .sort((a, b) => b.since - a.since)
    .map((x) => {
      const e = empMap.get(x.id)!
      const em = ((x.endMin % 1440) + 1440) % 1440
      const hh = String(Math.floor(em / 60)).padStart(2, "0")
      const mm = String(em % 60).padStart(2, "0")
      return { ...recipient(e), shift_end: `${hh}:${mm}`, minutes_since_end: x.since }
    })

  return NextResponse.json({
    date, now: nowMin, lead, window,
    open_count: openEmpIds.length,
    due_count: recipients.length,
    recipients,
  })
}
