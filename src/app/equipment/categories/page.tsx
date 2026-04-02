"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { FolderOpen, Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react"
import toast from "react-hot-toast"

export default function EquipmentCategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/equipment/categories")
    const data = await res.json()
    setCategories(data.categories ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch("/api/equipment/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newName, description: newDesc }),
    })
    const data = await res.json()
    if (data.success) { toast.success("เพิ่มหมวดหมู่สำเร็จ"); setNewName(""); setNewDesc(""); setShowAdd(false); load() }
    else toast.error(data.error)
    setSaving(false)
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    const res = await fetch("/api/equipment/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, name: editName, description: editDesc }),
    })
    const data = await res.json()
    if (data.success) { toast.success("บันทึกสำเร็จ"); setEditId(null); load() }
    else toast.error(data.error)
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ปิดใช้งานหมวดหมู่ "${name}"?`)) return
    const res = await fetch("/api/equipment/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    })
    const data = await res.json()
    if (data.success) { toast.success("ปิดใช้งานแล้ว"); load() }
    else toast.error(data.error)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>

  const inp = "bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 w-full"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">หมวดหมู่อุปกรณ์</h1>
          <p className="text-sm text-slate-400">จัดการหมวดหมู่สำหรับจัดกลุ่มอุปกรณ์</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-cyan-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-cyan-700">
          <Plus size={14} /> เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-cyan-200 p-4 space-y-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ชื่อหมวดหมู่ เช่น IT, สำนักงาน" className={inp} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="คำอธิบาย (ไม่บังคับ)" className={inp} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newName.trim()}
              className="flex items-center gap-1 bg-cyan-600 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50">
              <Check size={14} /> บันทึก
            </button>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewDesc("") }}
              className="text-sm text-slate-500 px-3 py-2">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen size={32} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">ยังไม่มีหมวดหมู่</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {categories.map(cat => (
              <div key={cat.id} className="px-5 py-3.5 flex items-center gap-3">
                {editId === cat.id ? (
                  <div className="flex-1 space-y-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className={inp} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="คำอธิบาย" className={inp} />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(cat.id)} disabled={saving}
                        className="text-xs font-bold bg-cyan-600 text-white px-3 py-1.5 rounded-lg"><Check size={12} /></button>
                      <button onClick={() => setEditId(null)} className="text-xs text-slate-400 px-3 py-1.5"><X size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                      <FolderOpen size={16} className="text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${cat.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>{cat.name}</p>
                      {cat.description && <p className="text-xs text-slate-400">{cat.description}</p>}
                    </div>
                    {!cat.is_active && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">ปิดใช้งาน</span>}
                    <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditDesc(cat.description || "") }}
                      className="text-slate-400 hover:text-cyan-600"><Pencil size={14} /></button>
                    {cat.is_active && (
                      <button onClick={() => handleDelete(cat.id, cat.name)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
