import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// GET /api/branch-eval/me — สิทธิ์ปัจจุบัน + branches ที่ทำได้
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  return NextResponse.json({
    can_manage: access.isEvalAdmin || access.isSupervisor,                       // CRUD
    can_access: access.isEvalAdmin || access.isSupervisor || access.isEvaluator, // เข้าหน้าได้
    is_eval_admin: access.isEvalAdmin,
    is_supervisor: access.isSupervisor,
    is_evaluator: access.isEvaluator,
    is_base_admin: access.isBaseAdmin,
    supervisor_branch_ids: access.supervisorBranchIds,
    evaluator_branch_ids: access.evaluatorBranchIds,
    employee_id: access.employeeId,
  })
}
