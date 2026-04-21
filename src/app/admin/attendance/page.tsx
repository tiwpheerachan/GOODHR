"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Download, RefreshCw, AlertCircle, Check, X,
  Clock, Users, TrendingUp, AlertTriangle,
  Search, ChevronLeft, ChevronRight,
  Building2, GitBranch, BarChart2, List, Camera, FileSpreadsheet, MapPin, Pencil,
} from "lucide-react"
import Link from "next/link"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { th } from "date-fns/locale"
import { statusToTH } from "@/lib/utils/attendance"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

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

// ── Excel export helpers ──────────────────────────────────────────
function applyNumFmt(ws: XLSX.WorkSheet, fmt = "#,##0.00") {
  if (!ws["!ref"]) return
  const range = XLSX.utils.decode_range(ws["!ref"])
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (cell && cell.t === "n") cell.z = Number.isInteger(cell.v) ? "#,##0" : fmt
    }
  }
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Excel export (รายการ) ─────────────────────────────────────────
function exportRecordsXLSX(records: any[], dateFrom: string, dateTo: string) {
  const wb = XLSX.utils.book_new()

  // ── Header info rows ──
  const infoRows = [
    ["รายงานการเข้างาน"],
    [`ช่วงเวลา: ${safeFmt(dateFrom+"T00:00:00","d MMM yyyy")} – ${safeFmt(dateTo+"T00:00:00","d MMM yyyy")}`],
    [`ออกรายงาน: ${format(new Date(),"d MMMM yyyy HH:mm",{locale:th})}`],
    [], // blank row
  ]

  // ── Column headers ──
  const headers = ["วันที่","รหัสพนักงาน","ชื่อ-สกุล","แผนก","ตำแหน่ง","เข้างาน","ออกงาน","สาย (นาที)","OT (นาที)","ชั่วโมงทำงาน","สถานะ","ลาครึ่งวัน"]

  // ── Data rows ──
  const dataRows = records.map(r => {
    const clockIn = r.clock_in ? new Date(r.clock_in) : null
    const clockOut = r.clock_out ? new Date(r.clock_out) : null
    let workHours = ""
    if (clockIn && clockOut) {
      const diffMs = clockOut.getTime() - clockIn.getTime()
      const hrs = Math.floor(diffMs / 3600000)
      const mins = Math.floor((diffMs % 3600000) / 60000)
      workHours = `${hrs}:${String(mins).padStart(2,"0")}`
    }
    return [
      safeFmt(r.work_date+"T00:00:00","yyyy-MM-dd"),
      r.employee?.employee_code || "",
      `${r.employee?.first_name_th || ""} ${r.employee?.last_name_th || ""}`.trim(),
      r.employee?.department?.name || "-",
      r.employee?.position?.name || "-",
      clockIn ? safeFmt(r.clock_in,"HH:mm") : "-",
      clockOut ? safeFmt(r.clock_out,"HH:mm") : "-",
      r.half_day_leave === "morning" ? 0 : (r.late_minutes > 0 ? r.late_minutes : 0),
      r.ot_minutes > 0 ? r.ot_minutes : 0,
      workHours || "-",
      statusToTH(r.status),
      r.half_day_leave === "morning" ? "ลาเช้า" : r.half_day_leave === "afternoon" ? "ลาบ่าย" : "-",
    ]
  })

  const wsData = [...infoRows, headers, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // ── Column widths ──
  ws["!cols"] = [
    { wch: 12 },  // วันที่
    { wch: 14 },  // รหัสพนักงาน
    { wch: 24 },  // ชื่อ-สกุล
    { wch: 18 },  // แผนก
    { wch: 22 },  // ตำแหน่ง
    { wch: 10 },  // เข้างาน
    { wch: 10 },  // ออกงาน
    { wch: 12 },  // สาย
    { wch: 12 },  // OT
    { wch: 12 },  // ชั่วโมงทำงาน
    { wch: 12 },  // สถานะ
    { wch: 12 },  // ลาครึ่งวัน
  ]

  // ── Auto-filter on header row (row index 4 = 5th row) ──
  const headerRowIdx = infoRows.length // 0-indexed
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: headerRowIdx, c: 0 },
    e: { r: headerRowIdx + dataRows.length, c: headers.length - 1 }
  })}

  applyNumFmt(ws)
  XLSX.utils.book_append_sheet(wb, ws, "รายงานเข้างาน")

  // ── สรุปตามแผนก (pivot) ──
  const deptMap: Record<string, { dept: string; present: number; late: number; absent: number; leave: number; total: number; lateMin: number; otMin: number }> = {}
  records.forEach(r => {
    const dept = r.employee?.department?.name || "ไม่ระบุแผนก"
    if (!deptMap[dept]) deptMap[dept] = { dept, present: 0, late: 0, absent: 0, leave: 0, total: 0, lateMin: 0, otMin: 0 }
    const d = deptMap[dept]
    d.total++
    if (r.status === "present" || r.status === "wfh") d.present++
    else if (r.status === "late") { d.late++; d.present++ }
    else if (r.status === "absent") d.absent++
    else if (r.status === "leave") d.leave++
    d.lateMin += r.late_minutes || 0
    d.otMin += r.ot_minutes || 0
  })
  const deptRows = Object.values(deptMap).sort((a, b) => b.total - a.total)
  const pivotInfo = [
    ["สรุปตามแผนก"],
    [`ช่วงเวลา: ${safeFmt(dateFrom+"T00:00:00","d MMM yyyy")} – ${safeFmt(dateTo+"T00:00:00","d MMM yyyy")}`],
    [],
  ]
  const pivotHeaders = ["แผนก","รวมรายการ","มาทำงาน","มาสาย","ขาดงาน","ลา","รวมนาทีสาย","รวมนาที OT","อัตราเข้างาน (%)"]
  const pivotData = deptRows.map(d => [
    d.dept, d.total, d.present, d.late, d.absent, d.leave, d.lateMin, d.otMin,
    d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
  ])

  const ws2Data = [...pivotInfo, pivotHeaders, ...pivotData]
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
  ws2["!cols"] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ]
  const pivotHeaderRow = pivotInfo.length
  ws2["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: pivotHeaderRow, c: 0 },
    e: { r: pivotHeaderRow + pivotData.length, c: pivotHeaders.length - 1 }
  })}
  applyNumFmt(ws2)
  XLSX.utils.book_append_sheet(wb, ws2, "สรุปตามแผนก")

  downloadWorkbook(wb, `attendance_${dateFrom}_${dateTo}.xlsx`)
}

// ── Excel export (สรุป) ───────────────────────────────────────────
function exportSummaryXLSX(title: string, summary: GroupRow[], detail: SummaryEmpRow[], period: string) {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: สรุปตามกลุ่ม ──
  const sumInfo = [
    [title],
    [`ช่วงเวลา: ${period}`],
    [`ออกรายงาน: ${format(new Date(),"d MMMM yyyy HH:mm",{locale:th})}`],
    [],
  ]
  const sumHeaders = ["กลุ่ม","จำนวนพนักงาน","มาทำงาน","มาสาย","ขาดงาน","ลา","อัตราเข้างาน (%)"]
  const sumData = summary.map(r => [
    r.label, r.employees, r.present, r.late, r.absent, r.leave,
    r.totalDays > 0 ? Math.round((r.present + r.late) / r.totalDays * 100) : 0,
  ])
  // ── Total row ──
  const totals = summary.reduce((t, r) => ({
    emp: t.emp + r.employees, present: t.present + r.present, late: t.late + r.late,
    absent: t.absent + r.absent, leave: t.leave + r.leave, days: t.days + r.totalDays,
  }), { emp: 0, present: 0, late: 0, absent: 0, leave: 0, days: 0 })
  sumData.push([
    "รวมทั้งหมด", totals.emp, totals.present, totals.late, totals.absent, totals.leave,
    totals.days > 0 ? Math.round((totals.present + totals.late) / totals.days * 100) : 0,
  ])

  const ws1Data = [...sumInfo, sumHeaders, ...sumData]
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)
  ws1["!cols"] = [
    { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 18 },
  ]
  const sumHeaderRow = sumInfo.length
  ws1["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: sumHeaderRow, c: 0 },
    e: { r: sumHeaderRow + sumData.length, c: sumHeaders.length - 1 }
  })}
  applyNumFmt(ws1)
  XLSX.utils.book_append_sheet(wb, ws1, "สรุปตามกลุ่ม")

  // ── Sheet 2: รายละเอียดรายบุคคล ──
  const detInfo = [
    ["รายละเอียดรายบุคคล"],
    [`ช่วงเวลา: ${period}`],
    [],
  ]
  const detHeaders = ["รหัสพนักงาน","ชื่อ-สกุล","แผนก","สาขา","มาทำงาน","มาสาย","ขาดงาน","ลา","รวมนาทีสาย","อัตราเข้างาน (%)"]
  const detData = detail.map(r => {
    const totalWork = r.present + r.late + r.absent
    return [
      r.employee_code, r.name, r.dept, r.branch,
      r.present, r.late, r.absent, r.leave, r.lateMinutes,
      totalWork > 0 ? Math.round((r.present + r.late) / totalWork * 100) : 0,
    ]
  })

  const ws2Data = [...detInfo, detHeaders, ...detData]
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
  ws2["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 18 },
  ]
  const detHeaderRow = detInfo.length
  ws2["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: detHeaderRow, c: 0 },
    e: { r: detHeaderRow + detData.length, c: detHeaders.length - 1 }
  })}
  applyNumFmt(ws2)
  XLSX.utils.book_append_sheet(wb, ws2, "รายบุคคล")

  downloadWorkbook(wb, `attendance_summary_${format(new Date(),"yyyyMMdd_HHmm")}.xlsx`)
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
  const [selCompany,   setSelCompany]   = useState("all")

  // ── list tab state ────────────────────────────────────────────
  const [records,      setRecords]      = useState<any[]>([])
  const [loadingList,  setLoadingList]  = useState(false)
  const [errList,      setErrList]      = useState<string|null>(null)
  const [total,        setTotal]        = useState(0)

  // ── edit attendance modal ────────────────────────────────────
  const [editRec, setEditRec] = useState<any>(null)
  const [editForm, setEditForm] = useState({ clock_in: "", clock_out: "", clock_in_date: "", clock_out_date: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [page,         setPage]         = useState(0)
  const [adjReqs,      setAdjReqs]      = useState<any[]>([])
  const [kpi,          setKpi]          = useState({present:0,late:0,absent:0,leave:0})
  const [exporting,    setExporting]    = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFilters, setExportFilters] = useState({
    dateFrom: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    status: "",
    dept: "",
    search: "",
    exportCompany: "current" as "current" | string,
  })
  const [offsitePending, setOffsitePending] = useState(0)
  const [markingAbsent, setMarkingAbsent] = useState(false)
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

  const activeCid = isSuperAdmin ? (selCompany || "all") : (companyId || "")

  // load companies + departments
  useEffect(() => {
    if (!activeCid) return
    if (isSuperAdmin)
      supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th")
        .then(({data})=>setCompanies(data??[]))
    let dq = supabase.from("departments").select("id,name").order("name")
    if (activeCid !== "all") dq = dq.eq("company_id", activeCid)
    dq.then(({data})=>setDepartments(data??[]))
  }, [activeCid, isSuperAdmin])

  // ── LIST: load kpi today ──────────────────────────────────────
  const loadKpi = useCallback(async()=>{
    if(!activeCid) return
    try {
      const addCo = (q: any) => activeCid !== "all" ? q.eq("company_id", activeCid) : q
      // ✅ ดึง status ทั้งหมดใน 1 query แทน 4 queries แยก (ลด DB load 75%)
      const [attRes, osRes] = await Promise.all([
        addCo(supabase.from("attendance_records").select("status").eq("work_date",today)),
        addCo(supabase.from("offsite_checkin_requests").select("id",{count:"exact",head:true}).eq("status","pending")),
      ])
      const statusCounts = { present: 0, late: 0, absent: 0, leave: 0 }
      for (const r of (attRes.data ?? [])) {
        const s = r.status as keyof typeof statusCounts
        if (s in statusCounts) statusCounts[s]++
      }
      setKpi(statusCounts)
      setOffsitePending(osRes.count??0)
    } catch(e) { console.error("Load KPI error:", e) }
  },[activeCid,today])

  // ── Mark absent: สร้าง record ขาดงานย้อนหลัง ──────────────────
  const handleMarkAbsent = useCallback(async()=>{
    if(markingAbsent) return
    setMarkingAbsent(true)
    try {
      // backfill จากต้นเดือนถึงเมื่อวาน
      const from = format(startOfMonth(new Date()),"yyyy-MM-dd")
      const res = await fetch("/api/attendance/backfill-absent",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ from }),
      })
      const json = await res.json()
      if(!res.ok) throw new Error(json.error||"เกิดข้อผิดพลาด")
      toast.success(`Mark absent สำเร็จ: ${json.marked} records`)
      // reload data
      loadList(); loadKpi()
    } catch(e:any) {
      toast.error(e.message||"เกิดข้อผิดพลาด")
    } finally { setMarkingAbsent(false) }
  },[markingAbsent])

  // ── LIST: load records ────────────────────────────────────────
  const loadList = useCallback(async()=>{
    if(!activeCid) return
    setLoadingList(true); setErrList(null)
    try {
      let q = supabase.from("attendance_records")
        .select(`*,employee:employees!attendance_records_employee_id_fkey(
          id,first_name_th,last_name_th,employee_code,
          department:departments(id,name),position:positions(name),company:companies(code))`,{count:"exact"})
        .gte("work_date",listFilters.start).lte("work_date",listFilters.end)
      if (activeCid !== "all") q = q.eq("company_id",activeCid)
      if(listFilters.status) q=q.eq("status",listFilters.status)
      // ── order + range ต้องอยู่นอก if เพื่อให้ทำงานทุกกรณี ──
      q = q.order("work_date",{ascending:false}).order("clock_in",{ascending:false})
        .range(page*PER,(page+1)*PER-1) as any
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
    } catch(e: any) {
      console.error("Load attendance error:", e)
      setErrList("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoadingList(false)
    }
  },[activeCid,listFilters,page])

  const loadAdj = useCallback(async()=>{
    if(!activeCid) return
    try {
      let aq = supabase.from("time_adjustment_requests")
        .select(`*,employee:employees!time_adjustment_requests_employee_id_fkey(id,first_name_th,last_name_th,department:departments(name))`)
        .eq("status","pending").order("created_at",{ascending:true})
      if (activeCid !== "all") aq = aq.eq("company_id", activeCid) as any
      const {data}=await (aq as any)
      setAdjReqs(data??[])
    } catch(e) { console.error("Load adjustments error:", e) }
  },[activeCid])

  // ── SUMMARY: fetch ────────────────────────────────────────────
  const loadSummary = useCallback(async()=>{
    if(!activeCid) return
    setLoadingSum(true)
    try{
      const addCo2 = (q: any) => activeCid !== "all" ? q.eq("company_id", activeCid) : q
      const [{data:emps},{data:atts},{data:leaves}]=await Promise.all([
        addCo2(supabase.from("employees").select("id,employee_code,first_name_th,last_name_th,department:departments(name),branch:branches(name)").eq("is_active",true)) as any,
        addCo2(supabase.from("attendance_records").select("employee_id,status,late_minutes,half_day_leave").gte("work_date",sumFrom).lte("work_date",sumTo)),
        addCo2(supabase.from("leave_requests").select("employee_id,total_days").eq("status","approved").gte("start_date",sumFrom).lte("end_date",sumTo)),
      ])
      const attByEmp=new Map<string,any[]>()
      ;(atts??[]).forEach((a:any)=>{if(!attByEmp.has(a.employee_id))attByEmp.set(a.employee_id,[]);attByEmp.get(a.employee_id)!.push(a)})
      const lvByEmp=new Map<string,number>()
      ;(leaves??[]).forEach((l:any)=>lvByEmp.set(l.employee_id,(lvByEmp.get(l.employee_id)||0)+l.total_days))

      const detail:SummaryEmpRow[]=(emps??[]).map((e:any)=>{
        const ea=attByEmp.get(e.id)??[]
        return{employee_code:e.employee_code,name:`${e.first_name_th} ${e.last_name_th}`,
          dept:e.department?.name||"-",branch:e.branch?.name||"-",
          present:ea.filter(a=>["present","wfh"].includes(a.status)).length,
          late:ea.filter(a=>a.status==="late").length,
          absent:ea.filter(a=>a.status==="absent").length,
          leave:lvByEmp.get(e.id)??0,
          lateMinutes:ea.reduce((s:number,a:any)=>s+(a.half_day_leave==="morning"?0:(a.late_minutes||0)),0)}
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
      const allPres=(atts??[]).filter((a:any)=>["present","wfh","late"].includes(a.status)).length
      const allLate=(atts??[]).filter((a:any)=>a.status==="late").length
      const allAbs=(atts??[]).filter((a:any)=>a.status==="absent").length
      const allLv=Array.from(lvByEmp.values()).reduce((s,v)=>s+v,0)
      setSumKpi({totalEmp:emps?.length??0,presentDays:allPres,lateDays:allLate,absentDays:allAbs,leaveDays:allLv})
    }catch(e){console.error(e)}
    finally{setLoadingSum(false)}
  },[activeCid,sumFrom,sumTo,viewMode])

  // effects
  useEffect(()=>{if(!authLoading&&activeCid){loadList();loadAdj();loadKpi()}},[authLoading,activeCid,loadList,loadAdj,loadKpi])
  useEffect(()=>{if(!authLoading&&activeCid&&activeTab==="summary") loadSummary()},[authLoading,activeCid,activeTab,loadSummary])

  const approveAdj=async(req:any,action:"approved"|"rejected")=>{
    try {
      const res=await fetch("/api/attendance/approve-adjustment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request_id:req.id,action})})
      const json=await res.json()
      if(!res.ok||json.error){toast.error(json.error??"เกิดข้อผิดพลาด");return}
      toast.success(action==="approved"?"อนุมัติแล้ว":"ปฏิเสธแล้ว")
      setAdjReqs(r=>r.filter(x=>x.id!==req.id)); loadList()
    } catch(e) { toast.error("ดำเนินการไม่สำเร็จ กรุณาลองใหม่") }
  }

  const handleExportList=async()=>{
    if(!activeCid) return; setExporting(true)
    try {
      let eq = supabase.from("attendance_records")
        .select(`work_date,clock_in,clock_out,status,late_minutes,ot_minutes,half_day_leave,
          employee:employees!attendance_records_employee_id_fkey(employee_code,first_name_th,last_name_th,department:departments(name),position:positions(name))`)
        .gte("work_date",listFilters.start).lte("work_date",listFilters.end).order("work_date",{ascending:false})
      if (activeCid !== "all") eq = eq.eq("company_id",activeCid) as any
      const {data}=await (eq as any)
      exportRecordsXLSX(data??[],listFilters.start,listFilters.end)
    } catch(e) { toast.error("ส่งออกข้อมูลไม่สำเร็จ") }
    finally { setExporting(false) }
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
              <option value="all">ทุกบริษัท</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name_th}</option>)}
            </select>
          )}
          <button onClick={()=>{loadList();loadAdj();loadKpi()}} disabled={loadingList}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            <RefreshCw size={13} className={loadingList?"animate-spin":""}/>
          </button>
          <button onClick={handleMarkAbsent} disabled={markingAbsent}
            className="flex items-center gap-2 px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-200 transition-colors disabled:opacity-50">
            <AlertTriangle size={13} className={markingAbsent?"animate-pulse":""}/>{markingAbsent?"กำลัง Mark…":"Mark ขาดงาน"}
          </button>
          <button onClick={() => {
              if (activeTab === "summary") {
                exportSummaryXLSX(`รายงานการเข้างาน – ${viewMode==="department"?"ตามแผนก":viewMode==="branch"?"ตามสาขา":"ภาพรวม"}`,summaryRows,filteredEmps,periodLabel)
              } else {
                setExportFilters(f => ({ ...f, dateFrom: listFilters.start, dateTo: listFilters.end, status: listFilters.status, dept: listFilters.dept, search: listFilters.search }))
                setShowExportModal(true)
              }
            }}
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
                  {["วันที่","พนักงาน","แผนก","เข้างาน","ออกงาน","สาย","OT","สถานะ","พิกัด",""].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingList?(
                    <tr><td colSpan={10} className="px-4 py-14 text-center"><RefreshCw size={18} className="animate-spin text-slate-300 mx-auto mb-2"/><p className="text-sm text-slate-400">กำลังโหลด…</p></td></tr>
                  ):records.length===0?(
                    <tr><td colSpan={10} className="px-4 py-14 text-center text-slate-400 text-sm">ไม่พบข้อมูลในช่วงวันที่เลือก</td></tr>
                  ):records.map((r: any)=>(
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
                      <td className="px-4 py-3.5">
                        {r.half_day_leave === "morning" ? <span className="font-black text-blue-600 text-[10px]">ลาเช้า</span>
                          : r.half_day_leave === "afternoon" ? <><span className="font-black text-blue-600 text-[10px] mr-1">ลาบ่าย</span>{(r.late_minutes??0)>0&&<span className="font-black text-amber-600 tabular-nums">{r.late_minutes}<span className="text-[10px] font-normal">น.</span></span>}</>
                          : (r.late_minutes??0)>0?<span className="font-black text-amber-600 tabular-nums">{r.late_minutes}<span className="text-[10px] font-normal">น.</span></span>:<span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">{(r.ot_minutes??0)>0?<span className="font-bold text-blue-600 tabular-nums">{r.ot_minutes}<span className="text-[10px] font-normal">น.</span></span>:<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={r.status}/></td>
                      <td className="px-4 py-3.5">
                        {r.clock_in_lat && r.clock_in_lng ? (
                          <a href={`https://www.google.com/maps?q=${r.clock_in_lat},${r.clock_in_lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                            title={`${Number(r.clock_in_lat).toFixed(5)}, ${Number(r.clock_in_lng).toFixed(5)}${r.clock_in_distance_m ? ` (${r.clock_in_distance_m}m)` : ""}`}>
                            <MapPin size={10}/> ดูแผนที่
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <button onClick={() => {
                          const ci = r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                          const co = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : ""
                          const ciDate = r.work_date
                          const coDate = r.clock_out ? new Date(r.clock_out).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : r.work_date
                          setEditRec(r)
                          setEditForm({ clock_in: ci, clock_out: co, clock_in_date: ciDate, clock_out_date: coDate })
                        }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="แก้ไขเวลา">
                          <Pencil size={13} />
                        </button>
                      </td>
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
                    <tr><td colSpan={10} className="text-center py-12 text-slate-400 text-sm"><RefreshCw size={18} className="animate-spin inline mr-2"/>กำลังโหลด…</td></tr>
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
                  {filteredEmps.length>100&&<tr><td colSpan={10} className="text-center py-3 text-xs text-slate-400">แสดง 100 จาก {filteredEmps.length} คน — ใช้ Export Excel เพื่อดูทั้งหมด</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Export filter modal ─────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Download size={18} className="text-emerald-600"/>
                </div>
                <div>
                  <h3 className="font-black text-slate-800">Export การเข้างาน</h3>
                  <p className="text-xs text-slate-400">เลือกตัวกรองก่อนดาวน์โหลด XLSX</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16}/>
              </button>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">ตั้งแต่</label>
                <input type="date" value={exportFilters.dateFrom}
                  onChange={e => setExportFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">ถึง</label>
                <input type="date" value={exportFilters.dateTo}
                  onChange={e => setExportFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400"/>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[
                { l: "7 วัน",   from: format(subDays(new Date(),7),"yyyy-MM-dd"), to: format(new Date(),"yyyy-MM-dd") },
                { l: "30 วัน",  from: format(subDays(new Date(),30),"yyyy-MM-dd"), to: format(new Date(),"yyyy-MM-dd") },
                { l: "เดือนนี้", from: format(startOfMonth(new Date()),"yyyy-MM-dd"), to: format(endOfMonth(new Date()),"yyyy-MM-dd") },
                { l: "เดือนก่อน", from: format(startOfMonth(subMonths(new Date(),1)),"yyyy-MM-dd"), to: format(endOfMonth(subMonths(new Date(),1)),"yyyy-MM-dd") },
              ].map(p => (
                <button key={p.l} onClick={() => setExportFilters(f => ({ ...f, dateFrom: p.from, dateTo: p.to }))}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  {p.l}
                </button>
              ))}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">สถานะ</label>
              <div className="flex flex-wrap gap-1.5">
                {[["", "ทุกสถานะ"], ["present","มาทำงาน"], ["late","มาสาย"], ["absent","ขาดงาน"], ["leave","ลา"]].map(([k, l]) => (
                  <button key={k} onClick={() => setExportFilters(f => ({ ...f, status: k }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      exportFilters.status === k ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Department */}
            {departments.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">แผนก</label>
                <select value={exportFilters.dept} onChange={e => setExportFilters(f => ({ ...f, dept: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-emerald-400">
                  <option value="">ทุกแผนก</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {/* Search */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">ค้นหาพนักงาน (ชื่อ / รหัส)</label>
              <input value={exportFilters.search} onChange={e => setExportFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="ค้นหา หรือเว้นว่างเพื่อดึงทั้งหมด"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400"/>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button disabled={exporting} onClick={async () => {
                if (!activeCid) return
                setExporting(true)
                setShowExportModal(false)
                try {
                  let eq = supabase.from("attendance_records")
                    .select(`work_date,clock_in,clock_out,status,late_minutes,ot_minutes,half_day_leave,
                      employee:employees!attendance_records_employee_id_fkey(employee_code,first_name_th,last_name_th,department:departments(id,name),position:positions(name))`)
                    .gte("work_date", exportFilters.dateFrom).lte("work_date", exportFilters.dateTo)
                    .order("work_date", { ascending: false })
                  if (activeCid !== "all") eq = eq.eq("company_id", activeCid) as any
                  if (exportFilters.status) eq = eq.eq("status", exportFilters.status) as any
                  let { data } = await (eq as any)
                  let rows = data ?? []
                  if (exportFilters.search) {
                    const s = exportFilters.search.toLowerCase()
                    rows = rows.filter((r: any) =>
                      r.employee?.first_name_th?.toLowerCase().includes(s) ||
                      r.employee?.last_name_th?.toLowerCase().includes(s) ||
                      r.employee?.employee_code?.toLowerCase().includes(s))
                  }
                  if (exportFilters.dept) rows = rows.filter((r: any) => r.employee?.department?.id === exportFilters.dept)
                  exportRecordsXLSX(rows, exportFilters.dateFrom, exportFilters.dateTo)
                } catch (e) { toast.error("ส่งออกข้อมูลไม่สำเร็จ") }
                finally { setExporting(false) }
              }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {exporting ? <><RefreshCw size={13} className="animate-spin"/> กำลัง Export…</> : <><Download size={13}/> Download XLSX</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══ Edit Attendance Modal ═══ */}
      {editRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditRec(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-600 px-5 py-4">
              <h3 className="text-white font-bold">แก้ไขเวลาเข้า-ออก</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {editRec.employee?.first_name_th} {editRec.employee?.last_name_th} · {editRec.work_date}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ + เวลาเข้างาน</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editForm.clock_in_date}
                    onChange={e => setEditForm(f => ({ ...f, clock_in_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="time" value={editForm.clock_in}
                    onChange={e => setEditForm(f => ({ ...f, clock_in: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">วันที่ + เวลาออกงาน</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editForm.clock_out_date}
                    onChange={e => setEditForm(f => ({ ...f, clock_out_date: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="time" value={editForm.clock_out}
                    onChange={e => setEditForm(f => ({ ...f, clock_out: e.target.value }))}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-semibold" />
                </div>
                {editForm.clock_out_date && editForm.clock_out_date !== editForm.clock_in_date && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1">กะข้ามคืน — ออกงานคนละวัน</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditRec(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={async () => {
                setEditSaving(true)
                try {
                  const res = await fetch("/api/attendance/admin-edit", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      record_id: editRec.id,
                      clock_in: editForm.clock_in || null,
                      clock_out: editForm.clock_out || null,
                      clock_in_date: editForm.clock_in_date || editRec.work_date,
                      clock_out_date: editForm.clock_out_date || editRec.work_date,
                    }),
                  })
                  const data = await res.json()
                  if (data.success) { toast.success("แก้ไขเวลาสำเร็จ"); setEditRec(null); loadList() }
                  else toast.error(data.error || "เกิดข้อผิดพลาด")
                } catch { toast.error("เกิดข้อผิดพลาด") }
                setEditSaving(false)
              }} disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {editSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}