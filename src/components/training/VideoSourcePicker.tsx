"use client"
import { useRef, useState } from "react"
import { Upload, Link as LinkIcon, AlertTriangle, X, Check, ExternalLink, Loader2, Info } from "lucide-react"
import toast from "react-hot-toast"
import { uploadTrainingFile, fmtBytes, type UploadProgress as UProg } from "@/lib/training/upload"
import { parseVideoUrl, videoSourceName, supportsCheckpoint } from "@/lib/training/video-url"
import UploadProgress from "./UploadProgress"

// Supabase Free plan: 50 MB per file
const SOFT_LIMIT_MB = 50

export default function VideoSourcePicker({
  onAdded,
  onCancel,
}: {
  onAdded: (data: { video_url: string; video_duration_sec?: number | null }) => void
  onCancel?: () => void
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ filename: string; progress: UProg } | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload flow ──────────────────────────────────────────────────
  const handleFilePicked = (file: File) => {
    const sizeMb = file.size / 1024 / 1024
    if (sizeMb > SOFT_LIMIT_MB) {
      setPendingFile(file)
      setShowSizeWarning(true)
      return
    }
    doUpload(file)
  }

  const doUpload = async (file: File) => {
    setUploading(true)
    setProgress({ filename: file.name, progress: { loaded: 0, total: file.size, pct: 0, speed: 0, eta: 0 } })
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const result = await uploadTrainingFile(file, {
        signal: ctrl.signal,
        onProgress: p => setProgress({ filename: file.name, progress: p }),
      })
      // detect duration
      const vid = document.createElement("video")
      vid.preload = "metadata"; vid.src = result.url
      await new Promise<void>(res => { vid.onloadedmetadata = () => res(); setTimeout(() => res(), 5000) })
      onAdded({ video_url: result.url, video_duration_sec: Math.floor(vid.duration) || null })
      toast.success("อัปโหลดสำเร็จ")
    } catch (e: any) {
      if (e.message === "Upload cancelled") toast("ยกเลิกแล้ว")
      else toast.error(e.message)
    }
    setUploading(false); setProgress(null); abortRef.current = null
  }

  // ── URL flow ─────────────────────────────────────────────────────
  const handleUrlSubmit = () => {
    const url = urlInput.trim()
    if (!url) { toast.error("ใส่ URL ก่อน"); return }
    const parsed = parseVideoUrl(url)
    if (parsed.type === "unknown") {
      if (!confirm("ลิงก์นี้ไม่รู้จัก จะลองใช้เป็นวิดีโอตรงหรือไม่?")) return
    }
    onAdded({ video_url: parsed.embedUrl })
    toast.success(`ใช้วิดีโอจาก ${videoSourceName(parsed.type)}`)
    setUrlInput("")
  }

  const parsed = urlInput ? parseVideoUrl(urlInput) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === "upload" ? "border-sky-500 text-sky-700 bg-sky-50/30" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <Upload size={14} /> อัปโหลดไฟล์
        </button>
        <button onClick={() => setTab("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === "url" ? "border-sky-500 text-sky-700 bg-sky-50/30" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <LinkIcon size={14} /> ใช้ลิงก์
          <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">แนะนำ</span>
        </button>
      </div>

      <div className="p-4">
        {/* UPLOAD TAB */}
        {tab === "upload" && (
          <div className="space-y-3">
            {progress && (
              <UploadProgress progress={progress.progress} filename={progress.filename}
                onCancel={() => abortRef.current?.abort()} />
            )}

            {!progress && (
              <>
                <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-sky-50/30 hover:border-sky-400 transition-colors">
                  <Upload size={28} className="text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">เลือกไฟล์วิดีโอ</p>
                    <p className="text-[11px] text-slate-400 mt-1">MP4, MOV, WebM</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFilePicked(e.target.files[0])} />
                </label>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-800">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">ขีดจำกัด Supabase Free Plan: <span className="font-mono">{SOFT_LIMIT_MB} MB ต่อไฟล์</span></p>
                    <p className="mt-1 opacity-90">ถ้าไฟล์ใหญ่กว่านี้ แนะนำให้ใช้แท็บ <button onClick={() => setTab("url")} className="underline font-bold">"ใช้ลิงก์"</button> แทน หรือบีบอัดวิดีโอก่อน</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* URL TAB */}
        {tab === "url" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">URL วิดีโอ</label>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="วาง URL จาก YouTube, Vimeo, Google Drive, หรือ MP4 ตรง..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              {parsed && parsed.type !== "unknown" && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded">
                    ✓ {videoSourceName(parsed.type)}
                  </span>
                  {!supportsCheckpoint(parsed.type) && (
                    <span className="text-amber-600 text-[10px]">⚠️ ไม่รองรับ checkpoint quiz กับ % การดู</span>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleUrlSubmit} disabled={!urlInput.trim()}
              className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-bold text-sm hover:bg-sky-700 disabled:opacity-50">
              ใช้ URL นี้
            </button>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2 text-xs text-sky-900">
              <p className="font-bold flex items-center gap-1.5"><Info size={12} /> รองรับลิงก์จาก:</p>
              <ul className="space-y-1 ml-5 list-disc text-sky-800">
                <li><b>YouTube</b> — youtube.com/watch?v=... หรือ youtu.be/...</li>
                <li><b>Vimeo</b> — vimeo.com/...</li>
                <li><b>Google Drive</b> — drive.google.com/file/d/... (ตั้งเป็น "ทุกคนที่มีลิงก์")</li>
                <li><b>MP4 ตรง</b> — ลิงก์ที่ลงท้ายด้วย .mp4, .webm, .mov</li>
              </ul>
              <p className="font-bold mt-2 pt-2 border-t border-sky-200">💡 วิธีอัปโหลดวิดีโอใหญ่ไป YouTube/Drive แล้วเอาลิงก์มาใช้:</p>
              <ol className="space-y-1 ml-5 list-decimal text-sky-800">
                <li>อัปโหลดวิดีโอเข้า YouTube (ตั้งเป็น "ไม่แสดงในรายการ") หรือ Google Drive</li>
                <li>กดแชร์ → คัดลอกลิงก์</li>
                <li>วางในช่องด้านบน → กด "ใช้ URL นี้"</li>
              </ol>
            </div>
          </div>
        )}

        {onCancel && (
          <button onClick={onCancel} className="w-full mt-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">
            ยกเลิก
          </button>
        )}
      </div>

      {/* Size warning modal */}
      {showSizeWarning && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowSizeWarning(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={28} className="text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-black text-slate-800">ไฟล์ใหญ่กว่าขีดจำกัด</h3>
                <p className="text-xs text-slate-500 mt-1">{pendingFile.name}</p>
                <p className="text-xs text-amber-700 mt-1 font-bold">ขนาด: {fmtBytes(pendingFile.size)} (เกิน {SOFT_LIMIT_MB} MB)</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-2">
              <p className="font-bold">💡 แนะนำให้เลือกวิธีใดวิธีหนึ่ง:</p>
              <ol className="ml-4 list-decimal space-y-1.5">
                <li>
                  <b>อัปโหลดเข้า YouTube/Drive แล้วใส่ลิงก์</b> (ฟรี, รวดเร็ว)
                  <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600 font-bold ml-1">เปิด YouTube Studio<ExternalLink size={9}/></a>
                </li>
                <li>
                  <b>บีบอัดวิดีโอก่อน</b> ด้วย HandBrake หรือ online tool
                  <a href="https://handbrake.fr/downloads.php" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600 font-bold ml-1">HandBrake<ExternalLink size={9}/></a>
                  <span> · </span>
                  <a href="https://www.freeconvert.com/video-compressor" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600 font-bold">FreeConvert<ExternalLink size={9}/></a>
                </li>
                <li>
                  <b>อัปเกรด Supabase Pro</b> ($25/เดือน → สูงสุด 5 GB ต่อไฟล์)
                  <a href="https://supabase.com/pricing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600 font-bold ml-1">ดู Pricing<ExternalLink size={9}/></a>
                </li>
              </ol>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowSizeWarning(false); setPendingFile(null); setTab("url") }}
                className="flex-1 py-2.5 text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100">
                เปลี่ยนเป็นใช้ลิงก์
              </button>
              <button onClick={() => { setShowSizeWarning(false); doUpload(pendingFile); setPendingFile(null) }}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600">
                ลองอัปโหลดอยู่ดี
              </button>
            </div>
            <button onClick={() => { setShowSizeWarning(false); setPendingFile(null) }}
              className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
