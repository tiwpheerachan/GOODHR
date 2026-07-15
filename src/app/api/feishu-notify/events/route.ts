import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, recipient, EMP_FIELDS, type EmpLite } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/events?since=<ISO>&types=leave,ot,adjustment,offsite,resignation&company_id=
//   คำขอที่ "ถูกตัดสิน" (approved/rejected) ตั้งแต่เวลา since → ยิงแจ้ง "เจ้าของคำขอ"
//   เช่น "ใบลาของคุณได้รับการอนุมัติแล้ว" · ให้ bot poll ทุก N นาทีด้วย since = รอบก่อนหน้า
//   ⚠️ ไม่รวมข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════

const SOURCES: { table: string; type: string }[] = [
  { table: "leave_requests", type: "leave" },
  { table: "overtime_requests", type: "ot" },
  { table: "time_adjustment_requests", type: "adjustment" },
  { table: "offsite_checkin_requests", type: "offsite" },
  { table: "resignation_requests", type: "resignation" },
]

export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const since = p.get("since")
  if (!since) return NextResponse.json({ error: "ต้องระบุ since (ISO datetime)" }, { status: 400 })
  const companyId = p.get("company_id")
  const typesFilter = (p.get("types") || "").split(",").map((x) => x.trim()).filter(Boolean)

  type Raw = { type: string; id: string; employee_id: string; status: string; decided_at: string | null; detail: any }
  const raws: Raw[] = []
  for (const src of SOURCES) {
    if (typesFilter.length && !typesFilter.includes(src.type)) continue
    let q = s.from(src.table).select("*")
      .in("status", ["approved", "rejected"])
      .gte("updated_at", since)
      .order("updated_at", { ascending: true })
      .limit(1000)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) continue
    for (const r of data ?? []) {
      if (!r.employee_id) continue
      raws.push({
        type: src.type, id: r.id, employee_id: r.employee_id, status: r.status,
        decided_at: r.updated_at ?? null,
        detail: {
          start_date: r.start_date ?? null, end_date: r.end_date ?? null,
          work_date: r.work_date ?? null,
          note: r.hr_note ?? r.reject_reason ?? r.note ?? null,
        },
      })
    }
  }

  if (raws.length === 0) return NextResponse.json({ since, events: [] })

  // ผู้รับ (เจ้าของคำขอ)
  const empIds = Array.from(new Set(raws.map((r) => r.employee_id)))
  const empMap = new Map<string, EmpLite>()
  for (let i = 0; i < empIds.length; i += 300) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", empIds.slice(i, i + 300))
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }

  const events = raws.map((r) => {
    const e = empMap.get(r.employee_id)
    return {
      type: r.type,
      decision: r.status,          // approved | rejected
      request_id: r.id,
      decided_at: r.decided_at,
      recipient: e ? recipient(e) : { employee_id: r.employee_id, feishu_user_id: null, name: r.employee_id },
      detail: r.detail,
    }
  })

  return NextResponse.json({ since, count: events.length, events })
}
