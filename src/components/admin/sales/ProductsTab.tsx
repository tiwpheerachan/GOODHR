"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import {
  Package, Search, Plus, Edit2, Trash2, Upload, X, Check, AlertCircle,
  Loader2, Tag, FileText, Image as ImageIcon, ScanLine, Hash, Eye, EyeOff,
} from "lucide-react"
import toast from "react-hot-toast"

// ════════════════════════════════════════════════════════════════════
// ProductsTab — CRUD + XLSX import + image upload (ใช้เป็น tab ใน /admin/sales)
// ════════════════════════════════════════════════════════════════════
export default function ProductsTab({ hideHeader = true }: { hideHeader?: boolean } = {}) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<any>(null)  // null = closed, {} = new, {...} = edit
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (showInactive) params.set("include_inactive", "1")
      params.set("limit", "500")
      const res = await fetch(`/api/products?${params}`)
      const d = await res.json()
      if (res.ok) setProducts(d.products ?? [])
      else toast.error(d.error || "โหลดไม่สำเร็จ")
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, showInactive])

  // ── stats ──
  const stats = useMemo(() => {
    const active = products.filter(p => p.is_active)
    const brands = new Set(products.map(p => p.brand).filter(Boolean))
    const categories = new Set(products.map(p => p.category).filter(Boolean))
    return {
      total: products.length,
      active: active.length,
      brands: brands.size,
      categories: categories.size,
    }
  }, [products])

  // ── group by brand ──
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const p of products) {
      const k = p.brand || "(no brand)"
      if (!g[k]) g[k] = []
      g[k].push(p)
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }, [products])

  // ── delete ──
  const onDelete = async (p: any) => {
    if (!confirm(`ลบสินค้า "${p.name}"?`)) return
    const res = await fetch(`/api/products?id=${p.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("ลบแล้ว"); load() }
    else { const d = await res.json(); toast.error(d.error || "ลบไม่สำเร็จ") }
  }

  // ── import XLSX ──
  const onPickFile = async (file: File) => {
    if (!file) return
    toast.loading("กำลังอ่านไฟล์...", { id: "imp" })
    try {
      const XLSX = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const rows: any[] = []
      // ลองอ่านทุก sheet
      for (const sname of wb.SheetNames) {
        const ws = wb.Sheets[sname]
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: null })
        for (const r of data) {
          // map common column names (flexible)
          const barcode = String(r.barcode ?? r.Barcode ?? r["Product Code (EAN)"] ?? r["EAN"] ?? r["Product Code"] ?? r.code ?? "").replace(/\D/g, "")
          const name = r.name ?? r.Name ?? r["Product Name"] ?? r.product_name ?? r["ชื่อ"] ?? r["ชื่อสินค้า"] ?? r["Model"] ?? null
          if (!barcode || barcode.length < 6 || !name) continue
          rows.push({
            barcode,
            name: String(name).replace(/\s+/g, " ").trim(),
            brand: r.brand ?? r.Brand ?? null,
            model: r.model ?? r.Model ?? null,
            color: r.color ?? r.Color ?? r["Color"] ?? null,
            category: r.category ?? r.Category ?? null,
            default_price: r.price ?? r.default_price ?? r["Price"] ?? r["ราคา"] ?? null,
            warranty: r.warranty ?? r.Warranty ?? null,
            description: r.description ?? r.Description ?? null,
          })
        }
      }
      toast.dismiss("imp")
      if (rows.length === 0) {
        toast.error("ไม่พบข้อมูลที่ใช้ได้ — ต้องมี barcode + name")
        return
      }
      setImportPreview(rows)
    } catch (e: any) {
      toast.dismiss("imp")
      toast.error("อ่านไฟล์ไม่ได้: " + (e?.message || ""))
    }
  }

  const onConfirmImport = async () => {
    if (!importPreview) return
    setImporting(true)
    try {
      const res = await fetch("/api/products/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importPreview }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "import ล้มเหลว"); return }
      toast.success(`Import สำเร็จ ${d.inserted}/${d.valid} รายการ`)
      setImportPreview(null)
      await load()
    } finally { setImporting(false) }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      {!hideHeader && (
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Package size={22}/>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black">จัดการสินค้า</h1>
            <p className="text-[11px] opacity-90 mt-0.5">ฐานข้อมูลสินค้าสำหรับ scan barcode</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "ทั้งหมด", value: stats.total },
            { label: "ใช้งาน", value: stats.active },
            { label: "แบรนด์", value: stats.brands },
            { label: "หมวด", value: stats.categories },
          ].map((s) => (
            <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
              <p className="text-[10px] uppercase opacity-80 font-bold">{s.label}</p>
              <p className="text-lg font-black leading-none mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
          <Search size={14} className="text-slate-400"/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ค้นชื่อ / barcode / model / brand..."
            className="flex-1 bg-transparent outline-none text-sm"/>
        </div>
        <button onClick={() => setShowInactive(!showInactive)}
          className={"px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border " + (showInactive ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
          {showInactive ? <Eye size={13}/> : <EyeOff size={13}/>}
          {showInactive ? "รวมที่ลบแล้ว" : "เฉพาะใช้งาน"}
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm">
          <Upload size={13}/> Import XLSX
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = "" }}/>
        <button onClick={() => setEditing({})}
          className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm">
          <Plus size={13}/> เพิ่มสินค้า
        </button>
      </div>

      {/* Product list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center text-sm text-slate-400">
            <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-400"/>
            กำลังโหลด...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center text-sm text-slate-400">
            <Package size={28} className="mx-auto mb-2 text-slate-300"/>
            ไม่มีสินค้า — กด <b>+ เพิ่มสินค้า</b> หรือ <b>Import XLSX</b>
          </div>
        ) : grouped.map(([brand, items]) => (
          <div key={brand} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Tag size={13} className="text-slate-400"/>
              <p className="font-black text-sm text-slate-700">{brand}</p>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-3">
              {items.map(p => (
                <ProductCard key={p.id} product={p}
                  onEdit={() => setEditing(p)}
                  onDelete={() => onDelete(p)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      {/* Import preview */}
      {importPreview && (
        <ImportPreviewModal
          rows={importPreview}
          onClose={() => setImportPreview(null)}
          onConfirm={onConfirmImport}
          importing={importing}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }: any) {
  const inactive = !product.is_active
  return (
    <div className={"border rounded-xl p-3 flex items-center gap-3 transition-all " + (inactive ? "bg-slate-50 opacity-60 border-slate-200" : "bg-white border-slate-100 hover:border-indigo-300 hover:shadow")}>
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url
          ? <img src={product.image_url} alt="" className="w-full h-full object-cover" loading="lazy"/>
          : <Package size={20} className="text-indigo-400"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm text-slate-800 truncate">{product.name}</p>
          {inactive && <span className="text-[8px] bg-rose-100 text-rose-700 font-black px-1.5 py-0.5 rounded-full">ลบแล้ว</span>}
        </div>
        <p className="text-[10px] text-slate-500 truncate">
          {product.model && <span className="font-mono">{product.model}</span>}
          {product.color && <span className="ml-1">· {product.color}</span>}
          {product.category && <span className="ml-1">· {product.category}</span>}
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5"><Hash size={9} className="inline"/>{product.barcode}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {product.default_price && (
          <p className="text-sm font-black text-emerald-700">฿{Number(product.default_price).toLocaleString()}</p>
        )}
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500" title="แก้ไข">
            <Edit2 size={12}/>
          </button>
          {!inactive && (
            <button onClick={onDelete} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400" title="ลบ">
              <Trash2 size={12}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
function ProductEditModal({ product, onClose, onSaved }: any) {
  const isNew = !product.id
  const [form, setForm] = useState({
    barcode: product.barcode || "",
    name: product.name || "",
    brand: product.brand || "",
    model: product.model || "",
    color: product.color || "",
    category: product.category || "",
    sku: product.sku || "",
    default_price: product.default_price ?? "",
    description: product.description || "",
    warranty: product.warranty || "",
    image_url: product.image_url || "",
    sn_required: !!product.sn_required,
    is_active: product.is_active !== false,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const onSave = async () => {
    if (!form.barcode.trim() || !form.name.trim()) {
      toast.error("ต้องระบุ barcode และชื่อ")
      return
    }
    setSaving(true)
    try {
      const payload: any = { ...form, id: product.id }
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      toast.success(isNew ? "เพิ่มสินค้าแล้ว" : "บันทึกแล้ว")
      onSaved()
    } finally { setSaving(false) }
  }

  const onUploadImage = async (file: File) => {
    if (!file) return
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("path", `${form.barcode || Date.now()}.${file.name.split(".").pop() || "jpg"}`)
      const res = await fetch("/api/products/upload-image", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "อัพโหลดไม่ได้"); return }
      update("image_url", d.url)
      toast.success("อัพโหลดรูปแล้ว")
    } finally { setUploadingImg(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2">
            {isNew ? <Plus size={16}/> : <Edit2 size={16}/>} {isNew ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}
          </p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Image */}
          <div className="md:col-span-2 flex items-center gap-3">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {form.image_url
                ? <img src={form.image_url} alt="" className="w-full h-full object-cover"/>
                : <ImageIcon size={24} className="text-indigo-300"/>}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase">รูปภาพ</p>
              <input value={form.image_url} onChange={e => update("image_url", e.target.value)}
                placeholder="ใส่ URL หรือกด upload →"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400"/>
              <button onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}
                className="text-[11px] px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1">
                {uploadingImg ? <Loader2 size={11} className="animate-spin"/> : <Upload size={11}/>}
                Upload รูป
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); e.target.value = "" }}/>
            </div>
          </div>

          <Field label="Barcode *" value={form.barcode} onChange={v => update("barcode", v)} mono required disabled={!isNew}/>
          <Field label="ชื่อสินค้า *" value={form.name} onChange={v => update("name", v)} required/>
          <Field label="Model" value={form.model} onChange={v => update("model", v)} mono/>
          <Field label="Color" value={form.color} onChange={v => update("color", v)}/>
          <Field label="Brand" value={form.brand} onChange={v => update("brand", v)}/>
          <Field label="Category" value={form.category} onChange={v => update("category", v)}/>
          <Field label="SKU" value={form.sku} onChange={v => update("sku", v)} mono/>
          <Field label="Warranty" value={form.warranty} onChange={v => update("warranty", v)} placeholder="เช่น 2 Years"/>
          <Field label="ราคา default" value={form.default_price} onChange={v => update("default_price", v)} type="number" placeholder="เว้นว่างถ้าไม่มี"/>
          <div className="flex items-center gap-2 mt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.sn_required} onChange={e => update("sn_required", e.target.checked)} className="w-4 h-4"/>
              ต้องระบุ SN ทุกครั้ง
            </label>
          </div>

          <label className="md:col-span-2 block">
            <span className="text-[10px] font-black text-slate-500 uppercase">รายละเอียด</span>
            <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2}
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"/>
          </label>

          {/* Specs (existing) */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="md:col-span-2 bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Specs (จาก import — แก้ไม่ได้ที่นี่)</p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {Object.entries(product.specs).map(([k, v]: any) => (
                  <p key={k}><span className="text-slate-400">{k}:</span> <b className="text-slate-700">{String(v).slice(0, 60)}</b></p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl">ยกเลิก</button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", mono, required, placeholder, disabled }: {
  label: string; value: any; onChange: (v: string) => void;
  type?: string; mono?: boolean; required?: boolean; placeholder?: string; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black text-slate-500 uppercase">{label}</span>
      <input type={type} value={value ?? ""} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className={"w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:cursor-not-allowed " + (mono ? "font-mono" : "")}/>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────
function ImportPreviewModal({ rows, onClose, onConfirm, importing }: any) {
  const [page, setPage] = useState(0)
  const PER = 30
  const total = rows.length
  const slice = rows.slice(page * PER, (page + 1) * PER)
  const totalPages = Math.ceil(total / PER)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><Upload size={16}/> ตรวจสอบก่อน Import ({total} รายการ)</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-slate-500">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Barcode</th>
                <th className="px-2 py-2">ชื่อ</th>
                <th className="px-2 py-2">Model</th>
                <th className="px-2 py-2">Color</th>
                <th className="px-2 py-2">Brand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slice.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-slate-400">{page * PER + i + 1}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px]">{r.barcode}</td>
                  <td className="px-2 py-1.5 font-bold truncate max-w-[200px]">{r.name}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-600">{r.model || "-"}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600">{r.color || "-"}</td>
                  <td className="px-2 py-1.5 text-[11px]">{r.brand || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 bg-slate-100 disabled:opacity-30 rounded">←</button>
              <span className="text-xs text-slate-500">หน้า {page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 bg-slate-100 disabled:opacity-30 rounded">→</button>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl">ยกเลิก</button>
          <button onClick={onConfirm} disabled={importing}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
            {importing ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
            ยืนยัน Import ({total} รายการ)
          </button>
        </div>
      </div>
    </div>
  )
}
