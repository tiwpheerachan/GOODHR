"use client"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, Trash2, Send, Loader2, Video, FileText, ListChecks,
  Upload, X, Check, Settings, Users, Award, ChevronRight, Eye, PlayCircle, Download, LayoutDashboard,
  Image as ImageIcon, BookOpen,
} from "lucide-react"
import toast from "react-hot-toast"
import { uploadTrainingFile, type UploadProgress as UProg } from "@/lib/training/upload"
import UploadProgress from "@/components/training/UploadProgress"
import VideoSourcePicker from "@/components/training/VideoSourcePicker"
import ReadingContentEditor from "@/components/training/ReadingContentEditor"
import ReadingContent from "@/components/training/ReadingContent"
import { parseVideoUrl, supportsCheckpoint, videoSourceName } from "@/lib/training/video-url"
import CheckpointEditor from "@/components/training/CheckpointEditorModal"
import { PromptModal, ConfirmModal } from "@/components/training/PromptModal"
import CoverImageUpload from "@/components/training/CoverImageUpload"
import CourseHeader from "@/components/training/CourseHeader"
import CourseDashboard from "@/components/training/CourseDashboard"

export default function CourseBuilderMobilePage() {
  const { id } = useParams<{ id: string }>()
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [learnersCount, setLearnersCount] = useState(0)
  const [activeTab, setActiveTab] = useState<"content" | "settings" | "learners">("content")
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [uploadingDocs, setUploadingDocs] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<{ moduleId: string; filename: string; progress: UProg } | null>(null)
  const [docsProgress, setDocsProgress] = useState<{ moduleId: string; filename: string; progress: UProg } | null>(null)
  const videoAbortRef = useRef<AbortController | null>(null)
  const docsAbortRef = useRef<AbortController | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAddModule, setShowAddModule] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [delModuleId, setDelModuleId] = useState<string | null>(null)

  const load = async () => {
    const [cRes, mRes, qRes, eRes] = await Promise.all([
      fetch(`/api/training/courses`).then(r => r.json()),
      fetch(`/api/training/modules?course_id=${id}`).then(r => r.json()),
      fetch(`/api/training/quizzes?course_id=${id}`).then(r => r.json()),
      fetch(`/api/training/enrollments?course_id=${id}`).then(r => r.json()).catch(() => ({ enrollments: [] })),
    ])
    setCourse((cRes.courses ?? []).find((c: any) => c.id === id) ?? null)
    setModules(mRes.modules ?? [])
    setQuizzes(qRes.quizzes ?? [])
    setLearnersCount((eRes.enrollments ?? []).length)
  }
  useEffect(() => { if (id) load() }, [id])

  const saveCourse = async (updates: any) => {
    const t = toast.loading("บันทึก...")
    const r = await fetch("/api/training/courses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error, { id: t }); return }
    toast.success("บันทึก", { id: t }); await load()
  }

  const publish = () => {
    // เผยแพร่ได้ถ้ามีบทเรียนหรือควิซอย่างน้อย 1 (คอร์สที่มีแค่แบบทดสอบก็เผยแพร่ได้)
    if (modules.length === 0 && quizzes.length === 0) { toast.error("เพิ่มบทเรียนหรือควิซก่อน"); return }
    setShowPublishConfirm(true)
  }
  const doPublish = async () => { await saveCourse({ status: "published" }) }
  const doUnpublish = async () => { await saveCourse({ status: "draft" }) }

  const addModule = () => setShowAddModule(true)
  const doAddModule = async (title: string) => {
    await fetch("/api/training/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: id, title }) })
    toast.success("เพิ่มบทเรียนแล้ว"); await load()
  }
  const delModule = (mid: string) => setDelModuleId(mid)
  const doDelModule = async () => {
    if (!delModuleId) return
    await fetch(`/api/training/modules?id=${delModuleId}`, { method: "DELETE" }); await load()
  }
  const modTitleFocusRef = useRef<string>("")  // ค่าชื่อบทเรียนตอนเริ่มแก้ (ใช้เทียบตอน blur)
  const updateModule = async (mid: string, updates: any) => {
    await fetch("/api/training/modules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: mid, ...updates }) })
    await load()
  }

  const handleVideoUpload = async (mid: string, file: File) => {
    setUploadingVideo(mid)
    setVideoProgress({ moduleId: mid, filename: file.name, progress: { loaded: 0, total: file.size, pct: 0, speed: 0, eta: 0 } })
    const ctrl = new AbortController()
    videoAbortRef.current = ctrl
    try {
      const result = await uploadTrainingFile(file, {
        signal: ctrl.signal,
        onProgress: p => setVideoProgress({ moduleId: mid, filename: file.name, progress: p }),
      })
      // detect duration
      const vid = document.createElement("video")
      vid.preload = "metadata"; vid.src = result.url
      await new Promise<void>(res => { vid.onloadedmetadata = () => res(); setTimeout(() => res(), 5000) })
      await updateModule(mid, { video_url: result.url, video_duration_sec: Math.floor(vid.duration) || null })
      toast.success("อัปโหลดวิดีโอสำเร็จ")
    } catch (e: any) {
      if (e.message !== "Upload cancelled") toast.error(e.message)
      else toast("ยกเลิกแล้ว")
    }
    setUploadingVideo(null); setVideoProgress(null); videoAbortRef.current = null
  }
  const handleDocsUpload = async (mid: string, files: FileList) => {
    setUploadingDocs(mid)
    const ctrl = new AbortController()
    docsAbortRef.current = ctrl
    try {
      const uploaded: any[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        setDocsProgress({ moduleId: mid, filename: `${f.name} (${i + 1}/${files.length})`, progress: { loaded: 0, total: f.size, pct: 0, speed: 0, eta: 0 } })
        const r = await uploadTrainingFile(f, {
          signal: ctrl.signal,
          onProgress: p => setDocsProgress({ moduleId: mid, filename: `${f.name} (${i + 1}/${files.length})`, progress: p }),
        })
        uploaded.push(r)
      }
      const mod = modules.find(m => m.id === mid)
      await updateModule(mid, { documents: [...(mod?.documents ?? []), ...uploaded] })
      toast.success(`อัปโหลด ${uploaded.length} ไฟล์สำเร็จ`)
    } catch (e: any) {
      if (e.message !== "Upload cancelled") toast.error(e.message)
      else toast("ยกเลิกแล้ว")
    }
    setUploadingDocs(null); setDocsProgress(null); docsAbortRef.current = null
  }

  if (!course) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-sky-400" /></div>

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4 pb-32">
      <CourseHeader
        course={course}
        modulesCount={modules.length}
        quizzesCount={quizzes.length}
        learnersCount={learnersCount}
        onBack="/app/training/manage/courses"
        dashboardHref={`/app/training/manage/courses/${id}/dashboard`}
        onPreview={() => setShowPreview(true)}
        onPublish={publish}
        onUnpublish={() => setShowUnpublishConfirm(true)}
        onSave={async changes => { await saveCourse(changes) }}
      />

      {/* Split: builder ← / → live dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="space-y-4 min-w-0">
      {/* Tab — pills (mobile-friendly) */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { k: "content", l: "เนื้อหา", i: <ListChecks size={14} /> },
          { k: "settings", l: "ตั้งค่า", i: <Settings size={14} /> },
          { k: "learners", l: "ผู้เรียน", i: <Users size={14} /> },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.k ? "bg-white shadow-sm text-sky-700" : "text-slate-500"}`}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <button onClick={addModule}
            className="w-full py-3 border-2 border-dashed border-sky-300 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-50 flex items-center justify-center gap-1.5">
            <Plus size={14} /> เพิ่มบทเรียน
          </button>

          {modules.map((m, i) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-3 lg:p-4 space-y-3 anim-fade-up">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-sky-100 text-sky-700 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</span>
                <input value={m.title}
                  onFocus={e => { modTitleFocusRef.current = e.target.value }}
                  onChange={e => setModules(ms => ms.map(x => x.id === m.id ? { ...x, title: e.target.value } : x))}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (!v) { setModules(ms => ms.map(x => x.id === m.id ? { ...x, title: modTitleFocusRef.current } : x)); return } // ห้ามว่าง
                    if (v !== modTitleFocusRef.current) updateModule(m.id, { title: v })
                  }}
                  className="flex-1 font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-sky-400 outline-none" />
                <button onClick={() => delModule(m.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14} /></button>
              </div>

              {/* Module cover image */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><ImageIcon size={11} /> ภาพปกบทเรียน</p>
                <CoverImageUpload
                  value={m.thumbnail_url}
                  onChange={url => updateModule(m.id, { thumbnail_url: url })}
                  aspectRatio="16:9"
                  label="ภาพปกบทเรียน"
                  height="h-32"
                />
              </div>

              {/* รูปแบบการเรียน */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">รูปแบบการเรียน</p>
                <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
                  {([
                    { v: "video", l: "วิดีโอ", icon: Video },
                    { v: "text", l: "อ่านเนื้อหา", icon: BookOpen },
                  ] as const).map(opt => {
                    const active = (m.content_type === "text" ? "text" : "video") === opt.v
                    return (
                      <button key={opt.v}
                        onClick={() => (m.content_type === "text" ? "text" : "video") !== opt.v && updateModule(m.id, { content_type: opt.v })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          active ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}>
                        <opt.icon size={13} /> {opt.l}
                      </button>
                    )
                  })}
                </div>
              </div>

              {m.content_type !== "text" && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Video size={12} /> วิดีโอ</p>
                {m.video_url ? (
                  <VideoPreview module={m} onRemove={() => updateModule(m.id, { video_url: null, video_duration_sec: null })}
                    onChangeWatchPct={pct => updateModule(m.id, { required_watch_pct: pct })} />
                ) : (
                  <VideoSourcePicker
                    onAdded={({ video_url, video_duration_sec }) =>
                      updateModule(m.id, { video_url, video_duration_sec: video_duration_sec ?? null })
                    }
                  />
                )}
              </div>
              )}

              {m.content_type === "text" && (
                <ReadingContentEditor
                  initialContent={m.content}
                  onSave={content => updateModule(m.id, { content })}
                />
              )}

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><FileText size={12} /> เอกสาร</p>
                {docsProgress && docsProgress.moduleId === m.id && (
                  <UploadProgress progress={docsProgress.progress} filename={docsProgress.filename}
                    onCancel={() => docsAbortRef.current?.abort()} />
                )}
                {(m.documents ?? []).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {(m.documents ?? []).map((d: any, di: number) => (
                      <div key={di} className="flex items-center gap-2 bg-white rounded px-2 py-1 text-xs">
                        <FileText size={12} className="text-slate-400" />
                        <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-slate-700">{d.name}</a>
                        <button onClick={() => updateModule(m.id, { documents: m.documents.filter((_: any, i: number) => i !== di) })} className="text-rose-500"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {!docsProgress && (
                  <label className="flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100">
                    <Upload size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">{uploadingDocs === m.id ? "อัปโหลด..." : "เพิ่มเอกสาร (PDF/Word/PPT/Excel/รูป)"}</span>
                    <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" className="hidden"
                      onChange={e => e.target.files && handleDocsUpload(m.id, e.target.files)} />
                  </label>
                )}
              </div>

              {m.content_type !== "text" && (
                <CheckpointEditorWrapper moduleId={m.id} videoDuration={m.video_duration_sec} />
              )}
              <ModuleQuizzes courseId={id as string} moduleId={m.id} quizzes={quizzes.filter(q => q.module_id === m.id)} onChange={load} />
            </div>
          ))}

          <div className="border-2 border-amber-300 bg-amber-50/30 rounded-2xl p-3 lg:p-4 space-y-2">
            <p className="text-sm font-bold text-amber-700 flex items-center gap-1"><Award size={14} /> ควิซจบคอร์ส</p>
            <ModuleQuizzes courseId={id as string} moduleId={null} quizzes={quizzes.filter(q => !q.module_id)} onChange={load} />
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <SRow label="วันเปิดคอร์ส">
            <input type="date" defaultValue={course.open_date || ""} onBlur={e => saveCourse({ open_date: e.target.value || null })} className={inp} />
          </SRow>
          <SRow label="วันปิดคอร์ส">
            <input type="date" defaultValue={course.close_date || ""} onBlur={e => saveCourse({ close_date: e.target.value || null })} className={inp} />
          </SRow>
          <SRow label="คะแนนผ่าน (%)">
            <input type="number" min={0} max={100} defaultValue={course.passing_score} onBlur={e => saveCourse({ passing_score: Number(e.target.value) })} className={`${inp} w-24 text-right`} />
          </SRow>
          <SRow label="สอบซ้ำได้ (ครั้ง)">
            <input type="number" min={1} max={10} defaultValue={course.max_retries} onBlur={e => saveCourse({ max_retries: Number(e.target.value) })} className={`${inp} w-24 text-right`} />
          </SRow>
          <SRow label="มีผลต่อ KPI">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked={course.affect_kpi} onChange={e => saveCourse({ affect_kpi: e.target.checked })} />
              <span className="text-xs">เปิด</span>
            </label>
          </SRow>
        </div>
      )}

      {activeTab === "learners" && <LearnersManager courseId={id as string} />}
        </div>

        {/* RIGHT — live dashboard (sticky on xl+) */}
        <div className="min-w-0">
          <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <CourseDashboard courseId={id as string} basePath="/app/training/manage" compact />
          </div>
        </div>
      </div>

      {showPreview && (
        <CoursePreviewModal course={course} modules={modules} quizzes={quizzes} onClose={() => setShowPreview(false)} />
      )}

      <PromptModal
        open={showAddModule}
        title="เพิ่มบทเรียนใหม่"
        label="ชื่อบทเรียน"
        placeholder="เช่น บทที่ 1 — แนะนำผลิตภัณฑ์"
        confirmText="เพิ่ม"
        onConfirm={doAddModule}
        onClose={() => setShowAddModule(false)}
      />
      <ConfirmModal
        open={showPublishConfirm}
        title="เผยแพร่คอร์ส?"
        message="พนักงานทุกคนที่ลงทะเบียนจะเห็นและเข้าเรียนได้ทันที"
        confirmText="เผยแพร่"
        onConfirm={doPublish}
        onClose={() => setShowPublishConfirm(false)}
      />
      <ConfirmModal
        open={showUnpublishConfirm}
        title="เลิกเผยแพร่คอร์ส?"
        message="คอร์สจะกลับไปเป็นฉบับร่าง ผู้เรียนใหม่จะไม่เห็น"
        confirmText="เลิกเผยแพร่"
        danger
        onConfirm={doUnpublish}
        onClose={() => setShowUnpublishConfirm(false)}
      />
      <ConfirmModal
        open={!!delModuleId}
        title="ลบบทเรียนนี้?"
        message="ข้อมูลภายในบทเรียน (วิดีโอ, เอกสาร, ควิซ, checkpoint) จะถูกลบทั้งหมด ไม่สามารถกู้คืนได้"
        confirmText="ลบ"
        danger
        onConfirm={doDelModule}
        onClose={() => setDelModuleId(null)}
      />
    </div>
  )
}

const inp = "bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
function SRow({ label, children }: any) {
  return <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 last:border-b-0"><span className="text-sm font-semibold">{label}</span>{children}</div>
}

function VideoPreview({ module: m, onRemove, onChangeWatchPct }: { module: any; onRemove: () => void; onChangeWatchPct: (n: number) => void }) {
  const parsed = parseVideoUrl(m.video_url)
  const isIframe = parsed.type === "youtube" || parsed.type === "vimeo" || parsed.type === "drive"
  const tracks = supportsCheckpoint(parsed.type)
  return (
    <div className="space-y-2">
      <div className="max-w-md">
        {isIframe ? (
          <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black">
            <iframe src={parsed.embedUrl} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <video src={parsed.embedUrl} controls className="w-full max-h-56 rounded-lg bg-black" />
        )}
      </div>

      {parsed.type === "drive" && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1.5">
          <p className="font-black text-rose-700 flex items-center gap-1.5">
            ⚠️ Google Drive — ฟีเจอร์จำกัด + อาจเปิดไม่ได้
          </p>
          <ul className="text-rose-700 space-y-0.5 ml-5 list-disc">
            <li><b>ไม่รองรับ Checkpoint Quiz</b> เด้งระหว่างวิดีโอ</li>
            <li><b>ไม่นับ % การดู</b> ของผู้เรียน</li>
            <li>ถ้าโหลดวิดีโอไม่ได้ → เปิด Drive → คลิกขวา → <b>Share</b> → <b>Anyone with the link</b> → <b>Viewer</b></li>
          </ul>
          <p className="text-rose-700 mt-1">💡 แนะนำ: ใช้ <b>YouTube</b> (Unlisted) แทน — ได้ครบทุกฟีเจอร์</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
        <span className="text-slate-500 flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-[10px]">{videoSourceName(parsed.type)}</span>
          {m.video_duration_sec && <span>⏱ {Math.floor(m.video_duration_sec / 60)}:{String(m.video_duration_sec % 60).padStart(2, "0")}</span>}
          {!tracks && <span className="text-amber-600 text-[10px] font-bold">⚠ ไม่ track</span>}
        </span>
        <div className="flex items-center gap-2">
          {tracks && (
            <>
              <label className="text-[10px] text-slate-500">ต้องดู %:</label>
              <input type="number" min={0} max={100} defaultValue={m.required_watch_pct}
                onBlur={e => onChangeWatchPct(Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-right" />
            </>
          )}
          <button onClick={onRemove} className="text-rose-500 hover:bg-rose-50 p-1 rounded" title="ลบวิดีโอ"><X size={12} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Course Preview Modal (มุมมองผู้เรียน) ──────────────────────
function CoursePreviewModal({ course, modules, quizzes, onClose }: any) {
  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null)
  const finalQuiz = quizzes.find((q: any) => !q.module_id)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
          <Eye size={16} className="text-sky-500" />
          <p className="font-black text-slate-800 flex-1">ดูตัวอย่าง — มุมมองผู้เรียน</p>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded">PREVIEW</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-gradient-to-br from-sky-500 to-indigo-500 rounded-2xl p-4 text-white">
            <p className="text-[10px] opacity-80">{course.channel?.name}</p>
            <h1 className="text-lg font-black mt-0.5">{course.title}</h1>
            {course.description && <p className="text-xs opacity-90 mt-1">{course.description}</p>}
            <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
              <span>📚 {modules.length} บท</span>
              <span>🎯 ผ่าน {course.passing_score}%</span>
              <span>🔁 สอบซ้ำ {course.max_retries} ครั้ง</span>
              {course.affect_kpi && <span className="font-bold">⭐ KPI</span>}
            </div>
          </div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">บทเรียน</p>
          {modules.length === 0 && <p className="text-center text-slate-400 text-sm py-6">ยังไม่มีบทเรียน</p>}
          {modules.map((m: any, i: number) => {
            const isOpen = openModule === m.id
            const parsed = m.video_url ? parseVideoUrl(m.video_url) : null
            const isIframe = parsed && (parsed.type === "youtube" || parsed.type === "vimeo" || parsed.type === "drive")
            const modQuizzes = quizzes.filter((q: any) => q.module_id === m.id)
            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setOpenModule(isOpen ? null : m.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left">
                  <span className="w-8 h-8 bg-sky-100 text-sky-700 rounded-lg flex items-center justify-center font-black text-sm">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      {m.content_type === "text" && (m.content?.trim()) && <span className="flex items-center gap-0.5"><BookOpen size={9} /> อ่านเนื้อหา</span>}
                      {m.video_url && <span className="flex items-center gap-0.5"><PlayCircle size={9} /> วิดีโอ</span>}
                      {(m.documents?.length ?? 0) > 0 && <span className="flex items-center gap-0.5"><FileText size={9} /> {m.documents.length} เอกสาร</span>}
                      {modQuizzes.length > 0 && <span className="flex items-center gap-0.5"><Award size={9} /> {modQuizzes.length} ควิซ</span>}
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/30">
                    {m.video_url && (
                      <div className="max-w-md mx-auto">
                        {isIframe ? (
                          <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black">
                            <iframe src={parsed!.embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen />
                          </div>
                        ) : (
                          <video src={parsed!.embedUrl} controls className="w-full rounded-lg bg-black" />
                        )}
                      </div>
                    )}
                    {(m.documents?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        {m.documents.map((d: any, di: number) => (
                          <a key={di} href={d.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs hover:bg-sky-50">
                            <FileText size={11} className="text-slate-400" />
                            <span className="flex-1 truncate">{d.name}</span>
                            <Download size={10} className="text-slate-400" />
                          </a>
                        ))}
                      </div>
                    )}
                    {modQuizzes.map((q: any) => (
                      <div key={q.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                        <Award size={12} className="text-amber-600" />
                        <span className="flex-1 font-bold text-amber-800">{q.title}</span>
                        <span className="text-[10px] text-amber-600">{q.question_count} ข้อ · ผ่าน {q.passing_score}%</span>
                      </div>
                    ))}
                    {m.content_type === "text" && (m.content?.trim()) && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                        <ReadingContent content={m.content} />
                      </div>
                    )}
                    {!m.video_url && !(m.content?.trim()) && (m.documents?.length ?? 0) === 0 && modQuizzes.length === 0 && (
                      <p className="text-center text-xs text-slate-400 italic">บทนี้ยังไม่มีเนื้อหา</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {finalQuiz && (
            <div className="border-2 border-amber-300 bg-amber-50/40 rounded-xl p-3 flex items-center gap-3">
              <Award size={20} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-black text-sm text-slate-800">{finalQuiz.title}</p>
                <p className="text-[10px] text-slate-500">ควิซจบคอร์ส · {finalQuiz.question_count} ข้อ · ผ่าน {finalQuiz.passing_score}%</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {course.status === "published" ? "✅ คอร์สเผยแพร่แล้ว" : "⚠️ ฉบับร่าง — กดเผยแพร่เพื่อให้ผู้เรียนเห็น"}
          </p>
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleQuizzes({ courseId, moduleId, quizzes, onChange }: any) {
  const [showAddQuiz, setShowAddQuiz] = useState(false)
  const doAdd = async (title: string) => {
    await fetch("/api/training/quizzes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: courseId, module_id: moduleId, title }) })
    toast.success("เพิ่มควิซแล้ว")
    onChange()
  }
  const delQuiz = async (q: any) => {
    if (!confirm(`ลบควิซ "${q.title}"?\nคำถาม + ผลทำควิซทั้งหมดจะถูกลบด้วย (กู้คืนไม่ได้)`)) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/training/quizzes?id=${q.id}`, { method: "DELETE" })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบควิซแล้ว", { id: t })
    onChange()
  }
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-slate-600 flex items-center gap-1"><ListChecks size={12} /> ควิซ</p>
      {quizzes.map((q: any) => (
        <div key={q.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 hover:border-sky-300 text-xs">
          <Link href={`/app/training/manage/courses/${courseId}/quiz/${q.id}`}
            className="flex items-center gap-2 flex-1 min-w-0">
            <Award size={12} className="text-amber-500 flex-shrink-0" />
            <span className="flex-1 font-bold truncate">{q.title}</span>
            <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
          </Link>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); delQuiz(q) }}
            title="ลบควิซนี้"
            className="p-1 text-rose-500 hover:bg-rose-50 rounded flex-shrink-0">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button onClick={() => setShowAddQuiz(true)} className="w-full py-1.5 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:bg-white">
        <Plus size={12} className="inline mr-1" /> เพิ่มควิซ
      </button>
      <PromptModal
        open={showAddQuiz}
        title="เพิ่มควิซใหม่"
        label="ชื่อควิซ"
        placeholder={moduleId ? "เช่น ทดสอบหลังบทเรียน" : "เช่น ควิซสรุปจบคอร์ส"}
        confirmText="เพิ่ม"
        onConfirm={doAdd}
        onClose={() => setShowAddQuiz(false)}
      />
    </div>
  )
}

function CheckpointEditorWrapper({ moduleId, videoDuration }: { moduleId: string; videoDuration?: number | null }) {
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const load = () => fetch(`/api/training/checkpoints?module_id=${moduleId}`).then(r => r.json()).then(d => setCheckpoints(d.checkpoints ?? []))
  useEffect(() => { load() }, [moduleId])
  return <CheckpointEditor moduleId={moduleId} checkpoints={checkpoints} onChange={load} videoDuration={videoDuration ?? undefined} />
}

function LearnersManager({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState("")

  const load = async () => {
    const d = await (await fetch(`/api/training/enrollments?course_id=${courseId}`)).json()
    setEnrollments(d.enrollments ?? [])
  }
  useEffect(() => { load() }, [courseId])
  useEffect(() => {
    if (!showAdd) return
    import("@/lib/supabase/client").then(({ createClient }) => {
      const sb = createClient()
      sb.from("employees").select("id, employee_code, first_name_th, last_name_th, nickname, brand, department:departments(name)").eq("is_active", true).order("first_name_th").limit(500)
        .then(({ data }) => setEmployees(data ?? []))
    })
  }, [showAdd])

  const enrolled = new Set(enrollments.map(e => e.employee_id))
  const filtered = employees.filter(e => {
    if (enrolled.has(e.id)) return false
    if (brandFilter && !(e.brand ?? []).includes(brandFilter)) return false
    if (search) {
      const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })
  const brands = Array.from(new Set(employees.flatMap(e => e.brand ?? []).filter(Boolean)))

  const enroll = async () => {
    if (selected.size === 0) return
    const t = toast.loading("เพิ่ม...")
    const r = await fetch("/api/training/enrollments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, employee_ids: Array.from(selected) }),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d.error, { id: t }); return }
    toast.success(`เพิ่ม ${d.enrolled} คน`, { id: t })
    setShowAdd(false); setSelected(new Set()); await load()
  }
  const [delEnrollId, setDelEnrollId] = useState<string | null>(null)
  const unenroll = (id: string) => setDelEnrollId(id)
  const doUnenroll = async () => {
    if (!delEnrollId) return
    await fetch(`/api/training/enrollments?id=${delEnrollId}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-black text-slate-800 text-sm">ผู้เรียน ({enrollments.length})</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold">
          <Plus size={12} /> เพิ่ม
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {enrollments.map(e => (
          <div key={e.id} className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center font-black text-sm text-sky-700">{e.employee?.first_name_th?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{e.employee?.first_name_th} {e.employee?.last_name_th}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 max-w-[120px] h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${e.progress_pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{e.progress_pct}%</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${e.status === "completed" ? "bg-emerald-100 text-emerald-700" : e.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  {e.status === "completed" ? "จบ" : e.status === "in_progress" ? "กำลัง" : "ยังไม่"}
                </span>
              </div>
            </div>
            <button onClick={() => unenroll(e.id)} className="text-rose-500 p-1 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
          </div>
        ))}
        {enrollments.length === 0 && <p className="p-6 text-center text-slate-400 text-sm">ยังไม่มีผู้เรียน</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <p className="font-black flex-1">เพิ่มผู้เรียน · เลือก {selected.size}</p>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <div className="p-3 border-b border-slate-100 flex gap-2 flex-wrap">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
              {brands.length > 0 && (
                <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">ทุก Brand</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.map(e => (
                <label key={e.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={ev => {
                    const next = new Set(selected); ev.target.checked ? next.add(e.id) : next.delete(e.id); setSelected(next)
                  }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{e.first_name_th} {e.last_name_th}</p>
                    <p className="text-[10px] text-slate-400">{e.employee_code} · {e.department?.name}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && <p className="text-center text-slate-400 text-sm p-6">ไม่พบ</p>}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">ยกเลิก</button>
              <button onClick={enroll} className="flex-1 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl">เพิ่ม {selected.size}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delEnrollId}
        title="ลบผู้เรียนคนนี้?"
        message="ความคืบหน้าและคะแนนทั้งหมดจะถูกลบ"
        confirmText="ลบ"
        danger
        onConfirm={doUnenroll}
        onClose={() => setDelEnrollId(null)}
      />
    </div>
  )
}
