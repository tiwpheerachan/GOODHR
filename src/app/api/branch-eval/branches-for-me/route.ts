import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, getAccessibleBranchIds } from "@/lib/utils/branch-eval-permissions"

// GET — สาขาที่ user เข้าถึงได้สำหรับการประเมิน
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor && !access.isEvaluator) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const ids = getAccessibleBranchIds(access)
  let q = svc.from("branches")
    .select("id, code, name, latitude, longitude, geo_radius_m, company_id, company:companies(name_th, name)")
    .order("name")

  if (ids !== "ALL") {
    if (ids.length === 0) return NextResponse.json({ branches: [] })
    q = q.in("id", ids)
  } else if (access.companyId) {
    q = q.eq("company_id", access.companyId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tag each branch with the user's role for it
  const branches = (data ?? []).map((b: any) => ({
    ...b,
    user_role: access.isEvalAdmin ? "admin"
      : access.supervisorBranchIds.includes(b.id) ? "supervisor"
      : access.evaluatorBranchIds.includes(b.id) ? "evaluator"
      : null,
  }))
  return NextResponse.json({ branches })
}
