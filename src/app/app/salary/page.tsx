"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, Clock, TrendingDown, Banknote,
  Shield, Receipt, UserX, CreditCard, ChevronDown, ChevronUp,
  CalendarDays, Timer, Palmtree, Minus,
} from "lucide-react"
import Link from "next/link"
import { format, subMonths, addMonths } from "date-fns"

// ── helpers ────────────────────────────────────────────────────────
function thb(n?: number | null) {
  return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function thbShort(n?: number | null) {
  const v = Number(n || 0)
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(2)}ล.`
  if (v >= 1_000)     return `${(v/1_000).toFixed(1)}K`
  return v.toLocaleString("th-TH")
}

const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

// ── Page ──────────────────────────────────────────────────────────
// ⚡ ตรวจจับเดือนงวดปัจจุบัน: ถ้าวันที่ > 21 → อยู่ในงวดเดือนถัดไป
function getCurrentPeriodDate(): Date {
  const now = new Date()
  if (now.getDate() > 21) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1) // เดือนถัดไป
  }
  return now
}

export default function SalaryPage() {
  const { user } = useAuth()
  const [month,   setMonth]   = useState(() => {
    // ใช้ fixed date เพื่อไม่ให้ hydration error (server/client ตรงกัน)
    // แล้ว useEffect จะ sync เป็นงวดปัจจุบัน
    return new Date(2026, 0, 1)
  })
  const [ready, setReady] = useState(false)
  const [record,  setRecord]  = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [debug,   setDebug]   = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [msg,     setMsg]     = useState<{ type:"ok"|"err"; text:string }|null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const celebratedRef = useRef(false)

  const empId: string | undefined =
    (user as any)?.employee_id ?? (user as any)?.employee?.id

  const fetchPayroll = useCallback(async (yr: number, mon: number) => {
    const res  = await fetch(`/api/payroll?year=${yr}&month=${mon}`, { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "ไม่สามารถโหลดข้อมูลได้")
    return json
  }, [])

  const loadAll = useCallback(async (yr: number, mon: number) => {
    if (!empId) return
    setLoading(true); setRecord(null); setDebug(null); setMsg(null)
    try {
      const json = await fetchPayroll(yr, mon)
      setRecord(json.record ?? null)
      setHistory(json.history ?? [])
      if (json.debug) setDebug(json.debug)
    } catch (e: any) {
      setMsg({ type:"err", text: e.message })
    } finally {
      setLoading(false)
    }
  }, [empId, fetchPayroll])

  // ── sync เดือนเริ่มต้นเป็นงวดปัจจุบัน (client-side เท่านั้น) ──
  useEffect(() => {
    if (!ready) {
      setMonth(getCurrentPeriodDate())
      setReady(true)
      return
    }
    if (!empId) return
    loadAll(month.getFullYear(), month.getMonth() + 1)
  }, [empId, ready, month.getFullYear(), month.getMonth()]) // eslint-disable-line

  // Auto-refresh ทุก 60 วินาที → อัพเดทเงินเดือน real-time
  useEffect(() => {
    if (!empId) return
    const interval = setInterval(() => {
      fetchPayroll(month.getFullYear(), month.getMonth() + 1)
        .then(json => {
          setRecord(json.record ?? null)
          setHistory(json.history ?? [])
          if (json.debug) setDebug(json.debug)
        })
        .catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [empId, month, fetchPayroll])

  // Celebration: แสดง animation ตอนโหลดข้อมูลเงินเดือนได้ครั้งแรก
  useEffect(() => {
    if (record && !loading && !celebratedRef.current) {
      celebratedRef.current = true
      setShowCelebration(true)
      const t = setTimeout(() => setShowCelebration(false), 3000)
      return () => clearTimeout(t)
    }
  }, [record, loading])

  const handleRecalc = async () => {
    if (!empId || working) return
    setWorking(true); setMsg(null)
    try {
      const json = await fetchPayroll(month.getFullYear(), month.getMonth() + 1)
      setRecord(json.record ?? null)
      setHistory(json.history ?? [])
      if (json.debug) setDebug(json.debug)
      setMsg({ type:"ok", text:"คำนวณเรียบร้อยแล้ว" })
      setTimeout(() => setMsg(null), 4000)
    } catch (e: any) {
      setMsg({ type:"err", text: e.message })
    } finally {
      setWorking(false)
    }
  }

  const r        = record
  const gross    = Number(r?.gross_income)           || 0
  const net      = Number(r?.net_salary)             || 0
  const sso      = Number(r?.social_security_amount) || 0
  const tax      = Number(r?.monthly_tax_withheld)   || 0
  const dLate    = Number(r?.deduct_late)            || 0
  const dEarly   = Number(r?.deduct_early_out)       || 0
  const dAbsent  = Number(r?.deduct_absent)          || 0
  const dLoan    = Number(r?.deduct_loan)            || 0
  const dOther   = Number(r?.deduct_other)           || 0
  const totalDed = Number(r?.total_deductions)       || 0
  const commission  = Number(r?.commission)          || 0
  const otherIncome = Number(r?.other_income)        || 0
  const allowOther  = Number(r?.allowance_other)     || 0
  const incomeExtras  = Array.isArray(r?.income_extras) ? r.income_extras : []
  const deductExtras  = Array.isArray(r?.deduction_extras) ? r.deduction_extras : []
  const leavePaid   = Number(r?.leave_paid_days)     || 0
  const leaveUnpaid = Number(r?.leave_unpaid_days)   || 0
  const maxNet   = Math.max(...history.map(h => Number(h.net_salary)||0), net, 1)
  const canNext  = format(addMonths(month,1),"yyyy-MM") <= format(getCurrentPeriodDate(),"yyyy-MM")

  const empName = `${(user as any)?.employee?.first_name_th ?? ""} ${(user as any)?.employee?.last_name_th ?? ""}`.trim()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 25px 60px rgba(16,185,129,0.28), inset 0 1px 0 rgba(255,255,255,0.2); }
          50%      { box-shadow: 0 30px 70px rgba(14,165,164,0.38), inset 0 1px 0 rgba(255,255,255,0.2); }
        }
        @keyframes cardWave {
          0%   { left:-35%; opacity:0.6; }
          50%  { left:110%; opacity:0.9; }
          100% { left:110%; opacity:0; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes barGrow {
          from { height:0%; }
        }
        .salary-card {
          position:relative; overflow:hidden; border-radius:26px;
          border:1px solid rgba(255,255,255,0.18);
          background:
            repeating-linear-gradient(135deg,rgba(255,255,255,0.05) 0px,rgba(255,255,255,0.05) 2px,transparent 2px,transparent 6px),
            radial-gradient(circle at 20% 15%,rgba(255,255,255,0.25),transparent 40%),
            radial-gradient(circle at 80% 80%,rgba(255,255,255,0.18),transparent 35%),
            linear-gradient(135deg,#10b981 0%,#0ea5a4 45%,#0891b2 100%);
          backdrop-filter:blur(18px);
          box-shadow:0 25px 60px rgba(16,185,129,0.28),inset 0 1px 0 rgba(255,255,255,0.2);
          animation:cardGlow 5s ease-in-out infinite;
        }
        .salary-card::before {
          content:""; position:absolute; inset:0;
          background:linear-gradient(110deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05) 35%,rgba(255,255,255,0.18) 60%,rgba(255,255,255,0.02));
          mix-blend-mode:soft-light; pointer-events:none;
        }
        .salary-card::after {
          content:""; position:absolute; top:-40%; bottom:-40%; left:-35%; width:45%;
          background:rgba(255,255,255,0.35); filter:blur(22px); transform:rotate(16deg);
          animation:cardWave 5s ease-in-out infinite; pointer-events:none;
        }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.08s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.16s ease both; }
        .fade-up-3 { animation: fadeUp 0.45s 0.24s ease both; }
        .bar-grow { animation: barGrow 0.7s ease both; }
        @keyframes confettiFall {
          0%   { transform:translateY(-100vh) rotate(0deg) scale(1); opacity:1; }
          70%  { opacity:1; }
          100% { transform:translateY(100vh) rotate(720deg) scale(0.5); opacity:0; }
        }
        @keyframes celebPulse {
          0%   { transform:scale(0); opacity:0; }
          40%  { transform:scale(1.15); opacity:1; }
          60%  { transform:scale(0.95); }
          80%  { transform:scale(1.05); }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes celebFadeOut {
          0%   { opacity:1; }
          70%  { opacity:1; }
          100% { opacity:0; }
        }
        @keyframes countUp {
          0%   { opacity:0; transform:translateY(20px) scale(0.8); }
          30%  { opacity:1; transform:translateY(-4px) scale(1.05); }
          50%  { transform:translateY(0) scale(1); }
          100% { transform:translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        .celeb-overlay {
          animation:celebFadeOut 3s ease-in-out forwards;
          pointer-events:none;
        }
        .celeb-badge {
          animation:celebPulse 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .celeb-amount {
          animation:countUp 0.8s 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .celeb-label {
          animation:countUp 0.6s 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .celeb-shimmer {
          background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,0.5) 50%,transparent 70%);
          background-size:200% 100%;
          animation:shimmer 1.5s 0.5s ease-in-out infinite;
        }
        .confetti-piece {
          position:absolute; width:10px; height:10px; border-radius:2px;
          animation:confettiFall var(--duration) var(--delay) ease-in forwards;
          opacity:0; animation-fill-mode:forwards;
        }
        .glass-card {
          background:rgba(255,255,255,0.85);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.9);
          box-shadow:0 4px 24px rgba(0,0,0,0.06);
        }
      ` }} />

      <div className="flex flex-col min-h-screen pb-12 relative" style={{ background:"linear-gradient(160deg,#f0fdf9 0%,#e0f2fe 50%,#f0fdf4 100%)" }}>

        {/* ── Celebration overlay ───────────────────────────────── */}
        {showCelebration && (
          <div className="celeb-overlay fixed inset-0 z-50 flex items-center justify-center">
            {/* confetti */}
            {Array.from({ length: 40 }).map((_, i) => {
              const colors = ["#10b981","#0ea5e9","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"]
              const left = Math.random() * 100
              const size = 6 + Math.random() * 10
              const dur  = 2 + Math.random() * 1.5
              const del  = Math.random() * 0.8
              const isCircle = Math.random() > 0.5
              return (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${left}%`,
                    top: -20,
                    width: size,
                    height: isCircle ? size : size * 0.6,
                    borderRadius: isCircle ? "50%" : "2px",
                    backgroundColor: colors[i % colors.length],
                    "--duration": `${dur}s`,
                    "--delay": `${del}s`,
                    opacity: 1,
                  } as React.CSSProperties}
                />
              )
            })}

            {/* center badge */}
            <div className="celeb-badge flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-500 flex items-center justify-center shadow-2xl shadow-emerald-300/50 mb-4 relative">
                <div className="celeb-shimmer absolute inset-0 rounded-full"/>
                <span className="text-4xl relative z-10">💰</span>
              </div>
              <div className="celeb-amount text-center">
                <p className="text-3xl font-black text-slate-800 tracking-tight">
                  ฿{thb(net)}
                </p>
              </div>
              <div className="celeb-label text-center mt-1">
                <p className="text-sm font-bold text-emerald-600">เงินเดือนสุทธิของคุณ</p>
                <p className="text-xs text-slate-400 mt-0.5">{MONTHS[month.getMonth()]} {month.getFullYear()+543}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="bg-white/80 backdrop-blur-sm px-4 pt-5 pb-4 border-b border-white/60 flex items-center gap-3 sticky top-0 z-20">
          <Link href="/app/profile" className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={17} className="text-slate-600"/>
          </Link>
          <div className="flex-1">
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight">สรุปเงินเดือน</h1>
            {empName && <p className="text-[11px] text-slate-400 mt-0.5">{empName}</p>}
          </div>
          <button onClick={handleRecalc} disabled={working||loading}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all active:scale-95">
            {working ? <Loader2 size={11} className="animate-spin"/> : <RefreshCw size={11}/>}
            {working ? "กำลังคำนวณ..." : "คำนวณใหม่"}
          </button>
        </div>

        <div className="px-4 pt-5 space-y-4 max-w-lg mx-auto w-full">

          {/* ── Toast ──────────────────────────────────────────────── */}
          {msg ? (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold fade-up ${
              msg.type==="ok"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {msg.type==="ok" ? <CheckCircle2 size={15}/> : <AlertCircle size={15}/>}
              {msg.text}
            </div>
          ) : null}

          {/* ── Month nav ──────────────────────────────────────────── */}
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
            <button onClick={() => setMonth(m => subMonths(m,1))}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-90 transition-all">
              <ChevronLeft size={18} className="text-slate-500"/>
            </button>
            <div className="text-center">
              <p className="text-base font-black text-slate-800 tracking-tight">
                {MONTHS[month.getMonth()]} {month.getFullYear()+543}
              </p>
              {r ? (
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  เข้างาน {r.present_days??0} วัน · ขาด {r.absent_days??0} วัน
                </p>
              ) : null}
            </div>
            <button onClick={() => setMonth(m => addMonths(m,1))} disabled={!canNext}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-90 transition-all disabled:opacity-25">
              <ChevronRight size={18} className="text-slate-500"/>
            </button>
          </div>

          {/* ── Loading ────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg">
                <Loader2 size={24} className="animate-spin text-white"/>
              </div>
              <p className="text-sm text-slate-400 font-medium">กำลังคำนวณเงินเดือน...</p>
            </div>

          ) : !r ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Banknote size={28} className="text-slate-300"/>
              </div>
              <p className="text-slate-400 text-sm mb-4 font-medium">ยังไม่มีข้อมูลเงินเดือนเดือนนี้</p>
              <button onClick={handleRecalc}
                className="text-sm font-black text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-2xl hover:bg-emerald-100 transition-colors">
                คำนวณเงินเดือน →
              </button>
            </div>

          ) : (
            <>
              {/* ── CREDIT CARD ──────────────────────────────────── */}
              <div className="salary-card p-5 fade-up" style={{ minHeight:180 }}>
                {/* chip + brand */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-90 flex items-center justify-center">
                      <div className="w-5 h-4 rounded-sm border border-yellow-600/40 grid grid-cols-2 gap-px p-px">
                        <div className="bg-yellow-600/30 rounded-sm"/>
                        <div className="bg-yellow-600/30 rounded-sm"/>
                        <div className="bg-yellow-600/30 rounded-sm"/>
                        <div className="bg-yellow-600/30 rounded-sm"/>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30"/>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                    <CreditCard size={10} className="text-white/70"/>
                    <span className="text-[9px] font-black text-white/80 tracking-widest uppercase">SHD Pay</span>
                  </div>
                </div>

                {/* net salary */}
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">เงินเดือนสุทธิ</p>
                  <p className="text-4xl font-black text-white tracking-tight leading-none">
                    ฿{thb(net)}
                  </p>
                </div>

                {/* bottom row */}
                <div className="flex items-end justify-between mt-4 relative z-10">
                  <div>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">ชื่อ</p>
                    <p className="text-xs font-bold text-white/90 truncate max-w-[160px]">{empName || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">งวด</p>
                    <p className="text-xs font-bold text-white/90">{MONTHS[month.getMonth()]} {month.getFullYear()+543}</p>
                  </div>
                </div>

                {/* tags */}
                <div className="flex gap-1.5 flex-wrap mt-3 relative z-10">
                  {(r.present_days??0)>0 && (
                    <span className="text-[9px] font-bold text-white/80 bg-white/15 rounded-full px-2.5 py-0.5">
                      ✓ เข้างาน {r.present_days} วัน
                    </span>
                  )}
                  {(r.late_count??0)>0 && (
                    <span className="text-[9px] font-bold text-amber-200 bg-amber-500/30 rounded-full px-2.5 py-0.5">
                      ⏰ สาย {r.late_count} ครั้ง
                    </span>
                  )}
                  {(r.absent_days??0)>0 && (
                    <span className="text-[9px] font-bold text-red-200 bg-red-500/30 rounded-full px-2.5 py-0.5">
                      ✕ ขาด {r.absent_days} วัน
                    </span>
                  )}
                  {(r.ot_hours??0)>0 && (
                    <span className="text-[9px] font-bold text-sky-200 bg-sky-500/30 rounded-full px-2.5 py-0.5">
                      OT {Number(r.ot_hours).toFixed(1)} ชม.
                    </span>
                  )}
                  {r.kpi_grade && r.kpi_grade !== "pending" && (
                    <span className={`text-[9px] font-bold rounded-full px-2.5 py-0.5 ${
                      r.kpi_grade === "A" ? "text-yellow-200 bg-yellow-500/30" :
                      r.kpi_grade === "B" ? "text-green-200 bg-green-500/30" :
                      r.kpi_grade === "C" ? "text-orange-200 bg-orange-500/30" :
                      "text-red-200 bg-red-500/30"
                    }`}>
                      KPI {r.kpi_grade}
                    </span>
                  )}
                  {r.kpi_grade === "pending" && (
                    <span className="text-[9px] font-bold rounded-full px-2.5 py-0.5 text-slate-300 bg-slate-500/30">
                      KPI รอประเมิน
                    </span>
                  )}
                </div>
              </div>

              {/* ── Quick KPI row ─────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2.5 fade-up-1">
                {[
                  { label:"รายได้รวม",  value: thbShort(gross),    color:"text-slate-800",  bg:"from-emerald-50 to-white",  icon:<Banknote size={14} className="text-emerald-500"/> },
                  { label:"หักทั้งหมด", value: thbShort(totalDed), color:"text-red-600",    bg:"from-red-50 to-white",      icon:<TrendingDown size={14} className="text-red-400"/> },
                  { label:"รับสุทธิ",   value: thbShort(net),      color:"text-emerald-700",bg:"from-cyan-50 to-white",     icon:<CreditCard size={14} className="text-cyan-500"/> },
                ].map(k => (
                  <div key={k.label} className={`glass-card rounded-2xl px-3 py-3 bg-gradient-to-b ${k.bg}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">{k.icon}
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</span>
                    </div>
                    <p className={`text-[15px] font-black ${k.color} leading-none`}>฿{k.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Attendance summary ────────────────────────── */}
              <div className="glass-card rounded-3xl p-4 fade-up-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">สรุปการทำงาน</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatBadge icon={<CalendarDays size={13}/>} label="วันทำงาน" value={`${r.present_days ?? 0}/${r.working_days ?? 0} วัน`} color="emerald"/>
                  <StatBadge icon={<UserX size={13}/>} label="ขาดงาน" value={`${r.absent_days ?? 0} วัน`} color={(r.absent_days??0) > 0 ? "red" : "slate"}/>
                  <StatBadge icon={<Clock size={13}/>} label="มาสาย" value={`${r.late_count ?? 0} ครั้ง`} color={(r.late_count??0) > 0 ? "amber" : "slate"}/>
                  <StatBadge icon={<Timer size={13}/>} label="OT" value={`${Number(r.ot_hours ?? 0).toFixed(1)} ชม.`} color={(r.ot_hours??0) > 0 ? "sky" : "slate"}/>
                  {(leavePaid > 0 || leaveUnpaid > 0) && (
                    <StatBadge icon={<Palmtree size={13}/>} label="วันลา" value={`${leavePaid + leaveUnpaid} วัน`} color="violet" sub={leaveUnpaid > 0 ? `(ไม่ได้เงิน ${leaveUnpaid} วัน)` : undefined}/>
                  )}
                </div>
              </div>

              {/* ── Detail card ───────────────────────────────────── */}
              <div className="glass-card rounded-3xl overflow-hidden fade-up-2">

                {/* income section */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">รายได้</p>
                    <span className="text-xs font-black text-emerald-600">+฿{thb(gross)}</span>
                  </div>
                  <div className="space-y-2.5">
                    <IncomeRow label="เงินเดือนฐาน"       value={r.base_salary}/>
                    {(r.allowance_position ??0)>0 && <IncomeRow label="ค่าตำแหน่ง"      value={r.allowance_position}/>}
                    {(r.allowance_transport??0)>0 && <IncomeRow label="ค่าเดินทาง"       value={r.allowance_transport}/>}
                    {(r.allowance_food     ??0)>0 && <IncomeRow label="ค่าอาหาร"         value={r.allowance_food}/>}
                    {(r.allowance_phone    ??0)>0 && <IncomeRow label="ค่าโทรศัพท์"      value={r.allowance_phone}/>}
                    {(r.allowance_housing  ??0)>0 && <IncomeRow label="ค่าที่อยู่อาศัย"  value={r.allowance_housing}/>}
                    {allowOther > 0              && <IncomeRow label="เบี้ยเลี้ยงอื่นๆ"  value={allowOther}/>}
                    {(r.ot_amount          ??0)>0 && <IncomeRow label={`ค่าล่วงเวลา (${Number(r.ot_hours??0).toFixed(1)} ชม.)`} value={r.ot_amount} accent="emerald"/>}
                    {commission > 0              && <IncomeRow label="คอมมิชชั่น"        value={commission} accent="emerald"/>}
                    {(r.bonus              ??0)>0 && r.kpi_grade !== "pending" && <IncomeRow label={`KPI Bonus (เกรด ${r.kpi_grade})`} value={r.bonus} accent="sky"/>}
                    {r.kpi_grade === "pending" && r.kpi_standard_amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">KPI Bonus</span>
                        <span className="text-xs text-slate-400 italic">รอหัวหน้าประเมิน</span>
                      </div>
                    )}
                    {otherIncome > 0             && <IncomeRow label="รายได้อื่นๆ"       value={otherIncome} accent="emerald"/>}
                    {incomeExtras.map((ex: any, i: number) => (
                      <IncomeRow key={`ie-${i}`} label={ex.name || `รายได้เพิ่มเติม ${i+1}`} value={Number(ex.amount) || 0} accent="emerald"/>
                    ))}
                  </div>
                </div>

                <div className="mx-4 border-t border-dashed border-slate-200"/>

                {/* deductions section */}
                <div className="bg-gradient-to-b from-red-50/40 to-white/60 px-4 pt-3 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">รายการหัก</p>
                    <span className="text-xs font-black text-red-500">-฿{thb(totalDed)}</span>
                  </div>
                  <div className="space-y-2">
                    <DeductRow label={`ประกันสังคม (5%)`} value={sso}    icon={<Shield size={11} className="text-blue-400"/>}/>
                    {tax>0    && <DeductRow label="ภาษีหัก ณ ที่จ่าย"  value={tax}    icon={<Receipt size={11} className="text-violet-400"/>}/>}
                    {dLate>0  && <DeductRow label={`หักมาสาย (${r.late_count??0} ครั้ง)`} value={dLate}  icon={<Clock size={11} className="text-amber-500"/>} color="text-amber-700"/>}
                    {dEarly>0 && <DeductRow label="หักออกก่อนกำหนด"     value={dEarly} icon={<TrendingDown size={11} className="text-orange-400"/>} color="text-orange-600"/>}
                    {dAbsent>0&& <DeductRow label={`หักขาดงาน (${r.absent_days??0} วัน)`} value={dAbsent} icon={<UserX size={11} className="text-red-400"/>} color="text-red-600"/>}
                    {dLoan>0  && <DeductRow label="หักเงินกู้"           value={dLoan}  icon={<Banknote size={11} className="text-slate-400"/>}/>}
                    {dOther>0 && <DeductRow label={leaveUnpaid > 0 ? `หักลาไม่ได้เงิน (${leaveUnpaid} วัน)` : "หักอื่นๆ"} value={dOther} icon={<Minus size={11} className="text-slate-400"/>}/>}
                    {deductExtras.map((ex: any, i: number) => (
                      <DeductRow key={`de-${i}`} label={ex.name || `หักเพิ่มเติม ${i+1}`} value={Number(ex.amount) || 0} icon={<Minus size={11} className="text-slate-400"/>}/>
                    ))}
                  </div>
                </div>

                {/* calculation summary */}
                <div className="mx-4 border-t border-dashed border-slate-200"/>
                <div className="px-4 py-3 bg-slate-50/50">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">รายได้รวม</span>
                    <span className="font-bold text-slate-600">+฿{thb(gross)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] mt-1">
                    <span className="text-slate-400">หักรวม</span>
                    <span className="font-bold text-red-500">-฿{thb(totalDed)}</span>
                  </div>
                </div>

                {/* net row */}
                <div className="px-4 py-4 border-t border-slate-100 bg-gradient-to-r from-emerald-50/60 to-cyan-50/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เงินเดือนสุทธิ</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">฿{thb(net)}</p>
                    </div>
                    <div className="text-right">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                        <CreditCard size={20} className="text-white"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── History chart ─────────────────────────────────── */}
              {history.length > 0 && (
                <div className="glass-card rounded-3xl p-4 fade-up-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ประวัติ 6 เดือน</p>
                    <p className="text-[10px] text-slate-400">สูงสุด ฿{thbShort(maxNet)}</p>
                  </div>
                  <div className="flex gap-2 h-20 items-end">
                    {history.map((h: any) => {
                      const pct     = maxNet > 0 ? Math.min((Number(h.net_salary)||0)/maxNet*100,100) : 0
                      const isActive= `${h.year}-${String(h.month).padStart(2,"0")}` === format(month,"yyyy-MM")
                      return (
                        <div key={`${h.year}-${h.month}`} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end" style={{ height:70 }}>
                            <div
                              className={`w-full rounded-t-xl bar-grow transition-all ${isActive ? "bg-gradient-to-t from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-200" : "bg-slate-200"}`}
                              style={{ height:`${pct}%` }}
                            />
                          </div>
                          <p className={`text-[9px] font-bold ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
                            {MONTHS[h.month-1]}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Debug toggle ──────────────────────────────────── */}
              {debug && (
                <div className="glass-card rounded-2xl overflow-hidden fade-up-3">
                  <button
                    onClick={() => setShowDebug(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">🔍 ข้อมูลการคำนวณ</span>
                    {showDebug ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                  </button>
                  {showDebug && (
                    <div className="bg-slate-900 px-4 py-3 text-xs font-mono space-y-1 text-slate-400">
                      <p>งวด: <span className="text-white">{debug.period}</span></p>
                      <p>attendance: <span className={(debug.att_records_found??0)>0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{debug.att_records_found} รายการ</span></p>
                      {debug.att_err && <p className="text-red-400">⚠ {debug.att_err}</p>}
                      <div className="border-t border-slate-700 my-1.5"/>
                      <p>สาย: <span className={(debug.late_total_min??0)>0?"text-amber-400 font-bold":"text-slate-600"}>{debug.late_count} ครั้ง · {debug.late_total_min} นาที → ฿{debug.deduct_late}</span></p>
                      <p>ออกก่อน: <span className={(debug.early_total_min??0)>0?"text-orange-400 font-bold":"text-slate-600"}>{debug.early_count} ครั้ง · {debug.early_total_min} นาที → ฿{debug.deduct_early}</span></p>
                      <p>ขาดงาน: <span className={(debug.absent_days??0)>0?"text-red-400 font-bold":"text-slate-600"}>{debug.absent_days} วัน → ฿{debug.deduct_absent}</span></p>
                      {(debug.absent_dates?.length??0)>0 && <p className="text-red-400">วันขาด: {debug.absent_dates.join(", ")}</p>}
                      <div className="border-t border-slate-700 my-1.5"/>
                      <p>SSO ฿{debug.sso} | ภาษี ฿{debug.tax_monthly} | สุทธิ <span className="text-emerald-400 font-bold">฿{Number(debug.net).toLocaleString()}</span></p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── sub components ────────────────────────────────────────────────
function IncomeRow({ label, value, accent }: { label:string; value?: number|null; accent?:string }) {
  const col = accent === "emerald" ? "text-emerald-700" : accent === "sky" ? "text-sky-700" : "text-slate-700"
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-500 truncate">{label}</span>
      <span className={`text-[13px] font-black ${col} tabular-nums shrink-0`}>฿{Number(value||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
    </div>
  )
}

function DeductRow({ label, value, icon, color="text-slate-600" }: { label:string; value?:number|null; icon?:React.ReactNode; color?:string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[12px] text-slate-500 truncate">
        {icon}{label}
      </span>
      <span className={`text-[13px] font-black ${color} tabular-nums shrink-0`}>
        -฿{Number(value||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}
      </span>
    </div>
  )
}

const STAT_COLORS: Record<string, { bg:string; text:string; icon:string }> = {
  emerald: { bg:"bg-emerald-50", text:"text-emerald-700", icon:"text-emerald-500" },
  red:     { bg:"bg-red-50",     text:"text-red-600",     icon:"text-red-400" },
  amber:   { bg:"bg-amber-50",   text:"text-amber-700",   icon:"text-amber-500" },
  sky:     { bg:"bg-sky-50",     text:"text-sky-700",     icon:"text-sky-500" },
  violet:  { bg:"bg-violet-50",  text:"text-violet-700",  icon:"text-violet-500" },
  slate:   { bg:"bg-slate-50",   text:"text-slate-500",   icon:"text-slate-400" },
}

function StatBadge({ icon, label, value, color = "slate", sub }: { icon: React.ReactNode; label: string; value: string; color?: string; sub?: string }) {
  const c = STAT_COLORS[color] ?? STAT_COLORS.slate
  return (
    <div className={`${c.bg} rounded-2xl px-3 py-2.5 flex items-center gap-2.5`}>
      <div className={c.icon}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-medium">{label}</p>
        <p className={`text-[13px] font-black ${c.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}