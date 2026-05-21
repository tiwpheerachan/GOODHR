"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Eye, LayoutDashboard, Loader2, Save, Send, Sparkles,
  Image as ImageIcon, Layers, Clock, Award, Users, FileQuestion, Tag, Plus, X,
  Target, BookOpen, GraduationCap, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from "lucide-react"
import CoverImageUpload from "@/components/training/CoverImageUpload"

export type CourseEditable = {
  title: string
  description: string
  thumbnail_url: string | null
  learning_objectives: string[]
  target_audience: string
  prerequisites: string
  estimated_minutes: number | null
  tags: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
}

type CourseProp = {
  id: string
  status: "draft" | "published" | "archived"
  version: number
  channel?: { name: string; brand?: string | null } | null
  passing_score: number
  max_retries: number
  affect_kpi: boolean
} & CourseEditable

export default function CourseHeader({
  course, modulesCount, quizzesCount, learnersCount,
  onSave, onPublish, onUnpublish, onPreview, onBack,
  dashboardHref,
}: {
  course: CourseProp
  modulesCount: number
  quizzesCount: number
  learnersCount: number
  onSave: (changes: Partial<CourseEditable>) => Promise<void>
  onPublish: () => void
  onUnpublish: () => void
  onPreview: () => void
  onBack: string
  dashboardHref: string
}) {
  const [form, setForm] = useState<CourseEditable>(extract(course))
  const [saving, setSaving] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [objInput, setObjInput] = useState("")

  // Re-sync when course refreshes (e.g. after save/load)
  useEffect(() => { setForm(extract(course)) }, [course.id, course.version, course.status])

  const dirty = useMemo(() => {
    const original = extract(course)
    return JSON.stringify(original) !== JSON.stringify(form)
  }, [course, form])

  const totalMinutes = course.estimated_minutes ?? 0

  const save = async () => {
    if (!dirty) return
    setSaving(true)
    try { await onSave(diff(extract(course), form)) }
    finally { setSaving(false) }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.tags.includes(t)) { setTagInput(""); return }
    setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput("")
  }
  const addObjective = () => {
    const o = objInput.trim()
    if (!o) return
    setForm(f => ({ ...f, learning_objectives: [...f.learning_objectives, o] }))
    setObjInput("")
  }

  return (
    <div className="space-y-3">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href={onBack} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
          <ArrowLeft size={14} /> กลับ
        </Link>
        {/* Dirty + status indicator */}
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-700">
              <AlertCircle size={11} /> มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700">
              <CheckCircle2 size={11} /> บันทึกแล้ว
            </span>
          )}
        </div>
      </div>

      {/* Hero — clean dashboard style */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[16rem,1fr] gap-5">
          {/* Cover */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 mb-2 flex items-center gap-1">
              <ImageIcon size={11} /> COVER · 16:9
            </p>
            <CoverImageUpload
              value={form.thumbnail_url}
              onChange={url => setForm(f => ({ ...f, thumbnail_url: url }))}
              aspectRatio="16:9"
              label="ภาพปกคอร์ส"
              height="h-36"
            />
          </div>

          {/* Right side — fields */}
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[10px] font-black">
                <Sparkles size={10} />
                {course.channel?.name}{course.channel?.brand ? ` · ${course.channel.brand}` : ""}
              </span>
              <StatusBadge status={course.status} />
              <span className="text-[10px] font-bold text-slate-400">v{course.version}</span>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as any }))}
                className="text-[10px] font-black bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 outline-none text-slate-700 focus:border-sky-400"
              >
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🔴 Advanced</option>
              </select>
            </div>

            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ชื่อคอร์ส..."
              className="text-2xl lg:text-3xl font-black bg-transparent border-b-2 border-slate-200 outline-none w-full focus:border-sky-400 pb-1 text-slate-800 placeholder-slate-300"
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="คำอธิบายสั้น ๆ — ผู้เรียนจะเห็นที่หน้า course list..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 text-sm placeholder-slate-400 outline-none rounded-xl p-2.5 focus:border-sky-400 focus:bg-white resize-none text-slate-700"
            />

            {/* Quick stats — pastel cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat icon={<Layers size={13} />} label="บทเรียน" value={modulesCount} color="sky" />
              <Stat icon={<FileQuestion size={13} />} label="ควิซ" value={quizzesCount} color="amber" />
              <Stat icon={<Users size={13} />} label="ผู้เรียน" value={learnersCount} color="emerald" />
              <Stat icon={<Clock size={13} />} label="เวลา" value={totalMinutes ? `${totalMinutes} น.` : "—"} color="indigo" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Link href={dashboardHref}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                <LayoutDashboard size={12} /> Dashboard
              </Link>
              <button onClick={onPreview}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                <Eye size={12} /> ดูตัวอย่าง
              </button>
              <button onClick={() => setShowInfo(s => !s)}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                <BookOpen size={12} /> ข้อมูลการเรียน
                {showInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={save} disabled={!dirty || saving}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border ${
                    dirty
                      ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                      : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                  }`}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  บันทึก{course.status === "published" ? "การเปลี่ยนแปลง" : "ฉบับร่าง"}
                </button>
                {course.status === "published" ? (
                  <button onClick={onUnpublish}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    เลิกเผยแพร่
                  </button>
                ) : (
                  <button onClick={onPublish}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                    <Send size={12} /> เผยแพร่
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable learning-info panel */}
      {showInfo && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 anim-fade-up shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="font-black text-slate-800">ข้อมูลการเรียน</p>
              <p className="text-[11px] text-slate-500">ผู้เรียนจะเห็นข้อมูลนี้ในหน้ารายละเอียดคอร์ส — ช่วยให้เลือกเรียนได้ตรงเป้า</p>
            </div>
          </div>

          {/* Learning Objectives */}
          <div>
            <p className="text-xs font-black text-slate-600 mb-1.5 flex items-center gap-1">
              <Target size={11} className="text-emerald-500" /> สิ่งที่จะได้เรียนรู้ (Learning Objectives)
            </p>
            <div className="space-y-1.5 mb-2">
              {form.learning_objectives.map((o, i) => (
                <div key={i} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-xs text-slate-700">{o}</span>
                  <button onClick={() => setForm(f => ({ ...f, learning_objectives: f.learning_objectives.filter((_, idx) => idx !== i) }))}
                    className="text-rose-400 hover:text-rose-600"><X size={11} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={objInput} onChange={e => setObjInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addObjective())}
                placeholder="เช่น เข้าใจฟีเจอร์เด่นของผลิตภัณฑ์ Dreame"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-400" />
              <button onClick={addObjective}
                className="px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <Plus size={11} /> เพิ่ม
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-black text-slate-600 mb-1.5 flex items-center gap-1">
                <GraduationCap size={11} className="text-sky-500" /> กลุ่มเป้าหมาย
              </p>
              <input value={form.target_audience}
                onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                placeholder="เช่น พนักงานขายในห้าง · มาใหม่ 1–3 เดือน"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-600 mb-1.5 flex items-center gap-1">
                <Clock size={11} className="text-amber-500" /> เวลาเรียนโดยประมาณ (นาที)
              </p>
              <input type="number" min={0} value={form.estimated_minutes ?? ""}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value ? Number(e.target.value) : null }))}
                placeholder="เช่น 45"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" />
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-slate-600 mb-1.5 flex items-center gap-1">
              <BookOpen size={11} className="text-purple-500" /> ความรู้พื้นฐาน / ข้อแนะนำก่อนเรียน
            </p>
            <textarea value={form.prerequisites}
              onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))}
              placeholder="ถ้ามีคอร์สที่ควรเรียนก่อน / ความรู้พื้นฐานที่ควรมี — เขียนตรงนี้"
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none" />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-black text-slate-600 mb-1.5 flex items-center gap-1">
              <Tag size={11} className="text-pink-500" /> แท็ก (สำหรับค้นหา / กรอง)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {form.tags.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 border border-pink-200 text-pink-700 rounded-full text-[11px] font-bold">
                  #{t}
                  <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && <span className="text-[11px] text-slate-300">— ยังไม่มีแท็ก —</span>}
            </div>
            <div className="flex gap-1.5">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="พิมพ์แท็กแล้วกด Enter"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-pink-400" />
              <button onClick={addTag}
                className="px-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <Plus size={11} /> เพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────
function extract(c: any): CourseEditable {
  return {
    title: c.title ?? "",
    description: c.description ?? "",
    thumbnail_url: c.thumbnail_url ?? null,
    learning_objectives: Array.isArray(c.learning_objectives) ? c.learning_objectives : [],
    target_audience: c.target_audience ?? "",
    prerequisites: c.prerequisites ?? "",
    estimated_minutes: c.estimated_minutes ?? null,
    tags: Array.isArray(c.tags) ? c.tags : [],
    difficulty: (c.difficulty ?? "beginner") as any,
  }
}
function diff(orig: CourseEditable, next: CourseEditable): Partial<CourseEditable> {
  const out: any = {}
  ;(Object.keys(next) as (keyof CourseEditable)[]).forEach(k => {
    if (JSON.stringify(orig[k]) !== JSON.stringify(next[k])) out[k] = next[k]
  })
  return out
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { l: string; c: string }> = {
    draft:     { l: "📝 ฉบับร่าง",   c: "bg-slate-100 text-slate-700 border-slate-200" },
    published: { l: "✅ เผยแพร่แล้ว", c: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    archived:  { l: "📦 เก็บถาวร",   c: "bg-rose-50 text-rose-700 border-rose-200" },
  }
  const v = map[status] ?? map.draft
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${v.c}`}>{v.l}</span>
}

function Stat({ icon, label, value, color = "slate" }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  const palette: Record<string, { bg: string; text: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-600" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <div className={`w-6 h-6 rounded-lg ${p.bg} ${p.text} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-black text-slate-800 mt-1 leading-none">{value}</p>
    </div>
  )
}
