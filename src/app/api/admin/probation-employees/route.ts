import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// GET /api/admin/probation-employees?year=2026&month=6
//   → คืนข้อมูลพนักงานทดลองงาน + วิเคราะห์
//   filter: year + month ของ hire_date
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const { data: me } = await svc.from("users").select("role").eq("id", user.id).single()
  if (me?.role !== "super_admin" && me?.role !== "hr_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const year = sp.get("year") ? parseInt(sp.get("year")!) : null
  const month = sp.get("month") ? parseInt(sp.get("month")!) : null
  const companyId = sp.get("company_id") || null
  const departmentId = sp.get("department_id") || null

  // ── ดึงข้อมูลพนักงานทดลองงานทั้งหมด ──
  let q = svc.from("employees")
    .select(`id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
      nickname, email, phone, avatar_url, gender, birth_date,
      hire_date, probation_end_date, employment_status, employment_type, is_active,
      company:companies(id, code, name_th),
      department:departments(id, name),
      position:positions(id, name),
      branch:branches(id, name)`)
    .eq("employment_status", "probation")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("hire_date", { ascending: false })
    .limit(500)

  if (companyId) q = q.eq("company_id", companyId)
  if (departmentId) q = q.eq("department_id", departmentId)

  const { data: employees, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── ดึง salary structures ──
  const empIds = (employees ?? []).map((e: any) => e.id)
  let salaryMap: Record<string, any> = {}
  let payrollMap: Record<string, any> = {}
  if (empIds.length > 0) {
    const { data: salaries } = await svc.from("salary_structures")
      .select("employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_vehicle, effective_from")
      .in("employee_id", empIds)
      .is("effective_to", null)
    for (const s of (salaries ?? [])) salaryMap[s.employee_id] = s

    // ── ดึง payroll record ของรอบปัจจุบัน (เพื่อแสดง "ได้รับจริงเดือนนี้") ──
    const now = new Date()
    const day = parseInt(now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).split("-")[2])
    // รอบปัจจุบัน: ถ้าวันที่ > 21 → รอบเดือนถัดไป (period 22-21)
    let periodYear = now.getFullYear()
    let periodMonth = now.getMonth() + 1
    if (day > 21) {
      periodMonth++
      if (periodMonth > 12) { periodMonth = 1; periodYear++ }
    }
    const { data: payrolls } = await svc.from("payroll_records")
      .select("employee_id, base_salary, gross_income, net_salary, total_deductions, year, month")
      .in("employee_id", empIds)
      .eq("year", periodYear)
      .eq("month", periodMonth)
    for (const p of (payrolls ?? [])) payrollMap[p.employee_id] = p
  }

  // ── สรุปข้อมูลรายคน + คำนวณ derived fields ──
  const today = new Date()
  const enriched = (employees ?? []).map((e: any) => {
    const sal = salaryMap[e.id] || null
    const hire = e.hire_date ? new Date(e.hire_date) : null
    const prob = e.probation_end_date ? new Date(e.probation_end_date) : null

    // อายุงาน (เป็นวัน + เดือน)
    const tenureDays = hire ? Math.floor((today.getTime() - hire.getTime()) / 86400000) : 0
    const tenureMonths = hire
      ? (today.getFullYear() - hire.getFullYear()) * 12 + (today.getMonth() - hire.getMonth())
      : 0

    // เหลือกี่วันก่อน probation จบ
    const daysLeftProbation = prob
      ? Math.floor((prob.getTime() - today.getTime()) / 86400000)
      : null

    // อายุของพนักงาน
    let age = null
    if (e.birth_date) {
      const b = new Date(e.birth_date)
      age = today.getFullYear() - b.getFullYear()
      if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
    }

    // เงินรายเดือนรวม (base + allowance)
    const totalSalary = sal
      ? Number(sal.base_salary || 0)
        + Number(sal.allowance_position || 0)
        + Number(sal.allowance_transport || 0)
        + Number(sal.allowance_food || 0)
        + Number(sal.allowance_phone || 0)
        + Number(sal.allowance_housing || 0)
        + Number(sal.allowance_vehicle || 0)
      : 0

    const payroll = payrollMap[e.id] || null

    return {
      ...e,
      _derived: {
        tenure_days: tenureDays,
        tenure_months: tenureMonths,
        days_left_probation: daysLeftProbation,
        age,
        salary: sal,
        total_salary: totalSalary,
        payroll,                                  // payroll record ของรอบปัจจุบัน
        net_this_month: payroll?.net_salary ?? null,
        gross_this_month: payroll?.gross_income ?? null,
        hire_year: hire?.getFullYear() ?? null,
        hire_month: hire ? hire.getMonth() + 1 : null,
        is_overdue_probation: prob && prob < today,
      },
    }
  })

  // ── Filter by hire month (ถ้าระบุ) ──
  const filtered = enriched.filter((e: any) => {
    if (year && e._derived.hire_year !== year) return false
    if (month && e._derived.hire_month !== month) return false
    return true
  })

  // ── Aggregates สำหรับกราฟ ──
  const byMonth: Record<string, number> = {}   // "yyyy-mm" → count
  const byDept: Record<string, number> = {}
  const byCompany: Record<string, number> = {}
  const byGender = { male: 0, female: 0, other: 0 }
  const ageBuckets = { "<25": 0, "25-30": 0, "31-35": 0, "36-40": 0, ">40": 0 }
  const salaryBuckets = { "<15k": 0, "15k-20k": 0, "20k-30k": 0, "30k-50k": 0, ">50k": 0 }
  const tenureBuckets = { "<1mo": 0, "1-2mo": 0, "2-3mo": 0, ">3mo": 0 }
  let salarySum = 0, salaryCount = 0
  let overdueCount = 0
  let totalEmp = filtered.length

  for (const e of filtered) {
    const d = e._derived
    const key = d.hire_year && d.hire_month
      ? `${d.hire_year}-${String(d.hire_month).padStart(2, "0")}`
      : "—"
    byMonth[key] = (byMonth[key] || 0) + 1

    const deptName = e.department?.name || "—"
    byDept[deptName] = (byDept[deptName] || 0) + 1

    const compCode = e.company?.code || "—"
    byCompany[compCode] = (byCompany[compCode] || 0) + 1

    const g = (e.gender || "").toLowerCase()
    if (g === "male" || g === "m" || g === "ชาย") byGender.male++
    else if (g === "female" || g === "f" || g === "หญิง") byGender.female++
    else byGender.other++

    if (d.age != null) {
      if (d.age < 25) ageBuckets["<25"]++
      else if (d.age <= 30) ageBuckets["25-30"]++
      else if (d.age <= 35) ageBuckets["31-35"]++
      else if (d.age <= 40) ageBuckets["36-40"]++
      else ageBuckets[">40"]++
    }

    if (d.total_salary > 0) {
      salarySum += d.total_salary
      salaryCount++
      if (d.total_salary < 15000) salaryBuckets["<15k"]++
      else if (d.total_salary < 20000) salaryBuckets["15k-20k"]++
      else if (d.total_salary < 30000) salaryBuckets["20k-30k"]++
      else if (d.total_salary < 50000) salaryBuckets["30k-50k"]++
      else salaryBuckets[">50k"]++
    }

    if (d.tenure_months < 1) tenureBuckets["<1mo"]++
    else if (d.tenure_months < 2) tenureBuckets["1-2mo"]++
    else if (d.tenure_months < 3) tenureBuckets["2-3mo"]++
    else tenureBuckets[">3mo"]++

    if (d.is_overdue_probation) overdueCount++
  }

  // ── Companies + Departments dropdowns ──
  const { data: companies } = await svc.from("companies").select("id, code, name_th").eq("is_active", true).order("code")
  const { data: departments } = await svc.from("departments").select("id, name, company_id").order("name")

  return NextResponse.json({
    employees: filtered,
    stats: {
      total: totalEmp,
      overdue_probation: overdueCount,
      avg_salary: salaryCount > 0 ? Math.round(salarySum / salaryCount) : 0,
      total_salary: Math.round(salarySum),
    },
    charts: {
      by_month: Object.entries(byMonth).sort().map(([k, v]) => ({ label: k, value: v })),
      by_dept: Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ label: k, value: v })),
      by_company: Object.entries(byCompany).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v })),
      by_gender: [
        { label: "ชาย", value: byGender.male, color: "sky" },
        { label: "หญิง", value: byGender.female, color: "rose" },
        { label: "อื่นๆ", value: byGender.other, color: "slate" },
      ],
      by_age: Object.entries(ageBuckets).map(([k, v]) => ({ label: k, value: v })),
      by_salary: Object.entries(salaryBuckets).map(([k, v]) => ({ label: k, value: v })),
      by_tenure: Object.entries(tenureBuckets).map(([k, v]) => ({ label: k, value: v })),
    },
    filters: {
      companies: companies ?? [],
      departments: departments ?? [],
    },
  })
}
