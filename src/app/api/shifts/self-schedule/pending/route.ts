import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/shifts/self-schedule/pending
 *
 * ดึงคำขอเปลี่ยนกะที่รออนุมัติ
 * - User: เห็นเฉพาะของตัวเอง
 * - Manager: เห็นของลูกน้อง
 * - Admin/HR: เห็นทั้งบริษัท
 *
 * Query params:
 *   ?status=pending|approved|rejected|all
 *   ?employee_id=xxx (admin/manager only)
 *   ?company_id=xxx (admin only)
 *   ?month=2026-03
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = new URL(req.url)
  const status = url.searchParams.get("status") || "pending"
  const filterEmpId = url.searchParams.get("employee_id")
  const filterCompany = url.searchParams.get("company_id")
  const filterMonth = url.searchParams.get("month") // e.g. "2026-03"

  // ── ดึงข้อมูล user ─────────────────────────────────────────
  const { data: userData } = await supa
    .from("users")
    .select("id, role, employee_id, employees(id, company_id, supervisor_id)")
    .eq("id", user.id)
    .single()

  const role = userData?.role as string
  const emp = userData?.employees as any
  const isSA = role === "super_admin" || role === "hr_admin"
  const isManager = role === "manager"

  // ── สร้าง query ────────────────────────────────────────────
  let query = supa
    .from("shift_change_requests")
    .select(`
      *,
      employee:employees(id, employee_code, first_name_th, last_name_th, department:departments(name)),
      current_shift:shift_templates!shift_change_requests_current_shift_id_fkey(id, name, work_start, work_end),
      requested_shift:shift_templates!shift_change_requests_requested_shift_id_fkey(id, name, work_start, work_end)
    `)
    .order("work_date", { ascending: true })

  // ── กรอง status ────────────────────────────────────────────
  if (status !== "all") {
    query = query.eq("status", status)
  }

  // ── กรอง month ─────────────────────────────────────────────
  if (filterMonth) {
    const startDate = `${filterMonth}-01`
    const [y, m] = filterMonth.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${filterMonth}-${String(lastDay).padStart(2, "0")}`
    query = query.gte("work_date", startDate).lte("work_date", endDate)
  }

  // ── กรองตาม role ───────────────────────────────────────────
  if (isSA) {
    // Admin เห็นทั้งบริษัท
    const companyId = filterCompany || emp?.company_id
    if (companyId) query = query.eq("company_id", companyId)
    if (filterEmpId) query = query.eq("employee_id", filterEmpId)
  } else if (isManager) {
    // Manager เห็นลูกน้อง (ใช้ employee_manager_history ให้ตรงกับ layout badge)
    const { data: teamRows } = await supa
      .from("employee_manager_history")
      .select("employee_id")
      .eq("manager_id", emp?.id)
      .is("effective_to", null)

    const subIds = (teamRows ?? []).map((r: any) => String(r.employee_id))
    // รวมตัวเองด้วย (ถ้า manager ก็ self-schedule ได้)
    if (emp?.id) subIds.push(emp.id)

    if (subIds.length === 0) {
      return NextResponse.json({ success: true, requests: [] })
    }
    query = query.in("employee_id", subIds)
  } else {
    // User เห็นเฉพาะตัวเอง
    query = query.eq("employee_id", emp?.id)
  }

  const { data: requests, error } = await query.limit(200)

  if (error) return NextResponse.json({ success: false, error: error.message })

  return NextResponse.json({
    success: true,
    requests: requests ?? [],
    total: (requests ?? []).length,
  })
}
