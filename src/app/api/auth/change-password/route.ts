import { createClient, createServiceClient } from "@/lib/supabase/server"
import { resend, passwordChangedNotifyEmail } from "@/lib/resend"
import { NextResponse } from "next/server"

// ── POST: เปลี่ยนรหัสผ่าน (user ต้องกรอกรหัสเก่า) ──────────────
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

  // ── ตรวจรหัสเก่าโดย sign in ซ้ำ ──
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (signInErr) {
    return NextResponse.json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 })
  }

  // ── เปลี่ยนรหัส ──
  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // ── ส่ง email แจ้งเตือน (non-blocking) ──
  try {
    const supa = createServiceClient()
    const { data: emp } = await supa
      .from("employees")
      .select("first_name_th, last_name_th")
      .eq("id", (user.user_metadata as any)?.employee_id)
      .maybeSingle()

    const name = emp ? `${emp.first_name_th} ${emp.last_name_th}` : user.email!
    const email = passwordChangedNotifyEmail(name)

    await resend.emails.send({
      from: "GOODHR <noreply@shd-technology.co.th>",
      to: user.email!,
      subject: email.subject,
      html: email.html,
    }).catch(() => {}) // ไม่ block ถ้าส่งไม่ได้
  } catch {} // silent

  return NextResponse.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" })
}
