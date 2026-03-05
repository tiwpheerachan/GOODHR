import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const supabase = createClient()
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
      role,
    } = body

    // 1. สร้าง auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-8) + "A1!",
      email_confirm: true,
      user_metadata: { full_name: `${first_name_th} ${last_name_th}` },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const authId = authData.user.id

    // 2. สร้าง employee record
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
      employment_type: employment_type || "full_time",
      employment_status: employment_status || "probation",
      is_active: true,
    }).select().single()
    if (empErr) {
      await supabase.auth.admin.deleteUser(authId)
      return NextResponse.json({ error: empErr.message }, { status: 400 })
    }

    // 3. สร้าง users record
    const { error: userErr } = await supabase.from("users").insert({
      id: authId,
      employee_id: emp.id,
      company_id,
      role: role || "employee",
    })
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })

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
        ot_rate_normal: 1.5,
        ot_rate_holiday: 3,
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

    return NextResponse.json({ employee_id: emp.id, auth_id: authId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}