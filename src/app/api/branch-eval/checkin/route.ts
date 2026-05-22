import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, canManageBranch, haversineMeters } from "@/lib/utils/branch-eval-permissions"

// POST /api/branch-eval/checkin
//   body: { evaluation_id, lat, lng, photo_url? }
//   - GPS optional but recommended
//   - photo optional
//   - คำนวณระยะห่างจาก branch lat/lng ให้อัตโนมัติ
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { evaluation_id, lat, lng, photo_url } = body
  if (!evaluation_id) return NextResponse.json({ error: "missing evaluation_id" }, { status: 400 })

  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id, branch:branches(latitude, longitude)")
    .eq("id", evaluation_id).maybeSingle() as any
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })

  const isOwner = ev.evaluator_id === access.employeeId
  const isManager = canManageBranch(access, ev.branch_id)
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // distance calculation
  let distance: number | null = null
  if (lat != null && lng != null && ev.branch?.latitude && ev.branch?.longitude) {
    distance = Math.round(haversineMeters(
      Number(lat), Number(lng),
      Number(ev.branch.latitude), Number(ev.branch.longitude),
    ))
  }

  const now = new Date().toISOString()
  await svc.from("branch_evaluations").update({
    checkin_lat: lat ?? null,
    checkin_lng: lng ?? null,
    checkin_distance_m: distance,
    checkin_photo_url: photo_url ?? null,
    checkin_at: now,
    updated_at: now,
  }).eq("id", evaluation_id)

  // log photo too
  if (photo_url) {
    await svc.from("branch_evaluation_photos").insert({
      evaluation_id, kind: "checkin",
      storage_path: photo_url, url: photo_url,
      uploaded_by: access.employeeId,
      taken_at: now,
    })
  }

  return NextResponse.json({ success: true, distance_m: distance, checkin_at: now })
}
