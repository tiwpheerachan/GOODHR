import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, todayTH, EMP_FIELDS, recipient, type EmpLite } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/celebrations?date=&company_id=&type=birthday|anniversary|all
//   คืนพนักงานที่ "วันนี้เป็นวันเกิด" และ/หรือ "ครบรอบเข้างาน" → bot อวยพร
//   เทียบเฉพาะ เดือน-วัน (MM-DD) กับวันนี้ (โซนไทย)
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const date = p.get("date") || todayTH()      // YYYY-MM-DD
  const want = (p.get("type") || "all").toLowerCase()
  const mmdd = date.slice(5)                    // MM-DD
  const curYear = parseInt(date.slice(0, 4))

  // ดึงพนักงาน active + วันเกิด/วันเข้างาน
  const emps: (EmpLite & { birth_date?: string; hire_date?: string })[] = []
  let from = 0
  while (true) {
    let q = s.from("employees").select(EMP_FIELDS + ", birth_date, hire_date")
      .not("employment_status", "in", "(resigned,terminated)")
      .order("id").range(from, from + 999)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    emps.push(...(data as any[]))
    if (data.length < 1000) break
    from += 1000
  }

  const isDay = (d?: string) => !!d && d.length >= 10 && d.slice(5, 10) === mmdd

  const birthdays = (want === "all" || want === "birthday")
    ? emps.filter((e) => isDay(e.birth_date)).map((e) => ({ ...recipient(e) }))
    : []

  const anniversaries = (want === "all" || want === "anniversary")
    ? emps.filter((e) => isDay(e.hire_date))
        .map((e) => {
          const years = curYear - parseInt((e.hire_date || "0").slice(0, 4))
          return { ...recipient(e), years }
        })
        .filter((e) => e.years >= 1)      // ครบรอบ = อย่างน้อย 1 ปี
    : []

  return NextResponse.json({
    date,
    birthday_count: birthdays.length,
    anniversary_count: anniversaries.length,
    birthdays,          // มี feishu_user_id → DM อวยพรวันเกิด
    anniversaries,      // + years (ครบกี่ปี)
  })
}
