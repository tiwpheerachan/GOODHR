import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ROUND_DAYS, ROUND_LABELS } from "@/lib/constants/probation"

// ════════════════════════════════════════════════════════════════════
// มอบหมายการประเมินทดลองงาน (assignments)
//   GET    ?employee_id=... → รายการ assignment ของพนักงานคนนั้น (admin)
//   POST   {employee_id, evaluator_id, round, label?, due_days?} → เพิ่ม (admin)
//   DELETE ?id=... → ลบ (admin) — บล็อกถ้ามีใบประเมินที่ส่งแล้ว
// ════════════════════════════════════════════════════════════════════

async function getAdmin(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

export async function GET(req: NextRequest) {
  const a = await getAdmin(req)
  if (a.error) return a.error
  const { svc } = a
  const employeeId = req.nextUrl.searchParams.get("employee_id")
  if (!employeeId) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })

  const { data: assignments } = await svc.from("probation_evaluation_assignments")
    .select("*, evaluator:employees!probation_evaluation_assignments_evaluator_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: true })

  // สถานะใบประเมินของแต่ละ assignment
  const ids = (assignments ?? []).map((x: any) => x.id)
  let forms: any[] = []
  if (ids.length > 0) {
    const { data } = await svc.from("probation_evaluations")
      .select("id, assignment_id, status, grade, total_score, is_passed, submitted_at")
      .in("assignment_id", ids)
    forms = data ?? []
  }
  const out = (assignments ?? []).map((x: any) => ({ ...x, form: forms.find(f => f.assignment_id === x.id) ?? null }))
  return NextResponse.json({ assignments: out })
}

export async function POST(req: NextRequest) {
  const a = await getAdmin(req)
  if (a.error) return a.error
  const { svc, dbUser } = a
  const body = await req.json()
  let { employee_id, evaluator_id, round, label, due_days } = body

  if (!employee_id || !evaluator_id || round === undefined || round === null) {
    return NextResponse.json({ error: "employee_id, evaluator_id, round จำเป็น" }, { status: 400 })
  }
  round = Number(round)
  const isCustom = round === 99
  if (isCustom) {
    if (!label || !String(label).trim()) return NextResponse.json({ error: "กรุณาตั้งชื่อรอบกำหนดเอง" }, { status: 400 })
    const d = Number(due_days)
    if (!Number.isFinite(d) || d <= 0) return NextResponse.json({ error: "กรุณาระบุจำนวนวันของรอบกำหนดเอง" }, { status: 400 })
    due_days = Math.round(d)
    label = String(label).trim().slice(0, 80)
  } else {
    label = null
    due_days = ROUND_DAYS[round] ?? null
  }

  // company ของพนักงาน
  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employee_id).single()

  const { data: created, error } = await svc.from("probation_evaluation_assignments").insert({
    company_id: emp?.company_id ?? null,
    employee_id, evaluator_id, round,
    label, due_days,
    created_by: dbUser.employee_id ?? null,
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // แจ้งเตือนผู้ประเมิน
  const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
  const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"
  const roundLabel = label || ROUND_LABELS[round] || `รอบ ${round}`
  await svc.from("notifications").insert({
    employee_id: evaluator_id,
    type: "probation_eval_assigned",
    title: `มอบหมายให้ประเมินทดลองงาน — ${empName}`,
    body: `คุณได้รับมอบหมายให้ประเมินทดลองงานของ ${empName} (${roundLabel})`,
    ref_table: "probation_evaluation_assignments", ref_id: created.id, is_read: false,
  })

  return NextResponse.json({ success: true, id: created.id })
}

export async function DELETE(req: NextRequest) {
  const a = await getAdmin(req)
  if (a.error) return a.error
  const { svc } = a
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  // บล็อกถ้ามีใบที่ส่ง/อนุมัติแล้ว (เก็บประวัติ) — ลบได้เฉพาะยังเป็น draft/ยังไม่ประเมิน
  const { data: forms } = await svc.from("probation_evaluations")
    .select("id, status").eq("assignment_id", id)
  const locked = (forms ?? []).some((f: any) => ["submitted", "approved"].includes(f.status))
  if (locked) return NextResponse.json({ error: "มีการประเมินที่ส่งแล้ว — ลบไม่ได้" }, { status: 400 })

  // ลบ draft forms ที่ผูกอยู่ก่อน (ถ้ามี)
  const draftIds = (forms ?? []).map((f: any) => f.id)
  if (draftIds.length > 0) {
    await svc.from("probation_evaluation_items").delete().in("evaluation_id", draftIds)
    await svc.from("probation_evaluations").delete().in("id", draftIds)
  }
  await svc.from("probation_evaluation_assignments").delete().eq("id", id)
  return NextResponse.json({ success: true })
}
