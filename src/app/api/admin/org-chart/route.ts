import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// GET /api/admin/org-chart?company_id=...
// Returns full org tree as nested nodes
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin", "manager"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const reqCompanyId = req.nextUrl.searchParams.get("company_id")
  const filterCompany = (dbUser.role === "super_admin" && reqCompanyId)
    ? reqCompanyId
    : (dbUser.role === "super_admin" ? null : dbUser.company_id)

  // ── 1) ดึงพนักงาน active ทั้งหมด ──
  let empQ = svc.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, company_id, position:positions(name), department:departments(name), company:companies(name_th)")
    .eq("is_active", true).is("deleted_at", null)
  if (filterCompany) empQ = empQ.eq("company_id", filterCompany)
  const { data: emps } = await empQ

  // ── 2) ดึง manager_history (active) ──
  const { data: hist } = await svc.from("employee_manager_history")
    .select("employee_id, manager_id")
    .is("effective_to", null)

  // ── 3) ดึง additional evaluators ──
  let additional: any[] = []
  try {
    const { data: adds } = await svc.from("employee_evaluators")
      .select("employee_id, evaluator_id, scope")
    additional = adds ?? []
  } catch {}

  // ── 4) สร้าง index ──
  const directMgrMap = new Map<string, string>() // employee → manager
  const reportsMap = new Map<string, string[]>() // manager → [subs]
  for (const r of (hist ?? [])) {
    directMgrMap.set(r.employee_id, r.manager_id)
    if (!reportsMap.has(r.manager_id)) reportsMap.set(r.manager_id, [])
    reportsMap.get(r.manager_id)!.push(r.employee_id)
  }

  const empMap = new Map((emps ?? []).map((e: any) => [e.id, e]))

  // ── 5) หา root nodes — พนักงานที่ "ไม่มีหัวหน้าอยู่ในชุดที่กรอง" ──
  //    (ไม่มีหัวหน้าเลย หรือ หัวหน้าอยู่คนละบริษัท/ถูกกรองออก) จึงเป็น root ของผังนี้
  //    เดิม: root ต้องเป็น "หัวหน้า" (มีลูกน้อง) เท่านั้น → คนที่ไม่มีลูกน้องและหัวหน้าอยู่คนละบริษัท
  //          เลยหายทั้งหมดตอนกรองบริษัท (เช่น HASHTAG ที่หัวหน้าอยู่ SHD)
  const tops: string[] = []
  const empIds = Array.from(empMap.keys()) as string[]
  for (const id of empIds) {
    const mgrId = directMgrMap.get(id)
    const mgrInSet = !!mgrId && empMap.has(mgrId)
    if (!mgrInSet) tops.push(id)
  }

  // ── 6) สร้าง tree (recursive) ──
  function buildNode(empId: string, depth = 0, visited = new Set<string>()): any {
    if (visited.has(empId)) return null
    visited.add(empId)
    const e = empMap.get(empId) as any
    if (!e) return null

    const subs = (reportsMap.get(empId) ?? [])
      .map(sid => buildNode(sid, depth + 1, visited))
      .filter(Boolean)

    return {
      id: e.id,
      employee_code: e.employee_code,
      first_name_th: e.first_name_th,
      last_name_th: e.last_name_th,
      first_name_en: e.first_name_en,
      last_name_en: e.last_name_en,
      nickname: e.nickname,
      nickname_en: e.nickname_en,
      avatar_url: e.avatar_url,
      position: e.position?.name ?? null,
      department: e.department?.name ?? null,
      company: e.company?.name_th ?? null,
      depth,
      subs_count: subs.length,
      children: subs,
    }
  }

  const trees = tops.map(id => buildNode(id)).filter(Boolean)

  // ── 7) คำนวณ stats ──
  const stats = {
    total_employees: emps?.length ?? 0,
    total_managers: reportsMap.size,
    total_top_level: tops.length,
    additional_evaluators: additional.length,
  }

  return NextResponse.json({ trees, stats })
}
