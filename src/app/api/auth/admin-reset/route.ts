import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getResend, adminResetNotifyEmail } from "@/lib/resend"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/auditLog"

// ── POST: Admin รีเซ็ตรหัสผ่านให้พนักงาน ───────────────────────
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── ตรวจสิทธิ์ admin ──
  const { data: adminData } = await supa
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!adminData || !["super_admin", "hr_admin"].includes(adminData.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const { employee_id, new_password, send_email } = await req.json()

  if (!employee_id) {
    return NextResponse.json({ error: "กรุณาระบุ employee_id" }, { status: 400 })
  }

  // ── สร้างรหัสใหม่อัตโนมัติถ้าไม่ระบุ ──
  const password = new_password || generatePassword()

  if (password.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 })
  }

  // ── หา auth user จาก employee ──
  const { data: userData, error: findErr } = await supa
    .from("users")
    .select("id, employee_id")
    .eq("employee_id", employee_id)
    .maybeSingle()

  if (findErr || !userData) {
    return NextResponse.json({ error: "ไม่พบ user ของพนักงานนี้" }, { status: 404 })
  }

  // ── ดึงข้อมูลพนักงาน ──
  const { data: empData } = await supa
    .from("employees")
    .select("first_name_th, last_name_th, email")
    .eq("id", employee_id)
    .maybeSingle()

  // ── ดึง email จาก Supabase Auth ──
  let authEmail: string | null = null
  try {
    const { data: authUser } = await supa.auth.admin.getUserById(userData.id)
    authEmail = authUser?.user?.email ?? null
  } catch (e) { /* ignore */ }

  // ── รีเซ็ตรหัส ──
  const { error: resetErr } = await supa.auth.admin.updateUserById(userData.id, {
    password,
  })

  if (resetErr) {
    return NextResponse.json({ error: resetErr.message }, { status: 500 })
  }

  // ── ส่ง email แจ้งพนักงาน (optional) ──
  const empName = empData ? `${empData.first_name_th} ${empData.last_name_th}` : "พนักงาน"
  const empEmail = authEmail || empData?.email

  if (send_email !== false && empEmail) {
    try {
      const emailContent = adminResetNotifyEmail(empName, password)
      await getResend().emails.send({
        from: "GOODHR <noreply@shd-technology.co.th>",
        to: empEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      })
    } catch (e) {
      console.error("Send reset email error:", e)
      // ไม่ throw — reset สำเร็จแล้ว แค่ส่ง email ไม่ได้
    }
  }

  // ดึงชื่อ actor (admin)
  const { data: actorUser } = await supa.from("users").select("employee_id").eq("id", user.id).single()
  const { data: actorEmp } = actorUser?.employee_id
    ? await supa.from("employees").select("first_name_th, last_name_th, company_id").eq("id", actorUser.employee_id).single()
    : { data: null }
  const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"

  // Audit log
  logAudit(supa, {
    actorId: user.id, actorName,
    action: "admin_reset_password",
    entityType: "employee",
    entityId: employee_id,
    description: `รีเซ็ตรหัสผ่าน ${empName} โดย ${actorName}`,
    metadata: { email_sent: !!empEmail },
    companyId: actorEmp?.company_id,
  })

  return NextResponse.json({
    success: true,
    message: `รีเซ็ตรหัสผ่าน ${empName} สำเร็จ`,
    password, // ส่งกลับให้ admin เห็น
    email_sent: !!empEmail,
  })
}

// ── สร้างรหัสผ่านสุ่ม ──
function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz" // ไม่มี l, o (สับสน)
  const nums  = "23456789" // ไม่มี 0, 1 (สับสน)
  const special = "!@#"
  let pw = ""
  for (let i = 0; i < 4; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  pw += chars[Math.floor(Math.random() * chars.length)].toUpperCase()
  for (let i = 0; i < 2; i++) pw += nums[Math.floor(Math.random() * nums.length)]
  pw += special[Math.floor(Math.random() * special.length)]
  // shuffle
  return pw.split("").sort(() => Math.random() - 0.5).join("")
}
