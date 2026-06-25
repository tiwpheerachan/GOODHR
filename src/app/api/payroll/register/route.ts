import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logPayroll } from "@/lib/auditLog"

/**
 * GET /api/payroll/register?period_id=xxx
 * GET /api/payroll/register?period_ids=id1,id2,id3  (หลาย periods — สำหรับ "ทุกบริษัท")
 * GET /api/payroll/register?mode=periods&company_id=xxx  (ดึง periods)
 * GET /api/payroll/register?mode=periods  (ดึง periods ทุกบริษัท)
 * ใช้ service client → ไม่ติด RLS
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("mode")

  // ── Mode: periods — ดึง payroll_periods ──
  if (mode === "periods") {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()
    const companyId = searchParams.get("company_id")

    let query = supa.from("payroll_periods")
      .select("id, year, month, period_name, start_date, end_date, pay_date, status, company_id")
      .order("year", { ascending: false }).order("month", { ascending: false })
    if (companyId) query = query.eq("company_id", companyId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ periods: data ?? [] })
  }

  const periodId = searchParams.get("period_id")
  const periodIdsParam = searchParams.get("period_ids")

  const periodIds: string[] = periodIdsParam
    ? periodIdsParam.split(",").filter(Boolean)
    : periodId ? [periodId] : []

  if (periodIds.length === 0) {
    return NextResponse.json({ error: "period_id หรือ period_ids จำเป็น" }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const empSelect = `
    *,
    employee:employees(
      id, employee_code, first_name_th, last_name_th, nickname,
      avatar_url, brand, updated_at, hire_date, resign_date, employment_status,
      position:positions(id, name),
      department:departments(id, name),
      company:companies(id, code, name_th)
    )`

  // ดึงทีละ period เพื่อไม่ให้เกิน Supabase row limit
  let allData: any[] = []
  for (const pid of periodIds) {
    let from = 0
    while (true) {
      const { data, error } = await supa
        .from("payroll_records")
        .select(empSelect)
        .eq("payroll_period_id", pid)
        .order("created_at")
        .range(from, from + 999)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
  }

  // Deduplicate by employee_code
  const byCode = new Map<string, any>()
  for (const r of allData) {
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

  const records = Array.from(byCode.values())

  // ── แนบ structural flags (is_sso_exempt / is_tax_3pct) จาก salary structure ล่าสุดที่ "เปิดอยู่" ──
  //    ใช้ใน recomputePayroll ฝั่ง client เพื่อให้คน prorate + exempt ไม่ถูกคำนวณ SSO/ภาษีผิด
  //    (ตารางเดิม recompute SSO ใหม่ตอน prorate → ไม่รู้ว่า exempt → เด้งหัก SSO)
  const empIds = Array.from(new Set(records.map(r => r.employee_id).filter(Boolean)))
  if (empIds.length > 0) {
    const flagByEmp = new Map<string, { is_sso_exempt: boolean; is_tax_3pct: boolean }>()
    for (let i = 0; i < empIds.length; i += 300) {
      const chunk = empIds.slice(i, i + 300)
      let from = 0
      while (true) {
        const { data } = await supa
          .from("salary_structures")
          .select("employee_id, is_sso_exempt, is_tax_3pct")
          .in("employee_id", chunk)
          .is("effective_to", null)
          .order("effective_from", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, from + 999)
        if (!data || data.length === 0) break
        for (const s of data) {
          // ตัวแรกต่อ employee = ตัวล่าสุด (เพราะ order desc)
          if (!flagByEmp.has(s.employee_id)) {
            flagByEmp.set(s.employee_id, { is_sso_exempt: !!s.is_sso_exempt, is_tax_3pct: !!s.is_tax_3pct })
          }
        }
        if (data.length < 1000) break
        from += 1000
      }
    }
    for (const r of records) {
      const f = flagByEmp.get(r.employee_id)
      r.is_sso_exempt = f?.is_sso_exempt ?? false
      r.is_tax_3pct = f?.is_tax_3pct ?? false
    }
  }

  return NextResponse.json({ records })
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
    "allowance_phone", "allowance_housing", "allowance_vehicle", "allowance_other", "ot_amount",
    "ot_weekday_minutes", "ot_holiday_reg_minutes", "ot_holiday_ot_minutes", "ot_hours",
    "bonus", "kpi_grade", "kpi_standard_amount", "commission", "other_income",
    "deduct_absent", "deduct_late", "deduct_early_out", "deduct_loan", "deduct_other",
    "social_security_amount", "monthly_tax_withheld",
    "absent_days", "late_count", "present_days", "leave_paid_days", "leave_unpaid_days",
    "gross_income", "total_deductions", "net_salary",
    "income_extras", "deduction_extras", "note_override", "is_manual_override",
    "prorate_days",  // ✅ จำนวนวันทำงานจริง (สำหรับ prorate)
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
