"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Package, Plus, Loader2, Search, Pencil, Check, X, Upload, Image } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

const inp = "bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 w-full"

export default function EquipmentItemsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  // Add/edit form
  const [form, setForm] = useState({ name: "", description: "", category_id: "", total_qty: "1", unit: "ชิ้น", image_url: "" })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    const [iRes, cRes] = await Promise.all([
      fetch("/api/equipment/items?mode=admin").then(r => r.json()),
      fetch("/api/equipment/categories").then(r => r.json()),
    ])
    setItems(iRes.items ?? [])
    setCategories((cRes.categories ?? []).filter((c: any) => c.is_active))
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const resetForm = () => setForm({ name: "", description: "", category_id: "", total_qty: "1", unit: "ชิ้น", image_url: "" })

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("ไฟล์ต้องไม่เกิน 5MB"); return }
    setUploading(true)
    const ext = file.name.split(".").pop()
    const path = `equipment/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("checkin-photos").upload(path, file, { upsert: true })
    if (error) { toast.error("อัพโหลดไม่สำเร็จ"); setUploading(false); return }
    const { data: urlData } = supabase.storage.from("checkin-photos").getPublicUrl(path)
    set("image_url", urlData.publicUrl)
    setUploading(false)
    toast.success("อัพโหลดรูปสำเร็จ")
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.category_id) { toast.error("กรุณากรอกชื่อและเลือกหมวดหมู่"); return }
    setSaving(true)
    const res = await fetch("/api/equipment/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form, total_qty: Number(form.total_qty) || 1, image_url: form.image_url || null }),
    })
    const data = await res.json()
    if (data.success) { toast.success("เพิ่มอุปกรณ์สำเร็จ"); resetForm(); setShowAdd(false); load() }
    else toast.error(data.error)
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editId) return
    setSaving(true)
    const res = await fetch("/api/equipment/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: editId, name: form.name, description: form.description, category_id: form.category_id, unit: form.unit, image_url: form.image_url || null }),
    })
    const data = await res.json()
    if (data.success) { toast.success("บันทึกสำเร็จ"); setEditId(null); resetForm(); load() }
    else toast.error(data.error)
    setSaving(false)
  }

  const handleAdjustStock = async (id: string, newTotal: number) => {
    const res = await fetch("/api/equipment/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust_stock", id, total_qty: newTotal }),
    })
    const data = await res.json()
    if (data.success) { toast.success("ปรับสต๊อกสำเร็จ"); load() }
    else toast.error(data.error)
  }

  const filtered = items.filter(i => {
    if (catFilter && i.category_id !== catFilter) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black text-slate-800">รายการอุปกรณ์</h1>
          <p className="text-sm text-slate-400">จัดการอุปกรณ์และสต๊อก · {items.length} รายการ</p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); setEditId(null) }}
          className="flex items-center gap-1.5 bg-cyan-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-cyan-700">
          <Plus size={14} /> เพิ่มอุปกรณ์
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">ทุกหมวดหมู่</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาอุปกรณ์..."
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none w-full" />
        </div>
      </div>

      {/* Add/Edit form */}
      {(showAdd || editId) && (
        <div className="bg-white rounded-2xl border border-cyan-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">{editId ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ชื่ออุปกรณ์ *" className={inp} />
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)} className={inp}>
              <option value="">— เลือกหมวดหมู่ —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="คำอธิบาย" className={inp} />
            <div className="flex gap-2">
              {!editId && <input type="number" min={1} value={form.total_qty} onChange={e => set("total_qty", e.target.value)} placeholder="จำนวน" className={`${inp} w-24`} />}
              <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="หน่วย" className={`${inp} w-24`} />
            </div>
          </div>
          {/* Image upload */}
          <div className="flex items-center gap-3">
            {form.image_url && (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 cursor-pointer hover:border-cyan-400 hover:text-cyan-600 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "กำลังอัพโหลด..." : form.image_url ? "เปลี่ยนรูป" : "อัพโหลดรูปอุปกรณ์"}
              <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
            </label>
            {form.image_url && (
              <button onClick={() => set("image_url", "")} className="text-xs text-red-400 hover:text-red-600">ลบรูป</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={editId ? handleUpdate : handleCreate} disabled={saving}
              className="flex items-center gap-1 bg-cyan-600 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50">
              <Check size={14} /> {editId ? "บันทึก" : "เพิ่ม"}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null); resetForm() }}
              className="text-sm text-slate-500 px-3 py-2">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package size={32} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">ยังไม่มีอุปกรณ์</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {["อุปกรณ์", "หมวดหมู่", "สต๊อก", "ว่าง", "หน่วย", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(item => {
                  const pct = item.total_qty > 0 ? (item.available_qty / item.total_qty) * 100 : 0
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                              <Package size={16} className="text-slate-300" />
                            </div>
                          )}
                          <div>
                            <p className={`font-bold ${item.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>{item.name}</p>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.category?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <input type="number" min={0} value={item.total_qty}
                          onChange={e => handleAdjustStock(item.id, Number(e.target.value))}
                          className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-black ${pct > 50 ? "text-emerald-600" : pct > 0 ? "text-amber-600" : "text-red-500"}`}>
                          {item.available_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.unit}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setEditId(item.id); setShowAdd(false); setForm({ name: item.name, description: item.description || "", category_id: item.category_id, total_qty: String(item.total_qty), unit: item.unit, image_url: item.image_url || "" }) }}
                          className="text-slate-400 hover:text-cyan-600"><Pencil size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
