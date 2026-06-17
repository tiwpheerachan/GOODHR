import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// GET /api/employees/[id]/feishu-assets
//   → คืนรายการ asset ทั้งหมดที่พนักงานคนนี้ "ยืม / ครอบครอง" อยู่
//     อิงจาก fields["ผู้ใช้ Feishu用户"] / "ชื่อพนักงาน用户" ที่ match email หรือ feishu_user_id
// ════════════════════════════════════════════════════════════════════

const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]

// ─── User field names ที่จะ scan ในแต่ละ dataset ───
const USER_FIELDS: Record<string, string[]> = {
  asset_main: ["ผู้ใช้ Feishu用户", "หัวหน้าแผนก部门负责人"],
  live:       ["ผู้ใช้ Feishu用户", "หัวหน้าแผนก部门负责人"],
  tel_user:   ["ชื่อพนักงาน用户"],
  tel:        ["ชื่อพนักงาน用户"],
}

const DATASET_LABEL: Record<string, string> = {
  asset_main: "ทรัพย์สิน",
  live:       "อุปกรณ์ Live Room",
  tel_user:   "เบอร์ที่ดูแล",
  tel:        "บิลค่าโทร",
}

// match user array vs identifier list
function userMatches(userArr: any, identifiers: { emails: Set<string>; feishuIds: Set<string>; names: Set<string> }): boolean {
  if (!Array.isArray(userArr)) return false
  for (const u of userArr) {
    if (!u) continue
    if (u.email && identifiers.emails.has(String(u.email).toLowerCase())) return true
    if (u.id && identifiers.feishuIds.has(String(u.id))) return true
    if (u.name && identifiers.names.has(String(u.name).toLowerCase())) return true
    if (u.en_name && identifiers.names.has(String(u.en_name).toLowerCase())) return true
  }
  return false
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = createClient()
  const { data: { user } } = await cookie.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const empId = params.id

  // ── 1) Get employee + linked Feishu identifiers ──
  const { data: emp } = await svc.from("employees")
    .select(`id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, email, phone, feishu_user_id,
             feishu:feishu_users!feishu_users_goodhr_employee_id_fkey(feishu_user_id, name, name_en, nickname, email, email_work, email_business)`)
    .eq("id", empId).maybeSingle()
  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })

  const feishuRow: any = Array.isArray((emp as any).feishu) ? (emp as any).feishu[0] : (emp as any).feishu

  // เก็บ identifier ทุกแบบ
  const emails = new Set<string>()
  const feishuIds = new Set<string>()
  const names = new Set<string>()

  if (emp.email) emails.add(emp.email.toLowerCase())
  if (feishuRow) {
    if (feishuRow.email) emails.add(feishuRow.email.toLowerCase())
    if (feishuRow.email_work) emails.add(feishuRow.email_work.toLowerCase())
    if (feishuRow.email_business) emails.add(feishuRow.email_business.toLowerCase())
    if (feishuRow.feishu_user_id) feishuIds.add(feishuRow.feishu_user_id)
    if (feishuRow.name) names.add(feishuRow.name.toLowerCase())
    if (feishuRow.name_en) names.add(feishuRow.name_en.toLowerCase())
    if (feishuRow.nickname) names.add(feishuRow.nickname.toLowerCase())
  }
  if (emp.feishu_user_id) feishuIds.add(emp.feishu_user_id)
  // also try GoodHR names (เผื่อ Feishu user ใช้ชื่อเดียวกัน)
  if (emp.first_name_en && emp.nickname) names.add(`${emp.nickname} - ${emp.first_name_en}`.toLowerCase())
  if (emp.nickname) names.add(emp.nickname.toLowerCase())
  if (emp.nickname_en) names.add(emp.nickname_en.toLowerCase())
  if (emp.first_name_en) names.add(emp.first_name_en.toLowerCase())

  const identifiers = { emails, feishuIds, names }

  // ถ้าไม่มี identifier เลย → return ว่าง
  if (emails.size === 0 && feishuIds.size === 0 && names.size === 0) {
    return NextResponse.json({ employee: emp, identifiers_used: 0, results: {}, total: 0 })
  }

  // ── 2) Scan ทุก dataset ──
  const results: Record<string, any[]> = {
    asset_main: [], live: [], tel_user: [], tel: [],
  }
  const matchRoleByDataset: Record<string, Record<string, string>> = {
    asset_main: {}, live: {}, tel_user: {}, tel: {},
  }

  // 2a) feishu_asset_twoway (asset_main, live, tel_user)
  const { data: twoway } = await svc.from("feishu_asset_twoway")
    .select("dataset, feishu_record_id, fields, edit, updated_at, updated_by")
  for (const r of (twoway ?? [])) {
    const fields: any = r.fields || {}
    const userFields = USER_FIELDS[r.dataset] || []
    let role: string | null = null
    for (const fname of userFields) {
      if (userMatches(fields[fname], identifiers)) {
        role = fname
        break
      }
    }
    if (role) {
      results[r.dataset]?.push(r)
      matchRoleByDataset[r.dataset][r.feishu_record_id] = role
    }
  }

  // 2b) feishu_tel_records (tel)
  const { data: tel } = await svc.from("feishu_tel_records")
    .select("feishu_record_id, fields, chk, note, files, updated_at, updated_by")
  for (const r of (tel ?? [])) {
    const fields: any = r.fields || {}
    const userFields = USER_FIELDS["tel"] || []
    for (const fname of userFields) {
      if (userMatches(fields[fname], identifiers)) {
        results.tel.push(r)
        matchRoleByDataset.tel[r.feishu_record_id] = fname
        break
      }
    }
  }

  const total = Object.values(results).reduce((s, arr) => s + arr.length, 0)

  return NextResponse.json({
    employee: {
      id: emp.id, employee_code: emp.employee_code,
      name: `${emp.first_name_th} ${emp.last_name_th}`,
      nickname: emp.nickname,
    },
    identifiers_used: { emails: Array.from(emails), feishuIds: Array.from(feishuIds), names: Array.from(names) },
    results,
    total,
    summary: {
      asset_main: results.asset_main.length,
      live:       results.live.length,
      tel_user:   results.tel_user.length,
      tel:        results.tel.length,
    },
    match_roles: matchRoleByDataset,
    dataset_labels: DATASET_LABEL,
  })
}
