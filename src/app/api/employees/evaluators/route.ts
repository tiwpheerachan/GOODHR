import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

// GET /api/employees/evaluators?employee_id=...
// คืน list ของ "ผู้ประเมินเพิ่มเติม" สำหรับพนักงานคนนี้
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const empId = req.nextUrl.searchParams.get("employee_id")
  if (!empId) return NextResponse.json({ error: "employee_id required" }, { status: 400 })

  const svc = createServiceClient()
  const { data } = await svc
    .from("employee_evaluators")
    .select("id, evaluator_id, scope, note, created_at, evaluator:employees!evaluator_id(employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname_en, nickname, position:positions(name))")
    .eq("employee_id", empId)
    .order("created_at", { ascending: false })

  return NextResponse.json({ evaluators: data ?? [] })
}

// POST — add new evaluator
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json()
  const { employee_id, evaluator_id, scope, note } = body
  if (!employee_id || !evaluator_id || !scope) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
  }
  if (!["kpi", "probation", "all", "view_only"].includes(scope)) {
    return NextResponse.json({ error: "scope ไม่ถูกต้อง" }, { status: 400 })
  }
  if (employee_id === evaluator_id) {
    return NextResponse.json({ error: "ไม่สามารถตั้งตัวเองเป็นผู้ประเมินได้" }, { status: 400 })
  }

  const { data, error } = await svc.from("employee_evaluators").insert({
    employee_id, evaluator_id, scope,
    note: note ?? null,
    created_by: dbUser.employee_id,
  }).select("id, evaluator:employees!evaluator_id(employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname_en)").single()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "ผู้ประเมินคนนี้ถูกเพิ่มไว้แล้ว" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  const { data: empInfo } = await svc.from("employees").select("first_name_th, last_name_th, first_name_en, last_name_en, nickname_en, company_id").eq("id", employee_id).single()
  const ev: any = data.evaluator
  const empName = empInfo ? `${empInfo.first_name_th} ${empInfo.last_name_th}` : "พนักงาน"
  const evName = ev ? `${ev.first_name_th} ${ev.last_name_th}` : "ผู้ประเมิน"
  const { data: actorEmp } = dbUser.employee_id
    ? await svc.from("employees").select("first_name_th, last_name_th, first_name_en, last_name_en, nickname_en").eq("id", dbUser.employee_id).single()
    : { data: null }
  const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"
  logAudit(svc, {
    actorId: user.id, actorName,
    action: "add_evaluator",
    entityType: "employee_evaluator", entityId: data.id,
    description: `เพิ่ม ${evName} เป็นผู้ประเมิน (${scope}) ของ ${empName} โดย ${actorName}`,
    companyId: empInfo?.company_id,
  })

  return NextResponse.json({ success: true, evaluator: data })
}

// DELETE — remove evaluator
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin"].includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Fetch for audit
  const { data: row } = await svc.from("employee_evaluators")
    .select("employee_id, evaluator_id, scope, employee:employees!employee_id(first_name_th, last_name_th, first_name_en, last_name_en, nickname_en, company_id), evaluator:employees!evaluator_id(first_name_th, last_name_th, first_name_en, last_name_en, nickname_en)")
    .eq("id", id).maybeSingle()

  const { error } = await svc.from("employee_evaluators").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (row) {
    const emp: any = row.employee
    const ev: any = row.evaluator
    const empName = emp ? `${emp.first_name_th} ${emp.last_name_th}` : "พนักงาน"
    const evName = ev ? `${ev.first_name_th} ${ev.last_name_th}` : "ผู้ประเมิน"
    const { data: actorEmp } = dbUser.employee_id
      ? await svc.from("employees").select("first_name_th, last_name_th, first_name_en, last_name_en, nickname_en").eq("id", dbUser.employee_id).single()
      : { data: null }
    const actorName = actorEmp ? `${actorEmp.first_name_th} ${actorEmp.last_name_th}` : "Admin"
    logAudit(svc, {
      actorId: user.id, actorName,
      action: "remove_evaluator",
      entityType: "employee_evaluator", entityId: id,
      description: `ลบ ${evName} ออกจากผู้ประเมิน (${row.scope}) ของ ${empName} โดย ${actorName}`,
      companyId: emp?.company_id,
    })
  }

  return NextResponse.json({ success: true })
}
