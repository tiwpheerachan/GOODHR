import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

function calcGrade(score: number): string {
  if (score >= 91) return "A"
  if (score >= 81) return "B"
  if (score >= 71) return "C"
  return "D"
}

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
    let query = svc.from("kpi_forms").select("id, employee_id, year, month, total_score, grade, status, submitted_at").eq("year", year).eq("evaluator_id", managerId)
    if (month) query = query.eq("month", month)
    const { data: forms } = await query

    return NextResponse.json({ members, forms: forms ?? [] })
  }

  // Employee: ดึง KPI ตัวเอง
  if (mode === "employee") {
    const empId = employeeId || dbUser.employee_id
    if (!empId) return NextResponse.json({ forms: [] })

    let query = svc.from("kpi_forms")
      .select("*, evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th), items:kpi_items(*)")
      .eq("employee_id", empId).eq("year", year).in("status", ["submitted", "acknowledged"]).order("month", { ascending: false })
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

// ── POST: สร้าง/อัปเดต KPI form ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { employee_id, year, month, items, evaluator_note, action } = body
  // action: "save_draft" | "submit"

  const svc = createServiceClient()

  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

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

  if (existing && existing.status === "submitted") {
    return NextResponse.json({ error: "ฟอร์มนี้ถูกส่งแล้ว ไม่สามารถแก้ไขได้" }, { status: 400 })
  }

  let formId = existing?.id

  if (formId) {
    // Update
    await svc.from("kpi_forms").update({
      total_score: totalScore, grade, status, evaluator_note,
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

  // Send notifications on submit
  if (action === "submit") {
    const evaluatorName = `${dbUser.employee_id ? "" : "Admin"}`
    // Get evaluator name
    const { data: evalEmp } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
    const evalName = evalEmp ? `${evalEmp.first_name_th} ${evalEmp.last_name_th}` : "หัวหน้า"

    const monthNames = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

    // Notify employee
    await svc.from("notifications").insert({
      employee_id: employee_id,
      type: "kpi_submitted",
      title: `ผลประเมิน KPI ${monthNames[month]} ${year}`,
      body: `${evalName} ส่งผลประเมิน KPI ของคุณแล้ว — เกรด ${grade} (${totalScore}%)`,
      ref_table: "kpi_forms",
      ref_id: formId,
      is_read: false,
    })

    // Notify HR (all hr_admin + super_admin in company)
    const { data: hrUsers } = await svc.from("users")
      .select("employee_id")
      .eq("company_id", dbUser.company_id)
      .in("role", ["hr_admin", "super_admin"])
      .eq("is_active", true)

    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    for (const hr of (hrUsers ?? [])) {
      if (hr.employee_id) {
        await svc.from("notifications").insert({
          employee_id: hr.employee_id,
          type: "kpi_submitted",
          title: `KPI ${monthNames[month]} — ${empName}`,
          body: `${evalName} ประเมิน ${empName} — เกรด ${grade} (${totalScore}%)`,
          ref_table: "kpi_forms",
          ref_id: formId,
          is_read: false,
        })
      }
    }
  }

  return NextResponse.json({ success: true, form_id: formId, total_score: totalScore, grade })
}
