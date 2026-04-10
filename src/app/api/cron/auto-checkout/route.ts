import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// ── ความปลอดภัย: ต้องส่ง Authorization: Bearer <CRON_SECRET> ──────────────
// Set CRON_SECRET ใน Netlify Environment Variables
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// ── คำนวณ estimated clock_out จาก shift ─────────────────────────────────────
// ถ้ามี shift → ใช้เวลาเลิกงาน (overnight บวก 1 วัน)
// fallback → clock_in + 9 ชั่วโมง
function estimateClockOut(clockIn: Date, shiftWorkEnd: string | null, isOvernight: boolean, workDate: string): Date {
  if (shiftWorkEnd) {
    const [h, m] = shiftWorkEnd.split(":").map(Number)
    const base = new Date(`${workDate}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00+07:00`)
    if (isOvernight) return new Date(base.getTime() + 86_400_000)
    return base
  }
  return new Date(clockIn.getTime() + 9 * 3_600_000)
}

// ── GET: ทดสอบ dry-run ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ ok: true, message: "cron/auto-checkout ready" })
}

// ── POST: รัน auto-checkout ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // วันที่ไทยปัจจุบัน (ตี 5 ของวันนี้ = ตัดรอบวันก่อนหน้า → วันใหม่เริ่ม)
  const nowBKK = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })

  // หา attendance_records ที่:
  // - มี clock_in แต่ไม่มี clock_out
  // - work_date < วันนี้ (ไม่ยุ่งกับ record วันปัจจุบัน)
  const { data: stuckRecords, error: fetchErr } = await supa
    .from("attendance_records")
    .select("id, employee_id, company_id, work_date, clock_in, status, shift_template_id")
    .not("clock_in", "is", null)
    .is("clock_out", null)
    .lt("work_date", nowBKK)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!stuckRecords || stuckRecords.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "ไม่มี record ค้าง" })
  }

  // ดึง shift_templates ที่เกี่ยวข้องทั้งหมดในครั้งเดียว
  const shiftIds = Array.from(new Set(stuckRecords.map(r => r.shift_template_id).filter(Boolean)))
  const shiftMap = new Map<string, any>()
  if (shiftIds.length > 0) {
    const { data: shifts } = await supa
      .from("shift_templates")
      .select("id, work_end, is_overnight")
      .in("id", shiftIds as string[])
    for (const s of (shifts ?? [])) shiftMap.set(s.id, s)
  }

  let processed = 0
  let skipped = 0
  const errors: string[] = []

  for (const rec of stuckRecords) {
    try {
      const clockIn = new Date(rec.clock_in as string)
      const shift   = rec.shift_template_id ? shiftMap.get(rec.shift_template_id) : null
      const estimatedOut = estimateClockOut(
        clockIn,
        shift?.work_end ?? null,
        shift?.is_overnight ?? false,
        rec.work_date as string,
      )
      const workMin = Math.max(0, Math.round((estimatedOut.getTime() - clockIn.getTime()) / 60_000) - 60)

      // ── ปิด attendance record ด้วย estimated clock_out ──────────────────
      // ใส่ note ไว้ให้รู้ว่าระบบปิดอัตโนมัติ
      // ไม่สร้าง time_adjustment_request → ให้พนักงานยื่นคำขอแก้ไขเวลาเอง
      await supa.from("attendance_records").update({
        clock_out:          estimatedOut.toISOString(),
        clock_out_valid:    false,                      // ไม่ valid → พนักงานต้องยื่นแก้ไขเอง
        work_minutes:       workMin,
        early_out_minutes:  0,
        note:               (rec as any).note
          ? (rec as any).note + " | ระบบปิดอัตโนมัติตี 5 (ลืมเช็คเอ้า)"
          : "ระบบปิดอัตโนมัติตี 5 (ลืมเช็คเอ้า — กรุณายื่นแก้ไขเวลาด้วยตนเอง)",
      }).eq("id", rec.id as string)

      processed++
    } catch (e: any) {
      errors.push(`${rec.employee_id}:${rec.work_date} — ${e?.message ?? e}`)
      skipped++
    }
  }

  return NextResponse.json({
    ok:        true,
    processed,
    skipped,
    errors:    errors.length > 0 ? errors : undefined,
    run_at:    new Date().toISOString(),
  })
}
