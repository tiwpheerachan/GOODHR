"use client"
import { useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Upload, X, CheckCircle2,
  Car, MapPin, FileText, Receipt, Send, Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

const TRANSPORT_TYPES = [
  { value: "taxi",         label: "แท็กซี่",       emoji: "🚕" },
  { value: "grab",         label: "Grab / Bolt",   emoji: "📱" },
  { value: "personal_car", label: "รถส่วนตัว",     emoji: "🚗" },
  { value: "motorcycle",   label: "มอเตอร์ไซค์",   emoji: "🏍️" },
  { value: "bus",          label: "รถเมล์ / รถตู้",  emoji: "🚌" },
  { value: "bts_mrt",      label: "BTS / MRT",     emoji: "🚇" },
  { value: "other",        label: "อื่นๆ",          emoji: "📦" },
]

export default function NewTransportClaimPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    claim_date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
    transport_type: "other",
    origin: "",
    destination: "",
  })
  const [receipt, setReceipt] = useState<{ file: File; preview: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)")
      return
    }
    const preview = URL.createObjectURL(file)
    setReceipt({ file, preview })
  }

  const removeReceipt = () => {
    if (receipt) URL.revokeObjectURL(receipt.preview)
    setReceipt(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!form.claim_date) return toast.error("กรุณาระบุวันที่เดินทาง")
    if (!form.amount || Number(form.amount) <= 0) return toast.error("กรุณาระบุจำนวนเงิน")

    setSubmitting(true)

    try {
      // 1) Upload receipt if any
      let receipt_url = ""
      let receipt_name = ""

      if (receipt) {
        setUploading(true)
        const fd = new FormData()
        fd.append("file", receipt.file)
        const upRes = await fetch("/api/transport-claims/upload", { method: "POST", body: fd })
        const upJson = await upRes.json()
        if (!upRes.ok) throw new Error(upJson.error || "อัพโหลดไฟล์ไม่สำเร็จ")
        receipt_url  = upJson.url
        receipt_name = upJson.name
        setUploading(false)
      }

      // 2) Create claim
      const res = await fetch("/api/transport-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          receipt_url,
          receipt_name,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ")

      setSuccess(true)
      toast.success("ส่งเบิกค่าเดินทางสำเร็จ")
      setTimeout(() => router.push("/app/transport-claims"), 1500)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  )

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white px-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">ส่งเบิกสำเร็จ</h2>
      <p className="text-sm text-slate-400">รอ HR พิจารณาอนุมัติ</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/app/transport-claims" className="p-1 -ml-1 rounded-lg hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">เบิกค่าเดินทาง</h1>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Transport type picker */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block">ประเภทการเดินทาง</label>
          <div className="grid grid-cols-4 gap-2">
            {TRANSPORT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setForm(f => ({ ...f, transport_type: t.value }))}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${
                  form.transport_type === t.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-[10px] font-medium text-slate-600 leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Amount */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">วันที่เดินทาง *</label>
            <input
              type="date"
              value={form.claim_date}
              onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">จำนวนเงิน (บาท) *</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all text-right text-lg font-semibold"
            />
          </div>
        </div>

        {/* Origin / Destination */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> จุดเริ่มต้น
            </label>
            <input
              type="text"
              placeholder="เช่น สำนักงานใหญ่"
              value={form.origin}
              onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> จุดหมาย
            </label>
            <input
              type="text"
              placeholder="เช่น ลูกค้า ABC จ.ชลบุรี"
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> รายละเอียด
          </label>
          <textarea
            rows={3}
            placeholder="เช่น เดินทางไปพบลูกค้า ABC เพื่อส่งมอบสินค้า"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all resize-none"
          />
        </div>

        {/* Receipt upload */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <label className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <Receipt className="w-3 h-3" /> แนบหลักฐาน (สลิป / ใบเสร็จ)
          </label>

          {receipt ? (
            <div className="relative">
              <img
                src={receipt.preview}
                alt="receipt"
                className="w-full h-48 object-cover rounded-xl border border-slate-200"
              />
              <button
                onClick={removeReceipt}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-slate-400 mt-1 truncate">{receipt.file.name}</p>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400">กดเพื่อถ่ายรูปหรือเลือกไฟล์</p>
              <p className="text-[10px] text-slate-300">รองรับ JPG, PNG, PDF (สูงสุด 10MB)</p>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.amount || !form.claim_date}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-medium text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploading ? "กำลังอัพโหลดหลักฐาน..." : "กำลังบันทึก..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              ส่งเบิกค่าเดินทาง
            </>
          )}
        </button>
      </div>
    </div>
  )
}
