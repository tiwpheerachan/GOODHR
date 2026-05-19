"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  GraduationCap, Loader2, Clock, CheckCircle2, PlayCircle, AlertCircle,
  Settings, Search, Sparkles, Trophy, TrendingUp, Award, Flame,
  BookOpen, ChevronRight, Target, Calendar, Star,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { th } from "date-fns/locale"

type Tab = "all" | "todo" | "doing" | "done"

export default function MyTrainingPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    fetch("/api/training/enrollments?employee_id=me").then(r => r.json()).then(d => {
      setEnrollments(d.enrollments ?? [])
      setLoading(false)
    })
    fetch("/api/training/me").then(r => r.json()).then(d => setCanManage(!!d.can_manage))
  }, [])

  const stats = useMemo(() => {
    const total = enrollments.length
    const todo = enrollments.filter(e => e.status === "not_started").length
    const doing = enrollments.filter(e => e.status === "in_progress").length
    const done = enrollments.filter(e => e.status === "completed").length
    const avgProg = total > 0 ? enrollments.reduce((s, e) => s + Number(e.progress_pct || 0), 0) / total : 0
    return { total, todo, doing, done, avgProg }
  }, [enrollments])

  const continueLearning = enrollments
    .filter(e => e.status === "in_progress" && e.last_accessed_at)
    .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
    .slice(0, 3)

  const filtered = useMemo(() => {
    let list = enrollments
    if (tab === "todo")  list = list.filter(e => e.status === "not_started")
    if (tab === "doing") list = list.filter(e => e.status === "in_progress")
    if (tab === "done")  list = list.filter(e => e.status === "completed" || e.status === "failed")
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(e =>
        e.course?.title?.toLowerCase().includes(s) ||
        e.course?.channel?.name?.toLowerCase().includes(s)
      )
    }
    return list
  }, [enrollments, tab, search])

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-32 max-w-6xl mx-auto">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-5 lg:p-7 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <GraduationCap size={28} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={11} className="opacity-80" />
                  <p className="text-[10px] font-black tracking-wider opacity-90">MY LEARNING</p>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black">การเรียนรู้ของฉัน</h1>
              </div>
            </div>
            {canManage && (
              <Link href="/app/training/manage"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-xs font-bold border border-white/30">
                <Settings size={12} /> จัดการเนื้อหา
              </Link>
            )}
          </div>

          {/* Stats inline */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <HeroStat icon={<BookOpen size={14} />} label="ทั้งหมด" value={stats.total} />
            <HeroStat icon={<Target size={14} />} label="ต้องเรียน" value={stats.todo} highlight={stats.todo > 0} />
            <HeroStat icon={<Flame size={14} />} label="กำลังเรียน" value={stats.doing} />
            <HeroStat icon={<Trophy size={14} />} label="จบแล้ว" value={stats.done} />
          </div>

          {/* Avg progress */}
          {stats.total > 0 && (
            <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold opacity-90">ความคืบหน้ารวม</span>
                <span className="text-xs font-black">{stats.avgProg.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-300 to-green-400" style={{ width: `${stats.avgProg}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-sky-400" /></div>
      ) : (
        <>
          {/* ── Continue Learning ── */}
          {continueLearning.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={16} className="text-orange-500" />
                <h2 className="font-black text-slate-800">เรียนต่อจากที่ค้างไว้</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {continueLearning.map((e: any) => (
                  <ContinueCard key={e.id} enrollment={e} />
                ))}
              </div>
            </div>
          )}

          {/* ── Search + Filter ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
            <div className="relative flex-1 min-w-44">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาคอร์ส..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
              <FilterTab active={tab === "all"} onClick={() => setTab("all")} count={enrollments.length} label="ทั้งหมด" color="slate" />
              <FilterTab active={tab === "todo"} onClick={() => setTab("todo")} count={stats.todo} label="ต้องเรียน" color="amber" />
              <FilterTab active={tab === "doing"} onClick={() => setTab("doing")} count={stats.doing} label="กำลังเรียน" color="sky" />
              <FilterTab active={tab === "done"} onClick={() => setTab("done")} count={stats.done} label="จบ" color="emerald" />
            </div>
          </div>

          {/* ── Course grid ── */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <GraduationCap size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-400">
                {enrollments.length === 0 ? "ยังไม่มีคอร์สที่ได้รับมอบหมาย" : "ไม่พบคอร์สในกลุ่มนี้"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((e: any) => <CourseCard key={e.id} enrollment={e} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────── Sub-components ────────────────────────────────────────

function HeroStat({ icon, label, value, highlight }: any) {
  return (
    <div className={`bg-white/15 backdrop-blur rounded-xl p-2.5 text-center ${highlight ? "ring-2 ring-amber-300" : ""}`}>
      <div className="flex items-center justify-center gap-1 opacity-80 mb-0.5">
        {icon}
        <span className="text-[9px] font-bold">{label}</span>
      </div>
      <p className="text-xl font-black">{value}</p>
    </div>
  )
}

function FilterTab({ active, onClick, count, label, color }: any) {
  const cls: Record<string, string> = {
    slate:   "bg-slate-700 text-white",
    amber:   "bg-amber-500 text-white",
    sky:     "bg-sky-500 text-white",
    emerald: "bg-emerald-500 text-white",
  }
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? cls[color] : "text-slate-500 hover:bg-white"}`}>
      {label}
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? "bg-white/20" : "bg-slate-200"}`}>{count}</span>
    </button>
  )
}

function ContinueCard({ enrollment: e }: { enrollment: any }) {
  return (
    <Link href={`/app/training/${e.course?.id}?en=${e.id}`}
      className="group block bg-white rounded-2xl border-2 border-orange-200 overflow-hidden hover:border-orange-400 hover:shadow-lg transition-all">
      <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-400" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
            {e.course?.thumbnail_url
              ? <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover rounded-xl" />
              : <Flame size={20} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate text-sm">{e.course?.title}</p>
            {e.last_accessed_at && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                เปิดล่าสุด {format(new Date(e.last_accessed_at), "d MMM yyyy HH:mm", { locale: th })}
              </p>
            )}
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500" style={{ width: `${e.progress_pct}%` }} />
          </div>
          <span className="text-[10px] font-bold text-orange-700">{e.progress_pct}%</span>
        </div>
      </div>
    </Link>
  )
}

function CourseCard({ enrollment: e }: { enrollment: any }) {
  const isCompleted = e.status === "completed"
  const isFailed = e.status === "failed"
  const isInProgress = e.status === "in_progress"
  const isNotStarted = e.status === "not_started"

  const daysLeft = e.course?.close_date ? differenceInDays(new Date(e.course.close_date), new Date()) : null
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !isCompleted

  return (
    <Link href={`/app/training/${e.course?.id}?en=${e.id}`}
      className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-sky-300 transition-all">
      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
        {e.course?.thumbnail_url && (
          <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
        )}
        {!e.course?.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap size={48} className="text-white/30" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow">
              <Trophy size={10} /> สำเร็จ
            </span>
          )}
          {isInProgress && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow">
              <PlayCircle size={10} /> กำลังเรียน
            </span>
          )}
          {isNotStarted && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500 text-white text-[10px] font-black rounded-full shadow">
              <BookOpen size={10} /> ใหม่
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full shadow">
              <AlertCircle size={10} /> ไม่ผ่าน
            </span>
          )}
        </div>
        {/* Urgent indicator */}
        {isUrgent && (
          <div className="absolute top-2 right-2 bg-rose-500/95 text-white text-[10px] font-black px-2 py-1 rounded-full shadow animate-pulse">
            ⏰ เหลือ {daysLeft} วัน
          </div>
        )}
        {/* KPI badge */}
        {e.course?.affect_kpi && (
          <div className="absolute bottom-2 right-2 bg-amber-400/95 text-amber-950 text-[10px] font-black px-2 py-1 rounded-full shadow">
            ⭐ KPI
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="font-bold text-slate-800 line-clamp-1">{e.course?.title}</p>
        {e.course?.channel && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">📁 {e.course.channel.name}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${
              isCompleted ? "bg-gradient-to-r from-emerald-400 to-green-500" :
              isFailed ? "bg-gradient-to-r from-rose-400 to-red-500" :
              "bg-gradient-to-r from-sky-400 to-blue-500"
            }`} style={{ width: `${e.progress_pct}%` }} />
          </div>
          <span className="text-xs font-black text-slate-700 min-w-9 text-right">{e.progress_pct}%</span>
        </div>

        <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
          {e.course?.close_date ? (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {format(new Date(e.course.close_date), "d MMM yyyy", { locale: th })}
            </span>
          ) : <span />}
          {e.final_score !== null && e.final_score !== undefined && (
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <Star size={10} fill="currentColor" /> {e.final_score}%
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
