import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { normalizeBrands } from "@/lib/utils/brands"

// ════════════════════════════════════════════════════════════════════
// GET /api/admin/brand-allocation-status?company_id=xxx
//   ตรวจว่า "หัวหน้าคนไหน / พนักงานคนไหน" ยังไม่ได้ตั้งค่าสัดส่วนแบรนด์ (%)
//   ให้ลูกน้อง — จัดกลุ่มตามหัวหน้า (จาก employee_manager_history)
//
//   สถานะพนักงานแต่ละคน:
//     done       = มีแบรนด์ + ตั้ง % ครบ (รวม ≈ 100)
//     no_alloc   = มีแบรนด์ แต่ยังไม่ได้กรอก % เลย  ← ต้องให้หัวหน้าตั้งค่า
//     incomplete = มีแบรนด์ + กรอก % แต่รวมไม่ถึง 100 (หรือเกิน)  ← ต้องแก้
//     no_brand   = ยังไม่ได้ระบุแบรนด์เลย (แยกไว้ต่างหาก — อาจเป็นสายงานที่ไม่ถือแบรนด์)
//
//   "ค้างตั้งค่า" (pending) = no_alloc + incomplete
// ════════════════════════════════════════════════════════════════════

type Status = "done" | "no_alloc" | "incomplete" | "no_brand"

function allocSum(alloc: Record<string, number> | null | undefined): number {
  if (!alloc || typeof alloc !== "object") return 0
  return Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0)
}

function classify(brand: any, alloc: Record<string, number> | null | undefined): Status {
  const brands = normalizeBrands(brand)
  if (brands.length === 0) return "no_brand"
  const keys = alloc && typeof alloc === "object" ? Object.keys(alloc).filter(k => brands.includes(k)) : []
  if (keys.length === 0) return "no_alloc"
  const sum = allocSum(alloc)
  if (Math.abs(sum - 100) <= 1) return "done"
  return "incomplete"
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: dbUser } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const role = (dbUser as any).role
  const isSuperAdmin = ["super_admin", "hr_admin"].includes(role)
  if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const myCompanyId = (dbUser as any).employee?.company_id ?? null
  const url = new URL(req.url)
  const reqCompany = url.searchParams.get("company_id") || ""
  // super_admin/hr_admin: เลือกบริษัทได้ (ว่าง = ทุกบริษัท) แต่ default = บริษัทตัวเอง ถ้าไม่ได้ระบุ
  const companyId = reqCompany || null

  // ── 1) โหลดพนักงาน active ทั้งหมด (paginate กัน 1000-row cap) ──
  const employees: any[] = []
  for (let from = 0; ; from += 1000) {
    let q = supa.from("employees")
      .select(`id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
               brand, brand_allocations, company_id,
               position:positions(name), department:departments(name), company:companies(code, name_th)`)
      .eq("is_active", true).is("deleted_at", null)
      .order("first_name_th")
      .range(from, from + 999)
    if (companyId) q = q.eq("company_id", companyId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    employees.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const empIds = employees.map(e => e.id)
  const empMap = new Map<string, any>()
  for (const e of employees) empMap.set(e.id, e)

  // ── 2) โหลดหัวหน้าปัจจุบันของแต่ละคน (effective_to = null) ──
  const mgrOf = new Map<string, string>()  // employee_id → manager_id
  const mgrIds = new Set<string>()
  for (let i = 0; i < empIds.length; i += 500) {
    const chunk = empIds.slice(i, i + 500)
    const { data: hist } = await supa.from("employee_manager_history")
      .select("employee_id, manager_id")
      .in("employee_id", chunk)
      .is("effective_to", null)
    for (const h of (hist ?? [])) {
      if (h.manager_id) { mgrOf.set(h.employee_id, h.manager_id); mgrIds.add(h.manager_id) }
    }
  }

  // ── 3) โหลดชื่อหัวหน้าที่ไม่อยู่ในชุด employees (เช่น คนละบริษัท / inactive) ──
  const missingMgr = Array.from(mgrIds).filter(id => !empMap.has(id))
  if (missingMgr.length > 0) {
    for (let i = 0; i < missingMgr.length; i += 500) {
      const chunk = missingMgr.slice(i, i + 500)
      const { data: mgrs } = await supa.from("employees")
        .select("id, first_name_th, last_name_th, nickname, avatar_url, position:positions(name), company:companies(code)")
        .in("id", chunk)
      for (const m of (mgrs ?? [])) empMap.set(m.id, m)
    }
  }

  const nameOf = (e: any) =>
    e ? (e.nickname || `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim() || "?") : "?"

  // ── 4) จัดกลุ่มตามหัวหน้า ──
  type Sub = {
    id: string; name: string; employee_code: string | null
    position: string | null; company_code: string | null; avatar_url: string | null
    brand_count: number; status: Status; alloc_sum: number
  }
  const groups = new Map<string, { manager: any; subs: Sub[] }>()
  const NO_MGR = "__none__"

  for (const e of employees) {
    const mid = mgrOf.get(e.id) ?? NO_MGR
    if (!groups.has(mid)) {
      groups.set(mid, { manager: mid === NO_MGR ? null : (empMap.get(mid) ?? null), subs: [] })
    }
    const status = classify(e.brand, e.brand_allocations)
    groups.get(mid)!.subs.push({
      id: e.id,
      name: nameOf(e),
      employee_code: e.employee_code ?? null,
      position: (e.position as any)?.name ?? null,
      company_code: (e.company as any)?.code ?? null,
      avatar_url: e.avatar_url ?? null,
      brand_count: normalizeBrands(e.brand).length,
      status,
      alloc_sum: Math.round(allocSum(e.brand_allocations) * 10) / 10,
    })
  }

  // ── 5) Shape + summary ──
  const isPending = (s: Status) => s === "no_alloc" || s === "incomplete"

  const managers = Array.from(groups.entries()).map(([mid, g]) => {
    const subs = g.subs.sort((a, b) => {
      // ค้างก่อน (no_alloc, incomplete) แล้วค่อย no_brand แล้ว done
      const rank = (s: Status) => (s === "no_alloc" ? 0 : s === "incomplete" ? 1 : s === "no_brand" ? 2 : 3)
      return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name, "th")
    })
    const pending = subs.filter(s => isPending(s.status)).length
    const noBrand = subs.filter(s => s.status === "no_brand").length
    const done = subs.filter(s => s.status === "done").length
    return {
      manager_id: mid === NO_MGR ? null : mid,
      manager_name: g.manager ? nameOf(g.manager) : null,
      manager_position: (g.manager?.position as any)?.name ?? null,
      manager_avatar: g.manager?.avatar_url ?? null,
      manager_company_code: (g.manager?.company as any)?.code ?? null,
      total: subs.length,
      pending, no_brand: noBrand, done,
      subordinates: subs,
    }
  })
  // เรียง: หัวหน้าที่ค้างเยอะสุดขึ้นก่อน; กลุ่ม "ไม่มีหัวหน้า" ไว้ล่างสุด
  .sort((a, b) => {
    if ((a.manager_id === null) !== (b.manager_id === null)) return a.manager_id === null ? 1 : -1
    return b.pending - a.pending || (a.manager_name ?? "").localeCompare(b.manager_name ?? "", "th")
  })

  const allSubs = employees.map(e => classify(e.brand, e.brand_allocations))
  const summary = {
    total_employees: employees.length,
    done: allSubs.filter(s => s === "done").length,
    pending: allSubs.filter(isPending).length,
    no_brand: allSubs.filter(s => s === "no_brand").length,
    managers_total: managers.filter(m => m.manager_id !== null).length,
    managers_pending: managers.filter(m => m.manager_id !== null && m.pending > 0).length,
  }

  return NextResponse.json({ company_id: companyId, summary, managers })
}
