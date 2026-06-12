"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  Plus, Trash2, Loader2, Tag, Save, Edit2, X, Check, Search,
  Power, PowerOff, Globe2, AlertCircle, ImageIcon, Upload, Link2,
} from "lucide-react"
import toast from "react-hot-toast"
import { invalidateBrandsCache } from "@/lib/hooks/useBrands"

interface BrandRow {
  id: string
  name: string
  slug?: string | null
  color_hex?: string | null
  logo_url?: string | null
  display_order?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ── Brand avatar — logo image with color fallback ──
function BrandAvatar({ brand, size = 32 }: { brand: { name: string; logo_url?: string | null; color_hex?: string | null }; size?: number }) {
  const [err, setErr] = useState(false)
  const showLogo = brand.logo_url && !err
  return (
    <div className="rounded-xl shadow-sm flex items-center justify-center overflow-hidden shrink-0 bg-white border border-slate-100"
      style={{ width: size, height: size, backgroundColor: showLogo ? "white" : (brand.color_hex || "#94a3b8") }}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo_url!} alt={brand.name} className="w-full h-full object-contain p-0.5"
          onError={() => setErr(true)}/>
      ) : (
        <span className="text-[10px] font-black text-white">{brand.name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}

const PALETTE = [
  "#0ea5e9","#6366f1","#a855f7","#ec4899","#f43f5e",
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16",
  "#10b981","#14b8a6","#06b6d4","#3b82f6","#8b5cf6",
  "#d946ef","#64748b",
]

export default function BrandsSettingsTab() {
  const [brands, setBrands]   = useState<BrandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/brands?include_inactive=1`)
    const d = await res.json()
    setBrands(d.brands ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = brands
    .filter(b => showInactive || b.is_active)
    .filter(b => !q || b.name.toLowerCase().includes(q.toLowerCase()))

  const activeCount   = brands.filter(b => b.is_active).length
  const inactiveCount = brands.filter(b => !b.is_active).length

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Tag size={20} className="text-white"/>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-800">แบรนด์ที่ใช้ในระบบ</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">ทั่วโลก</span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            จัดการรายชื่อแบรนด์สำหรับใช้ในหน้าพนักงาน / เงินเดือน / Dashboard — รวมทุกบริษัท
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
          <Plus size={14}/> เพิ่มแบรนด์
        </button>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="แบรนด์ใช้งาน" value={activeCount} icon={Check} color="emerald"/>
        <StatCard label="ปิดใช้งาน"    value={inactiveCount} icon={PowerOff} color="slate"/>
        <StatCard label="รวมทั้งหมด"   value={brands.length} icon={Globe2} color="indigo"/>
      </div>

      {/* ── Search + filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ค้นแบรนด์..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/>
        </div>
        <button onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            showInactive
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}>
          <PowerOff size={11}/> {showInactive ? "ซ่อนที่ปิด" : "แสดงที่ปิด"} ({inactiveCount})
        </button>
      </div>

      {/* ── Brand list ── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300"/></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Tag size={28} className="mx-auto text-slate-200 mb-2"/>
            <p className="text-sm text-slate-400">ไม่พบแบรนด์</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((b, i) => (
              <BrandRow key={b.id} brand={b} index={i}
                isEditing={editing === b.id}
                onEdit={() => setEditing(b.id)}
                onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); load(); invalidateBrandsCache() }}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[11px] text-blue-700 flex items-start gap-2">
        <AlertCircle size={13} className="shrink-0 mt-0.5"/>
        <div>
          <p className="font-bold">หมายเหตุ:</p>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5 ml-1">
            <li>การ <b>ลบ</b> = ปิดใช้งาน (soft delete) — ข้อมูลพนักงานที่อ้างแบรนด์นี้จะยังอยู่</li>
            <li>การลบ <b>ถาวร</b> ทำได้ต่อเมื่อไม่มีพนักงานใช้แบรนด์นั้นเลย</li>
            <li>เพิ่มแบรนด์ใหม่ → จะปรากฏในหน้าพนักงาน, BrandsTab, และ Dashboard ทันที</li>
          </ul>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddBrandModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); invalidateBrandsCache() }}/>
      )}
    </div>
  )
}

// ── Single row ─────────────────────────────────────────────────────
function BrandRow({ brand, index, isEditing, onEdit, onCancel, onSaved, onChanged }: {
  brand: BrandRow
  index: number
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSaved: () => void
  onChanged: () => void
}) {
  const [name, setName]   = useState(brand.name)
  const [color, setColor] = useState(brand.color_hex || "")
  const [logoUrl, setLogoUrl] = useState(brand.logo_url || "")
  const [order, setOrder] = useState(brand.display_order ?? 100)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(brand.name)
    setColor(brand.color_hex || "")
    setLogoUrl(brand.logo_url || "")
    setOrder(brand.display_order ?? 100)
  }, [brand.id])

  const uploadLogo = async (file: File) => {
    setUploading(true)
    const t = toast.loading("อัปโหลด...")
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("brand_id", brand.id)
      const res = await fetch("/api/brands/upload-logo", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "อัปโหลดไม่สำเร็จ", { id: t }); return }
      setLogoUrl(d.url)
      toast.success("อัปโหลดแล้ว", { id: t })
    } finally { setUploading(false) }
  }

  const save = async () => {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อ")
    setSaving(true)
    const res = await fetch("/api/brands", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: brand.id, name: name.trim(),
        color_hex: color || null, logo_url: logoUrl || null,
        display_order: Number(order) || 100,
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) return toast.error(d.error || "ไม่สำเร็จ")
    toast.success(`แก้ไข "${name}" แล้ว`)
    onSaved()
  }

  const toggleActive = async () => {
    const res = await fetch("/api/brands", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: brand.id, is_active: !brand.is_active }),
    })
    const d = await res.json()
    if (!res.ok) return toast.error(d.error || "ไม่สำเร็จ")
    toast.success(brand.is_active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว")
    onChanged()
  }

  const remove = async () => {
    if (!confirm(`ลบแบรนด์ "${brand.name}"? (ระบบจะปิดใช้งาน — ข้อมูลพนักงานที่อ้างถึงยังคงอยู่)`)) return
    setDeleting(true)
    const res = await fetch(`/api/brands?id=${brand.id}`, { method: "DELETE" })
    const d = await res.json()
    setDeleting(false)
    if (!res.ok) return toast.error(d.error || "ลบไม่สำเร็จ")
    toast.success("ปิดใช้งานแบรนด์แล้ว")
    onChanged()
  }

  const removeHard = async () => {
    if (!confirm(`ลบแบรนด์ "${brand.name}" ถาวร? (ใช้ได้ต่อเมื่อไม่มีพนักงานใช้แบรนด์นี้)`)) return
    setDeleting(true)
    const res = await fetch(`/api/brands?id=${brand.id}&hard=1`, { method: "DELETE" })
    const d = await res.json()
    setDeleting(false)
    if (!res.ok) return toast.error(d.error || "ลบไม่สำเร็จ")
    toast.success("ลบแบรนด์ถาวรแล้ว")
    onChanged()
  }

  if (isEditing) {
    const previewBrand = { name: name || brand.name, logo_url: logoUrl, color_hex: color }
    return (
      <div className="bg-indigo-50/40 border-l-4 border-indigo-500 px-4 py-4 space-y-3">
        {/* Logo block */}
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
          <BrandAvatar brand={previewBrand} size={48}/>
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              <input type="file" ref={fileRef} accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}/>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[11px] font-bold disabled:opacity-50">
                {uploading ? <Loader2 size={11} className="animate-spin"/> : <Upload size={11}/>}
                อัปโหลด
              </button>
              {logoUrl && (
                <button onClick={() => setLogoUrl("")}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-bold">
                  <X size={11}/> ลบ
                </button>
              )}
            </div>
            <div className="relative">
              <Link2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="หรือวาง URL รูป..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[11px] outline-none focus:border-indigo-400"/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-6">
            <label className="text-[10px] font-bold text-slate-500 uppercase">ชื่อแบรนด์</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-0.5 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"/>
          </div>
          <div className="col-span-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase">ลำดับ</label>
            <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))}
              className="w-full mt-0.5 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"/>
          </div>
          <div className="col-span-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase">สี fallback</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input type="color" value={color || "#6366f1"} onChange={e => setColor(e.target.value)}
                className="w-9 h-9 border border-slate-200 rounded-lg cursor-pointer"/>
              <input value={color} onChange={e => setColor(e.target.value)}
                placeholder="#6366f1"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono outline-none focus:border-indigo-400"/>
            </div>
          </div>
        </div>
        <ColorPalette value={color} onChange={setColor}/>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin"/> : <Save size={11}/>} บันทึก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!brand.is_active ? "opacity-50" : ""}`}>
      <BrandAvatar brand={brand} size={36}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800 truncate">{brand.name}</p>
          {brand.logo_url && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
              <ImageIcon size={8}/> โลโก้
            </span>
          )}
          {!brand.is_active && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">ปิด</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-mono truncate">
          {brand.slug || "—"}{brand.color_hex && ` · ${brand.color_hex}`} · #{brand.display_order ?? 100}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} title="แก้ไข"
          className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors">
          <Edit2 size={13}/>
        </button>
        <button onClick={toggleActive} title={brand.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
          className={`p-2 rounded-lg transition-colors ${brand.is_active ? "hover:bg-amber-50 text-amber-600" : "hover:bg-emerald-50 text-emerald-600"}`}>
          {brand.is_active ? <PowerOff size={13}/> : <Power size={13}/>}
        </button>
        {!brand.is_active && (
          <button onClick={removeHard} disabled={deleting} title="ลบถาวร"
            className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors disabled:opacity-50">
            {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
          </button>
        )}
        {brand.is_active && (
          <button onClick={remove} disabled={deleting} title="ปิดใช้งาน"
            className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors disabled:opacity-50">
            {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Color palette picker ──
function ColorPalette({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PALETTE.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          title={c}
          className={`w-7 h-7 rounded-lg shadow-sm border-2 transition-all ${
            value?.toLowerCase() === c.toLowerCase() ? "border-slate-800 ring-2 ring-indigo-300 scale-110" : "border-white"
          }`}
          style={{ backgroundColor: c }}/>
      ))}
      {value && (
        <button type="button" onClick={() => onChange("")}
          className="w-7 h-7 rounded-lg border-2 border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center"
          title="ล้างสี">
          <X size={11}/>
        </button>
      )}
    </div>
  )
}

// ── Add modal ──
function AddBrandModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName]   = useState("")
  const [color, setColor] = useState("#6366f1")
  const [logoUrl, setLogoUrl] = useState("")
  const [order, setOrder] = useState(100)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadLogo = async (file: File) => {
    setUploading(true)
    const t = toast.loading("อัปโหลด...")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/brands/upload-logo", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "อัปโหลดไม่สำเร็จ", { id: t }); return }
      setLogoUrl(d.url)
      toast.success("อัปโหลดแล้ว", { id: t })
    } finally { setUploading(false) }
  }

  const submit = async () => {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อแบรนด์")
    setSaving(true)
    const res = await fetch("/api/brands", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        color_hex: color, logo_url: logoUrl || null,
        display_order: Number(order) || 100,
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) return toast.error(d.error || "ไม่สำเร็จ")
    toast.success(`เพิ่ม "${name}" แล้ว`)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Tag size={16}/>
            <h3 className="font-black text-sm">เพิ่มแบรนด์ใหม่</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X size={14}/>
          </button>
        </div>
        {/* Form */}
        <div className="p-5 space-y-4">
          {/* preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <BrandAvatar brand={{ name: name || "??", logo_url: logoUrl, color_hex: color }} size={44}/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{name || "ชื่อแบรนด์"}</p>
              <p className="text-[10px] text-slate-400">ตัวอย่างการแสดงผล {logoUrl && "(ใช้โลโก้)"}</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ชื่อแบรนด์</label>
            <input value={name} onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="เช่น Anker, Dreame"
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10"/>
          </div>

          {/* Logo */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">โลโก้แบรนด์ <span className="text-slate-400 normal-case font-normal">(ไม่บังคับ)</span></label>
            <div className="mt-1 flex gap-1.5">
              <input type="file" ref={fileRef} accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}/>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold disabled:opacity-50">
                {uploading ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
                อัปโหลด
              </button>
              {logoUrl && (
                <button onClick={() => setLogoUrl("")}
                  className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold">
                  <X size={11}/> ลบ
                </button>
              )}
            </div>
            <div className="relative mt-1.5">
              <Link2 size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="หรือวาง URL โลโก้ (รูปจากเว็บ)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs outline-none focus:border-indigo-400"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ลำดับการแสดง</label>
              <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))}
                placeholder="100"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">สี chip</label>
              <div className="flex items-center gap-1 mt-1">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 border border-slate-200 rounded-xl cursor-pointer"/>
                <input value={color} onChange={e => setColor(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-mono outline-none focus:border-indigo-400"/>
              </div>
            </div>
          </div>

          <ColorPalette value={color} onChange={setColor}/>
        </div>
        {/* Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-white">ยกเลิก</button>
          <button onClick={submit} disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>} เพิ่มแบรนด์
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: "emerald" | "slate" | "indigo" }) {
  const c = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-500" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   icon: "bg-slate-400" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  icon: "bg-indigo-500" },
  }[color]
  return (
    <div className={`${c.bg} border border-slate-100 rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
        <Icon size={15} className="text-white"/>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-black ${c.text}`}>{value}</p>
      </div>
    </div>
  )
}
