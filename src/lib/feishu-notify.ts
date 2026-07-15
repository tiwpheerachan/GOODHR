// ════════════════════════════════════════════════════════════════════
// Feishu Notify — helper ร่วมสำหรับชุด API แจ้งเตือน (/api/feishu-notify/*)
//   • ตัวส่งข้อความ Feishu อยู่ที่ service ภายนอก — ที่นี่คือ API ดึงข้อมูล/trigger
//   • ระบุผู้รับด้วย employees.feishu_user_id (ใช้เป็น receive_id_type=user_id)
//   • auth = Bearer FEISHU_BOT_SECRET (service-to-service, ไม่มี user session)
//   • ⚠️ ห้ามคืนข้อมูลเงินเดือน/payroll ในชุด API นี้
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// ── auth: ตรวจ bearer secret ──
export function checkBotAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.FEISHU_BOT_SECRET || process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "server missing FEISHU_BOT_SECRET" }, { status: 500 })
  }
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("secret") || ""
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function svc() {
  return createServiceClient()
}

// ── เวลา (Asia/Bangkok) ──
export function todayTH(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) // YYYY-MM-DD
}
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString("en-CA")
}
// ช่วงวันจาก range: today | week (7 วันย้อนหลัง) | month (เดือนปัจจุบัน)
export function rangeToDates(range: string | null, from?: string | null, to?: string | null): { from: string; to: string } {
  const today = todayTH()
  if (from && to) return { from, to }
  if (range === "week") return { from: addDays(today, -6), to: today }
  if (range === "month") return { from: today.slice(0, 8) + "01", to: today }
  return { from: today, to: today }
}

// ── ฟิลด์พนักงานมาตรฐาน (ไม่มีข้อมูลเงินเดือน) ──
export const EMP_FIELDS =
  "id, employee_code, feishu_user_id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, employment_status, company_id, branch:branches(id,name), department:departments(id,name), position:positions(id,name)"

export type EmpLite = {
  id: string
  employee_code: string | null
  feishu_user_id: string | null
  first_name_th: string | null; last_name_th: string | null
  first_name_en: string | null; last_name_en: string | null
  nickname: string | null; nickname_en: string | null
  avatar_url: string | null
  employment_status: string | null
  company_id: string | null
  branch?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  position?: { id: string; name: string } | null
}

export function empName(e: Partial<EmpLite> | null | undefined): string {
  if (!e) return ""
  const f = e.first_name_th || e.first_name_en || ""
  const l = e.last_name_th || e.last_name_en || ""
  const nick = e.nickname ? ` (${e.nickname})` : ""
  return `${f} ${l}${nick}`.trim()
}

// ── ข้อมูลผู้รับที่ bot ต้องใช้ยิง Feishu ──
export function recipient(e: EmpLite) {
  return {
    employee_id: e.id,
    employee_code: e.employee_code,
    feishu_user_id: e.feishu_user_id,     // ⚠️ receive_id ของ Feishu (null = ยังไม่ผูก Feishu)
    name: empName(e),
    department: e.department?.name ?? null,
    branch: e.branch?.name ?? null,
    position: e.position?.name ?? null,
    avatar_url: e.avatar_url ?? null,
  }
}

// ── resolve พนักงานจาก employee_id | feishu_user_id | email ──
export async function resolveEmp(
  s: any,
  params: { employee_id?: string | null; feishu_user_id?: string | null; email?: string | null },
): Promise<EmpLite | null> {
  let q = s.from("employees").select(EMP_FIELDS).limit(1)
  if (params.employee_id) q = q.eq("id", params.employee_id)
  else if (params.feishu_user_id) q = q.eq("feishu_user_id", params.feishu_user_id)
  else if (params.email) q = q.ilike("email", params.email)
  else return null
  const { data } = await q.maybeSingle()
  return (data as unknown as EmpLite) ?? null
}

// ── หา manager_id ปัจจุบันของพนักงานหลายคน → Map<employee_id, manager_id> ──
export async function currentManagerMap(s: any, employeeIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (employeeIds.length === 0) return map
  for (let i = 0; i < employeeIds.length; i += 300) {
    const chunk = employeeIds.slice(i, i + 300)
    const { data } = await s.from("employee_manager_history")
      .select("employee_id, manager_id")
      .in("employee_id", chunk)
      .is("effective_to", null)
    for (const r of data ?? []) {
      if (r.employee_id && r.manager_id && !map.has(r.employee_id)) map.set(r.employee_id, r.manager_id)
    }
  }
  return map
}

// ── หาลูกทีมปัจจุบันของ manager → employee_id[] ──
export async function teamMemberIds(s: any, managerId: string): Promise<string[]> {
  const { data } = await s.from("employee_manager_history")
    .select("employee_id")
    .eq("manager_id", managerId)
    .is("effective_to", null)
  return Array.from(new Set((data ?? []).map((r: any) => r.employee_id).filter(Boolean)))
}
