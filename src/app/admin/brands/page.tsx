"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useBrands } from "@/lib/hooks/useBrands"
import { normalizeBrands } from "@/lib/utils/brands"
import {
  Store, Search, Users, Layers, Percent, Loader2, Sparkles,
  AlertTriangle, ChevronDown, ClipboardCheck, UserX, CheckCircle2, CircleSlash, RefreshCw,
} from "lucide-react"

// ─── Color theming ──────────────────────────────────────────────────
//   ทุกสีของการ์ดสร้างจาก HSL เดียว เพื่อให้โทนกลมกลืน
//   ถ้าแบรนด์มี color_hex → ใช้สีนั้น | ไม่มี → hash ชื่อเป็น hue คงที่
type HSL = { h: number; s: number; l: number }

function hexToHsl(hex: string): HSL | null {
  const m = hex.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hashHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

function brandHsl(b: { name: string; color_hex?: string | null }): HSL {
  if (b.color_hex) {
    const hsl = hexToHsl(b.color_hex)
    if (hsl) return hsl
  }
  return { h: hashHue(b.name), s: 68, l: 52 }
}

const css = ({ h, s, l }: HSL, dl = 0, ds = 0) =>
  `hsl(${h} ${Math.max(0, Math.min(100, s + ds))}% ${Math.max(0, Math.min(100, l + dl))}%)`

// ─── Avatar ─────────────────────────────────────────────────────────
function Avatar({ url, name, size = 36, ring }: { url?: string | null; name?: string; size?: number; ring?: string }) {
  const style = ring ? { boxShadow: `0 0 0 2px ${ring}` } : undefined
  if (url) return <img src={url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size, ...style }} />
  return (
    <div className="rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, ...style }}>
      {name?.[0] || "?"}
    </div>
  )
}

// ─── Allocation helpers ─────────────────────────────────────────────
//   pct ของพนักงานในแบรนด์: ใช้ค่าที่กรอกไว้ ถ้าไม่มี → หารเท่ากันตามจำนวนแบรนด์
function allocPct(emp: any, brand: string): { pct: number; explicit: boolean } {
  const alloc = emp.brand_allocations as Record<string, number> | null | undefined
  const v = alloc?.[brand]
  if (typeof v === "number" && v > 0) return { pct: v, explicit: true }
  const n = normalizeBrands(emp.brand).length
  return { pct: n > 0 ? Math.round((100 / n) * 10) / 10 : 0, explicit: false }
}

export default function BrandsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { brands: brandList } = useBrands()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"

  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  // ── view: "portfolio" (พอร์ตแบรนด์เดิม) | "pending" (ค้างตั้งค่าสัดส่วน จัดกลุ่มตามหัวหน้า) ──
  const [view, setView] = useState<"portfolio" | "pending">("portfolio")
  const [pending, setPending] = useState<any>(null)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [onlyPending, setOnlyPending] = useState(true)  // filter: โชว์เฉพาะหัวหน้าที่ยังค้าง

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined
  const activeCompanyId = isSuperAdmin ? (selectedCompany || undefined) : myCompanyId

  // brand metadata lookup (color / logo)
  const brandMeta = useMemo(() => {
    const m = new Map<string, { name: string; color_hex?: string | null; logo_url?: string | null }>()
    for (const b of brandList) m.set(b.name, b)
    return m
  }, [brandList])
  const metaFor = useCallback(
    (name: string) => brandMeta.get(name) ?? { name },
    [brandMeta],
  )

  // ── load companies (super admin) ──
  useEffect(() => {
    if (!isSuperAdmin) return
    supabase.from("companies").select("id, name_th, code").eq("is_active", true).order("name_th")
      .then(({ data }) => setCompanies(data ?? []))
  }, [isSuperAdmin])

  // ── load employees (scoped) ──
  const loadEmployees = useCallback(() => {
    if (!isSuperAdmin && !myCompanyId) return
    setLoading(true)
    let q = supabase.from("employees")
      .select(`id, employee_code, first_name_th, last_name_th, nickname, avatar_url, brand, brand_allocations, company_id,
               position:positions(name), department:departments(name), company:companies(code, name_th)`)
      .eq("is_active", true).is("deleted_at", null)
      .not("employment_status", "in", "(resigned,terminated)")   // กันคนลาออกหลุด แม้ is_active เพี้ยน
      .order("first_name_th")
    if (activeCompanyId) q = q.eq("company_id", activeCompanyId)
    else if (!isSuperAdmin) q = q.eq("company_id", myCompanyId!)
    q.then(({ data }) => { setEmployees(data ?? []); setLoading(false) })
  }, [activeCompanyId, isSuperAdmin, myCompanyId])

  useEffect(() => { loadEmployees() }, [loadEmployees])

  // ── load "ค้างตั้งค่าสัดส่วน" (จัดกลุ่มตามหัวหน้า) ──
  const loadPending = useCallback(() => {
    setPendingLoading(true)
    const qs = activeCompanyId ? `?company_id=${activeCompanyId}` : ""
    fetch(`/api/admin/brand-allocation-status${qs}`)
      .then(r => r.json())
      .then(d => setPending(d?.error ? null : d))
      .catch(() => setPending(null))
      .finally(() => setPendingLoading(false))
  }, [activeCompanyId])

  useEffect(() => {
    if (view !== "pending") return
    if (!isSuperAdmin && !myCompanyId) return
    loadPending()
  }, [view, loadPending, isSuperAdmin, myCompanyId])

  // ── รีเฟรชข้อมูลทั้งหน้า (ดึงใหม่จาก DB — เห็นผลคนลาออก/สัดส่วนล่าสุดทันที) ──
  const refreshAll = useCallback(() => {
    loadEmployees()
    loadPending()
  }, [loadEmployees, loadPending])

  // เฉพาะคนที่ถือแบรนด์อย่างน้อย 1 แบรนด์
  const holders = useMemo(
    () => employees.filter(e => normalizeBrands(e.brand).length > 0),
    [employees],
  )

  // ── group by brand ──
  const byBrand = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const e of holders) {
      for (const b of normalizeBrands(e.brand)) {
        if (!map.has(b)) map.set(b, [])
        map.get(b)!.push(e)
      }
    }
    // เรียงตาม display_order ของ brand list ก่อน แล้วตามจำนวนผู้ถือ
    const order = new Map(brandList.map((b, i) => [b.name, b.display_order ?? i * 10]))
    return Array.from(map.entries())
      .map(([name, emps]) => ({
        name,
        meta: metaFor(name),
        emps: emps
          .map(e => ({ e, ...allocPct(e, name) }))
          .sort((a, b) => b.pct - a.pct),
      }))
      .sort((a, b) =>
        (order.get(a.name) ?? 9999) - (order.get(b.name) ?? 9999) || b.emps.length - a.emps.length,
      )
  }, [holders, brandList, metaFor])

  // ── filter by search ──
  const lc = search.toLowerCase().trim()
  const matchEmp = (e: any) =>
    !lc || `${e.first_name_th} ${e.last_name_th} ${e.nickname ?? ""} ${e.employee_code ?? ""}`.toLowerCase().includes(lc)

  const filteredHolders = useMemo(() => holders.filter(matchEmp), [holders, lc])

  // ── summary stats ──
  const stats = useMemo(() => {
    const assignments = holders.reduce((s, e) => s + normalizeBrands(e.brand).length, 0)
    return {
      brands: byBrand.length,
      holders: holders.length,
      assignments,
      avgPerHead: holders.length ? Math.round((assignments / holders.length) * 10) / 10 : 0,
    }
  }, [holders, byBrand])

  return (
    <div className="space-y-5">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 px-6 py-7 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Store size={24} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-2xl font-black flex items-center gap-2">
              พอร์ตแบรนด์ <Sparkles size={18} className="text-amber-300" />
            </h1>
            <p className="text-white/60 text-sm mt-0.5">สัดส่วนการถือครองแบรนด์ของพนักงานแต่ละคน</p>
          </div>
          <button onClick={refreshAll} disabled={loading || pendingLoading}
            title="รีเฟรชข้อมูลล่าสุด"
            className="flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 text-white text-sm font-bold rounded-xl px-4 py-2.5 hover:bg-white/25 transition disabled:opacity-50 shrink-0">
            <RefreshCw size={15} className={(loading || pendingLoading) ? "animate-spin" : ""} />
            รีเฟรช
          </button>
          {isSuperAdmin && (
            <div className="relative">
              <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
                className="appearance-none bg-white/15 backdrop-blur border border-white/20 text-white text-sm font-bold rounded-xl pl-4 pr-9 py-2.5 outline-none cursor-pointer">
                <option value="" className="text-slate-800">ทุกบริษัท</option>
                {companies.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.name_th}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Layers, label: "แบรนด์ทั้งหมด", value: stats.brands, tint: "from-indigo-500 to-blue-500" },
          { icon: Users, label: "พนักงานที่ถือแบรนด์", value: stats.holders, tint: "from-emerald-500 to-teal-500" },
          { icon: Store, label: "การถือครองรวม", value: stats.assignments, tint: "from-fuchsia-500 to-purple-500" },
          { icon: Percent, label: "เฉลี่ยแบรนด์/คน", value: stats.avgPerHead, tint: "from-amber-500 to-orange-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.tint} text-white flex items-center justify-center shrink-0`}>
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-800 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── View tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {([
          { v: "portfolio", label: "พอร์ตแบรนด์", icon: Store },
          { v: "pending", label: "ค้างตั้งค่าสัดส่วน", icon: ClipboardCheck },
        ] as const).map(tab => (
          <button key={tab.v} onClick={() => setView(tab.v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
              view === tab.v
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}>
            <tab.icon size={15} /> {tab.label}
            {tab.v === "pending" && pending?.summary?.pending > 0 && (
              <span className="ml-1 text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {pending.summary.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Toolbar (พอร์ตแบรนด์) ── */}
      {view === "portfolio" && (
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10"
            placeholder="ค้นหาชื่อพนักงาน หรือ แบรนด์..." />
        </div>
      </div>
      )}

      {/* ═══════════ VIEW: ค้างตั้งค่าสัดส่วน (จัดกลุ่มตามหัวหน้า) ═══════════ */}
      {view === "pending" && (
        <PendingView
          data={pending}
          loading={pendingLoading}
          onlyPending={onlyPending}
          setOnlyPending={setOnlyPending}
        />
      )}

      {/* ── Content ── */}
      {view === "portfolio" && (loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" /> กำลังโหลด...
        </div>
      ) : holders.length === 0 ? (
        <div className="py-20 text-center text-slate-300">
          <Store size={40} className="mx-auto mb-3" />
          <p className="font-bold text-sm">ยังไม่มีพนักงานที่ถูกกำหนดแบรนด์</p>
          <p className="text-xs mt-1">กำหนดแบรนด์ให้พนักงานได้ที่หน้า "พนักงาน"</p>
        </div>
      ) : (
        /* ═══ GAME ROSTER — สรุปรวมต่อคน (จัดอันดับตามจำนวนแบรนด์) ═══ */
        <div className="space-y-2.5">
          {filteredHolders.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">ไม่พบผลลัพธ์สำหรับ &quot;{search}&quot;</p>
          ) : filteredHolders
            .map(e => ({ e, count: normalizeBrands(e.brand).length }))
            .sort((a, b) => b.count - a.count || `${a.e.first_name_th}`.localeCompare(`${b.e.first_name_th}`, "th"))
            .map(({ e, count }, idx) => {
              const rank = idx + 1
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null
              const rankTint = rank === 1 ? "from-amber-300 to-yellow-500"
                : rank === 2 ? "from-slate-300 to-slate-400"
                : rank === 3 ? "from-orange-300 to-amber-600" : ""
              const brands = normalizeBrands(e.brand)
              const segs = brands.map(b => {
                const { pct, explicit } = allocPct(e, b)
                return { b, pct, explicit, hsl: brandHsl(metaFor(b)) }
              }).sort((a, z) => z.pct - a.pct)
              const sum = segs.reduce((s, x) => s + x.pct, 0)
              const off = Math.abs(sum - 100) > 1 && segs.some(s => s.explicit)
              const topHsl = segs[0]?.hsl ?? { h: 230, s: 60, l: 55 }
              return (
                <div key={e.id}
                  className="group relative flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-100 bg-white pl-3 pr-4 py-3 shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  {/* แถบสีซ้าย = แบรนด์หลัก */}
                  <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: css(topHsl) }} />

                  {/* อันดับ */}
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${medal ? `bg-gradient-to-br ${rankTint} text-white` : "bg-slate-100 text-slate-400"}`}>
                    {medal ?? `#${rank}`}
                  </div>

                  {/* avatar + LV */}
                  <div className="relative shrink-0">
                    <Avatar url={e.avatar_url} name={e.first_name_th} size={48} ring={css(topHsl, 0)} />
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white shadow"
                      style={{ background: css(topHsl, -12) }}>
                      LV{count}
                    </span>
                  </div>

                  {/* name + XP bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-black text-slate-800 truncate text-sm">
                        {e.first_name_th} {e.last_name_th}
                      </p>
                      {e.nickname && <span className="text-slate-400 font-normal text-[11px]">({e.nickname})</span>}
                      {off && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> {Math.round(sum)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate -mt-0.5">
                      {e.position?.name || "—"}
                      {isSuperAdmin && e.company?.code ? ` · ${e.company.code}` : e.department?.name ? ` · ${e.department.name}` : ""}
                    </p>
                    {/* XP / loadout bar */}
                    <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-100">
                      {segs.map(s => (
                        <div key={s.b} className="h-full transition-all" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${css(s.hsl, 6)}, ${css(s.hsl, -6)})` }} title={`${s.b} ${s.pct}%`} />
                      ))}
                    </div>
                  </div>

                  {/* brand medals (pills) */}
                  <div className="hidden md:flex flex-wrap gap-1.5 justify-end max-w-[46%] shrink-0">
                    {segs.map(s => (
                      <span key={s.b} className="inline-flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 text-[11px] font-bold border"
                        style={{ background: css(s.hsl, 46), borderColor: css(s.hsl, 30), color: css(s.hsl, -18) }}>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-white shrink-0" style={{ background: css(s.hsl) }}>●</span>
                        {s.b}
                        <span className="font-black">{s.pct}%{!s.explicit && <span className="opacity-50">≈</span>}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PendingView — หัวหน้าคนไหน / พนักงานคนไหน ยังไม่ได้ตั้งค่าสัดส่วน %
// ═══════════════════════════════════════════════════════════════════
const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  no_alloc:   { label: "ยังไม่กรอก %",     cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: AlertTriangle },
  incomplete: { label: "รวมไม่ถึง 100%",   cls: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
  no_brand:   { label: "ยังไม่มีแบรนด์",   cls: "bg-slate-50 text-slate-500 border-slate-200",    icon: CircleSlash },
  done:       { label: "ตั้งค่าครบ",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
}

function PendingView({
  data, loading, onlyPending, setOnlyPending,
}: {
  data: any
  loading: boolean
  onlyPending: boolean
  setOnlyPending: (v: boolean) => void
}) {
  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={20} className="animate-spin" /> กำลังตรวจสอบ...
      </div>
    )
  }
  if (!data) {
    return <p className="text-center py-16 text-slate-400 text-sm">โหลดข้อมูลไม่สำเร็จ</p>
  }

  const s = data.summary ?? {}
  const managers: any[] = data.managers ?? []
  // โชว์เฉพาะหัวหน้าที่ยังค้าง (pending > 0) เมื่อ onlyPending
  const shown = onlyPending ? managers.filter(m => m.pending > 0) : managers

  return (
    <div className="space-y-4">
      {/* สรุปตัวเลข */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: UserX, label: "หัวหน้าที่ยังตั้งค่าไม่ครบ", value: `${s.managers_pending ?? 0}/${s.managers_total ?? 0}`, tint: "from-rose-500 to-pink-500" },
          { icon: AlertTriangle, label: "พนักงานค้างสัดส่วน", value: s.pending ?? 0, tint: "from-amber-500 to-orange-500" },
          { icon: CheckCircle2, label: "ตั้งค่าครบแล้ว", value: s.done ?? 0, tint: "from-emerald-500 to-teal-500" },
          { icon: CircleSlash, label: "ยังไม่มีแบรนด์", value: s.no_brand ?? 0, tint: "from-slate-400 to-slate-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.tint} text-white flex items-center justify-center shrink-0`}>
              <c.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-800 leading-none">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* filter toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setOnlyPending(!onlyPending)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            onlyPending
              ? "bg-amber-500 border-amber-500 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}>
          <AlertTriangle size={13} /> {onlyPending ? "เฉพาะหัวหน้าที่ยังค้าง" : "แสดงหัวหน้าทั้งหมด"}
        </button>
        <p className="text-[11px] text-slate-400">แสดง {shown.length} หัวหน้า</p>
      </div>

      {/* รายการหัวหน้า */}
      {shown.length === 0 ? (
        <div className="py-16 text-center text-emerald-500">
          <CheckCircle2 size={40} className="mx-auto mb-3" />
          <p className="font-bold text-sm">{onlyPending ? "หัวหน้าทุกคนตั้งค่าสัดส่วนครบแล้ว 🎉" : "ไม่มีข้อมูล"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((m: any) => (
            <div key={m.manager_id ?? "none"}
              className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* หัวหน้า header */}
              <div className={`flex items-center gap-3 px-4 py-3 ${m.pending > 0 ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                <Avatar url={m.manager_avatar} name={m.manager_name ?? "?"} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm truncate">
                    {m.manager_name ?? "— ไม่มีหัวหน้าที่กำหนดในระบบ —"}
                    {m.manager_company_code && <span className="text-slate-400 font-normal text-[11px] ml-1.5">· {m.manager_company_code}</span>}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{m.manager_position || "—"} · ลูกน้อง {m.total} คน</p>
                </div>
                {m.pending > 0 ? (
                  <span className="shrink-0 text-[11px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    ค้าง {m.pending}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> ครบ
                  </span>
                )}
              </div>
              {/* ลูกน้อง list */}
              <div className="divide-y divide-slate-50">
                {m.subordinates.map((sub: any) => {
                  const meta = STATUS_META[sub.status] ?? STATUS_META.no_alloc
                  return (
                    <div key={sub.id} className="flex items-center gap-2.5 px-4 py-2">
                      <Avatar url={sub.avatar_url} name={sub.name} size={30} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-700 truncate">{sub.name}
                          {sub.employee_code && <span className="text-slate-300 font-normal text-[10px] ml-1">{sub.employee_code}</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {sub.position || "—"}
                          {sub.brand_count > 0 && <span className="ml-1">· {sub.brand_count} แบรนด์</span>}
                          {sub.status === "incomplete" && <span className="ml-1 text-orange-500">· รวม {sub.alloc_sum}%</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                        <meta.icon size={10} /> {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
