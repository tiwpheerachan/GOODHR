"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Download, Check, X, Search, Filter, ChevronLeft, ChevronRight, Clock, AlertTriangle, Calendar } from "lucide-react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import { statusToTH, statusColor } from "@/lib/utils/attendance"
import toast from "react-hot-toast"

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

const QUICK = [
  { l:"วันนี้",      s:()=>format(new Date(),"yyyy-MM-dd"),                                     e:()=>format(new Date(),"yyyy-MM-dd") },
  { l:"สัปดาห์นี้", s:()=>format(startOfWeek(new Date(),{weekStartsOn:1}),"yyyy-MM-dd"),        e:()=>format(endOfWeek(new Date(),{weekStartsOn:1}),"yyyy-MM-dd") },
  { l:"7 วัน",      s:()=>format(subDays(new Date(),6),"yyyy-MM-dd"),                           e:()=>format(new Date(),"yyyy-MM-dd") },
  { l:"เดือนนี้",   s:()=>format(startOfMonth(new Date()),"yyyy-MM-dd"),                        e:()=>format(endOfMonth(new Date()),"yyyy-MM-dd") },
]

export default function AdminAttendancePage() {
  const { user }  = useAuth()
  const supabase  = createClient()
  const isSA      = user?.role==="super_admin"||user?.role==="hr_admin"

  const [records,   setRecords]   = useState<any[]>([])
  const [adjReqs,   setAdjReqs]   = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [depts,     setDepts]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [selCo,     setSelCo]     = useState("")
  const [search,    setSearch]    = useState("")
  const [deptF,     setDeptF]     = useState("")
  const [qIdx,      setQIdx]      = useState(2)
  const [filters,   setFilters]   = useState({ start:format(subDays(new Date(),6),"yyyy-MM-dd"), end:format(new Date(),"yyyy-MM-dd"), status:"" })
  const [stats,     setStats]     = useState({ present:0, late:0, absent:0, leave:0, total:0 })
  const PER = 30

  const myId:string|undefined = user?.employee?.company_id??(user as any)?.company_id??undefined
  const cid = isSA?(selCo||undefined):myId
  const fc  = (q:any)=>{ if(cid) return q.eq("company_id",cid); if(!isSA) return q.eq("company_id",myId!); return q }

  useEffect(()=>{ if(!isSA)return; supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th").then(({data})=>setCompanies(data??[])) },[isSA])
  useEffect(()=>{ setDeptF(""); if(!cid){setDepts([]);return}; supabase.from("departments").select("id,name").eq("company_id",cid).order("name").then(({data})=>setDepts(data??[])) },[cid])

  const load = useCallback(async()=>{
    if(!isSA&&!myId)return
    setLoading(true)
    try{
      let q=fc(supabase.from("attendance_records")
        .select(`id,work_date,clock_in,clock_out,status,late_minutes,ot_minutes,work_minutes,is_manual,note,
          employee:employees!attendance_records_employee_id_fkey(id,first_name_th,last_name_th,employee_code,avatar_url,position:positions(name),department:departments(name))`,
          {count:"exact"})
        .gte("work_date",filters.start).lte("work_date",filters.end)
        .order("work_date",{ascending:false}).order("clock_in",{ascending:false})
        .range(page*PER,(page+1)*PER-1))
      if(filters.status) q=q.eq("status",filters.status)
      if(search) q=q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`,{referencedTable:"employees"})
      const{data,count,error}=await q
      if(error) console.error("att:",error)
      setRecords(data??[]); setTotal(count??0)

      // stats
      const sd=(await fc(supabase.from("attendance_records").select("status").gte("work_date",filters.start).lte("work_date",filters.end))).data??[]
      setStats({
        present:sd.filter((r:any)=>["present","wfh"].includes(r.status)).length,
        late:   sd.filter((r:any)=>r.status==="late").length,
        absent: sd.filter((r:any)=>r.status==="absent").length,
        leave:  sd.filter((r:any)=>r.status==="leave").length,
        total:  sd.length,
      })
    }finally{ setLoading(false) }
  },[cid,isSA,myId,filters,page,search,deptF])

  const loadAdj = useCallback(async()=>{
    if(!isSA&&!myId)return
    const{data}=await fc(supabase.from("time_adjustment_requests")
      .select(`*,employee:employees!time_adjustment_requests_employee_id_fkey(id,first_name_th,last_name_th,employee_code,avatar_url)`)
      .eq("status","pending").order("created_at",{ascending:true}))
    setAdjReqs(data??[])
  },[cid,isSA,myId])

  useEffect(()=>{ load(); loadAdj() },[load,loadAdj])

  const setQ=(i:number)=>{ setQIdx(i); setFilters(f=>({...f,start:QUICK[i].s(),end:QUICK[i].e()})); setPage(0) }
  const setF=(fn:()=>void)=>{ fn(); setPage(0) }

  const approveAdj=async(req:any,action:"approved"|"rejected")=>{
    const{error}=await supabase.from("time_adjustment_requests").update({ status:action, reviewed_by:user?.employee_id, reviewed_at:new Date().toISOString() }).eq("id",req.id)
    if(error){toast.error(error.message);return}
    if(action==="approved"){
      await supabase.from("attendance_records").upsert({
        employee_id:req.employee_id, company_id:req.company_id, work_date:req.work_date,
        ...(req.requested_clock_in&&{clock_in:req.requested_clock_in}),
        ...(req.requested_clock_out&&{clock_out:req.requested_clock_out}),
        is_manual:true, approved_by:user?.employee_id,
      },{onConflict:"employee_id,work_date"})
    }
    try{ await supabase.from("notifications").insert({ employee_id:req.employee_id, type:"time_adjustment",
      title:action==="approved"?"คำขอแก้ไขเวลาได้รับการอนุมัติ":"คำขอแก้ไขเวลาถูกปฏิเสธ",
      body:`วันที่ ${format(new Date(req.work_date),"d MMM yyyy",{locale:th})}` }) }catch(_){}
    toast.success(action==="approved"?"✓ อนุมัติแล้ว":"✗ ปฏิเสธแล้ว")
    setAdjReqs(r=>r.filter(x=>x.id!==req.id)); load()
  }

  const exportCSV=async()=>{
    const{data}=await fc(supabase.from("attendance_records")
      .select(`work_date,clock_in,clock_out,status,late_minutes,ot_minutes,work_minutes,is_manual,
        employee:employees!attendance_records_employee_id_fkey(employee_code,first_name_th,last_name_th,position:positions(name),department:departments(name))`)
      .gte("work_date",filters.start).lte("work_date",filters.end).order("work_date",{ascending:false}))
    if(!data)return
    const hdr=["วันที่","รหัส","ชื่อ","นามสกุล","แผนก","ตำแหน่ง","เข้างาน","ออกงาน","ชม.","สาย(น.)","OT(น.)","สถานะ","แก้มือ"]
    const rows=data.map((r:any)=>[
      r.work_date, r.employee?.employee_code, r.employee?.first_name_th, r.employee?.last_name_th,
      (r.employee?.department as any)?.name, (r.employee?.position as any)?.name,
      r.clock_in?format(new Date(r.clock_in),"HH:mm"):"",
      r.clock_out?format(new Date(r.clock_out),"HH:mm"):"",
      r.work_minutes?Math.round(r.work_minutes/60*10)/10:"",
      r.late_minutes||"", r.ot_minutes||"", statusToTH(r.status), r.is_manual?"ใช่":"",
    ])
    const csv=[hdr,...rows].map(r=>r?.join(",")).join("\n")
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"})
    const url=URL.createObjectURL(blob); const a=document.createElement("a")
    a.href=url; a.download=`attendance_${filters.start}_${filters.end}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const attPct=stats.total>0?Math.round(((stats.present+stats.late)/stats.total)*100):0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">การเข้างาน</h2>
          <p className="text-slate-400 text-sm">{total.toLocaleString()} รายการ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSA&&companies.length>0&&(
            <select value={selCo} onChange={e=>{setSelCo(e.target.value);setPage(0)}} className={inp}>
              <option value="">ทุกบริษัท</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={14}/> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {l:"ทั้งหมด", v:stats.total,   sub:"",                  bg:"bg-slate-50",  vc:"text-slate-700"},
          {l:"มาทำงาน", v:stats.present, sub:`${attPct}%`,        bg:"bg-green-50",  vc:"text-green-700"},
          {l:"มาสาย",   v:stats.late,    sub:"",                  bg:"bg-amber-50",  vc:"text-amber-700"},
          {l:"ขาดงาน",  v:stats.absent,  sub:"",                  bg:"bg-red-50",    vc:"text-red-700"},
          {l:"ลาหยุด",  v:stats.leave,   sub:"",                  bg:"bg-blue-50",   vc:"text-blue-700"},
        ].map(s=>(
          <div key={s.l} className={`${s.bg} rounded-2xl p-4`}>
            <p className="text-xs font-bold text-slate-500 mb-1">{s.l}</p>
            <p className={`text-2xl font-black ${s.vc}`}>{s.v.toLocaleString()}</p>
            {s.sub&&<p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Pending adjustments */}
      {adjReqs.length>0&&(
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-amber-50 border-b border-amber-100">
            <AlertTriangle size={14} className="text-amber-500"/>
            <h3 className="font-black text-amber-800 text-sm">คำขอแก้ไขเวลา รออนุมัติ ({adjReqs.length})</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {adjReqs.map(req=>(
              <div key={req.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0 overflow-hidden">
                  {req.employee?.avatar_url?<img src={req.employee.avatar_url} alt="" className="w-full h-full object-cover"/>:req.employee?.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {req.employee?.first_name_th} {req.employee?.last_name_th}
                    <span className="text-xs text-slate-400 ml-2">{req.employee?.employee_code}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(req.work_date),"EEEE d MMM yyyy",{locale:th})}
                    {req.requested_clock_in&&<span className="ml-2 text-green-600">เข้า {format(new Date(req.requested_clock_in),"HH:mm")}</span>}
                    {req.requested_clock_out&&<span className="ml-2 text-blue-600">ออก {format(new Date(req.requested_clock_out),"HH:mm")}</span>}
                  </p>
                  {req.reason&&<p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{req.reason}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>approveAdj(req,"rejected")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><X size={11}/> ปฏิเสธ</button>
                  <button onClick={()=>approveAdj(req,"approved")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700"><Check size={11}/> อนุมัติ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex gap-2 flex-wrap">
          {QUICK.map((r,i)=>(
            <button key={r.l} onClick={()=>setQ(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${qIdx===i?"bg-indigo-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {r.l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-slate-400 flex-shrink-0"/>
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setF(()=>setSearch(e.target.value))} className={inp+" pl-8 w-full"} placeholder="ค้นหาชื่อ, รหัสพนักงาน..."/>
          </div>
          <input type="date" value={filters.start} onChange={e=>setF(()=>{setQIdx(-1);setFilters(f=>({...f,start:e.target.value}))})} className={inp}/>
          <input type="date" value={filters.end}   onChange={e=>setF(()=>{setQIdx(-1);setFilters(f=>({...f,end:e.target.value}))})}   className={inp}/>
          <select value={filters.status} onChange={e=>setF(()=>setFilters(f=>({...f,status:e.target.value})))} className={inp}>
            <option value="">ทุกสถานะ</option>
            {["present","late","absent","leave","wfh","holiday"].map(s=><option key={s} value={s}>{statusToTH(s)}</option>)}
          </select>
          {depts.length>0&&(
            <select value={deptF} onChange={e=>setF(()=>setDeptF(e.target.value))} className={inp}>
              <option value="">ทุกแผนก</option>
              {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["วันที่","พนักงาน","แผนก / ตำแหน่ง","เข้างาน","ออกงาน","ชม.","สาย","OT","สถานะ"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading?(
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/> กำลังโหลด...
                  </div>
                </td></tr>
              ):records.length===0?(
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400"><Clock size={32} className="mx-auto mb-2 text-slate-200"/> ไม่พบข้อมูล</td></tr>
              ):records.map(r=>{
                const emp=r.employee as any
                const wh=r.work_minutes?(r.work_minutes/60).toFixed(1):null
                return(
                  <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.is_manual?"bg-amber-50/40":""}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-700">{format(new Date(r.work_date),"d MMM",{locale:th})}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(r.work_date),"EEEE",{locale:th})}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs flex-shrink-0 overflow-hidden">
                          {emp?.avatar_url?<img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>:emp?.first_name_th?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 whitespace-nowrap text-sm">{emp?.first_name_th} {emp?.last_name_th}</p>
                          <p className="text-[10px] text-slate-400">{emp?.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-600">{emp?.position?.name||"—"}</p>
                      <p className="text-[10px] text-slate-400">{emp?.department?.name||"—"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className={`text-sm font-bold ${r.clock_in?"text-slate-700":"text-slate-300"}`}>{r.clock_in?format(new Date(r.clock_in),"HH:mm"):"--:--"}</p>
                      {r.is_manual&&<p className="text-[10px] text-amber-500">แก้มือ</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.clock_out?format(new Date(r.clock_out),"HH:mm"):<span className="text-slate-300">--:--</span>}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{wh?`${wh}h`:<span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{r.late_minutes>0?<span className="text-xs font-black text-amber-600">{r.late_minutes}น.</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{r.ot_minutes>0?<span className="text-xs font-black text-blue-600">{r.ot_minutes}น.</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColor(r.status)}`}>{statusToTH(r.status)}</span>
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
    </div>
  )
}