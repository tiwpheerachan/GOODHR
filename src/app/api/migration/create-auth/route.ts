import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { accounts, confirm } = await req.json()
    if (confirm !== "YES_CREATE_AUTH") {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 })
    }
    if (!accounts?.length) {
      return NextResponse.json({ error: "No accounts" }, { status: 400 })
    }

    const supa = createServiceClient()

    // Pre-load ALL existing auth users (paginated)
    const existingByEmail: Record<string, any> = {}
    let page = 1
    while (true) {
      const { data: pageData } = await supa.auth.admin.listUsers({ page, perPage: 1000 })
      if (!pageData?.users?.length) break
      for (const u of pageData.users) {
        if (u.email) existingByEmail[u.email.toLowerCase()] = u
      }
      if (pageData.users.length < 1000) break
      page++
    }

    let ok = 0, fail = 0, skip = 0
    const errors: string[] = []

    for (const acc of accounts) {
      if (acc.skip || !acc.email || !acc.password) { skip++; continue }

      const emailLower = acc.email.toLowerCase()

      // Find employee
      const { data: emp } = await supa.from("employees")
        .select("id,company_id").eq("employee_code", acc.employee_code).maybeSingle()

      const existing = existingByEmail[emailLower]

      if (existing) {
        // User exists — update password and link
        const { error: updErr } = await supa.auth.admin.updateUserById(existing.id, {
          password: acc.password,
          email_confirm: true,
        })
        if (updErr) {
          fail++
          if (errors.length < 20) errors.push(`${acc.employee_code}: update pw: ${updErr.message}`)
          continue
        }

        // Link to employee in users table
        if (emp) {
          const { data: existingU } = await supa.from("users")
            .select("id").eq("id", existing.id).maybeSingle()
          if (existingU) {
            await supa.from("users").update({
              employee_id: emp.id, company_id: emp.company_id,
              role: acc.role, is_active: true,
            }).eq("id", existing.id)
          } else {
            // Check by employee_id
            const { data: byEmp } = await supa.from("users")
              .select("id").eq("employee_id", emp.id).maybeSingle()
            if (byEmp) {
              await supa.from("users").delete().eq("employee_id", emp.id)
            }
            await supa.from("users").upsert({
              id: existing.id, employee_id: emp.id, company_id: emp.company_id,
              role: acc.role, is_active: true,
            }, { onConflict: "id" })
          }
        }

        ok++
        continue
      }

      // Create new auth user
      const { data: authData, error: authErr } = await supa.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          employee_code: acc.employee_code,
          nickname: acc.nickname,
          full_name: `${acc.first_name} ${acc.last_name}`.trim(),
        },
      })

      if (authErr) {
        fail++
        if (errors.length < 20) errors.push(`${acc.employee_code}: ${authErr.message}`)
        continue
      }

      // Link to users table
      const authUserId = authData.user.id
      if (emp) {
        // Remove any old users row for this employee
        await supa.from("users").delete().eq("employee_id", emp.id)
        await supa.from("users").upsert({
          id: authUserId, employee_id: emp.id, company_id: emp.company_id,
          role: acc.role, is_active: true,
        }, { onConflict: "id" })
      }

      ok++
    }

    return NextResponse.json({ ok, fail, skip, errors, total: accounts.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
