import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { BRAND_OPTIONS, normalizeBrands } from "@/lib/utils/brands"  // fallback ถ้า brands ว่าง

const ADMIN_ROLES = ["super_admin", "hr_admin"]

// GET /api/dashboard/payroll-insights
//   ?company_id=...      (optional; "" / "all" = ทุกบริษัท)
//   ?year=2026&month=5   (optional; ถ้าไม่ระบุใช้งวดล่าสุดที่มี payroll)
//
// Response:
//   {
//     period: { year, month, label, hasData },
//     summary: { employee_count, total_gross, total_net, total_base, avg_gross },
//     by_brand: [{ brand, employee_count, total_cost, avg_cost, share_pct, top_earners[] }],
//     by_company: [{ id, name, code, employee_count, total_cost, share_pct }],
//     by_department: [{ id, name, employee_count, total_cost }],
//     brand_coverage: {
//       total_with_payroll, with_brand, no_brand,
//       single_brand, multi_brand, avg_brands_per_person,
//       with_allocations, without_allocations
//     },
//     periods: [{ year, month, label }]    // ตัวเลือกในหน้า UI
//   }
export async function GET(req: NextRequest) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role, employee:employees(company_id)").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const companyId = sp.get("company_id") || ""
  const yearStr  = sp.get("year") || ""
  const monthStr = sp.get("month") || ""

  // ── 1) Load periods (ทุกงวดที่มี — สำหรับ dropdown) ──
  let periodsQ = svc.from("payroll_periods").select("year, month").order("year", { ascending: false }).order("month", { ascending: false }).limit(60)
  if (companyId && companyId !== "all") periodsQ = periodsQ.eq("company_id", companyId)
  const { data: periodsRaw } = await periodsQ
  // unique year/month
  const periodSet = new Map<string, { year: number; month: number }>()
  for (const p of periodsRaw ?? []) {
    const k = `${p.year}-${p.month}`
    if (!periodSet.has(k)) periodSet.set(k, { year: p.year, month: p.month })
  }
  const periods = Array.from(periodSet.values())
    .map(p => ({ year: p.year, month: p.month, label: `${p.month}/${p.year}` }))

  // เลือกงวดเป้าหมาย
  let targetYear  = parseInt(yearStr)
  let targetMonth = parseInt(monthStr)
  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) {
    if (periods.length > 0) {
      targetYear  = periods[0].year
      targetMonth = periods[0].month
    } else {
      const now = new Date()
      targetYear  = now.getFullYear()
      targetMonth = now.getMonth() + 1
    }
  }

  // ── 2) Load payroll_records ของงวดเป้าหมาย ──
  let prQ = svc.from("payroll_records")
    .select(`
      id, employee_id, company_id, year, month,
      base_salary, gross_income, net_salary, ot_amount, bonus, total_deductions,
      employee:employees!payroll_records_employee_id_fkey(
        id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
        brand, brand_allocations,
        department:departments(id, name),
        position:positions(id, name)
      ),
      company:companies(id, code, name_th)
    `)
    .eq("year", targetYear).eq("month", targetMonth)
  if (companyId && companyId !== "all") prQ = prQ.eq("company_id", companyId)
  const { data: records, error } = await prQ
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recs = records ?? []
  const hasData = recs.length > 0

  // ── 3) Build aggregates ──
  type BrandStat = {
    brand: string
    employee_count: number
    total_cost: number
    employees: Array<{ id: string; name: string; cost: number; pct: number; code?: string; avatar_url?: string }>
  }
  const brandMap = new Map<string, BrandStat>()
  const companyMap = new Map<string, { id: string; name: string; code: string; employee_count: number; total_cost: number; ids: Set<string> }>()
  const deptMap = new Map<string, { id: string; name: string; employee_count: number; total_cost: number; ids: Set<string> }>()

  let totalGross = 0, totalNet = 0, totalBase = 0
  let withBrand = 0, noBrand = 0, singleBrand = 0, multiBrand = 0, withAlloc = 0
  let sumBrandsAll = 0

  for (const r of recs) {
    const emp = Array.isArray((r as any).employee) ? (r as any).employee[0] : (r as any).employee
    if (!emp) continue
    const co  = Array.isArray((r as any).company)  ? (r as any).company[0]  : (r as any).company
    const dep = Array.isArray(emp.department)      ? emp.department[0]      : emp.department

    const gross = Number(r.gross_income) || 0
    const net   = Number(r.net_salary)   || 0
    const base  = Number(r.base_salary)  || 0
    totalGross += gross; totalNet += net; totalBase += base

    const cost = gross > 0 ? gross : (base + (Number(r.ot_amount) || 0) + (Number(r.bonus) || 0))

    // ── company breakdown ──
    if (co) {
      const k = co.id
      if (!companyMap.has(k)) companyMap.set(k, { id: co.id, name: co.name_th, code: co.code, employee_count: 0, total_cost: 0, ids: new Set() })
      const cm = companyMap.get(k)!
      cm.total_cost += cost
      if (!cm.ids.has(emp.id)) { cm.ids.add(emp.id); cm.employee_count++ }
    }

    // ── department breakdown ──
    if (dep) {
      const k = dep.id
      if (!deptMap.has(k)) deptMap.set(k, { id: dep.id, name: dep.name, employee_count: 0, total_cost: 0, ids: new Set() })
      const dm = deptMap.get(k)!
      dm.total_cost += cost
      if (!dm.ids.has(emp.id)) { dm.ids.add(emp.id); dm.employee_count++ }
    }

    // ── brand breakdown ──
    const brands = normalizeBrands(emp.brand)
    if (brands.length === 0) {
      noBrand++
      continue
    }
    withBrand++
    sumBrandsAll += brands.length
    if (brands.length === 1) singleBrand++; else multiBrand++

    // อ่าน % allocation ของแต่ละแบรนด์
    const rawAlloc = (emp.brand_allocations ?? null) as Record<string, number> | null
    const hasAlloc = rawAlloc && Object.keys(rawAlloc).length === brands.length
                  && brands.every(b => typeof rawAlloc[b] === "number")
    if (hasAlloc) withAlloc++

    for (const b of brands) {
      let pct: number
      if (hasAlloc && rawAlloc) {
        pct = Number(rawAlloc[b]) || 0
      } else {
        pct = 100 / brands.length              // fallback หารเท่ากัน
      }
      const allocatedCost = cost * pct / 100

      if (!brandMap.has(b)) {
        brandMap.set(b, { brand: b, employee_count: 0, total_cost: 0, employees: [] })
      }
      const bm = brandMap.get(b)!
      bm.employee_count++
      bm.total_cost += allocatedCost
      bm.employees.push({
        id: emp.id,
        name: `${emp.first_name_th ?? ""} ${emp.last_name_th ?? ""}`.trim() || (emp.nickname || emp.employee_code || ""),
        cost: allocatedCost,
        pct,
        code: emp.employee_code,
        avatar_url: emp.avatar_url ?? undefined,
      })
    }
  }

  const totalAllocatedCost = Array.from(brandMap.values()).reduce((s, b) => s + b.total_cost, 0)

  // ── Brand list (sorted by total_cost desc) ──
  // ใส่แบรนด์ที่ไม่มีคนเลยด้วย (count=0) เพื่อให้เห็นชัดในตาราง — อ้างจาก DB
  const { data: allBrandsDb } = await svc.from("brands").select("name").eq("is_active", true).order("display_order").order("name")
  const allBrandNames = (allBrandsDb && allBrandsDb.length > 0)
    ? allBrandsDb.map(b => b.name)
    : (BRAND_OPTIONS as readonly string[])
  for (const opt of allBrandNames) {
    if (!brandMap.has(opt)) {
      brandMap.set(opt, { brand: opt, employee_count: 0, total_cost: 0, employees: [] })
    }
  }
  const by_brand = Array.from(brandMap.values())
    .map(b => ({
      brand: b.brand,
      employee_count: b.employee_count,
      total_cost: Math.round(b.total_cost),
      avg_cost: b.employee_count > 0 ? Math.round(b.total_cost / b.employee_count) : 0,
      share_pct: totalAllocatedCost > 0 ? Math.round((b.total_cost / totalAllocatedCost) * 10000) / 100 : 0,
      top_earners: b.employees
        .sort((a, c) => c.cost - a.cost)
        .map(e => ({ ...e, cost: Math.round(e.cost), pct: Math.round(e.pct * 100) / 100 })),
    }))
    .sort((a, b) => b.total_cost - a.total_cost)

  // ── Company breakdown ──
  const by_company = Array.from(companyMap.values())
    .map(c => ({
      id: c.id, name: c.name, code: c.code,
      employee_count: c.employee_count,
      total_cost: Math.round(c.total_cost),
      share_pct: totalGross > 0 ? Math.round((c.total_cost / totalGross) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.total_cost - a.total_cost)

  // ── Department breakdown ──
  const by_department = Array.from(deptMap.values())
    .map(d => ({
      id: d.id, name: d.name,
      employee_count: d.employee_count,
      total_cost: Math.round(d.total_cost),
      avg_cost: d.employee_count > 0 ? Math.round(d.total_cost / d.employee_count) : 0,
    }))
    .sort((a, b) => b.total_cost - a.total_cost)

  // ── Brand coverage stats ──
  const totalWithPayroll = recs.length
  const brand_coverage = {
    total_with_payroll: totalWithPayroll,
    with_brand: withBrand,
    no_brand: noBrand,
    single_brand: singleBrand,
    multi_brand: multiBrand,
    avg_brands_per_person: withBrand > 0 ? Math.round((sumBrandsAll / withBrand) * 100) / 100 : 0,
    with_allocations: withAlloc,
    without_allocations: withBrand - withAlloc,
  }

  return NextResponse.json({
    period: {
      year: targetYear,
      month: targetMonth,
      label: `${targetMonth}/${targetYear}`,
      hasData,
    },
    summary: {
      employee_count: totalWithPayroll,
      total_gross: Math.round(totalGross),
      total_net:   Math.round(totalNet),
      total_base:  Math.round(totalBase),
      avg_gross:   totalWithPayroll > 0 ? Math.round(totalGross / totalWithPayroll) : 0,
    },
    by_brand,
    by_company,
    by_department,
    brand_coverage,
    periods,
  })
}
