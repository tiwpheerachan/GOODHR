import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

/**
 * POST /api/employees/delete
 * ลบพนักงาน (soft delete) หรือ กู้คืน
 *
 * Body:
 *   action: "delete" | "restore"
 *   employee_id: string
 *   reason?: string
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // ตรวจสิทธิ์ — เฉพาะ super_admin หรือ hr_admin เท่านั้น
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()
    if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ลบพนักงาน" }, { status: 403 })
    }

    const supa = createServiceClient()
    const body = await req.json()
    const { action, employee_id, reason } = body

    if (!employee_id) {
      return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })
    }

    // ดึงข้อมูลพนักงาน
    const { data: emp, error: empErr } = await supa
      .from("employees")
      .select("id, employee_code, first_name_th, last_name_th, employment_status, is_active, company_id, deleted_at")
      .eq("id", employee_id)
      .single()

    if (empErr || !emp) {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
    }

    // ════════════════════════════════════════════════════════
    // DELETE — ลบพนักงาน (soft delete)
    // ════════════════════════════════════════════════════════
    if (action === "delete") {
      if (emp.deleted_at) {
        return NextResponse.json({ error: "พนักงานคนนี้ถูกลบไปแล้ว" }, { status: 400 })
      }

      // 1. ตั้ง deleted_at + deleted_by + is_active = false
      const { error: updErr } = await supa.from("employees").update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        is_active: false,
      }).eq("id", employee_id)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

      // 2. บันทึกประวัติ
      await supa.from("employee_deletion_log").insert({
        employee_id,
        company_id: emp.company_id,
        action: "delete",
        reason: reason || null,
        previous_employment_status: emp.employment_status,
        performed_by: user.id,
      })

      // 3. ปิด auth user (disable login)
      try {
        const { data: authUser } = await supa.from("users").select("id").eq("employee_id", employee_id).single()
        if (authUser?.id) {
          await supa.auth.admin.updateUserById(authUser.id, { ban_duration: "876000h" })
        }
      } catch { /* ignore */ }

      // Audit log
      logEmployeeChange(supa, {
        actorId: user.id, action: "deactivate",
        employeeId: employee_id,
        employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
        companyId: emp.company_id,
        changes: { deleted_at: { old: null, new: new Date().toISOString() } },
      })

      return NextResponse.json({
        success: true,
        message: `ลบพนักงานเรียบร้อย — ${emp.first_name_th} ${emp.last_name_th}`,
      })
    }

    // ════════════════════════════════════════════════════════
    // RESTORE — กู้คืนพนักงานที่ถูกลบ
    // ════════════════════════════════════════════════════════
    if (action === "restore") {
      if (!emp.deleted_at) {
        return NextResponse.json({ error: "พนักงานคนนี้ยังไม่ได้ถูกลบ" }, { status: 400 })
      }

      // ดึงสถานะก่อนลบจาก deletion log
      const { data: lastLog } = await supa
        .from("employee_deletion_log")
        .select("previous_employment_status")
        .eq("employee_id", employee_id)
        .eq("action", "delete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const prevStatus = lastLog?.previous_employment_status || emp.employment_status
      const isActiveAgain = !["resigned", "terminated"].includes(prevStatus)

      // 1. คืนค่า deleted_at → null + is_active กลับมา
      const { error: updErr } = await supa.from("employees").update({
        deleted_at: null,
        deleted_by: null,
        is_active: isActiveAgain,
      }).eq("id", employee_id)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

      // 2. บันทึกประวัติการกู้คืน
      await supa.from("employee_deletion_log").insert({
        employee_id,
        company_id: emp.company_id,
        action: "restore",
        reason: reason || "กู้คืนพนักงาน",
        previous_employment_status: prevStatus,
        performed_by: user.id,
      })

      // 3. เปิด auth user กลับมา (unban) ถ้า active
      if (isActiveAgain) {
        try {
          const { data: authUser } = await supa.from("users").select("id").eq("employee_id", employee_id).single()
          if (authUser?.id) {
            await supa.auth.admin.updateUserById(authUser.id, { ban_duration: "none" })
          }
        } catch { /* ignore */ }
      }

      // Audit log
      logEmployeeChange(supa, {
        actorId: user.id, action: "update",
        employeeId: employee_id,
        employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
        companyId: emp.company_id,
        changes: { deleted_at: { old: emp.deleted_at, new: null }, is_active: { old: false, new: isActiveAgain } },
      })

      return NextResponse.json({
        success: true,
        message: `กู้คืนพนักงานเรียบร้อย — ${emp.first_name_th} ${emp.last_name_th}`,
      })
    }

    return NextResponse.json({ error: "action ต้องเป็น delete หรือ restore" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
