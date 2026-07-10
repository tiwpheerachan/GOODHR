"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Tag, Check, X, Search, RotateCcw, Percent, Split } from "lucide-react"
import toast from "react-hot-toast"
import { normalizeBrands } from "@/lib/utils/brands"
import { useBrands } from "@/lib/hooks/useBrands"
import { useLanguage } from "@/lib/i18n"

// ── Brand mini chip color (สีสุภาพ ไม่จี้ตา) ──
function brandColor(brand: string): { bg: string; text: string; border: string; activeBg: string; activeText: string } {
  const u = brand.toUpperCase()
  if (u.includes("DDPAI") || u.includes("DDP")) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", activeBg: "bg-blue-500", activeText: "text-white" }
  if (u.includes("ANKER")) return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", activeBg: "bg-sky-500", activeText: "text-white" }
  if (u.includes("DREAME")) return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", activeBg: "bg-purple-500", activeText: "text-white" }
  if (u.includes("WANBO")) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", activeBg: "bg-amber-500", activeText: "text-white" }
  if (u.includes("MOVA")) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", activeBg: "bg-emerald-500", activeText: "text-white" }
  if (u.includes("VINKO")) return { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", activeBg: "bg-teal-500", activeText: "text-white" }
  if (u.includes("XIAOMI") || u.includes("70MAI")) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", activeBg: "bg-orange-500", activeText: "text-white" }
  if (u.includes("LEVOIT")) return { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", activeBg: "bg-cyan-500", activeText: "text-white" }
  if (u.includes("JIMMY")) return { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", activeBg: "bg-yellow-500", activeText: "text-white" }
  if (u.includes("SOUNDCORE")) return { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", activeBg: "bg-violet-500", activeText: "text-white" }
  if (u.includes("UWANT")) return { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", activeBg: "bg-fuchsia-500", activeText: "text-white" }
  if (u.includes("TOPTOY")) return { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", activeBg: "bg-lime-500", activeText: "text-white" }
  if (u.includes("MIBRO") || u.includes("ZEPP")) return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", activeBg: "bg-indigo-500", activeText: "text-white" }
  if (u.includes("THAIMALL")) return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", activeBg: "bg-rose-500", activeText: "text-white" }
  return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", activeBg: "bg-slate-700", activeText: "text-white" }
}

// helper — เทียบ allocations 2 ก้อนว่าเหมือนกันไหม (key set + values)
function allocEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!(k in b)) return false
    if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 0.01) return false
  }
  return true
}

export default function BrandsTab({
  employeeId,
  employeeName,
  initialBrands,
  initialAllocations,
  feishuBrand,
}: {
  employeeId: string
  employeeName: string
  initialBrands: string[] | string | null
  initialAllocations?: Record<string, number> | null
  feishuBrand?: string | null
}) {
  const { t } = useLanguage()
  const { names: BRAND_NAMES, brands: brandRecords, loading: brandsLoading } = useBrands()
  const [selected, setSelected] = useState<string[]>(normalizeBrands(initialBrands))
  const [original, setOriginal] = useState<string[]>(normalizeBrands(initialBrands))
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState("")
  // ── allocations (% per brand) ──
  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations ?? {})
  const [originalAllocs, setOriginalAllocs] = useState<Record<string, number>>(initialAllocations ?? {})

  useEffect(() => {
    const init = normalizeBrands(initialBrands)
    setSelected(init)
    setOriginal(init)
    const initAlloc = initialAllocations ?? {}
    setAllocations(initAlloc)
    setOriginalAllocs(initAlloc)
  }, [initialBrands, initialAllocations, employeeId])

  // ── เมื่อ toggle brand: ถ้าลบ → ลบ allocation ของ brand นั้น; ถ้าเพิ่ม → คงค่าเดิมไว้ (ไม่ default) ──
  useEffect(() => {
    setAllocations(prev => {
      const next: Record<string, number> = {}
      for (const b of selected) {
        if (b in prev) next[b] = prev[b]
      }
      // ตรวจสอบว่ามีการเปลี่ยน key หรือไม่
      const same = Object.keys(prev).length === Object.keys(next).length &&
                   Object.keys(prev).every(k => k in next)
      return same ? prev : next
    })
  }, [selected])

  // ── % stats ──
  const allocSum = useMemo(() =>
    selected.reduce((s, b) => s + (Number(allocations[b]) || 0), 0)
  , [allocations, selected])
  const allocSumRounded = Math.round(allocSum * 100) / 100
  const sumStatus: "ok" | "over" | "under" | "empty" =
    selected.length === 0       ? "empty" :
    Math.abs(allocSum - 100)<0.5 ? "ok"   :
    allocSum > 100              ? "over" : "under"

  // หารเท่ากันให้ผลรวม = 100.00 เป๊ะ (ไม่มี float drift)
  //   ถ้า 18 แบรนด์ → ทุกตัว 5.55, ตัวสุดท้าย 5.65 (รวม 100)
  const distributeEqually = () => {
    if (selected.length === 0) return
    const n = selected.length
    const base = Math.floor((100 / n) * 100) / 100  // 5.55 (ไม่ปัดขึ้น)
    const next: Record<string, number> = {}
    for (let i = 0; i < n - 1; i++) next[selected[i]] = base
    // ตัวสุดท้ายเก็บ remainder ทั้งหมด — กัน drift
    next[selected[n - 1]] = Math.round((100 - base * (n - 1)) * 100) / 100
    setAllocations(next)
  }

  // เกลี่ยให้รวม = 100 — scale ค่าเดิมตามสัดส่วน (proportional)
  //   เช่น 31/14/63 → /1.08 → 28.7/13/58.3 (รวม 100)
  //   ถ้าค่าเดิมว่าง → เรียก distributeEqually แทน
  const normalizeTo100 = () => {
    if (selected.length === 0) return
    const filled = selected.filter(b => (Number(allocations[b]) || 0) > 0)
    if (filled.length === 0) { distributeEqually(); return }
    const sum = filled.reduce((s, b) => s + (Number(allocations[b]) || 0), 0)
    if (sum === 0) { distributeEqually(); return }
    const next: Record<string, number> = { ...allocations }
    // scale ค่าที่กรอกแล้วทุกตัว
    let runningSum = 0
    for (let i = 0; i < filled.length; i++) {
      const b = filled[i]
      if (i === filled.length - 1) {
        // ตัวสุดท้ายเก็บ remainder กัน drift
        next[b] = Math.round((100 - runningSum) * 100) / 100
      } else {
        const scaled = Math.round((((Number(allocations[b]) || 0) / sum) * 100) * 100) / 100
        next[b] = scaled
        runningSum += scaled
      }
    }
    // ลบ key ของ brand ที่ไม่ filled (เผื่อมี 0 ค้าง)
    for (const b of selected) {
      if (!filled.includes(b)) delete next[b]
    }
    setAllocations(next)
  }

  const clearAllocations = () => setAllocations({})
  const setAlloc = (b: string, v: number) => {
    if (!Number.isFinite(v)) v = 0
    if (v < 0) v = 0
    if (v > 100) v = 100
    setAllocations(prev => ({ ...prev, [b]: Math.round(v * 100) / 100 }))
  }

  // ── Parse Feishu brand เผื่อแนะนำให้ user (autoตัวเลือก) ──
  const feishuParsed: string[] = (() => {
    if (!feishuBrand) return []
    return String(feishuBrand)
      .split(/[,/、&，；;]|\s+(?=[A-Z一-龥])/g)
      .map(s => s.trim()).filter(Boolean)
  })()

  // map Feishu brand variant → official BRAND_NAMES
  const matchOfficial = (raw: string): string | null => {
    const u = raw.toLowerCase()
    for (const opt of BRAND_NAMES) {
      if (opt.toLowerCase() === u) return opt
    }
    for (const opt of BRAND_NAMES) {
      if (u.includes(opt.toLowerCase()) || opt.toLowerCase().includes(u)) return opt
    }
    return null
  }
  const feishuSuggestions = Array.from(new Set(
    feishuParsed.map(matchOfficial).filter((x): x is string => x !== null)
  )).filter(b => !selected.includes(b))

  const toggle = (brand: string) => {
    setSelected(s => s.includes(brand) ? s.filter(x => x !== brand) : [...s, brand])
  }
  const reset = () => setSelected(original)
  const clearAll = () => setSelected([])
  const adoptFeishu = () => {
    setSelected(prev => Array.from(new Set([...prev, ...feishuSuggestions])))
    toast.success(t("admin.emp_detail.brands_toast_adopt_feishu", { n: feishuSuggestions.length }))
  }

  const save = async () => {
    setSaving(true)
    const toastId = toast.loading(t("admin.emp_detail.brands_toast_saving"))
    try {
      // ส่ง allocations ก็ต่อเมื่อ admin กรอกครบทุก brand ที่เลือก (มิฉะนั้นเก็บ NULL → หารเท่ากัน)
      const filledKeys = selected.filter(b => (allocations[b] ?? null) !== null && allocations[b] !== undefined)
      const sendAllocations: Record<string, number> | null =
        filledKeys.length === selected.length && selected.length > 0
          ? Object.fromEntries(selected.map(b => [b, Number(allocations[b]) || 0]))
          : null

      const res = await fetch("/api/employees/brand", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          brands: selected,
          allocations: sendAllocations,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || t("admin.emp_detail.brands_toast_failed"), { id: toastId }); return }
      setOriginal([...selected])
      setOriginalAllocs(sendAllocations ?? {})
      toast.success(
        sendAllocations
          ? t("admin.emp_detail.brands_toast_saved_with_pct", { n: selected.length })
          : t("admin.emp_detail.brands_toast_saved_no_pct", { n: selected.length }),
        { id: toastId, duration: 4000 },
      )
    } finally { setSaving(false) }
  }

  const brandsDirty = selected.length !== original.length ||
                     selected.some(b => !original.includes(b))
  const allocsDirty = !allocEqual(allocations, originalAllocs)
  const dirty = brandsDirty || allocsDirty

  // filter brands by search
  const filtered = q.trim()
    ? BRAND_NAMES.filter(b => b.toLowerCase().includes(q.toLowerCase()))
    : BRAND_NAMES

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-indigo-500"/>
        <h3 className="font-bold text-slate-800 text-sm">{t("admin.emp_detail.brands_title")}</h3>
        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-1">
          {t("admin.emp_detail.brands_selected_count", { n: selected.length, total: BRAND_NAMES.length })}
        </span>
        <div className="flex-1"/>
        {dirty && (
          <button onClick={reset}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1">
            <RotateCcw size={11}/> {t("admin.emp_detail.brands_discard_changes")}
          </button>
        )}
      </div>

      {/* Currently selected (preview) — สี subtle ไม่ฉูดฉาด */}
      {selected.length > 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Check size={11} className="text-emerald-600"/> {t("admin.emp_detail.brands_selected_label")}
            <span className="text-slate-400 font-normal">· {t("admin.emp_detail.brands_count_unit", { n: selected.length })}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(b => {
              const info = brandRecords.find(br => br.name === b)
              return (
                <span key={b}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-300 transition-colors">
                  {/* color dot or logo */}
                  {info?.logo_url ? (
                    <div className="w-4 h-4 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={info.logo_url} alt="" className="w-full h-full object-contain"/>
                    </div>
                  ) : (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info?.color_hex || "#94a3b8" }}/>
                  )}
                  {b}
                  <button onClick={() => toggle(b)} className="hover:bg-slate-100 rounded p-0.5 text-slate-400 hover:text-rose-600">
                    <X size={9}/>
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
          <Tag size={18} className="mx-auto text-slate-300 mb-1"/>
          <p className="text-xs text-slate-500">{t("admin.emp_detail.brands_empty_selected")}</p>
        </div>
      )}

      {/* ── % Allocation per brand — สี subtle ── */}
      {selected.length > 0 && (
        <div className="border border-slate-200 bg-white rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Percent size={13} className="text-slate-500"/>
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              {t("admin.emp_detail.brands_alloc_heading")} <span className="text-slate-400 normal-case font-normal">{t("admin.emp_detail.brands_alloc_heading_note")}</span>
            </p>
            <div className="flex-1"/>
            {/* เกลี่ยให้ครบ 100% — เด่นเมื่อรวมไม่ใช่ 100 */}
            {sumStatus !== "ok" && Object.keys(allocations).length > 0 && (
              <button onClick={normalizeTo100}
                title={t("admin.emp_detail.brands_normalize_title")}
                className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors ${
                  sumStatus === "over"
                    ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                    : "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                }`}>
                ⚡ {t("admin.emp_detail.brands_normalize_btn")}
              </button>
            )}
            <button onClick={distributeEqually}
              title={t("admin.emp_detail.brands_distribute_title")}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                Object.keys(allocations).length === 0
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              <Split size={10}/> {t("admin.emp_detail.brands_distribute_btn")}
            </button>
            {Object.keys(allocations).length > 0 && (
              <button onClick={clearAllocations}
                className="text-[10px] font-bold px-2 py-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                {t("admin.emp_detail.brands_clear_pct")}
              </button>
            )}
          </div>

          {/* per-brand rows — บรรทัดสีขาวล้วน ใช้สีแบรนด์เป็น accent ซ้าย */}
          <div className="space-y-1">
            {selected.map(b => {
              const info = brandRecords.find(br => br.name === b)
              const has = b in allocations
              const num = has ? (Number(allocations[b]) || 0) : 0
              const accent = info?.color_hex || "#94a3b8"
              return (
                <div key={b} className="flex items-center gap-2 bg-slate-50 rounded-lg pl-2 pr-2 py-1.5 hover:bg-slate-100 transition-colors border-l-2"
                  style={{ borderLeftColor: accent }}>
                  {/* logo + name */}
                  <div className="flex items-center gap-1.5 min-w-[140px]">
                    {info?.logo_url ? (
                      <div className="w-5 h-5 rounded bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={info.logo_url} alt="" className="w-full h-full object-contain"/>
                      </div>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }}/>
                    )}
                    <span className="text-[11px] font-bold text-slate-700 truncate">{b}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {/* slider */}
                    <input type="range" min="0" max="100" step="1"
                      value={num}
                      onChange={e => setAlloc(b, Number(e.target.value))}
                      className="flex-1 accent-indigo-500"/>
                    {/* number input */}
                    <div className="relative w-16">
                      <input type="number" min="0" max="100" step="0.1"
                        value={has ? num : ""}
                        onChange={e => {
                          const raw = e.target.value
                          if (raw === "") {
                            setAllocations(prev => { const n = { ...prev }; delete n[b]; return n })
                          } else {
                            setAlloc(b, Number(raw))
                          }
                        }}
                        placeholder="—"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 pr-5"/>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sum indicator — สีพื้นหลังคงที่ ใช้ text color เปลี่ยน */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <p className="text-[10px] font-bold text-slate-500">
              {sumStatus === "ok"    ? t("admin.emp_detail.brands_sum_ok") :
               sumStatus === "over"  ? t("admin.emp_detail.brands_sum_over") :
               sumStatus === "under" ? Object.keys(allocations).length === 0
                                       ? t("admin.emp_detail.brands_sum_empty")
                                       : t("admin.emp_detail.brands_sum_under")
                                     : ""}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  sumStatus === "ok"   ? "bg-emerald-500" :
                  sumStatus === "over" ? "bg-rose-500" :
                                         "bg-amber-500"
                }`} style={{ width: `${Math.min(allocSumRounded, 100)}%` }}/>
              </div>
              <p className={`text-sm font-black ${
                sumStatus === "ok"   ? "text-emerald-700" :
                sumStatus === "over" ? "text-rose-700" :
                                       "text-amber-700"
              }`}>
                {allocSumRounded}<span className="text-xs">%</span>
                <span className="text-[10px] text-slate-400 ml-1">/ 100</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feishu suggestion — สีบลูแบบ subtle */}
      {feishuSuggestions.length > 0 && (
        <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wide flex items-center gap-1">
              🔗 {t("admin.emp_detail.brands_feishu_title")}
              <span className="text-sky-500 font-normal">· {t("admin.emp_detail.brands_count_unit", { n: feishuSuggestions.length })}</span>
            </p>
            <button onClick={adoptFeishu}
              className="text-[10px] font-bold px-2.5 py-1 bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 rounded-lg">
              + {t("admin.emp_detail.brands_feishu_add_all")}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {feishuSuggestions.map(b => {
              const info = brandRecords.find(br => br.name === b)
              return (
                <button key={b} onClick={() => toggle(b)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-white border border-sky-200 text-sky-800 hover:bg-sky-100 rounded-lg">
                  {info?.logo_url ? (
                    <div className="w-3.5 h-3.5 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={info.logo_url} alt="" className="w-full h-full object-contain"/>
                    </div>
                  ) : (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info?.color_hex || "#0ea5e9" }}/>
                  )}
                  + {b}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
        <Search size={12} className="text-slate-400"/>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={t("admin.emp_detail.brands_search_placeholder")}
          className="flex-1 bg-transparent outline-none text-sm"/>
        {q && <button onClick={() => setQ("")}><X size={11} className="text-slate-400"/></button>}
        {selected.length > 0 && (
          <button onClick={clearAll}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded">
            {t("admin.emp_detail.brands_clear_all")}
          </button>
        )}
      </div>

      {/* All brands — grid: เน้น logo + ชื่อ, สีแค่ accent ขีดซ้าย */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
          {t("admin.emp_detail.brands_all_heading")} <span className="text-slate-400 font-normal">({filtered.length})</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {filtered.map(b => {
            const active = selected.includes(b)
            const info = brandRecords.find(br => br.name === b)
            const accent = info?.color_hex || "#94a3b8"
            return (
              <button key={b} onClick={() => toggle(b)}
                className={`relative flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all overflow-hidden ${
                  active
                    ? "bg-indigo-50 border-indigo-300 text-indigo-800 ring-1 ring-indigo-200"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}>
                {/* accent ขีดซ้าย (สีแบรนด์) — เบาๆ */}
                <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                  style={{ backgroundColor: accent, opacity: active ? 1 : 0.45 }}/>

                {/* logo or color dot */}
                {info?.logo_url ? (
                  <div className="w-6 h-6 rounded-md bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 ml-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={info.logo_url} alt="" className="w-full h-full object-contain"/>
                  </div>
                ) : (
                  <span className="w-3 h-3 rounded-full shrink-0 ml-1" style={{ backgroundColor: accent }}/>
                )}

                <span className="truncate flex-1 text-left">{b}</span>

                {/* check badge ถ้า active */}
                {active && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <Check size={9} strokeWidth={3} className="text-white"/>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Save button — sticky bottom */}
      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-white border-t border-slate-100 flex items-center gap-3 mt-6">
        <p className="text-xs text-slate-500 flex-1">
          {dirty
            ? <><span className="font-bold text-amber-600">{t("admin.emp_detail.brands_footer_dirty_label")}</span> {t("admin.emp_detail.brands_footer_dirty_hint")}</>
            : <span className="text-emerald-600">{t("admin.emp_detail.brands_footer_saved")}</span>}
          {sumStatus === "over" && (
            <span className="ml-2 text-rose-500 font-bold">{t("admin.emp_detail.brands_footer_over")}</span>
          )}
        </p>
        <button onClick={save} disabled={saving || !dirty || sumStatus === "over"}
          title={sumStatus === "over" ? t("admin.emp_detail.brands_save_over_title") : ""}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl flex items-center gap-1.5 shadow-sm">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
          {t("admin.emp_detail.brands_save_btn")} {dirty && `(${selected.length})`}
        </button>
      </div>
    </div>
  )
}
