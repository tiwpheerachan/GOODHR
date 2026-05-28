"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Plus, Edit2, Trash2, Pin, Send, X, Loader2, Megaphone, ImagePlus, MessageCircle,
  Check, Clock as ClockIcon, Users,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "ต่ำ",     color: "text-slate-500",  bg: "bg-slate-100" },
  normal: { label: "ปกติ",    color: "text-blue-700",   bg: "bg-blue-100" },
  high:   { label: "สำคัญ",   color: "text-amber-700",  bg: "bg-amber-100" },
  urgent: { label: "ด่วนมาก", color: "text-red-700",    bg: "bg-red-100" },
}

const REACTION_EMOJI: Record<string, string> = { like: "👍", love: "❤️", laugh: "😂", wow: "😮", sad: "😢" }

export default function AdminAnnouncementsPage() {
  const supabase = createClient()
  const [anns, setAnns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [ackModal, setAckModal] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: "", body: "", company_id: "", department_id: "",
    priority: "normal", is_pinned: false, expires_at: "",
    image_urls: [] as string[],
  })

  useEffect(() => {
    supabase.from("companies").select("id,code").eq("is_active", true).order("code").then(({ data }) => setCompanies(data ?? []))
    supabase.from("departments").select("id,name").order("name").then(({ data }) => setDepartments(data ?? []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/announcements?mode=admin")
    const data = await res.json()
    setAnns(data.announcements ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ title: "", body: "", company_id: "", department_id: "", priority: "normal", is_pinned: false, expires_at: "", image_urls: [] })
    setEditItem(null); setModal(true)
  }

  const openEdit = (a: any) => {
    // Support both old image_url and new image_urls
    const urls: string[] = (a.image_urls && a.image_urls.length > 0)
      ? a.image_urls
      : a.image_url ? [a.image_url] : []
    setForm({
      title: a.title, body: a.body || "", company_id: a.company_id || "",
      department_id: a.department_id || "", priority: a.priority || "normal",
      is_pinned: a.is_pinned || false, expires_at: a.expires_at ? a.expires_at.split("T")[0] : "",
      image_urls: urls,
    })
    setEditItem(a); setModal(true)
  }

  const uploadImages = async (fileList: FileList) => {
    if (form.image_urls.length + fileList.length > 10) {
      toast.error("สูงสุด 10 รูป")
      return
    }
    setUploading(true)
    const fd = new FormData()
    for (let i = 0; i < fileList.length; i++) {
      fd.append("files", fileList[i])
    }
    try {
      const res = await fetch("/api/announcements/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.urls && data.urls.length > 0) {
        setForm(f => ({ ...f, image_urls: [...f.image_urls, ...data.urls] }))
        toast.success(`อัปโหลด ${data.urls.length} รูปแล้ว`)
      } else {
        toast.error(data.error || "อัปโหลดไม่สำเร็จ")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด")
    }
    setUploading(false)
  }

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }))
  }

  const save = async () => {
    if (!form.title) { toast.error("กรุณากรอกหัวข้อ"); return }
    setSaving(true)
    const payload: any = {
      action: editItem ? "update" : "create",
      title: form.title, body: form.body,
      company_id: form.company_id || null, department_id: form.department_id || null,
      priority: form.priority, is_pinned: form.is_pinned,
      expires_at: form.expires_at ? form.expires_at + "T23:59:59+07:00" : null,
      image_urls: form.image_urls,
      image_url: form.image_urls[0] || null,
    }
    if (editItem) payload.id = editItem.id
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json()
    setSaving(false)
    if (data.success) { toast.success(editItem ? "แก้ไขแล้ว" : "สร้างประกาศแล้ว"); setModal(false); load() }
    else toast.error(data.error)
  }

  const del = async (id: string) => {
    if (!confirm("ลบประกาศนี้?")) return
    await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) })
    toast.success("ลบแล้ว"); load()
  }

  const safeFmt = (d: string) => { try { return format(new Date(d), "d MMM yy HH:mm", { locale: th }) } catch { return d } }

  // Get display images for an announcement (prefer image_urls, fallback to image_url)
  const getImages = (a: any): string[] => {
    if (a.image_urls && a.image_urls.length > 0) return a.image_urls
    if (a.image_url) return [a.image_url]
    return []
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Megaphone size={20} className="text-indigo-600"/> ประกาศ / ข่าวสาร</h2>
          <p className="text-xs text-slate-400">สร้างและจัดการประกาศ รองรับหลายรูปภาพ + Reaction</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          <Plus size={14}/> สร้างประกาศ
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400"/></div>
      : anns.length === 0 ? <div className="text-center py-20 text-slate-400"><Megaphone size={40} className="mx-auto mb-2 opacity-30"/><p>ยังไม่มีประกาศ</p></div>
      : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {anns.map(a => {
            const pc = PRIORITY_CFG[a.priority] || PRIORITY_CFG.normal
            const rc = a.reactions
            const images = getImages(a)
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors group">
                {/* Thumbnail */}
                {images.length > 0 ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 relative">
                    <img src={images[0]} alt="" className="w-full h-full object-cover"/>
                    {images.length > 1 && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">+{images.length - 1}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-14 h-14 rounded-xl ${pc.bg} flex items-center justify-center flex-shrink-0`}>
                    {a.is_pinned ? <Pin size={18} className={pc.color}/> : <Megaphone size={18} className={pc.color}/>}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.title}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.color} flex-shrink-0`}>{pc.label}</span>
                    {a.is_pinned && <Pin size={10} className="text-amber-500 flex-shrink-0"/>}
                    {a.company?.code && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">{a.company.code}</span>}
                    {!a.company_id && !a.department_id && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">ทุกคน</span>}
                  </div>
                  {a.body && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.body}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">{safeFmt(a.published_at)}</span>
                    {a.creator && <span className="text-[10px] text-slate-400">โดย {a.creator.nickname || a.creator.first_name_th}</span>}
                    {rc && rc.total > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                        {Object.entries(rc.counts as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => (
                          <span key={type} className="text-xs">{REACTION_EMOJI[type]}</span>
                        ))}
                        <span>{rc.total}</span>
                      </span>
                    )}
                    {a.comment_count > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <MessageCircle size={9}/> {a.comment_count}
                      </span>
                    )}
                    {images.length > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <ImagePlus size={9}/> {images.length}
                      </span>
                    )}
                    {/* ── รับทราบ badge ── */}
                    <button onClick={(e) => { e.stopPropagation(); setAckModal(a) }}
                      className={`text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full transition ${
                        a.ack_count > 0
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                      }`}>
                      <Check size={10} strokeWidth={3}/> รับทราบ {a.ack_count || 0}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(a)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500"><Edit2 size={14}/></button>
                  <button onClick={() => del(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800">{editItem ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}</h3>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">หัวข้อ *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="เช่น ประกาศวันหยุดสงกรานต์"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">เนื้อหา</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 h-28 resize-none" placeholder="รายละเอียดประกาศ..."/>
              </div>

              {/* Multi-image upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">รูปภาพ ({form.image_urls.length}/10)</label>

                {/* Image preview grid */}
                {form.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {form.image_urls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={url} alt="" className="w-full h-full object-cover"/>
                        <button onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                          <X size={12}/>
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {form.image_urls.length < 10 && (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                    {uploading ? <Loader2 size={24} className="animate-spin"/> : <ImagePlus size={24}/>}
                    <span className="text-xs font-bold">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเพิ่มรูปภาพ (เลือกได้หลายรูป)"}</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { if (e.target.files && e.target.files.length > 0) { uploadImages(e.target.files); e.target.value = "" } }}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">บริษัท</label>
                  <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="">ทุกบริษัท</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">แผนก</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="">ทุกแผนก</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">ความสำคัญ</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="low">ต่ำ</option><option value="normal">ปกติ</option>
                    <option value="high">สำคัญ</option><option value="urgent">ด่วนมาก</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">หมดอายุ</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600"/>
                <span className="text-sm font-bold text-slate-600">ปักหมุด</span>
              </label>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                {editItem ? "บันทึก" : "ประกาศ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledgement Modal */}
      {ackModal && <AckModal announcement={ackModal} onClose={() => setAckModal(null)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// AckModal — แสดงรายชื่อคนรับทราบ + คนที่ยังไม่รับทราบ
// ════════════════════════════════════════════════════════════════════
function AckModal({ announcement, onClose }: { announcement: any; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"acked" | "pending">("acked")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_acknowledgements", announcement_id: announcement.id }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [announcement.id])

  const list = data ? (tab === "acked" ? data.acknowledged : data.pending) : []
  const filtered = list.filter((p: any) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return `${p.name} ${p.nickname || ""} ${p.employee_code || ""} ${p.department || ""}`.toLowerCase().includes(s)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between">
          <div>
            <h3 className="font-black flex items-center gap-2"><Check size={18}/> รายชื่อผู้รับทราบ</h3>
            <p className="text-[11px] opacity-90 truncate max-w-[400px]">{announcement.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-emerald-400 mb-2"/>
            <p className="text-xs text-slate-500">กำลังโหลด...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-100 bg-slate-50">
              <div className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">ทั้งหมด</p>
                <p className="text-2xl font-black text-slate-800">{data?.stats?.total ?? 0}</p>
                <p className="text-[10px] text-slate-400">คน</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">รับทราบแล้ว</p>
                <p className="text-2xl font-black text-emerald-700">{data?.stats?.acknowledged ?? 0}</p>
                <p className="text-[10px] text-emerald-500">
                  {data?.stats?.total > 0 ? `${Math.round((data.stats.acknowledged/data.stats.total)*100)}%` : "0%"}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase">ยังไม่รับทราบ</p>
                <p className="text-2xl font-black text-amber-700">{data?.stats?.pending ?? 0}</p>
                <p className="text-[10px] text-amber-500">
                  {data?.stats?.total > 0 ? `${Math.round((data.stats.pending/data.stats.total)*100)}%` : "0%"}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button onClick={() => setTab("acked")}
                className={`flex-1 px-4 py-2.5 text-xs font-bold transition ${tab === "acked" ? "border-b-2 border-emerald-500 text-emerald-700" : "text-slate-500"}`}>
                ✓ รับทราบแล้ว ({data?.acknowledged?.length ?? 0})
              </button>
              <button onClick={() => setTab("pending")}
                className={`flex-1 px-4 py-2.5 text-xs font-bold transition ${tab === "pending" ? "border-b-2 border-amber-500 text-amber-700" : "text-slate-500"}`}>
                ⏳ ยังไม่รับทราบ ({data?.pending?.length ?? 0})
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-slate-100">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัส / แผนก..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-12 italic">
                  {tab === "acked" ? "ยังไม่มีใครรับทราบ" : "ทุกคนรับทราบแล้ว 🎉"}
                </p>
              ) : filtered.map((p: any) => (
                <div key={p.employee_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${tab === "acked" ? "bg-emerald-500" : "bg-slate-400"}`}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/> : (p.name?.[0] || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {p.name}
                      {p.nickname && <span className="text-slate-400 font-normal ml-1">({p.nickname})</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {p.employee_code}{p.department && ` · ${p.department}`}
                    </p>
                  </div>
                  {tab === "acked" && p.acknowledged_at && (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 flex-shrink-0">
                      <ClockIcon size={10}/>
                      {format(new Date(p.acknowledged_at), "d MMM HH:mm", { locale: th })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
