"use client"
import { useState } from "react"
import {
  Award, Trophy, Clock, Users, TrendingUp, TrendingDown, BarChart3,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  FileQuestion, Flame, Snowflake, Sparkles,
} from "lucide-react"

type QuestionStat = {
  id: string
  question_text: string
  question_type: string
  order_no?: number
  answered: number
  correct: number
  pct_correct: number
  points?: number
}

type QuizStat = {
  id: string
  module_id: string | null
  title: string
  passing_score: number
  max_retries: number
  question_count: number
  time_limit_sec?: number | null

  attempt_count: number
  submitted_count: number
  passed_count: number
  avg_score: number
  pass_rate: number
  avg_time_sec: number
  min_score: number
  max_score: number
  score_buckets: number[] // [<30, 30-50, 50-70, 70-90, 90-100]
  question_stats: QuestionStat[]
  top_scorers: any[]
  failed_list: any[]
  suspicious: any[]
}

const BUCKET_LABELS = ["<30", "30–50", "50–70", "70–90", "90–100"]
const BUCKET_COLORS = ["bg-rose-400", "bg-rose-300", "bg-amber-300", "bg-sky-400", "bg-emerald-500"]

export default function QuizPanel({ quiz: q, totalEnrolled, index }: { quiz: QuizStat; totalEnrolled: number; index: number }) {
  const [open, setOpen] = useState(false)
  const isFinal = q.module_id === null
  const maxBucket = Math.max(1, ...q.score_buckets)
  const passingIdx = q.passing_score < 30 ? 0 : q.passing_score < 50 ? 1 : q.passing_score < 70 ? 2 : q.passing_score < 90 ? 3 : 4

  const sortedQs = [...q.question_stats].sort((a, b) => a.pct_correct - b.pct_correct)
  const hardest = sortedQs.filter(qs => qs.answered > 0).slice(0, 3)
  const easiest = [...sortedQs].reverse().filter(qs => qs.answered > 0).slice(0, 3)

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden anim-fade-up card-lift ${
      isFinal ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          isFinal ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-sky-400 to-indigo-500"
        }`}>
          {isFinal ? <Trophy size={22} className="text-white" /> : <Award size={22} className="text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-slate-800 text-sm">{q.title}</p>
            {isFinal && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                <Sparkles size={9} /> FINAL
              </span>
            )}
            <span className="text-[10px] text-slate-400">{q.question_count} ข้อ · ผ่าน {q.passing_score}%</span>
            {q.time_limit_sec && <span className="text-[10px] text-slate-400">· เวลา {Math.round(q.time_limit_sec/60)} น.</span>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 mt-2.5">
            <PassRateBadge passed={q.passed_count} total={q.submitted_count} pct={q.pass_rate} />
            <Mini icon={<BarChart3 size={11} />} label="คะแนนเฉลี่ย" value={`${q.avg_score}%`}
              accent={q.avg_score >= q.passing_score ? "text-emerald-600" : "text-rose-600"} />
            <Mini icon={<TrendingUp size={11} />} label="สูงสุด/ต่ำสุด" value={`${q.max_score}/${q.min_score}%`} accent="text-slate-700" />
            <Mini icon={<Clock size={11} />} label="เวลาเฉลี่ย" value={fmt(q.avg_time_sec)} accent="text-amber-600" />
            <Mini icon={<Users size={11} />} label="ครั้งที่ทำ" value={q.submitted_count} accent="text-sky-600"
              sub={`${q.attempt_count - q.submitted_count > 0 ? `+${q.attempt_count - q.submitted_count} ทิ้งกลางคัน` : ""}`} />
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
          {/* Score distribution */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <BarChart3 size={12} className="text-indigo-500" /> การกระจายคะแนน
              </p>
              <span className="text-[10px] text-slate-400">จาก {q.submitted_count} ครั้งที่ส่ง</span>
            </div>
            <div className="flex items-end gap-1.5 h-24 bg-white border border-slate-200 rounded-xl p-3 relative">
              {q.score_buckets.map((cnt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                  <div className="w-full flex-1 flex items-end">
                    <div className={`w-full rounded-t ${BUCKET_COLORS[i]} transition-all relative`}
                      style={{ height: `${(cnt / maxBucket) * 100}%`, minHeight: cnt > 0 ? 4 : 0 }}
                      title={`${BUCKET_LABELS[i]}%: ${cnt} ครั้ง`} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">{cnt}</span>
                  {i === passingIdx && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-full bg-emerald-500" />
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {BUCKET_LABELS.map((l, i) => (
                <p key={i} className={`text-[9px] text-center ${i === passingIdx ? "text-emerald-600 font-black" : "text-slate-500"}`}>{l}{i === passingIdx && " ⌐ ผ่าน"}</p>
              ))}
            </div>
          </div>

          {/* Hardest + Easiest questions */}
          {q.question_stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3">
                <p className="text-xs font-black text-rose-700 flex items-center gap-1.5 mb-2">
                  <Flame size={12} /> ข้อยากที่สุด — ผู้เรียนพลาดเยอะ
                </p>
                {hardest.length === 0 ? (
                  <p className="text-[11px] text-slate-400">ยังไม่มีข้อมูล</p>
                ) : hardest.map(qs => (
                  <QuestionRow key={qs.id} qs={qs} bad />
                ))}
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-black text-emerald-700 flex items-center gap-1.5 mb-2">
                  <Snowflake size={12} /> ข้อง่ายที่สุด — ผู้เรียนผ่านเกือบทั้งหมด
                </p>
                {easiest.length === 0 ? (
                  <p className="text-[11px] text-slate-400">ยังไม่มีข้อมูล</p>
                ) : easiest.map(qs => (
                  <QuestionRow key={qs.id} qs={qs} />
                ))}
              </div>
            </div>
          )}

          {/* All questions list */}
          {q.question_stats.length > 0 && (
            <details className="bg-white border border-slate-200 rounded-xl group">
              <summary className="cursor-pointer text-xs font-black text-slate-700 p-3 flex items-center gap-1.5 hover:bg-slate-50">
                <FileQuestion size={12} className="text-slate-500" /> ดูสถิติทุกข้อ ({q.question_stats.length} ข้อ)
                <ChevronDown size={12} className="ml-auto group-open:rotate-180 transition-transform" />
              </summary>
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {q.question_stats.map((qs, i) => (
                  <div key={qs.id} className="p-2.5 flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[10px] flex-shrink-0">
                      {qs.order_no ?? i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 truncate">{qs.question_text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{qs.question_type}</span>
                        <div className="flex-1 max-w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full ${
                            qs.pct_correct >= 80 ? "bg-emerald-500" :
                            qs.pct_correct >= 50 ? "bg-amber-500" :
                            qs.answered === 0 ? "bg-slate-300" :
                            "bg-rose-500"
                          }`} style={{ width: `${qs.pct_correct}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${
                        qs.pct_correct >= 80 ? "text-emerald-600" :
                        qs.pct_correct >= 50 ? "text-amber-600" :
                        qs.answered === 0 ? "text-slate-300" :
                        "text-rose-600"
                      }`}>{qs.answered > 0 ? `${qs.pct_correct}%` : "—"}</p>
                      <p className="text-[9px] text-slate-400">{qs.correct}/{qs.answered}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Top scorers + Failed list + Suspicious */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PeopleCard title="🏆 คะแนนสูงสุด" people={q.top_scorers}
              accent="amber" valueFn={(p: any) => `${p.score}%`} />
            <PeopleCard title="✗ ยังไม่ผ่าน" people={q.failed_list}
              accent="rose" valueFn={(p: any) => `${p.score}%`} />
            <PeopleCard title="⚠️ น่าสงสัย (สลับแท็บเยอะ)" people={q.suspicious}
              accent="purple" valueFn={(p: any) => `${p.tab_switches}×`} subFn={(p: any) => `ครั้ง #${p.attempt_no} · ${p.score}%`} />
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionRow({ qs, bad }: { qs: QuestionStat; bad?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 first:pt-0">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-slate-700 truncate">{qs.question_text}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px]">{qs.question_type.toUpperCase()}</span>
          <span>ตอบ {qs.answered} คน</span>
        </div>
      </div>
      <p className={`text-sm font-black flex-shrink-0 ${bad ? "text-rose-600" : "text-emerald-600"}`}>
        {qs.pct_correct}%
      </p>
    </div>
  )
}

function PeopleCard({ title, people, accent, valueFn, subFn }: {
  title: string; people: any[]; accent: "amber" | "rose" | "purple"
  valueFn: (p: any) => string; subFn?: (p: any) => string
}) {
  const cls: Record<string, string> = {
    amber: "bg-amber-50/60 border-amber-200 text-amber-700",
    rose: "bg-rose-50/60 border-rose-200 text-rose-700",
    purple: "bg-purple-50/60 border-purple-200 text-purple-700",
  }
  return (
    <div className={`border rounded-xl p-3 ${cls[accent]}`}>
      <p className="text-xs font-black mb-2">{title}</p>
      {people.length === 0 ? (
        <p className="text-[11px] text-slate-400">— ไม่มี —</p>
      ) : (
        <div className="space-y-1.5">
          {people.map((p, i) => p.employee && (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-white text-slate-700 flex items-center justify-center text-[10px] font-black overflow-hidden flex-shrink-0 border border-slate-200">
                {p.employee.avatar_url ? <img src={p.employee.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.employee.first_name_th?.[0] ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-700 truncate">{p.employee.first_name_th} {p.employee.last_name_th}</p>
                {subFn && <p className="text-[10px] text-slate-500">{subFn(p)}</p>}
              </div>
              <span className="font-black text-slate-800 flex-shrink-0">{valueFn(p)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PassRateBadge({ passed, total, pct }: { passed: number; total: number; pct: number }) {
  const color = pct >= 80 ? "from-emerald-500 to-green-600" :
                pct >= 50 ? "from-amber-500 to-orange-500" :
                "from-rose-500 to-pink-500"
  return (
    <div className={`bg-gradient-to-br ${color} text-white rounded-lg p-2 shadow-sm`}>
      <div className="flex items-center gap-1 text-[10px] font-bold opacity-90">
        <CheckCircle2 size={11} /> อัตราผ่าน
      </div>
      <p className="text-lg font-black mt-0.5 leading-none">{pct}%</p>
      <p className="text-[9px] opacity-80 mt-0.5">{passed}/{total} ครั้ง</p>
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

function fmt(sec: number) {
  if (!sec) return "—"
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return m > 0 ? `${m} น. ${s} ว.` : `${s} ว.`
}
