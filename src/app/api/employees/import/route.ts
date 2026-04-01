import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

/**
 * POST /api/employees/import
 * Import พนักงานหลายคน — แต่ละ row มี company_id ของตัวเอง
 *
 * Body: { rows: ImportRow[] }   (company_id อยู่ใน row)
 *   หรือ { company_id, rows }   (backward compat กับ ImportModal)
 */
export async function POST(req: Request) {
  try {
    const cookieClient = createClient()
    const { data: { user: caller } } = await cookieClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()
    const body = await req.json()
    const { company_id: globalCid, rows } = body as { company_id?: string; rows: any[] }

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "ไม่มีข้อมูลที่จะนำเข้า" }, { status: 400 })

    // ─── โหลด leave_types + company data แบบ batch ต่อ company ──
    const uniqueCids = Array.from(new Set(
      rows.map((r: any) => r.company_id || globalCid).filter(Boolean) as string[]
    ))

    if (uniqueCids.length === 0)
      return NextResponse.json({ error: "ไม่มี company_id" }, { status: 400 })

    // โหลดข้อมูลทุก company พร้อมกัน
    const companyDataMap: Record<string, { leaveTypes: any[] }> = {}
    await Promise.all(uniqueCids.map(async cid => {
      const { data: lt } = await supa
        .from("leave_types")
        .select("id,days_per_year")
        .eq("company_id", cid)
        .eq("is_active", true)
      companyDataMap[cid] = { leaveTypes: lt ?? [] }
    }))

    const year = new Date().getFullYear()
    const results: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const company_id = row.company_id || globalCid

      if (!company_id) {
        results.push({ row: i+1, success: false, error: "ไม่ระบุบริษัท", name: `${row.first_name_th||"?"} ${row.last_name_th||""}` })
        continue
      }

      try {
        const pw = row.password || generatePassword()

        // สร้าง auth user
        const { data: authData, error: authErr } = await supa.auth.admin.createUser({
          email: row.email,
          password: pw,
          email_confirm: true,
          user_metadata: { full_name: `${row.first_name_th} ${row.last_name_th}` },
        })
        if (authErr) throw new Error(`auth: ${authErr.message}`)
        const authId = authData.user.id

        // สร้าง employee — department_id/position_id/branch_id เป็น UUID จาก dropdown แล้ว
        const { data: emp, error: empErr } = await supa.from("employees").insert({
          company_id,
          branch_id:     row.branch_id     || null,
          department_id: row.department_id || null,
          position_id:   row.position_id   || null,
          employee_code: row.employee_code,
          first_name_th: row.first_name_th,
          last_name_th:  row.last_name_th,
          first_name_en: row.first_name_en || null,
          last_name_en:  row.last_name_en  || null,
          nickname:           row.nickname           || null,
          phone:              row.phone              || null,
          email:              row.email,
          address:            row.address            || null,
          national_id:        row.national_id        || null,
          gender:             row.gender             || null,
          birth_date:         row.birth_date         || null,
          bank_account:       row.bank_account       || null,
          bank_name:          row.bank_name          || null,
          social_security_no: row.social_security_no || null,
          tax_id:             row.national_id        || null,
          hire_date:          row.hire_date,
          probation_end_date: row.probation_end_date || null,
          employment_type:    row.employment_type    || "full_time",
          employment_status:  row.employment_status  || "probation",
          is_active: true,
        }).select().single()

        if (empErr) {
          await supa.auth.admin.deleteUser(authId)
          throw new Error(empErr.message)
        }

        // users record
        await supa.from("users").insert({ id: authId, employee_id: emp.id, company_id, role: "employee" })

        // salary structure
        if (row.base_salary) {
          await supa.from("salary_structures").insert({
            employee_id:         emp.id,
            base_salary:         +row.base_salary,
            allowance_position:  +(row.allowance_position  || 0),
            allowance_transport: +(row.allowance_transport || 0),
            allowance_food:      +(row.allowance_food      || 0),
            allowance_phone:     +(row.allowance_phone     || 0),
            allowance_housing:   +(row.allowance_housing   || 0),
            ot_rate_normal:  1.5,
            ot_rate_holiday: 3.0,
            effective_from: row.hire_date,
          })
        }

        // leave balances
        const { leaveTypes } = companyDataMap[company_id] || { leaveTypes: [] }
        if (leaveTypes.length > 0) {
          await supa.from("leave_balances").insert(
            leaveTypes.map((lt: any) => ({
              employee_id:   emp.id,
              leave_type_id: lt.id,
              year,
              entitled_days:  lt.days_per_year || 0,
              used_days: 0, pending_days: 0, carried_over: 0,
              remaining_days: lt.days_per_year || 0,
            }))
          )
        }

        logEmployeeChange(supa, {
          actorId: caller.id, action: "create",
          employeeId: emp.id,
          employeeName: `${row.first_name_th} ${row.last_name_th}`,
          companyId: company_id,
        })

        results.push({
          row: i+1, success: true, employee_id: emp.id,
          name: `${row.first_name_th} ${row.last_name_th}`,
          generated_password: row.password ? null : pw,
        })
      } catch (e: any) {
        results.push({
          row: i+1, success: false,
          error: e.message,
          name: `${row.first_name_th||"?"} ${row.last_name_th||""}`,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    return NextResponse.json({ results, successCount, failCount: results.length - successCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function generatePassword(): string {
  const upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower   = "abcdefghjkmnpqrstuvwxyz"
  const digits  = "23456789"
  const special = "!@#$"
  const all = upper + lower + digits + special
  let pw = upper[Math.floor(Math.random()*upper.length)]
    + lower[Math.floor(Math.random()*lower.length)]
    + digits[Math.floor(Math.random()*digits.length)]
    + special[Math.floor(Math.random()*special.length)]
  for (let i=0; i<6; i++) pw += all[Math.floor(Math.random()*all.length)]
  return pw.split("").sort(()=>Math.random()-0.5).join("")
}
