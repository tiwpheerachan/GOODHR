"use client"
/**
 * DisciplineTab — บันทึกโทษทางวินัย / ใบเตือน ของพนักงานรายคน
 *   เก็บเป็น record (แนบรูป/ไฟล์ได้) · เพิ่ม/แก้ไข/ลบ/แสดง
 *   ใช้ /api/employees/discipline (admin เท่านั้น) + /api/leave/upload สำหรับไฟล์แนบ
 */
import { useEffect, useRef, useState } from "react"
import {
  Gavel, Plus, Loader2, Paperclip, X, Pencil, Trash2, Eye, FileText, Calendar, Save,
} from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/i18n"

type Attachment = { url: string; name: string; size?: number }
type Rec = {
  id: string
  punish_date: string | null
  end_date: string | null
  offense_type: string | null
  legal_penalty: string | null
  penalty: string | null
  reference_doc: string | null
  detail: string | null
  attachments: Attachment[] | null
}

const isImage = (name: string) => /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(name)
function fmtDate(d: string | null) {
  if (!d) return "—"
  try { return new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }) }
  catch { return d }
}

const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/10 transition-all"

const EMPTY = {
  punish_date: "", end_date: "", offense_type: "", legal_penalty: "",
  penalty: "", reference_doc: "", detail: "",
}

export default function DisciplineTab({ employeeId }: { employeeId: string }) {
  const { t } = useLanguage()
  const [records, setRecords] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewRec, setViewRec] = useState<Rec | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const formTopRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/discipline?employee_id=${employeeId}`)
      const data = await res.json()
      setRecords(data.records ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [employeeId])

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }))

  function resetForm() {
    setForm({ ...EMPTY }); setAttachments([]); setEditingId(null)
  }

  function startEdit(r: Rec) {
    setEditingId(r.id)
    setForm({
      punish_date: r.punish_date ?? "", end_date: r.end_date ?? "",
      offense_type: r.offense_type ?? "", legal_penalty: r.legal_penalty ?? "",
      penalty: r.penalty ?? "", reference_doc: r.reference_doc ?? "", detail: r.detail ?? "",
    })
    setAttachments(Array.isArray(r.attachments) ? r.attachments : [])
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (attachments.length + files.length > 20) { toast.error(t("admin.emp_detail.disc_max_files")); if (fileRef.current) fileRef.current.value = ""; return }
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) { toast.error(t("admin.emp_detail.disc_file_too_big")); if (fileRef.current) fileRef.current.value = ""; return }
    }
    setUploading(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append("files", files[i])
      const res = await fetch("/api/leave/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || t("admin.emp_detail.disc_upload_failed")); return }
      const uploaded: Attachment[] = (json.files ?? [{ url: json.url, name: json.name }])
        .map((f: any, i: number) => ({ url: f.url, name: f.name, size: files[i]?.size }))
      setAttachments(prev => [...prev, ...uploaded])
      toast.success(t("admin.emp_detail.disc_uploaded"))
    } catch { toast.error(t("admin.emp_detail.disc_upload_failed")) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = "" }
  }

  async function handleSave() {
    if (!form.punish_date) { toast.error(t("admin.emp_detail.disc_err_punish_date")); return }
    setSaving(true)
    try {
      const payload = { ...form, attachments, employee_id: employeeId, ...(editingId ? { id: editingId } : {}) }
      const res = await fetch("/api/employees/discipline", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.disc_toast_save_failed"))
      toast.success(t("admin.emp_detail.disc_toast_saved"))
      resetForm()
      load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.emp_detail.disc_confirm_delete"))) return
    try {
      const res = await fetch(`/api/employees/discipline?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("admin.emp_detail.disc_toast_save_failed"))
      toast.success(t("admin.emp_detail.disc_toast_deleted"))
      if (editingId === id) resetForm()
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div ref={formTopRef}>
      <div className="flex items-center gap-2 mb-1">
        <Gavel size={18} className="text-rose-600" />
        <h3 className="font-bold text-slate-800">{t("admin.emp_detail.disc_title")}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">{t("admin.emp_detail.disc_desc")}</p>

      {/* ── Form ── */}
      <div className="rounded-2xl border-2 border-rose-100 bg-rose-50/40 p-4 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><Pencil size={12}/> {t("admin.emp_detail.disc_editing")}</span>
            <button onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-rose-600">{t("admin.emp_detail.disc_cancel_edit")}</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_punish_date")} <span className="text-rose-500">*</span></label>
            <input type="date" value={form.punish_date} onChange={e => set("punish_date", e.target.value)} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_end_date")}</label>
            <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_offense_type")}</label>
            <input value={form.offense_type} onChange={e => set("offense_type", e.target.value)} placeholder={t("admin.emp_detail.disc_offense_type_ph")} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_legal_penalty")}</label>
            <input value={form.legal_penalty} onChange={e => set("legal_penalty", e.target.value)} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_penalty")}</label>
            <input value={form.penalty} onChange={e => set("penalty", e.target.value)} placeholder={t("admin.emp_detail.disc_penalty_ph")} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_reference_doc")}</label>
            <input value={form.reference_doc} onChange={e => set("reference_doc", e.target.value)} placeholder={t("admin.emp_detail.disc_reference_doc_ph")} className={inp}/>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">{t("admin.emp_detail.disc_detail")}</label>
          <textarea value={form.detail} onChange={e => set("detail", e.target.value)} rows={3} className={`${inp} resize-y`}/>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("admin.emp_detail.disc_attachments")}</label>
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {isImage(att.name) ? (
                    <a href={att.url} target="_blank" rel="noreferrer"><img src={att.url} alt={att.name} className="w-full h-16 object-cover"/></a>
                  ) : (
                    <a href={att.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-16 text-slate-500">
                      <FileText size={16}/><span className="text-[8px] mt-0.5 px-1 truncate w-full text-center">{att.name}</span>
                    </a>
                  )}
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-white/90 rounded-full shadow text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={11}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} className="hidden"/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-white border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 disabled:opacity-60">
            {uploading ? <Loader2 size={12} className="animate-spin"/> : <Paperclip size={12}/>}
            {uploading ? t("admin.emp_detail.disc_uploading") : t("admin.emp_detail.disc_attach_add")}
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 bg-rose-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-rose-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin"/> : editingId ? <Save size={14}/> : <Plus size={14}/>}
            {saving ? t("admin.emp_detail.disc_saving") : editingId ? t("admin.emp_detail.disc_save") : t("admin.emp_detail.disc_add")}
          </button>
          {editingId && (
            <button onClick={resetForm} className="text-sm font-bold text-slate-500 hover:text-rose-600 px-3 py-2">{t("admin.emp_detail.disc_cancel_edit")}</button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
        ) : records.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">{t("admin.emp_detail.disc_empty")}</p>
        ) : (
          <div className="space-y-2">
            {records.map(r => {
              const atts = Array.isArray(r.attachments) ? r.attachments : []
              return (
                <div key={r.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-start gap-3 hover:shadow-sm transition-shadow">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <Gavel size={15} className="text-rose-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1"><Calendar size={11} className="text-slate-400"/> {fmtDate(r.punish_date)}{r.end_date && <span className="text-slate-400 font-normal"> – {fmtDate(r.end_date)}</span>}</span>
                      {r.offense_type && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{r.offense_type}</span>}
                      {r.penalty && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{r.penalty}</span>}
                      {atts.length > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-0.5"><Paperclip size={9}/> {atts.length}</span>}
                    </div>
                    {r.reference_doc && <p className="text-xs text-slate-500 truncate">{t("admin.emp_detail.disc_reference_doc")}: {r.reference_doc}</p>}
                    {r.detail && <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{r.detail}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setViewRec(r)} title={t("admin.emp_detail.disc_view")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><Eye size={14}/></button>
                    <button onClick={() => startEdit(r)} title={t("admin.emp_detail.disc_edit")} className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-blue-500"><Pencil size={14}/></button>
                    <button onClick={() => handleDelete(r.id)} title={t("admin.emp_detail.disc_delete")} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── View modal ── */}
      {viewRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewRec(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
              <Gavel size={16} className="text-rose-600"/>
              <h3 className="text-base font-black text-slate-800 flex-1">{t("admin.emp_detail.disc_view_title")}</h3>
              <button onClick={() => setViewRec(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X size={16} className="text-slate-400"/></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                [t("admin.emp_detail.disc_punish_date"), fmtDate(viewRec.punish_date)],
                [t("admin.emp_detail.disc_end_date"), fmtDate(viewRec.end_date)],
                [t("admin.emp_detail.disc_offense_type"), viewRec.offense_type || "—"],
                [t("admin.emp_detail.disc_legal_penalty"), viewRec.legal_penalty || "—"],
                [t("admin.emp_detail.disc_penalty"), viewRec.penalty || "—"],
                [t("admin.emp_detail.disc_reference_doc"), viewRec.reference_doc || "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-3">
                  <span className="w-32 shrink-0 text-xs font-bold text-slate-500">{label}</span>
                  <span className="text-slate-700">{val}</span>
                </div>
              ))}
              {viewRec.detail && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">{t("admin.emp_detail.disc_detail")}</p>
                  <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">{viewRec.detail}</p>
                </div>
              )}
              {Array.isArray(viewRec.attachments) && viewRec.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1.5">{t("admin.emp_detail.disc_attachments")}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {viewRec.attachments.map((att, idx) => (
                      <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="block bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-rose-300">
                        {isImage(att.name) ? <img src={att.url} alt={att.name} className="w-full h-20 object-cover"/> :
                          <div className="flex flex-col items-center justify-center h-20 text-slate-500"><FileText size={18}/><span className="text-[8px] mt-0.5 px-1 truncate w-full text-center">{att.name}</span></div>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
