"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, LayoutDashboard, ClipboardList, Store, Send, Layers, Plus, Trash2, Search,
  MapPin, Camera, X, Loader2, Users, TrendingUp, Package, Image as ImageIcon, Edit2, Check,
  Calendar, ExternalLink, FileDown, Building2, RotateCcw, Archive, Paperclip,
  File as FileIcon, FileArchive, Map as MapIcon,
} from "lucide-react"
import dynamic from "next/dynamic"
import { exportChecklistXlsx } from "@/lib/utils/store-checklist-export"
import { downloadChecklistZip } from "@/lib/utils/store-checklist-zip"

const StoreChecklistMap = dynamic(() => import("@/components/StoreChecklistMap"), { ssr: false, loading: () => <div className="h-80 bg-slate-100 rounded-xl animate-pulse" /> })

// รายชื่อบริษัท (แชร์ทุกแท็บ)
function CompanySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([])
  useEffect(() => { fetch("/api/branch-eval/store-checklist/companies").then(r => r.json()).then(res => setCompanies(res.companies ?? [])) }, [])
  if (companies.length <= 1) return null
  return (
    <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-2.5 py-2 shadow-sm">
      <Building2 size={14} className="text-slate-400" />
      <select value={value} onChange={e => onChange(e.target.value)} className="text-xs text-slate-600 outline-none bg-transparent max-w-[140px]">
        <option value="">ทุกบริษัท</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
      </select>
    </div>
  )
}

type Tab = "dashboard" | "submissions" | "dealers" | "assignments" | "templates"

const TABS: { k: Tab; label: string; icon: any }[] = [
  { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { k: "submissions", label: "บันทึก", icon: ClipboardList },
  { k: "dealers", label: "ทะเบียนร้าน", icon: Store },
  { k: "assignments", label: "มอบหมาย", icon: Send },
  { k: "templates", label: "แบบฟอร์ม", icon: Layers },
]

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const fullName = (e: any) => e ? `${e.first_name_th || ""} ${e.last_name_th || ""}`.trim() + (e.nickname ? ` (${e.nickname})` : "") : "—"

export default function StoreChecklistAdmin() {
  const [tab, setTab] = useState<Tab>("dashboard")
  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200/70 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-3.5 flex items-center gap-3">
            <Link href="/admin/branch-eval" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-teal-50 grid place-items-center text-teal-600"><Store size={18} /></div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">เช็คลิสต์ร้านค้า</h1>
              <p className="text-[11px] text-slate-400 leading-tight">เข้าเยี่ยมร้าน · Dealer · รูป + GPS</p>
            </div>
          </div>
          {/* Segmented tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition ${tab === t.k ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "dealers" && <DealersTab />}
        {tab === "assignments" && <AssignmentsTab />}
        {tab === "templates" && <TemplatesTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════ DASHBOARD ═══════════════════════════
function DashboardTab() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(todayStr())
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)
  const [companyId, setCompanyId] = useState("")
  useEffect(() => {
    setLoading(true)
    const cq = companyId ? `&company_id=${companyId}` : ""
    fetch(`/api/branch-eval/store-checklist/dashboard?from=${from}&to=${to}${cq}`).then(r => r.json())
      .then(setD).finally(() => setLoading(false))
  }, [from, to, companyId])
  const pick = (n: number) => { setRange(n); setFrom(daysAgo(n)); setTo(todayStr()) }

  const cov = d?.coverage
  return (
    <div className="space-y-4">
      {/* Range picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm">
          {[7, 30, 90].map(n => (
            <button key={n} onClick={() => pick(n)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${range === n ? "bg-teal-500 text-white" : "text-slate-500 hover:text-slate-700"}`}>{n} วัน</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-2.5 py-1.5 shadow-sm">
          <Calendar size={14} className="text-slate-400" />
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setRange(0) }} className="text-xs text-slate-600 outline-none w-28" />
          <span className="text-slate-300">→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setRange(0) }} className="text-xs text-slate-600 outline-none w-28" />
        </div>
        <CompanySelect value={companyId} onChange={setCompanyId} />
      </div>

      {loading && !d ? <DashSkeleton /> : !d ? null : (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <div className="space-y-4">
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={<ClipboardList size={16} />} color="teal" label="เข้าเยี่ยม (ครั้ง)" value={cov.totalSubmissions} />
              <Kpi icon={<Store size={16} />} color="emerald" label="ร้านที่เข้า" value={`${cov.uniqueDealers}/${cov.totalDealers}`}
                sub={cov.totalDealers ? `ครอบคลุม ${Math.round(cov.uniqueDealers / cov.totalDealers * 100)}%` : undefined} />
              <Kpi icon={<Users size={16} />} color="sky" label="ผู้เข้าเยี่ยม" value={cov.byEmployee.length} />
              <Kpi icon={<MapPin size={16} />} color="amber" label="ปักหมุด GPS" value={cov.gpsPoints.length} />
            </div>

            {/* แผนที่หมุด GPS */}
            {cov.gpsPoints.length > 0 && (
              <Card title={`แผนที่จุดเข้าเยี่ยม (${cov.gpsPoints.length})`} icon={<MapIcon size={15} />}>
                <StoreChecklistMap points={cov.gpsPoints} />
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-3">
              <Card title="แยกตามผู้เข้าเยี่ยม" icon={<Users size={15} />}>
                <RankList items={cov.byEmployee.map((e: any) => ({ label: e.name, value: e.count }))} unit="ครั้ง" />
              </Card>
              <Card title="แยกตามเขต / พื้นที่" icon={<MapPin size={15} />}>
                <RankList items={cov.byArea.map((a: any) => ({ label: a.area, value: a.count }))} unit="ครั้ง" color="emerald" />
              </Card>
            </div>

            <Card title="คู่แข่ง (Competitor) — เฉลี่ยราคา / GP" icon={<TrendingUp size={15} />}>
              {d.competitor.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="py-2 px-1 font-semibold">Brand</th><th className="font-semibold">พบ</th><th className="font-semibold">ปลีกเฉลี่ย</th><th className="font-semibold">ส่งเฉลี่ย</th><th className="font-semibold">GP%</th>
                    </tr></thead>
                    <tbody>
                      {d.competitor.map((c: any) => (
                        <tr key={c.brand} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="py-2 px-1 font-semibold text-slate-700">{c.brand}</td>
                          <td className="text-slate-500">{c.count}</td>
                          <td className="text-slate-600">{c.avgRetail ? c.avgRetail.toLocaleString() : "—"}</td>
                          <td className="text-slate-600">{c.avgWholesale ? c.avgWholesale.toLocaleString() : "—"}</td>
                          <td className="text-slate-600">{c.avgGp ? `${c.avgGp}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid lg:grid-cols-2 gap-3">
              <Card title="POSM ที่พบในร้าน" icon={<Package size={15} />}>
                {d.stockOrder.posm.length === 0 ? <Empty /> : (
                  <div className="space-y-2">
                    {d.stockOrder.posm.map((p: any) => (
                      <div key={p.opt} className="flex items-center gap-2.5">
                        <span className="text-xs text-slate-600 w-24 truncate">{p.opt}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-teal-400 to-teal-500 h-full rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 w-16 text-right tabular-nums">{p.count} · {p.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Stock / Order รวม" icon={<Package size={15} />}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Stock" value={d.stockOrder.totalStockQty.toLocaleString()} />
                  <Stat label="Order" value={d.stockOrder.totalOrderQty.toLocaleString()} />
                  <Stat label="มูลค่า Order" value={`฿${Math.round(d.stockOrder.totalOrderValue).toLocaleString()}`} />
                </div>
              </Card>
            </div>

            <Card title="ล่าสุด — รูป + สรุป / ปัญหา" icon={<ImageIcon size={15} />}>
              {d.recent.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100">
                  {d.recent.map((r: any) => (
                    <div key={r.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm text-slate-700 truncate">{r.dealer} {r.zone && <span className="text-xs font-normal text-slate-400">· {r.zone}</span>}</div>
                        <div className="text-[11px] text-slate-400 whitespace-nowrap">{r.date} · {r.by}</div>
                      </div>
                      {r.summary && <div className="text-[13px] text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{r.summary}</div>}
                      {r.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {r.photos.map((p: any, i: number) => (
                            <a key={i} href={p.url} target="_blank" rel="noreferrer" className="group relative">
                              <img src={p.url} className="w-16 h-16 object-cover rounded-lg border border-slate-200 group-hover:opacity-90" alt="" />
                            </a>
                          ))}
                          {r.photoCount > r.photos.length && <span className="text-xs text-slate-400 self-end pb-1">+{r.photoCount - r.photos.length}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════ SUBMISSIONS ═══════════════════════════
type SubScope = "submitted" | "draft" | "trash"
function SubmissionsTab() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(todayStr())
  const [q, setQ] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [scope, setScope] = useState<SubScope>("submitted")
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [zipping, setZipping] = useState(false)
  const first = useRef(true)
  const params = () => {
    const p = new URLSearchParams({ from, to })
    if (companyId) p.set("company_id", companyId)
    if (scope === "trash") p.set("deleted", "1")
    else p.set("status", scope)
    return p.toString()
  }
  const load = () => {
    setLoading(true)
    fetch(`/api/branch-eval/store-checklist/submissions?${params()}`).then(r => r.json())
      .then(res => setSubs(res.submissions ?? [])).finally(() => { setLoading(false); first.current = false })
  }
  useEffect(load, [from, to, companyId, scope])   // eslint-disable-line
  const match = (s: any) => {
    if (!q.trim()) return true
    const t = q.toLowerCase()
    return (s.dealer_name || s.dealer?.name || "").toLowerCase().includes(t) || (s.submitter_name || "").toLowerCase().includes(t)
  }
  const shown = subs.filter(match)
  const fetchFull = async () => {
    const res = await fetch(`/api/branch-eval/store-checklist/submissions?${params()}&full=1`).then(r => r.json())
    return (res.submissions ?? []).filter(match)
  }
  const exportXlsx = async () => {
    setExporting(true)
    try {
      const rows = await fetchFull()
      if (rows.length === 0) { alert("ไม่มีรายการให้ดาวน์โหลด"); return }
      exportChecklistXlsx(rows, `เช็คลิสต์ร้านค้า_${from}_ถึง_${to}.xlsx`)
    } finally { setExporting(false) }
  }
  const zip = async () => {
    setZipping(true)
    try {
      const rows = await fetchFull()
      const n = await downloadChecklistZip(rows, `เช็คลิสต์ร้านค้า_รูป_${from}_ถึง_${to}.zip`)
      if (n === 0) alert("ไม่มีรูป/ไฟล์ให้ดาวน์โหลด")
    } finally { setZipping(false) }
  }
  const del = async (s: any, hard = false) => {
    if (!confirm(hard ? "ลบถาวร? (กู้คืนไม่ได้ และลบไฟล์ทิ้ง)" : "ย้ายไปถังขยะ?")) return
    await fetch(`/api/branch-eval/store-checklist/submissions?id=${s.id}${hard ? "&hard=1" : ""}`, { method: "DELETE" }); load()
  }
  const restore = async (s: any) => {
    await fetch("/api/branch-eval/store-checklist/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, restore: true }) }); load()
  }
  const SCOPES: { k: SubScope; l: string }[] = [{ k: "submitted", l: "ส่งแล้ว" }, { k: "draft", l: "ร่าง" }, { k: "trash", l: "ถังขยะ" }]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm">
          {SCOPES.map(sc => (
            <button key={sc.k} onClick={() => setScope(sc.k)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${scope === sc.k ? "bg-teal-500 text-white" : "text-slate-500 hover:text-slate-700"}`}>
              {sc.k === "trash" && <Archive size={12} />}{sc.l}</button>
          ))}
        </div>
        <CompanySelect value={companyId} onChange={setCompanyId} />
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหาร้าน / ผู้บันทึก" className="flex-1 min-w-[160px]" />
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-2.5 py-2 shadow-sm">
          <Calendar size={14} className="text-slate-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-xs text-slate-600 outline-none w-28" />
          <span className="text-slate-300">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-xs text-slate-600 outline-none w-28" />
        </div>
        <button onClick={exportXlsx} disabled={exporting || subs.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-sm px-3 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0">
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Excel
        </button>
        <button onClick={zip} disabled={zipping || subs.length === 0}
          className="bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-sm px-3 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0">
          {zipping ? <Loader2 size={15} className="animate-spin" /> : <FileArchive size={15} />} รูป (zip)
        </button>
      </div>
      {loading && first.current ? <ListSkeleton /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {shown.length === 0 ? <Empty label={q ? "ไม่พบรายการที่ค้นหา" : scope === "trash" ? "ถังขยะว่าง" : scope === "draft" ? "ไม่มีร่าง" : "ยังไม่มีบันทึกในช่วงนี้"} /> : shown.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition">
              <button onClick={() => setView(s.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-9 h-9 rounded-xl bg-teal-50 grid place-items-center text-teal-600 shrink-0"><Store size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 truncate">{s.dealer_name || s.dealer?.name || "—"}
                    {s.dealer?.is_new && <Chip tone="emerald">ใหม่</Chip>}
                    {s.status === "draft" && <Chip tone="slate">ร่าง</Chip>}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                    <span>{s.visit_date}</span><span className="text-slate-300">·</span><span>{s.submitter_name}</span>
                    {s.template?.name && <><span className="text-slate-300">·</span><span>{s.template.name}</span></>}
                    {(s.photos?.length ?? 0) > 0 && <span className="flex items-center gap-0.5 text-slate-400"><Camera size={11} /> {s.photos.length}</span>}
                    {(s.files?.length ?? 0) > 0 && <span className="flex items-center gap-0.5 text-slate-400"><Paperclip size={11} /> {s.files.length}</span>}
                    {s.lat != null && <MapPin size={11} className="text-emerald-500" />}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {scope === "trash" ? (
                  <>
                    <button onClick={() => restore(s)} title="กู้คืน" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><RotateCcw size={15} /></button>
                    <button onClick={() => del(s, true)} title="ลบถาวร" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </>
                ) : (
                  <>
                    <a href={`/app/store-checklist/new?edit=${s.id}`} title="แก้ไข" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={15} /></a>
                    <button onClick={() => del(s)} title="ย้ายถังขยะ" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {view && <SubmissionModal id={view} onClose={() => setView(null)} />}
    </div>
  )
}

function SubmissionModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [s, setS] = useState<any>(null)
  useEffect(() => { fetch(`/api/branch-eval/store-checklist/submissions?id=${id}`).then(r => r.json()).then(res => setS(res.submission)) }, [id])
  return (
    <Modal onClose={onClose} title={s?.dealer_name || "รายละเอียด"}>
      {!s ? <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div> : (
        <div className="p-4 space-y-4 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1.5 flex-1">
              <Chip tone="slate">{s.visit_date}</Chip>
              <Chip tone="slate">{s.submitter_name}</Chip>
              {s.template?.name && <Chip tone="teal">{s.template.name}</Chip>}
              {s.status === "draft" && <Chip tone="amber" solid>ร่าง</Chip>}
            </div>
            <a href={`/app/store-checklist/new?edit=${s.id}`} className="text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Edit2 size={12} /> แก้ไข</a>
          </div>
          {s.dealer && <div className="text-xs text-slate-500">{[s.dealer.store_type, s.dealer.zone, s.dealer.area].filter(Boolean).join(" / ")}</div>}
          {(s.lat != null) && (
            <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100">
              <MapPin size={13} /> {s.location_name || "ดูตำแหน่งบนแผนที่"} <ExternalLink size={11} /></a>
          )}
          <DataView data={s.data} />
          {Array.isArray(s.photos) && s.photos.length > 0 && (
            <div>
              <SectionLabel><Camera size={13} /> รูป ({s.photos.length})</SectionLabel>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {s.photos.map((p: any, i: number) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block">
                    <img src={p.url} className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90" alt="" />
                    {p.caption && <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.caption}</div>}
                  </a>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(s.files) && s.files.length > 0 && (
            <div>
              <SectionLabel><Paperclip size={13} /> ไฟล์แนบ ({s.files.length})</SectionLabel>
              <div className="space-y-1.5">
                {s.files.map((f: any, i: number) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2 hover:bg-slate-100">
                    <FileIcon size={15} className="text-slate-400 shrink-0" />
                    <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{f.name}</span>
                    <ExternalLink size={12} className="text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function DataView({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([k, v]) => {
        if (v == null || v === "") return null
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
          const filled = (v as any[]).filter(row => Object.values(row).some(x => x !== "" && x != null))
          if (filled.length === 0) return null
          const cols = Object.keys(filled[0])
          return (
            <div key={k}>
              <SectionLabel>{k}</SectionLabel>
              <div className="overflow-x-auto rounded-lg border border-slate-100"><table className="w-full text-xs">
                <thead><tr className="bg-slate-50 text-slate-500">{cols.map(c => <th key={c} className="px-2 py-1.5 text-left font-medium border-b border-slate-100">{c}</th>)}</tr></thead>
                <tbody>{filled.map((row, i) => <tr key={i} className="border-b border-slate-50 last:border-0">{cols.map(c => <td key={c} className="px-2 py-1.5 text-slate-600">{String(row[c] ?? "")}</td>)}</tr>)}</tbody>
              </table></div>
            </div>
          )
        }
        if (Array.isArray(v)) {
          const items = (v as any[]).filter(Boolean)
          if (items.length === 0) return null
          return <div key={k}><span className="text-xs font-semibold text-slate-400">{k}: </span><span className="text-slate-700">{items.join(", ")}</span></div>
        }
        if (typeof v === "object" && "selected" in (v as any)) {
          const o = v as any
          const chips = [...(o.selected || [])]; if (o.other) chips.push(o.other)
          if (chips.length === 0) return null
          return <div key={k}><SectionLabel>{k}</SectionLabel><div className="flex flex-wrap gap-1">{chips.map((c: string, i: number) => <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{c}</span>)}</div></div>
        }
        return <div key={k}><span className="text-xs font-semibold text-slate-400">{k}: </span><span className="text-slate-700 whitespace-pre-wrap">{String(v)}</span></div>
      })}
    </div>
  )
}

// ═══════════════════════════ DEALERS ═══════════════════════════
function DealersTab() {
  const [list, setList] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [firstLoad, setFirstLoad] = useState(true)
  const [searching, setSearching] = useState(false)
  const [edit, setEdit] = useState<any>(null)
  useEffect(() => {
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/branch-eval/store-checklist/dealers?q=${encodeURIComponent(q)}&active=0`).then(r => r.json())
        .then(res => setList(res.dealers ?? [])).finally(() => { setSearching(false); setFirstLoad(false) })
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  const reload = () => { setQ(q => q); setSearching(true); fetch(`/api/branch-eval/store-checklist/dealers?q=${encodeURIComponent(q)}&active=0`).then(r => r.json()).then(res => setList(res.dealers ?? [])).finally(() => setSearching(false)) }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SearchBox value={q} onChange={setQ} loading={searching} placeholder="ค้นหาร้าน · เขต · ผู้ติดต่อ" className="flex-1" />
        <button onClick={() => setEdit({})} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm transition"><Plus size={16} /> เพิ่มร้าน</button>
      </div>
      {firstLoad ? <ListSkeleton /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {list.length === 0 ? <Empty label={q ? "ไม่พบร้านที่ค้นหา" : "ยังไม่มีร้านในทะเบียน"} /> : list.map(d => (
            <div key={d.id} className={`px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition ${!d.active ? "opacity-50" : ""}`}>
              <div className="w-9 h-9 rounded-xl bg-teal-50 grid place-items-center text-teal-600 shrink-0"><Store size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">{d.name}
                  {d.is_new && <Chip tone="emerald">ใหม่</Chip>}
                  {!d.active && <Chip tone="slate">ปิดใช้</Chip>}</div>
                <div className="text-xs text-slate-500 truncate">{[d.store_type, d.zone, d.area].filter(Boolean).join(" · ") || "—"}{d.contact_name && ` · ${d.contact_name} ${d.contact_phone || ""}`}</div>
              </div>
              <button onClick={() => setEdit(d)} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition shrink-0"><Edit2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {edit && <DealerModal dealer={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </div>
  )
}

function DealerModal({ dealer, onClose, onSaved }: { dealer: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ name: "", code: "", store_type: "", zone: "", area: "", contact_name: "", contact_phone: "", address: "", is_new: false, active: true, ...dealer })
  const [saving, setSaving] = useState(false)
  const isEdit = !!dealer.id
  const save = async () => {
    if (!f.name?.trim()) { alert("กรุณาระบุชื่อร้าน"); return }
    setSaving(true)
    const res = await fetch("/api/branch-eval/store-checklist/dealers", {
      method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    }).then(r => r.json())
    setSaving(false)
    if (res.dealer) onSaved(); else alert(res.error || "บันทึกไม่สำเร็จ")
  }
  const F = (k: string, label: string, type = "text") => (
    <div><label className="text-[11px] font-medium text-slate-500">{label}</label>
      <input type={type} value={f[k] ?? ""} onChange={e => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none" /></div>
  )
  return (
    <Modal onClose={onClose} title={isEdit ? "แก้ไขร้าน" : "เพิ่มร้าน"}>
      <div className="p-4 space-y-3">
        {F("name", "ชื่อร้าน *")}
        <div className="grid grid-cols-2 gap-3">
          {F("code", "รหัสร้าน")}{F("store_type", "ประเภทร้าน")}
          {F("zone", "เขต")}{F("area", "พื้นที่")}
          {F("contact_name", "ผู้ติดต่อ")}{F("contact_phone", "เบอร์โทร")}
        </div>
        {F("address", "ที่อยู่")}
        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-teal-600 w-4 h-4" checked={!!f.is_new} onChange={e => setF({ ...f, is_new: e.target.checked })} /> ร้านใหม่</label>
          {isEdit && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-teal-600 w-4 h-4" checked={!!f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> เปิดใช้งาน</label>}
        </div>
        <button onClick={save} disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition mt-1">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════ ASSIGNMENTS ═══════════════════════════
function AssignmentsTab() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "done">("all")
  const [creating, setCreating] = useState(false)
  const load = () => {
    setLoading(true)
    fetch("/api/branch-eval/store-checklist/assignments").then(r => r.json())
      .then(res => setList(res.assignments ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])
  const cancel = async (id: string) => {
    if (!confirm("ยกเลิกงานมอบหมายนี้?")) return
    await fetch(`/api/branch-eval/store-checklist/assignments?id=${id}`, { method: "DELETE" }); load()
  }
  const shown = list.filter(a => filter === "all" ? true : a.status === filter)
  const badge = (s: string) => s === "done" ? "emerald" : s === "cancelled" ? "slate" : "amber"
  const label = (s: string) => s === "done" ? "เสร็จ" : s === "cancelled" ? "ยกเลิก" : "เปิดอยู่"
  const counts = { all: list.length, open: list.filter(a => a.status === "open").length, done: list.filter(a => a.status === "done").length }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm">
          {([["all", "ทั้งหมด"], ["open", "เปิดอยู่"], ["done", "เสร็จ"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${filter === k ? "bg-teal-500 text-white" : "text-slate-500 hover:text-slate-700"}`}>{l} {counts[k] > 0 && <span className={filter === k ? "opacity-80" : "text-slate-400"}>{counts[k]}</span>}</button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="ml-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition"><Plus size={16} /> มอบหมายใหม่</button>
      </div>
      {loading ? <ListSkeleton /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {shown.length === 0 ? <Empty label="ยังไม่มีงานมอบหมาย" /> : shown.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition">
              <Avatar e={a.assignee} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 truncate">{fullName(a.assignee)}</div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-x-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-0.5"><Store size={11} /> {a.dealer?.name || "ร้านใดก็ได้"}</span>
                  <span className="text-slate-300">·</span><span>{a.template?.name || "เช็คลิสต์"}</span>
                  {a.due_date && <><span className="text-slate-300">·</span><span className="text-amber-600">ครบ {a.due_date}</span></>}
                </div>
                {a.note && <div className="text-[11px] text-slate-400 truncate mt-0.5">{a.note}</div>}
              </div>
              <Chip tone={badge(a.status) as any} solid>{label(a.status)}</Chip>
              {a.status === "open" && <button onClick={() => cancel(a.id)} className="w-8 h-8 grid place-items-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition shrink-0"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      )}
      {creating && <AssignModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
    </div>
  )
}

function AssignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tpls, setTpls] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [templateId, setTemplateId] = useState("")
  const [dealerId, setDealerId] = useState("")
  const [due, setDue] = useState("")
  const [note, setNote] = useState("")
  const [picked, setPicked] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    fetch("/api/branch-eval/store-checklist/templates").then(r => r.json()).then(res => { setTpls(res.templates ?? []); if (res.templates?.[0]) setTemplateId(res.templates[0].id) })
    fetch("/api/branch-eval/store-checklist/dealers").then(r => r.json()).then(res => setDealers(res.dealers ?? []))
  }, [])
  useEffect(() => {
    if (!q.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/employees/search?q=${encodeURIComponent(q)}&scope=branch_eval&limit=15`).then(r => r.json())
        .then(res => setResults((res.employees ?? []).filter((e: any) => !picked.some(p => p.id === e.id)))).finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q, picked])
  const save = async () => {
    if (picked.length === 0) { alert("เลือกผู้รับมอบหมายอย่างน้อย 1 คน"); return }
    setSaving(true)
    const res = await fetch("/api/branch-eval/store-checklist/assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId || null, dealer_id: dealerId || null, assignee_ids: picked.map(p => p.id), due_date: due || null, note }),
    }).then(r => r.json())
    setSaving(false)
    if (res.inserted != null) onSaved(); else alert(res.error || "มอบหมายไม่สำเร็จ")
  }
  const selCls = "mt-1 w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
  return (
    <Modal onClose={onClose} title="มอบหมายเช็คลิสต์">
      <div className="p-4 space-y-3">
        <div><label className="text-[11px] font-medium text-slate-500">แบบฟอร์ม</label>
          <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={selCls}>
            {tpls.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-medium text-slate-500">ร้าน</label>
            <select value={dealerId} onChange={e => setDealerId(e.target.value)} className={selCls}>
              <option value="">— ร้านใดก็ได้ —</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div><label className="text-[11px] font-medium text-slate-500">ครบกำหนด</label><input type="date" value={due} onChange={e => setDue(e.target.value)} className={selCls} /></div>
        </div>
        <div><label className="text-[11px] font-medium text-slate-500">หมายเหตุ</label><input value={note} onChange={e => setNote(e.target.value)} className={selCls} /></div>

        <div>
          <label className="text-[11px] font-medium text-slate-500">ผู้รับมอบหมาย <span className="text-slate-400">(ค้นข้ามบริษัทได้)</span></label>
          {picked.length > 0 && <div className="flex flex-wrap gap-1.5 my-2">{picked.map(p => (
            <span key={p.id} className="text-xs bg-teal-50 text-teal-700 pl-2 pr-1 py-1 rounded-full flex items-center gap-1 font-medium">
              {p.first_name_th}{p.nickname && ` (${p.nickname})`}
              <button onClick={() => setPicked(picked.filter(x => x.id !== p.id))} className="w-4 h-4 grid place-items-center rounded-full hover:bg-teal-200/60"><X size={11} /></button>
            </span>))}</div>}
          <SearchBox value={q} onChange={setQ} loading={searching} placeholder="พิมพ์ชื่อ / รหัสพนักงาน" />
          {q.trim() && (
            <div className="mt-1.5 border border-slate-200 rounded-xl divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {results.length === 0 && !searching ? <div className="px-3 py-4 text-center text-xs text-slate-400">ไม่พบพนักงาน</div> :
                results.map(e => (
                  <button key={e.id} onClick={() => { setPicked([...picked, e]); setQ("") }} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 transition">
                    <Avatar e={e} sm />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">{e.first_name_th} {e.last_name_th}{e.nickname && ` (${e.nickname})`}</div>
                      <div className="text-[11px] text-slate-400 truncate">{e.employee_code} · {(e.company as any)?.name_th || e.brand || ""}</div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
        <button onClick={save} disabled={saving || picked.length === 0} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} มอบหมาย ({picked.length})</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════ TEMPLATES ═══════════════════════════
function TemplatesTab() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = () => {
    setLoading(true)
    fetch("/api/branch-eval/store-checklist/templates?all=1").then(r => r.json())
      .then(res => setList(res.templates ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])
  const toggle = async (t: any) => {
    await fetch("/api/branch-eval/store-checklist/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, active: !t.active }) })
    load()
  }
  const sections = (cfg: any) => (cfg?.sections ?? []).map((s: any) => s.title || s.key)
  return (
    <div className="space-y-3">
      {loading ? <ListSkeleton /> : (
        <>
          {list.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${!t.active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">{t.name} {!t.active && <Chip tone="slate">ปิดใช้</Chip>}</div>
                  {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                </div>
                <button onClick={() => toggle(t)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${t.active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {t.active ? "● เปิดใช้" : "○ ปิดอยู่"}</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sections(t.config).map((s: string, i: number) => <span key={i} className="text-[11px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg">{s}</span>)}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center pt-1">แก้โครงฟอร์ม (เพิ่ม/ลบ section หรือช่อง) ผ่าน config JSON — แจ้งทีมพัฒนาเมื่อต้องปรับ</p>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════ shared UI ═══════════════════════════
function SearchBox({ value, onChange, placeholder, loading, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; loading?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition ${className}`}>
      <Search size={16} className="text-slate-400 shrink-0" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 text-sm outline-none bg-transparent min-w-0" />
      {loading ? <Loader2 size={15} className="animate-spin text-slate-300 shrink-0" /> : value ? <button onClick={() => onChange("")} className="text-slate-300 hover:text-slate-500 shrink-0"><X size={15} /></button> : null}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: any }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-[fadeIn_.15s_ease]" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-slate-800 truncate pr-2">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Avatar({ e, sm }: { e: any; sm?: boolean }) {
  const size = sm ? "w-8 h-8 text-[11px]" : "w-9 h-9 text-xs"
  const initial = (e?.nickname || e?.first_name_th || e?.first_name_en || "?").slice(0, 1)
  if (e?.avatar_url) return <img src={e.avatar_url} className={`${size} rounded-full object-cover shrink-0`} alt="" />
  return <div className={`${size} rounded-full bg-gradient-to-br from-teal-400 to-teal-500 text-white grid place-items-center font-bold shrink-0`}>{initial}</div>
}

function Chip({ children, tone = "slate", solid }: { children: any; tone?: "slate" | "emerald" | "amber" | "teal"; solid?: boolean }) {
  const map: any = {
    slate: solid ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-500",
    emerald: solid ? "bg-emerald-100 text-emerald-700" : "bg-emerald-100 text-emerald-700",
    amber: solid ? "bg-amber-100 text-amber-700" : "bg-amber-100 text-amber-700",
    teal: "bg-teal-50 text-teal-700",
  }
  return <span className={`ml-1.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full align-middle ${map[tone]}`}>{children}</span>
}

function Kpi({ icon, color, label, value, sub }: any) {
  const c: any = { teal: "bg-teal-50 text-teal-600", indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", sky: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-600" }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-8 h-8 rounded-lg grid place-items-center ${c[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-800 mt-2 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{sub}</div>}
    </div>
  )
}
function Card({ title, icon, children }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-700 text-sm flex items-center gap-1.5 mb-3">{icon} {title}</h3>
      {children}
    </div>
  )
}
function RankList({ items, unit, color = "teal" }: { items: { label: string; value: number }[]; unit: string; color?: string }) {
  if (items.length === 0) return <Empty />
  const max = Math.max(...items.map(i => i.value), 1)
  const bar: any = { teal: "from-teal-400 to-teal-500", emerald: "from-emerald-400 to-emerald-500" }
  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((it, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="text-xs text-slate-600 w-28 truncate">{it.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`bg-gradient-to-r ${bar[color]} h-full rounded-full transition-all`} style={{ width: `${it.value / max * 100}%` }} /></div>
          <span className="text-[11px] font-medium text-slate-500 w-14 text-right tabular-nums">{it.value} {unit}</span>
        </div>
      ))}
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-slate-50 rounded-xl py-3"><div className="text-lg font-bold text-slate-800 tabular-nums">{value}</div><div className="text-[11px] text-slate-500 mt-0.5">{label}</div></div>
}
function SectionLabel({ children }: { children: any }) {
  return <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">{children}</div>
}
function Empty({ label = "ไม่มีข้อมูล" }: { label?: string }) {
  return <div className="text-center text-sm text-slate-400 py-10 flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-slate-50 grid place-items-center"><Search size={16} className="text-slate-300" /></div>{label}</div>
}
function ListSkeleton() {
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">{[1, 2, 3, 4].map(i => (
    <div key={i} className="px-4 py-3.5 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" /><div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" /><div className="h-2.5 bg-slate-50 rounded animate-pulse w-1/2" /></div></div>
  ))}</div>
}
function DashSkeleton() {
  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
    <div className="grid lg:grid-cols-2 gap-3">{[1, 2].map(i => <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
  </div>
}
