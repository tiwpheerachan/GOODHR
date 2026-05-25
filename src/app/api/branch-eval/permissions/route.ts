import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// GET — list permissions
//   admin sees all; supervisor sees only own branches' permissions
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isBaseAdmin && !access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  let q = svc.from("branch_eval_permissions")
    .select(`*,
      employee:employees!branch_eval_permissions_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)),
      branch:branches(id, name, code)`)
    .order("granted_at", { ascending: false })

  if (!access.isBaseAdmin && !access.isEvalAdmin) {
    const ids = access.supervisorBranchIds
    if (ids.length > 0) {
      q = q.or(`branch_id.is.null,branch_id.in.(${ids.join(",")})`)
    } else {
      q = q.is("branch_id", null)
    }
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ permissions: data ?? [] })
}

// POST — grant permission
//   HR/admin/eval_admin → grant any role/branch
//   supervisor → grant only branch_eval_evaluator on own branches
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isBaseAdmin && !access.isEvalAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json()
  const { employee_id, employee_ids, role, branch_id, branch_ids } = body
  const ids: string[] = Array.isArray(employee_ids) && employee_ids.length > 0
    ? employee_ids
    : (employee_id ? [employee_id] : [])

  // รองรับทั้ง branch_id (single, backward compat) และ branch_ids (multi)
  const branchList: string[] = Array.isArray(branch_ids) && branch_ids.length > 0
    ? branch_ids
    : (branch_id ? [branch_id] : [])

  if (ids.length === 0 || !role) return NextResponse.json({ error: "missing employee_id(s)/role" }, { status: 400 })
  if (!["branch_eval_admin", "branch_eval_supervisor", "branch_eval_evaluator"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 })
  }
  if ((role === "branch_eval_supervisor" || role === "branch_eval_evaluator") && branchList.length === 0) {
    return NextResponse.json({ error: "supervisor/evaluator ต้องระบุสาขาอย่างน้อย 1 ที่" }, { status: 400 })
  }

  // authorization
  if (role === "branch_eval_admin" && !access.isBaseAdmin) {
    return NextResponse.json({ error: "เฉพาะ HR/Super Admin ที่ตั้ง admin ได้" }, { status: 403 })
  }
  if (role === "branch_eval_supervisor" && !access.isBaseAdmin && !access.isEvalAdmin) {
    return NextResponse.json({ error: "เฉพาะ HR/Eval Admin ที่ตั้ง supervisor ได้" }, { status: 403 })
  }
  if (role === "branch_eval_evaluator") {
    // supervisor มอบได้เฉพาะสาขาที่ตัวเองดูแล
    const ok = access.isBaseAdmin || access.isEvalAdmin
      || branchList.every(bid => access.supervisorBranchIds.includes(bid))
    if (!ok) return NextResponse.json({ error: "บางสาขาคุณไม่ได้ดูแล" }, { status: 403 })
  }

  // ── สร้าง cross-product: (employee × branch) ──
  let rows: any[] = []
  if (role === "branch_eval_admin") {
    rows = ids.map(eid => ({
      employee_id: eid, role,
      branch_id: null,
      granted_by: access.employeeId,
    }))
  } else {
    for (const eid of ids) {
      for (const bid of branchList) {
        rows.push({
          employee_id: eid, role,
          branch_id: bid,
          granted_by: access.employeeId,
        })
      }
    }
  }

  const { error, data } = await svc.from("branch_eval_permissions")
    .upsert(rows, { onConflict: "employee_id,role,branch_id", ignoreDuplicates: true })
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    success: true,
    added: data?.length ?? 0,
    requested: rows.length,
    employees: ids.length,
    branches: branchList.length,
  })
}

// DELETE — revoke
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: row } = await svc.from("branch_eval_permissions")
    .select("role, branch_id").eq("id", id).maybeSingle()
  if (!row) return NextResponse.json({ error: "ไม่พบ" }, { status: 404 })

  const canRevoke = access.isBaseAdmin || access.isEvalAdmin ||
    (row.role === "branch_eval_evaluator" && row.branch_id && access.supervisorBranchIds.includes(row.branch_id))
  if (!canRevoke) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("branch_eval_permissions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
