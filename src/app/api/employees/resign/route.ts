import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

/**
 * POST /api/employees/resign
 * แจ้งลาออก หรือ ดึงกลับ (reinstate) พนักงาน
 *
 * Body:
 *   action: "resign" | "reinstate"
 *   employee_id: string
 *   resign_date?: string          (สำหรับ resign)
 *   resign_reason?: string        (สำหรับ resign)
 *   previous_status?: string      (สำหรับ reinstate — กลับไปสถานะอะไร)
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()
    const body = await req.json()
    const { action, employee_id, resign_date, resign_reason, previous_status } = body

    if (!employee_id) {
      return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })
    }

    // ดึงข้อมูลพนักงาน
    const { data: emp, error: empErr } = await supa
      .from("employees")
      .select("id, employee_code, first_name_th, last_name_th, employment_status, is_active, company_id")
      .eq("id", employee_id)
      .single()

    if (empErr || !emp) {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
    }

    // ════════════════════════════════════════════════════════
    // RESIGN — แจ้งลาออก
    // ════════════════════════════════════════════════════════
    if (action === "resign") {
      if (emp.employment_status === "resigned") {
        return NextResponse.json({ error: "พนักงานคนนี้ลาออกไปแล้ว" }, { status: 400 })
      }

      const effectiveDate = resign_date || new Date().toISOString().slice(0, 10)

      // 1. อัปเดตสถานะพนักงาน → resigned + is_active = false
      const { error: updErr } = await supa.from("employees").update({
        employment_status: "resigned",
        resign_date: effectiveDate,
        is_active: false,
      }).eq("id", employee_id)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

      // 2. บันทึกประวัติการลาออก (ลงใน resignation_history)
      // ถ้ามี table resignation_history ให้ insert — ถ้าไม่มีก็ข้ามไป
      await supa.from("resignation_history").insert({
        employee_id,
        company_id: emp.company_id,
        action: "resign",
        resign_date: effectiveDate,
        reason: resign_reason || null,
        previous_status: emp.employment_status,
        performed_by: user.id,
      })

      // 3. ปิด auth user (disable login) — ป้องกันเข้าระบบ
      try {
        const { data: userData } = await supa.from("users").select("id").eq("employee_id", employee_id).single()
        if (userData?.id) {
          await supa.auth.admin.updateUserById(userData.id, { ban_duration: "876000h" })
        }
      } catch { /* ignore if user not found */ }

      // Audit log
      logEmployeeChange(supa, {
        actorId: user.id, action: "deactivate",
        employeeId: employee_id,
        employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
        companyId: emp.company_id,
        changes: { employment_status: { old: emp.employment_status, new: "resigned" }, resign_date: { old: null, new: effectiveDate } },
      })

      return NextResponse.json({
        success: true,
        message: `บันทึกลาออกเรียบร้อย — ${emp.first_name_th} ${emp.last_name_th}`,
      })
    }

    // ════════════════════════════════════════════════════════
    // REINSTATE — ดึงกลับเข้ามา
    // ════════════════════════════════════════════════════════
    if (action === "reinstate") {
      if (emp.employment_status !== "resigned" && emp.employment_status !== "terminated") {
        return NextResponse.json({ error: "พนักงานคนนี้ยังไม่ได้ลาออก" }, { status: 400 })
      }

      const restoreStatus = previous_status || "active"

      // 1. อัปเดตสถานะพนักงาน
      const { error: updErr } = await supa.from("employees").update({
        employment_status: restoreStatus,
        is_active: true,
        // เก็บ resign_date ไว้เป็นประวัติ ไม่ลบ
      }).eq("id", employee_id)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

      // 2. บันทึกประวัติ reinstate
      await supa.from("resignation_history").insert({
        employee_id,
        company_id: emp.company_id,
        action: "reinstate",
        resign_date: null,
        reason: resign_reason || "ดึงกลับเข้ามาทำงาน",
        previous_status: emp.employment_status,
        performed_by: user.id,
      })

      // 3. เปิด auth user กลับมา (unban)
      try {
        const { data: userData } = await supa.from("users").select("id").eq("employee_id", employee_id).single()
        if (userData?.id) {
          await supa.auth.admin.updateUserById(userData.id, { ban_duration: "none" })
        }
      } catch { /* ignore if user not found */ }

      // Audit log
      logEmployeeChange(supa, {
        actorId: user.id, action: "update",
        employeeId: employee_id,
        employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
        companyId: emp.company_id,
        changes: { employment_status: { old: emp.employment_status, new: restoreStatus }, is_active: { old: false, new: true } },
      })

      return NextResponse.json({
        success: true,
        message: `ดึงกลับเรียบร้อย — ${emp.first_name_th} ${emp.last_name_th} (สถานะ: ${restoreStatus})`,
      })
    }

    return NextResponse.json({ error: "action ต้องเป็น resign หรือ reinstate" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
