"use client"
import { useEffect, useRef, useState } from "react"
import { X, Check, AlertTriangle } from "lucide-react"

// ════════════════════════════════════════════════════════════════════
// PromptModal — popup ขอข้อความ (แทน window.prompt)
// ════════════════════════════════════════════════════════════════════
export function PromptModal({
  open, title, label, placeholder, defaultValue, confirmText = "ตกลง", cancelText = "ยกเลิก",
  onConfirm, onClose,
}: {
  open: boolean
  title: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(defaultValue ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? "")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultValue])

  if (!open) return null

  const submit = () => {
    const v = value.trim()
    if (!v) { inputRef.current?.focus(); return }
    onConfirm(v)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        {label && <p className="text-xs font-bold text-slate-500">{label}</p>}
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose() }}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            {cancelText}
          </button>
          <button onClick={submit}
            className="px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 flex items-center gap-1.5">
            <Check size={14} /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// ConfirmModal — popup confirm (แทน window.confirm)
// ════════════════════════════════════════════════════════════════════
export function ConfirmModal({
  open, title, message, confirmText = "ยืนยัน", cancelText = "ยกเลิก", danger = false,
  onConfirm, onClose,
}: {
  open: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  const confirmCls = danger
    ? "bg-rose-600 hover:bg-rose-700 text-white"
    : "bg-sky-600 hover:bg-sky-700 text-white"
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {danger && (
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-slate-800">{title}</h2>
            {message && <p className="text-xs text-slate-500 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg ${confirmCls}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
