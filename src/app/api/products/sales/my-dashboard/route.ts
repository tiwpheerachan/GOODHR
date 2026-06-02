import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canRecordSale } from "@/lib/utils/product-sale-permissions"

// ════════════════════════════════════════════════════════════════════
// Personal dashboard for staff — เน้นปลุกใจ
//   - ไม่เปิดเผยยอดของคนอื่น
//   - เปิดเผยแค่ "อันดับ" + ค่าต่างที่จะขึ้นอันดับถัดไป
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  if (!me.employeeId) return NextResponse.json({ error: "no employee" }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6)
  const monthStart = new Date(); monthStart.setMonth(monthStart.getMonth() - 1)
  const start30 = new Date(); start30.setDate(start30.getDate() - 29)
  const start30s = start30.toISOString().slice(0, 10)

  // ── 1. ดึงยอดของเรา 30 วันย้อนหลัง ──
  const { data: mySales } = await svc.from("product_sales")
    .select("sold_price, qty, sold_date, sold_at, source, proof_photo_url")
    .eq("employee_id", me.employeeId)
    .is("deleted_at", null)
    .gte("sold_date", start30s)

  // ── 2. ดึงยอด aggregate ของทุกคน (manual only) เพื่อจัดอันดับ ──
  // ดูเฉพาะ source='manual' (สแกนจริง — ไม่นับ historical import)
  const { data: allManual } = await svc.from("product_sales")
    .select("employee_id, sold_price, qty, sold_date")
    .eq("source", "manual")
    .is("deleted_at", null)
    .not("employee_id", "is", null)
    .gte("sold_date", start30s)

  // ── 3. คำนวณ ──
  const sumF = (rows: any[]) => rows.reduce((s, r) => s + Number(r.sold_price) * (r.qty || 1), 0)
  const qtyF = (rows: any[]) => rows.reduce((s, r) => s + (r.qty || 1), 0)

  const my = mySales ?? []
  const myToday = my.filter(s => s.sold_date === today)
  const myWeek  = my.filter(s => new Date(s.sold_date) >= weekStart)
  const myMonth = my.filter(s => new Date(s.sold_date) >= monthStart)

  // group by date for trend
  const byDate: Record<string, { amount: number; qty: number; count: number }> = {}
  for (const s of my) {
    if (!byDate[s.sold_date]) byDate[s.sold_date] = { amount: 0, qty: 0, count: 0 }
    byDate[s.sold_date].amount += Number(s.sold_price) * (s.qty || 1)
    byDate[s.sold_date].qty += s.qty || 1
    byDate[s.sold_date].count += 1
  }
  const trend = Object.entries(byDate).sort().map(([d, v]) => ({ date: d, ...v }))

  // ── 4. Rank — เฉพาะ "อันดับ" ของเราใน manual sales ──
  //    คำนวณยอดต่อคนทั้งวันนี้, สัปดาห์, เดือน
  const computeRank = (filter: (r: any) => boolean) => {
    const map: Record<string, number> = {}
    for (const r of (allManual ?? []).filter(filter)) {
      map[r.employee_id] = (map[r.employee_id] || 0) + Number(r.sold_price) * (r.qty || 1)
    }
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    const myAmount = map[me.employeeId!] || 0
    const total = sorted.length
    if (myAmount === 0 || total === 0) {
      return { my_amount: myAmount, rank: null, total, gap_to_next: null, gap_to_top: null, percentile: null }
    }
    const myIdx = sorted.findIndex(([id]) => id === me.employeeId)
    const rank = myIdx + 1
    const nextAmount = myIdx > 0 ? sorted[myIdx - 1][1] : null
    const topAmount = sorted[0][1]
    return {
      my_amount: myAmount,
      rank,
      total,
      gap_to_next: nextAmount != null ? Math.max(0, nextAmount - myAmount) : null,
      gap_to_top: rank > 1 ? Math.max(0, topAmount - myAmount) : 0,
      percentile: total > 1 ? Math.round(((total - myIdx) / total) * 100) : 100,
    }
  }
  const rankToday = computeRank((r: any) => r.sold_date === today)
  const rankMonth = computeRank((r: any) => new Date(r.sold_date) >= monthStart)

  // ── 5. Personal best + streak ──
  let bestDay = { date: "", amount: 0 }
  for (const [d, v] of Object.entries(byDate)) {
    if (v.amount > bestDay.amount) bestDay = { date: d, amount: v.amount }
  }

  // consecutive day streak ending today
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (byDate[ds]?.amount > 0) streak++
    else if (i === 0) break  // ถ้าวันนี้ยังไม่ขาย ก็ break ทันที (ไม่ยึด yesterday streak)
    else break
  }

  // ── 6. Motivational message ──
  const msg = buildMotivation({
    todayAmount: sumF(myToday),
    todayQty: qtyF(myToday),
    rankToday,
    rankMonth,
    streak,
    bestDay,
    monthAmount: sumF(myMonth),
  })

  return NextResponse.json({
    me: {
      employee_id: me.employeeId,
      today: { amount: sumF(myToday), qty: qtyF(myToday), count: myToday.length },
      week:  { amount: sumF(myWeek),  qty: qtyF(myWeek),  count: myWeek.length },
      month: { amount: sumF(myMonth), qty: qtyF(myMonth), count: myMonth.length },
      total_30d: { amount: sumF(my), qty: qtyF(my), count: my.length },
    },
    trend,                  // last 30 days (own only)
    rank_today: rankToday,
    rank_month: rankMonth,
    streak_days: streak,
    best_day: bestDay,
    motivation: msg,
  })
}

// ─── helper: ข้อความปลุกใจตามผลงาน ───
function buildMotivation(d: any) {
  const lines: { icon: string; text: string; tone: "good" | "neutral" | "push" }[] = []

  // 1. Rank today
  if (d.rankToday.rank === 1 && d.rankToday.total >= 2) {
    lines.push({ icon: "🥇", text: `คุณเป็นที่ 1 ของวันนี้! เก็บไว้ให้ดี — รักษาตำแหน่งไว้!`, tone: "good" })
  } else if (d.rankToday.rank && d.rankToday.rank <= 3) {
    lines.push({ icon: "🏆", text: `อยู่อันดับ ${d.rankToday.rank} จาก ${d.rankToday.total} คนวันนี้`, tone: "good" })
    if (d.rankToday.gap_to_next != null && d.rankToday.gap_to_next > 0) {
      lines.push({ icon: "🚀", text: `อีก ฿${Math.round(d.rankToday.gap_to_next).toLocaleString()} เท่านั้น คุณจะขึ้นอันดับ ${d.rankToday.rank - 1}!`, tone: "push" })
    }
  } else if (d.rankToday.rank) {
    lines.push({ icon: "📊", text: `อันดับ ${d.rankToday.rank} จาก ${d.rankToday.total} คนวันนี้`, tone: "neutral" })
    if (d.rankToday.gap_to_next != null && d.rankToday.gap_to_next > 0) {
      lines.push({ icon: "💪", text: `เพิ่มอีก ฿${Math.round(d.rankToday.gap_to_next).toLocaleString()} ก็จะแซงคนข้างหน้า!`, tone: "push" })
    }
  } else if (d.todayAmount === 0) {
    lines.push({ icon: "☀️", text: `วันใหม่ ขายชิ้นแรกของวันก่อนเลย!`, tone: "push" })
  }

  // 2. Month rank
  if (d.rankMonth.rank && d.rankMonth.total > 3) {
    if (d.rankMonth.rank === 1) {
      lines.push({ icon: "👑", text: `Top 1 ของเดือนนี้! สุดยอด!`, tone: "good" })
    } else if (d.rankMonth.rank <= 3) {
      lines.push({ icon: "✨", text: `อันดับ ${d.rankMonth.rank} ของเดือน — เก่งมาก`, tone: "good" })
    }
  }

  // 3. Streak
  if (d.streak >= 7) {
    lines.push({ icon: "🔥", text: `Streak ${d.streak} วันติด! ของจริง`, tone: "good" })
  } else if (d.streak >= 3) {
    lines.push({ icon: "⚡", text: `${d.streak} วันติดต่อกัน — keep going!`, tone: "good" })
  }

  // 4. Personal best
  if (d.bestDay.amount > 0 && d.todayAmount > 0 && d.todayAmount > d.bestDay.amount * 0.8) {
    if (d.todayAmount > d.bestDay.amount) {
      lines.push({ icon: "🎯", text: `วันนี้ทำลายสถิติส่วนตัว! เก่งมาก!`, tone: "good" })
    } else {
      lines.push({ icon: "📈", text: `ใกล้สถิติส่วนตัวแล้ว — อีกนิดเดียว!`, tone: "push" })
    }
  }

  // ถ้ายังไม่มีอะไรเลย
  if (lines.length === 0) {
    lines.push({ icon: "💡", text: `เริ่มสแกนสินค้าและบันทึกการขายของวันนี้กัน`, tone: "neutral" })
  }

  return lines
}
