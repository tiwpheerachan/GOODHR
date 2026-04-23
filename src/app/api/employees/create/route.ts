import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

export async function POST(req: Request) {
  try {
    // ใช้ cookie client สำหรับตรวจสิทธิ์ caller
    const cookieClient = createClient()
    const { data: { user: caller } } = await cookieClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // ใช้ service role client สำหรับ admin operations ทั้งหมด
    const supabase = createServiceClient()

    const body = await req.json()
    const {
      email, password,
      first_name_th, last_name_th, first_name_en, last_name_en,
      nickname, phone, address, national_id, gender, birth_date,
      bank_account, bank_name, tax_id, social_security_no,
      employee_code, hire_date, probation_end_date,
      employment_type, employment_status,
      company_id, branch_id, department_id, position_id,
      base_salary, allowance_position, allowance_transport,
      allowance_food, allowance_phone, allowance_housing,
      ot_rate_normal, ot_rate_holiday, tax_withholding_pct,
      kpi_standard_amount,
      // post-probation promotion
      post_base_salary, post_allowance_position, post_allowance_transport,
      post_allowance_food, post_allowance_phone, post_allowance_housing,
      post_ot_rate_normal, post_ot_rate_holiday, post_tax_withholding_pct,
      post_position_id, post_kpi_amount,
      supervisor_id,
      role,
      // schedule
      schedule_type, default_shift_id, fixed_dayoffs, can_self_schedule,
      // checkin settings
      checkin_anywhere, is_attendance_exempt,
      allowed_branch_ids,
    } = body

    // Validate: ป้องกันปี พ.ศ. (> 2100)
    for (const [val, label] of [[hire_date, "วันเริ่มงาน"], [probation_end_date, "สิ้นสุดทดลองงาน"], [birth_date, "วันเกิด"]]) {
      if (val && parseInt(String(val).split("-")[0]) > 2100) {
        return NextResponse.json({ error: `${label}: ปีต้องเป็น ค.ศ. (เช่น 2026) ไม่ใช่ พ.ศ.` }, { status: 400 })
      }
    }

    // 1. สร้าง auth user (ต้องใช้ service role)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-8) + "A1!",
      email_confirm: true,
      user_metadata: { full_name: `${first_name_th} ${last_name_th}` },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const authId = authData.user.id

    // 2. ตรวจสอบรหัสพนักงานซ้ำก่อน insert
    if (employee_code) {
      const { data: existingEmp } = await supabase
        .from("employees")
        .select("id, first_name_th, last_name_th")
        .eq("company_id", company_id)
        .eq("employee_code", employee_code)
        .maybeSingle()
      if (existingEmp) {
        await supabase.auth.admin.deleteUser(authId)
        return NextResponse.json({
          error: `รหัสพนักงาน "${employee_code}" ถูกใช้งานแล้วโดย ${existingEmp.first_name_th} ${existingEmp.last_name_th} — กรุณาใช้รหัสอื่น`,
        }, { status: 409 })
      }
    }

    // 3. สร้าง employee record
    const { data: emp, error: empErr } = await supabase.from("employees").insert({
      company_id, branch_id: branch_id || null,
      department_id: department_id || null,
      position_id: position_id || null,
      employee_code, first_name_th, last_name_th,
      first_name_en: first_name_en || null, last_name_en: last_name_en || null,
      nickname: nickname || null, phone: phone || null,
      email, address: address || null,
      national_id: national_id || null, gender: gender || null,
      birth_date: birth_date || null,
      bank_account: bank_account || null, bank_name: bank_name || null,
      tax_id: tax_id || null, social_security_no: social_security_no || null,
      hire_date, probation_end_date: probation_end_date || null,
      supervisor_id: supervisor_id || null,
      employment_type: employment_type || "full_time",
      employment_status: employment_status || "probation",
      is_active: true,
      checkin_anywhere: !!checkin_anywhere,
      is_attendance_exempt: !!is_attendance_exempt,
      can_self_schedule: !!can_self_schedule,
    }).select().single()
    if (empErr) {
      await supabase.auth.admin.deleteUser(authId)
      const isDuplicate = empErr.message?.includes("employees_company_id_employee_code_key")
      return NextResponse.json({
        error: isDuplicate
          ? `รหัสพนักงาน "${employee_code}" ซ้ำในระบบ — กรุณาใช้รหัสอื่น`
          : empErr.message,
      }, { status: isDuplicate ? 409 : 400 })
    }

    // 3. สร้าง users record
    const { error: userErr } = await supabase.from("users").insert({
      id: authId,
      employee_id: emp.id,
      company_id,
      role: role || "employee",
    })
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })

    // 3.5 สร้าง employee_manager_history ถ้ามีหัวหน้า
    if (supervisor_id) {
      // หา employee_id ของ caller สำหรับ created_by
      const { data: callerUser } = await supabase.from("users").select("employee_id").eq("id", caller.id).maybeSingle()
      await supabase.from("employee_manager_history").insert({
        employee_id: emp.id,
        manager_id: supervisor_id,
        effective_from: hire_date,
        created_by: callerUser?.employee_id ?? null,
      })
    }

    // 4. สร้าง salary structure ถ้ามี
    if (base_salary) {
      await supabase.from("salary_structures").insert({
        employee_id: emp.id,
        base_salary: +base_salary,
        allowance_position: +(allowance_position || 0),
        allowance_transport: +(allowance_transport || 0),
        allowance_food: +(allowance_food || 0),
        allowance_phone: +(allowance_phone || 0),
        allowance_housing: +(allowance_housing || 0),
        ot_rate_normal: ot_rate_normal ? +ot_rate_normal : 1.5,
        ot_rate_holiday: ot_rate_holiday ? +ot_rate_holiday : 3.0,
        tax_withholding_pct: tax_withholding_pct != null && tax_withholding_pct !== "" ? +tax_withholding_pct : null,
        effective_from: hire_date,
      })
    }

    // 5. สร้าง leave balances จาก leave_types ของ company
    const { data: leaveTypes } = await supabase.from("leave_types")
      .select("id, days_per_year").eq("company_id", company_id).eq("is_active", true)
    const year = new Date().getFullYear()
    if (leaveTypes && leaveTypes.length > 0) {
      await supabase.from("leave_balances").insert(
        leaveTypes.map((lt: any) => ({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year,
          entitled_days: lt.days_per_year || 0,
          used_days: 0, pending_days: 0, carried_over: 0,
          remaining_days: lt.days_per_year || 0,
        }))
      )
    }

    // 5.5 บันทึก post-probation promotion settings ถ้ามี
    const hasPromo = post_base_salary || post_position_id || post_kpi_amount != null
    if (hasPromo) {
      await supabase.from("employee_probation_promotions").insert({
        employee_id: emp.id,
        company_id,
        base_salary:           post_base_salary           ? +post_base_salary           : null,
        allowance_position:    post_allowance_position    != null && post_allowance_position    !== "" ? +post_allowance_position    : null,
        allowance_transport:   post_allowance_transport   != null && post_allowance_transport   !== "" ? +post_allowance_transport   : null,
        allowance_food:        post_allowance_food        != null && post_allowance_food        !== "" ? +post_allowance_food        : null,
        allowance_phone:       post_allowance_phone       != null && post_allowance_phone       !== "" ? +post_allowance_phone       : null,
        allowance_housing:     post_allowance_housing     != null && post_allowance_housing     !== "" ? +post_allowance_housing     : null,
        ot_rate_normal:        post_ot_rate_normal        ? +post_ot_rate_normal        : null,
        ot_rate_holiday:       post_ot_rate_holiday       ? +post_ot_rate_holiday       : null,
        tax_withholding_pct:   post_tax_withholding_pct  != null && post_tax_withholding_pct !== "" ? +post_tax_withholding_pct : null,
        new_position_id:       post_position_id           || null,
        kpi_standard_amount:   post_kpi_amount            != null && post_kpi_amount !== "" ? +post_kpi_amount : null,
        is_applied: false,
        created_by: caller.id,
      })
    }

    // 6. สร้าง KPI bonus settings ถ้ามี
    if (kpi_standard_amount && +kpi_standard_amount > 0) {
      await supabase.from("kpi_bonus_settings").insert({
        employee_id: emp.id,
        company_id,
        standard_amount: +kpi_standard_amount,
        effective_from: hire_date,
        is_active: true,
      })
    }

    // 7. สร้าง schedule profile + can_self_schedule
    if (schedule_type) {
      await supabase.from("employee_schedule_profiles").upsert({
        employee_id: emp.id,
        company_id,
        schedule_type: schedule_type || "fixed",
        default_shift_id: default_shift_id || null,
        fixed_dayoffs: Array.isArray(fixed_dayoffs) ? fixed_dayoffs : [],
      }, { onConflict: "employee_id" })
    }
    // 8. สร้าง employee_allowed_locations สำหรับเช็คอิน
    if (Array.isArray(allowed_branch_ids) && allowed_branch_ids.length > 0) {
      const callerUser2 = await supabase.from("users").select("employee_id").eq("id", caller.id).maybeSingle()
      await supabase.from("employee_allowed_locations").insert(
        allowed_branch_ids.map((bid: string) => ({
          employee_id: emp.id,
          branch_id: bid,
          created_by: callerUser2?.data?.employee_id ?? null,
        }))
      )
    }

    // Audit log
    const { data: actorUser } = await supabase.from("users").select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", caller.id).single()
    const ae = actorUser?.employee as any
    logEmployeeChange(supabase, {
      actorId: actorUser?.employee_id || caller.id,
      actorName: ae ? `${ae.first_name_th} ${ae.last_name_th}` : undefined,
      action: "create",
      employeeId: emp.id,
      employeeName: `${first_name_th} ${last_name_th}`,
      companyId: company_id,
    })

    return NextResponse.json({ employee_id: emp.id, auth_id: authId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}