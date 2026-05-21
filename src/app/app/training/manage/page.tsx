"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Layers, GraduationCap, FileQuestion, ArrowLeft, BarChart3,
  ChevronRight, Loader2, ShieldAlert, Plus,
  Users, Clock, Trophy, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Course = {
  id: string; title: string; status: "draft" | "published" | "archived"
  thumbnail_url?: string | null
  channel?: { name: string; brand?: string | null }
  updated_at: string
}

export default function TrainerManagePage() {
  const [perm, setPerm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [recentCourses, setRecentCourses] = useState<Course[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const loadAll = () => {
    setLoading(true)
    fetch("/api/training/me").then(r => r.json()).then(d => {
      setPerm(d); setLoading(false); setLastRefresh(new Date())
      if (d.can_manage) {
        fetch("/api/training/reports?type=overview").then(r => r.json()).then(s => setStats(s.overview))
        fetch("/api/training/courses").then(r => r.json()).then(c => setRecentCourses((c.courses ?? []).slice(0, 4)))
      }
    })
  }
  useEffect(() => { loadAll() }, [])

  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!perm?.can_manage) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Link href="/app/training" className="inline-flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ArrowLeft size={14} /> กลับ
        </Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <ShieldAlert size={24} className="text-rose-400" />
          </div>
          <p className="font-black text-slate-800">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            เฉพาะคนที่ได้รับสิทธิ์ Training Admin หรือ Supervisor เท่านั้น<br/>
            ติดต่อ HR เพื่อขอสิทธิ์
          </p>
        </div>
      </div>
    )
  }

  const isAdmin = perm.is_training_admin

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5 pb-32">
      <Link href="/app/training" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> ห้องเรียน
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-[0.2em] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
              {isAdmin ? "TRAINING ADMIN" : "SUPERVISOR"}
            </span>
            {perm.supervisor_channel_ids?.length > 0 && (
              <span className="text-[10px] text-slate-400">{perm.supervisor_channel_ids.length} ช่องในความดูแล</span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-800">จัดการเนื้อหาการเรียน</h2>
          <p className="text-slate-400 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
        </div>
        <button onClick={loadAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {format(lastRefresh, "HH:mm")}
        </button>
      </div>

      {/* Action bar */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm">สร้างคอร์ส · จัดการบทเรียน · ติดตามผล Real-time</p>
          <p className="text-sky-100 text-[11px] mt-0.5">เริ่มจากสร้างช่อง → สร้างคอร์ส → เพิ่มบทเรียน → เผยแพร่</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/app/training/manage/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-xl transition-colors">
            <BarChart3 size={14} /> รายงาน
          </Link>
          <Link href="/app/training/manage/courses"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 text-sm font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            <Plus size={14} /> สร้างคอร์ส
          </Link>
        </div>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "คอร์ส",       v: stats.total_courses,            sub: `เผยแพร่ ${stats.published_courses}`, icon: GraduationCap, bg: "bg-indigo-50", ic: "text-indigo-500", vc: "text-indigo-700" },
            { l: "ผู้เรียน",    v: stats.total_enrollments,        sub: `${stats.in_progress_enrollments} กำลังเรียน`, icon: Users, bg: "bg-sky-50", ic: "text-sky-500", vc: "text-sky-700" },
            { l: "กำลังเรียน",  v: stats.in_progress_enrollments,  sub: `ไม่ผ่าน ${stats.failed_enrollments ?? 0}`, icon: Clock, bg: "bg-amber-50", ic: "text-amber-500", vc: "text-amber-700" },
            { l: "จบหลักสูตร",  v: `${stats.completion_rate}%`,    sub: `${stats.completed_enrollments} คน`, icon: Trophy, bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon size={14} className={k.ic} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{k.l}</span>
              </div>
              <p className={`text-2xl font-black ${k.vc}`}>{k.v}</p>
              {k.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Recent courses */}
      {recentCourses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
                <Clock size={14} className="text-sky-500" />
              </div>
              <h3 className="font-black text-slate-800 text-sm">เรียนต่อจากที่ค้างไว้</h3>
            </div>
            <Link href="/app/training/manage/courses" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5">
              ทั้งหมด <ChevronRight size={11} />
            </Link>
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentCourses.map(c => (
              <Link key={c.id} href={`/app/training/manage/courses/${c.id}`}
                className="group bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="relative h-20 bg-slate-100">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center">
                      <GraduationCap size={20} className="text-sky-300" />
                    </div>
                  )}
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    c.status === "published" ? "bg-emerald-100 text-emerald-700" :
                    c.status === "archived" ? "bg-slate-200 text-slate-600" :
                    "bg-white/95 text-slate-700"
                  }`}>
                    {c.status === "published" ? "เผยแพร่" : c.status === "archived" ? "เก็บ" : "ฉบับร่าง"}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-indigo-700">{c.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {c.channel?.name ?? "—"} · {format(new Date(c.updated_at), "d MMM", { locale: th })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MenuCard href="/app/training/manage/channels" icon={<Layers size={16} />}
          label="ช่อง" desc="จัดกลุ่มคอร์ส" accent="indigo" />
        <MenuCard href="/app/training/manage/courses" icon={<GraduationCap size={16} />}
          label="หลักสูตร" desc="สร้าง · แก้คอร์ส" accent="sky" badge="หลัก" />
        <MenuCard href="/app/training/manage/question-bank" icon={<FileQuestion size={16} />}
          label="คลังคำถาม" desc="สุ่มใช้ในควิซ" accent="amber" />
        <MenuCard href="/app/training/manage/reports" icon={<BarChart3 size={16} />}
          label="รายงาน" desc="วิเคราะห์ผล" accent="emerald" />
      </div>

      {/* Quickstart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <span className="text-amber-500">💡</span>
          </div>
          <p className="font-black text-slate-800 text-sm">เริ่มต้นใช้งาน — 4 ขั้นตอน</p>
        </div>
        <ol className="space-y-1.5 ml-2">
          {[
            "สร้างช่อง สำหรับ Brand / ทีมของคุณ",
            "สร้างคอร์ส + อัปโหลด ภาพปก + บทเรียน + วิดีโอ",
            "เพิ่มควิซ ปลายบท / ปลายคอร์ส + Checkpoint ระหว่างวิดีโอ",
            "กดเผยแพร่ และ เพิ่มผู้เรียน ทันที",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="w-5 h-5 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function MenuCard({ href, icon, label, desc, accent, badge }: any) {
  const cls: Record<string, { bg: string; ic: string; hover: string }> = {
    indigo:  { bg: "bg-indigo-50",  ic: "text-indigo-500",  hover: "hover:border-indigo-200" },
    sky:     { bg: "bg-sky-50",     ic: "text-sky-500",     hover: "hover:border-sky-200" },
    amber:   { bg: "bg-amber-50",   ic: "text-amber-500",   hover: "hover:border-amber-200" },
    emerald: { bg: "bg-emerald-50", ic: "text-emerald-500", hover: "hover:border-emerald-200" },
  }
  const C = cls[accent]
  return (
    <Link href={href} className={`group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm transition-all ${C.hover} hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${C.bg} rounded-xl flex items-center justify-center ${C.ic}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-sm text-slate-800">{label}</p>
            {badge && <span className="text-[9px] font-black px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded-full">{badge}</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </Link>
  )
}
