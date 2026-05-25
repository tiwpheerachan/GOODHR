import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess, canSeeTemplate, canEditTemplate } from "@/lib/utils/branch-eval-permissions"

// GET /api/branch-eval/templates
//   ?with_items=1 → join items
//   ?id=... → single template
//   ?deleted=1 → trash
//   ?with_viewers=1 → include viewers list (for editing private templates)
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
  const withViewers = sp.get("with_viewers") === "1"
  const showDeleted = sp.get("deleted") === "1"

  const baseSelect = withItems
    ? `*, items:branch_eval_template_items(*), creator:employees!branch_eval_templates_created_by_fkey(first_name_th, last_name_th, nickname), owner:employees!branch_eval_templates_owner_id_fkey(id, first_name_th, last_name_th, nickname, avatar_url)`
    : `*, creator:employees!branch_eval_templates_created_by_fkey(first_name_th, last_name_th, nickname), owner:employees!branch_eval_templates_owner_id_fkey(id, first_name_th, last_name_th, nickname, avatar_url)`

  if (id) {
    const { data, error } = await svc.from("branch_eval_templates").select(baseSelect).eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ template: null })

    // permission check
    let viewerIds: string[] = []
    if ((data as any).visibility === "private") {
      const { data: vs } = await svc.from("branch_eval_template_viewers")
        .select("employee_id").eq("template_id", id)
      viewerIds = (vs ?? []).map((v: any) => v.employee_id)
    }
    if (!canSeeTemplate(access, data as any, viewerIds)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดู template นี้" }, { status: 403 })
    }

    if ((data as any).items) {
      (data as any).items.sort((a: any, b: any) => (a.order_no || 0) - (b.order_no || 0))
    }
    if (withViewers && (data as any).visibility === "private") {
      const { data: vRows } = await svc.from("branch_eval_template_viewers")
        .select("id, employee_id, granted_at, employee:employees!branch_eval_template_viewers_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url)")
        .eq("template_id", id)
      ;(data as any).viewers = vRows ?? []
    }
    return NextResponse.json({ template: data })
  }

  // ── list ──
  let q = svc.from("branch_eval_templates").select(baseSelect).eq("is_active", true)
  if (showDeleted) q = q.not("deleted_at", "is", null)
  else q = q.is("deleted_at", null)
  q = q.order("updated_at", { ascending: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // filter by visibility — admin sees all, others see public + private-shared-with-them
  let templates = (data ?? []) as any[]
  if (!access.isEvalAdmin) {
    const privateIds = templates.filter(t => t.visibility === "private").map(t => t.id)
    let viewerMap = new Map<string, string[]>()
    if (privateIds.length > 0 && access.employeeId) {
      const { data: vs } = await svc.from("branch_eval_template_viewers")
        .select("template_id, employee_id")
        .in("template_id", privateIds)
      for (const v of (vs ?? []) as any[]) {
        const list = viewerMap.get(v.template_id) ?? []
        list.push(v.employee_id)
        viewerMap.set(v.template_id, list)
      }
    }
    templates = templates.filter(t => canSeeTemplate(access, t, viewerMap.get(t.id) ?? []))
  }

  if (withItems) {
    for (const t of templates) {
      if ((t as any).items) (t as any).items.sort((a: any, b: any) => (a.order_no || 0) - (b.order_no || 0))
    }
  }
  return NextResponse.json({ templates })
}

// POST — create template (or clone from existing)
//   body: { name, description?, visibility?, viewer_ids?[], clone_from? }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin) return NextResponse.json({ error: "เฉพาะ Branch Eval Admin" }, { status: 403 })

  const body = await req.json()
  const { name, description, visibility, viewer_ids, clone_from } = body
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 })

  const validVisibility = ["public", "private"].includes(visibility) ? visibility : "public"

  // ── create template ──
  const { data: tpl, error } = await svc.from("branch_eval_templates").insert({
    name,
    description: description ?? null,
    visibility: validVisibility,
    company_id: access.companyId,
    owner_id: access.employeeId,
    created_by: access.employeeId,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── clone items จาก template เดิม (ถ้าระบุ) ──
  let clonedCount = 0
  if (clone_from) {
    const { data: srcItems } = await svc.from("branch_eval_template_items")
      .select("order_no, code, question_th, question_en, sub_notes, weight, answer_type, requires_note, requires_photo, is_section")
      .eq("template_id", clone_from)
      .order("order_no")
    if (srcItems && srcItems.length > 0) {
      const rows = srcItems.map((it: any) => ({
        template_id: tpl.id,
        order_no: it.order_no,
        code: it.code,
        question_th: it.question_th,
        question_en: it.question_en,
        sub_notes: it.sub_notes ?? [],
        weight: it.weight,
        answer_type: it.answer_type,
        requires_note: it.requires_note,
        requires_photo: it.requires_photo,
        is_section: !!it.is_section,
      }))
      const { error: itemErr } = await svc.from("branch_eval_template_items").insert(rows)
      if (!itemErr) clonedCount = rows.length

      // sync total_weight
      const total = rows.filter(r => !r.is_section).reduce((s, r) => s + Number(r.weight || 0), 0)
      await svc.from("branch_eval_templates")
        .update({ total_weight: total, updated_at: new Date().toISOString() })
        .eq("id", tpl.id)
    }
  }

  // ── viewers (เฉพาะ private) ──
  if (validVisibility === "private" && Array.isArray(viewer_ids) && viewer_ids.length > 0) {
    const rows = (viewer_ids as string[]).map(eid => ({
      template_id: tpl.id,
      employee_id: eid,
      granted_by: access.employeeId,
    }))
    await svc.from("branch_eval_template_viewers")
      .upsert(rows, { onConflict: "template_id,employee_id", ignoreDuplicates: true })
  }

  return NextResponse.json({ id: tpl.id, cloned_items: clonedCount })
}

// PATCH — update / restore template + manage visibility
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const body = await req.json()
  const { id, viewer_ids, ...updates } = body
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // permission check — admin หรือ owner
  const { data: existing } = await svc.from("branch_eval_templates")
    .select("owner_id").eq("id", id).maybeSingle()
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canEditTemplate(access, existing as any)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ template นี้" }, { status: 403 })
  }

  // validate visibility
  if (updates.visibility !== undefined &&
      !["public", "private"].includes(updates.visibility)) {
    return NextResponse.json({ error: "invalid visibility" }, { status: 400 })
  }

  const { error } = await svc.from("branch_eval_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // replace viewers ถ้าส่ง viewer_ids array มา
  if (Array.isArray(viewer_ids)) {
    await svc.from("branch_eval_template_viewers").delete().eq("template_id", id)
    if (viewer_ids.length > 0) {
      const rows = (viewer_ids as string[]).map(eid => ({
        template_id: id,
        employee_id: eid,
        granted_by: access.employeeId,
      }))
      await svc.from("branch_eval_template_viewers")
        .upsert(rows, { onConflict: "template_id,employee_id", ignoreDuplicates: true })
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — soft delete (default) / ?hard=1 → permanent
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const hard = url.searchParams.get("hard") === "1"
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  // permission check
  const { data: existing } = await svc.from("branch_eval_templates")
    .select("owner_id").eq("id", id).maybeSingle()
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (!canEditTemplate(access, existing as any)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ template นี้" }, { status: 403 })
  }
  if (hard && !access.isEvalAdmin) {
    return NextResponse.json({ error: "ลบถาวรต้องเป็น Admin" }, { status: 403 })
  }

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
