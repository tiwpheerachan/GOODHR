import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getResend, probationReminderEmail } from "@/lib/resend"
import { effectiveEmploymentStart, ROUND_DAYS } from "@/lib/constants/probation"

// ── ความปลอดภัย: ต้องส่ง Authorization: Bearer <CRON_SECRET> (fail-closed) ──
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

const REMIND_ROUND = 2         // รอบ 90 วัน
const REMIND_BEFORE_DAYS = 3   // เตือนล่วงหน้า 3 วัน

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supa = createServiceClient()

  // วันนี้ (เวลากรุงเทพ) + เป้าหมาย = วันที่ครบ 90 วันต้องตรงกับ (วันนี้ + 3)
  const todayBKK = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
  const targetDueDate = addDaysStr(todayBKK, REMIND_BEFORE_DAYS)   // ครบ 90 วันในอีก 3 วัน

  // พนักงานที่ยังทดลองงานอยู่
  const { data: emps, error: empErr } = await supa
    .from("employees")
    .select("id, first_name_th, last_name_th, hire_date, phase2_start_date, company_id, employment_status, is_active, deleted_at, probation_use_custom_plan")
    .eq("employment_status", "probation")
    .eq("is_active", true)
    .is("deleted_at", null)
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  // กรองคนที่ครบ 90 วัน "ในอีก 3 วัน"
  //   ข้ามคนที่ใช้แผนกำหนดเอง (ไม่ผูกกับรอบ 90 มาตรฐาน — เตือนตามแผนเองแยกต่างหาก)
  const due = (emps ?? []).filter((e: any) => {
    if (e.probation_use_custom_plan) return false
    const start = effectiveEmploymentStart(e)
    if (!start) return false
    return addDaysStr(start, ROUND_DAYS[REMIND_ROUND]) === targetDueDate
  })
  if (due.length === 0) return NextResponse.json({ ok: true, reminded: 0, message: "ไม่มีพนักงานครบกำหนด" })

  // ข้ามคนที่ประเมินรอบ 90 ไปแล้ว (submitted/approved)
  const dueIds = due.map((e: any) => e.id)
  const { data: doneRows } = await supa
    .from("probation_evaluations")
    .select("employee_id")
    .eq("round", REMIND_ROUND)
    .in("employee_id", dueIds)
    .in("status", ["submitted", "approved"])
  const doneSet = new Set((doneRows ?? []).map((r: any) => r.employee_id))
  const pending = due.filter((e: any) => !doneSet.has(e.id))
  if (pending.length === 0) return NextResponse.json({ ok: true, reminded: 0, message: "ประเมินครบแล้วทุกคน" })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY ไม่ได้ตั้งค่า", pending: pending.length }, { status: 200 })
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""

  // ── ส่งอีเมลต่อคน — ผู้รับตามบริษัทของพนักงานคนนั้น (cache recipients ต่อบริษัท) ──
  const recipientCache = new Map<string, string[]>()
  async function recipientsFor(companyId: string): Promise<string[]> {
    if (recipientCache.has(companyId)) return recipientCache.get(companyId)!
    const { data } = await supa
      .from("probation_email_recipients")
      .select("email")
      .eq("company_id", companyId)
      .eq("is_active", true)
    const list = Array.from(new Set((data ?? []).map((r: any) => String(r.email).trim().toLowerCase()).filter(Boolean)))
    recipientCache.set(companyId, list)
    return list
  }

  let sent = 0
  const errors: string[] = []
  for (const e of pending) {
    try {
      const toList = await recipientsFor(e.company_id)
      if (toList.length === 0) continue
      const name = `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim() || "พนักงาน"
      const mail = probationReminderEmail({
        employeeName: name,
        dueDate: addDaysStr(effectiveEmploymentStart(e)!, ROUND_DAYS[REMIND_ROUND]),
        reviewUrl: appUrl ? `${appUrl}/admin/probation-eval` : undefined,
      })
      const { error: sendErr } = await getResend().emails.send({
        from: "GOODHR <noreply@shd-technology.co.th>",
        to: toList,
        subject: mail.subject,
        html: mail.html,
      })
      if (sendErr) errors.push(`${name}: ${JSON.stringify(sendErr)}`)
      else sent++
    } catch (err: any) {
      errors.push(err?.message ?? String(err))
    }
  }

  return NextResponse.json({ ok: true, target: targetDueDate, pending: pending.length, reminded: sent, errors })
}

// GET = dry-run (ตรวจสิทธิ์ + คืนสถานะ), POST = ส่งจริง (เรียกจาก Netlify scheduled fn)
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
