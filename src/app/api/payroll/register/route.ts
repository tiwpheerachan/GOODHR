import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logPayroll } from "@/lib/auditLog"

/**
 * GET /api/payroll/register?period_id=xxx
 * ดึง payroll_records ทั้งหมดของงวด พร้อม employee info, department, company
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodId = searchParams.get("period_id")

  if (!periodId) {
    return NextResponse.json({ error: "period_id จำเป็น" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data, error } = await supa
    .from("payroll_records")
    .select(`
      *,
      employee:employees(
        id, employee_code, first_name_th, last_name_th, nickname,
        brand,
        position:positions(id, name),
        department:departments(id, name),
        company:companies(id, code, name_th)
      )
    `)
    .eq("payroll_period_id", periodId)
    .order("employee(employee_code)", { ascending: true } as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ records: data ?? [] })
}

/**
 * PATCH /api/payroll/register
 * อัปเดต extras (income_extras, deduction_extras) + manual fields
 */
export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, income_extras, deduction_extras, bonus, commission, other_income, deduct_other, deduct_loan } = body

  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // Build update payload - only include provided fields
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (income_extras !== undefined)    update.income_extras = income_extras
  if (deduction_extras !== undefined) update.deduction_extras = deduction_extras
  if (bonus !== undefined)            update.bonus = bonus
  if (commission !== undefined)       update.commission = commission
  if (other_income !== undefined)     update.other_income = other_income
  if (deduct_other !== undefined)     update.deduct_other = deduct_other
  if (deduct_loan !== undefined)      update.deduct_loan = deduct_loan

  // Recalculate gross, total_deductions, net if extras changed
  if (income_extras !== undefined || deduction_extras !== undefined || bonus !== undefined || commission !== undefined) {
    // Fetch current record
    const { data: rec } = await supa.from("payroll_records").select("*").eq("id", id).single()
    if (!rec) return NextResponse.json({ error: "ไม่พบ record" }, { status: 404 })

    const ie = income_extras ?? rec.income_extras ?? {}
    const de = deduction_extras ?? rec.deduction_extras ?? {}

    const extraIncomeTotal = Object.values(ie as Record<string, number>).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
    const extraDeductTotal = Object.values(de as Record<string, number>).reduce((s: number, v: any) => s + (Number(v) || 0), 0)

    const newGross =
      Number(rec.base_salary) +
      Number(rec.allowance_position || 0) +
      Number(rec.allowance_transport || 0) +
      Number(rec.allowance_food || 0) +
      Number(rec.allowance_phone || 0) +
      Number(rec.allowance_housing || 0) +
      Number(rec.ot_amount || 0) +
      Number(bonus ?? rec.bonus ?? 0) +
      Number(commission ?? rec.commission ?? 0) +
      Number(other_income ?? rec.other_income ?? 0) +
      extraIncomeTotal

    const newTotalDeduct =
      Number(rec.social_security_amount || 0) +
      Number(rec.monthly_tax_withheld || 0) +
      Number(rec.deduct_absent || 0) +
      Number(rec.deduct_late || 0) +
      Number(rec.deduct_early_out || 0) +
      Number(deduct_loan ?? rec.deduct_loan ?? 0) +
      Number(deduct_other ?? rec.deduct_other ?? 0) +
      extraDeductTotal

    update.gross_income = newGross
    update.total_deductions = newTotalDeduct
    update.net_salary = Math.max(newGross - newTotalDeduct, 0)
  }

  const { error } = await supa
    .from("payroll_records")
    .update(update)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  const { data: actorData } = await supa.from("users").select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", user.id).single()
  const actorEmp = actorData?.employee as any
  logPayroll(supa, {
    actorId: actorData?.employee_id || user.id,
    actorName: actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : undefined,
    action: "edit",
  })

  return NextResponse.json({ success: true })
}
