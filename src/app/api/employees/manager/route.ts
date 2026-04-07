import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/auditLog"

// ── POST: เปลี่ยนหัวหน้าพนักงาน (ใช้ service role bypass RLS) ──
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── ตรวจสิทธิ์ admin ──
  const { data: callerData } = await supa
    .from("users")
    .select("role, employee_id")
    .eq("id", user.id)
    .single()

  if (!callerData || !["super_admin", "hr_admin"].includes(callerData.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const { employee_id, manager_id, effective_from } = await req.json()

  if (!employee_id || !manager_id) {
    return NextResponse.json({ error: "กรุณาระบุ employee_id และ manager_id" }, { status: 400 })
  }

  const effectiveDate = effective_from || new Date().toISOString().split("T")[0]

  // ── Step 1: ปิด record หัวหน้าเดิม (ถ้ามี) ──
  const { error: updateErr } = await supa
    .from("employee_manager_history")
    .update({ effective_to: effectiveDate })
    .eq("employee_id", employee_id)
    .is("effective_to", null)

  if (updateErr) {
    console.error("Update old manager error:", updateErr.message)
    return NextResponse.json({ error: `ปิด record หัวหน้าเดิมไม่สำเร็จ: ${updateErr.message}` }, { status: 500 })
  }

  // ── Step 2: สร้าง record หัวหน้าใหม่ ──
  const { error: insertErr } = await supa
    .from("employee_manager_history")
    .insert({
      employee_id,
      manager_id,
      effective_from: effectiveDate,
      created_by: callerData.employee_id ?? null,
    })

  if (insertErr) {
    console.error("Insert new manager error:", insertErr.message)
    return NextResponse.json({ error: `เพิ่มหัวหน้าใหม่ไม่สำเร็จ: ${insertErr.message}` }, { status: 500 })
  }

  // ── ดึงชื่อเพื่อ audit log ──
  const { data: empInfo } = await supa.from("employees").select("first_name_th, last_name_th, company_id").eq("id", employee_id).maybeSingle()
  const { data: mgrInfo } = await supa.from("employees").select("first_name_th, last_name_th").eq("id", manager_id).maybeSingle()
  const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : employee_id
  const mgrName = mgrInfo ? `${mgrInfo.first_name_th} ${mgrInfo.last_name_th}` : manager_id

  const { data: actorEmp } = callerData.employee_id
    ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", callerData.employee_id).single()
    : { data: null }
  const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"

  logAudit(supa, {
    actorId: user.id,
    actorName,
    action: "change_manager",
    entityType: "employee",
    entityId: employee_id,
    description: `เปลี่ยนหัวหน้า ${empName} เป็น ${mgrName} โดย ${actorName}`,
    metadata: { new_manager_id: manager_id, effective_from: effectiveDate },
    companyId: empInfo?.company_id,
  })

  return NextResponse.json({
    success: true,
    message: `เปลี่ยนหัวหน้า ${empName} เป็น ${mgrName} สำเร็จ`,
  })
}
