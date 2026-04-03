import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

const ROUND_DAYS: Record<number, number> = { 1: 60, 2: 90, 3: 119 }
const ROUND_LABELS: Record<number, string> = { 1: "รอบที่ 1 (60 วัน)", 2: "รอบที่ 2 (90 วัน)", 3: "รอบที่ 3 (119 วัน)" }

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

  // Manager: ดึงลูกน้องที่อยู่ในช่วงทดลองงาน
  if (mode === "manager") {
    const managerId = dbUser.employee_id
    if (!managerId) return NextResponse.json({ members: [], forms: [] })

    // ดึงลูกน้อง
    const { data: history } = await svc
      .from("employee_manager_history")
      .select("employee_id, employee:employees!employee_id(id, first_name_th, last_name_th, employee_code, avatar_url, hire_date, employment_status, probation_end_date, position:positions(name), department:departments(name))")
      .eq("manager_id", managerId)
      .is("effective_to", null)

    // เอาเฉพาะพนักงานที่ยังอยู่ในช่วงทดลองงาน
    // เงื่อนไข: อายุงาน ≤ 150 วัน (เผื่อเลยกำหนดรอบ 3) AND ยังไม่ผ่านโปรฯ
    // ถ้า employment_status = "probation" หรือ มี probation_end_date หรือ อายุงาน ≤ 121 วัน (ยังไม่ครบทดลอง)
    const allMembers = (history ?? []).map((h: any) => h.employee).filter(Boolean)
    const today = new Date()
    const members = allMembers.filter((m: any) => {
      if (!m.hire_date) return false
      const daysSinceHire = Math.ceil((today.getTime() - new Date(m.hire_date).getTime()) / 86400000)
      // แสดงถ้า: สถานะเป็น probation, หรือ มี probation_end_date, หรือ อายุงาน ≤ 150 วัน (ยังไม่เกินรอบ 3 + buffer)
      if (m.employment_status === "probation") return true
      if (m.probation_end_date) return daysSinceHire <= 150
      return daysSinceHire <= 150
    })

    // ดึง evaluations ที่มีอยู่
    const memberIds = members.map((m: any) => m.id)
    let forms: any[] = []
    if (memberIds.length > 0) {
      const { data } = await svc.from("probation_evaluations")
        .select("id, employee_id, round, due_date, total_score, grade, status, submitted_at, rejection_note")
        .in("employee_id", memberIds)
      forms = data ?? []
    }

    return NextResponse.json({ members, forms })
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

  // Admin: ดูทั้งบริษัท
  if (mode === "admin") {
    const { data: forms } = await svc.from("probation_evaluations")
      .select("*, employee:employees!probation_evaluations_employee_id_fkey(first_name_th, last_name_th, employee_code, avatar_url, hire_date, position:positions(name), department:departments(name)), evaluator:employees!probation_evaluations_evaluator_id_fkey(first_name_th, last_name_th)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
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
  const { employee_id, round, items, evaluator_note } = body

  if (!employee_id || !round) {
    return NextResponse.json({ error: "employee_id และ round จำเป็น" }, { status: 400 })
  }

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

  // Get hire_date for due_date calculation
  const { data: emp } = await svc.from("employees").select("hire_date, company_id").eq("id", employee_id).single()
  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
  const dueDate = addDaysToDate(emp.hire_date, ROUND_DAYS[round] || 119)

  // Check existing
  const { data: existing } = await svc.from("probation_evaluations")
    .select("id, status").eq("employee_id", employee_id).eq("round", round).single()

  const isAdmin = ["hr_admin", "super_admin"].includes(dbUser.role)

  let formId = existing?.id

  if (formId) {
    const newStatus = isAdmin && action === "submit" ? "approved" : status

    await svc.from("probation_evaluations").update({
      total_score: totalScore, grade, status: newStatus, evaluator_note,
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
      round, due_date: dueDate,
      total_score: totalScore, grade, status, evaluator_note,
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
          title: `ประเมินทดลองงาน${ROUND_LABELS[round]} — ${empName} รอตรวจสอบ`,
          body: `${evalName} ส่งผลประเมินทดลองงานของ ${empName} — เกรด ${grade} (${totalScore}%) รอ HR อนุมัติ`,
          ref_table: "probation_evaluations", ref_id: formId, is_read: false,
        })
      }
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
      description: `ส่งประเมินทดลองงาน ${empN} ${ROUND_LABELS[round]} — เกรด ${grade} (${totalScore}%) โดย ${actorNameSubmit}`,
      companyId: emp!.company_id,
    })
  }

  return NextResponse.json({ success: true, form_id: formId, total_score: totalScore, grade })
}
