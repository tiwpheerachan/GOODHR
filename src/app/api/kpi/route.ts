import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"
import {
  KPI_GRADE_INCENTIVE_TABLE,
  calcGrade,
  calcGradeIncentive,
  VALID_EVAL_TYPES,
  type EvaluationType,
} from "@/lib/utils/kpi"
import { getManageableEmployees, canEvaluate } from "@/lib/utils/evaluator-chain"

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

  // Manager: ดึง KPI ลูกน้องตัวเอง + คนที่กำหนดให้ประเมิน
  //   ปกติ → เฉพาะลูกน้องตรงของ user (ยึดตาม manager hierarchy)
  //   Admin override (hr_admin/super_admin) → เปิดได้เฉพาะตอน edit ฟอร์มคนใดคนหนึ่ง
  //   = ส่ง query `employee_id=...` มาด้วย → unlock เห็นคนนั้นได้แม้ไม่ใช่ลูกน้องตรง
  if (mode === "manager") {
    const isAdminRole = ["hr_admin", "super_admin"].includes(dbUser.role)
    const managerId = dbUser.employee_id
    const targetEmployeeId = url.get("employee_id")
    const adminOverride = isAdminRole && !!targetEmployeeId

    let members: any[] = []
    let memberIds: string[] = []

    if (adminOverride) {
      // Admin เปิดฟอร์มคนใดคนหนึ่ง → ดึงเฉพาะคนนั้น (ปลดล็อก permission)
      const { data: emp } = await svc.from("employees")
        .select("id, employee_code, first_name_th, last_name_th, nickname, avatar_url, employment_status, department:departments(name), position:positions(name)")
        .eq("id", targetEmployeeId).maybeSingle()
      if (emp) {
        members = [{
          ...emp,
          department_name: (emp.department as any)?.name ?? null,
          position_name: (emp.position as any)?.name ?? null,
        }]
        memberIds = [emp.id]
      }
    } else {
      if (!managerId) return NextResponse.json({ forms: [], members: [] })
      // ดึงรายชื่อพนักงานที่ user คนนี้จัดการได้ (direct + skip-1 + additional)
      members = await getManageableEmployees(svc, managerId, "kpi")
      memberIds = members.map((m: any) => m.id)
    }

    // ดึง KPI forms ของ "พนักงานเหล่านี้" (ไม่ filter โดย evaluator_id —
    // เพราะ skip-level อาจดูฟอร์มที่ direct ประเมินไว้)
    let forms: any[] = []
    if (memberIds.length > 0) {
      let query = svc.from("kpi_forms")
        .select("id, employee_id, year, month, total_score, grade, status, evaluator_id, evaluator_role, submitted_at, rejection_note, evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th)")
        .in("employee_id", memberIds)
        .eq("year", year)
      if (month) query = query.eq("month", month)
      const { data } = await query
      forms = data ?? []
    }

    return NextResponse.json({ members, forms })
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
    // super_admin เห็นทุกบริษัท, hr_admin เห็นเฉพาะบริษัทตัวเอง
    const filterCompany = url.get("company") || (dbUser.role === "super_admin" ? null : companyId)

    let query = svc.from("kpi_forms")
      .select("*, employee:employees!kpi_forms_employee_id_fkey(first_name_th, last_name_th, employee_code, avatar_url, position:positions(name), department:departments(name)), evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th)")
      .eq("year", year).order("month", { ascending: false })
    if (filterCompany) query = query.eq("company_id", filterCompany)
    if (month) query = query.eq("month", month)
    const { data: forms } = await query

    // ── Attach หัวหน้าตรง (จาก employee_manager_history) สำหรับทุก form ──
    const empIds = Array.from(new Set((forms ?? []).map((f: any) => f.employee_id)))
    let mgrMap = new Map<string, any>()
    if (empIds.length > 0) {
      const { data: histRows } = await svc.from("employee_manager_history")
        .select("employee_id, manager_id, manager:employees!manager_id(first_name_th, last_name_th, nickname)")
        .in("employee_id", empIds)
        .is("effective_to", null)
      for (const r of (histRows ?? [])) {
        if (r.manager) mgrMap.set(r.employee_id, r.manager)
      }
    }
    const enriched = (forms ?? []).map((f: any) => ({
      ...f,
      direct_manager: mgrMap.get(f.employee_id) ?? null,
    }))

    // ── pending_employees: คนที่ "ควรประเมิน KPI" ในรอบเดือนนี้แต่ยังไม่มีฟอร์ม / มีแต่ draft ──
    //   จะส่งกลับเฉพาะตอนเลือก month (เพราะวัดต่อเดือน)
    let pending_employees: any[] = []
    if (month) {
      // 1) ดึงพนักงาน active ที่มี kpi_bonus_settings active (= มีฐาน KPI)
      let evalQ = svc.from("kpi_bonus_settings")
        .select("employee_id, standard_amount, employee:employees!kpi_bonus_settings_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, employment_status, company_id, department:departments(name), position:positions(name))")
        .eq("is_active", true)
        .gt("standard_amount", 0)
      const { data: settings } = await evalQ

      // กรอง: active employee + บริษัทตรง
      const eligible = (settings ?? [])
        .map((s: any) => ({ ...s.employee, _standardAmount: Number(s.standard_amount) }))
        .filter((e: any) => e && e.id && e.employment_status === "active"
          && (!filterCompany || e.company_id === filterCompany))

      // 2) ดึงฟอร์มเดือนนี้ของทุกคน — รวมทั้ง draft + submitted + approved
      const eligibleIds = eligible.map((e: any) => e.id)
      let evaluatedMap = new Map<string, any>()
      if (eligibleIds.length > 0) {
        let formQ = svc.from("kpi_forms")
          .select("id, employee_id, status, evaluator_id, total_score, grade, submitted_at, evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th, nickname)")
          .in("employee_id", eligibleIds)
          .eq("year", year)
          .eq("month", month)
        const { data: monthForms } = await formQ
        for (const f of (monthForms ?? [])) {
          evaluatedMap.set(f.employee_id, f)
        }
      }

      // 3) เติม direct_manager
      const mgrIds = Array.from(new Set(eligibleIds))
      let mgr2Map = new Map<string, any>()
      if (mgrIds.length > 0) {
        const { data: histRows2 } = await svc.from("employee_manager_history")
          .select("employee_id, manager_id, manager:employees!manager_id(first_name_th, last_name_th, nickname)")
          .in("employee_id", mgrIds)
          .is("effective_to", null)
        for (const r of (histRows2 ?? [])) {
          if (r.manager) mgr2Map.set(r.employee_id, r.manager)
        }
      }

      // 4) สถานะ: not_started (ไม่มีฟอร์ม) / draft (มีแต่ยังไม่ submit) / submitted (รอ HR) / approved
      pending_employees = eligible
        .map((emp: any) => {
          const form = evaluatedMap.get(emp.id)
          let pending_status: "not_started" | "draft" | "submitted" | "approved" | "rejected"
          if (!form) pending_status = "not_started"
          else if (form.status === "draft") pending_status = "draft"
          else if (form.status === "submitted") pending_status = "submitted"
          else if (form.status === "rejected") pending_status = "rejected"
          else pending_status = "approved"
          return {
            id: emp.id,
            first_name_th: emp.first_name_th,
            last_name_th: emp.last_name_th,
            nickname: emp.nickname,
            employee_code: emp.employee_code,
            avatar_url: emp.avatar_url,
            department: emp.department,
            position: emp.position,
            standard_amount: emp._standardAmount,
            direct_manager: mgr2Map.get(emp.id) ?? null,
            form_id: form?.id ?? null,
            pending_status,
          }
        })
        // เฉพาะที่ "ยังไม่เสร็จ" — not_started/draft/rejected
        .filter((e: any) => ["not_started", "draft", "rejected"].includes(e.pending_status))
    }

    return NextResponse.json({ forms: enriched, pending_employees })
  }

  // Manager: ดึง "แม่แบบ" จากการประเมิน KPI ที่ผ่านมา (ของลูกน้องตัวเอง — ข้ามบริษัทได้)
  // ใช้ตอนกด "เริ่มจาก..." เพื่อคัดลอกหัวข้อ/น้ำหนัก/คำอธิบายของฟอร์มเก่า
  if (mode === "copy_sources") {
    const managerId = dbUser.employee_id
    if (!managerId) return NextResponse.json({ same_employee: [], team: [] })

    const forEmployeeId = url.get("for_employee_id")
    const forYear = Number(url.get("for_year")) || year
    const forMonth = Number(url.get("for_month")) || month || 0

    // ลูกน้องตัวเอง (active)
    const { data: subRows } = await svc
      .from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", managerId)
      .is("effective_to", null)
    const teamIds = Array.from(new Set((subRows ?? []).map((r: any) => r.employee_id).filter(Boolean)))

    const SELECT = "id, employee_id, year, month, total_score, grade, status, evaluator_note, evaluator_id, evaluation_type, incentive_amount, bonus_amount, bonus_reason, money_reason, money_reason_attachments, attachments, submitted_at, items:kpi_items(*), evaluator:employees!kpi_forms_evaluator_id_fkey(first_name_th, last_name_th), employee:employees!kpi_forms_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name))"

    // ฟอร์มทั้งหมดของพนักงานคนนี้ (ใครเคยประเมินก็ได้)
    let sameQuery: any = null
    if (forEmployeeId) {
      sameQuery = svc.from("kpi_forms")
        .select(SELECT)
        .eq("employee_id", forEmployeeId)
        .neq("status", "draft")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
    }

    // ฟอร์มของลูกน้องคนอื่นในทีมเดียวกัน (ใครเคยประเมินก็ได้)
    let teamQuery: any = null
    if (teamIds.length > 0) {
      teamQuery = svc.from("kpi_forms")
        .select(SELECT)
        .in("employee_id", teamIds)
        .neq("status", "draft")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
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
      if (f.year === forYear && f.month === forMonth) continue
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

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
}

// ── POST: สร้าง/อัปเดต/อนุมัติ/ส่งคืน KPI form ────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action } = body
  // action: "save_draft" | "submit" | "approve" | "reject" | "revert"

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
  // HR Revert — ย้อนสถานะจาก approved/rejected/acknowledged → submitted หรือ draft
  //   ใช้กรณีอนุมัติแล้วต้องแก้ไข
  // ══════════════════════════════════════════════════════════════
  if (action === "revert") {
    if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ย้อนสถานะ" }, { status: 403 })
    }
    const { form_id, target_status: rawTarget, revert_note } = body
    if (!form_id) return NextResponse.json({ error: "form_id จำเป็น" }, { status: 400 })

    const target_status: "submitted" | "draft" = rawTarget === "draft" ? "draft" : "submitted"

    const { data: form } = await svc.from("kpi_forms").select("*").eq("id", form_id).single()
    if (!form) return NextResponse.json({ error: "ไม่พบฟอร์ม" }, { status: 404 })
    if (!["approved", "rejected", "acknowledged"].includes(form.status)) {
      return NextResponse.json({ error: "ฟอร์มนี้ไม่ได้อยู่ในสถานะที่ย้อนได้ (ต้องเป็น approved/rejected/acknowledged)" }, { status: 400 })
    }

    await svc.from("kpi_forms").update({
      status: target_status,
      approved_by: null,
      approved_at: null,
      rejection_note: target_status === "submitted" ? null : form.rejection_note,
      updated_at: new Date().toISOString(),
    }).eq("id", form_id)

    // ── Notifications + audit ──
    const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th").eq("id", form.employee_id).single()
    const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"

    if (form.evaluator_id) {
      await svc.from("notifications").insert({
        employee_id: form.evaluator_id,
        type: "kpi_reverted",
        title: `KPI ของ ${empName} ถูกย้อนสถานะ`,
        body: `HR ย้อนสถานะ KPI ${MONTH_NAMES[form.month]} ${form.year} ของ ${empName} กลับเป็น "${target_status === "draft" ? "ฉบับร่าง" : "รออนุมัติ"}"${revert_note ? ` — ${revert_note}` : ""}`,
        ref_table: "kpi_forms", ref_id: form_id, is_read: false,
      })
    }

    const { data: actorEmpRev } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorNameRev = actorEmpRev ? `${actorEmpRev.first_name_th} ${actorEmpRev.last_name_th}` : "Admin"

    logAudit(svc, {
      actorId: user.id, actorName: actorNameRev, action: "reverted_kpi",
      entityType: "kpi_form", entityId: form_id,
      description: `ย้อนสถานะ KPI ${empName} ${MONTH_NAMES[form.month]} ${form.year} จาก "${form.status}" → "${target_status}"${revert_note ? ` (${revert_note})` : ""} โดย ${actorNameRev}`,
      companyId: form.company_id,
    })

    return NextResponse.json({ success: true, new_status: target_status })
  }

  // ══════════════════════════════════════════════════════════════
  // Save Draft / Submit (Manager)
  // ══════════════════════════════════════════════════════════════
  const {
    employee_id, year, month, items, evaluator_note,
    evaluation_type: rawEvalType,
    incentive_amount: rawIncentive,
    bonus_amount: rawBonus,
    bonus_reason, money_reason,
    money_reason_attachments: rawMoneyAttachments,
    attachments: rawAttachments,
  } = body

  // Sanitize attachments: array of {url, name}, max 10
  const sanitizeAttach = (raw: any) => Array.isArray(raw)
    ? raw
        .filter((a: any) => a && typeof a.url === "string" && typeof a.name === "string")
        .slice(0, 10)
        .map((a: any) => ({
          url:  String(a.url),
          name: String(a.name),
          ...(typeof a.size === "number" ? { size: a.size } : {}),
        }))
    : []
  const moneyAttachments = sanitizeAttach(rawMoneyAttachments)
  const generalAttachments = sanitizeAttach(rawAttachments)

  const evaluation_type: EvaluationType = VALID_EVAL_TYPES.includes(rawEvalType)
    ? rawEvalType : "standard"
  const isMoneyOnly = evaluation_type === "money_only"
  const isGradeIncentive = evaluation_type === "grade_incentive"

  // ── Validate per mode (เฉพาะตอน submit) ──
  if (action === "submit") {
    if (isMoneyOnly) {
      const amt = Number(rawIncentive)
      if (!Number.isFinite(amt) || amt < 0) {
        return NextResponse.json({ error: "กรุณากรอกจำนวนเงิน" }, { status: 400 })
      }
    } else {
      // standard / grade_incentive ต้องมี items + คะแนน + น้ำหนักรวม 100
      const totalWeight = (items ?? []).reduce((s: number, i: any) => s + (Number(i.weight_pct) || 0), 0)
      if (Math.abs(totalWeight - 100) > 0.01) {
        return NextResponse.json({ error: "ค่าน้ำหนักรวมต้องเท่ากับ 100%" }, { status: 400 })
      }
      for (const item of items ?? []) {
        if (!item.actual_score || item.actual_score < 1 || item.actual_score > 100) {
          return NextResponse.json({ error: `กรุณากรอกคะแนน (1-100) ทุกข้อ` }, { status: 400 })
        }
      }
    }
  }

  // ── Calculate scores + grade ตาม mode ──
  const scoredItems = isMoneyOnly ? [] : (items ?? []).map((item: any, idx: number) => {
    const w = Number(item.weight_pct) || 0
    const a = Number(item.actual_score) || 0
    const weighted = Math.round((w * a / 100) * 100) / 100
    return { ...item, order_no: idx + 1, weight_pct: w, actual_score: a, weighted_score: weighted }
  })

  const totalScore = isMoneyOnly
    ? 0
    : Math.round(scoredItems.reduce((s: number, i: any) => s + i.weighted_score, 0) * 100) / 100

  const grade = isMoneyOnly
    ? null
    : (isGradeIncentive ? calcGradeIncentive(totalScore) : calcGrade(totalScore))

  // ── คำนวณ amounts ตาม mode ──
  // - Mode A (standard): incentive_amount = null (payroll ใช้ kpi_bonus_settings เดิม)
  // - Mode B (money_only): incentive_amount = manager กรอกเอง
  // - Mode C (grade_incentive): incentive_amount = TABLE[grade] auto
  const incentive_amount: number | null = isMoneyOnly
    ? Math.round((Number(rawIncentive) || 0) * 100) / 100
    : isGradeIncentive
      ? (KPI_GRADE_INCENTIVE_TABLE[grade as string] ?? 0)
      : null

  // bonus optional ทุก mode
  const bonus_amount: number | null = (rawBonus !== undefined && rawBonus !== null && rawBonus !== "")
    ? Math.round((Number(rawBonus) || 0) * 100) / 100
    : null

  const status = action === "submit" ? "submitted" : "draft"

  // ตรวจสิทธิ์ + คำนวณ role
  const isAdminRole = ["hr_admin", "super_admin"].includes(dbUser.role)
  let evaluatorRole: "direct_manager" | "skip_level" | "additional" | "hr_admin" = "direct_manager"
  if (isAdminRole) {
    evaluatorRole = "hr_admin"
  } else {
    const auth = await canEvaluate(svc, dbUser.employee_id, employee_id, "kpi")
    if (!auth.allowed) {
      return NextResponse.json({ error: "คุณไม่ใช่หัวหน้าของพนักงานคนนี้" }, { status: 403 })
    }
    evaluatorRole = auth.role
  }
  const effectiveEvaluatorId = dbUser.employee_id

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
    const newStatus = isAdmin && action === "submit" ? "approved" : status

    await svc.from("kpi_forms").update({
      total_score: totalScore, grade, status: newStatus, evaluator_note,
      evaluation_type, incentive_amount, bonus_amount,
      bonus_reason: bonus_reason ?? null,
      money_reason: money_reason ?? null,
      money_reason_attachments: isMoneyOnly ? moneyAttachments : [],
      attachments: generalAttachments,
      evaluator_id: effectiveEvaluatorId,
      evaluator_role: evaluatorRole,
      rejection_note: null,
      approved_by: isAdmin && action === "submit" ? dbUser.employee_id : (newStatus === "submitted" ? null : undefined),
      approved_at: isAdmin && action === "submit" ? new Date().toISOString() : (newStatus === "submitted" ? null : undefined),
      submitted_at: action === "submit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", formId)

    // Delete old items (will re-insert below; empty for money_only)
    await svc.from("kpi_items").delete().eq("kpi_form_id", formId)
  } else {
    const { data: newForm, error } = await svc.from("kpi_forms").insert({
      company_id: dbUser.company_id,
      employee_id,
      evaluator_id: effectiveEvaluatorId,
      evaluator_role: evaluatorRole,
      year, month,
      total_score: totalScore, grade, status, evaluator_note,
      evaluation_type, incentive_amount, bonus_amount,
      bonus_reason: bonus_reason ?? null,
      money_reason: money_reason ?? null,
      money_reason_attachments: isMoneyOnly ? moneyAttachments : [],
      attachments: generalAttachments,
      submitted_at: action === "submit" ? new Date().toISOString() : null,
    }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    formId = newForm.id
  }

  // Insert items (empty array for money_only)
  if (scoredItems.length > 0) {
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
  }

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

  return NextResponse.json({
    success: true,
    form_id: formId,
    total_score: totalScore,
    grade,
    evaluation_type,
    incentive_amount,
    bonus_amount,
  })
}
