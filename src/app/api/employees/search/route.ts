import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// /api/employees/search
//   ใช้สำหรับ picker (เลือกหัวหน้า, เลือกผู้ถูกประเมิน, target_manager ใน branch-eval)
//   - q: search term (matches ทั้ง first/last/nickname th/en + employee_code)
//   - limit: max results (default 20, max 500)
//   - all_companies: "1" → super_admin/hr_admin ค้นข้ามทุกบริษัท
//                    default: filter เฉพาะบริษัทของผู้ใช้
//   - include_inactive: "1" → admin/hr ดูคนลาออกได้ (default: เฉพาะ active)
//
// ── สิทธิ์ ──
//   ใครก็ตามที่ login ได้ → ค้นพนักงานในบริษัทตัวเองได้
//     (เพราะ picker ใช้ในหลายฟอร์มที่ไม่ใช่แค่ admin — branch eval, leave approval, etc.)
//   super_admin/hr_admin → ใช้ all_companies=1 / include_inactive=1 ได้
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ employees: [] })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee:employees(id, company_id)")
    .eq("id", user.id).single()
  if (!userData) return NextResponse.json({ employees: [] })

  const role = userData.role ?? ""
  const isAdmin = ["super_admin", "hr_admin"].includes(role)
  const userCompanyId = (userData.employee as any)?.company_id ?? null

  const params = req.nextUrl.searchParams
  const search = (params.get("q") || "").trim()
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "20", 10) || 20, 1), 500)
  const scope = (params.get("scope") || "").toLowerCase()
  const includeInactive = params.get("include_inactive") === "1" && isAdmin

  // ── cross-company access ──
  //   - admin/hr ส่ง all_companies=1 ได้ตามปกติ
  //   - scope=branch_eval → ผู้ใช้ที่มีสิทธิ์ branch_eval ใดๆ (admin/supervisor/evaluator)
  //     ค้นข้ามบริษัทได้ — เพราะระบบประเมินสาขามี hierarchy ข้ามบริษัท
  //     (เช่น PC ในบริษัท A ต้องส่งฟอร์มถึง Area Manager ในบริษัท B)
  let allCompanies = params.get("all_companies") === "1" && isAdmin
  if (!allCompanies && scope === "branch_eval") {
    const { data: bePerms } = await supa.from("branch_eval_permissions")
      .select("role").eq("employee_id", (userData.employee as any)?.id ?? "00000000-0000-0000-0000-000000000000")
      .limit(1)
    if ((bePerms ?? []).length > 0) allCompanies = true
  }

  // ── select รวม feishu_user_id เผื่อ caller อยากแสดงชื่อจีน/ภาษาอื่น ──
  let query = supa.from("employees")
    .select(`id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, email, avatar_url, company_id, feishu_user_id,
      department:departments(name), position:positions(name),
      feishu:feishu_users!feishu_users_goodhr_employee_id_fkey(name_cn, name_en, nickname, brand, job_title)`)
    .order("first_name_th")
    .limit(limit)

  // ── filter active เป็นค่า default ──
  if (!includeInactive) query = query.eq("is_active", true)

  // ── company scope ──
  //   - super_admin → ดูทุกบริษัทได้ (all_companies=1) / ไม่งั้นเฉพาะบริษัทตัวเอง
  //   - hr_admin → เฉพาะบริษัทตัวเอง (เพราะ multi-tenant safety) ยกเว้นแกะออกผ่าน all_companies (ไม่ทำตอนนี้)
  //   - role อื่น (manager, employee) → เฉพาะบริษัทตัวเอง
  if (!allCompanies && userCompanyId) {
    query = query.eq("company_id", userCompanyId)
  }

  if (search) {
    // ค้นแบบหลายฟิลด์
    const k = `%${search.replace(/[%_,()]/g, "")}%`
    query = query.or(
      [
        `first_name_th.ilike.${k}`,
        `last_name_th.ilike.${k}`,
        `first_name_en.ilike.${k}`,
        `last_name_en.ilike.${k}`,
        `nickname.ilike.${k}`,
        `nickname_en.ilike.${k}`,
        `employee_code.ilike.${k}`,
      ].join(","),
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ employees: [], error: error.message }, { status: 500 })
  let employees = data || []

  // ── ถ้ามี search keyword ค่อยลอง fallback ค้นใน feishu_users ──
  //    เช่น ค้น "Clara" (Feishu nickname) → resolve เป็น GoodHR employee คนนั้น
  //    หรือค้น "陈安琪" (ชื่อจีน) → resolve เป็น GoodHR
  if (search && employees.length < limit) {
    const k = `%${search.replace(/[%_,()]/g, "")}%`
    let fquery = supa.from("feishu_users")
      .select(`feishu_user_id, name, name_cn, name_en, nickname, brand, job_title,
        employee:employees!feishu_users_goodhr_employee_id_fkey(
          id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
          nickname, nickname_en, email, avatar_url, company_id, feishu_user_id,
          department:departments(name), position:positions(name)
        )`)
      .not("goodhr_employee_id", "is", null)
      .or([
        `name.ilike.${k}`,
        `name_cn.ilike.${k}`,
        `name_en.ilike.${k}`,
        `nickname.ilike.${k}`,
        `employee_number.ilike.${k}`,
      ].join(","))
      .limit(limit - employees.length)
    const { data: fData } = await fquery
    const existingIds = new Set(employees.map((e: any) => e.id))
    for (const f of (fData ?? [])) {
      const emp: any = (f as any).employee
      if (!emp || existingIds.has(emp.id)) continue
      // company filter
      if (!allCompanies && userCompanyId && emp.company_id !== userCompanyId) continue
      employees.push({
        ...emp,
        feishu: { name_cn: f.name_cn, name_en: f.name_en, nickname: f.nickname, brand: f.brand, job_title: f.job_title },
        _matched_via_feishu: true,
      })
      existingIds.add(emp.id)
    }
  }

  return NextResponse.json({ employees })
}
