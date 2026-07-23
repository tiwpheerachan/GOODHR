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

  // ── advanced filters ──
  //   ?country=Thailand,Indonesia  (multi, comma-sep)
  //   ?match_method=email,phone
  //   ?brand=Anker
  //   ?department=Marketing
  //   ?company_unit=Brazil Business Management Center
  const fCountry = (sp.get("country") || "").split(",").map(s => s.trim()).filter(Boolean)
  const fMethod  = (sp.get("match_method") || "").split(",").map(s => s.trim()).filter(Boolean)
  const fBrand   = (sp.get("brand") || "").trim()
  const fDept    = (sp.get("department") || "").trim()
  const fCompany = (sp.get("company_unit") || "").trim()

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

  // ── apply advanced filters ──
  if (fMethod.length > 0) query = query.in("match_method", fMethod)
  if (fBrand)   query = query.ilike("brand", `%${fBrand.replace(/[%_]/g, "")}%`)
  if (fDept)    query = query.ilike("department_path", `%${fDept.replace(/[%_]/g, "")}%`)
  if (fCompany) query = query.ilike("department_path", `%${fCompany.replace(/[%_]/g, "")}%`)
  if (fCountry.length > 0) {
    // build OR clause: department_path contains any of countries (English or Chinese)
    const CN_MAP: Record<string, string> = {
      Thailand: "泰国", China: "中国", Indonesia: "印尼", Philippines: "菲律宾",
      Brazil: "巴西", Vietnam: "越南", Malaysia: "马来", Singapore: "新加坡",
      Mexico: "墨西哥", Saudi: "沙特",
    }
    const ors: string[] = []
    for (const c of fCountry) {
      const safe = c.replace(/[%_,()]/g, "")
      ors.push(`department_path.ilike.%${safe}%`)
      const cn = CN_MAP[c]
      if (cn) ors.push(`department_path.ilike.%${cn}%`)
    }
    if (ors.length > 0) query = query.or(ors.join(","))
  }

  if (q) {
    const k = q.replace(/[%_,()]/g, "")
    const ors = [
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
    ]
    // ค้นชื่อไทย/รหัสจาก GoodHR employee ที่ link แล้ว map กลับเป็น feishu_users
    const { data: gemps } = await svc.from("employees")
      .select("id")
      .or(`first_name_th.ilike.%${k}%,last_name_th.ilike.%${k}%,nickname.ilike.%${k}%,employee_code.ilike.%${k}%,first_name_en.ilike.%${k}%,last_name_en.ilike.%${k}%`)
      .limit(200)
    const gids = (gemps ?? []).map((e: any) => e.id)
    if (gids.length) ors.push(`goodhr_employee_id.in.(${gids.join(",")})`)
    query = query.or(ors.join(","))
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ─── Rich stats ──
  const { data: stats } = await svc.from("feishu_users")
    .select("status, goodhr_employee_id, manually_verified, match_method, department_path, brand")
  const sArr = stats ?? []

  // Region detection — strip from department_path
  //   "SHD TECHNOLOGY LIMITED/Thailand Business Management Center/Thailand Team" → Thailand
  const regionOf = (dept: string | null): string => {
    if (!dept) return "Other"
    const m = dept.match(/(Thailand|China|Indonesia|Philippines|Brazil|Vietnam|Malaysia|Singapore|Mexico|Saudi|Mainland)/i)
    if (m) return m[1] === "Mainland" ? "China" : m[1]
    if (/中国|大陆/i.test(dept)) return "China"
    if (/印尼/i.test(dept)) return "Indonesia"
    if (/菲律宾/i.test(dept)) return "Philippines"
    if (/巴西/i.test(dept)) return "Brazil"
    if (/泰国/i.test(dept)) return "Thailand"
    return "Other"
  }

  const byRegion: Record<string, { total: number; matched: number; unmatched: number }> = {}
  const byMethod: Record<string, number> = {}
  const brandCounter: Record<string, number> = {}

  for (const s of sArr) {
    const r = regionOf(s.department_path)
    if (!byRegion[r]) byRegion[r] = { total: 0, matched: 0, unmatched: 0 }
    byRegion[r].total++
    if (s.goodhr_employee_id) byRegion[r].matched++
    else byRegion[r].unmatched++

    if (s.match_method) byMethod[s.match_method] = (byMethod[s.match_method] || 0) + 1
    if (s.brand) {
      String(s.brand)
        .split(/[,/、&，；;]|\s+(?=[A-Z一-龥])/g)
        .map(b => b.trim()).filter(Boolean)
        .forEach(b => { brandCounter[b] = (brandCounter[b] || 0) + 1 })
    }
  }

  // ── Company unit (second level of department_path) + Sub-dept ──
  const companyUnitCounter: Record<string, number> = {}
  const subDeptCounter: Record<string, number> = {}
  for (const s of sArr) {
    if (s.department_path) {
      const parts = String(s.department_path).split("/").map((x: string) => x.trim()).filter(Boolean)
      if (parts[1]) companyUnitCounter[parts[1]] = (companyUnitCounter[parts[1]] || 0) + 1
      // last 2 segments as sub-dept
      const subDept = parts.slice(-2).join(" / ")
      if (subDept) subDeptCounter[subDept] = (subDeptCounter[subDept] || 0) + 1
    }
  }

  const summary = {
    total: sArr.length,
    matched: sArr.filter(s => s.goodhr_employee_id).length,
    unmatched: sArr.filter(s => !s.goodhr_employee_id).length,
    verified: sArr.filter(s => s.manually_verified).length,
    active: sArr.filter(s => s.status === "Active").length,
    inactive: sArr.filter(s => s.status !== "Active").length,
    by_region: Object.entries(byRegion)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.total - a.total),
    by_method: Object.entries(byMethod)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    top_brands: Object.entries(brandCounter)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    company_units: Object.entries(companyUnitCounter)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    departments: Object.entries(subDeptCounter)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100),
    match_rate: sArr.length > 0
      ? Math.round((sArr.filter(s => s.goodhr_employee_id).length / sArr.length) * 100)
      : 0,
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
