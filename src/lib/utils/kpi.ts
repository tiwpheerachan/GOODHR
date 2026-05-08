// Shared KPI constants and helpers used by both API routes and UI

// ตารางเงินรางวัล KPI สำหรับ "คนที่ไม่มีฐาน KPI" — ใช้กับ evaluation_type = 'grade_incentive'
// อ้างอิงเกณฑ์มาตรฐานบริษัท (ไม่อิง kpi_bonus_settings)
export const KPI_GRADE_INCENTIVE_TABLE: Record<string, number> = {
  A: 5000, // คะแนน ≥ 90
  B: 4000, // คะแนน 80-89
  C: 3000, // คะแนน 65-79
  D: 2000, // คะแนน < 65
}

// เกรดมาตรฐาน — ใช้กับ Mode A (standard)
export function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

// เกรดสำหรับ Mode C — ตามเกณฑ์ตารางเงินรางวัล (เกณฑ์ต่างจาก calcGrade เล็กน้อย)
export function calcGradeIncentive(score: number): string {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 65) return "C"
  return "D"
}

export const VALID_EVAL_TYPES = ["standard", "money_only", "grade_incentive"] as const
export type EvaluationType = typeof VALID_EVAL_TYPES[number]

export const EVAL_TYPE_LABEL: Record<EvaluationType, string> = {
  standard: "ประเมินตามมาตรฐาน",
  money_only: "ใส่จำนวนเงินเอง",
  grade_incentive: "ประเมิน + เงินตามเกรด",
}
