import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getResend, passwordChangedNotifyEmail } from "@/lib/resend"
import { NextResponse } from "next/server"

// ── POST: เปลี่ยนรหัสผ่าน ─────────────────────────────────────
// ✅ ใช้ service role (admin API) เพื่อหลีกเลี่ยงปัญหา session/cookies
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()

  // ── Validate ──
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่" }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 })
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม" }, { status: 400 })
  }

  // ── ตรวจรหัสเก่า: ใช้ client แยกต่างหาก ──
  // สำคัญ: signInWithPassword จะเปลี่ยน internal session ของ client
  // ถ้าใช้ client ตัวเดียวกับ admin API → admin calls จะพังเพราะ session ถูกแทนที่
  const verifyClient = createServiceClient()
  const { error: verifyErr } = await verifyClient.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (verifyErr) {
    return NextResponse.json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 })
  }

  // ── เปลี่ยนรหัส: ใช้ service client ใหม่ (สะอาด ไม่โดน signIn ทับ) ──
  const supa = createServiceClient()
  const { error: updateErr } = await supa.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (updateErr) {
    return NextResponse.json({ error: `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${updateErr.message}` }, { status: 500 })
  }

  // ── ส่ง email แจ้งเตือน (non-blocking) ──
  try {
    const { data: emp } = await supa
      .from("employees")
      .select("first_name_th, last_name_th")
      .eq("id", (user.user_metadata as any)?.employee_id)
      .maybeSingle()

    // fallback: ค้นจาก users table ถ้า user_metadata ไม่มี employee_id
    let name = user.email!
    if (emp) {
      name = `${emp.first_name_th} ${emp.last_name_th}`
    } else {
      const { data: uData } = await supa
        .from("users")
        .select("employee:employees!employee_id(first_name_th, last_name_th)")
        .eq("id", user.id)
        .maybeSingle()
      const uemp = uData?.employee as any
      if (uemp) name = `${uemp.first_name_th} ${uemp.last_name_th}`
    }

    const email = passwordChangedNotifyEmail(name)
    await getResend().emails.send({
      from: "GOODHR <noreply@shd-technology.co.th>",
      to: user.email!,
      subject: email.subject,
      html: email.html,
    }).catch(() => {})
  } catch {} // silent

  return NextResponse.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" })
}
