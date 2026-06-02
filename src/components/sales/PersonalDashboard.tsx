"use client"
import { useEffect, useState } from "react"
import {
  Trophy, TrendingUp, Flame, Crown, Sparkles, Target, Zap,
  Calendar, RefreshCw, Loader2, ArrowUp, Award, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// ════════════════════════════════════════════════════════════════════
// PersonalDashboard — สำหรับพนักงาน
//   - ไม่เปิดเผยยอดของคนอื่น (เห็นแค่อันดับ)
//   - มีข้อความปลุกใจ + กราฟส่วนตัว 30 วัน
// ════════════════════════════════════════════════════════════════════
export default function PersonalDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/products/sales/my-dashboard")
      const d = await res.json()
      if (res.ok) setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [refreshKey])

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <Loader2 size={20} className="animate-spin mx-auto text-indigo-400"/>
      </div>
    )
  }
  if (!data) return null

  const { me, trend, rank_today, rank_month, streak_days, best_day, motivation } = data
  const maxTrend = Math.max(1, ...trend.map((t: any) => t.amount))

  return (
    <div className="space-y-3">
      {/* ─── Motivation banner ─── */}
      {motivation && motivation.length > 0 && (
        <MotivationBanner items={motivation}/>
      )}

      {/* ─── KPI today/week/month ─── */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="วันนี้" sub="วันนี้" period={me.today} color="emerald"/>
        <Kpi label="7 วัน"  sub="สัปดาห์"  period={me.week}  color="indigo"/>
        <Kpi label="เดือน"  sub="เดือนนี้" period={me.month} color="purple"/>
      </div>

      {/* ─── Rank card (today + month) ─── */}
      <div className="grid grid-cols-2 gap-2">
        <RankCard period="วันนี้" rank={rank_today} icon="today"/>
        <RankCard period="เดือนนี้" rank={rank_month} icon="month"/>
      </div>

      {/* ─── Achievement chips ─── */}
      <div className="grid grid-cols-2 gap-2">
        <Chip
          icon={<Flame size={18}/>}
          label="Streak"
          value={`${streak_days} วัน`}
          sub={streak_days >= 7 ? "ของจริง!" : streak_days >= 3 ? "Keep going!" : streak_days >= 1 ? "เริ่มดีแล้ว" : "เริ่มวันนี้!"}
          color={streak_days >= 7 ? "from-orange-500 to-red-500" : streak_days >= 3 ? "from-amber-500 to-orange-500" : "from-slate-400 to-slate-500"}
        />
        <Chip
          icon={<Crown size={18}/>}
          label="Best Day"
          value={best_day.amount > 0 ? `฿${best_day.amount.toLocaleString()}` : "—"}
          sub={best_day.date ? format(new Date(best_day.date), "d MMM", { locale: th }) : "ยังไม่มีสถิติ"}
          color="from-yellow-500 to-amber-500"
        />
      </div>

      {/* ─── Trend chart (30d, own only) ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
          <TrendingUp size={14} className="text-indigo-500"/>
          <p className="font-black text-sm text-slate-700">ยอดส่วนตัว 30 วัน</p>
          <button onClick={load} className="ml-auto p-1 hover:bg-slate-100 rounded-lg" title="Refresh">
            <RefreshCw size={11} className={loading ? "animate-spin text-indigo-500" : "text-slate-400"}/>
          </button>
        </div>
        {trend.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">ยังไม่มีการขาย — เริ่มสแกนเลย</p>
        ) : (
          <div className="p-3 pb-4">
            {/* Mini bar chart */}
            <div className="flex items-end gap-0.5 h-24">
              {fillLastNDays(trend, 30).map((d: any) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                    {format(new Date(d.date), "d MMM", { locale: th })}: ฿{d.amount.toLocaleString()}
                  </div>
                  <div className="w-full rounded-sm bg-gradient-to-t from-indigo-500 to-purple-500 transition-all hover:from-indigo-400 hover:to-purple-400"
                    style={{ height: `${Math.max(2, (d.amount / maxTrend) * 96)}px`, opacity: d.amount > 0 ? 1 : 0.15 }}/>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">{trend.length} วันที่มีการขาย / 30 วัน</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ───
function fillLastNDays(trend: any[], n: number) {
  const map = new Map(trend.map(t => [t.date, t]))
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    out.push(map.get(ds) ?? { date: ds, amount: 0, qty: 0, count: 0 })
  }
  return out
}

function Kpi({ label, sub, period, color }: any) {
  const colors: any = {
    emerald: "from-emerald-500 to-teal-500",
    indigo: "from-indigo-500 to-blue-500",
    purple: "from-purple-500 to-pink-500",
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 relative overflow-hidden">
      <div className={`absolute -top-3 -right-3 w-14 h-14 rounded-full bg-gradient-to-br ${colors[color]} opacity-10`}/>
      <p className="text-[9px] uppercase font-black text-slate-400">{label}</p>
      <p className={`text-lg font-black bg-gradient-to-br ${colors[color]} bg-clip-text text-transparent leading-none mt-0.5`}>
        ฿{(period?.amount || 0).toLocaleString()}
      </p>
      <p className="text-[9px] text-slate-500 mt-1">{period?.count || 0} ครั้ง · {period?.qty || 0} ชิ้น</p>
    </div>
  )
}

function RankCard({ period, rank, icon }: any) {
  const noData = !rank?.rank
  const isTop1 = rank?.rank === 1
  const isTop3 = rank?.rank && rank.rank <= 3
  const medal = isTop1 ? "🥇" : rank?.rank === 2 ? "🥈" : rank?.rank === 3 ? "🥉" : null
  const bgClass = isTop1
    ? "from-yellow-400 via-amber-500 to-orange-500"
    : isTop3
    ? "from-purple-500 to-pink-500"
    : noData
    ? "from-slate-300 to-slate-400"
    : "from-indigo-500 to-blue-600"

  return (
    <div className={`relative bg-gradient-to-br ${bgClass} rounded-2xl p-3 text-white shadow-md overflow-hidden`}>
      {/* Animated glow for top 1 */}
      {isTop1 && (
        <div className="absolute inset-0 opacity-30 animate-[crownGlow_2s_ease-in-out_infinite] pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5), transparent 60%)" }}/>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase font-black opacity-90">{period}</p>
        {medal && <span className="text-lg leading-none">{medal}</span>}
      </div>

      {noData ? (
        <div className="mt-2">
          <p className="text-[10px] opacity-80">ยังไม่มีอันดับ</p>
          <p className="text-[9px] opacity-70 mt-0.5">ขายเพื่อขึ้นกระดาน</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-[10px] opacity-80">อันดับ</p>
            <p className="text-2xl font-black leading-none">{rank.rank}</p>
            <p className="text-[10px] opacity-80">/ {rank.total}</p>
          </div>
          {/* Gap to next rank */}
          {rank.gap_to_next != null && rank.gap_to_next > 0 ? (
            <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[10px] leading-tight">
              <p className="opacity-90 flex items-center gap-1">
                <ArrowUp size={9}/> ขายอีก
              </p>
              <p className="font-black text-sm">฿{Math.round(rank.gap_to_next).toLocaleString()}</p>
              <p className="opacity-80">จะขึ้น #{rank.rank - 1}</p>
            </div>
          ) : isTop1 ? (
            <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[10px]">
              <p className="font-black flex items-center gap-1"><Crown size={10}/> Top 1!</p>
              <p className="opacity-80">รักษาตำแหน่งไว้</p>
            </div>
          ) : null}
        </>
      )}

      <style jsx>{`
        @keyframes crownGlow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50%      { transform: scale(1.1); opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

function Chip({ icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase font-black text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-800 leading-none mt-0.5 truncate">{value}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

function MotivationBanner({ items }: { items: any[] }) {
  // ── highlight pick: tone "good" > "push" > "neutral" ──
  const sorted = [...items].sort((a, b) => {
    const w = { good: 3, push: 2, neutral: 1 } as any
    return w[b.tone] - w[a.tone]
  })
  const primary = sorted[0]
  const secondary = sorted.slice(1, 3)

  const toneClass: any = {
    good:    "from-emerald-500 via-teal-500 to-cyan-500",
    push:    "from-indigo-500 via-purple-500 to-pink-500",
    neutral: "from-slate-500 via-slate-600 to-slate-700",
  }

  return (
    <div className={`relative bg-gradient-to-br ${toneClass[primary.tone]} rounded-2xl p-4 text-white shadow-md overflow-hidden`}>
      {/* Decorative shapes */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl"/>
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10 blur-xl"/>
      {/* Sparkle accent */}
      <Sparkles size={14} className="absolute top-3 right-3 opacity-60 animate-pulse"/>

      <div className="relative flex items-start gap-3">
        <div className="text-3xl leading-none animate-[bounceSoft_2s_ease-in-out_infinite]">{primary.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">{primary.text}</p>
          {secondary.length > 0 && (
            <div className="mt-2 space-y-1">
              {secondary.map((s: any, i: number) => (
                <p key={i} className="text-[11px] opacity-90 leading-tight flex items-start gap-1.5">
                  <span className="text-sm leading-none flex-shrink-0">{s.icon}</span>
                  <span>{s.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  )
}
