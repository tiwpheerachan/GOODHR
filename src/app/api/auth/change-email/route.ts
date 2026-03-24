import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ── POST: เปลี่ยนอีเมลพนักงาน (Admin only) ──────────────────
// อัพเดททั้ง Supabase Auth + employees table + users table
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

  const { employee_id, new_email, old_email } = await req.json()

  if (!employee_id || !new_email) {
    return NextResponse.json({ error: "กรุณาระบุ employee_id และ new_email" }, { status: 400 })
  }

  // ── validate email format ──
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(new_email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 })
  }

  // ── หา auth user ──
  let authUserId: string | null = null
  let foundEmail: string | null = null

  // วิธี 1: หาจาก users.employee_id
  const { data: userData } = await supa
    .from("users")
    .select("id, email")
    .eq("employee_id", employee_id)
    .maybeSingle()

  if (userData) {
    authUserId = userData.id
    foundEmail = userData.email
  }

  // วิธี 2: หาจาก old_email ที่ส่งมา → match กับ users table
  if (!authUserId && old_email) {
    const { data: userByOldEmail } = await supa
      .from("users")
      .select("id, email")
      .eq("email", old_email)
      .maybeSingle()

    if (userByOldEmail) {
      authUserId = userByOldEmail.id
      foundEmail = userByOldEmail.email
      // เชื่อม employee_id ให้ด้วย
      await supa.from("users").update({ employee_id }).eq("id", userByOldEmail.id)
    }
  }

  // วิธี 3: หาจากอีเมลเดิมของ employee ใน employees table
  if (!authUserId) {
    const { data: empData } = await supa
      .from("employees")
      .select("email")
      .eq("id", employee_id)
      .maybeSingle()

    const empEmail = empData?.email
    if (empEmail) {
      const { data: userByEmpEmail } = await supa
        .from("users")
        .select("id, email")
        .eq("email", empEmail)
        .maybeSingle()

      if (userByEmpEmail) {
        authUserId = userByEmpEmail.id
        foundEmail = userByEmpEmail.email
        await supa.from("users").update({ employee_id }).eq("id", userByEmpEmail.id)
      }
    }
  }

  // วิธี 4: ค้น auth.users โดยตรงผ่าน database function (ต้องรัน supabase_auth_helper.sql ก่อน)
  if (!authUserId) {
    const lookupEmail = old_email || (await supa.from("employees").select("email").eq("id", employee_id).maybeSingle())?.data?.email
    if (lookupEmail) {
      try {
        const { data: authId } = await supa.rpc("get_auth_user_by_email", { lookup_email: lookupEmail })
        if (authId) {
          authUserId = authId
          foundEmail = lookupEmail
        }
      } catch {
        // function ยังไม่ได้สร้าง — ข้ามไป
      }
    }
  }

  if (!authUserId) {
    return NextResponse.json({
      error: `ไม่พบบัญชีล็อกอินของพนักงานนี้ (ค้นด้วย old_email: ${old_email || "ไม่มี"})`,
    }, { status: 404 })
  }

  // ── ตรวจว่าอีเมลใหม่ไม่ซ้ำกับคนอื่น ──
  const { data: existing } = await supa
    .from("users")
    .select("id")
    .eq("email", new_email)
    .neq("id", authUserId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานในระบบแล้ว" }, { status: 409 })
  }

  // ── Step 1: อัพเดท Supabase Auth (อีเมลล็อกอิน) ──
  const { error: authErr } = await supa.auth.admin.updateUserById(authUserId, {
    email: new_email,
    email_confirm: true,
  })

  if (authErr) {
    return NextResponse.json({ error: `Auth error: ${authErr.message}` }, { status: 500 })
  }

  // ── Step 2: อัพเดท users table ──
  await supa.from("users").update({ email: new_email, employee_id }).eq("id", authUserId)

  // ── Step 3: อัพเดท employees table ──
  await supa.from("employees").update({ email: new_email }).eq("id", employee_id)

  return NextResponse.json({
    success: true,
    message: `เปลี่ยนอีเมลล็อกอินสำเร็จ: ${foundEmail} → ${new_email}`,
    old_email: foundEmail,
    new_email,
    auth_updated: true,
  })
}
