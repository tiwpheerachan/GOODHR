"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Download, Calendar, ChevronLeft, ChevronRight, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

const TH_MONTHS = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
const thb = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayslipPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const empId = (user as any)?.employee_id ?? user?.employee?.id

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // prev month default
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true)
    const { data } = await supabase.from("payroll_records")
      .select("id, year, month, base_salary, gross_income, total_deductions, net_salary, status, payroll_period_id")
      .eq("employee_id", empId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24)
    setRecords(data ?? [])
    setLoading(false)
  }, [empId])

  useEffect(() => { load() }, [load])

  const downloadPDF = async (record: any) => {
    setDownloading(record.id)
    try {
      const res = await fetch(`/api/payslip/download?record_id=${record.id}`)
      if (!res.ok) { toast.error("ไม่พบข้อมูล"); return }
      const data = await res.json()

      // Generate PDF using HTML → print
      const html = buildPayslipHTML(data)
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 500)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-indigo-600"/> สลิปเงินเดือน
        </h2>
        <p className="text-xs text-slate-400 mt-1">ดาวน์โหลดสลิปเงินเดือนเป็น PDF</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400"/></div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar size={40} className="mx-auto mb-2 opacity-30"/>
          <p>ยังไม่มีข้อมูลเงินเดือน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={20} className="text-indigo-600"/>
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-800">{TH_MONTHS[r.month]} {r.year + 543}</p>
                <p className="text-xs text-slate-400">เงินเดือนสุทธิ</p>
                <p className="text-lg font-black text-emerald-600">฿{thb(r.net_salary || 0)}</p>
              </div>
              <button
                onClick={() => downloadPDF(r)}
                disabled={downloading === r.id}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {downloading === r.id ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Build payslip HTML for print → PDF ──
function buildPayslipHTML(d: any): string {
  const { company, employee, period, payDate, earnings, deductions, totalEarnings, totalDeductions, netPay, ytd } = d
  const thb = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const earningsRows = earnings.map((e: any) =>
    `<tr><td>${e.label}</td><td class="r">${e.number || ""}</td><td class="r">${thb(e.amount)}</td></tr>`
  ).join("")

  const deductionRows = deductions.map((e: any) =>
    `<tr><td>${e.label}</td><td class="r">${thb(e.amount)}</td></tr>`
  ).join("")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>สลิปเงินเดือน - ${employee.name}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 11px; color: #333; }
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
  .container { max-width: 720px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #c8a14e; padding-bottom: 10px; }
  .header h1 { font-size: 16px; font-weight: 700; color: #333; }
  .header .slip-title { float: right; font-size: 18px; font-weight: 700; color: #c8a14e; }
  .header .company-info { font-size: 10px; color: #666; margin-top: 4px; }
  .header .period { font-size: 12px; font-weight: 700; color: #c8a14e; }
  .logo { height: 36px; margin-bottom: 4px; }
  .emp-info { display: flex; justify-content: space-between; margin: 10px 0; font-size: 11px; }
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
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="container">

  <!-- Header -->
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

  <!-- Employee Info -->
  <div class="emp-info">
    <div>รหัสพนักงาน : <b>${employee.code}</b> &nbsp;&nbsp; ชื่อ : <b>${employee.name}</b></div>
    <div><b>แผนก:</b> ${employee.department}</div>
    <div><b>ตำแหน่ง :</b> ${employee.position}</div>
  </div>

  <!-- Main Table -->
  <div class="two-col">
    <!-- Earnings -->
    <table class="main-table">
      <thead>
        <tr><th colspan="2">รายได้<br/>Earnings</th><th>เจ้านวน<br/>Number</th><th>จำนวนเงิน<br/>Amount</th></tr>
      </thead>
      <tbody>
        ${earningsRows}
        <tr class="total-row"><td colspan="3">รวมเงินได้<br/>Total Earnings</td><td class="r">${thb(totalEarnings)}</td></tr>
      </tbody>
    </table>

    <!-- Deductions + Net -->
    <div>
      <table class="main-table">
        <thead>
          <tr><th>รายการหัก<br/>Deductions</th><th>จำนวนเงิน<br/>Amount</th><th>วันที่จ่าย<br/>Payroll Date</th></tr>
        </thead>
        <tbody>
          ${deductionRows}
          <tr class="total-row"><td>รวมรายการหัก<br/>Total Deduction</td><td class="r">${thb(totalDeductions)}</td><td></td></tr>
        </tbody>
      </table>
      <div class="net-box">
        <div class="net-label">เงินรับสุทธิ<br/>Net To Pay</div>
        <div>${thb(netPay)}</div>
      </div>
    </div>
  </div>

  <!-- YTD -->
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

  <!-- Footer -->
  <div class="footer">
    <div>พิมพ์โดย : ${employee.name}</div>
    <div>${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}</div>
  </div>

</div>
</body></html>`
}
