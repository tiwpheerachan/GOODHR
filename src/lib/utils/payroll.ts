// ─────────────────────────────────────────────────────────────
// สูตรอ้างอิงจาก "สูตรคำนวนโปรแกรม HR.xlsx"
// ฐาน: เงินเดือน / 30 วัน / 8 ชั่วโมง
// ─────────────────────────────────────────────────────────────

/** อัตราค่าจ้างต่อนาที = เงินเดือน / 30 / 8 / 60 */
export function calcRatePerMinute(base: number): number {
  return base / 30 / 8 / 60
}

/** อัตราค่าจ้างต่อชั่วโมง = เงินเดือน / 30 / 8 */
export function calcRatePerHour(base: number): number {
  return base / 30 / 8
}

/**
 * หักมาสาย: ROUND((เงินเดือน/30/8/60) * นาที, 0)
 * ใช้ฐาน 8 ชั่วโมงต่อวัน ตามสูตร Excel
 */
export function calcLateDeduction(base: number, lateMinutes: number): number {
  if (lateMinutes <= 0) return 0
  return Math.round(calcRatePerMinute(base) * lateMinutes)
}

/** หักขาดงาน = เงินเดือน / 30 * จำนวนวัน */
export function calcAbsentDeduction(base: number, days: number): number {
  if (days <= 0) return 0
  return Math.round((base / 30) * days * 100) / 100
}

/**
 * คำนวณ OT — มี 3 อัตราตามประเภท:
 *  - "weekday"         → 1.5x  (วันทำงานปกติ ก่อนเข้า/หลังเลิก)
 *  - "holiday_regular" → 1.0x  (วันหยุด เวลางานปกติ)
 *  - "holiday_ot"      → 3.0x  (วันหยุด ก่อนเข้า/หลังเลิก)
 */
export type OtType = "weekday" | "holiday_regular" | "holiday_ot"
export const OT_RATES: Record<OtType, number> = {
  weekday:         1.5,
  holiday_regular: 1.0,
  holiday_ot:      3.0,
}

export function calcOT(base: number, minutes: number, type: OtType = "weekday"): number {
  if (minutes <= 0) return 0
  const rate = OT_RATES[type]
  return Math.round((base / 30 / 8) * (minutes / 60) * rate * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// ประกันสังคม (SSO)
// ─────────────────────────────────────────────────────────────
/** SSO: 5% ของฐาน แต่ฐานสูงสุด 15,000 ต่ำสุด 1,650 */
export function calcSSO(base: number, rate = 0.05): number {
  const capped = Math.min(Math.max(base, 1_650), 15_000)
  return Math.round(capped * rate * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// ภาษีเงินได้บุคคลธรรมดา (PIT) — ถูกต้องตามกฎหมายไทย
// ─────────────────────────────────────────────────────────────
/**
 * อัตราภาษีแบบขั้นบันได — ใช้กับ "รายได้สุทธิ" หลังหักค่าลดหย่อนแล้ว
 * from = ขอบล่างของแต่ละช่วง (inclusive)
 */
const BRACKETS = [
  { from:       0, to:   150_000, rate: 0.00 },
  { from: 150_000, to:   300_000, rate: 0.05 },
  { from: 300_000, to:   500_000, rate: 0.10 },
  { from: 500_000, to:   750_000, rate: 0.15 },
  { from: 750_000, to: 1_000_000, rate: 0.20 },
  { from: 1_000_000, to: 2_000_000, rate: 0.25 },
  { from: 2_000_000, to: 5_000_000, rate: 0.30 },
  { from: 5_000_000, to: Infinity,  rate: 0.35 },
]

/** คำนวณภาษีจาก "รายได้สุทธิ" ที่หักค่าลดหย่อนแล้ว */
export function calcAnnualTaxFromNetIncome(netIncome: number): number {
  if (netIncome <= 0) return 0
  let tax = 0
  for (const b of BRACKETS) {
    if (netIncome <= b.from) break
    tax += (Math.min(netIncome, b.to) - b.from) * b.rate
  }
  return Math.round(tax * 100) / 100
}

/**
 * คำนวณภาษีรายเดือน (หัก ณ ที่จ่าย) ตามกฎหมายไทย
 *
 * ขั้นตอน:
 *  1. คำนวณรายได้ทั้งปี = grossMonthly * 12
 *  2. หักค่าใช้จ่าย = min(รายได้ * 50%, 100,000)
 *  3. หักค่าลดหย่อนส่วนตัว = 60,000
 *  4. หักเงินประกันสังคม (SSO ต่อปี = ssoMonthly * 12 แต่ max 9,000)
 *  5. คำนวณภาษีจาก net income ที่เหลือ
 *  6. หารด้วย 12 = ภาษีรายเดือน
 */
export function calcMonthlyTax(grossMonthly: number, ssoMonthly: number): number {
  if (grossMonthly <= 0) return 0

  const annualGross   = grossMonthly * 12

  // ค่าใช้จ่ายหักได้ = 50% ของรายได้ สูงสุด 100,000
  const expenseDeduct = Math.min(annualGross * 0.5, 100_000)

  // ค่าลดหย่อนส่วนตัว = 60,000 บาทต่อปี
  const personalDeduct = 60_000

  // SSO ที่จ่ายต่อปี (สูงสุด 9,000 บาท เพราะฐาน max 15,000 * 5% * 12 = 9,000)
  const ssoAnnual = Math.min(ssoMonthly * 12, 9_000)

  const netIncome = Math.max(annualGross - expenseDeduct - personalDeduct - ssoAnnual, 0)

  const annualTax = calcAnnualTaxFromNetIncome(netIncome)
  return Math.round(annualTax / 12 * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// Late threshold ตามแผนก (นาที) — กฎ PTC Excel
// ─────────────────────────────────────────────────────────────
const LATE_THRESHOLD_BY_DEPT: Record<string, number> = {
  "คลังสินค้า": 5,
  "warehouse":  5,
  "service":    5,

  "marketing":      10,
  "tiktok":         10,
  "hr":             10,
  "accounting":     10,
  "sale offline":   10,
  "brand shop":     10,
  "dealer":         10,
  "support":        10,
  "kam":            10,
  "บัญชี":          10,
  "ทรัพยากรบุคคล": 10,
  "การตลาด":        10,

  "admin online":   0,
  "แอดมินออนไลน์": 0,
}

export function getLateThreshold(departmentName?: string | null): number {
  if (!departmentName) return 0
  const key = departmentName.toLowerCase().trim()
  for (const [k, v] of Object.entries(LATE_THRESHOLD_BY_DEPT)) {
    if (key.includes(k)) return v
  }
  return 0
}

// ─────────────────────────────────────────────────────────────
// Annual Leave by Position Level
// ─────────────────────────────────────────────────────────────
const ANNUAL_LEAVE_BY_LEVEL: Array<{ keywords: string[]; days: number }> = [
  { keywords: ["director"],                                    days: 10 },
  { keywords: ["associate director"],                          days: 10 },
  { keywords: ["manager"],                                     days: 9  },
  { keywords: ["associate manager"],                           days: 8  },
  { keywords: ["senior associate"],                            days: 7  },
  { keywords: ["associate", "senior analyst", "analyst"],      days: 6  },
]

export function getAnnualLeaveDays(positionName?: string | null): number {
  if (!positionName) return 6
  const p = positionName.toLowerCase()
  for (const level of ANNUAL_LEAVE_BY_LEVEL) {
    if (level.keywords.some(k => p.includes(k))) return level.days
  }
  return 6
}

export function calcProRataLeaveDays(
  fullDays: number,
  probationEnd: Date,
  yearEnd: Date = new Date(new Date().getFullYear(), 11, 31)
): number {
  const daysRemaining = Math.max(
    Math.floor((yearEnd.getTime() - probationEnd.getTime()) / 86_400_000),
    0
  )
  return Math.round((fullDays * daysRemaining) / 365 * 10) / 10
}

// ─────────────────────────────────────────────────────────────
// Main Payroll Summary
// ─────────────────────────────────────────────────────────────
export interface OTBreakdown {
  weekday_minutes:         number
  holiday_regular_minutes: number
  holiday_ot_minutes:      number
}

export function calculatePayrollSummary(args: {
  baseSalary:       number
  allowances?:      number
  otBreakdown?:     OTBreakdown
  otMinutes?:       number
  bonus?:           number
  absentDays?:      number
  lateMinutes?:     number
  earlyOutMinutes?: number
  loanDeduction?:   number
}) {
  const {
    baseSalary,
    allowances   = 0,
    bonus        = 0,
    absentDays   = 0,
    lateMinutes  = 0,
    earlyOutMinutes = 0,
    loanDeduction = 0,
    otBreakdown,
    otMinutes    = 0,
  } = args

  // ── รายได้ ──────────────────────────────────────────────────
  let otAmount = 0
  if (otBreakdown) {
    otAmount += calcOT(baseSalary, otBreakdown.weekday_minutes,         "weekday")
    otAmount += calcOT(baseSalary, otBreakdown.holiday_regular_minutes, "holiday_regular")
    otAmount += calcOT(baseSalary, otBreakdown.holiday_ot_minutes,      "holiday_ot")
  } else {
    otAmount = calcOT(baseSalary, otMinutes, "weekday")
  }

  const gross = baseSalary + allowances + otAmount + bonus

  // ── ประกันสังคม ─────────────────────────────────────────────
  const sso = calcSSO(baseSalary)

  // ── ภาษีหัก ณ ที่จ่าย (คำนวณถูกต้องตามกฎหมายไทย) ──────────
  // ✅ ส่ง gross และ sso เพื่อให้ calcMonthlyTax คิดค่าลดหย่อนถูกต้อง
  const tax = calcMonthlyTax(gross, sso)

  // ── รายการหัก ───────────────────────────────────────────────
  const deductAbsent   = calcAbsentDeduction(baseSalary, absentDays)
  const deductLate     = calcLateDeduction(baseSalary, lateMinutes)
  const deductEarlyOut = calcLateDeduction(baseSalary, earlyOutMinutes)
  const totalDeduct    = sso + tax + deductAbsent + deductLate + deductEarlyOut + loanDeduction

  return {
    gross,
    otAmount,
    sso,
    tax,
    deductAbsent,
    deductLate,
    deductEarlyOut,
    totalDeduct,
    net: Math.max(gross - totalDeduct, 0),
  }
}