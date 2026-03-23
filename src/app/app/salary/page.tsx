"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, Clock, TrendingDown, Banknote,
  Shield, Receipt, UserX, CreditCard, ChevronDown, ChevronUp,
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
  const [month,   setMonth]   = useState(getCurrentPeriodDate())
  const [record,  setRecord]  = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [debug,   setDebug]   = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [msg,     setMsg]     = useState<{ type:"ok"|"err"; text:string }|null>(null)

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

  useEffect(() => {
    if (!empId) return
    loadAll(month.getFullYear(), month.getMonth() + 1)
  }, [empId, month.getFullYear(), month.getMonth()]) // eslint-disable-line

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
  const totalDed = Number(r?.total_deductions)       || 0
  const maxNet   = Math.max(...history.map(h => Number(h.net_salary)||0), net, 1)
  const canNext  = format(addMonths(month,1),"yyyy-MM") <= format(new Date(),"yyyy-MM")

  const empName = `${(user as any)?.employee?.first_name_th ?? ""} ${(user as any)?.employee?.last_name_th ?? ""}`.trim()

  return (
    <>
      <style>{`
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
        .glass-card {
          background:rgba(255,255,255,0.85);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.9);
          box-shadow:0 4px 24px rgba(0,0,0,0.06);
        }
      `}</style>

      <div className="flex flex-col min-h-screen pb-12" style={{ background:"linear-gradient(160deg,#f0fdf9 0%,#e0f2fe 50%,#f0fdf4 100%)" }}>

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
                    {(r.ot_amount          ??0)>0 && <IncomeRow label="ค่าล่วงเวลา (OT)" value={r.ot_amount} accent="emerald"/>}
                    {(r.bonus              ??0)>0 && <IncomeRow label="โบนัส"            value={r.bonus} accent="sky"/>}
                  </div>
                </div>

                {/* deductions section */}
                <div className="border-t border-slate-100/80 bg-gradient-to-b from-red-50/40 to-white/60 px-4 pt-3 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">รายการหัก</p>
                    <span className="text-xs font-black text-red-500">-฿{thb(totalDed)}</span>
                  </div>
                  <div className="space-y-2">
                    <DeductRow label="ประกันสังคม"       value={sso}    icon={<Shield size={11} className="text-blue-400"/>}/>
                    {tax>0    && <DeductRow label="ภาษีหัก ณ ที่จ่าย"  value={tax}    icon={<Receipt size={11} className="text-violet-400"/>}/>}
                    {dLate>0  && <DeductRow label={`มาสาย ${r.late_count??0} ครั้ง`} value={dLate}  icon={<Clock size={11} className="text-amber-500"/>} color="text-amber-700"/>}
                    {dEarly>0 && <DeductRow label="ออกก่อนกำหนด"     value={dEarly} icon={<TrendingDown size={11} className="text-orange-400"/>} color="text-orange-600"/>}
                    {dAbsent>0&& <DeductRow label={`ขาดงาน ${r.absent_days??0} วัน`} value={dAbsent} icon={<UserX size={11} className="text-red-400"/>} color="text-red-600"/>}
                    {dLoan>0  && <DeductRow label="เงินกู้"            value={dLoan}  icon={<Banknote size={11} className="text-slate-400"/>}/>}
                  </div>
                </div>

                {/* net row */}
                <div className="px-4 py-4 border-t border-slate-100 bg-gradient-to-r from-emerald-50/60 to-cyan-50/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">รับสุทธิ</p>
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