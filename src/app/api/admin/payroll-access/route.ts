import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { hasPayrollAccess, getPayrollScope } from "@/lib/utils/payroll-access"

// ════════════════════════════════════════════════════════════════════
// จัดการสิทธิ์ดูเงินเดือน (payroll_access) — "เหนือกว่า super_admin" + รายบริษัท
//   GET    → { hasAccess, scope, members?, companies? }
//   GET ?q=      → ค้นหาพนักงาน
//   POST   { employee_id|email, company_id? }  → เปิดสิทธิ์ (company_id ว่าง = ทุกบริษัท)
//   DELETE ?id=...   → ยกเลิกสิทธิ์รายแถว (กันลบแถวสุดท้าย)
// ════════════════════════════════════════════════════════════════════

async function getCaller() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  return { svc, user }
}

// ดึงรายชื่อสมาชิก (รายแถว = user × บริษัท) + ชื่อพนักงาน + ชื่อบริษัท
async function listMembers(svc: any) {
  const { data: rows } = await svc
    .from("payroll_access").select("id, user_id, company_id, email, created_at").order("created_at")
  const list = rows ?? []
  if (list.length === 0) return []

  const userIds = list.map((r: any) => r.user_id)
  const { data: us } = await svc.from("users").select("id, employee_id").in("id", userIds)
  const empByUser = new Map((us ?? []).map((u: any) => [u.id, u.employee_id]))
  const empIds = Array.from(new Set((us ?? []).map((u: any) => u.employee_id).filter(Boolean))) as string[]
  let empMap = new Map<string, any>()
  if (empIds.length > 0) {
    const { data: emps } = await svc.from("employees")
      .select("id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, email")
      .in("id", empIds)
    empMap = new Map((emps ?? []).map((e: any) => [e.id, e]))
  }

  const companyIds = Array.from(new Set(list.map((r: any) => r.company_id).filter(Boolean))) as string[]
  let coMap = new Map<string, any>()
  if (companyIds.length > 0) {
    const { data: cos } = await svc.from("companies").select("id, name_th, code").in("id", companyIds)
    coMap = new Map((cos ?? []).map((c: any) => [c.id, c]))
  }

  return list.map((r: any) => {
    const empId = empByUser.get(r.user_id) as string | undefined
    const e = empId ? empMap.get(empId) : null
    const co = r.company_id ? coMap.get(r.company_id) : null
    return {
      id: r.id,
      user_id: r.user_id,
      company_id: r.company_id ?? null,
      company_name: co?.name_th ?? null,
      company_code: co?.code ?? null,
      email: r.email || e?.email || null,
      created_at: r.created_at,
      first_name_th: e?.first_name_th ?? null,
      last_name_th: e?.last_name_th ?? null,
      first_name_en: e?.first_name_en ?? null,
      last_name_en: e?.last_name_en ?? null,
      nickname: e?.nickname ?? null,
      nickname_en: e?.nickname_en ?? null,
    }
  })
}

// ค้นหาพนักงาน (ชื่อ/รหัส/อีเมล) สำหรับเพิ่มสิทธิ์
async function searchEmployees(svc: any, q: string) {
  const clean = q.replace(/[,()%]/g, " ").trim()
  if (!clean) return []
  const like = `%${clean}%`
  const { data } = await svc.from("employees")
    .select("id, employee_code, email, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url")
    .or([
      `first_name_th.ilike.${like}`, `last_name_th.ilike.${like}`,
      `first_name_en.ilike.${like}`, `last_name_en.ilike.${like}`,
      `nickname.ilike.${like}`, `employee_code.ilike.${like}`, `email.ilike.${like}`,
    ].join(","))
    .not("employment_status", "in", "(resigned,terminated)")
    .limit(10)
  return data ?? []
}

export async function GET(req: NextRequest) {
  const c = await getCaller()
  if (c.error) return c.error
  const { svc, user } = c
  const scope = await getPayrollScope(svc, user.id)
  if (!scope.any) return NextResponse.json({ hasAccess: false, scope })
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (q) return NextResponse.json({ hasAccess: true, scope, results: await searchEmployees(svc, q) })
  const { data: companies } = await svc.from("companies")
    .select("id, name_th, code").eq("is_active", true).order("name_th")
  return NextResponse.json({
    hasAccess: true,
    scope,
    companies: companies ?? [],
    members: await listMembers(svc),
  })
}

// POST = "ตั้งค่าชุดบริษัทของ 1 คน" (replace ทั้งหมด) — รองรับติ๊กหลายบริษัท
//   body: { employee_id | user_id, all?: boolean, company_ids?: string[] }
//   all = true            → ทุกบริษัท (แถวเดียว company_id NULL)
//   company_ids = [...]    → เฉพาะบริษัทที่ติ๊ก (แถวละบริษัท)
export async function POST(req: NextRequest) {
  const c = await getCaller()
  if (c.error) return c.error
  const { svc, user } = c
  if (!(await hasPayrollAccess(svc, user.id))) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสิทธิ์เงินเดือน" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const empId = (body?.employee_id ?? "").toString().trim()
  let userId = (body?.user_id ?? "").toString().trim()
  const email0 = (body?.email ?? "").toString().trim()
  const all = !!body?.all
  const companyIds: string[] = Array.isArray(body?.company_ids)
    ? Array.from(new Set(body.company_ids.filter(Boolean).map((x: any) => x.toString())))
    : []

  // resolve user_id + email
  let email: string | null = null
  if (!userId) {
    let emp: any = null
    if (empId) {
      const { data } = await svc.from("employees").select("id, email").eq("id", empId).maybeSingle()
      emp = data
    } else if (email0) {
      const { data } = await svc.from("employees").select("id, email").ilike("email", email0).maybeSingle()
      emp = data
    }
    if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
    const { data: u } = await svc.from("users").select("id").eq("employee_id", emp.id).maybeSingle()
    if (!u) return NextResponse.json({ error: "พนักงานคนนี้ยังไม่มีบัญชีผู้ใช้ (login)" }, { status: 404 })
    userId = u.id
    email = emp.email ?? null
  } else {
    // แก้ไขคนเดิม → ดึง email จากแถวเดิม
    const { data: ex } = await svc.from("payroll_access").select("email").eq("user_id", userId).limit(1)
    email = ex?.[0]?.email ?? null
  }

  // แถวใหม่ที่จะใส่
  const newRows = all
    ? [{ company_id: null as string | null }]
    : companyIds.map(id => ({ company_id: id }))

  // กันไม่ให้เหลือ 0 คนในระบบ (จะไม่มีใครจัดการได้อีก)
  const { data: allRows } = await svc.from("payroll_access").select("id, user_id")
  const total = (allRows ?? []).length
  const userRowCount = (allRows ?? []).filter((r: any) => r.user_id === userId).length
  const resulting = total - userRowCount + newRows.length
  if (resulting < 1) {
    return NextResponse.json({ error: "ต้องเหลือผู้มีสิทธิ์อย่างน้อย 1 คน" }, { status: 400 })
  }

  // replace: ลบของเดิมทั้งหมดของคนนี้ แล้วใส่ชุดใหม่
  await svc.from("payroll_access").delete().eq("user_id", userId)
  if (newRows.length > 0) {
    const { error } = await svc.from("payroll_access").insert(
      newRows.map(r => ({ user_id: userId, company_id: r.company_id, email, granted_by: user.id })),
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, members: await listMembers(svc) })
}

// DELETE ?user_id=... → ลบสิทธิ์ของคนนั้นทั้งหมด (ทุกบริษัท)
export async function DELETE(req: NextRequest) {
  const c = await getCaller()
  if (c.error) return c.error
  const { svc, user } = c
  if (!(await hasPayrollAccess(svc, user.id))) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสิทธิ์เงินเดือน" }, { status: 403 })
  }
  const userId = req.nextUrl.searchParams.get("user_id")
  const rowId = req.nextUrl.searchParams.get("id")
  if (!userId && !rowId) return NextResponse.json({ error: "user_id จำเป็น" }, { status: 400 })

  // กันลบจนไม่เหลือใคร
  const { data: allRows } = await svc.from("payroll_access").select("id, user_id")
  const total = (allRows ?? []).length
  const removing = rowId
    ? (allRows ?? []).filter((r: any) => r.id === rowId).length
    : (allRows ?? []).filter((r: any) => r.user_id === userId).length
  if (total - removing < 1) {
    return NextResponse.json({ error: "ลบไม่ได้ — ต้องเหลือผู้มีสิทธิ์อย่างน้อย 1 คน" }, { status: 400 })
  }

  const del = svc.from("payroll_access").delete()
  const { error } = rowId ? await del.eq("id", rowId) : await del.eq("user_id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, members: await listMembers(svc) })
}
