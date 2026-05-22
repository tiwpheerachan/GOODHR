import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// ════════════════════════════════════════════════════════════════════
// /api/training/permissions/subordinates
//   GET    ?permission_id=... → list learner ids ที่ผูกกับ viewer permission นี้
//   POST   { permission_id, employee_ids[] }    → เพิ่มลูกน้องในสาย (bulk)
//   DELETE ?permission_id=...&employee_id=...   → ลบลูกน้อง 1 คน
//
// สิทธิ์การแก้:
//   - HR/super admin หรือ training_admin → แก้ได้ทุก permission
//   - supervisor ของ channel นั้น → แก้ permission ของ viewer ในช่องตัวเองได้
// ════════════════════════════════════════════════════════════════════

async function checkPermissionAccess(svc: any, access: any, permissionId: string) {
  const { data: perm } = await svc.from("training_permissions")
    .select("id, role, channel_id").eq("id", permissionId).maybeSingle()
  if (!perm) return { ok: false as const, error: "ไม่พบสิทธิ์", status: 404 }
  if (perm.role !== "training_viewer") {
    return { ok: false as const, error: "เพิ่มลูกน้องได้เฉพาะ viewer", status: 400 }
  }
  const canEdit = access.isBaseAdmin || access.isTrainingAdmin ||
    (perm.channel_id && access.supervisorChannelIds.includes(perm.channel_id))
  if (!canEdit) return { ok: false as const, error: "ไม่มีสิทธิ์", status: 403 }
  return { ok: true as const, perm }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const permissionId = new URL(req.url).searchParams.get("permission_id")
  if (!permissionId) return NextResponse.json({ error: "missing permission_id" }, { status: 400 })

  const check = await checkPermissionAccess(svc, access, permissionId)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { data } = await svc.from("training_viewer_subordinates")
    .select(`learner_employee_id, added_at,
             learner:employees!training_viewer_subordinates_learner_employee_id_fkey(
               id, first_name_th, last_name_th, nickname, employee_code, avatar_url,
               position:positions(name), department:departments(name)
             )`)
    .eq("permission_id", permissionId)
    .order("added_at", { ascending: false })

  return NextResponse.json({ subordinates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { permission_id, employee_ids } = body
  if (!permission_id || !Array.isArray(employee_ids) || employee_ids.length === 0) {
    return NextResponse.json({ error: "missing permission_id / employee_ids" }, { status: 400 })
  }

  const check = await checkPermissionAccess(svc, access, permission_id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const rows = employee_ids.map((eid: string) => ({
    permission_id,
    learner_employee_id: eid,
    added_by: access.employeeId,
  }))
  const { data, error } = await svc.from("training_viewer_subordinates")
    .upsert(rows, { onConflict: "permission_id,learner_employee_id", ignoreDuplicates: true })
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, added: data?.length ?? 0, requested: employee_ids.length })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const permissionId = sp.get("permission_id")
  const employeeId = sp.get("employee_id")
  if (!permissionId || !employeeId) {
    return NextResponse.json({ error: "missing permission_id / employee_id" }, { status: 400 })
  }

  const check = await checkPermissionAccess(svc, access, permissionId)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await svc.from("training_viewer_subordinates").delete()
    .eq("permission_id", permissionId)
    .eq("learner_employee_id", employeeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
