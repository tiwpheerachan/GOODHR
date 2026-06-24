import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════
// GET /api/payroll/resigned-pool?period_id=...
//   คืนคนที่ "ลาออกแล้ว" (resign_date IS NOT NULL)
//   แต่ "ยังไม่มี payroll record" ในงวดเงินเดือนที่ส่งมา
//   ใช้สำหรับ search-แล้ว-เพิ่มในงวด (HR ลืมคำนวณเงินเดือนสุดท้าย)
// ════════════════════════════════════════════════════════════════════
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodId = searchParams.get("period_id")
  if (!periodId) return NextResponse.json({ error: "period_id required" }, { status: 400 })

  const supa = createServiceClient()

  // ดึง period
  const { data: period } = await supa.from("payroll_periods")
    .select("id, year, month, start_date, end_date, company_id").eq("id", periodId).maybeSingle()
  if (!period) return NextResponse.json({ error: "period not found" }, { status: 404 })

  // ดึงคนที่มี resign_date + company ตรงกับ period (ถ้า period มี company)
  let empQ = supa.from("employees")
    .select(`
      id, employee_code, first_name_th, last_name_th, nickname, avatar_url, brand,
      hire_date, resign_date, employment_status, is_active,
      position:positions(id, name),
      department:departments(id, name),
      company:companies(id, code, name_th)
    `)
    .not("resign_date", "is", null)
  if (period.company_id) empQ = empQ.eq("company_id", period.company_id)
  const { data: resignedEmps } = await empQ

  if (!resignedEmps || resignedEmps.length === 0) {
    return NextResponse.json({ pool: [] })
  }

  // คนที่ "มี payroll record อยู่แล้ว" ในงวดนี้ → exclude
  const empIds = resignedEmps.map((e: any) => e.id)
  const { data: existingPRs } = await supa.from("payroll_records")
    .select("employee_id")
    .eq("payroll_period_id", periodId)
    .in("employee_id", empIds)
  const haveRecord = new Set((existingPRs ?? []).map((r: any) => r.employee_id))

  // ── shape return + flag ──
  //   resigned_in_period = ลาออกในช่วงงวด (HR ต้องสร้าง record คำนวณเงินสุดท้าย)
  //   resigned_before    = ลาออกก่อนงวด (ไม่ต้องคำนวณ — แต่ถ้า HR ลืม ก็เพิ่มได้)
  const pool = resignedEmps
    .filter((e: any) => !haveRecord.has(e.id))
    .map((e: any) => ({
      ...e,
      resigned_in_period: e.resign_date >= period.start_date && e.resign_date <= period.end_date,
      resigned_before:    e.resign_date < period.start_date,
    }))
    .sort((a: any, b: any) => {
      // คนลาออกในงวดขึ้นก่อน
      if (a.resigned_in_period !== b.resigned_in_period) return a.resigned_in_period ? -1 : 1
      return (b.resign_date ?? "").localeCompare(a.resign_date ?? "")
    })

  return NextResponse.json({ pool, period })
}
