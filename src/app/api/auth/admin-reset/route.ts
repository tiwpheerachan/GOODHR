import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getResend, adminResetNotifyEmail } from "@/lib/resend"
import { NextResponse } from "next/server"

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
  const { data: userData } = await supa
    .from("users")
    .select("id, email, employee:employees!employee_id(first_name_th, last_name_th, email)")
    .eq("employee_id", employee_id)
    .maybeSingle()

  if (!userData) {
    return NextResponse.json({ error: "ไม่พบ user ของพนักงานนี้" }, { status: 404 })
  }

  // ── รีเซ็ตรหัส ──
  const { error: resetErr } = await supa.auth.admin.updateUserById(userData.id, {
    password,
  })

  if (resetErr) {
    return NextResponse.json({ error: resetErr.message }, { status: 500 })
  }

  // ── ส่ง email แจ้งพนักงาน (optional) ──
  const emp = userData.employee as any
  const empName = emp ? `${emp.first_name_th} ${emp.last_name_th}` : "พนักงาน"
  const empEmail = userData.email || emp?.email

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
