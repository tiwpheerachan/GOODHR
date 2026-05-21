"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  Users, CheckCircle2, Clock, AlertCircle, Award, TrendingUp,
  Star, Activity, BookOpen, Loader2, Eye, FileText, Trophy,
  Wifi, BarChart3, Target, ChevronRight, FileSpreadsheet,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import LearnerDetailModal from "@/components/training/LearnerDetailModal"
import ModulePanel from "@/components/training/dashboard/ModulePanel"
import QuizPanel from "@/components/training/dashboard/QuizPanel"

// ════════════════════════════════════════════════════════════════════
// Reusable Course Dashboard component — สำหรับ admin + trainer
// ════════════════════════════════════════════════════════════════════

export default function CourseDashboard({ courseId, basePath, compact = false }: { courseId: string; basePath: string; compact?: boolean }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)         // initial load only
  const [refreshing, setRefreshing] = useState(false)  // silent background refresh
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [tab, setTab] = useState<"overview" | "learners" | "modules" | "quizzes" | "feedback">("overview")
  const [brandFilter, setBrandFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [selectedLearner, setSelectedLearner] = useState<any | null>(null)
  const [exporting, setExporting] = useState(false)

  const exportXlsx = async () => {
    if (exporting) return
    setExporting(true)
    const t = toast.loading("กำลังสร้างไฟล์ Excel...")
    try {
      const res = await fetch(`/api/training/reports/export?course_id=${courseId}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j.error || `ดาวน์โหลดไม่สำเร็จ (${res.status})`, { id: t })
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") || ""
      const m = cd.match(/filename="?([^"]+)"?/)
      const filename = m?.[1] || `training_course_${courseId}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success("ดาวน์โหลดแล้ว", { id: t })
    } catch (e: any) {
      toast.error(e?.message || "เกิดข้อผิดพลาด", { id: t })
    } finally {
      setExporting(false)
    }
  }

  // initial load only — shows full-page spinner
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/training/dashboard?course_id=${courseId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLastRefreshed(new Date()) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  // silent refresh every 30s — does NOT replace UI with spinner
  // pauses while a learner modal is open so the user isn't disrupted mid-read
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      if (selectedLearner) return  // skip while modal open
      if (typeof document !== "undefined" && document.hidden) return  // skip if tab hidden
      setRefreshing(true)
      try {
        const r = await fetch(`/api/training/dashboard?course_id=${courseId}`)
        const d = await r.json()
        if (!cancelled) {
          setData(d)
          setLastRefreshed(new Date())
        }
      } catch { /* ignore — keep showing previous data */ }
      finally { if (!cancelled) setRefreshing(false) }
    }
    const i = setInterval(refresh, 30_000)
    return () => { cancelled = true; clearInterval(i) }
  }, [courseId, selectedLearner])

  // ⭐ Hooks ต้องอยู่ก่อน early-return เสมอ (React rules of hooks)
  const learners: any[] = data?.learners ?? []
  const filteredLearners = useMemo(() => {
    return learners.filter((l: any) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (brandFilter && !(l.employee?.brand ?? []).includes(brandFilter)) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${l.employee?.first_name_th} ${l.employee?.last_name_th} ${l.employee?.nickname || ""} ${l.employee?.employee_code}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [learners, statusFilter, brandFilter, search])

  const brands = useMemo(
    () => Array.from(new Set(learners.flatMap((l: any) => l.employee?.brand ?? []).filter(Boolean))) as string[],
    [learners]
  )

  // full-screen spinner only on the very first load
  if (loading && !data) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-sky-400" /></div>
  if (!data || !data.overview || !data.course) {
    return (
      <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-2xl">
        <p className="text-sm font-bold text-slate-500">โหลด Dashboard ไม่สำเร็จ</p>
        {data?.error && <p className="text-xs text-rose-500 mt-1">{data.error}</p>}
      </div>
    )
  }

  const { overview, modules, quizzes, feedback, course } = data

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {/* Hero — hidden in compact mode (builder already has its own) */}
      {!compact && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-500 p-5 lg:p-6 text-white shadow-md">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] opacity-80">{course.channel?.name}{course.channel?.brand ? ` · ${course.channel.brand}` : ""}</p>
              <h1 className="text-2xl lg:text-3xl font-black mt-0.5">{course.title}</h1>
              <p className="text-xs opacity-90 mt-1">📊 Dashboard · ภาพรวมและรายละเอียดทั้งหมด</p>
            </div>
            <div className="flex items-center gap-2">
              {overview.online_count > 0 && (
                <div className="bg-emerald-400/30 backdrop-blur border border-emerald-300/50 rounded-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                  <span className="text-xs font-black">{overview.online_count} กำลังเรียนอยู่</span>
                </div>
              )}
              <button onClick={exportXlsx} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm disabled:opacity-50">
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
                ดาวน์โหลด Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact mode header — slim with live indicator */}
      {compact && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs">
            <BarChart3 size={14} className="text-indigo-500" />
            <p className="font-black text-slate-700">Dashboard สด</p>
            <span className="text-[10px] text-slate-400" title={`อัปเดตล่าสุด ${format(lastRefreshed, "HH:mm:ss", { locale: th })}`}>
              {refreshing
                ? <span className="inline-flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> กำลังอัปเดต</span>
                : `อัปเดต ${format(lastRefreshed, "HH:mm", { locale: th })}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {overview.online_count > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-700">{overview.online_count} กำลังเรียน</span>
              </div>
            )}
            <button onClick={exportXlsx} disabled={exporting}
              title="ดาวน์โหลดรายงาน Excel ของคอร์สนี้"
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-black disabled:opacity-50">
              {exporting ? <Loader2 size={11} className="animate-spin" /> : <FileSpreadsheet size={11} />}
              Excel
            </button>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4 gap-3"}`}>
        <KpiCard icon={<Users size={18} />} label="ผู้เรียนทั้งหมด" value={overview.total_enrollments} color="indigo" />
        <KpiCard icon={<CheckCircle2 size={18} />} label="จบหลักสูตร" value={overview.completed}
          sub={`อัตรา ${overview.completion_rate}%`} color="emerald" />
        <KpiCard icon={<Clock size={18} />} label="กำลังเรียน" value={overview.in_progress} color="amber" />
        <KpiCard icon={<Trophy size={18} />} label="คะแนนเฉลี่ย" value={`${overview.avg_quiz_score}%`}
          sub={overview.feedback_count > 0 ? `⭐ ${overview.avg_feedback_rating}/5 (${overview.feedback_count})` : ""}
          color="rose" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {[
          { k: "overview",  l: "ภาพรวม",        i: <BarChart3 size={14} /> },
          { k: "learners",  l: "ผู้เรียน",       i: <Users size={14} />,    n: learners.length },
          { k: "modules",   l: "บทเรียน",       i: <BookOpen size={14} />, n: modules.length },
          { k: "quizzes",   l: "ควิซ",          i: <Award size={14} />,    n: quizzes.length },
          { k: "feedback",  l: "ฟีดแบ็ก",       i: <Star size={14} />,     n: feedback.length },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${tab === t.k ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}`}>
            {t.i} {t.l}
            {t.n !== undefined && t.n > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.k ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}>{t.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-black text-slate-800">📊 สถานะผู้เรียน</p>
            <StatusBar label="ยังไม่เริ่ม"  count={overview.not_started}   total={overview.total_enrollments} color="bg-slate-400" />
            <StatusBar label="กำลังเรียน"   count={overview.in_progress}   total={overview.total_enrollments} color="bg-amber-400" />
            <StatusBar label="จบแล้ว"       count={overview.completed}     total={overview.total_enrollments} color="bg-emerald-500" />
            <StatusBar label="ไม่ผ่าน"      count={overview.failed}        total={overview.total_enrollments} color="bg-rose-400" />
          </div>

          {/* Online now */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Wifi size={14} className="text-emerald-500" /> กำลังเรียนอยู่ ({overview.online_count})
            </p>
            {data.online.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ไม่มีคนกำลังเรียนตอนนี้</p>
            ) : (
              <div className="space-y-2">
                {data.online.map((o: any) => (
                  <div key={o.id} className="flex items-center gap-2.5 p-2 bg-emerald-50/50 rounded-lg">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700 overflow-hidden">
                        {o.employee?.avatar_url ? <img src={o.employee.avatar_url} alt="" className="w-full h-full object-cover" /> : o.employee?.first_name_th?.[0]}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{o.employee?.first_name_th} {o.employee?.last_name_th}</p>
                      <p className="text-[10px] text-slate-500">ความคืบหน้า {o.progress_pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top performers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 lg:col-span-2">
            <p className="text-sm font-black text-slate-800">🏆 5 อันดับเด่น (สำเร็จ + คะแนนสูง)</p>
            <div className="space-y-2">
              {filteredLearners
                .filter((l: any) => l.status === "completed" || l.progress_pct > 50)
                .sort((a: any, b: any) => Number(b.final_score || 0) - Number(a.final_score || 0))
                .slice(0, 5)
                .map((l: any, i: number) => (
                  <div key={l.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{l.employee?.first_name_th} {l.employee?.last_name_th}</p>
                      <p className="text-[10px] text-slate-400">{l.employee?.department?.name}</p>
                    </div>
                    {l.final_score && <span className="font-black text-sm text-emerald-700">{l.final_score}%</span>}
                  </div>
                ))}
              {filteredLearners.filter((l: any) => l.progress_pct > 50).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีผู้เรียนคืบหน้าเกิน 50%</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Learners */}
      {tab === "learners" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Eye size={12} className="text-indigo-400" />
            <span>คลิกที่แถวเพื่อดูรายละเอียด — ทุกครั้งที่สอบ · คะแนน · ผ่าน/ไม่ผ่าน · เวลา · checkpoint</span>
          </div>
          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ/รหัส..."
              className="flex-1 min-w-44 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">ทุกสถานะ</option>
              <option value="not_started">ยังไม่เริ่ม</option>
              <option value="in_progress">กำลังเรียน</option>
              <option value="completed">จบแล้ว</option>
              <option value="failed">ไม่ผ่าน</option>
            </select>
            {brands.length > 0 && (
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">ทุก Brand</option>
                {brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>

          {/* Learner table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <Th>พนักงาน</Th>
                    <Th>สถานะ</Th>
                    <Th>คืบหน้า</Th>
                    <Th>บทเรียน</Th>
                    <Th>ควิซ</Th>
                    <Th>Checkpoint</Th>
                    <Th>คะแนน</Th>
                    <Th>กิจกรรมล่าสุด</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLearners.map((l: any) => (
                    <tr key={l.id} onClick={() => setSelectedLearner(l)}
                      className="hover:bg-indigo-50/40 cursor-pointer group transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700 overflow-hidden">
                              {l.employee?.avatar_url ? <img src={l.employee.avatar_url} alt="" className="w-full h-full object-cover" /> : l.employee?.first_name_th?.[0]}
                            </div>
                            {l.is_online && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{l.employee?.first_name_th} {l.employee?.last_name_th}</p>
                            <p className="text-[10px] text-slate-400">{l.employee?.employee_code} · {l.employee?.department?.name ?? "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${l.progress_pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold">{l.progress_pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{l.modules_completed} / {l.modules_total}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {l.quiz_attempts > 0 ? (
                          <span className="text-slate-700">{l.quiz_attempts} ครั้ง</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {l.checkpoint_total > 0 ? (
                          <span className="flex items-center gap-1">
                            <span className="text-emerald-600 font-bold">{l.checkpoint_correct}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-600">{l.checkpoint_total}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black">
                        {l.final_score ? (
                          <span className={l.final_score >= 70 ? "text-emerald-700" : "text-rose-700"}>
                            {l.final_score}%
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-slate-500">
                        {l.last_accessed_at
                          ? format(new Date(l.last_accessed_at), "d MMM HH:mm", { locale: th })
                          : "—"}
                        {l.total_tab_switches > 3 && (
                          <span className="block text-rose-500 mt-0.5">⚠ สลับแท็บ {l.total_tab_switches} ครั้ง</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ดูรายละเอียด <ChevronRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredLearners.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-12 text-center text-slate-400">ไม่พบผู้เรียน</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Modules */}
      {tab === "modules" && (
        <div className="space-y-3 anim-stagger">
          {modules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <BookOpen size={32} className="mx-auto mb-2 text-slate-200" />
              คอร์สนี้ยังไม่มีบทเรียน
            </div>
          ) : modules.map((m: any, i: number) => (
            <ModulePanel key={m.id} module={m} totalEnrolled={overview.total_enrollments} index={i} />
          ))}
        </div>
      )}

      {/* TAB: Quizzes */}
      {tab === "quizzes" && (
        <div className="space-y-3 anim-stagger">
          {quizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <Award size={32} className="mx-auto mb-2 text-slate-200" />
              คอร์สนี้ยังไม่มีควิซ
            </div>
          ) : quizzes.map((q: any, i: number) => (
            <QuizPanel key={q.id} quiz={q} totalEnrolled={overview.total_enrollments} index={i} />
          ))}
        </div>
      )}

      {/* Learner detail modal */}
      {selectedLearner && (
        <LearnerDetailModal
          learner={selectedLearner}
          modules={modules}
          quizzes={quizzes}
          courseTitle={course.title}
          passingScore={Number(course.passing_score ?? 70)}
          maxRetries={Number(course.max_retries ?? 3)}
          onClose={() => setSelectedLearner(null)}
        />
      )}

      {/* TAB: Feedback */}
      {tab === "feedback" && (
        <div className="space-y-2">
          {feedback.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <Star size={32} className="mx-auto mb-2 text-slate-200" />
              ยังไม่มีฟีดแบ็ก
            </div>
          ) : feedback.map((f: any, i: number) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center font-black text-xs text-rose-700 flex-shrink-0">
                  {f.employee?.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <p className="font-bold text-sm">{f.employee?.first_name_th} {f.employee?.last_name_th}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={12} fill={n <= f.rating ? "currentColor" : "none"}
                          className={n <= f.rating ? "text-amber-400" : "text-slate-200"} />
                      ))}
                    </div>
                  </div>
                  {f.comment && <p className="text-sm text-slate-600 mt-1">{f.comment}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{format(new Date(f.created_at), "d MMM yyyy HH:mm", { locale: th })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color }: any) {
  const cls: Record<string, string> = {
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    amber: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    rose: "from-rose-50 to-rose-100 text-rose-700 border-rose-200",
  }
  return (
    <div className={`bg-gradient-to-br ${cls[color]} border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2 opacity-70">
        <span className="text-[11px] font-bold">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-700">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { l: string; c: string }> = {
    not_started: { l: "ยังไม่เริ่ม", c: "bg-slate-100 text-slate-600" },
    in_progress: { l: "กำลังเรียน", c: "bg-amber-100 text-amber-700" },
    completed:   { l: "จบแล้ว",    c: "bg-emerald-100 text-emerald-700" },
    failed:      { l: "ไม่ผ่าน",   c: "bg-rose-100 text-rose-700" },
  }
  const s = cfg[status] || { l: status, c: "bg-slate-100 text-slate-600" }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.c}`}>{s.l}</span>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-black text-slate-500 whitespace-nowrap">{children}</th>
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}
