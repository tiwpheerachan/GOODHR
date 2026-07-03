// ─────────────────────────────────────────────────────────────
// สูตรอ้างอิงจาก "สูตรคำนวนโปรแกรม HR.xlsx"
// ฐาน: เงินเดือน / 30 วัน / 8 ชั่วโมง
// ─────────────────────────────────────────────────────────────

/**
 * คำนวณ prorate_days อัตโนมัติ จาก hire_date เทียบกับช่วงงวดเงินเดือน
 * - เริ่มงานก่อนงวด → null (ทำเต็มเดือน)
 * - เริ่มงานในช่วงงวด → end - hire + 1 (inclusive)
 * - เริ่มงานหลังงวด → null
 * - days >= 30 → null (เต็มเดือน)
 */
export function computeAutoProrateDays(
  hireDate?: string | null,
  periodStart?: string | null,
  periodEnd?: string | null,
): number | null {
  if (!hireDate || !periodStart || !periodEnd) return null
  const h = new Date(hireDate)
  const s = new Date(periodStart)
  const e = new Date(periodEnd)
  if (isNaN(h.getTime()) || isNaN(s.getTime()) || isNaN(e.getTime())) return null
  const mid = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const hM = mid(h), sM = mid(s), eM = mid(e)
  if (hM <= sM) return null
  if (hM > eM)  return null
  const days = Math.round((eM - hM) / 86_400_000) + 1
  if (days < 1 || days >= 30) return null
  return days
}

/**
 * apply auto-prorate ลงใน record (clone)
 *   ถ้า prorate_days ยัง null แต่มี _autoProrateDays → ใช้ _autoProrateDays แทน
 *   ใช้ทั้งใน admin/payroll table, EditModal, PayslipModal, /api/payslip/download
 *   เพื่อให้ตัวเลขสรุปตรงกันทุกที่
 */
export function applyAutoProrate(r: any): any {
  if (r?.prorate_days != null) return r
  if (r?._autoProrateDays == null) return r
  return { ...r, prorate_days: r._autoProrateDays }
}

/**
 * Prorate factor — สำหรับพนักงานเข้า/ออกกลางงวด
 * - null/undefined/0/>=30 → 1.0 (ทำเต็มเดือน)
 * - 1-29 → days / 30
 */
export function getProrateFactor(prorateDays: number | null | undefined): number {
  const pd = Number(prorateDays) || 0
  if (pd <= 0 || pd >= 30) return 1
  return pd / 30
}

/** เงินเดือน × factor — ปัดเศษเป็นบาท (<0.5 ลง, ≥0.5 ขึ้น) */
export function applyProrate(amount: number, prorateDays: number | null | undefined): number {
  const f = getProrateFactor(prorateDays)
  return Math.round((Number(amount) || 0) * f)
}

/**
 * recomputePayroll: คำนวณ gross/SSO/tax/net จาก record ของ payroll_records
 *
 * กฎ prorate:
 * - `base_salary` (เงินเดือนฐาน) → คูณด้วย factor (วันทำงาน/30)
 * - `bonus` (KPI/โบนัส) → **ไม่ prorate** เพราะเป็นเงินรางวัล ไม่ใช่ค่าจ้างรายวัน
 *   - กรณีตามเกรด เช่น 5,000 ฿ → จ่ายเต็ม
 *   - กรณีกรอกเงินตรง เช่น 18,888 ฿ (ค่าผลงานพิเศษ) → จ่ายเต็ม
 * - allowances, OT, commission, extras → ใช้ค่าที่เก็บใน record ตรงๆ
 *
 * SSO/tax:
 * - ถ้า prorate → recompute SSO (5% ของ effBase) + tax (ขั้นบันไดจาก gross ใหม่)
 * - ถ้าไม่ prorate → ใช้ค่าที่บันทึกไว้ (เคารพ manual ของ HR)
 *
 * ใช้ใน: PayslipModal, FullRegisterTable, CompactTable, /app/salary, PDF download
 */
export function recomputePayroll(record: any) {
  const N = (v: any) => Number(v) || 0
  const fullBase = N(record?.base_salary)
  const pd = N(record?.prorate_days)
  const factor = (pd > 0 && pd < 30) ? pd / 30 : 1
  const isProrated = factor < 1

  // ปัดเศษเป็นบาท (<0.5 ลง, ≥0.5 ขึ้น)
  const effBase = Math.round(fullBase * factor)
  const effBonus = Math.round(N(record?.bonus))  // KPI bonus ไม่ prorate (จ่ายเต็ม)
  const ieTotal = record?.income_extras && typeof record.income_extras === "object"
    ? Object.values(record.income_extras).reduce((s: number, v: any) => s + N(v), 0)
    : 0
  const deTotal = record?.deduction_extras && typeof record.deduction_extras === "object"
    ? Object.values(record.deduction_extras).reduce((s: number, v: any) => s + N(v), 0)
    : 0

  const allowances = N(record?.allowance_position) + N(record?.allowance_transport)
    + N(record?.allowance_food) + N(record?.allowance_phone)
    + N(record?.allowance_housing) + N(record?.allowance_vehicle)
    + N(record?.allowance_other)

  // ปัดเศษทุกตัวให้เป็นบาท (รวมค่าจ้าง Phase 1 ที่จ่ายเป็น "ค่าอื่นๆ")
  const gross = Math.round(effBase + effBonus + allowances
    + N(record?.ot_amount) + N(record?.commission) + N(record?.other_income) + N(record?.phase1_wage) + ieTotal)

  // ── structural flags (จาก salary_structures) — ชนะการ recompute เสมอ ──
  //    is_sso_exempt → SSO = 0 | is_tax_3pct → ภาษี = 3% ของ gross
  const ssoExempt = !!record?.is_sso_exempt
  const tax3pct   = !!record?.is_tax_3pct
  // เดือน 2 เฟส (มี Phase 1) — server คำนวณ SSO/ภาษี/PF ถูกต้องแล้ว ห้าม recompute ทับ
  const isTwoPhase = N(record?.phase1_wage) > 0

  // ถ้า prorate (และไม่ใช่ 2 เฟส) → recompute SSO + tax เพื่อสะท้อนงวดจริง
  // ถ้าไม่ prorate / เป็น 2 เฟส → ใช้ค่าที่บันทึกไว้ (เคารพ server/manual)
  const recompute = isProrated && !isTwoPhase
  const sso = ssoExempt
    ? 0
    : Math.round(recompute ? calcSSO(effBase) : N(record?.social_security_amount))
  const tax = tax3pct
    ? Math.round(gross * 0.03)
    : Math.round(recompute ? calcMonthlyTax(gross, sso) : N(record?.monthly_tax_withheld))
  const pf = Math.round(N(record?.provident_fund))  // กองทุน — ใช้ค่าที่ server คำนวณ/เก็บไว้

  const baseDeducts = N(record?.deduct_absent) + N(record?.deduct_late)
    + N(record?.deduct_early_out) + N(record?.deduct_loan) + N(record?.deduct_other)

  const totalDed = Math.round(baseDeducts + sso + pf + tax + deTotal)
  const net = Math.max(Math.round(gross - totalDed), 0)

  return { effBase, effBonus, gross, sso, pf, tax, totalDed, net, isProrated, factor, prorateDays: pd }
}

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
 * ปัดเศษเป็นบาท (<0.5 ลง, ≥0.5 ขึ้น)
 */
export function calcLateDeduction(base: number, lateMinutes: number): number {
  if (lateMinutes <= 0) return 0
  return Math.round(calcRatePerMinute(base) * lateMinutes)
}

/** หักขาดงาน = เงินเดือน / 30 * จำนวนวัน — ปัดเศษเป็นบาท */
export function calcAbsentDeduction(base: number, days: number): number {
  if (days <= 0) return 0
  return Math.round((base / 30) * days)
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
  // ปัดเศษเป็นบาท (<0.5 ลง, ≥0.5 ขึ้น)
  return Math.round((base / 30 / 8) * (minutes / 60) * rate)
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
  // ปัดเศษเป็นบาท
  const amount = Math.round(capped * rate)
  return Math.min(amount, SSO_MAX_AMOUNT)
}

// ─────────────────────────────────────────────────────────────
// กองทุนสำรองเลี้ยงชีพ (Provident Fund / PF)
// ─────────────────────────────────────────────────────────────
/** PF = % ของฐานเงินเดือน (ต่อคน) — 0 ถ้าไม่ตั้ง */
export function calcPF(base: number, pct?: number | null): number {
  const p = Number(pct) || 0
  if (base <= 0 || p <= 0) return 0
  return Math.round(base * (p / 100))
}

// ─────────────────────────────────────────────────────────────
// จ้างงาน 2 เฟส (PC / Pre-Employee)
// ─────────────────────────────────────────────────────────────
/**
 * วันเริ่ม Phase 2 = วันถัดจากสิ้นสุด Pre-Employment แล้วเลื่อนวันหยุด
 *   จ.–ศ. → วันนั้น | เสาร์ → จันทร์ถัดไป (+2) | อาทิตย์ → จันทร์ถัดไป (+1)
 * คืนค่า YYYY-MM-DD
 */
export function computePhase2Start(preEmploymentTo?: string | null): string | null {
  if (!preEmploymentTo) return null
  const d = new Date(preEmploymentTo)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + 1)                    // วันถัดจากสิ้นสุด Phase 1
  const dow = d.getDay()                        // 0=อาทิตย์, 6=เสาร์
  if (dow === 6) d.setDate(d.getDate() + 2)     // เสาร์ → จันทร์
  else if (dow === 0) d.setDate(d.getDate() + 1) // อาทิตย์ → จันทร์
  return d.toISOString().split("T")[0]
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

/** คำนวณภาษีจาก "รายได้สุทธิ" ที่หักค่าลดหย่อนแล้ว — ปัดเศษเป็นบาท */
export function calcAnnualTaxFromNetIncome(netIncome: number): number {
  if (netIncome <= 0) return 0
  let tax = 0
  for (const b of BRACKETS) {
    if (netIncome <= b.from) break
    tax += (Math.min(netIncome, b.to) - b.from) * b.rate
  }
  return Math.round(tax)
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
  // ปัดภาษีรายเดือนเป็นบาท
  return Math.round(annualTax / 12)
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
  "business development", "พัฒนาธุรกิจ", "bd",
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
  /** ไม่หักประกันสังคม */
  isSsoExempt?: boolean
  /** หักภาษี ณ ที่จ่าย 3% แทนขั้นบันได */
  isTax3pct?: boolean
  /** กองทุนสำรองเลี้ยงชีพ % (0/undefined = ไม่หัก) */
  providentFundPct?: number | null
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
    isSsoExempt  = false,
    isTax3pct    = false,
    providentFundPct,
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
  const sso = isSsoExempt ? 0 : calcSSO(baseSalary)

  // ── กองทุนสำรองเลี้ยงชีพ (PF) ────────────────────────────────
  const pf = calcPF(baseSalary, providentFundPct)

  // ── ภาษีหัก ณ ที่จ่าย ─────────────────────────────────────────
  let tax: number
  let taxMethod: "auto" | "fixed_pct"

  if (isTax3pct) {
    // หัก 3% ของรายได้รวม (gross) ในรอบนั้น — ปัดเป็นบาท
    tax = Math.round(gross * 0.03)
    taxMethod = "fixed_pct"
  } else if (taxWithholdingPct != null && taxWithholdingPct >= 0) {
    // ใช้ % ที่ตั้งไว้ — ปัดเป็นบาท
    tax = Math.round(gross * (taxWithholdingPct / 100))
    taxMethod = "fixed_pct"
  } else {
    // คำนวณอัตโนมัติตามกฎหมายไทย (ขั้นบันได) — calcMonthlyTax ปัดให้แล้ว
    tax = calcMonthlyTax(gross, sso)
    taxMethod = "auto"
  }

  // ── รายการหัก ───────────────────────────────────────────────
  const deductAbsent   = calcAbsentDeduction(baseSalary, absentDays)
  const deductLate     = calcLateDeduction(baseSalary, lateMinutes)
  const deductEarlyOut = calcLateDeduction(baseSalary, earlyOutMinutes)
  const totalDeduct    = sso + pf + tax + deductAbsent + deductLate + deductEarlyOut + loanDeduction

  return {
    // gross เป็น sum ของ args ที่ outer caller จะ pass มา → ปัดเป็นบาท
    gross: Math.round(gross),
    otAmount,
    sso,
    pf,
    tax,
    taxMethod,
    deductAbsent,
    deductLate,
    deductEarlyOut,
    totalDeduct: Math.round(totalDeduct),
    net: Math.max(Math.round(gross - totalDeduct), 0),
  }
}

/**
 * เดือนแรกแบบ 2 เฟส: Phase 1 (Pre-Employee) + Phase 2 (Employee)
 *   - รับ args ของ calculatePayrollSummary สำหรับ "Phase 2" (baseSalary = ฐาน prorate ตาม phase2_start,
 *     allowances = เบี้ยเลี้ยงปกติ **ไม่รวม** ค่าจ้าง Phase 1) + providentFundPct
 *   - Phase 1: phase1Wage (= อัตรา/วัน × วันทำงานจริง) จ่ายเป็น "ค่าอื่นๆ", หักภาษี 3% เท่านั้น (ไม่มี SSO/PF)
 * รวมผล: gross/tax เพิ่มก้อน Phase 1, ส่วน SSO/PF มาจาก Phase 2 เท่านั้น
 */
export function calcTwoPhaseMonth(
  args: Parameters<typeof calculatePayrollSummary>[0] & { phase1Wage: number; phase1WorkDays?: number },
) {
  const { phase1Wage, phase1WorkDays = 0, ...phase2Args } = args
  const p2 = calculatePayrollSummary(phase2Args)      // Phase 2 = คำนวณปกติ (SSO + PF + ภาษีขั้นบันได)
  const phase1WageR = Math.max(0, Math.round(phase1Wage))
  const phase1Tax   = Math.round(phase1WageR * 0.03)  // ภาษี ณ ที่จ่าย 3% ของค่าจ้าง Phase 1 (แยกจากขั้นบันได)

  const gross       = p2.gross + phase1WageR          // phase1 อยู่ใน other_income → รวมใน gross
  const tax         = p2.tax + phase1Tax
  const totalDeduct = p2.totalDeduct + phase1Tax
  const net         = Math.max(Math.round(gross - totalDeduct), 0)

  return {
    ...p2,
    gross, tax, totalDeduct, net,
    // ก้อน Phase 1 (เพื่อบันทึก/แสดงแยก)
    phase1Wage: phase1WageR, phase1Tax, phase1WorkDays,
    // ก้อน Phase 2 (ค่าเดิมก่อนรวม Phase 1)
    phase2Gross: p2.gross, phase2Tax: p2.tax,
  }
}