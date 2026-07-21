import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// ════════════════════════════════════════════════════════════════════
// Dashboard สรุปผลเช็คลิสต์  GET ?from=&to=&template_id=&company_id=
//   → coverage / competitor / stockOrder+POSM / recent (รูป+สรุป)
// ════════════════════════════════════════════════════════════════════

const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor)
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const from = sp.get("from"), to = sp.get("to")
  const templateId = sp.get("template_id")
  const companyId = sp.get("company_id")
  const byEmployeeId = sp.get("by")   // กรองรายบุคคล (submitted_by)

  let q = svc.from("store_checklist_submissions").select(`
    id, dealer_id, submitted_by, submitter_name, dealer_name, visit_date, data, photos, lat, lng, location_name,
    dealer:store_dealers(name, zone, area, store_type, is_new)`)
    .eq("status", "submitted")
    .is("deleted_at", null)
  if (from) q = q.gte("visit_date", from)
  if (to) q = q.lte("visit_date", to)
  if (byEmployeeId) q = q.eq("submitted_by", byEmployeeId)
  if (templateId) q = q.eq("template_id", templateId)
  if (companyId) q = q.eq("company_id", companyId)
  const { data: subs, error } = await q.order("visit_date", { ascending: false }).limit(3000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = subs ?? []

  // total dealers (สำหรับ coverage %)
  let dq = svc.from("store_dealers").select("id", { count: "exact", head: true }).eq("active", true)
  if (companyId) dq = dq.eq("company_id", companyId)
  const { count: totalDealers } = await dq

  // ── coverage ──
  const byEmp = new Map<string, { id: string; name: string; count: number }>()
  const byArea = new Map<string, number>()
  const byDate = new Map<string, number>()
  const dealerSet = new Set<string>()
  const gpsPoints: any[] = []
  for (const r of rows) {
    if (r.dealer_id) dealerSet.add(r.dealer_id)
    const ek = r.submitted_by || "?"
    const em = byEmp.get(ek) || { id: ek, name: r.submitter_name || "—", count: 0 }
    em.count++; byEmp.set(ek, em)
    const area = (r.dealer as any)?.zone || (r.dealer as any)?.area || "ไม่ระบุ"
    byArea.set(area, (byArea.get(area) || 0) + 1)
    if (r.visit_date) byDate.set(r.visit_date, (byDate.get(r.visit_date) || 0) + 1)
    if (r.lat != null && r.lng != null)
      gpsPoints.push({
        id: r.id, lat: r.lat, lng: r.lng,
        dealer: r.dealer_name || (r.dealer as any)?.name || "",
        location_name: r.location_name || "",
        by: r.submitter_name || "",
        date: r.visit_date,
      })
  }

  // ── competitor (จับกลุ่มตาม brand) ──
  type CompAgg = { brand: string; count: number; retail: number[]; wholesale: number[]; gp: number[] }
  const compMap = new Map<string, CompAgg>()
  // ── POSM presence + stock/order totals ──
  const posmCount = new Map<string, number>()
  let totalStockQty = 0, totalOrderQty = 0, totalOrderValue = 0
  const numOf = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n }

  for (const r of rows) {
    const d: any = r.data || {}
    for (const c of Array.isArray(d.competitor) ? d.competitor : []) {
      const brand = (c.brand || "").toString().trim()
      if (!brand) continue
      const m: CompAgg = compMap.get(brand) || { brand, count: 0, retail: [], wholesale: [], gp: [] }
      m.count++
      if (c.retail) m.retail.push(numOf(c.retail))
      if (c.wholesale) m.wholesale.push(numOf(c.wholesale))
      if (c.gp) m.gp.push(numOf(c.gp))
      compMap.set(brand, m)
    }
    for (const s of Array.isArray(d.stock) ? d.stock : []) {
      totalStockQty += numOf(s.stock_qty)
      totalOrderQty += numOf(s.order_qty)
      totalOrderValue += numOf(s.order_qty) * numOf(s.order_price)
    }
    const posm = d.posm?.selected
    for (const opt of Array.isArray(posm) ? posm : [])
      posmCount.set(opt, (posmCount.get(opt) || 0) + 1)
  }

  // ── recent (รูป + สรุป/ปัญหา) ──
  const recent = rows.slice(0, 30).map((r: any) => ({
    id: r.id,
    dealer: r.dealer_name || (r.dealer as any)?.name || "—",
    zone: (r.dealer as any)?.zone || (r.dealer as any)?.area || "",
    date: r.visit_date,
    by: r.submitter_name,
    summary: (r.data?.summary || "").toString(),
    photos: Array.isArray(r.photos) ? r.photos.slice(0, 4) : [],
    photoCount: Array.isArray(r.photos) ? r.photos.length : 0,
    lat: r.lat, lng: r.lng, location_name: r.location_name,
  }))

  return NextResponse.json({
    coverage: {
      totalSubmissions: rows.length,
      uniqueDealers: dealerSet.size,
      totalDealers: totalDealers ?? 0,
      byEmployee: Array.from(byEmp.values()).sort((a, b) => b.count - a.count),
      byArea: Array.from(byArea.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
      byDate: Array.from(byDate.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      gpsPoints,
    },
    competitor: Array.from(compMap.values()).map(m => ({
      brand: m.brand, count: m.count,
      avgRetail: Math.round(avg(m.retail)), avgWholesale: Math.round(avg(m.wholesale)),
      avgGp: Math.round(avg(m.gp) * 10) / 10,
    })).sort((a, b) => b.count - a.count),
    stockOrder: {
      totalStockQty, totalOrderQty, totalOrderValue,
      posm: Array.from(posmCount.entries()).map(([opt, count]) => ({ opt, count, pct: rows.length ? Math.round(count / rows.length * 100) : 0 })).sort((a, b) => b.count - a.count),
    },
    recent,
  })
}
