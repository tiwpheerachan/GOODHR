"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Layers, GraduationCap, FileQuestion, ArrowLeft,
  ChevronRight, Loader2, ShieldAlert, Sparkles, Plus,
  Users, CheckCircle2, Clock, Trophy, BarChart3, ShieldCheck,
  PlayCircle, Image as ImageIcon, Save, Eye, Zap, ArrowUpRight,
  BookOpen,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Course = {
  id: string; title: string; status: "draft" | "published" | "archived"
  thumbnail_url?: string | null
  channel?: { name: string; brand?: string | null }
  updated_at: string
  version?: number
}

export default function TrainerManagePage() {
  const [perm, setPerm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [recentCourses, setRecentCourses] = useState<Course[]>([])

  useEffect(() => {
    fetch("/api/training/me").then(r => r.json()).then(d => {
      setPerm(d); setLoading(false)
      if (d.can_manage) {
        fetch("/api/training/reports?type=overview")
          .then(r => r.json()).then(s => setStats(s.overview))
        fetch("/api/training/courses")
          .then(r => r.json())
          .then(c => setRecentCourses((c.courses ?? []).slice(0, 4)))
      }
    })
  }, [])

  if (loading) return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="skeleton rounded-3xl h-44" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton rounded-2xl h-24" />)}
      </div>
    </div>
  )

  if (!perm?.can_manage) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Link href="/app/training" className="inline-flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ArrowLeft size={14} /> กลับ
        </Link>
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center anim-fade-up">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <ShieldAlert size={28} className="text-rose-400" />
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

      {/* ── Cinematic Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-700 to-sky-700 p-5 lg:p-7 text-white shadow-2xl anim-fade-up">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl anim-float" />
        <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-indigo-300/30 blur-2xl" style={{ animation: "floatY 4s ease-in-out infinite" }} />
        <div className="absolute top-10 right-32 w-2 h-2 bg-white rounded-full opacity-60 anim-pulse-glow" />

        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/15 backdrop-blur-xl rounded-3xl flex items-center justify-center anim-float shadow-lg border border-white/20">
            <GraduationCap size={36} className="opacity-90 drop-shadow" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 anim-slide-in flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur border border-white/30 rounded-full text-[10px] font-black tracking-wider">
                <Sparkles size={10} /> {isAdmin ? "TRAINING ADMIN" : "SUPERVISOR"}
              </span>
              {perm.supervisor_channel_ids?.length > 0 && (
                <span className="text-[10px] opacity-80">{perm.supervisor_channel_ids.length} ช่องในความดูแล</span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black mt-1.5 drop-shadow">จัดการเนื้อหาการเรียน</h1>
            <p className="text-xs opacity-90 mt-1">สร้างคอร์ส · อัปโหลดวิดีโอ · กำหนดควิซ · ติดตามผลแบบ Real-time</p>
          </div>
          <Link href="/app/training/manage/courses"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl text-sm font-black shadow-lg shadow-indigo-900/20 transition-all card-lift">
            <Plus size={16} /> สร้างคอร์ส
          </Link>
        </div>
      </div>

      {/* ── KPI Cards (gradient, animated) ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-stagger">
          <KpiCard icon={<GraduationCap />} label="คอร์ส" value={stats.total_courses}
            sub={`เผยแพร่ ${stats.published_courses}`} color="indigo" />
          <KpiCard icon={<Users />} label="ผู้เรียน" value={stats.total_enrollments}
            sub={`${stats.in_progress_enrollments} กำลังเรียน`} color="sky" />
          <KpiCard icon={<Clock />} label="กำลังเรียน" value={stats.in_progress_enrollments}
            sub={`ไม่ผ่าน ${stats.failed_enrollments ?? 0}`} color="amber" />
          <KpiCard icon={<Trophy />} label="จบหลักสูตร" value={`${stats.completion_rate}%`}
            sub={`${stats.completed_enrollments} คน`} color="emerald" highlight />
        </div>
      )}

      {/* ── Continue editing (recent courses with covers) ── */}
      {recentCourses.length > 0 && (
        <div className="anim-fade-up">
          <div className="flex items-center justify-between px-1 mb-2.5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-sky-500" /> เรียนต่อจากที่ค้างไว้
            </p>
            <Link href="/app/training/manage/courses" className="text-[11px] font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-0.5">
              ทั้งหมด <ChevronRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 anim-stagger">
            {recentCourses.map(c => (
              <Link key={c.id} href={`/app/training/manage/courses/${c.id}`}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden card-lift">
                <div className="relative h-24 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <GraduationCap size={28} />
                    </div>
                  )}
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full backdrop-blur ${
                    c.status === "published" ? "bg-emerald-500/90 text-white" :
                    c.status === "archived" ? "bg-slate-700/80 text-white" :
                    "bg-white/90 text-slate-700"
                  }`}>
                    {c.status === "published" ? "เผยแพร่" : c.status === "archived" ? "เก็บ" : "ฉบับร่าง"}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-sky-700">{c.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {c.channel?.name ?? "—"} · {format(new Date(c.updated_at), "d MMM", { locale: th })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main menu ── */}
      <div className="anim-fade-up">
        <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2.5 px-1">
          <Layers className="inline mr-1.5" size={12} /> เมนูจัดการ
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 anim-stagger">
          <MenuCard href="/app/training/manage/channels" icon={<Layers />}
            title="ช่อง (Channels)" tag="จัดกลุ่ม"
            desc="รวมคอร์สแยกตามแบรนด์/ทีม + อัปโหลดภาพปกช่อง"
            gradient="from-indigo-500 to-purple-600" />
          <MenuCard href="/app/training/manage/courses" icon={<GraduationCap />}
            title="หลักสูตร (Courses)" tag="หลัก" badge="ใหม่"
            desc="สร้าง+แก้คอร์ส · บทเรียน · วิดีโอ · ภาพปก · ควิซ · ฉบับร่าง"
            gradient="from-sky-500 to-blue-600" featured />
          <MenuCard href="/app/training/manage/question-bank" icon={<FileQuestion />}
            title="คลังคำถาม" tag="Q-Bank"
            desc="คำถามรวม สุ่มมาใช้ในควิซ ป้องกันการลอก"
            gradient="from-amber-500 to-orange-600" />
        </div>
      </div>

      {/* ── New features showcase ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 border border-sky-200 rounded-3xl p-5 anim-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
            <Zap size={16} className="text-white" />
          </div>
          <p className="font-black text-slate-800 text-sm">ฟีเจอร์ใหม่ — ใช้ได้แล้วทันที</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <FeatureChip icon={<ImageIcon size={12} />} title="ภาพปกทุกระดับ"
            desc="อัปโหลดภาพปกได้ทั้งคอร์ส + บทเรียน — สวยขึ้น เลือกง่ายขึ้น" />
          <FeatureChip icon={<Save size={12} />} title="ฉบับร่าง (Draft)"
            desc="แก้ไขแล้วค่อยเผยแพร่ — ไม่มีการเปลี่ยนแปลงเด้งให้ผู้เรียนทันที" />
          <FeatureChip icon={<BarChart3 size={12} />} title="Dashboard สด"
            desc="ดูผลผู้เรียน + คะแนนแต่ละคนแบบ Real-time ข้างหน้าแก้ไขเลย" />
          <FeatureChip icon={<BookOpen size={12} />} title="ข้อมูลการเรียน"
            desc="ใส่เป้าหมาย กลุ่มเป้าหมาย แท็ก — ผู้เรียนเข้าใจคอร์สได้ดีขึ้น" />
          <FeatureChip icon={<PlayCircle size={12} />} title="YouTube + Checkpoint"
            desc="ใส่ลิงก์ YouTube ได้ + Checkpoint quiz เด้งระหว่างวิดีโอ" />
          <FeatureChip icon={<Eye size={12} />} title="Per-learner Detail"
            desc="ดูได้ว่าแต่ละคนทำควิซแต่ละครั้งได้กี่คะแนน ผ่าน/ไม่ผ่าน" />
        </div>
      </div>

      {/* ── Quickstart steps ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 anim-fade-up">
        <p className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" /> เริ่มต้นใช้งาน — 4 ขั้นตอน
        </p>
        <ol className="space-y-2">
          <Step n={1} title="สร้างช่อง (Channel)" desc="แยกคอร์สตามแบรนด์ / ทีม / แผนก" href="/app/training/manage/channels" />
          <Step n={2} title="สร้างคอร์ส + อัปโหลดภาพปก" desc="ใส่ชื่อ + รายละเอียด + ภาพปก สวย ๆ" href="/app/training/manage/courses" />
          <Step n={3} title="เพิ่มบทเรียน + วิดีโอ + ควิซ" desc="วิดีโออัปโหลด/YouTube + checkpoint + ควิซจบบท" />
          <Step n={4} title="กดเผยแพร่ + เพิ่มผู้เรียน" desc="หลังเผยแพร่ผู้เรียนเห็นทันที ดู progress สดได้ที่ Dashboard" />
        </ol>
      </div>
    </div>
  )
}

// ── Sub components ────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, highlight }: any) {
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
        <p className="text-3xl font-black">{value}</p>
        {sub && <p className="text-[11px] mt-1 opacity-80">{sub}</p>}
      </div>
    </div>
  )
}

function MenuCard({ href, icon, title, desc, gradient, tag, badge, featured }: any) {
  return (
    <Link href={href}
      className={`group relative overflow-hidden bg-white border rounded-3xl p-5 card-lift ${featured ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      {badge && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
          {badge}
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {tag && <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mb-0.5">{tag}</p>}
          <p className="font-black text-slate-800 group-hover:text-sky-700 transition-colors">{title}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{desc}</p>
        </div>
      </div>
      <div className="flex items-center justify-end mt-3 gap-1 text-sky-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
        <span className="text-xs font-bold">เปิด</span>
        <ArrowUpRight size={14} />
      </div>
    </Link>
  )
}

function FeatureChip({ icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-2 bg-white/70 backdrop-blur border border-white rounded-xl p-2.5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-800">{title}</p>
        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  )
}

function Step({ n, title, desc, href }: { n: number; title: string; desc: string; href?: string }) {
  const inner = (
    <div className="flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors">
      <span className="w-7 h-7 bg-gradient-to-br from-sky-400 to-indigo-500 text-white rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      {href && <ChevronRight size={14} className="text-slate-300 mt-1.5 flex-shrink-0" />}
    </div>
  )
  if (href) return <li><Link href={href}>{inner}</Link></li>
  return <li>{inner}</li>
}
