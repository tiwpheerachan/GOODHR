import { NextRequest, NextResponse } from "next/server"
import {
  checkBotAuth, svc, resolveEmp, recipient, currentManagerMap, EMP_FIELDS, empName, type EmpLite,
} from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/pending-approvals?manager_employee_id=|manager_feishu_id=&company_id=
//   คำขอที่ "รออนุมัติ" (ลา/OT/แก้เวลา/เช็คอินนอกสถานที่) จัดกลุ่มตามหัวหน้า
//   - ระบุ manager → คืนเฉพาะของหัวหน้าคนนั้น
//   - ไม่ระบุ    → คืนทุกหัวหน้า (ให้ bot วนยิงหาแต่ละคน)
//   ⚠️ ไม่รวมข้อมูลเงินเดือน
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

  // filter หัวหน้า (ถ้าระบุ)
  let onlyManager: EmpLite | null = null
  if (p.get("manager_employee_id") || p.get("manager_feishu_id")) {
    onlyManager = await resolveEmp(s, {
      employee_id: p.get("manager_employee_id"),
      feishu_user_id: p.get("manager_feishu_id"),
    })
    if (!onlyManager) return NextResponse.json({ error: "ไม่พบหัวหน้า" }, { status: 404 })
  }

  // รวมคำขอ pending จากทุกแหล่ง
  type Item = { type: string; id: string; employee_id: string; date: string | null; created_at: string | null }
  const items: Item[] = []
  for (const src of SOURCES) {
    let q = s.from(src.table).select("*").eq("status", "pending").limit(2000)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) continue // ตารางอาจไม่มีในบางระบบ → ข้าม
    for (const r of data ?? []) {
      if (!r.employee_id) continue
      items.push({
        type: src.type,
        id: r.id,
        employee_id: r.employee_id,
        date: r[src.dateField] ?? r.work_date ?? r.start_date ?? null,
        created_at: r.created_at ?? null,
      })
    }
  }

  if (items.length === 0) {
    return NextResponse.json({ managers: [], total_pending: 0 })
  }

  // ชื่อผู้ยื่น + manager ปัจจุบัน
  const empIds = Array.from(new Set(items.map((i) => i.employee_id)))
  const empMap = new Map<string, EmpLite>()
  for (let i = 0; i < empIds.length; i += 300) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", empIds.slice(i, i + 300))
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }
  const mgrMap = await currentManagerMap(s, empIds)

  // group by manager_id
  const byMgr = new Map<string, Item[]>()
  for (const it of items) {
    const mid = mgrMap.get(it.employee_id)
    if (!mid) continue // ไม่มีหัวหน้า → ข้าม (หรือให้ HR จัดการแยก)
    if (onlyManager && mid !== onlyManager.id) continue
    if (!byMgr.has(mid)) byMgr.set(mid, [])
    byMgr.get(mid)!.push(it)
  }

  // ข้อมูลหัวหน้า
  const mgrIds = Array.from(byMgr.keys())
  const mgrEmpMap = new Map<string, EmpLite>()
  for (let i = 0; i < mgrIds.length; i += 300) {
    const { data } = await s.from("employees").select(EMP_FIELDS).in("id", mgrIds.slice(i, i + 300))
    for (const e of (data ?? []) as unknown as EmpLite[]) mgrEmpMap.set(e.id, e)
  }

  const managers = mgrIds.map((mid) => {
    const its = byMgr.get(mid)!
    const counts = { leave: 0, ot: 0, adjustment: 0, offsite: 0, total: its.length }
    its.forEach((i) => { (counts as any)[i.type]++ })
    const mgr = mgrEmpMap.get(mid)
    return {
      manager: mgr ? recipient(mgr) : { employee_id: mid, feishu_user_id: null, name: mid },
      counts,
      items: its.map((i) => ({
        type: i.type, id: i.id,
        employee_id: i.employee_id,
        employee_name: empName(empMap.get(i.employee_id)),
        date: i.date, created_at: i.created_at,
      })),
    }
  }).sort((a, b) => b.counts.total - a.counts.total)

  return NextResponse.json({
    total_pending: items.length,
    managers,
  })
}
