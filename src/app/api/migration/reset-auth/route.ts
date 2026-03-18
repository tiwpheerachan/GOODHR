import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const KEEP_EMP_ID = "11655ff2-5e7e-4e80-8a26-e910aa257192" // SHD-005

export async function POST(req: NextRequest) {
  try {
    const { accounts, confirm } = await req.json()
    if (confirm !== "YES_RESET_AUTH") {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 })
    }

    const supa = createServiceClient()

    // ── STEP 1: Get SHD-005's auth user ID (to keep) ──
    const { data: keepUser } = await supa.from("users")
      .select("id").eq("employee_id", KEEP_EMP_ID).maybeSingle()
    const keepAuthId = keepUser?.id

    // ── STEP 2: Delete ALL existing auth users except SHD-005 ──
    let deletedCount = 0
    let page = 1
    const allAuthUsers: any[] = []

    while (true) {
      const { data: pageData } = await supa.auth.admin.listUsers({ page, perPage: 1000 })
      if (!pageData?.users?.length) break
      allAuthUsers.push(...pageData.users)
      if (pageData.users.length < 1000) break
      page++
    }

    // Delete users table records first (except SHD-005)
    await supa.from("users").delete()
      .not("employee_id", "is", null)
      .neq("employee_id", KEEP_EMP_ID)

    // Delete auth users
    for (const u of allAuthUsers) {
      if (u.id === keepAuthId) continue // Keep SHD-005
      try {
        await supa.auth.admin.deleteUser(u.id)
        deletedCount++
      } catch {}
    }

    // ── STEP 3: Create fresh auth accounts ──
    if (!accounts?.length) {
      return NextResponse.json({ step: "deleted_only", deletedCount })
    }

    let ok = 0, fail = 0, skip = 0
    const errors: string[] = []
    const created: any[] = []

    for (const acc of accounts) {
      if (acc.skip || !acc.email || !acc.password) { skip++; continue }

      // Find employee
      const { data: emp } = await supa.from("employees")
        .select("id,company_id").eq("employee_code", acc.employee_code).maybeSingle()

      if (!emp) {
        fail++
        if (errors.length < 20) errors.push(`${acc.employee_code}: employee not found`)
        continue
      }

      // Skip SHD-005
      if (emp.id === KEEP_EMP_ID) { skip++; continue }

      // Create auth user
      const { data: authData, error: authErr } = await supa.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          employee_code: acc.employee_code,
          nickname: acc.nickname || "",
          full_name: `${acc.first_name} ${acc.last_name}`.trim(),
        },
      })

      if (authErr) {
        fail++
        if (errors.length < 20) errors.push(`${acc.employee_code}: ${authErr.message}`)
        continue
      }

      // Create users table record
      const authUserId = authData.user.id
      const { error: usersErr } = await supa.from("users").upsert({
        id: authUserId,
        employee_id: emp.id,
        company_id: emp.company_id,
        role: acc.role || "employee",
        is_active: true,
      }, { onConflict: "id" })

      if (usersErr) {
        fail++
        if (errors.length < 20) errors.push(`${acc.employee_code}: users table: ${usersErr.message}`)
        continue
      }

      ok++
      created.push({
        code: acc.employee_code,
        email: acc.email,
        password: acc.password,
        role: acc.role,
      })
    }

    return NextResponse.json({
      deletedCount,
      ok, fail, skip,
      errors,
      total: accounts.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
