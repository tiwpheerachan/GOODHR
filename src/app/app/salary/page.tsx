"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, Clock,
} from "lucide-react"
import Link from "next/link"
import { format, subMonths, addMonths } from "date-fns"

// ── helpers ───────────────────────────────────────────────────────────

function thb(n?: number | null): string {
  return Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

// ── sub-components ────────────────────────────────────────────────────

function RowItem({
  label, value, minus = false, color = "text-slate-700", icon,
}: {
  label: string
  value?: number | null
  minus?: boolean
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">{icon}{label}</span>
      <span className={`text-sm font-bold ${color}`}>
        {minus ? "-" : ""}฿{thb(value)}
      </span>
    </div>
  )
}

function Bar({ value, max, active }: { value: number; max: number; active: boolean }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-full w-full flex items-end">
      <div
        className={`rounded-t-lg w-full transition-all duration-500 ${
          active ? "bg-blue-500" : "bg-slate-200"
        }`}
        style={{ height: `${pct}%` }}
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

export default function SalaryPage() {
  const { user } = useAuth()

  const [month,   setMonth]   = useState(new Date())
  const [record,  setRecord]  = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [debug,   setDebug]   = useState<any>(null)
  const [msg,     setMsg]     = useState<{
    type: "ok" | "err" | "info"
    text: string
  } | null>(null)

  // employee id — รองรับทั้ง 2 รูปแบบ useAuth
  const empId: string | undefined =
    (user as any)?.employee_id ?? (user as any)?.employee?.id

  // ── เรียก GET /api/payroll — recalculate ทุกครั้ง ────────────
  const fetchPayroll = useCallback(async (yr: number, mon: number) => {
    const res  = await fetch(`/api/payroll?year=${yr}&month=${mon}`, {
      cache: "no-store",
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "ไม่สามารถโหลดข้อมูลได้")
    return json
  }, [])

  // ── โหลดเมื่อเปลี่ยนเดือน ─────────────────────────────────────
  const loadAll = useCallback(async (yr: number, mon: number) => {
    if (!empId) return
    setLoading(true)
    setRecord(null)
    setDebug(null)
    setMsg(null)
    try {
      const json = await fetchPayroll(yr, mon)
      setRecord(json.record   ?? null)
      setHistory(json.history ?? [])
      if (json.debug) setDebug(json.debug)
    } catch (e: any) {
      setMsg({ type: "err", text: e.message })
    } finally {
      setLoading(false)
    }
  }, [empId, fetchPayroll])

  useEffect(() => {
    if (!empId) return
    loadAll(month.getFullYear(), month.getMonth() + 1)
  }, [empId, month.getFullYear(), month.getMonth()]) // eslint-disable-line

  // ── ปุ่มคำนวณใหม่ ──────────────────────────────────────────────
  const handleRecalc = async () => {
    if (!empId || working) return
    setWorking(true)
    setMsg(null)
    setDebug(null)
    try {
      const json = await fetchPayroll(month.getFullYear(), month.getMonth() + 1)
      setRecord(json.record   ?? null)
      setHistory(json.history ?? [])
      if (json.debug) setDebug(json.debug)
      setMsg({ type: "ok", text: "คำนวณเรียบร้อยแล้ว" })
      setTimeout(() => setMsg(null), 5000)
    } catch (e: any) {
      setMsg({ type: "err", text: e.message })
    } finally {
      setWorking(false)
    }
  }

  // ── computed ────────────────────────────────────────────────────
  const r        = record
  const gross    = Number(r?.gross_income)           || 0
  const sso      = Number(r?.social_security_amount) || 0
  const tax      = Number(r?.monthly_tax_withheld)   || 0
  const dLate    = Number(r?.deduct_late)            || 0
  const dEarly   = Number(r?.deduct_early_out)       || 0
  const dAbsent  = Number(r?.deduct_absent)          || 0
  const dLoan    = Number(r?.deduct_loan)            || 0
  const totalDed = Number(r?.total_deductions)       || 0
  const net      = Number(r?.net_salary)             || 0

  const maxNet  = Math.max(...history.map(h => Number(h.net_salary) || 0), net, 1)
  const canNext = format(addMonths(month, 1), "yyyy-MM") <= format(new Date(), "yyyy-MM")

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-10">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
        <Link
          href="/app/profile"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-slate-800">สรุปเงินเดือน</h1>
          <p className="text-xs text-slate-400">
            {(user as any)?.employee?.first_name_th}{" "}
            {(user as any)?.employee?.last_name_th}
          </p>
        </div>
        <button
          onClick={handleRecalc}
          disabled={working || loading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          {working
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          {working ? "กำลังคำนวณ..." : "คำนวณใหม่"}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto w-full">

        {/* ── Notification ─────────────────────────────────────── */}
        {msg ? (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium ${
            msg.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : msg.type === "err"
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-blue-50 border border-blue-200 text-blue-600"
          }`}>
            {msg.type === "ok"
              ? <CheckCircle2 size={15} />
              : msg.type === "err"
              ? <AlertCircle size={15} />
              : <Loader2 size={14} className="animate-spin" />}
            {msg.text}
          </div>
        ) : null}

        {/* ── Month navigation ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-xl"
          >
            <ChevronLeft size={18} className="text-slate-500" />
          </button>
          <div className="text-center">
            <p className="text-base font-bold text-slate-800">
              {MONTHS[month.getMonth()]} {month.getFullYear() + 543}
            </p>
            {r ? (
              <p className="text-[11px] text-slate-400 mt-0.5">
                เข้างาน {r.present_days ?? 0} วัน · ขาด {r.absent_days ?? 0} วัน
              </p>
            ) : null}
          </div>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={!canNext}
            className="p-1.5 hover:bg-slate-100 rounded-xl disabled:opacity-30"
          >
            <ChevronRight size={18} className="text-slate-500" />
          </button>
        </div>

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-blue-400" />
            <p className="text-sm text-slate-400">กำลังคำนวณเงินเดือน...</p>
          </div>

        ) : !r ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">ยังไม่มีข้อมูลเงินเดือนเดือนนี้</p>
            <button
              onClick={handleRecalc}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              คำนวณเงินเดือน →
            </button>
          </div>

        ) : (
          <>
            {/* ── Hero ─────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg">
              <p className="text-xs font-medium text-blue-200 mb-1">เงินเดือนสุทธิ</p>
              <p className="text-4xl font-black tracking-tight">฿{thb(net)}</p>
              <div className="mt-3 flex gap-2 flex-wrap text-xs">
                {r.present_days != null ? (
                  <span className="bg-white/20 rounded-full px-2.5 py-0.5">
                    เข้างาน {r.present_days} วัน
                  </span>
                ) : null}
                {(r.late_count ?? 0) > 0 ? (
                  <span className="bg-amber-400/30 rounded-full px-2.5 py-0.5">
                    ⏰ สาย {r.late_count} ครั้ง
                  </span>
                ) : null}
                {(r.absent_days ?? 0) > 0 ? (
                  <span className="bg-red-400/30 rounded-full px-2.5 py-0.5">
                    ❌ ขาด {r.absent_days} วัน
                  </span>
                ) : null}
                {(r.ot_hours ?? 0) > 0 ? (
                  <span className="bg-green-400/30 rounded-full px-2.5 py-0.5">
                    OT {Number(r.ot_hours).toFixed(1)} ชม.
                  </span>
                ) : null}
              </div>
            </div>

            {/* ── Detail ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-bold text-slate-700">รายละเอียดเงินเดือน</p>
              </div>

              {/* รายได้ */}
              <div className="px-4 pb-3 space-y-2.5">
                <RowItem label="เงินเดือนฐาน"         value={r.base_salary} />
                {(r.allowance_position  ?? 0) > 0
                  ? <RowItem label="ค่าตำแหน่ง"        value={r.allowance_position}  /> : null}
                {(r.allowance_transport ?? 0) > 0
                  ? <RowItem label="ค่าเดินทาง"         value={r.allowance_transport} /> : null}
                {(r.allowance_food      ?? 0) > 0
                  ? <RowItem label="ค่าอาหาร"           value={r.allowance_food}      /> : null}
                {(r.allowance_phone     ?? 0) > 0
                  ? <RowItem label="ค่าโทรศัพท์"        value={r.allowance_phone}     /> : null}
                {(r.allowance_housing   ?? 0) > 0
                  ? <RowItem label="ค่าที่อยู่อาศัย"    value={r.allowance_housing}   /> : null}
                {(r.ot_amount           ?? 0) > 0
                  ? <RowItem label="ค่าล่วงเวลา (OT)"   value={r.ot_amount}           /> : null}
                {(r.bonus               ?? 0) > 0
                  ? <RowItem label="โบนัส"              value={r.bonus}               /> : null}
              </div>

              {/* รายการหัก */}
              <div className="border-t border-dashed border-slate-100 px-4 py-3 bg-red-50/30 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  รายการหัก
                </p>
                <RowItem
                  label="ประกันสังคม"
                  value={sso}
                  minus
                  color="text-slate-600"
                />
                {tax > 0 ? (
                  <RowItem
                    label="ภาษีหัก ณ ที่จ่าย"
                    value={tax}
                    minus
                    color="text-slate-600"
                  />
                ) : null}
                {dLate > 0 ? (
                  <RowItem
                    label={`หักมาสาย (${r.late_count ?? 0} ครั้ง)`}
                    value={dLate}
                    minus
                    color="text-amber-700"
                    icon={<Clock size={11} className="text-amber-500" />}
                  />
                ) : null}
                {dEarly > 0 ? (
                  <RowItem
                    label="หักออกก่อนกำหนด"
                    value={dEarly}
                    minus
                    color="text-orange-600"
                  />
                ) : null}
                {dAbsent > 0 ? (
                  <RowItem
                    label={`หักขาดงาน (${r.absent_days ?? 0} วัน)`}
                    value={dAbsent}
                    minus
                    color="text-red-600"
                  />
                ) : null}
                {dLoan > 0 ? (
                  <RowItem
                    label="หักเงินกู้"
                    value={dLoan}
                    minus
                    color="text-slate-600"
                  />
                ) : null}
              </div>

              {/* summary */}
              <div className="px-4 py-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>รายได้รวม</span>
                  <span className="font-bold text-slate-700">+฿{thb(gross)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>หักทั้งหมด</span>
                  <span className="font-bold text-red-500">-฿{thb(totalDed)}</span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-800">รับสุทธิ</span>
                  <span className="text-2xl font-black text-blue-700">฿{thb(net)}</span>
                </div>
              </div>
            </div>

            {/* ── Debug panel ──────────────────────────────────── */}
            {debug ? (
              <div className="bg-slate-800 rounded-2xl p-4 text-xs font-mono space-y-1 text-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-white">🔍 ผลการคำนวณ</p>
                  <button
                    onClick={() => setDebug(null)}
                    className="text-slate-400 hover:text-white text-lg leading-none px-1"
                  >×</button>
                </div>
                <p>งวด: <span className="text-white">{debug.period}</span></p>
                <p>
                  พบ attendance:{" "}
                  <span className={
                    (debug.att_records_found ?? 0) > 0
                      ? "text-emerald-400 font-bold"
                      : "text-red-400 font-bold"
                  }>
                    {debug.att_records_found} รายการ
                  </span>
                </p>
                {debug.att_err
                  ? <p className="text-red-400">⚠ {debug.att_err}</p>
                  : null}
                <div className="border-t border-slate-700 my-1.5" />
                <p>
                  สาย:{" "}
                  <span className={
                    (debug.late_total_min ?? 0) > 0
                      ? "text-amber-400 font-bold"
                      : "text-slate-500"
                  }>
                    {debug.late_count} ครั้ง · {debug.late_total_min} นาที
                    {" → "}หัก ฿{debug.deduct_late}
                  </span>
                </p>
                <p>
                  ออกก่อน:{" "}
                  <span className={
                    (debug.early_total_min ?? 0) > 0
                      ? "text-orange-400 font-bold"
                      : "text-slate-500"
                  }>
                    {debug.early_count} ครั้ง · {debug.early_total_min} นาที
                    {" → "}หัก ฿{debug.deduct_early}
                  </span>
                </p>
                <p>
                  ขาดงาน:{" "}
                  <span className={
                    (debug.absent_days ?? 0) > 0
                      ? "text-red-400 font-bold"
                      : "text-slate-500"
                  }>
                    {debug.absent_days} วัน → หัก ฿{debug.deduct_absent}
                  </span>
                </p>
                {(debug.absent_dates?.length ?? 0) > 0
                  ? <p className="text-red-400">วันขาด: {(debug.absent_dates as string[]).join(", ")}</p>
                  : null}
                <div className="border-t border-slate-700 my-1.5" />
                <p>
                  SSO ฿{debug.sso} | ภาษี ฿{debug.tax_monthly}
                </p>
                <p>
                  หักรวม{" "}
                  <span className="text-red-400 font-bold">
                    ฿{Number(debug.total_deduct).toLocaleString()}
                  </span>
                  {" | "}สุทธิ{" "}
                  <span className="text-emerald-400 font-bold">
                    ฿{Number(debug.net).toLocaleString()}
                  </span>
                </p>
              </div>
            ) : null}

            {/* ── History chart ────────────────────────────────── */}
            {history.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">ประวัติ 6 เดือน</p>
                <div className="flex gap-2 h-20">
                  {history.map(h => (
                    <div
                      key={`${h.year}-${h.month}`}
                      className="flex-1 flex flex-col items-center"
                    >
                      <Bar
                        value={Number(h.net_salary) || 0}
                        max={maxNet}
                        active={
                          `${h.year}-${String(h.month).padStart(2, "0")}`
                          === format(month, "yyyy-MM")
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  {history.map(h => (
                    <div key={`${h.year}-${h.month}`} className="flex-1 text-center">
                      <p className="text-[9px] text-slate-400">{MONTHS[h.month - 1]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}