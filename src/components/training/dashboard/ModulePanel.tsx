"use client"
import { useState } from "react"
import {
  PlayCircle, Users, CheckCircle2, XCircle, Clock, TrendingDown, Target,
  ChevronDown, ChevronUp, Eye, AlertTriangle, BookOpen, BarChart3,
} from "lucide-react"

type CheckpointStat = {
  id: string
  trigger_at_sec: number
  question_text: string
  question_type: string
  answered: number
  correct: number
  pct_correct: number
}

type ModuleStat = {
  id: string
  order_no: number
  title: string
  description?: string | null
  thumbnail_url?: string | null
  video_duration_sec?: number | null
  required_watch_pct?: number
  completed_count: number
  started_count: number
  avg_watch_pct: number
  avg_watch_sec: number
  avg_last_position_sec: number
  drop_off_pct: number
  buckets: number[] // [0, 1-25, 25-50, 50-75, 75-100]
  checkpoint_total: number
  checkpoint_correct: number
  checkpoint_questions: CheckpointStat[]
  slow_learners: any[]
  not_started: any[]
}

const BUCKET_LABELS = ["ยังไม่ดู", "1–25%", "25–50%", "50–75%", "75–100%"]
const BUCKET_COLORS = ["bg-slate-300", "bg-rose-300", "bg-amber-300", "bg-sky-400", "bg-emerald-500"]

export default function ModulePanel({ module: m, totalEnrolled, index }: { module: ModuleStat; totalEnrolled: number; index: number }) {
  const [open, setOpen] = useState(false)
  const maxBucket = Math.max(1, ...m.buckets)
  const completionRate = totalEnrolled > 0 ? Math.round((m.completed_count / totalEnrolled) * 100) : 0
  const dur = m.video_duration_sec ?? 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden anim-fade-up card-lift">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail */}
        <div className="relative w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sm">
          {m.thumbnail_url ? (
            <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60">
              <PlayCircle size={28} />
            </div>
          )}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-black rounded">#{m.order_no || index + 1}</div>
          {dur > 0 && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded">
              {fmt(dur)}
            </div>
          )}
        </div>

        {/* Title + key stats */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 text-sm">{m.title}</p>
          {m.description && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{m.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-2.5">
            <Mini icon={<Users size={11} />} label="เริ่มดู" value={`${m.started_count}/${totalEnrolled}`} accent="text-sky-600" />
            <Mini icon={<CheckCircle2 size={11} />} label="ดูจบ" value={`${m.completed_count}/${totalEnrolled}`} accent="text-emerald-600" sub={`${completionRate}%`} />
            <Mini icon={<BarChart3 size={11} />} label="% เฉลี่ย" value={`${m.avg_watch_pct}%`} accent="text-indigo-600" />
            <Mini icon={<Clock size={11} />} label="เวลาเฉลี่ย" value={fmt(m.avg_watch_sec)} accent="text-amber-600" />
          </div>
        </div>

        <button onClick={() => setOpen(o => !o)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all flex-shrink-0 ${
            open ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? "ย่อ" : "ดูเพิ่ม"}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4 anim-fade-up">
          {/* Watch distribution */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <BarChart3 size={12} className="text-indigo-500" /> การกระจายของ % การดู
              </p>
              <span className="text-[10px] text-slate-400">เกณฑ์ผ่าน {m.required_watch_pct ?? 80}%</span>
            </div>
            <div className="flex items-end gap-1.5 h-24 bg-white border border-slate-200 rounded-xl p-3">
              {m.buckets.map((cnt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div className={`w-full rounded-t ${BUCKET_COLORS[i]} transition-all`}
                      style={{ height: `${(cnt / maxBucket) * 100}%`, minHeight: cnt > 0 ? 4 : 0 }}
                      title={`${BUCKET_LABELS[i]}: ${cnt} คน`} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">{cnt}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {BUCKET_LABELS.map((l, i) => (
                <p key={i} className="text-[9px] text-slate-500 text-center">{l}</p>
              ))}
            </div>
          </div>

          {/* Drop-off bar */}
          {dur > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <TrendingDown size={12} className="text-rose-500" /> จุดที่ผู้เรียนหยุดเฉลี่ย
                </p>
                <span className="text-[10px] font-black text-slate-700">
                  {fmt(m.avg_last_position_sec)} / {fmt(dur)} ({m.drop_off_pct}%)
                </span>
              </div>
              <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-indigo-500"
                  style={{ width: `${Math.min(100, m.drop_off_pct)}%` }} />
                <div className="absolute inset-y-0 right-0 w-px bg-emerald-500"
                  style={{ right: `${100 - (m.required_watch_pct ?? 80)}%` }} title={`เกณฑ์ผ่าน ${m.required_watch_pct ?? 80}%`} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                💡 ถ้าเส้นต่ำกว่าเกณฑ์ผ่านมาก อาจมีจุดในวิดีโอที่ทำให้ผู้เรียนเลิกดู
              </p>
            </div>
          )}

          {/* Checkpoint detail */}
          {m.checkpoint_questions.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-2">
                <Target size={12} className="text-purple-500" /> Checkpoint ระหว่างวิดีโอ ({m.checkpoint_questions.length} จุด)
              </p>
              <div className="space-y-1.5">
                {m.checkpoint_questions.map((cp, i) => (
                  <div key={cp.id} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      cp.pct_correct >= 80 ? "bg-emerald-100 text-emerald-700" :
                      cp.pct_correct >= 50 ? "bg-amber-100 text-amber-700" :
                      cp.answered === 0 ? "bg-slate-100 text-slate-400" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      <Target size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-700 truncate">#{i + 1} · {cp.question_text}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded">{cp.question_type.toUpperCase()}</span>
                        <span>นาทีที่ {Math.floor(cp.trigger_at_sec / 60)}:{String(cp.trigger_at_sec % 60).padStart(2, "0")}</span>
                        <span>·</span>
                        <span>ตอบ {cp.answered} คน</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${
                        cp.pct_correct >= 80 ? "text-emerald-600" :
                        cp.pct_correct >= 50 ? "text-amber-600" :
                        cp.answered === 0 ? "text-slate-300" :
                        "text-rose-600"
                      }`}>
                        {cp.answered > 0 ? `${cp.pct_correct}%` : "—"}
                      </p>
                      <p className="text-[10px] text-slate-400">{cp.correct}/{cp.answered}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slow + Not started */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {m.slow_learners.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-black text-amber-700 flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} /> เรียนช้า (ยังไม่ถึง 50%)
                </p>
                <div className="space-y-1">
                  {m.slow_learners.map((l: any, i: number) => l.employee && (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Avatar emp={l.employee} />
                      <span className="flex-1 truncate text-slate-700">{l.employee.first_name_th} {l.employee.last_name_th}</span>
                      <span className="font-black text-amber-700">{l.watched_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {m.not_started.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs font-black text-slate-600 flex items-center gap-1.5 mb-2">
                  <XCircle size={12} /> ยังไม่เริ่มเรียน ({m.not_started.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {m.not_started.slice(0, 8).map((emp: any, i: number) => emp && (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                      <Avatar emp={emp} size={5} />
                      {emp.first_name_th} {emp.nickname && `(${emp.nickname})`}
                    </span>
                  ))}
                  {m.not_started.length > 8 && (
                    <span className="text-[10px] text-slate-400 font-bold px-1.5">+{m.not_started.length - 8}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Mini({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: any; accent?: string; sub?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">{icon} {label}</div>
      <p className={`text-sm font-black mt-0.5 ${accent ?? "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-400 -mt-0.5">{sub}</p>}
    </div>
  )
}

function Avatar({ emp, size = 6 }: { emp: any; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black overflow-hidden flex-shrink-0`}>
      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : (emp.first_name_th?.[0] ?? "?")}
    </div>
  )
}

function fmt(sec: number) {
  if (!sec) return "—"
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}
