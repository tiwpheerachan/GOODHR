import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// ════════════════════════════════════════════════════════════════════
// มอบหมายเช็คลิสต์ (store_checklist_assignments)
//   GET  ?mine=1        → งานที่ถูกมอบหมายให้ฉัน (status open)
//   GET  (admin)        → รายการมอบหมายทั้งหมด (+filter status/assignee)
//   POST {template_id, dealer_id?, assignee_ids[], due_date?, note?}  (admin)
//   DELETE ?id=         → ยกเลิก (admin)
// ════════════════════════════════════════════════════════════════════

const EMP = "id, employee_code, first_name_th, last_name_th, nickname, avatar_url, brand, company:companies(name_th)"
const SEL = `id, template_id, dealer_id, assignee_id, assigned_by, due_date, note, status, created_at,
  template:store_checklist_templates(id, name),
  dealer:store_dealers(id, name, zone, area),
  assignee:employees!store_checklist_assignments_assignee_id_fkey(${EMP})`

async function ctx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  return { svc, access }
}

export async function GET(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  const sp = req.nextUrl.searchParams

  // งานของฉัน
  if (sp.get("mine") === "1") {
    if (!access.employeeId) return NextResponse.json({ assignments: [] })
    const { data } = await svc.from("store_checklist_assignments").select(SEL)
      .eq("assignee_id", access.employeeId)
      .neq("status", "cancelled")
      .order("status").order("due_date", { nullsFirst: false }).order("created_at", { ascending: false })
    return NextResponse.json({ assignments: data ?? [] })
  }

  // มุมมองแอดมิน
  if (!access.isEvalAdmin && !access.isSupervisor)
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  let query = svc.from("store_checklist_assignments").select(SEL)
  const status = sp.get("status")
  const assignee = sp.get("assignee_id")
  if (status) query = query.eq("status", status)
  if (assignee) query = query.eq("assignee_id", assignee)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin && !access.isSupervisor)
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const assigneeIds: string[] = Array.isArray(body?.assignee_ids)
    ? body.assignee_ids.filter(Boolean) : []
  if (assigneeIds.length === 0) return NextResponse.json({ error: "กรุณาเลือกผู้รับมอบหมาย" }, { status: 400 })
  const base = {
    template_id: body?.template_id || null,
    dealer_id: body?.dealer_id || null,
    assigned_by: access.employeeId,
    due_date: body?.due_date || null,
    note: (body?.note ?? "").toString().trim() || null,
    status: "open",
  }
  const rows = assigneeIds.map(aid => ({ ...base, assignee_id: aid }))
  const { data, error } = await svc.from("store_checklist_assignments").insert(rows).select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length ?? 0 })
}

export async function DELETE(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  if (!access.isEvalAdmin && !access.isSupervisor)
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
  const { error } = await svc.from("store_checklist_assignments")
    .update({ status: "cancelled" }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
