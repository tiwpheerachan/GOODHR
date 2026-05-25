import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// POST — add an item, or bulk import { template_id, items: [...] }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()
  const { template_id } = body

  // ── bulk import ──
  if (Array.isArray(body.items) && body.items.length > 0) {
    if (!template_id) return NextResponse.json({ error: "missing template_id" }, { status: 400 })
    const { data: existing } = await svc.from("branch_eval_template_items")
      .select("order_no").eq("template_id", template_id)
      .order("order_no", { ascending: false }).limit(1)
    let nextOrder = (existing?.[0]?.order_no ?? 0) + 1

    const rows = body.items
      .filter((it: any) => (it.question_th ?? "").toString().trim().length > 0)
      .map((it: any, i: number) => ({
        template_id,
        order_no: it.order_no ?? (nextOrder + i),
        code: (it.code ?? "").toString().trim() || String(it.order_no ?? (nextOrder + i)),
        question_th: it.question_th.toString().trim(),
        question_en: it.question_en ? it.question_en.toString().trim() : null,
        sub_notes: Array.isArray(it.sub_notes) ? it.sub_notes : [],
        weight: it.is_section ? 0 : Number(it.weight ?? 1),
        answer_type: ["yes_no","score_1_5","text","number"].includes(it.answer_type) ? it.answer_type : "yes_no",
        requires_note: !!it.requires_note,
        requires_photo: !!it.requires_photo,
        is_section: !!it.is_section,
      }))

    if (rows.length === 0) return NextResponse.json({ error: "ไม่มีข้อมูลที่นำเข้าได้" }, { status: 400 })

    const { error, data } = await svc.from("branch_eval_template_items").insert(rows).select("id")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await recalcTotalWeight(svc, template_id)
    return NextResponse.json({ inserted: data?.length ?? 0 })
  }

  // ── single add ──
  const { question_th } = body
  if (!template_id || !question_th) return NextResponse.json({ error: "missing template_id/question_th" }, { status: 400 })

  // find next order_no
  const { data: existing } = await svc.from("branch_eval_template_items")
    .select("order_no").eq("template_id", template_id)
    .order("order_no", { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.order_no ?? 0) + 1

  const isSection = !!body.is_section

  const { data, error } = await svc.from("branch_eval_template_items").insert({
    template_id,
    order_no: body.order_no ?? nextOrder,
    code: body.code ?? (isSection ? "" : String(nextOrder)),
    question_th,
    question_en: body.question_en ?? null,
    sub_notes: body.sub_notes ?? [],
    weight: isSection ? 0 : (body.weight ?? 1),
    answer_type: body.answer_type ?? "yes_no",
    requires_note: body.requires_note ?? false,
    requires_photo: body.requires_photo ?? false,
    is_section: isSection,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // update template total_weight
  await recalcTotalWeight(svc, template_id)

  return NextResponse.json({ id: data.id })
}

// PATCH — update item OR bulk reorder { reorder: [{id, order_no}, ...] }
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const body = await req.json()

  // ── bulk reorder ──
  if (Array.isArray(body.reorder) && body.reorder.length > 0) {
    let templateId: string | null = null
    // update ทีละ row (เร็วพอสำหรับ ~30 ข้อ)
    for (const r of body.reorder) {
      if (!r.id || r.order_no === undefined) continue
      const { data: existing } = await svc.from("branch_eval_template_items")
        .select("template_id").eq("id", r.id).maybeSingle()
      if (existing) {
        if (!templateId) templateId = existing.template_id
        await svc.from("branch_eval_template_items")
          .update({ order_no: Number(r.order_no) })
          .eq("id", r.id)
      }
    }
    return NextResponse.json({ success: true, updated: body.reorder.length })
  }

  // ── single update ──
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const { data: existing } = await svc.from("branch_eval_template_items")
    .select("template_id, is_section").eq("id", id).maybeSingle()
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

  // section ห้ามมี weight (force 0)
  if (updates.is_section === true) updates.weight = 0
  // ถ้าเดิมเป็น section แต่ไม่ส่ง is_section มา (uncheck) ห้าม assume เป็น section
  if (existing.is_section && updates.is_section === false && updates.weight === undefined) {
    updates.weight = 1
  }

  const { error } = await svc.from("branch_eval_template_items").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (updates.weight !== undefined || updates.is_section !== undefined) {
    await recalcTotalWeight(svc, existing.template_id)
  }
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

// ⚠️ skip section ตอนรวม weight (ตรงกับ recalc_branch_evaluation_score)
async function recalcTotalWeight(svc: any, templateId: string) {
  const { data } = await svc.from("branch_eval_template_items")
    .select("weight, is_section").eq("template_id", templateId)
  const total = (data ?? [])
    .filter((r: any) => !r.is_section)
    .reduce((s: number, r: any) => s + Number(r.weight || 0), 0)
  await svc.from("branch_eval_templates")
    .update({ total_weight: total, updated_at: new Date().toISOString() })
    .eq("id", templateId)
}
