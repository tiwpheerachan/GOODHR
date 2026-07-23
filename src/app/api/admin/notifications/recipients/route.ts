import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

const empName = (e: any) => `${e?.first_name_th || ""} ${e?.last_name_th || ""}${e?.nickname ? ` (${e.nickname})` : ""}`.trim() || e?.employee_code || "-"

// GET ?group=managers|department|all&department_id=&company_id=
//     ?list=departments   → คืนรายการแผนกไว้ทำ dropdown
//   คืนพนักงานตามกลุ่ม (เอาไว้เลือกผู้รับทีเดียว)
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const p = req.nextUrl.searchParams

  if (p.get("list") === "departments") {
    const { data } = await g.svc.from("departments").select("id, name").order("name")
    return NextResponse.json({ departments: data ?? [] })
  }

  const group = p.get("group") || "all"
  const companyId = p.get("company_id")
  const sel = "id, employee_code, first_name_th, last_name_th, nickname"

  // หัวหน้า = manager_id ที่ active ใน employee_manager_history
  if (group === "managers") {
    const { data: mh } = await g.svc.from("employee_manager_history").select("manager_id").is("effective_to", null)
    const ids = Array.from(new Set((mh ?? []).map((r: any) => r.manager_id).filter(Boolean)))
    if (!ids.length) return NextResponse.json({ employees: [] })
    const out: any[] = []
    for (let i = 0; i < ids.length; i += 300) {
      let q = g.svc.from("employees").select(sel).in("id", ids.slice(i, i + 300)).not("employment_status", "in", "(resigned,terminated)")
      if (companyId) q = q.eq("company_id", companyId)
      const { data } = await q
      out.push(...(data ?? []))
    }
    return NextResponse.json({ employees: out.map((e) => ({ id: e.id, name: empName(e), employee_code: e.employee_code })) })
  }

  // ทั้งแผนก
  if (group === "department") {
    const dep = p.get("department_id")
    if (!dep) return NextResponse.json({ error: "ต้องระบุ department_id" }, { status: 400 })
    const { data } = await g.svc.from("employees").select(sel).eq("department_id", dep).not("employment_status", "in", "(resigned,terminated)")
    return NextResponse.json({ employees: (data ?? []).map((e: any) => ({ id: e.id, name: empName(e), employee_code: e.employee_code })) })
  }

  // ทั้งหมด (active)
  const out: any[] = []
  let from = 0
  while (true) {
    let q = g.svc.from("employees").select(sel).not("employment_status", "in", "(resigned,terminated)").order("id").range(from, from + 999)
    if (companyId) q = q.eq("company_id", companyId)
    const { data } = await q
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return NextResponse.json({ employees: out.map((e) => ({ id: e.id, name: empName(e), employee_code: e.employee_code })) })
}
