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
  return Math.round(calcRatePerMinute(base) * lateMinutes * 100) / 100
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

export function calcOT(base: number, minutes: number, type: OtType = "weekday", rateOverride?: number): number {
  if (minutes <= 0) return 0
  const rate = rateOverride ?? OT_RATES[type]
  return Math.round((base / 30 / 8) * (minutes / 60) * rate * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// ประกันสังคม (SSO) — อัปเดตตามกฎใหม่ 2567-2568
// ─────────────────────────────────────────────────────────────
/**
 * SSO: 5% ของเงินเดือน แต่ไม่เกิน 875 บาท
 * (ฐานเงินเดือนสูงสุด 17,500 × 5% = 875)
 * ต่ำสุด 1,650 × 5% = 82.50
 */
export const SSO_RATE        = 0.05
export const SSO_MAX_AMOUNT  = 875   // บาท/เดือน
export const SSO_MIN_BASE    = 1_650
export const SSO_MAX_BASE    = 17_500

export function calcSSO(base: number, rate = SSO_RATE): number {
  if (base <= 0) return 0
  const capped = Math.min(Math.max(base, SSO_MIN_BASE), SSO_MAX_BASE)
  const amount = Math.round(capped * rate * 100) / 100
  return Math.min(amount, SSO_MAX_AMOUNT)
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

  // SSO ที่จ่ายต่อปี (สูงสุด 10,500 บาท เพราะ max 875 * 12 = 10,500)
  const ssoAnnual = Math.min(ssoMonthly * 12, SSO_MAX_AMOUNT * 12)

  const netIncome = Math.max(annualGross - expenseDeduct - personalDeduct - ssoAnnual, 0)

  const annualTax = calcAnnualTaxFromNetIncome(netIncome)
  return Math.round(annualTax / 12 * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// Late threshold ตามบริษัท+แผนก (นาที grace period)
// ─────────────────────────────────────────────────────────────
// กฎ:
//   PTC ทุกแผนก          → 0 นาที (หักตั้งแต่นาทีที่ 1)
//   คลังสินค้า, Service    → 5 นาที (หักตั้งแต่นาทีที่ 6)
//   แอดมินออนไลน์          → 0 นาที (หักตั้งแต่นาทีที่ 1)
//   Marketing, MC Live Streaming (Tiktok), HR, Accounting (บัญชี),
//   Sale Offline, Brand Shop, Dealer, Support, KAM
//                          → 10 นาที (หักตั้งแต่นาทีที่ 11)
//   อื่นๆ (ไม่ระบุ)        → 0 นาที (default)
// ─────────────────────────────────────────────────────────────

// Grace = 0 (หักตั้งแต่นาทีที่ 1)
const GRACE_0_DEPTS = [
  "admin online", "แอดมินออนไลน์",
]

// Grace = 5 (อนุโลม 5 นาที → หักนาทีที่ 6)
const GRACE_5_DEPTS = [
  "คลังสินค้า", "warehouse", "service",
]

// Grace = 10 (อนุโลม 10 นาที → หักนาทีที่ 11)
const GRACE_10_DEPTS = [
  "marketing", "การตลาด", "mc live streaming", "tiktok",
  "hr", "ทรัพยากรบุคคล", "บุคคล",
  "accounting", "บัญชี",
  "sale offline",
  "brand shop",
  "dealer",
  "support", "สนับสนุน",
  "kam",
  "content", "graphic",
  "บริหาร",
]

// Companies ที่ทุกแผนก grace = 0
const GRACE_0_COMPANIES = ["ptc"]

export function getLateThreshold(
  departmentName?: string | null,
  companyCode?: string | null,
): number {
  // PTC ทุกแผนก → 0 (หักตั้งแต่นาทีที่ 1)
  if (companyCode) {
    const co = companyCode.toLowerCase().trim()
    if (GRACE_0_COMPANIES.some(c => co.includes(c))) return 0
  }

  if (!departmentName) return 0
  const key = departmentName.toLowerCase().trim()

  // Check grace = 0
  if (GRACE_0_DEPTS.some(d => key.includes(d))) return 0

  // Check grace = 5
  if (GRACE_5_DEPTS.some(d => key.includes(d))) return 5

  // Check grace = 10
  if (GRACE_10_DEPTS.some(d => key.includes(d))) return 10

  // Default: 0 (หักตั้งแต่นาทีที่ 1)
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
  /**
   * ภาษีหัก ณ ที่จ่าย: ถ้าตั้งค่า (0-100) จะใช้ % นี้แทนสูตรขั้นบันได
   * null/undefined = คำนวณอัตโนมัติตามกฎหมายไทย
   */
  taxWithholdingPct?: number | null
  /** อัตรา OT วันทำงาน (default 1.5) — จาก salary_structures.ot_rate_normal */
  otRateWeekday?: number | null
  /** อัตรา OT วันหยุด (default 3.0) — จาก salary_structures.ot_rate_holiday */
  otRateHoliday?: number | null
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
    taxWithholdingPct,
    otRateWeekday,
    otRateHoliday,
  } = args

  // ── รายได้ ──────────────────────────────────────────────────
  // ใช้ per-employee OT rates จาก salary_structures ถ้ามี, ไม่งั้นใช้ค่า default ตามกฎหมาย
  const rateWd  = (otRateWeekday != null && otRateWeekday > 0)  ? otRateWeekday  : undefined
  const rateHol = (otRateHoliday != null && otRateHoliday > 0)  ? otRateHoliday  : undefined

  let otAmount = 0
  if (otBreakdown) {
    otAmount += calcOT(baseSalary, otBreakdown.weekday_minutes,         "weekday",         rateWd)
    otAmount += calcOT(baseSalary, otBreakdown.holiday_regular_minutes, "holiday_regular")         // 1.0x เสมอ (ค่าจ้างทำงานวันหยุด)
    otAmount += calcOT(baseSalary, otBreakdown.holiday_ot_minutes,      "holiday_ot",      rateHol)
  } else {
    otAmount = calcOT(baseSalary, otMinutes, "weekday", rateWd)
  }

  const gross = baseSalary + allowances + otAmount + bonus

  // ── ประกันสังคม ─────────────────────────────────────────────
  const sso = calcSSO(baseSalary)

  // ── ภาษีหัก ณ ที่จ่าย ─────────────────────────────────────────
  let tax: number
  let taxMethod: "auto" | "fixed_pct"

  if (taxWithholdingPct != null && taxWithholdingPct >= 0) {
    // ใช้ % ที่ตั้งไว้ (เช่น 3% ของ gross)
    tax = Math.round(gross * (taxWithholdingPct / 100) * 100) / 100
    taxMethod = "fixed_pct"
  } else {
    // คำนวณอัตโนมัติตามกฎหมายไทย (ขั้นบันได)
    tax = calcMonthlyTax(gross, sso)
    taxMethod = "auto"
  }

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
    taxMethod,
    deductAbsent,
    deductLate,
    deductEarlyOut,
    totalDeduct,
    net: Math.max(gross - totalDeduct, 0),
  }
}