import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { recomputePayroll, computeAutoProrateDays, applyAutoProrate } from "@/lib/utils/payroll"
import { getPayrollScope, scopeAllows } from "@/lib/utils/payroll-access"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const recordId = req.nextUrl.searchParams.get("record_id")
  const employeeId = req.nextUrl.searchParams.get("employee_id")
  const periodId = req.nextUrl.searchParams.get("period_id")

  if (!recordId && !(employeeId && periodId)) {
    return NextResponse.json({ error: "record_id or (employee_id + period_id) required" }, { status: 400 })
  }

  // Get payroll record
  let query = supa.from("payroll_records")
    .select(`*, employee:employees!payroll_records_employee_id_fkey(
      id, employee_code, first_name_th, last_name_th, nickname, hire_date,
      department:departments(name), position:positions(name),
      company:companies(id, code, name_th)),
      period:payroll_periods(year, month, start_date, end_date)`)

  if (recordId) query = query.eq("id", recordId)
  else query = query.eq("employee_id", employeeId!).eq("payroll_period_id", periodId!)

  const { data: record, error } = await query.single()
  if (error || !record) return NextResponse.json({ error: "Record not found" }, { status: 404 })

  // Permission check: ดาวน์โหลดได้ถ้าเป็นของตัวเอง หรือมีสิทธิ์เงินเดือน (เหนือกว่า super_admin)
  const { data: userData } = await supa.from("users").select("employee_id").eq("id", user.id).single()
  const isOwn = userData?.employee_id && userData.employee_id === record.employee_id
  if (!isOwn) {
    const scope = await getPayrollScope(supa, user.id)
    const empCompanyId = (record.employee as any)?.company?.id ?? null
    if (!scopeAllows(scope, empCompanyId)) {
      return NextResponse.json({ error: "No permission" }, { status: 403 })
    }
  }

  // Generate PDF as JSON data (client will render)
  const emp = record.employee as any
  const period = record.period as any
  const ie = record.income_extras || {}
  const de = record.deduction_extras || {}

  const thMonths = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
  const monthName = thMonths[period?.month || record.month] || ""
  const yearBE = (period?.year || record.year) + 543

  // Build earnings/deductions arrays
  const earnings: { label: string; amount: number; number?: string }[] = []
  const n = (v: any) => Number(v) || 0

  // ── Apply auto-prorate ก่อน (ถ้า HR ยังไม่ save → ใช้ค่าที่คำนวณจาก hire_date × งวด)
  //    ตัวเลขในสลิปจะตรงกับ EditModal / ตาราง /admin/payroll
  const autoDays = computeAutoProrateDays(emp?.hire_date, period?.start_date, period?.end_date)
  const recordWithAuto = applyAutoProrate({ ...record, _autoProrateDays: autoDays })

  // ── Apply prorate factor (สำหรับเข้า/ออกกลางงวด) ──
  const prorateDays = n(recordWithAuto.prorate_days)
  const factor = (prorateDays > 0 && prorateDays < 30) ? prorateDays / 30 : 1
  const fullBase = n(recordWithAuto.base_salary)
  // ปัดเศษเป็นบาท (<0.5 ลง, ≥0.5 ขึ้น)
  const effectiveBase = Math.round(fullBase * factor)
  const effectiveBonus = Math.round(n(record.bonus) * factor)

  const rate = fullBase / 30 / 8       // OT rate ใช้ฐานเต็ม (อัตราตามสัญญา)
  const fmtMin = (m: number) => `${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`

  if (effectiveBase) {
    const label = factor < 1 ? `อัตรา\nเงินเดือน (${prorateDays}/30)` : "อัตรา\nเงินเดือน"
    earnings.push({ label, amount: effectiveBase })
  }
  if (effectiveBonus) {
    const gradeLabel = record.kpi_grade && record.kpi_grade !== "pending" ? ` (เกรด ${record.kpi_grade})` : ""
    earnings.push({ label: `โบนัส KPI${gradeLabel}`, amount: effectiveBonus })
  }
  if (n(record.ot_weekday_minutes)) {
    earnings.push({ label: "OT วันทำงาน (×1.5)", amount: Math.round(rate * n(record.ot_weekday_minutes) / 60 * 1.5), number: fmtMin(n(record.ot_weekday_minutes)) })
  }
  if (n(record.ot_holiday_reg_minutes)) {
    earnings.push({ label: "OT วันหยุด (×1.0)", amount: Math.round(rate * n(record.ot_holiday_reg_minutes) / 60), number: fmtMin(n(record.ot_holiday_reg_minutes)) })
  }
  if (n(record.ot_holiday_ot_minutes)) {
    earnings.push({ label: "OT วันหยุด (×3.0)", amount: Math.round(rate * n(record.ot_holiday_ot_minutes) / 60 * 3.0), number: fmtMin(n(record.ot_holiday_ot_minutes)) })
  }
  if (n(record.allowance_position)) earnings.push({ label: "ค่าตำแหน่ง", amount: n(record.allowance_position) })
  if (n(record.allowance_food)) earnings.push({ label: "ค่าอาหาร", amount: n(record.allowance_food) })
  if (n(record.allowance_phone)) earnings.push({ label: "ค่าโทรศัพท์", amount: n(record.allowance_phone) })
  if (n(record.allowance_housing)) earnings.push({ label: "ค่าที่พัก", amount: n(record.allowance_housing) })
  if (n(record.allowance_vehicle)) earnings.push({ label: "ค่าเสื่อมรถยนต์", amount: n(record.allowance_vehicle) })
  if (n(record.allowance_other)) earnings.push({ label: "เบี้ยอื่นๆ", amount: n(record.allowance_other) })
  if (n(record.commission)) earnings.push({ label: "Commission", amount: n(record.commission) })
  if (n(ie.kpi)) earnings.push({ label: "KPI", amount: n(ie.kpi) })
  if (n(ie.incentive)) earnings.push({ label: "Incentive", amount: n(ie.incentive) })
  if (n(ie.performance_bonus)) earnings.push({ label: "Performance Bonus", amount: n(ie.performance_bonus) })
  if (n(ie.service_fee)) earnings.push({ label: "ค่าบริการ", amount: n(ie.service_fee) })
  if (n(record.allowance_transport)) earnings.push({ label: "ค่าเดินทาง", amount: n(record.allowance_transport) })
  if (n(ie.depreciation)) earnings.push({ label: "ค่าเสื่อมสภาพ", amount: n(ie.depreciation) })
  if (n(ie.expressway)) earnings.push({ label: "ค่าทางด่วน", amount: n(ie.expressway) })
  if (n(ie.fuel)) earnings.push({ label: "ค่าน้ำมัน", amount: n(ie.fuel) })
  if (n(ie.campaign)) earnings.push({ label: "แคมเปญ", amount: n(ie.campaign) })
  if (n(ie.per_diem)) earnings.push({ label: "เบี้ยเลี้ยง", amount: n(ie.per_diem) })
  if (n(ie.diligence_bonus)) earnings.push({ label: "เบี้ยขยัน", amount: n(ie.diligence_bonus) })
  if (n(ie.referral_bonus)) earnings.push({ label: "เพื่อนแนะนำเพื่อน", amount: n(ie.referral_bonus) })
  if (n(record.other_income)) earnings.push({ label: "รายได้อื่นๆ", amount: n(record.other_income) })
  if (n(record.phase1_wage)) earnings.push({ label: `ค่าจ้างทดลองงาน (Pre-Employee${n(record.phase1_work_days) ? ` ${n(record.phase1_work_days)} วัน` : ""})`, amount: n(record.phase1_wage) })

  const deductions: { label: string; amount: number }[] = []
  if (n(record.deduct_absent)) deductions.push({ label: "หักขาดงาน", amount: n(record.deduct_absent) })
  if (n(record.deduct_late)) deductions.push({ label: "หักมาสาย", amount: n(record.deduct_late) })
  if (n(de.card_lost)) deductions.push({ label: "บัตรจอดรถ ICS", amount: n(de.card_lost) })
  if (n(de.uniform)) deductions.push({ label: "ค่าซื้อเสื้อพนักงาน", amount: n(de.uniform) })
  if (n(de.parking)) deductions.push({ label: "ค่าบัตรจอดรถ", amount: n(de.parking) })
  if (n(de.employee_products)) deductions.push({ label: "สินค้าพนักงาน", amount: n(de.employee_products) })
  if (n(de.legal_enforcement)) deductions.push({ label: "กรมบังคับคดี", amount: n(de.legal_enforcement) })
  if (n(de.student_loan)) deductions.push({ label: "กยศ.", amount: n(de.student_loan) })
  if (n(de.suspension)) deductions.push({ label: "พักงาน", amount: n(de.suspension) })
  if (n(record.deduct_loan)) deductions.push({ label: "หักเงินกู้", amount: n(record.deduct_loan) })
  // ── ใช้ helper recompute ── ครอบคลุม prorate + tax + SSO ──
  //    ใช้ recordWithAuto ที่ apply auto-prorate แล้ว → ตรงกับ EditModal
  const rp = recomputePayroll(recordWithAuto)
  const displayGross = rp.gross
  const displaySSO = rp.sso
  const displayTax = rp.tax
  const displayTotalDeduct = rp.totalDed
  const displayNet = rp.net

  // ── Tax base = ฐานคำนวณภาษี ──
  //   = รายรับทั้งหมด (effBase + KPI bonus + OT + allowances + extras + other_income)
  //   − หักก่อนภาษี (late + early_out + absent + suspension + deduct_other)
  const taxBaseAmount = (() => {
    const r2 = recordWithAuto
    const ie2 = r2.income_extras || {}
    const de2 = r2.deduction_extras || {}
    const otFromMin = (n(r2.ot_weekday_minutes) * 1.5
                     + n(r2.ot_holiday_reg_minutes) * 1.0
                     + n(r2.ot_holiday_ot_minutes) * 3.0) * rate / 60
    const otTotal = otFromMin > 0 ? otFromMin : n(r2.ot_amount)
    const income = rp.effBase + rp.effBonus + otTotal
      + n(r2.allowance_position) + n(ie2.kpi) + n(r2.commission)
      + n(ie2.incentive) + n(ie2.performance_bonus) + n(ie2.service_fee)
      + n(r2.allowance_transport) + n(r2.allowance_food) + n(r2.allowance_phone)
      + n(r2.allowance_housing) + n(r2.allowance_vehicle) + n(r2.allowance_other)
      + n(ie2.depreciation) + n(ie2.expressway) + n(ie2.fuel)
      + n(ie2.campaign) + n(ie2.retirement_fund) + n(ie2.per_diem)
      + n(ie2.diligence_bonus) + n(ie2.referral_bonus)
      + n(r2.other_income)
    const deds = n(r2.deduct_late) + n(r2.deduct_early_out) + n(r2.deduct_absent)
      + n(de2.suspension) + n(r2.deduct_other)
    return Math.round((income - deds) * 100) / 100
  })()

  if (displaySSO) deductions.push({ label: "ประกันสังคม", amount: displaySSO })
  if (rp.pf) deductions.push({ label: "กองทุนสำรองเลี้ยงชีพ", amount: rp.pf })
  if (displayTax) deductions.push({ label: "ภาษี", amount: displayTax })
  if (n(record.deduct_other)) deductions.push({ label: "หักลาไม่รับค่าจ้าง/อื่นๆ", amount: n(record.deduct_other) })

  const payslipData = {
    company: {
      name: emp?.company?.name_th || "SHD : บริษัท เอสเอชดี เทคโนโลยี จำกัด",
      code: emp?.company?.code || "SHD",
      address: "ที่อยู่ : อาคาร ICS ห้องเลขที่ 703-704 ชั้นที่ 7 เลขที่ 168 ถนนเจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร 10600",
      phone: "เบอร์โทร : 02-1151262 แฟกซ์ : -",
      logo: "/logo-shd.png",
    },
    employee: {
      code: emp?.employee_code || "",
      name: `${emp?.first_name_th || ""} ${emp?.last_name_th || ""}`.trim(),
      department: emp?.department?.name || "",
      position: emp?.position?.name || "",
    },
    period: `ประจำเดือน : ${monthName} ${yearBE}`,
    payDate: `${new Date(record.year, record.month, 0).getDate()}/${String(record.month).padStart(2,"0")}/${yearBE}`,
    earnings,
    deductions,
    totalEarnings: displayGross,
    totalDeductions: displayTotalDeduct,
    netPay: displayNet,
    taxBase: taxBaseAmount,      // ฐานคำนวณภาษี (สำหรับ HTML/PDF preview)
    ytd: {
      income: displayGross,
      tax: displayTax,
      providentFund: rp.pf,
      socialSecurity: displaySSO,
      otherDeductions: displayTotalDeduct - displaySSO - displayTax - rp.pf,
    },
  }

  return NextResponse.json(payslipData)
}
