// ── กติกาการ relay in-app notification → Feishu ─────────────────────
//   หลักการ: notifications ถูกเขียนถึง "ผู้รับที่ถูกต้องตามสิทธิ์ GoodHR แล้ว"
//   (เช่น อนุมัติลา→ลูกน้อง · KPI ส่ง→ผู้ประเมิน/HR · หัวหน้าเห็นแค่ลูกน้องตัวเอง)
//   → relay ตาม recipient เดิม = ถูกสิทธิ์อยู่แล้ว
//
//   ยกเว้น "รายการคิวของ HR/admin ที่เยอะเกิน" → ไม่ต้อง auto (ถามใน risemanu แทน)

// ชนิดที่ "ไม่ auto-relay" (เป็น queue ที่ HR/admin ดูเองใน risemanu ได้)
export const RELAY_EXCLUDE_TYPES = new Set<string>([
  "kpi_pending_approval",       // KPI รอ HR อนุมัติ (เยอะ)
  "probation_eval_pending",     // ทดลองงานรอ HR อนุมัติ (เยอะ)
  "probation_eval_assigned",    // มอบหมายผู้ประเมิน (ดูใน risemanu)
])

// prefix ที่ถ้า "ผู้รับเป็น super_admin" จะไม่ auto (super เห็นหมด ไม่ต้อง spam · ถามเอง)
export const SUPERADMIN_MUTE_PREFIX = ["kpi", "probation", "branch_eval"]

export function shouldRelayType(type: string | null | undefined): boolean {
  if (!type) return true
  return !RELAY_EXCLUDE_TYPES.has(type)
}

// mute สำหรับ super_admin: kpi/probation/branch_eval ที่เยอะ
export function mutedForSuperAdmin(type: string | null | undefined): boolean {
  if (!type) return false
  return SUPERADMIN_MUTE_PREFIX.some((p) => type.startsWith(p))
}
