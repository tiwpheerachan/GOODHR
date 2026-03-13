"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  CheckCircle2, Clock, XCircle, ChevronLeft,
  UserX, ShieldCheck, Building2, AlertTriangle,
} from "lucide-react"
import Link from "next/link"

const STATUS_CFG = {
  pending_manager: { label:"รอหัวหน้าอนุมัติ", color:"text-amber-700",  bg:"bg-amber-50",   border:"border-amber-200",  icon:Clock,         dot:"bg-amber-500"  },
  pending_hr:      { label:"รอ HR อนุมัติ",     color:"text-sky-700",    bg:"bg-sky-50",     border:"border-sky-200",    icon:Building2,     dot:"bg-sky-500"    },
  approved:        { label:"อนุมัติแล้ว",        color:"text-emerald-700",bg:"bg-emerald-50", border:"border-emerald-200",icon:CheckCircle2,  dot:"bg-emerald-500"},
  rejected:        { label:"ไม่อนุมัติ",         color:"text-rose-700",   bg:"bg-rose-50",    border:"border-rose-200",   icon:XCircle,       dot:"bg-rose-500"   },
}

const STEP_LABELS = [
  { k:"submit",   label:"ยื่นใบลาออก",      icon:UserX },
  { k:"manager",  label:"หัวหน้าอนุมัติ",    icon:ShieldCheck },
  { k:"hr",       label:"HR อนุมัติ",         icon:Building2 },
  { k:"done",     label:"เสร็จสิ้น",          icon:CheckCircle2 },
]

function stepIndex(status:string) {
  if (status==="pending_manager") return 1
  if (status==="pending_hr")      return 2
  if (status==="approved")        return 3
  if (status==="rejected")        return 1
  return 0
}

export default function ResignationStatusPage() {
  const { user }  = useAuth()
  const router    = useRouter()
  const supabase  = useRef(createClient()).current
  const emp       = user?.employee as any

  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!emp?.id) return
    supabase.from("resignation_requests")
      .select("*")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => { setRequest(data); setLoading(false) })
  }, [emp?.id])

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">กำลังโหลด…</div>

  if (!request) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col items-center justify-center px-6 gap-6">
      <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
        <UserX size={32} className="text-slate-300"/>
      </div>
      <div className="text-center">
        <p className="font-black text-slate-700 text-lg">ยังไม่มีใบลาออก</p>
        <p className="text-sm text-slate-400 mt-1">คุณยังไม่ได้ยื่นใบลาออก</p>
      </div>
      <Link href="/app/resignation/new"
        className="flex items-center gap-2 px-6 py-3.5 bg-rose-600 text-white font-bold rounded-2xl active:bg-rose-700">
        <UserX size={16}/> ยื่นใบลาออก
      </Link>
      <button onClick={()=>router.back()} className="text-sm text-slate-400">← กลับหน้าโปรไฟล์</button>
    </div>
  )

  const cfg   = STATUS_CFG[request.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending_manager
  const curStep = stepIndex(request.status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2A505A] to-[#3a6b78] px-5 pt-12 pb-8">
        <button onClick={()=>router.back()} className="flex items-center gap-1.5 text-white/70 text-sm mb-5">
          <ChevronLeft size={16}/> กลับ
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <UserX size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="text-lg font-black text-white">ใบลาออก</h1>
            <p className="text-white/60 text-xs">SHD Technology · ยื่นเมื่อ {format(new Date(request.created_at),"d MMMM yyyy",{locale:th})}</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((s,i) => {
            const done  = curStep > i && request.status !== "rejected"
            const active = curStep === i
            const rejected = request.status==="rejected" && i===1
            return (
              <div key={s.k} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done?"bg-emerald-400":rejected?"bg-rose-400":active?"bg-white":"bg-white/20"}`}>
                    {done ? <CheckCircle2 size={15} className="text-white"/> :
                     rejected ? <XCircle size={15} className="text-white"/> :
                     <s.icon size={13} className={active?"text-[#2A505A]":"text-white/40"}/>}
                  </div>
                  <span className={`text-[9px] font-bold whitespace-nowrap ${active||done?"text-white":"text-white/40"}`}>{s.label}</span>
                </div>
                {i < STEP_LABELS.length-1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${done?"bg-emerald-400":"bg-white/20"}`}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Status banner */}
        <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} px-4 py-3.5 flex items-center gap-3`}>
          <div className={`w-3 h-3 rounded-full ${cfg.dot}`}/>
          <div>
            <p className={`font-black text-sm ${cfg.color}`}>{cfg.label}</p>
            {request.status==="rejected" && (
              <p className="text-xs text-rose-600 mt-0.5">{request.manager_note || request.hr_note || "ไม่อนุมัติ"}</p>
            )}
          </div>
        </div>

        {/* Request info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">รายละเอียด</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">วันทำงานวันสุดท้าย</span>
              <span className="font-bold text-slate-800">{request.last_work_date ? format(new Date(request.last_work_date),"d MMMM yyyy",{locale:th}) : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">มีผลบังคับ</span>
              <span className="font-bold text-slate-800">{request.effective_date ? format(new Date(request.effective_date),"d MMMM yyyy",{locale:th}) : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">เหตุผล</span>
              <span className="font-bold text-slate-800">{request.reasons?.length || 0} ข้อ</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-4">ความคืบหน้า</p>
          <div className="space-y-4">
            {[
              { label:"ยื่นใบลาออก",   done:true,                        date:request.created_at,          note:"" },
              { label:"หัวหน้าอนุมัติ", done:!!request.manager_approved_at, date:request.manager_approved_at, note:request.manager_note },
              { label:"HR อนุมัติ",     done:!!request.hr_approved_at,      date:request.hr_approved_at,      note:request.hr_note },
            ].map((t,i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.done?"bg-emerald-100":"bg-slate-100"}`}>
                    {t.done ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Clock size={12} className="text-slate-400"/>}
                  </div>
                  {i < 2 && <div className="w-0.5 h-6 bg-slate-100"/>}
                </div>
                <div className="pb-1">
                  <p className={`text-sm font-bold ${t.done?"text-slate-800":"text-slate-400"}`}>{t.label}</p>
                  {t.date && <p className="text-xs text-slate-400">{format(new Date(t.date),"d MMM yyyy HH:mm",{locale:th})}</p>}
                  {t.note && <p className="text-xs text-slate-500 mt-0.5 italic">"{t.note}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {request.status === "rejected" && (
          <Link href="/app/resignation/new"
            className="flex items-center justify-center gap-2 py-3.5 bg-rose-600 text-white font-bold rounded-2xl w-full">
            <UserX size={16}/> ยื่นใบลาออกใหม่
          </Link>
        )}
      </div>
    </div>
  )
}