"use client"
/**
 * DocumentsTab — เก็บเอกสารของพนักงานรายคน
 *   อัปโหลดหลายไฟล์พร้อมกัน · ตั้งชื่อเอกสารได้ (ไม่ตั้ง = ใช้ชื่อไฟล์)
 *   ใช้ /api/employees/documents (admin เท่านั้น)
 */
import { useEffect, useRef, useState } from "react"
import {
  FileText, Upload, Loader2, X, Trash2, Download, Plus, File as FileIcon, Image as ImageIcon,
} from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/i18n"

type Doc = {
  id: string
  name: string
  file_url: string
  file_name: string | null
  file_size: number | null
  file_type: string | null
  created_at: string
}
type Staged = { file: File; name: string }

function stripExt(n: string) { return n.replace(/\.[^./\\]+$/, "").trim() || n }
function fmtSize(b: number | null) {
  if (!b) return ""
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }) }
  catch { return d }
}
const isImg = (t: string | null, n: string | null) =>
  (t?.startsWith("image/")) || /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(n || "")

const MAX = 20 * 1024 * 1024

export default function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { t } = useLanguage()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [staged, setStaged] = useState<Staged[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/documents?employee_id=${employeeId}`)
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [employeeId])

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (fileRef.current) fileRef.current.value = ""
    if (files.length === 0) return
    const tooBig = files.find(f => f.size > MAX)
    if (tooBig) { toast.error(t("admin.emp_detail.doc_file_too_big")); return }
    const add = files.map(f => ({ file: f, name: stripExt(f.name) }))
    setStaged(prev => {
      const next = [...prev, ...add]
      if (next.length > 20) { toast.error(t("admin.emp_detail.doc_max_files")); return next.slice(0, 20) }
      return next
    })
  }

  function updateStagedName(i: number, v: string) {
    setStaged(prev => prev.map((s, idx) => idx === i ? { ...s, name: v } : s))
  }
  function removeStaged(i: number) {
    setStaged(prev => prev.filter((_, idx) => idx !== i))
  }

  async function upload() {
    if (staged.length === 0) { toast.error(t("admin.emp_detail.doc_no_files")); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("employee_id", employeeId)
      for (const s of staged) {
        fd.append("files", s.file)
        fd.append("names", s.name.trim())   // parallel กับ files (ว่าง = server ใช้ชื่อไฟล์)
      }
      const res = await fetch("/api/employees/documents", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || t("admin.emp_detail.doc_upload_failed")); return }
      const n = json.documents?.length ?? 0
      toast.success(t("admin.emp_detail.doc_uploaded", { n }))
      if (json.errors?.length) toast.error(json.errors.join("; "))
      setStaged([])
      load()
    } catch { toast.error(t("admin.emp_detail.doc_upload_failed")) }
    finally { setUploading(false) }
  }

  async function del(id: string) {
    if (!confirm(t("admin.emp_detail.doc_delete_confirm"))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/employees/documents?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || "Error"); return }
      toast.success(t("admin.emp_detail.doc_deleted"))
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch { toast.error("Error") }
    finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600"/> {t("admin.emp_detail.doc_title")}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("admin.emp_detail.doc_desc")}</p>
        </div>
        {docs.length > 0 && (
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            {docs.length} {t("admin.emp_detail.doc_count")}
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <input ref={fileRef} type="file" multiple onChange={onPick} className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"/>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl py-6 flex flex-col items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
          <Plus size={22} className="text-blue-500"/>
          <span className="text-sm font-bold text-blue-700">{t("admin.emp_detail.doc_pick")}</span>
          <span className="text-[11px] text-slate-400">{t("admin.emp_detail.doc_pick_hint")}</span>
        </button>

        {/* Staged files — ตั้งชื่อรายไฟล์ */}
        {staged.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500">{t("admin.emp_detail.doc_staged")} ({staged.length})</p>
            {staged.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                {isImg(s.file.type, s.file.name)
                  ? <ImageIcon size={16} className="text-slate-400 shrink-0"/>
                  : <FileIcon size={16} className="text-slate-400 shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <input value={s.name} onChange={e => updateStagedName(i, e.target.value)}
                    placeholder={t("admin.emp_detail.doc_name_ph")}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"/>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.file.name} · {fmtSize(s.file.size)}</p>
                </div>
                <button onClick={() => removeStaged(i)} className="p-1.5 hover:bg-slate-200 rounded-lg shrink-0">
                  <X size={14} className="text-slate-500"/>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={upload} disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {uploading ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>}
                {uploading ? t("admin.emp_detail.doc_uploading") : t("admin.emp_detail.doc_upload")}
              </button>
              <button onClick={() => setStaged([])} disabled={uploading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl disabled:opacity-60">
                {t("admin.emp_detail.doc_clear")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-300"/></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <FileText size={30} className="mx-auto mb-2 text-slate-300"/>
            <p className="text-sm">{t("admin.emp_detail.doc_empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isImg(d.file_type, d.file_name) ? "bg-emerald-50" : "bg-blue-50"}`}>
                  {isImg(d.file_type, d.file_name)
                    ? <ImageIcon size={16} className="text-emerald-500"/>
                    : <FileIcon size={16} className="text-blue-500"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{d.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {d.file_name}{d.file_size ? ` · ${fmtSize(d.file_size)}` : ""} · {fmtDate(d.created_at)}
                  </p>
                </div>
                <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                  className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg shrink-0" title={t("admin.emp_detail.doc_open")}>
                  <Download size={15}/>
                </a>
                <button onClick={() => del(d.id)} disabled={deletingId === d.id}
                  className="p-2 hover:bg-rose-100 text-rose-500 rounded-lg shrink-0" title={t("admin.emp_detail.doc_delete")}>
                  {deletingId === d.id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
