import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// GET /api/branch-eval/templates
//   ?with_items=1 → join items
//   ?id=... → single template
//   ?deleted=1 → trash
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor && !access.isEvaluator) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const id = sp.get("id")
  const withItems = sp.get("with_items") === "1"
  const showDeleted = sp.get("deleted") === "1"

  const select = withItems
    ? `*, items:branch_eval_template_items(*), creator:employees!branch_eval_templates_created_by_fkey(first_name_th, last_name_th, nickname)`
    : `*, creator:employees!branch_eval_templates_created_by_fkey(first_name_th, last_name_th, nickname)`

  if (id) {
    const { data, error } = await svc.from("branch_eval_templates").select(select).eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data && (data as any).items) {
      (data as any).items.sort((a: any, b: any) => (a.order_no || 0) - (b.order_no || 0))
    }
    return NextResponse.json({ template: data })
  }

  let q = svc.from("branch_eval_templates").select(select).eq("is_active", true)
  if (showDeleted) q = q.not("deleted_at", "is", null)
  else q = q.is("deleted_at", null)
  q = q.order("updated_at", { ascending: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort items in each template if present
  if (withItems) {
    for (const t of data ?? []) {
      if ((t as any).items) (t as any).items.sort((a: any, b: any) => (a.order_no || 0) - (b.order_no || 0))
    }
  }
  return NextResponse.json({ templates: data ?? [] })
}

// POST — create template
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "เฉพาะ Branch Eval Admin" }, { status: 403 })

  const body = await req.json()
  const { name, description } = body
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 })

  const { data, error } = await svc.from("branch_eval_templates").insert({
    name, description: description ?? null,
    company_id: access.companyId,
    created_by: access.employeeId,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PATCH — update / restore template
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { error } = await svc.from("branch_eval_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — soft delete (default) / ?hard=1 → permanent
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const hard = url.searchParams.get("hard") === "1"
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  if (!hard) {
    const { error } = await svc.from("branch_eval_templates")
      .update({ deleted_at: new Date().toISOString() }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, mode: "soft" })
  }
  const { error } = await svc.from("branch_eval_templates").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, mode: "hard" })
}
