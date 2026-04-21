"use client"
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import th from "./th.json"
import en from "./en.json"
import cn from "./cn.json"

// ── Types ─────────────────────────────────────────────
export type Lang = "th" | "en" | "cn"
type Translations = typeof th

const TRANSLATIONS: Record<Lang, Translations> = { th, en, cn } as any

const LANG_META: Record<Lang, { flag: string; label: string }> = {
  th: { flag: "🇹🇭", label: "ไทย" },
  en: { flag: "🇬🇧", label: "EN" },
  cn: { flag: "🇨🇳", label: "中文" },
}

// ── Helper: deep get by dot-path ──────────────────────
function deepGet(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj)
}

// ── Context ───────────────────────────────────────────
interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  T: Translations
  langs: typeof LANG_META
}

const I18nContext = createContext<I18nContextValue | null>(null)

// ── Provider ──────────────────────────────────────────
const STORAGE_KEY = "goodhr_lang"

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with "th" to match server render, then sync from localStorage after mount
  const [lang, setLangState] = useState<Lang>("th")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
      if (stored && TRANSLATIONS[stored]) setLangState(stored)
    } catch {}
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }, [])

  // t("nav.dashboard") → "ภาพรวม"
  // t("dashboard.late_minutes", { count: 5 }) → "สาย 5 นาที"
  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let val = deepGet(TRANSLATIONS[lang], key)
    if (typeof val !== "string") {
      // fallback to Thai if key not found
      val = deepGet(TRANSLATIONS.th, key)
    }
    if (typeof val !== "string") return key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v))
      })
    }
    return val
  }, [lang])

  const T = TRANSLATIONS[lang]

  return (
    <I18nContext.Provider value={{ lang, setLang, t, T, langs: LANG_META }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────
export function useLanguage() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback: return Thai when outside provider (safe for non-manager pages)
    return {
      lang: "th" as Lang,
      setLang: (() => {}) as (l: Lang) => void,
      t: (key: string) => deepGet(TRANSLATIONS.th, key) ?? key,
      T: TRANSLATIONS.th,
      langs: LANG_META,
    }
  }
  return ctx
}

// ── Helper: employee display name ─────────────────────
// Shows name + nickname in parentheses based on current language
// th → ชื่อไทย (ชื่อเล่นไทย)  en → EnName (EnNickname)  cn → ชื่อไทย (ชื่อเล่นไทย)
export function useEmployeeName() {
  const { lang } = useLanguage()
  return useCallback((emp: any): string => {
    if (!emp) return ""
    // EN and CN both use English name (no Chinese name column exists)
    const useEn = lang === "en" || lang === "cn"
    const firstName = useEn ? (emp.first_name_en || emp.first_name_th) : emp.first_name_th
    const lastName = useEn ? (emp.last_name_en || emp.last_name_th) : emp.last_name_th
    // EN/CN → prefer nickname_en, Thai → prefer nickname (Thai)
    const nickname = useEn
      ? (emp.nickname_en || emp.nickname || "")
      : (emp.nickname || "")
    const name = `${firstName || ""} ${lastName || ""}`.trim()
    return nickname ? `${name} (${nickname})` : name
  }, [lang])
}

// ── Helper: employee initials (for avatar fallback) ───
export function useEmployeeInitial() {
  const { lang } = useLanguage()
  return useCallback((emp: any): string => {
    if (!emp) return "?"
    const firstName = lang === "en" ? (emp.first_name_en || emp.first_name_th) : emp.first_name_th
    return firstName?.[0] ?? "?"
  }, [lang])
}

// ── Helper: leave type name translation ───────────────
// Translates leave type using code field, falls back to original name (Thai)
// Handles multiple code formats: lowercase (sick), UPPERCASE (SICK), mixed (ANNUAL, UNPAID_PERSONAL)
const CODE_ALIASES: Record<string, string> = {
  annual: "vacation",
  annual_leave: "vacation",
  sick_leave: "sick",
  personal_leave: "personal",
  maternity_leave: "maternity",
  unpaid_personal: "personal_unpaid",
}

export function useLeaveTypeName() {
  const { T } = useLanguage()
  return useCallback((codeOrName: string | null | undefined): string => {
    if (!codeOrName) return "-"
    const leaveTypes = (T as any).leave_types
    if (!leaveTypes) return codeOrName

    // 1. Try exact match first
    if (leaveTypes[codeOrName]) return leaveTypes[codeOrName]

    // 2. Try lowercase
    const lower = codeOrName.toLowerCase()
    if (leaveTypes[lower]) return leaveTypes[lower]

    // 3. Try alias mapping (e.g. "annual" → "vacation")
    const aliased = CODE_ALIASES[lower]
    if (aliased && leaveTypes[aliased]) return leaveTypes[aliased]

    // 4. If no code match, return original name as-is (Thai from DB)
    return codeOrName
  }, [T])
}
