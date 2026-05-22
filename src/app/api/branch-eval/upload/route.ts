import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, canManageBranch } from "@/lib/utils/branch-eval-permissions"

// POST — upload one photo for an evaluation
// multipart/form-data: file, evaluation_id, kind (checkin|answer), answer_id?
// Returns: { url, storage_path, photo_id }
const BUCKET = "branch-eval"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const form = await req.formData()
  const file = form.get("file") as File | null
  const evaluationId = form.get("evaluation_id") as string | null
  const kind = (form.get("kind") as string) || "answer"
  const answerId = form.get("answer_id") as string | null
  if (!file || !evaluationId) return NextResponse.json({ error: "missing file/evaluation_id" }, { status: 400 })

  // permission check via evaluation
  const { data: ev } = await svc.from("branch_evaluations")
    .select("branch_id, evaluator_id").eq("id", evaluationId).maybeSingle()
  if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 })
  const isOwner = ev.evaluator_id === access.employeeId
  const isManager = canManageBranch(access, ev.branch_id)
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // size guard: 10 MB
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 10 MB" }, { status: 400 })

  // generate path
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${evaluationId}/${kind}/${stamp}_${rand}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await svc.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // get public URL (bucket should be set to public OR use signed URL)
  const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl

  const { data: photo, error: insErr } = await svc.from("branch_evaluation_photos").insert({
    evaluation_id: evaluationId,
    answer_id: answerId || null,
    kind: kind === "checkin" ? "checkin" : "answer",
    storage_path: path, url,
    uploaded_by: access.employeeId,
  }).select("id").single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ url, storage_path: path, photo_id: photo.id })
}

// DELETE — remove a photo
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  const photoId = new URL(req.url).searchParams.get("id")
  if (!photoId) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: photo } = await svc.from("branch_evaluation_photos")
    .select("storage_path, evaluation_id, evaluation:branch_evaluations(branch_id, evaluator_id)")
    .eq("id", photoId).maybeSingle() as any
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 })
  const ev = photo.evaluation
  const isOwner = ev?.evaluator_id === access.employeeId
  const isManager = canManageBranch(access, ev?.branch_id)
  if (!isOwner && !isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  // remove storage file
  try { await svc.storage.from(BUCKET).remove([photo.storage_path]) } catch {}
  await svc.from("branch_evaluation_photos").delete().eq("id", photoId)
  return NextResponse.json({ success: true })
}
