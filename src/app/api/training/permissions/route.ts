import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// GET — list ทุก permission
//   HR/Super admin → เห็นหมด
//   Supervisor → เห็นเฉพาะ permission ใน channel ที่ตัวเองดูแล
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin && !access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  let q = svc
    .from("training_permissions")
    .select(`*, employee:employees!training_permissions_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)), channel:training_channels(id, name)`)
    .order("granted_at", { ascending: false })

  // supervisor เห็น: training_admin (global) + รายชื่อใน channel ของตัวเอง
  if (!access.isBaseAdmin && !access.isTrainingAdmin) {
    // PostgREST `or` filter: channel_id IS NULL (= training_admin) OR channel_id IN supervisorChannels
    const supIds = access.supervisorChannelIds.length > 0 ? access.supervisorChannelIds : []
    if (supIds.length > 0) {
      q = q.or(`channel_id.is.null,channel_id.in.(${supIds.join(",")})`)
    } else {
      q = q.is("channel_id", null)
    }
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ permissions: data ?? [] })
}

// POST — grant permission
//   HR/Super admin → grant ได้ทุก role/channel
//   Supervisor → grant ได้เฉพาะ training_viewer ใน channel ที่ตัวเองดูแล
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin && !access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json()
  const { employee_id, employee_ids, role, channel_id, scope } = body
  const ids: string[] = Array.isArray(employee_ids) && employee_ids.length > 0
    ? employee_ids
    : (employee_id ? [employee_id] : [])

  if (ids.length === 0 || !role) return NextResponse.json({ error: "missing employee_id(s)/role" }, { status: 400 })
  if (!["training_admin", "training_supervisor", "training_viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 })
  }
  if ((role === "training_supervisor" || role === "training_viewer") && !channel_id) {
    return NextResponse.json({ error: "supervisor/viewer ต้องระบุ channel_id" }, { status: 400 })
  }

  // ── Authorization: who can grant what ────────────────────────────
  if (role === "training_admin" && !access.isBaseAdmin) {
    return NextResponse.json({ error: "เฉพาะ HR/Super Admin ที่ตั้ง training_admin ได้" }, { status: 403 })
  }
  if (role === "training_supervisor" && !access.isBaseAdmin && !access.isTrainingAdmin) {
    return NextResponse.json({ error: "เฉพาะ HR/Super Admin ที่ตั้ง supervisor ได้" }, { status: 403 })
  }
  if (role === "training_viewer") {
    // supervisor ของ channel นั้นสามารถ grant viewer ได้
    const canGrant = access.isBaseAdmin || access.isTrainingAdmin ||
      access.supervisorChannelIds.includes(channel_id)
    if (!canGrant) return NextResponse.json({ error: "คุณไม่ได้ดูแล channel นี้" }, { status: 403 })
  }

  // scope จะใช้เฉพาะตอน role=viewer
  const viewerScope = role === "training_viewer"
    ? (scope === "all" ? "all" : "subordinates")
    : null

  const rows = ids.map(eid => ({
    employee_id: eid, role,
    channel_id: (role === "training_supervisor" || role === "training_viewer") ? channel_id : null,
    scope: viewerScope,
    granted_by: access.employeeId,
  }))

  const { error, data } = await svc.from("training_permissions")
    .upsert(rows, { onConflict: "employee_id,role,channel_id", ignoreDuplicates: true })
    .select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, added: data?.length ?? 0, requested: ids.length })
}

// PATCH — แก้ scope ของ viewer
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { id, scope } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  if (!["all", "subordinates"].includes(scope)) {
    return NextResponse.json({ error: "invalid scope" }, { status: 400 })
  }

  const { data: row } = await svc.from("training_permissions")
    .select("role, channel_id").eq("id", id).maybeSingle()
  if (!row) return NextResponse.json({ error: "ไม่พบสิทธิ์" }, { status: 404 })
  if (row.role !== "training_viewer") {
    return NextResponse.json({ error: "เปลี่ยน scope ได้เฉพาะ viewer" }, { status: 400 })
  }

  const canEdit = access.isBaseAdmin || access.isTrainingAdmin ||
    (row.channel_id && access.supervisorChannelIds.includes(row.channel_id))
  if (!canEdit) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_permissions").update({ scope }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — revoke
//   HR/Super admin หรือ training_admin → revoke ได้ทั้งหมด
//   Supervisor → revoke ได้เฉพาะ viewer ใน channel ของตัวเอง
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const sp = new URL(req.url).searchParams
  const id = sp.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: row } = await svc.from("training_permissions")
    .select("role, channel_id").eq("id", id).maybeSingle()
  if (!row) return NextResponse.json({ error: "ไม่พบสิทธิ์" }, { status: 404 })

  const canRevoke = access.isBaseAdmin || access.isTrainingAdmin ||
    (row.role === "training_viewer" && row.channel_id && access.supervisorChannelIds.includes(row.channel_id))
  if (!canRevoke) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const { error } = await svc.from("training_permissions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
