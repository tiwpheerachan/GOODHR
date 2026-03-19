"use client"

import { useRef, useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { createClient } from "@/lib/supabase/client"
import {
  Phone, Mail, Calendar, Building2, LogOut, ChevronRight,
  Camera, Loader2, WalletCards, BriefcaseBusiness, ShieldCheck,
  Hash, MapPin, Clock, User, Cake, TrendingUp, BadgeCheck, AlertTriangle, CalendarDays, UserX,
} from "lucide-react"
import { format, differenceInYears, differenceInMonths, isAfter } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import toast from "react-hot-toast"

// ── helpers ────────────────────────────────────────────────────────
function safeFmt(d?: string | null, fmt = "d MMMM yyyy") {
  if (!d) return null
  try { return format(new Date(d), fmt, { locale: th }) } catch { return null }
}
function workDuration(hire?: string) {
  if (!hire) return null
  const h = new Date(hire); const now = new Date()
  const y = differenceInYears(now, h)
  const m = differenceInMonths(now, h) % 12
  if (y > 0) return `${y} ปี ${m > 0 ? m + " เดือน" : ""}`
  const totalM = differenceInMonths(now, h)
  return totalM > 0 ? `${totalM} เดือน` : "< 1 เดือน"
}
const STATUS_CFG: Record<string, { label: string; bg: string; dot: string }> = {
  active:     { label: "ทำงานปกติ",   bg: "bg-emerald-400/30", dot: "bg-emerald-300" },
  probation:  { label: "ทดลองงาน",    bg: "bg-amber-400/30",   dot: "bg-amber-300"   },
  on_leave:   { label: "ลาพัก",        bg: "bg-sky-400/30",     dot: "bg-sky-300"     },
  resigned:   { label: "ลาออกแล้ว",   bg: "bg-red-400/30",     dot: "bg-red-300"     },
  terminated: { label: "เลิกจ้าง",    bg: "bg-red-500/30",     dot: "bg-red-400"     },
  suspended:  { label: "พักงาน",       bg: "bg-orange-400/30",  dot: "bg-orange-300"  },
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const emp    = user?.employee as any
  const empId  = (user as any)?.employee_id ?? emp?.id
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading,    setUploading]    = useState(false)
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(emp?.avatar_url ?? null)
  const [shift,        setShift]        = useState<any>(null)
  const [supervisor,   setSupervisor]   = useState<any>(null)
  const [resignStatus, setResignStatus] = useState<string | null>(null)
  const { balances } = useLeaveBalance(empId)
  const supabase = useRef(createClient()).current

  // โหลดสถานะใบลาออก
  useEffect(() => {
    if (!empId) return
    supabase.from("resignation_requests")
      .select("status")
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => setResignStatus(data?.status ?? null))
  }, [empId]) // eslint-disable-line

  // โหลด shift template
  useEffect(() => {
    if (!empId) return
    supabase.from("work_schedules")
      .select("*, shift:shift_templates(*)")
      .eq("employee_id", empId)
      .order("effective_from", { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => setShift((data as any)?.shift ?? null))
  }, [empId]) // eslint-disable-line

  // โหลดข้อมูลหัวหน้า
  useEffect(() => {
    if (!empId) return
    supabase.from("employee_manager_history")
      .select("manager:employees!manager_id(id,first_name_th,last_name_th,nickname,employee_code,position:positions(name),avatar_url)")
      .eq("employee_id", empId)
      .is("effective_to", null)
      .limit(1).maybeSingle()
      .then(({ data }) => setSupervisor((data as any)?.manager ?? null))
  }, [empId]) // eslint-disable-line

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 5MB")
    if (!file.type.startsWith("image/")) return toast.error("กรุณาเลือกไฟล์รูปภาพ")
    setUploading(true)
    try {
      const ext  = file.name.split(".").pop()
      const path = `avatars/${empId}.${ext}`
      const { error: upErr } = await supabase.storage.from("employee-avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from("employee-avatars").getPublicUrl(path)
      const nextUrl = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from("employees").update({ avatar_url: nextUrl }).eq("id", empId)
      if (dbErr) throw dbErr
      setAvatarUrl(nextUrl)
      toast.success("อัปเดตรูปโปรไฟล์แล้ว ✓")
    } catch (err: any) {
      toast.error(err?.message || "อัปโหลดไม่สำเร็จ")
    } finally {
      setUploading(false)
    }
  }

  if (!emp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5fbff]">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  const displayUrl   = avatarUrl ?? emp.avatar_url
  const statusCfg    = STATUS_CFG[emp.employment_status] ?? STATUS_CFG.active
  const isProbation  = emp.employment_status === "probation"
  const probationEnd = emp.probation_end_date ? new Date(emp.probation_end_date) : null
  const probLeft     = probationEnd && isAfter(probationEnd, new Date())
    ? (() => {
        const m = differenceInMonths(probationEnd, new Date())
        return m > 0 ? `เหลืออีก ${m} เดือน` : "สิ้นสุดเร็วๆนี้"
      })()
    : null
  const totalLeaveRemain = balances.reduce((s: number, b: any) => s + (b.remaining_days ?? 0), 0)
  const employmentTypeLabel: Record<string, string> = {
    full_time: "พนักงานประจำ", part_time: "พาร์ทไทม์",
    contract: "สัญญาจ้าง", internship: "นักศึกษาฝึกงาน",
  }

  const infoItems = [
    { icon: Hash,      label: "รหัสพนักงาน",  value: emp.employee_code },
    { icon: Mail,      label: "อีเมล",          value: emp.email },
    { icon: Phone,     label: "เบอร์โทร",       value: emp.phone },
    { icon: Building2, label: "แผนก",            value: emp.department?.name },
    { icon: MapPin,    label: "สาขา",            value: emp.branch?.name },
    { icon: Building2, label: "บริษัท",          value: emp.company?.name_th },
    { icon: BadgeCheck,label: "ประเภทพนักงาน",  value: employmentTypeLabel[emp.employment_type] ?? emp.employment_type },
    { icon: Calendar,  label: "วันเริ่มงาน",    value: safeFmt(emp.hire_date) },
    { icon: TrendingUp,label: "อายุงาน",         value: workDuration(emp.hire_date) },
    { icon: Cake,      label: "วันเกิด",         value: safeFmt(emp.birth_date) },
    { icon: User,      label: "ชื่อเล่น",        value: emp.nickname },
    { icon: Clock,     label: "กะงาน",           value: shift ? `${shift.name} · ${shift.work_start?.slice(0,5)}–${shift.work_end?.slice(0,5)}` : null },
    { icon: ShieldCheck,label: "หัวหน้างาน",     value: supervisor ? `${supervisor.first_name_th} ${supervisor.last_name_th}${supervisor.nickname ? ` (${supervisor.nickname})` : ""} · ${supervisor.position?.name || ""}` : null },
  ].filter(i => i.value)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6fbfd] pb-8">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#eef9ff_0%,#f1fcf9_42%,#f8fcff_75%,#ffffff_100%)]" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl animate-[bgFloat_18s_ease-in-out_infinite]" />
        <div className="absolute top-24 -right-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl animate-[bgFloat_24s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/12 blur-3xl animate-[bgFloat_22s_ease-in-out_infinite]" />
        <div className="absolute inset-x-[-20%] top-[110px] h-[220px] rounded-[100%] bg-[linear-gradient(90deg,rgba(56,189,248,0.14),rgba(45,212,191,0.10),rgba(34,197,94,0.10),rgba(59,130,246,0.14))] blur-3xl animate-[waveDrift_20s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.5)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 flex flex-col">
        {/* ── hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden px-4 pb-16 pt-10">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_30%)]" />

          <h1 className="relative text-center text-[17px] font-bold text-white">โปรไฟล์</h1>

          <div className="relative mt-6 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[30px] bg-white/25 blur-xl" />
              <div className="relative h-28 w-28 overflow-hidden rounded-[28px] border-4 border-white/35 bg-sky-400 shadow-[0_18px_48px_rgba(15,23,42,0.22)] ring-1 ring-white/25">
                {displayUrl
                  ? <img src={displayUrl} alt="" className="h-full w-full object-cover"/>
                  : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 via-cyan-500 to-emerald-400">
                      <span className="text-3xl font-black text-white">{emp.first_name_th?.[0]}</span>
                    </div>
                }
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white text-sky-600 shadow-[0_12px_26px_rgba(15,23,42,0.16)] transition-all active:scale-90">
                {uploading ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-[20px] font-black tracking-tight text-white">
                {emp.first_name_th} {emp.last_name_th}
              </h2>
              {emp.first_name_en && (
                <p className="mt-1 text-sm text-cyan-50/90">{emp.first_name_en} {emp.last_name_en}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/16 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                  {emp.position?.name}
                </span>
                <span className="rounded-full border border-white/20 bg-white/16 px-3 py-1 text-[11px] text-white backdrop-blur-md">
                  {emp.employee_code}
                </span>
                {/* employment status */}
                <span className={`flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md ${statusCfg.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}/>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── content ───────────────────────────────────────────── */}
        <div className="relative z-20 -mt-9 space-y-3 px-4">

          {/* ── Quick stats ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: <TrendingUp size={18} className="text-sky-600"/>,   bg: "bg-sky-50",     ring: "ring-sky-100",     value: workDuration(emp.hire_date) || "–",   label: "อายุงาน"  },
              { icon: <CalendarDays size={18} className="text-violet-600"/>, bg: "bg-violet-50", ring: "ring-violet-100", value: `${totalLeaveRemain} วัน`,              label: "วันลาคงเหลือ" },
              { icon: <Clock size={18} className="text-emerald-600"/>,    bg: "bg-emerald-50", ring: "ring-emerald-100", value: shift?.name || "–",                    label: "กะงาน"    },
            ].map((s, i) => (
              <div key={i}
                className="overflow-hidden rounded-[22px] border border-white/90 bg-white/85 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-md px-2 py-3 text-center flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${s.bg} ring-1 ${s.ring} mb-2`}>
                  {s.icon}
                </div>
                <p className="text-[12px] font-black text-slate-800 leading-tight">{s.value}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Probation alert ─────────────────────────────────── */}
          {isProbation && probLeft && (
            <div className="flex items-center gap-3 overflow-hidden rounded-[22px] border border-amber-200/80 bg-amber-50/90 px-4 py-3 shadow-sm backdrop-blur-md">
              <AlertTriangle size={18} className="shrink-0 text-amber-500"/>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-amber-800">อยู่ระหว่างทดลองงาน</p>
                <p className="text-[11px] text-amber-600">
                  สิ้นสุด {safeFmt(emp.probation_end_date)} · {probLeft}
                </p>
              </div>
            </div>
          )}


          {/* ── Salary card ─────────────────────────────────────── */}
          <Link href="/app/salary"
            className="group relative block overflow-hidden rounded-[26px] border border-sky-300/30 bg-[linear-gradient(135deg,#1d9bf0_0%,#22b3f3_38%,#39c2ff_70%,#57ccff_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(14,165,233,0.24)] transition-all duration-200 active:scale-[0.985]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_42%,rgba(255,255,255,0.12)_100%)]"/>
            <div className="absolute inset-y-0 left-[-30%] w-[36%] rotate-12 bg-white/18 blur-2xl animate-[salaryShine_5.4s_ease-in-out_infinite]"/>
            <div className="absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.95)] animate-[sparkle_3.2s_ease-in-out_infinite]"/>
            <div className="absolute left-[58%] top-[30%] h-1 w-1 rounded-full bg-white/85 shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-[sparkle_4.1s_ease-in-out_infinite_0.6s]"/>
            <div className="absolute right-[14%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.95)] animate-[sparkle_3.8s_ease-in-out_infinite_0.9s]"/>
            <div className="absolute right-[28%] bottom-[22%] h-1 w-1 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-[sparkle_4.6s_ease-in-out_infinite_1.2s]"/>
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-md">
                <WalletCards size={20} className="text-white"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-extrabold tracking-tight text-white">สรุปเงินเดือน</p>
                <p className="mt-0.5 text-[12px] font-medium text-white/95">ดูรายได้ การหัก และกราฟรายเดือน</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20 backdrop-blur-sm">
                <ChevronRight size={17} className="text-white transition-transform duration-200 group-hover:translate-x-0.5"/>
              </div>
            </div>
          </Link>

          {/* ── Payslip PDF ──────────────────────────────────────── */}
          <Link href="/app/payslip"
            className="group flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 transition-all active:scale-[0.98]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <WalletCards size={18}/>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800">สลิปเงินเดือน PDF</p>
              <p className="text-[11px] text-emerald-600">ดาวน์โหลดสลิปเงินเดือนเป็น PDF</p>
            </div>
            <ChevronRight size={16} className="text-emerald-400"/>
          </Link>

          {/* ── Info card ───────────────────────────────────────── */}
          <div className="overflow-hidden rounded-[28px] border border-white/90 bg-white/92 shadow-[0_18px_42px_rgba(15,23,42,0.07)] backdrop-blur-md">
            <div className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50/90 via-cyan-50/80 to-emerald-50/90 px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">ข้อมูลส่วนตัว</p>
            </div>
            <div className="divide-y divide-slate-100">
              {infoItems.map(item => (
                <div key={item.label} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 via-white to-cyan-50 ring-1 ring-sky-100 shadow-sm">
                    <item.icon size={18} className="text-sky-600"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-400">{item.label}</p>
                    <p className="truncate text-[14px] font-semibold text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* role shortcuts */}
          {(user as any)?.role === "manager" && (
            <Link href="/manager/dashboard"
              className="group flex items-center justify-between rounded-[24px] border border-white/90 bg-white/90 px-5 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all active:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 ring-1 ring-sky-100">
                  <BriefcaseBusiness size={18} className="text-sky-600"/>
                </div>
                <span className="text-[14px] font-semibold text-slate-700">ระบบหัวหน้าทีม</span>
              </div>
              <ChevronRight size={17} className="text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"/>
            </Link>
          )}

          {["hr_admin","super_admin"].includes((user as any)?.role||"") && (
            <Link href="/admin/dashboard"
              className="group flex items-center justify-between rounded-[24px] border border-white/90 bg-white/90 px-5 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all active:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 ring-1 ring-emerald-100">
                  <ShieldCheck size={18} className="text-emerald-600"/>
                </div>
                <span className="text-[14px] font-semibold text-slate-700">ระบบ HR Admin</span>
              </div>
              <ChevronRight size={17} className="text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"/>
            </Link>
          )}

          {/* ── ปุ่มลาออก ──────────────────────────────────────── */}
          {emp?.employment_status !== "resigned" && emp?.employment_status !== "terminated" && (
            <Link href={resignStatus ? "/app/resignation" : "/app/resignation/new"}
              className="group flex items-center justify-between rounded-[24px] border border-rose-200/80 bg-white/90 px-5 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all active:bg-rose-50">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 ring-1 ring-rose-100">
                  <UserX size={18} className="text-rose-500"/>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-rose-600">
                    {resignStatus ? "ดูสถานะใบลาออก" : "ยื่นใบลาออก"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {resignStatus === "pending_manager" && "⏳ รอหัวหน้าอนุมัติ"}
                    {resignStatus === "pending_hr"      && "⏳ รอ HR อนุมัติ"}
                    {resignStatus === "approved"        && "✅ อนุมัติแล้ว"}
                    {resignStatus === "rejected"        && "❌ ถูกปฏิเสธ — ยื่นใหม่ได้"}
                    {!resignStatus                      && "Resignation Form · SHD Technology"}
                  </p>
                </div>
              </div>
              <ChevronRight size={17} className="text-rose-300 transition-transform duration-200 group-hover:translate-x-0.5"/>
            </Link>
          )}

          {/* sign out */}
          <button onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-orange-100 bg-white/92 px-5 py-3.5 text-[14px] font-semibold text-orange-500 shadow-[0_12px_26px_rgba(15,23,42,0.04)] backdrop-blur-md transition-colors active:bg-orange-50">
            <LogOut size={17}/> ออกจากระบบ
          </button>

          <p className="pb-2 text-center text-[11px] text-slate-400">
            HRMS v2.0 · {emp.company?.name_th}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bgFloat {
          0%,100%{transform:translate3d(0,0,0) scale(1)}
          25%{transform:translate3d(18px,-12px,0) scale(1.04)}
          50%{transform:translate3d(-10px,12px,0) scale(0.98)}
          75%{transform:translate3d(10px,6px,0) scale(1.02)}
        }
        @keyframes waveDrift {
          0%,100%{transform:translateX(0) translateY(0) scaleX(1)}
          25%{transform:translateX(2%) translateY(-8px) scaleX(1.02)}
          50%{transform:translateX(-2%) translateY(6px) scaleX(0.99)}
          75%{transform:translateX(1.5%) translateY(-4px) scaleX(1.01)}
        }
        @keyframes salaryShine {
          0%{transform:translateX(-20%) rotate(12deg);opacity:0}
          18%{opacity:0.45}
          42%{transform:translateX(230%) rotate(12deg);opacity:0.16}
          100%{transform:translateX(230%) rotate(12deg);opacity:0}
        }
        @keyframes sparkle {
          0%,100%{opacity:0.25;transform:scale(0.8)}
          50%{opacity:1;transform:scale(1.35)}
        }
      `}</style>
    </div>
  )
}