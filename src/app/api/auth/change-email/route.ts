import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── helper: ดึง auth users ทั้งหมด (pagination) ──
async function getAllAuthUsers(supa: SupabaseClient): Promise<User[]> {
  const all: User[] = []
  let page = 1
  while (true) {
    const { data: { users }, error } = await supa.auth.admin.listUsers({
      page,
      perPage: 500,
    })
    if (error || !users || users.length === 0) break
    all.push(...users)
    if (users.length < 500) break
    page++
  }
  return all
}

// ── helper: หา auth user จาก email (case-insensitive) ──
async function findAuthUserByEmail(
  supa: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = email.trim().toLowerCase()
  const allUsers = await getAllAuthUsers(supa)
  return allUsers.find(u => u.email?.toLowerCase() === target) ?? null
}

// ── POST: เปลี่ยนอีเมลล็อกอิน (Admin เท่านั้น) ──────────────────
// Admin → ส่ง employee_id + new_email
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await req.json()
  const { employee_id, new_email } = body

  if (!new_email) {
    return NextResponse.json({ error: "กรุณาระบุอีเมลใหม่" }, { status: 400 })
  }

  // ── validate email format ──
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(new_email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 })
  }

  // ── normalize ──
  const normalizedEmail = new_email.trim().toLowerCase()

  // ── ตรวจสิทธิ์: เฉพาะ admin เท่านั้น ──
  const { data: callerData } = await supa
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = callerData && ["super_admin", "hr_admin"].includes(callerData.role)
  if (!isAdmin) {
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้นที่สามารถเปลี่ยนอีเมลได้" }, { status: 403 })
  }

  if (!employee_id) {
    return NextResponse.json({ error: "กรุณาระบุ employee_id" }, { status: 400 })
  }

  // ── กำหนด target ──
  let targetAuthId: string
  const targetEmployeeId: string = employee_id
  let oldEmail: string

  // ── Lookup 1: users table → employee_id ──
  const { data: targetUser } = await supa
    .from("users")
    .select("id, email")
    .eq("employee_id", employee_id)
    .maybeSingle()

  if (targetUser) {
    targetAuthId = targetUser.id
    oldEmail = targetUser.email || ""
  } else {
    // ── ดึง email จาก employees table ──
    const { data: empData } = await supa
      .from("employees")
      .select("email")
      .eq("id", employee_id)
      .maybeSingle()

    if (empData?.email) {
      const empEmailLower = empData.email.trim().toLowerCase()

      // ── Lookup 2: users table → email (case-insensitive) ──
      const { data: usersMatchList } = await supa
        .from("users")
        .select("id, email")

      const userByEmail = (usersMatchList ?? []).find(
        u => u.email?.toLowerCase() === empEmailLower
      )

      if (userByEmail) {
        targetAuthId = userByEmail.id
        oldEmail = userByEmail.email || empData.email
        // เชื่อม employee_id ให้ด้วย
        await supa.from("users").update({ employee_id }).eq("id", userByEmail.id)
      } else {
        // ── Lookup 3: ค้นหาใน Supabase Auth โดยตรง (ทุก page) ──
        const authMatch = await findAuthUserByEmail(supa, empData.email)

        if (authMatch) {
          targetAuthId = authMatch.id
          oldEmail = authMatch.email || empData.email
          // สร้าง record ใน users table เชื่อมกับ employee
          await supa.from("users").upsert({
            id: authMatch.id,
            email: authMatch.email,
            employee_id,
            role: "employee",
          }, { onConflict: "id" })
        } else {
          return NextResponse.json({
            error: `ไม่พบบัญชีล็อกอินของพนักงานนี้ (อีเมลใน employees: ${empData.email}) — กรุณาสร้างบัญชีล็อกอินให้พนักงานก่อน`,
          }, { status: 404 })
        }
      }
    } else {
      // employees ไม่มี email → ลอง match ด้วย user_metadata
      const allUsers = await getAllAuthUsers(supa)
      const authMatch2 = allUsers.find(
        u => (u.user_metadata as Record<string, unknown>)?.employee_id === employee_id
      )
      if (authMatch2) {
        targetAuthId = authMatch2.id
        oldEmail = authMatch2.email || ""
        await supa.from("users").upsert({
          id: authMatch2.id,
          email: authMatch2.email,
          employee_id,
          role: "employee",
        }, { onConflict: "id" })
      } else {
        return NextResponse.json({
          error: "ไม่พบบัญชีล็อกอินของพนักงานนี้ — กรุณาสร้างบัญชีล็อกอินให้พนักงานก่อน",
        }, { status: 404 })
      }
    }
  }

  // ── ตรวจว่าอีเมลใหม่ไม่ซ้ำ (ทั้ง users table + Supabase Auth) ──
  const { data: existing } = await supa
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", targetAuthId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานในระบบแล้ว" }, { status: 409 })
  }

  // ตรวจใน Supabase Auth ด้วย (ทุก page)
  const allAuthForDupCheck = await getAllAuthUsers(supa)
  const authDup = allAuthForDupCheck.find(
    u => u.email?.toLowerCase() === normalizedEmail && u.id !== targetAuthId
  )
  if (authDup) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานในระบบแล้ว" }, { status: 409 })
  }

  // ── Step 1: อัพเดท Supabase Auth ──
  const { error: authErr } = await supa.auth.admin.updateUserById(targetAuthId, {
    email: normalizedEmail,
    email_confirm: true,
  })
  if (authErr) {
    return NextResponse.json({ error: `Auth error: ${authErr.message}` }, { status: 500 })
  }

  // ── Step 2: อัพเดท users table ──
  await supa
    .from("users")
    .update({ email: normalizedEmail })
    .eq("id", targetAuthId)

  // ── Step 3: อัพเดท employees table (ถ้ามี employee_id) ──
  if (targetEmployeeId) {
    await supa.from("employees").update({ email: normalizedEmail }).eq("id", targetEmployeeId)
  }

  return NextResponse.json({
    success: true,
    message: `เปลี่ยนอีเมลล็อกอินสำเร็จ: ${oldEmail} → ${normalizedEmail}`,
    old_email: oldEmail,
    new_email: normalizedEmail,
  })
}
