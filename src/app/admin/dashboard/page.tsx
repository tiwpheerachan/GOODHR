"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Users, Clock, Calendar, AlertTriangle, CheckCircle,
  XCircle, AlertCircle, UserPlus, ChevronRight,
  Award, Timer, RefreshCw, Building2
} from "lucide-react"
import Link from "next/link"
import { format, subDays, startOfMonth, differenceInDays } from "date-fns"
import { th } from "date-fns/locale"

// ── Types ──────────────────────────────────────────────────────────────────
interface DayData { date:string; present:number; late:number; absent:number; leave:number; total:number }
interface DeptData { name:string; present:number; total:number }
interface LatePerson { id:string; name:string; avatar_url?:string; position?:string; count:number; totalMin:number }
interface ProbPerson { id:string; name:string; avatar_url?:string; position?:string; probation_end_date:string; daysLeft:number }
interface PendLeave { id:string; name:string; avatar_url?:string; leave_type:string; color:string; start_date:string; days:number }
interface CoStat { id:string; name_th:string; code:string; total:number; present:number; pending:number }

const COMPANY_COLORS = ["#6366f1","#10b981","#8b5cf6","#f43f5e"]

function statusBadge(s:string){ return ({present:"bg-green-100 text-green-700",late:"bg-amber-100 text-amber-700",absent:"bg-red-100 text-red-600",leave:"bg-blue-100 text-blue-700",wfh:"bg-teal-100 text-teal-700"}as any)[s]??"bg-slate-100 text-slate-500" }
function statusTH(s:string){ return ({present:"มาทำงาน",late:"มาสาย",absent:"ขาดงาน",leave:"ลา",wfh:"WFH"}as any)[s]??s }

// ── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({present,late,absent,leave,total}:{present:number;late:number;absent:number;leave:number;total:number}) {
  const r=52, circ=2*Math.PI*r, pct=total>0?Math.round(((present+late)/total)*100):0
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

// ── Bar Chart ──────────────────────────────────────────────────────────────
function WeeklyChart({data}:{data:DayData[]}) {
  const maxVal=Math.max(...data.map(d=>d.total),1)
  const H=100
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

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const {user}  = useAuth()
  const supabase= createClient()
  const isSA    = user?.role==="super_admin"||user?.role==="hr_admin"
  const today   = format(new Date(),"yyyy-MM-dd")
  const monthStart = format(startOfMonth(new Date()),"yyyy-MM-dd")
  const in30    = format(subDays(new Date(),-30),"yyyy-MM-dd")

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

  const myCompanyId:string|undefined = user?.employee?.company_id??(user as any)?.company_id??undefined
  const companyId:string|undefined   = isSA?(selectedCo||undefined):myCompanyId

  // ── load companies ────────────────────────────────────────────────
  useEffect(()=>{
    if(!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th")
      .then(({data})=>setCompanies(data??[]))
  },[isSA])

  // ── main loader ───────────────────────────────────────────────────
  const load = useCallback(async()=>{
    if(!isSA&&!myCompanyId) return
    setLoading(true)
    try {
      // helper: add company filter
      const fc=(q:any)=>companyId?q.eq("company_id",companyId):(!isSA?q.eq("company_id",myCompanyId!):q)
      const fe=(q:any)=>companyId?q.eq("company_id",companyId):(!isSA?q.eq("company_id",myCompanyId!):q)

      const [r0,r1,r2,r3,r4,r5,r6,r7] = await Promise.all([
        fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true)),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).in("status",["present","wfh"])),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).eq("status","late")),
        fc(supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("work_date",today).eq("status","absent")),
        fc(supabase.from("leave_requests").select("id",{count:"exact",head:true}).eq("status","pending")),
        fc(supabase.from("time_adjustment_requests").select("id",{count:"exact",head:true}).eq("status","pending")),
        fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true).gte("hire_date",monthStart)),
        fe(supabase.from("employees").select("id",{count:"exact",head:true}).eq("is_active",true).not("probation_end_date","is",null).gte("probation_end_date",today).lte("probation_end_date",in30)),
      ])
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

      // dept attendance today
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

      // late leaderboard this month
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

      // probation ending soon
      const {data:probRaw}=await fe(
        supabase.from("employees").select(`id,first_name_th,last_name_th,avatar_url,probation_end_date,position:positions(name)`)
          .eq("is_active",true).not("probation_end_date","is",null).gte("probation_end_date",today).lte("probation_end_date",in30).order("probation_end_date").limit(5)
      )
      setProbList((probRaw??[]).map((e:any)=>({id:e.id,name:`${e.first_name_th} ${e.last_name_th}`,avatar_url:e.avatar_url,position:e.position?.name,probation_end_date:e.probation_end_date,daysLeft:differenceInDays(new Date(e.probation_end_date),new Date())})))

      // pending leave list
      const {data:plRaw}=await fc(
        supabase.from("leave_requests")
          .select(`id,start_date,end_date,total_days,
            employee:employees!leave_requests_employee_id_fkey(first_name_th,last_name_th,avatar_url),
            leave_type:leave_types(name,color_hex)`)
          .eq("status","pending").order("created_at",{ascending:false}).limit(5)
      )
      setPendLeaves((plRaw??[]).map((r:any)=>({id:r.id,name:`${r.employee?.first_name_th} ${r.employee?.last_name_th}`,avatar_url:r.employee?.avatar_url,leave_type:r.leave_type?.name||"ลา",color:r.leave_type?.color_hex||"#6366f1",start_date:r.start_date,days:r.total_days})))

      // company stats (super_admin, no filter selected)
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
  },[companyId,isSA,myCompanyId,companies,today,monthStart,in30])

  useEffect(()=>{load()},[load])

  const totalToday=kpi.presentToday+kpi.lateToday+kpi.absentToday
  const pendTotal =kpi.pendingLeave+kpi.pendingAdj

  const Avatar=({url,name,size="w-9 h-9"}:{url?:string;name:string;size?:string})=>(
    <div className={`${size} rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0 overflow-hidden`}>
      {url?<img src={url} alt="" className="w-full h-full object-cover"/>:name[0]}
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ภาพรวมระบบ</h2>
          <p className="text-slate-400 text-sm">{format(new Date(),"EEEE d MMMM yyyy",{locale:th})}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Company cards (super_admin, all) */}
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

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          {l:"พนักงาน",       v:kpi.totalEmp,     icon:Users,        bg:"bg-indigo-50", ic:"text-indigo-500", vc:"text-indigo-700"},
          {l:"มาวันนี้",      v:kpi.presentToday, icon:CheckCircle,  bg:"bg-green-50",  ic:"text-green-500",  vc:"text-green-700"},
          {l:"มาสาย",         v:kpi.lateToday,    icon:Timer,        bg:"bg-amber-50",  ic:"text-amber-500",  vc:"text-amber-700"},
          {l:"ขาดงาน",        v:kpi.absentToday,  icon:XCircle,      bg:"bg-red-50",    ic:"text-red-500",    vc:"text-red-700"},
          {l:"รออนุมัติลา",  v:kpi.pendingLeave, icon:Calendar,     bg:"bg-orange-50", ic:"text-orange-500", vc:"text-orange-700"},
          {l:"รอแก้เวลา",    v:kpi.pendingAdj,   icon:AlertCircle,  bg:"bg-yellow-50", ic:"text-yellow-600", vc:"text-yellow-700"},
          {l:"พนักงานใหม่",  v:kpi.newHires,     icon:UserPlus,     bg:"bg-sky-50",    ic:"text-sky-500",    vc:"text-sky-700"},
          {l:"ใกล้หมดทดลอง", v:kpi.probCount,    icon:AlertTriangle,bg:"bg-rose-50",   ic:"text-rose-500",   vc:"text-rose-700"},
        ].map(k=>(
          <div key={k.l} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
            <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-2.5`}>
              <k.icon size={14} className={k.ic}/>
            </div>
            <p className={`text-xl font-black ${k.vc}`}>{k.v.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-semibold">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Donut + Weekly chart */}
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

      {/* Today checkins + Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm">เช็คอินวันนี้</h3>
            <Link href="/admin/attendance" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">ดูทั้งหมด<ChevronRight size={12}/></Link>
          </div>
          {loading?(<div className="px-5 py-10 text-center"><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"/></div>
          ):checkins.length===0?(<div className="px-5 py-10 text-center text-slate-300 text-sm">ยังไม่มีการเช็คอินวันนี้</div>):(
            <div className="divide-y divide-slate-50">
              {checkins.map(a=>(
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
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

      {/* Pending Leave + Late board + Probation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pending leaves */}
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

        {/* Late leaderboard */}
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

        {/* Probation ending soon */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-500"/> ใกล้หมดทดลองงาน
              {kpi.probCount>0&&<span className="text-[10px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{kpi.probCount}</span>}
            </h3>
          </div>
          {probList.length===0?(
            <div className="px-5 py-10 text-center text-slate-300 text-sm">ไม่มีในช่วง 30 วันนี้</div>
          ):(
            <div className="divide-y divide-slate-50">
              {probList.map(emp=>(
                <Link key={emp.id} href={`/admin/employees/${emp.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                    {emp.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.position}</p>
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

    </div>
  )
}