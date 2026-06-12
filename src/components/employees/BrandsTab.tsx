"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Tag, Check, X, Search, RotateCcw, Percent, Split } from "lucide-react"
import toast from "react-hot-toast"
import { BRAND_OPTIONS, normalizeBrands } from "@/lib/utils/brands"

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

  const distributeEqually = () => {
    if (selected.length === 0) return
    const pct = Math.round((100 / selected.length) * 100) / 100
    const next: Record<string, number> = {}
    for (let i = 0; i < selected.length; i++) {
      // ปัดสุดท้ายเก็บ remainder
      next[selected[i]] = i === selected.length - 1
        ? Math.round((100 - pct * (selected.length - 1)) * 100) / 100
        : pct
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

  // map Feishu brand variant → official BRAND_OPTIONS
  const matchOfficial = (raw: string): string | null => {
    const u = raw.toLowerCase()
    for (const opt of BRAND_OPTIONS) {
      if (opt.toLowerCase() === u) return opt
    }
    for (const opt of BRAND_OPTIONS) {
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
    toast.success(`เพิ่ม ${feishuSuggestions.length} แบรนด์จาก Feishu`)
  }

  const save = async () => {
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
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
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ", { id: t }); return }
      setOriginal([...selected])
      setOriginalAllocs(sendAllocations ?? {})
      toast.success(
        sendAllocations
          ? `บันทึก ${selected.length} แบรนด์ + % สำเร็จ`
          : `บันทึก ${selected.length} แบรนด์แล้ว (ยังไม่กรอก % → จะคิดต้นทุนแบบหารเท่ากัน)`,
        { id: t, duration: 4000 },
      )
    } finally { setSaving(false) }
  }

  const brandsDirty = selected.length !== original.length ||
                     selected.some(b => !original.includes(b))
  const allocsDirty = !allocEqual(allocations, originalAllocs)
  const dirty = brandsDirty || allocsDirty

  // filter brands by search
  const filtered = q.trim()
    ? BRAND_OPTIONS.filter(b => b.toLowerCase().includes(q.toLowerCase()))
    : BRAND_OPTIONS

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-indigo-500"/>
        <h3 className="font-bold text-slate-800 text-sm">แบรนด์ที่ดูแล</h3>
        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-1">
          เลือก {selected.length}/{BRAND_OPTIONS.length}
        </span>
        <div className="flex-1"/>
        {dirty && (
          <button onClick={reset}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1">
            <RotateCcw size={11}/> ยกเลิกการเปลี่ยนแปลง
          </button>
        )}
      </div>

      {/* Currently selected (preview) */}
      {selected.length > 0 ? (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-[10px] font-black text-indigo-600 uppercase mb-2 flex items-center gap-1">
            <Check size={11}/> แบรนด์ที่เลือก ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(b => {
              const c = brandColor(b)
              return (
                <span key={b}
                  className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${c.activeBg} ${c.activeText} shadow-sm`}>
                  {b}
                  <button onClick={() => toggle(b)} className="hover:bg-white/20 rounded p-0.5">
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
          <p className="text-xs text-slate-500">ยังไม่ได้เลือกแบรนด์</p>
        </div>
      )}

      {/* ── % Allocation per brand ── */}
      {selected.length > 0 && (
        <div className={`border rounded-xl p-3 space-y-3 transition-colors ${
          sumStatus === "ok"   ? "bg-emerald-50/60 border-emerald-200" :
          sumStatus === "over" ? "bg-rose-50/60 border-rose-200" :
          sumStatus === "under"? "bg-amber-50/60 border-amber-200" :
                                 "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Percent size={13} className="text-slate-500"/>
            <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
              สัดส่วน % ของแต่ละแบรนด์ <span className="text-slate-400 normal-case font-normal">(ใช้คำนวณต้นทุนต่อแบรนด์)</span>
            </p>
            <div className="flex-1"/>
            <button onClick={distributeEqually}
              title="หาร 100% เท่ากันทุกแบรนด์ที่เลือก"
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg">
              <Split size={10}/> หารเท่ากัน
            </button>
            {Object.keys(allocations).length > 0 && (
              <button onClick={clearAllocations}
                className="text-[10px] font-bold px-2 py-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                ล้าง %
              </button>
            )}
          </div>

          {/* per-brand rows */}
          <div className="space-y-1.5">
            {selected.map(b => {
              const c = brandColor(b)
              const has = b in allocations
              const num = has ? (Number(allocations[b]) || 0) : 0
              return (
                <div key={b} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${c.activeBg} ${c.activeText} min-w-[110px]`}>
                    {b}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    {/* slider */}
                    <input type="range" min="0" max="100" step="1"
                      value={num}
                      onChange={e => setAlloc(b, Number(e.target.value))}
                      className="flex-1 accent-indigo-500"/>
                    {/* number input */}
                    <div className="relative w-20">
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

          {/* Sum indicator */}
          <div className="flex items-center justify-between border-t border-slate-200/70 pt-2">
            <p className="text-[10px] font-bold text-slate-500">
              {sumStatus === "ok"    ? "✓ สัดส่วนสมบูรณ์ (รวม 100%)" :
               sumStatus === "over"  ? "⚠ รวมเกิน 100%" :
               sumStatus === "under" ? Object.keys(allocations).length === 0
                                       ? "ยังไม่กรอก — ระบบจะคิดแบบหารเท่ากัน"
                                       : "⚠ รวมน้อยกว่า 100% — กรอกให้ครบ"
                                     : ""}
            </p>
            <p className={`text-sm font-black ${
              sumStatus === "ok"   ? "text-emerald-700" :
              sumStatus === "over" ? "text-rose-700" :
                                     "text-amber-700"
            }`}>
              รวม {allocSumRounded}<span className="text-xs">%</span>
              <span className="text-[10px] text-slate-400 ml-1">/ 100%</span>
            </p>
          </div>
        </div>
      )}

      {/* Feishu suggestion */}
      {feishuSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1">
              🔗 แนะนำจาก Feishu ({feishuSuggestions.length})
            </p>
            <button onClick={adoptFeishu}
              className="text-[10px] font-black px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
              + เพิ่มทั้งหมด
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {feishuSuggestions.map(b => (
              <button key={b} onClick={() => toggle(b)}
                className="text-[10px] font-bold px-2 py-1 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg">
                + {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
        <Search size={12} className="text-slate-400"/>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="ค้นแบรนด์..."
          className="flex-1 bg-transparent outline-none text-sm"/>
        {q && <button onClick={() => setQ("")}><X size={11} className="text-slate-400"/></button>}
        {selected.length > 0 && (
          <button onClick={clearAll}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded">
            ล้างทั้งหมด
          </button>
        )}
      </div>

      {/* All brands — grid */}
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">แบรนด์ทั้งหมด ({filtered.length})</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {filtered.map(b => {
            const active = selected.includes(b)
            const c = brandColor(b)
            return (
              <button key={b} onClick={() => toggle(b)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  active
                    ? `${c.activeBg} ${c.activeText} border-transparent shadow-sm`
                    : `bg-white ${c.text} ${c.border} hover:${c.bg}`
                }`}>
                <span className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ${
                  active ? "bg-white/30" : `${c.bg} border ${c.border}`
                }`}>
                  {active && <Check size={10} strokeWidth={3} className="text-white"/>}
                </span>
                <span className="truncate">{b}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Save button — sticky bottom */}
      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-white border-t border-slate-100 flex items-center gap-3 mt-6">
        <p className="text-xs text-slate-500 flex-1">
          {dirty
            ? <><span className="font-bold text-amber-600">มีการเปลี่ยนแปลง</span> — กดบันทึกเพื่อยืนยัน</>
            : <span className="text-emerald-600">✓ บันทึกล่าสุดแล้ว</span>}
          {sumStatus === "over" && (
            <span className="ml-2 text-rose-500 font-bold">• รวม % เกิน 100</span>
          )}
        </p>
        <button onClick={save} disabled={saving || !dirty || sumStatus === "over"}
          title={sumStatus === "over" ? "รวม % เกิน 100 — แก้ไขก่อนบันทึก" : ""}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl flex items-center gap-1.5 shadow-sm">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
          บันทึก {dirty && `(${selected.length})`}
        </button>
      </div>
    </div>
  )
}
