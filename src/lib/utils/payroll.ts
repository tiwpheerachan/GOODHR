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
 * ✅ แก้จาก /30/24/60 → /30/8/60 ตามสูตร Excel
 */
export function calcLateDeduction(base: number, lateMinutes: number): number {
  return Math.round(calcRatePerMinute(base) * lateMinutes)
}

/** หักขาดงาน = เงินเดือน / 30 * จำนวนวัน */
export function calcAbsentDeduction(base: number, days: number): number {
  return Math.round((base / 30) * days * 100) / 100
}

/**
 * คำนวณ OT — มี 3 อัตราตามประเภท:
 *  - "weekday"  → 1.5x  (วันทำงานปกติ ก่อนเข้า/หลังเลิก)
 *  - "holiday_regular" → 1.0x  (วันหยุด เวลางานปกติ)
 *  - "holiday_ot"      → 3.0x  (วันหยุด ก่อนเข้า/หลังเลิก)
 */
export type OtType = "weekday" | "holiday_regular" | "holiday_ot"
export const OT_RATES: Record<OtType, number> = {
  weekday:         1.5,
  holiday_regular: 1.0,
  holiday_ot:      3.0,
}

export function calcOT(
  base: number,
  minutes: number,
  type: OtType = "weekday"
): number {
  const rate = OT_RATES[type]
  return Math.round((base / 30 / 8) * (minutes / 60) * rate * 100) / 100
}

/** SSO: 5% ของฐาน แต่ฐานสูงสุด 15,000 ต่ำสุด 1,650 */
export function calcSSO(base: number, rate = 0.05): number {
  const capped = Math.min(Math.max(base, 1650), 15000)
  return Math.round(capped * rate * 100) / 100
}

/** ภาษีเงินได้บุคคลธรรมดา (progressive brackets) */
const BRACKETS = [
  { from: 0,       to: 150000,   rate: 0    },
  { from: 150001,  to: 300000,   rate: 0.05 },
  { from: 300001,  to: 500000,   rate: 0.10 },
  { from: 500001,  to: 750000,   rate: 0.15 },
  { from: 750001,  to: 1000000,  rate: 0.20 },
  { from: 1000001, to: 2000000,  rate: 0.25 },
  { from: 2000001, to: 5000000,  rate: 0.30 },
  { from: 5000001, to: Infinity, rate: 0.35 },
]

export function calcAnnualTax(income: number): number {
  let tax = 0
  for (const b of BRACKETS) {
    if (income <= b.from) break
    tax += (Math.min(income, b.to) - b.from) * b.rate
  }
  return Math.round(tax * 100) / 100
}

export function calcMonthlyTax(
  annualIncome: number,
  ytd: number,
  remaining: number
): number {
  const annual = calcAnnualTax(annualIncome)
  return Math.round(Math.max(annual - ytd, 0) / Math.max(remaining, 1) * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// Late threshold ตามแผนก (นาที) — กฎ PTC Excel
// ─────────────────────────────────────────────────────────────
const LATE_THRESHOLD_BY_DEPT: Record<string, number> = {
  // แผนกคลังสินค้า & Service: อนุโลม 5 นาที → หักที่ 6+
  "คลังสินค้า": 5,
  "warehouse":  5,
  "service":    5,

  // Marketing, Tiktok, HR, Accounting, Sale Offline, Brand shop,
  // Dealer, Support, KAM: อนุโลม 10 นาที → หักที่ 11+
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

  // แอดมินออนไลน์ & PTC ทั่วไป: ไม่มีขอนุโลม → หักตั้งแต่ 1 นาที
  "admin online":   0,
  "แอดมินออนไลน์": 0,
}

/** คืนค่า late threshold ตามชื่อแผนก (default 0 = หักทันที 1 นาที) */
export function getLateThreshold(departmentName?: string | null): number {
  if (!departmentName) return 0
  const key = departmentName.toLowerCase().trim()
  for (const [k, v] of Object.entries(LATE_THRESHOLD_BY_DEPT)) {
    if (key.includes(k)) return v
  }
  return 0 // default: PTC style หักตั้งแต่ 1 นาที
}

// ─────────────────────────────────────────────────────────────
// Annual Leave by Position Level (Excel: ลาพักร้อน)
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
  if (!positionName) return 6 // default
  const p = positionName.toLowerCase()
  for (const level of ANNUAL_LEAVE_BY_LEVEL) {
    if (level.keywords.some(k => p.includes(k))) return level.days
  }
  return 6
}

/**
 * คำนวณวันลาพักร้อนตามสัดส่วน (หลังผ่านทดลองงาน ถึง 31 ธ.ค. ปีเดียวกัน)
 * Excel: คำนวนหลังผ่านทดลองงาน 119 วัน จนถึง 31 ธ.ค.
 */
export function calcProRataLeaveDays(
  fullDays: number,
  probationEnd: Date,
  yearEnd: Date = new Date(new Date().getFullYear(), 11, 31)
): number {
  const totalDaysInYear = 365
  const daysRemaining = Math.max(
    Math.floor((yearEnd.getTime() - probationEnd.getTime()) / 86400000),
    0
  )
  return Math.round((fullDays * daysRemaining) / totalDaysInYear * 10) / 10
}

// ─────────────────────────────────────────────────────────────
// Main payroll summary
// ─────────────────────────────────────────────────────────────
export interface OTBreakdown {
  weekday_minutes:         number
  holiday_regular_minutes: number
  holiday_ot_minutes:      number
}

export function calculatePayrollSummary(args: {
  baseSalary:        number
  allowances?:       number
  otBreakdown?:      OTBreakdown   // แยก 3 ประเภท
  otMinutes?:        number        // fallback รวม (rate 1.5)
  bonus?:            number
  absentDays?:       number
  lateMinutes?:      number
  loanDeduction?:    number
  ytdTax?:           number
  remainingMonths?:  number
}) {
  const {
    baseSalary, allowances = 0, bonus = 0,
    absentDays = 0, lateMinutes = 0, loanDeduction = 0,
    ytdTax = 0, remainingMonths = 1,
    otBreakdown, otMinutes = 0,
  } = args

  // OT: แยก 3 rates หรือ fallback 1.5x
  let otAmount = 0
  if (otBreakdown) {
    otAmount += calcOT(baseSalary, otBreakdown.weekday_minutes,         "weekday")
    otAmount += calcOT(baseSalary, otBreakdown.holiday_regular_minutes, "holiday_regular")
    otAmount += calcOT(baseSalary, otBreakdown.holiday_ot_minutes,      "holiday_ot")
  } else {
    otAmount = calcOT(baseSalary, otMinutes, "weekday")
  }

  const gross         = baseSalary + allowances + otAmount + bonus
  const sso           = calcSSO(baseSalary)
  const tax           = calcMonthlyTax((gross - sso) * 12, ytdTax, remainingMonths)
  const deductAbsent  = calcAbsentDeduction(baseSalary, absentDays)
  const deductLate    = calcLateDeduction(baseSalary, lateMinutes)   // ✅ ใช้ /8 แล้ว
  const totalDeduct   = deductAbsent + deductLate + loanDeduction + sso + tax

  return {
    gross, otAmount, sso, tax,
    deductAbsent, deductLate, totalDeduct,
    net: Math.max(gross - totalDeduct, 0),
  }
}