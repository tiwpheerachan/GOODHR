"use client"
/**
 * DocumentsTab — แฟ้มประวัติพนักงาน จัดเป็นโฟลเดอร์ตาม checklist (Section A–F)
 *   • แต่ละรายการอัปโหลดไฟล์เข้าหัวข้อได้โดยตรง (มี ✓ บอกว่ามีแล้ว/ยังขาด)
 *   • โฟลเดอร์ "อื่นๆ" สำหรับเอกสารเพิ่มเองนอก checklist (อัปหลายไฟล์ + ตั้งชื่อ)
 *   ใช้ /api/employees/documents (admin เท่านั้น)
 */
import { useEffect, useRef, useState } from "react"
import {
  FileText, Upload, Loader2, X, Trash2, Download, Plus, File as FileIcon, Image as ImageIcon,
  Folder, FolderOpen, ChevronDown, CheckCircle2, Circle, UploadCloud,
} from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/i18n"

// ── checklist แฟ้มประวัติพนักงาน ──
type Item = { key: string; name: string }
type Section = { key: string; en: string; th: string; items: Item[] }
const CHECKLIST: Section[] = [
  { key: "A", en: "Recruitment Documents", th: "เอกสารการสรรหา", items: [
    { key: "1", name: "ใบขอคน" },
    { key: "2", name: "ใบสมัครงาน" },
    { key: "3", name: "CV / Resume" },
    { key: "4", name: "ใบประเมินสัมภาษณ์งาน" },
    { key: "5", name: "สำเนาบัตรประชาชน" },
    { key: "6", name: "สำเนาทะเบียนบ้าน" },
    { key: "7", name: "หนังสือรับรองคุณวุฒิ / ระเบียนการศึกษา" },
    { key: "8", name: "หนังสือรับรองการทำงานจากนายจ้างเดิม (ถ้ามี)" },
    { key: "9", name: "สำเนาหน้าบัญชีธนาคาร" },
    { key: "10", name: "ผลตรวจสุขภาพก่อนเริ่มงาน" },
    { key: "11", name: "ผลตรวจประวัติอาชญากรรม (ถ้ามี)" },
  ]},
  { key: "B", en: "Employment Documents", th: "เอกสารการจ้างงาน", items: [
    { key: "12", name: "สัญญาจ้างงาน (Employment Contract)" },
    { key: "13", name: "หนังสือ Offer เงินเดือน" },
    { key: "14", name: "หนังสือยินยอมเปิดเผยข้อมูลส่วนบุคคล (PDPA)" },
  ]},
  { key: "C", en: "Compensation & Benefits", th: "ค่าตอบแทนและสวัสดิการ", items: [
    { key: "16", name: "หนังสือปรับตำแหน่ง / เงินเดือน (ถ้ามี)" },
    { key: "17", name: "ผลตรวจสุขภาพประจำปี" },
  ]},
  { key: "D", en: "Performance Management", th: "การบริหารผลงาน", items: [
    { key: "15", name: "หนังสือผ่านทดลองงาน" },
  ]},
  { key: "E", en: "Employee Relations", th: "แรงงานสัมพันธ์", items: [
    { key: "18", name: "หนังสือตักเตือน (Warning Letter)" },
  ]},
  { key: "F", en: "Separation Documents", th: "เอกสารการพ้นสภาพ", items: [
    { key: "19", name: "ใบลาออก / หนังสือเลิกจ้าง" },
    { key: "20", name: "หนังสือรับรองการทำงาน (ถ้ามี)" },
  ]},
]

type Doc = {
  id: string
  name: string
  file_url: string
  file_name: string | null
  file_size: number | null
  file_type: string | null
  category: string | null
  checklist_key: string | null
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
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"

export default function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { t } = useLanguage()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)   // checklist_key ที่กำลังอัป
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(CHECKLIST.map(s => s.key).concat("custom")))

  // per-item file input
  const itemInputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<{ category: string; key: string; name: string } | null>(null)

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

  // เอกสารตาม checklist_key
  const byKey = new Map<string, Doc[]>()
  const customDocs: Doc[] = []
  for (const d of docs) {
    if (d.checklist_key) {
      if (!byKey.has(d.checklist_key)) byKey.set(d.checklist_key, [])
      byKey.get(d.checklist_key)!.push(d)
    } else {
      customDocs.push(d)
    }
  }
  const filledCount = CHECKLIST.reduce((n, s) => n + s.items.filter(i => (byKey.get(i.key)?.length ?? 0) > 0).length, 0)
  const totalItems = CHECKLIST.reduce((n, s) => n + s.items.length, 0)

  function toggle(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // อัปโหลดเข้ารายการ checklist
  function pickForItem(section: Section, item: Item) {
    targetRef.current = { category: section.key, key: item.key, name: item.name }
    itemInputRef.current?.click()
  }
  async function onItemFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (itemInputRef.current) itemInputRef.current.value = ""
    const tgt = targetRef.current
    if (!tgt || files.length === 0) return
    if (files.find(f => f.size > MAX)) { toast.error(t("admin.emp_detail.doc_file_too_big")); return }
    setUploadingKey(tgt.key)
    try {
      const fd = new FormData()
      fd.append("employee_id", employeeId)
      fd.append("category", tgt.category)
      fd.append("checklist_key", tgt.key)
      for (const f of files) { fd.append("files", f); fd.append("names", tgt.name) }
      const res = await fetch("/api/employees/documents", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || t("admin.emp_detail.doc_upload_failed")); return }
      toast.success(t("admin.emp_detail.doc_uploaded", { n: json.documents?.length ?? 0 }))
      load()
    } catch { toast.error(t("admin.emp_detail.doc_upload_failed")) }
    finally { setUploadingKey(null) }
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

  const pct = totalItems > 0 ? Math.round((filledCount / totalItems) * 100) : 0

  return (
    <div className="space-y-4">
      {/* hidden input สำหรับอัปเข้ารายการ */}
      <input ref={itemInputRef} type="file" multiple accept={ACCEPT} onChange={onItemFiles} className="hidden"/>

      {/* Header + progress */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-600"/> {t("admin.emp_detail.doc_title")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">แฟ้มประวัติพนักงาน · จัดตามหมวดเอกสาร</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-800">{filledCount}<span className="text-sm font-bold text-slate-400"> / {totalItems}</span></p>
            <p className="text-[11px] text-slate-400">รายการที่มีเอกสาร</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-300"/></div>
      ) : (
        <>
          {/* โฟลเดอร์ตาม Section */}
          {CHECKLIST.map(section => {
            const isOpen = openSections.has(section.key)
            const done = section.items.filter(i => (byKey.get(i.key)?.length ?? 0) > 0).length
            return (
              <div key={section.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* folder header */}
                <button onClick={() => toggle(section.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    {isOpen ? <FolderOpen size={17} className="text-blue-600"/> : <Folder size={17} className="text-blue-500"/>}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-black text-slate-800 truncate">
                      <span className="text-blue-500">Section {section.key}</span> · {section.th}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{section.en}</p>
                  </div>
                  <span className={"text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 " +
                    (done === section.items.length ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                    {done}/{section.items.length}
                  </span>
                  <ChevronDown size={16} className={"text-slate-400 shrink-0 transition-transform " + (isOpen ? "rotate-180" : "")}/>
                </button>

                {/* items */}
                {isOpen && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {section.items.map(item => {
                      const files = byKey.get(item.key) ?? []
                      const has = files.length > 0
                      const busy = uploadingKey === item.key
                      return (
                        <div key={item.key} className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {has
                              ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
                              : <Circle size={16} className="text-slate-300 shrink-0"/>}
                            <span className="flex-1 min-w-0 text-sm font-medium text-slate-700">
                              <span className="text-slate-400 mr-1">{item.key}.</span>{item.name}
                            </span>
                            <button onClick={() => pickForItem(section, item)} disabled={busy}
                              className="flex items-center gap-1 text-[12px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-1 shrink-0 disabled:opacity-50">
                              {busy ? <Loader2 size={13} className="animate-spin"/> : <UploadCloud size={13}/>}
                              {has ? "เพิ่ม" : "อัปโหลด"}
                            </button>
                          </div>

                          {/* ไฟล์ในรายการนี้ */}
                          {has && (
                            <div className="mt-1.5 ml-[26px] space-y-1">
                              {files.map(d => (
                                <div key={d.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
                                  {isImg(d.file_type, d.file_name)
                                    ? <ImageIcon size={13} className="text-emerald-500 shrink-0"/>
                                    : <FileIcon size={13} className="text-blue-500 shrink-0"/>}
                                  <span className="flex-1 min-w-0 text-[12px] text-slate-600 truncate">
                                    {d.file_name || d.name}<span className="text-slate-400">{d.file_size ? ` · ${fmtSize(d.file_size)}` : ""} · {fmtDate(d.created_at)}</span>
                                  </span>
                                  <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                                    className="p-1 hover:bg-blue-100 text-blue-600 rounded shrink-0" title={t("admin.emp_detail.doc_open")}>
                                    <Download size={13}/>
                                  </a>
                                  <button onClick={() => del(d.id)} disabled={deletingId === d.id}
                                    className="p-1 hover:bg-rose-100 text-rose-500 rounded shrink-0" title={t("admin.emp_detail.doc_delete")}>
                                    {deletingId === d.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* โฟลเดอร์ "อื่นๆ" — เพิ่มเอง */}
          <CustomFolder
            employeeId={employeeId}
            docs={customDocs}
            open={openSections.has("custom")}
            onToggle={() => toggle("custom")}
            onChanged={load}
            onDelete={del}
            deletingId={deletingId}
            t={t}
          />
        </>
      )}
    </div>
  )
}

// ── โฟลเดอร์เอกสารเพิ่มเอง (นอก checklist) ──
function CustomFolder({
  employeeId, docs, open, onToggle, onChanged, onDelete, deletingId, t,
}: {
  employeeId: string; docs: Doc[]; open: boolean; onToggle: () => void
  onChanged: () => void; onDelete: (id: string) => void; deletingId: string | null; t: (k: string, v?: any) => string
}) {
  const [staged, setStaged] = useState<Staged[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (fileRef.current) fileRef.current.value = ""
    if (files.length === 0) return
    if (files.find(f => f.size > MAX)) { toast.error(t("admin.emp_detail.doc_file_too_big")); return }
    setStaged(prev => [...prev, ...files.map(f => ({ file: f, name: stripExt(f.name) }))].slice(0, 20))
  }
  async function upload() {
    if (staged.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("employee_id", employeeId)
      fd.append("category", "custom")
      for (const s of staged) { fd.append("files", s.file); fd.append("names", s.name.trim()) }
      const res = await fetch("/api/employees/documents", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || t("admin.emp_detail.doc_upload_failed")); return }
      toast.success(t("admin.emp_detail.doc_uploaded", { n: json.documents?.length ?? 0 }))
      setStaged([]); onChanged()
    } catch { toast.error(t("admin.emp_detail.doc_upload_failed")) }
    finally { setUploading(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          {open ? <FolderOpen size={17} className="text-violet-600"/> : <Folder size={17} className="text-violet-500"/>}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-black text-slate-800">เอกสารอื่นๆ (เพิ่มเอง)</p>
          <p className="text-[11px] text-slate-400">เอกสารนอกเหนือ checklist</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 shrink-0">{docs.length}</span>
        <ChevronDown size={16} className={"text-slate-400 shrink-0 transition-transform " + (open ? "rotate-180" : "")}/>
      </button>

      {open && (
        <div className="border-t border-slate-50 p-4 space-y-3">
          <input ref={fileRef} type="file" multiple onChange={onPick} className="hidden" accept={ACCEPT}/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 rounded-xl py-5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50">
            <Plus size={20} className="text-violet-500"/>
            <span className="text-sm font-bold text-violet-700">{t("admin.emp_detail.doc_pick")}</span>
            <span className="text-[11px] text-slate-400">{t("admin.emp_detail.doc_pick_hint")}</span>
          </button>

          {staged.length > 0 && (
            <div className="space-y-2">
              {staged.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                  {isImg(s.file.type, s.file.name)
                    ? <ImageIcon size={16} className="text-slate-400 shrink-0"/>
                    : <FileIcon size={16} className="text-slate-400 shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <input value={s.name} onChange={e => setStaged(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      placeholder={t("admin.emp_detail.doc_name_ph")}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-violet-400"/>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.file.name} · {fmtSize(s.file.size)}</p>
                  </div>
                  <button onClick={() => setStaged(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 hover:bg-slate-200 rounded-lg shrink-0">
                    <X size={14} className="text-slate-500"/>
                  </button>
                </div>
              ))}
              <button onClick={upload} disabled={uploading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {uploading ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>}
                {uploading ? t("admin.emp_detail.doc_uploading") : t("admin.emp_detail.doc_upload")}
              </button>
            </div>
          )}

          {docs.length > 0 && (
            <div className="divide-y divide-slate-50">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
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
                  <button onClick={() => onDelete(d.id)} disabled={deletingId === d.id}
                    className="p-2 hover:bg-rose-100 text-rose-500 rounded-lg shrink-0" title={t("admin.emp_detail.doc_delete")}>
                    {deletingId === d.id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
