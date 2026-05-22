import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// POST — add an item
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { template_id, question_th } = body
  if (!template_id || !question_th) return NextResponse.json({ error: "missing template_id/question_th" }, { status: 400 })

  // find next order_no
  const { data: existing } = await svc.from("branch_eval_template_items")
    .select("order_no").eq("template_id", template_id)
    .order("order_no", { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.order_no ?? 0) + 1

  const { data, error } = await svc.from("branch_eval_template_items").insert({
    template_id,
    order_no: body.order_no ?? nextOrder,
    code: body.code ?? String(nextOrder),
    question_th,
    question_en: body.question_en ?? null,
    sub_notes: body.sub_notes ?? [],
    weight: body.weight ?? 1,
    answer_type: body.answer_type ?? "yes_no",
    requires_note: body.requires_note ?? false,
    requires_photo: body.requires_photo ?? false,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // update template total_weight
  await recalcTotalWeight(svc, template_id)

  return NextResponse.json({ id: data.id })
}

// PATCH — update item
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

  const { data: existing } = await svc.from("branch_eval_template_items")
    .select("template_id").eq("id", id).maybeSingle()
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

  const { error } = await svc.from("branch_eval_template_items").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (updates.weight !== undefined) await recalcTotalWeight(svc, existing.template_id)
  return NextResponse.json({ success: true })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: existing } = await svc.from("branch_eval_template_items")
    .select("template_id").eq("id", id).maybeSingle()
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

  await svc.from("branch_eval_template_items").delete().eq("id", id)
  await recalcTotalWeight(svc, existing.template_id)
  return NextResponse.json({ success: true })
}

async function recalcTotalWeight(svc: any, templateId: string) {
  const { data } = await svc.from("branch_eval_template_items")
    .select("weight").eq("template_id", templateId)
  const total = (data ?? []).reduce((s: number, r: any) => s + Number(r.weight || 0), 0)
  await svc.from("branch_eval_templates")
    .update({ total_weight: total, updated_at: new Date().toISOString() })
    .eq("id", templateId)
}
