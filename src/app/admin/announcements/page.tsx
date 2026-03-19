"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Plus, Edit2, Trash2, Pin, Send, X, Loader2, Megaphone, ImagePlus, Heart, Eye,
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
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: "", body: "", company_id: "", department_id: "",
    priority: "normal", is_pinned: false, expires_at: "", image_url: "",
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
    setForm({ title: "", body: "", company_id: "", department_id: "", priority: "normal", is_pinned: false, expires_at: "", image_url: "" })
    setEditItem(null); setModal(true)
  }

  const openEdit = (a: any) => {
    setForm({
      title: a.title, body: a.body || "", company_id: a.company_id || "",
      department_id: a.department_id || "", priority: a.priority || "normal",
      is_pinned: a.is_pinned || false, expires_at: a.expires_at ? a.expires_at.split("T")[0] : "",
      image_url: a.image_url || "",
    })
    setEditItem(a); setModal(true)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/announcements/upload", { method: "POST", body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      setForm(f => ({ ...f, image_url: data.url }))
      toast.success("อัปโหลดรูปแล้ว")
    } else toast.error(data.error || "อัปโหลดไม่สำเร็จ")
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
      image_url: form.image_url || null,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Megaphone size={20} className="text-indigo-600"/> ประกาศ / ข่าวสาร</h2>
          <p className="text-xs text-slate-400">สร้างและจัดการประกาศ รองรับรูปภาพ + Reaction</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          <Plus size={14}/> สร้างประกาศ
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400"/></div>
      : anns.length === 0 ? <div className="text-center py-20 text-slate-400"><Megaphone size={40} className="mx-auto mb-2 opacity-30"/><p>ยังไม่มีประกาศ</p></div>
      : (
        <div className="space-y-4">
          {anns.map(a => {
            const pc = PRIORITY_CFG[a.priority] || PRIORITY_CFG.normal
            const rc = a.reactions
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Image */}
                {a.image_url && (
                  <div className="w-full max-h-64 overflow-hidden">
                    <img src={a.image_url} alt="" className="w-full h-full object-cover"/>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${pc.bg} flex items-center justify-center flex-shrink-0`}>
                      {a.is_pinned ? <Pin size={16} className={pc.color}/> : <Megaphone size={16} className={pc.color}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-800">{a.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>{pc.label}</span>
                        {a.is_pinned && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">ปักหมุด</span>}
                        {a.company?.code && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.company.code}</span>}
                        {!a.company_id && !a.department_id && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">ทุกคน</span>}
                      </div>
                      {a.body && <p className="text-sm text-slate-500 mt-1 line-clamp-3">{a.body}</p>}

                      {/* Reactions summary */}
                      {rc && rc.total > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {Object.entries(rc.counts as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <span key={type} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">
                              {REACTION_EMOJI[type]} {count}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 ml-1">{rc.total} คน</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>{safeFmt(a.published_at)}</span>
                        {a.creator && <span>โดย {a.creator.first_name_th}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(a)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500"><Edit2 size={13}/></button>
                      <button onClick={() => del(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13}/></button>
                    </div>
                  </div>
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

              {/* Image upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">รูปภาพ</label>
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={form.image_url} alt="" className="w-full max-h-48 object-cover"/>
                    <button onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"><X size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                    {uploading ? <Loader2 size={24} className="animate-spin"/> : <ImagePlus size={24}/>}
                    <span className="text-xs font-bold">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเพิ่มรูปภาพ"}</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]) }}/>
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
    </div>
  )
}
