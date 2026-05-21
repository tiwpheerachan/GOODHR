import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function checkAdmin(svc: any, userId: string) {
  const { data } = await svc.from("users").select("role, employee_id").eq("id", userId).single()
  return data && ["super_admin", "hr_admin"].includes(data.role) ? data : null
}

// GET — list applicants (with filters)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  if (!await checkAdmin(svc, user.id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const positionId = sp.get("position_id")
  const status = sp.get("status")
  const single = sp.get("id")

  if (single) {
    const { data, error } = await svc.from("job_applications")
      .select(`*, position:job_positions(id, slug, title, employment_type)`)
      .eq("id", single).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // generate signed URL for resume if exists
    if (data?.resume_url) {
      const { data: signed } = await svc.storage.from("recruitment").createSignedUrl(data.resume_url, 3600)
      ;(data as any).resume_signed_url = signed?.signedUrl
    }
    // attachments signed urls
    if (Array.isArray(data?.attachments)) {
      const signed = await Promise.all(data.attachments.map(async (a: any) => {
        const { data: s } = await svc.storage.from("recruitment").createSignedUrl(a.path, 3600)
        return { ...a, signed_url: s?.signedUrl }
      }))
      ;(data as any).attachments = signed
    }
    return NextResponse.json({ application: data })
  }

  let q = svc.from("job_applications")
    .select(`*, position:job_positions(id, slug, title, employment_type)`)
    .order("applied_at", { ascending: false })
  if (positionId) q = q.eq("position_id", positionId)
  if (status) q = q.eq("status", status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data ?? [] })
}

// PATCH — update status / rating / internal_notes
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const u = await checkAdmin(svc, user.id)
  if (!u) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { id, status, rating, internal_notes, note } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // get current status for history
  const { data: cur } = await svc.from("job_applications").select("status").eq("id", id).single()

  const updates: any = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (rating !== undefined) updates.rating = rating
  if (internal_notes !== undefined) updates.internal_notes = internal_notes
  updates.reviewed_at = new Date().toISOString()
  updates.reviewed_by = u.employee_id

  const { error } = await svc.from("job_applications").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // log history on status change
  if (status && cur?.status !== status) {
    await svc.from("application_history").insert({
      application_id: id,
      changed_by: u.employee_id,
      from_status: cur?.status,
      to_status: status,
      note,
    })
  }

  return NextResponse.json({ success: true })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  if (!await checkAdmin(svc, user.id)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("job_applications").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
