export function calcLateDeduction(base: number, lateMinutes: number) {
  return Math.round((base / 30 / 24 / 60) * lateMinutes * 100) / 100
}
export function calcAbsentDeduction(base: number, days: number) {
  return Math.round((base / 30) * days * 100) / 100
}
export function calcSSO(base: number, rate = 0.05, min = 1650, max = 15000) {
  return Math.round(Math.min(Math.max(base, min), max) * rate * 100) / 100
}

const BRACKETS = [
  { from: 0, to: 150000, rate: 0 }, { from: 150001, to: 300000, rate: 0.05 },
  { from: 300001, to: 500000, rate: 0.10 }, { from: 500001, to: 750000, rate: 0.15 },
  { from: 750001, to: 1000000, rate: 0.20 }, { from: 1000001, to: 2000000, rate: 0.25 },
  { from: 2000001, to: 5000000, rate: 0.30 }, { from: 5000001, to: Infinity, rate: 0.35 },
]

export function calcAnnualTax(income: number) {
  let tax = 0
  for (const b of BRACKETS) {
    if (income <= b.from) break
    tax += (Math.min(income, b.to) - b.from) * b.rate
  }
  return Math.round(tax * 100) / 100
}

export function calcMonthlyTax(annualIncome: number, ytd: number, remaining: number) {
  const annual = calcAnnualTax(annualIncome)
  return Math.round(Math.max(annual - ytd, 0) / Math.max(remaining, 1) * 100) / 100
}

export function calcOT(base: number, minutes: number, rate = 1.5) {
  return Math.round((base / 30 / 8) * (minutes / 60) * rate * 100) / 100
}

export function calculatePayrollSummary(args: {
  baseSalary: number; allowances?: number; otMinutes?: number; otRate?: number
  bonus?: number; absentDays?: number; lateMinutes?: number; loanDeduction?: number
  ytdTax?: number; remainingMonths?: number
}) {
  const { baseSalary, allowances=0, otMinutes=0, otRate=1.5, bonus=0,
          absentDays=0, lateMinutes=0, loanDeduction=0, ytdTax=0, remainingMonths=1 } = args
  const otAmount = calcOT(baseSalary, otMinutes, otRate)
  const gross = baseSalary + allowances + otAmount + bonus
  const sso = calcSSO(baseSalary)
  const tax = calcMonthlyTax((gross - sso) * 12, ytdTax, remainingMonths)
  const deductAbsent = calcAbsentDeduction(baseSalary, absentDays)
  const deductLate = calcLateDeduction(baseSalary, lateMinutes)
  const totalDeduct = deductAbsent + deductLate + loanDeduction + sso + tax
  return { gross, otAmount, sso, tax, deductAbsent, deductLate, totalDeduct, net: Math.max(gross - totalDeduct, 0) }
}
