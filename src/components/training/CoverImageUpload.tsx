"use client"
import { useRef, useState } from "react"
import { Image as ImageIcon, Upload, X, Loader2, Crop } from "lucide-react"
import toast from "react-hot-toast"
import { uploadTrainingFile } from "@/lib/training/upload"

export default function CoverImageUpload({
  value,
  onChange,
  aspectRatio = "16:9",
  label = "ภาพปก",
  height = "h-48",
}: {
  value?: string | null
  onChange: (url: string | null) => void
  aspectRatio?: "16:9" | "1:1" | "4:3"
  label?: string
  height?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("เฉพาะรูปภาพเท่านั้น"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกิน 10 MB"); return }
    setUploading(true)
    const t = toast.loading("กำลังอัปโหลด...")
    try {
      const result = await uploadTrainingFile(file, { subfolder: "covers" })
      onChange(result.url)
      toast.success("อัปโหลดสำเร็จ", { id: t })
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  if (value) {
    return (
      <div className={`relative group ${height} rounded-2xl overflow-hidden border-2 border-slate-200 anim-fade-up`}>
        <img src={value} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow text-slate-700">
            <Upload size={14} />
          </button>
          <button onClick={() => onChange(null)}
            className="p-2 bg-rose-500/90 hover:bg-rose-500 rounded-lg shadow text-white">
            <X size={14} />
          </button>
        </div>
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-black text-white bg-black/40 backdrop-blur px-2 py-1 rounded-full">
            {label}
          </span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative ${height} rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all anim-fade-up ${
        dragOver
          ? "border-sky-400 bg-sky-50 scale-[1.01]"
          : uploading
            ? "border-sky-300 bg-sky-50"
            : "border-slate-300 hover:border-sky-300 hover:bg-sky-50/30"
      }`}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {uploading ? (
        <>
          <Loader2 size={28} className="text-sky-500 animate-spin" />
          <p className="text-sm font-bold text-sky-700">กำลังอัปโหลด...</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-2xl flex items-center justify-center anim-float">
            <ImageIcon size={24} className="text-sky-600" />
          </div>
          <p className="text-sm font-black text-slate-700">{label}</p>
          <p className="text-[11px] text-slate-400">คลิกหรือลากรูปมาวาง · {aspectRatio} · สูงสุด 10 MB</p>
        </>
      )}
    </label>
  )
}
