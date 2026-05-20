import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// GET — list ทุก permission (super_admin/hr_admin เท่านั้น)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin) return NextResponse.json({ error: "เฉพาะ HR/Super Admin" }, { status: 403 })

  const { data, error } = await svc
    .from("training_permissions")
    .select(`*, employee:employees!training_permissions_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)), channel:training_channels(id, name)`)
    .order("granted_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ permissions: data ?? [] })
}

// POST — grant permission
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin) return NextResponse.json({ error: "เฉพาะ HR/Super Admin" }, { status: 403 })

  const body = await req.json()
  const { employee_id, employee_ids, role, channel_id } = body
  // รองรับทั้งแบบเดี่ยว (employee_id) และแบบหลายคน (employee_ids: string[])
  const ids: string[] = Array.isArray(employee_ids) && employee_ids.length > 0
    ? employee_ids
    : (employee_id ? [employee_id] : [])

  if (ids.length === 0 || !role) return NextResponse.json({ error: "missing employee_id(s)/role" }, { status: 400 })
  if (!["training_admin", "training_supervisor"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 })
  }
  if (role === "training_supervisor" && !channel_id) {
    return NextResponse.json({ error: "supervisor ต้องระบุ channel_id" }, { status: 400 })
  }

  const rows = ids.map(eid => ({
    employee_id: eid, role,
    channel_id: role === "training_supervisor" ? channel_id : null,
    granted_by: access.employeeId,
  }))
  // skip duplicates (composite unique จริงๆ คือ employee_id+role+channel_id)
  const { error, data } = await svc.from("training_permissions")
    .upsert(rows, { onConflict: "employee_id,role,channel_id", ignoreDuplicates: true })
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, added: data?.length ?? 0, requested: ids.length })
}

// DELETE — revoke
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin) return NextResponse.json({ error: "เฉพาะ HR/Super Admin" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const id = sp.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { error } = await svc.from("training_permissions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
