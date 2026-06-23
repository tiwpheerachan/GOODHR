import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getManageableEmployees } from "@/lib/utils/evaluator-chain"

// ════════════════════════════════════════════════════════════════════
// GET /api/manager/team-chain
//   ดึงลูกน้อง "ในสาย" ของหัวหน้า — direct + skip-1 + additional evaluators
//   ใช้ helper ตัวเดียวกับ KPI/Probation eval เพื่อให้ behavior สอดคล้องกัน
//
//   ส่งกลับ:
//     members: [{ id, employee_code, full_name, position, department, relation,
//                 brand, brand_allocations, ... }]
// ════════════════════════════════════════════════════════════════════
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(id, company_id)")
    .eq("id", user.id).single()
  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const empId = (userData as any).employee_id as string | undefined
  const role = (userData as any).role
  const isAdmin = ["super_admin", "hr_admin"].includes(role)

  // ── ดึง chain (direct + skip-1 + additional) — เหมือนหัวหน้าทุกคน ──
  //   ไม่มี admin override ที่ดึงทั้งบริษัท — หัวหน้า (รวม admin) เห็นเฉพาะลูกน้องในสายตัวเอง
  //   (Admin ถ้าอยากเห็นทุกคน ใช้หน้า /admin/employees แทน)
  let chain: any[] = []
  if (empId) {
    chain = await getManageableEmployees(supa, empId, null) as any[]
  }

  if (chain.length === 0) {
    return NextResponse.json({ members: [], balances: {}, is_admin: isAdmin })
  }

  // ── 2) ดึง brand + brand_allocations + email/phone (extra fields) สำหรับทุกคน ──
  const ids = chain.map((c: any) => c.id)
  const { data: extraData } = await supa.from("employees")
    .select("id, brand, brand_allocations, email, phone")
    .in("id", ids)
  const extraMap = new Map<string, any>()
  for (const e of (extraData ?? [])) extraMap.set(e.id, e)

  // ── 3) ดึง leave balances สำหรับทุกคน (ปีปัจจุบัน) ──
  const year = new Date().getFullYear()
  const { data: bals } = await supa.from("leave_balances")
    .select("*, leave_type:leave_types(name, color_hex)")
    .in("employee_id", ids).eq("year", year)
  const balByEmp: Record<string, any[]> = {}
  for (const b of (bals ?? [])) {
    if (!balByEmp[b.employee_id]) balByEmp[b.employee_id] = []
    balByEmp[b.employee_id].push(b)
  }

  // ── 4) Shape response ──
  const members = chain.map((c: any) => {
    const ex = extraMap.get(c.id) ?? {}
    return {
      ...c,
      email: ex.email ?? null,
      phone: ex.phone ?? null,
      brand: ex.brand ?? null,
      brand_allocations: ex.brand_allocations ?? null,
    }
  })

  return NextResponse.json({
    members,
    balances: balByEmp,
    is_admin: isAdmin,
  })
}
