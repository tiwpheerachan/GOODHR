import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]

async function guard(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: u } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!u || !ADMIN_ROLES.includes(u.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc }
}

// GET /api/feishu-users
//   ?filter=all|matched|unmatched|china_only|active|by_goodhr
//   ?q=search
//   ?goodhr_employee_id=xxx  → คืน Feishu user ที่ link กับ employee นี้ (ถ้ามี)
//   ?limit=100&offset=0
export async function GET(req: NextRequest) {
  const g = await guard(req); if ("error" in g) return g.error
  const svc = g.svc!
  const sp = req.nextUrl.searchParams
  const filter = sp.get("filter") || "all"
  const q = (sp.get("q") || "").trim()
  const limit = Math.min(parseInt(sp.get("limit") || "100"), 500)
  const offset = parseInt(sp.get("offset") || "0")
  const ghEmpId = sp.get("goodhr_employee_id")

  // ── shortcut: find Feishu user by GoodHR employee id ──
  if (ghEmpId) {
    const { data } = await svc.from("feishu_users")
      .select("*").eq("goodhr_employee_id", ghEmpId).maybeSingle()
    return NextResponse.json({ user: data || null })
  }

  let query = svc.from("feishu_users")
    .select(`*,
      goodhr:employees!feishu_users_goodhr_employee_id_fkey(
        id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
        department:departments(name), position:positions(name)
      )`, { count: "exact" })
    .order("name")
    .range(offset, offset + limit - 1)

  if (filter === "matched")     query = query.not("goodhr_employee_id", "is", null)
  else if (filter === "unmatched") query = query.is("goodhr_employee_id", null)
  else if (filter === "verified")  query = query.eq("manually_verified", true)
  else if (filter === "china_only") query = query.is("goodhr_employee_id", null)
  else if (filter === "active")    query = query.eq("status", "Active")

  if (q) {
    const k = q.replace(/[%_,()]/g, "")
    query = query.or([
      `name.ilike.%${k}%`,
      `name_cn.ilike.%${k}%`,
      `name_en.ilike.%${k}%`,
      `nickname.ilike.%${k}%`,
      `employee_number.ilike.%${k}%`,
      `email.ilike.%${k}%`,
      `email_work.ilike.%${k}%`,
      `email_business.ilike.%${k}%`,
      `feishu_user_id.ilike.%${k}%`,
      `job_title.ilike.%${k}%`,
    ].join(","))
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // stats
  const { data: stats } = await svc.from("feishu_users").select("status, goodhr_employee_id, manually_verified")
  const sArr = stats ?? []
  const summary = {
    total: sArr.length,
    matched: sArr.filter(s => s.goodhr_employee_id).length,
    unmatched: sArr.filter(s => !s.goodhr_employee_id).length,
    verified: sArr.filter(s => s.manually_verified).length,
    active: sArr.filter(s => s.status === "Active").length,
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0, summary })
}

// PATCH /api/feishu-users
//   manual link/unlink
//   body: { feishu_user_id, goodhr_employee_id?, manually_verified?, match_note? }
//
//   goodhr_employee_id = null  → unlink
//   goodhr_employee_id = <uuid> → link
export async function PATCH(req: NextRequest) {
  const g = await guard(req); if ("error" in g) return g.error
  const svc = g.svc!
  const body = await req.json()
  const { feishu_user_id, goodhr_employee_id, manually_verified, match_note } = body
  if (!feishu_user_id) return NextResponse.json({ error: "missing feishu_user_id" }, { status: 400 })

  const updates: any = { updated_at: new Date().toISOString() }
  if (goodhr_employee_id !== undefined) {
    updates.goodhr_employee_id = goodhr_employee_id || null
    if (goodhr_employee_id) {
      updates.matched_at = new Date().toISOString()
      updates.match_method = "manual"
      updates.match_confidence = 100
    } else {
      // unlink → reset match fields
      updates.matched_at = null
      updates.match_method = null
      updates.match_confidence = null
      updates.manually_verified = false
    }
  }
  if (manually_verified !== undefined) updates.manually_verified = !!manually_verified
  if (match_note !== undefined) updates.match_note = match_note || null

  const { error } = await svc.from("feishu_users")
    .update(updates).eq("feishu_user_id", feishu_user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/feishu-users?feishu_user_id=xxx
export async function DELETE(req: NextRequest) {
  const g = await guard(req); if ("error" in g) return g.error
  const svc = g.svc!
  const id = req.nextUrl.searchParams.get("feishu_user_id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("feishu_users").delete().eq("feishu_user_id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
