"use client"
import { X, Loader2 } from "lucide-react"
import { fmtBytes, fmtSpeed, fmtEta, type UploadProgress as UProg } from "@/lib/training/upload"

export default function UploadProgress({
  progress,
  filename,
  onCancel,
}: {
  progress: UProg
  filename: string
  onCancel?: () => void
}) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-sky-600 flex-shrink-0" />
        <span className="text-xs font-bold text-sky-800 flex-1 truncate">{filename}</span>
        {onCancel && (
          <button onClick={onCancel} className="text-rose-500 hover:bg-rose-50 p-1 rounded" title="ยกเลิก">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300"
          style={{ width: `${progress.pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-sky-700 font-mono">
        <span>{fmtBytes(progress.loaded)} / {fmtBytes(progress.total)}</span>
        <span className="font-bold">{progress.pct.toFixed(1)}%</span>
        <span>{progress.speed > 0 ? fmtSpeed(progress.speed) : "..."}</span>
        <span>{progress.eta > 0 ? `เหลือ ${fmtEta(progress.eta)}` : ""}</span>
      </div>
    </div>
  )
}
