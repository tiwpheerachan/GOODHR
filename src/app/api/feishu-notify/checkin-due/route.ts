import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, todayTH, EMP_FIELDS, recipient, type EmpLite } from "@/lib/feishu-notify"
import { filterEnabled } from "@/lib/notif-rollout"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/checkin-due
//     ?company_id=&date=YYYY-MM-DD&now=HH:MM&lead=10&window=10&fallback=1
//
//   คืนพนักงาน (ผูก Feishu แล้ว) ที่ "กะกำลังจะเริ่มในอีก ~lead นาที และยังไม่เช็คอิน"
//   → bot เอาไปเตือนล่วงหน้า 10 นาทีก่อนเข้ากะ (ตามกะจริงของแต่ละคน)
//
//   กติกาเวลา: match เมื่อ  lead ≤ (เวลาเข้ากะ − ตอนนี้) < lead + window
//     • lead   = เตือนก่อนเข้ากะกี่นาที (default 10)
//     • window = ช่วงกันพลาด = ควรตั้ง = รอบ cron ของ bot (default 10)
//       เช่น bot รันทุก 10 นาที + lead=10 → เวลา 08:20 จะได้คนกะเริ่ม 08:30–08:40
//   วิธีเลือกกะของแต่ละคนในวันนั้น (ตรงกับ logic /api/checkin):
//     1) monthly_shift_assignments ของวันนั้น = source of truth
//        - assignment_type=work + shift_id → ใช้ shift.work_start
//        - dayoff/leave/holiday หรือ shift_id ว่าง → ข้าม (ไม่เตือน)
//     2) ไม่มี assignment เลย → fallback work_schedules (ปิดได้ด้วย fallback=0)
//   ⚠️ ไม่คืนข้อมูลเงินเดือน/payroll
// ════════════════════════════════════════════════════════════════════

function toMin(hhmmss?: string | null): number | null {
  if (!hhmmss) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmmss)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const date = p.get("date") || todayTH()
  const lead = Math.max(0, parseInt(p.get("lead") || "10") || 10)
  const window = Math.max(1, parseInt(p.get("window") || "10") || 10)
  const useFallback = p.get("fallback") !== "0"

  // เวลาปัจจุบัน (โซนไทย) — override ได้ด้วย ?now=HH:MM เพื่อทดสอบ
  let nowMin: number | null = toMin(p.get("now"))
  if (nowMin == null) {
    const th = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour12: false })
    nowMin = toMin(th) ?? 0
  }

  // 1) พนักงาน active ที่ผูก Feishu แล้ว
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
  if (emps.length === 0) {
    return NextResponse.json({ date, now: nowMin, lead, window, due_count: 0, recipients: [] })
  }
  const empIds = emps.map((e) => e.id)

  // 2) monthly_shift_assignments ของวันนั้น (batch)
  const startByEmp = new Map<string, number>()      // emp.id → นาทีเริ่มกะ
  const hasAssignment = new Set<string>()
  for (const ids of chunk(empIds, 300)) {
    const { data } = await s.from("monthly_shift_assignments")
      .select("employee_id, assignment_type, shift_id, shift:shift_templates(work_start)")
      .eq("work_date", date).in("employee_id", ids)
    for (const r of (data ?? []) as any[]) {
      if (!r.employee_id) continue
      hasAssignment.add(r.employee_id)
      const type = r.assignment_type
      if (r.shift_id && (type == null || type === "work")) {
        const st = toMin(r.shift?.work_start)
        if (st != null) startByEmp.set(r.employee_id, st)
      }
      // dayoff/leave/holiday หรือไม่มี shift → ไม่ set (ข้าม)
    }
  }

  // 3) fallback: work_schedules default สำหรับคนที่ "ไม่มี assignment เลย"
  if (useFallback) {
    const missing = empIds.filter((id) => !hasAssignment.has(id))
    for (const ids of chunk(missing, 300)) {
      const { data } = await s.from("work_schedules")
        .select("employee_id, effective_from, shift:shift_templates(work_start)")
        .in("employee_id", ids).lte("effective_from", date)
        .order("effective_from", { ascending: false })
      const seen = new Set<string>()
      for (const r of (data ?? []) as any[]) {
        if (!r.employee_id || seen.has(r.employee_id)) continue   // เอา effective_from ล่าสุดต่อคน
        seen.add(r.employee_id)
        const st = toMin(r.shift?.work_start)
        if (st != null) startByEmp.set(r.employee_id, st)
      }
    }
  }

  if (startByEmp.size === 0) {
    return NextResponse.json({ date, now: nowMin, lead, window, due_count: 0, recipients: [] })
  }

  // 4) ใครเช็คอินแล้ววันนี้ → ตัดออก
  const checkedIn = new Set<string>()
  for (const ids of chunk(Array.from(startByEmp.keys()), 300)) {
    const { data } = await s.from("attendance_records")
      .select("employee_id, clock_in").eq("work_date", date)
      .not("clock_in", "is", null).in("employee_id", ids)
    for (const r of (data ?? []) as any[]) if (r.employee_id) checkedIn.add(r.employee_id)
  }

  // 5) เลือกคนที่ lead ≤ (เข้ากะ − ตอนนี้) < lead + window และยังไม่เช็คอิน
  const empById = new Map(emps.map((e) => [e.id, e]))
  const recipients = Array.from(startByEmp.entries())
    .filter(([id]) => !checkedIn.has(id))
    .map(([id, startMin]) => ({ id, startMin, until: startMin - nowMin! }))
    .filter((x) => x.until >= lead && x.until < lead + window)
    .sort((a, b) => a.until - b.until)
    .map((x) => {
      const e = empById.get(x.id)!
      const hh = String(Math.floor(x.startMin / 60)).padStart(2, "0")
      const mm = String(x.startMin % 60).padStart(2, "0")
      return {
        ...recipient(e),
        shift_start: `${hh}:${mm}`,
        minutes_until_start: x.until,
      }
    })

  const gated = p.get("rollout") !== "0" ? await filterEnabled(s, recipients, (r: any) => r.employee_id) : recipients
  return NextResponse.json({
    date, now: nowMin, lead, window,
    scheduled_count: startByEmp.size,
    due_count: gated.length,
    recipients: gated,   // เฉพาะคนที่เปิดสิทธิ์รับ (rollout)
  })
}
