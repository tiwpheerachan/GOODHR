"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Users, Clock, Calendar, AlertTriangle, CheckCircle,
  XCircle, AlertCircle, UserPlus, ChevronRight,
  Award, Timer, RefreshCw, FileBarChart2, Bell, X,
  TrendingUp, TrendingDown, Minus, Brain, ArrowRight,
  ShieldCheck, ShieldAlert, Shield, Target, BarChart3, Building2,
} from "lucide-react"
import Link from "next/link"
import { format, subDays, startOfMonth, differenceInDays } from "date-fns"
import { th } from "date-fns/locale"

// ── Types ──────────────────────────────────────────────────────────────────
interface DayData    { date:string; present:number; late:number; absent:number; leave:number; total:number }
interface DeptData   { name:string; present:number; total:number }
interface LatePerson { id:string; name:string; avatar_url?:string; position?:string; count:number; totalMin:number }
interface ProbPerson { id:string; name:string; avatar_url?:string; position?:string; dept?:string; probation_end_date:string; daysLeft:number }
interface PendLeave  { id:string; name:string; avatar_url?:string; leave_type:string; color:string; start_date:string; days:number }
interface CoStat     { id:string; name_th:string; code:string; total:number; present:number; pending:number }

const COMPANY_COLORS = ["#6366f1","#10b981","#8b5cf6","#f43f5e"]

function statusBadge(s:string){ return ({present:"bg-green-100 text-green-700",late:"bg-amber-100 text-amber-700",absent:"bg-red-100 text-red-600",leave:"bg-blue-100 text-blue-700",wfh:"bg-teal-100 text-teal-700"}as any)[s]??"bg-slate-100 text-slate-500" }
function statusTH(s:string){ return ({present:"มาทำงาน",late:"มาสาย",absent:"ขาดงาน",leave:"ลา",wfh:"WFH"}as any)[s]??s }

// ── Donut ──────────────────────────────────────────────────────────────────
function DonutChart({present,late,absent,leave,total}:{present:number;late:number;absent:number;leave:number;total:number}) {
  const r=52, circ=2*Math.PI*r
  const pct=total>0?Math.round(((present+late)/total)*100):0
  const segs=[{val:present,color:"#22c55e"},{val:late,color:"#f59e0b"},{val:leave,color:"#3b82f6"},{val:absent,color:"#ef4444"}]
  let off=0
  const arcs=segs.map(s=>{
    const len=total>0?(s.val/total)*circ:0
    const arc={color:s.color,da:`${len} ${circ-len}`,do:-(off)+(circ*0.25)}
    off+=len; return arc
  })
  return (
    <div className="relative flex items-center justify-center">
      <svg width={140} height={140} className="-rotate-90">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#f1f5f9" strokeWidth={18}/>
        {arcs.map((a,i)=>(
          <circle key={i} cx={70} cy={70} r={r} fill="none" stroke={a.color} strokeWidth={18}
            strokeDasharray={a.da} strokeDashoffset={a.do} strokeLinecap="butt"/>
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-slate-800">{pct}%</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">มาทำงาน</p>
      </div>
    </div>
  )
}

// ── Probation Donut ────────────────────────────────────────────────────────
function ProbationDonut({ critical, warning, notice }: { critical:number; warning:number; notice:number }) {
  const total = critical + warning + notice
  const r = 44, circ = 2*Math.PI*r
  const segs = [
    {val:critical, color:"#f43f5e"},
    {val:warning,  color:"#f59e0b"},
    {val:notice,   color:"#60a5fa"},
  ]
  let off = 0
  const arcs = segs.map(s => {
    const len = total > 0 ? (s.val/total)*circ : 0
    const arc = {color:s.color, da:`${len} ${circ-len}`, do:-(off)+(circ*0.25)}
    off += len; return arc
  })
  return (
    <div className="relative flex items-center justify-center">
      <svg width={110} height={110} className="-rotate-90">
        <circle cx={55} cy={55} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14}/>
        {arcs.map((a,i)=>(
          <circle key={i} cx={55} cy={55} r={r} fill="none" stroke={a.color} strokeWidth={14}
            strokeDasharray={a.da} strokeDashoffset={a.do} strokeLinecap="butt"/>
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-slate-800">{total}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">คน</p>
      </div>
    </div>
  )
}

// ── Weekly bar ─────────────────────────────────────────────────────────────
function WeeklyChart({data}:{data:DayData[]}) {
  const maxVal=Math.max(...data.map(d=>d.total),1), H=100
  return (
    <div className="flex items-end justify-between gap-1.5 h-28 px-1">
      {data.map((d,i)=>{
        const isToday=d.date===format(new Date(),"yyyy-MM-dd")
        const pH=(d.present/maxVal)*H, lH=(d.late/maxVal)*H
        const aH=(d.absent/maxVal)*H, lvH=(d.leave/maxVal)*H
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
              <p className="font-bold">{format(new Date(d.date),"d MMM",{locale:th})}</p>
              <p className="text-green-300">มา {d.present}</p><p className="text-amber-300">สาย {d.late}</p>
              <p className="text-blue-300">ลา {d.leave}</p><p className="text-red-300">ขาด {d.absent}</p>
            </div>
            <div className="w-full flex flex-col justify-end rounded-xl overflow-hidden" style={{height:H}}>
              {lvH>0&&<div className="w-full bg-blue-300" style={{height:lvH}}/>}
              {aH>0&&<div className="w-full bg-red-400" style={{height:aH}}/>}
              {lH>0&&<div className="w-full bg-amber-400" style={{height:lH}}/>}
              {pH>0&&<div className={`w-full ${isToday?"bg-indigo-600":"bg-indigo-400"}`} style={{height:pH}}/>}
              {d.total===0&&<div className="w-full bg-slate-100" style={{height:4}}/>}
            </div>
            <p className={`text-[10px] font-bold ${isToday?"text-indigo-600":"text-slate-400"}`}>
              {format(new Date(d.date),"E",{locale:th})}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Smart Insight ──────────────────────────────────────────────────────────
function SmartInsights({ kpi, weekData, probList }: {
  kpi: {totalEmp:number; presentToday:number; lateToday:number; absentToday:number; pendingLeave:number; pendingAdj:number; newHires:number; probCount:number}
  weekData: DayData[]
  probList: ProbPerson[]
}) {
  const insights: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string; level: "good"|"warn"|"danger" }[] = []

  const totalToday = kpi.presentToday + kpi.lateToday + kpi.absentToday
  const attendRate  = totalToday > 0 ? Math.round((kpi.presentToday + kpi.lateToday) / totalToday * 100) : 0
  const lateRate    = totalToday > 0 ? Math.round(kpi.lateToday / totalToday * 100) : 0
  const absentRate  = totalToday > 0 ? Math.round(kpi.absentToday / totalToday * 100) : 0

  // Trend 7-day (compare first 3 vs last 3 days avg)
  const nonEmpty = weekData.filter(d => d.total > 0)
  let trendDir: "up"|"down"|"flat" = "flat"
  if (nonEmpty.length >= 4) {
    const first = nonEmpty.slice(0, Math.floor(nonEmpty.length/2))
    const last  = nonEmpty.slice(Math.floor(nonEmpty.length/2))
    const firstAvg = first.reduce((s,d) => s + (d.present+d.late)/Math.max(d.total,1), 0) / first.length
    const lastAvg  = last.reduce((s,d)  => s + (d.present+d.late)/Math.max(d.total,1), 0) / last.length
    trendDir = lastAvg > firstAvg + 0.05 ? "up" : lastAvg < firstAvg - 0.05 ? "down" : "flat"
  }

  const critProb = probList.filter(p => p.daysLeft <= 30).length
  const warnProb = probList.filter(p => p.daysLeft <= 7).length

  // Insight 1: Attendance rate
  if (attendRate >= 90) {
    insights.push({ icon:<TrendingUp size={14}/>, color:"text-emerald-700", bg:"bg-emerald-50", title:`เข้างานวันนี้ ${attendRate}%`, desc:"อัตราการเข้างานดีเยี่ยม สูงกว่าเกณฑ์มาตรฐาน 90%", level:"good" })
  } else if (attendRate >= 75) {
    insights.push({ icon:<Minus size={14}/>, color:"text-amber-700", bg:"bg-amber-50", title:`เข้างานวันนี้ ${attendRate}%`, desc:"อัตราการเข้างานอยู่ในระดับปานกลาง ควรติดตาม", level:"warn" })
  } else if (totalToday > 0) {
    insights.push({ icon:<TrendingDown size={14}/>, color:"text-rose-700", bg:"bg-rose-50", title:`เข้างานวันนี้ ${attendRate}%`, desc:`พนักงานขาดงานสูงผิดปกติ ${kpi.absentToday} คน ควรตรวจสอบด่วน`, level:"danger" })
  }

  // Insight 2: Late rate
  if (lateRate > 20 && totalToday > 0) {
    insights.push({ icon:<Clock size={14}/>, color:"text-amber-700", bg:"bg-amber-50", title:`มาสายสูงวันนี้ ${lateRate}%`, desc:`${kpi.lateToday} คนมาสาย คิดเป็น ${lateRate}% ของผู้เข้างาน — ควรตรวจสอบสาเหตุ`, level:"warn" })
  } else if (kpi.lateToday === 0 && totalToday > 0) {
    insights.push({ icon:<CheckCircle size={14}/>, color:"text-emerald-700", bg:"bg-emerald-50", title:"ไม่มีพนักงานมาสายวันนี้", desc:"ทุกคนมาตรงเวลา ดีเยี่ยม!", level:"good" })
  }

  // Insight 3: Trend
  if (trendDir === "up") {
    insights.push({ icon:<TrendingUp size={14}/>, color:"text-emerald-700", bg:"bg-emerald-50", title:"แนวโน้มเข้างานดีขึ้น", desc:"อัตราเข้างานสัปดาห์นี้สูงกว่าช่วงต้นสัปดาห์", level:"good" })
  } else if (trendDir === "down") {
    insights.push({ icon:<TrendingDown size={14}/>, color:"text-rose-700", bg:"bg-rose-50", title:"แนวโน้มเข้างานลดลง", desc:"อัตราเข้างานลดลงต่อเนื่อง 7 วัน — ควรวิเคราะห์สาเหตุ", level:"warn" })
  }

  // Insight 4: Probation urgent
  if (warnProb > 0) {
    insights.push({ icon:<AlertTriangle size={14}/>, color:"text-rose-700", bg:"bg-rose-50", title:`ทดลองงานหมดใน 7 วัน ${warnProb} คน`, desc:"ต้องตัดสินใจผ่านทดลองงานด่วน ก่อนครบกำหนด", level:"danger" })
  } else if (critProb > 0) {
    insights.push({ icon:<Bell size={14}/>, color:"text-amber-700", bg:"bg-amber-50", title:`ทดลองงานหมดใน 30 วัน ${critProb} คน`, desc:"ควรเริ่มประเมินผลพนักงานทดลองงานในกลุ่มนี้", level:"warn" })
  }

  // Insight 5: Pending approvals
  if (kpi.pendingLeave + kpi.pendingAdj > 10) {
    insights.push({ icon:<AlertCircle size={14}/>, color:"text-orange-700", bg:"bg-orange-50", title:`รออนุมัติ ${kpi.pendingLeave + kpi.pendingAdj} รายการ`, desc:"มีรายการรออนุมัติค้างมาก กรุณาดำเนินการ", level:"warn" })
  }

  if (insights.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Brain size={14} className="text-indigo-600"/>
        </div>
        <p className="font-black text-sm text-slate-800">Smart Insights</p>
        <span className="text-[10px] text-slate-400 ml-1">วิเคราะห์อัตโนมัติ</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-50">
        {insights.slice(0,3).map((ins, i) => (
          <div key={i} className={`flex items-start gap-3 px-5 py-3.5 ${ins.bg}`}>
            <div className={`mt-0.5 flex-shrink-0 ${ins.color}`}>{ins.icon}</div>
            <div className="min-w-0">
              <p className={`text-[12px] font-black ${ins.color}`}>{ins.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{ins.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {insights.length > 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-50 border-t border-slate-50">
          {insights.slice(3,6).map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3.5 ${ins.bg}`}>
              <div className={`mt-0.5 flex-shrink-0 ${ins.color}`}>{ins.icon}</div>
              <div className="min-w-0">
                <p className={`text-[12px] font-black ${ins.color}`}>{ins.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Probation Alert Banner ─────────────────────────────────────────────────
function ProbationBanner({ list }: { list: ProbPerson[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded,  setExpanded]  = useState(false)
  const visible = list.filter(p => !dismissed.has(p.id))
  if (visible.length === 0) return null

  const critical = visible.filter(p => p.daysLeft <= 30)
  const warning  = visible.filter(p => p.daysLeft > 30 && p.daysLeft <= 90)
  const notice   = visible.filter(p => p.daysLeft > 90 && p.daysLeft <= 119)

  const cfg = {
    critical:{ border:"border-l-rose-500",  bg:"bg-rose-50",   text:"text-rose-700",  badge:"bg-rose-100 text-rose-700",  dot:"bg-rose-500",  tag:"ด่วน!",          tagBg:"bg-rose-500"  },
    warning: { border:"border-l-amber-500", bg:"bg-amber-50",  text:"text-amber-800", badge:"bg-amber-100 text-amber-700",dot:"bg-amber-500", tag:"แจ้งเตือน 90 วัน",tagBg:"bg-amber-500" },
    notice:  { border:"border-l-blue-400",  bg:"bg-blue-50",   text:"text-blue-800",  badge:"bg-blue-100 text-blue-700",  dot:"bg-blue-400",  tag:"119 วัน",        tagBg:"bg-blue-400"  },
  }
  const levelOf = (p:ProbPerson): keyof typeof cfg =>
    p.daysLeft <= 30 ? "critical" : p.daysLeft <= 90 ? "warning" : "notice"

  const shown = expanded ? visible : visible.slice(0,3)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Bell size={15} className="text-amber-500"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-slate-800 leading-none">การแจ้งเตือนทดลองงาน</p>
          <p className="text-[11px] text-slate-400 mt-0.5">ใกล้สิ้นสุดระยะทดลองงาน 119 วัน</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {critical.length > 0 && <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{critical.length} ด่วน</span>}
          {warning.length  > 0 && <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">{warning.length} 90 วัน</span>}
          {notice.length   > 0 && <span className="text-[10px] font-black bg-blue-400 text-white px-2 py-0.5 rounded-full">{notice.length} 119 วัน</span>}
        </div>
      </div>
      <div className="flex items-center gap-5 px-5 py-2 border-b border-slate-50 bg-slate-50/60">
        {[{c:"bg-rose-500",l:"≤ 30 วัน (ด่วน)"},{c:"bg-amber-500",l:"31–90 วัน"},{c:"bg-blue-400",l:"91–119 วัน"}].map(x=>(
          <div key={x.l} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${x.c}`}/><span className="text-[10px] text-slate-400">{x.l}</span>
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-50">
        {shown.map(p => {
          const lv = levelOf(p); const c = cfg[lv]
          return (
            <div key={p.id} className={`flex items-center gap-3 px-5 py-3.5 border-l-4 ${c.border} ${c.bg}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black overflow-hidden ${c.badge}`}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover"/> : p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-black text-[13px] leading-none ${c.text}`}>{p.name}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${c.tagBg}`}>{c.tag}</span>
                </div>
                {p.dept && <p className="text-[11px] text-slate-400 mt-0.5">{p.dept}</p>}
                <p className={`text-[11px] font-bold mt-0.5 ${c.text}`}>
                  สิ้นสุด {format(new Date(p.probation_end_date),"d MMMM yyyy",{locale:th})} · เหลืออีก{" "}
                  <span className="font-black text-[14px]">{p.daysLeft}</span> วัน
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link href={`/admin/employees/${p.id}`}
                  className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1">
                  ดูข้อมูล<ChevronRight size={10}/>
                </Link>
                <button onClick={() => setDismissed(s => new Set([...s, p.id]))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors">
                  <X size={13}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {visible.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full py-2.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-1">
          {expanded ? "แสดงน้อยลง ↑" : `ดูอีก ${visible.length - 3} คน ↓`}
        </button>
      )}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const {user}   = useAuth()
  const supabase = createClient()
  const isSA     = user?.role==="super_admin" || user?.role==="hr_admin"
  const today    = format(new Date(),"yyyy-MM-dd")
  const monthStart = format(startOfMonth(new Date()),"yyyy-MM-dd")

  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [selectedCo,  setSelectedCo]  = useState("")
  const [companies,   setCompanies]   = useState<any[]>([])
  const [coStats,     setCoStats]     = useState<CoStat[]>([])
  const [kpi,         setKpi]         = useState({totalEmp:0,presentToday:0,lateToday:0,absentToday:0,pendingLeave:0,pendingAdj:0,newHires:0,probCount:0})
  const [weekData,    setWeekData]    = useState<DayData[]>([])
  const [deptData,    setDeptData]    = useState<DeptData[]>([])
  const [lateList,    setLateList]    = useState<LatePerson[]>([])
  const [probList,    setProbList]    = useState<ProbPerson[]>([])
  const [pendLeaves,  setPendLeaves]  = useState<PendLeave[]>([])
  const [checkins,    setCheckins]    = useState<any[]>([])
  const [kpiStats,    setKpiStats]    = useState<{total:number;avg:number;grades:Record<string,number>;topDepts:{name:string;avg:number;count:number}[];topEmployees:{name:string;avatar_url?:string;position?:string;score:number;grade:string}[];monthlyAvg:{month:number;avg:number;count:number}[]}>({total:0,avg:0,grades:{A:0,B:0,C:0,D:0},topDepts:[],topEmployees:[],monthlyAvg:[]})

  const myCompanyId:string|undefined = user?.employee?.company_id??(user as any)?.company_id??undefined
  const companyId:string|undefined   = isSA?(selectedCo||undefined):myCompanyId

  useEffect(()=>{
    if(!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th")
      .then(({data})=>setCompanies(data??[]))
  },[isSA])

  const load = useCallback(async()=>{
    if(!isSA&&!myCompanyId) return
    setLoading(true)
    try {
      const fc=(q:any)=>companyId?q.eq("company_id",companyId):(!isSA?q.eq("company_id",myCompanyId!):q)
      const fe=(q:any)=>companyId?q.eq("company_id",companyId):(!isSA?q.eq("company_id",myCompanyId!):q)

      const [r0,r1,r2,r3,r4,r5,r6] = await Promise.all([
        fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true)),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).in("status",["present","wfh"])),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).eq("status","late")),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).eq("status","absent")),
        fc(supabase.from("leave_requests").select("id",{count:"exact",head:true}).eq("status","pending")),
        fc(supabase.from("time_adjustment_requests").select("id",{count:"exact",head:true}).eq("status","pending")),
        fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true).gte("hire_date",monthStart)),
      ])
      const in119Date = format(subDays(new Date(),-119),"yyyy-MM-dd")
      const r7 = await fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true).not("probation_end_date","is",null).gte("probation_end_date",today).lte("probation_end_date",in119Date))
      setKpi({totalEmp:r0.count??0,presentToday:r1.count??0,lateToday:r2.count??0,absentToday:r3.count??0,pendingLeave:r4.count??0,pendingAdj:r5.count??0,newHires:r6.count??0,probCount:r7.count??0})

      // 7-day chart
      const days=Array.from({length:7},(_,i)=>format(subDays(new Date(),6-i),"yyyy-MM-dd"))
      const {data:attRaw}=await fc(supabase.from("attendance_records").select("work_date,status").gte("work_date",days[0]).lte("work_date",days[6]))
      const dm:Record<string,DayData>={}
      days.forEach(d=>{dm[d]={date:d,present:0,late:0,absent:0,leave:0,total:0}})
      ;(attRaw??[]).forEach((r:any)=>{
        const dd=dm[r.work_date]; if(!dd)return
        if(r.status==="present"||r.status==="wfh") dd.present++
        else if(r.status==="late") dd.late++
        else if(r.status==="absent") dd.absent++
        else if(r.status==="leave") dd.leave++
        dd.total++
      })
      setWeekData(Object.values(dm))

      // today checkins
      const {data:ci}=await fc(
        supabase.from("attendance_records")
          .select(`work_date,clock_in,status,late_minutes,
            employee:employees!attendance_records_employee_id_fkey(
              id,first_name_th,last_name_th,avatar_url,
              position:positions(name),department:departments(name))`)
          .eq("work_date",today).order("clock_in",{ascending:false}).limit(8)
      )
      setCheckins(ci??[])

      // dept today
      const {data:deptRaw}=await fc(
        supabase.from("attendance_records")
          .select(`status,employee:employees!attendance_records_employee_id_fkey(department:departments(name))`)
          .eq("work_date",today)
      )
      const dm2:Record<string,{present:number;total:number}>={}
      ;(deptRaw??[]).forEach((r:any)=>{
        const n=r.employee?.department?.name||"ไม่ระบุ"
        if(!dm2[n]) dm2[n]={present:0,total:0}
        dm2[n].total++
        if(["present","late","wfh"].includes(r.status)) dm2[n].present++
      })
      setDeptData(Object.entries(dm2).map(([name,d])=>({name,...d})).sort((a,b)=>b.total-a.total).slice(0,7))

      // late leaderboard
      const {data:lateRaw}=await fc(
        supabase.from("attendance_records")
          .select(`late_minutes,employee_id,employee:employees!attendance_records_employee_id_fkey(id,first_name_th,last_name_th,avatar_url,position:positions(name))`)
          .eq("status","late").gte("work_date",monthStart).gt("late_minutes",0)
      )
      const lm:Record<string,LatePerson>={}
      ;(lateRaw??[]).forEach((r:any)=>{
        const e=r.employee; if(!e)return
        if(!lm[e.id]) lm[e.id]={id:e.id,name:`${e.first_name_th} ${e.last_name_th}`,avatar_url:e.avatar_url,position:e.position?.name,count:0,totalMin:0}
        lm[e.id].count++; lm[e.id].totalMin+=r.late_minutes
      })
      setLateList(Object.values(lm).sort((a,b)=>b.count-a.count).slice(0,5))

      // probation
      const {data:probRaw}=await fe(
        supabase.from("employees")
          .select(`id,first_name_th,last_name_th,avatar_url,probation_end_date,
            position:positions(name),department:departments(name)`)
          .eq("is_active",true)
          .eq("employment_status","probation")
          .not("probation_end_date","is",null)
          .gte("probation_end_date",today)
          .lte("probation_end_date",format(subDays(new Date(),-119),"yyyy-MM-dd"))
          .order("probation_end_date")
      )
      setProbList((probRaw??[]).map((e:any)=>({
        id:e.id,
        name:`${e.first_name_th} ${e.last_name_th}`,
        avatar_url:e.avatar_url,
        position:e.position?.name,
        dept:e.department?.name,
        probation_end_date:e.probation_end_date,
        daysLeft:differenceInDays(new Date(e.probation_end_date),new Date()),
      })))

      // pending leaves
      const {data:plRaw}=await fc(
        supabase.from("leave_requests")
          .select(`id,start_date,end_date,total_days,
            employee:employees!leave_requests_employee_id_fkey(first_name_th,last_name_th,avatar_url),
            leave_type:leave_types(name,color_hex)`)
          .eq("status","pending").order("created_at",{ascending:false}).limit(5)
      )
      setPendLeaves((plRaw??[]).map((r:any)=>({id:r.id,name:`${r.employee?.first_name_th} ${r.employee?.last_name_th}`,avatar_url:r.employee?.avatar_url,leave_type:r.leave_type?.name||"ลา",color:r.leave_type?.color_hex||"#6366f1",start_date:r.start_date,days:r.total_days})))

      // KPI stats
      const kpiYear = new Date().getFullYear()
      const kpiQuery = companyId
        ? supabase.from("kpi_forms").select("employee_id,month,total_score,grade,employee:employees!kpi_forms_employee_id_fkey(first_name_th,last_name_th,avatar_url,position:positions(name),department:departments(name))").eq("company_id",companyId).eq("year",kpiYear).eq("status","submitted")
        : isSA
          ? supabase.from("kpi_forms").select("employee_id,month,total_score,grade,employee:employees!kpi_forms_employee_id_fkey(first_name_th,last_name_th,avatar_url,position:positions(name),department:departments(name))").eq("year",kpiYear).eq("status","submitted")
          : supabase.from("kpi_forms").select("employee_id,month,total_score,grade,employee:employees!kpi_forms_employee_id_fkey(first_name_th,last_name_th,avatar_url,position:positions(name),department:departments(name))").eq("company_id",myCompanyId!).eq("year",kpiYear).eq("status","submitted")
      const {data:kpiForms} = await kpiQuery
      if(kpiForms && kpiForms.length > 0) {
        const grades:Record<string,number> = {A:0,B:0,C:0,D:0}
        const deptMap:Record<string,{sum:number;count:number}> = {}
        const monthMap:Record<number,{sum:number;count:number}> = {}
        let totalScore = 0
        kpiForms.forEach((f:any) => {
          grades[f.grade] = (grades[f.grade]||0)+1
          totalScore += f.total_score
          const dept = f.employee?.department?.name || "ไม่ระบุ"
          if(!deptMap[dept]) deptMap[dept] = {sum:0,count:0}
          deptMap[dept].sum += f.total_score; deptMap[dept].count++
          if(!monthMap[f.month]) monthMap[f.month] = {sum:0,count:0}
          monthMap[f.month].sum += f.total_score; monthMap[f.month].count++
        })
        const topDepts = Object.entries(deptMap).map(([name,d])=>({name,avg:d.sum/d.count,count:d.count})).sort((a,b)=>b.avg-a.avg).slice(0,5)
        const topEmployees = [...kpiForms].sort((a:any,b:any)=>b.total_score-a.total_score).slice(0,5).map((f:any)=>({
          name:`${f.employee?.first_name_th||""} ${f.employee?.last_name_th||""}`,
          avatar_url:f.employee?.avatar_url,
          position:f.employee?.position?.name,
          score:f.total_score,grade:f.grade
        }))
        const monthlyAvg = Object.entries(monthMap).map(([m,d])=>({month:Number(m),avg:d.sum/d.count,count:d.count})).sort((a,b)=>a.month-b.month)
        setKpiStats({total:kpiForms.length,avg:totalScore/kpiForms.length,grades,topDepts,topEmployees,monthlyAvg})
      } else {
        setKpiStats({total:0,avg:0,grades:{A:0,B:0,C:0,D:0},topDepts:[],topEmployees:[],monthlyAvg:[]})
      }

      // company stats
      if(isSA&&!companyId) {
        const cList=companies.length>0?companies:(await supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th")).data??[]
        if(cList.length>0){
          const stats=await Promise.all(cList.map(async(c:any)=>{
            const [t,p,pd]=await Promise.all([
              supabase.from("employees").select("id",{count:"exact",head:true}).eq("company_id",c.id).eq("is_active",true),
              supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",c.id).eq("work_date",today).in("status",["present","late","wfh"]),
              supabase.from("leave_requests").select("id",{count:"exact",head:true}).eq("company_id",c.id).eq("status","pending"),
            ])
            return{id:c.id,name_th:c.name_th,code:c.code,total:t.count??0,present:p.count??0,pending:pd.count??0}
          }))
          setCoStats(stats)
        }
      }
    } finally { setLoading(false); setLastRefresh(new Date()) }
  },[companyId,isSA,myCompanyId,companies,today,monthStart])

  useEffect(()=>{load()},[load])

  const totalToday = kpi.presentToday+kpi.lateToday+kpi.absentToday
  const pendTotal  = kpi.pendingLeave+kpi.pendingAdj
  const critProb   = probList.filter(p=>p.daysLeft<=30).length
  const warnProb   = probList.filter(p=>p.daysLeft>30&&p.daysLeft<=90).length
  const noticeProb = probList.filter(p=>p.daysLeft>90).length

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ภาพรวมระบบ</h2>
          <p className="text-slate-400 text-sm">{format(new Date(),"EEEE d MMMM yyyy",{locale:th})}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSA&&companies.length>0&&(
            <select value={selectedCo} onChange={e=>setSelectedCo(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all">
              <option value="">ทุกบริษัท</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={loading?"animate-spin":""}/> {format(lastRefresh,"HH:mm")}
          </button>
        </div>
      </div>

      {/* ── ACTION BAR: Report & Export ── (โดดเด่น ด้านบน) ─── */}
      <div className="bg-gradient-to-r from-[#2A505A] to-[#3a6b78] rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm">รายงาน & Export</p>
          <p className="text-[#b3e5fc] text-[11px] mt-0.5">ดูรายงานการเข้างาน สรุปตามแผนก/สาขา และ Export Excel</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/admin/attendance?tab=summary"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-xl transition-colors">
            <FileBarChart2 size={14}/>
            สรุปรายงาน
          </Link>
          <Link href="/admin/attendance"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#2A505A] text-sm font-black rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
            <ArrowRight size={14}/>
            ดูการเข้างาน
          </Link>
        </div>
      </div>

      {/* ── Smart Insights ──────────────────────────────────────── */}
      <SmartInsights kpi={kpi} weekData={weekData} probList={probList}/>

      {/* ── Company cards ───────────────────────────────────────── */}
      {isSA&&!selectedCo&&coStats.length>0&&(
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {coStats.map((c,i)=>{
            const pct=c.total>0?Math.round((c.present/c.total)*100):0
            return(
              <button key={c.id} onClick={()=>setSelectedCo(c.id)}
                className="bg-white border border-slate-100 rounded-2xl p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg text-white" style={{backgroundColor:COMPANY_COLORS[i%4]}}>{c.code}</span>
                  {c.pending>0&&<span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{c.pending} รออนุมัติ</span>}
                </div>
                <p className="text-2xl font-black text-slate-800">{c.total}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{c.name_th.replace("บริษัท ","").replace(" จำกัด","")}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>มาวันนี้</span>
                    <span className="font-black" style={{color:COMPANY_COLORS[i%4]}}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:COMPANY_COLORS[i%4]}}/>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          {l:"พนักงาน",      v:kpi.totalEmp,     icon:Users,         bg:"bg-indigo-50", ic:"text-indigo-500", vc:"text-indigo-700", href:"/admin/employees"},
          {l:"มาวันนี้",     v:kpi.presentToday, icon:CheckCircle,   bg:"bg-green-50",  ic:"text-green-500",  vc:"text-green-700",  href:"/admin/attendance"},
          {l:"มาสาย",        v:kpi.lateToday,    icon:Timer,         bg:"bg-amber-50",  ic:"text-amber-500",  vc:"text-amber-700",  href:"/admin/attendance"},
          {l:"ขาดงาน",       v:kpi.absentToday,  icon:XCircle,       bg:"bg-red-50",    ic:"text-red-500",    vc:"text-red-700",    href:"/admin/attendance"},
          {l:"รออนุมัติลา", v:kpi.pendingLeave, icon:Calendar,      bg:"bg-orange-50", ic:"text-orange-500", vc:"text-orange-700", href:"/admin/leave"},
          {l:"รอแก้เวลา",   v:kpi.pendingAdj,   icon:AlertCircle,   bg:"bg-yellow-50", ic:"text-yellow-600", vc:"text-yellow-700", href:"/admin/attendance"},
          {l:"พนักงานใหม่", v:kpi.newHires,     icon:UserPlus,      bg:"bg-sky-50",    ic:"text-sky-500",    vc:"text-sky-700",    href:"/admin/employees"},
          {l:"ใกล้หมดทดลอง",v:kpi.probCount,   icon:AlertTriangle, bg:"bg-rose-50",   ic:"text-rose-500",   vc:"text-rose-700",   href:"/admin/employees"},
        ].map(k=>(
          <Link key={k.l} href={k.href} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all block">
            <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-2.5`}>
              <k.icon size={14} className={k.ic}/>
            </div>
            <p className={`text-xl font-black ${k.vc}`}>{k.v.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-semibold">{k.l}</p>
          </Link>
        ))}
      </div>

      {/* ── Donut + Weekly ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-700 text-sm mb-4">สถานะวันนี้</h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart present={kpi.presentToday} late={kpi.lateToday} absent={kpi.absentToday} leave={0} total={totalToday}/>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
              {[{l:"มาทำงาน",v:kpi.presentToday,c:"bg-green-500"},{l:"มาสาย",v:kpi.lateToday,c:"bg-amber-400"},{l:"ขาดงาน",v:kpi.absentToday,c:"bg-red-400"},{l:"รออนุมัติ",v:pendTotal,c:"bg-orange-400"}].map(s=>(
                <div key={s.l} className="flex items-center gap-2 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.c} flex-shrink-0`}/>
                  <span className="text-slate-500">{s.l}</span>
                  <span className="ml-auto font-black text-slate-700">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-700 text-sm">การเข้างาน 7 วันล่าสุด</h3>
            <div className="flex gap-3">
              {[["bg-indigo-500","มา"],["bg-amber-400","สาย"],["bg-blue-300","ลา"],["bg-red-400","ขาด"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-1 text-[10px] text-slate-400"><div className={`w-2 h-2 rounded-sm ${c}`}/>{l}</div>
              ))}
            </div>
          </div>
          {weekData.length>0?<WeeklyChart data={weekData}/>:<div className="h-28 flex items-center justify-center text-slate-300 text-sm">ยังไม่มีข้อมูล</div>}
        </div>
      </div>

      {/* ── Probation Chart Card ────────────────────────────────── */}
      {probList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <Shield size={14} className="text-rose-500"/>
            </div>
            <p className="font-black text-sm text-slate-800">สถิติพนักงานทดลองงาน</p>
            <span className="ml-1 text-[10px] bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-full">{probList.length} คน</span>
            <Link href="/admin/employees" className="ml-auto text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">จัดการ<ChevronRight size={12}/></Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Donut */}
              <div className="flex flex-col items-center gap-3">
                <ProbationDonut critical={critProb} warning={warnProb} notice={noticeProb}/>
                <div className="flex flex-col gap-1.5 w-full">
                  {[
                    {color:"bg-rose-500", label:"≤ 30 วัน (ด่วน)", val:critProb},
                    {color:"bg-amber-500",label:"31–90 วัน",        val:warnProb},
                    {color:"bg-blue-400", label:"91–119 วัน",       val:noticeProb},
                  ].map(s=>(
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`}/>
                      <span className="text-slate-500 flex-1">{s.label}</span>
                      <span className="font-black text-slate-700">{s.val} คน</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart by days remaining */}
              <div className="md:col-span-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-3">จำนวนวันที่เหลือ</p>
                <div className="space-y-2.5">
                  {probList.slice(0,6).map(p=>{
                    const pct = Math.max(5, Math.round((p.daysLeft / 119)*100))
                    const col = p.daysLeft<=30?"bg-rose-500":p.daysLeft<=90?"bg-amber-400":"bg-blue-400"
                    const textCol = p.daysLeft<=30?"text-rose-600":p.daysLeft<=90?"text-amber-600":"text-blue-500"
                    return (
                      <div key={p.id}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600 text-[10px] flex-shrink-0 overflow-hidden">
                              {p.avatar_url?<img src={p.avatar_url} alt="" className="w-full h-full object-cover"/>:p.name[0]}
                            </div>
                            <span className="font-bold text-slate-700 truncate">{p.name}</span>
                            {p.dept && <span className="text-slate-400 truncate hidden md:block">· {p.dept}</span>}
                          </div>
                          <span className={`font-black flex-shrink-0 ml-2 ${textCol}`}>{p.daysLeft} วัน</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${col} transition-all`} style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    )
                  })}
                  {probList.length>6&&(
                    <p className="text-[11px] text-slate-400 text-center pt-1">และอีก {probList.length-6} คน — <Link href="/admin/employees" className="text-indigo-500 font-bold hover:underline">ดูทั้งหมด</Link></p>
                  )}
                </div>

                {/* 3-level summary stat bar */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    {icon:<ShieldAlert size={13}/>, bg:"bg-rose-50", border:"border-rose-200", ic:"text-rose-500", val:critProb,   label:"ด่วน ≤30 วัน"},
                    {icon:<Shield size={13}/>,      bg:"bg-amber-50",border:"border-amber-200",ic:"text-amber-500",val:warnProb,  label:"31–90 วัน"},
                    {icon:<ShieldCheck size={13}/>, bg:"bg-blue-50", border:"border-blue-200", ic:"text-blue-400", val:noticeProb,label:"91–119 วัน"},
                  ].map(s=>(
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-3 py-2.5 flex items-center gap-2`}>
                      <span className={s.ic}>{s.icon}</span>
                      <div>
                        <p className={`text-lg font-black leading-none ${s.ic}`}>{s.val}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Today checkins + Dept ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm">เช็คอินวันนี้</h3>
            <Link href="/admin/attendance" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">ดูทั้งหมด<ChevronRight size={12}/></Link>
          </div>
          {loading?(<div className="px-5 py-10 text-center"><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"/></div>
          ):checkins.length===0?(<div className="px-5 py-10 text-center text-slate-300 text-sm">ยังไม่มีการเช็คอินวันนี้</div>):(
            <div className="divide-y divide-slate-50">
              {checkins.map((a,idx)=>(
                <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0 overflow-hidden">
                    {a.employee?.avatar_url?<img src={a.employee.avatar_url} alt="" className="w-full h-full object-cover"/>:a.employee?.first_name_th?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{a.employee?.first_name_th} {a.employee?.last_name_th}</p>
                    <p className="text-xs text-slate-400 truncate">{a.employee?.department?.name} · {a.employee?.position?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-slate-700">{a.clock_in?format(new Date(a.clock_in),"HH:mm"):"--:--"}</p>
                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(a.status)}`}>
                      {statusTH(a.status)}{a.late_minutes>0&&` +${a.late_minutes}น.`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-700 text-sm mb-4">การมาของแต่ละแผนก</h3>
          {deptData.length===0?<p className="text-center text-slate-300 text-sm py-6">ยังไม่มีข้อมูล</p>:(
            <div className="space-y-3">
              {deptData.map(d=>{
                const pct=d.total>0?Math.round((d.present/d.total)*100):0
                const col=pct>=80?"bg-green-500":pct>=50?"bg-amber-400":"bg-red-400"
                return(
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600 truncate max-w-36">{d.name}</span>
                      <span className={`font-black ${pct>=80?"text-green-600":pct>=50?"text-amber-600":"text-red-500"}`}>{d.present}/{d.total}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${col} rounded-full transition-all`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Leave + Late board + Probation compact ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
              ใบลารออนุมัติ
              {kpi.pendingLeave>0&&<span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{kpi.pendingLeave}</span>}
            </h3>
            <Link href="/admin/leave" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">จัดการ<ChevronRight size={12}/></Link>
          </div>
          {pendLeaves.length===0?(
            <div className="px-5 py-10 text-center text-slate-300 text-sm">ไม่มีรายการรออนุมัติ ✓</div>
          ):(
            <div className="divide-y divide-slate-50">
              {pendLeaves.map(r=>(
                <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                    {r.avatar_url?<img src={r.avatar_url} alt="" className="w-full h-full object-cover"/>:r.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{r.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:r.color}}/>
                      <p className="text-xs text-slate-400">{r.leave_type}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-slate-600">{r.days} วัน</p>
                    <p className="text-[10px] text-slate-400">{format(new Date(r.start_date),"d MMM",{locale:th})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
              <Award size={14} className="text-amber-500"/> มาสายสูงสุดเดือนนี้
            </h3>
          </div>
          {lateList.length===0?(
            <div className="px-5 py-10 text-center text-slate-300 text-sm">ไม่มีข้อมูลการมาสาย</div>
          ):(
            <div className="divide-y divide-slate-50">
              {lateList.map((emp,i)=>(
                <div key={emp.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i===0?"bg-amber-100 text-amber-700":i===1?"bg-slate-100 text-slate-600":i===2?"bg-orange-100 text-orange-600":"bg-slate-50 text-slate-400"}`}>{i+1}</div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                    {emp.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.position}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-amber-600">{emp.count} ครั้ง</p>
                    <p className="text-[10px] text-slate-400">{emp.totalMin} นาที</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-500"/> ใกล้หมดทดลองงาน (30 วัน)
              {critProb>0&&(<span className="text-[10px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{critProb}</span>)}
            </h3>
          </div>
          {probList.filter(p=>p.daysLeft<=30).length===0?(
            <div className="px-5 py-10 text-center text-slate-300 text-sm">ไม่มีในช่วง 30 วันนี้</div>
          ):(
            <div className="divide-y divide-slate-50">
              {probList.filter(p=>p.daysLeft<=30).slice(0,5).map(emp=>(
                <Link key={emp.id} href={`/admin/employees/${emp.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center font-black text-rose-600 text-xs flex-shrink-0 overflow-hidden">
                    {emp.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.dept}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-black ${emp.daysLeft<=7?"text-red-500":emp.daysLeft<=14?"text-amber-600":"text-slate-600"}`}>{emp.daysLeft} วัน</p>
                    <p className="text-[10px] text-slate-400">{format(new Date(emp.probation_end_date),"d MMM",{locale:th})}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Analytics ─────────────────────────────────────── */}
      {kpiStats.total>0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-700 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center"><Target size={14} className="text-indigo-600"/></div>
              KPI ประจำปี {new Date().getFullYear()}
            </h2>
            <Link href="/admin/kpi" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              ดูทั้งหมด →
            </Link>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ประเมินแล้ว</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{kpiStats.total}</p>
              <p className="text-[10px] text-slate-400">ฟอร์ม</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">คะแนนเฉลี่ย</p>
              <p className={`text-2xl font-black mt-1 ${kpiStats.avg>=81?"text-emerald-600":kpiStats.avg>=71?"text-amber-600":"text-red-500"}`}>
                {kpiStats.avg.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-400">ทั้งบริษัท</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">เกรด A+B</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{(kpiStats.grades.A||0)+(kpiStats.grades.B||0)}</p>
              <p className="text-[10px] text-emerald-600">ดี-ดีมาก</p>
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
              <p className="text-[10px] font-bold text-red-500 uppercase">เกรด C+D</p>
              <p className="text-2xl font-black text-red-600 mt-1">{(kpiStats.grades.C||0)+(kpiStats.grades.D||0)}</p>
              <p className="text-[10px] text-red-500">ต้องปรับปรุง</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Grade Distribution */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                  <BarChart3 size={14} className="text-indigo-500"/> สัดส่วนเกรด
                </h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(["A","B","C","D"] as const).map(g=>{
                  const colors={A:{bg:"bg-emerald-500",text:"text-emerald-700",light:"bg-emerald-50"},B:{bg:"bg-blue-500",text:"text-blue-700",light:"bg-blue-50"},C:{bg:"bg-amber-500",text:"text-amber-700",light:"bg-amber-50"},D:{bg:"bg-red-500",text:"text-red-700",light:"bg-red-50"}}
                  const c=colors[g]
                  const pct=kpiStats.total>0?((kpiStats.grades[g]||0)/kpiStats.total)*100:0
                  return(
                    <div key={g} className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg ${c.light} ${c.text} text-xs font-black flex items-center justify-center`}>{g}</span>
                      <div className="flex-1">
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${c.bg} transition-all duration-700`} style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                      <span className="text-sm font-black text-slate-700 w-8 text-right">{kpiStats.grades[g]||0}</span>
                      <span className="text-xs text-slate-400 w-12 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Monthly Trend */}
            {kpiStats.monthlyAvg.length>0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500"/> คะแนนเฉลี่ยรายเดือน
                  </h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-end gap-2 h-32">
                    {kpiStats.monthlyAvg.map(m=>{
                      const h=Math.max((m.avg/100)*100, 8)
                      const monthNames=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
                      const barColor=m.avg>=91?"bg-emerald-500":m.avg>=81?"bg-blue-500":m.avg>=71?"bg-amber-500":"bg-red-500"
                      return(
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-600">{m.avg.toFixed(0)}</span>
                          <div className={`w-full max-w-[32px] rounded-t-lg ${barColor} transition-all duration-500`} style={{height:`${h}%`}}/>
                          <span className="text-[9px] text-slate-400 font-bold">{monthNames[m.month]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Employees */}
            {kpiStats.topEmployees.length>0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    <Award size={14} className="text-amber-500"/> พนักงานคะแนนสูงสุด
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {kpiStats.topEmployees.map((emp,i)=>{
                    const gc={A:"bg-emerald-100 text-emerald-700",B:"bg-blue-100 text-blue-700",C:"bg-amber-100 text-amber-700",D:"bg-red-100 text-red-700"}
                    return(
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i===0?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-500"}`}>{i+1}</div>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                          {emp.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                          <p className="text-xs text-slate-400 truncate">{emp.position}</p>
                        </div>
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${gc[emp.grade as keyof typeof gc]||"bg-slate-100 text-slate-600"}`}>{emp.grade}</span>
                        <span className="text-sm font-black text-slate-800">{emp.score.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Department Ranking */}
            {kpiStats.topDepts.length>0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    <Building2 size={14} className="text-violet-500"/> แผนกคะแนนเฉลี่ยสูงสุด
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {kpiStats.topDepts.map((dept,i)=>(
                    <div key={dept.name} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i===0?"bg-violet-100 text-violet-700":"bg-slate-100 text-slate-500"}`}>{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{dept.name}</p>
                        <p className="text-xs text-slate-400">{dept.count} คน</p>
                      </div>
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${dept.avg>=81?"bg-emerald-500":dept.avg>=71?"bg-amber-500":"bg-red-500"}`} style={{width:`${dept.avg}%`}}/>
                      </div>
                      <span className={`text-sm font-black ${dept.avg>=81?"text-emerald-600":dept.avg>=71?"text-amber-600":"text-red-500"}`}>{dept.avg.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Probation full alert banner ─────────────────────────── */}
      <ProbationBanner list={probList}/>

    </div>
  )
}