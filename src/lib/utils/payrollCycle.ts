// ─────────────────────────────────────────────────────────────
// รอบจ่ายเงินเดือน + กฎวันผ่านทดลองงาน (Termination Notice / 1 Payroll Cycle)
//   งวดเดือน M = 22 ของเดือน (M-1) → 21 ของเดือน M, จ่าย 25 ของเดือน M
//   กฎ ">21 = อยู่งวดถัดไป"
// ─────────────────────────────────────────────────────────────

function toDate(d: string | Date): Date {
  if (typeof d !== "string") return d
  return new Date(d.length === 10 ? d + "T00:00:00" : d)
}
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** วันสุดท้ายของเดือน (YYYY-MM-DD) */
export function lastDayOfMonth(d: string | Date): string {
  const dt = toDate(d)
  return fmt(new Date(dt.getFullYear(), dt.getMonth() + 1, 0))
}
/** เป็นวันสุดท้ายของเดือนหรือไม่ */
export function isLastDayOfMonth(d: string | Date): boolean {
  const dt = toDate(d)
  return dt.getDate() === new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
}

/**
 * งวดจ่ายเงินเดือนที่ครอบวันที่ D
 *   คืน { year, month(label 1-12), start(22 ของเดือนก่อน), end(21), payDate(25) }
 */
export function computePayrollPeriod(d: string | Date) {
  const dt = toDate(d)
  let y = dt.getFullYear()
  let m = dt.getMonth() + 1                       // label เดือนของงวด
  if (dt.getDate() >= 22) { m += 1; if (m > 12) { m = 1; y += 1 } }  // >21 → งวดถัดไป
  return {
    year: y, month: m,
    start:   fmt(new Date(y, m - 2, 22)),          // 22 ของเดือนก่อนหน้า
    end:     fmt(new Date(y, m - 1, 21)),          // 21 ของเดือนงวด
    payDate: fmt(new Date(y, m - 1, 25)),          // 25 ของเดือนงวด
  }
}

/**
 * วันสิ้นสุดของงวด "ถัดจาก" งวดที่วัน noticeDate อยู่
 *   = วันมีผลเลิกจ้างตามหลัก "บอกกล่าวล่วงหน้าไม่น้อยกว่า 1 รอบจ่ายค่าจ้าง"
 */
export function nextPayrollCycleEnd(noticeDate: string | Date): string {
  const p = computePayrollPeriod(noticeDate)
  let m = p.month + 1, y = p.year
  if (m > 12) { m = 1; y += 1 }
  return fmt(new Date(y, m - 1, 21))
}

/**
 * System Effective Passed Date
 *   ถ้าวันผ่านทดลองงานเป็นวันสุดท้ายของเดือน → คืนค่าเดิม
 *   ไม่งั้น → วันสุดท้ายของเดือนก่อนหน้า
 */
export function systemEffectivePassedDate(probationEndDate: string): string {
  if (!probationEndDate) return probationEndDate
  if (isLastDayOfMonth(probationEndDate)) return probationEndDate
  const dt = toDate(probationEndDate)
  return fmt(new Date(dt.getFullYear(), dt.getMonth(), 0))  // วันสุดท้ายของเดือนก่อน
}

/**
 * กำหนดที่การประเมินทดลองงานต้องเสร็จสิ้น
 *   = วันสุดท้ายของเดือน "ก่อน" เดือนของ System Effective Passed Date
 */
export function probationEvalDeadline(probationEndDate: string): string {
  if (!probationEndDate) return probationEndDate
  const sysEff = systemEffectivePassedDate(probationEndDate)
  const dt = toDate(sysEff)
  return fmt(new Date(dt.getFullYear(), dt.getMonth(), 0))  // วันสุดท้ายของเดือนก่อน sysEff
}
