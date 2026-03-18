"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, RefreshCw, AlertCircle, Check, X,
  Clock, Users, TrendingUp, AlertTriangle,
  Search, ChevronLeft, ChevronRight,
  Building2, GitBranch, BarChart2, List, Camera,
} from "lucide-react"
import Link from "next/link"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { th } from "date-fns/locale"
import { statusToTH } from "@/lib/utils/attendance"
import toast from "react-hot-toast"

const PER = 30
type ViewMode = "department" | "branch" | "company"
type GroupRow = { key:string; label:string; employees:number; present:number; late:number; absent:number; leave:number; totalDays:number }
type SummaryEmpRow = { employee_code:string; name:string; dept:string; branch:string; present:number; late:number; absent:number; leave:number; lateMinutes:number }

// ── helpers ───────────────────────────────────────────────────────
const safeFmt = (ts:string|null|undefined, fmt:string) => {
  if (!ts) return "--:--"
  try { return format(new Date(ts), fmt) } catch { return "--:--" }
}

// ── Status badge ──────────────────────────────────────────────────
const STATUS_STYLE: Record<string,{bg:string;text:string;dot:string}> = {
  present: {bg:"bg-emerald-50",text:"text-emerald-700",dot:"bg-emerald-500"},
  late:    {bg:"bg-amber-50",  text:"text-amber-700",  dot:"bg-amber-500"  },
  absent:  {bg:"bg-rose-50",   text:"text-rose-700",   dot:"bg-rose-500"   },
  leave:   {bg:"bg-violet-50", text:"text-violet-700", dot:"bg-violet-500" },
  wfh:     {bg:"bg-sky-50",    text:"text-sky-700",    dot:"bg-sky-500"    },
  holiday: {bg:"bg-slate-50",  text:"text-slate-500",  dot:"bg-slate-400"  },
  day_off: {bg:"bg-slate-50",  text:"text-slate-500",  dot:"bg-slate-400"  },
}
function StatusBadge({status}:{status:string}) {
  const s = STATUS_STYLE[status] ?? {bg:"bg-slate-50",text:"text-slate-500",dot:"bg-slate-400"}
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      {statusToTH(status)}
    </span>
  )
}

// ── Excel export (รายการ) ─────────────────────────────────────────
function exportRecordsXLS(records:any[], dateFrom:string, dateTo:string) {
  const esc = (s:any) => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  const th_ = (s:string) => `<td style="background:#2A505A;color:#fff;font-weight:bold;border:1px solid #ccc;padding:6px 10px;white-space:nowrap">${esc(s)}</td>`
  const td_ = (s:any,center=false,color="#1e293b") => `<td style="border:1px solid #e2e8f0;padding:5px 9px;${center?"text-align:center;":""}color:${color}">${esc(s)}</td>`
  const rows = records.map(r=>`<tr>
    ${td_(safeFmt(r.work_date+"T00:00:00","d MMM yyyy"))}
    ${td_(r.employee?.employee_code)}
    ${td_(r.employee?.first_name_th+" "+r.employee?.last_name_th,false,"#0f172a")}
    ${td_(r.employee?.department?.name||"-")}
    ${td_(r.employee?.position?.name||"-")}
    ${td_(safeFmt(r.clock_in,"HH:mm"),true)}
    ${td_(safeFmt(r.clock_out,"HH:mm"),true)}
    ${td_(r.late_minutes>0?r.late_minutes+"น.":"-",true,r.late_minutes>0?"#d97706":"#94a3b8")}
    ${td_(r.ot_minutes>0?r.ot_minutes+"น.":"-",true,r.ot_minutes>0?"#2563eb":"#94a3b8")}
    ${td_(statusToTH(r.status),true)}
  </tr>`).join("")
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"/>
  <style>body{font-family:Tahoma,sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}</style></head><body>
  <p style="font-size:14px;font-weight:bold;color:#2A505A">รายงานการเข้างาน</p>
  <p style="color:#64748b;margin-bottom:12px">ช่วงเวลา: ${safeFmt(dateFrom+"T00:00:00","d MMM yyyy")} – ${safeFmt(dateTo+"T00:00:00","d MMM yyyy")}</p>
  <table><thead><tr>${th_("วันที่")}${th_("รหัส")}${th_("ชื่อ-สกุล")}${th_("แผนก")}${th_("ตำแหน่ง")}${th_("เข้างาน")}${th_("ออกงาน")}${th_("สาย")}${th_("OT")}${th_("สถานะ")}</tr></thead>
  <tbody>${rows}</tbody></table></body></html>`
  const blob=new Blob(["\uFEFF"+html],{type:"application/vnd.ms-excel;charset=utf-8"})
  const url=URL.createObjectURL(blob)
  const a=document.createElement("a"); a.href=url; a.download=`attendance_${dateFrom}_${dateTo}.xls`; a.click()
  URL.revokeObjectURL(url)
}

// ── Excel export (สรุป) ───────────────────────────────────────────
function exportSummaryXLS(title:string, summary:GroupRow[], detail:SummaryEmpRow[], period:string) {
  const esc=(s:any)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  const th_=(s:string,bg="#2A505A")=>`<td style="background:${bg};color:#fff;font-weight:bold;border:1px solid #ccc;padding:6px 10px;white-space:nowrap">${esc(s)}</td>`
  const td_=(s:any,center=false,bold=false,color="#1e293b")=>`<td style="border:1px solid #e2e8f0;padding:5px 9px;${center?"text-align:center;":""}${bold?"font-weight:bold;":""}color:${color}">${esc(s)}</td>`
  const sRows=summary.map(r=>`<tr>
    ${td_(r.label,false,true)} ${td_(r.employees,true,true,"#0f172a")}
    ${td_(r.present,true,false,"#16a34a")} ${td_(r.late,true,false,"#d97706")}
    ${td_(r.absent,true,false,"#dc2626")} ${td_(r.leave,true,false,"#7c3aed")}
    ${td_(r.totalDays>0?Math.round((r.present+r.late)/r.totalDays*100)+"%":"-",true,true)}
  </tr>`).join("")
  const dRows=detail.map(r=>`<tr>
    ${td_(r.employee_code)} ${td_(r.name,false,true)} ${td_(r.dept)} ${td_(r.branch)}
    ${td_(r.present,true,false,"#16a34a")} ${td_(r.late,true,false,"#d97706")}
    ${td_(r.absent,true,false,"#dc2626")} ${td_(r.leave,true,false,"#7c3aed")}
    ${td_(r.lateMinutes>0?r.lateMinutes+"น.":"-",true)}
  </tr>`).join("")
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head><meta charset="UTF-8"/><style>body{font-family:Tahoma,sans-serif;font-size:11px}table{border-collapse:collapse;margin-bottom:20px;width:100%}
  .sh{font-size:12px;font-weight:bold;background:#f8fafc;padding:6px;margin-top:16px;color:#2A505A;border-left:3px solid #2A505A}</style></head><body>
  <p style="font-size:14px;font-weight:bold;color:#2A505A">${esc(title)}</p>
  <p style="color:#64748b;margin-bottom:12px">ช่วงเวลา: ${esc(period)} · ออกรายงาน: ${format(new Date(),"d MMMM yyyy HH:mm",{locale:th})}</p>
  <p class="sh">📊 สรุปตามกลุ่ม</p>
  <table><thead><tr>${th_("กลุ่ม")}${th_("พนักงาน","#334155")}${th_("มาทำงาน","#16a34a")}${th_("มาสาย","#d97706")}${th_("ขาดงาน","#dc2626")}${th_("ลา","#7c3aed")}${th_("อัตราเข้างาน","#0891b2")}</tr></thead>
  <tbody>${sRows}</tbody></table>
  <p class="sh">👤 รายละเอียดรายบุคคล</p>
  <table><thead><tr>${th_("รหัส")}${th_("ชื่อ-สกุล")}${th_("แผนก")}${th_("สาขา")}${th_("มาทำงาน","#16a34a")}${th_("มาสาย","#d97706")}${th_("ขาดงาน","#dc2626")}${th_("ลา","#7c3aed")}${th_("รวมนาทีสาย","#ea580c")}</tr></thead>
  <tbody>${dRows}</tbody></table></body></html>`
  const blob=new Blob(["\uFEFF"+html],{type:"application/vnd.ms-excel;charset=utf-8"})
  const url=URL.createObjectURL(blob)
  const a=document.createElement("a"); a.href=url
  a.download=`attendance_summary_${format(new Date(),"yyyyMMdd_HHmm")}.xls`; a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────────
export default function AdminAttendancePage() {
  const {user, loading:authLoading} = useAuth()
  const supabase = useRef(createClient()).current
  const companyId:string|null = (user as any)?.company_id??(user as any)?.employee?.company_id??null
  const isSuperAdmin = (user as any)?.role==="super_admin"

  const today = format(new Date(),"yyyy-MM-dd")
  const [activeTab, setActiveTab] = useState<"list"|"summary">("list")

  // ── shared state ──────────────────────────────────────────────
  const [companies,    setCompanies]    = useState<any[]>([])
  const [departments,  setDepartments]  = useState<any[]>([])
  const [selCompany,   setSelCompany]   = useState("")

  // ── list tab state ────────────────────────────────────────────
  const [records,      setRecords]      = useState<any[]>([])
  const [loadingList,  setLoadingList]  = useState(false)
  const [errList,      setErrList]      = useState<string|null>(null)
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(0)
  const [adjReqs,      setAdjReqs]      = useState<any[]>([])
  const [kpi,          setKpi]          = useState({present:0,late:0,absent:0,leave:0})
  const [exporting,    setExporting]    = useState(false)
  const [offsitePending, setOffsitePending] = useState(0)
  const [listFilters,  setListFilters]  = useState({
    start:  format(subDays(new Date(),7),"yyyy-MM-dd"),
    end:    today, status:"", dept:"", search:"",
  })

  // ── summary tab state ─────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState<ViewMode>("department")
  const [sumFrom,      setSumFrom]      = useState(format(startOfMonth(new Date()),"yyyy-MM-dd"))
  const [sumTo,        setSumTo]        = useState(format(endOfMonth(new Date()),"yyyy-MM-dd"))
  const [sumSearch,    setSumSearch]    = useState("")
  const [summaryRows,  setSummaryRows]  = useState<GroupRow[]>([])
  const [summaryEmps,  setSummaryEmps]  = useState<SummaryEmpRow[]>([])
  const [loadingSum,   setLoadingSum]   = useState(false)
  const [sumKpi,       setSumKpi]       = useState({totalEmp:0,presentDays:0,lateDays:0,absentDays:0,leaveDays:0})

  const activeCid = isSuperAdmin ? (selCompany || companyId || "") : (companyId || "")

  // load companies + departments
  useEffect(() => {
    if (!activeCid) return
    if (isSuperAdmin)
      supabase.from("companies").select("id,name_th").eq("is_active",true).order("name_th")
        .then(({data})=>setCompanies(data??[]))
    supabase.from("departments").select("id,name").eq("company_id",activeCid).order("name")
      .then(({data})=>setDepartments(data??[]))
  }, [activeCid, isSuperAdmin])

  // ── LIST: load kpi today ──────────────────────────────────────
  const loadKpi = useCallback(async()=>{
    if(!activeCid) return
    const [r0,r1,r2,r3,osRes] = await Promise.all([
      supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",activeCid).eq("work_date",today).eq("status","present"),
      supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",activeCid).eq("work_date",today).eq("status","late"),
      supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",activeCid).eq("work_date",today).eq("status","absent"),
      supabase.from("attendance_records").select("id",{count:"exact",head:true}).eq("company_id",activeCid).eq("work_date",today).eq("status","leave"),
      supabase.from("offsite_checkin_requests").select("id",{count:"exact",head:true}).eq("company_id",activeCid).eq("status","pending"),
    ])
    setKpi({present:r0.count??0,late:r1.count??0,absent:r2.count??0,leave:r3.count??0})
    setOffsitePending(osRes.count??0)
  },[activeCid,today])

  // ── LIST: load records ────────────────────────────────────────
  const loadList = useCallback(async()=>{
    if(!activeCid) return
    setLoadingList(true); setErrList(null)
    let q = supabase.from("attendance_records")
      .select(`*,employee:employees!attendance_records_employee_id_fkey(
        id,first_name_th,last_name_th,employee_code,
        department:departments(id,name),position:positions(name))`,{count:"exact"})
      .eq("company_id",activeCid)
      .gte("work_date",listFilters.start).lte("work_date",listFilters.end)
      .order("work_date",{ascending:false}).order("clock_in",{ascending:false})
      .range(page*PER,(page+1)*PER-1) as any
    if(listFilters.status) q=q.eq("status",listFilters.status)
    const {data,count,error}=await q as any
    if(error){setErrList(error.message)}
    else{
      let rows=data??[]
      if(listFilters.search){
        const s=listFilters.search.toLowerCase()
        rows=rows.filter((r:any)=>r.employee?.first_name_th?.toLowerCase().includes(s)||r.employee?.last_name_th?.toLowerCase().includes(s)||r.employee?.employee_code?.toLowerCase().includes(s))
      }
      if(listFilters.dept) rows=rows.filter((r:any)=>r.employee?.department?.id===listFilters.dept)
      setRecords(rows); setTotal(count??0)
    }
    setLoadingList(false)
  },[activeCid,listFilters,page])

  const loadAdj = useCallback(async()=>{
    if(!activeCid) return
    const {data}=await (supabase.from("time_adjustment_requests")
      .select(`*,employee:employees!time_adjustment_requests_employee_id_fkey(id,first_name_th,last_name_th,department:departments(name))`)
      .eq("company_id",activeCid).eq("status","pending").order("created_at",{ascending:true}) as any)
    setAdjReqs(data??[])
  },[activeCid])

  // ── SUMMARY: fetch ────────────────────────────────────────────
  const loadSummary = useCallback(async()=>{
    if(!activeCid) return
    setLoadingSum(true)
    try{
      const [{data:emps},{data:atts},{data:leaves}]=await Promise.all([
        supabase.from("employees").select("id,employee_code,first_name_th,last_name_th,department:departments(name),branch:branches(name)").eq("company_id",activeCid).eq("is_active",true) as any,
        supabase.from("attendance_records").select("employee_id,status,late_minutes").eq("company_id",activeCid).gte("work_date",sumFrom).lte("work_date",sumTo),
        supabase.from("leave_requests").select("employee_id,total_days").eq("company_id",activeCid).eq("status","approved").gte("start_date",sumFrom).lte("end_date",sumTo),
      ])
      const attByEmp=new Map<string,any[]>()
      ;(atts??[]).forEach(a=>{if(!attByEmp.has(a.employee_id))attByEmp.set(a.employee_id,[]);attByEmp.get(a.employee_id)!.push(a)})
      const lvByEmp=new Map<string,number>()
      ;(leaves??[]).forEach(l=>lvByEmp.set(l.employee_id,(lvByEmp.get(l.employee_id)||0)+l.total_days))

      const detail:SummaryEmpRow[]=(emps??[]).map((e:any)=>{
        const ea=attByEmp.get(e.id)??[]
        return{employee_code:e.employee_code,name:`${e.first_name_th} ${e.last_name_th}`,
          dept:e.department?.name||"-",branch:e.branch?.name||"-",
          present:ea.filter(a=>["present","wfh"].includes(a.status)).length,
          late:ea.filter(a=>a.status==="late").length,
          absent:ea.filter(a=>a.status==="absent").length,
          leave:lvByEmp.get(e.id)??0,
          lateMinutes:ea.reduce((s:number,a:any)=>s+(a.late_minutes||0),0)}
      })

      const groupKey=(e:any)=>viewMode==="department"?(e.department?.name||"ไม่ระบุแผนก"):viewMode==="branch"?(e.branch?.name||"ไม่ระบุสาขา"):"ภาพรวมทั้งบริษัท"
      const gm=new Map<string,GroupRow>()
      ;(emps??[]).forEach((e:any)=>{
        const k=groupKey(e)
        if(!gm.has(k)) gm.set(k,{key:k,label:k,employees:0,present:0,late:0,absent:0,leave:0,totalDays:0})
        const g=gm.get(k)!; const ea=attByEmp.get(e.id)??[]
        g.employees++
        g.present+=ea.filter(a=>["present","wfh"].includes(a.status)).length
        g.late+=ea.filter(a=>a.status==="late").length
        g.absent+=ea.filter(a=>a.status==="absent").length
        g.leave+=lvByEmp.get(e.id)??0
        g.totalDays+=ea.length
      })

      setSummaryRows(Array.from(gm.values()).sort((a,b)=>b.present-a.present))
      setSummaryEmps(detail)
      const allPres=(atts??[]).filter(a=>["present","wfh","late"].includes(a.status)).length
      const allLate=(atts??[]).filter(a=>a.status==="late").length
      const allAbs=(atts??[]).filter(a=>a.status==="absent").length
      const allLv=Array.from(lvByEmp.values()).reduce((s,v)=>s+v,0)
      setSumKpi({totalEmp:emps?.length??0,presentDays:allPres,lateDays:allLate,absentDays:allAbs,leaveDays:allLv})
    }catch(e){console.error(e)}
    finally{setLoadingSum(false)}
  },[activeCid,sumFrom,sumTo,viewMode])

  // effects
  useEffect(()=>{if(!authLoading&&activeCid){loadList();loadAdj();loadKpi()}},[authLoading,activeCid,loadList,loadAdj,loadKpi])
  useEffect(()=>{if(!authLoading&&activeCid&&activeTab==="summary") loadSummary()},[authLoading,activeCid,activeTab,loadSummary])

  const approveAdj=async(req:any,action:"approved"|"rejected")=>{
    const res=await fetch("/api/attendance/approve-adjustment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request_id:req.id,action})})
    const json=await res.json()
    if(!res.ok||json.error){toast.error(json.error??"เกิดข้อผิดพลาด");return}
    toast.success(action==="approved"?"อนุมัติแล้ว":"ปฏิเสธแล้ว")
    setAdjReqs(r=>r.filter(x=>x.id!==req.id)); loadList()
  }

  const handleExportList=async()=>{
    if(!activeCid) return; setExporting(true)
    const {data}=await (supabase.from("attendance_records")
      .select(`work_date,clock_in,clock_out,status,late_minutes,ot_minutes,
        employee:employees!attendance_records_employee_id_fkey(employee_code,first_name_th,last_name_th,department:departments(name),position:positions(name))`)
      .eq("company_id",activeCid).gte("work_date",listFilters.start).lte("work_date",listFilters.end).order("work_date",{ascending:false}) as any)
    exportRecordsXLS(data??[],listFilters.start,listFilters.end); setExporting(false)
  }

  const setLF=(k:string,v:string)=>{setPage(0);setListFilters(f=>({...f,[k]:v}))}
  const setPreset=(d:number)=>{setPage(0);setListFilters(f=>({...f,start:format(subDays(new Date(),d),"yyyy-MM-dd"),end:today}))}
  const filteredEmps=summaryEmps.filter(r=>!sumSearch||r.name.toLowerCase().includes(sumSearch.toLowerCase())||r.dept.includes(sumSearch)||r.employee_code.includes(sumSearch))
  const periodLabel=`${format(new Date(sumFrom),"d MMM",{locale:th})} – ${format(new Date(sumTo),"d MMM yyyy",{locale:th})}`
  const totalPages=Math.ceil(total/PER)

  if(authLoading) return <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><RefreshCw size={18} className="animate-spin"/><span>กำลังโหลด…</span></div>
  if(!activeCid) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3"><AlertCircle size={18} className="text-red-500 mt-0.5"/><p className="font-bold text-red-700">ไม่พบ company_id — กรุณา logout แล้ว login ใหม่</p></div>

  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-800">การเข้างาน</h2>
          <p className="text-sm text-slate-400 mt-0.5">วันที่ {format(new Date(),"d MMMM yyyy",{locale:th})}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && companies.length > 0 && (
            <select value={selCompany} onChange={e=>setSelCompany(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">บริษัทของฉัน</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <button onClick={()=>{loadList();loadAdj();loadKpi()}} disabled={loadingList}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            <RefreshCw size={13} className={loadingList?"animate-spin":""}/>
          </button>
          <button onClick={activeTab==="list"?handleExportList:()=>exportSummaryXLS(`รายงานการเข้างาน – ${viewMode==="department"?"ตามแผนก":viewMode==="branch"?"ตามสาขา":"ภาพรวม"}`,summaryRows,filteredEmps,periodLabel)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-200 transition-colors">
            <Download size={14}/>{exporting?"กำลัง Export…":"Export Excel"}
          </button>
        </div>
      </div>

      {/* ── Pending offsite banner ──────────────────────────────── */}
      {offsitePending > 0 && (
        <Link href="/admin/attendance/offsite"
          className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3.5 hover:bg-slate-50 transition-colors group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}>
            <Camera size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-800">เช็คอินนอกสถานที่รออนุมัติ</p>
            <p className="text-[11px] text-slate-400">กดเพื่อตรวจสอบและอนุมัติคำขอ</p>
          </div>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-[11px] font-black text-white">
            {offsitePending}
          </span>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </Link>
      )}

      {/* ── KPI strip (วันนี้) ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:"มาวันนี้", val:kpi.present,stripe:"#10b981",icon:<TrendingUp size={14} className="text-emerald-500"/>,color:"text-emerald-700"},
          {label:"มาสาย",   val:kpi.late,   stripe:"#f59e0b",icon:<Clock size={14} className="text-amber-500"/>,       color:"text-amber-700"},
          {label:"ขาดงาน",  val:kpi.absent, stripe:"#f43f5e",icon:<AlertTriangle size={14} className="text-rose-500"/>,color:"text-rose-700"},
          {label:"ลาวันนี้",val:kpi.leave,  stripe:"#8b5cf6",icon:<Users size={14} className="text-violet-500"/>,      color:"text-violet-700"},
        ].map(k=>(
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-1 w-full" style={{background:k.stripe}}/>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className={`text-2xl font-black tabular-nums ${k.color}`}>{k.val}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{k.label}</p>
              </div>
              {k.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending adjustments ────────────────────────────────── */}
      {adjReqs.length>0&&(
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-100 bg-amber-50">
            <AlertCircle size={15} className="text-amber-500"/>
            <p className="font-black text-sm text-amber-800">คำขอแก้ไขเวลา รออนุมัติ</p>
            <span className="ml-auto text-[11px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">{adjReqs.length}</span>
          </div>
          <div className="divide-y divide-amber-50">
            {adjReqs.map(req=>(
              <div key={req.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center font-black text-amber-700 text-sm flex-shrink-0">{req.employee?.first_name_th?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{req.employee?.first_name_th} {req.employee?.last_name_th}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.employee?.department?.name&&<span className="mr-2">{req.employee.department.name}</span>}
                    {safeFmt(req.work_date+"T00:00:00","d MMM yyyy")}
                    {req.requested_clock_in&&<span className="ml-2 text-emerald-600">เข้า {safeFmt(req.requested_clock_in,"HH:mm")}</span>}
                    {req.requested_clock_out&&<span className="ml-2 text-blue-600">ออก {safeFmt(req.requested_clock_out,"HH:mm")}</span>}
                  </p>
                  {req.reason&&<p className="text-xs text-slate-400 mt-0.5 italic">"{req.reason}"</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>approveAdj(req,"rejected")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-colors"><X size={12}/>ปฏิเสธ</button>
                  <button onClick={()=>approveAdj(req,"approved")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"><Check size={12}/>อนุมัติ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {([
          {key:"list"    as const, icon:<List size={13}/>,      label:"รายการเข้างาน"},
          {key:"summary" as const, icon:<BarChart2 size={13}/>, label:"สรุปรายงาน"},
        ]).map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab===t.key?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: รายการเข้างาน
      ══════════════════════════════════════════════════════════ */}
      {activeTab==="list"&&(
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ตั้งแต่</label>
                <input type="date" value={listFilters.start} onChange={e=>setLF("start",e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ถึง</label>
                <input type="date" value={listFilters.end} onChange={e=>setLF("end",e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ช่วงเร็ว</label>
                <div className="flex gap-1.5">
                  {[{l:"วันนี้",d:0},{l:"7 วัน",d:7},{l:"30 วัน",d:30}].map(p=>(
                    <button key={p.l} onClick={()=>setPreset(p.d)}
                      className="px-2.5 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 whitespace-nowrap">{p.l}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">สถานะ</label>
                <select value={listFilters.status} onChange={e=>setLF("status",e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]">
                  <option value="">ทุกสถานะ</option>
                  {["present","late","absent","leave","wfh","holiday"].map(s=>(
                    <option key={s} value={s}>{statusToTH(s)}</option>
                  ))}
                </select>
              </div>
              {departments.length>0&&(
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">แผนก</label>
                  <select value={listFilters.dept} onChange={e=>setLF("dept",e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]">
                    <option value="">ทุกแผนก</option>
                    {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ค้นหา</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={listFilters.search} onChange={e=>setLF("search",e.target.value)}
                    placeholder="ชื่อ, รหัสพนักงาน…"
                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"/>
                </div>
              </div>
            </div>
          </div>

          {errList&&<div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2"><AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0"/><p className="text-sm text-red-600">{errList}</p></div>}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-semibold">{loadingList?"กำลังโหลด…":`${total.toLocaleString()} รายการ`}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                  {["วันที่","พนักงาน","แผนก","เข้างาน","ออกงาน","สาย","OT","สถานะ"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingList?(
                    <tr><td colSpan={8} className="px-4 py-14 text-center"><RefreshCw size={18} className="animate-spin text-slate-300 mx-auto mb-2"/><p className="text-sm text-slate-400">กำลังโหลด…</p></td></tr>
                  ):records.length===0?(
                    <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400 text-sm">ไม่พบข้อมูลในช่วงวันที่เลือก</td></tr>
                  ):records.map(r=>(
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap font-medium">{safeFmt(r.work_date+"T00:00:00","d MMM")}</td>
                      <td className="px-4 py-3.5"><p className="font-bold text-slate-800">{r.employee?.first_name_th} {r.employee?.last_name_th}</p><p className="text-[11px] text-slate-400 mt-0.5 font-mono">{r.employee?.employee_code}</p></td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.employee?.department?.name||"—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`font-black tabular-nums text-sm ${r.clock_in?"text-slate-800":"text-slate-300"}`}>{safeFmt(r.clock_in,"HH:mm")}</span>
                        {r.is_offsite_in && (
                          <span className={`inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            r.offsite_in_status==="approved" ? "bg-emerald-50 text-emerald-600"
                            : r.offsite_in_status==="rejected" ? "bg-rose-50 text-rose-500"
                            : "bg-amber-50 text-amber-600"
                          }`}>
                            <Camera size={8}/>{r.offsite_in_status==="approved"?"อนุมัติ":r.offsite_in_status==="rejected"?"ปฏิเสธ":"รอ"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-black tabular-nums text-sm ${r.clock_out?"text-slate-800":"text-slate-300"}`}>{safeFmt(r.clock_out,"HH:mm")}</span>
                        {r.is_offsite_out && (
                          <span className={`inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            r.offsite_out_status==="approved" ? "bg-emerald-50 text-emerald-600"
                            : r.offsite_out_status==="rejected" ? "bg-rose-50 text-rose-500"
                            : "bg-amber-50 text-amber-600"
                          }`}>
                            <Camera size={8}/>{r.offsite_out_status==="approved"?"อนุมัติ":r.offsite_out_status==="rejected"?"ปฏิเสธ":"รอ"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">{(r.late_minutes??0)>0?<span className="font-black text-amber-600 tabular-nums">{r.late_minutes}<span className="text-[10px] font-normal">น.</span></span>:<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5">{(r.ot_minutes??0)>0?<span className="font-bold text-blue-600 tabular-nums">{r.ot_minutes}<span className="text-[10px] font-normal">น.</span></span>:<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={r.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total>PER&&(
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">แสดง {page*PER+1}–{Math.min((page+1)*PER,total)} จาก {total.toLocaleString()}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={14}/></button>
                  <span className="text-xs text-slate-500 px-2 font-semibold">{page+1}/{totalPages}</span>
                  <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*PER>=total}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={14}/></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: สรุปรายงาน
      ══════════════════════════════════════════════════════════ */}
      {activeTab==="summary"&&(
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ตั้งแต่</label>
                <input type="date" value={sumFrom} onChange={e=>setSumFrom(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ถึง</label>
                <input type="date" value={sumTo} onChange={e=>setSumTo(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ช่วงเร็ว</label>
                <div className="flex gap-1.5">
                  {[{l:"เดือนนี้",f:()=>{setSumFrom(format(startOfMonth(new Date()),"yyyy-MM-dd"));setSumTo(format(endOfMonth(new Date()),"yyyy-MM-dd"))}},
                    {l:"เดือนก่อน",f:()=>{const p=subMonths(new Date(),1);setSumFrom(format(startOfMonth(p),"yyyy-MM-dd"));setSumTo(format(endOfMonth(p),"yyyy-MM-dd"))}}
                  ].map(p=>(
                    <button key={p.l} onClick={p.f} className="px-2.5 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 whitespace-nowrap">{p.l}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">จัดกลุ่มตาม</label>
                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  {([{v:"department" as ViewMode,icon:<Users size={12}/>,label:"แผนก"},{v:"branch" as ViewMode,icon:<GitBranch size={12}/>,label:"สาขา"},{v:"company" as ViewMode,icon:<Building2 size={12}/>,label:"ภาพรวม"}]).map(m=>(
                    <button key={m.v} onClick={()=>setViewMode(m.v)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${viewMode===m.v?"bg-slate-800 text-white":"text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={loadSummary} disabled={loadingSum}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors mt-auto">
                <RefreshCw size={14} className={loadingSum?"animate-spin":""}/>
              </button>
            </div>
          </div>

          {/* Summary KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {[
              {label:"พนักงานทั้งหมด",val:sumKpi.totalEmp,    unit:"คน",   color:"text-slate-800",  bg:"bg-slate-50",  border:"border-slate-200",  stripe:"#64748b"},
              {label:"วันมาทำงาน",    val:sumKpi.presentDays, unit:"วัน",  color:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200",stripe:"#10b981"},
              {label:"มาสาย",         val:sumKpi.lateDays,    unit:"ครั้ง",color:"text-amber-700",  bg:"bg-amber-50",  border:"border-amber-200",  stripe:"#f59e0b"},
              {label:"ขาดงาน",        val:sumKpi.absentDays,  unit:"วัน",  color:"text-rose-700",   bg:"bg-rose-50",   border:"border-rose-200",   stripe:"#f43f5e"},
              {label:"วันลาที่ใช้",   val:sumKpi.leaveDays,   unit:"วัน",  color:"text-violet-700", bg:"bg-violet-50", border:"border-violet-200", stripe:"#8b5cf6"},
            ].map(k=>(
              <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} overflow-hidden`}>
                <div className="h-1" style={{background:k.stripe}}/>
                <div className="px-4 py-3">
                  <p className={`text-2xl font-black leading-none tabular-nums ${k.color}`}>{loadingSum?"…":k.val}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{k.label} <span className="font-normal normal-case text-slate-300">({k.unit})</span></p>
                </div>
              </div>
            ))}
          </div>

          {/* Group summary table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
              {viewMode==="department"?<Users size={14} className="text-slate-400"/>:viewMode==="branch"?<GitBranch size={14} className="text-slate-400"/>:<Building2 size={14} className="text-slate-400"/>}
              <p className="font-black text-slate-800 text-sm">สรุปตาม{viewMode==="department"?"แผนก":viewMode==="branch"?"สาขา":"ภาพรวม"}</p>
              <span className="ml-auto text-xs text-slate-400">{summaryRows.length} กลุ่ม</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">กลุ่ม</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">พนักงาน</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-emerald-600">มาทำงาน</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-amber-600">มาสาย</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-rose-600">ขาดงาน</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-violet-600">ลา</th>
                  <th className="text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide text-sky-600">อัตราเข้างาน</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingSum?(
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm"><RefreshCw size={18} className="animate-spin inline mr-2"/>กำลังโหลด…</td></tr>
                  ):summaryRows.length===0?(
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>
                  ):summaryRows.map(r=>{
                    const rate=r.totalDays>0?Math.round((r.present+r.late)/r.totalDays*100):0
                    return(
                      <tr key={r.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5"><p className="font-bold text-slate-800">{r.label}</p></td>
                        <td className="text-center px-3 py-3.5"><span className="font-black text-slate-700 tabular-nums">{r.employees}</span><span className="text-slate-400 text-xs ml-1">คน</span></td>
                        <td className="text-center px-3 py-3.5"><span className="font-black text-emerald-600 tabular-nums">{r.present+r.late}</span></td>
                        <td className="text-center px-3 py-3.5"><span className={`font-black tabular-nums ${r.late>0?"text-amber-600":"text-slate-300"}`}>{r.late}</span></td>
                        <td className="text-center px-3 py-3.5"><span className={`font-black tabular-nums ${r.absent>0?"text-rose-600":"text-slate-300"}`}>{r.absent}</span></td>
                        <td className="text-center px-3 py-3.5"><span className={`font-black tabular-nums ${r.leave>0?"text-violet-600":"text-slate-300"}`}>{r.leave}</span></td>
                        <td className="text-center px-3 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${rate}%`,background:rate>=90?"#10b981":rate>=70?"#f59e0b":"#f43f5e"}}/></div>
                            <span className={`text-xs font-black tabular-nums ${rate>=90?"text-emerald-600":rate>=70?"text-amber-600":"text-rose-600"}`}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-employee detail */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-3">
              <p className="font-black text-slate-800 text-sm">รายละเอียดรายบุคคล</p>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={sumSearch} onChange={e=>setSumSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ แผนก รหัส…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-44"/>
                </div>
                <span className="text-xs text-slate-400">{filteredEmps.length} คน</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                  {["รหัส","ชื่อ-สกุล","แผนก","สาขา"].map(h=><th key={h} className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{h}</th>)}
                  {["มา","สาย","ขาด","ลา","นาทีสาย"].map((h,i)=>(
                    <th key={h} className={`text-center px-3 py-3 text-[11px] font-black uppercase tracking-wide ${["text-emerald-600","text-amber-600","text-rose-600","text-violet-600","text-orange-600"][i]}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingSum?(
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm"><RefreshCw size={18} className="animate-spin inline mr-2"/>กำลังโหลด…</td></tr>
                  ):filteredEmps.slice(0,100).map((r,i)=>(
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.employee_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.dept}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.branch}</td>
                      <td className="text-center px-3 py-3 font-black text-emerald-600 tabular-nums">{r.present}</td>
                      <td className="text-center px-3 py-3 tabular-nums"><span className={r.late>0?"font-black text-amber-600":"text-slate-300"}>{r.late}</span></td>
                      <td className="text-center px-3 py-3 tabular-nums"><span className={r.absent>0?"font-black text-rose-600":"text-slate-300"}>{r.absent}</span></td>
                      <td className="text-center px-3 py-3 tabular-nums"><span className={r.leave>0?"font-black text-violet-600":"text-slate-300"}>{r.leave}</span></td>
                      <td className="text-center px-3 py-3 tabular-nums"><span className={r.lateMinutes>0?"text-orange-600 font-bold":"text-slate-300"}>{r.lateMinutes>0?r.lateMinutes+"น.":"—"}</span></td>
                    </tr>
                  ))}
                  {filteredEmps.length>100&&<tr><td colSpan={9} className="text-center py-3 text-xs text-slate-400">แสดง 100 จาก {filteredEmps.length} คน — ใช้ Export Excel เพื่อดูทั้งหมด</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}