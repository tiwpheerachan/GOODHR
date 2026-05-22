// ════════════════════════════════════════════════════════════════════
// Branch Evaluation Permissions Helper
// ════════════════════════════════════════════════════════════════════
// Roles:
//   - "branch_eval_admin"      → full CRUD ทุกอย่าง (templates + ทุกสาขา)
//   - "branch_eval_supervisor" → ดูแลเฉพาะสาขาที่ได้รับ (CRUD evaluation ทุกอันในสาขา)
//   - "branch_eval_evaluator"  → กรอกประเมินเฉพาะสาขาที่ได้รับ (เห็นแค่ของตัวเอง)
//
// Super admin / hr_admin → admin โดยปริยาย
// ════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js"

export type BranchEvalRole = "branch_eval_admin" | "branch_eval_supervisor" | "branch_eval_evaluator"

export type BranchEvalAccess = {
  isBaseAdmin: boolean
  isEvalAdmin: boolean
  isSupervisor: boolean
  isEvaluator: boolean
  supervisorBranchIds: string[]   // full CRUD on these branches
  evaluatorBranchIds: string[]    // can submit/edit own evaluations on these branches
  employeeId: string | null
  companyId: string | null
}

export async function getBranchEvalAccess(
  svc: SupabaseClient,
  userId: string,
): Promise<BranchEvalAccess> {
  const { data: dbUser } = await svc
    .from("users")
    .select("role, employee_id, employees(company_id)")
    .eq("id", userId)
    .single()

  if (!dbUser) {
    return {
      isBaseAdmin: false, isEvalAdmin: false, isSupervisor: false, isEvaluator: false,
      supervisorBranchIds: [], evaluatorBranchIds: [],
      employeeId: null, companyId: null,
    }
  }

  const isBaseAdmin = ["super_admin", "hr_admin"].includes(dbUser.role)
  const employeeId = dbUser.employee_id ?? null
  const companyId = (dbUser.employees as any)?.company_id ?? null

  if (!employeeId) {
    return {
      isBaseAdmin, isEvalAdmin: isBaseAdmin, isSupervisor: false, isEvaluator: false,
      supervisorBranchIds: [], evaluatorBranchIds: [],
      employeeId: null, companyId,
    }
  }

  const { data: perms } = await svc
    .from("branch_eval_permissions")
    .select("role, branch_id")
    .eq("employee_id", employeeId)

  const list = (perms ?? []) as any[]
  const isEvalAdmin = isBaseAdmin || list.some(p => p.role === "branch_eval_admin")
  const supervisorBranchIds = list
    .filter(p => p.role === "branch_eval_supervisor" && p.branch_id)
    .map(p => p.branch_id as string)
  const evaluatorBranchIds = list
    .filter(p => p.role === "branch_eval_evaluator" && p.branch_id)
    .map(p => p.branch_id as string)

  return {
    isBaseAdmin, isEvalAdmin,
    isSupervisor: supervisorBranchIds.length > 0,
    isEvaluator: evaluatorBranchIds.length > 0,
    supervisorBranchIds, evaluatorBranchIds,
    employeeId, companyId,
  }
}

/** จัดการสาขา (CRUD evaluation, ดูทุกอันใน branch, edit, review) — admin หรือ supervisor ของ branch นี้ */
export function canManageBranch(access: BranchEvalAccess, branchId: string | null): boolean {
  if (!branchId) return access.isEvalAdmin
  if (access.isEvalAdmin) return true
  return access.supervisorBranchIds.includes(branchId)
}

/** กรอกประเมิน — admin / supervisor / evaluator ของ branch นี้ */
export function canFillBranch(access: BranchEvalAccess, branchId: string | null): boolean {
  if (!branchId) return access.isEvalAdmin
  if (canManageBranch(access, branchId)) return true
  return access.evaluatorBranchIds.includes(branchId)
}

/** ดู evaluation — admin/supervisor เห็นหมด, evaluator เห็นเฉพาะของตัวเอง */
export function canViewEvaluation(
  access: BranchEvalAccess, branchId: string, evaluatorId: string,
): boolean {
  if (canManageBranch(access, branchId)) return true
  // evaluator → เห็นแค่ของตัวเอง
  if (access.evaluatorBranchIds.includes(branchId) && evaluatorId === access.employeeId) return true
  return false
}

/** ทุก branch ที่ user เข้าถึงได้ (manage + fill) */
export function getAccessibleBranchIds(access: BranchEvalAccess): string[] | "ALL" {
  if (access.isEvalAdmin) return "ALL"
  return Array.from(new Set([...access.supervisorBranchIds, ...access.evaluatorBranchIds]))
}

/** ทุก branch ที่ user "จัดการ" ได้ — admin/supervisor only */
export function getManagedBranchIds(access: BranchEvalAccess): string[] | "ALL" {
  if (access.isEvalAdmin) return "ALL"
  return Array.from(new Set(access.supervisorBranchIds))
}

/** Haversine — ระยะทาง (m) ระหว่างจุด GPS 2 จุด */
export function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
