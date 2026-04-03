import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

const MONTH_NAMES = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

// ── GET: ดึง KPI forms ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = req.nextUrl.searchParams
  const mode = url.get("mode") // "manager" | "employee" | "admin" | "single"
  const year = Number(url.get("year")) || new Date().getFullYear()
  const month = url.get("month") ? Number(url.get("month")) : null
  const employeeId = url.get("employee_id")
  const formId = url.get("form_id")

  const svc = createServiceClient()

  // ดึง user record
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const companyId = dbUser.company_id

  // Single form with items
  if (mode === "single" && formId) {
    const { data: form } = await svc
      .from("kpi_forms")
      .select("*, employee:employees!kpi_forms_employee_id_fkey(*, position:positions(name), department:departments(name)), evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th), items:kpi_items(*)").eq("id", formId).single()
    return NextResponse.json({ form })
  }

  // Manager: ดึง KPI ลูกน้องตัวเอง
  if (mode === "manager") {
    const managerId = dbUser.employee_id
    if (!managerId) return NextResponse.json({ forms: [] })

    // ดึงลูกน้อง
    const { data: history } = await svc
      .from("employee_manager_history")
      .select("employee_id, employee:employees!employee_id(id, first_name_th, last_name_th, employee_code, avatar_url, position:positions(name), department:departments(name))")
      .eq("manager_id", managerId)
      .is("effective_to", null)

    const members = (history ?? []).map((h: any) => h.employee).filter(Boolean)

    // ดึง KPI forms ที่มีอยู่แล้ว
    let query = svc.from("kpi_forms").select("id, employee_id, year, month, total_score, grade, status, submitted_at, rejection_note").eq("year", year).eq("evaluator_id", managerId)
    if (month) query = query.eq("month", month)
    const { data: forms } = await query

    return NextResponse.json({ members, forms: forms ?? [] })
  }

  // Employee: ดึง KPI ตัวเอง — เห็นเฉพาะที่ HR อนุมัติแล้ว
  if (mode === "employee") {
    const empId = employeeId || dbUser.employee_id
    if (!empId) return NextResponse.json({ forms: [] })

    let query = svc.from("kpi_forms")
      .select("*, evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th), items:kpi_items(*)")
      .eq("employee_id", empId).eq("year", year)
      .in("status", ["approved", "acknowledged"])
      .order("month", { ascending: false })
    if (month) query = query.eq("month", month)
    const { data: forms } = await query

    return NextResponse.json({ forms: forms ?? [] })
  }

  // Admin: ดึง KPI ทั้งบริษัท
  if (mode === "admin") {
    let query = svc.from("kpi_forms")
      .select("*, employee:employees!kpi_forms_employee_id_fkey(first_name_th, last_name_th, employee_code, avatar_url, position:positions(name), department:departments(name)), evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th)")
      .eq("company_id", companyId).eq("year", year).order("month", { ascending: false })
    if (month) query = query.eq("month", month)
    const { data: forms } = await query

    return NextResponse.json({ forms: forms ?? [] })
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
}

// ── POST: สร้าง/อัปเดต/อนุมัติ/ส่งคืน KPI form ────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action } = body
  // action: "save_draft" | "submit" | "approve" | "reject"

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

    const { data: form } = await svc.from("kpi_forms").select("*").eq("id", form_id).single()
    if (!form) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })
    if (form.status !== "submitted") {
      return NextResponse.json({ error: "ฟอร์มนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 })
    }

    await svc.from("kpi_forms").update({
      status: "approved",
      approved_by: dbUser.employee_id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", form_id)

    // ── Notifications ──
    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", form.employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    // แจ้งพนักงาน: ผล KPI ได้รับอนุมัติ
    await svc.from("notifications").insert({
      employee_id: form.employee_id,
      type: "kpi_approved",
      title: `ผลประเมิน KPI ${MONTH_NAMES[form.month]} ${form.year} ได้รับอนุมัติ`,
      body: `ผลประเมิน KPI ของคุณได้รับอนุมัติแล้ว — เกรด ${form.grade} (${form.total_score}%)`,
      ref_table: "kpi_forms", ref_id: form_id, is_read: false,
    })

    // แจ้งหัวหน้า: HR อนุมัติแล้ว
    if (form.evaluator_id) {
      await svc.from("notifications").insert({
        employee_id: form.evaluator_id,
        type: "kpi_approved",
        title: `HR อนุมัติ KPI ของ ${empName}`,
        body: `ผลประเมิน KPI ${MONTH_NAMES[form.month]} ${form.year} ของ ${empName} ได้รับอนุมัติแล้ว`,
        ref_table: "kpi_forms", ref_id: form_id, is_read: false,
      })
    }

    const { data: actorEmpKpiA } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameKpiA = actorEmpKpiA ? `${actorEmpKpiA.first_name_th} ${actorEmpKpiA.last_name_th}` : "Admin"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameKpiA, action: "approved_kpi",
      entityType: "kpi_form", entityId: form_id,
      description: `อนุมัติ KPI ${empName} ${MONTH_NAMES[form.month]} ${form.year} — เกรด ${form.grade} โดย ${actorNameKpiA}`,
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

    const { data: form } = await svc.from("kpi_forms").select("*").eq("id", form_id).single()
    if (!form) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })
    if (form.status !== "submitted") {
      return NextResponse.json({ error: "ฟอร์มนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 })
    }

    await svc.from("kpi_forms").update({
      status: "rejected",
      rejection_note: rejection_note || "",
      updated_at: new Date().toISOString(),
    }).eq("id", form_id)

    // แจ้งหัวหน้า: HR ส่งคืน
    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", form.employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    if (form.evaluator_id) {
      await svc.from("notifications").insert({
        employee_id: form.evaluator_id,
        type: "kpi_rejected",
        title: `KPI ของ ${empName} ถูกส่งคืน`,
        body: `HR ส่งคืน KPI ${MONTH_NAMES[form.month]} ${form.year} ของ ${empName} — กรุณาแก้ไขและส่งใหม่${rejection_note ? ` (${rejection_note})` : ""}`,
        ref_table: "kpi_forms", ref_id: form_id, is_read: false,
      })
    }

    const { data: actorEmpKpiR } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameKpiR = actorEmpKpiR ? `${actorEmpKpiR.first_name_th} ${actorEmpKpiR.last_name_th}` : "Admin"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameKpiR, action: "rejected_kpi",
      entityType: "kpi_form", entityId: form_id,
      description: `ส่งคืน KPI ${empName} ${MONTH_NAMES[form.month]} ${form.year}${rejection_note ? ` — ${rejection_note}` : ""} โดย ${actorNameKpiR}`,
      companyId: form.company_id,
    })

    return NextResponse.json({ success: true })
  }

  // ══════════════════════════════════════════════════════════════
  // Save Draft / Submit (Manager)
  // ══════════════════════════════════════════════════════════════
  const { employee_id, year, month, items, evaluator_note } = body

  // Validate weight sum
  const totalWeight = (items ?? []).reduce((s: number, i: any) => s + (Number(i.weight_pct) || 0), 0)
  if (action === "submit" && Math.abs(totalWeight - 100) > 0.01) {
    return NextResponse.json({ error: "ค่าน้ำหนักรวมต้องเท่ากับ 100%" }, { status: 400 })
  }

  // Validate scores on submit
  if (action === "submit") {
    for (const item of items ?? []) {
      if (!item.actual_score || item.actual_score < 1 || item.actual_score > 100) {
        return NextResponse.json({ error: `กรุณากรอกคะแนน (1-100) ทุกข้อ` }, { status: 400 })
      }
    }
  }

  // Calculate scores
  const scoredItems = (items ?? []).map((item: any, idx: number) => {
    const w = Number(item.weight_pct) || 0
    const a = Number(item.actual_score) || 0
    const weighted = Math.round((w * a / 100) * 100) / 100
    return { ...item, order_no: idx + 1, weight_pct: w, actual_score: a, weighted_score: weighted }
  })

  const totalScore = Math.round(scoredItems.reduce((s: number, i: any) => s + i.weighted_score, 0) * 100) / 100
  const grade = calcGrade(totalScore)
  const status = action === "submit" ? "submitted" : "draft"

  // Check existing form
  const { data: existing } = await svc.from("kpi_forms")
    .select("id, status")
    .eq("employee_id", employee_id)
    .eq("year", year).eq("month", month)
    .single()

  // Admin แก้ไขได้เสมอ, Manager แก้ไขได้แต่ status จะรีเซ็ตเป็น submitted ใหม่
  const isAdmin = ["hr_admin", "super_admin"].includes(dbUser.role)

  let formId = existing?.id

  if (formId) {
    // กำหนด status ใหม่:
    // - Admin แก้ไข → คง approved ได้ (ถ้า action=submit จะเป็น approved เลย)
    // - Manager แก้ไข → ต้องส่ง HR อนุมัติใหม่ (submitted)
    const newStatus = isAdmin && action === "submit" ? "approved" : status

    await svc.from("kpi_forms").update({
      total_score: totalScore, grade, status: newStatus, evaluator_note,
      rejection_note: null,
      approved_by: isAdmin && action === "submit" ? dbUser.employee_id : (newStatus === "submitted" ? null : undefined),
      approved_at: isAdmin && action === "submit" ? new Date().toISOString() : (newStatus === "submitted" ? null : undefined),
      submitted_at: action === "submit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", formId)

    // Delete old items
    await svc.from("kpi_items").delete().eq("kpi_form_id", formId)
  } else {
    // Insert
    const { data: newForm, error } = await svc.from("kpi_forms").insert({
      company_id: dbUser.company_id,
      employee_id,
      evaluator_id: dbUser.employee_id,
      year, month,
      total_score: totalScore, grade, status, evaluator_note,
      submitted_at: action === "submit" ? new Date().toISOString() : null,
    }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    formId = newForm.id
  }

  // Insert items
  const itemRows = scoredItems.map((item: any) => ({
    kpi_form_id: formId,
    order_no: item.order_no,
    category: item.category || "",
    description: item.description || "",
    weight_pct: item.weight_pct,
    actual_score: item.actual_score,
    weighted_score: item.weighted_score,
    is_mandatory: item.is_mandatory ?? false,
    comment: item.comment || "",
  }))

  const { error: itemErr } = await svc.from("kpi_items").insert(itemRows)
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  // ── Notifications on submit: แจ้ง HR เท่านั้น (ไม่แจ้งพนักงาน) ──
  if (action === "submit") {
    const { data: evalEmp } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
    const evalName = evalEmp ? `${evalEmp.first_name_th} ${evalEmp.last_name_th}` : "หัวหน้า"

    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    // แจ้ง HR (ทุก hr_admin + super_admin ในบริษัท)
    const { data: hrUsers } = await svc.from("users")
      .select("employee_id")
      .eq("company_id", dbUser.company_id)
      .in("role", ["hr_admin", "super_admin"])
      .eq("is_active", true)

    for (const hr of (hrUsers ?? [])) {
      if (hr.employee_id) {
        await svc.from("notifications").insert({
          employee_id: hr.employee_id,
          type: "kpi_pending_approval",
          title: `KPI ${MONTH_NAMES[month]} — ${empName} รอตรวจสอบ`,
          body: `${evalName} ส่งผลประเมิน KPI ของ ${empName} — เกรด ${grade} (${totalScore}%) รอ HR อนุมัติ`,
          ref_table: "kpi_forms", ref_id: formId, is_read: false,
        })
      }
    }
  }

  return NextResponse.json({ success: true, form_id: formId, total_score: totalScore, grade })
}
