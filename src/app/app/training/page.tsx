"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  GraduationCap, Loader2, CheckCircle2, PlayCircle, AlertCircle,
  Settings, Search, Trophy, Flame, BookOpen, ChevronRight, Target,
  Calendar, Star, Award, TrendingUp,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { th } from "date-fns/locale"

type Tab = "all" | "todo" | "doing" | "done"

const safePct = (v: any) => {
  const n = Number(v ?? 0)
  if (!isFinite(n) || n < 0) return 0
  if (n > 100) return 100
  return Math.round(n)
}

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
    const failed = enrollments.filter(e => e.status === "failed").length
    const avgProg = total > 0
      ? enrollments.reduce((s, e) => s + safePct(e.progress_pct), 0) / total
      : 0
    const scored = enrollments.filter(e => e.final_score !== null && e.final_score !== undefined)
    const avgScore = scored.length > 0
      ? scored.reduce((s, e) => s + Number(e.final_score), 0) / scored.length
      : null
    return { total, todo, doing, done, failed, avgProg, avgScore }
  }, [enrollments])

  const continueLearning = useMemo(() =>
    enrollments
      .filter(e => e.status === "in_progress" && e.last_accessed_at)
      .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
      .slice(0, 3),
  [enrollments])

  const urgentCount = useMemo(() =>
    enrollments.filter(e => {
      if (e.status === "completed") return false
      if (!e.course?.close_date) return false
      const d = differenceInDays(new Date(e.course.close_date), new Date())
      return d >= 0 && d <= 3
    }).length,
  [enrollments])

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
    <div className="p-4 lg:p-6 space-y-4 pb-32 max-w-6xl mx-auto">
      {/* ── Title bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
              <GraduationCap size={22} className="text-sky-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400">MY LEARNING</p>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">การเรียนรู้ของฉัน</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats.total > 0
                  ? <>มี <b className="text-slate-700">{stats.total}</b> คอร์ส · เฉลี่ย <b className="text-sky-700">{stats.avgProg.toFixed(0)}%</b></>
                  : "ยังไม่มีคอร์สที่ได้รับมอบหมาย"}
              </p>
            </div>
          </div>
          {canManage && (
            <Link href="/app/training/manage"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Settings size={12} /> จัดการเนื้อหา
            </Link>
          )}
        </div>
      </div>

      {/* ── Overall progress ── */}
      {stats.total > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 rounded-2xl p-4 lg:p-5 text-white shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider opacity-80">OVERALL PROGRESS</p>
                <p className="text-2xl font-black leading-tight">{stats.avgProg.toFixed(0)}%</p>
                <p className="text-[11px] opacity-80">
                  จบแล้ว {stats.done}/{stats.total} คอร์ส
                  {urgentCount > 0 && <> · <span className="text-amber-200 font-bold">⏰ ใกล้หมดเวลา {urgentCount}</span></>}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-44 max-w-md">
              <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-300 to-green-400 transition-all"
                  style={{ width: `${stats.avgProg}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <KpiCard icon={<BookOpen size={16} />} color="slate" label="ทั้งหมด" value={stats.total} />
        <KpiCard icon={<Target size={16} />} color="amber" label="ต้องเรียน" value={stats.todo} highlight={stats.todo > 0} />
        <KpiCard icon={<Flame size={16} />} color="sky" label="กำลังเรียน" value={stats.doing} />
        <KpiCard icon={<Trophy size={16} />} color="emerald" label="จบหลักสูตร" value={stats.done} />
        <KpiCard icon={<Award size={16} />} color="indigo"
          label="คะแนนเฉลี่ย"
          value={stats.avgScore !== null ? `${stats.avgScore.toFixed(0)}%` : "—"} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-sky-500" />
        </div>
      ) : (
        <>
          {/* ── Continue Learning ── */}
          {continueLearning.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Flame size={14} className="text-orange-500" />
                </div>
                <h2 className="font-black text-slate-800 text-sm">เรียนต่อจากที่ค้างไว้</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {continueLearning.map((e: any) => (
                  <ContinueCard key={e.id} enrollment={e} />
                ))}
              </div>
            </div>
          )}

          {/* ── Search + Filter ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap gap-2 items-center shadow-sm">
            <div className="relative flex-1 min-w-44">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาคอร์ส หรือชื่อช่อง..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-sky-400 focus:bg-white" />
            </div>
            <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
              <FilterTab active={tab === "all"} onClick={() => setTab("all")} count={enrollments.length} label="ทั้งหมด" color="slate" />
              <FilterTab active={tab === "todo"} onClick={() => setTab("todo")} count={stats.todo} label="ต้องเรียน" color="amber" />
              <FilterTab active={tab === "doing"} onClick={() => setTab("doing")} count={stats.doing} label="กำลังเรียน" color="sky" />
              <FilterTab active={tab === "done"} onClick={() => setTab("done")} count={stats.done + stats.failed} label="จบ" color="emerald" />
            </div>
          </div>

          {/* ── Course grid ── */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <GraduationCap size={28} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {enrollments.length === 0 ? "ยังไม่มีคอร์สที่ได้รับมอบหมาย" : "ไม่พบคอร์สในกลุ่มนี้"}
              </p>
              {enrollments.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">รอการมอบหมายจากผู้ดูแลระบบ</p>
              )}
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

function KpiCard({ icon, color, label, value, highlight }: any) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   ring: "ring-slate-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-300" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     ring: "ring-sky-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-200" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-3 shadow-sm ${highlight ? `ring-2 ${p.ring}` : ""}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${p.bg} flex items-center justify-center ${p.text}`}>
          {icon}
        </div>
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
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
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? cls[color] : "text-slate-500 hover:bg-white"}`}>
      {label}
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? "bg-white/25" : "bg-slate-200 text-slate-600"}`}>{count}</span>
    </button>
  )
}

function ContinueCard({ enrollment: e }: { enrollment: any }) {
  const pct = safePct(e.progress_pct)
  return (
    <Link href={`/app/training/${e.course?.id}?en=${e.id}`}
      className="group block bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 overflow-hidden hover:border-orange-400 hover:shadow-md transition-all">
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {e.course?.thumbnail_url
              ? <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              : <Flame size={18} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate text-sm leading-tight">{e.course?.title}</p>
            {e.last_accessed_at && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                เปิดล่าสุด {format(new Date(e.last_accessed_at), "d MMM yyyy HH:mm", { locale: th })}
              </p>
            )}
          </div>
          <ChevronRight size={15} className="text-slate-300 group-hover:text-orange-500 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 h-1.5 bg-white/70 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-black text-orange-700 min-w-9 text-right tabular-nums">{pct}%</span>
        </div>
      </div>
    </Link>
  )
}

function CourseCard({ enrollment: e }: { enrollment: any }) {
  const pct = safePct(e.progress_pct)
  const isCompleted = e.status === "completed"
  const isFailed = e.status === "failed"
  const isInProgress = e.status === "in_progress"
  const isNotStarted = e.status === "not_started"

  const daysLeft = e.course?.close_date ? differenceInDays(new Date(e.course.close_date), new Date()) : null
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !isCompleted
  const isExpired = daysLeft !== null && daysLeft < 0 && !isCompleted

  return (
    <Link href={`/app/training/${e.course?.id}?en=${e.id}`}
      className="group block bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-sky-300 transition-all">
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
        {e.course?.thumbnail_url ? (
          <img src={e.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap size={42} className="text-white/30" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow">
              <CheckCircle2 size={10} /> สำเร็จ
            </span>
          )}
          {isInProgress && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full shadow">
              <PlayCircle size={10} /> กำลังเรียน
            </span>
          )}
          {isNotStarted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500 text-white text-[10px] font-black rounded-full shadow">
              <BookOpen size={10} /> ใหม่
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow">
              <AlertCircle size={10} /> ไม่ผ่าน
            </span>
          )}
        </div>
        {/* Deadline indicator */}
        {isUrgent && (
          <div className="absolute top-2 right-2 bg-rose-500/95 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            ⏰ เหลือ {daysLeft} วัน
          </div>
        )}
        {isExpired && (
          <div className="absolute top-2 right-2 bg-slate-700/95 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            หมดเวลา
          </div>
        )}
        {/* KPI badge */}
        {e.course?.affect_kpi && (
          <div className="absolute bottom-2 right-2 bg-amber-400/95 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            ⭐ KPI
          </div>
        )}
      </div>

      <div className="p-3.5">
        <p className="font-bold text-slate-800 line-clamp-1 text-sm">{e.course?.title}</p>
        {e.course?.channel?.name && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">📁 {e.course.channel.name}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${
              isCompleted ? "bg-gradient-to-r from-emerald-400 to-green-500" :
              isFailed ? "bg-gradient-to-r from-rose-400 to-red-500" :
              "bg-gradient-to-r from-sky-400 to-blue-500"
            }`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-black text-slate-700 min-w-9 text-right tabular-nums">{pct}%</span>
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-500">
          {e.course?.close_date ? (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {format(new Date(e.course.close_date), "d MMM yyyy", { locale: th })}
            </span>
          ) : <span />}
          {e.final_score !== null && e.final_score !== undefined && (
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <Star size={10} fill="currentColor" /> {Number(e.final_score).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
