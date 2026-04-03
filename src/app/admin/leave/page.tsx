"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Check, X, Search, Filter, ChevronLeft, ChevronRight,
  Calendar, Download, MessageSquare, UserX, ChevronDown, ChevronUp, Eye, Paperclip,
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import Link from "next/link"

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

type MainTab = "leave" | "resignation"

const RESIGN_REASONS_MAP: Record<string,string> = {
  heavy_work:"งานหนัก/ทีมน้อย", boss:"ปัญหาหัวหน้า", low_salary:"เงินเดือนน้อย",
  study:"ศึกษาต่อ", own_biz:"ธุรกิจส่วนตัว", family:"ปัญหาครอบครัว",
  health:"ปัญหาสุขภาพ", new_job:"ได้งานใหม่", mismatch:"ไม่เหมาะสมกับตำแหน่ง",
  no_prob:"ไม่ผ่านทดลองงาน", other:"อื่นๆ",
}

// ── Reject Note Modal ──────────────────────────────────────────────────────
function RejectModal({ onConfirm, onClose }: { onConfirm:(note:string)=>void; onClose:()=>void }) {
  const [note, setNote] = useState("")
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <h3 className="font-black text-slate-800 mb-1">ปฏิเสธคำขอลา</h3>
        <p className="text-sm text-slate-400 mb-4">ระบุเหตุผลในการปฏิเสธ (ไม่บังคับ)</p>
        <textarea value={note} onChange={e=>setNote(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 resize-none h-24"
          placeholder="เหตุผล..."/>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={()=>onConfirm(note)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">ยืนยันปฏิเสธ</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLeavePage() {
  const { user }  = useAuth()
  const supabase  = createClient()
  const isSA      = user?.role==="super_admin"||user?.role==="hr_admin"

  // ── Main Tab ──────────────────────────────────────────────────────────────
  const [mainTab,  setMainTab]  = useState<MainTab>("leave")
  const [tabCounts,setTabCounts]= useState({ leave:0, resignation:0 })

  // ── Leave state ───────────────────────────────────────────────────────────
  const [requests,     setRequests]     = useState<any[]>([])
  const [leaveTypes,   setLeaveTypes]   = useState<any[]>([])
  const [companies,    setCompanies]    = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(0)
  const [selCo,        setSelCo]        = useState("")
  const [search,       setSearch]       = useState("")
  const [statusTab,    setStatusTab]    = useState("pending")
  const [ltFilter,     setLtFilter]     = useState("")
  const [dateStart,    setDateStart]    = useState(format(startOfMonth(new Date()),"yyyy-MM-dd"))
  const [dateEnd,      setDateEnd]      = useState(format(endOfMonth(new Date()),"yyyy-MM-dd"))
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [counts,       setCounts]       = useState({ pending:0, approved:0, rejected:0, cancel_requested:0, all:0 })
  const [processingId, setProcessingId] = useState<string|null>(null)
  const PER = 20

  // ── Resignation state ─────────────────────────────────────────────────────
  const [resignReqs,    setResignReqs]    = useState<any[]>([])
  const [resignFilter,  setResignFilter]  = useState("all")
  const [resignLoading, setResignLoading] = useState(false)
  const [resignNotes,   setResignNotes]   = useState<Record<string,string>>({})
  const [resignExpanded,setResignExpanded]= useState<string|null>(null)
  const [resignActing,  setResignActing]  = useState<string|null>(null)

  const myId:string|undefined = user?.employee?.company_id??(user as any)?.company_id??undefined
  const cid = isSA?(selCo||undefined):myId
  const fc  = (q:any)=>{ if(cid) return q.eq("company_id",cid); if(!isSA) return q.eq("company_id",myId!); return q }
  const fcResign = (q:any)=>{ if(cid) return q.eq("company_id",cid); if(!isSA) return q.eq("company_id",myId!); return q }

  // ── Load tab counts ───────────────────────────────────────────────────────
  const loadTabCounts = useCallback(async()=>{
    if(!isSA&&!myId) return
    const [lv, rs] = await Promise.all([
      fc(supabase.from("leave_requests").select("id",{count:"exact",head:true})).eq("status","pending"),
      (async () => {
      const {count:c1} = await fcResign(supabase.from("resignation_requests").select("id",{count:"exact",head:true})).eq("status","pending_hr")
      const {count:c2} = await fcResign(supabase.from("resignation_requests").select("id",{count:"exact",head:true})).eq("status","pending_manager")
      return { count: (c1??0)+(c2??0) }
    })()
    ])
    setTabCounts({ leave: lv.count??0, resignation: rs.count??0 })
  },[cid,isSA,myId])

  // ── Leave: load companies & leave types ───────────────────────────────────
  useEffect(()=>{ if(!isSA)return; supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th").then(({data})=>setCompanies(data??[])) },[isSA])
  useEffect(()=>{
    if(!cid&&!myId)return
    const q=cid?supabase.from("leave_types").select("id,name,color_hex").eq("company_id",cid).eq("is_active",true)
            :!isSA?supabase.from("leave_types").select("id,name,color_hex").eq("company_id",myId!).eq("is_active",true)
            :supabase.from("leave_types").select("id,name,color_hex").eq("is_active",true)
    q.order("name").then(({data})=>setLeaveTypes(data??[]))
  },[cid,isSA,myId])

  // ── Leave: load counts ────────────────────────────────────────────────────
  const loadCounts = useCallback(async()=>{
    if(!isSA&&!myId)return
    const res=await Promise.all(["pending","approved","rejected",""].map(s=>{
      let q=fc(supabase.from("leave_requests").select("id",{count:"exact",head:true}))
      if(s) q=q.eq("status",s)
      if(ltFilter) q=q.eq("leave_type_id",ltFilter)
      if(s !== "pending") {
        if(dateStart) q=q.gte("start_date",dateStart)
        if(dateEnd)   q=q.lte("end_date",dateEnd)
      }
      return q
    }))
    // Count cancel_requested via API (bypasses RLS)
    let crCount = 0
    try {
      const crRes = await fetch("/api/requests/cancel")
      const crData = await crRes.json()
      crCount = crData.requests?.length ?? 0
    } catch {}
    setCounts({ pending:res[0].count??0, approved:res[1].count??0, rejected:res[2].count??0, cancel_requested:crCount, all:res[3].count??0 })
  },[cid,isSA,myId,ltFilter,dateStart,dateEnd])

  // ── Leave: load requests ──────────────────────────────────────────────────
  const load = useCallback(async()=>{
    if(!isSA&&!myId)return
    setLoading(true)
    try{
      // Special case: cancel_requested → use API
      if(statusTab === "cancel_requested") {
        const crRes = await fetch("/api/requests/cancel")
        const crData = await crRes.json()
        const crReqs = (crData.requests ?? []).filter((r:any) => r.request_type === "leave")
        setRequests(crReqs)
        setTotal(crReqs.length)
        setLoading(false)
        return
      }

      let q=fc(supabase.from("leave_requests")
        .select(`id,employee_id,leave_type_id,company_id,
          start_date,end_date,total_days,is_half_day,half_day_period,
          reason,status,requested_at,reviewed_at,review_note,created_at,attachment_url,attachment_name,
          employee:employees!leave_requests_employee_id_fkey(
            id,first_name_th,last_name_th,employee_code,avatar_url,
            position:positions(name),department:departments(name)),
          leave_type:leave_types(id,name,color_hex,is_paid)`,
          {count:"exact"})
        .order("created_at",{ascending:false})
        .range(page*PER,(page+1)*PER-1))
      if(statusTab) {
        q=q.eq("status",statusTab)
      }
      if(ltFilter)  q=q.eq("leave_type_id",ltFilter)
      if(statusTab !== "pending" && statusTab !== "cancel_requested") {
        if(dateStart) q=q.gte("start_date",dateStart)
        if(dateEnd)   q=q.lte("end_date",dateEnd)
      }
      if(search)    q=q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`,{referencedTable:"employees"})
      const{data,count,error}=await q
      if(error) console.error("leave:",error)
      setRequests(data??[]); setTotal(count??0)
    }finally{ setLoading(false) }
  },[cid,isSA,myId,statusTab,ltFilter,dateStart,dateEnd,search,page])

  // ── Resignation: load ─────────────────────────────────────────────────────
  const loadResign = useCallback(async()=>{
    if(!isSA&&!myId) return
    setResignLoading(true)
    let q = fcResign(supabase.from("resignation_requests")
      .select(`*, employee:employees!resignation_requests_employee_id_fkey(
        id,first_name_th,last_name_th,employee_code,avatar_url,hire_date,
        position:positions(name),department:departments(name))`)
      .order("created_at",{ascending:false}))
    if(resignFilter !== "all") q = q.eq("status", resignFilter)
    const { data } = await q
    setResignReqs(data??[])
    setResignLoading(false)
  },[cid,isSA,myId,resignFilter])

  useEffect(()=>{ if(mainTab==="leave")      { load(); loadCounts() } },[load,loadCounts,mainTab])
  useEffect(()=>{ if(mainTab==="resignation") loadResign() },[loadResign,mainTab])
  useEffect(()=>{ loadTabCounts() },[loadTabCounts])
  const setF=(fn:()=>void)=>{ fn(); setPage(0) }

  // ── Handle leave approve / reject ─────────────────────────────────────────
  const handle=async(id:string, action:"approved"|"rejected", note="")=>{
    setProcessingId(id)
    try{
      const{error}=await supabase.from("leave_requests").update({
        status:action, reviewed_by:user?.employee_id,
        reviewed_at:new Date().toISOString(),
        ...(note&&{review_note:note})
      }).eq("id",id)
      if(error){toast.error(error.message);return}
      const item=requests.find(r=>r.id===id)
      if(item){
        // update leave balance
        if(action==="approved"){
          try{
            const{data:bal}=await supabase.from("leave_balances")
              .select("id,used_days,pending_days,remaining_days")
              .eq("employee_id",item.employee_id).eq("leave_type_id",item.leave_type_id)
              .eq("year",new Date(item.start_date).getFullYear()).maybeSingle()
            if(bal){
              await supabase.from("leave_balances").update({
                used_days:    (bal.used_days||0) + item.total_days,
                pending_days: Math.max((bal.pending_days||0) - item.total_days, 0),
                remaining_days: Math.max((bal.remaining_days||0) - item.total_days, 0),
              }).eq("id",bal.id)
            }
          }catch(_){}
        } else if(action==="rejected"){
          try{
            const{data:bal}=await supabase.from("leave_balances")
              .select("id,pending_days,remaining_days")
              .eq("employee_id",item.employee_id).eq("leave_type_id",item.leave_type_id)
              .eq("year",new Date(item.start_date).getFullYear()).maybeSingle()
            if(bal){
              await supabase.from("leave_balances").update({
                pending_days: Math.max((bal.pending_days||0) - item.total_days, 0),
                remaining_days: (bal.remaining_days||0) + item.total_days,
              }).eq("id",bal.id)
            }
          }catch(_){}
        }
        try{
          await supabase.from("notifications").insert({
            employee_id:item.employee_id, type:"leave",
            title:action==="approved"?"ใบลาของคุณได้รับการอนุมัติ":"ใบลาของคุณถูกปฏิเสธ",
            body:`${item.leave_type?.name||"ลา"} ${format(new Date(item.start_date),"d MMM",{locale:th})}${item.start_date!==item.end_date?" - "+format(new Date(item.end_date),"d MMM",{locale:th}):""}${note?" · "+note:""}`,
          })
        }catch(_){}
      }
      toast.success(action==="approved"?"✓ อนุมัติแล้ว":"✗ ปฏิเสธแล้ว")
      setRejectTarget(null)
      load(); loadCounts(); loadTabCounts()
    }finally{ setProcessingId(null) }
  }

  // ── Handle resignation approve / reject (HR final step) ───────────────────
  const handleResign = async(id:string, action:"approved"|"rejected")=>{
    setResignActing(id)
    try{
      const newStatus = action==="approved" ? "approved" : "rejected"
      const{error}=await supabase.from("resignation_requests").update({
        status:          newStatus,
        hr_id:           user?.employee_id,
        hr_approved_at:  new Date().toISOString(),
        hr_note:         resignNotes[id] || null,
      }).eq("id",id)
      if(error){toast.error(error.message);return}

      const item = resignReqs.find(r=>r.id===id)
      if(item){
        // update employee status on final approval
        if(action==="approved"){
          await supabase.from("employees").update({ employment_status:"resigned" }).eq("id", item.employee_id)
        }
        await supabase.from("notifications").insert({
          employee_id: item.employee_id,
          type:"resignation",
          title: action==="approved" ? "ใบลาออกได้รับการอนุมัติแล้ว" : "ใบลาออกถูกปฏิเสธโดย HR",
          body: resignNotes[id] || "",
        })
      }
      toast.success(action==="approved" ? "✅ อนุมัติใบลาออก — อัพเดตสถานะพนักงานแล้ว" : "ปฏิเสธใบลาออกแล้ว")
      loadResign(); loadTabCounts()
    }finally{ setResignActing(null) }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV=async()=>{
    const{data}=await fc(supabase.from("leave_requests")
      .select(`start_date,end_date,total_days,status,reason,requested_at,review_note,
        employee:employees!leave_requests_employee_id_fkey(employee_code,first_name_th,last_name_th,department:departments(name)),
        leave_type:leave_types(name)`)
      .order("created_at",{ascending:false}))
    if(!data)return
    const hdr=["รหัส","ชื่อ","นามสกุล","แผนก","ประเภทลา","เริ่ม","สิ้นสุด","จำนวน(วัน)","เหตุผล","สถานะ","วันที่ขอ","หมายเหตุผู้อนุมัติ"]
    const rows=data.map((r:any)=>[
      r.employee?.employee_code, r.employee?.first_name_th, r.employee?.last_name_th,
      (r.employee?.department as any)?.name, (r.leave_type as any)?.name,
      r.start_date, r.end_date, r.total_days, r.reason||"",
      {pending:"รออนุมัติ",approved:"อนุมัติ",rejected:"ปฏิเสธ",cancelled:"ยกเลิก",cancel_requested:"ขอยกเลิก"}[r.status as string]||r.status,
      r.requested_at?format(new Date(r.requested_at),"dd/MM/yyyy"):"",
      r.review_note||"",
    ])
    const csv=[hdr,...rows].map(r=>r?.join(",")).join("\n")
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"})
    const url=URL.createObjectURL(blob); const a=document.createElement("a")
    a.href=url; a.download=`leave_requests_${format(new Date(),"yyyyMMdd")}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const STATUS_TABS=[
    {v:"pending",          l:"รออนุมัติ",   c:"bg-amber-100 text-amber-700",   n:counts.pending},
    {v:"cancel_requested", l:"ขอยกเลิก",   c:"bg-orange-100 text-orange-700", n:counts.cancel_requested},
    {v:"approved",         l:"อนุมัติแล้ว", c:"bg-green-100 text-green-700",   n:counts.approved},
    {v:"rejected",         l:"ปฏิเสธ",      c:"bg-red-100 text-red-600",       n:counts.rejected},
    {v:"",                 l:"ทั้งหมด",     c:"bg-slate-100 text-slate-600",   n:counts.all},
  ]

  const resignStatusLabel=(s:string)=>({
    pending_manager:"รอหัวหน้า", pending_hr:"รอ HR", approved:"อนุมัติแล้ว", rejected:"ปฏิเสธ",
  } as any)[s]??s
  const resignStatusColor=(s:string)=>({
    pending_manager:"bg-amber-100 text-amber-700",
    pending_hr:"bg-sky-100 text-sky-700",
    approved:"bg-emerald-100 text-emerald-700",
    rejected:"bg-rose-100 text-rose-700",
  } as any)[s]??"bg-slate-100 text-slate-500"

  return (
    <div className="space-y-5">
      {rejectTarget&&<RejectModal onConfirm={note=>handle(rejectTarget.id,"rejected",note)} onClose={()=>setRejectTarget(null)}/>}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">การลา & ใบลาออก</h2>
          <p className="text-slate-400 text-sm">{mainTab==="leave" ? `${total.toLocaleString()} รายการ` : `${resignReqs.length} รายการ`}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSA&&companies.length>0&&mainTab==="leave"&&(
            <select value={selCo} onChange={e=>{setSelCo(e.target.value);setPage(0)}} className={inp}>
              <option value="">ทุกบริษัท</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          {mainTab==="leave"&&(
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={14}/> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {([
          { k:"leave"       as MainTab, label:"ใบลา" },
          { k:"resignation" as MainTab, label:"ใบลาออก" },
        ]).map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)}
            className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${mainTab===t.k?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {t.k==="resignation"&&<UserX size={13}/>}
            {t.label}
            {tabCounts[t.k] > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {tabCounts[t.k]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LEAVE TAB                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab==="leave"&&(
        <>
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(t=>(
              <button key={t.v} onClick={()=>setF(()=>setStatusTab(t.v))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${statusTab===t.v?"bg-indigo-600 text-white shadow-sm":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {t.l}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${statusTab===t.v?"bg-white/20 text-white":t.c}`}>{t.n}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
            <Filter size={13} className="text-slate-400 flex-shrink-0"/>
            <div className="relative flex-1 min-w-40">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e=>setF(()=>setSearch(e.target.value))} className={inp+" pl-8 w-full"} placeholder="ค้นหาชื่อ, รหัสพนักงาน..."/>
            </div>
            <select value={ltFilter} onChange={e=>setF(()=>setLtFilter(e.target.value))} className={inp}>
              <option value="">ทุกประเภทลา</option>
              {leaveTypes.map(lt=><option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </select>
            <input type="date" value={dateStart} onChange={e=>setF(()=>setDateStart(e.target.value))} className={inp}/>
            <input type="date" value={dateEnd}   onChange={e=>setF(()=>setDateEnd(e.target.value))}   className={inp}/>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["พนักงาน","ประเภทลา","ช่วงวันที่","จำนวน","เหตุผล","วันที่ขอ","สถานะ",""].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading?(
                    <tr><td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/> กำลังโหลด...
                      </div>
                    </td></tr>
                  ):requests.length===0?(
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400"><Calendar size={32} className="mx-auto mb-2 text-slate-200"/> ไม่พบรายการ</td></tr>
                  ):requests.map(r=>{
                    const emp=r.employee as any
                    const lt=r.leave_type as any
                    const isProcessing=processingId===r.id
                    return(
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                              {emp?.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp?.first_name_th?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 whitespace-nowrap text-sm">{emp?.first_name_th} {emp?.last_name_th}</p>
                              <p className="text-[10px] text-slate-400">{emp?.department?.name||emp?.position?.name||emp?.employee_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:lt?.color_hex||"#6366f1"}}/>
                            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{lt?.name||"ลา"}</span>
                            {lt?.is_paid===false&&<span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1 rounded">ไม่ได้รับเงิน</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-700">
                            {format(new Date(r.start_date),"d MMM",{locale:th})}
                            {r.start_date!==r.end_date&&<span className="text-slate-400 mx-1">–</span>}
                            {r.start_date!==r.end_date&&format(new Date(r.end_date),"d MMM yyyy",{locale:th})}
                            {r.start_date===r.end_date&&format(new Date(r.start_date)," yyyy",{locale:th})}
                          </p>
                          {r.is_half_day&&<p className="text-[10px] text-slate-400">ครึ่งวัน{r.half_day_period==="morning"?" (เช้า)":" (บ่าย)"}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-black text-slate-700">{r.total_days}</span>
                          <span className="text-xs text-slate-400 ml-0.5">วัน</span>
                        </td>
                        <td className="px-4 py-3 max-w-40">
                          <p className="text-xs text-slate-500 truncate">{r.reason||<span className="text-slate-300">—</span>}</p>
                          {r.review_note&&<p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><MessageSquare size={9}/> {r.review_note}</p>}
                          {r.attachment_url&&<a href={r.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-blue-500 hover:text-blue-700 font-semibold"><Paperclip size={9}/>{r.attachment_name||"ไฟล์แนบ"}</a>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {format(new Date(r.requested_at||r.created_at),"d MMM yyyy",{locale:th})}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            r.status==="pending"?"bg-amber-100 text-amber-700":
                            r.status==="approved"?"bg-green-100 text-green-700":
                            r.status==="rejected"?"bg-red-100 text-red-600":
                            r.status==="approved"&&(r.review_note||"").includes("CANCEL_REQ")?"bg-orange-100 text-orange-700":
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {r.status==="pending"?"รออนุมัติ":r.status==="approved"&&(r.review_note||"").includes("CANCEL_REQ")?"ขอยกเลิก":r.status==="approved"?"อนุมัติแล้ว":r.status==="rejected"?"ปฏิเสธ":"ยกเลิก"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status==="pending"&&(
                            <div className="flex gap-2 whitespace-nowrap">
                              <button onClick={()=>setRejectTarget(r)} disabled={isProcessing}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                                <X size={11}/> ปฏิเสธ
                              </button>
                              <button onClick={()=>handle(r.id,"approved")} disabled={isProcessing}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                                {isProcessing?<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/>:<Check size={11}/>} อนุมัติ
                              </button>
                            </div>
                          )}
                          {r.status==="approved"&&(r.review_note||"").includes("CANCEL_REQ")&&(
                            <div className="flex gap-2 whitespace-nowrap">
                              <button onClick={async()=>{
                                setProcessingId(r.id)
                                const res=await fetch("/api/requests/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reject_cancel",request_id:r.id,request_type:"leave"})})
                                const d=await res.json()
                                setProcessingId(null)
                                if(d.success){toast.success("ปฏิเสธการยกเลิก — คงอนุมัติ");load();loadCounts()}else toast.error(d.error)
                              }} disabled={isProcessing}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50">
                                <X size={11}/> ไม่ยกเลิก
                              </button>
                              <button onClick={async()=>{
                                setProcessingId(r.id)
                                const res=await fetch("/api/requests/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve_cancel",request_id:r.id,request_type:"leave"})})
                                const d=await res.json()
                                setProcessingId(null)
                                if(d.success){toast.success("ยกเลิกคำขอลาแล้ว");load();loadCounts()}else toast.error(d.error)
                              }} disabled={isProcessing}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50">
                                {isProcessing?<div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/>:<Check size={11}/>} อนุมัติยกเลิก
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {total>PER&&(
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-400 text-xs">{page*PER+1}–{Math.min((page+1)*PER,total)} จาก {total.toLocaleString()}</span>
                <div className="flex gap-2">
                  <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={12}/> ก่อนหน้า</button>
                  <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*PER>=total} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">ถัดไป <ChevronRight size={12}/></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RESIGNATION TAB                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab==="resignation"&&(
        <>
          {/* filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { v:"all",            l:"ทั้งหมด" },
              { v:"pending_manager",l:"รอหัวหน้า" },
              { v:"pending_hr",     l:"รอ HR อนุมัติ" },
              { v:"approved",       l:"อนุมัติแล้ว" },
              { v:"rejected",       l:"ปฏิเสธ" },
            ].map(f=>(
              <button key={f.v} onClick={()=>setResignFilter(f.v)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${resignFilter===f.v?"bg-[#2A505A] text-white":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f.l}
              </button>
            ))}
          </div>

          {resignLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : resignReqs.length===0 ? (
            <div className="text-center py-16 text-slate-400">
              <UserX size={40} className="mx-auto mb-3 text-slate-200" strokeWidth={1.5}/>
              <p className="text-sm">ไม่พบข้อมูลใบลาออก</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resignReqs.map(r=>(
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* stripe header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center font-black text-rose-600 text-sm flex-shrink-0 overflow-hidden">
                        {r.employee?.avatar_url
                          ? <img src={r.employee.avatar_url} alt="" className="w-full h-full object-cover"/>
                          : r.employee?.first_name_th?.[0]}
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-800">{r.employee?.first_name_th} {r.employee?.last_name_th}</p>
                        <p className="text-xs text-slate-400">{r.employee?.position?.name} · {r.employee?.department?.name} · {r.employee?.employee_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-xl text-[11px] font-bold ${resignStatusColor(r.status)}`}>
                        {resignStatusLabel(r.status)}
                      </span>
                      <Link href={`/admin/employees/${r.employee_id}`}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                        <Eye size={13}/>
                      </Link>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* date summary */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { l:"วันทำงานสุดท้าย", v: r.last_work_date ? format(new Date(r.last_work_date),"d MMM yyyy",{locale:th}) : "-" },
                        { l:"มีผลบังคับ",      v: r.effective_date ? format(new Date(r.effective_date),"d MMM yyyy",{locale:th}) : "-" },
                        { l:"ยื่นเมื่อ",        v: format(new Date(r.created_at),"d MMM yyyy",{locale:th}) },
                      ].map(d=>(
                        <div key={d.l} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                          <p className="text-slate-400">{d.l}</p>
                          <p className="font-black text-slate-800 mt-0.5">{d.v}</p>
                        </div>
                      ))}
                    </div>

                    {/* reasons */}
                    <div className="text-xs">
                      <p className="font-bold text-slate-600 mb-1">เหตุผล</p>
                      <p className="text-slate-500">{(r.reasons??[]).map((k:string)=>RESIGN_REASONS_MAP[k]||k).join(" · ")||"-"}</p>
                      {r.other_reason&&<p className="text-slate-400 italic mt-0.5">"{r.other_reason}"</p>}
                    </div>

                    {/* manager approval status */}
                    <div className="flex items-center gap-2 text-xs bg-slate-50 rounded-xl px-3 py-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${r.manager_approved_at?"bg-emerald-100":"bg-amber-100"}`}>
                        {r.manager_approved_at ? <Check size={10} className="text-emerald-600"/> : <span className="text-amber-600 font-black text-[9px]">!</span>}
                      </div>
                      <span className="text-slate-500">หัวหน้าอนุมัติ:</span>
                      <span className={r.manager_approved_at?"text-emerald-600 font-bold":"text-amber-600"}>
                        {r.manager_approved_at ? format(new Date(r.manager_approved_at),"d MMM yyyy HH:mm",{locale:th}) : "รอ"}
                      </span>
                      {r.manager_note&&<span className="text-slate-400 italic">· "{r.manager_note}"</span>}
                    </div>

                    {/* exit interview toggle */}
                    <button onClick={()=>setResignExpanded(e=>e===r.id?null:r.id)}
                      className="flex items-center gap-1.5 text-xs text-indigo-500 font-bold">
                      {resignExpanded===r.id?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
                      {resignExpanded===r.id?"ซ่อน":"ดู"} Exit Interview
                    </button>
                    {resignExpanded===r.id&&r.exit_interview&&Object.keys(r.exit_interview).length>0&&(
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs space-y-2">
                        {["q1","q2","q3","q4","q5","q6","q7","q8"].map((k,i)=>
                          r.exit_interview[k] ? (
                            <div key={k} className="flex gap-2">
                              <span className="text-indigo-400 font-bold shrink-0">ข้อ{i+1}:</span>
                              <span className="text-slate-700">{Array.isArray(r.exit_interview[k])?r.exit_interview[k].join(", "):r.exit_interview[k]}</span>
                            </div>
                          ):null
                        )}
                        {r.exit_interview.suggestion&&<div className="flex gap-2"><span className="text-indigo-400 font-bold shrink-0">คำแนะนำ:</span><span className="text-slate-600">{r.exit_interview.suggestion}</span></div>}
                        {r.exit_interview.comment&&<div className="flex gap-2"><span className="text-indigo-400 font-bold shrink-0">ข้อเสนอ:</span><span className="text-slate-600">{r.exit_interview.comment}</span></div>}
                      </div>
                    )}

                    {/* asset checklist */}
                    {r.assets?.items&&Object.values(r.assets.items).some(Boolean)&&(
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs">
                        <p className="font-bold text-amber-700 mb-1.5">ทรัพย์สินต้องส่งคืน</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(r.assets.items).filter(([,v])=>v).map(([k])=>(
                            <span key={k} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-medium capitalize">{k}</span>
                          ))}
                        </div>
                        {Number(r.assets.deduct_amount)>0&&<p className="text-amber-600 font-bold mt-1.5">💰 ชดใช้ {Number(r.assets.deduct_amount).toLocaleString()} บาท</p>}
                      </div>
                    )}

                    {/* HR action area — ทำได้ทั้ง pending_manager และ pending_hr */}
                    {(r.status==="pending_hr"||r.status==="pending_manager")&&(
                      <>
                        <textarea
                          placeholder="หมายเหตุการอนุมัติ/ปฏิเสธ"
                          value={resignNotes[r.id]||""}
                          onChange={e=>setResignNotes(n=>({...n,[r.id]:e.target.value}))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#2A505A] resize-none h-16"/>
                        <div className="flex gap-2">
                          <button onClick={()=>handleResign(r.id,"rejected")} disabled={resignActing===r.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 disabled:opacity-50">
                            {resignActing===r.id?<div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>:<X size={14}/>}
                            ไม่อนุมัติ
                          </button>
                          <button onClick={()=>handleResign(r.id,"approved")} disabled={resignActing===r.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                            {resignActing===r.id?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Check size={14}/>}
                            อนุมัติใบลาออก
                          </button>
                        </div>
                      </>
                    )}
                    {r.status!=="pending_hr"&&r.hr_note&&(
                      <p className="text-xs text-slate-400 italic border-t border-slate-50 pt-2">HR: "{r.hr_note}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}