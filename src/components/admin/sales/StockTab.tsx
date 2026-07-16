"use client"
/**
 * StockTab — สต๊อกคงเหลือรายซีเรียลต่อสาขา (admin)
 *   มุมมอง: สรุป · รายซีเรียล · ใกล้หมด · ไม่ตรง(discrepancy) · โอนสต๊อก
 */
import { useEffect, useMemo, useState } from "react"
import {
  Boxes, Search, Loader2, RefreshCw, Building2, Package, Download, Hash, CheckCircle2,
  AlertTriangle, ArrowLeftRight, X, ChevronDown, Store, FileSpreadsheet,
} from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

type View = "summary" | "by_branch" | "items" | "low_stock" | "discrepancy"

export default function StockTab({ canSeeAll }: { canSeeAll: boolean }) {
  const [view, setView] = useState<View>("summary")
  const [status, setStatus] = useState<"in_stock" | "sold" | "all">("in_stock")
  const [data, setData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [low, setLow] = useState<any[]>([])
  const [disc, setDisc] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [threshold, setThreshold] = useState(3)
  const [transferOpen, setTransferOpen] = useState(false)
  const [openBranches, setOpenBranches] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    try {
      if (view === "discrepancy") {
        const res = await fetch(`/api/stock/discrepancy?days=90`)
        const d = await res.json(); setDisc(res.ok ? (d.items ?? []) : [])
      } else if (view === "low_stock") {
        const res = await fetch(`/api/stock/summary?view=low_stock&threshold=${threshold}`)
        const d = await res.json(); setLow(res.ok ? (d.low_stock ?? []) : [])
      } else {
        const p = new URLSearchParams({ view, status }); if (q.trim()) p.set("q", q.trim())
        const res = await fetch(`/api/stock/summary?${p}`)
        const d = await res.json()
        if (res.ok) { if (view === "items") setItems(d.items ?? []); else setData(d) }
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [view, status, threshold]) // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => { if (view === "summary" || view === "items" || view === "by_branch") load() }, 300); return () => clearTimeout(t) }, [q]) // eslint-disable-line

  const branchNames = useMemo(() => (data?.by_branch ?? []).map((b: any) => b.name), [data])

  const [exporting, setExporting] = useState(false)
  // ดาวน์โหลด Excel ครบทุกมิติ (ดึงข้อมูลเต็มไม่ขึ้นกับมุมมองปัจจุบัน)
  async function exportXlsx() {
    setExporting(true)
    try {
      const [sumRes, itemRes] = await Promise.all([
        fetch(`/api/stock/summary?view=summary`),
        fetch(`/api/stock/summary?view=items&status=all`),
      ])
      const sum = await sumRes.json()
      const it = await itemRes.json()
      const fmtCell = (s: string) => { try { return s ? new Date(s).toLocaleString("sv-SE").slice(0, 16) : "" } catch { return s || "" } }
      const wb = XLSX.utils.book_new()
      // ต่อสาขา (แต่ละที่เหลือเท่าไหร่)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((sum.by_branch ?? []).map((b: any) => ({ "สาขา": b.name, "คงเหลือ (ชิ้น)": b.qty }))), "ต่อสาขา")
      // ต่อสินค้า (รวมหมด)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((sum.by_product ?? []).map((p: any) => ({
        "สินค้า": p.product_name, "แบรนด์": p.brand || "", "Barcode": p.barcode || "", "คงเหลือ": p.qty, "ขายไป": p.sold_qty, "สถานะ": p.out ? "หมด" : "มีของ",
      }))), "ต่อสินค้า")
      // แยกสาขา × สินค้า
      const bp: any[] = []
      ;(sum.by_branch_detail ?? []).forEach((b: any) => b.products.forEach((p: any) => bp.push({ "สาขา": b.name, "สินค้า": p.product_name, "Barcode": p.barcode || "", "คงเหลือ": p.qty, "ขายไป": p.sold_qty })))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bp), "แยกสาขา")
      // รายซีเรียล
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((it.items ?? []).map((r: any) => ({
        "Serial": r.serial_number, "สินค้า": r.product_name || "", "Barcode": r.barcode || "", "สาขา": r.branch_name || "",
        "นำเข้าเมื่อ": fmtCell(r.in_at), "ผู้นำเข้า": r.in_by_name || "", "สถานะ": r.status === "in_stock" ? "คงเหลือ" : r.status === "sold" ? "ขายแล้ว" : r.status, "ขายเมื่อ": fmtCell(r.sold_at),
      }))), "รายซีเรียล")
      XLSX.writeFile(wb, `stock-report_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("ดาวน์โหลดรายงานสต๊อกแล้ว")
    } catch { toast.error("ดาวน์โหลดไม่สำเร็จ") } finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 flex-wrap">
          <Seg active={view === "summary"} onClick={() => setView("summary")} label="สรุป" />
          <Seg active={view === "by_branch"} onClick={() => setView("by_branch")} label="แยกสาขา" />
          <Seg active={view === "items"} onClick={() => setView("items")} label="รายซีเรียล" />
          <Seg active={view === "low_stock"} onClick={() => setView("low_stock")} label="⚠️ ใกล้หมด" />
          <Seg active={view === "discrepancy"} onClick={() => setView("discrepancy")} label="🔴 ไม่ตรง" />
        </div>
        {(view === "summary" || view === "items" || view === "by_branch") && (
          <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
            <Seg active={status === "in_stock"} onClick={() => setStatus("in_stock")} label="คงเหลือ" />
            <Seg active={status === "sold"} onClick={() => setStatus("sold")} label="ขายแล้ว" />
            <Seg active={status === "all"} onClick={() => setStatus("all")} label="ทั้งหมด" />
          </div>
        )}
        {view === "low_stock" && (
          <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
            เตือนเมื่อ ≤
            <input type="number" value={threshold} min={1} onChange={e => setThreshold(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none" /> ชิ้น
          </label>
        )}
        {(view === "summary" || view === "items" || view === "by_branch") && (
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา serial / สินค้า / barcode"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400" />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {canSeeAll && (
            <button onClick={() => setTransferOpen(true)} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 border border-indigo-200 rounded-xl px-2.5 py-2 hover:bg-indigo-50">
              <ArrowLeftRight size={13} /> โอนสต๊อก
            </button>
          )}
          <button onClick={exportXlsx} disabled={exporting} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-xl px-2.5 py-2 hover:bg-emerald-100 disabled:opacity-60">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
          </button>
          <button onClick={load} className="p-2 hover:bg-slate-100 rounded-lg"><RefreshCw size={14} className={loading ? "animate-spin text-emerald-500" : "text-slate-500"} /></button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100"><Loader2 className="animate-spin mx-auto text-emerald-400" /></div>
      ) : view === "summary" ? (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Kpi icon={<Boxes size={18} />} color="emerald" label="หน่วยคงเหลือ" value={(data?.total_units ?? 0).toLocaleString()} sub="ชิ้น" />
            <Kpi icon={<Package size={18} />} color="indigo" label="ชนิดสินค้า" value={(data?.total_products ?? 0).toLocaleString()} sub="รายการ" />
            <Kpi icon={<Building2 size={18} />} color="amber" label="สาขา" value={(data?.by_branch?.length ?? 0).toLocaleString()} sub="สาขา" />
          </div>
          <Card title="สต๊อกต่อสาขา" icon={<Building2 size={15} className="text-indigo-500" />}>
            {(data?.by_branch ?? []).length === 0 ? <Empty /> : data.by_branch.map((b: any, i: number) => (
              <Row key={i}><span className="font-bold text-slate-700 text-sm">{b.name}</span><span className="ml-auto text-sm font-black text-emerald-700">{b.qty.toLocaleString()} ชิ้น</span></Row>
            ))}
          </Card>
          <Card title="สต๊อกต่อสินค้า" icon={<Package size={15} className="text-emerald-500" />} count={data?.by_product?.length}>
            {(data?.by_product ?? []).length === 0 ? <Empty /> : data.by_product.map((p: any, i: number) => (
              <Row key={i}>
                <Thumb url={p.image_url} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700 truncate">{p.product_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{p.brand || ""}{p.barcode ? ` · ${p.barcode}` : ""}
                    {Object.keys(p.branches || {}).length > 1 && ` · ${Object.entries(p.branches).map(([b, n]: any) => `${b}:${n}`).join(" ")}`}</p>
                </div>
                {p.out
                  ? <span className="ml-auto shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-600">หมด{p.sold_qty ? ` · ขายไป ${p.sold_qty}` : ""}</span>
                  : <span className="ml-auto text-base font-black text-emerald-700 shrink-0">{p.qty}</span>}
              </Row>
            ))}
          </Card>
        </>
      ) : view === "by_branch" ? (
        /* แยกตามสาขา → สาขานี้มีสินค้าอะไรกี่ชิ้น */
        <div className="space-y-2.5">
          {(data?.by_branch_detail ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8"><Empty /></div>
          ) : data.by_branch_detail.map((b: any) => {
            const open = openBranches.has(b.name)
            return (
              <div key={b.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setOpenBranches(prev => { const n = new Set(prev); n.has(b.name) ? n.delete(b.name) : n.add(b.name); return n })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Store size={16} className="text-emerald-600" /></div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-black text-slate-800 truncate">{b.name}</p>
                    <p className="text-[11px] text-slate-400">{b.products.length} ชนิดสินค้า</p>
                  </div>
                  <span className="text-sm font-black text-emerald-700 shrink-0">{b.total.toLocaleString()} ชิ้น</span>
                  <ChevronDown size={16} className={"text-slate-400 shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
                </button>
                {open && (
                  <div className="border-t border-slate-50 divide-y divide-slate-50">
                    {b.products.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 px-4 py-2">
                        <Thumb url={p.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700 truncate">{p.product_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{p.brand || ""}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                        </div>
                        {p.out
                          ? <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-600">หมด</span>
                          : <span className="text-sm font-black text-emerald-700 shrink-0">{p.qty}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : view === "low_stock" ? (
        <Card title="สินค้าใกล้หมด" icon={<AlertTriangle size={15} className="text-amber-500" />} count={low.length}>
          {low.length === 0 ? <Empty msg="ไม่มีสินค้าใกล้หมด 👍" /> : low.map((r, i) => (
            <Row key={i}>
              <Thumb url={r.image_url} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700 truncate">{r.product_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{r.branch_name}{r.barcode ? ` · ${r.barcode}` : ""}</p>
              </div>
              <span className={"ml-auto text-sm font-black px-2 py-0.5 rounded-full shrink-0 " + (r.qty <= 1 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700")}>
                เหลือ {r.qty}
              </span>
            </Row>
          ))}
        </Card>
      ) : view === "discrepancy" ? (
        <Card title="ขายแล้วแต่ไม่มีในสต๊อก (90 วัน)" icon={<AlertTriangle size={15} className="text-rose-500" />} count={disc.length}>
          {disc.length === 0 ? <Empty msg="สต๊อกตรงกับการขายทั้งหมด 👍" /> : disc.map((r, i) => (
            <Row key={i}>
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700 font-mono truncate">{r.serial}</p>
                <p className="text-[10px] text-slate-400 truncate">{r.product_name || "(ไม่ระบุ)"}{r.branch_name ? ` · ${r.branch_name}` : ""}{r.employee ? ` · ${r.employee}` : ""} · {r.sold_date}</p>
              </div>
              <span className="ml-auto text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full shrink-0">ไม่เคยรับเข้า</span>
            </Row>
          ))}
        </Card>
      ) : (
        <Card title="รายการซีเรียล" icon={<Hash size={15} className="text-emerald-500" />} count={items.length}>
          {items.length === 0 ? <Empty /> : items.map(it => (
            <Row key={it.id}>
              <div className={"w-2 h-2 rounded-full shrink-0 " + (it.status === "in_stock" ? "bg-emerald-500" : it.status === "sold" ? "bg-slate-300" : "bg-rose-400")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700 font-mono truncate">{it.serial_number}</p>
                <p className="text-[10px] text-slate-400 truncate">{it.product_name || "(ไม่ระบุ)"}{it.branch_name ? ` · ${it.branch_name}` : ""}</p>
              </div>
              <span className={"text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 " + (it.status === "in_stock" ? "bg-emerald-50 text-emerald-600" : it.status === "sold" ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600")}>
                {it.status === "in_stock" ? "คงเหลือ" : it.status === "sold" ? "ขายแล้ว" : it.status}
              </span>
            </Row>
          ))}
        </Card>
      )}

      {transferOpen && <TransferModal branchNames={branchNames} onClose={() => setTransferOpen(false)} onDone={() => { setTransferOpen(false); load() }} />}
    </div>
  )
}

// ── โอนสต๊อก ──
function TransferModal({ branchNames, onClose, onDone }: { branchNames: string[]; onClose: () => void; onDone: () => void }) {
  const [serialsText, setSerialsText] = useState("")
  const [toBranch, setToBranch] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    const serials = serialsText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
    if (serials.length === 0) { toast.error("กรอก serial อย่างน้อย 1 ตัว"); return }
    if (!toBranch.trim()) { toast.error("เลือกสาขาปลายทาง"); return }
    setBusy(true)
    try {
      const res = await fetch("/api/stock/transfer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serials, to_branch_name: toBranch.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โอนไม่สำเร็จ"); return }
      toast.success(`โอนสำเร็จ ${d.moved} ชิ้น → ${d.to_branch}${d.not_moved?.length ? ` (ไม่โอน ${d.not_moved.length})` : ""}`)
      onDone()
    } catch { toast.error("Error") } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><ArrowLeftRight size={16} /> โอนสต๊อกระหว่างสาขา</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500">Serial (หลายตัว วางทีละบรรทัด หรือคั่นด้วยเว้นวรรค)</span>
            <textarea value={serialsText} onChange={e => setSerialsText(e.target.value)} rows={4}
              placeholder="P2287R3B9TH1074515&#10;P2287..."
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500">สาขาปลายทาง</span>
            <input value={toBranch} onChange={e => setToBranch(e.target.value)} list="branch-suggest"
              placeholder="ชื่อสาขา"
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            <datalist id="branch-suggest">{branchNames.map((b, i) => <option key={i} value={b} />)}</datalist>
          </label>
          <button onClick={submit} disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-xl py-2.5 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />} โอนสต๊อก
          </button>
          <p className="text-[10px] text-slate-400 text-center">โอนเฉพาะ serial ที่ยัง <b>คงเหลือ (in_stock)</b> เท่านั้น</p>
        </div>
      </div>
    </div>
  )
}

function Seg({ active, onClick, label }: any) { return <button onClick={onClick} className={"px-3 py-1 rounded-lg text-[11px] font-black transition whitespace-nowrap " + (active ? "bg-white shadow text-emerald-700" : "text-slate-500")}>{label}</button> }
function Thumb({ url }: { url?: string }) { return <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-400" />}</div> }
const COLORS: any = { emerald: "from-emerald-500 to-teal-500", indigo: "from-indigo-500 to-blue-500", amber: "from-amber-500 to-orange-500" }
function Kpi({ icon, color, label, value, sub }: any) {
  return (<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${COLORS[color]} text-white flex items-center justify-center shadow-sm mb-2`}>{icon}</div>
    <p className="text-[10px] uppercase font-black text-slate-400">{label}</p>
    <p className="text-xl font-black text-slate-800 leading-none mt-0.5">{value}</p>{sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}</div>)
}
function Card({ title, icon, count, children }: any) {
  return (<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">{icon}<p className="font-black text-sm text-slate-700">{title}</p>{count != null && <span className="ml-auto text-[10px] text-slate-400 font-bold">{count} รายการ</span>}</div>
    <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">{children}</div></div>)
}
function Row({ children }: any) { return <div className="px-3 py-2 flex items-center gap-2.5 hover:bg-slate-50">{children}</div> }
function Empty({ msg }: { msg?: string }) { return <p className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1"><CheckCircle2 size={20} className="text-slate-200" />{msg || "ไม่มีข้อมูล"}</p> }
