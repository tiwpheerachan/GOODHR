"use client"
import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, Camera, Plus, Trash2, Loader2, Store, Search, Check, X, ClipboardList, FileText,
  Paperclip, File as FileIcon, Download,
} from "lucide-react"
import { compressImage } from "@/lib/utils/image-compress"

type Tpl = { id: string; name: string; description?: string; config: any }
type Dealer = {
  id: string; name: string; code?: string; store_type?: string; zone?: string; area?: string
  is_new?: boolean; contact_name?: string; contact_phone?: string; lat?: number; lng?: number
}
type Photo = { url: string; storage_path: string; caption?: string }
type FileAtt = { url: string; storage_path: string; name: string; mime?: string; size?: number }

const fmtSize = (n?: number) => !n ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

function emptyData(config: any) {
  const d: any = {}
  for (const s of config?.sections ?? []) {
    if (s.type === "fields") for (const f of s.fields ?? []) d[f.key] = ""
    else if (s.type === "textlist") d[s.key] = Array.from({ length: s.count ?? 5 }, () => "")
    else if (s.type === "table") d[s.key] = [rowFor(s)]
    else if (s.type === "checkboxes") d[s.key] = { selected: [], other: "" }
    else if (s.type === "textarea") d[s.key] = ""
  }
  return d
}
function rowFor(s: any) {
  const r: any = {}
  for (const c of s.columns ?? []) r[c.key] = ""
  return r
}

function NewChecklistInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [tplId, setTplId] = useState("")
  const [dealer, setDealer] = useState<Dealer | null>(null)
  const [data, setData] = useState<any>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [files, setFiles] = useState<FileAtt[]>([])
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [locName, setLocName] = useState("")
  const [gpsBusy, setGpsBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [pickDealer, setPickDealer] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const assignmentId = sp.get("assignment") || null
  const draftId = sp.get("draft") || sp.get("edit")
  const [editId, setEditId] = useState<string | null>(draftId)
  const skipReset = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const tpl = useMemo(() => tpls.find(t => t.id === tplId), [tpls, tplId])

  // โหลด template + context จาก assignment/query/draft
  useEffect(() => {
    fetch("/api/branch-eval/store-checklist/templates").then(r => r.json()).then(async (res) => {
      const list: Tpl[] = res.templates ?? []
      setTpls(list)
      const qTpl = sp.get("template")
      // ── แก้ไข "ร่าง" เดิม → prefill ทุกอย่าง ──
      if (draftId) {
        const r = await fetch(`/api/branch-eval/store-checklist/submissions?id=${draftId}`).then(x => x.json()).catch(() => ({}))
        const s = r.submission
        if (s) {
          skipReset.current = true
          if (s.template_id) setTplId(s.template_id); else if (list[0]) setTplId(list[0].id)
          if (s.dealer) setDealer(s.dealer)
          if (s.data) setData(s.data)
          if (Array.isArray(s.photos)) setPhotos(s.photos)
          if (Array.isArray(s.files)) setFiles(s.files)
          if (s.lat != null && s.lng != null) setGps({ lat: s.lat, lng: s.lng })
          if (s.location_name) setLocName(s.location_name)
          setEditId(s.id)
          return
        }
      }
      // ถ้ามาจากงานมอบหมาย → ดึง template/dealer จาก assignment
      if (assignmentId) {
        const a = await fetch("/api/branch-eval/store-checklist/assignments?mine=1").then(r => r.json()).catch(() => ({}))
        const found = (a.assignments ?? []).find((x: any) => x.id === assignmentId)
        if (found) {
          if (found.template_id) setTplId(found.template_id)
          else if (list[0]) setTplId(list[0].id)
          if (found.dealer) setDealer(found.dealer)
          return
        }
      }
      setTplId(qTpl && list.some(t => t.id === qTpl) ? qTpl : (list[0]?.id ?? ""))
      const qDealer = sp.get("dealer")
      if (qDealer) {
        const dl = await fetch(`/api/branch-eval/store-checklist/dealers`).then(r => r.json()).catch(() => ({}))
        const f = (dl.dealers ?? []).find((x: any) => x.id === qDealer)
        if (f) setDealer(f)
      }
    })
  }, [])   // eslint-disable-line

  // reset data เมื่อเปลี่ยน template (ข้ามครั้งแรกถ้ากำลัง prefill ร่าง)
  useEffect(() => {
    if (skipReset.current) { skipReset.current = false; return }
    if (tpl) setData(emptyData(tpl.config))
  }, [tplId])   // eslint-disable-line

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))

  const captureGps = () => {
    if (!navigator.geolocation) { alert("อุปกรณ์ไม่รองรับ GPS"); return }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsBusy(false) },
      () => { alert("ระบุตำแหน่งไม่สำเร็จ กรุณาเปิดสิทธิ์ location"); setGpsBusy(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // อัปรูป (บีบอัดก่อน)
  const onFiles = async (fl: FileList | null) => {
    if (!fl || fl.length === 0) return
    setUploading(true)
    for (const raw of Array.from(fl)) {
      const file = await compressImage(raw)
      const fd = new FormData(); fd.append("file", file)
      try {
        const res = await fetch("/api/branch-eval/store-checklist/upload", { method: "POST", body: fd }).then(r => r.json())
        if (res.url) setPhotos(p => [...p, { url: res.url, storage_path: res.storage_path, caption: "" }])
        else alert(res.error || "อัปโหลดรูปไม่สำเร็จ")
      } catch { alert("อัปโหลดรูปไม่สำเร็จ") }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  // แนบไฟล์ (PDF/เอกสาร/วิดีโอ ฯลฯ)
  const onDocs = async (fl: FileList | null) => {
    if (!fl || fl.length === 0) return
    setUploadingFile(true)
    for (const file of Array.from(fl)) {
      const fd = new FormData(); fd.append("file", file)
      try {
        const res = await fetch("/api/branch-eval/store-checklist/upload", { method: "POST", body: fd }).then(r => r.json())
        if (res.url) setFiles(p => [...p, { url: res.url, storage_path: res.storage_path, name: res.name || file.name, mime: res.mime, size: res.size }])
        else alert(res.error || "อัปโหลดไฟล์ไม่สำเร็จ")
      } catch { alert("อัปโหลดไฟล์ไม่สำเร็จ") }
    }
    setUploadingFile(false)
    if (docRef.current) docRef.current.value = ""
  }

  const save = async (status: "draft" | "submitted") => {
    if (!dealer) { alert("กรุณาเลือกร้าน"); return }
    if (!tplId) { alert("กรุณาเลือกแบบฟอร์ม"); return }
    if (uploading || uploadingFile) { alert("กรุณารอไฟล์อัปโหลดเสร็จก่อน"); return }
    const busy = status === "draft" ? setSavingDraft : setSaving
    busy(true)
    const payload: any = { template_id: tplId, dealer_id: dealer.id, assignment_id: assignmentId,
      data, photos, files, lat: gps?.lat, lng: gps?.lng, location_name: locName, status }
    let res: any
    if (editId) {
      res = await fetch("/api/branch-eval/store-checklist/submissions", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...payload }),
      }).then(r => r.json())
    } else {
      res = await fetch("/api/branch-eval/store-checklist/submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(r => r.json())
    }
    busy(false)
    if (res.id) {
      router.push(`/app/store-checklist?${status === "draft" ? "draft=1" : "done=1"}`)
    } else alert(res.error || "บันทึกไม่สำเร็จ")
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Link href="/app/store-checklist" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={18} /> {editId ? "แก้ไขร่างเช็คลิสต์" : "เช็คลิสต์ร้านค้า"}</h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Template */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500">แบบฟอร์ม</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {tpls.map(t => (
              <button key={t.id} onClick={() => setTplId(t.id)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border ${tplId === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dealer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500">ร้าน</label>
          {dealer ? (
            <div className="mt-2 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600"><Store size={18} /></div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">{dealer.name}
                  {dealer.is_new && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">ร้านใหม่</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {[dealer.store_type, dealer.zone, dealer.area].filter(Boolean).join(" · ")}
                  {dealer.contact_name && ` · ${dealer.contact_name}`}{dealer.contact_phone && ` ${dealer.contact_phone}`}
                </div>
              </div>
              <button onClick={() => setPickDealer(true)} className="text-xs text-indigo-600 font-bold">เปลี่ยน</button>
            </div>
          ) : (
            <button onClick={() => setPickDealer(true)}
              className="mt-2 w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-500 flex items-center justify-center gap-2">
              <Search size={16} /> เลือกร้าน
            </button>
          )}
        </div>

        {/* Sections */}
        {tpl?.config?.sections?.map((s: any) => (
          <SectionEditor key={s.key} section={s} data={data} set={set} />
        ))}

        {/* Photos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Camera size={14} /> รูปแนบ ({photos.length}) <span className="font-normal text-slate-400">· ไม่จำกัดจำนวน</span></label>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-xs font-bold text-indigo-600 flex items-center gap-1">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} เพิ่มรูป
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt="" className="w-full h-28 object-cover rounded-lg border" /></a>
                  <button onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow"><X size={12} /></button>
                  <input value={p.caption ?? ""} onChange={e => setPhotos(ph => ph.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))}
                    placeholder="คำอธิบายรูป..." className="mt-1 w-full text-[11px] border rounded-md px-2 py-1" />
                </div>
              ))}
            </div>
          )}
          {uploading && <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> กำลังบีบอัด & อัปโหลด...</div>}
        </div>

        {/* Files (PDF/เอกสาร/วิดีโอ) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Paperclip size={14} /> ไฟล์แนบ ({files.length}) <span className="font-normal text-slate-400">· PDF/เอกสาร/วิดีโอ ≤100MB</span></label>
            <button onClick={() => docRef.current?.click()} disabled={uploadingFile}
              className="text-xs font-bold text-indigo-600 flex items-center gap-1">
              {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} แนบไฟล์
            </button>
          </div>
          <input ref={docRef} type="file" multiple className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,video/*,audio/*" onChange={e => onDocs(e.target.files)} />
          {files.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                  <FileIcon size={16} className="text-slate-400 shrink-0" />
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-slate-700 truncate hover:text-indigo-600">{f.name}</a>
                  {f.size ? <span className="text-[10px] text-slate-400 shrink-0">{fmtSize(f.size)}</span> : null}
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600 shrink-0"><Download size={14} /></a>
                  <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {uploadingFile && <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> กำลังอัปโหลด...</div>}
        </div>

        {/* GPS */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><MapPin size={14} /> ตำแหน่ง (GPS)</label>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={captureGps} disabled={gpsBusy}
              className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${gps ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
              {gpsBusy ? <Loader2 size={15} className="animate-spin" /> : gps ? <Check size={15} /> : <MapPin size={15} />}
              {gps ? "ระบุแล้ว" : "ระบุตำแหน่งปัจจุบัน"}
            </button>
            {gps && <span className="text-[11px] text-slate-500">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>}
          </div>
          <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="ชื่อสถานที่ (ไม่บังคับ)"
            className="mt-2 w-full text-sm border rounded-xl px-3 py-2" />
        </div>
      </div>

      {/* Actions — ส่ง / บันทึกร่าง (inline · ใช้ได้ทั้ง desktop และมือถือ) */}
      <div className="max-w-2xl mx-auto px-4 flex flex-col-reverse sm:flex-row gap-2.5">
        <button onClick={() => save("draft")} disabled={saving || savingDraft || !dealer}
          className="sm:flex-1 bg-white border border-slate-300 disabled:opacity-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition">
          {savingDraft ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} บันทึกร่าง
        </button>
        <button onClick={() => save("submitted")} disabled={saving || savingDraft || !dealer}
          className="sm:flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} ส่งเช็คลิสต์
        </button>
      </div>

      {pickDealer && <DealerPicker onPick={(d) => { setDealer(d); setPickDealer(false) }} onClose={() => setPickDealer(false)} />}
    </div>
  )
}

// ── Section renderer ─────────────────────────────────────────────
function SectionEditor({ section: s, data, set }: { section: any; data: any; set: (k: string, v: any) => void }) {
  if (s.type === "fields") return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 text-sm mb-3">{s.title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {s.fields.map((f: any) => (
          <div key={f.key}>
            <label className="text-[11px] text-slate-500">{f.label}</label>
            <input type={f.type === "number" ? "number" : "text"} value={data[f.key] ?? ""}
              onChange={e => set(f.key, e.target.value)} className="mt-1 w-full text-sm border rounded-lg px-2.5 py-1.5" />
          </div>
        ))}
      </div>
    </div>
  )
  if (s.type === "textlist") return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 text-sm mb-3">{s.title}</h3>
      <div className="space-y-2">
        {(data[s.key] ?? []).map((v: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-4">{i + 1}</span>
            <input value={v} onChange={e => { const a = [...data[s.key]]; a[i] = e.target.value; set(s.key, a) }}
              className="flex-1 text-sm border rounded-lg px-2.5 py-1.5" />
          </div>
        ))}
      </div>
    </div>
  )
  if (s.type === "table") return <TableEditor section={s} rows={data[s.key] ?? []} onChange={v => set(s.key, v)} />
  if (s.type === "checkboxes") {
    const val = data[s.key] ?? { selected: [], other: "" }
    const toggle = (opt: string) => {
      const sel = val.selected.includes(opt) ? val.selected.filter((x: string) => x !== opt) : [...val.selected, opt]
      set(s.key, { ...val, selected: sel })
    }
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-slate-700 text-sm mb-3">{s.title}</h3>
        <div className="flex flex-wrap gap-2">
          {s.options.map((opt: string) => (
            <button key={opt} onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${val.selected.includes(opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>
              {val.selected.includes(opt) && "✓ "}{opt}
            </button>
          ))}
        </div>
        {s.allowOther && (
          <input value={val.other} onChange={e => set(s.key, { ...val, other: e.target.value })}
            placeholder="อื่นๆ..." className="mt-3 w-full text-sm border rounded-lg px-2.5 py-1.5" />
        )}
      </div>
    )
  }
  if (s.type === "textarea") return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 text-sm mb-2">{s.title}</h3>
      <textarea value={data[s.key] ?? ""} onChange={e => set(s.key, e.target.value)} rows={4}
        className="w-full text-sm border rounded-lg px-3 py-2" />
    </div>
  )
  return null
}

function TableEditor({ section: s, rows, onChange }: { section: any; rows: any[]; onChange: (v: any[]) => void }) {
  const addRow = () => { const r: any = {}; for (const c of s.columns) r[c.key] = ""; onChange([...rows, r]) }
  const upd = (i: number, k: string, v: any) => { const a = rows.map((r, j) => j === i ? { ...r, [k]: v } : r); onChange(a) }
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i))
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-700 text-sm">{s.title}</h3>
        <button onClick={addRow} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus size={14} /> เพิ่มแถว</button>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-100 p-2.5 bg-slate-50/50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-bold text-slate-400">#{i + 1}</span>
              <button onClick={() => del(i)} className="text-red-400"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {s.columns.map((c: any) => (
                <div key={c.key}>
                  <label className="text-[10px] text-slate-400">{c.label}</label>
                  <input type={c.type === "number" ? "number" : "text"} value={r[c.key] ?? ""}
                    onChange={e => upd(i, c.key, e.target.value)} className="w-full text-sm border rounded-lg px-2 py-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center text-xs text-slate-400 py-3">ยังไม่มีข้อมูล กด "เพิ่มแถว"</div>}
      </div>
    </div>
  )
}

// ── Dealer picker (ค้นหา + เลือกจากทะเบียน) ──────────────────────
function DealerPicker({ onPick, onClose }: { onPick: (d: Dealer) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [list, setList] = useState<Dealer[]>([])
  const [firstLoad, setFirstLoad] = useState(true)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [nn, setNn] = useState({ name: "", store_type: "", zone: "", area: "", contact_name: "", contact_phone: "", is_new: false })
  useEffect(() => {
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/branch-eval/store-checklist/dealers?q=${encodeURIComponent(q)}`).then(r => r.json())
        .then(res => setList(res.dealers ?? [])).finally(() => { setSearching(false); setFirstLoad(false) })
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  const create = async () => {
    if (!nn.name.trim()) { alert("กรุณาระบุชื่อร้าน"); return }
    const res = await fetch("/api/branch-eval/store-checklist/dealers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nn),
    }).then(r => r.json())
    if (res.dealer) onPick(res.dealer); else alert(res.error || "เพิ่มร้านไม่สำเร็จ")
  }
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-2">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาร้าน / เขต / ผู้ติดต่อ"
            className="flex-1 text-sm outline-none min-w-0" />
          {searching ? <Loader2 size={16} className="animate-spin text-slate-300 shrink-0" /> : q ? <button onClick={() => setQ("")} className="text-slate-300 shrink-0"><X size={16} /></button> : null}
          <button onClick={onClose} className="shrink-0 pl-1"><X size={18} className="text-slate-400" /></button>
        </div>
        {adding ? (
          <div className="p-4 space-y-2 overflow-y-auto">
            <input value={nn.name} onChange={e => setNn({ ...nn, name: e.target.value })} placeholder="ชื่อร้าน *" className="w-full text-sm border rounded-lg px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input value={nn.store_type} onChange={e => setNn({ ...nn, store_type: e.target.value })} placeholder="ประเภทร้าน" className="text-sm border rounded-lg px-3 py-2" />
              <input value={nn.zone} onChange={e => setNn({ ...nn, zone: e.target.value })} placeholder="เขต" className="text-sm border rounded-lg px-3 py-2" />
              <input value={nn.area} onChange={e => setNn({ ...nn, area: e.target.value })} placeholder="พื้นที่" className="text-sm border rounded-lg px-3 py-2" />
              <input value={nn.contact_name} onChange={e => setNn({ ...nn, contact_name: e.target.value })} placeholder="ผู้ติดต่อ" className="text-sm border rounded-lg px-3 py-2" />
              <input value={nn.contact_phone} onChange={e => setNn({ ...nn, contact_phone: e.target.value })} placeholder="เบอร์โทร" className="text-sm border rounded-lg px-3 py-2" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={nn.is_new} onChange={e => setNn({ ...nn, is_new: e.target.checked })} /> ร้านใหม่</label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAdding(false)} className="flex-1 py-2 text-sm rounded-lg border">ยกเลิก</button>
              <button onClick={create} className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 text-white font-bold">เพิ่ม & เลือก</button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {firstLoad ? [1, 2, 3].map(i => (
              <div key={i} className="px-4 py-3 border-b flex flex-col gap-2"><div className="h-3.5 bg-slate-100 rounded animate-pulse w-1/2" /><div className="h-2.5 bg-slate-50 rounded animate-pulse w-2/3" /></div>
            )) : (
              <>
                {list.map(d => (
                  <button key={d.id} onClick={() => onPick(d)} className="w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition">
                    <div className="font-bold text-sm text-slate-800">{d.name}
                      {d.is_new && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">ใหม่</span>}</div>
                    <div className="text-xs text-slate-500">{[d.store_type, d.zone, d.area].filter(Boolean).join(" · ") || "—"}</div>
                  </button>
                ))}
                {list.length === 0 && <div className="p-6 text-center text-sm text-slate-400">ไม่พบร้าน — เพิ่มใหม่ด้านล่าง</div>}
              </>
            )}
            <button onClick={() => { setNn(n => ({ ...n, name: q })); setAdding(true) }}
              className="w-full px-4 py-3 text-sm text-indigo-600 font-bold flex items-center gap-2 border-t sticky bottom-0 bg-white"><Plus size={16} /> เพิ่มร้านใหม่{q ? ` "${q}"` : ""}</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewChecklistPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>}><NewChecklistInner /></Suspense>
}
