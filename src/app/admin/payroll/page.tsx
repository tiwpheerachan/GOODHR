"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, Play, CheckCircle, Loader2, Plus,
  ChevronDown, AlertCircle, TrendingUp, Users, Banknote,
  Clock, Info, Search, Eye, Edit2, Save, X, RotateCcw
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

// ── helpers ────────────────────────────────────────────────────────────
const thb = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: any) => parseFloat(String(v).replace(/,/g, "")) || 0

const inpCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full text-right"
const inpFull = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full"

const STATUS_CFG: Record<string, { l: string; c: string; dot: string }> = {
  draft:    { l: "ฉบับร่าง",    c: "bg-slate-100 text-slate-600",  dot: "bg-slate-400"  },
  approved: { l: "อนุมัติแล้ว", c: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  paid:     { l: "จ่ายแล้ว",    c: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
}

// งวดเงินเดือน: 22 เดือนก่อน → 21 เดือนปัจจุบัน
function periodLabel(p: any) {
  const startD = new Date(p.year, p.month - 2, 22) // 22 ของเดือนก่อน
  const endD   = new Date(p.year, p.month - 1, 21) // 21 ของเดือนนี้
  const bud    = format(new Date(p.year, p.month - 1), "MMMM", { locale: th }) + " " + (p.year + 543)
  const range  = `${format(startD, "d MMM yy", { locale: th })} – ${format(endD, "d MMM yy", { locale: th })}`
  return `${bud}  (${range})`
}

// ── OT badge ───────────────────────────────────────────────────────────
function OTBadge({ label, minutes, color }: { label: string; minutes: number; color: string }) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60), m = minutes % 60
  return (
    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {label} {h > 0 ? `${h}ชม.` : ""}{m > 0 ? `${m}น.` : ""}
    </span>
  )
}

// ── Edit payroll modal ─────────────────────────────────────────────────
function EditModal({
  record, onClose, onSaved,
}: { record: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const supabase = createClient()
  const emp = record.employee

  // editable fields — init from record
  const [f, setF] = useState({
    base_salary:           record.base_salary          ?? 0,
    allowance_position:    record.allowance_position   ?? 0,
    allowance_transport:   record.allowance_transport  ?? 0,
    allowance_food:        record.allowance_food       ?? 0,
    allowance_phone:       record.allowance_phone      ?? 0,
    allowance_housing:     record.allowance_housing    ?? 0,
    allowance_other:       record.allowance_other      ?? 0,
    ot_amount:             record.ot_amount            ?? 0,
    ot_weekday_minutes:    record.ot_weekday_minutes   ?? 0,
    ot_holiday_reg_minutes:record.ot_holiday_reg_minutes ?? 0,
    ot_holiday_ot_minutes: record.ot_holiday_ot_minutes  ?? 0,
    bonus:                 record.bonus                ?? 0,
    commission:            record.commission           ?? 0,
    other_income:          record.other_income         ?? 0,
    deduct_absent:         record.deduct_absent        ?? 0,
    deduct_late:           record.deduct_late          ?? 0,
    deduct_loan:           record.deduct_loan          ?? 0,
    deduct_other:          record.deduct_other         ?? 0,
    social_security_amount:record.social_security_amount ?? 0,
    monthly_tax_withheld:  record.monthly_tax_withheld ?? 0,
    absent_days:           record.absent_days          ?? 0,
    late_count:            record.late_count           ?? 0,
    present_days:          record.present_days         ?? 0,
    leave_paid_days:       record.leave_paid_days      ?? 0,
    leave_unpaid_days:     record.leave_unpaid_days    ?? 0,
    note_override:         record.note_override        ?? "",
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v === "" ? 0 : v }))

  // live-calc gross / total_deductions / net
  const gross = num(f.base_salary) + num(f.allowance_position) + num(f.allowance_transport)
    + num(f.allowance_food) + num(f.allowance_phone) + num(f.allowance_housing)
    + num(f.allowance_other) + num(f.ot_amount) + num(f.bonus) + num(f.commission) + num(f.other_income)
  const totalDeduct = num(f.deduct_absent) + num(f.deduct_late) + num(f.deduct_loan)
    + num(f.deduct_other) + num(f.social_security_amount) + num(f.monthly_tax_withheld)
  const net = Math.max(gross - totalDeduct, 0)

  const save = async () => {
    setSaving(true)
    const payload = {
      ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, num(v as any)])),
      note_override: f.note_override,
      gross_income:    gross,
      total_deductions: totalDeduct,
      net_salary:      net,
      is_manual_override: true,
      updated_at:      new Date().toISOString(),
    }
    const { error } = await supabase.from("payroll_records").update(payload).eq("id", record.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success("✓ บันทึกการแก้ไขแล้ว")
    onSaved({ ...record, ...payload })
    onClose()
  }

  const reset = async () => {
    if (!confirm("รีเซ็ตกลับเป็นค่าที่คำนวณอัตโนมัติ?")) return
    setSaving(true)
    const res = await fetch("/api/payroll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: record.employee_id, payroll_period_id: record.payroll_period_id }),
    })
    setSaving(false)
    if (!res.ok) return toast.error("คำนวณใหม่ไม่สำเร็จ")
    toast.success("✓ รีเซ็ตและคำนวณใหม่แล้ว")
    const { data } = await supabase.from("payroll_records")
      .select(`*, employee:employees!payroll_records_employee_id_fkey(id,employee_code,first_name_th,last_name_th,avatar_url,position:positions(name),department:departments(name))`)
      .eq("id", record.id).single()
    if (data) onSaved(data)
    onClose()
  }

  type FieldKey = keyof typeof f
  const NumRow = ({ label, k, green, red }: { label: string; k: FieldKey; green?: boolean; red?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <label className="text-xs text-slate-600 flex-1">{label}</label>
      <div className="w-32">
        <input
          type="number" step="0.01"
          value={f[k] as number}
          onChange={e => set(k, e.target.value)}
          className={inpCls + (green ? " text-green-700" : red ? " text-red-600" : "")}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-sm font-black text-indigo-600 overflow-hidden">
              {emp?.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : emp?.first_name_th?.[0]}
            </div>
            <div>
              <p className="font-black text-slate-800">{emp?.first_name_th} {emp?.last_name_th}</p>
              <p className="text-xs text-slate-400">{emp?.employee_code} · {emp?.position?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {record.is_manual_override && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Edit2 size={9}/> แก้ไขแล้ว
              </span>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={15}/></button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-5">
            {/* รายรับ */}
            <div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"/> รายรับ
              </p>
              <div className="bg-slate-50 rounded-xl px-4 py-2">
                <NumRow label="เงินเดือนฐาน"       k="base_salary"         green/>
                <NumRow label="เบี้ยตำแหน่ง"        k="allowance_position"  green/>
                <NumRow label="ค่าเดินทาง"           k="allowance_transport" green/>
                <NumRow label="ค่าอาหาร"             k="allowance_food"      green/>
                <NumRow label="ค่าโทรศัพท์"          k="allowance_phone"     green/>
                <NumRow label="ค่าที่พัก"             k="allowance_housing"   green/>
                <NumRow label="รายรับอื่น"            k="allowance_other"     green/>
                <NumRow label="OT (฿ รวม)"           k="ot_amount"           green/>
                <NumRow label="โบนัส"                k="bonus"               green/>
                <NumRow label="คอมมิชชั่น"            k="commission"          green/>
                <NumRow label="รายรับเพิ่มเติม"       k="other_income"        green/>
              </div>
              <div className="flex justify-between px-4 py-2 mt-1 bg-green-50 rounded-xl">
                <span className="text-sm font-black text-slate-700">รวมรายรับ</span>
                <span className="text-sm font-black text-green-700">฿{thb(gross)}</span>
              </div>
            </div>

            {/* รายหัก + OT detail + stats */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full inline-block"/> รายหัก
                </p>
                <div className="bg-slate-50 rounded-xl px-4 py-2">
                  <NumRow label="หักขาดงาน"           k="deduct_absent"         red/>
                  <NumRow label="หักมาสาย"             k="deduct_late"           red/>
                  <NumRow label="หักเงินกู้"            k="deduct_loan"           red/>
                  <NumRow label="หักอื่นๆ"              k="deduct_other"          red/>
                  <NumRow label="ประกันสังคม"           k="social_security_amount" red/>
                  <NumRow label="ภาษีหัก ณ ที่จ่าย"    k="monthly_tax_withheld"  red/>
                </div>
                <div className="flex justify-between px-4 py-2 mt-1 bg-red-50 rounded-xl">
                  <span className="text-sm font-black text-slate-700">รวมรายหัก</span>
                  <span className="text-sm font-black text-red-600">฿{thb(totalDeduct)}</span>
                </div>
              </div>

              {/* OT detail */}
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"/> รายละเอียด OT (นาที)
                </p>
                <div className="bg-slate-50 rounded-xl px-4 py-2">
                  <NumRow label="OT 1.5× วันทำงาน (น.)"  k="ot_weekday_minutes"/>
                  <NumRow label="OT 1.0× วันหยุด (น.)"   k="ot_holiday_reg_minutes"/>
                  <NumRow label="OT 3.0× วันหยุด+เลิก (น.)" k="ot_holiday_ot_minutes"/>
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">สถิติการเข้างาน</p>
                <div className="bg-slate-50 rounded-xl px-4 py-2">
                  <NumRow label="วันมาทำงาน"  k="present_days"/>
                  <NumRow label="วันขาดงาน"   k="absent_days"/>
                  <NumRow label="ครั้งมาสาย"  k="late_count"/>
                  <NumRow label="วันลา (จ่าย)" k="leave_paid_days"/>
                  <NumRow label="วันลา (ไม่จ่าย)" k="leave_unpaid_days"/>
                </div>
              </div>
            </div>
          </div>

          {/* หมายเหตุ */}
          <div className="mt-4">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">หมายเหตุการแก้ไข (แสดงใน payslip)</label>
            <input
              value={f.note_override}
              onChange={e => setF(p => ({ ...p, note_override: e.target.value }))}
              className={inpFull} placeholder="เช่น ปรับ OT เพิ่มตามใบสรุป..."
            />
          </div>

          {/* Net preview */}
          <div className="mt-4 bg-indigo-600 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="font-black text-lg">เงินเดือนสุทธิ</p>
            <p className="text-3xl font-black">฿{thb(net)}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 flex-shrink-0 gap-3">
          <button onClick={reset} disabled={saving}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RotateCcw size={12}/> รีเซ็ต (คำนวณใหม่)
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
              ยกเลิก
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payslip view modal ─────────────────────────────────────────────────
function PayslipModal({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  const emp = record.employee
  const base = record.base_salary || 0
  const ratePerMin = base / 30 / 8 / 60

  const Row = ({ l, v, neg }: { l: string; v: number; neg?: boolean }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 last:border-0">
      <p className="text-sm text-slate-600">{l}</p>
      <p className={`text-sm font-semibold ${neg ? "text-red-600" : "text-slate-800"}`}>
        {neg ? "-" : "+"}฿{thb(Math.abs(v))}
      </p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-6 py-5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-70">ใบแจ้งเงินเดือน</p>
              <h3 className="text-xl font-black mt-0.5">{emp?.first_name_th} {emp?.last_name_th}</h3>
              <p className="text-sm opacity-75 mt-0.5">{emp?.employee_code} · {emp?.position?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onEdit} className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-bold transition-colors">
                <Edit2 size={10}/> แก้ไข
              </button>
              <button onClick={onClose} className="text-white/60 hover:text-white font-bold text-lg">✕</button>
            </div>
          </div>
          {record.is_manual_override && (
            <div className="mt-2 text-xs bg-amber-400/30 text-amber-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
              <Edit2 size={9}/> ตัวเลขนี้ถูกแก้ไขโดย HR
              {record.note_override && ` · ${record.note_override}`}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l:"มาทำงาน", v:record.present_days,  c:"text-green-600 bg-green-50" },
              { l:"ขาดงาน",  v:record.absent_days,   c:"text-red-600 bg-red-50"    },
              { l:"สาย",     v:record.late_count,    c:"text-amber-600 bg-amber-50"},
              { l:"ลาจ่าย",  v:(record.leave_paid_days||0).toFixed(1), c:"text-blue-600 bg-blue-50"},
            ].map(s => (
              <div key={s.l} className={`rounded-xl p-2 text-center ${s.c.split(" ")[1]}`}>
                <p className={`text-lg font-black ${s.c.split(" ")[0]}`}>{s.v}</p>
                <p className="text-[10px] font-bold text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>

          {/* รายรับ */}
          <div className="bg-slate-50 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-green-50"><p className="text-[10px] font-black text-green-800 uppercase tracking-wide">รายรับ</p></div>
            <Row l="เงินเดือนฐาน" v={base}/>
            {record.allowance_position  > 0 && <Row l="เบี้ยตำแหน่ง"    v={record.allowance_position}/>}
            {record.allowance_transport > 0 && <Row l="ค่าเดินทาง"       v={record.allowance_transport}/>}
            {record.allowance_food      > 0 && <Row l="ค่าอาหาร"         v={record.allowance_food}/>}
            {record.allowance_phone     > 0 && <Row l="ค่าโทรศัพท์"      v={record.allowance_phone}/>}
            {record.allowance_housing   > 0 && <Row l="ค่าที่พัก"         v={record.allowance_housing}/>}
            {record.allowance_other     > 0 && <Row l="รายรับอื่น"        v={record.allowance_other}/>}
            {record.ot_amount > 0 && (
              <div className="px-4 py-2 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">OT</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      <OTBadge label="1.5×" minutes={record.ot_weekday_minutes||0}     color="bg-amber-100 text-amber-700"/>
                      <OTBadge label="1.0×" minutes={record.ot_holiday_reg_minutes||0} color="bg-sky-100 text-sky-700"/>
                      <OTBadge label="3.0×" minutes={record.ot_holiday_ot_minutes||0}  color="bg-rose-100 text-rose-700"/>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">+฿{thb(record.ot_amount)}</p>
                </div>
              </div>
            )}
            {record.bonus      > 0 && <Row l="โบนัส"      v={record.bonus}/>}
            {record.commission > 0 && <Row l="คอมมิชชั่น" v={record.commission}/>}
            <div className="flex items-center justify-between px-4 py-2 bg-green-50">
              <p className="text-sm font-black">รวมรายรับ</p>
              <p className="text-sm font-black text-green-700">฿{thb(record.gross_income)}</p>
            </div>
          </div>

          {/* รายหัก */}
          <div className="bg-slate-50 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-red-50"><p className="text-[10px] font-black text-red-800 uppercase tracking-wide">รายหัก</p></div>
            {record.deduct_absent > 0 && <Row l={`หักขาดงาน ${record.absent_days} วัน`} v={record.deduct_absent} neg/>}
            {record.deduct_late   > 0 && <Row l="หักมาสาย" v={record.deduct_late} neg/>}
            {record.deduct_loan   > 0 && <Row l="หักเงินกู้" v={record.deduct_loan} neg/>}
            {record.deduct_other  > 0 && <Row l="หักอื่นๆ" v={record.deduct_other} neg/>}
            <Row l="ประกันสังคม 5%" v={record.social_security_amount} neg/>
            <Row l="ภาษีหัก ณ ที่จ่าย" v={record.monthly_tax_withheld} neg/>
            <div className="flex items-center justify-between px-4 py-2 bg-red-50">
              <p className="text-sm font-black">รวมรายหัก</p>
              <p className="text-sm font-black text-red-600">-฿{thb(record.total_deductions)}</p>
            </div>
          </div>

          {/* Net */}
          <div className="bg-indigo-600 text-white rounded-xl px-5 py-4 flex items-center justify-between">
            <p className="font-black text-lg">เงินเดือนสุทธิ</p>
            <p className="text-2xl font-black">฿{thb(record.net_salary)}</p>
          </div>

          {/* formula ref */}
          <details className="group">
            <summary className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold cursor-pointer list-none">
              <Info size={10}/> สูตรคำนวณอ้างอิง
              <ChevronDown size={10} className="group-open:rotate-180 transition-transform"/>
            </summary>
            <div className="mt-2 bg-slate-50 rounded-xl p-3 font-mono text-[10px] text-slate-500 space-y-0.5">
              <p>ฐาน/วัน  = ฿{thb(base/30)}</p>
              <p>ฐาน/ชม.  = ฿{thb(base/30/8)}</p>
              <p>ฐาน/นาที = ฿{ratePerMin.toFixed(4)}</p>
              {(record.ot_weekday_minutes||0)     > 0 && <p>OT 1.5×: {thb(base/30/8)} × 1.5 × {((record.ot_weekday_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*1.5*record.ot_weekday_minutes/60)}</p>}
              {(record.ot_holiday_reg_minutes||0) > 0 && <p>OT 1.0×: {thb(base/30/8)} × 1.0 × {((record.ot_holiday_reg_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*1.0*record.ot_holiday_reg_minutes/60)}</p>}
              {(record.ot_holiday_ot_minutes||0)  > 0 && <p>OT 3.0×: {thb(base/30/8)} × 3.0 × {((record.ot_holiday_ot_minutes)/60).toFixed(2)}h = ฿{thb(base/30/8*3.0*record.ot_holiday_ot_minutes/60)}</p>}
              {record.deduct_late   > 0 && <p>สาย: ROUND({ratePerMin.toFixed(4)} × นาที, 0) = ฿{thb(record.deduct_late)}</p>}
              {record.deduct_absent > 0 && <p>ขาด: {thb(base/30)} × {record.absent_days}วัน = ฿{thb(record.deduct_absent)}</p>}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function PayrollPage() {
  const { user }  = useAuth()
  const supabase  = createClient()
  const isSA      = user?.role === "super_admin" || user?.role === "hr_admin"
  const now       = new Date()

  const [periods,      setPeriods]      = useState<any[]>([])
  const [selected,     setSelected]     = useState<any>(null)
  const [records,      setRecords]      = useState<any[]>([])
  const [companies,    setCompanies]    = useState<any[]>([])
  const [selectedCo,   setSelectedCo]   = useState("")
  const [calculating,  setCalculating]  = useState(false)
  const [calcProgress, setCalcProgress] = useState({ done: 0, total: 0 })
  const [loading,      setLoading]      = useState(false)
  const [search,       setSearch]       = useState("")
  const [payslip,      setPayslip]      = useState<any>(null)
  const [editing,      setEditing]      = useState<any>(null)

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined
  const companyId = isSA ? (selectedCo || myCompanyId) : myCompanyId

  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        if (data?.[0] && !selectedCo) setSelectedCo(data[0].id)
      })
  }, [isSA])

  const loadPeriods = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase.from("payroll_periods")
      .select("*").eq("company_id", companyId)
      .order("year", { ascending: false }).order("month", { ascending: false })
    setPeriods(data ?? [])
    setSelected(data?.[0] ?? null)
  }, [companyId])

  useEffect(() => { loadPeriods() }, [loadPeriods])

  const loadRecords = useCallback(async () => {
    if (!selected) { setRecords([]); return }
    setLoading(true)
    const { data } = await supabase.from("payroll_records")
      .select(`*, employee:employees!payroll_records_employee_id_fkey(
        id,employee_code,first_name_th,last_name_th,avatar_url,
        position:positions(name),department:departments(name))`)
      .eq("payroll_period_id", selected.id)
      .order("created_at")
    setRecords(data ?? [])
    setLoading(false)
  }, [selected])

  useEffect(() => { loadRecords() }, [loadRecords])

  const createPeriod = async () => {
    if (!companyId) return
    const y = now.getFullYear(), m = now.getMonth() + 1

    // งวด: 22 เดือนก่อน → 21 เดือนนี้
    const startDate = new Date(y, m - 2, 22) // 22 ของเดือนก่อน
    const endDate   = new Date(y, m - 1, 21) // 21 ของเดือนนี้
    const payDate   = new Date(y, m - 1, 25) // จ่ายวันที่ 25 ของเดือนนี้

    const { data, error } = await supabase.from("payroll_periods").insert({
      company_id:  companyId, year: y, month: m,
      period_name: format(new Date(y, m - 1), "MMMM yyyy", { locale: th }),
      start_date:  format(startDate, "yyyy-MM-dd"),
      end_date:    format(endDate,   "yyyy-MM-dd"),
      pay_date:    format(payDate,   "yyyy-MM-dd"),
      status: "draft", created_by: user?.employee?.id ?? null,
    }).select().single()
    if (error) return toast.error("มีงวดนี้แล้วหรือเกิดข้อผิดพลาด")
    toast.success("✓ สร้างงวดเงินเดือนแล้ว")
    setSelected(data)
    setPeriods(p => [data, ...p])
  }

  const calculateAll = async () => {
    if (!selected || !companyId) return
    setCalculating(true)
    const { data: emps } = await supabase.from("employees")
      .select("id").eq("company_id", companyId).eq("is_active", true)
    if (!emps) { setCalculating(false); return }
    setCalcProgress({ done: 0, total: emps.length })
    let done = 0
    for (const emp of emps) {
      await fetch("/api/payroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp.id, payroll_period_id: selected.id }),
      })
      done++
      setCalcProgress({ done, total: emps.length })
    }
    toast.success(`✓ คำนวณ ${emps.length} คน สำเร็จ`)
    setCalculating(false)
    loadRecords()
  }

  const approvePeriod = async () => {
    if (!selected || !confirm(`อนุมัติจ่ายงวด "${periodLabel(selected)}" ใช่หรือไม่?`)) return
    await supabase.from("payroll_periods").update({
      status: "paid", approved_by: user?.employee?.id ?? null, approved_at: new Date().toISOString(),
    }).eq("id", selected.id)
    toast.success("✓ อนุมัติจ่ายเงินเดือนแล้ว")
    const updated = { ...selected, status: "paid" }
    setSelected(updated)
    setPeriods(ps => ps.map(p => p.id === selected.id ? updated : p))
  }

  const exportCSV = () => {
    const hdr = ["รหัส","ชื่อ","นามสกุล","ตำแหน่ง","แผนก","เงินเดือนฐาน","เบี้ยตำแหน่ง","ค่าเดินทาง","ค่าอาหาร","OT฿","OT1.5x(น.)","OT1.0x(น.)","OT3.0x(น.)","โบนัส","คอมมิชชั่น","รวมรายรับ","หักขาด","หักสาย","หักกู้","SSO","ภาษี","หักรวม","สุทธิ","วันมา","วันขาด","สาย","ลาจ่าย","ลาไม่จ่าย","แก้ไขโดยHR"]
    const rows = records.map(r => [
      r.employee?.employee_code, r.employee?.first_name_th, r.employee?.last_name_th,
      r.employee?.position?.name, r.employee?.department?.name,
      r.base_salary||0, r.allowance_position||0, r.allowance_transport||0, r.allowance_food||0,
      r.ot_amount||0, r.ot_weekday_minutes||0, r.ot_holiday_reg_minutes||0, r.ot_holiday_ot_minutes||0,
      r.bonus||0, r.commission||0, r.gross_income||0,
      r.deduct_absent||0, r.deduct_late||0, r.deduct_loan||0,
      r.social_security_amount||0, r.monthly_tax_withheld||0, r.total_deductions||0, r.net_salary||0,
      r.present_days||0, r.absent_days||0, r.late_count||0, r.leave_paid_days||0, r.leave_unpaid_days||0,
      r.is_manual_override ? "✓" : "",
    ])
    const csv  = [hdr, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url
    a.download = `payroll_${selected?.year}_${String(selected?.month).padStart(2,"0")}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered   = records.filter(r =>
    !search || `${r.employee?.first_name_th} ${r.employee?.last_name_th} ${r.employee?.employee_code}`
      .toLowerCase().includes(search.toLowerCase())
  )
  const totalGross = filtered.reduce((s, r) => s + (r.gross_income||0), 0)
  const totalNet   = filtered.reduce((s, r) => s + (r.net_salary||0), 0)
  const totalOT    = filtered.reduce((s, r) => s + (r.ot_amount||0), 0)
  const totalSSO   = filtered.reduce((s, r) => s + (r.social_security_amount||0), 0)
  const totalTax   = filtered.reduce((s, r) => s + (r.monthly_tax_withheld||0), 0)
  const overrideCount = records.filter(r => r.is_manual_override).length

  const statusCfg  = STATUS_CFG[selected?.status ?? "draft"] ?? STATUS_CFG.draft

  return (
    <div className="space-y-4">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">เงินเดือน</h2>
          <p className="text-slate-400 text-sm">คำนวณ · ตรวจสอบ · แก้ไข · อนุมัติ</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* company */}
          {isSA && companies.length > 0 && (
            <select value={selectedCo} onChange={e => setSelectedCo(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          {/* period dropdown */}
          <div className="relative">
            <select
              value={selected?.id ?? ""}
              onChange={e => setSelected(periods.find(p => p.id === e.target.value) ?? null)}
              className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 appearance-none min-w-[220px]">
              {periods.length === 0 && <option value="">— ยังไม่มีงวด —</option>}
              {periods.map(p => (
                <option key={p.id} value={p.id}>{periodLabel(p)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          {/* status badge */}
          {selected && (
            <span className={`text-xs font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 ${statusCfg.c}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}/>
              {statusCfg.l}
            </span>
          )}
          {/* actions */}
          <button onClick={createPeriod}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus size={12}/> งวดใหม่
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-300">
          <Banknote size={40} className="mx-auto mb-3"/>
          <p className="font-semibold">สร้างงวดเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Action bar ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{format(new Date(selected.start_date), "d MMM", { locale: th })} – {format(new Date(selected.end_date), "d MMM yyyy", { locale: th })}</span>
              <span className="text-slate-200">|</span>
              <span>จ่าย {format(new Date(selected.pay_date), "d MMM yyyy", { locale: th })}</span>
              {overrideCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Edit2 size={11}/> แก้ไขแล้ว {overrideCount} คน
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status === "draft" && (
                <button onClick={calculateAll} disabled={calculating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {calculating
                    ? <><Loader2 size={13} className="animate-spin"/> {calcProgress.total > 0 && `${calcProgress.done}/${calcProgress.total}`}</>
                    : <><Play size={13}/> คำนวณทั้งหมด</>}
                </button>
              )}
              {records.length > 0 && selected.status === "draft" && (
                <button onClick={approvePeriod}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  <CheckCircle size={13}/> อนุมัติจ่าย
                </button>
              )}
              {records.length > 0 && (
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download size={13}/> Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {calculating && calcProgress.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>กำลังคำนวณ...</span>
                <span>{calcProgress.done}/{calcProgress.total} ({Math.round(calcProgress.done/calcProgress.total*100)}%)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${calcProgress.done/calcProgress.total*100}%` }}/>
              </div>
            </div>
          )}

          {/* ── KPIs ───────────────────────────────────────────── */}
          {records.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l:"พนักงาน",     v:`${records.length} คน`, ic:Users,     c:"indigo" },
                { l:"รวมรายรับ",   v:`฿${thb(totalGross)}`,  ic:TrendingUp,c:"green"  },
                { l:"รวม OT",      v:`฿${thb(totalOT)}`,     ic:Clock,     c:"amber"  },
                { l:"SSO + ภาษี",  v:`฿${thb(totalSSO+totalTax)}`, ic:AlertCircle, c:"orange"},
                { l:"รับสุทธิรวม",v:`฿${thb(totalNet)}`,    ic:Banknote,  c:"blue"   },
              ].map(s => {
                const cc: Record<string, string> = {
                  indigo:"bg-indigo-50 border-indigo-100 text-indigo-700",
                  green: "bg-green-50 border-green-100 text-green-700",
                  amber: "bg-amber-50 border-amber-100 text-amber-700",
                  orange:"bg-orange-50 border-orange-100 text-orange-700",
                  blue:  "bg-blue-50 border-blue-100 text-blue-700",
                }
                return (
                  <div key={s.l} className={`rounded-2xl border p-3.5 ${cc[s.c]}`}>
                    <p className="text-base font-black">{s.v}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">{s.l}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Search ─────────────────────────────────────────── */}
          {records.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 w-full"
                  placeholder="ค้นหาชื่อ, รหัส..."/>
              </div>
              <p className="text-xs text-slate-400">{filtered.length} / {records.length} คน</p>
            </div>
          )}

          {/* ── Table ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-14 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 size={18} className="animate-spin"/> กำลังโหลด...
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-slate-300">
                <Play size={36} className="mx-auto mb-3"/>
                <p className="font-semibold text-sm">กดปุ่ม "คำนวณทั้งหมด" เพื่อเริ่มต้น</p>
                <p className="text-xs mt-1">ดึงข้อมูล Attendance · OT · Leave · เงินเดือน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">พนักงาน</th>
                      <th className="px-3 py-3 text-right font-bold text-slate-500">เงินเดือน</th>
                      <th className="px-3 py-3 text-right font-bold text-slate-500 text-green-700">เบี้ย+อื่น</th>
                      <th className="px-3 py-3 text-left font-bold text-slate-500 text-amber-600">OT</th>
                      <th className="px-3 py-3 text-right font-bold text-slate-500 text-red-600">หักสาย/ขาด</th>
                      <th className="px-3 py-3 text-right font-bold text-slate-500">SSO</th>
                      <th className="px-3 py-3 text-right font-bold text-slate-500">ภาษี</th>
                      <th className="px-3 py-3 text-right font-bold text-indigo-700">สุทธิ</th>
                      <th className="px-3 py-3 text-center font-bold text-slate-500 w-20">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(r => {
                      const totalAllow = (r.allowance_position||0)+(r.allowance_transport||0)+(r.allowance_food||0)+(r.allowance_phone||0)+(r.allowance_housing||0)+(r.allowance_other||0)
                      const totalDeductWork = (r.deduct_late||0)+(r.deduct_absent||0)
                      return (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.is_manual_override ? "bg-amber-50/30" : ""}`}>
                          {/* emp */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0 overflow-hidden">
                                {r.employee?.avatar_url
                                  ? <img src={r.employee.avatar_url} alt="" className="w-full h-full object-cover"/>
                                  : r.employee?.first_name_th?.[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 whitespace-nowrap">
                                  {r.employee?.first_name_th} {r.employee?.last_name_th}
                                  {r.is_manual_override && <span className="ml-1 text-amber-500">✎</span>}
                                </p>
                                <p className="text-[10px] text-slate-400">{r.employee?.employee_code}</p>
                              </div>
                            </div>
                          </td>
                          {/* base */}
                          <td className="px-3 py-3 text-right">
                            <p className="font-bold text-slate-700">฿{thb(r.base_salary)}</p>
                            <p className="text-[10px] text-slate-400">{r.present_days}ว · สาย{r.late_count}</p>
                          </td>
                          {/* allowance */}
                          <td className="px-3 py-3 text-right">
                            {totalAllow > 0
                              ? <p className="font-semibold text-green-700">+฿{thb(totalAllow)}</p>
                              : <span className="text-slate-200">—</span>}
                          </td>
                          {/* OT */}
                          <td className="px-3 py-3">
                            {r.ot_amount > 0 ? (
                              <div>
                                <p className="font-bold text-amber-700">+฿{thb(r.ot_amount)}</p>
                                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                  <OTBadge label="1.5" minutes={r.ot_weekday_minutes||0}     color="bg-amber-50 text-amber-600"/>
                                  <OTBadge label="1.0" minutes={r.ot_holiday_reg_minutes||0} color="bg-sky-50 text-sky-600"/>
                                  <OTBadge label="3.0" minutes={r.ot_holiday_ot_minutes||0}  color="bg-rose-50 text-rose-600"/>
                                </div>
                              </div>
                            ) : <span className="text-slate-200">—</span>}
                          </td>
                          {/* deduct */}
                          <td className="px-3 py-3 text-right">
                            {totalDeductWork > 0 ? (
                              <div>
                                <p className="font-bold text-red-600">-฿{thb(totalDeductWork)}</p>
                                {r.absent_days > 0 && <p className="text-[10px] text-slate-400">ขาด{r.absent_days}ว</p>}
                              </div>
                            ) : <span className="text-slate-200">—</span>}
                          </td>
                          {/* sso */}
                          <td className="px-3 py-3 text-right text-slate-600">
                            -฿{thb(r.social_security_amount)}
                          </td>
                          {/* tax */}
                          <td className="px-3 py-3 text-right text-slate-600">
                            -฿{thb(r.monthly_tax_withheld)}
                          </td>
                          {/* net */}
                          <td className="px-3 py-3 text-right">
                            <p className="text-sm font-black text-indigo-700">฿{thb(r.net_salary)}</p>
                          </td>
                          {/* actions */}
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setPayslip(r)}
                                className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-500 transition-colors" title="ดูใบเงินเดือน">
                                <Eye size={12}/>
                              </button>
                              <button onClick={() => setEditing(r)}
                                className={`p-1.5 rounded-lg transition-colors ${r.is_manual_override ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}
                                title="แก้ไขตัวเลข">
                                <Edit2 size={12}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* footer totals */}
                  <tfoot className="bg-indigo-50 border-t-2 border-indigo-100">
                    <tr>
                      <td className="px-4 py-3 font-black text-slate-700">{filtered.length} คน</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">฿{thb(filtered.reduce((s,r)=>s+(r.base_salary||0),0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-green-700">฿{thb(filtered.reduce((s,r)=>s+(r.allowance_position||0)+(r.allowance_transport||0)+(r.allowance_food||0)+(r.allowance_phone||0)+(r.allowance_housing||0),0))}</td>
                      <td className="px-3 py-3 font-bold text-amber-700">฿{thb(filtered.reduce((s,r)=>s+(r.ot_amount||0),0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-red-600">-฿{thb(filtered.reduce((s,r)=>s+(r.deduct_late||0)+(r.deduct_absent||0),0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-600">-฿{thb(filtered.reduce((s,r)=>s+(r.social_security_amount||0),0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-600">-฿{thb(filtered.reduce((s,r)=>s+(r.monthly_tax_withheld||0),0))}</td>
                      <td className="px-3 py-3 text-right font-black text-indigo-700 text-sm">฿{thb(totalNet)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* modals */}
      {payslip && (
        <PayslipModal
          record={payslip}
          onClose={() => setPayslip(null)}
          onEdit={() => { setEditing(payslip); setPayslip(null) }}
        />
      )}
      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setRecords(rs => rs.map(r => r.id === updated.id ? { ...r, ...updated } : r))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}