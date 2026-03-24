import { createServiceClient } from "@/lib/supabase/server"
import { getResend, passwordResetEmail } from "@/lib/resend"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

// ── POST: ส่ง email reset password ──────────────────────────────
// ไม่ต้อง login → เรียกได้จากหน้า Login
export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "กรุณาระบุอีเมล" }, { status: 400 })
  }

  const supa = createServiceClient()

  // ── หา user จาก auth ──
  const { data: { users } } = await supa.auth.admin.listUsers()
  const authUser = (users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!authUser) {
    // ★ ไม่บอกว่าไม่เจอ เพื่อความปลอดภัย (ป้องกัน email enumeration)
    return NextResponse.json({ success: true, message: "หากอีเมลนี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่าน" })
  }

  // ── หาชื่อพนักงาน ──
  const { data: userData } = await supa
    .from("users")
    .select("employee:employees!employee_id(first_name_th, last_name_th)")
    .eq("id", authUser.id)
    .maybeSingle()
  const emp = (userData?.employee as any)
  const name = emp ? `${emp.first_name_th} ${emp.last_name_th}` : email

  // ── ตรวจจับ URL ของแอป (รองรับทั้ง localhost + production) ──
  const headerList = headers()
  const host = headerList.get("host") || "localhost:3000"
  const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== "http://localhost:3000"
    ? process.env.NEXT_PUBLIC_APP_URL
    : `${proto}://${host}`

  // ── สร้าง recovery link ผ่าน Supabase ──
  const { data: linkData, error: linkErr } = await supa.auth.admin.generateLink({
    type: "recovery",
    email: authUser.email!,
  })

  if (linkErr || !linkData) {
    console.error("Generate recovery link error:", linkErr)
    return NextResponse.json({ error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 })
  }

  // ── สร้าง URL 2 แบบ (ใช้ได้ทั้งคู่) ──
  let resetUrl: string

  // แบบ 1: ใช้ action_link จาก Supabase (ปลอดภัยที่สุด)
  // action_link = https://project.supabase.co/auth/v1/verify?token=xxx&type=recovery&redirect_to=...
  if (linkData.properties?.action_link) {
    const actionUrl = new URL(linkData.properties.action_link)
    // เปลี่ยน redirect_to ให้กลับมาที่แอปเรา → /reset-password
    actionUrl.searchParams.set("redirect_to", `${appUrl}/reset-password`)
    resetUrl = actionUrl.toString()
  } else {
    // แบบ 2: fallback ใช้ hashed_token ผ่าน callback ของเราเอง
    const token = linkData.properties?.hashed_token
    resetUrl = token
      ? `${appUrl}/auth/callback?token_hash=${token}&type=recovery&next=/reset-password`
      : `${appUrl}/reset-password`
  }

  console.log("[forgot-password] resetUrl:", resetUrl)

  // ── ส่ง email ผ่าน Resend ──
  const emailContent = passwordResetEmail(resetUrl, name)
  const { error: sendErr } = await getResend().emails.send({
    from: "GOODHR <noreply@shd-technology.co.th>",
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
  })

  if (sendErr) {
    console.error("Resend error:", sendErr)
    return NextResponse.json({ error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "หากอีเมลนี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่าน" })
}
