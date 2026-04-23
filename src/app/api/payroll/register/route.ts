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
        brand, updated_at,
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

  // Deduplicate by employee_code: ถ้ามีพนักงาน code เดียวกันหลาย record
  // เก็บเฉพาะ record ที่ employee.updated_at ใหม่สุด (ข้อมูลจาก import ใหม่)
  const byCode = new Map<string, any>()
  for (const r of (data ?? [])) {
    const code = r.employee?.employee_code
    if (!code) { byCode.set(r.id, r); continue }
    const existing = byCode.get(code)
    if (!existing) {
      byCode.set(code, r)
    } else {
      const existDate = existing.employee?.updated_at || existing.updated_at || ''
      const newDate = r.employee?.updated_at || r.updated_at || ''
      if (newDate > existDate) byCode.set(code, r)
    }
  }

  return NextResponse.json({ records: Array.from(byCode.values()) })
}

/**
 * PATCH /api/payroll/register
 * อัปเดต extras (income_extras, deduction_extras) + manual fields
 */
export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // อนุญาตให้ update ทุก field ที่ส่งมา (ยกเว้น id, employee_id, payroll_period_id)
  const SAFE_FIELDS = [
    "base_salary", "allowance_position", "allowance_transport", "allowance_food",
    "allowance_phone", "allowance_housing", "allowance_other", "ot_amount",
    "ot_weekday_minutes", "ot_holiday_reg_minutes", "ot_holiday_ot_minutes", "ot_hours",
    "bonus", "commission", "other_income",
    "deduct_absent", "deduct_late", "deduct_early_out", "deduct_loan", "deduct_other",
    "social_security_amount", "monthly_tax_withheld",
    "absent_days", "late_count", "present_days", "leave_paid_days", "leave_unpaid_days",
    "gross_income", "total_deductions", "net_salary",
    "income_extras", "deduction_extras", "note_override", "is_manual_override",
  ]

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of SAFE_FIELDS) {
    if (fields[key] !== undefined) update[key] = fields[key]
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
