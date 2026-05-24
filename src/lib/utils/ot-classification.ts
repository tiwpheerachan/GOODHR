// ════════════════════════════════════════════════════════════════════
// OT Rate Classification — แยก OT minutes ตาม "rate ที่พนักงานขอ"
// ════════════════════════════════════════════════════════════════════
// ปัญหาที่แก้:
//   เดิม payroll ใช้ flag isWorkDay() เป็นตัวแยกประเภท OT
//     • วันทำงาน → 1.5x bucket (weekday)
//     • วันหยุด  → 3.0x bucket (holiday_ot) เสมอ
//   ทำให้ "OT x1.0 บนวันหยุด" ถูกจัดเป็น x3.0 ผิด (ค่าจ้างพุ่ง 3 เท่า)
//
// วิธีแก้ใหม่:
//   อ่าน overtime_requests (status=approved) → จัด bucket ตาม ot_rate ของแต่ละ request
//     • rate <= 1.0 → holiday_regular_minutes (1.0x)
//     • 1.0 < rate < 3.0 → weekday_minutes (1.5x)
//     • rate >= 3.0 → holiday_ot_minutes (3.0x)
//   แล้ว scale ให้ผลรวมเท่ากับ attendance_records.ot_minutes
//   (เพื่อเก็บค่า manual edit ของ HR ไว้)
// ════════════════════════════════════════════════════════════════════

import type { OTBreakdown } from "./payroll"

type ApprovedOT = {
  work_date: string
  ot_start: string | null
  ot_end: string | null
  ot_rate: number | string | null
}

type AttRow = {
  work_date: string
  ot_minutes: number | string | null
}

type IsWorkDayFn = (date: string) => boolean

/**
 * แยก OT minutes ตามเรท
 *
 * @param records   attendance_records (ใช้เป็น "ยอดรวมจริง" — รองรับ manual edit)
 * @param approvedOts overtime_requests ที่ status=approved ในช่วงเดียวกัน
 * @param isWorkDay fallback เวลาไม่มี approved request (manual edit OT only)
 */
export function classifyOtFromRecords(
  records: AttRow[],
  approvedOts: ApprovedOT[],
  isWorkDay: IsWorkDayFn,
): OTBreakdown {
  // ── 1) สร้าง breakdown ต่อ work_date จาก approved requests ──
  const reqByDate = new Map<string, { reg: number; weekday: number; holiday: number }>()
  for (const ot of approvedOts) {
    if (!ot.ot_start || !ot.ot_end) continue
    const mins = Math.max(0, Math.round(
      (new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000,
    ))
    if (mins <= 0) continue
    const rate = Number(ot.ot_rate) || 1.5
    const cur = reqByDate.get(ot.work_date) ?? { reg: 0, weekday: 0, holiday: 0 }
    if (rate >= 3.0)      cur.holiday += mins
    else if (rate <= 1.0) cur.reg     += mins
    else                  cur.weekday += mins
    reqByDate.set(ot.work_date, cur)
  }

  // ── 2) เดิน attendance records, ใช้ breakdown จาก requests, scale ตามจำนวนจริง ──
  let weekdayMin = 0, regMin = 0, holidayMin = 0

  for (const r of records) {
    const otMin = Number(r.ot_minutes) || 0
    if (otMin <= 0) continue

    const breakdown = reqByDate.get(r.work_date)

    if (breakdown) {
      // มี approved request ในวันนี้ — ใช้ rate ของ request เป็นตัวแยก
      const reqTotal = breakdown.reg + breakdown.weekday + breakdown.holiday
      if (reqTotal > 0) {
        // scale ให้ผลรวม = attendance.ot_minutes (รองรับกรณี HR แก้มือ)
        const scale = otMin / reqTotal
        const reg     = Math.round(breakdown.reg     * scale)
        const weekday = Math.round(breakdown.weekday * scale)
        // holiday = ส่วนที่เหลือ — กัน rounding error ทำให้ total ≠ otMin
        const holiday = otMin - reg - weekday
        regMin     += reg
        weekdayMin += weekday
        holidayMin += Math.max(0, holiday)
        continue
      }
    }

    // ไม่มี request — fallback ใช้ workday flag แบบเดิม (รองรับ manual edit OT)
    if (isWorkDay(r.work_date)) weekdayMin += otMin
    else                         holidayMin += otMin
  }

  return {
    weekday_minutes:         weekdayMin,
    holiday_regular_minutes: regMin,
    holiday_ot_minutes:      holidayMin,
  }
}
