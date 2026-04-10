import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/auditLog"

/**
 * POST — Admin สร้าง Auth account ให้พนักงานที่มี employee record แล้ว
 * แต่ยังไม่มี Supabase Auth user + users row
 *
 * Body: { employee_id, email, password, role? }
 */
export async function POST(req: Request) {
  try {
    // ── Auth: ตรวจว่า caller เป็น admin ──
    const cookieClient = createClient()
    const { data: { user: caller } } = await cookieClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()

    const { data: callerData } = await supa
      .from("users")
      .select("role, employee_id, employee:employees(first_name_th, last_name_th)")
      .eq("id", caller.id)
      .single()

    if (!callerData || !["super_admin", "hr_admin"].includes(callerData.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ — เฉพาะ Admin เท่านั้น" }, { status: 403 })
    }

    // ── Parse body ──
    const body = await req.json()
    const { employee_id, email, password, role } = body as {
      employee_id: string
      email: string
      password: string
      role?: string
    }

    if (!employee_id || !email || !password) {
      return NextResponse.json({ error: "กรุณากรอก employee_id, email, และ password" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 })
    }

    // ── ตรวจว่า employee มีอยู่จริง ──
    const { data: emp, error: empErr } = await supa
      .from("employees")
      .select("id, company_id, first_name_th, last_name_th, email")
      .eq("id", employee_id)
      .single()

    if (empErr || !emp) {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
    }

    // ── ตรวจว่ายังไม่มี auth account ──
    const { data: existingUser } = await supa
      .from("users")
      .select("id")
      .eq("employee_id", employee_id)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "พนักงานนี้มีบัญชีล็อกอินอยู่แล้ว" }, { status: 409 })
    }

    // ── สร้าง Supabase Auth user ──
    const normalizedEmail = email.trim().toLowerCase()
    const { data: authData, error: authErr } = await supa.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${emp.first_name_th} ${emp.last_name_th}`,
        employee_id: emp.id,
      },
    })

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    const authId = authData.user.id
    const assignedRole = role || "employee"

    // ── สร้าง users row เชื่อม auth ↔ employee ──
    const { error: userErr } = await supa.from("users").insert({
      id: authId,
      employee_id: emp.id,
      company_id: emp.company_id,
      role: assignedRole,
      is_active: true,
    })

    if (userErr) {
      // rollback: ลบ auth user ที่สร้างไปแล้ว
      await supa.auth.admin.deleteUser(authId)
      return NextResponse.json({ error: userErr.message }, { status: 400 })
    }

    // ── อัปเดต email ใน employees ถ้าเปลี่ยน ──
    if (emp.email !== normalizedEmail) {
      await supa.from("employees").update({ email: normalizedEmail }).eq("id", emp.id)
    }

    // ── Audit log ──
    const actorEmp = callerData.employee as any
    const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : caller.id

    logAudit(supa, {
      actorId: callerData.employee_id || caller.id,
      actorName,
      action: "create_account",
      entityType: "user",
      entityId: authId,
      description: `สร้างบัญชีล็อกอินให้ ${emp.first_name_th} ${emp.last_name_th} (${normalizedEmail}) โดย ${actorName}`,
      metadata: { email: normalizedEmail, role: assignedRole },
      companyId: emp.company_id,
    })

    return NextResponse.json({
      success: true,
      auth_id: authId,
      message: `สร้างบัญชีสำเร็จ — ${emp.first_name_th} ${emp.last_name_th} สามารถล็อกอินด้วย ${normalizedEmail} ได้แล้ว`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
