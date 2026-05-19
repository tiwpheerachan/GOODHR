import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// GET — list channels (filtered by user access)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  let q = svc.from("training_channels")
    .select("*, owner:employees!training_channels_owner_id_fkey(id, first_name_th, last_name_th, nickname)")
    .eq("is_active", true)
    .order("name")

  if (!access.isTrainingAdmin && access.isSupervisor) {
    q = q.in("id", access.supervisorChannelIds.length > 0 ? access.supervisorChannelIds : ["00000000-0000-0000-0000-000000000000"])
  } else if (access.companyId) {
    q = q.eq("company_id", access.companyId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ channels: data ?? [] })
}

// POST — create channel
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin) return NextResponse.json({ error: "เฉพาะ Training Admin" }, { status: 403 })

  const body = await req.json()
  const { name, description, brand, thumbnail_url, owner_id } = body
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 })

  const { data, error } = await svc.from("training_channels").insert({
    company_id: access.companyId,
    brand: brand ?? null,
    name, description: description ?? null,
    thumbnail_url: thumbnail_url ?? null,
    owner_id: owner_id ?? access.employeeId,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH — update channel
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  if (!canManageChannel(access, id)) return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ channel นี้" }, { status: 403 })

  const { error } = await svc.from("training_channels")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — soft delete (set is_active=false)
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin) return NextResponse.json({ error: "เฉพาะ Training Admin" }, { status: 403 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { error } = await svc.from("training_channels").update({ is_active: false }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
