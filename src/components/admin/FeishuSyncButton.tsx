"use client"
import { useState } from "react"
import { Loader2, Send, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

export type FeishuDataset = "payroll" | "attendance" | "kpi" | "leave" | "employee" | "probation"

const DATASET_LABEL: Record<FeishuDataset, string> = {
  payroll:    "เงินเดือน",
  attendance: "บันทึกเข้างาน",
  kpi:        "KPI",
  leave:      "การลา",
  employee:   "ข้อมูลพนักงาน",
  probation:  "ประเมินทดลองงาน",
}

interface Props {
  dataset: FeishuDataset
  /** "default" = ปุ่ม indigo เต็มรูป, "subtle" = outline เล็กกว่า */
  variant?: "default" | "subtle"
  className?: string
}

export default function FeishuSyncButton({ dataset, variant = "default", className = "" }: Props) {
  const [loading, setLoading] = useState(false)
  const [lastWritten, setLastWritten] = useState<number | null>(null)

  const click = async () => {
    if (loading) return
    setLoading(true)
    const t = toast.loading(`กำลังส่ง${DATASET_LABEL[dataset]}เข้า Base Feishu...`)
    try {
      const res = await fetch("/api/feishu-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data?.error || "ส่งไม่สำเร็จ", { id: t, duration: 6000 })
        return
      }
      setLastWritten(data.written ?? 0)
      toast.success(`ส่งเข้า Base Feishu แล้ว ${data.written ?? 0} แถว`, { id: t, duration: 4000 })
    } catch (e: any) {
      toast.error(e?.message || "เครือข่ายมีปัญหา", { id: t })
    } finally {
      setLoading(false)
    }
  }

  if (variant === "subtle") {
    return (
      <button onClick={click} disabled={loading}
        title={`ส่ง${DATASET_LABEL[dataset]}เข้า Base Feishu`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
          lastWritten != null
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
        } ${className}`}>
        {loading
          ? <Loader2 size={12} className="animate-spin"/>
          : lastWritten != null
            ? <CheckCircle2 size={12}/>
            : <Send size={12}/>}
        <span>
          {loading ? "กำลังส่ง..." : "ส่งเข้า Base Feishu"}
        </span>
        {lastWritten != null && !loading && (
          <span className="text-[10px] font-black opacity-70">({lastWritten})</span>
        )}
      </button>
    )
  }

  // default variant
  return (
    <button onClick={click} disabled={loading}
      title={`ส่ง${DATASET_LABEL[dataset]}เข้า Base Feishu (เรียก sync เดี๋ยวนี้ ไม่ต้องรอ cron)`}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
        lastWritten != null
          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
      } shadow-sm ${className}`}>
      {loading
        ? <Loader2 size={13} className="animate-spin"/>
        : lastWritten != null
          ? <CheckCircle2 size={13}/>
          : <Send size={13}/>}
      <span>
        {loading ? "กำลังส่ง..." : "ส่งเข้า Base Feishu"}
      </span>
      {lastWritten != null && !loading && (
        <span className="text-[10px] font-black bg-white/25 px-1.5 py-0.5 rounded">
          +{lastWritten}
        </span>
      )}
    </button>
  )
}
