"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  GraduationCap, Layers, FileQuestion, ShieldCheck, BarChart3,
  Users, CheckCircle2, Clock, Loader2, ArrowUpRight,
  Trophy, Sparkles, TrendingUp, Activity, Zap, BookOpen,
} from "lucide-react"

type Overview = {
  total_courses: number; published_courses: number
  total_enrollments: number; completed_enrollments: number
  in_progress_enrollments: number; failed_enrollments: number
  completion_rate: number
}

export default function TrainingHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/training/reports?type=overview")
      .then(r => r.json())
      .then(d => { setOverview(d.overview); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Cinematic Hero with floating elements ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-700 p-6 lg:p-10 text-white shadow-2xl anim-fade-up">
        {/* Floating particles */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl anim-float" />
        <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-indigo-300/30 blur-2xl" style={{ animation: "floatY 4s ease-in-out infinite" }} />
        <div className="absolute top-10 right-32 w-2 h-2 bg-white rounded-full opacity-60 anim-pulse-glow" />

        <div className="relative flex items-center gap-5 flex-wrap">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/15 backdrop-blur-xl rounded-3xl flex items-center justify-center anim-float shadow-lg shadow-indigo-900/30 border border-white/20">
            <GraduationCap size={48} className="opacity-90 drop-shadow-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 anim-slide-in">
              <Sparkles size={14} className="opacity-80" />
              <span className="text-[11px] font-black tracking-[0.2em] opacity-90">LEARNING MANAGEMENT SYSTEM</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black mt-2 drop-shadow-lg">ระบบเรียนรู้ Pro</h1>
            <p className="text-sm opacity-90 mt-2">จัดการคอร์สเรียน · ติดตามผลพนักงาน · เชื่อมกับ KPI ของบริษัท</p>
          </div>
        </div>
      </div>

      {/* ── Stats KPI with stagger animation ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton rounded-2xl h-28" />)}
        </div>
      ) : overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-stagger">
          <StatCard label="หลักสูตร" value={overview.total_courses} sub={`เผยแพร่ ${overview.published_courses}`} color="indigo" icon={<Layers />} />
          <StatCard label="ผู้เรียน" value={overview.total_enrollments} sub={`${overview.in_progress_enrollments} กำลังเรียน`} color="sky" icon={<Users />} />
          <StatCard label="จบหลักสูตร" value={overview.completed_enrollments} sub={`อัตรา ${overview.completion_rate}%`} color="emerald" icon={<Trophy />} highlight />
          <StatCard label="ต้องตามต่อ" value={overview.in_progress_enrollments + overview.failed_enrollments} sub={`ไม่ผ่าน ${overview.failed_enrollments}`} color="amber" icon={<Activity />} />
        </div>
      )}

      {/* ── Menu Grid with stagger ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 anim-stagger">
        <MenuCard href="/admin/training/channels" icon={<Layers />}
          title="ช่อง (Channels)" tag="จัดกลุ่ม"
          desc="จัดการช่องเรียน — แยกตามแบรนด์/หัวหน้า เป็นจุดรวมของแต่ละชุดคอร์ส"
          gradient="from-indigo-500 to-purple-600" />
        <MenuCard href="/admin/training/courses" icon={<GraduationCap />}
          title="หลักสูตร (Courses)" tag="หลัก" badge="ใหม่"
          desc="สร้าง/แก้ไขคอร์ส + บทเรียน + วิดีโอ + เอกสาร + ควิซ + ภาพปก"
          gradient="from-sky-500 to-blue-600" featured />
        <MenuCard href="/admin/training/question-bank" icon={<FileQuestion />}
          title="คลังคำถาม" tag="Q-Bank"
          desc="คำถามรวม — สุ่มมาใช้ในควิซได้ ป้องกันการลอกข้อสอบ"
          gradient="from-amber-500 to-orange-600" />
        <MenuCard href="/admin/training/permissions" icon={<ShieldCheck />}
          title="สิทธิ์ Admin" tag="ความปลอดภัย"
          desc="เพิ่ม-ลบสิทธิ์ Training Admin / Channel Supervisor"
          gradient="from-rose-500 to-pink-600" />
        <MenuCard href="/admin/training/reports" icon={<BarChart3 />}
          title="รายงาน" tag="วิเคราะห์"
          desc="สรุปผลรวม · อัตราจบหลักสูตร · คะแนนเฉลี่ย · ดาวน์โหลดรายงาน"
          gradient="from-emerald-500 to-green-600" />
      </div>

      {/* ── Pro tip ── */}
      <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 anim-fade-up">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800">เริ่มต้นใช้งาน — 4 ขั้นตอน</p>
          <ol className="text-xs text-slate-600 mt-1.5 space-y-0.5 list-decimal ml-4">
            <li><b>สร้างช่อง</b> สำหรับ Brand / ทีมของคุณ</li>
            <li><b>สร้างคอร์ส</b> + อัปโหลด <b>ภาพปก</b> + บทเรียน + วิดีโอ</li>
            <li><b>เพิ่มควิซ</b> ปลายบท / ปลายคอร์ส + Checkpoint ระหว่างวิดีโอ</li>
            <li><b>กดเผยแพร่</b> และ <b>เพิ่มผู้เรียน</b> ทันที</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, icon, highlight }: { label: string; value: number; sub?: string; color: string; icon: React.ReactNode; highlight?: boolean }) {
  const cls: Record<string, string> = {
    indigo:  "from-indigo-500 to-indigo-600 shadow-indigo-200",
    sky:     "from-sky-500 to-blue-600 shadow-sky-200",
    amber:   "from-amber-500 to-orange-600 shadow-amber-200",
    emerald: "from-emerald-500 to-green-600 shadow-emerald-200",
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cls[color]} text-white rounded-2xl p-4 shadow-lg card-lift ${highlight ? "ring-4 ring-emerald-300/50" : ""}`}>
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2 opacity-90">
          <span className="text-[11px] font-bold">{label}</span>
          <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-3xl lg:text-4xl font-black">{value.toLocaleString()}</p>
        {sub && <p className="text-[11px] mt-1 opacity-80">{sub}</p>}
      </div>
    </div>
  )
}

function MenuCard({
  href, icon, title, desc, gradient, tag, badge, featured,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
  gradient: string
  tag?: string
  badge?: string
  featured?: boolean
}) {
  return (
    <Link href={href}
      className={`group relative overflow-hidden bg-white border rounded-3xl p-5 card-lift ${featured ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"}`}>
      {/* Top gradient accent */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      {badge && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
          {badge}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <span className="drop-shadow">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          {tag && <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">{tag}</p>}
          <p className="font-black text-slate-800 group-hover:text-sky-700 transition-colors">{title}</p>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{desc}</p>
        </div>
      </div>

      <div className="flex items-center justify-end mt-3 gap-1 text-sky-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
        <span className="text-xs font-bold">เปิด</span>
        <ArrowUpRight size={14} />
      </div>
    </Link>
  )
}
