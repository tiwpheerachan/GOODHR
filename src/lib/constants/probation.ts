// ── ค่าคงที่ของรอบประเมินทดลองงาน (ใช้ร่วมกันทุกฝั่ง) ─────────────────────────
// round 0 = 30 วันแรก (รอบแรกของพนักงานใหม่), 1/2/3 = 60/90/119 วัน
// หมายเหตุ: round 0 เป็นค่า falsy — ระวัง guard แบบ `!round` หรือ `Number(...) || 1`

// รอบสำหรับการประเมิน "ใหม่" — offer ในกริดหัวหน้า/ตัวกรอง (2 รอบ: 45, 90 วัน)
export const PROBATION_ROUNDS = [1, 2] as const

export const ROUND_DAYS: Record<number, number> = { 1: 45, 2: 90 }

// ป้ายเต็ม — ใช้แสดงผล (notification / audit / แอดมิน / พนักงาน)
//   รวมรอบเก่า (0=30, 3=119) ไว้ด้วย เพื่อให้ข้อมูลประเมินเดิมยังแสดงได้ถูกต้อง
export const ROUND_LABELS: Record<number, string> = {
  0: "ทดลองงาน 30 วัน (เดิม)",
  1: "รอบที่ 1 (45 วัน)",
  2: "รอบที่ 2 (90 วัน)",
  3: "รอบที่ 3 (119 วัน) (เดิม)",
}

// ป้ายสั้น — ใช้ในกริด/ตัวกรอง (รวมรอบเก่าไว้แสดงผล)
export const ROUND_SHORT: Record<number, string> = { 0: "30 วัน", 1: "45 วัน", 2: "90 วัน", 3: "119 วัน" }

/**
 * วันเริ่มงานที่ใช้ "นับทดลองงาน"
 *   - พนักงาน 2 เฟส (PC): นับจาก phase2_start_date (วันเป็นพนักงานจริง)
 *   - พนักงานทั่วไป: นับจาก hire_date
 * ใช้แทน hire_date ในการคำนวณ probation_end_date + due date รอบประเมิน
 */
export function effectiveEmploymentStart(emp: any): string | undefined {
  return emp?.phase2_start_date || emp?.hire_date
}
