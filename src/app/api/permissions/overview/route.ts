import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// GET /api/permissions/overview
//   รวบรวมจำนวนคน + รายชื่อ preview ของทุก permission category
//   ใช้ใน /admin/permissions dashboard
//
// สิทธิ์: เฉพาะ super_admin / hr_admin
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const { data: me } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!me || !["super_admin", "hr_admin"].includes(me.role)) {
    return NextResponse.json({ error: "เฉพาะ HR/Super admin" }, { status: 403 })
  }

  // เผื่อ select reusable
  const empSel = "id, employee_code, first_name_th, last_name_th, nickname, avatar_url, department:departments(name), position:positions(name)"

  // ── 1. System role (users.role) ──
  const { data: usersByRole } = await svc.from("users")
    .select(`role, is_active, employee:employees(${empSel})`)
    .eq("is_active", true)
    .not("employee_id", "is", null)

  const systemRoles: Record<string, any[]> = { super_admin: [], hr_admin: [], manager: [], employee: [], equipment_admin: [] }
  for (const u of (usersByRole ?? []) as any[]) {
    if (systemRoles[u.role] && u.employee) systemRoles[u.role].push(u.employee)
  }

  // ── 2. Branch eval permissions ──
  const { data: bePerms } = await svc.from("branch_eval_permissions")
    .select(`role, employee:employees!branch_eval_permissions_employee_id_fkey(${empSel}), branch:branches(id, name, code)`)

  const branchEval: Record<string, any[]> = { branch_eval_admin: [], branch_eval_supervisor: [], branch_eval_evaluator: [] }
  for (const p of (bePerms ?? []) as any[]) {
    if (branchEval[p.role] && p.employee) {
      branchEval[p.role].push({ ...p.employee, branch: p.branch })
    }
  }

  // ── 3. Training permissions ──
  let training: Record<string, any[]> = { training_admin: [], training_supervisor: [], training_viewer: [] }
  try {
    const { data: tpPerms } = await svc.from("training_permissions")
      .select(`role, scope, employee:employees!training_permissions_employee_id_fkey(${empSel}), channel:training_channels(id, name)`)
    for (const p of (tpPerms ?? []) as any[]) {
      if (training[p.role] && p.employee) {
        training[p.role].push({ ...p.employee, channel: p.channel, scope: p.scope })
      }
    }
  } catch {/* table อาจไม่มี */}

  // ── 4. Additional evaluators ──
  let evaluators: Record<string, any[]> = { kpi: [], probation: [], all: [], view_only: [] }
  try {
    const { data: addEvals } = await svc.from("employee_evaluators")
      .select(`scope, evaluator:employees!employee_evaluators_evaluator_id_fkey(${empSel}), evaluatee:employees!employee_evaluators_employee_id_fkey(id, first_name_th, last_name_th, employee_code)`)
    for (const e of (addEvals ?? []) as any[]) {
      const sc = e.scope ?? "all"
      if (evaluators[sc] && e.evaluator) {
        evaluators[sc].push({ ...e.evaluator, evaluatee: e.evaluatee })
      }
    }
  } catch {/* ignore */}

  // ── 5. Product sales permissions ──
  let sales: Record<string, any[]> = { admin: [], manager: [], staff: [] }
  try {
    const { data: ps } = await svc.from("product_sale_permissions")
      .select(`access_level, employee:employees!product_sale_permissions_employee_id_fkey(${empSel}), default_branch_name`)
    for (const p of (ps ?? []) as any[]) {
      if (sales[p.access_level] && p.employee) {
        sales[p.access_level].push({ ...p.employee, default_branch: p.default_branch_name })
      }
    }
  } catch {/* ignore */}

  return NextResponse.json({
    system_roles: systemRoles,
    branch_eval: branchEval,
    training,
    evaluators,
    sales,
  })
}
