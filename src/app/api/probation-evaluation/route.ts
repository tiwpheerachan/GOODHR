import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"
import { getManageableEmployees, canEvaluate } from "@/lib/utils/evaluator-chain"
import { ROUND_DAYS, ROUND_LABELS, PROBATION_ROUNDS, effectiveEmploymentStart } from "@/lib/constants/probation"
import { getResend, probationEvalSubmittedEmail } from "@/lib/resend"

function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = req.nextUrl.searchParams
  const mode = url.get("mode")
  const formId = url.get("form_id")

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = dbUser.company_id

  // Single evaluation with items
  if (mode === "single" && formId) {
    const { data: form } = await svc
      .from("probation_evaluations")
      .select("*, employee:employees!probation_evaluations_employee_id_fkey(*, position:positions(name), department:departments(name)), evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th), items:probation_evaluation_items(*)")
      .eq("id", formId).single()
    return NextResponse.json({ form })
  }

  // Manager: ดึงลูกน้องที่อยู่ในช่วงทดลองงาน (direct + skip-1 + additional)
  if (mode === "manager") {
    const managerId = dbUser.employee_id
    if (!managerId) return NextResponse.json({ members: [], forms: [] })

    const allManageable = await getManageableEmployees(svc, managerId, "probation")

    // เอาเฉพาะพนักงานที่ยังอยู่ในช่วงทดลองงาน
    const today = new Date()
    const members = allManageable.filter((m: any) => {
      // นับทดลองงานจาก phase2_start (พนักงาน 2 เฟส) หรือ hire_date
      const startStr = effectiveEmploymentStart(m)
      if (!startStr) return false
      const daysSinceHire = Math.ceil((today.getTime() - new Date(startStr).getTime()) / 86400000)
      if (m.employment_status === "probation") return true
      if (m.probation_end_date) return daysSinceHire <= 150
      return daysSinceHire <= 150
    })

    // ดึง evaluations ที่มีอยู่
    const memberIds = members.map((m: any) => m.id)
    let forms: any[] = []
    if (memberIds.length > 0) {
      const { data } = await svc.from("probation_evaluations")
        .select("id, employee_id, round, assignment_id, due_date, total_score, grade, status, evaluator_id, evaluator_role, submitted_at, rejection_note, evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th)")
        .in("employee_id", memberIds)
      forms = data ?? []
    }

    // ── งานที่ "ฉัน" ถูกมอบหมายให้ประเมิน (assignment) — พนักงานอาจไม่อยู่ในสายก็ได้ ──
    let assignments: any[] = []
    const { data: myAssign } = await svc.from("probation_evaluation_assignments")
      .select("*, employee:employees!probation_evaluation_assignments_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, hire_date, phase2_start_date, position:positions(name), department:departments(name))")
      .eq("evaluator_id", managerId)
      .order("created_at", { ascending: true })
    const assignIds = (myAssign ?? []).map((x: any) => x.id)
    let assignForms: any[] = []
    if (assignIds.length > 0) {
      const { data } = await svc.from("probation_evaluations")
        .select("id, assignment_id, status, grade, total_score, is_passed, submitted_at, rejection_note")
        .in("assignment_id", assignIds)
      assignForms = data ?? []
    }
    assignments = (myAssign ?? []).map((x: any) => ({ ...x, form: assignForms.find(f => f.assignment_id === x.id) ?? null }))

    return NextResponse.json({ members, forms, assignments })
  }

  // Assignment form — โหลดฟอร์มของ assignment (ผู้ประเมินที่ถูกมอบหมาย หรือ admin)
  if (mode === "assignment_form") {
    const aid = url.get("assignment_id")
    if (!aid) return NextResponse.json({ error: "assignment_id จำเป็น" }, { status: 400 })
    const { data: assignment } = await svc.from("probation_evaluation_assignments")
      .select("*, employee:employees!probation_evaluation_assignments_employee_id_fkey(*, position:positions(name), department:departments(name))")
      .eq("id", aid).single()
    if (!assignment) return NextResponse.json({ error: "ไม่พบงานมอบหมาย" }, { status: 404 })
    const isAdmin = ["hr_admin", "super_admin"].includes(dbUser.role)
    if (!isAdmin && dbUser.employee_id !== assignment.evaluator_id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }
    const { data: form } = await svc.from("probation_evaluations")
      .select("*, items:probation_evaluation_items(*)")
      .eq("assignment_id", aid).maybeSingle()
    return NextResponse.json({ assignment, employee: assignment.employee, form })
  }

  // Employee: ดูผลของตัวเอง (เฉพาะ approved)
  if (mode === "employee") {
    const empId = dbUser.employee_id
    if (!empId) return NextResponse.json({ forms: [] })

    const { data: forms } = await svc.from("probation_evaluations")
      .select("*, evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th), items:probation_evaluation_items(*)")
      .eq("employee_id", empId)
      .in("status", ["approved"])
      .order("round")
    return NextResponse.json({ forms: forms ?? [] })
  }

  // Manager: ดึง "แม่แบบ" จากการประเมินที่ผ่านมา (ของลูกน้องตัวเอง — ข้ามบริษัทได้)
  // ใช้ตอนกด "เริ่มจาก..." เพื่อคัดลอกหัวข้อ/น้ำหนัก/คำอธิบายของฟอร์มเก่า
  if (mode === "copy_sources") {
    const managerId = dbUser.employee_id
    if (!managerId) return NextResponse.json({ same_employee: [], team: [] })

    const forEmployeeId = url.get("for_employee_id")
    const forRound = Number(url.get("for_round")) || 0

    // ลูกน้องของตัวเอง (active subs)
    const { data: subRows } = await svc
      .from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", managerId)
      .is("effective_to", null)
    const teamIds = Array.from(new Set((subRows ?? []).map((r: any) => r.employee_id).filter(Boolean)))

    const SELECT = "id, employee_id, round, total_score, grade, status, evaluator_note, attachments, evaluator_id, submitted_at, items:probation_evaluation_items(*), evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th), employee:employees!probation_evaluations_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name))"

    // ฟอร์มทั้งหมดของพนักงานคนนี้ (ใครเคยประเมินก็ได้)
    let sameQuery: any = null
    if (forEmployeeId) {
      sameQuery = svc.from("probation_evaluations")
        .select(SELECT)
        .eq("employee_id", forEmployeeId)
        .neq("status", "draft")
        .order("submitted_at", { ascending: false })
    }

    // ฟอร์มของลูกน้องคนอื่นในทีมเดียวกัน (ใครเคยประเมินก็ได้)
    let teamQuery: any = null
    if (teamIds.length > 0) {
      teamQuery = svc.from("probation_evaluations")
        .select(SELECT)
        .in("employee_id", teamIds)
        .neq("status", "draft")
        .order("submitted_at", { ascending: false })
    }

    const [sameRes, teamRes] = await Promise.all([
      sameQuery ?? Promise.resolve({ data: [] as any[] }),
      teamQuery ?? Promise.resolve({ data: [] as any[] }),
    ])

    const same_employee: any[] = []
    const team: any[] = []
    const seen = new Set<string>()
    const sortItems = (f: any) => { if (Array.isArray(f.items)) f.items.sort((a: any, b: any) => a.order_no - b.order_no); return f }

    for (const f of (sameRes.data ?? [])) {
      if (forRound && f.round === forRound) continue
      seen.add(f.id)
      same_employee.push(sortItems(f))
    }

    for (const f of (teamRes.data ?? [])) {
      if (seen.has(f.id)) continue
      if (f.employee_id === forEmployeeId) continue
      team.push(sortItems(f))
    }

    return NextResponse.json({ same_employee, team })
  }

  // Admin: "ยังไม่ได้ประเมิน" — พนักงานที่ถึง/เลยกำหนดรอบ 45 หรือ 90 แต่ยังไม่ถูกประเมิน
  if (mode === "pending") {
    if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }
    let eq = svc.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, hire_date, phase2_start_date, company_id, position:positions(name), department:departments(name)")
      .eq("employment_status", "probation")
      .eq("is_active", true)
      .is("deleted_at", null)
    if (dbUser.role !== "super_admin") eq = eq.eq("company_id", companyId)
    const { data: emps } = await eq
    const empIds = (emps ?? []).map((e: any) => e.id)
    if (empIds.length === 0) return NextResponse.json({ items: [] })

    // รอบที่ประเมินแล้ว (submitted/approved)
    const { data: evals } = await svc.from("probation_evaluations")
      .select("employee_id, round, status")
      .in("employee_id", empIds)
      .in("status", ["submitted", "approved"])
    const done = new Set<string>((evals ?? []).map((ev: any) => `${ev.employee_id}:${ev.round}`))

    // หัวหน้าตรงของแต่ละคน
    const { data: mgrRows } = await svc.from("employee_manager_history")
      .select("employee_id, manager:employees!manager_id(first_name_th, last_name_th, nickname)")
      .in("employee_id", empIds)
      .is("effective_to", null)
    const mgrByEmp = new Map<string, any>()
    for (const r of (mgrRows ?? [])) if (!mgrByEmp.has(r.employee_id)) mgrByEmp.set(r.employee_id, r.manager)

    const today = new Date()
    const items: any[] = []
    for (const e of (emps ?? [])) {
      const start = e.phase2_start_date || e.hire_date
      if (!start) continue
      const daysFromStart = Math.ceil((today.getTime() - new Date(start).getTime()) / 86400000)
      for (const round of PROBATION_ROUNDS) {
        if (done.has(`${e.id}:${round}`)) continue          // ประเมินแล้ว
        const dueDays = ROUND_DAYS[round]
        if (daysFromStart < dueDays - 14) continue           // ยังไม่ถึงช่วงเปิดประเมิน (เปิด 14 วันก่อนกำหนด)
        items.push({
          employee: e,
          round,
          due_date: addDaysToDate(start, dueDays),
          days_from_start: daysFromStart,
          days_overdue: daysFromStart - dueDays,             // >0 = เลยกำหนด, <=0 = ถึง/ใกล้กำหนด
          direct_manager: mgrByEmp.get(e.id) ?? null,
        })
      }
    }
    items.sort((a, b) => b.days_overdue - a.days_overdue)     // เลยกำหนดมากสุดก่อน
    return NextResponse.json({ items })
  }

  // Admin: ดูทั้งบริษัท (super_admin เห็นทุกบริษัท)
  if (mode === "admin") {
    let q = svc.from("probation_evaluations")
      .select("*, employee:employees!probation_evaluations_employee_id_fkey(first_name_th, last_name_th, employee_code, avatar_url, hire_date, position:positions(name), department:departments(name)), evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th)")
      .order("created_at", { ascending: false })
    if (dbUser.role !== "super_admin") q = q.eq("company_id", companyId)
    const { data: forms } = await q
    return NextResponse.json({ forms: forms ?? [] })
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action } = body

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // ══════════════════════════════════════════════════════════════
  // HR Approve
  // ══════════════════════════════════════════════════════════════
  if (action === "approve") {
    if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติ" }, { status: 403 })
    }
    const { form_id } = body
    if (!form_id) return NextResponse.json({ error: "form_id จำเป็น" }, { status: 400 })

    const { data: form } = await svc.from("probation_evaluations").select("*").eq("id", form_id).single()
    if (!form) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })
    if (form.status !== "submitted") {
      return NextResponse.json({ error: "ฟอร์มนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 })
    }

    await svc.from("probation_evaluations").update({
      status: "approved", approved_by: dbUser.employee_id,
      approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", form_id)

    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", form.employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    // แจ้งพนักงาน
    await svc.from("notifications").insert({
      employee_id: form.employee_id,
      type: "probation_eval_approved",
      title: `ผลประเมินทดลองงาน${ROUND_LABELS[form.round]} ได้รับอนุมัติ`,
      body: `ผลประเมินทดลองงานของคุณได้รับอนุมัติแล้ว — เกรด ${form.grade} (${form.total_score}%)`,
      ref_table: "probation_evaluations", ref_id: form_id, is_read: false,
    })

    // แจ้งหัวหน้า
    if (form.evaluator_id) {
      await svc.from("notifications").insert({
        employee_id: form.evaluator_id,
        type: "probation_eval_approved",
        title: `HR อนุมัติประเมินทดลองงาน ${empName} ${ROUND_LABELS[form.round]}`,
        body: `ผลประเมินทดลองงานของ ${empName} ได้รับอนุมัติแล้ว`,
        ref_table: "probation_evaluations", ref_id: form_id, is_read: false,
      })
    }

    // ดึงชื่อ actor
    const { data: actorEmpApprove } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameApprove = actorEmpApprove ? `${actorEmpApprove.first_name_th} ${actorEmpApprove.last_name_th}` : "Admin"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameApprove, action: "approved_probation_eval",
      entityType: "probation_evaluation", entityId: form_id,
      description: `อนุมัติประเมินทดลองงาน ${empName} ${ROUND_LABELS[form.round]} — เกรด ${form.grade} โดย ${actorNameApprove}`,
      companyId: form.company_id,
    })

    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // HR Reject
  // ══════════════════════════════════════════════════════════════
  if (action === "reject") {
    if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งคืน" }, { status: 403 })
    }
    const { form_id, rejection_note } = body
    if (!form_id) return NextResponse.json({ error: "form_id จำเป็น" }, { status: 400 })

    const { data: form } = await svc.from("probation_evaluations").select("*").eq("id", form_id).single()
    if (!form) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })
    if (form.status !== "submitted") {
      return NextResponse.json({ error: "ฟอร์มนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 })
    }

    await svc.from("probation_evaluations").update({
      status: "rejected", rejection_note: rejection_note || "",
      updated_at: new Date().toISOString(),
    }).eq("id", form_id)

    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", form.employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    if (form.evaluator_id) {
      await svc.from("notifications").insert({
        employee_id: form.evaluator_id,
        type: "probation_eval_rejected",
        title: `ประเมินทดลองงาน ${empName} ${ROUND_LABELS[form.round]} ถูกส่งคืน`,
        body: `HR ส่งคืนประเมินทดลองงาน — กรุณาแก้ไขและส่งใหม่${rejection_note ? ` (${rejection_note})` : ""}`,
        ref_table: "probation_evaluations", ref_id: form_id, is_read: false,
      })
    }

    const { data: actorEmpReject } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameReject = actorEmpReject ? `${actorEmpReject.first_name_th} ${actorEmpReject.last_name_th}` : "Admin"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameReject, action: "rejected_probation_eval",
      entityType: "probation_evaluation", entityId: form_id,
      description: `ส่งคืนประเมินทดลองงาน ${empName} ${ROUND_LABELS[form.round]}${rejection_note ? ` — ${rejection_note}` : ""} โดย ${actorNameReject}`,
      companyId: form.company_id,
    })

    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Save Draft / Submit (Manager)
  // ══════════════════════════════════════════════════════════════
  const { employee_id, round, items, evaluator_note, attachments: rawAttachments, is_passed, assignment_id } = body
  const passVal: boolean | null = typeof is_passed === "boolean" ? is_passed : null

  if (!employee_id || round === undefined || round === null) {
    return NextResponse.json({ error: "employee_id และ round จำเป็น" }, { status: 400 })
  }

  // ── โหลด assignment (ถ้าเป็นการประเมินแบบมอบหมาย) ──
  let assignment: any = null
  if (assignment_id) {
    const { data: a } = await svc.from("probation_evaluation_assignments").select("*").eq("id", assignment_id).single()
    if (!a) return NextResponse.json({ error: "ไม่พบงานมอบหมาย" }, { status: 404 })
    assignment = a
  }

  // Sanitize attachments: array of {url, name, size?}, max 10
  const attachments: { url: string; name: string; size?: number }[] = Array.isArray(rawAttachments)
    ? rawAttachments
        .filter((a: any) => a && typeof a.url === "string" && typeof a.name === "string")
        .slice(0, 10)
        .map((a: any) => ({
          url:  String(a.url),
          name: String(a.name),
          ...(typeof a.size === "number" ? { size: a.size } : {}),
        }))
    : []

  // Validate weight sum
  const totalWeight = (items ?? []).reduce((s: number, i: any) => s + (Number(i.weight_pct) || 0), 0)
  if (action === "submit" && Math.abs(totalWeight - 100) > 0.01) {
    return NextResponse.json({ error: "ค่าน้ำหนักรวมต้องเท่ากับ 100%" }, { status: 400 })
  }

  if (action === "submit") {
    for (const item of items ?? []) {
      if (!item.actual_score || item.actual_score < 1 || item.actual_score > 100) {
        return NextResponse.json({ error: "กรุณากรอกคะแนน (1-100) ทุกข้อ" }, { status: 400 })
      }
    }
    // ── บังคับติ๊กผลการประเมิน ผ่าน/ไม่ผ่าน ก่อนส่ง ──
    if (passVal === null) {
      return NextResponse.json({ error: "กรุณาเลือกผลการประเมิน (ผ่าน / ไม่ผ่าน) ก่อนส่ง" }, { status: 400 })
    }
  }

  // Calculate
  const scoredItems = (items ?? []).map((item: any, idx: number) => {
    const w = Number(item.weight_pct) || 0
    const a = Number(item.actual_score) || 0
    const weighted = Math.round((w * a / 100) * 100) / 100
    return { ...item, order_no: idx + 1, weight_pct: w, actual_score: a, weighted_score: weighted }
  })

  const totalScore = Math.round(scoredItems.reduce((s: number, i: any) => s + i.weighted_score, 0) * 100) / 100
  const grade = calcGrade(totalScore)
  const status = action === "submit" ? "submitted" : "draft"

  // Get start date for due_date calculation
  //   พนักงาน 2 เฟส (PC): นับทดลองงานจาก phase2_start_date (วันเป็นพนักงานจริง) แทน hire_date
  const { data: emp } = await svc.from("employees").select("hire_date, phase2_start_date, company_id").eq("id", employee_id).single()
  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
  const dueDays = assignment?.due_days ?? ROUND_DAYS[round] ?? 119
  const dueDate = assignment?.due_date ?? addDaysToDate(effectiveEmploymentStart(emp) || emp.hire_date, dueDays)
  const roundLabel = assignment?.label || ROUND_LABELS[round] || `รอบ ${round}`

  // ตรวจสิทธิ์ + คำนวณ role
  const isAdmin = ["hr_admin", "super_admin"].includes(dbUser.role)
  let evaluatorRole: "direct_manager" | "skip_level" | "additional" | "hr_admin" = "direct_manager"
  if (assignment) {
    // การประเมินแบบมอบหมาย — ผู้ประเมินที่ถูกกำหนด (ใครก็ได้) หรือ admin
    if (!isAdmin && dbUser.employee_id !== assignment.evaluator_id) {
      return NextResponse.json({ error: "คุณไม่ได้ถูกมอบหมายให้ประเมินคนนี้" }, { status: 403 })
    }
    evaluatorRole = isAdmin ? "hr_admin" : "additional"
  } else if (isAdmin) {
    evaluatorRole = "hr_admin"
  } else {
    const auth = await canEvaluate(svc, dbUser.employee_id, employee_id, "probation")
    if (!auth.allowed) {
      return NextResponse.json({ error: "คุณไม่ใช่หัวหน้าของพนักงานคนนี้" }, { status: 403 })
    }
    evaluatorRole = auth.role
  }

  // Check existing — assignment → หาโดย assignment_id, ไม่งั้น slot ปกติ (assignment_id null)
  let existingQ = svc.from("probation_evaluations").select("id, status").eq("employee_id", employee_id).eq("round", round)
  existingQ = assignment_id ? existingQ.eq("assignment_id", assignment_id) : existingQ.is("assignment_id", null)
  const { data: existing } = await existingQ.maybeSingle()

  let formId = existing?.id

  if (formId) {
    const newStatus = isAdmin && action === "submit" ? "approved" : status

    await svc.from("probation_evaluations").update({
      total_score: totalScore, grade, status: newStatus, evaluator_note,
      is_passed: passVal,
      attachments,
      evaluator_id: dbUser.employee_id, evaluator_role: evaluatorRole,
      rejection_note: null,
      due_date: dueDate,
      approved_by: isAdmin && action === "submit" ? dbUser.employee_id : (newStatus === "submitted" ? null : undefined),
      approved_at: isAdmin && action === "submit" ? new Date().toISOString() : (newStatus === "submitted" ? null : undefined),
      submitted_at: action === "submit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", formId)
    await svc.from("probation_evaluation_items").delete().eq("evaluation_id", formId)
  } else {
    const { data: newForm, error } = await svc.from("probation_evaluations").insert({
      company_id: emp.company_id,
      employee_id, evaluator_id: dbUser.employee_id,
      evaluator_role: evaluatorRole,
      round, due_date: dueDate,
      assignment_id: assignment_id ?? null,
      total_score: totalScore, grade, status, evaluator_note,
      is_passed: passVal,
      attachments,
      submitted_at: action === "submit" ? new Date().toISOString() : null,
    }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    formId = newForm.id
  }

  // Insert items
  const itemRows = scoredItems.map((item: any) => ({
    evaluation_id: formId,
    order_no: item.order_no,
    category: item.category || "",
    description: item.description || "",
    weight_pct: item.weight_pct,
    actual_score: item.actual_score,
    weighted_score: item.weighted_score,
    is_mandatory: item.is_mandatory ?? false,
    comment: item.comment || "",
  }))

  const { error: itemErr } = await svc.from("probation_evaluation_items").insert(itemRows)
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  // Notifications on submit → HR only
  if (action === "submit") {
    const { data: evalEmp } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
    const evalName = evalEmp ? `${evalEmp.first_name_th} ${evalEmp.last_name_th}` : "หัวหน้า"
    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    const { data: hrUsers } = await svc.from("users")
      .select("employee_id")
      .eq("company_id", emp.company_id)
      .in("role", ["hr_admin", "super_admin"])
      .eq("is_active", true)

    for (const hr of (hrUsers ?? [])) {
      if (hr.employee_id) {
        await svc.from("notifications").insert({
          employee_id: hr.employee_id,
          type: "probation_eval_pending",
          title: `ประเมินทดลองงาน${roundLabel} — ${empName} รอตรวจสอบ`,
          body: `${evalName} ส่งผลประเมินทดลองงานของ ${empName} — เกรด ${grade} (${totalScore}%) รอ HR อนุมัติ`,
          ref_table: "probation_evaluations", ref_id: formId, is_read: false,
        })
      }
    }

    // ── ส่งอีเมลแจ้งเตือนไปยังผู้รับที่ตั้งค่าไว้ (fire-and-forget, ไม่บล็อก response) ──
    try {
      const { data: recipients, error: recErr } = await svc
        .from("probation_email_recipients")
        .select("email")
        .eq("company_id", emp.company_id)
        .eq("is_active", true)
      if (recErr) {
        // ตารางยังไม่ถูกสร้าง (ยังไม่ได้รัน migration) หรือ query ล้มเหลว
        console.error("[probation-eval] อ่านรายชื่อผู้รับอีเมลไม่ได้ (รัน add_probation_email_recipients.sql หรือยัง?):", recErr.message)
      }
      const toList = Array.from(
        new Set((recipients ?? []).map((r: any) => String(r.email).trim().toLowerCase()).filter(Boolean)),
      )
      console.log(`[probation-eval] ผู้รับอีเมลที่เปิดใช้งาน: ${toList.length} คน (company ${emp.company_id})`)
      if (toList.length > 0) {
        if (!process.env.RESEND_API_KEY) {
          console.error("[probation-eval] ไม่ได้ตั้งค่า RESEND_API_KEY — ส่งอีเมลไม่ได้")
        } else {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""
          const mail = probationEvalSubmittedEmail({
            employeeName: empName,
            evaluatorName: evalName,
            roundLabel,
            grade,
            score: totalScore,
            isPassed: passVal,
            reviewUrl: appUrl ? `${appUrl}/admin/probation-eval` : undefined,
          })
          // Resend SDK คืน { data, error } — ไม่ throw เวลา API error → ต้องเช็ค error เอง
          const { data: sent, error: sendErr } = await getResend().emails.send({
            from: "GOODHR <noreply@shd-technology.co.th>",
            to: toList,
            subject: mail.subject,
            html: mail.html,
          })
          if (sendErr) console.error("[probation-eval] Resend ส่งอีเมลไม่สำเร็จ:", sendErr)
          else console.log(`[probation-eval] ส่งอีเมลแล้ว id=${(sent as any)?.id} → ${toList.join(", ")}`)
        }
      }
    } catch (e) {
      console.error("[probation-eval] ส่งอีเมลแจ้งเตือนไม่สำเร็จ (exception):", e)
    }
  }

  if (action === "submit") {
    const { data: empInfo2 } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
    const empN = empInfo2 ? `${empInfo2.first_name_th} ${empInfo2.last_name_th}` : "พนักงาน"
    const { data: actorEmpSubmit } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameSubmit = actorEmpSubmit ? `${actorEmpSubmit.first_name_th} ${actorEmpSubmit.last_name_th}` : "หัวหน้า"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameSubmit, action: "submit_probation_eval",
      entityType: "probation_evaluation", entityId: formId!,
      description: `ส่งประเมินทดลองงาน ${empN} ${roundLabel} — เกรด ${grade} (${totalScore}%) โดย ${actorNameSubmit}`,
      companyId: emp!.company_id,
    })
  }

  return NextResponse.json({ success: true, form_id: formId, total_score: totalScore, grade })
}
