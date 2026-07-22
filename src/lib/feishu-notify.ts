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
//   fmap = Feishu ID "ของจริง" จากตาราง feishu_users (import จาก Feishu API)
//   ผูกด้วย feishu_users.goodhr_employee_id → เชื่อถือได้กว่า employees.feishu_user_id (ปน placeholder)
export const EMP_FIELDS =
  "id, employee_code, feishu_user_id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, employment_status, company_id, branch:branches(id,name), department:departments(id,name), position:positions(id,name), fmap:feishu_users!feishu_users_goodhr_employee_id_fkey(feishu_user_id,open_id,status)"

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
  fmap?: { feishu_user_id: string | null; open_id: string | null; status: string | null }[] | null
}

// เลือกแถว feishu_users ที่ดีสุด (Active ก่อน → มี id ก่อน)
function bestFmap(e: Partial<EmpLite> | null | undefined): any | null {
  const rows = (e as any)?.fmap
  if (!Array.isArray(rows) || !rows.length) return null
  return rows.find((r: any) => (r.status || "").toLowerCase() === "active" && (r.feishu_user_id || r.open_id))
      ?? rows.find((r: any) => r.feishu_user_id || r.open_id)
      ?? null
}
// ── Feishu ID ที่ใช้ยิงจริง (user_id): feishu_users ก่อน → fallback employees.feishu_user_id ──
export function realFeishuId(e: Partial<EmpLite> | null | undefined): string | null {
  return bestFmap(e)?.feishu_user_id ?? e?.feishu_user_id ?? null
}
// ── open_id (สำหรับบอทที่ยิงด้วย receive_id_type=open_id) ──
export function realOpenId(e: Partial<EmpLite> | null | undefined): string | null {
  return bestFmap(e)?.open_id ?? null
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
    feishu_user_id: realFeishuId(e),      // ✅ user_id จริงจาก feishu_users (fallback employees) — null = ยังไม่ผูก
    feishu_open_id: realOpenId(e),        // ✅ open_id (บอทเลือกยิงด้วย open_id/user_id ก็ได้)
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
  // ระบุด้วย Feishu ID → หาใน feishu_users (authoritative) ก่อน แล้ว map เป็น goodhr_employee_id
  //   บอทส่ง open_id (ou_.../on_...) หรือ user_id (สั้น) มาก็ได้ → resolve ถูกคนเสมอ
  //   ⚠️ ไม่เจอ = คืน null ("ไม่พบพนักงาน") ไม่มีทางคืนคนผิด
  if (params.feishu_user_id && !params.employee_id) {
    const fid = params.feishu_user_id
    const isOpen = /^(ou_|on_)/.test(fid)
    const col = isOpen ? "open_id" : "feishu_user_id"
    const { data: fu } = await s.from("feishu_users")
      .select("goodhr_employee_id")
      .eq(col, fid)
      .not("goodhr_employee_id", "is", null)
      .limit(1).maybeSingle()
    if (fu?.goodhr_employee_id) {
      const { data } = await s.from("employees").select(EMP_FIELDS).eq("id", fu.goodhr_employee_id).limit(1).maybeSingle()
      if (data) return data as unknown as EmpLite
    }
    // fallback: employees.feishu_user_id (เฉพาะกรณี user_id — legacy)
    if (!isOpen) {
      const { data } = await s.from("employees").select(EMP_FIELDS).eq("feishu_user_id", fid).limit(1).maybeSingle()
      return (data as unknown as EmpLite) ?? null
    }
    return null
  }

  let q = s.from("employees").select(EMP_FIELDS).limit(1)
  if (params.employee_id) q = q.eq("id", params.employee_id)
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

// ── utils ที่ใช้ร่วมในหลาย endpoint ──
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
// "HH:MM[:SS]" → นาทีจากเที่ยงคืน (null ถ้าพาร์สไม่ได้)
export function toMin(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null
}
// เวลาปัจจุบันเป็นนาที (โซนไทย)
export function nowMinTH(): number {
  const th = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour12: false })
  return toMin(th) ?? 0
}

// ── หา HR/Admin (role hr_admin|super_admin) ที่ผูก Feishu → EmpLite[] ──
export async function hrRecipients(s: any, companyId?: string | null): Promise<EmpLite[]> {
  const { data: us } = await s.from("users")
    .select("employee_id, role")
    .in("role", ["hr_admin", "super_admin"])
  const ids = Array.from(new Set((us ?? []).map((u: any) => u.employee_id).filter(Boolean)))
  if (ids.length === 0) return []
  const out: EmpLite[] = []
  for (const c of chunk(ids as string[], 300)) {
    let q = s.from("employees").select(EMP_FIELDS).in("id", c)
      .not("employment_status", "in", "(resigned,terminated)")
    if (companyId) q = q.eq("company_id", companyId)
    const { data } = await q
    out.push(...((data ?? []) as unknown as EmpLite[]))
  }
  return out
}
