"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Calculator, Clock, ChevronDown, Building2,
  TrendingUp, AlertCircle, Calendar, BookOpen,
  Shield, Banknote, Edit2, Save, X, Check,
  Info, ArrowRight, Percent
} from "lucide-react"
import toast from "react-hot-toast"

// ── constants ──────────────────────────────────────────────────────────
const COMPANY_COLORS = [
  { bg: "bg-indigo-500", light: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", ring: "ring-indigo-400" },
  { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", ring: "ring-emerald-400" },
  { bg: "bg-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", ring: "ring-violet-400" },
  { bg: "bg-rose-500", light: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", ring: "ring-rose-400" },
]

const LATE_GRACE_DEPT = [
  { dept: "คลังสินค้า, Service", grace: 5, note: "อนุโลม 5 นาที — หักเริ่มนาทีที่ 6" },
  { dept: "Marketing, HR, Accounting, Sale Offline, Brand Shop, Dealer, Support, KAM, Tiktok", grace: 10, note: "อนุโลม 10 นาที — หักเริ่มนาทีที่ 11" },
  { dept: "Admin Online, PTC ทุกแผนก", grace: 0, note: "ไม่มีขอนุโลม — หักตั้งแต่นาทีที่ 1" },
]

const ANNUAL_LEAVE_LEVELS = [
  { level: "Director",           days: 10 },
  { level: "Associate Director", days: 10 },
  { level: "Manager",            days: 9  },
  { level: "Associate Manager",  days: 8  },
  { level: "Senior Associate",   days: 7  },
  { level: "Associate",          days: 6  },
  { level: "Senior Analyst",     days: 6  },
  { level: "Analyst",            days: 6  },
]

const LEAVE_TYPES_INFO = [
  { no: 1,  name: "ลาป่วย",                    days: 30, paid: true,  note: "ตั้งแต่วันแรก · สิ้นสุด 31 ธ.ค. ทุกปี" },
  { no: 2,  name: "ลากิจ",                     days: 3,  paid: true,  note: "หลังผ่านทดลองงาน · สิ้นสุด 31 ธ.ค. ทุกปี" },
  { no: 3,  name: "ลากิจไม่รับค่าจ้าง",         days: 5,  paid: false, note: "ตั้งแต่วันแรกที่เข้าทำงาน" },
  { no: 4,  name: "ลารับปริญญา",               days: 3,  paid: true,  note: "ใช้ได้เมื่อผ่านทดลองงาน · ต้องแนบเอกสาร" },
  { no: 5,  name: "ลาพักร้อน",                 days: null, paid: true, note: "แบ่งตาม Level (ดูตาราง)" },
  { no: 6,  name: "ขาดงาน",                    days: null, paid: false, note: "ไม่รูดบัตร หักเต็มวัน" },
  { no: 7,  name: "ลาคลอด (ได้ค่าจ้าง)",       days: 60, paid: true,  note: "ได้รับ 100% ตั้งแต่วันแรก · ต้องแนบเอกสาร" },
  { no: 8,  name: "ลาคลอด (ไม่ได้ค่าจ้าง)",    days: 60, paid: false, note: "ตั้งแต่วันแรก · ต้องแนบเอกสาร" },
  { no: 9,  name: "ลาคลอดต่อเนื่อง",           days: 15, paid: true,  note: "ได้รับ 50% · ดูแลบุตรป่วย/พิการ · ต้องแนบเอกสาร" },
  { no: 10, name: "ลาเพื่อช่วยเลี้ยงดูบุตร (ชาย)", days: 15, paid: true, note: "ได้รับ 100% ตั้งแต่วันแรก" },
  { no: 11, name: "ลาบวช",                     days: 15, paid: true,  note: "อายุงาน ≥ 1 ปี · ต้องแนบเอกสาร" },
  { no: 12, name: "ลารับราชการทหาร",           days: 60, paid: true,  note: "อายุงาน ≥ 1 ปี · ต้องแนบเอกสาร" },
]

// ── Formula block ──────────────────────────────────────────────────────
function FormulaBox({ title, formula, example, color = "indigo" }: {
  title: string; formula: string; example?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    green:  "bg-green-50 border-green-200 text-green-800",
    amber:  "bg-amber-50 border-amber-200 text-amber-800",
    red:    "bg-red-50 border-red-200 text-red-800",
    violet: "bg-violet-50 border-violet-200 text-violet-800",
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color] || colors.indigo}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
      <code className="text-sm font-black block">{formula}</code>
      {example && <p className="text-xs mt-1.5 opacity-70">{example}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Icon size={14} className="text-indigo-600"/>
          </div>
          <h3 className="font-black text-slate-800">{title}</h3>
        </div>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function PayrollRulesPage() {
  const { user } = useAuth()
  const supabase  = createClient()
  const isSA      = user?.role === "super_admin" || user?.role === "hr_admin"

  const [companies,   setCompanies]   = useState<any[]>([])
  const [selectedCo,  setSelectedCo]  = useState<any>(null)
  const [leaveTypes,  setLeaveTypes]  = useState<any[]>([])
  const [shifts,      setShifts]      = useState<any[]>([])
  const [loadingCo,   setLoadingCo]   = useState(true)

  const myCompanyId = user?.employee?.company_id ?? (user as any)?.company_id

  // load companies
  useEffect(() => {
    const load = async () => {
      setLoadingCo(true)
      if (isSA) {
        const { data } = await supabase.from("companies").select("*").eq("is_active", true).order("name_th")
        setCompanies(data ?? [])
        if (data?.[0]) setSelectedCo(data[0])
      } else if (myCompanyId) {
        const { data } = await supabase.from("companies").select("*").eq("id", myCompanyId).single()
        if (data) { setCompanies([data]); setSelectedCo(data) }
      }
      setLoadingCo(false)
    }
    if (user) load()
  }, [user])

  // load leave types & shifts per company
  useEffect(() => {
    if (!selectedCo) return
    supabase.from("leave_types").select("*").eq("company_id", selectedCo.id).eq("is_active", true).order("name")
      .then(({ data }) => setLeaveTypes(data ?? []))
    supabase.from("shift_templates").select("*").eq("company_id", selectedCo.id).order("work_start")
      .then(({ data }) => setShifts(data ?? []))
  }, [selectedCo])

  const coIdx = companies.findIndex(c => c.id === selectedCo?.id)
  const cc    = COMPANY_COLORS[coIdx % 4] ?? COMPANY_COLORS[0]

  if (loadingCo) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">สูตรคำนวณเงินเดือน</h2>
          <p className="text-slate-400 text-sm mt-0.5">อ้างอิงจากไฟล์ HR Excel · แยกรายบริษัท</p>
        </div>
        {/* company selector */}
        {companies.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {companies.map((c, i) => {
              const col = COMPANY_COLORS[i % 4]
              const active = selectedCo?.id === c.id
              return (
                <button key={c.id} onClick={() => setSelectedCo(c)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    active ? `${col.light} ${col.border} ${col.text}` : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${active ? col.bg : "bg-slate-300"}`}/>
                  {c.code}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedCo && (
        <>
          {/* Company banner */}
          <div className={`${cc.light} ${cc.border} border-2 rounded-2xl px-5 py-4 flex items-center gap-4`}>
            <div className={`w-12 h-12 ${cc.bg} rounded-2xl flex items-center justify-center text-white font-black text-lg`}>
              {selectedCo.code.slice(0, 2)}
            </div>
            <div>
              <p className={`font-black text-lg ${cc.text}`}>{selectedCo.name_th}</p>
              <p className="text-slate-500 text-sm">{selectedCo.name_en}</p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-xs text-slate-400">รอบเงินเดือน</p>
              <p className={`font-black text-sm ${cc.text}`}>22 ของเดือนก่อน → 21 ของเดือนนี้</p>
            </div>
          </div>

          {/* ── 1. เงินเดือน ─────────────────────────────────────── */}
          <Section title="การคำนวณเงินเดือน" icon={Banknote}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormulaBox
                  title="อัตราต่อวัน"
                  formula="เงินเดือน ÷ 30"
                  example="฿15,000 ÷ 30 = ฿500/วัน"
                  color="indigo"
                />
                <FormulaBox
                  title="อัตราต่อชั่วโมง"
                  formula="(เงินเดือน ÷ 30) ÷ 8"
                  example="฿500 ÷ 8 = ฿62.50/ชม."
                  color="indigo"
                />
                <FormulaBox
                  title="อัตราต่อนาที"
                  formula="(เงินเดือน ÷ 30) ÷ 8 ÷ 60"
                  example="฿62.50 ÷ 60 = ฿1.0417/นาที"
                  color="indigo"
                />
                <FormulaBox
                  title="เงินเดือนเต็มเดือน"
                  formula="(เงินเดือน ÷ 30) × 30"
                  example="ใช้ 30 วันเสมอ ไม่ว่าเดือนจะมี 31 วัน"
                  color="green"
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-black text-slate-500 mb-2">📋 กรณีพิเศษ — เริ่มงาน / ลาออกกลางเดือน (Pro-Rate)</p>
                <FormulaBox
                  title="Pro-Rate"
                  formula="(เงินเดือน ÷ 30) × จำนวนวันที่ทำงานจริง"
                  example="฿15,000 ÷ 30 × 15 วัน = ฿7,500"
                  color="green"
                />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-2.5">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-blue-700">หารด้วย <strong>30 วันเสมอ</strong> ไม่ว่าเดือนจะมี 28, 29, 30 หรือ 31 วัน ตามสูตร Excel HR</p>
              </div>
            </div>
          </Section>

          {/* ── 2. OT ─────────────────────────────────────────────── */}
          <Section title="การคำนวณค่าล่วงเวลา (OT)" icon={Clock}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    rate: "1.5×", label: "วันทำงานปกติ — ก่อนเข้า / หลังเลิก",
                    formula: "(เงินเดือน ÷ 30 ÷ 8) × 1.5 × จำนวนชั่วโมง OT",
                    example: "฿62.50 × 1.5 × 6 ชม. = ฿562.50",
                    color: "amber",
                    badge: "bg-amber-100 text-amber-700"
                  },
                  {
                    rate: "1.0×", label: "วันหยุด / นักขัตฤกษ์ — ช่วงเวลาทำงานปกติ",
                    formula: "(เงินเดือน ÷ 30 ÷ 8) × 1.0 × จำนวนชั่วโมง OT",
                    example: "฿62.50 × 1.0 × 8 ชม. = ฿500.00",
                    color: "green",
                    badge: "bg-sky-100 text-sky-700"
                  },
                  {
                    rate: "3.0×", label: "วันหยุด / นักขัตฤกษ์ — ก่อนเข้า / หลังเลิก",
                    formula: "(เงินเดือน ÷ 30 ÷ 8) × 3.0 × จำนวนชั่วโมง OT",
                    example: "฿62.50 × 3.0 × 5 ชม. = ฿937.50",
                    color: "red",
                    badge: "bg-rose-100 text-rose-700"
                  },
                ].map(ot => (
                  <div key={ot.rate} className="flex gap-3 items-start">
                    <span className={`text-xs font-black px-2.5 py-1.5 rounded-lg flex-shrink-0 mt-0.5 ${ot.badge}`}>
                      {ot.rate}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-600 mb-1.5">{ot.label}</p>
                      <FormulaBox title="สูตร" formula={ot.formula} example={ot.example} color={ot.color}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── 3. หักมาสาย / ขาดงาน ──────────────────────────── */}
          <Section title="การหักมาสาย / ขาดงาน" icon={AlertCircle}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormulaBox
                  title="หักมาสาย"
                  formula="ROUND((เงินเดือน ÷ 30 ÷ 8 ÷ 60) × นาทีที่สาย, 0)"
                  example="฿1.0417/น. × 20 นาที = ROUND(20.83) = ฿21"
                  color="red"
                />
                <FormulaBox
                  title="หักขาดงาน"
                  formula="(เงินเดือน ÷ 30) × จำนวนวันขาด"
                  example="฿500/วัน × 1 วัน = ฿500 (เต็มวัน)"
                  color="red"
                />
              </div>

              <div>
                <p className="text-xs font-black text-slate-600 mb-3 flex items-center gap-1.5">
                  <Clock size={12}/> เกณฑ์อนุโลมมาสาย แยกตามแผนก
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600">แผนก / บริษัท</th>
                        <th className="px-4 py-2.5 text-center font-bold text-slate-600">อนุโลม</th>
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600">หักเมื่อ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {LATE_GRACE_DEPT.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="px-4 py-3 text-slate-700 font-medium">{row.dept}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black px-2 py-0.5 rounded-lg ${
                              row.grace === 0 ? "bg-red-100 text-red-700" :
                              row.grace === 5 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>{row.grace} นาที</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-2.5">
                <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700">ระบบ <strong>เก็บสถิติมาสายตั้งแต่นาทีที่ 1</strong> เสมอ แต่จะหักเงินตามเกณฑ์ข้างต้น</p>
              </div>
            </div>
          </Section>

          {/* ── 4. SSO + ภาษี ─────────────────────────────────── */}
          <Section title="ประกันสังคม & ภาษีเงินได้" icon={Shield}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-black text-slate-600 mb-2 flex items-center gap-1.5"><Percent size={11}/> ประกันสังคม</p>
                  <FormulaBox
                    title="SSO = 5% ของฐานเงินเดือน"
                    formula="MIN(MAX(เงินเดือน, 1,650), 15,000) × 5%"
                    example="ฐานสูงสุด ฿15,000 → หักสูงสุด ฿750/เดือน"
                    color="violet"
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-600 mb-2 flex items-center gap-1.5"><Percent size={11}/> ภาษีเงินได้บุคคลธรรมดา</p>
                  <div className="bg-violet-50 border border-violet-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-violet-100">
                      <p className="text-[10px] font-black text-violet-800 uppercase tracking-wide">อัตราภาษีแบบขั้นบันได</p>
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-violet-100">
                        {[
                          { from:"0",        to:"150,000",   rate:"0%"  },
                          { from:"150,001",  to:"300,000",   rate:"5%"  },
                          { from:"300,001",  to:"500,000",   rate:"10%" },
                          { from:"500,001",  to:"750,000",   rate:"15%" },
                          { from:"750,001",  to:"1,000,000", rate:"20%" },
                          { from:"1,000,001",to:"2,000,000", rate:"25%" },
                          { from:"2,000,001",to:"5,000,000", rate:"30%" },
                          { from:"5,000,001",to:"ขึ้นไป",    rate:"35%" },
                        ].map(b => (
                          <tr key={b.from}>
                            <td className="px-3 py-1.5 text-slate-500">{b.from} – {b.to}</td>
                            <td className="px-3 py-1.5 text-right font-black text-violet-700">{b.rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <FormulaBox
                title="ภาษีรายเดือน (Withholding Tax)"
                formula="(ภาษีรวมทั้งปี − ภาษีที่หักไปแล้ว) ÷ เดือนที่เหลือ"
                example="คำนวณจากรายได้ × 12 หักค่าลดหย่อนส่วนตัว 60,000 − ประกันสังคม"
                color="violet"
              />
            </div>
          </Section>

          {/* ── 5. รอบเงินเดือน ───────────────────────────────── */}
          <Section title="รอบเงินเดือนและวันนับ" icon={Calendar}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  icon: "📅", label: "วันเริ่มต้นงวด", value: "22 ของเดือนก่อน",
                  note: "เช่น งวด มี.ค. 2569 → เริ่มนับ 22 ก.พ. 2569",
                  c: "bg-indigo-50 border-indigo-200 text-indigo-700"
                },
                {
                  icon: "🏁", label: "วันสิ้นสุดงวด", value: "21 ของเดือนนี้",
                  note: "เช่น งวด มี.ค. 2569 → สิ้นสุด 21 มี.ค. 2569",
                  c: "bg-green-50 border-green-200 text-green-700"
                },
                {
                  icon: "💳", label: "วันจ่ายเงินเดือน", value: "25 ของเดือนนี้",
                  note: "เช่น งวด มี.ค. 2569 → จ่าย 25 มี.ค. 2569",
                  c: "bg-amber-50 border-amber-200 text-amber-700"
                },
              ].map(item => (
                <div key={item.label} className={`rounded-xl border-2 p-4 ${item.c}`}>
                  <p className="text-2xl mb-2">{item.icon}</p>
                  <p className="text-[10px] font-black uppercase tracking-wide opacity-60">{item.label}</p>
                  <p className="text-lg font-black mt-0.5">{item.value}</p>
                  <p className="text-xs opacity-70 mt-1">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-black text-slate-600 mb-3">📊 หารด้วย 30 วันเสมอ</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                {["มกราคม (31)","กุมภาพันธ์ (28/29)","มีนาคม (31)","...","ทุกเดือน"].map((m, i, arr) => (
                  <span key={m} className="flex items-center gap-2">
                    <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold">{m}</span>
                    {i < arr.length - 1 && <ArrowRight size={10} className="text-slate-300"/>}
                  </span>
                ))}
                <span className="font-black text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">÷ 30 เสมอ</span>
              </div>
            </div>
          </Section>

          {/* ── 6. ประเภทการลา ────────────────────────────────── */}
          <Section title="ประเภทการลาและสิทธิ์" icon={BookOpen}>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-600 w-6">#</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-600">ประเภท</th>
                    <th className="px-4 py-2.5 text-center font-bold text-slate-600">วัน/ปี</th>
                    <th className="px-4 py-2.5 text-center font-bold text-slate-600">ค่าจ้าง</th>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-600">เงื่อนไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LEAVE_TYPES_INFO.map((lt, i) => (
                    <tr key={lt.no} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{lt.no}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{lt.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        {lt.days
                          ? <span className="font-black text-indigo-700">{lt.days}</span>
                          : <span className="text-slate-400">ดูตาราง</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-black px-1.5 py-0.5 rounded ${
                          lt.paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>{lt.paid ? "✓" : "✗"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{lt.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Annual leave by level */}
            <div className="mt-4">
              <p className="text-xs font-black text-slate-600 mb-3">🎯 ลาพักร้อน — แบ่งตาม Level ตำแหน่ง</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ANNUAL_LEAVE_LEVELS.map((lv, i) => (
                  <div key={lv.level}
                    className={`rounded-xl p-3 border text-center ${
                      i === 0 || i === 1 ? "bg-emerald-50 border-emerald-200" :
                      i === 2 ? "bg-blue-50 border-blue-200" :
                      i === 3 ? "bg-sky-50 border-sky-200" :
                      "bg-slate-50 border-slate-200"
                    }`}>
                    <p className={`text-2xl font-black ${
                      i === 0 || i === 1 ? "text-emerald-700" :
                      i === 2 ? "text-blue-700" :
                      i === 3 ? "text-sky-700" :
                      "text-slate-600"
                    }`}>{lv.days}<span className="text-xs">วัน</span></p>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{lv.level}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                <Info size={12}/> คำนวณ Pro-Rate หลังผ่านทดลองงาน → สิ้นสุด 31 ธ.ค. ของปีนั้น
              </div>
            </div>
          </Section>

          {/* ── 7. Shift Templates ────────────────────────────── */}
          <Section title={`กะการทำงาน (${shifts.length} กะ)`} icon={Clock}>
            {shifts.length === 0 ? (
              <p className="text-center text-slate-300 py-6 text-sm">ยังไม่มีกะทำงาน — ไปเพิ่มที่หน้าตั้งค่า</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {shifts.map(s => (
                  <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="font-black text-slate-800 text-sm">{s.name}
                      {s.is_overnight && <span className="ml-1 text-[10px] bg-purple-100 text-purple-600 font-bold px-1.5 py-0.5 rounded">ข้ามคืน</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {s.work_start} – {s.work_end}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      พัก {s.break_minutes}น.
                      {s.flex_start_from && ` · Flex ${s.flex_start_from}–${s.flex_start_until}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── 8. ประเภทการลาจากฐานข้อมูล ───────────────────── */}
          {leaveTypes.length > 0 && (
            <Section title={`ประเภทการลาที่ตั้งค่าในระบบ (${leaveTypes.length} ประเภท)`} icon={BookOpen}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: lt.color_hex || "#6366f1" }}/>
                      <p className="font-bold text-slate-800 text-xs truncate">{lt.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lt.days_per_year && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {lt.days_per_year} วัน
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        lt.is_paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>{lt.is_paid ? "จ่าย" : "ไม่จ่าย"}</span>
                      {lt.carry_over && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">สะสม</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── 9. Quick Reference ────────────────────────────── */}
          <Section title="Quick Reference — ตัวอย่างการคำนวณจริง" icon={Calculator}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Example 1: OT */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-amber-800 flex items-center gap-1.5"><Clock size={11}/> ตัวอย่าง: คำนวณ OT 1.5×</p>
                <p className="text-xs text-amber-700">เงินเดือน ฿15,000 · OT วันทำงาน 6 ชั่วโมง</p>
                <div className="space-y-1 font-mono text-xs text-amber-900 bg-amber-100 rounded-lg p-3">
                  <p>฿15,000 ÷ 30 = ฿500/วัน</p>
                  <p>฿500 ÷ 8   = ฿62.50/ชม.</p>
                  <p>฿62.50 × 1.5 × 6 = <strong>฿562.50</strong></p>
                </div>
              </div>
              {/* Example 2: Late */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-red-800 flex items-center gap-1.5"><AlertCircle size={11}/> ตัวอย่าง: หักมาสาย 20 นาที</p>
                <p className="text-xs text-red-700">เงินเดือน ฿12,000 · มาสาย 20 นาที</p>
                <div className="space-y-1 font-mono text-xs text-red-900 bg-red-100 rounded-lg p-3">
                  <p>฿12,000 ÷ 30 ÷ 8 ÷ 60 = ฿0.8333/น.</p>
                  <p>฿0.8333 × 20  = ฿16.67</p>
                  <p>ROUND(16.67, 0) = <strong>฿17</strong></p>
                </div>
              </div>
              {/* Example 3: OT 3x */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-rose-800 flex items-center gap-1.5"><TrendingUp size={11}/> ตัวอย่าง: OT 3.0× วันหยุดนักขัตฤกษ์</p>
                <p className="text-xs text-rose-700">เงินเดือน ฿15,000 · OT วันหยุด 5 ชั่วโมง</p>
                <div className="space-y-1 font-mono text-xs text-rose-900 bg-rose-100 rounded-lg p-3">
                  <p>฿15,000 ÷ 30 ÷ 8 = ฿62.50/ชม.</p>
                  <p>฿62.50 × 3.0 × 5  = <strong>฿937.50</strong></p>
                </div>
              </div>
              {/* Example 4: SSO */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-violet-800 flex items-center gap-1.5"><Shield size={11}/> ตัวอย่าง: ประกันสังคม</p>
                <p className="text-xs text-violet-700">เงินเดือน ฿25,000 (เกินเพดาน ฿15,000)</p>
                <div className="space-y-1 font-mono text-xs text-violet-900 bg-violet-100 rounded-lg p-3">
                  <p>ฐาน SSO = MIN(25,000, 15,000) = ฿15,000</p>
                  <p>฿15,000 × 5% = <strong>฿750</strong></p>
                </div>
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}