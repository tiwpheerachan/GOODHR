import { createServiceClient, createClient } from "@/lib/supabase/server"
import { getPayrollScope, scopeAllows } from "@/lib/utils/payroll-access"
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
  const scope = await getPayrollScope(supa, user.id)
  if (!scope.any) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลเงินเดือน" }, { status: 403 })

  // ดึง period
  const { data: period } = await supa.from("payroll_periods")
    .select("id, year, month, start_date, end_date, company_id").eq("id", periodId).maybeSingle()
  if (!period) return NextResponse.json({ error: "period not found" }, { status: 404 })
  // สิทธิ์รายบริษัท
  if (!scopeAllows(scope, period.company_id)) return NextResponse.json({ error: "ไม่มีสิทธิ์บริษัทนี้" }, { status: 403 })

  // ดึงคนที่มี resign_date + company ตรงกับ period (ถ้า period มี company)
  //   ⚠️ paginate กันเพดาน 1000 แถว — บริษัทที่มีคนลาออกสะสมมาก คนลาออกล่าสุดจะไม่ตกหล่น
  const resignedEmps: any[] = []
  let from = 0
  while (true) {
    let empQ = supa.from("employees")
      .select(`
        id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname_en, nickname, avatar_url, brand,
        hire_date, resign_date, employment_status, is_active,
        position:positions(id, name),
        department:departments(id, name),
        company:companies(id, code, name_th)
      `)
      .not("resign_date", "is", null)
      .order("resign_date", { ascending: false })   // คนลาออกล่าสุดก่อน
      .range(from, from + 999)
    if (period.company_id) empQ = empQ.eq("company_id", period.company_id)
    const { data, error } = await empQ
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    resignedEmps.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  if (resignedEmps.length === 0) {
    return NextResponse.json({ pool: [] })
  }

  // คนที่ "มี payroll record อยู่แล้ว" ในงวดนี้ → exclude
  //   ดึง record ทั้งหมดของงวด (จำนวนจำกัดตามคนในงวด) แล้ว paginate กัน cap
  const haveRecord = new Set<string>()
  {
    let pf = 0
    while (true) {
      const { data } = await supa.from("payroll_records")
        .select("employee_id").eq("payroll_period_id", periodId).range(pf, pf + 999)
      if (!data || data.length === 0) break
      for (const r of data) if (r.employee_id) haveRecord.add(r.employee_id)
      if (data.length < 1000) break
      pf += 1000
    }
  }

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
