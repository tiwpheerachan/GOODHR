"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, Calendar, Loader2, FileText, Eye, X, Share2,
  ChevronDown, Banknote, ArrowLeft, TrendingUp, TrendingDown,
} from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

const TH_MONTHS = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
const TH_MONTHS_FULL = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
const thb = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const thbShort = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : thb(v)

export default function PayslipPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const empId = (user as any)?.employee_id ?? user?.employee?.id

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  // Preview
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true)
    const { data } = await supabase.from("payroll_records")
      .select("id, year, month, base_salary, gross_income, total_deductions, net_salary, status, payroll_period_id, late_count, absent_days, present_days, leave_paid_days, leave_unpaid_days, working_days, ot_amount, ot_hours, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes, bonus, kpi_grade, kpi_standard_amount, commission, other_income, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, allowance_other, deduct_late, deduct_absent, deduct_early_out, deduct_loan, deduct_other, social_security_amount, monthly_tax_withheld, income_extras, deduction_extras")
      .eq("employee_id", empId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24)
    setRecords(data ?? [])
    setLoading(false)
  }, [empId])

  useEffect(() => { load() }, [load])

  // ── Fetch payslip data for preview ──
  const fetchPayslip = async (record: any) => {
    const res = await fetch(`/api/payslip/download?record_id=${record.id}`)
    if (!res.ok) throw new Error("ไม่พบข้อมูล")
    return res.json()
  }

  // ── Preview: ดูก่อน ──
  const openPreview = async (record: any) => {
    setPreviewLoading(true)
    setShowPreview(true)
    try {
      const data = await fetchPayslip(record)
      setPreviewData({ ...data, _record: record })
    } catch (e: any) {
      toast.error(e.message)
      setShowPreview(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Download: สร้าง HTML blob → download ──
  const downloadPayslip = async (record: any) => {
    setDownloading(record.id)
    try {
      const data = previewData?._record?.id === record.id
        ? previewData
        : await fetchPayslip(record)

      const html = buildPayslipHTML(data)
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)

      const empName = data.employee?.name || "payslip"
      const fileName = `สลิป_${empName}_${TH_MONTHS[record.month]}${record.year + 543}.html`

      // ลอง Web Share API ก่อน (สำหรับ mobile)
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        try {
          const file = new File([blob], fileName, { type: "text/html" })
          await navigator.share({ title: `สลิปเงินเดือน ${TH_MONTHS[record.month]} ${record.year + 543}`, files: [file] })
          toast.success("แชร์สำเร็จ")
          return
        } catch { /* fallback ด้านล่าง */ }
      }

      // Fallback: เปิดหน้าสลิป (iOS/Android print-to-pdf)
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(html)
        win.document.close()
      } else {
        // ถ้า popup blocked → download ไฟล์
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        a.click()
      }
      URL.revokeObjectURL(url)
      toast.success("เปิดสลิปแล้ว — กด Share/Print เพื่อบันทึก PDF")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDownloading(null)
    }
  }

  const empName = `${(user as any)?.employee?.first_name_th ?? ""} ${(user as any)?.employee?.last_name_th ?? ""}`.trim()

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── Header ── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link href="/app/salary" className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={17} className="text-slate-600"/>
          </Link>
          <div>
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight flex items-center gap-2">
              <FileText size={18} className="text-emerald-600"/> สลิปเงินเดือน
            </h1>
            {empName && <p className="text-[11px] text-slate-400 mt-0.5">{empName}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-400"/>
            <p className="text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Banknote size={28} className="text-slate-300"/>
            </div>
            <p className="text-sm text-slate-400">ยังไม่มีข้อมูลเงินเดือน</p>
          </div>
        ) : (
          records.map((r, idx) => {
            const prevR = records[idx + 1]
            const diff = prevR ? (r.net_salary || 0) - (prevR.net_salary || 0) : 0
            const diffPct = prevR && prevR.net_salary > 0 ? ((diff / prevR.net_salary) * 100).toFixed(1) : null

            return (
              <div key={r.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                {/* Top section */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Month badge */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
                      <p className="text-white text-[10px] font-bold opacity-80">{r.year + 543}</p>
                      <p className="text-white text-lg font-black leading-none">{TH_MONTHS[r.month]}</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-[15px]">{TH_MONTHS_FULL[r.month]} {r.year + 543}</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <p className="text-xl font-black text-emerald-600 tabular-nums">฿{thb(r.net_salary || 0)}</p>
                        {diffPct !== null && diff !== 0 && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                            {diff > 0 ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
                            {diff > 0 ? "+" : ""}{diffPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary chips */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                      รายได้ ฿{thbShort(r.gross_income || 0)}
                    </span>
                    <span className="text-[10px] font-bold text-red-400 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                      หัก ฿{thbShort(r.total_deductions || 0)}
                    </span>
                    {(r.late_count || 0) > 0 && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                        สาย {r.late_count} ครั้ง
                      </span>
                    )}
                    {(r.present_days || 0) > 0 && (
                      <span className="text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                        เข้างาน {r.present_days} วัน
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => openPreview(r)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 bg-white text-slate-600 text-sm font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
                  >
                    <Eye size={14}/> ดูสลิป
                  </button>
                  <button
                    onClick={() => downloadPayslip(r)}
                    disabled={downloading === r.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
                  >
                    {downloading === r.id
                      ? <Loader2 size={14} className="animate-spin"/>
                      : <Download size={14}/>
                    }
                    ดาวน์โหลด
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════ Preview Modal ═══════ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">

          {/* Modal header */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 safe-top">
            <div>
              <p className="text-sm font-black text-slate-800">สลิปเงินเดือน</p>
              {previewData && (
                <p className="text-[10px] text-slate-400">{previewData.period}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {previewData && (
                <button
                  onClick={() => downloadPayslip(previewData._record)}
                  disabled={!!downloading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
                  บันทึก
                </button>
              )}
              <button onClick={() => { setShowPreview(false); setPreviewData(null) }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-500"/>
              </button>
            </div>
          </div>

          {/* Modal body — scrollable payslip */}
          <div className="flex-1 overflow-y-auto bg-slate-100 px-3 py-4" ref={previewRef}>
            {previewLoading ? (
              <div className="flex items-center justify-center py-20 gap-2">
                <Loader2 size={24} className="animate-spin text-emerald-400"/>
                <span className="text-sm text-slate-400">กำลังโหลดสลิป...</span>
              </div>
            ) : previewData ? (
              <PayslipCard data={previewData}/>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PayslipCard — Render สลิปแบบ native React (ไม่ใช่ HTML string)
// ═══════════════════════════════════════════════════════════════
function PayslipCard({ data }: { data: any }) {
  const { company, employee, period, earnings, deductions, totalEarnings, totalDeductions, netPay, ytd } = data

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://shd-technology.co.th/images/logo.png" className="h-8 rounded bg-white/20 p-0.5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}/>
            <div>
              <p className="text-white font-black text-sm">{company?.code}</p>
              <p className="text-amber-100 text-[9px]">{company?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-base">สลิปเงินเดือน</p>
            <p className="text-amber-100 text-[10px]">{period}</p>
          </div>
        </div>
      </div>

      {/* ── Employee info ── */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
        <div>รหัส : <span className="font-bold text-slate-800">{employee?.code}</span></div>
        <div>ชื่อ : <span className="font-bold text-slate-800">{employee?.name}</span></div>
        <div>แผนก : <span className="font-bold text-slate-800">{employee?.department}</span></div>
        <div>ตำแหน่ง : <span className="font-bold text-slate-800">{employee?.position}</span></div>
      </div>

      {/* ── Earnings ── */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">รายได้ / Earnings</p>
        <div className="space-y-1.5">
          {earnings.map((e: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{e.label.replace("\n", " ")}</span>
              <span className="font-bold text-slate-800 tabular-nums">{thb(e.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
            <span className="text-xs font-black text-emerald-700">รวมเงินได้</span>
            <span className="text-sm font-black text-emerald-700 tabular-nums">฿{thb(totalEarnings)}</span>
          </div>
        </div>
      </div>

      {/* ── Deductions ── */}
      <div className="px-4 pt-3 pb-2 bg-red-50/40">
        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">รายการหัก / Deductions</p>
        <div className="space-y-1.5">
          {deductions.map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{d.label}</span>
              <span className="font-bold text-red-600 tabular-nums">-{thb(d.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-red-200">
            <span className="text-xs font-black text-red-600">รวมรายการหัก</span>
            <span className="text-sm font-black text-red-600 tabular-nums">-฿{thb(totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* ── Net Pay ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">เงินรับสุทธิ / Net Pay</p>
          </div>
          <p className="text-white text-2xl font-black tabular-nums">฿{thb(netPay)}</p>
        </div>
      </div>

      {/* ── YTD ── */}
      {ytd && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">สะสมต่อปี (YTD)</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-[10px]">
              <span className="text-slate-400">เงินได้สะสม</span>
              <p className="font-bold text-slate-700 tabular-nums">฿{thb(ytd.income)}</p>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400">ภาษีสะสม</span>
              <p className="font-bold text-slate-700 tabular-nums">฿{thb(ytd.tax)}</p>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400">ประกันสังคมสะสม</span>
              <p className="font-bold text-slate-700 tabular-nums">฿{thb(ytd.socialSecurity)}</p>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400">หักอื่นๆ สะสม</span>
              <p className="font-bold text-slate-700 tabular-nums">฿{thb(ytd.otherDeductions)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-300">
        <span>SHD FOR YOU</span>
        <span>{new Date().toLocaleDateString("th-TH")} {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// buildPayslipHTML — HTML สำหรับ print/download (ใช้ใน new window)
// ═══════════════════════════════════════════════════════════════
function buildPayslipHTML(d: any): string {
  const { company, employee, period, payDate, earnings, deductions, totalEarnings, totalDeductions, netPay, ytd } = d
  const thb = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const earningsRows = earnings.map((e: any) =>
    `<tr><td>${e.label.replace("\n"," ")}</td><td class="r">${e.number || ""}</td><td class="r">${thb(e.amount)}</td></tr>`
  ).join("")

  const deductionRows = deductions.map((e: any) =>
    `<tr><td>${e.label}</td><td class="r">${thb(e.amount)}</td></tr>`
  ).join("")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>สลิปเงินเดือน - ${employee.name}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Sarabun', 'Noto Sans Thai', -apple-system, sans-serif; font-size: 11px; color: #333; background: #f5f5f5; }
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
  .container { max-width: 720px; margin: 0 auto; padding: 20px; background: #fff; }
  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #c8a14e; padding-bottom: 10px; }
  .header h1 { font-size: 16px; font-weight: 700; color: #333; }
  .header .slip-title { float: right; font-size: 18px; font-weight: 700; color: #c8a14e; }
  .header .company-info { font-size: 10px; color: #666; margin-top: 4px; }
  .header .period { font-size: 12px; font-weight: 700; color: #c8a14e; }
  .logo { height: 36px; margin-bottom: 4px; }
  .emp-info { display: flex; justify-content: space-between; margin: 10px 0; font-size: 11px; flex-wrap: wrap; gap: 4px; }
  .emp-info b { color: #000; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .main-table { margin-top: 8px; }
  .main-table th { background: #f5f0e0; color: #7a6520; font-weight: 700; padding: 6px 8px; border: 1px solid #d4c98a; text-align: center; }
  .main-table td { padding: 4px 8px; border: 1px solid #e5e5e5; }
  .main-table td.r { text-align: right; }
  .total-row { background: #faf6e8; font-weight: 700; }
  .total-row td { border-top: 2px solid #c8a14e; padding: 6px 8px; }
  .net-box { background: #c8a14e; color: #fff; padding: 10px 15px; text-align: right; font-size: 18px; font-weight: 700; margin-top: -1px; }
  .net-label { font-size: 11px; font-weight: 700; }
  .ytd-table { margin-top: 12px; }
  .ytd-table th { background: #c8a14e; color: #fff; font-weight: 700; padding: 5px 6px; border: 1px solid #b89430; text-align: center; font-size: 9.5px; }
  .ytd-table td { text-align: center; padding: 5px 6px; border: 1px solid #e5e5e5; font-size: 10px; }
  .footer { margin-top: 30px; font-size: 9px; color: #999; display: flex; justify-content: space-between; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; }
  .two-col > div { min-height: 100%; }
  .actions { text-align: center; padding: 20px; }
  .actions button { padding: 12px 32px; font-size: 16px; font-weight: 700; border: none; border-radius: 12px; cursor: pointer; margin: 0 8px; }
  .btn-print { background: #16a34a; color: white; }
  .btn-share { background: #2563eb; color: white; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .actions { display: none; }
  }
  @media (max-width: 600px) {
    .two-col { grid-template-columns: 1fr; }
    .emp-info { flex-direction: column; }
  }
</style></head><body>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  <p style="margin-top:8px;font-size:12px;color:#888;">iOS: กด Share → Print → Save as PDF<br/>Android: กดปุ่มด้านบน แล้วเลือก Save as PDF</p>
</div>

<div class="container">
  <div class="header">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="https://shd-technology.co.th/images/logo.png" class="logo" onerror="this.style.display='none'"/>
        <div style="text-align:left;">
          <h1>${company.code} : ${company.name}</h1>
          <div class="company-info">${company.address}</div>
          <div class="company-info">${company.phone}</div>
        </div>
      </div>
      <div>
        <div class="slip-title">สลิปเงินเดือน</div>
        <div class="period">${period}</div>
      </div>
    </div>
  </div>

  <div class="emp-info">
    <div>รหัสพนักงาน : <b>${employee.code}</b> &nbsp;&nbsp; ชื่อ : <b>${employee.name}</b></div>
    <div><b>แผนก:</b> ${employee.department}</div>
    <div><b>ตำแหน่ง :</b> ${employee.position}</div>
  </div>

  <div class="two-col">
    <table class="main-table">
      <thead>
        <tr><th colspan="2">รายได้<br/>Earnings</th><th>จำนวน</th><th>จำนวนเงิน<br/>Amount</th></tr>
      </thead>
      <tbody>
        ${earningsRows}
        <tr class="total-row"><td colspan="3">รวมเงินได้ / Total Earnings</td><td class="r">${thb(totalEarnings)}</td></tr>
      </tbody>
    </table>

    <div>
      <table class="main-table">
        <thead>
          <tr><th>รายการหัก<br/>Deductions</th><th>จำนวนเงิน<br/>Amount</th><th>วันที่จ่าย<br/>Payroll Date</th></tr>
        </thead>
        <tbody>
          ${deductionRows}
          <tr class="total-row"><td>รวมรายการหัก / Total Deduction</td><td class="r">${thb(totalDeductions)}</td><td></td></tr>
        </tbody>
      </table>
      <div class="net-box">
        <div class="net-label">เงินรับสุทธิ / Net To Pay</div>
        <div>${thb(netPay)}</div>
      </div>
    </div>
  </div>

  <table class="ytd-table">
    <thead>
      <tr>
        <th>เงินได้สะสมต่อปี</th>
        <th>ภาษีสะสมต่อปี</th>
        <th>เงินสะสมกองทุนต่อปี</th>
        <th>เงินประกันสังคมต่อปี</th>
        <th>ค่าลดหย่อนอื่นๆ</th>
        <th>ลงชื่อพนักงาน</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${thb(ytd.income)}</td>
        <td>${thb(ytd.tax)}</td>
        <td>${thb(ytd.providentFund)}</td>
        <td>${thb(ytd.socialSecurity)}</td>
        <td>${thb(ytd.otherDeductions)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>พิมพ์โดย : ${employee.name}</div>
    <div>${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}</div>
  </div>
</div>
</body></html>`
}
