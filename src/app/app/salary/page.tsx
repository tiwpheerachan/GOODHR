"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { format, subMonths, addMonths } from "date-fns"
import { th } from "date-fns/locale"

const supabase = createClient()

function fmt(n?: number | null) {
  if (n == null) return "—"
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-full flex items-end">
      <div
        className={"rounded-t-lg w-full transition-all duration-700 " + color}
        style={{ height: pct + "%" }}
      />
    </div>
  )
}

const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export default function SalaryPage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(new Date())
  const [record, setRecord] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    ["--mx" as any]: "50%",
    ["--my" as any]: "50%",
  })

  const empId = user?.employee_id ?? (user as any)?.employee?.id

  useEffect(() => {
    if (!empId) return
    setLoading(true)
    const yr = month.getFullYear()
    const mon = month.getMonth() + 1

    Promise.all([
      supabase
        .from("payroll_records")
        .select("*")
        .eq("employee_id", empId)
        .eq("year", yr)
        .eq("month", mon)
        .maybeSingle(),
      supabase
        .from("salary_structures")
        .select("*")
        .eq("employee_id", empId)
        .is("effective_to", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payroll_records")
        .select("year,month,net_salary,gross_income,total_deductions")
        .eq("employee_id", empId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(6),
    ]).then(([{ data: rec }, { data: sal }, { data: hist }]) => {
      setRecord(rec)
      setSalary(sal)
      setHistory((hist ?? []).reverse())
      setLoading(false)
    })
  }, [empId, month.getMonth(), month.getFullYear()])

  const r = record
  const s = salary

  const incomes = r
    ? [
        { label: "เงินเดือนฐาน", value: r.base_salary, show: true },
        { label: "ค่าตำแหน่ง", value: r.allowance_position, show: (r.allowance_position || 0) > 0 },
        { label: "ค่าเดินทาง", value: r.allowance_transport, show: (r.allowance_transport || 0) > 0 },
        { label: "ค่าอาหาร", value: r.allowance_food, show: (r.allowance_food || 0) > 0 },
        { label: "ค่าโทรศัพท์", value: r.allowance_phone, show: (r.allowance_phone || 0) > 0 },
        { label: "ค่าที่อยู่อาศัย", value: r.allowance_housing, show: (r.allowance_housing || 0) > 0 },
        { label: "ค่าล่วงเวลา (OT)", value: r.ot_amount, show: (r.ot_amount || 0) > 0 },
      ].filter((i) => i.show)
    : s
      ? [
          { label: "เงินเดือนฐาน", value: s.base_salary, show: true },
          { label: "ค่าตำแหน่ง", value: s.allowance_position, show: (s.allowance_position || 0) > 0 },
          { label: "ค่าเดินทาง", value: s.allowance_transport, show: (s.allowance_transport || 0) > 0 },
          { label: "ค่าอาหาร", value: s.allowance_food, show: (s.allowance_food || 0) > 0 },
          { label: "ค่าโทรศัพท์", value: s.allowance_phone, show: (s.allowance_phone || 0) > 0 },
          { label: "ค่าที่อยู่อาศัย", value: s.allowance_housing, show: (s.allowance_housing || 0) > 0 },
        ].filter((i) => i.show)
      : []

  const deductions = r
    ? [
        { label: "ประกันสังคม", value: r.social_security_amount, show: (r.social_security_amount || 0) > 0 },
        { label: "ภาษีหัก ณ ที่จ่าย", value: r.monthly_tax_withheld, show: (r.monthly_tax_withheld || 0) > 0 },
        { label: "หักมาสาย", value: r.deduct_late, show: (r.deduct_late || 0) > 0 },
        { label: "หักขาดงาน", value: r.deduct_absent, show: (r.deduct_absent || 0) > 0 },
        { label: "หักเงินกู้", value: r.deduct_loan, show: (r.deduct_loan || 0) > 0 },
      ].filter((i) => i.show)
    : []

  const gross = r?.gross_income ?? incomes.reduce((s, i) => s + (i.value || 0), 0)
  const totalDed = r?.total_deductions ?? deductions.reduce((s, d) => s + (d.value || 0), 0)
  const net = r?.net_salary ?? gross - totalDed

  const maxNet = Math.max(...history.map((h) => h.net_salary || 0), net, 1)
  const canNext = format(addMonths(month, 1), "yyyy-MM") <= format(new Date(), "yyyy-MM")

  const handleCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height

    const rotateY = (px - 0.5) * 14
    const rotateX = (0.5 - py) * 12

    setCardStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01,1.01,1.01)`,
      ["--mx" as any]: `${px * 100}%`,
      ["--my" as any]: `${py * 100}%`,
    })
  }

  const handleCardLeave = () => {
    setCardStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      ["--mx" as any]: "50%",
      ["--my" as any]: "50%",
    })
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-slate-50 pb-10">
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
          <Link href="/app/profile" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-slate-800">สรุปเงินเดือน</h1>
            <p className="text-xs text-slate-400">
              {user?.employee?.first_name_th} {user?.employee?.last_name_th}
            </p>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {/* Month nav */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-2">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>

            <h2 className="font-bold text-slate-800 text-sm">
              {format(month, "MMMM yyyy", { locale: th })}
            </h2>

            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              disabled={!canNext}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">กำลังโหลด...</span>
            </div>
          ) : (
            <>
              {/* Net salary hero */}
              <div
                ref={cardRef}
                onMouseMove={handleCardMove}
                onMouseLeave={handleCardLeave}
                className="salary-card p-5 text-white"
                style={cardStyle}
              >
                <span className="spark s1" />
                <span className="spark s2" />
                <span className="spark s3" />
                <span className="spark s4" />

                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-emerald-100 text-[11px] font-bold uppercase tracking-widest">
                        {r ? "เงินได้สุทธิ" : "เงินเดือนฐาน (ยังไม่ประมวลผล)"}
                      </p>
                      <p className="text-white text-4xl font-black mt-1 tabular-nums">
                        ฿{fmt(net)}
                      </p>
                    </div>

                    <div className="card-chip-wrap">
                      <div className="card-chip" />
                    </div>
                  </div>

                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">
                      SHD FOR YOU
                    </p>
                    <p className="text-[11px] font-semibold text-white/80">
                      PAYROLL CARD
                    </p>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <div className="flex-1 bg-white/14 rounded-xl px-3 py-2 border border-white/10 backdrop-blur-md">
                      <p className="text-emerald-100 text-[10px]">รายได้รวม</p>
                      <p className="text-white font-black text-sm tabular-nums">฿{fmt(gross)}</p>
                    </div>
                    <div className="flex-1 bg-white/14 rounded-xl px-3 py-2 border border-white/10 backdrop-blur-md">
                      <p className="text-emerald-100 text-[10px]">หักทั้งหมด</p>
                      <p className="text-white font-black text-sm tabular-nums">฿{fmt(totalDed)}</p>
                    </div>
                  </div>

                  {r && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.present_days != null && (
                        <span className="text-[11px] text-emerald-100 bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
                          เข้างาน {r.present_days} วัน
                        </span>
                      )}
                      {(r.late_count || 0) > 0 && (
                        <span className="text-[11px] text-amber-100 bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
                          สาย {r.late_count} ครั้ง
                        </span>
                      )}
                      {(r.absent_days || 0) > 0 && (
                        <span className="text-[11px] text-red-100 bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
                          ขาด {r.absent_days} วัน
                        </span>
                      )}
                      {(r.ot_hours || 0) > 0 && (
                        <span className="text-[11px] text-emerald-100 bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
                          OT {Number(r.ot_hours).toFixed(1)} ชม.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bar chart */}
              {history.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <p className="text-sm font-bold text-slate-700 mb-4">รายได้สุทธิ 6 เดือน</p>
                  <div className="flex items-end gap-1.5 h-28">
                    {history.map((h, i) => {
                      const isCurrent =
                        h.year === month.getFullYear() && h.month === month.getMonth() + 1
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                          <div className="flex-1 w-full">
                            <Bar
                              value={h.net_salary || 0}
                              max={maxNet}
                              color={isCurrent ? "bg-emerald-500" : "bg-slate-200"}
                            />
                          </div>
                          <p
                            className={
                              "text-[10px] font-semibold " +
                              (isCurrent ? "text-emerald-600" : "text-slate-400")
                            }
                          >
                            {MONTH_NAMES[h.month - 1]}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <span className="text-xs text-slate-400">
                      ต่ำสุด{" "}
                      <span className="font-bold text-slate-600">
                        ฿{fmt(Math.min(...history.map((h) => h.net_salary || 0)))}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400">
                      สูงสุด{" "}
                      <span className="font-bold text-slate-600">
                        ฿{fmt(Math.max(...history.map((h) => h.net_salary || 0)))}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Income breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                  <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <TrendingUp size={13} className="text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">รายได้</p>
                  <p className="text-sm font-black text-emerald-600 ml-auto">฿{fmt(gross)}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {incomes.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">฿{fmt(item.value)}</span>
                    </div>
                  ))}
                  {incomes.length === 0 && (
                    <p className="px-4 py-4 text-sm text-slate-400 text-center">
                      ไม่มีข้อมูลโครงสร้างเงินเดือน
                    </p>
                  )}
                </div>
              </div>

              {/* Deduction breakdown */}
              {deductions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                    <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center">
                      <TrendingDown size={13} className="text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">รายการหัก</p>
                    <p className="text-sm font-black text-red-500 ml-auto">-฿{fmt(totalDed)}</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {deductions.map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-slate-600">{item.label}</span>
                        <span className="text-sm font-bold text-red-500 tabular-nums">-฿{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net summary bar */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs text-slate-500">รายได้รวม</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">฿{fmt(gross)}</p>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs text-slate-500">หักทั้งหมด</p>
                  <p className="text-sm font-bold text-red-500 tabular-nums">-฿{fmt(totalDed)}</p>
                </div>
                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700"
                    style={{ width: gross > 0 ? (net / gross * 100) + "%" : "0%" }}
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-700">เงินได้สุทธิ</p>
                  <p className="text-lg font-black text-emerald-600 tabular-nums">฿{fmt(net)}</p>
                </div>
              </div>

              {!r && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 font-medium text-center">
                  ยังไม่ประมวลผลเงินเดือนเดือนนี้ — แสดงข้อมูลจากโครงสร้างเงินเดือนปัจจุบัน
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes cardWave {
          0% {
            transform: translateX(-120%) rotate(16deg);
            opacity: 0;
          }
          28% {
            opacity: 0.36;
          }
          72% {
            opacity: 0.12;
          }
          100% {
            transform: translateX(220%) rotate(16deg);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.7);
          }
          50% {
            opacity: 1;
            transform: scale(1.45);
          }
        }

        @keyframes breatheShadow {
          0%,
          100% {
            box-shadow:
              0 22px 48px rgba(16, 185, 129, 0.24),
              0 10px 24px rgba(8, 145, 178, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }
          50% {
            box-shadow:
              0 28px 62px rgba(16, 185, 129, 0.32),
              0 14px 30px rgba(8, 145, 178, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.22);
          }
        }

        .salary-card {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          transform-style: preserve-3d;
          transition:
            transform 160ms ease-out,
            box-shadow 200ms ease-out;
          background:
            radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.24), transparent 22%),
            radial-gradient(circle at 18% 18%, rgba(255,255,255,0.2), transparent 30%),
            radial-gradient(circle at 84% 78%, rgba(255,255,255,0.12), transparent 26%),
            repeating-linear-gradient(
              125deg,
              rgba(255,255,255,0.06) 0px,
              rgba(255,255,255,0.06) 2px,
              transparent 2px,
              transparent 8px
            ),
            linear-gradient(135deg, #10b981 0%, #0ea5a4 46%, #0891b2 100%);
          animation: breatheShadow 5.2s ease-in-out infinite;
          will-change: transform;
        }

        .salary-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.22), transparent 16%),
            linear-gradient(
              110deg,
              rgba(255,255,255,0.18),
              rgba(255,255,255,0.04) 34%,
              rgba(255,255,255,0.16) 58%,
              rgba(255,255,255,0.02)
            );
          mix-blend-mode: screen;
        }

        .salary-card::after {
          content: "";
          position: absolute;
          top: -40%;
          bottom: -40%;
          left: -35%;
          width: 42%;
          background: rgba(255, 255, 255, 0.28);
          filter: blur(20px);
          transform: rotate(16deg);
          animation: cardWave 5.2s ease-in-out infinite;
          pointer-events: none;
        }

        .spark {
          position: absolute;
          z-index: 2;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.88);
          animation: sparkle 3.2s infinite ease-in-out;
          pointer-events: none;
        }

        .spark.s1 {
          top: 16%;
          left: 14%;
        }

        .spark.s2 {
          top: 28%;
          right: 18%;
          animation-delay: 0.7s;
        }

        .spark.s3 {
          bottom: 18%;
          left: 28%;
          animation-delay: 1.3s;
        }

        .spark.s4 {
          bottom: 26%;
          right: 22%;
          animation-delay: 1.8s;
        }

        .card-chip-wrap {
          position: relative;
          flex-shrink: 0;
          width: 44px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.16);
          backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);
        }

        .card-chip {
          position: absolute;
          inset: 6px;
          border-radius: 8px;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 100%),
            linear-gradient(rgba(255,255,255,0.16) 0 1px, transparent 1px 100%),
            linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08));
          background-size: 8px 100%, 100% 8px, 100% 100%;
          border: 1px solid rgba(255,255,255,0.16);
        }
      `}</style>
    </>
  )
}