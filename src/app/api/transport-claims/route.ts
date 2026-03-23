import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// ── GET: ดึงรายการเบิกค่าเดินทาง ──────────────────────────────────
// ?employee_id=xxx  → รายการของพนักงานคนนั้น (employee view)
// ?company_id=xxx   → รายการทั้งบริษัท (admin view)
// ?status=pending   → filter by status
// ?year=2026&month=3 → filter by period
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const sp = req.nextUrl.searchParams

  const employee_id = sp.get("employee_id")
  const company_id  = sp.get("company_id")
  const status      = sp.get("status")
  const year        = sp.get("year")
  const month       = sp.get("month")

  let query = supa
    .from("transport_claims")
    .select(`
      *,
      employee:employees!transport_claims_employee_id_fkey(id, employee_code, first_name_th, last_name_th, nickname,
        department:departments(name),
        position:positions(name),
        company:companies(code, name_th)
      ),
      reviewer:employees!transport_claims_reviewed_by_fkey(first_name_th, last_name_th)
    `)
    .order("created_at", { ascending: false })

  if (employee_id) query = query.eq("employee_id", employee_id)
  if (company_id)  query = query.eq("company_id", company_id)
  if (status)      query = query.eq("status", status)
  if (year)        query = query.eq("year", Number(year))
  if (month)       query = query.eq("month", Number(month))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// ── POST: สร้างรายการเบิกค่าเดินทาง ──────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // หา employee_id ของ user
  const { data: userData } = await supa
    .from("users")
    .select("employee_id")
    .eq("id", user.id)
    .single()

  if (!userData?.employee_id) {
    return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 })
  }

  const { data: empData } = await supa
    .from("employees")
    .select("id, company_id")
    .eq("id", userData.employee_id)
    .single()

  if (!empData) {
    return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 })
  }

  const body = await req.json()
  const { claim_date, amount, description, transport_type, origin, destination, receipt_url, receipt_name } = body

  if (!claim_date || !amount || amount <= 0) {
    return NextResponse.json({ error: "กรุณาระบุวันที่และจำนวนเงิน" }, { status: 400 })
  }

  // Auto-match payroll period จาก claim_date
  // งวดเงินเดือน: 22 เดือนก่อน → 21 เดือนนี้
  const d = new Date(claim_date)
  const day = d.getDate()
  let periodMonth: number, periodYear: number

  if (day >= 22) {
    // วันที่ 22-31 → อยู่ในงวดเดือนถัดไป
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    periodMonth = next.getMonth() + 1
    periodYear  = next.getFullYear()
  } else {
    // วันที่ 1-21 → อยู่ในงวดเดือนนี้
    periodMonth = d.getMonth() + 1
    periodYear  = d.getFullYear()
  }

  // หา payroll_period_id
  const { data: period } = await supa
    .from("payroll_periods")
    .select("id")
    .eq("company_id", empData.company_id)
    .eq("year", periodYear)
    .eq("month", periodMonth)
    .maybeSingle()

  const { data: claim, error } = await supa
    .from("transport_claims")
    .insert({
      employee_id:       empData.id,
      company_id:        empData.company_id,
      claim_date,
      amount:            Number(amount),
      description:       description || null,
      transport_type:    transport_type || "other",
      origin:            origin || null,
      destination:       destination || null,
      receipt_url:       receipt_url || null,
      receipt_name:      receipt_name || null,
      payroll_period_id: period?.id ?? null,
      year:              periodYear,
      month:             periodMonth,
      status:            "pending",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: claim })
}

// ── PATCH: อนุมัติ/ปฏิเสธ (admin) ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // หา employee_id ของ admin
  const { data: userData } = await supa
    .from("users")
    .select("employee_id, role")
    .eq("id", user.id)
    .single()

  if (!userData || !["super_admin", "hr_admin", "manager"].includes(userData.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json()
  const { id, status: newStatus, reject_reason } = body

  if (!id || !["approved", "rejected"].includes(newStatus)) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }

  const { data, error } = await supa
    .from("transport_claims")
    .update({
      status:        newStatus,
      reviewed_by:   userData.employee_id,
      reviewed_at:   new Date().toISOString(),
      reject_reason: newStatus === "rejected" ? (reject_reason || null) : null,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
