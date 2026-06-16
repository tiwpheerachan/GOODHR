"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import {
  Users, Search, Upload, Sparkles, Loader2, X, Check, Link2, Unlink,
  CheckCircle2, AlertCircle, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Building2, Phone, Mail, Hash, ShieldCheck, BadgeCheck, ChevronDown,
  Tag, User, Calendar, MapPin, Briefcase, Eye, GraduationCap, Globe, Target, Shield,
} from "lucide-react"

// ── Region → emoji flag ──
const REGION_FLAG: Record<string, string> = {
  Thailand: "🇹🇭",
  China: "🇨🇳",
  Indonesia: "🇮🇩",
  Philippines: "🇵🇭",
  Brazil: "🇧🇷",
  Vietnam: "🇻🇳",
  Malaysia: "🇲🇾",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Saudi: "🇸🇦",
  Other: "🌐",
}

// ── Match method meta ──
const METHOD_META: Record<string, { label: string; color: string; icon: string }> = {
  email:    { label: "Email match",    color: "bg-emerald-500", icon: "📧" },
  phone:    { label: "Phone match",    color: "bg-blue-500",    icon: "📞" },
  nickname: { label: "Nickname match", color: "bg-purple-500",  icon: "👤" },
  code:     { label: "Existing code",  color: "bg-indigo-500",  icon: "🔑" },
  name_en:  { label: "EN name match",  color: "bg-cyan-500",    icon: "🌐" },
  manual:   { label: "Manual link",    color: "bg-amber-500",   icon: "✋" },
}

function brandPillColor(brand: string): string {
  const u = brand.toUpperCase()
  if (u.includes("DDPAI")) return "bg-blue-100 text-blue-700"
  if (u.includes("ANKER")) return "bg-sky-100 text-sky-700"
  if (u.includes("DREAME")) return "bg-purple-100 text-purple-700"
  if (u.includes("WANBO")) return "bg-amber-100 text-amber-700"
  if (u.includes("AKASO")) return "bg-rose-100 text-rose-700"
  if (u.includes("MOVA")) return "bg-emerald-100 text-emerald-700"
  if (u.includes("VINKO")) return "bg-teal-100 text-teal-700"
  if (u.includes("XIAOMI") || u.includes("70MAI")) return "bg-orange-100 text-orange-700"
  if (u.includes("MOLLY")) return "bg-pink-100 text-pink-700"
  if (u.includes("LEVOIT")) return "bg-cyan-100 text-cyan-700"
  if (u.includes("JIMMY") || u.includes("JISULIFE")) return "bg-yellow-100 text-yellow-800"
  if (u.includes("SOUNDCORE")) return "bg-violet-100 text-violet-700"
  return "bg-slate-100 text-slate-700"
}
import toast from "react-hot-toast"
import { format } from "date-fns"

type FUser = {
  id: string
  feishu_user_id: string
  feishu_user_id_modified: string | null
  name: string
  name_cn: string | null
  name_en: string | null
  name_jp: string | null
  nickname: string | null
  english_name_custom: string | null
  employee_number: string | null
  email: string | null
  email_work: string | null
  email_business: string | null
  phone: string | null
  department_path: string | null
  job_title: string | null
  workforce_type: string | null
  start_date: string | null
  gender: string | null
  city: string | null
  status: string | null
  brand: string | null
  mentor: string | null
  direct_manager_raw: string | null
  imported_at: string | null
  last_imported_batch: string | null
  match_note: string | null
  matched_at: string | null
  goodhr_employee_id: string | null
  match_method: string | null
  match_confidence: number | null
  manually_verified: boolean
  goodhr?: {
    id: string
    employee_code: string
    first_name_th: string
    last_name_th: string
    nickname: string | null
    avatar_url: string | null
    department?: { name: string } | null
    position?: { name: string } | null
  } | null
}

export default function FeishuUsersPage() {
  const [users, setUsers] = useState<FUser[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)
  const [importing, setImporting] = useState(false)
  const [autoMatching, setAutoMatching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [editing, setEditing] = useState<FUser | null>(null)
  const [viewing, setViewing] = useState<FUser | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const PER_PAGE = 50

  // ── Advanced filters ──
  const [fCountry, setFCountry] = useState<string[]>([])
  const [fMethod, setFMethod] = useState<string[]>([])
  const [fBrand, setFBrand] = useState<string>("")
  const [fCompanyUnit, setFCompanyUnit] = useState<string>("")
  const [fDept, setFDept] = useState<string>("")

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter, q,
        limit: String(PER_PAGE),
        offset: String(page * PER_PAGE),
      })
      if (fCountry.length > 0) params.set("country", fCountry.join(","))
      if (fMethod.length > 0) params.set("match_method", fMethod.join(","))
      if (fBrand) params.set("brand", fBrand)
      if (fCompanyUnit) params.set("company_unit", fCompanyUnit)
      if (fDept) params.set("department", fDept)
      const res = await fetch(`/api/feishu-users?${params}`)
      const d = await res.json()
      if (res.ok) {
        setUsers(d.users ?? [])
        setTotal(d.total ?? 0)
        setSummary(d.summary ?? {})
      } else toast.error(d.error || "โหลดไม่สำเร็จ")
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [filter, q, page, fCountry, fMethod, fBrand, fCompanyUnit, fDept])

  const clearFilters = () => {
    setFCountry([]); setFMethod([]); setFBrand(""); setFCompanyUnit(""); setFDept(""); setPage(0)
  }
  const activeFilterCount = fCountry.length + fMethod.length + (fBrand ? 1 : 0) + (fCompanyUnit ? 1 : 0) + (fDept ? 1 : 0)

  const onImport = async (file: File) => {
    setImporting(true)
    const t = toast.loading("กำลัง import...")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/feishu-users/import", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ล้มเหลว", { id: t }); return }
      toast.success(`Import ${d.imported}/${d.total} รายการ`, { id: t })
      await load()
    } finally { setImporting(false) }
  }

  // ── ซิงค์จาก Feishu API ──
  const onSyncFromFeishu = async () => {
    if (!confirm("ดึงบัญชี Feishu ทั้งหมดจาก Feishu Contacts API?\n• ใช้เวลา ~15-30 วินาที\n• Upsert ทุกบัญชีที่ดึงมาได้\n• คนที่หายไปจาก Feishu จะถูก mark inactive\n• Auto-match จะรันต่อท้ายอัตโนมัติ")) return
    setSyncing(true)
    const t = toast.loading("กำลังดึงข้อมูลจาก Feishu...")
    try {
      const res = await fetch("/api/feishu-users/sync-from-feishu", { method: "POST" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ซิงค์ล้มเหลว", { id: t, duration: 6000 }); return }
      const am = d.auto_match
      setLastSyncAt(d.fetched_at || new Date().toISOString())
      toast.success(
        `Sync สำเร็จ · ${d.upserted} บัญชี${d.marked_inactive > 0 ? ` · mark inactive ${d.marked_inactive}` : ""}${am ? ` · auto-match ${am.updated} คน` : ""}`,
        { id: t, duration: 5000 },
      )
      await load()
    } catch (e: any) {
      toast.error(e?.message || "เครือข่ายมีปัญหา", { id: t })
    } finally { setSyncing(false) }
  }

  const onAutoMatch = async () => {
    if (!confirm("รัน auto-match ทุก record ที่ยังไม่ได้ยืนยัน? (manually verified จะไม่ถูกแตะ)")) return
    setAutoMatching(true)
    const t = toast.loading("กำลังจับคู่อัตโนมัติ...")
    try {
      const res = await fetch("/api/feishu-users/auto-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ล้มเหลว", { id: t }); return }
      const s = d.summary
      toast.success(
        `อัพเดต ${s.updated} · email ${s.matched.email} · nick ${s.matched.nickname_en + s.matched.nickname_th} · name_en ${s.matched.name_en}`,
        { id: t, duration: 5000 },
      )
      await load()
    } finally { setAutoMatching(false) }
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  const matchRate = summary.match_rate ?? 0
  const regions: any[] = summary.by_region ?? []
  const methods: any[] = summary.by_method ?? []
  const topBrands: any[] = summary.top_brands ?? []

  return (
    <div className="space-y-4 pb-12">

      {/* ─── Top header bar ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-sm">
            <Link2 size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Feishu Mapping</h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
              เชื่อมข้อมูลพนักงานจาก Feishu Contacts กับ GoodHR ด้วย Feishu User ID
              {lastSyncAt && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  <RefreshCw size={8}/> ซิงค์ {new Date(lastSyncAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={load} title="Refresh"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-500" : "text-slate-500"}/>
          </button>
          {/* Sync จาก Feishu Contacts API — ปุ่มหลัก */}
          <button onClick={onSyncFromFeishu} disabled={syncing}
            title="ดึงสดจาก Feishu Contacts API · upsert ทั้ง 706 บัญชี · auto-match อัตโนมัติ"
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm">
            {syncing ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
            ซิงค์จาก Feishu
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50">
            {importing ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
            Import XLSX
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = "" }}/>
          <button onClick={onAutoMatch} disabled={autoMatching}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm">
            {autoMatching ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
            Auto-match
          </button>
        </div>
      </div>

      {/* ─── KPI Grid (5 cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Users size={16}/>} color="indigo" label="ทั้งหมด" value={summary.total ?? 0} sub="บัญชี Feishu"/>
        <KpiCard icon={<CheckCircle2 size={16}/>} color="emerald" label="เชื่อมแล้ว" value={summary.matched ?? 0} sub={`${matchRate}% match rate`} progress={matchRate}/>
        <KpiCard icon={<AlertCircle size={16}/>} color="rose" label="ยังไม่ map" value={summary.unmatched ?? 0} sub="คนจีน/บราซิล ส่วนใหญ่"/>
        <KpiCard icon={<ShieldCheck size={16}/>} color="amber" label="Verified" value={summary.verified ?? 0} sub="ยืนยันด้วยตนเอง"/>
        <KpiCard icon={<BadgeCheck size={16}/>} color="sky" label="Active" value={summary.active ?? 0} sub={`Inactive ${summary.inactive ?? 0}`}/>
      </div>

      {/* ─── Filter Bar (เต็ม + ละเอียด) ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2">
        {/* Search + status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Search size={13} className="text-slate-400"/>
            <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }}
              placeholder="ค้นชื่อ (ไทย/อังกฤษ/จีน) · รหัส · email · เบอร์ · Feishu ID..."
              className="flex-1 bg-transparent outline-none text-sm"/>
            {q && <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-700"><X size={13}/></button>}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
            {[
              { v: "all", l: "ทั้งหมด", c: "indigo" },
              { v: "matched", l: "Matched", c: "emerald" },
              { v: "unmatched", l: "Unmatched", c: "rose" },
              { v: "verified", l: "Verified", c: "amber" },
            ].map(b => (
              <button key={b.v} onClick={() => { setFilter(b.v); setPage(0) }}
                className={"px-3 py-1.5 rounded-lg text-[11px] font-black transition " +
                  (filter === b.v ? `bg-white shadow text-${b.c}-700` : "text-slate-500 hover:text-slate-700")}>
                {b.l}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed filters row */}
        <div className="flex items-stretch gap-2 flex-wrap pt-2 border-t border-slate-100">
          {/* Country (multi-select) */}
          <FilterMulti
            icon="🌐" label="ประเทศ"
            options={regions.map((r: any) => ({ value: r.key, label: `${REGION_FLAG[r.key] ?? "🌐"} ${r.key}`, count: r.total }))}
            selected={fCountry} onChange={(v: string[]) => { setFCountry(v); setPage(0) }}/>

          {/* Match method (multi-select) */}
          <FilterMulti
            icon="🎯" label="วิธี Match"
            options={methods.map((m: any) => ({ value: m.key, label: `${METHOD_META[m.key]?.icon ?? "🔗"} ${METHOD_META[m.key]?.label ?? m.key}`, count: m.count }))}
            selected={fMethod} onChange={(v: string[]) => { setFMethod(v); setPage(0) }}/>

          {/* Brand (single string contains) */}
          <FilterSingle
            icon="🏷️" label="แบรนด์"
            options={topBrands.map((b: any) => ({ value: b.key, label: b.key, count: b.count }))}
            selected={fBrand} onChange={(v: string) => { setFBrand(v); setPage(0) }}
            withInput placeholder="ค้น/เลือกแบรนด์..."/>

          {/* Company unit (Brazil Business Mgmt Center etc.) */}
          <FilterSingle
            icon="🏢" label="หน่วยธุรกิจ"
            options={(summary.company_units ?? []).map((c: any) => ({ value: c.key, label: c.key, count: c.count }))}
            selected={fCompanyUnit} onChange={(v: string) => { setFCompanyUnit(v); setPage(0) }}
            withInput placeholder="ค้นหน่วยธุรกิจ..."/>

          {/* Department (last 2 levels) */}
          <FilterSingle
            icon="📁" label="แผนก"
            options={(summary.departments ?? []).map((c: any) => ({ value: c.key, label: c.key, count: c.count }))}
            selected={fDept} onChange={(v: string) => { setFDept(v); setPage(0) }}
            withInput placeholder="ค้นแผนก..."/>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="ml-auto px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black rounded-xl flex items-center gap-1 border border-rose-200">
              <X size={12}/> ล้างฟิลเตอร์ ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Active filter chips summary */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase">กรองตาม:</span>
            {fCountry.map(c => (
              <ActiveChip key={`c-${c}`} label={`🌐 ${c}`} onRemove={() => setFCountry(fCountry.filter(x => x !== c))}/>
            ))}
            {fMethod.map(m => (
              <ActiveChip key={`m-${m}`} label={`🎯 ${METHOD_META[m]?.label ?? m}`} onRemove={() => setFMethod(fMethod.filter(x => x !== m))}/>
            ))}
            {fBrand && <ActiveChip label={`🏷️ ${fBrand}`} onRemove={() => setFBrand("")}/>}
            {fCompanyUnit && <ActiveChip label={`🏢 ${fCompanyUnit.slice(0, 40)}${fCompanyUnit.length > 40 ? "…" : ""}`} onRemove={() => setFCompanyUnit("")}/>}
            {fDept && <ActiveChip label={`📁 ${fDept.slice(0, 40)}${fDept.length > 40 ? "…" : ""}`} onRemove={() => setFDept("")}/>}
            <span className="ml-auto text-[10px] font-black text-slate-500">พบ {total.toLocaleString()} ราย</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-indigo-400"/>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 text-slate-300"/>
            <p className="font-black text-slate-700">ไม่พบข้อมูล</p>
            <p className="text-xs mt-1">{filter === "all" ? "ลอง import XLSX จาก Feishu Contacts" : "ลองเปลี่ยน filter"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <Th>ผู้ใช้ Feishu</Th>
                  <Th>รหัส / Email</Th>
                  <Th>แผนก / ตำแหน่ง</Th>
                  <Th>GoodHR Match</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <UserRow key={u.id} user={u}
                    onEdit={() => setEditing(u)}
                    onView={() => setViewing(u)}
                    onChanged={load}/>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-[11px] text-slate-500">
              แสดง {page * PER_PAGE + 1}-{Math.min((page + 1) * PER_PAGE, total)} จาก {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 disabled:opacity-30 hover:bg-white rounded">
                <ChevronLeft size={14}/>
              </button>
              <span className="text-xs font-bold px-3">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 disabled:opacity-30 hover:bg-white rounded">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit drawer (link mapping) */}
      {editing && (
        <MapDrawer user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }}/>
      )}

      {/* Detail drawer (read-only Feishu info) */}
      {viewing && (
        <DetailDrawer user={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { const u = viewing; setViewing(null); setEditing(u) }}/>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Brand parser — split by , / 、 & space และ normalize case
// "Anker 80%, Wanbo 30%" → ["Anker 80%", "Wanbo 30%"]
// "Mova & Vinko" → ["Mova", "Vinko"]
// "DDPAI Jisulife WANBO" → ["DDPAI", "Jisulife", "WANBO"]
// "Xiaomi，Vinko" → ["Xiaomi", "Vinko"] (Chinese comma)
// ════════════════════════════════════════════════════════════════════
function parseBrands(raw: string | null): string[] {
  if (!raw) return []
  // ตัด percentage suffix แล้ว split
  return raw
    .split(/[,/、&、，；;]|\s+(?=[A-Z一-龥])/g)
    .map(s => s.trim())
    .filter(Boolean)
}
const BRAND_COLORS: Record<string, string> = {
  // brand → tailwind bg/text classes
  default: "bg-slate-100 text-slate-700",
}
function brandColor(brand: string): string {
  const upper = brand.toUpperCase()
  if (upper.includes("DDPAI")) return "bg-blue-100 text-blue-700"
  if (upper.includes("ANKER")) return "bg-sky-100 text-sky-700"
  if (upper.includes("DREAME")) return "bg-purple-100 text-purple-700"
  if (upper.includes("WANBO")) return "bg-amber-100 text-amber-700"
  if (upper.includes("AKASO")) return "bg-rose-100 text-rose-700"
  if (upper.includes("MOVA")) return "bg-emerald-100 text-emerald-700"
  if (upper.includes("VINKO")) return "bg-teal-100 text-teal-700"
  if (upper.includes("XIAOMI") || upper.includes("70MAI")) return "bg-orange-100 text-orange-700"
  if (upper.includes("MOLLY")) return "bg-pink-100 text-pink-700"
  if (upper.includes("LEVOIT")) return "bg-cyan-100 text-cyan-700"
  if (upper.includes("JIMMY") || upper.includes("JISULIFE")) return "bg-yellow-100 text-yellow-800"
  if (upper.includes("SOUNDCORE")) return "bg-violet-100 text-violet-700"
  if (upper.includes("UWANT") || upper.includes("PERYSMITH")) return "bg-fuchsia-100 text-fuchsia-700"
  if (upper.includes("TOP")) return "bg-lime-100 text-lime-700"
  if (upper.includes("ZEVIA") || upper.includes("AMAZFIT") || upper.includes("MIBRO")) return "bg-indigo-100 text-indigo-700"
  return BRAND_COLORS.default
}

// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// FilterMulti — dropdown multi-select with counts
// ════════════════════════════════════════════════════════════════════
function FilterMulti({ icon, label, options, selected, onChange }: any) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const filtered = q ? options.filter((o: any) => String(o.label).toLowerCase().includes(q.toLowerCase())) : options
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={"px-3 py-2 bg-slate-50 hover:bg-white border rounded-xl text-xs font-bold flex items-center gap-1.5 transition " +
          (selected.length > 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>
        <span>{icon}</span>
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{selected.length}</span>
        )}
        <ChevronDown size={11} className={"transition " + (open ? "rotate-180" : "")}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-72 max-h-80 overflow-hidden flex flex-col">
            <div className="px-2.5 py-2 border-b border-slate-100">
              <input value={q} onChange={e => setQ(e.target.value)} autoFocus
                placeholder="ค้น..." className="w-full bg-slate-50 px-2 py-1 text-xs rounded-lg outline-none border border-slate-200"/>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {filtered.length === 0 ? <p className="text-center text-xs text-slate-400 py-4">ไม่พบ</p>
                : filtered.map((o: any) => {
                  const checked = selected.includes(o.value)
                  return (
                    <button key={o.value}
                      onClick={() => onChange(checked ? selected.filter((x: any) => x !== o.value) : [...selected, o.value])}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-indigo-50 rounded text-left">
                      <div className={"w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 " +
                        (checked ? "bg-indigo-500 border-indigo-500" : "border-slate-300")}>
                        {checked && <Check size={9} strokeWidth={4} className="text-white"/>}
                      </div>
                      <span className="text-xs font-bold flex-1 truncate">{o.label}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{o.count}</span>
                    </button>
                  )
                })}
            </div>
            {selected.length > 0 && (
              <div className="px-2 py-1.5 border-t border-slate-100">
                <button onClick={() => onChange([])}
                  className="w-full text-[10px] font-bold text-rose-600 hover:bg-rose-50 py-1 rounded">
                  ล้างที่เลือก ({selected.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FilterSingle — single select with optional free text input
// ════════════════════════════════════════════════════════════════════
function FilterSingle({ icon, label, options, selected, onChange, withInput, placeholder }: any) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const filtered = q ? options.filter((o: any) => String(o.label).toLowerCase().includes(q.toLowerCase())) : options
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={"px-3 py-2 bg-slate-50 hover:bg-white border rounded-xl text-xs font-bold flex items-center gap-1.5 transition " +
          (selected ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>
        <span>{icon}</span>
        <span>{label}</span>
        {selected && <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full truncate max-w-[100px]">{selected}</span>}
        <ChevronDown size={11} className={"transition " + (open ? "rotate-180" : "")}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-72 max-h-80 overflow-hidden flex flex-col">
            {withInput && (
              <div className="px-2.5 py-2 border-b border-slate-100 space-y-1">
                <input value={q} onChange={e => setQ(e.target.value)} autoFocus
                  placeholder={placeholder} className="w-full bg-slate-50 px-2 py-1 text-xs rounded-lg outline-none border border-slate-200"/>
                {q.trim() && !options.find((o: any) => o.value === q.trim()) && (
                  <button onClick={() => { onChange(q.trim()); setOpen(false); setQ("") }}
                    className="w-full text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 py-1 rounded">
                    + ใช้ "{q.trim()}" เป็น filter
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-1.5">
              {filtered.length === 0 ? <p className="text-center text-xs text-slate-400 py-4">ไม่พบ</p>
                : filtered.map((o: any) => {
                  const active = selected === o.value
                  return (
                    <button key={o.value}
                      onClick={() => { onChange(active ? "" : o.value); setOpen(false); setQ("") }}
                      className={"w-full flex items-center gap-2 px-2 py-1.5 rounded text-left " +
                        (active ? "bg-indigo-100" : "hover:bg-slate-50")}>
                      {active && <Check size={11} className="text-indigo-600 flex-shrink-0"/>}
                      <span className={"text-xs flex-1 truncate " + (active ? "font-black text-indigo-700" : "font-bold text-slate-700")}>{o.label}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{o.count}</span>
                    </button>
                  )
                })}
            </div>
            {selected && (
              <div className="px-2 py-1.5 border-t border-slate-100">
                <button onClick={() => { onChange(""); setOpen(false) }}
                  className="w-full text-[10px] font-bold text-rose-600 hover:bg-rose-50 py-1 rounded">
                  ล้างที่เลือก
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ActiveChip({ label, onRemove }: any) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:bg-indigo-200 rounded-full p-0.5">
        <X size={9}/>
      </button>
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════
// KPI card — same style as admin dashboard
// ════════════════════════════════════════════════════════════════════
function KpiCard({ icon, color, label, value, sub, progress }: any) {
  const colors: any = {
    indigo:  { ring: "bg-indigo-100 text-indigo-600",   shadow: "shadow-indigo-100/40",  bar: "bg-indigo-500" },
    emerald: { ring: "bg-emerald-100 text-emerald-600", shadow: "shadow-emerald-100/40", bar: "bg-emerald-500" },
    rose:    { ring: "bg-rose-100 text-rose-600",       shadow: "shadow-rose-100/40",    bar: "bg-rose-500" },
    amber:   { ring: "bg-amber-100 text-amber-600",     shadow: "shadow-amber-100/40",   bar: "bg-amber-500" },
    sky:     { ring: "bg-sky-100 text-sky-600",         shadow: "shadow-sky-100/40",     bar: "bg-sky-500" },
  }
  const c = colors[color] ?? colors.indigo
  return (
    <div className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all ${c.shadow}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl ${c.ring} flex items-center justify-center`}>{icon}</div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-800 tabular-nums">{Number(value).toLocaleString()}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      {progress != null && (
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} transition-all`} style={{ width: `${progress}%` }}/>
        </div>
      )}
    </div>
  )
}

function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-[10px] font-black uppercase text-slate-500 ${className}`}>{children}</th>
}

function UserRow({ user, onEdit, onView, onChanged }: { user: FUser; onEdit: () => void; onView: () => void; onChanged: () => void }) {
  const u = user
  const matched = !!u.goodhr
  const initial = u.name_cn?.[0] || u.name_en?.[0] || u.nickname?.[0] || u.name?.[0] || "?"
  const conf = u.match_confidence ?? 0
  const brands = parseBrands(u.brand)

  return (
    <tr className={"hover:bg-slate-50/50 " + (u.manually_verified ? "bg-emerald-50/30" : "")}>
      {/* Feishu user */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-800 truncate flex items-center gap-1">
              {u.name_cn || u.name}
              {u.nickname && <span className="text-[10px] text-rose-500 font-bold">({u.nickname})</span>}
              {u.status === "Active"
                ? <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">Active</span>
                : <span className="text-[8px] font-black bg-slate-200 text-slate-600 px-1 py-0.5 rounded">{u.status || "?"}</span>}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              <span className="text-indigo-500">{u.feishu_user_id}</span>
              {u.name_en && <span className="ml-1.5 text-slate-500">· {u.name_en}</span>}
            </p>
          </div>
        </div>
      </td>

      {/* Code / Email */}
      <td className="px-3 py-2.5">
        {u.employee_number && (
          <p className="font-mono text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Hash size={10} className="text-slate-400"/> {u.employee_number}
          </p>
        )}
        {u.email && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[200px]">
            <Mail size={9} className="text-slate-400 flex-shrink-0"/>{u.email}
          </p>
        )}
        {u.phone && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <Phone size={9} className="flex-shrink-0"/>{u.phone}
          </p>
        )}
      </td>

      {/* Dept / Title / Manager / Brands */}
      <td className="px-3 py-2.5">
        {u.job_title && <p className="text-[11px] font-bold text-slate-700 truncate max-w-[220px]">{u.job_title}</p>}
        {u.department_path && (
          <p className="text-[9px] text-slate-400 truncate max-w-[220px] flex items-center gap-1">
            <Building2 size={9} className="flex-shrink-0"/>
            {u.department_path.split("/").slice(-2).join(" / ")}
          </p>
        )}
        {/* ✅ Direct Manager (resolved leader_name) */}
        {u.direct_manager_raw && (
          <p className="text-[9px] text-indigo-600 font-bold truncate max-w-[220px] flex items-center gap-1 mt-0.5">
            <Shield size={9} className="flex-shrink-0"/>
            หัวหน้า: {u.direct_manager_raw}
          </p>
        )}
        {brands.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1 max-w-[220px]">
            {brands.slice(0, 3).map((b, i) => (
              <span key={i} className={"text-[8px] font-black px-1.5 py-0.5 rounded " + brandColor(b)}>
                {b}
              </span>
            ))}
            {brands.length > 3 && (
              <span className="text-[8px] text-slate-500 px-1">+{brands.length - 3}</span>
            )}
          </div>
        )}
      </td>

      {/* GoodHR match */}
      <td className="px-3 py-2.5">
        {matched ? (
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.goodhr?.avatar_url
                  ? <img src={u.goodhr.avatar_url} alt="" className="w-full h-full object-cover"/>
                  : <span className="text-white text-[10px] font-black">{u.goodhr?.first_name_th?.[0]}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 truncate">
                  {u.goodhr?.first_name_th} {u.goodhr?.last_name_th}
                  {u.goodhr?.nickname && <span className="text-[10px] text-rose-500 ml-1">({u.goodhr.nickname})</span>}
                </p>
                <p className="text-[9px] text-slate-400 font-mono">{u.goodhr?.employee_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {u.manually_verified ? (
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck size={8}/> Verified
                </span>
              ) : (
                <span className={"text-[9px] font-black px-1.5 py-0.5 rounded-full " +
                  (conf >= 90 ? "bg-emerald-100 text-emerald-700"
                  : conf >= 75 ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600")}>
                  {conf}% · {u.match_method}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
            <AlertCircle size={11}/> ยังไม่ map
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={onView} title="ดูรายละเอียด"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">
            <Eye size={12}/>
          </button>
          <button onClick={onEdit}
            className={"px-3 py-1.5 text-[10px] font-black rounded-lg flex items-center gap-1 " +
              (matched ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-indigo-500 hover:bg-indigo-600 text-white")}>
            {matched ? <><Link2 size={11}/> แก้</> : <><Link2 size={11}/> Map</>}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════════
// DetailDrawer — แสดงข้อมูล Feishu user แบบครบทุกฟิลด์
// ════════════════════════════════════════════════════════════════════
function DetailDrawer({ user, onClose, onEdit }: { user: FUser; onClose: () => void; onEdit: () => void }) {
  const u = user
  const brands = parseBrands(u.brand)
  const deptParts = u.department_path?.split("/").map(s => s.trim()).filter(Boolean) ?? []
  const initial = u.name_cn?.[0] || u.name_en?.[0] || u.nickname?.[0] || u.name?.[0] || "?"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header — gradient + avatar */}
        <div className="relative px-5 py-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10"/>
          <div className="absolute bottom-2 right-12 w-16 h-16 rounded-full bg-white/5"/>
          <div className="relative flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-black shadow flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Feishu User Detail</p>
              <h2 className="text-xl font-black mt-0.5 truncate">
                {u.name_cn || u.name}
                {u.nickname && <span className="text-[12px] opacity-80 ml-1.5">({u.nickname})</span>}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-[10px] flex-wrap">
                <span className="font-mono bg-white/15 px-2 py-0.5 rounded-full">
                  {u.feishu_user_id}
                </span>
                {u.status === "Active"
                  ? <span className="bg-emerald-500/40 px-2 py-0.5 rounded-full font-black">✓ Active</span>
                  : <span className="bg-rose-500/40 px-2 py-0.5 rounded-full font-black">{u.status || "?"}</span>}
                {u.workforce_type && <span className="bg-white/15 px-2 py-0.5 rounded-full">{u.workforce_type}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg flex-shrink-0">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Section: Identity (ชื่อหลายภาษา) */}
          <Section icon={<User size={14}/>} title="ชื่อ (Multi-language)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="ชื่อ Default" value={u.name}/>
              {u.name_cn && <Field label="中文" value={u.name_cn}/>}
              {u.name_en && <Field label="English" value={u.name_en}/>}
              {u.name_jp && <Field label="日本語" value={u.name_jp}/>}
              {u.english_name_custom && <Field label="英文名 (custom)" value={u.english_name_custom}/>}
              {u.nickname && <Field label="Nickname" value={u.nickname} highlight/>}
            </div>
          </Section>

          {/* Section: Employee info */}
          <Section icon={<Briefcase size={14}/>} title="ข้อมูลพนักงาน">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {u.employee_number && <Field label="รหัสพนักงาน Feishu" value={u.employee_number} mono/>}
              {u.job_title && <Field label="ตำแหน่ง" value={u.job_title}/>}
              {u.workforce_type && <Field label="ประเภทการจ้าง" value={u.workforce_type}/>}
              {u.start_date && <Field label="วันเริ่มงาน" value={u.start_date} icon={<Calendar size={10}/>}/>}
              {u.gender && <Field label="เพศ" value={u.gender}/>}
              {u.city && <Field label="เมือง" value={u.city} icon={<MapPin size={10}/>}/>}
            </div>
          </Section>

          {/* Section: Department path (breadcrumb) */}
          {deptParts.length > 0 && (
            <Section icon={<Building2 size={14}/>} title="แผนก (Department Path)">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {deptParts.map((p, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className={"px-2.5 py-1 rounded-lg font-bold " +
                      (i === deptParts.length - 1
                        ? "bg-indigo-500 text-white"
                        : i === 0
                        ? "bg-slate-100 text-slate-600"
                        : "bg-slate-50 text-slate-500")}>
                      {p}
                    </span>
                    {i < deptParts.length - 1 && <span className="text-slate-300">/</span>}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Section: Brands (responsibility) */}
          {brands.length > 0 && (
            <Section icon={<Tag size={14}/>} title={`แบรนด์ที่ดูแล (${brands.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b, i) => (
                  <span key={i} className={"text-xs font-black px-2.5 py-1 rounded-lg " + brandColor(b)}>
                    {b}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Section: Contact */}
          <Section icon={<Phone size={14}/>} title="ติดต่อ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {u.email && <Field label="Email หลัก" value={u.email} icon={<Mail size={10}/>}/>}
              {u.email_work && u.email_work !== u.email && <Field label="Work Email" value={u.email_work} icon={<Mail size={10}/>}/>}
              {u.email_business && u.email_business !== u.email && <Field label="Business Email" value={u.email_business} icon={<Mail size={10}/>}/>}
              {u.phone && <Field label="โทรศัพท์" value={u.phone} icon={<Phone size={10}/>}/>}
            </div>
          </Section>

          {/* Section: Management / Mentorship */}
          {(u.mentor || u.direct_manager_raw) && (
            <Section icon={<GraduationCap size={14}/>} title="ลำดับการบริหาร">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {u.direct_manager_raw && <Field label="หัวหน้างานตรง" value={u.direct_manager_raw}/>}
                {u.mentor && <Field label="พี่เลี้ยง (导师)" value={u.mentor}/>}
              </div>
            </Section>
          )}

          {/* Section: GoodHR Mapping */}
          <Section icon={<Link2 size={14}/>} title="GoodHR Mapping">
            {u.goodhr ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 overflow-hidden flex-shrink-0">
                    {u.goodhr.avatar_url
                      ? <img src={u.goodhr.avatar_url} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-white text-sm font-black">{u.goodhr.first_name_th?.[0]}</div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-slate-800">
                      {u.goodhr.first_name_th} {u.goodhr.last_name_th}
                      {u.goodhr.nickname && <span className="text-[11px] text-rose-500 ml-1">({u.goodhr.nickname})</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.goodhr.employee_code}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.manually_verified
                        ? <span className="text-[9px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                        : <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{u.match_confidence}% · {u.match_method}</span>}
                      {u.matched_at && <span className="text-[9px] text-slate-400">{format(new Date(u.matched_at), "d MMM yyyy HH:mm")}</span>}
                    </div>
                    {u.match_note && <p className="text-[10px] text-slate-500 mt-1 italic">"{u.match_note}"</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                <AlertCircle size={20} className="mx-auto mb-1 text-rose-400"/>
                <p className="text-xs font-bold text-rose-700">ยังไม่ได้ map กับ GoodHR</p>
                <p className="text-[10px] text-rose-500 mt-0.5">น่าจะเป็นคนจีน/บราซิลที่ยังไม่อยู่ในระบบ HR ไทย</p>
              </div>
            )}
          </Section>

          {/* Section: System / Audit */}
          <Section icon={<Globe size={14}/>} title="ข้อมูลระบบ">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <Field label="Feishu User ID" value={u.feishu_user_id} mono/>
              {u.feishu_user_id_modified && <Field label="User ID (Revised)" value={u.feishu_user_id_modified} mono/>}
              {u.imported_at && <Field label="Imported" value={format(new Date(u.imported_at), "d MMM yyyy HH:mm")}/>}
              {u.last_imported_batch && <Field label="Batch" value={u.last_imported_batch} mono/>}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">
            ปิด
          </button>
          <button onClick={onEdit}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow">
            <Link2 size={14}/>
            {u.goodhr ? "แก้การ map" : "Map กับ GoodHR"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: any) {
  return (
    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon} {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, value, mono, highlight, icon }: any) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
      <p className={"text-[12px] mt-0.5 flex items-center gap-1 " +
        (highlight ? "font-black text-rose-600" : "font-bold text-slate-700") + " " +
        (mono ? "font-mono" : "")}>
        {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
        <span className="truncate">{value || "—"}</span>
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// MapDrawer — เลือก/ยกเลิก GoodHR employee + ยืนยัน
// ════════════════════════════════════════════════════════════════════
function MapDrawer({ user, onClose, onSaved }: { user: FUser; onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(user.goodhr || null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState("")

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams({
        q: search.trim(),
        limit: "30",
        all_companies: "1",
        include_inactive: "1",
      })
      fetch(`/api/employees/search?${params}`)
        .then(r => r.json())
        .then(d => setResults(d.employees ?? []))
        .catch(() => setResults([]))
    }, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [search])

  const link = async (goodhr_employee_id: string | null, manually_verified: boolean) => {
    setSaving(true)
    try {
      const res = await fetch("/api/feishu-users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feishu_user_id: user.feishu_user_id,
          goodhr_employee_id,
          manually_verified,
          match_note: note || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ"); return }
      toast.success(goodhr_employee_id ? "เชื่อมแล้ว ✓" : "ยกเลิกการเชื่อม")
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 size={16}/>
            <p className="font-black truncate">เชื่อม Feishu User กับ GoodHR</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        {/* Feishu user info */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-sm font-black">
              {user.name_cn?.[0] || user.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">
                {user.name_cn || user.name}
                {user.nickname && <span className="text-rose-500 ml-1 text-xs">({user.nickname})</span>}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Feishu ID: <span className="text-indigo-600">{user.feishu_user_id}</span>
              </p>
              <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                {user.employee_number && <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">{user.employee_number}</span>}
                {user.email && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{user.email}</span>}
                {user.job_title && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{user.job_title}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Search GoodHR */}
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-1.5">ค้น GoodHR Employee</p>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Search size={13} className="text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
              placeholder="พิมพ์ชื่อ / รหัส / ชื่อเล่น (ภาษาไทย/อังกฤษ)..."
              className="flex-1 bg-transparent outline-none text-sm"/>
          </div>
        </div>

        {/* Results / selection */}
        <div className="flex-1 overflow-y-auto p-3">
          {selected ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">เลือกแล้ว</p>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-black">
                  {selected.first_name_th?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{selected.first_name_th} {selected.last_name_th}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selected.employee_code}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 bg-white hover:bg-rose-50 text-rose-500 rounded"><X size={13}/></button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            {results.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400">
                {search ? "ไม่พบ" : "พิมพ์ค้นชื่อด้านบน"}
              </p>
            ) : results.map(e => (
              <button key={e.id} onClick={() => setSelected(e)}
                disabled={selected?.id === e.id}
                className={"w-full text-left p-2.5 rounded-xl border transition " +
                  (selected?.id === e.id
                    ? "bg-emerald-50 border-emerald-300"
                    : "bg-white hover:bg-indigo-50/50 border-slate-200")}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                    {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover rounded-xl"/> : e.first_name_th?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">
                      {e.first_name_th} {e.last_name_th}
                      {e.nickname && <span className="text-rose-500 ml-1 text-xs">({e.nickname})</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      <span className="font-mono">{e.employee_code}</span>
                      {e.position?.name && <> · {e.position.name}</>}
                      {e.department?.name && <> · {e.department.name}</>}
                    </p>
                  </div>
                  {selected?.id === e.id && <Check size={14} className="text-emerald-600"/>}
                </div>
              </button>
            ))}
          </div>

          <label className="block mt-3">
            <span className="text-[10px] font-black text-slate-500 uppercase">หมายเหตุ (ไม่บังคับ)</span>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="เช่น 'ยืนยันด้วยตัวเองหลังตรวจสอบ HR file'"
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
          </label>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          {user.goodhr_employee_id && (
            <button onClick={() => link(null, false)} disabled={saving}
              className="px-3 py-2.5 bg-white hover:bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-black rounded-xl flex items-center gap-1.5">
              <Unlink size={12}/> ยกเลิกเชื่อม
            </button>
          )}
          <button onClick={onClose}
            className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">
            ปิด
          </button>
          <button onClick={() => link(selected?.id || null, true)} disabled={!selected || saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <BadgeCheck size={14}/>}
            ยืนยัน (manually verified)
          </button>
        </div>
      </div>
    </div>
  )
}
