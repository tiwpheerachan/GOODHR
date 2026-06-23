import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { BRAND_OPTIONS } from "@/lib/utils/brands"  // ใช้เป็น fallback ถ้าตาราง brands ว่าง
import { getManageableEmployees } from "@/lib/utils/evaluator-chain"

// PATCH /api/employees/brand
// Body: {
//   employee_id: string
//   brands:      string[]                  // รายชื่อแบรนด์ที่ดูแล
//   allocations?: Record<string, number>   // (optional) % ของแต่ละแบรนด์ เช่น { Anker: 60, DDpai: 40 }
// }
// อนุญาต:
//   - admin (super_admin / hr_admin)
//   - หัวหน้าตรง (manager ที่เป็น direct manager ของพนักงานคนนั้นใน employee_manager_history)
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const { data: dbUser } = await supa
    .from("users").select("role, employee_id").eq("id", user.id).single()
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 403 })
  }

  const body = await req.json()
  const { employee_id, brands, allocations } = body as {
    employee_id: string
    brands: string[]
    allocations?: Record<string, number> | null
  }

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id required" }, { status: 400 })
  }

  // ── Permission check: admin หรือ "ในสาย" (direct + skip-1 + additional) ──
  //   ใช้ helper เดียวกับ KPI/probation → behavior สอดคล้องกัน
  const isAdmin = ["super_admin", "hr_admin"].includes(dbUser.role)
  let isInChain = false
  if (!isAdmin && dbUser.employee_id) {
    const chain = await getManageableEmployees(supa, dbUser.employee_id, null)
    isInChain = chain.some((c: any) => c.id === employee_id)
  }
  if (!isAdmin && !isInChain) {
    return NextResponse.json({ error: "Forbidden — เฉพาะหัวหน้าในสายหรือ HR admin เท่านั้น" }, { status: 403 })
  }

  // ── 1) sanitize brands — ดึง list จาก DB (รวม inactive เผื่อยังมีพนักงานใช้อยู่) ──
  const { data: dbBrands } = await supa.from("brands").select("name").order("name")
  const validSet = new Set<string>(
    (dbBrands && dbBrands.length > 0
      ? dbBrands.map(b => b.name)
      : (BRAND_OPTIONS as readonly string[])
    )
  )
  const cleaned = Array.isArray(brands)
    ? brands.filter((b): b is string => typeof b === "string" && validSet.has(b))
    : []
  const uniqueBrands = Array.from(new Set(cleaned))

  // ── 2) sanitize allocations ──
  //   - keys ต้องอยู่ใน uniqueBrands (อย่ามี allocation สำหรับ brand ที่ไม่ได้เลือก)
  //   - values ต้องเป็น number 0-100
  //   - ถ้าไม่ส่ง / ส่ง null / ว่าง → เก็บ NULL (fallback หารเท่ากัน)
  let cleanedAllocations: Record<string, number> | null = null
  if (allocations && typeof allocations === "object") {
    const brandSet = new Set(uniqueBrands)
    const tmp: Record<string, number> = {}
    for (const [k, v] of Object.entries(allocations)) {
      if (!brandSet.has(k)) continue          // skip brand ที่ไม่ได้เลือก
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0 || n > 100) continue
      tmp[k] = Math.round(n * 100) / 100      // เก็บ 2 ทศนิยม
    }
    if (Object.keys(tmp).length > 0) cleanedAllocations = tmp
  }

  const { error } = await supa
    .from("employees")
    .update({
      brand: uniqueBrands.length > 0 ? uniqueBrands : null,
      brand_allocations: cleanedAllocations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employee_id)

  if (error) {
    console.error("[employees/brand] update failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    brands: uniqueBrands,
    allocations: cleanedAllocations,
  })
}
