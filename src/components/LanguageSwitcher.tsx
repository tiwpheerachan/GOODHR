"use client"
import { useState } from "react"
import { Globe } from "lucide-react"
import { useLanguage, type Lang } from "@/lib/i18n"

// ปุ่มเปลี่ยนภาษา (ไทย / EN / 中文) — ใช้ร่วมกันทั้ง admin/manager
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, langs } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
        <Globe size={14} />
        <span>{langs[lang].flag}</span>
        <span className="hidden sm:inline">{langs[lang].label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-[61] min-w-[120px]">
            {(Object.keys(langs) as Lang[]).map(l => (
              <button key={l} onClick={() => { setLang(l); setOpen(false) }}
                className={"flex items-center gap-2 w-full px-3 py-1.5 text-[13px] hover:bg-slate-50 transition-colors " + (l === lang ? "text-indigo-600 font-bold bg-indigo-50" : "text-slate-600")}>
                <span>{langs[l].flag}</span>
                <span>{langs[l].label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
