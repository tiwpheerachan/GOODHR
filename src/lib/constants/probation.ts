// ── ค่าคงที่ของรอบประเมินทดลองงาน (ใช้ร่วมกันทุกฝั่ง) ─────────────────────────
// round 0 = 30 วันแรก (รอบแรกของพนักงานใหม่), 1/2/3 = 60/90/119 วัน
// หมายเหตุ: round 0 เป็นค่า falsy — ระวัง guard แบบ `!round` หรือ `Number(...) || 1`

export const PROBATION_ROUNDS = [0, 1, 2, 3] as const // ลำดับการแสดงผล (30 วันมาก่อน)

export const ROUND_DAYS: Record<number, number> = { 0: 30, 1: 60, 2: 90, 3: 119 }

// ป้ายเต็ม — ใช้ใน notification / audit log / หน้าแอดมิน / หน้าพนักงาน
export const ROUND_LABELS: Record<number, string> = {
  0: "ทดลองงาน 30 วันแรก",
  1: "รอบที่ 1 (60 วัน)",
  2: "รอบที่ 2 (90 วัน)",
  3: "รอบที่ 3 (119 วัน)",
}

// ป้ายสั้น — ใช้ในกริด/ตัวกรอง
export const ROUND_SHORT: Record<number, string> = { 0: "30 วัน", 1: "60 วัน", 2: "90 วัน", 3: "119 วัน" }
