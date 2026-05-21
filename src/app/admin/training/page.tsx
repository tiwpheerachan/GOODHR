"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  GraduationCap, Layers, FileQuestion, ShieldCheck, BarChart3,
  Users, CheckCircle2, Clock, RefreshCw, Trophy, ArrowRight,
  Plus, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Overview = {
  total_courses: number; published_courses: number
  total_enrollments: number; completed_enrollments: number
  in_progress_enrollments: number; failed_enrollments: number
  completion_rate: number
}

export default function TrainingHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = () => {
    setLoading(true)
    fetch("/api/training/reports?type=overview")
      .then(r => r.json())
      .then(d => { setOverview(d.overview); setLoading(false); setLastRefresh(new Date()) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ระบบเรียนรู้</h2>
          <p className="text-slate-400 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: th })}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {format(lastRefresh, "HH:mm")}
        </button>
      </div>

      {/* Action bar */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm">ระบบเรียนรู้ Pro</p>
          <p className="text-sky-100 text-[11px] mt-0.5">จัดการคอร์ส · ติดตามผลพนักงาน · เชื่อมกับ KPI ของบริษัท</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/admin/training/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold rounded-xl transition-colors">
            <BarChart3 size={14} /> รายงาน
          </Link>
          <Link href="/admin/training/courses"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 text-sm font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            <Plus size={14} /> สร้างคอร์สใหม่
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      {loading || !overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "หลักสูตรทั้งหมด", v: overview.total_courses, sub: `เผยแพร่ ${overview.published_courses}`, icon: Layers,  bg: "bg-indigo-50", ic: "text-indigo-500", vc: "text-indigo-700" },
            { l: "ผู้เรียนทั้งหมด",  v: overview.total_enrollments, sub: `${overview.in_progress_enrollments} กำลังเรียน`, icon: Users,    bg: "bg-sky-50",    ic: "text-sky-500",    vc: "text-sky-700" },
            { l: "จบหลักสูตร",       v: overview.completed_enrollments, sub: `อัตรา ${overview.completion_rate}%`, icon: Trophy,  bg: "bg-emerald-50", ic: "text-emerald-500", vc: "text-emerald-700" },
            { l: "ต้องตามต่อ",        v: overview.in_progress_enrollments + overview.failed_enrollments, sub: `ไม่ผ่าน ${overview.failed_enrollments}`, icon: Clock,    bg: "bg-amber-50",   ic: "text-amber-500",   vc: "text-amber-700" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon size={14} className={k.ic} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{k.l}</span>
              </div>
              <p className={`text-2xl font-black ${k.vc}`}>{k.v.toLocaleString()}</p>
              {k.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Menu grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <MenuCard href="/admin/training/channels" icon={<Layers size={16} />}
          label="ช่อง (Channels)" tag="จัดกลุ่ม" accent="indigo"
          desc="จัดการช่องเรียน — แยกตามแบรนด์/หัวหน้า" />
        <MenuCard href="/admin/training/courses" icon={<GraduationCap size={16} />}
          label="หลักสูตร (Courses)" tag="หลัก" badge="ใหม่" accent="sky"
          desc="สร้าง/แก้คอร์ส + บทเรียน + วิดีโอ + ควิซ + ภาพปก" />
        <MenuCard href="/admin/training/question-bank" icon={<FileQuestion size={16} />}
          label="คลังคำถาม" tag="Q-Bank" accent="amber"
          desc="คำถามรวม — สุ่มมาใช้ในควิซ ป้องกันการลอก" />
        <MenuCard href="/admin/training/permissions" icon={<ShieldCheck size={16} />}
          label="สิทธิ์ Admin" tag="ความปลอดภัย" accent="rose"
          desc="เพิ่ม-ลบสิทธิ์ Training Admin / Supervisor" />
        <MenuCard href="/admin/training/reports" icon={<BarChart3 size={16} />}
          label="รายงาน" tag="วิเคราะห์" accent="emerald"
          desc="สรุปผลรวม · อัตราจบหลักสูตร · คะแนนเฉลี่ย" />
      </div>

      {/* Quickstart tips */}
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

function MenuCard({ href, icon, label, desc, tag, badge, accent }: {
  href: string; icon: React.ReactNode; label: string; desc: string; tag?: string; badge?: string
  accent: "indigo" | "sky" | "amber" | "rose" | "emerald"
}) {
  const cls: Record<string, { bg: string; ic: string; hover: string }> = {
    indigo:  { bg: "bg-indigo-50",  ic: "text-indigo-500",  hover: "hover:border-indigo-200" },
    sky:     { bg: "bg-sky-50",     ic: "text-sky-500",     hover: "hover:border-sky-200" },
    amber:   { bg: "bg-amber-50",   ic: "text-amber-500",   hover: "hover:border-amber-200" },
    rose:    { bg: "bg-rose-50",    ic: "text-rose-500",    hover: "hover:border-rose-200" },
    emerald: { bg: "bg-emerald-50", ic: "text-emerald-500", hover: "hover:border-emerald-200" },
  }
  const C = cls[accent]
  return (
    <Link href={href} className={`group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm transition-all ${C.hover} hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${C.bg} rounded-xl flex items-center justify-center ${C.ic}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          {tag && <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase">{tag}</p>}
          <div className="flex items-center gap-1.5">
            <p className="font-black text-slate-800 truncate text-sm">{label}</p>
            {badge && <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{badge}</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{desc}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5" />
      </div>
    </Link>
  )
}
