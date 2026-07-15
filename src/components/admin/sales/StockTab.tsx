"use client"
/**
 * StockTab — สต๊อกคงเหลือรายซีเรียลต่อสาขา (admin)
 *   สรุปต่อสินค้า / ต่อสาขา + รายการซีเรียล (in_stock / sold)
 */
import { useEffect, useMemo, useState } from "react"
import {
  Boxes, Search, Loader2, RefreshCw, Building2, Package, Download, Hash, CheckCircle2,
} from "lucide-react"

type View = "summary" | "items"

export default function StockTab({ canSeeAll }: { canSeeAll: boolean }) {
  const [view, setView] = useState<View>("summary")
  const [status, setStatus] = useState<"in_stock" | "sold" | "all">("in_stock")
  const [data, setData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ view, status })
      if (q.trim()) p.set("q", q.trim())
      const res = await fetch(`/api/stock/summary?${p}`)
      const d = await res.json()
      if (!res.ok) { setData(null); setItems([]); return }
      if (view === "items") setItems(d.items ?? [])
      else setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [view, status]) // eslint-disable-line
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [q]) // eslint-disable-line

  function exportCsv() {
    let rows: string[][]
    if (view === "summary") {
      rows = [["สินค้า", "แบรนด์", "barcode", "คงเหลือ"]]
      ;(data?.by_product ?? []).forEach((r: any) => rows.push([r.product_name, r.brand || "", r.barcode || "", String(r.qty)]))
    } else {
      rows = [["serial", "สินค้า", "barcode", "สาขา", "สถานะ", "รับเข้าเมื่อ"]]
      items.forEach(r => rows.push([r.serial_number, r.product_name || "", r.barcode || "", r.branch_name || "", r.status, fmt(r.in_at)]))
    }
    const csv = "﻿" + rows.map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = `stock-${view}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          <Seg active={view === "summary"} onClick={() => setView("summary")} label="สรุป" />
          <Seg active={view === "items"} onClick={() => setView("items")} label="รายซีเรียล" />
        </div>
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          <Seg active={status === "in_stock"} onClick={() => setStatus("in_stock")} label="คงเหลือ" />
          <Seg active={status === "sold"} onClick={() => setStatus("sold")} label="ขายแล้ว" />
          <Seg active={status === "all"} onClick={() => setStatus("all")} label="ทั้งหมด" />
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา serial / สินค้า / barcode"
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400" />
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-xl px-2.5 py-2 hover:bg-slate-50">
          <Download size={13} /> CSV
        </button>
        <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-500" : "text-slate-500"} />
        </button>
      </div>

      {loading && !data && items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100"><Loader2 className="animate-spin mx-auto text-emerald-400" /></div>
      ) : view === "summary" ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-2.5">
            <Kpi icon={<Boxes size={18} />} color="emerald" label="หน่วยคงเหลือ" value={(data?.total_units ?? 0).toLocaleString()} sub="ชิ้น" />
            <Kpi icon={<Package size={18} />} color="indigo" label="ชนิดสินค้า" value={(data?.total_products ?? 0).toLocaleString()} sub="รายการ" />
            <Kpi icon={<Building2 size={18} />} color="amber" label="สาขา" value={(data?.by_branch?.length ?? 0).toLocaleString()} sub="สาขา" />
          </div>

          {/* by branch */}
          <Card title="สต๊อกต่อสาขา" icon={<Building2 size={15} className="text-indigo-500" />}>
            {(data?.by_branch ?? []).length === 0 ? <Empty /> : (data.by_branch).map((b: any, i: number) => (
              <Row key={i}>
                <span className="font-bold text-slate-700 text-sm">{b.name}</span>
                <span className="ml-auto text-sm font-black text-emerald-700">{b.qty.toLocaleString()} ชิ้น</span>
              </Row>
            ))}
          </Card>

          {/* by product */}
          <Card title="สต๊อกต่อสินค้า" icon={<Package size={15} className="text-emerald-500" />} count={data?.by_product?.length}>
            {(data?.by_product ?? []).length === 0 ? <Empty /> : (data.by_product).map((p: any, i: number) => (
              <Row key={i}>
                <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700 truncate">{p.product_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {p.brand || ""}{p.barcode ? ` · ${p.barcode}` : ""}
                    {Object.keys(p.branches || {}).length > 1 && ` · ${Object.entries(p.branches).map(([b, n]: any) => `${b}:${n}`).join(" ")}`}
                  </p>
                </div>
                <span className="ml-auto text-base font-black text-emerald-700 shrink-0">{p.qty}</span>
              </Row>
            ))}
          </Card>
        </>
      ) : (
        /* items list */
        <Card title="รายการซีเรียล" icon={<Hash size={15} className="text-emerald-500" />} count={items.length}>
          {items.length === 0 ? <Empty /> : items.map(it => (
            <Row key={it.id}>
              <div className={"w-2 h-2 rounded-full shrink-0 " + (it.status === "in_stock" ? "bg-emerald-500" : it.status === "sold" ? "bg-slate-300" : "bg-rose-400")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700 font-mono truncate">{it.serial_number}</p>
                <p className="text-[10px] text-slate-400 truncate">{it.product_name || "(ไม่ระบุ)"}{it.branch_name ? ` · ${it.branch_name}` : ""}</p>
              </div>
              <span className={"text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 " +
                (it.status === "in_stock" ? "bg-emerald-50 text-emerald-600" : it.status === "sold" ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600")}>
                {it.status === "in_stock" ? "คงเหลือ" : it.status === "sold" ? "ขายแล้ว" : it.status}
              </span>
            </Row>
          ))}
        </Card>
      )}
    </div>
  )
}

function fmt(s: string) { try { return new Date(s).toLocaleDateString("th-TH", { day: "2-digit", month: "short" }) } catch { return s } }
function Seg({ active, onClick, label }: any) {
  return <button onClick={onClick} className={"px-3 py-1 rounded-lg text-[11px] font-black transition " + (active ? "bg-white shadow text-emerald-700" : "text-slate-500")}>{label}</button>
}
const COLORS: any = { emerald: "from-emerald-500 to-teal-500", indigo: "from-indigo-500 to-blue-500", amber: "from-amber-500 to-orange-500" }
function Kpi({ icon, color, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${COLORS[color]} text-white flex items-center justify-center shadow-sm mb-2`}>{icon}</div>
      <p className="text-[10px] uppercase font-black text-slate-400">{label}</p>
      <p className="text-xl font-black text-slate-800 leading-none mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
function Card({ title, icon, count, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
        {icon}<p className="font-black text-sm text-slate-700">{title}</p>
        {count != null && <span className="ml-auto text-[10px] text-slate-400 font-bold">{count} รายการ</span>}
      </div>
      <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">{children}</div>
    </div>
  )
}
function Row({ children }: any) { return <div className="px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50">{children}</div> }
function Empty() { return <p className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1"><CheckCircle2 size={20} className="text-slate-200" />ไม่มีข้อมูล</p> }
