import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, resolveEmp, recipient } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/my-leave-balance?feishu_user_id=|employee_id=|email=&year=
//   วันลา "คงเหลือ" ต่อประเภท (โควตา − ใช้ไป) — ปลดล็อกการ์ดโควตาวันลาในบอท
//   ⚠️ ไม่คืนข้อมูลเงินเดือน/payroll (ตาม policy feishu-notify)
//   auth: Bearer FEISHU_BOT_SECRET
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

  const year = parseInt(p.get("year") || String(new Date().getFullYear())) || new Date().getFullYear()

  // balances ของปีนั้น
  const { data: balances } = await s.from("leave_balances")
    .select("leave_type_id, entitled_days, used_days, pending_days, remaining_days, carried_over")
    .eq("employee_id", emp.id).eq("year", year)

  const rows = balances ?? []
  if (rows.length === 0) return NextResponse.json({ employee: recipient(emp), year, balances: [] })

  // ชื่อประเภทลา — resolve ข้าม type_id (บาง balance อิงบริษัทอื่น) เหมือนหน้าโควตา
  const typeIds = Array.from(new Set(rows.map((b: any) => b.leave_type_id).filter(Boolean)))
  const { data: types } = typeIds.length
    ? await s.from("leave_types").select("id, name").in("id", typeIds)
    : { data: [] as any[] }
  const nameOf = new Map<string, string>((types ?? []).map((t: any) => [t.id, t.name]))

  const out = rows.map((b: any) => {
    const entitled = Number(b.entitled_days) || 0
    const used = Number(b.used_days) || 0
    const remaining = b.remaining_days != null ? Number(b.remaining_days) : entitled - used
    return {
      type: nameOf.get(b.leave_type_id) || "อื่นๆ",
      entitled,
      used,
      pending: Number(b.pending_days) || 0,
      carried_over: Number(b.carried_over) || 0,
      remaining,
    }
  }).sort((a: any, b: any) => a.type.localeCompare(b.type, "th"))

  return NextResponse.json({ employee: recipient(emp), year, balances: out })
}
