import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

/**
 * POST /api/employees/promote
 * ยืนยันผ่านทดลองงาน — apply salary/position/KPI จาก probation_promotions
 *
 * Body:
 *   employee_id: string
 *   promotion_id?: string  (ถ้าไม่ส่งจะหาล่าสุดอัตโนมัติ)
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()
    const { employee_id, promotion_id } = await req.json()

    if (!employee_id) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })

    // ดึงข้อมูลพนักงาน
    const { data: emp } = await supa
      .from("employees")
      .select("id, first_name_th, last_name_th, employee_code, employment_status, company_id")
      .eq("id", employee_id)
      .single()

    if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })

    // ดึง promotion settings
    let promoQuery = supa
      .from("employee_probation_promotions")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("is_applied", false)

    if (promotion_id) promoQuery = promoQuery.eq("id", promotion_id)
    else promoQuery = promoQuery.order("created_at", { ascending: false }).limit(1)

    const { data: promo } = await promoQuery.maybeSingle()

    const today = new Date().toISOString().slice(0, 10)

    // 1. เปลี่ยนสถานะพนักงาน → active
    const empUpdate: any = { employment_status: "active" }
    if (promo?.new_position_id) empUpdate.position_id = promo.new_position_id

    await supa.from("employees").update(empUpdate).eq("id", employee_id)

    // 2. ถ้ามี salary changes → สร้าง salary_structure ใหม่
    if (promo && promo.base_salary) {
      // ปิด salary เก่า
      await supa.from("salary_structures")
        .update({ effective_to: today })
        .eq("employee_id", employee_id)
        .is("effective_to", null)

      await supa.from("salary_structures").insert({
        employee_id,
        base_salary: promo.base_salary,
        allowance_position:  promo.allowance_position  ?? 0,
        allowance_transport: promo.allowance_transport ?? 0,
        allowance_food:      promo.allowance_food      ?? 0,
        allowance_phone:     promo.allowance_phone     ?? 0,
        allowance_housing:   promo.allowance_housing   ?? 0,
        ot_rate_normal:      promo.ot_rate_normal      ?? 1.5,
        ot_rate_holiday:     promo.ot_rate_holiday     ?? 3.0,
        tax_withholding_pct: promo.tax_withholding_pct ?? null,
        effective_from: today,
        change_reason: "ผ่านทดลองงาน",
        created_by: user.id,
      })
    }

    // 3. ถ้ามี KPI changes → อัปเดต kpi_bonus_settings
    if (promo && promo.kpi_standard_amount != null) {
      const { data: existingKpi } = await supa
        .from("kpi_bonus_settings")
        .select("id")
        .eq("employee_id", employee_id)
        .eq("is_active", true)
        .maybeSingle()

      if (existingKpi) {
        await supa.from("kpi_bonus_settings")
          .update({ standard_amount: promo.kpi_standard_amount })
          .eq("id", existingKpi.id)
      } else {
        await supa.from("kpi_bonus_settings").insert({
          employee_id,
          company_id: emp.company_id,
          standard_amount: promo.kpi_standard_amount,
          is_active: true,
          effective_from: today,
        })
      }
    }

    // 4. mark promotion as applied
    if (promo) {
      await supa.from("employee_probation_promotions")
        .update({ is_applied: true, applied_at: new Date().toISOString(), applied_by: user.id })
        .eq("id", promo.id)
    }

    // Audit log
    logEmployeeChange(supa, {
      actorId: user.id, action: "update",
      employeeId: employee_id,
      employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
      companyId: emp.company_id,
      changes: { employment_status: { old: "probation", new: "active" } },
    })

    return NextResponse.json({
      success: true,
      message: `ยืนยันผ่านทดลองงานเรียบร้อย — ${emp.first_name_th} ${emp.last_name_th}`,
      salary_updated: !!(promo?.base_salary),
      position_updated: !!(promo?.new_position_id),
      kpi_updated: promo?.kpi_standard_amount != null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
