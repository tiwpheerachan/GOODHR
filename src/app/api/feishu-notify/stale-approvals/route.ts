import { NextRequest, NextResponse } from "next/server"
import {
  checkBotAuth, svc, resolveEmp, recipient, currentManagerMap, EMP_FIELDS, empName, chunk, type EmpLite,
} from "@/lib/feishu-notify"
import { filterEnabled } from "@/lib/notif-rollout"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/stale-approvals?days=3&company_id=&manager_employee_id=|manager_feishu_id=
//   คำขอที่ "ค้างอนุมัติเกิน <days> วัน" → กระทุ้งหัวหน้า (จัดกลุ่มตามหัวหน้า)
//   days default 3 · ระบุ manager → เฉพาะคนนั้น
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
const SOURCES: { table: string; type: string; dateField: string }[] = [
  { table: "leave_requests", type: "leave", dateField: "start_date" },
  { table: "overtime_requests", type: "ot", dateField: "work_date" },
  { table: "time_adjustment_requests", type: "adjustment", dateField: "work_date" },
  { table: "offsite_checkin_requests", type: "offsite", dateField: "created_at" },
]

export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const days = Math.max(0, parseInt(p.get("days") || "3") || 3)
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()   // เก่ากว่านี้ = ค้างนาน
  // offsite ค้าง pending สะสมนับพัน (flow ไม่ค่อยกดอนุมัติ) → ตัดออก default กันกลบ ลา/OT
  const includeOffsite = p.get("include_offsite") === "1"

  let onlyManager: EmpLite | null = null
  if (p.get("manager_employee_id") || p.get("manager_feishu_id")) {
    onlyManager = await resolveEmp(s, {
      employee_id: p.get("manager_employee_id"),
      feishu_user_id: p.get("manager_feishu_id"),
    })
    if (!onlyManager) return NextResponse.json({ error: "ไม่พบหัวหน้า" }, { status: 404 })
  }

  type Item = { type: string; id: string; employee_id: string; date: string | null; created_at: string | null; age_days: number }
  const items: Item[] = []
  const now = Date.now()
  for (const src of SOURCES) {
    if (src.type === "offsite" && !includeOffsite) continue
    let q = s.from(src.table).select("*").eq("status", "pending").lte("created_at", cutoff).limit(2000)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) continue
    for (const r of (data ?? []) as any[]) {
      if (!r.employee_id) continue
      const created = r.created_at ? new Date(r.created_at).getTime() : now
      items.push({
        type: src.type, id: r.id, employee_id: r.employee_id,
        date: r[src.dateField] ?? r.work_date ?? r.start_date ?? null,
        created_at: r.created_at ?? null,
        age_days: Math.floor((now - created) / 86_400_000),
      })
    }
  }
  if (items.length === 0) return NextResponse.json({ days, total_stale: 0, managers: [] })

  // ผู้ยื่น + หัวหน้าปัจจุบัน
  const empIds = Array.from(new Set(items.map((i) => i.employee_id)))
  const empMap = new Map<string, EmpLite>()
  for (const c of chunk(empIds, 300)) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", c)
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }
  const mgrMap = await currentManagerMap(s, empIds)

  const byMgr = new Map<string, Item[]>()
  for (const it of items) {
    const mid = mgrMap.get(it.employee_id)
    if (!mid) continue
    if (onlyManager && mid !== onlyManager.id) continue
    if (!byMgr.has(mid)) byMgr.set(mid, [])
    byMgr.get(mid)!.push(it)
  }

  const mgrIds = Array.from(byMgr.keys())
  const mgrEmpMap = new Map<string, EmpLite>()
  for (const c of chunk(mgrIds, 300)) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", c)
    for (const e of (data ?? []) as unknown as EmpLite[]) mgrEmpMap.set(e.id, e)
  }

  const managers = mgrIds.map((mid) => {
    const its = byMgr.get(mid)!.sort((a, b) => b.age_days - a.age_days)
    const mgr = mgrEmpMap.get(mid)
    return {
      manager: mgr ? recipient(mgr) : { employee_id: mid, feishu_user_id: null, name: mid },
      stale_count: its.length,
      max_age_days: its[0]?.age_days ?? 0,
      items: its.map((i) => ({
        type: i.type, id: i.id, employee_id: i.employee_id,
        employee_name: empName(empMap.get(i.employee_id)),
        date: i.date, created_at: i.created_at, age_days: i.age_days,
      })),
    }
  }).sort((a, b) => b.max_age_days - a.max_age_days)

  const gatedM = p.get("rollout") !== "0" ? await filterEnabled(s, managers, (m: any) => m.manager?.employee_id) : managers
  return NextResponse.json({ days, total_stale: items.length, manager_count: gatedM.length, managers: gatedM })
}
