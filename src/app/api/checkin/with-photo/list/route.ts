import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════
// GET /api/checkin/with-photo/list
//   ดึงรายการเช็คอินที่มี clock_in_with_photo หรือ clock_out_with_photo = true
//   (สำหรับหน้า admin / manager)
//
//   query:
//     date_from / date_to   (YYYY-MM-DD)
//     company_id            (optional — admin ดูเฉพาะบริษัท)
//     q                     (search by employee name / code)
//     employee_ids          (comma-separated — manager ใช้กรองเฉพาะลูกน้อง)
//     page, limit
// ════════════════════════════════════════════════════════════════════
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("date_from")
  const dateTo   = searchParams.get("date_to")
  const companyId = searchParams.get("company_id")
  const q        = (searchParams.get("q") || "").trim()
  const empIdsRaw = searchParams.get("employee_ids") || ""
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit    = Math.min(100, parseInt(searchParams.get("limit") || "50"))

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  // ── role check ──
  const { data: userData } = await supa
    .from("users").select("role, employee_id, employees(id, company_id)")
    .eq("id", user.id).single()
  if (!userData) return NextResponse.json({ success: false, error: "ไม่พบผู้ใช้" }, { status: 403 })

  const role = (userData as any).role
  const isAdmin = ["super_admin", "hr_admin"].includes(role)
  const myEmp = (userData as any).employees
  const myCompanyId = companyId || myEmp?.company_id

  // ── employee filter (manager ส่ง employee_ids มา) ──
  const empIds = empIdsRaw ? empIdsRaw.split(",").filter(Boolean) : []
  if (!isAdmin && empIds.length === 0) {
    // ถ้าไม่ใช่ admin และไม่ได้ระบุ employee_ids → forbidden
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // ── ดึง attendance_records ที่มีรูป ──
  let query = supa
    .from("attendance_records")
    .select(`
      id, employee_id, company_id, work_date,
      clock_in, clock_out,
      clock_in_lat, clock_in_lng, clock_in_distance_m,
      clock_out_lat, clock_out_lng, clock_out_distance_m,
      clock_in_photo_url, clock_out_photo_url,
      clock_in_address, clock_out_address,
      clock_in_with_photo, clock_out_with_photo,
      late_minutes, early_out_minutes, work_minutes, status,
      employee:employees!employee_id(id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, avatar_url,
        department:departments(name), position:positions(name))
    `, { count: "exact" })
    .or("clock_in_with_photo.eq.true,clock_out_with_photo.eq.true")
    .order("work_date", { ascending: false })
    .order("clock_in", { ascending: false })

  if (myCompanyId) query = query.eq("company_id", myCompanyId)
  if (dateFrom) query = query.gte("work_date", dateFrom)
  if (dateTo)   query = query.lte("work_date", dateTo)
  if (empIds.length > 0) query = query.in("employee_id", empIds)

  query = query.range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query
  if (error) {
    console.error("with-photo list error:", error)
    return NextResponse.json({ success: false, error: error.message })
  }

  // กรองตาม q (เฉพาะ client-side filter หลัง query)
  const lc = q.toLowerCase()
  const filtered = lc
    ? (data ?? []).filter((r: any) => {
        const e = r.employee
        if (!e) return false
        const name = `${e.first_name_th ?? ""} ${e.last_name_th ?? ""} ${e.first_name_en ?? ""} ${e.last_name_en ?? ""} ${e.employee_code ?? ""}`.toLowerCase()
        return name.includes(lc)
      })
    : (data ?? [])

  return NextResponse.json({
    success: true,
    data: filtered,
    total: count ?? 0,
    page, limit,
  })
}
